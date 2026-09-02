/**
 * 모바일 뷰포트 겹침 검사 (첫 플레이 점검표 #11) — 360×640 · 390×844 · 768×1024.
 *
 *   node scripts/inspect-mobile.mjs   (vite dev 서버 5173 필요)
 *
 * 사냥터 화면에서 터치 대상(스킬 독·탭·목표 칩·힌트)의 바운딩 박스를 모아
 * 서로 겹치는 쌍과 화면 밖으로 나간 요소를 보고하고, 각 뷰포트를 촬영한다.
 */
import { mkdirSync } from "node:fs";
import puppeteer from "puppeteer";

const BASE = "http://localhost:5173";
const OUT = process.env.OUT ?? "store/mobile-inspect";
mkdirSync(OUT, { recursive: true });

const VIEWPORTS = [
  { name: "360x640", width: 360, height: 640, dsf: 2 },
  { name: "390x844", width: 390, height: 844, dsf: 2 },
  { name: "768x1024", width: 768, height: 1024, dsf: 1.5 },
];

const H = "mock-local-dev";
const now = Date.now();
const progress = {
  version: 5, level: 30, sharedCoins: 500000, redGems: 300, enhancementMaterials: 60,
  equippedWeaponLevel: 8, bestForgeLevel: 8, pioneeredArea: 2, titanBestStage: 9,
  dodgeBestStage: 2, towerBestFloor: 0, idleClaimedAt: now, updatedAt: now, onboardingStep: 4,
  partyIds: ["mia", "leon", "sera", "garen"], partyCap: 4, skillPoints: 6,
};
const titans = {
  gold: 40000, stage: 9, bestStage: 9,
  equipmentTraining: { weaponMastery: 8, shoulderMastery: 2 },
  skillInventory: { learned: ["strike", "crit"], levels: { strike: 2, crit: 1, clone: 0, warcry: 0, steel: 0 }, equipped: { starter: "strike", linkA: "crit" }, skillCores: 2 },
  heroes: { mia: 8, leon: 5, sera: 3, garen: 1, ari: 0, nox: 0, luna: 0, volt: 0, mia_dark: 0, sera_light: 0 },
  lastActiveAt: now,
};

const SELECTORS = [
  ".titans-skill-dock",
  ".titans-skill-dock .titans-skill",
  ".titans-hint",
  ".titans-goals .goal-chip",
  ".titans-content-tabs button",
  ".titans-tabs button",
  ".titans-hp",
  ".titans-back",
  ".titans-wallet",
];

const browser = await puppeteer.launch({ headless: "shell", args: ["--no-sandbox", "--disable-gpu"] });
const page = await browser.newPage();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let problems = 0;
for (const vp of VIEWPORTS) {
  await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: vp.dsf, isMobile: vp.width < 700, hasTouch: true });
  await page.goto(BASE, { waitUntil: "networkidle0" });
  await page.evaluate((s) => {
    localStorage.clear();
    for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v);
  }, {
    [`dodgebullets:progression:v1:${H}`]: JSON.stringify(progress),
    [`dodgebullets:titans:${H}`]: JSON.stringify(titans),
    "dodge-bullets:soundEnabled": "0",
  });
  await page.goto(BASE, { waitUntil: "networkidle0" });
  await sleep(2600);
  await page.evaluate(() => {
    [...document.querySelectorAll("button")].find((b) => /받기|확인|닫기/.test(b.textContent))?.click();
  });
  await sleep(900);

  const report = await page.evaluate((selectors) => {
    const boxes = [];
    for (const sel of selectors) {
      document.querySelectorAll(sel).forEach((el, i) => {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return;
        boxes.push({ sel: `${sel}[${i}]`, x: r.x, y: r.y, w: r.width, h: r.height, right: r.right, bottom: r.bottom });
      });
    }
    const overlaps = [];
    const isAncestor = (a, b) => a.sel.split("[")[0] !== b.sel.split("[")[0] && (a.sel.includes(b.sel.split("[")[0]) || b.sel.includes(a.sel.split("[")[0]));
    for (let i = 0; i < boxes.length; i += 1) {
      for (let j = i + 1; j < boxes.length; j += 1) {
        const a = boxes[i];
        const b = boxes[j];
        if (a.sel.split("[")[0] === b.sel.split("[")[0]) continue; // 같은 그룹 내 형제는 제외
        if (isAncestor(a, b)) continue; // 독 ↔ 독 내부 버튼
        const ox = Math.min(a.right, b.right) - Math.max(a.x, b.x);
        const oy = Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y);
        if (ox > 4 && oy > 4) overlaps.push(`${a.sel} ↔ ${b.sel} (${Math.round(ox)}×${Math.round(oy)}px)`);
      }
    }
    // 허브는 세로 스크롤 화면 — 아래로 넘어간 요소(belowFold)는 스크롤로 닿으므로 문제로 세지 않는다.
    // 가로 넘침·음수 좌표만 실제 결함이다.
    const offscreen = boxes
      .filter((b) => b.x < -1 || b.y < -1 || b.right > window.innerWidth + 1)
      .map((b) => `${b.sel} @ ${Math.round(b.x)},${Math.round(b.y)} ${Math.round(b.w)}×${Math.round(b.h)}`);
    const belowFold = boxes.filter((b) => b.bottom > window.innerHeight + 1 && b.x >= -1 && b.right <= window.innerWidth + 1).length;
    const small = boxes
      .filter((b) => /titans-skill\[|content-tabs|titans-tabs|goal-chip/.test(b.sel) && (b.w < 36 || b.h < 30))
      .map((b) => `${b.sel} ${Math.round(b.w)}×${Math.round(b.h)}px`);
    return { count: boxes.length, overlaps, offscreen, small, belowFold };
  }, SELECTORS);

  await page.screenshot({ path: `${OUT}/titans-${vp.name}.png`, fullPage: false });
  const issues = report.overlaps.length + report.offscreen.length + report.small.length;
  problems += issues;
  console.log(`\n[${vp.name}] elements=${report.count} overlaps=${report.overlaps.length} offscreen=${report.offscreen.length} small-touch=${report.small.length} belowFold(스크롤)=${report.belowFold}`);
  report.overlaps.forEach((o) => console.log("  overlap:", o));
  report.offscreen.forEach((o) => console.log("  offscreen:", o));
  report.small.forEach((o) => console.log("  small touch target (<36×30):", o));
}

await browser.close();
console.log(problems === 0 ? "\nMOBILE OK" : `\n${problems} issue(s)`);
process.exit(problems === 0 ? 0 : 1);
