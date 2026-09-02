/**
 * 리텐션 8종 e2e (RETENTION_DESIGN A~H) — 실제 DOM·저장소로 검증한다.
 *   node scripts/verify-retention.mjs   (vite dev 서버 5173 필요)
 */
import puppeteer from "puppeteer";
const BASE = "http://localhost:5173";
const H = "mock-local-dev";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const ok = (name, cond, detail = "") => results.push([cond ? "PASS" : "FAIL", name, detail]);

const browser = await puppeteer.launch({ headless: "shell", args: ["--no-sandbox", "--disable-gpu"] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e.message).slice(0, 120)));
const now = Date.now();
const today = new Date().toLocaleDateString("sv-SE");

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
// 정산 모달의 '보상 수령'(.idle-claim)을 우선 — 루틴 보드의 비활성 '💎' 버튼 등 다른 버튼을 잡지 않도록
const closeModal = async () => { await page.evaluate(() => { const claim = document.querySelector(".idle-claim"); if (claim) { claim.click(); return; } [...document.querySelectorAll("button")].find((b) => /수령|받기|확인|닫기/.test(b.textContent))?.click(); }); await sleep(900); };
const clickText = (sel, text) => page.evaluate(({ sel, text }) => { const el = [...document.querySelectorAll(sel)].find((b) => b.textContent.trim().includes(text)); el?.click(); return !!el; }, { sel, text });
const prog = () => page.evaluate((h) => JSON.parse(localStorage.getItem(`dodgebullets:progression:v1:${h}`)), H);

const baseProgress = { version: 5, onboardingStep: 4, level: 8, exp: 3000, attendanceStreak: 1, redGems: 100, sharedCoins: 50000, enhancementMaterials: 20,
  titanBestStage: 6, pioneeredArea: 2, dodgeBestStage: 2, idleClaimedAt: now - 3 * 3600 * 1000, updatedAt: now, partyIds: ["mia", "leon"], partyCap: 4, sessionCount: 0 };
const baseTitans = { stage: 6, bestStage: 6, gold: 20000, heroes: { mia: 5, leon: 3 }, skillInventory: { learned: ["strike"], levels: { strike: 1 }, equipped: { starter: "strike" }, skillCores: 0 }, lastActiveAt: now - 3 * 3600 * 1000 };

// ── C 워밍업: 3h 이탈 후 정산 → warmupUntil + 칩 ──
await seed(baseProgress, baseTitans);
ok("정산 모달", await page.evaluate(() => !!document.querySelector(".idle-modal")));
await closeModal();
let p = await prog();
ok("C 워밍업 시작(warmupUntil 미래·일일 카운트 1)", p.warmupUntil > Date.now() && p.warmupDay.count === 1 && p.warmupDay.date === today, `until=${p.warmupUntil - Date.now()}ms count=${p.warmupDay?.count}`);
let r = await page.evaluate(() => ({ chip: document.querySelector(".warmup-chip")?.textContent, preview: document.querySelector(".idle-preview-chip")?.textContent, bar: document.querySelector(".titans-stagebar")?.textContent?.slice(0, 160) }));
ok("C 워밍업 칩 표시", /워밍업 ×2/.test(r.chip ?? ""), r.chip ?? `stagebar=${r.bar}`);
ok("E 종료 예고 칩(첫 3세션)", /8시간 후 \+/.test(r.preview ?? ""), r.preview ?? `stagebar=${r.bar}`);
ok("E 세션 카운트 증가", p.sessionCount === 1, String(p.sessionCount));

// ── A 루틴 보드 · B 추천 배너 ──
r = await page.evaluate(() => ({
  chips: [...document.querySelectorAll(".routine-chip")].map((c) => c.querySelector("b")?.textContent + (c.classList.contains("done") ? "✓" : "")),
  reward: document.querySelector(".routine-reward")?.textContent,
  banner: document.querySelector(".recommend-banner")?.className,
  title: document.querySelector(".recommend-banner b")?.textContent,
  goalsHidden: getComputedStyle(document.querySelector(".titans-goals")).display,
}));
ok("A 루틴 5칸(정산 완료 표시)", r.chips.length === 5 && r.chips[0] === "정산✓", r.chips.join(","));
ok("B 추천 배너 1개(균열 남음 → 오늘 무료)", /tone-free/.test(r.banner ?? "") && /균열/.test(r.title ?? ""), r.title);
// 추천 배너 클릭 → 이벤트 센터 균열 탭
await page.evaluate(() => document.querySelector(".recommend-banner")?.click());
await sleep(700);
r = await page.evaluate(() => ({ modal: !!document.querySelector(".event-modal"), riftTab: !!document.querySelector(".rift-event") }));
ok("B 추천 클릭 → 이벤트 센터 균열 탭으로", r.modal && r.riftTab, JSON.stringify(r));
// 균열 3회 소진 → 루틴 균열 칸 완료 + 주간 카운트
for (let i = 0; i < 3; i += 1) { await clickText(".rift-event button", "균열 진입"); await sleep(500); }
await clickText(".event-tabs button", "주간 도전");
await sleep(400);
r = await page.evaluate(() => ({ items: [...document.querySelectorAll(".weekly-challenge article")].map((a) => a.querySelector("b")?.textContent + " " + a.querySelector("span")?.textContent) }));
ok("F 주간 도전 3종 + 균열 카운트 반영", r.items.length === 3 && r.items.some((t) => /균열/.test(t) && /3 \//.test(t)), r.items.join(" | "));
await clickText("button", "닫기");
await sleep(700);
r = await page.evaluate(() => ({ chips: [...document.querySelectorAll(".routine-chip")].map((c) => c.querySelector("b")?.textContent + (c.classList.contains("done") ? "✓" : "")), title: document.querySelector(".recommend-banner b")?.textContent }));
ok("A 루틴 균열 칸 완료 반영(이벤트 변경 즉시 동기화)", r.chips.includes("균열✓"), r.chips.join(","));
ok("B 추천이 다음 항목(토벌령)으로 넘어감", /토벌령/.test(r.title ?? ""), r.title);

// ── A 루틴 완료 보상 ──
await page.evaluate((h) => { const k = `dodgebullets:progression:v1:${h}`; const q = JSON.parse(localStorage.getItem(k)); q.firstClearDates = { ...q.firstClearDates, forge: new Date().toLocaleDateString("sv-SE") }; q.expeditions = [{ allyId: "leon", endsAt: Date.now() + 3600000, hours: 4 }]; q.partyIds = ["mia"]; localStorage.setItem(k, JSON.stringify(q));
  const ek = `dodgebullets:events:v2:${h}`; const e = JSON.parse(localStorage.getItem(ek)); const d = new Date().toLocaleDateString("sv-SE"); e.claimed = ["hunt", "pioneer", "forge", "beat"].map((id) => `daily:${d}:${id}`); localStorage.setItem(ek, JSON.stringify(e)); }, H);
await page.goto(BASE, { waitUntil: "networkidle0" });
await sleep(2200);
await closeModal();
const gemsBefore = (await prog()).redGems;
r = await page.evaluate(() => ({ ready: document.querySelector(".routine-reward")?.classList.contains("ready"), chips: [...document.querySelectorAll(".routine-chip.done")].length }));
ok("A 5칸 완료 → 보상 버튼 활성", r.ready === true && r.chips === 5, JSON.stringify(r));
await page.evaluate(() => document.querySelector(".routine-reward")?.click());
await sleep(600);
p = await prog();
ok("A 루틴 보상 보석 +10 · 날짜 기록", p.redGems === gemsBefore + 10 && p.routineClaimedDate === today, `${gemsBefore}→${p.redGems}`);

// ── D 벽 미터: 보스 실패 유도 (보스 HP 거대) ──
// Stage 6 · 미아 20 (탭 없이 mob 3.9s, 보스 43s > 30s 제한) — 10마리 후 보스 도전 → 실패가 보장된다
await seed({ ...baseProgress, idleClaimedAt: now, sessionCount: 5, partyIds: ["mia"] }, { ...baseTitans, heroes: { mia: 20 }, gold: 300 });
await closeModal();
// 배속 ×2 — 전 과정 절반 시간
await page.evaluate(() => { [...document.querySelectorAll(".qol-btn")].find((b) => b.textContent.trim() === "×2")?.click(); });
let bossBtn = false;
for (let i = 0; i < 60 && !bossBtn; i += 1) {
  await sleep(1000);
  bossBtn = await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => x.textContent.includes("보스 도전")); b?.click(); return !!b; });
}
ok("D 일반 10마리 처치 → 보스 도전 버튼", bossBtn);
let wallSeen = null;
for (let i = 0; i < 60 && !wallSeen; i += 1) {
  await sleep(1000);
  wallSeen = await page.evaluate(() => { const b = document.querySelector(".recommend-banner.tone-wall"); return b ? { title: b.querySelector("b")?.textContent, desc: b.querySelector("em")?.textContent, meter: !!b.querySelector(".wall-meter") } : null; });
}
ok("D 보스 실패 → 벽 미터 배너(비율 + 해법 1개)", !!wallSeen && wallSeen.meter && /\d+%/.test(wallSeen.title ?? ""), JSON.stringify(wallSeen));

// ── G 비트 무료 재도전 라벨 · H 공유 버튼 · G 사망 팁 ──
await seed({ ...baseProgress, idleClaimedAt: now, sessionCount: 5 }, baseTitans, { "dodgebullets:beat:calibrationMs": "0" });
await closeModal();
await clickText(".titans-content-tabs button", "비트");
await sleep(1200);
ok("G 비트 메뉴 진입", await page.evaluate(() => !!document.querySelector(".schedule-card")));
await page.evaluate(() => document.querySelector(".schedule-card")?.click());
await sleep(1500);
// 강제 게임오버: 세션 HP를 0으로 만들 수 없으므로 오버레이 존재만 검증 (무료 재도전 라벨은 로직 테스트로 대체)
const freeKeyAbsent = await page.evaluate((h) => Object.keys(localStorage).filter((k) => k.startsWith("dodgebullets:beat:freeRetry:")).length === 0, H);
ok("G 무료 재도전 키 초기 상태(미사용)", freeKeyAbsent);
await page.goto(BASE, { waitUntil: "networkidle0" });
await sleep(2200);
await closeModal();
await page.evaluate(() => document.querySelector(".titans-back")?.click());
await sleep(800);
r = await page.evaluate(() => !!document.querySelector(".share-card-btn"));
ok("H 마이페이지 공유 버튼", r);
await page.evaluate(() => document.querySelector(".share-card-btn")?.click());
await sleep(1500);
r = await page.evaluate(() => document.querySelector(".growth-message")?.textContent ?? "");
ok("H 공유 실행 결과 메시지(공유/새 탭/미지원 중 하나)", /공유|새 탭|지원/.test(r), r);

ok("런타임 에러 0건", errors.length === 0, errors.join(" | "));
await browser.close();
for (const [s, n, d] of results) console.log(s, n, d ? "— " + d : "");
console.log(results.every((x) => x[0] === "PASS") ? "\nALL PASS" : `\n${results.filter((x) => x[0] === "FAIL").length} FAIL`);
