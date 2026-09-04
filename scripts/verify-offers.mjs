/**
 * 결제 타이밍(순간 제안) e2e — Stage 6 · 미아 20 시나리오(보스 실패 보장)로
 *   실패 1회 → 무료 +10초 카드 · 실패 2회(벽 최초) → 벽 돌파 세트 카드 → QA 구매 → 보석·보너스·상점 배지
 *   node scripts/verify-offers.mjs   (dev 서버 5173, DEV 빌드: QA 결제 스텁 dodgebullets:qa-pay)
 */
import puppeteer from "puppeteer";
const BASE = "http://localhost:5173", H = "mock-local-dev";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const ok = (name, cond, detail = "") => results.push([cond ? "PASS" : "FAIL", name, detail]);
const now = Date.now();
const browser = await puppeteer.launch({ headless: "shell", args: ["--no-sandbox", "--disable-gpu"] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844 });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e.message).slice(0, 120)));
const prog = () => page.evaluate((h) => JSON.parse(localStorage.getItem(`dodgebullets:progression:v1:${h}`)), H);
const clickText = (sel, text) => page.evaluate(({ sel, text }) => { const el = [...document.querySelectorAll(sel)].find((b) => b.textContent.trim().includes(text)); el?.click(); return !!el; }, { sel, text });
const closeModal = async () => { await page.evaluate(() => { for (let k = 0; k < 3; k += 1) { const c = document.querySelector(".idle-claim"); if (c) { c.click(); continue; } const b = [...document.querySelectorAll("button")].filter((x) => !x.closest(".battle-alert-stack, .titans-bottom-nav, .hub-sheet, .nav-popup-grid, .moment-offer")).find((x) => /출석|수령|확인|닫기/.test(x.textContent)); if (!b) break; b.click(); } }); await sleep(800); };

await page.goto(BASE, { waitUntil: "networkidle0" });
await page.evaluate(({ h, now }) => {
  localStorage.clear();
  localStorage.setItem("dodgebullets:qa-pay", "1");
  localStorage.setItem("dodge-bullets:soundEnabled", "0");
  localStorage.setItem(`dodgebullets:progression:v1:${h}`, JSON.stringify({ version: 5, onboardingStep: 4, level: 8, exp: 3000, attendanceStreak: 3, redGems: 100, sharedCoins: 50000, enhancementMaterials: 20, titanBestStage: 6, pioneeredArea: 2, dodgeBestStage: 2, idleClaimedAt: now, updatedAt: now, partyIds: ["mia"], partyCap: 4, sessionCount: 5 }));
  localStorage.setItem(`dodgebullets:titans:${h}`, JSON.stringify({ stage: 6, bestStage: 6, gold: 300, heroes: { mia: 20 }, skillInventory: { learned: ["strike"], levels: { strike: 1 }, equipped: { starter: "strike" }, skillCores: 0 }, lastActiveAt: now }));
}, { h: H, now });
await page.goto(BASE, { waitUntil: "networkidle0" });
await sleep(2000);
await closeModal();
await page.evaluate(() => { [...document.querySelectorAll(".qol-btn")].find((b) => b.textContent.trim() === "×2")?.click(); });

/** 보스 도전 버튼이 뜨면 누르고, 실패(제한시간 초과)까지 기다린다 */
async function failBossOnce(maxSec = 120) {
  let pressed = false;
  for (let i = 0; i < maxSec && !pressed; i += 1) {
    await sleep(1000);
    pressed = await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => x.textContent.includes("보스 도전")); b?.click(); return !!b; });
  }
  if (!pressed) return false;
  // 실패 신호: 제한시간 초과 직후 bossReady 가 다시 켜져 "보스 도전" 버튼이 즉시 재등장한다 (벽 배너는 1회차부터 남아 있어 신호가 못 된다)
  await sleep(1500);
  for (let i = 0; i < 70; i += 1) {
    await sleep(1000);
    const failed = await page.evaluate(() => !!document.querySelector(".moment-offer") || [...document.querySelectorAll("button")].some((x) => x.textContent.includes("보스 도전")));
    if (failed) return true;
  }
  return false;
}

await failBossOnce();
let r = await page.evaluate(() => { const c = document.querySelector(".moment-offer.free"); return c ? { head: c.querySelector(".moment-head")?.textContent, btn: c.querySelector(".moment-buy")?.textContent } : null; });
ok("실패 1회 → 무료 +10초 카드", r && /무료 1회/.test(r.head ?? "") && /\+10초/.test(r.btn ?? ""), JSON.stringify(r));
await page.evaluate(() => document.querySelector(".moment-offer.free .moment-buy")?.click());
await sleep(500);
ok("무료 카드 수락 → 카드 닫힘 · 유료 제안은 아직 없음", await page.evaluate(() => !document.querySelector(".moment-offer")));
ok("보스 실패 → 30분 뒤 재도전 알림 예약 호출(id 2)", await page.evaluate(() => (window.__notifyLog || []).some((n) => n.id === 2 && n.at - Date.now() > 25 * 60000)));

await failBossOnce();
await sleep(1200);
r = await page.evaluate(() => { const c = document.querySelector(".moment-offer[data-product]"); return c ? { product: c.dataset.product, head: c.querySelector(".moment-head")?.textContent, timer: c.querySelector(".moment-timer")?.textContent, sub: c.querySelector(".moment-sub")?.textContent } : null; });
ok("실패 2회(벽 최초 도달) → 벽 돌파 세트 제안 카드 · 타이머 · 보너스 +30", r && r.product === "pack-wall" && /\d+:\d\d/.test(r.timer ?? "") && /\+30/.test(r.sub ?? ""), JSON.stringify(r));
let p = await prog();
ok("진행도에 제안 창 기록(momentOffers.pack-wall, 15분)", p.momentOffers?.["pack-wall"]?.kind === "wall" && p.momentOffers["pack-wall"].until - Date.now() > 13 * 60000 && p.wallAreas.includes("forest"), JSON.stringify(p.momentOffers));
const gemsBefore = p.redGems;
await clickText(".titans-bottom-nav button", "상점");
await sleep(600);
await clickText(".premium-category-tabs button", "패키지");
await sleep(500);
r = await page.evaluate(() => [...document.querySelectorAll(".premium-product-card")].filter((c) => /벽 돌파/.test(c.textContent)).map((c) => c.querySelector(".moment-bonus-badge")?.textContent ?? null));
ok("상점 패키지 탭의 벽 돌파 세트에 '지금 +30 보석' 배지", r.length === 1 && /\+30/.test(r[0] ?? ""), JSON.stringify(r));
await clickText(".titans-bottom-nav button", "사냥터");
await sleep(600);
await page.evaluate(() => document.querySelector(".moment-offer[data-product] .moment-buy")?.click());
await sleep(1200);
p = await prog();
ok("카드에서 구매(QA) → 보석 +100 +30 보너스 · 제안 제거 · 구매 기록", p.redGems === gemsBefore + 130 && !p.momentOffers?.["pack-wall"] && p.claimedRewards.some((k) => k.startsWith("purchase:pack-wall:")), `gems ${gemsBefore}→${p.redGems}`);
ok("구매 후 카드 사라짐", await page.evaluate(() => !document.querySelector(".moment-offer")));

// ── retention-3: 9시간 복귀 → 정산 모달에 후원 계약 미리보기 → QA 구매 → patronUntil 30일 ──
await page.evaluate(({ h, now }) => {
  const pk = `dodgebullets:progression:v1:${h}`; const q = JSON.parse(localStorage.getItem(pk)); q.idleClaimedAt = now - 9 * 3600000; q.patronUntil = 0; localStorage.setItem(pk, JSON.stringify(q));
  const tk = `dodgebullets:titans:${h}`; const t = JSON.parse(localStorage.getItem(tk)); t.lastActiveAt = now - 9 * 3600000; localStorage.setItem(tk, JSON.stringify(t));
}, { h: H, now: Date.now() });
await page.goto(BASE, { waitUntil: "networkidle0" });
await sleep(2500);
r = await page.evaluate(() => { const m = document.querySelector(".idle-modal"); const pv = document.querySelector(".idle-patron-preview"); return { modal: !!m, preview: pv ? { gold: Number(pv.dataset.extraGold), text: pv.querySelector("b")?.textContent, btn: pv.querySelector(".patron-buy")?.textContent } : null }; });
ok("9h 복귀 정산 모달에 후원 계약 미리보기(+골드·₩5,500)", r.modal && r.preview && r.preview.gold > 0 && /₩5,500/.test(r.preview.btn ?? ""), JSON.stringify(r));
await page.evaluate(() => document.querySelector(".idle-patron-preview .patron-buy")?.click());
await sleep(1200);
p = await prog();
ok("미리보기에서 구매(QA) → patronUntil ≈ +30일 · 구매 기록", p.patronUntil - Date.now() > 29 * 86400000 && p.claimedRewards.some((k) => k.startsWith("purchase:patron-30d:")), `patron ${Math.round((p.patronUntil - Date.now()) / 86400000)}d`);
ok("구매 후 미리보기 사라짐(후원 중)", await page.evaluate(() => !document.querySelector(".idle-patron-preview")));

// ── retention-4: 벽 2지역 → 마이페이지 환생(2회 클릭) → 사냥터 복귀 시 환생 세트 카드 ──
await page.evaluate(({ h }) => { const pk = `dodgebullets:progression:v1:${h}`; const q = JSON.parse(localStorage.getItem(pk)); q.wallAreas = ["meadow", "forest"]; q.titanBestStage = 12; q.idleClaimedAt = Date.now(); localStorage.setItem(pk, JSON.stringify(q)); const tk = `dodgebullets:titans:${h}`; const t = JSON.parse(localStorage.getItem(tk)); t.lastActiveAt = Date.now(); localStorage.setItem(tk, JSON.stringify(t)); }, { h: H });
await page.goto(BASE, { waitUntil: "networkidle0" });
await sleep(2000);
await closeModal();
await clickText("button", "설정"); await sleep(400);
await clickText("[role=menuitem]", "마이페이지"); await sleep(1200);
const rebirthBtn = await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /환생/.test(x.textContent) && !/설명|안내/.test(x.textContent)); b?.click(); return b?.textContent?.trim().slice(0, 20) ?? null; });
await sleep(700);
await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /환생/.test(x.textContent) && !/설명|안내/.test(x.textContent)); b?.click(); });
await sleep(1500);
p = await prog();
ok("환생 실행(벽 2지역) → rebirthCount 1 · 환생 세트 제안 창 30분", p.rebirthCount === 1 && p.momentOffers?.["pack-rebirth"]?.kind === "rebirth", `btn=${rebirthBtn} rebirth=${p.rebirthCount} offers=${Object.keys(p.momentOffers ?? {}).join()}`);
await page.evaluate(() => document.querySelector(".character-back")?.click());
await sleep(1800);
await closeModal();
r = await page.evaluate(() => { const c = document.querySelector(".moment-offer[data-product]"); return c ? { product: c.dataset.product, head: c.querySelector(".moment-head")?.textContent } : null; });
ok("사냥터 복귀 시 환생 축하 카드(pack-rebirth ₩12,000)", r?.product === "pack-rebirth" && /환생 축하/.test(r.head ?? ""), JSON.stringify(r));

// ── retention-5: 픽업 회전 D-2 → 뽑기 페이지에 보석 1,200 제안(첫 구매 2배) → QA 구매 → 2400 + 150 ──
// 회전 주기 14일·기준 2026-01-05 UTC — 다음 회전 종료 2일 전(+1h)으로 Date.now 를 고정한다 (new Date() 는 실시간이라 출석 문자열엔 영향 없음)
{
  const EPOCH = Date.UTC(2026, 0, 5), PERIOD = 14 * 86400000;
  const k = Math.floor((Date.now() - EPOCH) / PERIOD) + 1;
  const fake = EPOCH + k * PERIOD - 2 * 86400000 + 3600000;
  await page.evaluateOnNewDocument((f) => { const real = Date.now; Date.now = () => f + (real() - f); (window).__fakeStart = f; Date.now = () => f; }, fake);
  await page.evaluate(({ h }) => { const pk = `dodgebullets:progression:v1:${h}`; const q = JSON.parse(localStorage.getItem(pk)); q.pioneeredArea = 5; q.redGems = 0; q.claimedRewards = (q.claimedRewards || []).filter((k) => !k.startsWith("first-double:")); q.momentOffers = {}; localStorage.setItem(pk, JSON.stringify(q)); const tk = `dodgebullets:titans:${h}`; const t = JSON.parse(localStorage.getItem(tk)); t.stage = 5; localStorage.setItem(tk, JSON.stringify(t)); }, { h: H });
  await page.goto(BASE, { waitUntil: "networkidle0" });
  await sleep(2000);
  await closeModal();
  await clickText(".titans-bottom-nav button", "동료"); await sleep(500);
  await clickText(".hub-sheet-switch button", "동료 뽑기"); await sleep(1500);
  r = await page.evaluate(() => { const days = [...document.querySelectorAll("small")].map((x) => x.textContent).find((t) => /회전까지/.test(t ?? "")) ?? ""; const c = document.querySelector(".moment-offer[data-product]"); return { days, card: c ? { product: c.dataset.product, head: c.querySelector(".moment-head")?.textContent, sub: c.querySelector(".moment-sub")?.textContent } : null }; });
  ok("뽑기 페이지 → 픽업 교체 D-1 알림 예약 호출(id 3)", await page.evaluate(() => (window.__notifyLog || []).some((n) => n.id === 3)));
  ok("픽업 회전 D-2 · 뽑기 페이지에 보석 1,200 제안 카드(첫 구매 2배 · +150)", /회전까지 [12]일/.test(r.days ?? "") && r.card?.product === "gems-1200" && /첫 구매 2배/.test(r.card.head ?? "") && /\+150/.test(r.card.sub ?? ""), JSON.stringify(r));
  await page.evaluate(() => document.querySelector(".moment-offer[data-product] .moment-buy")?.click());
  await sleep(1200);
  p = await prog();
  ok("픽업 제안 구매(QA, 첫 구매) → 보석 2,400 + 150 = 2,550 · 제안 제거", p.redGems === 2550 && !p.momentOffers?.["gems-1200"], `gems=${p.redGems}`);
  await page.evaluateOnNewDocument(() => {});
}
ok("런타임 에러 0건", errors.length === 0, errors.join(" | "));

await browser.close();
for (const [s, n, d] of results) console.log(s, n, d ? "— " + d : "");
const fails = results.filter((x) => x[0] === "FAIL").length;
console.log(fails === 0 ? "\nALL PASS" : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
