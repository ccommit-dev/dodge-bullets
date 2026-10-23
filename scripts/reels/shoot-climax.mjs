// 릴스마다 절정(climax) 직후 0.35초 · 끝 화면 직전 캡처 — 이펙트 확인용
import { launchBrowser } from "../launch-browser.mjs";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { readFileSync, mkdirSync } from "node:fs";
const SITE = "art-gen/out/reels/site", OUT = process.argv[2] ?? "art-gen/out/reels/shots";
mkdirSync(OUT, { recursive: true });
const scenes = JSON.parse(readFileSync(`${SITE}/scenes.json`, "utf8"));
const browser = await launchBrowser({ args: ["--no-sandbox", "--allow-file-access-from-files"] });
for (const id of scenes) {
  const page = await browser.newPage();
  await page.setViewport({ width: 360, height: 640, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(resolve(`${SITE}/${id}/index.html`)).href, { waitUntil: "load" });
  for (let i = 0; i < 40 && !(await page.evaluate(() => window.__rf?.state().art)); i += 1) await new Promise((r) => setTimeout(r, 100));
  await page.evaluate(() => { window.__rf.restart(); });
  // 중간 한 장(재미 포인트) · 절정 직후
  let st, mid = false;
  for (let k = 0; k < 400; k += 1) {
    st = await page.evaluate(() => window.__rf.step(0.1));
    if (!mid && st.pt > 3.2) { mid = true; await page.screenshot({ path: `${OUT}/${id}-mid.png` }); }
    if (st.phase === "climax") { await page.evaluate(() => window.__rf.step(0.3)); await page.screenshot({ path: `${OUT}/${id}-climax.png` }); break; }
  }
  await page.close();
}
await browser.close();
console.log("done");
