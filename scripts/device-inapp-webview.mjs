/**
 * 진짜 안드로이드 WebView(카카오톡 인앱 브라우저와 같은 Android System WebView)에서 카카오톡 UA 로 웹 빌드를 열어 가로 화면을 잰다 (2026-10-14).
 *   node scripts/device-inapp-webview.mjs [outDir]   (에뮬레이터 + 디버그 APK 설치)
 * 카카오톡 앱은 계정 로그인이 필요해 설치 검사를 못 한다 — 대신 같은 엔진(WebView)·같은 UA·같은 "웹 페이지" 조건으로:
 *   ① 가로에서 게임이 보이는 영역을 꽉 채우는가(스크롤 0 · 필드+레일이 가로 95% 이상 · 필드가 세로 75% 이상)
 *   ② 인앱 안내 띠·설정의 "브라우저로 열기"가 뜨고, 그 버튼이 kakaotalk://web/openExternal 로 가는가
 * 디버그 APK 의 WebView 는 http 를 막아 앱에 번들된 같은 웹 빌드(https://localhost)를 쓰고, 네이티브 브리지(window.Capacitor)가
 * 붙지 못하게 막아 웹 페이지로 돌린다. 앱 기본값(세로 고정)은 웹에선 못 거는 고정이라 '자동'으로 두고 다시 띄운다.
 * 끝나면 회전 설정·방향 설정을 되돌린다.
 */
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
import puppeteer from "puppeteer";

const OUT = process.argv[2] ?? "shots-inapp-webview"; mkdirSync(OUT, { recursive: true });
const ADB = process.env.ADB ?? join(process.env.LOCALAPPDATA ?? "", "Android/Sdk/platform-tools/adb.exe");
const APP = "com.ccommit.dodgelab";
const KAKAO_UA = "Mozilla/5.0 (Linux; Android 14; SM-S921N Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/133.0.6943.137 Mobile Safari/537.36;KAKAOTALK 2410850";
const adb = (...a) => execFileSync(ADB, a, { encoding: "utf8", maxBuffer: 64 << 20 }).trim();
const cap = () => execFileSync(ADB, ["exec-out", "screencap", "-p"], { maxBuffer: 64 << 20 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = []; const ok = (n, c, d = "") => results.push([c ? "PASS" : "FAIL", n, d]);
const H = "mock-local-dev";

let browser = null;
async function connectApp() {
  adb("shell", "am", "force-stop", APP);
  adb("shell", "am", "start", "-n", `${APP}/.MainActivity`);
  await sleep(2500);
  const pid = adb("shell", "pidof", APP);
  let sock = null;
  for (let i = 0; i < 40 && !sock; i += 1) {
    sock = adb("shell", "cat", "/proc/net/unix").split("\n").map((l) => l.match(/@(webview_devtools_remote_[0-9]+)/)?.[1]).find((x) => x && x.endsWith(`_${pid}`)) ?? null;
    if (!sock) await sleep(500);
  }
  if (!sock) throw new Error("WebView 디버깅 소켓 없음");
  try { adb("forward", "--remove", "tcp:9335"); } catch { /* 없으면 그만 */ }
  adb("forward", "tcp:9335", `localabstract:${sock}`);
  if (browser) await browser.disconnect().catch(() => {});
  browser = null;
  for (let i = 0; i < 30 && !browser; i += 1) { try { browser = await puppeteer.connect({ browserURL: "http://127.0.0.1:9335", defaultViewport: null }); } catch { await sleep(1000); } }
  if (!browser) throw new Error("WebView DevTools 연결 실패");
  const t = await browser.waitForTarget((x) => x.type() === "page", { timeout: 20000 });
  return t.page();
}

const rot = { acc: adb("shell", "settings", "get", "system", "accelerometer_rotation"), user: adb("shell", "settings", "get", "system", "user_rotation") };
let page = null;
try {
  adb("shell", "settings", "put", "system", "accelerometer_rotation", "0");
  adb("shell", "settings", "put", "system", "user_rotation", "1");   // 가로
  // 앱(네이티브)의 세로 요청을 시스템이 무시하게 — 웹 페이지(카카오톡 인앱)는 방향을 고정하지 못하므로 같은 조건
  adb("shell", "cmd", "window", "set-ignore-orientation-request", "true");
  page = await connectApp();
  await page.evaluate(() => localStorage.setItem("dodgebullets:orientation", "auto"));
  await sleep(500);
  page = await connectApp();
  await sleep(1500);
  const engine = await page.evaluate(() => navigator.userAgent);
  await page.setUserAgent(KAKAO_UA);
  await page.evaluateOnNewDocument(() => { try { Object.defineProperty(window, "Capacitor", { value: undefined, writable: false, configurable: false }); } catch { /* */ } });
  const appUrl = new URL(page.url()).origin + "/";
  await page.goto(appUrl, { waitUntil: "networkidle0", timeout: 60000 });
  const now = Date.now();
  const progress = { version: 5, level: 40, sharedCoins: 9999, dodgeBestStage: 3, idleClaimedAt: now, updatedAt: now, onboardingStep: 4, partyIds: ["mia", "garen", "luna", "leon"], partyCap: 4, redGems: 50, claimedRewards: ["dodge-tutorial"], pioneeredArea: 3 };
  const titans = { gold: 40000, stage: 9, bestStage: 9, heroes: { mia: 3, garen: 2, luna: 2, leon: 2 }, lastActiveAt: now };
  await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); }, { [`dodgebullets:progression:v1:${H}`]: JSON.stringify(progress), [`dodgebullets:titans:${H}`]: JSON.stringify(titans), "dodge-bullets:soundEnabled": "0", "dodgebullets:test-phase": "0", "dodgebullets:orientation": "auto" });
  await page.reload({ waitUntil: "networkidle0" }); await sleep(3500);
  await page.evaluate(() => { for (let k = 0; k < 4; k += 1) { const c = document.querySelector(".idle-claim"); if (c) { c.click(); continue; } const b = [...document.querySelectorAll("button")].filter((x) => /^(닫기|확인|나중에)$/.test(x.textContent.trim()))[0]; if (b) b.click(); } });
  await sleep(1000);
  const m = await page.evaluate(() => {
    const r = (sel) => { const b = document.querySelector(sel)?.getBoundingClientRect(); return b ? { l: Math.round(b.left), t: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height), r: Math.round(b.right), b: Math.round(b.bottom) } : null; };
    return { ua: navigator.userAgent, native: !!window.Capacitor?.isNativePlatform?.(), vw: innerWidth, vh: innerHeight, scrollH: document.documentElement.scrollHeight, scrollW: document.documentElement.scrollWidth, landscape: matchMedia("(orientation: landscape)").matches,
      field: r(".titans-field"), rail: r(".titans-bottom-nav"), hint: document.querySelector(".inapp-fs-hint")?.textContent ?? null };
  });
  writeFileSync(`${OUT}/1-kakao-ua-landscape.png`, cap());
  ok("진짜 안드로이드 WebView 엔진 · 카카오톡 UA · 웹 페이지(브리지 없음) · 가로", /wv\)/.test(engine) && /KAKAOTALK/.test(m.ua) && m.landscape && !m.native, `engine=${engine.match(/Chrome\/[0-9.]+/)?.[0]} native=${m.native} ${m.vw}×${m.vh}`);
  ok("가로에서 스크롤 없음(화면 밖으로 넘치는 내용 0)", m.scrollH <= m.vh + 1 && m.scrollW <= m.vw + 1, `scroll ${m.scrollW}×${m.scrollH} / view ${m.vw}×${m.vh}`);
  ok("사냥터 필드 + 오른쪽 레일이 가로 폭의 95% 이상 · 필드가 세로 75% 이상", !!m.field && !!m.rail && (m.rail.r - m.field.l) >= m.vw * 0.95 && m.field.h >= m.vh * 0.75, JSON.stringify({ field: m.field, rail: m.rail }));
  ok("인앱 안내 띠가 뜬다(카카오톡 → 브라우저로 열기)", !!m.hint && /카카오톡/.test(m.hint), String(m.hint));
  // 설정 메뉴 항목
  await page.evaluate(() => [...document.querySelectorAll(".titans-bottom-nav button")].find((b) => b.textContent.includes("설정"))?.click());
  await sleep(600);
  const item = await page.evaluate(() => document.querySelector(".settings-fullscreen")?.textContent ?? null);
  writeFileSync(`${OUT}/2-menu.png`, cap());
  ok("설정의 전체 화면 항목이 '브라우저로 열기'", /브라우저로 열기/.test(item ?? ""), String(item));
  await page.evaluate(() => [...document.querySelectorAll(".titans-bottom-nav button")].find((b) => b.textContent.includes("설정"))?.click());
  await sleep(400);
  // 안내 띠 버튼 → kakaotalk://web/openExternal — WebView 가 실제로 그 주소로 이동을 시도하는지 CDP 이동 이벤트로 잡는다
  const navs = [];
  const cdp = await page.target().createCDPSession();
  await cdp.send("Page.enable");
  cdp.on("Page.frameRequestedNavigation", (e) => navs.push(e.url));
  cdp.on("Page.frameStartedNavigating", (e) => navs.push(e.url));
  await page.evaluate(() => { const b = [...document.querySelectorAll(".inapp-fs-hint button")].find((x) => /브라우저로/.test(x.textContent)); b?.click(); });
  await sleep(2000);
  const target = navs.find((u) => u.startsWith("kakaotalk:")) ?? navs[0] ?? null;
  ok("안내 띠 버튼이 kakaotalk://web/openExternal?url=(이 페이지 주소) 로 이동한다", !!target && target.startsWith("kakaotalk://web/openExternal?url=" + encodeURIComponent(appUrl).slice(0, 18)), String(target).slice(0, 140));
} catch (e) {
  ok("실행", false, String(e).slice(0, 300));
} finally {
  try { await page?.evaluate(() => localStorage.removeItem("dodgebullets:orientation")); } catch { /* */ }
  try { await browser?.disconnect(); } catch { /* */ }
  try {
    adb("shell", "settings", "put", "system", "user_rotation", rot.user === "null" ? "0" : rot.user);
    adb("shell", "settings", "put", "system", "accelerometer_rotation", rot.acc === "null" ? "1" : rot.acc);
    adb("shell", "cmd", "window", "set-ignore-orientation-request", "false");
    try { adb("forward", "--remove", "tcp:9335"); } catch { /* */ }
    adb("shell", "am", "force-stop", APP);
  } catch { /* */ }
}
for (const [s, n, d] of results) console.log(s, n, d ? "— " + d : "");
const fails = results.filter((r) => r[0] === "FAIL").length;
console.log(fails ? `\n${fails} FAIL` : "\nALL PASS");
process.exit(fails ? 1 : 0);
