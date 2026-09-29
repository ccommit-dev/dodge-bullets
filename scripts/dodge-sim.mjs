/**
 * 화살 원정 검객 봇 시뮬 — 새 검격 규칙(스윙 호·정타 반사·파쇄)으로 스테이지 패턴 수치를 재조정하기 위한 계측.
 *
 * 봇 정책(숙련자 근사): 가장 먼저 닿을 화살을 고르고
 *   - 0.42초 안에 닿고 검격이 준비됐으면 그쪽을 바라보고 스윙 (정타 거리면 반사)
 *   - 아니면 위에서 오면 x 로 비켜서고, 옆에서 몸 높이로 오면 점프, 그 외엔 화면 중앙으로 복귀
 * 스테이지별 5시드 평균의 피격·베기·반사·클리어율을 낸다. 목표: 피격 ≤ HP−1 로 클리어, 베기율 ≥ 40%.
 *   node scripts/dodge-sim.mjs [--json]
 */
import { build } from "esbuild";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd().replace(/\\/g, "/");
const dir = mkdtempSync(join(tmpdir(), "dodgesim-"));
const entry = join(dir, "entry.ts");
writeFileSync(entry, [
  `export * as world from "${root}/src/game/world";`,
  `export * as shop from "${root}/src/game/shop";`,
  `export * as input from "${root}/src/game/input";`,
  `export * as stages from "${root}/src/game/stages";`,
  `export * as perks from "${root}/src/game/perks";`,
  `export * as skills from "${root}/src/game/skills";`,
  `export * as chips from "${root}/src/game/chips";`,
].join("\n"));
const out = join(dir, "bundle.mjs");
await build({ entryPoints: [entry], bundle: true, format: "esm", outfile: out, platform: "node", define: { "import.meta.env.BASE_URL": '"/"', "import.meta.env.DEV": "false", "import.meta.env.PROD": "true" } });
globalThis.window ??= { setTimeout, clearTimeout, addEventListener() {}, removeEventListener() {} };
globalThis.document ??= { createElement: () => ({ getContext: () => null, style: {} }) };
globalThis.Image ??= class { set src(_v) {} };
const { world: W, shop, input: I, stages, perks: P, skills: SK, chips: CH } = await import(pathToFileURL(out).href);
rmSync(dir, { recursive: true, force: true });

/** 결정적 난수 (mulberry32) — Math.random 을 시드별로 바꿔 끼운다 */
function seeded(seed) { let a = seed >>> 0; return () => { a += 0x6d2b79f5; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/**
 * 봇의 카드 선택 — 사람처럼 고른다: 습득 > 에픽 > 레어 > 일반 (2026-09-29).
 * 전에는 첫 자리 카드를 무조건 골라 런이 끝날 때까지 5종 중 3.8종만 습득했다 — 성장한 계정이
 * 스킬을 못 살려 중간(75%)과 강함(80%)이 거의 같게 나왔다. 봇이 서툴러서 생긴 착시였다.
 */
function pickCard(cards) {
  const score = (c) => (c.learns ? 100 : 0) + (c.rarity === "epic" ? 30 : c.rarity === "rare" ? 20 : 10);
  return [...cards].sort((x, y) => score(y) - score(x))[0];
}

/** 봇의 한 프레임 입력 — 가장 먼저 닿을 화살을 보고 벨지·피할지 정한다 (두 시뮬 공용) */
function botInput(w, p, inp, opts, seenArrows) {
  // 위협 평가
  let best = null;
  for (let i = 0; i < w.arrows.length; i += 1) {
    const a = w.arrows[i];
    if (!a.active || a.reflected || a.warningMs > 0) continue;
    seenArrows.add(i + ":" + Math.round(a.x) + ":" + Math.round(a.y) + ":" + a.kind);
    const dx = p.x - a.x, dy = p.y - a.y;
    const sp = Math.hypot(a.vx, a.vy) || 1;
    const along = (dx * a.vx + dy * a.vy) / sp; // 진행 방향 거리
    if (along < -10) continue; // 이미 지나감
    const lateral = Math.abs(dx * a.vy - dy * a.vx) / sp;
    if (lateral > 46) continue; // 안 맞을 궤도
    const tti = along / sp;
    if (!best || tti < best.tti) best = { a, tti, along, dx: -dx, dy: -dy, lateral };
  }
  inp.left = false; inp.right = false; inp.jumpPressed = false; inp.slowPressed = false; inp.dashPressed = false;
  const ready = p.slowCdMs <= 0 && p.slowActiveMs <= 0;
  if (best) {
    const fromRight = best.dx > 0; // 화살이 오른쪽에 있음
    const facingOk = (fromRight && p.facing > 0) || (!fromRight && p.facing < 0) || Math.abs(best.dx) < 12;
    // 스윙은 화살이 검격 반경(slowRadius) 안에 들어왔을 때 — 밖에서 휘두르면 헛스윙
    const reach = w.stats.slowRadius * (opts.reach ?? 0.92);
    if (best.along <= reach && ready) {
      if (!facingOk) { if (fromRight) inp.right = true; else inp.left = true; } // 이번 프레임에 방향 전환
      else inp.slowPressed = true;
    } else if (best.tti <= 0.22 && !ready && w.stats.dashUnlocked && p.dashCdMs <= 0 && p.dashActiveMs <= 0) {
      // 검격이 안 되면 마지막 순간 대시(무적 프레임)로 빠져나간다 — 숙련자의 두 번째 도구
      inp.dashPressed = true;
    } else if (best.tti <= 0.55 && (!ready || best.along > reach)) {
      // 못 베면 회피: 위에서 오면 옆으로, 옆에서 오면 점프
      const fromAbove = Math.abs(best.a.vy) > Math.abs(best.a.vx);
      if (fromAbove) { if (best.a.x >= p.x) inp.left = true; else inp.right = true; }
      else if (Math.abs(best.dy) < 40 && p.onGround) inp.jumpPressed = true;
      else { if (best.a.x >= p.x) inp.left = true; else inp.right = true; }
    } else if (best.tti > 0.7) {
      // 여유: 화살 쪽을 바라보고 중앙 근처 유지
      if (fromRight && p.facing < 0) inp.right = true; else if (!fromRight && p.facing > 0) inp.left = true;
    }
  } else if (p.x < w.width * 0.42) inp.right = true; else if (p.x > w.width * 0.58) inp.left = true;
}

export function simulateStage(stageIndex, seed, opts = {}) {
  const rng = seeded(seed);
  const realRandom = Math.random;
  Math.random = rng;
  const w = W.createWorld(390, 700, 1);
  // 스테이지 도달 시점의 성장(30일 밸런스 시뮬 기준): Lv 8/21/37/55 · 장착 검 3/6/10/13 · 원정 최고 스테이지 = 현재
  const growth = [{ level: 8, equippedWeaponLevel: 3 }, { level: 21, equippedWeaponLevel: 6 }, { level: 37, equippedWeaponLevel: 10 }, { level: 55, equippedWeaponLevel: 13 }][Math.min(3, stageIndex)];
  W.applyStats(w, shop.statsFromLevels(shop.derivedShopLevels({ ...growth, dodgeBestStage: stageIndex + 1 })));
  // 원거리 스킬 레벨 — opts.skills 로 넣으면 자동 발사가 켜진다 (레벨 0 = 기존 기준선)
  if (opts.skills) { w.skillLevels = { ...w.skillLevels, ...opts.skills }; w.rangedWeapon = opts.weapon ?? "none"; }
  W.resetRun(w, stageIndex);
  // 런 강화 카드(진화·콤보) — resetRun 이 카드를 비우므로 **그 뒤에** 얹는다
  if (opts.mods) w.runMods = { ...w.runMods, ...opts.mods, evolutions: { ...w.runMods.evolutions, ...(opts.mods.evolutions ?? {}) } };
  // 습득은 런 중 카드로 한다(봇은 첫 자리 카드를 고른다). 빌드끼리 비교할 때는 acquireAll 로 전부 습득한 상태에서 잰다
  if (opts.acquireAll) for (const [id, lv] of Object.entries(w.skillLevels)) if (lv > 0 && id !== "ultimate") w.runSkills[id] = true;
  const inp = I.createInputState();
  const dt = 1 / 60;
  let hits = 0, spawnedMax = 0, frames = 0, clear = false, dead = false, perkSeed = seed * 0.11; let hitLog = [];
  let seenArrows = new Set();
  const p = w.player;
  const stage = stages.getStage(stageIndex);
  // 실제 스테이지는 보스가 쓰러질 때까지 이어진다 — 지속 시간의 2.5배까지 본다
  const totalFrames = Math.ceil((stage.durationMs / 1000) / dt * 2.5);
  while (frames < totalFrames) {
    frames += 1;
    botInput(w, p, inp, opts, seenArrows);
    const ev = W.updateWorld(w, dt, true, inp);
    // 런 레벨업 — 플레이어처럼 성장 선택 하나를 고른다 (결정적: 후보 중 첫 번째)
    if (w.levelUps > 0) { w.levelUps = 0; const card = pickCard(P.pickPerks(w, () => ((perkSeed += 0.37) % 1))); if (card) P.applyPerk(w, card.id); }
    if (ev.type === "hit") { hits += 1; (hitLog ??= []).push(`${w.lastHitCause}@${Math.round(w.stageElapsedMs / 1000)}s`); }
    if (ev.type === "dead") { dead = true; break; }
    if (ev.type === "clear") { clear = true; break; }
  }
  Math.random = realRandom;
  return { stage: stageIndex, seed, hits, hitLog, cuts: w.countered, skillKills: w.skillKills, reflects: w.reflectKills, ults: w.ultCount, maxCombo: w.maxCombo, dodged: w.dodged, clear, dead, seconds: Math.round(frames * dt), hp: p.maxHp };
}

/** 계정 단계 — 새 계정 / 중간 / 강함. 성장(레벨·검)·스킬·칩을 함께 올린다 */
export const TIERS = {
  new: { label: "새 계정", level: 8, sword: 3, bestStage: 1, skills: { fire: 1 }, chipLevels: {}, equipped: [null, null, null] },
  mid: { label: "중간", level: 30, sword: 8, bestStage: 3, skills: { fire: 4, water: 4, ice: 3, earth: 3, ultimate: 3 }, chipLevels: { focus: 2, vitality: 2 }, equipped: ["focus", "vitality", null] },
  strong: { label: "강함", level: 55, sword: 13, bestStage: 4, skills: { fire: 8, water: 8, ice: 8, earth: 8, bolt: 8, ultimate: 8 }, chipLevels: { focus: 4, barrage: 5, vitality: 5 }, equipped: ["focus", "barrage", "vitality"] },
};

/**
 * 한 런 — S1 에서 출발해 죽거나 S4 를 깰 때까지. 카드·습득은 이어지고 HP 는 스테이지마다 찬다(실제 게임과 같다).
 * @returns reached: 깬 스테이지 수(0~4) · hits · acquired
 */
export function simulateRun(seed, tier = TIERS.new, opts = {}) {
  const rng = seeded(seed);
  const realRandom = Math.random;
  Math.random = rng;
  const w = W.createWorld(390, 700, 1);
  w.skillLevels = { ...w.skillLevels, ...tier.skills };
  w.rangedWeapon = tier.weapon ?? "bow";
  w.chips = CH.chipModsOf({ ...CH.emptyChipLevels(), ...tier.chipLevels }, tier.equipped, CH.chipSlotsOpen(tier.bestStage));
  w.collectionMul = SK.collectionCooldownMul(w.skillLevels);
  // App.loadLoadout 과 같은 순서 — 성장 파생 → 일섬 → 칩 → 이번 런 카드
  const load = () => {
    const st = SK.applySkillLevels(shop.statsFromLevels(shop.derivedShopLevels({ level: tier.level, equippedWeaponLevel: tier.sword, dodgeBestStage: tier.bestStage })), w.skillLevels);
    st.extraLives += w.chips.extraLives;
    const m = w.runMods;
    st.moveSpeed *= m.moveSpeedMul; st.dashCooldownMs *= m.dashCooldownMul; st.slashLevel += m.slashLevelBonus; st.extraLives += m.maxHpBonus;
    W.applyStats(w, st);
  };
  load();
  W.resetRun(w, 0);
  const inp = I.createInputState();
  const dt = 1 / 60;
  const p = w.player;
  const seen = new Set();
  let hits = 0, reached = 0, perkSeed = seed * 0.11, dead = false;
  for (let stageIndex = 0; stageIndex < 4 && !dead; stageIndex += 1) {
    if (stageIndex > 0) { load(); W.beginStage(w, stageIndex); }
    const stage = stages.getStage(stageIndex);
    const total = Math.ceil((stage.durationMs / 1000) / dt * 2.5);
    let cleared = false;
    for (let f = 0; f < total; f += 1) {
      botInput(w, p, inp, opts, seen);
      const ev = W.updateWorld(w, dt, true, inp);
      if (w.levelUps > 0) { w.levelUps = 0; const card = pickCard(P.pickPerks(w, () => ((perkSeed += 0.37) % 1))); if (card) P.applyPerk(w, card.id); }
      if (ev.type === "hit") hits += 1;
      if (ev.type === "dead") { dead = true; break; }
      if (ev.type === "clear") { cleared = true; break; }
    }
    if (!cleared) break;
    reached = stageIndex + 1;
  }
  Math.random = realRandom;
  return { seed, reached, hits, acquired: Object.keys(w.runSkills).filter((k) => w.runSkills[k]), runLevel: w.runLevel };
}

/** 계정 단계별 도달 분포 — [S1 에서 끝, S2 에서 끝, S3, S4, 전부 클리어] */
export function runCurve(seeds = 20) {
  const rows = [];
  for (const key of Object.keys(TIERS)) {
    const runs = Array.from({ length: seeds }, (_, i) => simulateRun(1009 * (i + 1) + 7, TIERS[key]));
    const dist = [0, 1, 2, 3, 4].map((n) => runs.filter((r) => r.reached === n).length);
    rows.push({ tier: TIERS[key].label, clearS1: runs.filter((r) => r.reached >= 1).length, clearS2: runs.filter((r) => r.reached >= 2).length, clearS3: runs.filter((r) => r.reached >= 3).length, clearS4: runs.filter((r) => r.reached >= 4).length, n: seeds, dist: dist.join("/"), avgAcquired: +(runs.reduce((a, r) => a + r.acquired.length, 0) / seeds).toFixed(1), avgLevel: +(runs.reduce((a, r) => a + r.runLevel, 0) / seeds).toFixed(1) });
  }
  return rows;
}

export function runAll() {
const rows = [];
for (let stage = 0; stage < stages.STAGES.length; stage += 1) {
  const runs = [1, 2, 3, 4, 5].map((seed) => simulateStage(stage, seed * 7919 + stage));
  const avg = (k) => runs.reduce((s, r) => s + r[k], 0) / runs.length;
  const spawned = runs.map((r) => r.cuts + r.dodged + r.hits);
  const cutRate = runs.reduce((s, r, i) => s + r.cuts / Math.max(1, spawned[i]), 0) / runs.length;
  const causes = runs.flatMap((r) => r.hitLog).join(" ");
  rows.push({ causes, stage: stage + 1, name: stages.STAGES[stage].name, hp: runs[0].hp, hits: +avg("hits").toFixed(1), cuts: +avg("cuts").toFixed(1), reflects: +avg("reflects").toFixed(1), ults: +avg("ults").toFixed(1), cutRate: +(cutRate * 100).toFixed(0), clear: runs.filter((r) => r.clear).length, dead: runs.filter((r) => r.dead).length });
}
return rows;
}

const isMain = !!process.argv[1] && process.argv[1].endsWith("dodge-sim.mjs");
if (isMain) {
  const rows = runAll();
  if (process.argv.includes("--json")) console.log(JSON.stringify(rows));
  else {
  console.log("| 스테이지 | HP | 피격 | 베기 | 반사 | 일섬 | 베기율 | 클리어/5 | 사망/5 |");
  console.log("|---|---|---|---|---|---|---|---|---|");
  for (const r of rows) console.log(`| ${r.stage} ${r.name} | ${r.hp} | ${r.hits} | ${r.cuts} | ${r.reflects} | ${r.ults} | ${r.cutRate}% | ${r.clear} | ${r.dead} |`);
  if (process.argv.includes("--causes")) for (const r of rows) console.log(`S${r.stage} 피격 원인: ${r.causes}`);
  }
}
