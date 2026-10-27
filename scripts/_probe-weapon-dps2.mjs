// 무기 4종 실제 DPS — 통제 측정 (2026-10-27 아쉬운 점 "실제 차이를 확정"). 죽지 않는 몬스터(40층) · 대장은 원정대가 버티는 층(29) · 고정 난수 · 출처별(대장은 @boss 로 따로)
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
const ALL = ["tap", "auto", "tech", "ally", "skill"];
// boss=true 면 대장이 서 있는 동안만 센다(대장에게 준 피해 '@boss' · 대장이 있던 시간). 대장이 쓰러지거나 원정대가 쓰러지면 그만
const measure = async (taps, sec, boss = false) => {
  await page.evaluate(() => window.__huntDmgReset?.());
  const t0 = Date.now(); let combat = 0, n = 0, last = t0;
  while (Date.now() - t0 < sec * 1000) {
    if (taps) await page.keyboard.press("Space");
    const st = await page.evaluate(() => window.__huntState()); const now = Date.now();
    if (boss ? st.boss && st.phase === "combat" : st.phase === "combat" && st.formation) combat += now - last;
    n += 1; last = now;
    if (boss && !st.boss && now - t0 > 2000) break;
    await sleep(taps ? 1000 / taps : 200);
  }
  const live = Math.max(0.5, combat / 1000);
  const d = await page.evaluate(() => window.__huntState().dmg);
  const key = (k) => (boss ? `${k}@boss` : k);
  const parts = Object.fromEntries(ALL.map((k) => [k, Math.round((d[key(k)] ?? 0) / live)]));
  return { dps: ALL.reduce((a, k) => a + (d[key(k)] ?? 0), 0) / live, parts, combat: live / ((Date.now() - t0) / 1000), el: live };
};
const rows = {};
for (const kind of ["sword", "spear", "bow", "staff"]) {
  const r = { idle: [], tap: [], boss: [] };
  for (let rep = 0; rep < REPS; rep += 1) {
    await seed({ ...base, equippedWeaponKind: kind, equippedWeaponLevel: 9, expeditionWeaponForge: { bow: 12, staff: 12, spear: 12 }, partyIds: Object.keys(heroes), pioneeredArea: 5 }, tb);
    await sleep(4000);
    r.idle.push(await measure(0, SEC)); r.tap.push(await measure(5, SEC));
    // 대장 — 원정대가 25초쯤 버티는 층(BOSS_STAGE)에서 따로 (40층 대장은 반격에 몇 초 만에 원정대가 쓰러져 일반 몬스터로 돌아갔다)
    await seed({ ...base, equippedWeaponKind: kind, equippedWeaponLevel: 9, expeditionWeaponForge: { bow: 12, staff: 12, spear: 12 }, partyIds: Object.keys(heroes), pioneeredArea: 5 }, { ...tb, stage: BOSS_STAGE, bestStage: BOSS_STAGE });
    await sleep(4000);
    await page.evaluate(() => window.__huntStartBoss?.()); await sleep(1500);
    r.boss.push(await measure(5, 30, true));
  }
  rows[kind] = r;
  console.error(kind, JSON.stringify(Object.fromEntries(Object.entries(r).map(([m, a]) => [m, a.map((x) => ({ dps: Math.round(x.dps), c: +x.combat.toFixed(2), el: Math.round(x.el), parts: x.parts }))]))));
}
const avg = (a) => a.reduce((x, y) => x + y.dps, 0) / a.length;
// 표본 표준오차(평균의 ±%) — 스킬(운석 · 치명)이 흔들림의 대부분
const spread = (a) => { const m = avg(a); const v = a.reduce((x, y) => x + (y.dps - m) ** 2, 0) / Math.max(1, a.length - 1); return Math.sqrt(v / a.length) / m; };
const partAvg = (a, k) => a.reduce((x, y) => x + (y.parts[k] ?? 0), 0) / a.length;
console.log(`STAGE ${STAGE} · 전투 시간당 피해 · 검 기준 (두 번 잰 차이)`);
const out = {};
for (const [kind, r] of Object.entries(rows)) {
  const s0 = rows.sword;
  const f = (m) => `${Math.round(avg(r[m])).toLocaleString()} ×${(avg(r[m]) / avg(s0[m])).toFixed(2)} (±${Math.round(spread(r[m]) * 100)}%)`;
  const parts = (m) => ALL.map((k) => `${k} ×${(partAvg(r[m], k) / Math.max(1, partAvg(s0[m], k))).toFixed(2)}`).join(" ");
  out[kind] = { idle: avg(r.idle) / avg(s0.idle), tap: avg(r.tap) / avg(s0.tap), boss: avg(r.boss) / avg(s0.boss), spread: Math.max(spread(r.idle), spread(r.tap), spread(r.boss)) };
  console.log(`${kind.padEnd(5)} 방치 ${f("idle")} · 탭5/초 ${f("tap")} · 대장(탭) ${f("boss")}`);
  console.log(`      출처별(탭5/초) ${parts("tap")} · 대장 ${parts("boss")}`);
}
console.log("JSON " + JSON.stringify(out));
ok("페이지 오류 없음", errors.length === 0, errors.join(" | "));
await browser.close();
