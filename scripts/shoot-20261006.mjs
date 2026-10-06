// 2026-10-06 화면 캡처 — 지갑 줄 · 구매 추천 · 원정 지도(갈림길) · 비트 커스텀 상점 · 비트 홀드 유지/끊김 · 몬스터 얼굴 도감 (vite 5173)
//   node scripts/shoot-20261006.mjs <outDir>
// 폰 탭은 실제 기기가 아니라 헤드리스 Chrome 의 좌표 탭(page.touchscreen.tap)으로 확인한다.
import { launchBrowser } from "./launch-browser.mjs";
import { mkdirSync } from "node:fs";
const OUT = process.argv[2] ?? "shots-20261006"; mkdirSync(OUT, { recursive: true });
const BASE = "http://localhost:5173", H = "mock-local-dev", now = Date.now();
const progress = {
  version: 5, level: 38, redGems: 1240, sharedCoins: 987654, equippedWeaponLevel: 10, dodgeBestStage: 13, dodgeStageSchema: 2, idleClaimedAt: now, updatedAt: now, onboardingStep: 4,
  partyIds: ["mia", "luna", "bronn", "sera"], partyCap: 4, pioneeredArea: 3,
  dodgeStars: Object.fromEntries(Array.from({ length: 13 }, (_, i) => [String(i), i % 3 + 1])), dodgeBranches: { "1-T": 3, "1-E1": 2 }, towerOpen: true, towerTickets: 0,
  expeditionSeals: 400, enhancementMaterials: 300, expeditionSkills: { fire: 6, water: 4, ice: 4, earth: 4, bolt: 4, wind: 3, poison: 2, holy: 1, ultimate: 4 },
  expeditionShards: { fire: 400, water: 300 }, expeditionLoadout: ["holy", "poison", "wind", "fire"], expeditionWeaponForge: { bow: 6, staff: 4 }, expeditionWeapon: "staff",
  claimedRewards: ["dodge-tutorial", "dodge-branch:1-T", "dodge-branch:1-E1"],
};
const titans = { gold: 4_000_000, stage: 12, bestStage: 12, heroes: { mia: 8, luna: 6, bronn: 5, sera: 7 }, lastActiveAt: now };
const browser = await launchBrowser({ args: ["--no-sandbox", "--disable-gpu"] });
const page = await browser.newPage();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = []; page.on("pageerror", (e) => errors.push(String(e.stack ?? e).slice(0, 600)));
const clickText = (sel, text) => page.evaluate(({ sel, text }) => { const el = [...document.querySelectorAll(sel)].find((b) => b.textContent.trim().includes(text)); el?.click(); return !!el; }, { sel, text });
/** 좌표 탭 — 요소 가운데를 손가락으로 */
const tap = async (sel) => { const b = await page.evaluate((s) => { const el = document.querySelector(s); if (!el) return null; el.scrollIntoView({ block: "center" }); const r = el.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; }, sel); if (!b) return false; await sleep(150); await page.touchscreen.tap(b[0], b[1]); return true; };
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.goto(BASE, { waitUntil: "networkidle0" });
await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); }, {
  [`dodgebullets:progression:v1:${H}`]: JSON.stringify(progress), [`dodgebullets:titans:${H}`]: JSON.stringify(titans), "dodge-bullets:soundEnabled": "0",
  [`dodgebullets:attendance:v1:${H}`]: JSON.stringify({ lastClaimDate: new Date().toLocaleDateString("sv-SE"), totalDays: 3, consecutiveDays: 3 }),
  "dodgebullets:test-phase": "0",
});
await page.goto(BASE, { waitUntil: "networkidle0" });
await sleep(2600);
await page.evaluate(() => { for (let k = 0; k < 4; k += 1) { const c = document.querySelector(".idle-claim"); if (c) c.click(); } });
await sleep(800);
const facts = {};
facts.hubGem = await page.evaluate(() => document.querySelector(".titans-gem strong")?.textContent);
facts.adviceAlert = await page.evaluate(() => document.querySelector(".advice-alert")?.textContent?.replace(/\s+/g, " ").trim() ?? null);
await page.screenshot({ path: `${OUT}/01-hub.png` });
facts.adviceTap = await tap(".advice-alert"); await sleep(500);
facts.adviceRows = await page.evaluate(() => [...document.querySelectorAll(".advice-row b")].map((b) => b.textContent));
await page.screenshot({ path: `${OUT}/02-advice.png` });
await page.evaluate(() => document.querySelector(".advice-backdrop")?.click()); await sleep(300);
// 보석 칩 → 상점
facts.gemTap = await tap(".titans-gem"); await sleep(700);
facts.shopWallet = await page.evaluate(() => [...document.querySelectorAll(".hub-sheet-wallet .wallet-item")].map((e) => e.textContent.replace(/\s+/g, " ").trim()));
await page.screenshot({ path: `${OUT}/03-shop.png` });
await clickText(".titans-shop button", "외형"); await sleep(400);
facts.beatInShop = await page.evaluate(() => document.querySelectorAll(".beat-custom-product").length);
await page.evaluate(() => document.querySelector(".beat-custom-product")?.scrollIntoView({ block: "center" })); await sleep(200);
await page.screenshot({ path: `${OUT}/04-shop-beat.png` });
await page.evaluate(() => document.querySelector(".hub-sheet-close")?.click()); await sleep(300);
// 원정 지도
await clickText(".titans-bottom-nav button", "콘텐츠"); await sleep(400);
await clickText(".nav-popup-grid button", "성문 방어"); await sleep(1600);
await clickText(".chapter-tab", "1장"); await sleep(300);
facts.expWallet = await page.evaluate(() => [...document.querySelectorAll(".exp-menu-content .wallet-item")].map((e) => e.textContent.replace(/\s+/g, " ").trim()));
facts.routeNodes = await page.evaluate(() => [...document.querySelectorAll(".route-node")].map((n) => `${n.dataset.branch}:${n.disabled ? "잠김" : "열림"}${n.classList.contains("cleared") ? "·클리어" : ""}`));
await page.evaluate(() => document.querySelector(".route-map")?.scrollIntoView({ block: "start" })); await sleep(300);
await page.screenshot({ path: `${OUT}/05-route.png` });
await page.evaluate(() => window.scrollBy(0, 300)); await page.evaluate(() => document.querySelector(".route-map .route-row:nth-child(6)")?.scrollIntoView({ block: "start" })); await sleep(300);
await page.screenshot({ path: `${OUT}/06-route2.png` });
// 갈림길 하나 시작 — 좌표 탭
facts.branchTap = await tap('.route-node[data-branch="1-E2"]'); await sleep(1200);
facts.branchIntro = await page.evaluate(() => document.querySelector(".overlay-content .title")?.textContent);
facts.branchStage = await page.evaluate(() => window.__dodgeWorld?.stageIndex);
await page.screenshot({ path: `${OUT}/07-branch-intro.png` });
// 비트 메뉴
await page.goto(BASE, { waitUntil: "networkidle0" }); await sleep(2200);
await page.evaluate(() => { for (let k = 0; k < 4; k += 1) { const c = document.querySelector(".idle-claim"); if (c) c.click(); } });
await clickText(".titans-bottom-nav button", "콘텐츠"); await sleep(400);
await clickText(".nav-popup-grid button", "비트 수련"); await sleep(1600);
facts.beatToggle = await tap(".beat-custom-toggle"); await sleep(400);
facts.beatItems = await page.evaluate(() => document.querySelectorAll(".beat-custom-item").length);
await page.evaluate(() => document.querySelector(".beat-custom")?.scrollIntoView({ block: "start" })); await sleep(300);
await page.screenshot({ path: `${OUT}/08-beat-custom.png` });
const gemsBefore = await page.evaluate(() => document.querySelector('.wallet-gem [data-wallet="gem"]')?.textContent);
facts.buyTap = await tap('.beat-custom-item[data-beat-item="spike-star"]'); await sleep(700);
facts.afterBuy = await page.evaluate(() => ({ on: document.querySelector('.beat-custom-item[data-beat-item="spike-star"]')?.classList.contains("on"), gem: document.querySelector('.wallet-gem [data-wallet="gem"]')?.textContent, toast: document.querySelector(".shop-toast")?.textContent }));
facts.gemsBefore = gemsBefore;
await page.screenshot({ path: `${OUT}/09-beat-bought.png` });
console.log(JSON.stringify(facts, null, 1));
console.log("errors", errors.length, errors.slice(0, 3).join("\n"));
await browser.close();
