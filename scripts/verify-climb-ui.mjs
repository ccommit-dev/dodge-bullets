/**
 * 균열 계단 화면 (2026-11-11, titans/riftClimb.ts · ClimbPoster.tsx)   node scripts/verify-climb-ui.mjs [캡처 폴더]   (vite dev 서버 5173 필요)
 * 이벤트 센터 균열 탭의 계단 카드 → '도전' → 사냥터 전단 → 대결 → 1단 돌파(강화석 · 오늘 1/5 · 정산 +2%).
 * 지면 단 · 오늘 횟수 그대로. 오늘 5단을 다 오르면 '내일'.
 */
import { launchBrowser } from "./launch-browser.mjs";
const OUT = process.argv[2], BASE = "http://localhost:5173", H = "mock-local-dev";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = []; const ok = (n, c, d = "") => results.push([c ? "PASS" : "FAIL", n, d]);
const browser = await launchBrowser({ args: ["--no-sandbox", "--disable-gpu"] });
const page = await browser.newPage();
const errors = []; page.on("pageerror", (e) => errors.push(String(e.message).slice(0, 200)));
const today = new Date().toLocaleDateString("sv-SE");

async function boot({ w = 390, h = 844, stage = 40, heroLv = 80, climb } = {}) {
  const now = Date.now(), party = ["mia", "leon"];
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.goto(`${BASE}/favicon.png`, { waitUntil: "domcontentloaded" });
  await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); location.href = "/"; }, {
    [`dodgebullets:progression:v1:${H}`]: JSON.stringify({ version: 5, unitRev: 1, onboardingStep: 4, level: 40, redGems: 100, enhancementMaterials: 10, heroRank: 6, titanBestStage: stage, pioneeredArea: 5, idleClaimedAt: now, updatedAt: now, partyIds: party, partyCap: 4, sessionCount: 9, claimedRewards: ["dodge-tutorial", "welcome-gift", "surprise-gift"], discoverySeeded: true, routineClaimedDate: today, ...(climb ? { climb } : {}) }),
    [`dodgebullets:titans:${H}`]: JSON.stringify({ stage, bestStage: stage, gold: 1000, heroes: { mia: heroLv, leon: heroLv }, party, lastActiveAt: now, urgent: { day: today, issued: { login: now - 60000 }, done: ["login"], bossKills: 0 } }),
    [`dodgebullets:attendance:v1:${H}`]: JSON.stringify({ lastClaimDate: today, totalDays: 3, consecutiveDays: 3 }),
    "dodge-bullets:soundEnabled": "0", "dodgebullets:test-phase": "0",
  }).catch(() => {});
  await page.waitForNavigation({ waitUntil: "networkidle0" }).catch(() => {});
  await sleep(900);
  for (let i = 0; i < 3; i += 1) { await page.evaluate(() => { document.querySelector(".rebalance-modal")?.click(); document.querySelector(".idle-claim")?.click(); }); await sleep(200); }
}
const prog = () => page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? "{}"), `dodgebullets:progression:v1:${H}`);
const hunt = () => page.evaluate(() => window.__huntState?.());
const waitFor = async (fn, ms = 8000, step = 100) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = await fn(); if (v) return v; await sleep(step); } return null; };
const openRift = async () => {
  await page.evaluate(() => [...document.querySelectorAll(".titans-bottom-nav button")].find((x) => /모험/.test(x.textContent ?? ""))?.click());
  await sleep(500);
  await page.evaluate(() => document.querySelector('.hub-card[data-card="rift"]')?.click());
  await sleep(900);
};
const box = () => page.evaluate(() => {
  const b = document.querySelector('[data-climb="box"]'); if (!b) return null;
  const r = b.getBoundingClientRect(), btn = b.querySelector("button");
  const fonts = [...b.querySelectorAll("*")].filter((el) => el.children.length === 0 && el.textContent.trim()).map((el) => parseFloat(getComputedStyle(el).fontSize));
  return { title: b.querySelector("b")?.textContent, sub: b.querySelector("small")?.textContent, btn: btn?.textContent.trim(), disabled: !!btn?.disabled, inView: r.left >= 0 && r.right <= innerWidth, minFont: Math.min(...fonts), img: (() => { const i = b.querySelector("img"); return !!i && i.complete && i.naturalWidth > 0; })() };
});

// ── 1. 이벤트 센터 → 사냥터 전단 ──
await boot();
await openRift();
const b1 = await box();
ok("균열 탭에 계단 카드 — 제 1단 · 오늘 0/5 · 정산 +0%", b1?.title === "균열 계단 · 제 1단" && /오늘 0\/5단 · 정산 \+0% · 5층 대장/.test(b1.sub ?? "") && b1.btn === "도전" && !b1.disabled, JSON.stringify(b1));
ok("카드: 대장 그림 · 화면 안 · 글자 13px 이상", !!b1?.img && b1.inView && b1.minFont >= 13, JSON.stringify(b1));
const mainCta = await page.evaluate(() => { const c = [...document.querySelectorAll(".rift-event .cta")].find((x) => /균열 진입/.test(x.textContent ?? "")); const r = c?.getBoundingClientRect(); return r ? Math.round(r.bottom) : null; });
ok("주 단추(균열 진입)가 계단 카드보다 위", mainCta !== null && mainCta <= (await page.evaluate(() => Math.round(document.querySelector('[data-climb="box"]').getBoundingClientRect().top))));
if (OUT) { await page.evaluate(() => document.querySelector('[data-climb="box"]')?.scrollIntoView({ block: "center" })); await sleep(200); await page.screenshot({ path: `${OUT}/climb-box.png` }); }
await page.evaluate(() => document.querySelector('[data-climb="box"] button')?.click());
const poster = await waitFor(() => page.evaluate(() => { const p = document.querySelector('[data-climb="poster"]'); if (!p) return null; const r = p.getBoundingClientRect(); return { title: p.querySelector(".climb-title")?.textContent, name: p.querySelector(".urgent-name")?.textContent, rule: p.querySelector(".urgent-rule")?.textContent, stones: p.querySelector('[data-climb="stones"]')?.textContent, eventOpen: !!document.querySelector(".event-modal"), inView: r.top >= 0 && r.bottom <= innerHeight }; }), 4000);
ok("이벤트 센터가 닫히고 사냥터에 계단 전단", !!poster && !poster.eventOpen && poster.title === "제 1단" && /5층 대장/.test(poster.rule ?? "") && poster.stones === "2" && poster.inView, JSON.stringify(poster));
if (OUT) await page.screenshot({ path: `${OUT}/climb-poster.png` });

// ── 2. 대결 → 돌파 ──
const before = await prog();
await waitFor(() => page.evaluate(() => { const b = document.querySelector('[data-climb="go"]'); if (!b || b.disabled) return false; b.click(); return true; }), 6000, 40);
const fight = await waitFor(async () => { const h = await hunt(); return h?.special === "climb" && h.formation ? h : null; }, 6000, 40);
const mid = await page.evaluate(() => ({ h1: document.querySelector(".titans-stagebar.in-field h1")?.textContent.replace(/\s+/g, " ").trim(), timer: document.querySelector(".titans-boss-timer")?.textContent.trim(), art: document.querySelector(".titans-monster .monster-asset-current")?.dataset.src ?? "" }));
ok("계단 대결 — 판 제목 '균열 계단' · 제한 시간 '계단' · 1단 얼굴(이끼 골렘)", !!fight && mid.h1 === "균열 계단" && /^계단 \d+\.\ds$/.test(mid.timer ?? "") && /moss-golem-clean/.test(mid.art), JSON.stringify(mid));
if (OUT) await page.screenshot({ path: `${OUT}/climb-fight.png` });
const won = await waitFor(async () => { const h = await hunt(); return h && h.special === null && h.phase === "combat" ? h : null; }, 30000, 80);
ok("잡고 평소 사냥으로", !!won);
await sleep(700);
const after = await prog();
ok("2단 · 오늘 1 · 강화석 +2", after.climb?.floor === 2 && after.climb.clears === 1 && after.climb.day === today && after.enhancementMaterials - before.enhancementMaterials === 2, JSON.stringify(after.climb));
if (OUT) await page.screenshot({ path: `${OUT}/climb-won.png` });
await openRift();
const b2 = await box();
ok("다시 열면 제 2단 · 오늘 1/5 · 정산 +2%", b2?.title === "균열 계단 · 제 2단" && /오늘 1\/5단 · 정산 \+2%/.test(b2.sub ?? ""), JSON.stringify(b2));

// ── 3. 오늘 다 올랐으면 ──
await boot({ climb: { floor: 9, day: today, clears: 5 } });
await openRift();
const b3 = await box();
ok("오늘 5/5 — '내일' · 비활성", b3?.btn === "내일" && b3.disabled && /오늘 5\/5단/.test(b3.sub ?? ""), JSON.stringify(b3));

// ── 4. 지면 그대로 ──
await boot({ heroLv: 1, climb: { floor: 30, day: "", clears: 0 } });
await page.evaluate(() => window.dispatchEvent(new Event("dodgebullets:climb-open")));
await sleep(500);
const before4 = await prog();
await waitFor(() => page.evaluate(() => { const b = document.querySelector('[data-climb="go"]'); if (!b || b.disabled) return false; b.click(); return true; }), 6000, 40);
await waitFor(async () => (await hunt())?.special === "climb", 6000, 40);
const lost = await waitFor(async () => { const h = await hunt(); return h && h.special === null ? await page.evaluate(() => document.querySelector(".titans-toast")?.textContent ?? "") : null; }, 45000, 100);
ok("시간 초과 → '계단 대장을 넘지 못했다'", /계단 대장을 넘지 못했다/.test(lost ?? ""), String(lost));
await sleep(300);
const after4 = await prog();
ok("단 · 오늘 횟수 · 강화석 그대로", after4.climb?.floor === 30 && (after4.climb.clears ?? 0) === 0 && after4.enhancementMaterials === before4.enhancementMaterials, JSON.stringify(after4.climb));

// ── 5. 작은 화면 ──
await boot({ w: 360, h: 640 });
await openRift();
const b5 = await box();
ok("360×640: 카드가 화면 안 · 단추 한 줄", !!b5?.inView && b5.btn === "도전", JSON.stringify(b5));
if (OUT) { await page.evaluate(() => document.querySelector('[data-climb="box"]')?.scrollIntoView({ block: "center" })); await sleep(200); await page.screenshot({ path: `${OUT}/climb-box-360.png` }); }

ok("페이지 오류 없음", errors.length === 0, errors.join(" | "));
await browser.close();
let fails = 0;
for (const [s, n, d] of results) { console.log(`${s} ${n}${d && s === "FAIL" ? " — " + d : ""}`); if (s === "FAIL") fails += 1; }
console.log(fails ? `\n${fails} FAIL` : "\nALL PASS");
process.exit(fails ? 1 : 0);
