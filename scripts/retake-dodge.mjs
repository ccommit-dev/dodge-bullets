/**
 * 화살 원정 인게임 재촬영 — 첫 촬영은 5초 시점이라 화살이 깔리기 전이었다.
 * 좌우 이동+점프를 시뮬레이션해 생존시키면서, 패턴이 겹치는 14/18/22초에
 * 후보 3장을 찍는다 (게임오버 프레임은 파일명에 표시).
 */
import { mkdirSync } from "node:fs";
import puppeteer from "puppeteer";

const BASE = "http://localhost:5173";
mkdirSync("store/screenshots", { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({ headless: "shell" });
const page = await browser.newPage();
await page.setViewport({ width: 360, height: 640, deviceScaleFactor: 3, isMobile: true, hasTouch: true });

await page.goto(`${BASE}/`, { waitUntil: "networkidle0" });
await page.evaluate(() => localStorage.setItem("dodge-bullets:soundEnabled", "0"));
await page.goto(`${BASE}/`, { waitUntil: "networkidle0" });
await sleep(2500);
// 출석 모달 닫기
await page.evaluate(() => {
  [...document.querySelectorAll(".attendance-card .cta")].find((b) => b.textContent.trim() === "닫기")?.click();
});
await sleep(600);
await page.evaluate(() => {
  [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "화살 원정")?.click();
});
await sleep(1400);
await page.evaluate(() => {
  [...document.querySelectorAll(".cta")].find((b) => b.textContent.includes("스테이지 1 시작"))?.click();
});

// 회피 봇: 0.55초마다 방향 전환, 2.2초마다 점프
let dir = "ArrowLeft";
const bot = setInterval(async () => {
  try {
    await page.keyboard.up(dir);
    dir = dir === "ArrowLeft" ? "ArrowRight" : "ArrowLeft";
    await page.keyboard.down(dir);
  } catch { /* page closing */ }
}, 550);
const jumper = setInterval(async () => {
  try { await page.keyboard.press("Space"); } catch { /* ignore */ }
}, 2200);

const captureAt = [14000, 18000, 22000];
let elapsed = 0;
for (const t of captureAt) {
  await sleep(t - elapsed);
  elapsed = t;
  const over = await page.evaluate(() =>
    !!document.querySelector(".game-overlay") &&
    /다시|게임 오버|GAME OVER|기록/.test(document.querySelector(".game-overlay")?.textContent ?? ""));
  await page.screenshot({ path: `store/screenshots/03-dodge-action-${t / 1000}s${over ? "-GAMEOVER" : ""}.png` });
  console.log(`shot at ${t / 1000}s${over ? " (gameover)" : ""}`);
  if (over) break;
}

clearInterval(bot);
clearInterval(jumper);
await browser.close();
console.log("done");
