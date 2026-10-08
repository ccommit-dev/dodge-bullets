/**
 * Galactic Outlaw 루프 캡처 (2026-10-08) — 사냥 강화 3택 바 · 보스 약점 배지 · 편성 특성 칩 · 비트 출격 강화 칩/약점 레인 · 재화 탭 인장 묶음.
 *   node scripts/shoot-loop.mjs <outDir>   (vite 5173, 폰 390×844)
 * 진행된 계정(지역 3 · 미아 8레벨 · 선택권 2장)으로 연다. 보스는 10마리 처치 뒤 '보스 도전' 버튼을 눌러 띄운다.
 */
import { launchBrowser } from "./launch-browser.mjs";
import { mkdirSync } from "node:fs";

const OUT = process.argv[2] ?? "shots-loop"; mkdirSync(OUT, { recursive: true });
const BASE = "http://localhost:5173", H = "mock-local-dev", now = Date.now();
const progress = {
  version: 5, level: 40, sharedCoins: 987654, equippedWeaponLevel: 10, dodgeBestStage: 3, idleClaimedAt: now, updatedAt: now, onboardingStep: 4,
  partyIds: ["mia", "leon", "pyro", "luna"], partyCap: 4, attendanceStreak: 3, expeditionSeals: 12, redGems: 500, enhancementMaterials: 30,
  claimedRewards: ["dodge-tutorial"], pioneeredArea: 3, wallAreas: [], rebirthCount: 0, dodgeStars: { "0": 3, "1": 2, "2": 1 },
};
const titans = { gold: 40000, stage: 9, bestStage: 9, heroes: { mia: 8, leon: 5, pyro: 4, luna: 3 }, lastActiveAt: now, huntPicks: 2,
  skillInventory: { learned: ["strike", "emberCut", "frostEdge", "crit", "clone", "meteor", "steel"], levels: { strike: 3, emberCut: 2, frostEdge: 2, crit: 2, clone: 1, meteor: 1, steel: 1 }, equipped: { starter: "emberCut", linkA: "crit", linkB: "clone", finisher: "meteor", passive: "steel" }, skillCores: 3 } };
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
await closeModals(); await sleep(400); await closeModals(); await sleep(600);
// 1) 사냥 강화 3택 바 (선택권 2)
await shot("01-hunt-pick-bar");
const pick = await page.evaluate(() => ({ head: document.querySelector(".hunt-pick-head")?.textContent ?? "", cards: [...document.querySelectorAll(".hunt-pick-bar .perk-choice")].map((b) => b.textContent.trim().slice(0, 40)) }));
await page.evaluate(() => document.querySelector(".hunt-pick-bar .perk-choice")?.click()); await sleep(500);
await shot("02-hunt-picked-chip");
const chips = await page.evaluate(() => [...document.querySelectorAll(".hunt-mod-chip")].map((c) => c.textContent));
// 2) 보스 약점 배지 — 10마리 뒤 '보스 도전'
let bossBtn = false;
for (let i = 0; i < 90 && !bossBtn; i += 1) { await sleep(500); bossBtn = await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => x.textContent.includes("보스 도전")); if (b) { b.click(); return true; } return false; }); }
await sleep(1500);
await shot("03-boss-weak");
const weak = await page.evaluate(() => ({ badge: document.querySelector(".boss-weak")?.textContent ?? "", floats: [...document.querySelectorAll(".titans-float .float-label")].map((f) => f.textContent).slice(0, 6) }));
await sleep(2500);
const weakFloats = await page.evaluate(() => [...document.querySelectorAll(".titans-float .float-label")].map((f) => f.textContent));
// 3) 편성 패널 특성·약점 상성 칩
await clickText(".titans-bottom-nav button", "동료"); await sleep(700);
await shot("04-party-chips");
const party = await page.evaluate(() => [...document.querySelectorAll(".party-synergies .synergy-chip")].map((c) => c.textContent.trim()));
// 4) 재화 탭 인장 묶음
await clickText(".titans-bottom-nav button", "상점"); await sleep(600);
await clickText(".premium-category-tabs button", "재화"); await sleep(500);
await shot("05-shop-currency-seal");
const shop = await page.evaluate(() => [...document.querySelectorAll(".premium-product-card strong")].map((s) => s.textContent.trim()));
// 5) 비트 수련 허브 출격 강화 칩 → 2번 곡(장 대장) 약점 레인
await clickText(".titans-bottom-nav button", "콘텐츠"); await sleep(600);
await clickText("button", "비트 수련"); await sleep(1500);
await shot("06-beat-hub-perks");
const perks = await page.evaluate(() => [...document.querySelectorAll(".schedule-perks .perk-chip")].slice(0, 6).map((c) => c.textContent + (c.classList.contains("on") ? "*" : "")));
await page.evaluate(() => { const cards = [...document.querySelectorAll(".schedule-card")]; (cards[1] ?? cards[0])?.click(); }); await sleep(1200);
const ws = await page.evaluate(() => { const s = window.__beatSession; if (s) s.world.elapsedMs = 8200; return !!s; });
await sleep(400);
await shot("07-beat-weak-lane");
const beat = await page.evaluate(() => ({ weakPad: [...document.querySelectorAll(".beat-pad")].map((p) => p.classList.contains("weak")), padWeak: !!document.querySelector(".pad-weak"), hint: document.querySelector(".hud-hint")?.textContent ?? "" }));
console.log(JSON.stringify({ pick, chips, bossBtn, weak, weakFloats, party, shop, perks, ws, beat, errors }, null, 1));
await browser.close();
