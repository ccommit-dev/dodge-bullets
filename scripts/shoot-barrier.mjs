// 방어막 캡처 — 활을 빼고 몬스터 다섯을 띠 위에 세워 두드리는 모습·붕괴 연출을 찍는다 (vite 5173)
//   node scripts/shoot-barrier.mjs <outDir>
import puppeteer from "puppeteer";
import { mkdirSync } from "node:fs";
const OUT = process.argv[2] ?? "shots-barrier"; mkdirSync(OUT, { recursive: true });
const BASE = "http://localhost:5173", H = "mock-local-dev", now = Date.now();
const progress = {
  version: 5, level: 40, sharedCoins: 987654, equippedWeaponLevel: 10, dodgeBestStage: 4, idleClaimedAt: now, updatedAt: now, onboardingStep: 4, partyIds: ["mia"], partyCap: 4,
  expeditionSeals: 400, expeditionSkills: { fire: 6, water: 4, ice: 4, earth: 4, bolt: 4, ultimate: 4 }, expeditionWeapon: "bow", claimedRewards: ["dodge-tutorial"],
};
const titans = { gold: 40000, stage: 9, bestStage: 9, heroes: { mia: 8 }, lastActiveAt: now };
const browser = await puppeteer.launch({ headless: "shell", args: ["--no-sandbox", "--disable-gpu"] });
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
const setup = () => page.evaluate(() => {
  const w = window.__dodgeWorld; if (!w) return;
  w.player.maxHp = 9; w.player.hp = 9; w.rangedWeapon = "none";
  for (const k of ["fire", "water", "ice", "earth", "bolt"]) w.runSkills[k] = false;
  for (const a of w.arrows) a.active = false;
  for (const s of w.skillShots) s.active = false;
  const kinds = ["normal", "fan", "ricochet", "aimed", "explosive"];
  let n = 0;
  for (const a of w.arrows) {
    if (n >= kinds.length) break;
    a.active = true; a.warningMs = 0; a.reflected = false; a.boss = false; a.fromBoss = false; a.splitLevel = 0; a.kind = kinds[n]; a.hp = 0; a.maxHp = 0; a.chilledMs = 0; a.atBarrier = false; a.telegraph = "aerial";
    a.x = 60 + n * 68; a.y = w.floorY - 150 - 120 - n * 30; a.vx = 0; a.vy = 150; a.hitRadius = 8; n += 1;
  }
});
await setup();
await sleep(1400);
await page.screenshot({ path: `${OUT}/01-attached.png` });
await sleep(700);
await page.screenshot({ path: `${OUT}/02-hit.png` });
const st = await page.evaluate(() => { const w = window.__dodgeWorld; return { hp: Math.round(w.barrierHp), at: w.arrows.filter((a) => a.active && a.atBarrier).map((a) => a.kind), hits: w.barrierHits }; });
console.log("attached", JSON.stringify(st));
await page.evaluate(() => { const w = window.__dodgeWorld; if (w) w.barrierHp = 2; });
let shot = false;
for (let i = 0; i < 40 && !shot; i += 1) {
  await sleep(50);
  shot = await page.evaluate(() => { const w = window.__dodgeWorld; return !!w && w.barrierBreaks > 0; });
}
await sleep(120);
await page.screenshot({ path: `${OUT}/03-breach.png` });
await sleep(350);
await page.screenshot({ path: `${OUT}/04-breach-b.png` });
const st2 = await page.evaluate(() => { const w = window.__dodgeWorld; return { hp: Math.round(w.barrierHp), breaks: w.barrierBreaks, playerHp: w.player.hp, cause: w.lastHitCause }; });
console.log("breach", JSON.stringify(st2));
await browser.close();
