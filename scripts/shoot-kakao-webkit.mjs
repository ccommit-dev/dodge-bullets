/**
 * 아이폰 카카오톡 — 사파리 엔진(WebKit) 검사 (2026-10-16, 사용자: "아이폰 카카오톡 화면 확인 못 한 것" → WebKit 내려받기 허락).
 *   PLAYWRIGHT_DIR=<playwright 가 설치된 폴더> node scripts/shoot-kakao-webkit.mjs [outDir]   (vite 5173)
 * 프로젝트 의존성에는 넣지 않았다 — Playwright(+ `npx playwright install webkit`)를 따로 둔 폴더에서 불러온다.
 * iOS 사파리·카카오톡 인앱 브라우저와 같은 렌더링 엔진(WebKit)에 아이폰 카카오톡 UA · 터치 · dpr 3 · 카카오톡 막대를 뺀 높이를 준다
 * (실제 아이폰 기기·카카오톡 앱 자체는 아니다). 잰다: 페이지 오류 · 404 · 가로 넘침 · 하단 메뉴 · 성문 방어 캔버스 그리기 ·
 * 동료/몬스터 webp 띠·이펙트 띠가 실제로 디코딩되는가(naturalWidth) · 화면마다 캡처. shoot-kakao-ios.mjs(크롬 흉내)와 같은 항목.
 */
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const req = createRequire(join(process.env.PLAYWRIGHT_DIR ?? process.cwd(), "package.json"));
const { webkit } = req("playwright");
const OUT = process.argv[2] ?? "shots-kakao-webkit"; mkdirSync(OUT, { recursive: true });
const BASE = "http://localhost:5173", H = "mock-local-dev";
const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 KAKAOTALK 10.8.5";
const DEVICES = [["iphone15", 390, 664], ["iphoneSE", 375, 553], ["iphone15promax", 430, 770]];
const browser = await webkit.launch();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const ok = (name, cond, info = "") => { console.log(`${cond ? "PASS" : "FAIL"} ${name}${info ? " — " + info : ""}`); if (!cond) fails += 1; };
console.log("engine", browser.version());
for (const [dev, w, h] of DEVICES) {
  const ctx = await browser.newContext({ userAgent: UA, viewport: { width: w, height: h }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const errors = [], missing = [];
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));
  page.on("response", (r) => { if (r.status() >= 400) missing.push(r.status() + " " + r.url().replace(BASE, "")); });
  await page.goto(BASE, { waitUntil: "networkidle" });
  const now = Date.now();
  const progress = { version: 5, level: 40, sharedCoins: 99999, dodgeBestStage: 12, idleClaimedAt: now, updatedAt: now, onboardingStep: 4, partyIds: ["mia", "leon", "garen", "luna"], partyCap: 4, redGems: 5000, claimedRewards: ["dodge-tutorial"], pioneeredArea: 5, equippedWeaponLevel: 8 };
  const titans = { gold: 900000, stage: 20, bestStage: 20, heroes: { mia: 8, leon: 6, garen: 5, luna: 5 }, lastActiveAt: now };
  await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); }, { [`dodgebullets:progression:v1:${H}`]: JSON.stringify(progress), [`dodgebullets:titans:${H}`]: JSON.stringify(titans), "dodge-bullets:soundEnabled": "0", "dodgebullets:test-phase": "0", "dodgebullets:inapp-fs-hint": "1" });
  await page.reload({ waitUntil: "networkidle" }); await sleep(2500);
  await page.evaluate(() => { for (let k = 0; k < 4; k += 1) { const c = document.querySelector(".idle-claim"); if (c) { c.click(); continue; } const b = [...document.querySelectorAll("button")].filter((x) => /^(닫기|확인|나중에)$/.test(x.textContent.trim()))[0]; if (b) b.click(); } });
  await sleep(1200);
  // 동료·몬스터 띠 · 이펙트 띠 · 아이콘이 이 엔진에서 실제로 디코딩되는가
  const decode = await page.evaluate(async () => {
    const urls = ["/titans/anim/allies/mia.webp", "/titans/anim/allies/leon.webp", "/titans/anim/monsters/goblin.webp", "/titans/anim/hero/hero-idle.webp", "/titans/anim/hero/hero-attack.webp", "/titans/fx/slash-default.webp", "/titans/fx/impact-fire.webp", "/ui/skills/titans/meteor.png", "/titans/character/base/hero-attack.png"];
    const out = {};
    for (const u of urls) out[u.split("/").pop()] = await new Promise((res) => { const i = new Image(); i.onload = () => res(i.naturalWidth); i.onerror = () => res(0); i.src = u; });
    return out;
  });
  ok(`${dev} 그림 디코딩(webp 띠 · 이펙트 · 아이콘 · 주인공 시트)`, Object.values(decode).every((v) => v > 0), JSON.stringify(decode));
  // 2026-10-19 애니메이션 2판: 동료 칸 그림은 .ally-body 안의 .ally-sprite(anim/allies/<id>.webp) — 1판 띠(frames/)도 센다
  const allyBg = await page.evaluate(() => [...document.querySelectorAll(".titans-allies .ally-body")].map((e) => { const sp = e.querySelector(".ally-sprite"); return (sp ? getComputedStyle(sp).backgroundImage : getComputedStyle(e).backgroundImage).match(/anim\/allies\/|frames\//) ? 1 : 0; }).reduce((a, b) => a + b, 0));
  ok(`${dev} 사냥터 동료가 3D 프레임 띠로 그려진다`, allyBg >= 3, `띠 동료 ${allyBg}`);
  const layout = async (screen) => {
    const r = await page.evaluate(() => {
      const nav = document.querySelector(".titans-bottom-nav")?.getBoundingClientRect();
      const btns = [...document.querySelectorAll("button")].filter((b) => b.offsetParent && getComputedStyle(b).visibility !== "hidden").map((b) => b.getBoundingClientRect()).filter((b) => b.width > 0);
      return { sw: document.documentElement.scrollWidth, iw: innerWidth, ih: innerHeight, nav: nav ? [Math.round(nav.top), Math.round(nav.bottom)] : null, outX: btns.filter((b) => b.right > innerWidth + 1 || b.left < -1).length };
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
  await page.evaluate(() => document.querySelector(".intro-start, .cta.intro-cta, .overlay-content .cta")?.click()); await sleep(3000);
  // 캔버스가 실제로 그려졌는가 — 가운데 줄 픽셀이 한 가지 색이 아니다
  const cv = await page.evaluate(() => {
    const c = document.querySelector("canvas"); if (!c) return null;
    const b = c.getBoundingClientRect();
    const g = c.getContext("2d"); const d = g.getImageData(0, Math.floor(c.height * 0.6), c.width, 1).data;
    const colors = new Set(); for (let i = 0; i < d.length; i += 16) colors.add(`${d[i] >> 4},${d[i + 1] >> 4},${d[i + 2] >> 4}`);
    return { w: Math.round(b.width), bottom: Math.round(b.bottom), ih: innerHeight, colors: colors.size };
  });
  await page.screenshot({ path: `${OUT}/${dev}-dodge-battle.png` });
  ok(`${dev} 성문 방어: 캔버스가 화면을 채우고 그려진다`, !!cv && cv.w >= w - 2 && cv.bottom <= cv.ih + 1 && cv.colors > 8, JSON.stringify(cv));
  ok(`${dev} 페이지 오류 없음`, errors.length === 0, errors.slice(0, 2).join(" / "));
  ok(`${dev} 없는 파일(404) 없음`, missing.length === 0, [...new Set(missing)].slice(0, 4).join(" "));
  await ctx.close();
}
await browser.close();
console.log(fails ? `${fails} FAIL` : "ALL PASS");
process.exit(fails ? 1 : 0);
