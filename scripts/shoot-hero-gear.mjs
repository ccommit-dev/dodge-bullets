/**
 * 주인공 장착 파츠 캡처 (2026-10-15, 사용자: "장비 성장 아이템을 캐릭터에 장착 · 애니메이션") —
 *   node scripts/shoot-hero-gear.mjs <outDir>  (vite 5173, 390×844) 파츠 숙련 Lv1+ · 대장간 강화 0/5/10 세 계정 × 무기 3종에서 주인공을 여러 프레임 찍는다
 */
import { launchBrowser } from "./launch-browser.mjs";
import { mkdirSync } from "node:fs";
const OUT = process.argv[2] ?? "shots-hero-gear"; mkdirSync(OUT, { recursive: true });
const BASE = "http://localhost:5173", H = "mock-local-dev";
const browser = await launchBrowser({ args: ["--no-sandbox"] }); const page = await browser.newPage(); const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = []; page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
await page.goto(BASE, { waitUntil: "networkidle0" });
const report = [];
for (const [enh, kind] of [[0, "drum"], [5, "bow"], [10, "staff"]]) {
  const now = Date.now();
  const progress = { version: 5, level: 40, sharedCoins: 9999, dodgeBestStage: 3, idleClaimedAt: now, updatedAt: now, onboardingStep: 4, partyIds: ["mia"], partyCap: 4, claimedRewards: ["dodge-tutorial"], pioneeredArea: 3, equippedWeaponLevel: 8, expeditionWeaponForge: { bow: 14, staff: 20 }, equippedWeaponKind: kind, gearEnhance: { helmet: enh, armor: enh, gloves: enh, boots: enh } };
  const titans = { gold: 40000, stage: 9, bestStage: 9, heroes: { mia: 3 }, lastActiveAt: now, equipmentTraining: { weaponMastery: 3, shoulderMastery: 0, helmetMastery: 1, armorMastery: 1, glovesMastery: 1, bootsMastery: 1 } };
  await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); }, { [`dodgebullets:progression:v1:${H}`]: JSON.stringify(progress), [`dodgebullets:titans:${H}`]: JSON.stringify(titans), "dodge-bullets:soundEnabled": "0", "dodgebullets:test-phase": "0" });
  await page.reload({ waitUntil: "networkidle0" }); await sleep(2500);
  await page.evaluate(() => { for (let k = 0; k < 4; k += 1) { const c = document.querySelector(".idle-claim"); if (c) { c.click(); continue; } const b = [...document.querySelectorAll("button")].filter((x) => /^(닫기|확인|나중에)$/.test(x.textContent.trim()))[0]; if (b) b.click(); } });
  await sleep(1200);
  const parts = await page.evaluate(() => [...document.querySelectorAll(".titans-hero .equipped-character img, .titans-hero .equipped-character .equipment-weapon")].filter((e) => e.offsetWidth && getComputedStyle(e).display !== "none").map((e) => e.className.split(" ")[0] + ":" + (e.getAttribute("src") ?? "").split("/").pop()));
  report.push({ enh, kind, parts });
  const hero = await page.$(".titans-hero");
  for (let i = 0; i < 3; i += 1) { const b = await page.evaluate(() => { const r = document.querySelector(".titans-hero")?.getBoundingClientRect(); return r ? { x: Math.max(0, r.x - 30), y: Math.max(0, r.y - 30), width: r.width + 60, height: r.height + 50 } : null; }); if (b) await page.screenshot({ path: `${OUT}/hero-${kind}-e${enh}-${i}.png`, clip: b }); await sleep(220); }
}
console.log(JSON.stringify(report, null, 1));
console.log("errors", errors.length);
await browser.close();
