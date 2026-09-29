/**
 * 화살 원정 화면 캡처 (2026-09-29) — 눈으로 보는 점검용. 단언은 verify-dodge-hud 가 한다.
 *   node scripts/shoot-dodge.mjs <outDir> [bow|staff] [fresh]
 */
import puppeteer from "puppeteer";
import { mkdirSync } from "node:fs";
const OUT = process.argv[2] ?? "shots"; mkdirSync(OUT, { recursive: true });
const WEAPON = process.argv[3] ?? "bow";
const FRESH = process.argv[4] === "fresh";
const BASE = "http://localhost:5173", H = "mock-local-dev", now = Date.now();
const progress = FRESH
  ? { version: 5, level: 8, sharedCoins: 900, equippedWeaponLevel: 3, dodgeBestStage: 0, idleClaimedAt: now, updatedAt: now, onboardingStep: 4, partyIds: ["mia"], partyCap: 4, claimedRewards: ["dodge-tutorial"] }
  : {
    version: 5, level: 40, sharedCoins: 987654, redGems: 300, enhancementMaterials: 60, equippedWeaponLevel: 10, bestForgeLevel: 8,
    pioneeredArea: 3, titanBestStage: 9, dodgeBestStage: 4, idleClaimedAt: now, updatedAt: now, onboardingStep: 4, partyIds: ["mia"], partyCap: 4,
    expeditionSeals: 400, expeditionSkills: { fire: 6, water: 4, ice: 2, earth: 2, bolt: 2, ultimate: 4 },
    expeditionShards: { fire: 30, water: 2, ice: 9, earth: 0, bolt: 5, ultimate: 12 }, expeditionWeapon: WEAPON,
    expeditionChips: { focus: 3, barrage: 3, ember: 2, rime: 4, vitality: 1, edge: 1 }, equippedChips: ["focus", "rime", null],
    expeditionSupplies: { draft: 0, primed: 0, insurance: 2 },
    expeditionDaily: { day: new Date().toISOString().slice(0, 10), counts: { intercept: 44, epic: 0, clear: 1 }, claimed: [] },
    claimedRewards: ["dodge-tutorial"],
  };
const titans = { gold: 40000, stage: 9, bestStage: 9, heroes: { mia: 8 }, lastActiveAt: now };
const browser = await puppeteer.launch({ headless: "shell", args: ["--no-sandbox", "--disable-gpu"] });
const page = await browser.newPage();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
page.on("pageerror", (e) => console.log("PAGEERROR", String(e).slice(0, 200)));
const clickText = (sel, text) => page.evaluate(({ sel, text }) => { const el = [...document.querySelectorAll(sel)].find((b) => b.textContent.trim().includes(text)); el?.click(); return !!el; }, { sel, text });
const shot = async (name, full = false) => { await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: full }); console.log("shot", name); };
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
await shot("01-menu");
await clickText(".exp-menu-tabs button", "정비"); await sleep(700);
await shot("02-upgrade", true);
await page.evaluate(() => document.querySelectorAll(".exp-skill-card")[1]?.click()); await sleep(500);
await shot("03-sheet-fire");
await page.evaluate(() => { const s = document.querySelector(".exp-skill-sheet-inner"); if (s) s.scrollTop = s.scrollHeight; }); await sleep(300);
await shot("04-sheet-fire-bottom");
await page.evaluate(() => document.querySelector(".exp-skill-close")?.click()); await sleep(300);
await page.evaluate(() => document.querySelector(".exp-chip-slot")?.click()); await sleep(300);
await shot("05-chip-pick", true);
await page.evaluate(() => document.querySelector(".exp-chip-slot")?.click()); await sleep(200);
await clickText(".exp-sub-tabs button", "보급"); await sleep(500);
await shot("06-supply", true);
await clickText(".exp-sub-tabs button", "강화"); await sleep(300);
await clickText(".exp-menu-tabs button", "원정"); await sleep(500);
await clickText("button", "스테이지"); await sleep(1800);
await page.evaluate(() => { const c = document.querySelector("canvas"); if (!c) return; const r = c.getBoundingClientRect(); c.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: r.x + r.width / 2, clientY: r.y + r.height * 0.8, pointerId: 1, pointerType: "touch" })); });
await sleep(1500);
await shot("10-battle-start");
// 전부 습득시켜 쏘는 모습을 본다
await page.evaluate(() => { const w = window.__dodgeWorld; if (!w) return; for (const k of ["fire", "water", "ice", "earth", "bolt"]) if ((w.skillLevels[k] ?? 0) > 0) { w.runSkills[k] = true; w.skillTimers[k] = 0; } w.player.maxHp = 9; w.player.hp = 9; });
for (let i = 0; i < 10; i += 1) {
  await sleep(i === 0 ? 2500 : 900);
  // 레벨업 오버레이가 뜨면 찍고 첫 카드를 고른다
  const perk = await page.evaluate(() => !!document.querySelector("[class*=perk-card], .perk-overlay"));
  if (perk) { await shot(`2${i}-perk`); await page.evaluate(() => (document.querySelector("[data-testid^=perk-]") ?? document.querySelector("[class*=perk-card]"))?.click()); await sleep(400); }
  await page.evaluate(() => { const w = window.__dodgeWorld; if (w) { w.player.hp = w.player.maxHp; } });
  await shot(`1${i + 1}-battle`);
}
// 레벨업 3택 · 결과 화면
await page.evaluate(() => { const w = window.__dodgeWorld; if (w) { w.stageIndex = 3; w.levelUps = 1; } });
await sleep(900);
await shot("30-perk");
await page.evaluate(() => document.querySelector(".perk-choice")?.click()); await sleep(600);
// 보스 구간 → 클리어 결과 화면
await page.evaluate(() => { const w = window.__dodgeWorld; if (w) { w.stageIndex = 0; w.stageElapsedMs = 9e6; for (const x of w.arrows) x.active = false; } });
await sleep(3500);
await shot("40-boss");
await page.evaluate(() => { const w = window.__dodgeWorld; if (w) { w.bossSpawned = true; w.bossDefeated = true; } });
await sleep(2500);
await shot("50-clear", true);
// 패배 결과 화면 — 새로 출격해 체력을 0 으로
const st = await page.evaluate(() => { const w = window.__dodgeWorld; return w ? { shots: w.skillShots.filter((s) => s.active).length, run: w.runSkills, lvl: w.runLevel, weapon: w.rangedWeapon } : null; });
console.log(JSON.stringify(st));
await browser.close();
