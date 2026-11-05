// 릴스 검사 (2026-10-23 · 2026-11-05 플레이어블 기준) — node scripts/reels/verify-reels.mjs [outDir] [--only id,id]
// 장면마다: 그림 로드 · 가만히 있으면 이기지 못한다(질 수 있는 편은 지고, 나머지는 끝 화면까지만) · 장면의 bot 으로 조작하면 이긴다 · 끌기/탭이 실제로 먹는다 · 이벤트 · 페이지 오류 0 · 단계별 캡처
import { launchBrowser } from "../launch-browser.mjs";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { readFileSync, mkdirSync } from "node:fs";
const SITE = "art-gen/out/reels/site";
const args = process.argv.slice(2);
const onlyAt = args.indexOf("--only");
const only = onlyAt >= 0 ? new Set(args[onlyAt + 1].split(",")) : null;
const OUT = args.find((a, i) => !a.startsWith("--") && i !== onlyAt + 1) ?? "art-gen/out/reels/shots";
mkdirSync(OUT, { recursive: true });
const scenes = JSON.parse(readFileSync(`${SITE}/scenes.json`, "utf8")).filter((id) => !only || only.has(id));
const browser = await launchBrowser({ args: ["--no-sandbox", "--allow-file-access-from-files"] });
let fails = 0;
const ok = (n, c, d = "") => { console.log(`${c ? "PASS" : "FAIL"} ${n}${d ? " — " + d : ""}`); if (!c) fails += 1; };
for (const id of scenes) {
  const page = await browser.newPage();
  const errors = []; page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));
  await page.setViewport({ width: 360, height: 640, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.goto(pathToFileURL(resolve(`${SITE}/${id}/index.html`)).href, { waitUntil: "load" });
  for (let i = 0; i < 40 && !(await page.evaluate(() => window.__rf?.state().art)); i += 1) await new Promise((r) => setTimeout(r, 100));
  const canLose = await page.evaluate(() => !!window.RF_SCENE.canLose);
  const hasBot = await page.evaluate(() => typeof window.RF_SCENE.bot === "function");

  // 손대지 않고 — 질 수 있는 편은 져야 하고, 끝 화면까지 간다(최대 45초 가상 시간)
  await page.evaluate(() => { window.__rfEvents = []; window.__rf.restart(); });
  let st;
  for (let k = 0; k < 45; k += 1) {
    st = await page.evaluate(() => window.__rf.step(1));
    if (k === 3 || k === 7) await page.screenshot({ path: `${OUT}/${id}-idle-${String(k).padStart(2, "0")}.png` });
    if (st.phase === "end") break;
  }
  await page.evaluate(() => window.__rf.step(1));
  await page.screenshot({ path: `${OUT}/${id}-idle-end.png` });
  const evIdle = await page.evaluate(() => window.__rfEvents.map((e) => e.event));
  ok(`${id}: 그림 로드`, st.art === true);
  ok(`${id}: 가만히 두면 끝 화면까지(가상 ${Math.round(st.t)}초)`, st.phase === "end" && st.t <= 45, JSON.stringify(st).slice(0, 180));
  if (canLose) ok(`${id}: 가만히 있으면 진다`, st.lost === true && evIdle.includes("lose"), evIdle.join(","));

  // 조작 — 장면이 알려 주는 플레이어(bot). 진짜 터치로 누르고, 끌기는 드래그 함수로
  ok(`${id}: 플레이어(bot)가 있다`, hasBot);
  if (hasBot) {
    await page.evaluate(() => { window.__rfEvents = []; window.__rf.restart(); window.__rf.step(1.7); });
    let st2, actions = 0;
    for (let k = 0; k < 500; k += 1) {
      const a = await page.evaluate(() => window.RF_SCENE.bot(window.G));
      if (a?.tap) { await page.touchscreen.tap(a.tap[0], a.tap[1]); actions += 1; }
      else if (a?.drag) { await page.evaluate((x, y) => window.__rf.drag(x, y), a.drag[0], a.drag[1]); actions += 1; }
      else if (a?.release) { await page.evaluate((x, y) => window.__rf.release(x, y), a.release[0], a.release[1]); actions += 1; }
      st2 = await page.evaluate(() => window.__rf.step(0.1));
      if (k === 30 || k === 70) await page.screenshot({ path: `${OUT}/${id}-play-${String(k).padStart(2, "0")}.png` });
      if (st2.phase === "end") break;
    }
    await page.evaluate(() => window.__rf.step(1));
    await page.screenshot({ path: `${OUT}/${id}-win-end.png` });
    const ev = await page.evaluate(() => window.__rfEvents.map((e) => e.event));
    ok(`${id}: 잘 조작하면 이긴다`, st2.phase === "end" && st2.lost === false, JSON.stringify(st2).slice(0, 200));
    ok(`${id}: 이벤트 start · climax · end · 조작 ${actions}번`, ["start", "climax", "end"].every((e) => ev.includes(e)) && actions >= 3, ev.join(","));
  }
  ok(`${id}: 페이지 오류 없음`, errors.length === 0, errors.slice(0, 2).join(" / "));
  await page.close();
}
await browser.close();
console.log(fails ? `${fails} FAIL` : "ALL PASS");
process.exit(fails ? 1 : 0);
