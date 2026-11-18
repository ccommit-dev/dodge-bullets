/**
 * 시나리오 — 긴 흐름을 마일스톤으로 나눠, 마일스톤마다 게임 상태 · 화면으로 판정한다(2026-11-18).
 * 틀은 miHoYo Gamer(arXiv 2611.18397) 7.3절의 시험 환경을 따랐다 — 시험 하나 = GM 초기화(저장 심기) + 목표 + 게임이 내는
 * 완료 판정 + 종료 규칙. "스크린샷 한 장으로 결과를 추측하지 않는다": 판정은 저장(localStorage) · DOM · 화면 규칙 표식으로.
 *
 * 시나리오 모양(requests/scenarios.json)
 *   { id, name, init: { preset, patch? }, stopOnFail?: true, timeBudgetSec?: 300,
 *     milestones: [ { id, name, kind: "nav"|"ui"|"combat"|"reward", init?: {...},
 *                     steps: [ { click: "정규식", hint?, waitMs?, optional? } | { wait: ms } ],
 *                     expect: [ judge.mjs 의 판정 ... (+ once: true — 잠깐 뜨는 연출은 기다리는 동안 한 번이라도) ], waitMs?: 4000, budget?: 30 } ] }
 * 마일스톤 순서대로 잇는다. 마일스톤에 init 이 있으면 그 상태에서 따로 시작한다(앞이 실패해도 잴 수 있다).
 * 앞이 실패하고 자기 init 이 없으면 "건너뜀"(잰 것에서 뺀다) — stopOnFail: false 면 실패해도 그 화면에서 이어 간다.
 * 각 단계의 목표 단추는 에이전트가 스스로 찾는다(지금 화면 → 기억한 길 → 힌트 쪽 탐색, policy.findChoice).
 */
import { rng } from "../bridge/protocol.mjs";
import { judgeExpect } from "../oracles/judge.mjs";
import { checkRules } from "../oracles/rules.mjs";
import { makeIssueSink, stepOnce } from "./loop.mjs";
import { findChoice } from "./policy.mjs";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 판정에 쓸 선택자 — DOM 판정만 조회한다 */
const selsOf = (expects) => [...new Set(expects.filter((e) => e.sel).map((e) => e.sel))];

/** 지금 상태로 마일스톤 판정 — 모두 맞아야 통과 */
async function judgeNow(game, expects, start) {
  for (const e of expects) if (e.sel && e.readable) await game.reveal(e.sel);
  const obs = await game.observe();
  const sels = selsOf(expects);
  const dom = sels.length ? await game.query(sels) : {};
  const after = { ...obs, dom };
  const parts = expects.map((e) => judgeExpect(e, start, after));
  return { obs, pass: parts.every((p) => p.ok), parts };
}

/**
 * @param {any} game 연결(web-cdp) · @param {any} sc 시나리오
 * @param {{ memory: any, rec: any, seed?: number, log?: Function, run?: number }} ctx
 */
export async function runScenario(game, sc, { memory, rec, seed = 1, log = () => {}, run = 1 }) {
  const rnd = rng(seed);
  const t0 = Date.now();
  const sink = makeIssueSink(game, rec);
  const budgetMs = (sc.timeBudgetSec ?? 300) * 1000;
  const results = [];
  let obs = null, alive = false, totalSteps = 0;

  const boot = async (init) => {
    await game.reset(init?.preset ?? "qa", init?.patch);
    obs = await game.observe();
    memory.see(obs);
    await sink(checkRules({ cur: obs, events: game.drainEvents() }), totalSteps, obs);
    alive = true;
  };

  for (const [mi, m] of sc.milestones.entries()) {
    const tag = `${sc.id}#${run}/${m.id}`;
    if (m.init) await boot(m.init);
    else if (mi === 0) await boot(sc.init);
    else if (!alive) { results.push({ id: m.id, name: m.name, kind: m.kind, status: "skip", detail: "앞 마일스톤 실패 — 이어서 잴 수 없음" }); continue; }
    if (Date.now() - t0 > budgetMs) { results.push({ id: m.id, name: m.name, kind: m.kind, status: "skip", detail: `시간 예산 ${sc.timeBudgetSec ?? 300}초 넘김` }); alive = false; continue; }

    const mt0 = Date.now();
    const start = obs;
    const path = [];
    const budget = m.budget ?? 30;
    let step = 0, stuck = 0, failed = null;
    for (const g of m.steps ?? []) {
      if (g.wait) { await sleep(g.wait); obs = await game.observe(); continue; }
      const re = new RegExp(g.click), hint = g.hint ? new RegExp(g.hint) : null;
      const limit = g.optional ? Math.min(step + 3, budget) : budget;
      let target = null;
      while (step < limit) {
        const d = findChoice(obs, memory, rnd, re, hint, { stuck });
        if (d.found) { target = d.found; break; }
        if (g.optional) break; // 있으면 누르고, 없으면 넘어간다(튜토리얼 · 스킵 단추)
        step += 1;
        if (d.action.type === "reset") { failed = `/${g.click}/ 찾다가 막힘(처음부터 할 수 없음)`; break; }
        const pre = obs;
        const r = await stepOnce(game, pre, d.action, 700);
        obs = r.cur;
        memory.see(obs);
        if (r.res.ok) { memory.learn(pre, d.action, obs); path.push({ label: d.action.label, via: d.via ?? "explore" }); } else memory.fail(pre.screen, d.action.key);
        stuck = pre.screen === obs.screen ? stuck + 1 : 0;
        rec.step({ scenario: tag, step: totalSteps + step, action: d.action, why: d.why, via: d.via, result: r.res, to: obs.screen, title: obs.title });
        await sink(r.found, totalSteps + step, obs);
      }
      if (failed) break;
      if (!target) {
        if (g.optional) continue;
        failed = `목표 단추 /${g.click}/ 를 ${step}걸음 안에 못 찾음`;
        break;
      }
      // 목표는 한 번만 누른다(무반응 다시 누르기 없음 — 두 번 들어가면 판정이 틀어진다)
      const pre = obs;
      const res = await game.act({ type: "tap", ref: target.ref, key: target.key, label: target.label });
      await sleep(g.waitMs ?? 900);
      obs = await game.observe();
      memory.see(obs);
      if (res.ok) memory.learn(pre, { type: "tap", key: target.key }, obs);
      path.push({ label: target.label, via: "goal", ok: res.ok });
      step += 1;
      rec.step({ scenario: tag, step: totalSteps + step, action: { type: "tap", key: target.key, label: target.label }, why: "목표", via: "goal", result: res, to: obs.screen, title: obs.title });
      await sink(checkRules({ prev: pre, action: { type: "tap", key: target.key, label: target.label }, result: res, cur: obs, events: game.drainEvents() }).filter((i) => i.type !== "unresponsive"), totalSteps + step, obs);
      if (!res.ok) { failed = `/${g.click}/ 누르기 실패: ${res.why}`; break; }
    }
    totalSteps += step;

    // 판정 — 저장이 늦게 적히고 연출이 잠깐만 보이므로 waitMs 동안 다시 보며 기다린다.
    // 기본은 "같은 순간에 모두 맞음". once: true 인 판정(잠깐 뜨는 연출)은 기다리는 동안 한 번이라도 맞으면 맞은 것으로 남긴다
    let j = null;
    if (!failed) {
      const expects = m.expect ?? [];
      const seen = new Map(), drawnFail = new Map();
      const until = Date.now() + (m.waitMs ?? 4000);
      do {
        j = await judgeNow(game, expects, start);
        obs = j.obs;
        expects.forEach((e, i) => {
          if (!e.once) return;
          if (j.parts[i].ok && !seen.has(i)) seen.set(i, j.parts[i]);
          else if (!j.parts[i].ok && !/그려짐 0\//.test(j.parts[i].detail)) drawnFail.set(i, j.parts[i]); // 그려졌을 때의 실패 근거를 남긴다(연출이 닫힌 뒤의 "안 그려짐" 대신)
        });
        j.parts = j.parts.map((p, i) => seen.get(i) ?? drawnFail.get(i) ?? p);
        j.pass = j.parts.every((p) => p.ok);
        if (j.pass) break;
        await sleep(expects.some((e, i) => e.once && !seen.has(i)) ? 60 : 250);
      } while (Date.now() < until);
    }
    const shot = rec.shotPath(totalSteps).replace(/step-\d+\.jpg$/, `${sc.id}-r${run}-${m.id}.jpg`);
    await game.screenshot(shot).catch(() => {});
    const pass = !failed && j?.pass;
    const detail = failed ?? j.parts.map((p, i) => `${p.ok ? "✓" : "✗"} ${p.detail}`).join(" · ");
    results.push({ id: m.id, name: m.name, kind: m.kind, status: pass ? "pass" : "fail", detail, steps: step, seconds: Math.round((Date.now() - mt0) / 1000), path, shot });
    log(`  ${tag} ${pass ? "통과" : "실패"} — ${String(detail).slice(0, 160)}`);
    if (!pass && sc.stopOnFail !== false) alive = false;
  }
  return { id: sc.id, name: sc.name, run, results, seconds: Math.round((Date.now() - t0) / 1000), steps: totalSteps };
}

/** 여러 판의 결과 → 마일스톤 · 종류 · 전체 비율(Gamer 표 6처럼: 통과한 실행 / 잰 실행. 건너뜀은 잰 것에서 뺀다) */
export function summarize(runs) {
  const byMs = new Map(), byKind = new Map();
  let pass = 0, measured = 0, complete = 0;
  for (const r of runs) {
    if (r.results.every((x) => x.status === "pass")) complete += 1;
    for (const x of r.results) {
      const k = `${r.id}/${x.id}`;
      const m = byMs.get(k) ?? { scenario: r.id, id: x.id, name: x.name, kind: x.kind, pass: 0, fail: 0, skip: 0, details: [] };
      m[x.status] += 1;
      if (x.status !== "pass") m.details.push(`r${r.run}: ${x.detail}`);
      byMs.set(k, m);
      if (x.status === "skip") continue;
      measured += 1;
      if (x.status === "pass") pass += 1;
      const kd = byKind.get(x.kind) ?? { pass: 0, n: 0 };
      kd.n += 1;
      if (x.status === "pass") kd.pass += 1;
      byKind.set(x.kind, kd);
    }
  }
  return { milestones: [...byMs.values()], kinds: Object.fromEntries(byKind), pass, measured, complete, runs: runs.length };
}
