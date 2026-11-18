#!/usr/bin/env node
/**
 * 게임플레이 테스트 에이전트 POC — 실행 입구. dev 서버(5173)가 떠 있어야 한다.
 *
 *   node game-agent/run.mjs explore [--steps 120] [--minutes 10] [--preset mid] [--seed 1] [--fault crash,dead]
 *   node game-agent/run.mjs faults  [--steps 40]        주입 버그 4종 + 대조군 — 규칙 판정이 잡는지
 *   node game-agent/run.mjs verify  [game-agent/requests/claims.json] [--only id,id]
 *   node game-agent/run.mjs repro   <runs/판 폴더>        이슈마다 재현 · 재현 스크립트 · 이슈 초안
 *   node game-agent/run.mjs screens [--set design|holdout|all] [--only b05,h03]   화면 벤치 — 화면 버그 10종을 넣고 규칙이 대상을 짚는지
 *   node game-agent/run.mjs scenario [requests/scenarios.json] [--only id,id] [--runs 3] [--regress rift-chip,...]
 *                                                        시나리오 — 긴 흐름을 마일스톤마다 상태 · 화면으로 판정. --regress 는 고친 버그를 되살려 잡는지 확인
 *   node game-agent/run.mjs stats                        기억(화면 지도) 크기
 *
 * 결과는 game-agent/runs/ (저장소에 올리지 않는다). 모델은 AGENT_MODEL_URL(자체 게이트웨이)이 있을 때만 쓴다.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { openWebGame } from "./bridge/web-cdp.mjs";
import { FAULTS, SCENARIO_REGRESSIONS } from "./bridge/faults.mjs";
import { runClaim, runExplore } from "./executor/loop.mjs";
import { runScenario, summarize } from "./executor/scenario.mjs";
import { Memory } from "./memory/store.mjs";
import { modelFromEnv } from "./model/gateway.mjs";
import { planClaims, planExplore } from "./planner/plan.mjs";
import { SEVERITY } from "./oracles/rules.mjs";
import { Recorder } from "./report/record.mjs";
import { replay, writeRepro } from "./report/repro.mjs";
import { writeIssueDraft } from "./report/issue.mjs";
import { runScreens } from "./bench/screens.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const RUNS = join(HERE, "runs");
const MEMORY = join(RUNS, "memory.json");
const log = (...a) => console.log(...a);

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i].startsWith("--")) { const k = argv[i].slice(2); out[k] = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[(i += 1)] : true; } else out._.push(argv[i]);
  }
  return out;
}

const SEV = { high: "높음", medium: "보통", low: "낮음", info: "참고" };
function issueTable(issues) {
  if (!issues.length) return "없음\n";
  return "| id | 심각도 | 종류 | 내용 | 걸음 | 재현 |\n|---|---|---|---|---|---|\n" + issues.map((i) => `| ${i.id} | ${SEV[i.severity]} | ${i.type} | ${i.title}: ${String(i.detail).replace(/\|/g, "\\|").replace(/\n/g, " ").slice(0, 90)} | ${i.step} | ${i.reproduced === undefined ? "-" : i.reproduced ? "다시 남" : "안 남"} |`).join("\n") + "\n";
}

async function explore(args) {
  const plan = planExplore(args);
  // --fresh(주입 시험) — 빈 기억으로 시작하고 남기지 않는다: 대조군과 주입 판이 같은 조건 · 지도를 더럽히지 않는다
  const memory = new Memory(args.fresh ? null : MEMORY);
  const before = memory.stats();
  const model = modelFromEnv();
  const rec = new Recorder(RUNS, plan.faults.length ? `explore-${plan.faults.join("+")}` : "explore", { ...plan, model: model?.name ?? null, memoryBefore: before });
  const game = await openWebGame({ faults: plan.faults });
  log(`탐색 시작 — ${plan.steps}걸음 · ${plan.ms / 60000}분 상한 · 저장 ${plan.preset} · 시드 ${plan.seed}${plan.faults.length ? ` · 주입 ${plan.faults}` : ""} · 기억 화면 ${before.screens}`);
  let res;
  try { res = await runExplore(game, plan, { memory, rec, model, log }); } finally { await game.close(); }
  memory.save();
  const after = memory.stats();
  const { dir, issues } = rec.finish({ ...res, memoryAfter: after, modelCalls: model?.calls ?? 0 });
  const real = issues.filter((i) => i.severity !== "info");
  writeFileSync(join(dir, "report.md"), `# 탐색 판 ${dir.split(/[\\/]/).pop()}\n\n| 항목 | 값 |\n|---|---|\n| 걸음 · 시간 | ${res.steps}걸음 · ${res.seconds}초 |\n| 이번 판 화면 | ${res.screensThisRun} |\n| 기억 화면 · 연결 | ${before.screens} → ${after.screens} · ${before.edges} → ${after.edges} |\n| 판단 출처 | 탐색 ${res.tally.explore} · 아는 길 ${res.tally.harness} · 모델 ${res.tally.model} · 리셋 ${res.tally.resets} · 실패한 누르기 ${res.tally.failedActs} |\n\n## 이슈 후보\n${issueTable(real)}\n## 참고(격리로 막은 외부 요청 등)\n${issueTable(issues.filter((i) => i.severity === "info"))}`);
  log(`끝 — ${res.steps}걸음 · ${res.seconds}초 · 이번 판 화면 ${res.screensThisRun} · 기억 화면 ${after.screens} · 이슈 후보 ${real.length}`);
  for (const i of real) log(`  ${i.id} [${SEV[i.severity]}] ${i.type} — ${i.title}: ${String(i.detail).slice(0, 100)}`);
  log(`결과: ${dir}`);
  return { dir, issues, res };
}

/** 주입 버그마다 탐색 한 판 + 대조군 — 기대한 종류의 이슈가 나오면 잡은 것 */
async function faults(args) {
  const steps = args.steps ?? 40;
  const rows = [];
  const control = await explore({ ...args, steps, seed: args.seed ?? 7, fault: "", fresh: true });
  const base = new Set(control.issues.filter((i) => i.severity !== "info").map((i) => i.type));
  rows.push({ name: "대조군(주입 없음)", expect: "-", caught: "-", found: [...base].join(", ") || "없음" });
  for (const [name, f] of Object.entries(FAULTS)) {
    if (args.only && !String(args.only).split(",").includes(name)) continue;
    const r = await explore({ ...args, steps, seed: args.seed ?? 7, fault: name, fresh: true });
    const hit = r.issues.filter((i) => i.type === f.expect && (!f.match || f.match.test(i.detail)));
    rows.push({ name, expect: f.expect, caught: hit.length ? `잡음(걸음 ${hit[0].step})` : "못 잡음", found: hit.map((i) => i.detail.slice(0, 60)).join(" / ") || [...new Set(r.issues.filter((i) => i.severity !== "info").map((i) => i.type))].join(", ") });
  }
  const md = `# 주입 버그 판정 (${new Date().toLocaleString("ko-KR")})\n\n| 주입 | 기대 판정 | 결과 | 근거 |\n|---|---|---|---|\n${rows.map((r) => `| ${r.name} | ${r.expect} | ${r.caught} | ${r.found.replace(/\|/g, "\\|")} |`).join("\n")}\n`;
  writeFileSync(join(RUNS, "faults-report.md"), md);
  log(md);
}

async function verify(args) {
  const file = resolve(args._[1] ?? join(HERE, "requests", "claims.json"));
  const plan = planClaims(file, JSON.parse(readFileSync(file, "utf8")), args.only);
  const memory = new Memory(MEMORY);
  const rec = new Recorder(RUNS, "verify", { file, claims: plan.claims.map((c) => c.id), memoryBefore: memory.stats() });
  const rows = [];
  for (const claim of plan.claims) {
    const game = await openWebGame({ clock: !!claim.advanceMs });
    try { rows.push({ ...(await runClaim(game, claim, { memory, rec, log })), text: claim.text, answer: claim.answer }); } finally { await game.close(); }
  }
  memory.save();
  const scored = rows.filter((r) => typeof r.answer === "boolean");
  const right = scored.filter((r) => r.verdict === r.answer).length;
  const unknown = rows.filter((r) => r.verdict === null).length;
  const { dir, issues } = rec.finish({ results: rows });
  writeFileSync(join(dir, "results.json"), JSON.stringify(rows, null, 2));
  const md = `# 검증 질문 판정\n\n정답률 ${right}/${scored.length} · 판단 불가 ${unknown}\n\n| id | 주장 | 에이전트 판정 | 사람이 정한 답 | 근거 | 걸음 · 초 | 길(아는 길 · 탐색) |\n|---|---|---|---|---|---|---|\n${rows.map((r) => `| ${r.id} | ${r.text} | ${r.verdict === null ? "판단 불가" : r.verdict ? "참" : "거짓"} | ${r.answer === undefined ? "-" : r.answer ? "참" : "거짓"} | ${String(r.detail).replace(/\|/g, "\\|")} | ${r.steps} · ${r.seconds} | ${r.path.filter((p) => p.via === "harness").length} · ${r.path.filter((p) => p.via === "explore").length} |`).join("\n")}\n\n## 오는 길에 본 이슈 후보\n${issueTable(issues.filter((i) => i.severity !== "info"))}`;
  writeFileSync(join(dir, "report.md"), md);
  log(md);
  log(`결과: ${dir}`);
}

const pct = (a, b) => (b ? `${a}/${b} (${Math.round((a / b) * 100)}%)` : "-");
const KIND = { nav: "이동", ui: "UI", combat: "전투", reward: "보상" };

/** 시나리오 — 시나리오마다 runs 판. 판마다 브라우저를 새로 연다(앞 판의 상태가 새지 않게) */
async function scenario(args) {
  const file = resolve(args._[1] ?? join(HERE, "requests", "scenarios.json"));
  let list = JSON.parse(readFileSync(file, "utf8"));
  if (args.only) list = list.filter((s) => String(args.only).split(",").includes(s.id));
  if (!list.length) throw new Error(`시나리오 없음: ${args.only ?? file}`);
  const runsN = Number(args.runs ?? 1);
  const regress = args.regress ? String(args.regress).split(",").filter(Boolean) : [];
  for (const r of regress) if (!SCENARIO_REGRESSIONS[r]) throw new Error(`없는 회귀 주입: ${r} (있는 것: ${Object.keys(SCENARIO_REGRESSIONS).join(", ")})`);
  const css = regress.map((r) => SCENARIO_REGRESSIONS[r].css);
  const memory = new Memory(MEMORY);
  const rec = new Recorder(RUNS, regress.length ? `scenario-${regress.join("+")}` : "scenario", { file, scenarios: list.map((s) => s.id), runs: runsN, regress, memoryBefore: memory.stats() });
  log(`시나리오 ${list.length}개 × ${runsN}판${regress.length ? ` · 회귀 주입 ${regress}` : ""}`);
  const all = [];
  for (const sc of list) {
    for (let r = 1; r <= runsN; r += 1) {
      const game = await openWebGame({ css });
      try { all.push(await runScenario(game, sc, { memory, rec, seed: r, log, run: r })); } finally { await game.close(); }
    }
  }
  memory.save();
  const sum = summarize(all);
  const { dir, issues } = rec.finish({ summary: sum });
  writeFileSync(join(dir, "results.json"), JSON.stringify(all, null, 2));
  const kinds = Object.entries(sum.kinds).map(([k, v]) => `${KIND[k] ?? k} ${pct(v.pass, v.n)}`).join(" · ");
  const rows = sum.milestones.map((m) => `| ${m.scenario} | ${m.id} — ${m.name} | ${KIND[m.kind] ?? m.kind} | ${m.pass} | ${m.fail} | ${m.skip} | ${m.details.join(" ; ").replace(/\|/g, "\\|").slice(0, 400) || "-"} |`).join("\n");
  let reg = "";
  if (regress.length) {
    const failedIds = new Set(sum.milestones.filter((m) => m.fail > 0).map((m) => `${m.scenario}/${m.id}`));
    reg = `\n## 회귀 주입 — 깨져야 할 마일스톤을 잡았나\n\n| 주입 | 되살린 버그(고친 커밋) | 깨져야 할 마일스톤 | 결과 |\n|---|---|---|---|\n${regress.map((r) => `| ${r} | ${SCENARIO_REGRESSIONS[r].fix} | ${SCENARIO_REGRESSIONS[r].expect} | ${failedIds.has(SCENARIO_REGRESSIONS[r].expect) ? "잡음(실패로 판정)" : "못 잡음"} |`).join("\n")}\n\n대상이 아닌데 실패한 마일스톤: ${[...failedIds].filter((id) => !regress.some((r) => SCENARIO_REGRESSIONS[r].expect === id)).join(", ") || "없음"}\n`;
  }
  const md = `# 시나리오 판정 ${dir.split(/[\\/]/).pop()}\n\n| 항목 | 값 |\n|---|---|\n| 마일스톤 정확도(통과 / 잰 실행) | ${pct(sum.pass, sum.measured)} |\n| 끝까지 완료한 판 | ${pct(sum.complete, sum.runs)} |\n| 종류별 | ${kinds || "-"} |\n| 걸음 · 초(합) | ${all.reduce((a, r) => a + r.steps, 0)} · ${all.reduce((a, r) => a + r.seconds, 0)} |\n\n| 시나리오 | 마일스톤 | 종류 | 통과 | 실패 | 건너뜀 | 실패 근거 |\n|---|---|---|---|---|---|---|\n${rows}\n${reg}\n## 오는 길에 본 이슈 후보\n${issueTable(issues.filter((i) => i.severity !== "info"))}`;
  writeFileSync(join(dir, "report.md"), md);
  log(md);
  log(`결과: ${dir}`);
  return { dir, sum };
}

async function repro(args) {
  const dir = resolve(args._[1]);
  const issues = JSON.parse(readFileSync(join(dir, "issues.json"), "utf8"));
  const real = issues.filter((i) => SEVERITY[i.severity] > 0);
  for (const i of real) {
    const r = await replay(i);
    i.reproduced = r.reproduced;
    i.reproDetail = r.detail;
    writeRepro(i, dir);
    writeIssueDraft(i, dir, r);
    log(`  ${i.id} ${i.type} — ${r.reproduced ? "다시 남" : "안 남"} (${r.detail.slice(0, 80)})`);
  }
  writeFileSync(join(dir, "issues.json"), JSON.stringify(issues, null, 2));
  const n = real.filter((i) => i.reproduced).length;
  log(`재현률 ${n}/${real.length}`);
  try {
    const rep = readFileSync(join(dir, "report.md"), "utf8").replace(/## 이슈 후보\n[\s\S]*?(?=\n## |$)/, `## 이슈 후보\n${issueTable(real)}\n재현률 ${n}/${real.length}\n`);
    writeFileSync(join(dir, "report.md"), rep);
  } catch { /* 검증 판 등 report 모양이 다르면 그대로 둔다 */ }
}

const args = parseArgs(process.argv.slice(2));
const cmd = args._[0];
const t0 = Date.now();
if (cmd === "explore") await explore(args);
else if (cmd === "faults") await faults(args);
else if (cmd === "verify") await verify(args);
else if (cmd === "repro") await repro(args);
else if (cmd === "scenario") await scenario(args);
else if (cmd === "screens") {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace("T", "-").slice(0, 15);
  const dir = join(RUNS, `${stamp}-screens`);
  await runScreens({ set: args.set ?? "all", only: args.only, dir, log });
  log(`결과: ${dir}`);
}
else if (cmd === "stats") log(new Memory(MEMORY).stats());
else { log(readFileSync(fileURLToPath(import.meta.url), "utf8").split("*/")[0]); process.exit(1); }
log(`(전체 ${Math.round((Date.now() - t0) / 1000)}초)`);
