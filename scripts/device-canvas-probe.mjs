// 실기기 전투 FPS 원인 가르기 (2026-10-06) — 성문 방어 전투가 떠 있을 때 canvas shadowBlur 를 끄거나 해상도를 낮춰 FPS 비교
import { execFileSync, spawnSync } from "node:child_process";
import { join } from "node:path";
import puppeteer from "puppeteer";
const APP = "com.ccommit.dodgelab";
const ADB = process.env.ADB ?? join(process.env.LOCALAPPDATA ?? "", "Android/Sdk/platform-tools/adb.exe");
const adb = (...a) => execFileSync(ADB, a, { encoding: "utf8" }).trim();
const pid = adb("shell", "pidof", APP);
const sock = adb("shell", "cat", "/proc/net/unix").split("\n").map((l) => l.match(/@(webview_devtools_remote_\d+)/)?.[1]).find((s) => s?.endsWith(`_${pid}`));
spawnSync(ADB, ["forward", "--remove", "tcp:9336"]);
adb("forward", "tcp:9336", `localabstract:${sock}`);
const browser = await puppeteer.connect({ browserURL: "http://127.0.0.1:9336", defaultViewport: null, protocolTimeout: 90000 });
const page = (await browser.pages()).find((p) => /localhost/.test(p.url()));
const fps = () => page.evaluate(() => new Promise((res) => { const ts = []; const t0 = performance.now(); const f = (t) => { ts.push(t); if (t - t0 < 4000) requestAnimationFrame(f); else { const d = ts.slice(1).map((v, i) => v - ts[i]).sort((a, b) => a - b); res({ fps: Math.round((ts.length - 1) / ((ts[ts.length - 1] - ts[0]) / 1000)), p95: Math.round(d[Math.floor(d.length * .95)]) }); } }; requestAnimationFrame(f); }));
const state = await page.evaluate(() => document.querySelector(".game-overlay .title")?.textContent ?? "playing");
console.log("상태", state);
console.log("그대로          ", JSON.stringify(await fps()));
await page.evaluate(() => {
  const d = Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, "shadowBlur");
  window.__sbDesc = d;
  Object.defineProperty(CanvasRenderingContext2D.prototype, "shadowBlur", { configurable: true, get() { return 0; }, set() {} });
});
console.log("shadowBlur 0     ", JSON.stringify(await fps()));
// 프레임 비용 — drawImage·fill 호출 수
const counts = await page.evaluate(() => new Promise((res) => {
  const P = CanvasRenderingContext2D.prototype; const c = {}; const orig = {};
  for (const k of ["drawImage", "fill", "stroke", "fillText", "createRadialGradient", "createLinearGradient", "save"]) { orig[k] = P[k]; P[k] = function (...a) { c[k] = (c[k] ?? 0) + 1; return orig[k].apply(this, a); }; }
  let frames = 0; const f = () => { frames += 1; if (frames < 60) requestAnimationFrame(f); else { for (const k of Object.keys(orig)) P[k] = orig[k]; res(Object.fromEntries(Object.entries(c).map(([k, v]) => [k, Math.round(v / 60)]))); } };
  requestAnimationFrame(f);
}));
console.log("프레임당 호출    ", JSON.stringify(counts));
await page.evaluate(() => { Object.defineProperty(CanvasRenderingContext2D.prototype, "shadowBlur", window.__sbDesc); });
await browser.disconnect();
spawnSync(ADB, ["forward", "--remove", "tcp:9336"]);
