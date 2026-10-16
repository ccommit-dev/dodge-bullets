/**
 * 아이폰 카카오톡 인앱 흉내 검사 (2026-10-16, 사용자: "아이폰 카카오톡 화면 확인 못 한 것").
 *   node scripts/shoot-kakao-ios.mjs [outDir]   (vite 5173)
 * 진짜 iOS WebKit 은 이 PC 에 없다(Playwright WebKit 은 내려받기 허락이 필요) → Chromium 에 아이폰 카카오톡 인앱 UA · 터치 · dpr 3 ·
 * 카카오톡 위·아래 막대를 뺀 실제 보이는 높이로 흉내 낸다. 기기: iPhone 15(390×664) · iPhone SE(375×553) · iPhone 15 Pro Max(430×770).
 * 잰다: 페이지 오류 · 404 · 가로 넘침(가로 스크롤) · 하단 메뉴가 화면 안 · 주요 버튼이 화면 안 · 캔버스 크기. 화면마다 캡처.
 */
import { launchBrowser } from "./launch-browser.mjs";
import { mkdirSync } from "node:fs";

const OUT = process.argv[2] ?? "shots-kakao-ios"; mkdirSync(OUT, { recursive: true });
const BASE = "http://localhost:5173", H = "mock-local-dev";
const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 KAKAOTALK 10.8.5";
const DEVICES = [["iphone15", 390, 664], ["iphoneSE", 375, 553], ["iphone15promax", 430, 770]];
const browser = await launchBrowser({ args: ["--no-sandbox"] });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const ok = (name, cond, info = "") => { console.log(`${cond ? "PASS" : "FAIL"} ${name}${info ? " — " + info : ""}`); if (!cond) fails += 1; };
for (const [dev, w, h] of DEVICES) {
  const page = await browser.newPage();
  await page.setUserAgent(UA);
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const errors = [], missing = [];
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));
  page.on("response", (r) => { if (r.status() >= 400) missing.push(r.status() + " " + r.url().replace(BASE, "")); });
  await page.goto(BASE, { waitUntil: "networkidle0" });
  const now = Date.now();
  const progress = { version: 5, level: 40, sharedCoins: 99999, dodgeBestStage: 12, idleClaimedAt: now, updatedAt: now, onboardingStep: 4, partyIds: ["mia", "leon", "garen", "luna"], partyCap: 4, redGems: 5000, claimedRewards: ["dodge-tutorial"], pioneeredArea: 5, equippedWeaponLevel: 8 };
  const titans = { gold: 900000, stage: 20, bestStage: 20, heroes: { mia: 8, leon: 6, garen: 5, luna: 5 }, lastActiveAt: now };
  await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); }, { [`dodgebullets:progression:v1:${H}`]: JSON.stringify(progress), [`dodgebullets:titans:${H}`]: JSON.stringify(titans), "dodge-bullets:soundEnabled": "0", "dodgebullets:test-phase": "0", "dodgebullets:inapp-fs-hint": "1" });
  await page.reload({ waitUntil: "networkidle0" }); await sleep(2500);
  await page.evaluate(() => { for (let k = 0; k < 4; k += 1) { const c = document.querySelector(".idle-claim"); if (c) { c.click(); continue; } const b = [...document.querySelectorAll("button")].filter((x) => /^(닫기|확인|나중에)$/.test(x.textContent.trim()))[0]; if (b) b.click(); } });
  await sleep(600);
  const layout = async (screen) => {
    const r = await page.evaluate(() => {
      const nav = document.querySelector(".titans-bottom-nav")?.getBoundingClientRect();
      const btns = [...document.querySelectorAll("button")].filter((b) => b.offsetParent && getComputedStyle(b).visibility !== "hidden").map((b) => b.getBoundingClientRect()).filter((b) => b.width > 0);
      const outX = btns.filter((b) => b.right > innerWidth + 1 || b.left < -1).length;
      return { sw: document.documentElement.scrollWidth, iw: innerWidth, ih: innerHeight, nav: nav ? [Math.round(nav.top), Math.round(nav.bottom)] : null, outX };
    });
    await page.screenshot({ path: `${OUT}/${dev}-${screen}.png` });
    ok(`${dev} ${screen}: 가로 넘침 없음 · 버튼이 화면 가로 안`, r.sw <= r.iw + 1 && r.outX === 0, `scrollWidth ${r.sw}/${r.iw} · 밖 버튼 ${r.outX}`);
    if (r.nav) ok(`${dev} ${screen}: 하단 메뉴가 화면 안`, r.nav[1] <= r.ih + 1 && r.nav[0] < r.ih, `nav ${r.nav} / ${r.ih}`);
  };
  await layout("hunt");
  for (const tab of ["동료", "상점", "모험"]) {
    await page.evaluate((t) => [...document.querySelectorAll(".titans-bottom-nav button")].find((b) => b.textContent.includes(t))?.click(), tab); await sleep(900);
    await layout(tab);
  }
  await page.evaluate(() => [...document.querySelectorAll(".hub-card")].find((b) => b.textContent.includes("성문 방어"))?.click()); await sleep(1800);
  await layout("dodge-menu");
  await page.evaluate(() => [...document.querySelectorAll(".exp-menu-content .cta")].find((b) => b.textContent.includes("시작"))?.click()); await sleep(1500);
  await page.evaluate(() => document.querySelector(".intro-start, .cta.intro-cta, .overlay-content .cta")?.click()); await sleep(2500);
  const cv = await page.evaluate(() => { const c = document.querySelector("canvas"); const b = c?.getBoundingClientRect(); return b ? { w: Math.round(b.width), h: Math.round(b.height), bottom: Math.round(b.bottom), ih: innerHeight } : null; });
  await page.screenshot({ path: `${OUT}/${dev}-dodge-battle.png` });
  ok(`${dev} 성문 방어: 캔버스가 화면을 채운다(넘치지 않음)`, !!cv && cv.w >= w - 2 && cv.bottom <= cv.ih + 1, JSON.stringify(cv));
  ok(`${dev} 페이지 오류 없음`, errors.length === 0, errors.slice(0, 2).join(" / "));
  ok(`${dev} 없는 파일(404) 없음`, missing.length === 0, [...new Set(missing)].slice(0, 4).join(" "));
  await page.close();
}
await browser.close();
console.log(fails ? `${fails} FAIL` : "ALL PASS");
process.exit(fails ? 1 : 0);
