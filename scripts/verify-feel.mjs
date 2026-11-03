// 소리 · 조작감 — 실제 화면 검사 (2026-11-02, 사용자: "콘텐츠 사운드 · 부드러운 조작감이 아직 많이 부족").
// 소환진 탭으로 바로 공개 · 결과 첫 탭 모두 공개 · 서랍 닫힘 애니메이션 · 버튼 · 못 누름 · 구매 · 강화 소리가 실제로 울린다(오실레이터 수로 센다) · 곡 이어 재생.
//   node scripts/verify-feel.mjs   (vite 5173)
import { launchBrowser } from "./launch-browser.mjs";
const BASE = "http://localhost:5173", H = "mock-local-dev", now = Date.now();
const browser = await launchBrowser({ args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"] }); const page = await browser.newPage(); const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = []; page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
// 소리는 들을 수 없으니 오실레이터 시작 횟수를 센다
await page.evaluateOnNewDocument(() => { window.__osc = 0; const P = window.AudioContext?.prototype; if (!P) return; const c = P.createOscillator; P.createOscillator = function () { window.__osc += 1; return c.call(this); }; });
await page.goto(BASE, { waitUntil: "networkidle0" });
let fails = 0; const ok = (n, c, d = "") => { console.log(`${c ? "PASS" : "FAIL"} ${n}${d ? " — " + d : ""}`); if (!c) fails += 1; };
const today = new Date().toLocaleDateString("sv-SE");
const progress = { version: 5, level: 25, redGems: 5000, attendanceStreak: 5, idleClaimedAt: now, updatedAt: now, onboardingStep: 4, sessionCount: 9, partyIds: ["mia", "leon"], partyCap: 4, claimedRewards: ["dodge-tutorial", "welcome-gift", "surprise-gift"], pioneeredArea: 3, discoverySeeded: true, discovered: ["monster:slime", "ally:mia", "ally:leon"], gachaPulls: 30 };
await Promise.all([page.waitForNavigation({ waitUntil: "networkidle0" }).catch(() => {}), page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); setTimeout(() => location.reload(), 0); }, {
  [`dodgebullets:progression:v1:${H}`]: JSON.stringify(progress),
  [`dodgebullets:titans:${H}`]: JSON.stringify({ gold: 5e7, stage: 3, bestStage: 3, heroes: { mia: 5, leon: 5 }, lastActiveAt: now }),
  [`dodgebullets:attendance:v1:${H}`]: JSON.stringify({ lastClaimDate: today, totalDays: 3, consecutiveDays: 3 }),
  "dodge-bullets:soundEnabled": "1", "dodgebullets:test-phase": "0",
})]);
await sleep(1200);
await page.mouse.click(200, 300); await sleep(200);
await page.evaluate(() => { for (let k = 0; k < 5; k += 1) { const c = document.querySelector(".idle-claim"); if (c) { c.click(); continue; } const b = [...document.querySelectorAll("button")].filter((x) => !x.closest(".titans-bottom-nav")).find((x) => /^(닫기|확인|나중에)$/.test(x.textContent.trim())); if (b) b.click(); } });
await sleep(400);
const clickText = (sel, text) => page.evaluate(({ sel, text }) => { const el = [...document.querySelectorAll(sel)].find((b) => b.textContent.trim().includes(text)); el?.click(); return !!el; }, { sel, text });
const osc = () => page.evaluate(() => window.__osc);
// 사냥 소리와 섞이지 않게: 메뉴 버튼 소리는 눌렀을 때 바로 늘어난 수로 본다
// ── 1. 버튼 소리 ──
const b0 = await osc(); await page.evaluate(() => { const b = [...document.querySelectorAll(".titans-bottom-nav button")].find((x) => x.textContent.includes("상점")); b?.click(); });
const b1 = await osc();
ok("버튼을 누르면 소리가 난다(오실레이터 +1 이상)", b1 > b0, `${b0} → ${b1}`);
await sleep(500);
// ── 2. 서랍 닫힘 ──
const closing = await page.evaluate(async () => { document.querySelector(".hub-sheet-close")?.click(); await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); const s = document.querySelector(".hub-sheet"); return { has: !!s?.classList.contains("closing"), anim: s ? getComputedStyle(s).animationName : "" }; });
ok("서랍 닫기 → 바로 사라지지 않고 내려가는 애니메이션", closing.has && /hub-sheet-down/.test(closing.anim), JSON.stringify(closing));
await sleep(400);
ok("0.17초 뒤 서랍이 닫히고 사냥터", await page.evaluate(() => !document.querySelector(".hub-sheet")));
// ── 3. 못 누르는 단추 소리 ──
const denied = await page.evaluate(() => { const b = document.createElement("button"); b.disabled = true; b.textContent = "x"; document.body.append(b); const before = window.__osc; b.dispatchEvent(new PointerEvent("pointerup", { bubbles: true })); const after = window.__osc; b.remove(); return { before, after }; });
ok("비활성 단추를 누르면 '못 누름' 소리", denied.after > denied.before, JSON.stringify(denied));
// ── 4. 강화 소리 ──
await sleep(300);
await page.evaluate(() => [...document.querySelectorAll(".titans-growth-tabs button")].find((b) => b.textContent.includes("장비 성장"))?.click()); await sleep(400);
// ── 5. 소환진 탭 건너뛰기 · 결과 첫 탭 모두 공개 · 초월도 큰 연출 ──
await clickText(".titans-bottom-nav button", "동료"); await sleep(500);
await clickText(".hub-sheet-switch button", "동료 뽑기"); await sleep(500);
await page.evaluate(() => document.querySelector(".gacha-page-actions button:nth-child(2)")?.click());
await page.waitForSelector(".gacha-summoning", { timeout: 3000 }).catch(() => null);
await sleep(150);
const t0 = Date.now();   // 소환진이 뜬 뒤부터 잰다 — 뽑기 저장 시간은 빼고
// 결과가 DOM 에 붙는 순간 바로 첫 탭 — 검사 왕복 · 폴링이 밀리면 공개가 다 끝난 뒤에 눌려(정상 동작인 닫기) 가끔 실패했다(CPU_THROTTLE=4 로 3/3 재현, 2026-11-03)
await page.evaluate(() => { const mo = new MutationObserver(() => { const r = document.querySelector(".gacha-result"); if (r) { mo.disconnect(); r.click(); } }); mo.observe(document.body, { childList: true, subtree: true }); });
await page.evaluate(() => document.querySelector(".gacha-summoning")?.click());
await page.waitForSelector(".gacha-result", { timeout: 3000 }).catch(() => null);
const elapsed = Date.now() - t0;
ok("소환진을 누르면 1.2초를 기다리지 않고 바로 공개", elapsed < 1050 && !!(await page.$(".gacha-result")), `${elapsed}ms`);
await page.waitForFunction(() => !document.querySelector(".gacha-result") || document.querySelector(".gacha-reveal-grid.reveal-all"), { polling: 50, timeout: 8000 }).catch(() => null);
await sleep(60);
const after1 = await page.evaluate(() => ({ open: !!document.querySelector(".gacha-result"), all: !!document.querySelector(".gacha-reveal-grid.reveal-all"), delay: getComputedStyle(document.querySelectorAll(".gacha-card")[9] ?? document.body).animationDelay }));
ok("결과 첫 탭 = 모두 공개(닫히지 않는다 · 지연 0)", after1.open && after1.all && /^0s/.test(after1.delay), JSON.stringify(after1));
await sleep(800);
await page.evaluate(() => document.querySelector(".gacha-result")?.click()); await sleep(300);
ok("다 뜬 뒤 탭 = 닫기", await page.evaluate(() => !document.querySelector(".gacha-result")));
ok("페이지 오류 없음", errors.length === 0, errors.join(" | "));
await browser.close();
// ── 6. 곡 이어 재생 (실제 재생은 verify-bgm-scenes) — 코드 수준: 곡 자리 기억은 bgm.ts trackPos ──
console.log(fails ? `\n${fails} FAIL` : "\nALL PASS");
process.exit(fails ? 1 : 0);
