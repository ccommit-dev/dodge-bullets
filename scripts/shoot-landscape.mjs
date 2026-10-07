// 가로 화면 캡처 (2026-10-07) — 844×390 폰 가로. 사냥터 · 댐 방어전 메뉴 · 비트 메뉴 · 전투. 겹침·넘침을 잰다
//   node scripts/shoot-landscape.mjs <outDir>
import { launchBrowser } from "./launch-browser.mjs";
import { mkdirSync } from "node:fs";
const OUT = process.argv[2] ?? "shots-landscape"; mkdirSync(OUT, { recursive: true });
const BASE = "http://localhost:5173", H = "mock-local-dev", now = Date.now();
const browser = await launchBrowser({ args: ["--no-sandbox", "--disable-gpu"] });
const page = await browser.newPage();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = []; page.on("pageerror", (e) => errors.push(String(e.stack ?? e).slice(0, 300)));
const clickText = (sel, text) => page.evaluate(({ sel, text }) => { const el = [...document.querySelectorAll(sel)].find((b) => b.textContent.trim().includes(text)); el?.click(); return !!el; }, { sel, text });
await page.setViewport({ width: Number(process.env.W ?? 844), height: Number(process.env.H ?? 390), deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.goto(BASE, { waitUntil: "networkidle0" });
await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); }, {
  [`dodgebullets:progression:v1:${H}`]: JSON.stringify({ version: 5, level: 30, redGems: 300, sharedCoins: 120000, idleClaimedAt: now, updatedAt: now, onboardingStep: 4, sessionCount: 5, partyIds: ["mia", "leon", "sera"], partyCap: 4, pioneeredArea: 2, dodgeBestStage: 6, dodgeStageSchema: 2, expeditionSkills: { fire: 3, water: 2 }, expeditionLoadout: ["fire", "water"], towerOpen: false }),
  [`dodgebullets:titans:${H}`]: JSON.stringify({ stage: 8, bestStage: 8, gold: 300000, heroes: { mia: 10, leon: 8, sera: 6 }, lastActiveAt: now }),
  "dodge-bullets:soundEnabled": "0", "dodgebullets:orientation": "auto",
  [`dodgebullets:attendance:v1:${H}`]: JSON.stringify({ lastClaimDate: new Date().toLocaleDateString("sv-SE"), totalDays: 3, consecutiveDays: 3 }),
});
await page.goto(BASE, { waitUntil: "networkidle0" }); await sleep(2600);
await page.evaluate(() => { for (let k = 0; k < 4; k += 1) { const c = document.querySelector(".idle-claim"); if (c) c.click(); } }); await sleep(800);
const facts = {};
facts.hub = await page.evaluate(() => {
  const r = (s) => document.querySelector(s)?.getBoundingClientRect();
  const f = r(".titans-field"), nav = r(".titans-bottom-nav"), tabs = r(".titans-growth-tabs");
  return { field: f && [Math.round(f.x), Math.round(f.y), Math.round(f.width), Math.round(f.height)], nav: nav && [Math.round(nav.y), Math.round(nav.height)], tabsRightOfField: !!(f && tabs && tabs.x >= f.x + f.width - 2), hScroll: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1 };
});
await page.screenshot({ path: `${OUT}/land-hub.png` });
await clickText(".titans-bottom-nav button", "콘텐츠"); await sleep(600);
await clickText(".nav-popup-grid button", "성문 방어"); await sleep(1800);
facts.dodgeMenu = await page.evaluate(() => ({ cta: !!document.querySelector(".exp-menu-content .cta"), hScroll: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1 }));
await page.screenshot({ path: `${OUT}/land-dodge-menu.png` });
await clickText(".exp-menu-content .cta", "시작"); await sleep(1500);
await clickText(".intro-start, .cta.intro-cta, .overlay-content .cta", ""); await sleep(2500);
facts.battle = await page.evaluate(() => { const w = window.__dodgeWorld; const c = document.querySelector("canvas"); return { w: w?.width, h: w?.height, floorY: w?.floorY, canvas: c && [c.clientWidth, c.clientHeight], hud: !!document.querySelector(".hud") }; });
await page.screenshot({ path: `${OUT}/land-battle.png` });
await page.goto(BASE, { waitUntil: "networkidle0" }); await sleep(2200);
await page.evaluate(() => { for (let k = 0; k < 4; k += 1) { const c = document.querySelector(".idle-claim"); if (c) c.click(); } });
await clickText(".titans-bottom-nav button", "콘텐츠"); await sleep(600);
await clickText(".nav-popup-grid button", "비트 수련"); await sleep(1800);
await page.screenshot({ path: `${OUT}/land-beat-menu.png` });
await clickText(".cta", "이어서 연습하기"); await sleep(4000);
facts.beat = await page.evaluate(() => { const pads = [...document.querySelectorAll(".action-dock .beat-pad")].map((b) => b.getBoundingClientRect()); return { pads: pads.length, padsInView: pads.every((r) => r.bottom <= innerHeight + 1 && r.top >= 0), party: !!document.querySelector(".beat-command-party") }; });
await page.screenshot({ path: `${OUT}/land-beat.png` });
console.log(JSON.stringify(facts, null, 1)); console.log("errors", errors.length, errors.slice(0, 2).join(" | "));
await browser.close();
