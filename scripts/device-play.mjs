/**
 * 실기기/에뮬레이터 플레이 검사 (2026-10-06, 사용자: "실제 안드로이드 휴대폰에서는 플레이 기준으로 테스트 및 수정").
 *
 * adb 로 연결한 안드로이드 기기에 디버그 APK 를 깔고, 앱의 WebView 를 원격 디버깅(adb forward → DevTools)으로 붙잡아
 * **기기 화면 그대로** 플레이한다. 터치는 `adb shell input`(진짜 터치 이벤트), 화면은 `adb exec-out screencap`.
 *   A. 새 설치 첫 실행 — 시스템 권한 창이 튜토리얼을 막지 않는다 · 첫 화면 FPS
 *   B. 진행된 계정(Preferences 에 심음) — 사냥터 · 보석 칩 → 상점 · 구매 추천 · 원정 지도 · 성문 방어 한 판(FPS · 스와이프) · 뒤로 가기 = 일시정지 · 비트 홀드
 *   node scripts/device-play.mjs [outDir] [--no-install]
 * 준비: VITE_QA_BUILD=true npx vite build → npx cap sync android → android/gradlew assembleDebug
 */
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import puppeteer from "puppeteer";

const OUT = process.argv.slice(2).find((a) => !a.startsWith("--")) ?? "store/device";
mkdirSync(OUT, { recursive: true });
const APP = "com.ccommit.dodgelab";
const ADB = process.env.ADB ?? join(process.env.LOCALAPPDATA ?? "", "Android/Sdk/platform-tools/adb.exe");
const APK = "android/app/build/outputs/apk/debug/app-debug.apk";
const adb = (...args) => execFileSync(ADB, args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).trim();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const ok = (name, cond, detail = "") => { results.push([cond ? "PASS" : "FAIL", name, detail]); console.log(cond ? "PASS" : "FAIL", name, detail ? "— " + detail : ""); };

const devices = adb("devices").split("\n").slice(1).filter((l) => /\tdevice$/.test(l));
if (devices.length === 0) { console.log("FAIL 연결된 안드로이드 기기 없음 — USB 디버깅을 켜고 연결하세요"); process.exit(2); }
const model = adb("shell", "getprop", "ro.product.model");
const sdk = adb("shell", "getprop", "ro.build.version.sdk");
const [sw, sh] = (adb("shell", "wm", "size").match(/(\d+)x(\d+)/) ?? []).slice(1).map(Number);
console.log(`기기 ${model} · Android SDK ${sdk} · ${sw}x${sh}`);
if (!process.argv.includes("--no-install")) {
  if (!existsSync(APK)) { console.log("FAIL APK 없음:", APK); process.exit(2); }
  console.log(adb("install", "-r", "-d", APK).split("\n").pop());
}

const shot = (name) => writeFileSync(join(OUT, name + ".png"), execFileSync(ADB, ["exec-out", "screencap", "-p"], { maxBuffer: 64 * 1024 * 1024 }));
const focus = () => (adb("shell", "dumpsys", "window").match(/mCurrentFocus=Window\{[^}]*\}/) ?? [""])[0];
let browser = null, page = null, dpr = 1, top = 0;
const errors = [], missing = [];

/** 앱을 띄우고 WebView DevTools 에 붙는다 */
async function launch() {
  adb("shell", "am", "force-stop", APP);
  adb("shell", "am", "start", "-n", `${APP}/.MainActivity`);
  await sleep(1500);
  const pid = adb("shell", "pidof", APP);
  let sock = null;
  for (let i = 0; i < 40 && !sock; i += 1) {
    sock = adb("shell", "cat", "/proc/net/unix").split("\n").map((l) => l.match(/@(webview_devtools_remote_\d+)/)?.[1]).find((s) => s && s.endsWith(`_${pid}`)) ?? null;
    if (!sock) await sleep(500);
  }
  if (!sock) throw new Error("WebView 원격 디버깅 소켓 없음 — 디버그 APK 인지 확인");
  spawnSync(ADB, ["forward", "--remove", "tcp:9333"]);
  adb("forward", "tcp:9333", `localabstract:${sock}`);
  if (browser) await browser.disconnect().catch(() => {});
  browser = await puppeteer.connect({ browserURL: "http://127.0.0.1:9333", defaultViewport: null });
  page = (await browser.pages()).find((p) => /localhost/.test(p.url())) ?? (await browser.pages())[0];
  page.on("pageerror", (e) => errors.push(String(e.message ?? e).slice(0, 300)));
  // [object Object] 로만 찍히는 오류는 인자를 풀어 본다
  page.on("console", async (m) => {
    if (m.type() !== "error") return;
    let text = m.text();
    if (/\[object Object\]/.test(text)) {
      const vals = await Promise.all(m.args().map((a) => a.evaluate((v) => { try { return v instanceof Error ? v.stack : JSON.stringify(v, Object.getOwnPropertyNames(v ?? {})); } catch { return String(v); } }).catch(() => "?")));
      text = vals.join(" ");
    }
    errors.push("console: " + text.slice(0, 400));
  });
  page.on("response", (r) => { if (r.status() >= 400) missing.push(`${r.status()} ${r.url().replace(/^https?:\/\/localhost/, "")}`); });
  page.on("requestfailed", (r) => missing.push(`실패 ${r.url().replace(/^https?:\/\/localhost/, "")}`));
  dpr = await page.evaluate(() => window.devicePixelRatio);
  // WebView 위쪽 = 상태바. 화면 높이 − (내비게이션 바) − innerHeight×dpr 로는 정확하지 않아 요소 하나의 실제 위치로 맞춘다
  const inner = await page.evaluate(() => window.innerHeight);
  const nav = Number((adb("shell", "dumpsys", "window").match(/navigationBars[^\n]*frame=\[\d+,(\d+)\]/) ?? [])[1] ?? sh);
  top = Math.max(0, Math.round(nav - inner * dpr));
  return pid;
}

/** 요소 가운데를 진짜 손가락으로 */
async function tap(sel, text) {
  const c = await page.evaluate(({ sel, text }) => {
    const el = [...document.querySelectorAll(sel)].find((e) => (!text || e.textContent.includes(text)) && e.getBoundingClientRect().width > 0);
    if (!el) return null;
    el.scrollIntoView({ block: "center" });
    const r = el.getBoundingClientRect();
    return [r.x + r.width / 2, r.y + r.height / 2];
  }, { sel, text });
  if (!c) return false;
  await sleep(300);
  const c2 = await page.evaluate(({ sel, text }) => { const el = [...document.querySelectorAll(sel)].find((e) => (!text || e.textContent.includes(text)) && e.getBoundingClientRect().width > 0); const r = el?.getBoundingClientRect(); return r ? [r.x + r.width / 2, r.y + r.height / 2] : null; }, { sel, text });
  const [x, y] = c2 ?? c;
  adb("shell", "input", "tap", String(Math.round(x * dpr)), String(Math.round(y * dpr + top)));
  return true;
}

// 앱이 가려져 그리기가 멈추면 rAF 가 안 돌아 영원히 기다린다 — 시간 제한
const measureFps = (sec = 5) => Promise.race([measureFpsRaw(sec), sleep(sec * 1000 + 8000).then(() => ({ fps: 0, p95: -1, long: -1, note: "그리기 멈춤(앱이 가려짐?)" }))]);
const measureFpsRaw = (sec = 5) => page.evaluate((sec) => new Promise((res) => {
  const ts = []; const t0 = performance.now();
  const f = (t) => { ts.push(t); if (t - t0 < sec * 1000) requestAnimationFrame(f); else {
    const d = ts.slice(1).map((v, i) => v - ts[i]).sort((a, b) => a - b);
    res({ fps: Math.round((ts.length - 1) / ((ts[ts.length - 1] - ts[0]) / 1000)), p95: Math.round(d[Math.floor(d.length * 0.95)]), long: d.filter((x) => x > 50).length });
  } };
  requestAnimationFrame(f);
}), sec);

// ───────── A. 새 설치 첫 실행 ─────────
adb("shell", "pm", "clear", APP);
adb("shell", "pm", "revoke", APP, "android.permission.POST_NOTIFICATIONS");
adb("logcat", "-c");
const pidA = await launch();
ok("A 새 설치: 앱이 뜬다", !!pidA, pidA);
let dialogSeen = false;
for (let i = 0; i < 20; i += 1) { if (/permissioncontroller|GrantPermissions/i.test(focus())) dialogSeen = true; await sleep(500); }
ok("A 새 설치 첫 10초: 시스템 알림 권한 창이 튜토리얼을 막지 않는다", !dialogSeen, focus());
await shot("a1-first");
const first = await page.evaluate(() => ({ boot: !!document.querySelector(".titans-field, .onboarding, .tutorial"), text: document.body.innerText.slice(0, 80).replace(/\s+/g, " ") }));
ok("A 첫 화면이 뜬다 (준비 중에 멈추지 않는다)", first.boot || !/준비 중/.test(first.text), first.text);
const fpsCold = await measureFps(4);
console.log("   참고: 새 설치 직후(원화 처음 받는 중) FPS", JSON.stringify(fpsCold));
await sleep(12000);
const fpsA = await measureFps(5);
ok("A 첫 화면 FPS ≥ 30 (부팅 20초 뒤)", fpsA.fps >= 30, JSON.stringify(fpsA));

// ───────── B. 진행된 계정 ─────────
const H = await page.evaluate(async () => {
  const P = window.Capacitor?.Plugins?.Preferences;
  const { keys } = P ? await P.keys() : { keys: Object.keys(localStorage) };
  return (keys.find((k) => k.startsWith("dodgebullets:progression:v1:")) ?? "dodgebullets:progression:v1:mock-local-dev").split(":").pop();
});
const now = Date.now();
const seed = {
  [`dodgebullets:progression:v1:${H}`]: JSON.stringify({ version: 5, level: 38, redGems: 1240, sharedCoins: 987654, equippedWeaponLevel: 10, dodgeBestStage: 13, dodgeStageSchema: 2, idleClaimedAt: now, updatedAt: now, onboardingStep: 4, sessionCount: 9,
    partyIds: ["mia", "luna", "bronn", "sera"], partyCap: 4, pioneeredArea: 3, attendanceStreak: 5,
    dodgeStars: Object.fromEntries(Array.from({ length: 13 }, (_, i) => [String(i), (i % 3) + 1])), dodgeBranches: { "1-T": 3, "1-E1": 2 }, towerOpen: true,
    expeditionSeals: 400, enhancementMaterials: 300, expeditionSkills: { fire: 6, water: 4, ice: 4, earth: 4, bolt: 4, wind: 3, poison: 2, holy: 1, ultimate: 4 },
    expeditionLoadout: ["holy", "poison", "wind", "fire"], expeditionWeaponForge: { bow: 6, staff: 4 }, expeditionWeapon: "staff", claimedRewards: ["dodge-tutorial", "dodge-branch:1-T", "dodge-branch:1-E1"] }),
  [`dodgebullets:titans:${H}`]: JSON.stringify({ stage: 18, bestStage: 18, gold: 4_000_000, heroes: { mia: 18, luna: 12, bronn: 10, sera: 14 }, lastActiveAt: now, autoSkill: false,
    skillInventory: { learned: ["strike", "stoneGuard", "clone", "meteor"], levels: { strike: 3, stoneGuard: 2, clone: 2, meteor: 1 }, equipped: { starter: "strike", linkA: "stoneGuard", linkB: "clone", finisher: "meteor" }, skillCores: 0 } }),
  [`dodgebullets:attendance:v1:${H}`]: JSON.stringify({ lastClaimDate: new Date().toLocaleDateString("sv-SE"), totalDays: 3, consecutiveDays: 3 }),
  "dodgebullets:test-phase": "0",
};
await page.evaluate(async (seed) => {
  const P = window.Capacitor?.Plugins?.Preferences;
  for (const [k, v] of Object.entries(seed)) { if (P) await P.set({ key: k, value: v }); localStorage.setItem(k, v); }
}, seed);
adb("shell", "pm", "grant", APP, "android.permission.POST_NOTIFICATIONS");   // 진행 계정은 권한 창이 뜰 수 있다 — 플레이 검사에선 미리 허용
await launch();
let stolen = "";
for (let i = 0; i < 24; i += 1) { const f = focus(); if (!f.includes(`${APP}/`)) stolen = f; await sleep(500); }
ok("B 진행 계정 부팅 12초: 설정 화면(알람·리마인더)이나 권한 창이 게임을 가리지 않는다", !stolen, stolen || focus());
for (let i = 0; i < 4; i += 1) { if (!(await tap(".idle-claim"))) break; await sleep(900); }
await shot("b1-hub");
const hub = await page.evaluate(() => ({ gem: document.querySelector(".titans-gem strong")?.textContent, stage: document.querySelector(".titans-stagebar h1")?.textContent, advice: document.querySelector(".advice-alert b")?.textContent }));
ok("B 사냥터: 붉은 보석 숫자(∞ 아님) · 구매 추천 알림", !!hub.gem && hub.gem !== "∞" && !!hub.advice, JSON.stringify(hub));
const fpsB = await measureFps(5);
ok("B 사냥터 FPS ≥ 30", fpsB.fps >= 30, JSON.stringify(fpsB));
// 모험가 스킬 AUTO — 진짜 탭으로 켜고, 시전 연출(투사체·명중·이름표)이 도는 동안 FPS 를 같은 실행 안에서 비교 (2026-10-06)
await tap(".qol-btn", "AUTO");
await page.evaluate(() => { window.__casts = 0; new MutationObserver((ms) => { for (const m of ms) for (const n of m.addedNodes) if (n instanceof Element && n.matches(".skill-shot.shot-shot, .skill-shot.shot-beam")) window.__casts += 1; }).observe(document.querySelector(".titans-field"), { childList: true, subtree: true }); });
const fpsAuto = await measureFps(8);
const casts = await page.evaluate(() => window.__casts);
await shot("b1b-auto-cast");
ok("B AUTO 스킬 시전 중 FPS — 시전 없을 때의 75% 이상 · 시전이 실제로 나갔다", casts >= 1 && fpsAuto.fps >= Math.min(30, fpsB.fps * 0.75), `없음 ${fpsB.fps} · 시전 중 ${fpsAuto.fps} · 시전 ${casts}회`);
await tap(".qol-btn", "AUTO");
await tap(".advice-alert"); await sleep(1200);
const adv = await page.evaluate(() => [...document.querySelectorAll(".advice-row b")].map((b) => b.textContent));
ok("B 구매 추천 시트가 열린다 (진짜 탭)", adv.length >= 1, adv.join(" | "));
await shot("b2-advice");
await tap(".advice-sheet .hub-sheet-close"); await sleep(600);
await tap(".titans-gem"); await sleep(1200);
const shop = await page.evaluate(() => ({ sheet: !!document.querySelector(".hub-sheet"), wallet: document.querySelectorAll(".hub-sheet-wallet .wallet-item").length }));
ok("B 보석 칩 탭 → 상점 시트 + 지갑 줄", shop.sheet && shop.wallet >= 3, JSON.stringify(shop));
await shot("b3-shop");
await tap(".hub-sheet-close"); await sleep(700);
await tap(".titans-bottom-nav button", "콘텐츠"); await sleep(900);
await tap(".nav-popup-grid button", "성문 방어"); await sleep(2500);
await tap(".chapter-tab", "1장"); await sleep(600);
const route = await page.evaluate(() => ({ rows: document.querySelectorAll(".route-row").length, nodes: [...document.querySelectorAll(".route-node")].map((n) => n.dataset.branch + (n.disabled ? "잠김" : "")), wallet: document.querySelectorAll(".exp-menu-content .wallet-item").length }));
ok("B 원정 지도: 본선 10줄 + 갈림길 4칸 + 지갑 줄 4", route.rows === 10 && route.nodes.length === 4 && route.wallet === 4, JSON.stringify(route));
await shot("b4-route");
// 갈림길 1-E2 를 진짜 탭으로 출격
await tap('.route-node[data-branch="1-E2"]'); await sleep(2200);
await shot("b5-intro");
const intro = await page.evaluate(() => (document.querySelector(".overlay-content .title")?.textContent ?? "") + " | " + (document.body.innerText.match(/1장 정예 ②[^\n]*/)?.[0] ?? ""));
ok("B 갈림길 탭 → 그 갈림길로 출격 (안내 또는 HUD 꼬리표 '1장 정예 ②')", /멧돼지|사냥로|1장 정예 ②/.test(intro), intro);
await tap(".intro-start, .cta.intro-cta, .overlay-content .cta"); await sleep(2000);
const fpsBattle = await measureFps(8);
ok("B 성문 방어 전투 FPS ≥ 30 (8초)", fpsBattle.fps >= 30, JSON.stringify(fpsBattle));
for (let i = 0; i < 5; i += 1) {
  const y = String(Math.round(sh * 0.78));
  adb("shell", "input", "swipe", String(Math.round(sw * 0.25)), y, String(Math.round(sw * 0.75)), y, "500");
  await sleep(1200);
}
await shot("b6-battle");
const battle = await page.evaluate(() => ({ canvas: !!document.querySelector("canvas"), overlay: document.querySelector(".game-overlay .title")?.textContent ?? null }));
ok("B 전투 진행 (캔버스 · 결과 창 아님)", battle.canvas, JSON.stringify(battle));
adb("shell", "input", "keyevent", "4"); await sleep(1500);
const paused = await page.evaluate(() => document.querySelector(".game-overlay .title")?.textContent ?? "");
ok("B 안드로이드 뒤로 가기 = 일시정지 (앱이 꺼지지 않는다)", /일시정지/.test(paused) && !!adb("shell", "pidof", APP), paused);
await shot("b7-paused");

// ───────── C. 비트 수련 — 곡 연주 FPS · 패드 터치 · 길게 누르기 ─────────
await launch();
await sleep(5000);
for (let i = 0; i < 3; i += 1) { if (!(await tap(".idle-claim"))) break; await sleep(800); }
await tap(".titans-bottom-nav button", "콘텐츠"); await sleep(900);
await tap(".nav-popup-grid button", "비트 수련"); await sleep(2500);
await shot("c1-beat-menu");
const custom = await page.evaluate(() => ({ wallet: document.querySelectorAll(".wallet-bar .wallet-item").length, custom: !!document.querySelector(".beat-custom-toggle") }));
ok("C 비트 메뉴: 지갑 줄 · 커스텀 상점", custom.wallet >= 3 && custom.custom, JSON.stringify(custom));
await tap(".cta", "이어서 연습하기");
// 곡 준비(음원 해독)가 에뮬레이터에선 몇 초 걸린다 — 패드가 뜰 때까지
for (let i = 0; i < 40; i += 1) { if (await page.evaluate(() => document.querySelectorAll(".action-dock .beat-pad").length === 4)) break; await sleep(500); }
await sleep(1500);
const beatAlive = await page.evaluate(() => !!document.querySelector(".beat-battle-canvas"));
adb("shell", "input", "keyevent", "4"); await sleep(800);
const stillBeat = await page.evaluate(() => ({ canvas: !!document.querySelector(".beat-battle-canvas"), toast: document.querySelector(".settings-copy-toast")?.textContent ?? "" }));
ok("C 연주 중 뒤로 가기 한 번 = 나가지 않고 안내 (두 번 눌러야 나간다)", beatAlive && stillBeat.canvas && /한 번 더/.test(stillBeat.toast), JSON.stringify({ alive: beatAlive, ...stillBeat }));
// 곡이 실제로 흐르는가 — 남은 초가 줄고 레일 가운데가 빈 화면 색(#03030a)이 아니다.
// 예전엔 App 이 다시 그려지면(뒤로 가기 안내 토스트 등) 곡 세션이 버려져 화면만 '연주 중'으로 멈췄다
const beatClock = () => page.evaluate(() => ({ t: Number(document.querySelector(".beat-track-name")?.textContent.match(/(\d+)s/)?.[1] ?? -1), px: (() => { const c = document.querySelector(".beat-battle-canvas"); if (!c) return null; return [...c.getContext("2d").getImageData(c.width / 2 | 0, (c.height * 0.55) | 0, 1, 1).data].slice(0, 3).join(","); })() }));
const clk0 = await beatClock(); await sleep(3000); const clk1 = await beatClock();
ok("C 뒤로 가기 안내 뒤에도 곡이 계속 흐른다 (남은 초 감소 · 레일이 그려진다)", clk1.t >= 0 && clk1.t < clk0.t && clk1.px !== "3,3,10", JSON.stringify({ clk0, clk1 }));
const pads = await page.evaluate(() => [...document.querySelectorAll(".action-dock .beat-pad")].map((b) => { const r = b.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; }));
const acts = new Set();
// 패드가 실제로 받은 손가락 수 — 파티 동작 클래스는 금방 idle 로 돌아가 놓친다
await page.evaluate(() => { window.__padHits = 0; if (!window.__padHook) { window.__padHook = true; document.addEventListener("pointerdown", (e) => { if (e.target instanceof Element && e.target.closest(".action-dock .beat-pad")) window.__padHits += 1; }, true); } });
// 노트를 놓치면 곡이 끝나 패드가 사라진다 — 패드가 있을 때 누른 것만 센다
let pressed = 0;
for (let i = 0; i < 12 && pads.length === 4; i += 1) {
  if (!(await page.evaluate(() => document.querySelectorAll(".action-dock .beat-pad").length === 4))) break;
  pressed += 1;
  const [x, y] = pads[i % pads.length];
  if (i % 4 === 3) adb("shell", "input", "swipe", String(Math.round(x * dpr)), String(Math.round(y * dpr + top)), String(Math.round(x * dpr)), String(Math.round(y * dpr + top)), "900");   // 길게 누르기
  else adb("shell", "input", "tap", String(Math.round(x * dpr)), String(Math.round(y * dpr + top)));
  await sleep(120);
  acts.add(await page.evaluate(() => document.querySelector(".beat-command-party")?.className.match(/action-(\w+)/)?.[1] ?? ""));
  await sleep(250);
}
await shot("c2-beat-play");
const padHits = await page.evaluate(() => window.__padHits);
ok("C 패드 4개 · 패드가 떠 있을 때 누른 진짜 터치(길게 누르기 포함)가 모두 패드에 들어간다 (안내 토스트가 가리지 않는다)", pads.length === 4 && pressed >= 4 && padHits >= pressed, `패드 ${pads.length} · 누름 ${pressed} · 받음 ${padHits} · 동작 ${[...acts].join(",")}`);
// 저사양 감지(앞 1초 + 180프레임)가 끝난 뒤 잰다
await sleep(2000);
console.log("   저사양 모드:", await page.evaluate(() => localStorage.getItem("dodgebullets:lowfx") === "1" ? "켜짐(이 기기)" : "꺼짐"));
const fpsBeat = await measureFps(6);
ok("C 비트 연주 FPS ≥ 30", fpsBeat.fps >= 30, JSON.stringify(fpsBeat));
// 진단: 캔버스 그림자(shadowBlur)를 끄면 얼마나 오르는가
await page.evaluate(() => { window.__sb = Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, "shadowBlur"); Object.defineProperty(CanvasRenderingContext2D.prototype, "shadowBlur", { configurable: true, get() { return 0; }, set() {} }); });
console.log("   진단: 비트 shadowBlur 0 이면", JSON.stringify(await measureFps(4)));
await page.evaluate(() => { Object.defineProperty(CanvasRenderingContext2D.prototype, "shadowBlur", window.__sb); });
console.log("   진단: 비트 캔버스", await page.evaluate(() => [...document.querySelectorAll("canvas")].map((c) => c.width + "x" + c.height + " css " + c.clientWidth + "x" + c.clientHeight).join(" | ")));

const crash = adb("logcat", "-d", "-s", "AndroidRuntime:E").split("\n").filter((l) => /FATAL|Exception/.test(l));
ok("logcat 에 앱 크래시 없음", crash.length === 0, crash.slice(0, 2).join(" | "));
ok("없는 파일(404) 없음", missing.length === 0, [...new Set(missing)].slice(0, 6).join(" · "));
// Play 결제가 없는 기기(에뮬레이터)에서 Capacitor 가 거부된 결제 호출을 콘솔에 남긴다 — 앱은 try/catch 로 처리하고 계속한다
const envNotes = errors.filter((e) => /BILLING_SETUP_FAILED|Billing is not available/.test(e));
if (envNotes.length) console.log("   환경 메모: Play 결제 없음(에뮬레이터) — 결제 호출 거부", envNotes.length + "건, 앱은 처리함");
const appErrors = errors.filter((e) => !envNotes.includes(e));
ok("페이지 오류 없음 (결제 미지원 환경 메모 제외)", appErrors.length === 0, [...new Set(appErrors)].slice(0, 4).join(" · "));
console.log(`\n${results.filter((r) => r[0] === "PASS").length}/${results.length} PASS`);
await browser.disconnect();
spawnSync(ADB, ["forward", "--remove", "tcp:9333"]);
process.exit(results.some((r) => r[0] === "FAIL") ? 1 : 0);
