/** 테스트 모드 해금 검사 (2026-10-16, 사용자: "콘텐츠 해금·스킬장착 해금은 테스트를 위해 모두 풀고, 테스트모드 해제 시엔 해금이 다시 동작") — node scripts/verify-qa-unlock.mjs (vite 5173)
 * QA 빌드 기본 켜짐 → 설정 빌드 라벨 7탭 OFF → 사냥터 카드·스킬 칸·성문 방어 무기/스킬이 새로고침 없이 다시 잠기고 새로고침 뒤에도 유지 → 다시 ON. progression/qaUnlock */
import { launchBrowser } from "./launch-browser.mjs";
const BASE = "http://localhost:5173", H = "mock-local-dev", now = Date.now();
const browser = await launchBrowser({ args: ["--no-sandbox"] }); const page = await browser.newPage(); const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errors = []; page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
let fails = 0; const ok = (n, c, i = "") => { console.log(`${c ? "PASS" : "FAIL"} ${n}${i ? " — " + i : ""}`); if (!c) fails += 1; };
await page.goto(BASE, { waitUntil: "networkidle0" });
// 초반 유저 — 정상 규칙이면 성문 방어·대장간·연습실·이벤트·성벽 잠김, 스킬 칸 잠김
const progress = { version: 5, level: 6, dodgeBestStage: 0, idleClaimedAt: now, updatedAt: now, onboardingStep: 1, partyIds: ["mia"], partyCap: 4, claimedRewards: ["dodge-tutorial"], pioneeredArea: 1 };
const titans = { gold: 4000, stage: 4, bestStage: 4, heroes: { mia: 3 }, lastActiveAt: now };
await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); }, { [`dodgebullets:progression:v1:${H}`]: JSON.stringify(progress), [`dodgebullets:titans:${H}`]: JSON.stringify(titans), "dodge-bullets:soundEnabled": "0" });
const closeAll = () => page.evaluate(() => { for (let k = 0; k < 4; k += 1) { const c = document.querySelector(".idle-claim"); if (c) { c.click(); continue; } const b = [...document.querySelectorAll("button")].filter((x) => /^(닫기|확인|나중에)$/.test(x.textContent.trim()))[0]; if (b) b.click(); } });
const state = async () => {
  await page.evaluate(() => [...document.querySelectorAll(".titans-bottom-nav button")].find((b) => b.textContent.includes("모험"))?.click()); await sleep(700);
  const hub = await page.evaluate(() => ({ cards: document.querySelectorAll(".hub-card").length, locked: document.querySelectorAll(".hub-card.tab-locked").length }));
  await page.evaluate(() => [...document.querySelectorAll(".titans-growth-tabs button")].find((b) => b.textContent.trim() === "스킬")?.click()); await sleep(700);
  // 2026-10-28 슬롯 탭을 걷었다 — 같은 잠금 표시는 스킬 조합 칸(.combo-step.locked)에 있다
  const slots = await page.evaluate(() => ({ tabs: document.querySelectorAll(".hero-skill-combo .combo-step").length, locked: document.querySelectorAll(".hero-skill-combo .combo-step.locked").length }));
  const qa = await page.evaluate(() => localStorage.getItem("dodgebullets:qa-mode"));
  // 성문 방어 정비 — 원거리 무기(지팡이 S2) · 스킬(계정 Lv) 잠금. 성문 방어 자체는 온보딩 1단계라 늘 열려 있다
  await page.evaluate(() => [...document.querySelectorAll(".titans-bottom-nav button")].find((b) => b.textContent.includes("모험"))?.click()); await sleep(500);
  await page.evaluate(() => document.querySelector(".hub-card[data-card=dodge]")?.click()); await sleep(1600);
  await page.evaluate(() => [...document.querySelectorAll(".exp-menu-tabs button")].find((b) => b.textContent.includes("정비"))?.click()); await sleep(700);
  const dodge = await page.evaluate(() => ({ weapons: document.querySelectorAll(".exp-weapon-card").length, weaponLocked: document.querySelectorAll(".exp-weapon-card.locked").length, skillLocks: document.querySelectorAll(".exp-skill-lock").length }));
  await page.evaluate(() => [...document.querySelectorAll(".exp-menu-tabs button")].find((b) => b.textContent.includes("원정"))?.click()); await sleep(400);
  await page.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.textContent.includes("사냥터로 돌아가기"))?.click()); await sleep(1500);
  return { hub, slots, qa, dodge };
};
const tap7 = async () => {
  await page.evaluate(() => document.querySelector(".settings-toggle")?.click()); await sleep(400);
  const label0 = await page.evaluate(() => document.querySelector(".settings-build")?.textContent);
  for (let i = 0; i < 7; i += 1) { await page.evaluate(() => document.querySelector(".settings-build")?.click()); await sleep(60); }
  await sleep(300);
  const label1 = await page.evaluate(() => document.querySelector(".settings-build")?.textContent);
  await page.evaluate(() => document.querySelector(".settings-toggle")?.click()); await sleep(400);
  return { label0, label1 };
};
await Promise.all([page.waitForNavigation({ waitUntil: "networkidle0" }).catch(() => {}), page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); setTimeout(() => location.reload(), 0); }, { [`dodgebullets:progression:v1:${H}`]: JSON.stringify(progress), [`dodgebullets:titans:${H}`]: JSON.stringify(titans), "dodge-bullets:soundEnabled": "0" })]);   // 시드를 다시 쓰고 바로 reload(2026-10-28 시드 경합) await sleep(2500); await closeAll(); await sleep(800);
const a = await state();
ok("기본(QA 빌드): 콘텐츠 카드 잠금 없음", a.hub.cards >= 5 && a.hub.locked === 0, JSON.stringify(a));
ok("기본(QA 빌드): 스킬 칸 잠금 없음", a.slots.tabs >= 4 && a.slots.locked === 0, JSON.stringify(a.slots));
ok("기본(QA 빌드): 성문 방어 무기·스킬 잠금 없음", a.dodge.weapons >= 2 && a.dodge.weaponLocked === 0 && a.dodge.skillLocks === 0, JSON.stringify(a.dodge));
const t1 = await tap7();
ok("설정 표기가 테스트 모드 → 빌드 번호로", /테스트 모드/.test(t1.label0 ?? "") && !/테스트 모드/.test(t1.label1 ?? ""), JSON.stringify(t1));
const b = await state();
ok("7탭 OFF: qa-mode=\"0\" 저장", b.qa === "0", String(b.qa));
ok("7탭 OFF: 새로고침 없이 콘텐츠 카드가 다시 잠긴다", b.hub.locked >= 3, JSON.stringify(b.hub));
ok("7탭 OFF: 스킬 칸이 다시 잠긴다", b.slots.locked >= 1, JSON.stringify(b.slots));
ok("7탭 OFF: 성문 방어 무기·스킬이 다시 잠긴다", b.dodge.weaponLocked >= 1 && b.dodge.skillLocks >= 1, JSON.stringify(b.dodge));
await page.reload({ waitUntil: "networkidle0" }); await sleep(2500); await closeAll(); await sleep(800);
const c = await state();
ok("새로고침 뒤에도 잠금 유지", c.hub.locked === b.hub.locked && c.slots.locked === b.slots.locked, JSON.stringify(c));
await tap7();
const d = await state();
ok("다시 7탭 ON: 전부 열림", d.qa === "1" && d.hub.locked === 0 && d.slots.locked === 0 && d.dodge.weaponLocked === 0 && d.dodge.skillLocks === 0, JSON.stringify(d));
// ── 풀린 콘텐츠가 실제로 열리는가 (잠금 모양만이 아니라) · 출석은 메뉴로만 ──
const progress2 = { ...progress, towerTickets: 3 };
const seed = async () => {
  await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); location.reload(); }, { [`dodgebullets:progression:v1:${H}`]: JSON.stringify(progress2), [`dodgebullets:titans:${H}`]: JSON.stringify(titans), "dodge-bullets:soundEnabled": "0" });
  await page.waitForNavigation({ waitUntil: "networkidle0" }).catch(() => {}); await sleep(2500);
  await page.evaluate(() => { for (let k = 0; k < 4; k += 1) { const c = document.querySelector(".idle-claim"); if (c) { c.click(); continue; } const b = [...document.querySelectorAll("button")].filter((x) => /^(닫기|확인|나중에)$/.test(x.textContent.trim()))[0]; if (b) b.click(); } });
  await sleep(800);
};
const toasts = () => page.evaluate(() => [...document.querySelectorAll(".titans-toast, .settings-toast, .flash, [role=status]")].map((e) => e.textContent.trim()).filter(Boolean).join(" | "));
const expect = { beat: ".beat-layer", forge: ".forge-layer", tower: "canvas", rift: ".event-modal" };
for (const card of ["beat", "forge", "tower", "rift"]) {
  await seed();
  await page.evaluate(() => [...document.querySelectorAll(".titans-bottom-nav button")].find((b) => b.textContent.includes("모험"))?.click()); await sleep(700);
  await page.evaluate((c) => document.querySelector(`.hub-card[data-card=${c}]`)?.click(), card); await sleep(400);
  const t = await toasts();
  await sleep(2600);
  const r = await page.evaluate((sel) => ({ shown: !!document.querySelector(sel), hub: !!document.querySelector(".hub-page") }), expect[card]);
  ok(`${card} 카드가 실제로 열린다 (${expect[card]})`, r.shown && !/열립니다|잠겨|잠금/.test(t), `${JSON.stringify(r)} toast=${t.slice(0, 80)}`);
}
// 설정 → 출석 이벤트 (신규라도 테스트 모드면 메뉴로 열린다 · 부팅 자동 열림은 없다)
await seed();
const autoOpened = await page.evaluate(() => !!document.querySelector(".attendance-modal"));
ok("신규 부팅 때 출석 창이 저절로 뜨지 않는다", !autoOpened);
await page.evaluate(() => document.querySelector(".settings-toggle")?.click()); await sleep(400);
await page.evaluate(() => [...document.querySelectorAll("[role=menuitem]")].find((b) => b.textContent.includes("출석 이벤트"))?.click()); await sleep(1200);
ok("설정 → 출석 이벤트가 열린다", await page.evaluate(() => !!document.querySelector(".attendance-modal")));
await page.evaluate(() => document.querySelector(".settings-toggle")?.click()); await sleep(400);
ok("페이지 오류 없음", errors.length === 0, errors.slice(0, 2).join(" / "));
console.log(fails ? `${fails} FAIL` : "ALL PASS");
await browser.close();
process.exit(fails ? 1 : 0);
