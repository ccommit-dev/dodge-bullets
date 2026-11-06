/**
 * 실행 루프 — 관찰 → 규칙 판정 → 판단 → 행동. 걸음 수 · 시간 상한 안에서만 돈다(길을 잃어도 비용이 정해진 만큼만).
 * 처음 가는 곳은 한 걸음씩, 아는 길은 기억의 지도로(하네스) 빨리 지나간다.
 */
import { rng } from "../bridge/protocol.mjs";
import { judgeClaim } from "../oracles/judge.mjs";
import { checkRules } from "../oracles/rules.mjs";
import { modelPick } from "../model/gateway.mjs";
import { candidates, exploreChoice, findChoice } from "./policy.mjs";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 한 걸음 — 누르고, 기다리고, 다시 보고, 규칙으로 판정. 무반응 후보는 한 번 더 눌러 확인한다 */
export async function stepOnce(game, pre, action, settle) {
  const res = await game.act(action);
  await sleep(settle);
  let events = game.drainEvents();
  let cur = await game.observe();
  let found = checkRules({ prev: pre, action, result: res, cur, events });
  if (found.some((i) => i.type === "unresponsive")) {
    const res2 = await game.act({ type: "tap", key: action.key, label: action.label });
    await sleep(1500);
    const ev2 = game.drainEvents();
    const cur2 = await game.observe();
    const again = checkRules({ prev: pre, action, result: res2, cur: cur2, events: ev2 });
    found = found.filter((i) => i.type !== "unresponsive").concat(again.filter((i) => i.type !== "unresponsive" || res2.ok));
    events = events.concat(ev2);
    cur = cur2;
  }
  return { res, cur, events, found };
}

function makeIssueSink(game, rec) {
  return async (found, step, obs) => {
    let shot = null;
    for (const i of found) {
      if (!shot && i.severity !== "info") { shot = rec.shotPath(step).replace(/\.jpg$/, "-issue.jpg"); await game.screenshot(shot).catch(() => { shot = null; }); }
      rec.issue(i, { step, screen: obs.screen, title: obs.title, shot });
    }
  };
}

/**
 * 탐색 — 안 가 본 화면 · 안 눌러 본 단추를 찾아 다니며 규칙 판정으로 문제를 줍는다.
 * @param {{ preset: string, steps: number, ms: number, seed: number, settle?: number, shotEvery?: number }} plan
 */
export async function runExplore(game, plan, { memory, rec, model, log = () => {} }) {
  const rnd = rng(plan.seed);
  const t0 = Date.now();
  const sink = makeIssueSink(game, rec);
  await game.reset(plan.preset);
  let obs = await game.observe();
  memory.see(obs);
  await sink(checkRules({ cur: obs, events: game.drainEvents() }), 0, obs);
  await game.screenshot(rec.shotPath(0));
  const screens = new Set([obs.screen]);
  const tally = { harness: 0, model: 0, explore: 0, resets: 0, failedActs: 0 };
  let stuck = 0, step = 0;
  for (step = 1; step <= plan.steps && Date.now() - t0 < plan.ms; step += 1) {
    let d = exploreChoice(obs, memory, rnd, { stuck });
    if (model && d.why === "안 눌러 본 단추" && memory.m.screens[obs.screen]?.visits <= 1) {
      const pick = await modelPick(model, plan.goal ?? "안 가 본 화면을 최대한 많이 열어 본다", obs, candidates(obs)).catch(() => null);
      if (pick) d = { action: { type: "tap", ref: pick.c.ref, key: pick.c.key, label: pick.c.label }, why: `모델: ${pick.why}`, via: "model" };
    }
    const ts = Date.now();
    if (d.action.type === "reset") {
      await game.reset(plan.preset);
      obs = await game.observe();
      memory.see(obs);
      tally.resets += 1;
      stuck = 0;
      rec.step({ step, ms: Date.now() - ts, action: d.action, why: d.why, to: obs.screen });
      await sink(checkRules({ cur: obs, events: game.drainEvents() }), step, obs);
      continue;
    }
    const pre = obs;
    const r = await stepOnce(game, pre, d.action, plan.settle ?? 700);
    obs = r.cur;
    memory.see(obs);
    if (d.action.key && memory.leadsTo(d.action.key, obs.screen)) r.found = r.found.filter((i) => i.type !== "unresponsive");
    if (r.res.ok) memory.learn(pre, d.action, obs); else { memory.fail(pre.screen, d.action.key); tally.failedActs += 1; }
    tally[d.via ?? "explore"] += 1;
    const novel = !screens.has(obs.screen);
    screens.add(obs.screen);
    stuck = novel || d.why === "안 눌러 본 단추" ? 0 : stuck + 1;
    rec.step({ step, ms: Date.now() - ts, action: d.action, why: d.why, via: d.via, result: r.res, from: pre.screen, to: obs.screen, title: obs.title, events: r.events.map((e) => e.kind), issues: r.found.map((i) => i.type) });
    await sink(r.found, step, obs);
    if (step % (plan.shotEvery ?? 10) === 0) await game.screenshot(rec.shotPath(step));
    if (step % 10 === 0) log(`  걸음 ${step} · 화면 ${screens.size} · 이슈 ${rec.issues.size} · ${Math.round((Date.now() - t0) / 1000)}초`);
  }
  return { steps: step - 1, seconds: Math.round((Date.now() - t0) / 1000), screensThisRun: screens.size, tally };
}

/** 상태가 바뀔 때까지(저장이 늦게 적힌다) 최대 waitMs 기다린 관찰 */
async function observeSettled(game, before, waitMs) {
  const t0 = Date.now();
  let o = await game.observe();
  while (Date.now() - t0 < waitMs && JSON.stringify(o.state.progression) === JSON.stringify(before.state.progression) && JSON.stringify(o.state.settings) === JSON.stringify(before.state.settings)) {
    await sleep(250);
    o = await game.observe();
  }
  await sleep(300);
  return game.observe();
}

/**
 * 검증 — 질문 하나: 목표 단추를 스스로 찾아가 누르고, 전후 상태로 참 · 거짓을 판정한다. 못 찾으면 "판단 불가".
 * @param {{ id: string, text: string, preset: string, click: string, hint?: string, before?: Array<{click: string}>, advanceMs?: number, expect: any, budget?: number }} claim
 */
export async function runClaim(game, claim, { memory, rec, seed = 1, log = () => {} }) {
  const rnd = rng(seed);
  const t0 = Date.now();
  const sink = makeIssueSink(game, rec);
  await game.reset(claim.preset ?? "mid");
  if (claim.advanceMs) { await game.advance(claim.advanceMs); await game.act({ type: "reload" }); }
  let obs = await game.observe();
  memory.see(obs);
  await sink(checkRules({ cur: obs, events: game.drainEvents() }), 0, obs);
  const path = [];
  // 목표 앞에 먼저 해야 하는 일(예: 출석판 닫기) — 그것도 스스로 찾아간다
  const goals = [...(claim.before ?? []).map((b) => ({ ...b, pre: true })), { click: claim.click, hint: claim.hint }];
  let target = null, stuck = 0, step = 0;
  const budget = claim.budget ?? 40;
  for (const g of goals) {
    const re = new RegExp(g.click), hint = g.hint ? new RegExp(g.hint) : null;
    target = null;
    while (step < budget) {
      const d = findChoice(obs, memory, rnd, re, hint, { stuck });
      if (d.found) { target = d.found; break; }
      step += 1;
      if (d.action.type === "reset") { await game.reset(claim.preset ?? "mid"); obs = await game.observe(); stuck = 0; path.push({ type: "reset" }); continue; }
      const pre = obs;
      const r = await stepOnce(game, pre, d.action, 700);
      obs = r.cur;
      memory.see(obs);
      if (r.res.ok) { memory.learn(pre, d.action, obs); path.push({ type: "tap", key: d.action.key, label: d.action.label, via: d.via ?? "explore" }); } else memory.fail(pre.screen, d.action.key);
      stuck = pre.screen === obs.screen ? stuck + 1 : 0;
      rec.step({ claim: claim.id, step, action: d.action, why: d.why, via: d.via, result: r.res, to: obs.screen, title: obs.title });
      await sink(r.found, step, obs);
    }
    if (!target) break;
    if (g.pre) {
      const pre = obs;
      const r = await stepOnce(game, pre, { type: "tap", ref: target.ref, key: target.key, label: target.label }, 900);
      obs = r.cur;
      memory.learn(pre, { type: "tap", key: target.key }, obs);
      path.push({ type: "tap", key: target.key, label: target.label, via: "goal" });
    }
  }
  if (!target) return { id: claim.id, verdict: null, detail: `목표 단추 /${claim.click}/ 를 ${step}걸음 안에 찾지 못함`, steps: step, seconds: Math.round((Date.now() - t0) / 1000), path };
  const before = obs;
  const shotA = rec.shotPath(0).replace("step-0000", `${claim.id}-before`);
  await game.screenshot(shotA);
  const res = await game.act({ type: "tap", ref: target.ref, key: target.key, label: target.label });
  const after = await observeSettled(game, before, claim.waitMs ?? 3000);
  const shotB = shotA.replace("-before", "-after");
  await game.screenshot(shotB);
  path.push({ type: "tap", key: target.key, label: target.label, via: "goal" });
  await sink(checkRules({ prev: before, action: { type: "tap", key: target.key, label: target.label }, result: res, cur: after, events: game.drainEvents() }).filter((i) => i.type !== "unresponsive"), step + 1, after);
  const j = judgeClaim(claim, before, after);
  log(`  ${claim.id}: ${j.verdict ? "참" : "거짓"} — ${j.detail}`);
  return { id: claim.id, verdict: j.verdict, detail: j.detail, tapped: target.label, steps: step + 1, seconds: Math.round((Date.now() - t0) / 1000), path, shots: [shotA, shotB] };
}
