/**
 * 스토어 스크린샷 자동 촬영 — store/listing.md의 촬영 가이드 6장면.
 *
 *   node scripts/store-screenshots.mjs   (vite dev 서버가 5173에 떠 있어야 한다)
 *
 * Play Console 규격: 세로 1080×1920 (CSS 360×640 × 3배율).
 * 오버레이 장면(정산·개척)은 dev 전용 QA 패널(?qa=1)로 띄운다 — 실제 컴포넌트를
 * 그대로 렌더하므로 합성이 아니라 진짜 앱 화면이다.
 */
import { mkdirSync } from "node:fs";
import puppeteer from "puppeteer";

const BASE = "http://localhost:5173";
const OUT = "store/screenshots";
mkdirSync(OUT, { recursive: true });

const H = "mock-local-dev";
const now = Date.now();

/** 볼만한 진행 상태 — 동료 4인, Stage 22, 강화 +15, 성벽 250층 */
const progress = {
  version: 5, level: 58, exp: 320000, sharedCoins: 8_420_000, redGems: 12,
  enhancementMaterials: 143, equippedWeaponLevel: 15, bestForgeLevel: 15, reforgeRank: 6,
  equippedShoulder: "dragon", ownedShoulders: ["scout", "shadow", "ogre", "dragon"],
  shoulderShards: 40, pioneeredArea: 4, dodgeBestStage: 3, dodgeBestScore: 18740,
  towerBestFloor: 250, titanBestStage: 22,
  beatSkills: { kick: 32, hat: 18, snare: 12, fire: 8, throat: 5 }, skillPoints: 14,
  claimedRewards: [], claimedBadges: [], equippedBadges: [],
  rebirthCount: 0, inheritanceCrystals: 0, evolutionPoints: 0, evolutionPath: "novice",
  attendanceStreak: 6, idleClaimedAt: now, lastContent: "titans", updatedAt: now,
};
const titans = {
  gold: 1_260_000, stage: 22, bestStage: 22, swordLevel: 40,
  equipmentTraining: { weaponMastery: 42, shoulderMastery: 12 },
  skillInventory: {
    learned: ["strike", "crit", "clone", "warcry"],
    levels: { strike: 4, crit: 3, clone: 2, warcry: 1, steel: 0 },
    equipped: { starter: "strike", linkA: "crit", linkB: "clone", finisher: "warcry" },
    skillCores: 3,
  },
  heroes: { mia: 24, leon: 18, sera: 12, garen: 6, ari: 2, nox: 0 },
  totalKills: 4820, totalTaps: 1200, lastActiveAt: now,
};
const forge = {
  gold: 0, goldMigrated: true, level: 15, tickets: 4, shards: 62,
  bestLevel: 15, totalAttempts: 240, mode: "steady", pendingFailure: false, reforgeAttempts: 12,
};
const attendance = {
  lastClaimDate: new Date().toLocaleDateString("sv-SE"),
  lastClaimTimestamp: now, consecutiveDays: 6, boardIndex: 6, totalDays: 6,
};

async function seed(page) {
  await page.evaluate((s) => {
    localStorage.clear();
    for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v);
  }, {
    [`dodgebullets:progression:v1:${H}`]: JSON.stringify(progress),
    [`dodgebullets:titans:${H}`]: JSON.stringify(titans),
    [`dodgebullets:forge:${H}`]: JSON.stringify(forge),
    [`dodgebullets:attendance:v1:${H}`]: JSON.stringify(attendance),
    "dodge-bullets:soundEnabled": "0",
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function clickText(page, selector, text) {
  return page.evaluate(({ selector, text }) => {
    const el = [...document.querySelectorAll(selector)].find((b) => b.textContent.trim().includes(text));
    if (el) el.click();
    return !!el;
  }, { selector, text });
}

async function closeBootModals(page) {
  // 출석 모달(부팅 시 항상 열림) 닫기
  for (let i = 0; i < 3; i += 1) {
    const closed = await clickText(page, ".attendance-card .cta", "닫기");
    if (closed) break;
    await sleep(600);
  }
  await sleep(400);
}

async function shot(page, name) {
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log("shot:", name);
}

const browser = await puppeteer.launch({ headless: "shell", args: ["--force-device-scale-factor=3"] });
const page = await browser.newPage();
await page.setViewport({ width: 360, height: 640, deviceScaleFactor: 3, isMobile: true, hasTouch: true });

// ── 1. 사냥터 전투 ──
await page.goto(`${BASE}/`, { waitUntil: "networkidle0" });
await seed(page);
await page.goto(`${BASE}/`, { waitUntil: "networkidle0" });
await sleep(2500);
await closeBootModals(page);
await sleep(2200); // 동료 공격 모션이 도는 순간
await shot(page, "01-hunt-battle");

// ── 2·4. QA 패널 장면 (귀환 정산 · 개척 연출) ──
await page.goto(`${BASE}/?qa=1`, { waitUntil: "networkidle0" });
await sleep(2500);
await closeBootModals(page);
await clickText(page, ".qa-row button", "정산 · 최대치");
await sleep(1400);
await page.evaluate(() => { document.querySelector(".qa-panel")?.style.setProperty("display", "none"); });
await shot(page, "02-idle-report");
await page.evaluate(() => { document.querySelector(".qa-panel")?.style.removeProperty("display"); });
await clickText(page, ".idle-card .cta", "보상 수령");
await sleep(700);

// 지역 선택 3(용암 협곡) → 개척 연출
await page.evaluate(() => {
  const picks = [...document.querySelectorAll(".qa-area-pick button")];
  picks[3]?.click();
});
await sleep(300);
await clickText(page, ".qa-row button", "개척 연출");
await sleep(1900); // phase-reveal 구간 (성문 열린 뒤)
await page.evaluate(() => { document.querySelector(".qa-panel")?.style.setProperty("display", "none"); });
await shot(page, "04-area-unlock");

// ── 3. 화살 원정 인게임 ──
await page.goto(`${BASE}/`, { waitUntil: "networkidle0" });
await sleep(2200);
await closeBootModals(page);
await clickText(page, "button", "화살 원정");
await sleep(1400);
await clickText(page, ".cta", "스테이지 1 시작");
await sleep(5200); // 인트로 자동 시작 + 화살이 깔리는 시점
await shot(page, "03-dodge-action");

// ── 5. 대장간 무한 재련 ──
await page.goto(`${BASE}/`, { waitUntil: "networkidle0" });
await sleep(2200);
await closeBootModals(page);
await clickText(page, "button", "대장간");
await sleep(2400);
await page.evaluate(() => { document.querySelector(".reforge-panel")?.scrollIntoView({ block: "center" }); });
await sleep(500);
await shot(page, "05-forge-reforge");

// ── 6. 비트 수련 허브 ──
await page.goto(`${BASE}/`, { waitUntil: "networkidle0" });
await sleep(2200);
await closeBootModals(page);
await clickText(page, "button", "비트 수련");
await sleep(2600);
await shot(page, "06-beat-hub");

await browser.close();
console.log("done →", OUT);
