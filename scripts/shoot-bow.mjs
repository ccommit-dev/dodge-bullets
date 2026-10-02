// 활 캡처 — 주인공 활(당김·놓음)과 날아가는 기본 화살을 확대해 찍는다 (vite 5173)
//   node scripts/shoot-bow.mjs <outDir>
import { launchBrowser } from "./launch-browser.mjs";
import { mkdirSync } from "node:fs";
const OUT = process.argv[2] ?? "shots-bow"; mkdirSync(OUT, { recursive: true });
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
await sleep(1500); await keep();
const clipAt = () => page.evaluate(() => { const w = window.__dodgeWorld; const c = document.querySelector("canvas").getBoundingClientRect(); return { x: c.x + w.player.x - 90, y: c.y + w.player.y - 150, width: 180, height: 190 }; });
const state = () => page.evaluate(() => { const w = window.__dodgeWorld; return { timer: w.basicTimer, flash: w.shotFlashMs, shots: w.skillShots.filter((s) => s.active && s.basic).map((s) => [Math.round(s.x), Math.round(s.y)]), hand: [Math.round(w.player.x + w.player.facing * 12), Math.round(w.player.y - 34)] }; });
const want = [["pull", (s) => s.flash <= 0 && s.timer > 0.05 && s.timer < 0.25], ["release", (s) => s.flash > 110], ["flight", (s) => s.flash <= 0 && s.shots.length > 0]];
for (const [name, test] of want) {
  let got = null;
  for (let i = 0; i < 400 && !got; i += 1) { const s = await state(); if (test(s)) got = s; else await sleep(8); }
  await page.screenshot({ path: `${OUT}/${name}.png`, clip: await clipAt() });
  console.log(name, JSON.stringify(got));
  await keep();
}
await page.screenshot({ path: `${OUT}/full.png` });
await browser.close();
