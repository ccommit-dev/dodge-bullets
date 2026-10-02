// 네이티브 부팅 모의 (2026-10-02) — window.Capacitor.isNativePlatform 을 true 로 세워 Capacitor WebView 처럼 부팅시키고 허브까지 가는지 본다.
// 실기기에서 "준비 중…"에 멈춘 두 원인(토스 브리지 무응답 · Preferences 프록시의 then)을 되돌리면 여기서 걸린다.
//   node scripts/probe-native-boot.mjs [out.png]   (vite 5173)
import { launchBrowser } from "./launch-browser.mjs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const BASE = "http://localhost:5173";
const browser = await launchBrowser({ args: ["--no-sandbox", "--disable-gpu"] });
const page = await browser.newPage();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
page.on("pageerror", (e) => console.log("PAGEERROR", String(e).slice(0, 200)));
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.evaluateOnNewDocument(() => {
  // 토스 브리지가 '응답 없음'인 WebView 를 흉내: 네이티브 플래그만 세운다. 토스 SDK 의 실제 호출은 건너뛰어야 한다
  window.Capacitor = { isNativePlatform: () => true, getPlatform: () => "android", Plugins: {} };
  // @capacitor/core 가 로드되면 window.Capacitor 를 자기 것으로 덮고 androidBridge 가 없으니 web 이라고 답한다 —
  // CapacitorCustomPlatform 을 세워 두면 끝까지 android 이고, 네이티브 구현이 없는 플러그인은 web 구현으로 돈다 (core createCapacitor)
  window.CapacitorCustomPlatform = { name: "android", plugins: {} };
});
await page.goto(BASE, { waitUntil: "networkidle0" });
await page.evaluate(() => { localStorage.clear(); localStorage.setItem("dodge-bullets:soundEnabled", "0"); });
await page.goto(BASE, { waitUntil: "networkidle0" });
let ready = false, text = "";
for (let i = 0; i < 40 && !ready; i += 1) {
  await sleep(250);
  const r = await page.evaluate(() => ({ loading: !!document.querySelector(".titans-loading"), nav: !!document.querySelector(".titans-bottom-nav"), text: document.body.innerText.slice(0, 80) }));
  ready = r.nav && !r.loading; text = r.text;
}
console.log(ready ? "BOOT OK — 허브 도달" : "BOOT STUCK: " + text.replace(/\s+/g, " "));
await page.screenshot({ path: process.argv[2] ?? join(tmpdir(), "native-boot.png") });
await browser.close();
process.exit(ready ? 0 : 1);
