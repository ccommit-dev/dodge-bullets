/**
 * 검증 스위트 순차 실행기 — 브라우저 스위트를 동시에 돌리면 부하로 타이밍 판정(겹침·HMR)이 한 번씩 튄다.
 * 항상 이 러너로 하나씩 돌린다. 노드 스위트 → 브라우저 스위트 순.
 *   node scripts/verify-all.mjs            (dev 서버 5173 필요)
 *   node scripts/verify-all.mjs --node     (브라우저 없이 노드 스위트만)
 */
import { spawnSync } from "node:child_process";

const NODE_SUITES = ["verify-systems", "verify-content", "beat-chart-report"];
const BROWSER_SUITES = ["verify-shop", "verify-checklist", "verify-retention", "verify-offers", "verify-gacha", "verify-anim", "verify-play-art", "inspect-mobile"];
const nodeOnly = process.argv.includes("--node");
const suites = nodeOnly ? NODE_SUITES : [...NODE_SUITES, ...BROWSER_SUITES];
const failed = [];
for (const name of suites) {
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [`scripts/${name}.mjs`], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const out = (r.stdout || "") + (r.stderr || "");
  const ok = r.status === 0 && !/\bFAIL\b|\d+ FAIL/.test(out) && !/Error:/.test(out.split("\n").slice(-6).join("\n"));
  const fails = out.split("\n").filter((l) => /^FAIL/.test(l));
  console.log(`${ok ? "PASS" : "FAIL"} ${name} (${((Date.now() - t0) / 1000).toFixed(0)}s)${fails.length ? "\n  " + fails.join("\n  ") : ""}`);
  if (!ok) failed.push(name);
}
console.log(failed.length ? `\n${failed.length} suite(s) failed: ${failed.join(", ")}` : "\nALL SUITES PASS");
process.exit(failed.length ? 1 : 0);
