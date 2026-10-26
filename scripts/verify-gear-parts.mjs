/**
 * 장비 파츠 4종 실화면 검사 (2026-10-14, 사용자: "장비 성장 쪽에 파츠 4개 더 · 총 6개 성장 및 강화 · 대장간에도").
 *   node scripts/verify-gear-parts.mjs [outDir]   (vite 5173, 폰 390×844)
 * 사냥터 장비 성장에 6칸(무기·견갑 + 투구·갑옷·장갑·신발)이 보이고, 투구 훈련이 골드를 쓰고 Lv 를 올린다.
 * 대장간 "장비" 탭에 4줄이 있고, 투구 강화가 코인·강화석을 쓰고 +1 이 되며 저장(gearEnhance)에 남는다.
 */
import { launchBrowser } from "./launch-browser.mjs";
import { mkdirSync } from "node:fs";
const OUT = process.argv[2] ?? "shots-gear"; mkdirSync(OUT, { recursive: true });
const BASE = "http://localhost:5173", H = "mock-local-dev";
const results = []; const ok = (n, c, d = "") => results.push([c ? "PASS" : "FAIL", n, d]);
const browser = await launchBrowser({ args: ["--no-sandbox", "--disable-gpu"] });
const page = await browser.newPage(); const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = []; page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.goto(BASE, { waitUntil: "networkidle0" });
const now = Date.now();
const progress = { version: 5, level: 40, sharedCoins: 50_000, dodgeBestStage: 12, idleClaimedAt: now, updatedAt: now, onboardingStep: 4, partyIds: ["mia"], partyCap: 4, redGems: 0, enhancementMaterials: 20, claimedRewards: ["dodge-tutorial"], pioneeredArea: 3 };
const titans = { gold: 100_000, stage: 9, bestStage: 9, heroes: { mia: 3 }, lastActiveAt: now };
await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); }, { [`dodgebullets:progression:v1:${H}`]: JSON.stringify(progress), [`dodgebullets:titans:${H}`]: JSON.stringify(titans), "dodge-bullets:soundEnabled": "0", "dodgebullets:test-phase": "0" });
await page.reload({ waitUntil: "networkidle0" }); await sleep(2500);
await page.evaluate(() => { for (let k = 0; k < 4; k += 1) { const c = document.querySelector(".idle-claim"); if (c) { c.click(); continue; } const b = [...document.querySelectorAll("button")].filter((x) => /^(닫기|확인|나중에)$/.test(x.textContent.trim()))[0]; if (b) b.click(); } });
await sleep(500);
const cards = await page.evaluate(() => [...document.querySelectorAll(".equipment-training-card")].map((c) => c.querySelector("strong")?.textContent ?? ""));
ok("장비 성장 7칸: 무기·번개·견갑 + 투구·갑옷·장갑·신발 (번개 2026-10-22)", cards.length === 7 && cards.some((c) => c.startsWith("번개")) && ["투구", "갑옷", "장갑", "신발"].every((n) => cards.some((c) => c.startsWith(n))), cards.join(" | "));
const gold0 = await page.evaluate((h) => JSON.parse(localStorage.getItem(`dodgebullets:titans:${h}`)).gold, H);
await page.evaluate(() => document.querySelector('.gear-part-card[data-gear-part="helmet"] button')?.click()); await sleep(1500);
const helmetText = await page.evaluate(() => document.querySelector('.gear-part-card[data-gear-part="helmet"] strong')?.textContent ?? "");
const t1 = await page.evaluate((h) => JSON.parse(localStorage.getItem(`dodgebullets:titans:${h}`)), H);
ok("투구 훈련 → 숙련 Lv.1 · 사냥 골드가 줄고 저장에 남는다", /Lv\.1/.test(helmetText) && t1.equipmentTraining.helmetMastery === 1 && t1.gold < gold0, `${helmetText} · gold ${gold0}→${t1.gold}`);
const row = await page.$('.gear-part-card[data-gear-part="helmet"]'); if (row) await row.screenshot({ path: `${OUT}/growth-helmet.png` });
await page.evaluate(() => document.querySelector(".equipment-training-card")?.parentElement?.scrollIntoView()); await page.screenshot({ path: `${OUT}/growth.png` });
// 대장간 — 모험 허브 대장간 카드
await page.evaluate(() => [...document.querySelectorAll(".titans-bottom-nav button")].find((b) => b.textContent.includes("모험"))?.click()); await sleep(700);
await page.evaluate(() => [...document.querySelectorAll(".hub-card")].find((b) => b.textContent.includes("대장간"))?.click()); await sleep(2500);
await page.evaluate(() => [...document.querySelectorAll(".forge-tabs button")].find((b) => b.textContent.trim() === "장비")?.click()); await sleep(600);
const rows = await page.evaluate(() => [...document.querySelectorAll(".gear-forge-row strong")].map((e) => e.textContent));
ok("대장간 '장비' 탭: 투구·갑옷·장갑·신발 4줄", rows.length === 4 && rows.every((r) => /\+0$/.test(r)), rows.join(" | "));
const p0 = await page.evaluate((h) => JSON.parse(localStorage.getItem(`dodgebullets:progression:v1:${h}`)), H);   // 대장간 첫 입장은 시작 코인을 준다 — 누르기 직전 값과 비교
await page.evaluate(() => document.querySelector('.gear-forge-row[data-gear-part="helmet"] button')?.click()); await sleep(1500);
const after = await page.evaluate(() => document.querySelector('.gear-forge-row[data-gear-part="helmet"] strong')?.textContent ?? "");
const p1 = await page.evaluate((h) => JSON.parse(localStorage.getItem(`dodgebullets:progression:v1:${h}`)), H);
ok("투구 강화 → +1 · 코인 800·강화석 1 사용 · 저장 gearEnhance.helmet = 1", /\+1$/.test(after) && p1.gearEnhance?.helmet === 1 && p1.sharedCoins === p0.sharedCoins - 800 && p1.enhancementMaterials === p0.enhancementMaterials - 1, `${after} · coins ${p1.sharedCoins} · mats ${p1.enhancementMaterials}`);
await page.screenshot({ path: `${OUT}/forge-gear.png` });
ok("페이지 오류 없음", errors.length === 0, errors.join(" / "));
for (const [s, n, d] of results) console.log(s, n, d ? "— " + d : "");
const fails = results.filter((r) => r[0] === "FAIL").length;
console.log(fails ? `\n${fails} FAIL` : "\nALL PASS");
await browser.close();
process.exit(fails ? 1 : 0);
