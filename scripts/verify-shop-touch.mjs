// 상점 유물 · 스킬 칸 · 유물 소진 · 스킬 카드 소진을 손가락 탭(좌표 터치)으로 (2026-10-28, 사용자 아쉬운 점 "모바일 탭 검사 편입").
//   node scripts/verify-shop-touch.mjs [outDir] [device]   (vite 5173) — 기본 안드로이드 크롬(puppeteer, 전체 검사 verify-all)
//   ENGINE=webkit PLAYWRIGHT_DIR=<playwright 설치 폴더> 이면 아이폰 사파리 엔진(카카오톡) — el.click 은 덮인 단추를 숨긴다(메모리 mobile-real-tap-check)
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const ENGINE = process.env.ENGINE === "webkit" ? "webkit" : "chromium";
const pw = ENGINE === "webkit" ? createRequire(join(process.env.PLAYWRIGHT_DIR ?? process.cwd(), "package.json"))("playwright") : null;
const OUT = process.argv[2]; if (OUT) mkdirSync(OUT, { recursive: true });
const ONLY = process.argv[3];
const BASE = "http://localhost:5173", H = "mock-local-dev";
const UA = ENGINE === "webkit" ? "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1" : "Mozilla/5.0 (Linux; Android 14; SM-S921N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36";
const DEVICES = (ENGINE === "webkit" ? [["iphone15", 390, 664], ["iphoneSE", 375, 553]] : [["galaxyS24", 360, 740], ["galaxyA", 412, 780]]).filter(([d]) => !ONLY || d === ONLY);
// 안드로이드 크롬 쪽은 저장소 표준 puppeteer(launchBrowser) — Playwright 와 쓰는 부분만 맞춘 얇은 껍데기
const { launchBrowser } = ENGINE === "chromium" ? await import("./launch-browser.mjs") : {};
const pp = ENGINE === "chromium" ? await launchBrowser({ args: ["--no-sandbox", "--autoplay-policy=user-gesture-required"] }) : null;
const browser = ENGINE === "webkit" ? await pw.webkit.launch() : {
  version: () => pp.version(),
  close: () => pp.close(),
  newContext: async ({ userAgent, viewport, deviceScaleFactor }) => {
    const page = await pp.newPage();
    await page.setUserAgent(userAgent);
    await page.setViewport({ ...viewport, deviceScaleFactor, isMobile: true, hasTouch: true });
    const goto = page.goto.bind(page), reload = page.reload.bind(page);
    page.goto = (u, o = {}) => goto(u, { ...o, waitUntil: o.waitUntil === "networkidle" ? "networkidle0" : o.waitUntil });
    page.reload = (o = {}) => reload({ ...o, waitUntil: o.waitUntil === "networkidle" ? "networkidle0" : o.waitUntil });
    return { newPage: async () => page, close: () => page.close() };
  },
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const ok = (name, cond, info = "") => { console.log(`${cond ? "PASS" : "FAIL"} ${name}${info ? " — " + info : ""}`); if (!cond) fails += 1; };
console.log("engine", ENGINE, browser.version());
const today = new Date().toLocaleDateString("sv-SE");

for (const [dev, w, h] of DEVICES) {
  const ctx = await browser.newContext({ userAgent: UA, viewport: { width: w, height: h }, deviceScaleFactor: ENGINE === "webkit" ? 3 : 2.625, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));
  await page.goto(BASE, { waitUntil: "networkidle" });
  const seed = async ({ progress = {}, titans = {}, forge = null, sound = "0", extra = {} } = {}) => {
    const now = Date.now();
    const p = { version: 5, level: 25, redGems: 100, idleClaimedAt: now, updatedAt: now, onboardingStep: 4, sessionCount: 9, partyIds: ["mia", "leon"], partyCap: 4, claimedRewards: ["dodge-tutorial", "welcome-gift", "surprise-gift"], pioneeredArea: 3, discoverySeeded: true, discovered: [], ...progress };
    const t = { gold: 1000, stage: 2, bestStage: 2, heroes: { mia: 20, leon: 20 }, lastActiveAt: now, ...titans };
    const s = { [`dodgebullets:progression:v1:${H}`]: JSON.stringify(p), [`dodgebullets:titans:${H}`]: JSON.stringify(t), [`dodgebullets:attendance:v1:${H}`]: JSON.stringify({ lastClaimDate: today, totalDays: 3, consecutiveDays: 3 }), "dodge-bullets:soundEnabled": sound, "dodgebullets:inapp-fs-hint": "1", ...extra };
    if (forge) s[`dodgebullets:forge:${H}`] = JSON.stringify(forge);
    // 쓰기와 reload 를 한 evaluate 안에서 — 사이에 떠 있던 사냥터가 시드를 덮지 않게
    await Promise.all([page.waitForNavigation({ waitUntil: ENGINE === "webkit" ? "networkidle" : "networkidle0" }).catch(() => {}), page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); setTimeout(() => location.reload(), 0); }, s)]); await sleep(1500);
    await page.evaluate(() => { for (let k = 0; k < 5; k += 1) { const c = document.querySelector(".idle-claim"); if (c) { c.click(); continue; } const b = [...document.querySelectorAll("button")].filter((x) => !x.closest(".titans-bottom-nav")).find((x) => /^(닫기|확인|나중에)$/.test(x.textContent.trim())); if (b) b.click(); } });
    await sleep(400);
  };
  const covered = [];
  const tapEl = async (sel, text = "") => {
    const pt = await page.evaluate(({ sel, text }) => { const el = [...document.querySelectorAll(sel)].find((e) => e.textContent.includes(text) && e.getBoundingClientRect().width > 0); if (!el) return null; el.scrollIntoView({ block: "center" }); const r = el.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2; const top = document.elementFromPoint(x, y); return { x, y, ok: !!top && (top === el || el.contains(top)), top: top ? top.tagName + "." + String(top.className).slice(0, 50) : "none" }; }, { sel, text });
    if (!pt) return false;
    if (!pt.ok) covered.push(`${sel}${text ? "(" + text + ")" : ""} ← ${pt.top}`);
    await page.touchscreen.tap(Math.round(pt.x), Math.round(pt.y));
    return true;
  };
  const tapText = tapEl;
  const shot = async (name) => { if (OUT) await page.screenshot({ path: `${OUT}/${dev}-${name}.png` }); };
  const inView = (sel) => page.evaluate((sel) => { const el = document.querySelector(sel); if (!el) return null; const r = el.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right), vh: innerHeight, vw: innerWidth, scroll: el.scrollHeight > el.clientHeight + 2 }; }, sel);
  const noHScroll = () => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
  // 2026-10-28 — 상점 유물 · 스킬 패키지 칸 · 유물 탭 '조각 소진' · 스킬 탭 '카드 소진'을 손가락 탭으로 (아이폰 카카오톡 = WebKit)
  await seed({ progress: { relics: { "ember-ring": 3 }, relicSpare: { "ember-ring": 3, "frost-horn": 2 }, enhancementMaterials: 100, redGems: 2000 },
    titans: { gold: 50_000_000, stage: 12, bestStage: 12, skillInventory: { learned: ["strike"], levels: { strike: 1 }, equipped: { starter: "strike" }, skillCores: 0, copies: { strike: 2, emberCut: 1 } } } });
  await tapEl(".titans-bottom-nav button", "상점"); await sleep(600);
  await tapEl(".premium-category-tabs button", "유물"); await sleep(600);
  ok(`${dev} 상점 유물 = 패키지 칸 6장(재화 3 × 1회 · 10회) · 가로 넘침 없음`, (await page.$$(".relic-draw-product")).length === 6 && await noHScroll());
  const before = await page.evaluate((H) => JSON.parse(localStorage.getItem(`dodgebullets:progression:v1:${H}`)).enhancementMaterials, H);
  await tapEl('.relic-draw-product[data-banner="stone"][data-count="1"] button'); await sleep(1700);
  const modal = !!(await page.$(".relic-draw-modal"));
  await shot("relic-draw");
  if (modal) { await tapEl(".relic-draw-card button", "확인"); await sleep(400); }
  const after = await page.evaluate((H) => JSON.parse(localStorage.getItem(`dodgebullets:progression:v1:${H}`)).enhancementMaterials, H);
  ok(`${dev} 강화석 1회 칸 탭 → 결과 창 · 강화석 −30`, modal && after === before - 30, `${before} → ${after}`);
  await tapEl('.relic-banner-head[data-banner="stone"] .relic-gacha-rates'); await sleep(300);
  ok(`${dev} 강화석 '확률 정보' 탭 → 등급 4묶음`, (await page.$$(".relic-rates-group")).length === 4);
  await page.evaluate(() => document.querySelector(".relic-shop-list")?.scrollIntoView({ block: "start" })); await sleep(200);
  await shot("relic-shop");
  // 스킬 칸
  await tapEl(".premium-category-tabs button", "스킬"); await sleep(600);
  ok(`${dev} 상점 스킬 = 패키지 칸 4장(골드 · 보석 × 1회 · 10회)`, (await page.$$(".skill-draw-product")).length === 4 && await noHScroll());
  const c0 = await page.evaluate((H) => Object.values(JSON.parse(localStorage.getItem(`dodgebullets:titans:${H}`)).skillInventory.copies ?? {}).reduce((a, v) => a + v, 0), H);
  await tapEl('.skill-draw-product[data-banner="gold"][data-count="1"] button'); await sleep(1800);
  const sModal = !!(await page.$(".skill-draw-reveal"));
  await shot("skill-draw");
  if (sModal) { await tapEl(".skill-draw-reveal .relic-draw-card button", "확인"); await sleep(500); }
  let c1 = c0; for (let i = 0; i < 20 && c1 === c0; i += 1) { await sleep(150); c1 = await page.evaluate((H) => Object.values(JSON.parse(localStorage.getItem(`dodgebullets:titans:${H}`)).skillInventory.copies ?? {}).reduce((a, v) => a + v, 0), H); }
  ok(`${dev} 골드 스킬 1회 칸 탭 → 공개 창 · 카드 +1`, sModal && c1 === c0 + 1, `${c0} → ${c1}`);
  await page.evaluate(() => document.querySelector(".skill-shop-list")?.scrollIntoView({ block: "start" })); await sleep(200);
  await shot("skill-shop");
  // 유물 탭 — 조각 소진
  await tapEl(".titans-bottom-nav button", "사냥터"); await sleep(700);
  await tapEl(".titans-growth-tabs button", "유물"); await sleep(600);
  const r0 = await page.evaluate((H) => JSON.parse(localStorage.getItem(`dodgebullets:progression:v1:${H}`)).relics["ember-ring"] ?? 0, H);
  const hasBtn = await tapEl('.relic-consume[data-relic="ember-ring"]'); await sleep(700);
  const r1 = await page.evaluate((H) => JSON.parse(localStorage.getItem(`dodgebullets:progression:v1:${H}`)).relics["ember-ring"] ?? 0, H);
  ok(`${dev} 유물 탭 '조각 3개 소진' 탭 → 불씨 반지 ★1 → ★2(조각 3 → 6)`, hasBtn && r0 === 3 && r1 === 6, `${r0} → ${r1}`);
  await page.evaluate(() => [...document.querySelectorAll(".reward-pop button, .reward-pop")].forEach((e) => e.click?.())); await sleep(300);
  await page.evaluate(() => document.querySelector(".relic-tab-panel")?.scrollIntoView({ block: "start" })); await sleep(200);
  await shot("relic-tab");
  // 스킬 탭 — 카드 소진 · 카드로 학습
  await tapEl(".titans-tabs button", "스킬"); await sleep(700);
  const lv0 = await page.evaluate((H) => JSON.parse(localStorage.getItem(`dodgebullets:titans:${H}`)).skillInventory.levels.strike, H);
  const b1 = await tapEl('.skill-card-consume[data-skill="strike"]'); await sleep(200);
  let lv1 = lv0; for (let i = 0; i < 20 && lv1 === lv0; i += 1) { await sleep(150); lv1 = await page.evaluate((H) => JSON.parse(localStorage.getItem(`dodgebullets:titans:${H}`)).skillInventory.levels.strike, H); }
  ok(`${dev} 스킬 탭 '카드 n장 소진' 탭 → 도토리 일격 Lv 오름`, b1 && lv1 > lv0, `Lv.${lv0} → Lv.${lv1}`);
  const b2 = await tapEl('.skill-card-consume[data-skill="emberCut"]'); await sleep(200);
  let learned = false; for (let i = 0; i < 20 && !learned; i += 1) { await sleep(150); learned = await page.evaluate((H) => JSON.parse(localStorage.getItem(`dodgebullets:titans:${H}`)).skillInventory.learned.includes("emberCut"), H); }
  ok(`${dev} 스킬 탭 '카드로 학습' 탭 → 불꽃 장작 타 배움`, b2 && learned);
  await shot("skill-cards");
  ok(`${dev} 손가락 탭 가로막힘 없음`, covered.length === 0, covered.join(" | "));
  ok(`${dev} 페이지 오류 없음`, errors.length === 0, errors.slice(0, 3).join(" / "));
  await ctx.close();
}
console.log(fails ? `${fails} FAIL` : "ALL PASS");
await browser.close();
process.exit(fails ? 1 : 0);
