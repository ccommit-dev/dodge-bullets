/**
 * 검증 스위트 순차 실행기 — 브라우저 스위트를 동시에 돌리면 부하로 타이밍 판정(겹침·HMR)이 한 번씩 튄다.
 * 항상 이 러너로 하나씩 돌린다. 노드 스위트 → 브라우저 스위트 순.
 *   node scripts/verify-all.mjs            (dev 서버 5173 필요)
 *   node scripts/verify-all.mjs --node     (브라우저 없이 노드 스위트만)
 * 아이폰 엔진(WebKit · 카카오톡) 스위트 (2026-10-28) — PLAYWRIGHT_DIR 또는 %LOCALAPPDATA%\dodge-pw 에 playwright 가 있으면 마지막에 돈다.
 *   없으면 '건너뜀'(실패 아님). playwright 는 프로젝트 의존성이 아니라 저장소 밖 고정 폴더에 둔다(메모리 webkit-kakao-check)
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const NODE_SUITES = ["verify-systems", "verify-content", "verify-payments", "beat-chart-report", "first-session-probe", "audit-anim2-motion", "verify-archer", "verify-crystal-tree", "verify-quests", "verify-relic-forge-econ", "verify-boss-pressure", "verify-difficulty"];
const BROWSER_SUITES = ["probe-native-boot", "verify-native-parity", "verify-shop", "verify-checklist", "verify-retention", "verify-offers", "verify-gacha", "verify-anim", "verify-anim-clip", "verify-play-art", "verify-dodge-hud", "verify-settings", "verify-skill-cast", "inspect-formation", "inspect-mobile", "verify-qa-unlock", "verify-walk-y", "verify-anim2", "verify-web-frame", "verify-formation", "scan-readability", "verify-card-fold", "verify-archer-play", "verify-archer-play2", "verify-crystal-tree-play", "verify-quests-play", "verify-weapons-play", "verify-weapon-grip", "verify-hunt-motion", "verify-skill-shop", "verify-shop-touch", "verify-idle-return", "verify-bgm-scenes"];
/** 아이폰 엔진으로 도는 스위트 — 이름 · 스크립트 · 더할 환경 */
const WEBKIT_SUITES = [
  { name: "verify-shop-touch:webkit", script: "verify-shop-touch", env: { ENGINE: "webkit" } },
  { name: "beat-song:webkit", script: "_probe-beat-song-webkit", env: {} },
];
const nodeOnly = process.argv.includes("--node");
const pwDir = process.env.PLAYWRIGHT_DIR || join(process.env.LOCALAPPDATA ?? "", "dodge-pw");
const hasPw = existsSync(join(pwDir, "node_modules", "playwright", "package.json"));
const suites = nodeOnly ? NODE_SUITES.map((n) => ({ name: n, script: n })) : [...NODE_SUITES, ...BROWSER_SUITES].map((n) => ({ name: n, script: n }));
if (!nodeOnly) {
  if (hasPw) suites.push(...WEBKIT_SUITES.filter((w) => existsSync(`scripts/${w.script}.mjs`)).map((w) => ({ ...w, env: { ...w.env, PLAYWRIGHT_DIR: pwDir } })));
  else console.log(`SKIP 아이폰 WebKit 스위트 ${WEBKIT_SUITES.length}개 — playwright 없음(PLAYWRIGHT_DIR 또는 ${pwDir})`);
}
const failed = [];
for (const { name, script, env } of suites) {
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [`scripts/${script}.mjs`], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, env: env ? { ...process.env, ...env } : process.env });
  const out = (r.stdout || "") + (r.stderr || "");
  const ok = r.status === 0 && !/\bFAIL\b|\d+ FAIL/.test(out) && !/Error:/.test(out.split("\n").slice(-6).join("\n"));
  const fails = out.split("\n").filter((l) => /^FAIL/.test(l));
  console.log(`${ok ? "PASS" : "FAIL"} ${name} (${((Date.now() - t0) / 1000).toFixed(0)}s)${fails.length ? "\n  " + fails.join("\n  ") : ""}`);
  if (!ok) failed.push(name);
}
console.log(failed.length ? `\n${failed.length} suite(s) failed: ${failed.join(", ")}` : "\nALL SUITES PASS");
process.exit(failed.length ? 1 : 0);
