/**
 * 성문 보급소 캡처 (2026-10-02) — 보급·임무 탭의 원정 기금·수비 보급, 사망 화면의 순간 제안, 상점 보석팩 보너스 배지.
 *   node scripts/shoot-gate-store.mjs <outDir>   (vite 5173)
 * 출석 3일(유료 게이트 통과) · 1~3스테이지 별 · 기금 미구매 상태로 연다. QA 빌드(dev)라 구매 버튼은 테스트 지급이다.
 */
import { launchBrowser } from "./launch-browser.mjs";
import { mkdirSync } from "node:fs";

const OUT = process.argv[2] ?? "shots-gate-store"; mkdirSync(OUT, { recursive: true });
const BASE = "http://localhost:5173", H = "mock-local-dev", now = Date.now();
const progress = {
  version: 5, level: 40, sharedCoins: 987654, equippedWeaponLevel: 10, dodgeBestStage: 3, idleClaimedAt: now, updatedAt: now, onboardingStep: 4,
  partyIds: ["mia"], partyCap: 4, attendanceStreak: 3, expeditionSeals: 12, expeditionSkills: { fire: 3, water: 1, ice: 0, earth: 0, bolt: 0, ultimate: 0 },
  expeditionWeapon: "bow", claimedRewards: ["dodge-tutorial"], pioneeredArea: 3, dodgeStars: { "0": 3, "1": 2, "2": 1 },
};
const titans = { gold: 40000, stage: 9, bestStage: 9, heroes: { mia: 8 }, lastActiveAt: now };
const browser = await launchBrowser({ args: ["--no-sandbox", "--disable-gpu"] });
const page = await browser.newPage();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = [];
page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
const clickText = (sel, text) => page.evaluate(({ sel, text }) => { const el = [...document.querySelectorAll(sel)].find((b) => b.textContent.trim().includes(text)); el?.click(); return !!el; }, { sel, text });
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.goto(BASE, { waitUntil: "networkidle0" });
await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); }, {
  [`dodgebullets:progression:v1:${H}`]: JSON.stringify(progress), [`dodgebullets:titans:${H}`]: JSON.stringify(titans), "dodge-bullets:soundEnabled": "0", "dodgebullets:test-phase": "0",
});
await page.goto(BASE, { waitUntil: "networkidle0" });
await sleep(2600);
await page.evaluate(() => { for (let k = 0; k < 4; k += 1) { const c = document.querySelector(".idle-claim"); if (c) { c.click(); continue; } const b = [...document.querySelectorAll("button")].filter((x) => !x.closest(".battle-alert-stack, .titans-bottom-nav, .hub-sheet, .nav-popup-grid")).find((x) => /출석|수령|확인|닫기/.test(x.textContent)); if (!b) break; b.click(); } });
await sleep(800);

// 1. 상점 패키지 탭 — 보석팩 보너스 배지 · 기금 카드
await clickText(".titans-bottom-nav button", "상점"); await sleep(700);
await clickText(".hub-sheet-switch button, .titans-content-tabs button, button", "패키지"); await sleep(700);
const badges = await page.evaluate(() => [...document.querySelectorAll(".gem-bonus-badge")].map((e) => e.textContent.trim()));
console.log("badges", JSON.stringify(badges));
await page.screenshot({ path: `${OUT}/01-shop-package.png` });
await page.evaluate(() => document.querySelector(".hub-sheet-close")?.click()); await sleep(400);

// 2. 성문 방어 › 정비 › 보급·임무
await clickText(".titans-bottom-nav button", "콘텐츠"); await sleep(400);
await clickText(".nav-popup-grid button", "성문 방어"); await sleep(1500);
await clickText("button", "정비"); await sleep(700);
await clickText("button", "보급 · 임무"); await sleep(600);
const store = await page.evaluate(() => ({ fund: !!document.querySelector(".exp-fund"), tiers: [...document.querySelectorAll(".exp-fund-tiers li")].map((li) => li.className + ":" + li.textContent.replace(/\s+/g, " ").trim()), supply: !!document.querySelector(".exp-store-row"), buy: document.querySelector(".exp-fund .exp-store-buy")?.textContent.trim(), head: document.querySelector(".exp-fund header em")?.textContent.trim() }));
console.log("store", JSON.stringify(store));
await page.evaluate(() => document.querySelector(".exp-store")?.scrollIntoView({ block: "start" }));
await sleep(300);
await page.screenshot({ path: `${OUT}/02-gate-store.png` });

// 3. 사망 화면 — 순간 제안 카드 (3스테이지에서 성문 붕괴로 쓰러뜨린다)
await clickText("button", "원정"); await sleep(500);
await clickText("button", "스테이지"); await sleep(1800);
await page.evaluate(() => { const c = document.querySelector("canvas"); if (!c) return; const r = c.getBoundingClientRect(); c.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: r.x + r.width / 2, clientY: r.y + r.height * 0.8, pointerId: 1, pointerType: "touch" })); });
await sleep(1200);
await page.evaluate(() => { const w = window.__dodgeWorld; if (w) { w.stageIndex = 2; w.barrierHp = 1; } });
let over = false;
for (let i = 0; i < 30 && !over; i += 1) { await sleep(200); over = await page.evaluate(() => !!document.querySelector(".gate-offer")); }
const offer = await page.evaluate(() => document.querySelector(".gate-offer")?.textContent.replace(/\s+/g, " ").trim() ?? null);
console.log("offer", JSON.stringify(offer));
await page.screenshot({ path: `${OUT}/03-death-offer.png` });

// 4. 수비 보급 구매(QA 테스트 지급이 아니라 실제 경제 — test-phase=0 이면 웹은 '결제 불가' 안내가 떠야 한다)
await page.evaluate(() => document.querySelector(".gate-offer-buy")?.click());
await sleep(800);
console.log("toast", JSON.stringify(await page.evaluate(() => document.querySelector(".settings-copy-toast")?.textContent ?? null)));
console.log("errors", JSON.stringify(errors));
await browser.close();
