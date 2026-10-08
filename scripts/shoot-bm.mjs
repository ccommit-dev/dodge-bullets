/**
 * 과금 BM 간결화 캡처 (2026-10-08) — 상점 패키지 탭(5묶음) · 재화 탭(5칸) · 출석 판(7일 리듬) · 이벤트 센터 주간 도전 탭.
 *   node scripts/shoot-bm.mjs <outDir>   (vite 5173, 폰 390×844)
 * 출석 3일(유료 게이트 통과) · 벽 경험 · 환생 1회로 열어 1회 한정 묶음까지 보이게 한다. QA 빌드라 구매 버튼은 테스트 지급.
 */
import { launchBrowser } from "./launch-browser.mjs";
import { mkdirSync } from "node:fs";

const OUT = process.argv[2] ?? "shots-bm"; mkdirSync(OUT, { recursive: true });
const BASE = "http://localhost:5173", H = "mock-local-dev", now = Date.now();
const progress = {
  version: 5, level: 40, sharedCoins: 987654, equippedWeaponLevel: 10, dodgeBestStage: 3, idleClaimedAt: now, updatedAt: now, onboardingStep: 4,
  partyIds: ["mia"], partyCap: 4, attendanceStreak: 3, expeditionSeals: 12, redGems: 500, enhancementMaterials: 30,
  claimedRewards: ["dodge-tutorial"], pioneeredArea: 3, wallAreas: ["forest"], rebirthCount: 1, dodgeStars: { "0": 3, "1": 2, "2": 1 },
};
const titans = { gold: 40000, stage: 9, bestStage: 9, heroes: { mia: 8 }, lastActiveAt: now };
const browser = await launchBrowser({ args: ["--no-sandbox", "--disable-gpu"] });
const page = await browser.newPage();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = [];
page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
const clickText = (sel, text) => page.evaluate(({ sel, text }) => { const el = [...document.querySelectorAll(sel)].find((b) => b.textContent.trim().includes(text)); el?.click(); return !!el; }, { sel, text });
const closeModals = () => page.evaluate(() => { for (let k = 0; k < 4; k += 1) { const c = document.querySelector(".idle-claim"); if (c) { c.click(); continue; } const b = [...document.querySelectorAll("button")].filter((x) => /^(닫기|확인|나중에)$/.test(x.textContent.trim()))[0]; if (b) b.click(); } });
const shot = (name) => page.screenshot({ path: `${OUT}/${name}.png` });
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.goto(BASE, { waitUntil: "networkidle0" });
await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); }, {
  [`dodgebullets:progression:v1:${H}`]: JSON.stringify(progress), [`dodgebullets:titans:${H}`]: JSON.stringify(titans), "dodge-bullets:soundEnabled": "0", "dodgebullets:test-phase": "0",
});
await page.goto(BASE, { waitUntil: "networkidle0" });
await sleep(2600);
// 출석 판이 자동으로 떠 있으면 먼저 찍는다
if (await page.$(".attendance-modal")) { await shot("01-attendance-p1"); await clickText(".attendance-pages button", "DAY 16"); await sleep(300); await shot("02-attendance-p2"); }
await closeModals(); await sleep(400); await closeModals(); await sleep(400);
await clickText(".titans-bottom-nav button", "상점"); await sleep(700);
await clickText(".premium-category-tabs button", "패키지"); await sleep(600);
await shot("03-shop-package-top");
await page.evaluate(() => { const s = document.querySelector(".page-premium") ?? document.scrollingElement; s.scrollTop = 600; }); await sleep(300);
await shot("04-shop-package-mid");
await page.evaluate(() => { const s = document.querySelector(".page-premium") ?? document.scrollingElement; s.scrollTop = 1400; }); await sleep(300);
await shot("05-shop-package-bottom");
const pkg = await page.evaluate(() => ({ heads: [...document.querySelectorAll(".paid-group-head")].map((h) => h.textContent.trim()), cards: [...document.querySelectorAll(".premium-product-card strong")].map((s) => s.textContent.trim()), buttons: [...document.querySelectorAll(".premium-product-card button")].map((b) => b.textContent.trim()) }));
await clickText(".premium-category-tabs button", "재화"); await sleep(500);
await page.evaluate(() => { const s = document.querySelector(".page-premium") ?? document.scrollingElement; s.scrollTop = 0; });
await shot("06-shop-currency");
const cur = await page.evaluate(() => [...document.querySelectorAll(".premium-product-card strong")].map((s) => s.textContent.trim()));
await closeModals();
await clickText(".titans-bottom-nav button", "모험"); await sleep(600);
await page.evaluate(() => document.querySelector(".season-nav")?.click()); await sleep(700);
if (await page.$(".event-tabs")) { await clickText(".event-tabs button", "주간 도전"); await sleep(400); await shot("07-event-weekly"); }
const ev = await page.evaluate(() => [...document.querySelectorAll(".event-tabs button")].map((b) => b.textContent.trim()));
console.log(JSON.stringify({ pkg, cur, ev, errors }, null, 1));
await browser.close();
