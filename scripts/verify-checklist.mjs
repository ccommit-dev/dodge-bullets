import puppeteer from "puppeteer";
const BASE = "http://localhost:5173";
const H = "mock-local-dev";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const ok = (name, cond, detail = "") => { results.push([cond ? "PASS" : "FAIL", name, detail]); };

const browser = await puppeteer.launch({ headless: "shell", args: ["--no-sandbox", "--disable-gpu"] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e.message).slice(0, 100)));

async function seed(progress, titans, extra = {}) {
  await page.goto(BASE, { waitUntil: "networkidle0" });
  await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); }, {
    [`dodgebullets:progression:v1:${H}`]: JSON.stringify(progress),
    [`dodgebullets:titans:${H}`]: JSON.stringify(titans),
    "dodge-bullets:soundEnabled": "0",
    ...extra,
  });
  await page.goto(BASE, { waitUntil: "networkidle0" });
  await sleep(2400);
}
const closeModal = async () => { await page.evaluate(() => { [...document.querySelectorAll("button")].find((b) => /받기|확인|닫기/.test(b.textContent))?.click(); }); await sleep(900); };
const clickText = (sel, text) => page.evaluate(({ sel, text }) => { const el = [...document.querySelectorAll(sel)].find((b) => b.textContent.trim().includes(text)); el?.click(); return !!el; }, { sel, text });
/** 콘텐츠(화살 원정·비트 수련·대장간)는 하단 바 콘텐츠 팝업에서 연다 */
const openContent = async (label) => { await clickText(".titans-bottom-nav button", "콘텐츠"); await sleep(400); await clickText(".nav-popup-grid button", label); await sleep(1200); };
const now = Date.now();

// ── A. 신규 유저 ──
await seed({ version: 5, onboardingStep: 0, idleClaimedAt: now, updatedAt: now }, { stage: 1, bestStage: 1, gold: 0, heroes: {}, totalTaps: 0, lastActiveAt: now });
await closeModal();
let r = await page.evaluate(() => ({ coach: document.querySelector(".coach-bubble")?.textContent?.trim(), locked: document.querySelectorAll(".tab-locked").length }));
ok("#1 신규 코치 1단계(탭 유도)", /탭/.test(r.coach ?? ""), r.coach);
// 초반 곡선 완화로 Stage 1 몬스터가 탭 2~3회에 죽는다 — 같은 틱의 연타는 스테이지 전환 중 버려지므로 실제 손가락처럼 간격을 둔다
const tapFloats = new Set();
for (let i = 0; i < 8; i++) {
  await page.evaluate(() => { document.querySelector(".titans-field")?.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0, clientX: 200, clientY: 400 })); });
  await sleep(120);
  // 피해 숫자는 짧게 떠 있으므로 탭 직후에 채집한다
  (await page.evaluate(() => [...document.querySelectorAll(".titans-float")].map((f) => f.className))).forEach((c) => tapFloats.add(c));
  await sleep(200);
}
await sleep(600);
r = await page.evaluate(() => ({ coach: document.querySelector(".coach-bubble")?.textContent?.trim() }));
ok("#1 신규 코치 2단계(미아 소환 유도)", /소환/.test(r.coach ?? ""), r.coach);
ok("#2 탭 피해 숫자 src-tap", [...tapFloats].some((c) => c.includes("src-tap")), [...tapFloats].slice(0, 2).join(" | "));

// ── B. 기존 유저(step4, 출석 0, Lv 5) + 방치 3h ──
await seed(
  { version: 5, onboardingStep: 4, level: 5, exp: 800, attendanceStreak: 0, redGems: 500, sharedCoins: 10000, enhancementMaterials: 12, skillPoints: 20,
    titanBestStage: 6, pioneeredArea: 2, dodgeBestStage: 2, idleClaimedAt: now - 3 * 3600 * 1000, updatedAt: now, partyIds: ["mia", "leon"], partyCap: 4,
    // 프리셋은 잠긴 슬롯(비트 숙련 0)을 건드리지 않는다 — 5슬롯 전부 숙련 5로 열어 둔다
    beatSkills: { kick: 5, hat: 5, snare: 5, fire: 5, throat: 5 } },
  { stage: 6, bestStage: 6, gold: 50000, heroes: { mia: 5, leon: 3, sera: 2, garen: 1 }, skillInventory: { learned: ["strike", "crit", "clone"], levels: { strike: 1, crit: 1, clone: 1 }, equipped: { starter: "strike" }, skillCores: 5 }, lastActiveAt: now - 3 * 3600 * 1000 },
);
r = await page.evaluate(() => ({ modal: !!document.querySelector(".idle-modal"), cta: document.querySelector(".idle-forge-cta b")?.textContent }));
ok("#10 정산 팝업 대장간 CTA", r.modal && /강화석/.test(r.cta ?? ""), JSON.stringify(r));
await closeModal();
// 목표는 전장 우하단 알림 핀(추천 1 + 목표 2)으로 표시된다
r = await page.evaluate(() => ({ goals: [...document.querySelectorAll(".battle-alert b")].map((b) => b.textContent) }));
ok("#3 목표 알림 핀 2개 이상", r.goals.length >= 2, r.goals.join(" / "));
await clickText(".titans-tabs button", "스킬");
await sleep(400);
const before = await page.evaluate(() => document.querySelector(".skill-preset-card small")?.textContent);
await clickText(".preset-row button", "탭 폭발형");
await sleep(500);
r = await page.evaluate((h) => { const t = JSON.parse(localStorage.getItem(`dodgebullets:titans:${h}`)); return { eq: t.skillInventory.equipped, preview: document.querySelector(".skill-preset-card small")?.textContent }; }, H);
// 탭 폭발형: 시동기 pierce(미학습)→strike, 연계A waterStep(미학습)→crit, 연계B bloodMoon(미학습)→clone — 학습한 것만 장착
ok("#5 프리셋(탭 폭발형) 적용 → 미학습 제외 장착", Object.values(r.eq).includes("crit") && Object.values(r.eq).includes("clone") && Object.values(r.eq).every((id) => ["strike", "crit", "clone"].includes(id)), JSON.stringify(r.eq));
ok("#5 예상 DPS 보정 갱신", /\+\d+%/.test(r.preview ?? "") && r.preview !== before, `${before} → ${r.preview}`);
await clickText(".titans-bottom-nav button", "동료");
await sleep(400);
r = await page.evaluate(() => ({ chips: [...document.querySelectorAll(".role-filter button")].map((b) => b.textContent), rec: !!document.querySelector(".recommend-party") }));
ok("#4 역할 필터 4종+전체", r.chips.join(",") === "전체,근딜,원딜,탱커,힐러", r.chips.join(","));
await clickText(".role-filter button", "원딜");
await sleep(300);
const rangedCount = await page.evaluate(() => document.querySelectorAll(".ally-card").length);
await clickText(".role-filter button", "전체");
await sleep(300);
const allCount = await page.evaluate(() => document.querySelectorAll(".ally-card").length);
ok("#4 필터가 카드 수를 줄임", rangedCount > 0 && rangedCount < allCount, `${rangedCount}/${allCount}`);
await clickText(".recommend-party", "추천");
await sleep(600);
r = await page.evaluate((h) => JSON.parse(localStorage.getItem(`dodgebullets:progression:v1:${h}`)).partyIds, H);
ok("#4 추천 편성 → 원거리 2명 보장", r.length >= 3 && r.filter((id) => ["leon", "sera"].includes(id)).length >= 2, r.join(","));
await clickText(".titans-bottom-nav button", "상점");
await sleep(400);
const catBtns = await page.evaluate(() => [...document.querySelectorAll(".titans-shop button, .premium-category button")].map((b) => b.textContent.trim()).filter((t) => t.length < 8).slice(0, 8));
await clickText("button", "패키지");
await sleep(400);
r = await page.evaluate(() => ({ activeCat: [...document.querySelectorAll("button.on")].map((b) => b.textContent.trim()).filter((x) => x.length < 6), note: !!document.querySelector(".paid-gate-note"), paid: [...document.querySelectorAll(".premium-product-card")].filter((c) => /모험가 세트|캐릭터:|월정액/.test(c.textContent)).length }));
ok("#14 출석 0일: 유료 패키지 숨김 + 안내", r.note && r.paid === 0, JSON.stringify(r) + " cats=" + catBtns.join("/"));
await clickText("button", "설정");
await sleep(400);
r = await page.evaluate(() => document.querySelector(".menu-badge-warn")?.textContent);
ok("#13 세이브 백업 '권장' 배지", r === "권장", r);
await clickText('[role="menuitem"]', "마이페이지");
await sleep(700);
await clickText("button", "대장간");
await sleep(1000);
await clickText("button", "이지모드");
await sleep(600);
r = await page.evaluate(() => document.body.textContent.includes("정제"));
ok("#9 대장간 재료 정제 안내", r);

// ── C. 저사양 모드 ──
await page.evaluateOnNewDocument(() => { Object.defineProperty(navigator, "hardwareConcurrency", { get: () => 2 }); });
await page.goto(BASE, { waitUntil: "networkidle0" });
await sleep(2200);
await closeModal();
r = await page.evaluate(() => ({ low: document.querySelector(".titans-layer")?.classList.contains("perf-low"), idleAnim: document.querySelector(".ally-idle") ? getComputedStyle(document.querySelector(".ally-idle")).animationName : "n/a" }));
ok("#12 저사양(코어2) → perf-low + 호흡 애니 제거", r.low === true && (r.idleAnim === "none" || r.idleAnim === "n/a"), JSON.stringify(r));

// ── D. 화살 원정 슬로모 튜토리얼 ──
await page.evaluate((h) => { const k = `dodgebullets:progression:v1:${h}`; const p = JSON.parse(localStorage.getItem(k)); p.dodgeBestStage = 1; p.claimedRewards = []; p.onboardingStep = 4; localStorage.setItem(k, JSON.stringify(p)); }, H);
await page.goto(BASE, { waitUntil: "networkidle0" });
await sleep(2200);
await closeModal();
await openContent("화살 원정");
await sleep(1000);
await clickText("button", "스테이지 1 시작");
await sleep(1800);
r = await page.evaluate((h) => ({ tut: !!document.querySelector(".dodge-tutorial"), claimed: JSON.parse(localStorage.getItem(`dodgebullets:progression:v1:${h}`)).claimedRewards.includes("dodge-tutorial") }), H);
ok("#6 첫 원정 슬로모 튜토리얼 표시 + 1회 기록", r.tut && r.claimed, JSON.stringify(r));
await sleep(7000);
r = await page.evaluate(() => !!document.querySelector(".dodge-tutorial"));
ok("#6 7초 후 튜토리얼 종료", r === false);

// ── E. 비트 ──
await page.goto(BASE, { waitUntil: "networkidle0" });
await sleep(2200);
await closeModal();
await openContent("비트 수련");
await sleep(1500);
// 싱크 보정 UI는 사용자 개편에서 제거됐다(곡 오디오 시계를 직접 판정 기준으로 사용). 상중하 없음 + 곡별 커버 이미지를 확인한다
r = await page.evaluate(() => ({ diff: !!document.querySelector(".beat-difficulty"), cards: document.querySelectorAll(".schedule-card").length, covers: [...document.querySelectorAll(".schedule-cover")].filter((i) => i.complete && i.naturalWidth > 0).length }));
ok("#7 비트 메뉴: 상중하 없음 + 곡별 커버 이미지", !r.diff && r.cards > 0 && r.covers === r.cards, JSON.stringify(r));

ok("런타임 에러 0건", errors.length === 0, errors.join(" | "));
await browser.close();
for (const [s, n, d] of results) console.log(s, n, d ? "— " + d : "");
console.log(results.every((x) => x[0] === "PASS") ? "\nALL PASS" : `\n${results.filter((x) => x[0] === "FAIL").length} FAIL`);
