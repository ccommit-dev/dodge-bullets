// 릴스 검사 (2026-10-23) — node scripts/reels/verify-reels.mjs [outDir]
// 장면마다: 그림 로드 · 손대지 않아도 끝 화면(end) · 진짜 탭으로도 끝 · 이벤트(ready·start·choice·climax·end) · 페이지 오류 0 · 단계별 캡처
import { launchBrowser } from "../launch-browser.mjs";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { readFileSync, mkdirSync } from "node:fs";
const SITE = "art-gen/out/reels/site";
const OUT = process.argv[2] ?? "art-gen/out/reels/shots";
mkdirSync(OUT, { recursive: true });
const scenes = JSON.parse(readFileSync(`${SITE}/scenes.json`, "utf8"));
const browser = await launchBrowser({ args: ["--no-sandbox", "--allow-file-access-from-files"] });
let fails = 0;
const ok = (n, c, d = "") => { console.log(`${c ? "PASS" : "FAIL"} ${n}${d ? " — " + d : ""}`); if (!c) fails += 1; };
for (const id of scenes) {
  const page = await browser.newPage();
  const errors = []; page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));
  await page.setViewport({ width: 360, height: 640, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.goto(pathToFileURL(resolve(`${SITE}/${id}/index.html`)).href, { waitUntil: "load" });
  for (let i = 0; i < 40 && !(await page.evaluate(() => window.__rf?.state().art)); i += 1) await new Promise((r) => setTimeout(r, 100));
  // 손대지 않고 — 2초마다 캡처하며 끝까지(최대 40초 가상 시간)
  await page.evaluate(() => { window.__rfEvents = []; window.__rf.restart(); });
  const snaps = [];
  let st;
  for (let k = 0; k < 40; k += 1) {
    st = await page.evaluate(() => window.__rf.step(1));
    if (k === 0 || k === 3 || k === 7) { await page.screenshot({ path: `${OUT}/${id}-auto-${String(k).padStart(2, "0")}.png` }); snaps.push(k); }
    if (st.phase === "end") break;
  }
  await page.evaluate(() => window.__rf.step(1));
  await page.screenshot({ path: `${OUT}/${id}-end.png` });
  const evAuto = await page.evaluate(() => window.__rfEvents.map((e) => e.event));
  ok(`${id}: 그림 로드`, st.art === true);
  ok(`${id}: 손대지 않아도 끝 화면까지(가상 ${Math.round(st.t)}초)`, st.phase === "end" && st.t <= 40, JSON.stringify(st));
  ok(`${id}: 이벤트 start · climax · end`, ["start", "climax", "end"].every((e) => evAuto.includes(e)), evAuto.join(","));
  // 진짜 탭 — 장면이 알려 주는 탭 자리(debug.tapAt) 또는 화면 가운데
  await page.evaluate(() => { window.__rfEvents = []; window.__rf.restart(); window.__rf.step(1.7); });
  let st2;
  for (let k = 0; k < 160; k += 1) {
    const at = await page.evaluate(() => (window.RF_SCENE.tapAt ? window.RF_SCENE.tapAt(window.G) : [180, 300]));
    await page.touchscreen.tap(at[0], at[1]);
    st2 = await page.evaluate(() => window.__rf.step(0.25));
    if (k === 6) await page.screenshot({ path: `${OUT}/${id}-tap.png` });
    if (st2.phase === "end") break;
  }
  const evTap = await page.evaluate(() => window.__rfEvents.map((e) => e.event));
  ok(`${id}: 직접 탭으로 끝 화면 · choice 이벤트`, st2.phase === "end" && evTap.includes("choice"), `${st2.phase} · ${evTap.join(",")}`);
  ok(`${id}: 페이지 오류 없음`, errors.length === 0, errors.slice(0, 2).join(" / "));
  await page.close();
}
await browser.close();
console.log(fails ? `${fails} FAIL` : "ALL PASS");
process.exit(fails ? 1 : 0);
