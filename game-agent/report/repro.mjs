/**
 * 재현 — 찾은 문제를 "리셋 → 같은 행동"으로 다시 돌려 진짜인지 가린다(한 번만 나는 문제와 진짜 버그를 가른다).
 * 내보낸 스크립트는 관문 검사 형식: 문제가 다시 나면 FAIL(종료 코드 1), 안 나면 PASS — 고친 뒤 회귀 검사로 그대로 쓴다.
 */
import { writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { openWebGame } from "../bridge/web-cdp.mjs";
import { stepOnce } from "../executor/loop.mjs";
import { checkRules, issueSignature } from "../oracles/rules.mjs";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const head = (s) => String(s).replace(/[0-9]+/g, "#").slice(0, 40);
const same = (a, b) => issueSignature(a) === issueSignature(b) || (a.type === b.type && head(a.detail) === head(b.detail));

/** @param {{ type: string, detail: string, steps: any[], preset: string, faults?: string[] }} issue */
export async function replay(issue, { game: shared, base } = {}) {
  const game = shared ?? (await openWebGame({ base, faults: issue.faults ?? [] }));
  try {
    await game.reset(issue.preset);
    let obs = await game.observe();
    let hits = checkRules({ cur: obs, events: game.drainEvents() }).filter((i) => same(i, issue));
    for (const a of issue.steps) {
      if (hits.length) break;
      if (a.type !== "tap") { await game.act(a); await sleep(500); obs = await game.observe(); continue; }
      const r = await stepOnce(game, obs, a, 700);
      obs = r.cur;
      hits = r.found.filter((i) => same(i, issue));
    }
    if (!hits.length) { await sleep(1500); hits = checkRules({ cur: await game.observe(), events: game.drainEvents() }).filter((i) => same(i, issue)); }
    return { reproduced: hits.length > 0, detail: hits[0]?.detail ?? "다시 나지 않음" };
  } finally {
    if (!shared) await game.close();
  }
}

/** runs/<판>/repro-<id>.mjs 로 내보낸다 */
export function writeRepro(issue, runDir) {
  const lib = relative(runDir, fileURLToPath(import.meta.url)).replace(/\\/g, "/");
  const data = { type: issue.type, title: issue.title, detail: issue.detail, sig: issue.sig, steps: issue.steps, preset: issue.preset, faults: issue.faults };
  const file = join(runDir, `repro-${issue.id}.mjs`);
  writeFileSync(file, `/**
 * 재현 스크립트 — ${issue.title}: ${String(issue.detail).replace(/\*\//g, "* /").slice(0, 120)}
 * 처음 난 곳: 걸음 ${issue.step} · 화면 "${issue.screenTitle || issue.screen}" · 리셋(${issue.preset}) 뒤 행동 ${issue.steps.length}개
 * 관문 검사 형식 — 문제가 다시 나면 FAIL(종료 코드 1), 안 나면 PASS. dev 서버(5173)가 떠 있어야 한다.
 *   node ${relative(process.cwd(), file).replace(/\\/g, "/")}
 */
import { replay } from "${lib.startsWith(".") ? lib : "./" + lib}";
const issue = ${JSON.stringify(data, null, 2)};
const r = await replay(issue);
console.log(r.reproduced ? "FAIL" : "PASS", issue.title, "—", r.detail);
process.exit(r.reproduced ? 1 : 0);
`);
  return file;
}
