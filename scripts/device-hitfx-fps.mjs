// 타격 표현 2판 기기 FPS (2026-10-21, 부족한 점 "실제 기기에서 프레임 저하를 비교하지 않았다") —
// 에뮬레이터/폰 앱 WebView 에서 사냥터 교전 중 새 이펙트(속성 불꽃 · 큰 폭발 · 파편 · 동료 탄 · 찌그러짐)를 켠 구간과 끈 구간을 번갈아 잰다.
// 절대 FPS 는 호스트 부하로 흔들리므로(device-play-emulator 메모) 같은 실행 안의 켬/끔 비율로 판단한다.
//   node scripts/device-hitfx-fps.mjs [--no-install]
import { execFileSync, spawnSync } from "node:child_process";
import { join } from "node:path";
import puppeteer from "puppeteer";
const APP = "com.ccommit.dodgelab";
const ADB = process.env.ADB ?? join(process.env.LOCALAPPDATA ?? "", "Android/Sdk/platform-tools/adb.exe");
const APK = "android/app/build/outputs/apk/debug/app-debug.apk";
const adb = (...a) => execFileSync(ADB, a, { encoding: "utf8" }).trim();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (let i = 0; i < 60; i += 1) { let b = ""; try { b = adb("shell", "getprop", "sys.boot_completed"); } catch { /* 아직 */ } if (b === "1") break; await sleep(5000); }
console.log("기기", adb("shell", "getprop", "ro.product.model"));
if (!process.argv.includes("--no-install")) console.log(adb("install", "-r", "-d", APK).split("\n").pop());
let browser, page;
async function launch() {
  adb("shell", "am", "force-stop", APP); adb("shell", "am", "start", "-n", `${APP}/.MainActivity`); await sleep(2500);
  const pid = adb("shell", "pidof", APP); let sock = null;
  for (let i = 0; i < 60 && !sock; i += 1) { sock = adb("shell", "cat", "/proc/net/unix").split("\n").map((l) => l.match(/@(webview_devtools_remote_\d+)/)?.[1]).find((s) => s && s.endsWith(`_${pid}`)) ?? null; if (!sock) await sleep(500); }
  spawnSync(ADB, ["forward", "--remove", "tcp:9335"]); adb("forward", "tcp:9335", `localabstract:${sock}`);
  if (browser) await browser.disconnect().catch(() => {});
  browser = await puppeteer.connect({ browserURL: "http://127.0.0.1:9335", defaultViewport: null, protocolTimeout: 90000 });
  for (let i = 0; i < 20 && !page; i += 1) { page = (await browser.pages()).find((p) => /localhost/.test(p.url())); if (!page) await sleep(500); }
}
await launch(); await sleep(6000);
const H = await page.evaluate(async () => { const P = window.Capacitor?.Plugins?.Preferences; const { keys } = P ? await P.keys() : { keys: Object.keys(localStorage) }; return (keys.find((k) => k.startsWith("dodgebullets:progression:v1:")) ?? "x:x:x:mock-local-dev").split(":").pop(); });
const now = Date.now();
const seed = {
  [`dodgebullets:progression:v1:${H}`]: JSON.stringify({ version: 5, level: 40, dodgeBestStage: 50, idleClaimedAt: now, updatedAt: now, onboardingStep: 4, sessionCount: 9, partyIds: ["mia", "garen", "luna", "orion"], partyCap: 4, claimedRewards: ["dodge-tutorial"], pioneeredArea: 99, equippedWeaponLevel: 5 }),
  [`dodgebullets:titans:${H}`]: JSON.stringify({ gold: 40000, stage: 30, bestStage: 30, autoSkill: true, heroes: { mia: 8, garen: 8, luna: 8, orion: 8 }, lastActiveAt: now,
    skillInventory: { learned: ["strike", "crit", "meteor"], levels: { strike: 1, crit: 1, meteor: 1 }, equipped: { starter: "strike", linkA: "crit", finisher: "meteor" }, skillCores: 0 } }),
  [`dodgebullets:attendance:v1:${H}`]: JSON.stringify({ lastClaimDate: new Date().toLocaleDateString("sv-SE"), totalDays: 3, consecutiveDays: 3 }),
  "dodgebullets:test-phase": "0", "dodge-bullets:soundEnabled": "0",
};
await page.evaluate(async (seed) => { const P = window.Capacitor?.Plugins?.Preferences; for (const [k, v] of Object.entries(seed)) { if (P) await P.set({ key: k, value: v }); localStorage.setItem(k, v); } }, seed);
adb("shell", "pm", "grant", APP, "android.permission.POST_NOTIFICATIONS");
page = null; await launch(); await sleep(8000);
await page.evaluate(() => { for (let k = 0; k < 6; k += 1) { const c = document.querySelector(".idle-claim"); if (c) { c.click(); continue; } const b = [...document.querySelectorAll("button")].filter((x) => !x.closest(".titans-bottom-nav")).find((x) => /^(닫기|확인|나중에)$/.test(x.textContent.trim())); if (b) b.click(); } });
await sleep(3000);
const OFF_CSS = ".titans-fx-spark,.titans-fx-burst,.titans-fx-debris,.skill-shot.shot-proj{display:none!important}.monster-squash{animation:none!important}";
const measure = (off) => page.evaluate(async (css) => {
  document.getElementById("__hitfx_off")?.remove();
  if (css) { const st = document.createElement("style"); st.id = "__hitfx_off"; st.textContent = css; document.head.appendChild(st); }
  let made = 0; const mo = new MutationObserver((ms) => { for (const m of ms) for (const n of m.addedNodes) if (n instanceof Element && n.matches(".titans-fx-spark, .titans-fx-burst, .titans-fx-debris, .skill-shot.shot-proj")) made += 1; });
  mo.observe(document.querySelector(".titans-field"), { childList: true, subtree: true });
  await new Promise((r) => setTimeout(r, 500));
  const r = await new Promise((res) => { const ts = []; const t0 = performance.now(); const f = (t) => { ts.push(t); if (t - t0 < 5000) requestAnimationFrame(f); else { const d = ts.slice(1).map((v, i) => v - ts[i]).sort((a, b) => a - b); res({ fps: Math.round(((ts.length - 1) / ((ts[ts.length - 1] - ts[0]) / 1000)) * 10) / 10, p95: Math.round(d[Math.floor(d.length * 0.95)]) }); } }; requestAnimationFrame(f); });
  mo.disconnect();
  return { ...r, fx: made, phase: [...document.querySelector(".titans-field").classList].find((c) => c.startsWith("phase-")) };
}, off ? OFF_CSS : "");
const rows = [];
for (let i = 0; i < 3; i += 1) { rows.push(["켬", await measure(false)]); rows.push(["끔", await measure(true)]); }
await page.evaluate(() => document.getElementById("__hitfx_off")?.remove());
for (const [k, r] of rows) console.log(k, JSON.stringify(r));
const avg = (k) => rows.filter((r) => r[0] === k).reduce((a, r) => a + r[1].fps, 0) / 3;
const on = avg("켬"), off = avg("끔");
console.log(`평균 켬 ${on.toFixed(1)} · 끔 ${off.toFixed(1)} · 비율 ${((on / off) * 100).toFixed(0)}% · 새 이펙트 ${rows.filter((r) => r[0] === "켬").reduce((a, r) => a + r[1].fx, 0)}개(켬 구간)`);
console.log(on >= off * 0.9 ? "PASS 새 이펙트를 켜도 FPS 90% 이상" : "FAIL 새 이펙트가 FPS 를 10% 넘게 깎는다");
await browser.disconnect(); spawnSync(ADB, ["forward", "--remove", "tcp:9335"]);
