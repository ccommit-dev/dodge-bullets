// 홍보 페이지 캡처 (2026-10-23, 사용자: "홍보 페이지 — 마지막 비버 키우기 리소스 스샷으로 모두 수정").
//   node scripts/shoot-promo.mjs [outDir]   (vite 5173) → 사냥터 · 성문 방어 전투 · 비트 수련 · 대장간 · 동료 뽑기 (390×844 · dpr 2)
// 조립은 scripts/make-promo-art.mjs (docs/assets/gameplay-*.png · hero-arcade-v2.png 같은 파일명)
import { launchBrowser } from "./launch-browser.mjs";
import { mkdirSync } from "node:fs";
const OUT = process.argv[2] ?? "art-gen/out/promo";
mkdirSync(OUT, { recursive: true });
const BASE = "http://localhost:5173", H = "mock-local-dev", now = Date.now();
const browser = await launchBrowser({ args: ["--no-sandbox"] });
const page = await browser.newPage();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.goto(BASE, { waitUntil: "networkidle0" });
const clickText = (sel, text) => page.evaluate(({ sel, text }) => { const el = [...document.querySelectorAll(sel)].find((b) => b.textContent.trim().includes(text)); el?.click(); return !!el; }, { sel, text });
const closeModals = () => page.evaluate(() => { for (let k = 0; k < 6; k += 1) { const c = document.querySelector(".idle-claim"); if (c) { c.click(); continue; } const b = [...document.querySelectorAll("button")].filter((x) => !x.closest(".titans-bottom-nav")).find((x) => /^(닫기|확인|나중에|괜찮아요)$/.test(x.textContent.trim())); if (b) b.click(); } });
const party = ["mia", "leon", "sera", "garen"];
const progress = { version: 5, level: 24, exp: 100, redGems: 1280, sharedCoins: 52000, idleClaimedAt: now, updatedAt: now, onboardingStep: 4, sessionCount: 30, partyIds: party, partyCap: 4,
  claimedRewards: ["dodge-tutorial", "welcome-gift", "surprise-gift"], pioneeredArea: 4, titanBestStage: 18, equippedWeaponLevel: 12, enhancementMaterials: 140, expeditionSeals: 60,
  discoverySeeded: true, discovered: ["monster:slime", "monster:goblin", "ally:mia", "ally:leon", "ally:sera", "ally:garen"], attendanceStreak: 5, gachaPulls: 30, eventCoins: 42 };
const titans = { gold: 2_400_000, stage: 17, bestStage: 18, totalKills: 1400, heroes: { mia: 42, leon: 40, sera: 38, garen: 36, ari: 0 }, lastActiveAt: now, lightningLevel: 6,
  acorns: { grid: [3, 3, 2, 1, 4, 0, 2, 1, 0, 0, 5, 1], allyAmmo: { mia: 5, leon: 4 }, best: 5, acc: 0 }, equipmentTraining: { weaponMastery: 24, shoulderMastery: 6 } };
await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); }, {
  [`dodgebullets:progression:v1:${H}`]: JSON.stringify(progress), [`dodgebullets:titans:${H}`]: JSON.stringify(titans),
  [`dodgebullets:attendance:v1:${H}`]: JSON.stringify({ lastClaimDate: new Date().toLocaleDateString("sv-SE"), totalDays: 5, consecutiveDays: 5 }),
  [`dodgebullets:forge:${H}`]: JSON.stringify({ gold: 300000, goldMigrated: true, level: 12, bestLevel: 12, tickets: 4, shards: 30, totalAttempts: 40, pendingFailure: false, reforgeAttempts: 0, armorLevel: 6, bestArmorLevel: 6 }),
  "dodge-bullets:soundEnabled": "0", "dodgebullets:test-phase": "0" });
await page.reload({ waitUntil: "networkidle0" }); await sleep(1500);
await closeModals(); await sleep(400);
// 사냥터 — 교전 중 한 장(동료가 몬스터에 붙은 순간)
for (let i = 0; i < 40 && !(await page.evaluate(() => document.querySelector(".titans-field")?.className.includes("phase-combat") && !!document.querySelector(".titans-allies .is-engaged, .titans-hero.is-engaged"))); i += 1) await sleep(150);
await sleep(650);
await page.screenshot({ path: `${OUT}/hunt.png` });
// 도토리 판
await page.evaluate(() => [...document.querySelectorAll(".titans-growth-tabs button")].find((b) => b.textContent.includes("도토리"))?.click()); await sleep(600);
await page.evaluate(() => document.querySelector(".acorn-panel")?.scrollIntoView({ block: "center" })); await sleep(300);
await page.screenshot({ path: `${OUT}/acorn.png` });
await page.evaluate(() => document.querySelector(".titans-growth-tabs button.on")?.click()); await sleep(300);
// 동료 뽑기 10연
await clickText(".titans-bottom-nav button", "동료"); await sleep(500);
await clickText(".hub-sheet-switch button", "동료 뽑기"); await sleep(600);
await page.evaluate(() => document.querySelector(".gacha-page-actions button:nth-child(2)")?.click()); await sleep(4300);
await page.screenshot({ path: `${OUT}/gacha.png` });
await clickText(".gacha-close", "확인"); await sleep(400);
await page.evaluate(() => document.querySelector(".hub-sheet-close")?.click()); await sleep(400);
// 대장간
await clickText(".titans-bottom-nav button", "모험"); await sleep(500);
await clickText(".nav-popup-grid button", "대장간"); await sleep(1800);
await closeModals(); await sleep(300);
await page.screenshot({ path: `${OUT}/forge.png` });
await page.goto(BASE, { waitUntil: "networkidle0" }); await sleep(1500); await closeModals(); await sleep(300);
// 비트 수련 — 연주 중
await clickText(".titans-bottom-nav button", "모험"); await sleep(500);
await clickText(".nav-popup-grid button", "비트 수련"); await sleep(2200);
await clickText(".cta", "이어서 연습하기");
for (let i = 0; i < 40 && !(await page.evaluate(() => document.querySelectorAll(".action-dock .beat-pad").length === 4)); i += 1) await sleep(400);
await sleep(3500);
await page.screenshot({ path: `${OUT}/beat.png` });
await page.goto(BASE, { waitUntil: "networkidle0" }); await sleep(1500); await closeModals(); await sleep(300);
// 성문 방어 전투
await clickText(".titans-bottom-nav button", "모험"); await sleep(500);
await clickText(".nav-popup-grid button", "성문 방어"); await sleep(1800);
await clickText(".exp-menu-tabs button", "원정"); await sleep(500);
await clickText("button", "스테이지"); await sleep(2000);
await page.evaluate(() => { const c = document.querySelector("canvas"); if (!c) return; const r = c.getBoundingClientRect(); c.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: r.x + r.width / 2, clientY: r.y + r.height * 0.8, pointerId: 1, pointerType: "touch" })); });
await sleep(5000);
await page.screenshot({ path: `${OUT}/defense.png` });
await browser.close();
console.log("done", OUT);
