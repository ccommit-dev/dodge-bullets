// 비트 — 고른 곡이 실제로 나오는가, 아이폰과 같은 엔진(WebKit)으로 (2026-10-29, 아쉬운 점 "데스크톱 엔진으로만 확인")
//   PLAYWRIGHT_DIR=<playwright@1.56.1 설치 폴더> node scripts/_probe-beat-song-webkit.mjs [곡 id ...]   (vite 5173)
// 아이폰 기기 흉내(터치 · 모바일 사파리 UA)로 비트 수련을 열고 곡 칩을 손가락 탭 → __beatSession 의 곡 · 배경 오디오 src · 재생 중인지.
// 실제 카카오톡 앱은 아니다(같은 WebKit 엔진). 곡마다 새 페이지라 앞 곡의 오디오가 섞이지 않는다
import { createRequire } from "node:module";
import { join } from "node:path";
const req = createRequire(join(process.env.PLAYWRIGHT_DIR ?? process.cwd(), "package.json"));
const { webkit, devices } = req("playwright");
const BASE = "http://localhost:5173", H = "mock-local-dev";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const wants = process.argv.slice(2).length ? process.argv.slice(2) : ["cherry-pop", "pixel-rush"];
const browser = await webkit.launch();
const results = [];
for (const want of wants) {
  const ctx = await browser.newContext({ ...devices["iPhone 13"] });
  const page = await ctx.newPage();
  const errors = []; page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));
  const now = Date.now();
  await page.goto(BASE, { waitUntil: "networkidle" });
  const progress = { version: 5, onboardingStep: 4, level: 30, redGems: 500, sharedCoins: 100000, pioneeredArea: 2, titanBestStage: 6, dodgeBestStage: 2, idleClaimedAt: now, updatedAt: now, partyIds: ["mia", "leon"], partyCap: 4, sessionCount: 9, claimedRewards: ["dodge-tutorial", "welcome-gift"] };
  // 심기와 reload 를 한 evaluate 로 — 떠 있던 사냥터가 떠나며 옛 저장으로 덮지 않게
  await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); location.reload(); }, {
    [`dodgebullets:progression:v1:${H}`]: JSON.stringify(progress),
    [`dodgebullets:titans:${H}`]: JSON.stringify({ gold: 1000, stage: 3, bestStage: 3, heroes: { mia: 5, leon: 5 }, lastActiveAt: now }),
    "dodge-bullets:soundEnabled": "1",
    [`dodgebullets:attendance:v1:${H}`]: JSON.stringify({ lastClaimDate: new Date().toLocaleDateString("sv-SE"), totalDays: 3, consecutiveDays: 3 }),
  }).catch(() => {});
  await page.waitForLoadState("networkidle").catch(() => {});
  await sleep(1800);
  await page.evaluate(() => { for (let k = 0; k < 4; k += 1) [...document.querySelectorAll("button")].find((x) => /^(닫기|확인|나중에)$/.test(x.textContent.trim()))?.click(); });
  const tap = async (sel, text = "") => {
    const loc = page.locator(sel, text ? { hasText: text } : {}).first();
    if (!(await loc.count())) return false;
    await loc.scrollIntoViewIfNeeded(); await loc.tap(); return true;
  };
  await tap(".titans-bottom-nav button", "모험"); await sleep(500);
  await tap(".nav-popup-grid button", "비트 수련"); await sleep(1800);
  const chips = await page.evaluate(() => [...document.querySelectorAll(".beat-song-chip")].map((b) => b.dataset.track));
  const tapped = await tap(`.beat-song-chip[data-track="${want}"]`);
  await sleep(3500);
  const st = await page.evaluate(() => { const s = window.__beatSession; return s ? { track: s.track?.id ?? null, src: s.backingAudio?.src ?? null, paused: s.backingAudio?.paused ?? null, t: s.backingAudio?.currentTime ?? null, ctx: s.ctx?.state ?? null } : null; });
  const ok = !!st && st.track === want && (st.src ?? "").includes(want) && st.paused === false && (st.t ?? 0) > 0.5;
  results.push({ want, ok, tapped, chips: chips.length, st, errors });
  await ctx.close();
}
await browser.close();
for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"} WebKit(아이폰 13) 곡 '${r.want}' — ${JSON.stringify({ tapped: r.tapped, chips: r.chips, ...r.st, errors: r.errors })}`);
console.log(results.every((r) => r.ok) ? "ALL PASS" : `${results.filter((r) => !r.ok).length} FAIL`);
process.exit(results.every((r) => r.ok) ? 0 : 1);
