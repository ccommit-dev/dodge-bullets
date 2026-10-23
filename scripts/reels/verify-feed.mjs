// 릴스 피드 검사 — 피드가 첫 릴스를 띄우고 resume 을 보내 광고가 돌며, 끝(end)에 "지금 플레이" 줄이 나오고, 넘기면 다음 릴스가 처음부터
import { launchBrowser } from "../launch-browser.mjs";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
const OUT = process.argv[2] ?? "art-gen/out/reels/shots";
const browser = await launchBrowser({ args: ["--no-sandbox", "--allow-file-access-from-files"] });
const page = await browser.newPage();
const errors = []; page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));
let fails = 0; const ok = (n, c, d = "") => { console.log(`${c ? "PASS" : "FAIL"} ${n}${d ? " — " + d : ""}`); if (!c) fails += 1; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (const [w, h, name] of [[390, 844, "phone"], [1280, 800, "pc"]]) {
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(resolve("art-gen/out/reels/site/index.html")).href, { waitUntil: "load" });
  await sleep(3500);
  const st = await page.evaluate(() => ({ active: window.__feed.active(), state: window.__feed.state(0), count: window.__feed.count }));
  ok(`${name}: 첫 릴스가 돌고 있다(일시정지 아님 · 진행)`, st.active === 0 && st.state && !st.state.paused && st.state.t > 1, JSON.stringify(st));
  await page.screenshot({ path: `${OUT}/feed-${name}-1.png` });
  for (let i = 0; i < 60 && !(await page.evaluate(() => window.__feed.ctaShown(0))); i += 1) await sleep(500);
  ok(`${name}: 끝나면 '지금 플레이' 줄`, await page.evaluate(() => window.__feed.ctaShown(0)));
  await page.screenshot({ path: `${OUT}/feed-${name}-end.png` });
  await page.evaluate(() => window.__feed.go(3)); await sleep(2500);
  const s4 = await page.evaluate(() => ({ active: window.__feed.active(), st: window.__feed.state(3), prev: window.__feed.state(2) }));
  ok(`${name}: 4번째 릴스로 넘기면 그 릴스가 돌고 이웃은 멈춘다`, s4.active === 3 && s4.st && !s4.st.paused && s4.prev && s4.prev.paused, JSON.stringify({ a: s4.active, p: s4.st?.paused, prev: s4.prev?.paused }));
  await page.screenshot({ path: `${OUT}/feed-${name}-4.png` });
}
ok("페이지 오류 없음", errors.length === 0, errors.join(" / "));
await browser.close();
console.log(fails ? `${fails} FAIL` : "ALL PASS");
