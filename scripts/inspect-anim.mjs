/**
 * 동료·몬스터 애니메이션 정지 프레임 검사 — 무기 앵커/모션 정렬을 눈으로 확인한다.
 *
 *   node scripts/inspect-anim.mjs   (vite dev 서버 5173 필요)
 *
 * 모든 CSS 애니메이션을 음수 delay로 특정 시점에 고정(pause)한 뒤 촬영한다.
 * 산출: scratch/anim/{rest,attack,monster}.png
 */
import { mkdirSync } from "node:fs";
import puppeteer from "puppeteer";

const BASE = "http://localhost:5173";
const OUT = process.env.OUT ?? "store/anim-inspect";
mkdirSync(OUT, { recursive: true });

const H = "mock-local-dev";
const now = Date.now();

const progress = {
  version: 5, level: 60, exp: 340000, sharedCoins: 9_000_000, redGems: 3000,
  enhancementMaterials: 200, equippedWeaponLevel: 15, bestForgeLevel: 15, reforgeRank: 6,
  equippedShoulder: "dragon", ownedShoulders: ["scout", "shadow", "ogre", "dragon"],
  shoulderShards: 40, pioneeredArea: 4, dodgeBestStage: 3, dodgeBestScore: 18740,
  towerBestFloor: 250, titanBestStage: 22,
  beatSkills: { kick: 32, hat: 18, snare: 12, fire: 8, throat: 5 }, skillPoints: 14,
  claimedRewards: [], claimedBadges: [], equippedBadges: [],
  rebirthCount: 0, inheritanceCrystals: 0, evolutionPoints: 0, evolutionPath: "novice",
  attendanceStreak: 6, idleClaimedAt: now, lastContent: "titans", updatedAt: now,
  onboardingStep: 4,
  // 검사 대상 6인 — 문제 후보(luna·volt·얼터 2종) 포함
  partyIds: ["mia", "garen", "luna", "volt", "mia_dark", "sera_light"],
  partyCap: 6,
  allyStars: { mia: 1, leon: 1, sera: 1, garen: 1, ari: 1, nox: 1, luna: 1, volt: 1, mia_dark: 1, sera_light: 1 },
};
const titans = {
  gold: 1_260_000, stage: 22, bestStage: 22, swordLevel: 40,
  equipmentTraining: { weaponMastery: 42, shoulderMastery: 12 },
  skillInventory: {
    learned: ["strike"], levels: { strike: 4, crit: 0, clone: 0, warcry: 0, steel: 0 },
    equipped: { starter: "strike" }, skillCores: 3,
  },
  heroes: { mia: 24, leon: 18, sera: 12, garen: 6, ari: 2, nox: 1, luna: 3, volt: 3, mia_dark: 3, sera_light: 3 },
  totalKills: 4820, totalTaps: 1200, autoSkill: false, battleSpeed: 1, lastActiveAt: now,
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({ headless: "shell", args: ["--no-sandbox", "--disable-gpu"] });
const page = await browser.newPage();
await page.setViewport({ width: 420, height: 760, deviceScaleFactor: 2 });

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
// 정산 모달 닫기
await page.evaluate(() => {
  for (let k = 0; k < 3; k += 1) { const c = document.querySelector(".idle-claim"); if (c) { c.click(); continue; } const b = [...document.querySelectorAll("button")].filter((x) => !x.closest(".recommend-banner, .routine-board, .titans-tabs, .titans-content-tabs")).find((x) => /출석|수령|받기|확인|닫기/.test(x.textContent)); if (!b) break; b.click(); }
});
await sleep(1400);
// 스테이지 전환 중이면 전투 페이즈까지 대기 (전환 프레임을 찍으면 동료가 없다)
for (let i = 0; i < 40; i += 1) {
  const inCombat = await page.evaluate(() => !document.querySelector(".titans-transition-skip") && !!document.querySelector(".titans-monster") && document.querySelectorAll(".titans-allies > *").length > 0);
  if (inCombat) break;
  await sleep(250);
}

async function freezeAt(delaySec) {
  await page.evaluate((d) => {
    document.querySelectorAll(".titans-field *").forEach((el) => {
      el.style.animationPlayState = "paused";
      el.style.animationDelay = `${d}s`;
    });
  }, delaySec);
}

async function shotField(name) {
  const field = await page.$(".titans-field");
  await field.screenshot({ path: `${OUT}/${name}.png` });
  console.log("shot", name);
}

// 1) 대기 자세 — 무기 앵커 정렬 검사
await freezeAt(0);
await shotField("rest");

// 2) 전원 공격 중간 프레임 — is-attacking 강제 + 음수 delay로 스윙 중간 고정
await page.evaluate(() => {
  document.querySelectorAll(".titans-allies .ally-swing").forEach((el) => el.classList.add("is-attacking"));
});
await freezeAt(-0.28);
await shotField("attack-mid");

// 3) 스윙 초반(와인드업)
await freezeAt(-0.12);
await shotField("attack-windup");

// 4) 몬스터 공격 프레임
await page.evaluate(() => {
  const m = document.querySelector(".titans-monster");
  m?.classList.remove("action-idle");
  m?.classList.add("action-attack");
});
await freezeAt(-0.3);
await shotField("monster-attack");

// 5) 동료별 근접 촬영 — 무기 앵커 정렬 검사 (교전 이동 해제 + 단독 표시)
await page.evaluate(() => {
  document.querySelectorAll(".titan-ally-art").forEach((el) => {
    el.classList.remove("is-engaged", "is-approaching");
    el.style.transform = "none";
  });
  document.querySelectorAll(".titans-allies .ally-swing").forEach((el) => el.classList.remove("is-attacking"));
});
await freezeAt(0);
const ids = ["mia", "garen", "luna", "volt", "mia_dark", "sera_light"];
for (const id of ids) {
  await page.evaluate((target) => {
    document.querySelectorAll(".titan-ally-art").forEach((el) => {
      el.style.visibility = el.classList.contains(`ally-${target}`) ? "visible" : "hidden";
    });
  }, id);
  const el = await page.$(`.titan-ally-art.ally-${id}`);
  if (el) {
    const box = await el.boundingBox();
    await page.screenshot({
      path: `${OUT}/solo-${id}.png`,
      clip: { x: Math.max(0, box.x - 14), y: Math.max(0, box.y - 14), width: box.width + 28, height: box.height + 28 },
    });
    console.log("solo", id, JSON.stringify(box));
  } else {
    console.log("missing", id);
  }
}

await browser.close();
console.log("done →", OUT);
