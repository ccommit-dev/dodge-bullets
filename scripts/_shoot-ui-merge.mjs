// 탭 합치기 캡처 (2026-11-03) — 동료 · 상점 5칸 · 스킬 탭 · 성장 탭. OUT=<폴더> node scripts/_shoot-ui-merge.mjs   (vite 5173)
import { launchBrowser } from "./launch-browser.mjs";
import { mkdirSync } from "node:fs";
const BASE = "http://localhost:5173", H = "mock-local-dev", now = Date.now();
const OUT = process.env.OUT ?? "scratch/ui-merge"; mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await launchBrowser({ args: ["--no-sandbox", "--disable-gpu"] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errors = []; page.on("pageerror", (e) => errors.push(String(e.message).slice(0, 200)));
await page.goto(BASE, { waitUntil: "networkidle0" });
const progress = { version: 5, onboardingStep: 4, level: 40, redGems: 5000, sharedCoins: 500000, enhancementMaterials: 2000, titanBestStage: 40, pioneeredArea: 5, idleClaimedAt: now, updatedAt: now, partyIds: ["mia", "leon", "sera", "garen"], partyCap: 4, sessionCount: 9, claimedRewards: ["dodge-tutorial", "welcome-gift"], beatSkills: { kick: 15, hat: 15, snare: 15, fire: 15, throat: 15 } };
const titans = { stage: 40, bestStage: 40, gold: 2000000, heroes: { mia: 26, leon: 13, sera: 4, garen: 9 }, skillInventory: { learned: ["strike", "crit", "clone", "thunderLink", "meteor", "steel"], levels: { strike: 3, crit: 1, clone: 3, thunderLink: 1, meteor: 5, steel: 5 }, equipped: { starter: "strike", linkA: "crit", passive: "steel" }, skillCores: 30, copies: { thunderLink: 1, steel: 4, strike: 2 } }, lastActiveAt: now };
await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); location.reload(); }, {
  [`dodgebullets:progression:v1:${H}`]: JSON.stringify(progress), [`dodgebullets:titans:${H}`]: JSON.stringify(titans), "dodge-bullets:soundEnabled": "0",
  [`dodgebullets:attendance:v1:${H}`]: JSON.stringify({ lastClaimDate: new Date().toLocaleDateString("sv-SE"), totalDays: 3, consecutiveDays: 3 }),
}).catch(() => {});
await page.waitForNavigation({ waitUntil: "networkidle0" }).catch(() => {});
await sleep(2200);
const click = (sel, text) => page.evaluate(({ sel, text }) => { const el = [...document.querySelectorAll(sel)].find((b) => b.textContent.trim().includes(text)); el?.click(); return !!el; }, { sel, text });
for (let k = 0; k < 3; k += 1) { await page.evaluate(() => { document.querySelector(".idle-claim")?.click(); [...document.querySelectorAll("button")].filter((x) => !x.closest(".titans-bottom-nav")).find((x) => /^(닫기|확인|나중에)$/.test(x.textContent.trim()))?.click(); }); await sleep(250); }
const shot = async (n) => { await sleep(450); await page.screenshot({ path: `${OUT}/${n}.png` }); };
await shot("0-hunt");
await click(".titans-tabs button", "스킬"); await shot("1-skill-top");
await page.evaluate(() => document.querySelector('.skill-slot-head[data-slot="finisher"]')?.scrollIntoView({ block: "start" })); await shot("2-skill-low");
await page.evaluate(() => { const c = [...document.querySelectorAll(".skill-learn-card")].find((x) => x.querySelector(".skill-icon-steel")); c?.scrollIntoView({ block: "center" }); c?.click(); }); await shot("3-skill-open");
await click(".titans-bottom-nav button", "동료"); await shot("4-ally");
await click(".hub-sheet-switch button", "동료 뽑기"); await shot("5-ally-gacha");
await click(".titans-bottom-nav button", "상점"); await shot("6-shop-currency");
for (const [g, n] of [["패키지", "7-shop-package"], ["뽑기", "8-shop-draw"], ["꾸미기", "9-shop-style"], ["이벤트", "10-shop-event"]]) { await click(".hub-sheet-switch button", g); await shot(n); }
console.log(JSON.stringify({ errors, overflow: await page.evaluate(() => document.documentElement.scrollWidth - innerWidth) }));
await browser.close();
