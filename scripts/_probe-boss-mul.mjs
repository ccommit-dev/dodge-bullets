// 대장 배율 실측 (2026-10-28 아쉬운 점 "대장전 배율 실측") — 스킬 한 방 단위(DEV 집계 skill@boss:<이름>)로 대장 / 일반 몬스터 비를 무기마다. 운석 횟수 · 대장 제한 30초에 흔들리지 않는다
//   node scripts/_probe-boss-mul.mjs [일반 몬스터 초=20] [대장 수=4]   (vite 5173)
// 결과(2026-10-28 · 시동기만 · 치명 기댓값 · 약점 끔 · 40초 + 대장 3마리): 대장/일반 한 방 비 검 1.000 · 창 1.250 · 활 1.000 · 지팡이 1.000 — 설계(창 대장 1.25) 그대로.
//   버프 스킬(치명 · 분신)을 끼면 한 방이 버프 겹침에 따라 2배까지 달라져 표본 몇 개로는 못 잰다(첫 시도 검 0.84)
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
const MOB_SEC = Number(process.argv[2] ?? 20), BOSSES = Number(process.argv[3] ?? 4);
const out = {};
for (const kind of ["sword", "spear", "bow", "staff"]) {
  await seed({ ...base, equippedWeaponKind: kind, equippedWeaponLevel: 9, expeditionWeaponForge: { bow: 12, staff: 12, spear: 12 }, partyIds: Object.keys(heroes), pioneeredArea: 5 }, { ...tb, stage: 29, bestStage: 29, skillInventory: { ...tb.skillInventory, equipped: { starter: "strike" }, loadouts: { sword: { starter: "strike" }, spear: { starter: "strike" }, bow: { starter: "strike" }, staff: { starter: "strike" } } } });   // 버프 스킬(치명 · 분신) 없이 — 한 방이 늘 같은 값이라 표본 몇 개로 충분
  await sleep(4000);
  await page.evaluate(() => { window.__huntDmgReset?.(); window.__probeMark = 1; });
  await sleep(MOB_SEC * 1000);
  for (let b = 0; b < BOSSES; b += 1) {
    await page.evaluate(() => window.__huntStartBoss?.()); await sleep(1500);
    for (let i = 0; i < 160; i += 1) { const st = await page.evaluate(() => window.__huntState()); if (!st.boss) break; await sleep(200); }
    await sleep(800);
  }
  if (!(await page.evaluate(() => window.__probeMark === 1))) console.log(kind, "RELOADED — 버림");
  const d = await page.evaluate(() => window.__huntState().dmg);
  const per = (k) => (d["#" + k] ? d[k] / d["#" + k] : null);
  const row = {};
  for (const name of ["도토리 일격", "도토리 유성우"]) row[name] = { mob: per(`skill:${name}`), boss: per(`skill@boss:${name}`), nMob: d[`#skill:${name}`] ?? 0, nBoss: d[`#skill@boss:${name}`] ?? 0 };
  out[kind] = row;
  console.log(kind, Object.entries(row).map(([n, r]) => `${n} 대장/일반 ${r.mob && r.boss ? (r.boss / r.mob).toFixed(3) : "—"} (표본 ${r.nMob}/${r.nBoss})`).join(" · "));
}
const base0 = (n) => out.sword[n].boss / out.sword[n].mob;
console.log("검 기준 무기 대장 배율(설계 창 1.25 · 활 1 · 지팡이 1):");
for (const kind of ["spear", "bow", "staff"]) console.log(" ", kind, ["도토리 일격", "도토리 유성우"].map((n) => { const r = out[kind][n]; return r.mob && r.boss ? `${n} ×${(r.boss / r.mob / base0(n)).toFixed(3)}` : `${n} —`; }).join(" · "));
await browser.close();
