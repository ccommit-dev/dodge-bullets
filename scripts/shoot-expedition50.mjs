// 성문 방어 50 스테이지 화면 캡처 — 장 탭·스테이지 목록 · 정비 장착 4칸 · 대장간 원정 무기 · 판 중 무기 정령 · 대장 (vite 5173, 2026-10-02)
//   node scripts/shoot-expedition50.mjs <outDir>
import { launchBrowser } from "./launch-browser.mjs";
import { mkdirSync } from "node:fs";
const OUT = process.argv[2] ?? "shots-exp50"; mkdirSync(OUT, { recursive: true });
const BASE = "http://localhost:5173", H = "mock-local-dev", now = Date.now();
const progress = {
  version: 5, level: 38, sharedCoins: 987654, equippedWeaponLevel: 10, dodgeBestStage: 13, dodgeStageSchema: 2, idleClaimedAt: now, updatedAt: now, onboardingStep: 4, partyIds: ["mia"], partyCap: 4,
  dodgeStars: Object.fromEntries(Array.from({ length: 13 }, (_, i) => [String(i), i % 3 + 1])), towerOpen: true, towerTickets: 3,
  expeditionSeals: 400, enhancementMaterials: 300, expeditionSkills: { fire: 6, water: 4, ice: 4, earth: 4, bolt: 4, wind: 3, poison: 2, holy: 1, ultimate: 4 },
  expeditionLoadout: ["holy", "poison", "wind", "fire"], expeditionWeaponForge: { bow: 6, staff: 4 }, expeditionWeapon: "staff", claimedRewards: ["dodge-tutorial"],
};
const titans = { gold: 40000, stage: 9, bestStage: 9, heroes: { mia: 8 }, lastActiveAt: now };
const browser = await launchBrowser({ args: ["--no-sandbox", "--disable-gpu"] });
const page = await browser.newPage();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = []; page.on("pageerror", (e) => errors.push(String(e.stack ?? e).slice(0, 600)));
const clickText = (sel, text) => page.evaluate(({ sel, text }) => { const el = [...document.querySelectorAll(sel)].find((b) => b.textContent.trim().includes(text)); el?.click(); return !!el; }, { sel, text });
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.goto(BASE, { waitUntil: "networkidle0" });
await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); }, {
  [`dodgebullets:progression:v1:${H}`]: JSON.stringify(progress), [`dodgebullets:titans:${H}`]: JSON.stringify(titans), "dodge-bullets:soundEnabled": "0",
  [`dodgebullets:attendance:v1:${H}`]: JSON.stringify({ lastClaimDate: new Date().toLocaleDateString("sv-SE"), totalDays: 3, consecutiveDays: 3 }),
});
await page.goto(BASE, { waitUntil: "networkidle0" });
await sleep(2600);
await page.evaluate(() => { for (let k = 0; k < 4; k += 1) { const c = document.querySelector(".idle-claim"); if (c) c.click(); } });
await sleep(600);
await clickText(".titans-bottom-nav button", "콘텐츠"); await sleep(400);
await clickText(".nav-popup-grid button", "성문 방어"); await sleep(1600);
await page.screenshot({ path: `${OUT}/01-menu.png` });
await page.evaluate(() => document.querySelector(".pioneer-board")?.scrollIntoView({ block: "start" })); await sleep(300);
await page.screenshot({ path: `${OUT}/02-stages.png` });
await clickText(".chapter-tab", "1장"); await sleep(300);
await page.evaluate(() => document.querySelector(".pioneer-board")?.scrollIntoView({ block: "start" })); await sleep(200);
await page.screenshot({ path: `${OUT}/03-chapter1.png` });
await clickText("button", "정비"); await sleep(600);
await page.evaluate(() => document.querySelector(".exp-loadout")?.scrollIntoView({ block: "center" })); await sleep(300);
await page.screenshot({ path: `${OUT}/04-loadout.png` });
await page.evaluate(() => document.querySelector(".exp-skill-grid")?.scrollIntoView({ block: "start" })); await sleep(300);
await page.screenshot({ path: `${OUT}/05-weapons.png` });
await clickText("button", "원정"); await sleep(400);
// 판 시작 — 13 스테이지(2장 3칸)
await page.evaluate(() => { const b = [...document.querySelectorAll(".cta")].find((x) => x.textContent.includes("시작")); b?.click(); }); await sleep(1500);
await page.evaluate(() => { const c = document.querySelector("canvas"); if (!c) return; const r = c.getBoundingClientRect(); c.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: r.x + r.width / 2, clientY: r.y + r.height / 2 })); c.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, clientX: r.x + r.width / 2, clientY: r.y + r.height / 2 })); });
for (let i = 0; i < 9; i += 1) { await sleep(1000); await page.evaluate(() => document.querySelector(".perk-choice")?.click()); }
const keep = () => page.evaluate(() => { const w = window.__dodgeWorld; if (w) w.barrierHp = w.barrierMaxHp; document.querySelector(".perk-choice")?.click(); });
await keep();
await page.screenshot({ path: `${OUT}/06-battle.png` });
const info = await page.evaluate(() => { const w = window.__dodgeWorld; return w ? { stage: w.stageIndex, loadout: w.loadout, run: Object.keys(w.runSkills), shots: [...new Set(w.skillShots.filter((s) => s.active).map((s) => s.element))] } : null; });
console.log("battle", JSON.stringify(info));
// 대장 — 시간을 58% 로
await page.evaluate(() => { const w = window.__dodgeWorld; if (w) w.stageElapsedMs = 34_000 * 0.59; });
for (let i = 0; i < 40; i += 1) { await sleep(1000); await keep(); const shown = await page.evaluate(() => { const b = window.__dodgeWorld?.arrows.find((a) => a.active && a.boss); return b && !b.bossEntering; }); if (shown) break; }
await sleep(4000); await keep();
await page.screenshot({ path: `${OUT}/07-boss.png` });
console.log("boss", JSON.stringify(await page.evaluate(() => { const w = window.__dodgeWorld; const b = w.arrows.find((a) => a.active && a.boss); return b ? { y: Math.round(b.y), cuts: b.bossCutsLeft + "/" + b.bossMaxCuts, entering: b.bossEntering } : w.bossDefeated; })));
// 대장간 · 원정 무기
await page.evaluate(() => { const w = window.__dodgeWorld; if (w) { w.barrierHp = 0; } }); await sleep(2500);
await page.goto(BASE, { waitUntil: "networkidle0" }); await sleep(2600);
await page.evaluate(() => { for (let k = 0; k < 4; k += 1) { const c = document.querySelector(".idle-claim"); if (c) c.click(); } }); await sleep(500);
await clickText(".titans-bottom-nav button", "콘텐츠"); await sleep(400);
await clickText(".nav-popup-grid button", "대장간"); await sleep(1800);
await clickText(".forge-tabs button", "원정 무기"); await sleep(600);
await page.screenshot({ path: `${OUT}/08-forge-weapons.png` });
const before = await page.evaluate((h) => JSON.parse(localStorage.getItem(`dodgebullets:progression:v1:${h}`)).expeditionWeaponForge, H);
await page.evaluate(() => document.querySelector(".forge-expweapon.bow .forge-button")?.click()); await sleep(800);
const after = await page.evaluate((h) => JSON.parse(localStorage.getItem(`dodgebullets:progression:v1:${h}`)).expeditionWeaponForge, H);
console.log("forge", JSON.stringify(before), "→", JSON.stringify(after));
console.log("errors", JSON.stringify(errors));
await browser.close();
