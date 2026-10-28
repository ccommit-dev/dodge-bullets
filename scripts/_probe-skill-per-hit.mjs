// 스킬 한 방 · 횟수 — 무기별 (2026-10-28). 운석 쿨 38초 > 30초 창이라 합계는 위상에 흔들린다 → 긴 창(600초)으로 평균 · 이름별 한 방
//   node scripts/_probe-skill-per-hit.mjs [sec=60]   (vite 5173 · TitansGame DEV 집계 skill:<이름>)
// 결과(2026-10-27 · 치명 기댓값 · 약점 끔 · 검 기준): 창 방치 ×0.84 · 탭 ×0.87 · 대장 ×1.12 / 활 ×0.99 · ×0.98 · ×1.00 / 지팡이 ×0.99 · ×0.97 · ×0.90. 스킬 긴 평균 창 ×0.82 · 활 ×0.89 · 지팡이 ×0.95 (설계 0.85 · 0.88 · 0.97).
// 대장의 스킬은 한 판 값이 아니라 긴 평균 × 대장 배율 — 대장 제한 30초 < 운석 쿨 38초라 한 판에 운석 0~1번(쿨타임 위상)에 달린다
//   node scripts/_probe-weapon-dps2.mjs [stage=40] [sec=30]   (vite 5173)
import { launchBrowser } from "./launch-browser.mjs";
const BASE = "http://localhost:5173", H = "mock-local-dev", now = Date.now();
const browser = await launchBrowser({ args: ["--no-sandbox"] }); const page = await browser.newPage(); const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = []; page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
await page.goto(BASE, { waitUntil: "networkidle0" });
let fails = 0; const ok = (n, c, d = "") => { console.log(`${c ? "PASS" : "FAIL"} ${n}${d ? " — " + d : ""}`); if (!c) fails += 1; };
const prog = () => page.evaluate((H) => JSON.parse(localStorage.getItem(`dodgebullets:progression:v1:${H}`) ?? "{}"), H);
const tit = () => page.evaluate((H) => JSON.parse(localStorage.getItem(`dodgebullets:titans:${H}`) ?? "{}"), H);
const clickText = (sel, text) => page.evaluate(({ sel, text }) => { const el = [...document.querySelectorAll(sel)].find((b) => b.textContent.trim().includes(text)); el?.click(); return !!el; }, { sel, text });
const base = { version: 5, level: 20, redGems: 100, idleClaimedAt: now, updatedAt: now, onboardingStep: 4, sessionCount: 9, partyIds: ["mia", "leon"], partyCap: 4, claimedRewards: ["dodge-tutorial"], pioneeredArea: 3, discoverySeeded: true, discovered: [], equippedWeaponLevel: 6, sharedCoins: 9e7, enhancementMaterials: 999, expeditionWeaponForge: { bow: 4, staff: 2, spear: 8 }, dodgeBestStage: 5 };
const seed = async (progress, titans) => {
  await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); }, { [`dodgebullets:progression:v1:${H}`]: JSON.stringify(progress), [`dodgebullets:titans:${H}`]: JSON.stringify(titans), [`dodgebullets:attendance:v1:${H}`]: JSON.stringify({ lastClaimDate: new Date().toLocaleDateString("sv-SE"), totalDays: 3, consecutiveDays: 3 }) });
  await page.reload({ waitUntil: "networkidle0" }); await sleep(1300);
  await page.evaluate(() => { for (let k = 0; k < 5; k += 1) { const c = document.querySelector(".idle-claim"); if (c) { c.click(); continue; } const b = [...document.querySelectorAll("button")].filter((x) => !x.closest(".titans-bottom-nav")).find((x) => /^(닫기|확인|나중에)$/.test(x.textContent.trim())); if (b) b.click(); } });
  await sleep(400);
};
const titansBase = { gold: 1e6, stage: 8, bestStage: 8, totalKills: 100, heroes: { mia: 10, leon: 10 }, lastActiveAt: now, skillInventory: { learned: ["strike", "emberCut", "crit"], levels: { strike: 1, emberCut: 1, crit: 1 }, equipped: { starter: "strike" }, skillCores: 0 } };

// 고정 난수 — 무기마다 같은 치명 · 스킬 굴림 (페이지마다 새로 심는다)
await page.evaluateOnNewDocument(() => { let s = 20261027; Math.random = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; });
// DEV 측정 모드 — 치명은 기댓값 · 대장 약점(무작위 ×1.6) 끔 (TitansGame __huntProbe). 운석 몇 번의 치명이 ±15% 흔들던 것을 없앤다
await page.evaluateOnNewDocument(() => { window.__huntProbe = { expectCrit: true, noWeak: true }; });
const STAGE = Number(process.argv[2] ?? 40), SEC = Number(process.argv[3] ?? 30), REPS = Number(process.argv[4] ?? 2), BOSS_STAGE = Number(process.argv[5] ?? 29);
const heroes = { mia: 30, leon: 30, sera: 25, garen: 25 };
const skills = { learned: ["strike", "crit", "clone", "meteor", "steel"], levels: { strike: 1, crit: 1, clone: 1, meteor: 1, steel: 1 }, equipped: { starter: "strike", linkA: "crit", linkB: "clone", finisher: "meteor", passive: "steel" }, skillCores: 0 };
const tb = { ...titansBase, gold: 1e6, stage: STAGE, bestStage: STAGE, heroes, autoSkill: true, skillInventory: { ...skills, loadouts: { sword: skills.equipped, spear: skills.equipped, bow: skills.equipped, staff: skills.equipped } },
  equipmentTraining: { weaponMastery: 40, shoulderMastery: 0, helmetMastery: 0, armorMastery: 0, glovesMastery: 0, bootsMastery: 0 } };
for (const kind of ["sword", "spear", "bow", "staff"]) {
  await seed({ ...base, equippedWeaponKind: kind, equippedWeaponLevel: 9, expeditionWeaponForge: { bow: 12, staff: 12, spear: 12 }, partyIds: Object.keys(heroes), pioneeredArea: 5 }, tb);
  await sleep(4000);
  // 측정 중 페이지가 다시 불리면(소스 편집 HMR) 집계가 비어 버린다 — 표식이 사라졌으면 RELOADED 로 알린다
  await page.evaluate(() => { window.__huntDmgReset?.(); window.__probeMark = 1; }); await sleep(Number(process.argv[2] ?? 60) * 1000);
  if (!(await page.evaluate(() => window.__probeMark === 1))) console.log(kind, "RELOADED — 이 값은 버린다");
  const d = await page.evaluate(() => window.__huntState().dmg);
  const per = Object.entries(d).filter(([k]) => k.startsWith("skill:")).map(([k, v]) => `${k.slice(6)} ${Math.round(v / (d["#" + k] || 1))}×${d["#" + k]}`).join(" · ");
  console.log(kind, `skill ${Math.round(d.skill ?? 0)}`, per);
}
await browser.close();
