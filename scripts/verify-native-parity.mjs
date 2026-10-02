/**
 * 웹/앱 동작 일치 검증 (2026-10-02) — window.Capacitor.isNativePlatform 을 true 로 세워 Capacitor WebView 처럼 띄우고,
 * 웹에서 하던 플레이를 그대로 따라간다. 앱에서만 갈라지는 경로(토스 브리지 생략 · Preferences 저장 · 공유 카드 · 백그라운드 이벤트)를
 * 전부 지나게 해서 웹과 같은 결과가 나오는지 본다.
 *   node scripts/verify-native-parity.mjs   (vite 5173)
 *
 * 헤드리스 크롬의 window.open 은 새 탭을 만들 뿐 WebView 처럼 현재 화면을 갈아치우지 않는다 — 그래서 window.open 호출 자체를 기록해
 * "앱에서 blob 을 열려고 했는가"를 본다 (Capacitor Bridge.launchIntent 는 blob 스킴을 WebView 안에서 연다).
 */
import { launchBrowser } from "./launch-browser.mjs";

const BASE = "http://localhost:5173";
const H = "mock-local-dev";
let failed = 0;
const ok = (name, cond, detail = "") => { console.log(`${cond ? "PASS" : "FAIL"} ${name}${detail ? " — " + detail : ""}`); if (!cond) failed += 1; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = [];

const browser = await launchBrowser({ args: ["--no-sandbox", "--disable-gpu"] });
const page = await browser.newPage();
page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.evaluateOnNewDocument(() => {
  window.Capacitor = { isNativePlatform: () => true, getPlatform: () => "android", Plugins: {} };
  // @capacitor/core 가 로드되면 window.Capacitor 를 자기 것으로 덮고 androidBridge 가 없으니 web 이라고 답한다 —
  // CapacitorCustomPlatform 을 세워 두면 끝까지 android 이고, 네이티브 구현이 없는 플러그인은 web 구현으로 돈다 (core createCapacitor)
  window.CapacitorCustomPlatform = { name: "android", plugins: {} };
  window.__opened = [];
  const realOpen = window.open.bind(window);
  window.open = (...args) => { window.__opened.push(String(args[0])); return realOpen === null ? null : null; };
});

const progressKey = `CapacitorStorage.dodgebullets:progression:v1:${H}`;
const readProgress = () => page.evaluate((k) => { try { return JSON.parse(localStorage.getItem(k) ?? "null"); } catch { return null; } }, progressKey);
const clickText = (sel, text) => page.evaluate(({ sel, text }) => { const el = [...document.querySelectorAll(sel)].find((b) => b.textContent.trim().includes(text)); el?.click(); return !!el; }, { sel, text });
const closeModal = () => page.evaluate(() => { for (let k = 0; k < 4; k += 1) { const c = document.querySelector(".idle-claim"); if (c) { c.click(); continue; } const b = [...document.querySelectorAll("button")].filter((x) => !x.closest(".battle-alert-stack, .titans-tabs, .titans-bottom-nav, .hub-sheet, .nav-popup-grid")).find((x) => /출석|수령|확인|닫기/.test(x.textContent)); if (!b) break; b.click(); } });
const waitHub = async () => { for (let i = 0; i < 40; i += 1) { await sleep(250); if (await page.evaluate(() => !!document.querySelector(".titans-bottom-nav") && !document.querySelector(".titans-loading"))) return true; } return false; };
const openContent = async (label) => { await clickText(".titans-bottom-nav button", "콘텐츠"); await sleep(400); await clickText(".nav-popup-grid button", label); await sleep(1500); };

// ── 1. 새 기기 부팅 — 저장은 Capacitor Preferences(웹 구현은 CapacitorStorage. 접두 localStorage)로 ──
await page.goto(BASE, { waitUntil: "networkidle0" });
await page.evaluate(() => { localStorage.clear(); localStorage.setItem("dodge-bullets:soundEnabled", "0"); });
await page.goto(BASE, { waitUntil: "networkidle0" });
ok("앱 부팅이 허브까지 간다 (토스 브리지 생략)", await waitHub());
await sleep(1200);
await closeModal();
await sleep(600);
const fresh = await readProgress();
ok("새 기기: 진행도가 Preferences 경로(CapacitorStorage.)에 저장된다 — 웹 localStorage 키가 아니라", !!fresh, fresh ? `coins ${fresh.sharedCoins}` : "키 없음");

// ── 1b. 진행한 계정 — Preferences 도입 전 앱이 localStorage 에 남긴 저장을 한 번 옮겨 온다 (storageGet 마이그레이션) ──
const now = Date.now();
const seeded = {
  version: 5, level: 40, sharedCoins: 987654, equippedWeaponLevel: 10, dodgeBestStage: 4, idleClaimedAt: now, updatedAt: now, onboardingStep: 4,
  partyIds: ["mia"], partyCap: 4, expeditionSeals: 400, expeditionSkills: { fire: 6, water: 4, ice: 4, earth: 4, bolt: 4, ultimate: 4 },
  expeditionWeapon: "bow", expeditionBasic: 2, claimedRewards: ["dodge-tutorial"], pioneeredArea: 3,
};
const titans = { gold: 40000, stage: 9, bestStage: 9, heroes: { mia: 8 }, lastActiveAt: now };
await page.evaluate(({ seeded, titans, H }) => {
  for (const k of Object.keys(localStorage)) if (k.startsWith("CapacitorStorage.")) localStorage.removeItem(k);
  localStorage.setItem(`dodgebullets:progression:v1:${H}`, JSON.stringify(seeded));
  localStorage.setItem(`dodgebullets:titans:${H}`, JSON.stringify(titans));
}, { seeded, titans, H });
await page.goto(BASE, { waitUntil: "networkidle0" });
ok("진행한 계정으로 다시 부팅", await waitHub());
await sleep(1500);
await closeModal();
await sleep(600);
const p0 = await readProgress();
ok("예전 localStorage 저장이 Preferences 로 옮겨진다 (기본 사격 Lv·스킬 레벨 유지)", !!p0 && p0.expeditionBasic === 2 && p0.expeditionSkills?.fire === 6 && p0.dodgeBestStage === 4, p0 ? `basic ${p0.expeditionBasic} fire ${p0.expeditionSkills?.fire} best ${p0.dodgeBestStage}` : "키 없음");

// ── 2. 성문 방어 한 판 — 시계가 흐르고 몬스터가 내려온다 ──
await openContent("성문 방어");
await clickText("button", "스테이지");
await sleep(1800);
await page.evaluate(() => { const c = document.querySelector("canvas"); if (!c) return; const r = c.getBoundingClientRect(); c.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: r.x + r.width / 2, clientY: r.y + r.height * 0.8, pointerId: 1, pointerType: "touch" })); });
const t0 = await page.evaluate(() => window.__dodgeWorld?.stageElapsedMs ?? -1);
await sleep(4500);
const run = await page.evaluate(() => { const w = window.__dodgeWorld; return w ? { t: w.stageElapsedMs, monsters: w.arrows.filter((a) => a.active).length, shots: w.skillShots.filter((s) => s.active).length, kills: w.skillKills } : null; });
ok("전투 시계가 흐른다", !!run && run.t > t0 + 2000, run ? `${t0} → ${Math.round(run.t)}ms` : "월드 없음");
ok("몬스터가 내려오고 활이 쏜다", !!run && (run.monsters > 0 || run.kills > 0) && (run.shots > 0 || run.kills > 0), JSON.stringify(run));

// ── 3. 백그라운드 → 복귀 (Capacitor 가 document 에 쏘는 pause/resume) — 오류 없이 다시 흐른다 ──
const errBefore = errors.length;
await page.evaluate(() => { document.dispatchEvent(new Event("pause")); });
await sleep(300);
await page.evaluate(() => { document.dispatchEvent(new Event("resume")); });
await sleep(800);
const tAfter = await page.evaluate(() => window.__dodgeWorld?.stageElapsedMs ?? -1);
ok("pause/resume 이벤트 뒤에도 오류 없이 전투가 이어진다", errors.length === errBefore && tAfter > (run?.t ?? 0), `t ${Math.round(tAfter)} · 오류 ${errors.length - errBefore}`);

// ── 4. 클리어 → 보상이 저장된다. 중간 스테이지는 결과 화면 없이 다음으로 흐르므로(설계) 마지막 스테이지에서 깬다 ──
const coinsBefore = (await readProgress())?.sharedCoins ?? 0;
await page.evaluate(() => { const w = window.__dodgeWorld; if (w) { w.player.hp = w.player.maxHp; w.stageIndex = 3; w.bossSpawned = true; w.bossDefeated = true; } });
let cleared = false;
for (let i = 0; i < 30 && !cleared; i += 1) { await sleep(250); cleared = await page.evaluate(() => !!document.querySelector(".share-card-btn")); }
ok("클리어 결과 화면이 뜬다", cleared);
await sleep(1500);
const p1 = await readProgress();
ok("클리어 보상이 Preferences 에 저장된다", !!p1 && p1.sharedCoins > coinsBefore, `${coinsBefore} → ${p1?.sharedCoins}`);

// ── 5. 기록 카드 공유 — 앱에서는 blob 을 열지 않고 앱 안에 띄운다 (게임 화면이 그대로) ──
await page.evaluate(() => document.querySelector(".share-card-btn")?.click());
let overlay = false;
for (let i = 0; i < 20 && !overlay; i += 1) { await sleep(200); overlay = await page.evaluate(() => !!document.querySelector(".share-card-overlay img")); }
const opened = await page.evaluate(() => window.__opened.slice());
ok("공유 카드: window.open(blob) 을 부르지 않는다", opened.length === 0, opened.join(","));
ok("공유 카드: 앱 안 오버레이에 카드가 뜨고 게임 화면(캔버스)은 남아 있다", overlay && await page.evaluate(() => !!document.querySelector("canvas")));
await page.evaluate(() => [...document.querySelectorAll(".share-card-overlay button")].find((b) => b.textContent.includes("닫기"))?.click());
await sleep(300);
ok("공유 카드 오버레이가 닫힌다", await page.evaluate(() => !document.querySelector(".share-card-overlay")));

// ── 6. 앱 재시작 — 저장이 살아 있다 ──
await page.goto(BASE, { waitUntil: "networkidle0" });
ok("재시작 후 다시 허브까지", await waitHub());
const p2 = await readProgress();
ok("재시작 후에도 보상이 그대로", !!p2 && p2.sharedCoins >= (p1?.sharedCoins ?? Infinity), `${p1?.sharedCoins} → ${p2?.sharedCoins}`);

// ── 7. 다른 콘텐츠도 앱에서 열린다 ──
await sleep(800);
await closeModal();
await sleep(500);
await openContent("대장간");
ok("대장간이 열린다", await page.evaluate(() => !!document.querySelector(".forge-title-screen, .forge-page, .forge-tabs")));
await page.goto(BASE, { waitUntil: "networkidle0" });
await waitHub();
await sleep(800);
await closeModal();
await sleep(500);
await openContent("비트 수련");
ok("비트 수련이 열린다 (곡 표지가 로드된다)", await page.evaluate(() => [...document.querySelectorAll(".schedule-cover")].filter((i) => i.complete && i.naturalWidth > 0).length > 0));

ok("전 과정에서 페이지 오류가 없다", errors.length === 0, errors.slice(0, 3).join(" | "));
await browser.close();
console.log(failed ? `${failed} FAIL` : "ALL PASS");
process.exit(failed ? 1 : 0);
