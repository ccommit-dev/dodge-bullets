// 대장 캡처 — 하트 없는 HUD · 맨 위 밖에서 내려오는 5배 대장 · 자리 잡고 돔을 쏘는 마력탄 (vite 5173)
//   node scripts/shoot-boss.mjs <outDir>
import { launchBrowser } from "./launch-browser.mjs";
import { mkdirSync } from "node:fs";
const OUT = process.argv[2] ?? "shots-boss"; mkdirSync(OUT, { recursive: true });
const BASE = "http://localhost:5173", H = "mock-local-dev", now = Date.now();
const progress = {
  version: 5, level: 40, sharedCoins: 987654, equippedWeaponLevel: 10, dodgeBestStage: 4, idleClaimedAt: now, updatedAt: now, onboardingStep: 4, partyIds: ["mia"], partyCap: 4,
  expeditionSeals: 400, expeditionSkills: { fire: 6, water: 4, ice: 4, earth: 4, bolt: 4, ultimate: 4 }, expeditionWeapon: "bow", claimedRewards: ["dodge-tutorial"],
};
const titans = { gold: 40000, stage: 9, bestStage: 9, heroes: { mia: 8 }, lastActiveAt: now };
const browser = await launchBrowser({ args: ["--no-sandbox", "--disable-gpu"] });
const page = await browser.newPage();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
page.on("pageerror", (e) => console.log("PAGEERROR", String(e).slice(0, 200)));
const clickText = (sel, text) => page.evaluate(({ sel, text }) => { const el = [...document.querySelectorAll(sel)].find((b) => b.textContent.trim().includes(text)); el?.click(); return !!el; }, { sel, text });
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.goto(BASE, { waitUntil: "networkidle0" });
await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); }, {
  [`dodgebullets:progression:v1:${H}`]: JSON.stringify(progress), [`dodgebullets:titans:${H}`]: JSON.stringify(titans), "dodge-bullets:soundEnabled": "0",
});
await page.goto(BASE, { waitUntil: "networkidle0" });
await sleep(2600);
await page.evaluate(() => { for (let k = 0; k < 4; k += 1) { const c = document.querySelector(".idle-claim"); if (c) { c.click(); continue; } const b = [...document.querySelectorAll("button")].filter((x) => !x.closest(".battle-alert-stack, .titans-bottom-nav, .hub-sheet, .nav-popup-grid")).find((x) => /출석|수령|확인|닫기/.test(x.textContent)); if (!b) break; b.click(); } });
await sleep(900);
await clickText(".titans-bottom-nav button", "콘텐츠"); await sleep(400);
await clickText(".nav-popup-grid button", "성문 방어"); await sleep(1600);
await clickText("button", "스테이지"); await sleep(1800);
await page.evaluate(() => { const c = document.querySelector("canvas"); if (!c) return; const r = c.getBoundingClientRect(); c.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: r.x + r.width / 2, clientY: r.y + r.height * 0.8, pointerId: 1, pointerType: "touch" })); });
await sleep(1500);
const keep = () => page.evaluate(() => { const w = window.__dodgeWorld; if (w) w.barrierHp = w.barrierMaxHp; });
await sleep(2500); await keep();
await page.screenshot({ path: `${OUT}/01-hud.png` });
console.log("hud", JSON.stringify(await page.evaluate(() => document.querySelector(".hud-score")?.textContent ?? document.querySelector(".dodge-hud")?.textContent?.slice(0, 80))));
// 대장 호출 — 스테이지 58% 로 시간을 당긴다
await page.evaluate(() => { const w = window.__dodgeWorld; if (w) { w.stageElapsedMs = 19_000; } });
let boss = null;
for (let i = 0; i < 60 && !boss; i += 1) { await sleep(50); boss = await page.evaluate(() => { const w = window.__dodgeWorld; const b = w?.arrows.find((a) => a.active && a.boss); return b ? { y: b.y, entering: b.bossEntering } : null; }); }
await sleep(900); await keep();
const entering = await page.evaluate(() => { const w = window.__dodgeWorld; const b = w.arrows.find((a) => a.active && a.boss); return b ? { y: Math.round(b.y), entering: b.bossEntering, safeTop: w.safeTop } : null; });
await page.screenshot({ path: `${OUT}/02-entering.png` });
let settled = null;
for (let i = 0; i < 80 && !settled; i += 1) { await sleep(100); await keep(); settled = await page.evaluate(() => { const w = window.__dodgeWorld; const b = w.arrows.find((a) => a.active && a.boss); return b && !b.bossEntering ? { y: Math.round(b.y), orbs: w.arrows.filter((a) => a.active && a.fromBoss).length } : null; }); }
await sleep(700); await keep();
await page.screenshot({ path: `${OUT}/03-settled.png` });
const after = await page.evaluate(() => { const w = window.__dodgeWorld; return { orbs: w.arrows.filter((a) => a.active && a.fromBoss).length, cuts: w.bossCutsLeft + "/" + w.bossMaxCuts, barrier: Math.round(w.barrierHp) + "/" + w.barrierMaxHp }; });
console.log("boss", JSON.stringify({ first: boss, entering, settled, after }));
await browser.close();
