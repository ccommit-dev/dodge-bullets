/**
 * 동료 뽑기 연출 프레임 캡처 (2026-10-15, 사용자: "동료뽑기 애니메이션이 AI 티가 너무 난다 · 더 귀엽고 화려하게").
 *   node scripts/shoot-gacha-reveal.mjs <outDir>   (vite 5173, 폰 390×844) → 10연 소환 후 0.15초 간격 프레임 + 마지막 결과
 */
import { launchBrowser } from "./launch-browser.mjs";
import { mkdirSync } from "node:fs";
const OUT = process.argv[2] ?? "shots-gacha-reveal"; mkdirSync(OUT, { recursive: true });
const BASE = "http://localhost:5173", H = "mock-local-dev", now = Date.now();
const browser = await launchBrowser({ args: ["--no-sandbox"] }); const page = await browser.newPage(); const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = []; page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.goto(BASE, { waitUntil: "networkidle0" });
const progress = { version: 5, level: 40, sharedCoins: 9999, dodgeBestStage: 3, idleClaimedAt: now, updatedAt: now, onboardingStep: 4, partyIds: ["mia"], partyCap: 4, redGems: 5000, claimedRewards: ["dodge-tutorial"], pioneeredArea: 5 };
const titans = { gold: 40000, stage: 20, bestStage: 20, heroes: { mia: 3 }, lastActiveAt: now };
await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); }, { [`dodgebullets:progression:v1:${H}`]: JSON.stringify(progress), [`dodgebullets:titans:${H}`]: JSON.stringify(titans), "dodge-bullets:soundEnabled": "0", "dodgebullets:test-phase": "0" });
await page.reload({ waitUntil: "networkidle0" }); await sleep(2500);
await page.evaluate(() => { for (let k = 0; k < 4; k += 1) { const c = document.querySelector(".idle-claim"); if (c) { c.click(); continue; } const b = [...document.querySelectorAll("button")].filter((x) => /^(닫기|확인|나중에)$/.test(x.textContent.trim()))[0]; if (b) b.click(); } });
await page.evaluate(() => [...document.querySelectorAll(".titans-bottom-nav button")].find((b) => b.textContent.includes("동료"))?.click()); await sleep(600);
await page.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.textContent.includes("동료 뽑기"))?.click()); await sleep(700);
await page.screenshot({ path: `${OUT}/00-page.png` });
await page.evaluate(() => document.querySelector(".gacha-page-actions button:nth-child(2)")?.click());
for (let i = 1; i <= 16; i += 1) { await sleep(150); await page.screenshot({ path: `${OUT}/${String(i).padStart(2, "0")}.png` }); }
await sleep(1500); await page.screenshot({ path: `${OUT}/99-final.png` });
console.log("errors", errors.length, errors.join(" / "));
await browser.close();
