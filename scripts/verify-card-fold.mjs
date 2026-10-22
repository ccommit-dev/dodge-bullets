// 접는 카드 — 카드를 누르면 펼쳐져 보조 버튼이 보이고, 버튼을 누르면 접힘이 바뀌지 않는다 (2026-10-22)
import { launchBrowser } from "./launch-browser.mjs";
const BASE = "http://localhost:5173", H = "mock-local-dev", now = Date.now();
const browser = await launchBrowser({ args: ["--no-sandbox"] }); const page = await browser.newPage(); const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await page.setViewport({ width: 390, height: 664, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
await page.goto(BASE, { waitUntil: "networkidle0" });
await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); }, { [`dodgebullets:progression:v1:${H}`]: JSON.stringify({ version: 5, level: 40, redGems: 1000, idleClaimedAt: now, updatedAt: now, onboardingStep: 4, sessionCount: 9, partyIds: ["mia", "leon"], partyCap: 4, claimedRewards: ["dodge-tutorial"], pioneeredArea: 3 }), [`dodgebullets:titans:${H}`]: JSON.stringify({ gold: 5000000, stage: 18, bestStage: 18, heroes: { mia: 14, leon: 2, sera: 1, garen: 3 }, lastActiveAt: now, skillInventory: { learned: ["strike"], levels: { strike: 1 }, equipped: { starter: "strike" }, skillCores: 0 } }), "dodgebullets:test-phase": "0" });
await page.reload({ waitUntil: "networkidle0" }); await sleep(2000);
await page.evaluate(() => { for (let k = 0; k < 5; k += 1) { const c = document.querySelector(".idle-claim"); if (c) { c.click(); continue; } const b = [...document.querySelectorAll("button")].filter((x) => !x.closest(".titans-bottom-nav")).find((x) => /^(닫기|확인|나중에)$/.test(x.textContent.trim())); if (b) b.click(); } });
let fails = 0; const ok = (n, c, d = "") => { console.log(`${c ? "PASS" : "FAIL"} ${n}${d ? " — " + d : ""}`); if (!c) fails += 1; };
const vis = (sel) => page.evaluate((sel) => [...document.querySelectorAll(sel)].filter((e) => e.offsetParent !== null && getComputedStyle(e).display !== "none").length, sel);
await page.evaluate(() => [...document.querySelectorAll(".titans-bottom-nav button")].find((b) => b.textContent.includes("동료"))?.click()); await sleep(800);
const benchBefore = await vis(".ally-party-toggle");
const garen = await page.$(".ally-card.rarity-sr:not(.in-party) .titan-ally-art, .ally-card:not(.in-party) .titan-ally-art");
const box = await garen.boundingBox(); await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2); await sleep(400);
const open = await page.evaluate(() => document.querySelectorAll(".ally-card.is-open").length);
ok("동료 카드를 누르면 펼쳐지고 보조 버튼(출전 · 파견)이 보인다", open === 1 && (await vis(".ally-card.is-open .ally-party-toggle")) === 1 && (await vis(".ally-card.is-open .ally-expedition-send button")) === 3, `open ${open} · 접힌 상태 출전/벤치 버튼 ${benchBefore}`);
ok("접힌 카드엔 출전/벤치 · 파견 버튼이 안 보인다", benchBefore === 0);
// 펼친 카드의 버튼을 눌러도 접히지 않는다(버튼 클릭은 카드 토글이 아님)
const b2 = await page.$(".ally-card.is-open .ally-expedition-send button"); const bb = await b2.boundingBox();
await page.evaluate(() => [...document.querySelectorAll(".ally-card.is-open .ally-card-actions button")].length); 
const before = await page.evaluate(() => document.querySelector(".ally-card.is-open")?.getAttribute("data-ally"));
await page.mouse.click(bb.x + 2, bb.y + 2); await sleep(500);
ok("펼친 카드 안 버튼 클릭은 카드를 접지 않는다(파견 실행)", await page.evaluate(() => !!document.querySelector(".ally-card.is-open") || !!document.querySelector(".ally-expedition-status")), before);
// 스킬 — 장착 중 카드는 강화 하나만, 누르면 해제도
await page.evaluate(() => document.querySelector(".hub-sheet-close")?.click()); await sleep(400);
await page.evaluate(() => [...document.querySelectorAll(".titans-growth-tabs button")].find((b) => b.textContent.includes("스킬"))?.click()); await sleep(600);
const eqBtns = await page.evaluate(() => { const c = document.querySelector(".skill-learn-card.equipped"); return [...c.querySelectorAll(".skill-card-actions button")].filter((b) => getComputedStyle(b).display !== "none").map((b) => b.textContent.trim()); });
ok("장착 스킬 카드(접힘)는 강화 버튼 하나", eqBtns.length === 1 && /강화|MAX/.test(eqBtns[0]), eqBtns.join(","));
const sc = await page.$(".skill-learn-card.equipped strong"); const sb = await sc.boundingBox(); await page.mouse.click(sb.x + 5, sb.y + 5); await sleep(300);
const eqOpen = await page.evaluate(() => { const c = document.querySelector(".skill-learn-card.equipped"); return { open: c.classList.contains("is-open"), btns: [...c.querySelectorAll(".skill-card-actions button")].filter((b) => getComputedStyle(b).display !== "none").map((b) => b.textContent.trim()) }; });
ok("누르면 펼쳐져 해제 · 강화 둘 다", eqOpen.open && eqOpen.btns.length === 2, JSON.stringify(eqOpen));
console.log(fails ? `${fails} FAIL` : "ALL PASS");
await browser.close(); process.exit(fails ? 1 : 0);
