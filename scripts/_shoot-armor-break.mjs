// 견갑 강화 실패 연출 캡처 — 방지권 없음(깨짐) · 있음(금만)   node scripts/_shoot-armor-break.mjs <outDir>
import { launchBrowser } from "./launch-browser.mjs";
const OUT = process.argv[2]; const BASE = "http://localhost:5173", H = "mock-local-dev", now = Date.now();
const browser = await launchBrowser({ args: ["--no-sandbox"] }); const page = await browser.newPage(); const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = []; page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.goto(BASE, { waitUntil: "networkidle0" });
const clickText = (sel, text) => page.evaluate(({ sel, text }) => { const el = [...document.querySelectorAll(sel)].find((b) => b.textContent.trim().includes(text)); el?.click(); return !!el; }, { sel, text });
for (const [tickets, tag] of [[0, "break"], [3, "protected"]]) {
  await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); }, { [`dodgebullets:progression:v1:${H}`]: JSON.stringify({ version: 5, level: 20, redGems: 100, sharedCoins: 9000000, enhancementMaterials: 3000, shoulderShards: 200, ownedShoulders: ["scout"], equippedShoulder: "scout", idleClaimedAt: now, updatedAt: now, onboardingStep: 4, sessionCount: 9, partyIds: ["mia"], partyCap: 4, claimedRewards: ["dodge-tutorial"], pioneeredArea: 3, discoverySeeded: true, discovered: [] }), [`dodgebullets:titans:${H}`]: JSON.stringify({ gold: 1000, stage: 2, bestStage: 2, heroes: { mia: 5 }, lastActiveAt: now }), [`dodgebullets:forge:${H}`]: JSON.stringify({ gold: 0, goldMigrated: true, level: 3, bestLevel: 3, tickets, shards: 0, totalAttempts: 3, pendingFailure: false, reforgeAttempts: 0, armorLevel: 10, bestArmorLevel: 10, armorAttempts: 10 }), [`dodgebullets:attendance:v1:${H}`]: JSON.stringify({ lastClaimDate: new Date().toLocaleDateString("sv-SE"), totalDays: 3, consecutiveDays: 3 }), "dodge-bullets:soundEnabled": "0", "dodgebullets:test-phase": "0" });
  await page.reload({ waitUntil: "networkidle0" }); await sleep(1200);
  await page.evaluate(() => { for (let k = 0; k < 5; k += 1) { const c = document.querySelector(".idle-claim"); if (c) { c.click(); continue; } const b = [...document.querySelectorAll("button")].filter((x) => !x.closest(".titans-bottom-nav")).find((x) => /^(닫기|확인|나중에)$/.test(x.textContent.trim())); if (b) b.click(); } });
  await clickText(".titans-bottom-nav button", "모험"); await sleep(500);
  await clickText(".nav-popup-grid button", "대장간"); await sleep(1800);
  await clickText("button", "보호구"); await sleep(600);
  await page.evaluate(() => { Math.random = () => 0.999; window.__seen = []; new MutationObserver((ms) => { for (const m of ms) for (const n of m.addedNodes) if (n instanceof Element) { const c = n.className?.baseVal ?? n.className; if (/armor-shatter|fail|toast/.test(String(c))) window.__seen.push(String(c) + ":" + n.textContent.slice(0, 30)); } }).observe(document.body, { childList: true, subtree: true }); });
  await page.evaluate(() => [...document.querySelectorAll(".forge-button")].find((b) => b.textContent.includes("강화하기"))?.click());
  for (let i = 0; i < 60 && !(await page.$(".armor-shatter")); i += 1) await sleep(50);
  await sleep(380);
  const info = await page.evaluate(() => ({ cls: document.querySelector(".armor-forge-stage")?.className, label: document.querySelector(".forge-impact.fail")?.textContent, shards: document.querySelectorAll(".armor-shard").length, lv: document.querySelector(".forge-sword-name span")?.textContent }));
  console.log(tag, JSON.stringify(info), JSON.stringify(await page.evaluate(() => window.__seen)));
  const r = await page.evaluate(() => { const b = document.querySelector(".armor-forge-stage").getBoundingClientRect(); return { x: b.x, y: b.y, width: b.width, height: b.height }; });
  await page.screenshot({ path: `${OUT}/armor-${tag}.png`, clip: r });
}
console.log("errors", errors.slice(0, 2));
await browser.close();
