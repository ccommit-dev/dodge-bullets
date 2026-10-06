// 실기기 WebView 에서 돌고 있는 CSS 애니메이션 목록 + 하나씩 끄며 FPS (2026-10-06)
import { execFileSync, spawnSync } from "node:child_process";
import { join } from "node:path";
import puppeteer from "puppeteer";
const APP = "com.ccommit.dodgelab";
const ADB = process.env.ADB ?? join(process.env.LOCALAPPDATA ?? "", "Android/Sdk/platform-tools/adb.exe");
const adb = (...a) => execFileSync(ADB, a, { encoding: "utf8" }).trim();
const pid = adb("shell", "pidof", APP);
const sock = adb("shell", "cat", "/proc/net/unix").split("\n").map((l) => l.match(/@(webview_devtools_remote_\d+)/)?.[1]).find((s) => s?.endsWith(`_${pid}`));
spawnSync(ADB, ["forward", "--remove", "tcp:9335"]);
adb("forward", "tcp:9335", `localabstract:${sock}`);
const browser = await puppeteer.connect({ browserURL: "http://127.0.0.1:9335", defaultViewport: null, protocolTimeout: 90000 });
const page = (await browser.pages()).find((p) => /localhost/.test(p.url()));
const list = await page.evaluate(() => {
  const out = {};
  for (const a of document.getAnimations()) {
    const el = a.effect?.target; const name = a.animationName ?? a.constructor.name;
    const props = [...new Set((a.effect?.getKeyframes?.() ?? []).flatMap((k) => Object.keys(k).filter((x) => !["offset", "easing", "composite", "computedOffset"].includes(x))))];
    const key = `${name} @ ${el?.className?.toString().split(" ")[0] ?? el?.tagName}`;
    out[key] = { n: (out[key]?.n ?? 0) + 1, props: props.join(",") };
  }
  return out;
});
for (const [k, v] of Object.entries(list)) console.log(String(v.n).padStart(2), k.padEnd(60), v.props);
const fps = (pausePred) => page.evaluate(async (pausePred) => {
  const pred = new Function("a", "return " + pausePred);
  const paused = document.getAnimations().filter((a) => pred(a));
  paused.forEach((a) => a.pause());
  await new Promise((r) => setTimeout(r, 500));
  const r = await new Promise((res) => { const ts = []; const t0 = performance.now(); const f = (t) => { ts.push(t); if (t - t0 < 3000) requestAnimationFrame(f); else res(Math.round((ts.length - 1) / ((ts[ts.length - 1] - ts[0]) / 1000))); }; requestAnimationFrame(f); });
  paused.forEach((a) => a.play());
  return r;
}, pausePred);
console.log("전부 재생", await fps("false"));
for (const name of [...new Set(Object.keys(list).map((k) => k.split(" @ ")[0]))]) console.log("멈춤:", name.padEnd(30), await fps(`a.animationName === ${JSON.stringify(name)}`));
await browser.disconnect();
spawnSync(ADB, ["forward", "--remove", "tcp:9335"]);
