// 빠진 그림 검사 (2026-11-03, 안 쓰는 이미지 135장을 지운 뒤) — 화면을 돌며 같은 출처 요청 중 404 를 모은다. 코드 추적만으로는 "아무도 안 부른다"를 증명할 수 없어서.
// 하단 메뉴 · 서랍 안 탭을 전부 누르고, 동료 · 몬스터 애니 시트와 스킨 썸네일을 파일로도 확인한다.
//   node scripts/verify-no-missing-art.mjs   (vite 5173)
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { launchBrowser } from "./launch-browser.mjs";
const BASE = "http://localhost:5173", H = "mock-local-dev", now = Date.now(), root = process.cwd();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0; const ok = (n, c, d = "") => { console.log(`${c ? "PASS" : "FAIL"} ${n}${d ? " — " + d : ""}`); if (!c) fails += 1; };
// ── 파일: 코드가 이름으로 고르는 시트가 다 있나 ──
const layout = readFileSync(join(root, "src/titans/animLayout.ts"), "utf8");
const setOf = (name) => JSON.parse(layout.match(new RegExp(`${name}: readonly string\\[\\] = (\\[[^\\]]*\\])`))[1]);
const noSheet = (ids, dir) => ids.filter((id) => !existsSync(join(root, `public/titans/anim/${dir}/${id}.webp`)));
const allyMissing = noSheet(setOf("ALLY_ANIM_SET"), "allies"), monMissing = noSheet(setOf("MONSTER_ANIM_SET"), "monsters");
ok("동료 애니 시트가 모두 있다", allyMissing.length === 0, allyMissing.join());
ok("몬스터 애니 시트가 모두 있다", monMissing.length === 0, monMissing.join());
const literal = [...readFileSync(join(root, "src/titans/SpriteArt.tsx"), "utf8").matchAll(/assetUrl\("(titans\/[^"]+)"\)/g), ...readFileSync(join(root, "src/titans/skins.ts"), "utf8").matchAll(/assetUrl\("(titans\/[^"]+)"\)/g)].map((m) => m[1]);
const litMissing = literal.filter((p) => !existsSync(join(root, "public", p)));
ok(`SpriteArt · skins 의 고정 경로 ${literal.length}개가 모두 있다`, literal.length > 20 && litMissing.length === 0, litMissing.join());
ok("금빛 사자 돌진 그림은 남아 있다(이것만 애니 시트 밖에서 쓴다)", existsSync(join(root, "public/titans/generated/monsters/golden-lion-clean-attack.png")));
// ── 화면: 실제 요청 ──
const browser = await launchBrowser({ args: ["--no-sandbox"] }); const page = await browser.newPage();
const errors = [], missing = new Set(); page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
page.on("response", (r) => { const u = r.url(); if (u.startsWith(BASE) && r.status() >= 400 && /\.(png|webp|jpg|jpeg|svg|gif|mp3|ogg)(\?|$)/.test(u)) missing.add(u.replace(BASE, "")); });
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
await page.goto(BASE, { waitUntil: "networkidle0" });
const today = new Date().toLocaleDateString("sv-SE");
const progress = { version: 5, level: 40, redGems: 5000, attendanceStreak: 5, idleClaimedAt: now, updatedAt: now, onboardingStep: 4, sessionCount: 9, partyIds: ["mia", "leon", "toto", "aurora"], partyCap: 4, claimedRewards: ["dodge-tutorial", "welcome-gift", "surprise-gift"], pioneeredArea: 5, discoverySeeded: true, discovered: ["monster:slime", "ally:mia", "ally:leon"], gachaPulls: 30 };
await Promise.all([page.waitForNavigation({ waitUntil: "networkidle0" }).catch(() => {}), page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); setTimeout(() => location.reload(), 0); }, {
  [`dodgebullets:progression:v1:${H}`]: JSON.stringify(progress),
  [`dodgebullets:titans:${H}`]: JSON.stringify({ gold: 5e9, stage: 26, bestStage: 26, heroes: { mia: 5, leon: 5, toto: 3, aurora: 3 }, lastActiveAt: now }),
  [`dodgebullets:attendance:v1:${H}`]: JSON.stringify({ lastClaimDate: today, totalDays: 3, consecutiveDays: 3 }),
  "dodgebullets:test-phase": "0",
})]);
await sleep(1200);
await page.evaluate(() => { for (let k = 0; k < 5; k += 1) { const c = document.querySelector(".idle-claim"); if (c) { c.click(); continue; } const b = [...document.querySelectorAll("button")].filter((x) => !x.closest(".titans-bottom-nav")).find((x) => /^(닫기|확인|나중에)$/.test(x.textContent.trim())); if (b) b.click(); } });
await sleep(400);
const labels = (sel) => page.evaluate((s) => [...document.querySelectorAll(s)].map((b) => b.textContent.trim()).filter(Boolean), sel);
const clickAt = (sel, text) => page.evaluate(({ sel, text }) => { const b = [...document.querySelectorAll(sel)].find((x) => x.textContent.trim() === text); b?.click(); return !!b; }, { sel, text });
const navs = await labels(".titans-bottom-nav button"); let visited = 0;
ok("하단 메뉴가 보인다", navs.length >= 3, navs.join(" · "));
for (const nav of navs) {
  await clickAt(".titans-bottom-nav button", nav); await sleep(500); visited += 1;
  for (const sel of [".hub-sheet-switch button", ".titans-growth-tabs button"]) {
    for (const tab of await labels(sel)) { await clickAt(sel, tab); await sleep(350); visited += 1; await page.evaluate(() => { const s = document.querySelector(".hub-sheet-body, .hub-sheet"); if (s) s.scrollTop = s.scrollHeight; }); await sleep(150); }
  }
  await page.evaluate(() => document.querySelector(".hub-sheet-close")?.click()); await sleep(300);
}
console.log(`화면 ${visited}곳을 돌았다`);
ok("여러 화면을 실제로 돌았다", visited >= 6, String(visited));
ok("화면을 도는 동안 빠진 그림 · 소리 없음", missing.size === 0, [...missing].slice(0, 12).join(" "));
ok("페이지 오류 없음", errors.length === 0, errors.join(" | "));
await browser.close();
console.log(fails ? `\n${fails} FAIL` : "\nALL PASS");
process.exit(fails ? 1 : 0);
