/**
 * 화면 촬영 — 허브·소환 시트·상점 시트·대장간 검/견갑·비트 메뉴. UI 배치 점검용.
 *   node scripts/shot-screens.mjs   → store/screens/*.png
 */
import { mkdirSync } from "node:fs";
import puppeteer from "puppeteer";
const BASE = "http://localhost:5173";
const H = "mock-local-dev";
const OUT = process.env.OUT ?? "store/screens";
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const now = Date.now();
const browser = await puppeteer.launch({ headless: "shell", args: ["--no-sandbox", "--disable-gpu"] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const closeModal = () => page.evaluate(() => { for (let k = 0; k < 3; k += 1) { const c = document.querySelector(".idle-claim"); if (c) { c.click(); continue; } const b = [...document.querySelectorAll("button")].filter((x) => !x.closest(".recommend-banner, .routine-board, .titans-tabs, .titans-content-tabs, .gacha-panel, .hub-alerts")).find((x) => /출석|수령|확인|닫기/.test(x.textContent)); if (!b) break; b.click(); } });
const clickText = (sel, text) => page.evaluate(({ sel, text }) => { const el = [...document.querySelectorAll(sel)].find((b) => b.textContent.trim().includes(text)); el?.click(); return !!el; }, { sel, text });
const box = (sel) => page.evaluate((s) => { const el = document.querySelector(s); if (!el) return null; const r = el.getBoundingClientRect(); return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)]; }, sel);

await page.goto(BASE, { waitUntil: "networkidle0" });
await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); }, {
  [`dodgebullets:progression:v1:${H}`]: JSON.stringify({ version: 5, onboardingStep: 4, level: 30, exp: 90000, redGems: 1200, sharedCoins: 300000, enhancementMaterials: 60, pioneeredArea: 3, titanBestStage: 12, dodgeBestStage: 3, idleClaimedAt: now, updatedAt: now, partyIds: ["mia", "leon", "sera"], partyCap: 4, sessionCount: 9, attendanceStreak: 4, equippedWeaponLevel: 6, bestForgeLevel: 6, journalClaimed: [], ownedShoulders: ["scout", "shadow"], equippedShoulder: "scout" }),
  [`dodgebullets:titans:${H}`]: JSON.stringify({ stage: 12, bestStage: 12, gold: 500000, heroes: { mia: 12, leon: 8, sera: 4 }, skillInventory: { learned: ["strike", "crit"], levels: { strike: 3, crit: 1 }, equipped: { starter: "strike", linkA: "crit" }, skillCores: 10 }, lastActiveAt: now }),
  "dodge-bullets:soundEnabled": "0",
});
await page.goto(BASE, { waitUntil: "networkidle0" });
await sleep(2600);
await closeModal();
await sleep(800);
await page.screenshot({ path: `${OUT}/hub.png` });
console.log("hub boxes", JSON.stringify({ hp: await box(".titans-hp"), alerts: await box(".hub-alerts"), banner: await box(".hub-alerts .recommend-banner"), goals: await box(".titans-goals"), bar: await box(".hub-bottom-bar"), field: await box(".titans-field") }));
// 보스 도전 버튼 위치 — bossReady를 만들 수 없으니 CSS 계산값으로 기록
console.log("boss cta css", JSON.stringify(await page.evaluate(() => { const el = document.createElement("button"); el.className = "titans-boss-challenge"; document.querySelector(".titans-field").appendChild(el); const cs = getComputedStyle(el); const r = el.getBoundingClientRect(); const f = document.querySelector(".titans-field").getBoundingClientRect(); const hp = document.querySelector(".titans-hp").getBoundingClientRect(); const out = { top: cs.top, bottom: cs.bottom, translate: cs.translate, centerDx: Math.round(r.x + r.width / 2 - (f.x + f.width / 2)), gapBelowHp: Math.round(r.y - hp.bottom) }; el.remove(); return out; })));
await clickText(".hub-bottom-bar button", "소환");
await sleep(700);
await page.screenshot({ path: `${OUT}/sheet-gacha.png` });
console.log("sheet", JSON.stringify(await box(".hub-sheet")));
await clickText(".hub-bottom-bar button", "상점");
await sleep(700);
await page.screenshot({ path: `${OUT}/sheet-shop.png` });
await clickText(".hub-bottom-bar button", "동료");
await sleep(700);
await page.screenshot({ path: `${OUT}/sheet-heroes.png` });
// 대장간 — 입구에서 강화 화면으로 들어간 뒤 검/견갑
await clickText(".titans-content-tabs button", "대장간");
await sleep(1400);
await clickText("button", "이지모드");
await sleep(900);
await page.screenshot({ path: `${OUT}/forge-weapon.png` });
await clickText(".forge-tabs button", "보호구");
await sleep(900);
await page.screenshot({ path: `${OUT}/forge-armor.png` });
console.log("forge armor h1", await page.evaluate(() => document.querySelector(".forge-title-row h1")?.textContent));
// 비트 메뉴 (보정 오버레이 건너뛰기 위해 보정값 저장)
await page.evaluate(() => localStorage.setItem("dodgebullets:beat:calibrationMs", "0"));
await page.goto(BASE, { waitUntil: "networkidle0" });
await sleep(2200);
await closeModal();
await clickText(".titans-content-tabs button", "비트");
await sleep(1400);
await page.evaluate(() => { [...document.querySelectorAll("button")].find((b) => /건너뛰기|나중에|닫기/.test(b.textContent))?.click(); });
await sleep(400);
await page.screenshot({ path: `${OUT}/beat-menu.png` });
console.log("beat covers", await page.evaluate(() => [...document.querySelectorAll(".schedule-cover")].filter((i) => i.complete && i.naturalWidth > 0).length));
await browser.close();
console.log("done");
