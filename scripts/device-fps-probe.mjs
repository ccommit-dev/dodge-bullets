// 실기기 FPS 원인 가르기 (2026-10-06) — 지금 떠 있는 앱 WebView 에 붙어 rAF FPS 를 (a) 그대로 (b) 화면 전체 숨김 (c) 무거운 CSS 끔 으로 잰다
//   node scripts/device-fps-probe.mjs
import { execFileSync, spawnSync } from "node:child_process";
import { join } from "node:path";
import puppeteer from "puppeteer";
const APP = "com.ccommit.dodgelab";
const ADB = process.env.ADB ?? join(process.env.LOCALAPPDATA ?? "", "Android/Sdk/platform-tools/adb.exe");
const adb = (...a) => execFileSync(ADB, a, { encoding: "utf8" }).trim();
const pid = adb("shell", "pidof", APP);
const sock = adb("shell", "cat", "/proc/net/unix").split("\n").map((l) => l.match(/@(webview_devtools_remote_\d+)/)?.[1]).find((s) => s?.endsWith(`_${pid}`));
spawnSync(ADB, ["forward", "--remove", "tcp:9334"]);
adb("forward", "tcp:9334", `localabstract:${sock}`);
const browser = await puppeteer.connect({ browserURL: "http://127.0.0.1:9334", defaultViewport: null, protocolTimeout: 60000 });
const page = (await browser.pages()).find((p) => /localhost/.test(p.url()));
const fps = (label, setup) => page.evaluate(async (setup) => {
  if (setup) (0, eval)(setup);
  await new Promise((r) => setTimeout(r, 600));
  return await new Promise((res) => {
    const ts = []; const t0 = performance.now();
    const f = (t) => { ts.push(t); if (t - t0 < 4000) requestAnimationFrame(f); else { const d = ts.slice(1).map((v, i) => v - ts[i]).sort((a, b) => a - b); res({ fps: Math.round((ts.length - 1) / ((ts[ts.length - 1] - ts[0]) / 1000)), p95: Math.round(d[Math.floor(d.length * .95)]) }); } };
    requestAnimationFrame(f);
  });
}, setup).then((r) => console.log(label.padEnd(28), JSON.stringify(r)));
await fps("그대로");
await fps("끔: 애니메이션", `(() => { document.getElementById("__p1")?.remove(); const st = document.createElement("style"); st.id = "__p1"; st.textContent = "*,*::before,*::after{animation:none!important;transition:none!important}"; document.head.appendChild(st); })()`);
await fps("끔: backdrop", `(() => { document.getElementById("__p1")?.remove(); const st = document.createElement("style"); st.id = "__p1"; st.textContent = "*,*::before,*::after{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}"; document.head.appendChild(st); })()`);
await fps("끔: filter", `(() => { document.getElementById("__p1")?.remove(); const st = document.createElement("style"); st.id = "__p1"; st.textContent = "*,*::before,*::after{filter:none!important}"; document.head.appendChild(st); })()`);
await fps("끔: shadow", `(() => { document.getElementById("__p1")?.remove(); const st = document.createElement("style"); st.id = "__p1"; st.textContent = "*,*::before,*::after{box-shadow:none!important;text-shadow:none!important}"; document.head.appendChild(st); })()`);
await page.evaluate(() => document.getElementById("__p1")?.remove());
await fps("애니메이션·필터 끔", `(() => { const st = document.createElement("style"); st.id = "__probe"; st.textContent = "*,*::before,*::after{animation:none!important;transition:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;filter:none!important;box-shadow:none!important;text-shadow:none!important}"; document.head.appendChild(st); })()`);
await fps("화면 전체 숨김", `document.getElementById("__probe")?.remove(); document.body.style.visibility = "hidden";`);
await page.evaluate(() => { document.body.style.visibility = ""; });
const info = await page.evaluate(() => ({ dpr: devicePixelRatio, w: innerWidth, h: innerHeight, canvases: [...document.querySelectorAll("canvas")].map((c) => `${c.width}x${c.height}`), anim: document.getAnimations().length, ua: navigator.userAgent.match(/Chrome\/[\d.]+/)?.[0] }));
console.log(JSON.stringify(info));
await browser.disconnect();
spawnSync(ADB, ["forward", "--remove", "tcp:9334"]);
