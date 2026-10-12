/**
 * UI 잘림·넘침 스캔 (2026-10-12, 사용자: "UI 여백이나 금액 잘리는 거 모두 통일되게") — 폰(390×844)에서 주요 화면을 돌며
 * 글자가 상자보다 넓어 잘리거나(scrollWidth > clientWidth) 화면 밖으로 나간 요소를 찍는다. 단언은 하지 않고 목록만 — 고친 뒤 다시 돌려 0 을 만든다.
 *   node scripts/scan-overflow.mjs [outDir]   (vite 5173)
 */
import { launchBrowser } from "./launch-browser.mjs";
import { mkdirSync, writeFileSync } from "node:fs";

const OUT = process.argv[2] ?? "scan-overflow"; mkdirSync(OUT, { recursive: true });
const BASE = "http://localhost:5173", H = "mock-local-dev", now = Date.now();
const progress = {
  version: 5, level: 40, sharedCoins: 999_950, equippedWeaponLevel: 10, dodgeBestStage: 3, idleClaimedAt: now, updatedAt: now, onboardingStep: 4,
  partyIds: ["mia", "leon", "pyro", "luna"], partyCap: 4, attendanceStreak: 3, expeditionSeals: 12, redGems: 999_999, enhancementMaterials: 1234,
  claimedRewards: ["dodge-tutorial"], pioneeredArea: 3, wallAreas: ["forest"], rebirthCount: 1, dodgeStars: { "0": 3, "1": 2, "2": 1 }, titanBestStage: 14,
};
const titans = { gold: 9_999_999, stage: 14, bestStage: 14, heroes: { mia: 8, leon: 5, pyro: 4, luna: 3 }, lastActiveAt: now, huntPicks: 2 };
const browser = await launchBrowser({ args: ["--no-sandbox", "--disable-gpu"] });
const page = await browser.newPage();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clickText = (sel, text) => page.evaluate(({ sel, text }) => { const el = [...document.querySelectorAll(sel)].find((b) => b.textContent.trim().includes(text)); el?.click(); return !!el; }, { sel, text });
const closeModals = () => page.evaluate(() => { for (let k = 0; k < 4; k += 1) { const c = document.querySelector(".idle-claim"); if (c) { c.click(); continue; } const b = [...document.querySelectorAll("button")].filter((x) => /^(닫기|확인|나중에)$/.test(x.textContent.trim()))[0]; if (b) b.click(); } });
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.goto(BASE, { waitUntil: "networkidle0" });
await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); }, {
  [`dodgebullets:progression:v1:${H}`]: JSON.stringify(progress), [`dodgebullets:titans:${H}`]: JSON.stringify(titans), "dodge-bullets:soundEnabled": "0", "dodgebullets:test-phase": "0",
});
await page.goto(BASE, { waitUntil: "networkidle0" });
await sleep(2600); await closeModals(); await sleep(400); await closeModals(); await sleep(400);

const scan = (name) => page.evaluate((name) => {
  const vw = window.innerWidth;
  const out = [];
  const seen = new Set();
  for (const el of document.querySelectorAll("body *")) {
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden" || el.closest("canvas")) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0 || r.bottom < 0 || r.top > window.innerHeight) continue;
    const text = (el.childNodes.length && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) ? el.textContent.trim().replace(/\s+/g, " ").slice(0, 60) : "";
    const clipped = text && el.scrollWidth > el.clientWidth + 1 && (cs.overflow !== "visible" || cs.textOverflow === "ellipsis" || cs.whiteSpace === "nowrap");
    const offscreen = r.right > vw + 1 || r.left < -1;
    if ((clipped || offscreen) && text) {
      const key = `${el.className}|${text}`; if (seen.has(key)) continue; seen.add(key);
      out.push({ screen: name, kind: clipped ? "clip" : "offscreen", cls: String(el.className).slice(0, 50), text, w: Math.round(r.width), sw: el.scrollWidth, cw: el.clientWidth });
    }
  }
  return out;
}, name);

const all = [];
const shot = async (name) => { await page.screenshot({ path: `${OUT}/${name}.png` }); all.push(...(await scan(name))); };
await shot("01-hub");
await clickText(".titans-bottom-nav button", "상점"); await sleep(700); await shot("02-shop-currency");
await clickText(".premium-category-tabs button", "패키지"); await sleep(500); await shot("03-shop-package");
await clickText(".premium-category-tabs button", "동료"); await sleep(500); await shot("04-shop-ally");
await closeModals(); await clickText(".titans-bottom-nav button", "동료"); await sleep(700); await shot("05-allies");
await clickText("button", "동료 뽑기"); await sleep(600); await shot("06-gacha");
await closeModals(); await clickText(".titans-bottom-nav button", "모험"); await sleep(700); await shot("07-adventure");
await page.evaluate(() => document.querySelector(".season-nav")?.click()); await sleep(700); await shot("08-events");
await clickText(".event-tabs button", "주간 도전"); await sleep(400); await shot("09-events-weekly");
await closeModals(); await closeModals(); await sleep(400);
await clickText(".titans-bottom-nav button", "콘텐츠"); await sleep(700); await shot("10-contents");
await closeModals(); await clickText(".titans-bottom-nav button", "사냥터"); await sleep(500);
await clickText("button", "스킬"); await sleep(600); await shot("11-skills");
await page.evaluate(() => document.querySelector(".mypage-icon")?.closest("button")?.click() ?? [...document.querySelectorAll("button")].find((b) => b.textContent.includes("마이페이지"))?.click()); await sleep(800); await shot("12-mypage");
await closeModals(); await sleep(300);
await page.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.textContent.trim().startsWith("설정"))?.click()); await sleep(600); await shot("13-settings");
writeFileSync(`${OUT}/overflow.json`, JSON.stringify(all, null, 1));
console.log(JSON.stringify(all, null, 1));
console.log("total", all.length);
await browser.close();
