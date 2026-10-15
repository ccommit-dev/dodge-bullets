/** 몬스터 예비·덤빔 기울기 캡처 (2026-10-15) — node scripts/shoot-monster-lunge.mjs <outDir> · 몬스터가 action-attack 일 때 띠 칸이 덤빔(75%)이고 왼쪽으로 숙였는지 잰다 */
import { launchBrowser } from "./launch-browser.mjs";
import { mkdirSync } from "node:fs";
const OUT = process.argv[2]; mkdirSync(OUT, { recursive: true });
const BASE = "http://localhost:5173", H = "mock-local-dev", now = Date.now();
const browser = await launchBrowser({ args: ["--no-sandbox"] }); const page = await browser.newPage(); const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.goto(BASE, { waitUntil: "networkidle0" });
const progress = { version: 5, level: 40, dodgeBestStage: 3, idleClaimedAt: now, updatedAt: now, onboardingStep: 4, partyIds: ["mia"], partyCap: 4, claimedRewards: ["dodge-tutorial"], pioneeredArea: 99 };
const STAGE = Number(process.env.STAGE ?? 6);
const titans = { gold: 40000, stage: STAGE, bestStage: STAGE, heroes: { mia: 1 }, lastActiveAt: now };
await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); }, { [`dodgebullets:progression:v1:${H}`]: JSON.stringify(progress), [`dodgebullets:titans:${H}`]: JSON.stringify(titans), "dodge-bullets:soundEnabled": "0", "dodgebullets:test-phase": "0" });
await page.reload({ waitUntil: "networkidle0" }); await sleep(2500);
await page.evaluate(() => { for (let k = 0; k < 4; k += 1) { const c = document.querySelector(".idle-claim"); if (c) { c.click(); continue; } const b = [...document.querySelectorAll("button")].filter((x) => /^(닫기|확인|나중에)$/.test(x.textContent.trim()))[0]; if (b) b.click(); } });
const got = {};
for (let i = 0; i < 150 && Object.keys(got).length < 3; i += 1) {
  const r = await page.evaluate(() => { const m = document.querySelector(".titans-monster"); const f = m?.querySelector(".monster-frames"); if (!f) return null; const a = (m.className.match(/action-(\w+)/) || [])[1]; return { a, pos: getComputedStyle(f).backgroundPosition, tf: getComputedStyle(f).transform }; });
  if (r && !got[r.a]) { got[r.a] = r; const el = await page.$(".titans-monster"); if (el) await el.screenshot({ path: `${OUT}/m-${r.a}.png` }); }
  await sleep(60);
}
console.log(JSON.stringify(got));
await browser.close();
