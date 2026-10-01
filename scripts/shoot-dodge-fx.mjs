/**
 * 속성 화살 명중 이펙트 캡처 (2026-10-01) — 속성 하나씩만 습득시키고, 표적을 세워 놓고 명중 순간을 찍는다.
 *   node scripts/shoot-dodge-fx.mjs <outDir>   (vite dev 5173 필요)
 */
import puppeteer from "puppeteer";
import { mkdirSync } from "node:fs";
const OUT = process.argv[2] ?? "shots-fx"; mkdirSync(OUT, { recursive: true });
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
await clickText(".nav-popup-grid button", "화살 원정"); await sleep(1600);
await clickText("button", "스테이지"); await sleep(1800);
await page.evaluate(() => { const c = document.querySelector("canvas"); if (!c) return; const r = c.getBoundingClientRect(); c.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: r.x + r.width / 2, clientY: r.y + r.height * 0.8, pointerId: 1, pointerType: "touch" })); });
await sleep(1500);

for (const el of ["fire", "water", "ice", "earth", "bolt"]) {
  // 그 속성만 켜고, 다른 화살은 치우고, 표적 셋을 주인공 위에 세운다 (느리게 떨어지는 일반 화살)
  await page.evaluate((el) => {
    const w = window.__dodgeWorld; if (!w) return;
    w.player.maxHp = 9; w.player.hp = 9; w.rangedWeapon = "none";
    for (const k of ["fire", "water", "ice", "earth", "bolt"]) { w.runSkills[k] = k === el; w.skillTimers[k] = 0; }
    for (const a of w.arrows) a.active = false;
    for (const s of w.skillShots) s.active = false;
    let n = 0;
    for (const a of w.arrows) {
      if (n >= 3) break;
      a.active = true; a.warningMs = 0; a.reflected = false; a.boss = false; a.kind = "normal"; a.hp = 0; a.maxHp = 0; a.chilledMs = 0;
      a.x = w.player.x - 40 + n * 40; a.y = w.player.y - 230 - n * 18; a.vx = 0; a.vy = 28; a.hitRadius = 8; n += 1;
    }
  }, el);
  // 명중 이펙트가 켜질 때까지 60ms 간격으로 보다가 켜지면 바로 찍는다
  let hit = false;
  for (let i = 0; i < 60 && !hit; i += 1) {
    await sleep(60);
    hit = await page.evaluate(() => { const w = window.__dodgeWorld; return !!w && (w.skillFx.some((f) => f.active) || (w.boltFrom?.ms ?? 0) > 0); });
  }
  await page.screenshot({ path: `${OUT}/fx-${el}.png` });
  await sleep(120);
  await page.screenshot({ path: `${OUT}/fx-${el}-b.png` });
  console.log("shot", el, hit ? "hit" : "no-hit");
  await sleep(600);
}
await browser.close();
