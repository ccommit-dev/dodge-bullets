/**
 * 사냥터 승급전 화면 (2026-11-11, titans/promotion.ts · PromotionPoster.tsx)   node scripts/verify-promotion-ui.mjs [캡처 폴더]   (vite dev 서버 5173 필요)
 * 최고 8층 → 알림 '승급전' → 전단 → 도전 → 수호자(다른 지역 대장 그림 · 이름) → 이기면 1등급 · 보석 +30 · 이름표 '청동 파수꾼'.
 * 약하면 시간 초과 — 잃는 것 없이 그대로 · 다시 도전 가능. 이미 같은 등급이면 다시 안 준다.
 */
import { launchBrowser } from "./launch-browser.mjs";
const OUT = process.argv[2], BASE = "http://localhost:5173", H = "mock-local-dev";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = []; const ok = (n, c, d = "") => results.push([c ? "PASS" : "FAIL", n, d]);
const browser = await launchBrowser({ args: ["--no-sandbox", "--disable-gpu"] });
const page = await browser.newPage();
const errors = []; page.on("pageerror", (e) => errors.push(String(e.message).slice(0, 200)));
const today = new Date().toLocaleDateString("sv-SE");

async function boot({ w = 390, h = 844, stage = 8, heroLv = 60, rank = 0 } = {}) {
  const now = Date.now(), party = ["mia", "leon"];
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.goto(`${BASE}/favicon.png`, { waitUntil: "domcontentloaded" });
  await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); location.href = "/"; }, {
    [`dodgebullets:progression:v1:${H}`]: JSON.stringify({ version: 5, unitRev: 1, onboardingStep: 4, level: 40, redGems: 100, heroRank: rank, titanBestStage: stage, pioneeredArea: 5, idleClaimedAt: now, updatedAt: now, partyIds: party, partyCap: 4, sessionCount: 9, claimedRewards: ["dodge-tutorial", "welcome-gift", "surprise-gift"], discoverySeeded: true, routineClaimedDate: today }),
    // 긴급 의뢰는 오늘 다 끝난 것으로 — 딱지가 같은 자리에 겹치지 않게
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
const look = () => page.evaluate(() => {
  const q = (s) => document.querySelector(s);
  return {
    alert: q(".promo-alert")?.textContent ?? null, firstAlert: q(".battle-alert-stack > .battle-alert")?.className ?? null,
    h1: q(".titans-stagebar.in-field h1")?.textContent.replace(/\s+/g, " ").trim() ?? "", timer: q(".titans-boss-timer")?.textContent.trim() ?? null,
    art: q(".titans-monster .monster-asset-current")?.dataset.src ?? "", name: q(".titans-monster strong, .titans-monster .monster-name")?.textContent ?? null,
    marker: q(".titans-hero .hero-marker b")?.textContent ?? null, fieldClass: q(".titans-field")?.className ?? "", toast: q(".titans-toast")?.textContent ?? null,
  };
});
const clickGo = () => waitFor(() => page.evaluate(() => { const b = document.querySelector('[data-promo="go"]'); if (!b || b.disabled) return false; b.click(); return true; }), 6000, 40);

// ── 1. 문턱 → 알림 → 전단 ──
await boot({ stage: 8 });
const l1 = await waitFor(async () => { const v = await look(); return v.alert ? v : null; }, 5000);
ok("최고 8층 · 0등급이면 승급전 알림(맨 위)", !!l1 && /승급전/.test(l1.alert) && /청동 파수꾼/.test(l1.alert) && /promo-alert/.test(l1.firstAlert ?? ""), JSON.stringify(l1));
await page.evaluate(() => document.querySelector(".promo-alert")?.click()); await sleep(300);
const poster = await page.evaluate(() => {
  const p = document.querySelector('[data-promo="poster"]'); if (!p) return null;
  const b = p.getBoundingClientRect(), img = p.querySelector(".urgent-portrait img");
  const fonts = [...p.querySelectorAll("*")].filter((el) => el.children.length === 0 && el.textContent.trim()).map((el) => parseFloat(getComputedStyle(el).fontSize));
  return { title: p.querySelector(".promo-title")?.textContent, name: p.querySelector(".urgent-name")?.textContent, atk: p.querySelector('[data-promo="atk"]')?.textContent, gems: p.querySelector('[data-promo="gems"]')?.textContent,
    rows: [...p.querySelectorAll(".urgent-today li")].map((li) => `${li.className}:${li.textContent}`), inView: b.top >= 0 && b.bottom <= innerHeight && b.left >= 0 && b.right <= innerWidth, minFont: Math.min(...fonts), imgOk: !!img && img.complete && img.naturalWidth > 0, img: img?.getAttribute("src") };
});
ok("전단: 다음 등급 · 수호자 · 보상", poster?.title === "청동 파수꾼" && poster.name === "청동 수문장" && /공격 \+6%/.test(poster.atk ?? "") && poster.gems === "30", JSON.stringify(poster));
ok("전단: 수호자 초상(가시 멧돼지 왕 그림)", !!poster?.imgOk && /thorn-boar-king/.test(poster?.img ?? ""), poster?.img);
ok("전단: 등급 줄 — 1등급 도전 가능 · 2등급 16층", poster?.rows?.length === 2 && /is-open/.test(poster.rows[0]) && /16층/.test(poster.rows[1]), JSON.stringify(poster?.rows));
ok("전단이 화면 안 · 글자 11px 이상", !!poster?.inView && poster.minFont >= 11, JSON.stringify(poster));
if (OUT) await page.screenshot({ path: `${OUT}/promo-poster.png` });

// ── 2. 도전 → 이긴다 ──
const before = await prog();
ok("도전을 누른다", !!(await clickGo()));
const fight = await waitFor(async () => { const h = await hunt(); return h?.special === "promotion" && h.formation ? h : null; }, 6000, 40);
await sleep(200);
const mid = await look();
ok("수호자와 싸운다 — 판 제목 '승급전' · 제한 시간 '수호자'", !!fight && mid.h1 === "승급전" && /^수호자 \d+\.\ds$/.test(mid.timer ?? "") && /is-promotion/.test(mid.fieldClass), `${mid.h1} · ${mid.timer}`);
ok("전장 그림은 수호자(초원 대장 그림, 지금은 숲)", /thorn-boar-king/.test(mid.art), mid.art);
ok("싸우는 동안 승급 알림은 없다", !mid.alert);
if (OUT) await page.screenshot({ path: `${OUT}/promo-fight.png` });
const won = await waitFor(async () => { const h = await hunt(); return h && h.special === null && h.phase === "combat" ? h : null; }, 30000, 80);
ok("잡고 평소 사냥으로 돌아온다", !!won);
await sleep(700);
const after = await prog(), l2 = await look();
ok("1등급 · 보석 +30", after.heroRank === 1 && after.redGems - before.redGems === 30, `${after.heroRank} · ${after.redGems - before.redGems}`);
ok("이름표가 '★ 청동 파수꾼'", (l2.marker ?? "").includes("청동 파수꾼"), String(l2.marker));
ok("다음 등급(16층)은 아직 — 알림이 사라진다", !l2.alert);
ok("층은 그대로", /^STAGE 8/.test(l2.h1), l2.h1);
if (OUT) await page.screenshot({ path: `${OUT}/promo-won.png` });

// ── 3. 약하면 진다 — 잃는 것 없음 ──
await boot({ stage: 40, heroLv: 1, rank: 3 });
await waitFor(async () => (await look()).alert, 5000);
await page.evaluate(() => document.querySelector(".promo-alert")?.click()); await sleep(300);
const before3 = await prog();
await clickGo();
await waitFor(async () => (await hunt())?.special === "promotion", 6000, 40);
const lost = await waitFor(async () => { const h = await hunt(); return h && h.special === null ? await look() : null; }, 45000, 100);
ok("시간 초과 → 평소 사냥으로", !!lost);
ok("넘지 못했다고 알린다", /수호자를 넘지 못했다/.test(lost?.toast ?? ""), String(lost?.toast));
await sleep(300);
const after3 = await prog(), l3 = await look();
ok("등급 · 보석 그대로 · 알림이 다시 뜬다", after3.heroRank === 3 && after3.redGems === before3.redGems && /미스릴 집행관/.test(l3.alert ?? ""), `${after3.heroRank} · ${l3.alert}`);

// ── 4. 나중에 → 이번 접속 동안 숨김 ──
await page.evaluate(() => document.querySelector(".promo-alert")?.click()); await sleep(300);
await page.evaluate(() => document.querySelector(".promo-poster .urgent-later")?.click()); await sleep(300);
ok("'나중에' 면 알림을 숨긴다", !(await look()).alert);

// ── 5. 작은 화면 ──
await boot({ w: 375, h: 553, stage: 8 });
await waitFor(async () => (await look()).alert, 5000);
await page.evaluate(() => document.querySelector(".promo-alert")?.click()); await sleep(300);
const fit = await page.evaluate(() => { const p = document.querySelector('[data-promo="poster"]'); if (!p) return null; const b = p.getBoundingClientRect(), go = p.querySelector(".urgent-go").getBoundingClientRect(); return { inView: b.top >= 0 && b.bottom <= innerHeight, goIn: go.bottom <= innerHeight, scroll: p.scrollHeight > p.clientHeight + 1 }; });
ok("375×553: 전단 · 도전 단추가 화면 안(스크롤 없이)", !!fit?.inView && !!fit?.goIn && !fit?.scroll, JSON.stringify(fit));
if (OUT) await page.screenshot({ path: `${OUT}/promo-poster-se.png` });

ok("페이지 오류 없음", errors.length === 0, errors.join(" | "));
await browser.close();
let fails = 0;
for (const [s, n, d] of results) { console.log(`${s} ${n}${d && s === "FAIL" ? " — " + d : ""}`); if (s === "FAIL") fails += 1; }
console.log(fails ? `\n${fails} FAIL` : "\nALL PASS");
process.exit(fails ? 1 : 0);
