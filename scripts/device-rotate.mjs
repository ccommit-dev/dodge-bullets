/**
 * 에뮬레이터/실기기 화면 방향 검사 (2026-10-07, 사용자: "모바일 세로모드를 지원기능 추가").
 * 설정의 '화면 방향'(세로 → 자동 → 가로)을 앱 안에서 바꾸고, 안드로이드가 실제로 돌았는지(dumpsys 의 rotation · WebView innerWidth/innerHeight)와
 * 가로 레이아웃(사냥터가 왼쪽, 성장 탭이 오른쪽 · 가로 스크롤 없음)을 잰다. 끝에 세로로 되돌린다.
 *   node scripts/device-rotate.mjs [outDir]   (앱이 떠 있어야 한다 — device-play.mjs 뒤에)
 */
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import puppeteer from "puppeteer";

const OUT = process.argv[2] ?? "store/device";
mkdirSync(OUT, { recursive: true });
const APP = "com.ccommit.dodgelab";
const ADB = process.env.ADB ?? join(process.env.LOCALAPPDATA ?? "", "Android/Sdk/platform-tools/adb.exe");
const adb = (...a) => execFileSync(ADB, a, { encoding: "utf8" }).trim();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const shot = (name) => writeFileSync(join(OUT, name), execFileSync(ADB, ["exec-out", "screencap", "-p"], { maxBuffer: 64 << 20 }));
const rotation = () => Number(adb("shell", "dumpsys", "window").match(/mCurrentRotation=ROTATION_(\d+)|rotation=(\d+)/)?.[1] ?? adb("shell", "settings", "get", "system", "user_rotation"));

// 앱을 앞으로
adb("shell", "monkey", "-p", APP, "-c", "android.intent.category.LAUNCHER", "1");
await sleep(4000);
const pid = adb("shell", "pidof", APP);
const sock = adb("shell", "cat", "/proc/net/unix").split("\n").map((l) => l.match(/@(webview_devtools_remote_\d+)/)?.[1]).find((s) => s?.endsWith(`_${pid}`));
spawnSync(ADB, ["forward", "--remove", "tcp:9338"]);
adb("forward", "tcp:9338", `localabstract:${sock}`);
const browser = await puppeteer.connect({ browserURL: "http://127.0.0.1:9338", defaultViewport: null, protocolTimeout: 90000 });
const page = (await browser.pages()).find((p) => /localhost/.test(p.url()));
// 어느 화면에 있든(device-play 가 비트 결과 창에 두고 끝난다) 허브로 — 새로 고침 뒤 방치 보상·출석 창을 닫는다
await page.evaluate(() => location.reload());
await sleep(7000);
for (let k = 0; k < 5; k += 1) { await page.evaluate(() => { document.querySelectorAll(".idle-claim").forEach((b) => b.click()); [...document.querySelectorAll(".cta, button")].find((b) => /보상 받기|확인|닫기/.test(b.textContent) && b.closest("[role=dialog], .modal, .overlay"))?.click(); }); await sleep(500); }
const results = [];
const ok = (name, cond, extra = "") => { results.push({ name, ok: !!cond, extra }); console.log(cond ? "PASS" : "FAIL", name, extra); };

const facts = () => page.evaluate(() => {
  const r = (s) => document.querySelector(s)?.getBoundingClientRect();
  const f = r(".titans-field"), tabs = r(".titans-growth-tabs");
  return {
    w: innerWidth, h: innerHeight, type: screen.orientation?.type,
    pref: localStorage.getItem("dodgebullets:orientation"),
    label: document.querySelector(".settings-orientation b")?.textContent ?? null,
    tabsRightOfField: !!(f && tabs && tabs.x >= f.x + f.width - 2),
    hScroll: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  };
});
const clickSettings = async () => {
  // 메뉴가 닫혀 있을 때만 토글(열린 채 토글하면 닫힌다)
  await page.evaluate(() => { if (!document.querySelector(".settings-orientation")) document.querySelector(".settings-toggle")?.click(); });
  await sleep(500);
  return page.evaluate(() => { const b = document.querySelector(".settings-orientation"); if (!b) return null; const before = b.querySelector("b")?.textContent; b.click(); return before; });
};

const f0 = await facts();
ok("기본 세로(설정 없음/세로) · 세로 화면", (f0.pref === null || f0.pref === "portrait") && f0.h > f0.w, JSON.stringify(f0));
shot("rot-portrait.png");

// 세로 → 자동: 기기를 가로로 돌리면 따라간다
await clickSettings(); await sleep(800);
let f1 = await facts();
ok("설정 한 번 → 자동", f1.pref === "auto", f1.label ?? "");
adb("shell", "settings", "put", "system", "accelerometer_rotation", "0");
adb("shell", "settings", "put", "system", "user_rotation", "1");
await sleep(2500);
f1 = await facts();
ok("자동 + 기기 가로 → WebView 가로", f1.w > f1.h, `${f1.w}×${f1.h} ${f1.type ?? ""} rot=${rotation()}`);
ok("가로 레이아웃: 사냥터 왼쪽 · 성장 탭 오른쪽", f1.tabsRightOfField, "");
ok("가로 스크롤 없음", !f1.hScroll, "");
shot("rot-auto-landscape.png");

// 자동 → 가로 고정: 기기를 세로로 돌려도 가로 유지
await clickSettings(); await sleep(800);
adb("shell", "settings", "put", "system", "user_rotation", "0");
await sleep(2500);
let f2 = await facts();
ok("설정 두 번 → 가로 고정", f2.pref === "landscape", f2.label ?? "");
ok("가로 고정 + 기기 세로 → 그래도 가로", f2.w > f2.h, `${f2.w}×${f2.h} rot=${rotation()}`);
shot("rot-locked-landscape.png");

// 가로 → 세로 고정(기본): 세로로 돌아온다
await clickSettings(); await sleep(2500);
let f3 = await facts();
ok("설정 세 번 → 세로 고정 · 세로 화면", f3.pref === "portrait" && f3.h > f3.w, `${f3.w}×${f3.h} rot=${rotation()}`);
shot("rot-back-portrait.png");

adb("shell", "settings", "put", "system", "user_rotation", "0");
writeFileSync(join(OUT, "rotate-results.json"), JSON.stringify(results, null, 1));
const fails = results.filter((r) => !r.ok).length;
console.log(fails ? `FAIL ${fails}` : "ALL PASS");
await browser.disconnect();
spawnSync(ADB, ["forward", "--remove", "tcp:9338"]);
process.exit(fails ? 1 : 0);
