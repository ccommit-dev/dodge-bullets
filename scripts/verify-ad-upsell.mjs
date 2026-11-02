// 광고 제거 BM — 실제 화면 검사 (2026-11-02, 사용자: "실 유저가 광고 제거를 결제하기 위한 BM" · "보상형이 좋을 것 같아").
// 광고를 3번째 보면 제안 카드 · 패키지 맨 위 칸 · 게이트 전이어도 광고를 본 사람에겐 보임 · 산 뒤엔 칸이 사라지고 광고 없이 바로.
//   node scripts/verify-ad-upsell.mjs   (vite 5173 · DEV 스텁 dodgebullets:qa-ads=1)
import { launchBrowser } from "./launch-browser.mjs";
const BASE = "http://localhost:5173", H = "mock-local-dev", now = Date.now();
const browser = await launchBrowser({ args: ["--no-sandbox"] }); const page = await browser.newPage(); const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = []; page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
await page.goto(BASE, { waitUntil: "networkidle0" });
let fails = 0; const ok = (n, c, d = "") => { console.log(`${c ? "PASS" : "FAIL"} ${n}${d ? " — " + d : ""}`); if (!c) fails += 1; };
const prog = () => page.evaluate((H) => JSON.parse(localStorage.getItem(`dodgebullets:progression:v1:${H}`) ?? "{}"), H);
const today = new Date().toLocaleDateString("sv-SE");
const base = { version: 5, level: 8, redGems: 100, attendanceStreak: 1, idleClaimedAt: now, updatedAt: now, onboardingStep: 4, sessionCount: 9, partyIds: ["mia", "leon"], partyCap: 4, claimedRewards: ["dodge-tutorial", "welcome-gift", "surprise-gift"], pioneeredArea: 3, discoverySeeded: true, discovered: ["monster:slime", "ally:mia", "ally:leon"] };
const seed = async (extra) => {
  await Promise.all([page.waitForNavigation({ waitUntil: "networkidle0" }).catch(() => {}), page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); setTimeout(() => location.reload(), 0); }, {
    [`dodgebullets:progression:v1:${H}`]: JSON.stringify({ ...base, ...extra }),
    [`dodgebullets:titans:${H}`]: JSON.stringify({ gold: 1000, stage: 3, bestStage: 3, heroes: { mia: 5, leon: 5 }, lastActiveAt: now }),
    [`dodgebullets:attendance:v1:${H}`]: JSON.stringify({ lastClaimDate: today, totalDays: 3, consecutiveDays: 3 }),
    "dodge-bullets:soundEnabled": "0", "dodgebullets:test-phase": "0", "dodgebullets:qa-ads": "1",
  })]);
  await sleep(1200);
  await page.evaluate(() => { for (let k = 0; k < 5; k += 1) { const c = document.querySelector(".idle-claim"); if (c) { c.click(); continue; } const b = [...document.querySelectorAll("button")].filter((x) => !x.closest(".titans-bottom-nav")).find((x) => /^(닫기|확인|나중에)$/.test(x.textContent.trim())); if (b) b.click(); } });
  await sleep(400);
};
const openShop = async (cat) => {
  await page.evaluate(() => [...document.querySelectorAll(".titans-bottom-nav button")].find((b) => b.textContent.includes("상점"))?.click()); await sleep(500);
  await page.evaluate((cat) => [...document.querySelectorAll(".premium-category-tabs button")].find((b) => b.textContent.trim() === cat)?.click(), cat); await sleep(500);
};
// ── 1. 광고를 2번 본 상태 — 3번째 시청(방치 가속 4h)에서 제안이 열린다 ──
await seed({ adsWatchedTotal: 2 });
await openShop("재화");
ok("광고 미연동이 아니면 '광고 보고 가속' 칸이 보인다(스텁)", await page.evaluate(() => !!document.querySelector(".ad-product button")));
await page.evaluate(() => document.querySelector(".ad-product button")?.click());
let p = await prog(); for (let i = 0; i < 30 && (p.adsWatchedTotal ?? 0) < 3; i += 1) { await sleep(200); p = await prog(); }
ok("광고 시청 → 누적 3 · 제안 창이 열린다(광고 제거 · 24시간 · 보석 +40) · 첫 며칠 게이트와 무관", p.adsWatchedTotal === 3 && p.momentOffers?.["remove-ads"]?.kind === "ad-free" && p.momentOffers["remove-ads"].bonusGems === 40 && p.momentOffers["remove-ads"].until > Date.now() + 23 * 3600 * 1000, JSON.stringify({ n: p.adsWatchedTotal, o: p.momentOffers?.["remove-ads"] }));
await sleep(500);
const card = await page.evaluate(() => { const c = document.querySelector('.moment-offer.kind-ad-free'); return c ? { text: c.textContent, product: c.dataset.product } : null; });
ok("상점에 제안 카드: 광고 없이 바로 받기 · 가격 · 지금 사면 보석 +40", card?.product === "remove-ads" && /광고 없이 바로 받기/.test(card.text) && /3,900/.test(card.text) && /보석 \+40/.test(card.text), JSON.stringify(card)?.slice(0, 160));
// ── 2. 패키지 칸 — 게이트 전(출석 1 · Lv.8)에도 광고를 본 사람에겐 광고 제거가 맨 위 ──
await openShop("패키지");
const pkg = await page.evaluate(() => ({ heads: [...document.querySelectorAll(".paid-group-head")].map((h) => h.textContent), cards: [...document.querySelectorAll(".premium-product-card strong")].map((s) => s.textContent) }));
ok("패키지 맨 위 묶음 = 광고 제거 · 설명은 5곳(대장 · 성문 · 비트 포함)", /^광고 제거/.test(pkg.heads[0] ?? "") && /광고 제거/.test(pkg.cards[0] ?? ""), JSON.stringify(pkg.heads.slice(0, 2)));
const body = await page.evaluate(() => [...document.querySelectorAll(".premium-product-card")].find((c) => /광고 제거/.test(c.textContent))?.textContent ?? "");
ok("칸 문구가 실제 5곳과 맞다", /보상 5곳/.test(body) && /성문/.test(body) && /비트/.test(body) && !/3곳/.test(body), body.slice(0, 120));
// ── 3. 안 본 사람은 게이트 전엔 보이지 않는다 ──
await seed({ adsWatchedTotal: 0 });
await openShop("패키지");
ok("광고를 안 본 첫 며칠 유저에겐 광고 제거 칸이 없다", await page.evaluate(() => ![...document.querySelectorAll(".premium-product-card")].some((c) => /광고 제거/.test(c.textContent))));
// ── 4. 산 사람 — 칸이 사라지고, 광고 없이 바로 받으며, 누적 · 제안이 늘지 않는다 ──
await seed({ adFree: true, adsWatchedTotal: 2, attendanceStreak: 5, level: 25 });
await openShop("패키지");
ok("광고 제거를 산 뒤엔 패키지에 칸이 없다", await page.evaluate(() => ![...document.querySelectorAll(".premium-product-card")].some((c) => /광고 제거/.test(c.textContent))));
await openShop("재화");
await page.evaluate(() => document.querySelector(".ad-product button")?.click());
let q = await prog(); for (let i = 0; i < 20 && (q.adRewards?.booster4h ?? 0) < 1; i += 1) { await sleep(200); q = await prog(); }
ok("구매자는 광고 없이 바로 받고 누적 · 제안이 늘지 않는다", q.adRewards?.booster4h === 1 && q.adsWatchedTotal === 2 && !q.momentOffers?.["remove-ads"], JSON.stringify({ b: q.adRewards?.booster4h, n: q.adsWatchedTotal }));
ok("페이지 오류 없음", errors.length === 0, errors.join(" | "));
await browser.close();
console.log(fails ? `\n${fails} FAIL` : "\nALL PASS");
process.exit(fails ? 1 : 0);
