/**
 * 에뮬레이터 크롬에서 가로 전체 화면 실검사 (2026-10-14, 사용자: "가로모드에 콘텐츠가 전체화면이 안 되어 있네").
 *   node scripts/device-fullscreen.mjs [outDir]   (vite 5173 · 에뮬레이터 연결 · 크롬 설치)
 * adb reverse 로 로컬 서버를 열고 크롬을 가로로 돌린 뒤, DevTools 터치(사용자 제스처)로 설정 → 전체 화면을 눌러
 * document.fullscreenElement 와 보이는 높이(innerHeight)가 커지는지 잰다. 끝나면 회전 설정을 되돌린다.
 */
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
import puppeteer from "puppeteer";

const OUT = process.argv[2] ?? "shots-device-fs"; mkdirSync(OUT, { recursive: true });
const ADB = process.env.ADB ?? join(process.env.LOCALAPPDATA ?? "", "Android/Sdk/platform-tools/adb.exe");
const adb = (...a) => execFileSync(ADB, a, { encoding: "utf8", maxBuffer: 64 << 20 }).trim();
const cap = () => execFileSync(ADB, ["exec-out", "screencap", "-p"], { maxBuffer: 64 << 20 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = []; const ok = (n, c, d = "") => results.push([c ? "PASS" : "FAIL", n, d]);
const H = "mock-local-dev", now = Date.now();
const PORT = process.env.PORT ?? "5175";   // 127.0.0.1 에 묶인 vite(launch.json vite-device) — 기본 vite 는 ::1 에만 붙어 adb reverse 가 빈 응답을 받는다

const rotBefore = { acc: adb("shell", "settings", "get", "system", "accelerometer_rotation"), user: adb("shell", "settings", "get", "system", "user_rotation") };
let browser;
try {
  adb("reverse", `tcp:${PORT}`, `tcp:${PORT}`);
  // 첫 실행 안내(FRE)를 건너뛴다 — 디버그 앱으로 지정해야 command-line 파일을 읽는다
  adb("shell", "am", "set-debug-app", "--persistent", "com.android.chrome");
  adb("shell", "sh", "-c", "'echo \"_ --disable-fre --no-default-browser-check --no-first-run\" > /data/local/tmp/chrome-command-line'");
  adb("shell", "am", "force-stop", "com.android.chrome");
  adb("shell", "settings", "put", "system", "accelerometer_rotation", "0");
  adb("shell", "settings", "put", "system", "user_rotation", "1");   // 가로
  adb("shell", "am", "start", "-n", "com.android.chrome/com.google.android.apps.chrome.Main", "-a", "android.intent.action.VIEW", "-d", `http://localhost:${PORT}/`);
  await sleep(6000);
  // 크롬 첫 실행 안내(알림 권유)가 뜨면 "No thanks" — 개인정보 쪽 기본값
  try { const xml = adb("exec-out", "uiautomator", "dump", "/dev/tty"); const m = xml.match(/text="No thanks"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/); if (m) { adb("shell", "input", "tap", String((+m[1] + +m[3]) >> 1), String((+m[2] + +m[4]) >> 1)); await sleep(1500); } } catch { /* */ }
  adb("forward", "tcp:9334", "localabstract:chrome_devtools_remote");
  for (let i = 0; i < 45 && !browser; i += 1) { try { browser = await puppeteer.connect({ browserURL: "http://127.0.0.1:9334", defaultViewport: null }); } catch { await sleep(1000); } }
  if (!browser) throw new Error("크롬 DevTools 연결 실패");
  let page = null;
  // 안드로이드 크롬은 pages() 가 비어 있을 때가 있다 → 타깃에서 직접 연다
  try { const t = await browser.waitForTarget((x) => x.type() === "page" && x.url().startsWith(`http://localhost:${PORT}`), { timeout: 20000 }); page = await t.page(); } catch { /* */ }
  if (!page) throw new Error("크롬 탭을 못 찾음");
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: "networkidle0", timeout: 60000 });
  const origin = await page.evaluate(() => location.origin);
  if (origin !== `http://localhost:${PORT}`) throw new Error("게임이 안 열림: " + origin);
  const progress = { version: 5, level: 40, sharedCoins: 9999, dodgeBestStage: 3, idleClaimedAt: now, updatedAt: now, onboardingStep: 4, partyIds: ["mia", "garen", "luna", "leon"], partyCap: 4, redGems: 50, claimedRewards: ["dodge-tutorial"], pioneeredArea: 3 };
  const titans = { gold: 40000, stage: 9, bestStage: 9, heroes: { mia: 3, garen: 2, luna: 2, leon: 2 }, lastActiveAt: now };
  await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); }, { [`dodgebullets:progression:v1:${H}`]: JSON.stringify(progress), [`dodgebullets:titans:${H}`]: JSON.stringify(titans), "dodge-bullets:soundEnabled": "0", "dodgebullets:test-phase": "0" });
  await page.reload({ waitUntil: "networkidle0" }); await sleep(4000);
  await page.evaluate(() => { for (let k = 0; k < 4; k += 1) { const c = document.querySelector(".idle-claim"); if (c) { c.click(); continue; } const b = [...document.querySelectorAll("button")].filter((x) => /^(닫기|확인|나중에)$/.test(x.textContent.trim()))[0]; if (b) b.click(); } });
  await sleep(800);
  const before = await page.evaluate(() => ({ w: innerWidth, h: innerHeight, sh: screen.height, sw: screen.width, fs: !!document.fullscreenElement, landscape: matchMedia("(orientation: landscape)").matches, rail: getComputedStyle(document.querySelector(".titans-bottom-nav") ?? document.body).position }));
  cap(); // 첫 캡처는 버린다(가끔 검은 화면)
  writeFileSync(`${OUT}/1-before.png`, cap());
  ok("가로: 크롬이 가로(landscape)로 그린다 · 하단 바가 오른쪽 레일(fixed)", before.landscape && before.rail === "fixed", JSON.stringify(before));
  const item = await page.evaluate(() => { [...document.querySelectorAll(".titans-bottom-nav button")].find((b) => b.textContent.includes("설정"))?.click(); return true; });
  await sleep(600);
  const label = await page.evaluate(() => document.querySelector(".settings-fullscreen")?.textContent ?? null);
  ok("설정 메뉴에 '전체 화면 켜기'가 있다(크롬은 Fullscreen API 지원)", !!item && /전체 화면.*켜기/.test(label ?? ""), String(label));
  await page.tap(".settings-fullscreen");   // CDP 터치 = 사용자 제스처
  await sleep(4500);   // 전환 애니메이션·"위에서 끌어 나가기" 안내가 사라질 때까지
  const after = await page.evaluate(() => ({ w: innerWidth, h: innerHeight, fs: !!document.fullscreenElement, field: (() => { const r = document.querySelector(".titans-field")?.getBoundingClientRect(); return r ? Math.round(r.height) : 0; })() }));
  writeFileSync(`${OUT}/2-fullscreen.png`, cap());
  ok("전체 화면이 켜지고 보이는 높이가 늘어난다(주소창·도구줄 숨김)", after.fs && after.h > before.h, `${before.h} → ${after.h} · field ${after.field}`);
  ok("전체 화면에서도 사냥터가 화면 높이를 채운다(필드 ≥ 화면 높이의 75%)", after.field >= after.h * 0.75, `${after.field}/${after.h}`);
  await page.evaluate(() => document.exitFullscreen?.().catch(() => undefined));
  await sleep(800);
  // 인앱 → 크롬 탈출 주소(안드로이드 intent)가 실제 안드로이드에서 크롬으로 열리는가 — 게임 코드(fullscreen.ts)가 만든 주소 그대로를 링크로 눌러 본다
  const intentUrl = await page.evaluate(async () => {
    const m = await import("/src/ui/fullscreen.ts");
    return m.externalOpenUrl("naver", `${location.origin}/?intent-ok=1`, "Mozilla/5.0 (Linux; Android 14; wv) AppleWebKit/537.36 Chrome/129.0 Mobile Safari/537.36 NAVER(inapp; search; 2000; 12.6.4)");
  });
  await page.evaluate((u) => { const a = document.createElement("a"); a.id = "intent-probe"; a.href = u; a.textContent = "intent"; a.style.cssText = "position:fixed;left:40px;top:40px;z-index:9999;padding:20px;background:#fff"; document.body.appendChild(a); }, intentUrl);
  await page.tap("#intent-probe");
  let opened = false;
  for (let i = 0; i < 12 && !opened; i += 1) { await sleep(1000); opened = (await browser.targets()).some((t) => t.url().includes("intent-ok=1")); }
  writeFileSync(`${OUT}/3-intent.png`, cap());
  ok("인앱 탈출 intent 주소(fullscreen.ts 생성)가 안드로이드 크롬에서 그 페이지를 연다", !!intentUrl && opened, String(intentUrl).slice(0, 120));
} catch (e) {
  ok("실행", false, String(e).slice(0, 300));
} finally {
  try { await browser?.disconnect(); } catch { /* */ }
  try {
    adb("shell", "settings", "put", "system", "user_rotation", rotBefore.user === "null" ? "0" : rotBefore.user);
    adb("shell", "settings", "put", "system", "accelerometer_rotation", rotBefore.acc === "null" ? "1" : rotBefore.acc);
    adb("shell", "am", "clear-debug-app");
    adb("forward", "--remove", "tcp:9334");
  } catch { /* */ }
}
for (const [s, n, d] of results) console.log(s, n, d ? "— " + d : "");
const fails = results.filter((r) => r[0] === "FAIL").length;
console.log(fails ? `\n${fails} FAIL` : "\nALL PASS");
process.exit(fails ? 1 : 0);
