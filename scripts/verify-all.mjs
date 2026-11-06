/**
 * 검증 스위트 실행기 — 브라우저 스위트를 동시에 돌리면 부하로 타이밍 판정(겹침·HMR)이 한 번씩 튄다.
 *   node scripts/verify-all.mjs            (dev 서버 5173 필요)
 *   node scripts/verify-all.mjs --node     (브라우저 없이 노드 스위트만)
 *   node scripts/verify-all.mjs --serial   (예전처럼 전부 하나씩 · 노드 → 브라우저 순)
 *   node scripts/verify-all.mjs --pool-only (묶음 단계만 — POOLED 를 고친 뒤 몇 번 돌려 거짓 실패가 없는지 본다, 8분 안팎)
 * 두 단계로 돈다 (2026-11-06 — 전체 65분이 같은 트리를 쓰는 세션들의 가장 큰 병목이었다):
 *   1. 단독 — 실시간 전투 · 애니 · 소리 표본을 재는 스위트. 하나씩, 다른 것과 겹치지 않게(부하 조건이 예전과 같다)
 *   2. 묶음 — POOLED(노드 스위트 + 저장 · UI · 상점 기능만 보는 브라우저 스위트)를 POOL_SIZE 개씩 함께. 오래 걸리는 것부터
 *   단독 단계를 먼저 돌려 vite 변환 캐시를 데운 뒤 묶음을 시작한다(차가운 첫 로딩이 동시에 몰리지 않게).
 *   스위트를 POOLED 에 더할 때는 실시간 위치 · 시간 · 소리 단언이 없는지 읽고, 묶음 안에서 시간이 크게 늘지 않는지 본다. 모르면 단독에 둔다.
 *   실패를 다시 돌려 넘기지 않는다(문턱을 올리는 것과 같다).
 * 아이폰 엔진(WebKit · 카카오톡) 스위트 (2026-10-28) — PLAYWRIGHT_DIR 또는 %LOCALAPPDATA%\dodge-pw 에 playwright 가 있으면 돈다.
 *   없으면 '건너뜀'(실패 아님). playwright 는 프로젝트 의존성이 아니라 저장소 밖 고정 폴더에 둔다(메모리 webkit-kakao-check)
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const NODE_SUITES = ["verify-systems", "verify-content", "verify-payments", "beat-chart-report", "first-session-probe", "audit-anim2-motion", "verify-archer", "verify-crystal-tree", "verify-quests", "verify-relic-forge-econ", "verify-boss-pressure", "verify-difficulty"];
const BROWSER_SUITES = ["probe-native-boot", "verify-native-parity", "verify-shop", "verify-checklist", "verify-retention", "verify-offers", "verify-gacha", "verify-no-missing-art", "verify-volume", "verify-ui-merge", "verify-rebirth-ui", "verify-wing-clip", "verify-hud-layout", "verify-equip-window", "verify-gear-sets", "verify-tier-visuals", "verify-mount-ride", "verify-boss-restart", "verify-reel-moments", "verify-party-motion", "verify-ia-move", "verify-mounts", "verify-audio-signal", "verify-anim", "verify-anim-clip", "verify-play-art", "verify-dodge-hud", "verify-settings", "verify-skill-cast", "inspect-formation", "inspect-mobile", "verify-qa-unlock", "verify-walk-y", "verify-anim2", "verify-web-frame", "verify-formation", "scan-readability", "verify-card-fold", "verify-archer-play", "verify-archer-play2", "verify-crystal-tree-play", "verify-quests-play", "verify-weapons-play", "verify-weapon-grip", "verify-hunt-motion", "verify-skill-shop", "verify-shop-touch", "verify-idle-return", "verify-season-refund", "verify-ad-upsell", "verify-feel", "verify-bgm-scenes"];
/** 아이폰 엔진으로 도는 스위트 — 이름 · 스크립트 · 더할 환경 */
const WEBKIT_SUITES = [
  { name: "verify-shop-touch:webkit", script: "verify-shop-touch", env: { ENGINE: "webkit" } },
  { name: "beat-song:webkit", script: "_probe-beat-song-webkit", env: {} },
];
/** 함께 돌려도 되는 스위트 — 오래 걸리는 것부터(2026-11-06 단독 실행 초). 노드 스위트는 esbuild 묶음이라 전부
 *  묶음에서 빠진 것(2026-11-06 첫 시도): skill-shop(잠깐 뜨는 장착 연출) · season-refund(토스트) · volume(음악 게인 오르는 중에 읽음)이 실패, ui-merge 는 27→49초
 *  두 번째 시도: gacha(다시 끼우는 순간 컷인을 놓침 · 85→149초) · gear-sets(끌어다 낀 것이 안 먹음)도 묶음에서만 실패 → 단독. 묶음에서만 깨지면 검사를 고치지 말고 단독으로 옮긴다
 *  세 번째(묶음만 3개씩): shop(구매 반영 전에 읽음 · 102→157초) · shop-touch:webkit · equip-window(짧게 눌러 장착)도 실패 → 단독, 묶음은 2개씩.
 *  다른 세션의 브라우저 · 에뮬레이터가 같은 CPU 를 쓰는 날이 많아 3개씩은 수렴하지 않았다 */
const POOLED = [
  "verify-retention", "verify-qa-unlock", "scan-readability", "verify-checklist", "verify-crystal-tree-play",
  "verify-shop-touch", "verify-no-missing-art", "verify-settings", "inspect-mobile", "verify-content", "verify-web-frame",
  "verify-ia-move", "verify-ad-upsell", "verify-payments", "verify-mounts",
  "verify-idle-return", "probe-native-boot", "audit-anim2-motion", ...NODE_SUITES,
];
const POOL_SIZE = 2;
const nodeOnly = process.argv.includes("--node"), serial = process.argv.includes("--serial"), poolOnly = process.argv.includes("--pool-only");
const pwDir = process.env.PLAYWRIGHT_DIR || join(process.env.LOCALAPPDATA ?? "", "dodge-pw");
const hasPw = existsSync(join(pwDir, "node_modules", "playwright", "package.json"));
const suites = nodeOnly ? NODE_SUITES.map((n) => ({ name: n, script: n })) : [...NODE_SUITES, ...BROWSER_SUITES].map((n) => ({ name: n, script: n }));
if (!nodeOnly) {
  if (hasPw) suites.push(...WEBKIT_SUITES.filter((w) => existsSync(`scripts/${w.script}.mjs`)).map((w) => ({ ...w, env: { ...w.env, PLAYWRIGHT_DIR: pwDir } })));
  else console.log(`SKIP 아이폰 WebKit 스위트 ${WEBKIT_SUITES.length}개 — playwright 없음(PLAYWRIGHT_DIR 또는 ${pwDir})`);
}
const failed = [];
const runSuite = ({ name, script, env }) => new Promise((resolve) => {
  const t0 = Date.now(); let out = "";
  const child = spawn(process.execPath, [`scripts/${script}.mjs`], { env: env ? { ...process.env, ...env } : process.env });
  child.stdout.setEncoding("utf8"); child.stderr.setEncoding("utf8");
  child.stdout.on("data", (d) => { out += d; }); child.stderr.on("data", (d) => { out += d; });
  const done = (status) => {
    const ok = status === 0 && !/\bFAIL\b|\d+ FAIL/.test(out) && !/Error:/.test(out.split("\n").slice(-6).join("\n"));
    const fails = out.split("\n").filter((l) => /^FAIL/.test(l));
    if (!ok && !fails.length) fails.push(...[...out.split("\n").filter((l) => /Error/.test(l)).slice(0, 2), ...out.trim().split("\n").slice(-2)].map((l) => l.trim().slice(0, 200)));   // FAIL 줄 없이 죽으면(종료 코드 · Error:) 오류 줄 · 끝 줄
    console.log(`${ok ? "PASS" : "FAIL"} ${name} (${((Date.now() - t0) / 1000).toFixed(0)}s)${fails.length ? "\n  " + fails.join("\n  ") : ""}`);
    if (!ok) failed.push(name);
    resolve();
  };
  child.on("error", (e) => { out += `\nError: ${e.message}`; done(-1); });
  child.on("close", done);
});
const runPool = async (list, size) => { const queue = [...list]; await Promise.all(Array.from({ length: size }, async () => { while (queue.length) await runSuite(queue.shift()); })); };
const phase = async (label, fn) => { const t0 = Date.now(); await fn(); console.log(`— ${label} ${((Date.now() - t0) / 1000).toFixed(0)}s`); };

const tAll = Date.now();
if (serial || nodeOnly) for (const s of suites) await runSuite(s);
else {
  const pooled = [...new Set(POOLED)].map((n) => suites.find((s) => s.name === n)).filter(Boolean);
  const solo = suites.filter((s) => !pooled.includes(s));
  if (!poolOnly) await phase(`단독 ${solo.length}개`, async () => { for (const s of solo) await runSuite(s); });
  await phase(`묶음 ${pooled.length}개 × ${POOL_SIZE}`, () => runPool(pooled, POOL_SIZE));
}
console.log(`— 전체 ${((Date.now() - tAll) / 1000).toFixed(0)}s`);
console.log(failed.length ? `\n${failed.length} suite(s) failed: ${failed.join(", ")}` : "\nALL SUITES PASS");
process.exit(failed.length ? 1 : 0);
