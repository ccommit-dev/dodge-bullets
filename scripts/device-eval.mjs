// 실기기 WebView 에서 식 하나를 평가해 출력 (2026-10-06 디버깅용) — node scripts/device-eval.mjs "<js 식>"
import { execFileSync, spawnSync } from "node:child_process";
import { join } from "node:path";
import puppeteer from "puppeteer";
const APP = "com.ccommit.dodgelab";
const ADB = process.env.ADB ?? join(process.env.LOCALAPPDATA ?? "", "Android/Sdk/platform-tools/adb.exe");
const adb = (...a) => execFileSync(ADB, a, { encoding: "utf8" }).trim();
const pid = adb("shell", "pidof", APP);
const sock = adb("shell", "cat", "/proc/net/unix").split("\n").map((l) => l.match(/@(webview_devtools_remote_\d+)/)?.[1]).find((s) => s?.endsWith(`_${pid}`));
spawnSync(ADB, ["forward", "--remove", "tcp:9337"]);
adb("forward", "tcp:9337", `localabstract:${sock}`);
const browser = await puppeteer.connect({ browserURL: "http://127.0.0.1:9337", defaultViewport: null, protocolTimeout: 60000 });
const page = (await browser.pages()).find((p) => /localhost/.test(p.url()));
console.log(JSON.stringify(await page.evaluate((src) => (0, eval)(src), process.argv[2]), null, 1));
await browser.disconnect();
spawnSync(ADB, ["forward", "--remove", "tcp:9337"]);
