/**
 * 변형 동료·스킨 전투 프레임 촬영 — 전용 아틀라스(tint)·비율 수정·좌표 분리 확인.
 *   node scripts/shot-variants.mjs   → store/anim-inspect/variants-*.png
 */
import { mkdirSync } from "node:fs";
import puppeteer from "puppeteer";
const BASE = "http://localhost:5173";
const H = "mock-local-dev";
const OUT = "store/anim-inspect";
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const now = Date.now();
const browser = await puppeteer.launch({ headless: "shell", args: ["--no-sandbox", "--disable-gpu"] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });

async function shoot(name, party, skins = {}) {
  await page.goto(BASE, { waitUntil: "networkidle0" });
  await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); }, {
    [`dodgebullets:progression:v1:${H}`]: JSON.stringify({ version: 5, onboardingStep: 4, level: 80, exp: 900000, redGems: 100, sharedCoins: 1e6, pioneeredArea: 5, titanBestStage: 50, dodgeBestStage: 4, idleClaimedAt: now, updatedAt: now, partyIds: party, partyCap: 6, sessionCount: 9, attendanceStreak: 3, ownedAllySkins: Object.values(skins), equippedAllySkins: skins }),
    [`dodgebullets:titans:${H}`]: JSON.stringify({ stage: 50, bestStage: 50, gold: 1e9, heroes: Object.fromEntries(party.map((id) => [id, 30])), lastActiveAt: now }),
    "dodge-bullets:soundEnabled": "0",
  });
  await page.goto(BASE, { waitUntil: "networkidle0" });
  await sleep(2600);
  await page.evaluate(() => { for (let k = 0; k < 3; k += 1) { const c = document.querySelector(".idle-claim"); if (c) { c.click(); continue; } const b = [...document.querySelectorAll("button")].filter((x) => !x.closest(".recommend-banner, .routine-board, .titans-tabs, .titans-content-tabs, .gacha-panel")).find((x) => /출석|수령|확인|닫기/.test(x.textContent)); if (!b) break; b.click(); } });
  await sleep(1800);
  const field = await page.$(".titans-field");
  await field.screenshot({ path: `${OUT}/${name}.png` });
  const boxes = await page.evaluate(() => [...document.querySelectorAll(".titans-allies .titan-ally-art")].map((el) => { const r = el.getBoundingClientRect(); return { id: [...el.classList].find((c) => c.startsWith("ally-"))?.slice(5), x: Math.round(r.x), y: Math.round(r.y) }; }));
  console.log(name, JSON.stringify(boxes));
}
await shoot("variants-a", ["pyro", "marina", "terra", "zephyr", "bronn", "iris"]);
await shoot("variants-b", ["cain", "sylph", "orion", "ember", "mia", "garen"]);
await shoot("skins", ["garen", "leon", "mia", "sera"], { garen: "garen-magma", leon: "leon-frost" });
await browser.close();
console.log("done");
