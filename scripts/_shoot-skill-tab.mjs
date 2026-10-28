// 스킬 탭 2판 캡처 — 칸 묶음 · 윤곽선 · 장착 버튼 · 배우는 순간 연출 (2026-10-28)
//   node scripts/_shoot-skill-tab.mjs   (vite dev 5173) → scratch/skill-tab-*.png
import { launchBrowser } from "./launch-browser.mjs";
import { mkdirSync } from "node:fs";
const BASE = "http://localhost:5173";
const H = "mock-local-dev";
const OUT = process.env.OUT ?? "scratch";
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const now = Date.now();
const browser = await launchBrowser({ args: ["--no-sandbox", "--disable-gpu"] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
const progress = { version: 5, onboardingStep: 4, level: 30, exp: 90000, redGems: 2000, sharedCoins: 500000, enhancementMaterials: 40, titanBestStage: 12, pioneeredArea: 3, idleClaimedAt: now, updatedAt: now, partyIds: ["mia", "leon"], partyCap: 4, skillPoints: 60 };
const titans = { stage: 12, bestStage: 12, gold: 2000000, heroes: { mia: 12, leon: 8 }, skillInventory: { learned: ["strike", "crit"], levels: { strike: 3, crit: 1 }, equipped: { starter: "strike", linkA: "crit" }, skillCores: 30 }, lastActiveAt: now };
await page.goto(BASE, { waitUntil: "networkidle0" });
await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); }, {
  [`dodgebullets:progression:v1:${H}`]: JSON.stringify(progress), [`dodgebullets:titans:${H}`]: JSON.stringify(titans), "dodge-bullets:soundEnabled": "0",
});
await page.goto(BASE, { waitUntil: "networkidle0" });
await sleep(2400);
for (let k = 0; k < 3; k += 1) {   // 출석 · 방치 보상 팝업 닫기
  await page.evaluate(() => { const c = document.querySelector(".idle-claim"); if (c) c.click(); [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "닫기")?.click(); });
  await sleep(300);
}
await page.evaluate(() => [...document.querySelectorAll(".titans-tabs button")].find((b) => b.textContent.includes("스킬"))?.click());
await sleep(800);
await page.screenshot({ path: `${OUT}/skill-tab-top.png` });
await page.evaluate(() => document.querySelector('.skill-learn-card[data-slot="passive"]')?.scrollIntoView({ block: "center" }));
await sleep(300);
await page.screenshot({ path: `${OUT}/skill-tab-passive.png` });
await page.evaluate(() => { const card = [...document.querySelectorAll(".skill-learn-card")].find((c) => /단단한 앞니/.test(c.textContent)); card?.querySelector(".skill-card-actions button")?.click(); });
await sleep(260);
await page.screenshot({ path: `${OUT}/skill-tab-equip-fx.png` });
console.log(await page.evaluate(() => ({ pop: document.querySelectorAll(".equip-pop").length, cutin: !!document.querySelector(".skill-cutin"), heads: [...document.querySelectorAll(".skill-slot-head")].map((h) => h.textContent.replace(/\s+/g, " ").trim()) })));
await browser.close();
