/**
 * 화면 난잡도 측정 (2026-11-13, 사용자 "왜 이렇게 난잡하고 뭘 해야 할지 집중이 안 될까" → 정리 목표 7가지의 전후 근거)
 *   node scripts/measure-clutter.mjs [캡처 폴더]      (vite dev 서버 5173 필요 · BASE 로 바꿀 수 있다)
 * 실제 해금 규칙으로 잰다(test-phase=0 · qa-mode=0 — 테스트 모드의 "전부 해금 · 보석 ∞" 를 끈다).
 *  A. 신규 유저 첫 접속 — 빈 저장으로 열고 20초 동안 뜬 창(모달 · 시트) 수 · 열린 아래 메뉴 · 모험 카드 중 열린 것
 *  B. 중반 저장(사냥터 24층) — 사냥터 한 화면에서 누를 수 있는 것 · 알림 줄 후보 수(경쟁) · 빨간 점 · 지갑 재화 종류
 * 숫자는 JSON 한 줄로도 찍는다(--json) — 정리 전후를 같은 스크립트로 견준다. 판정(PASS/FAIL)은 하지 않는다.
 */
import { launchBrowser } from "./launch-browser.mjs";
const OUT = process.argv.find((a, i) => i >= 2 && !a.startsWith("--"));
const BASE = process.env.BASE ?? "http://localhost:5173", H = "mock-local-dev";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await launchBrowser({ args: ["--no-sandbox", "--disable-gpu"] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errors = []; page.on("pageerror", (e) => errors.push(String(e.message).slice(0, 160)));

const REAL = { "dodgebullets:test-phase": "0", "dodgebullets:qa-mode": "0", "dodge-bullets:soundEnabled": "0" };
async function seed(store) {
  await page.goto(`${BASE}/favicon.png`, { waitUntil: "domcontentloaded" });
  await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); location.href = "/"; }, store).catch(() => {});
  await page.waitForNavigation({ waitUntil: "networkidle0" }).catch(() => {});
}
/** 화면 안에 보이고 누를 수 있는 것 */
const countScreen = () => page.evaluate(() => {
  const vis = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 4 && r.height > 4 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth && cs.visibility !== "hidden" && cs.display !== "none" && Number(cs.opacity) > 0.05; };
  const clickable = [...document.querySelectorAll("button, a[href], [role=button], [role=tab], [role=menuitem]")].filter((el) => vis(el) && !el.disabled && !el.closest("[aria-hidden=true]"));
  const dots = [...document.querySelectorAll(".tab-dot, .hub-dot, .nav-dot, [class*='-dot']:not(.wave-dots):not(.idle-status-dot)")].filter(vis).length;
  const stack = document.querySelector(".battle-alert-stack");
  const alerts = stack ? stack.querySelectorAll(":scope > *").length : 0;
  const wallet = [...document.querySelectorAll(".titans-wallet > *, .hub-wallet > *, .wallet > *")].filter(vis).length;
  const modals = [...document.querySelectorAll("[role=dialog], .modal, .sheet-backdrop, .idle-return, .attendance-modal")].filter(vis).length;
  return { clickable: clickable.length, dots, alertsCompeting: alerts, wallet, modals };
});

// ── A. 신규 유저 ──
await seed({ ...REAL });
let popups = 0; const seen = new Set();
for (let t = 0; t < 40; t += 1) {
  const names = await page.evaluate(() => [...document.querySelectorAll("[role=dialog], .modal, .idle-return, .attendance-modal, .area-unlock-banner, .toast")].filter((el) => el.getBoundingClientRect().height > 10).map((el) => (el.className || el.getAttribute("role") || "").toString().split(" ")[0] + ":" + (el.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 24)));
  for (const n of names) if (!seen.has(n)) { seen.add(n); popups += 1; }
  await sleep(500);
}
const navOpen = await page.evaluate(() => [...document.querySelectorAll(".titans-bottom-nav button")].map((b) => ({ t: b.textContent.trim(), locked: b.disabled || b.classList.contains("locked") || b.classList.contains("tab-locked") || /잠김/.test(b.textContent) })));
await page.evaluate(() => [...document.querySelectorAll(".titans-bottom-nav button")].find((b) => /모험/.test(b.textContent))?.click());
await sleep(600);
const hub = await page.evaluate(() => [...document.querySelectorAll(".nav-popup-grid button, .hub-card")].map((b) => ({ t: b.textContent.replace(/\s+/g, " ").trim().slice(0, 14), locked: b.disabled || b.classList.contains("locked") || b.classList.contains("tab-locked") || /잠김|STAGE|Stage/.test(b.textContent) })));
if (OUT) await page.screenshot({ path: `${OUT}/clutter-new-hub.png` });
const newUser = { popups20s: popups, popupList: [...seen], nav: navOpen.length, navLocked: navOpen.filter((n) => n.locked).length, hubCards: hub.length, hubLocked: hub.filter((h) => h.locked).length };

// ── B. 중반 저장 ──
const now = Date.now(), today = new Date().toLocaleDateString("sv-SE");
await seed({
  ...REAL,
  [`dodgebullets:progression:v1:${H}`]: JSON.stringify({ version: 5, unitRev: 1, onboardingStep: 4, level: 30, sharedCoins: 900, redGems: 300, enhancementMaterials: 40, titanBestStage: 24, dodgeBestStage: 12, pioneeredArea: 3, idleClaimedAt: now - 3 * 3600_000, updatedAt: now, partyIds: ["mia", "pyro"], partyCap: 4, sessionCount: 12, claimedRewards: ["dodge-tutorial"] }),
  [`dodgebullets:titans:${H}`]: JSON.stringify({ gold: 50000, stage: 24, bestStage: 24, heroes: { mia: 20, pyro: 15 }, lastActiveAt: now }),
  [`dodgebullets:attendance:v1:${H}`]: JSON.stringify({ lastClaimDate: today, totalDays: 5, consecutiveDays: 5 }),
});
await sleep(2500);
const firstModals = (await countScreen()).modals;
for (let k = 0; k < 5; k += 1) { await page.evaluate(() => { const c = document.querySelector(".idle-claim"); if (c) { c.click(); return; } const b = [...document.querySelectorAll("button")].find((x) => /^(닫기|확인|나중에|받기)$/.test(x.textContent.trim())); b?.click(); }); await sleep(400); }
await sleep(800);
const mid = await countScreen();
if (OUT) await page.screenshot({ path: `${OUT}/clutter-mid-hunt.png` });
const result = { newUser, midgame: { ...mid, modalsAtEntry: firstModals }, errors: errors.length };
console.log(JSON.stringify(result, null, process.argv.includes("--json") ? 0 : 2));
await browser.close();
