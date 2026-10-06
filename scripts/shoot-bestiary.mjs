// 몬스터 ×3 캡처 (2026-10-06) — 사냥터 전장(지역 변종·보스 교대) · 마이페이지 몬스터 얼굴 도감 · 성문 방어 장별 변종/중간 보스 (vite 5173)
//   node scripts/shoot-bestiary.mjs <outDir>
import { launchBrowser } from "./launch-browser.mjs";
import { mkdirSync } from "node:fs";
const OUT = process.argv[2] ?? "shots-bestiary"; mkdirSync(OUT, { recursive: true });
const BASE = "http://localhost:5173", H = "mock-local-dev", now = Date.now();
const browser = await launchBrowser({ args: ["--no-sandbox", "--disable-gpu"] });
const page = await browser.newPage();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = []; page.on("pageerror", (e) => errors.push(String(e.stack ?? e).slice(0, 400)));
const broken = []; page.on("requestfailed", (r) => { if (/monsters\//.test(r.url())) broken.push(r.url()); });
page.on("response", (r) => { if (/monsters\//.test(r.url()) && r.status() >= 400) broken.push(r.url() + " " + r.status()); });
const clickText = (sel, text) => page.evaluate(({ sel, text }) => { const el = [...document.querySelectorAll(sel)].find((b) => b.textContent.trim().includes(text)); el?.click(); return !!el; }, { sel, text });
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const boot = async (stage) => {
  await page.goto(BASE, { waitUntil: "networkidle0" });
  await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); }, {
    [`dodgebullets:progression:v1:${H}`]: JSON.stringify({ version: 5, level: 40, onboardingStep: 4, idleClaimedAt: now, updatedAt: now, partyIds: ["mia", "leon"], partyCap: 4, pioneeredArea: 5, dodgeBestStage: 50, dodgeStageSchema: 2, monsterKills: { slime: 50, goblin: 50, wolf: 50, ogre: 50, dragon: 50, boss: 20 } }),
    [`dodgebullets:titans:${H}`]: JSON.stringify({ stage, bestStage: 30, gold: 1000, heroes: { mia: 30, leon: 30 }, lastActiveAt: now }),
    "dodge-bullets:soundEnabled": "0",
    [`dodgebullets:attendance:v1:${H}`]: JSON.stringify({ lastClaimDate: new Date().toLocaleDateString("sv-SE"), totalDays: 3, consecutiveDays: 3 }),
  });
  await page.goto(BASE, { waitUntil: "networkidle0" });
  await sleep(2600);
  await page.evaluate(() => { for (let k = 0; k < 4; k += 1) { const c = document.querySelector(".idle-claim"); if (c) c.click(); } });
  await sleep(1200);
};
const facts = {};
for (const stage of [7, 13, 18, 26]) {
  await boot(stage);
  facts[`field${stage}`] = await page.evaluate(() => ({ src: document.querySelector(".titans-monster .monster-asset-current")?.dataset.src?.split("/").pop(), label: document.querySelector(".titans-monster-name, .monster-name")?.textContent }));
  await page.screenshot({ path: `${OUT}/field-${stage}.png`, clip: { x: 0, y: 260, width: 390, height: 420 } });
}
await clickText(".titans-back", "마이페이지"); await sleep(1500);
await page.evaluate(() => document.querySelector(".bestiary-grid")?.scrollIntoView({ block: "start" })); await sleep(800);
facts.bestiary = await page.evaluate(() => ({ chips: document.querySelectorAll(".bestiary-chip").length, seen: document.querySelectorAll(".bestiary-chip.seen").length, imgsOk: [...document.querySelectorAll(".bestiary-chip img")].filter((i) => i.complete && i.naturalWidth > 0).length }));
await page.screenshot({ path: `${OUT}/bestiary.png` });
await page.evaluate(() => window.scrollBy(0, 700)); await sleep(500);
await page.screenshot({ path: `${OUT}/bestiary2.png` });
console.log(JSON.stringify(facts, null, 1));
console.log("broken", broken.length, broken.slice(0, 5).join("\n"));
console.log("errors", errors.length, errors.slice(0, 3).join("\n"));
await browser.close();
