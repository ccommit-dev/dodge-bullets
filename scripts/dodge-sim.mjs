/**
 * 성문 방어 봇 시뮬 — 50 스테이지 · 한 판 = 한 스테이지 (2026-10-02).
 *
 * 봇: 좌우 이동만(활·스킬 무기는 자동), 레벨업 카드는 사람처럼 고른다(에픽 > 레어 > 일반).
 * 계정은 **프로필**로 넣는다 — 스테이지 s 에 도달할 때의 기대 성장(profileFor): 계정 레벨 → 해금된 스킬 무기 → 무기 레벨 →
 * 장착 4개 → 대장간 활·지팡이 → 칩. 게이트는 "기대 성장으로는 깨고, 8 스테이지쯤 덜 자란 계정은 막힌다"를 본다.
 *
 * 진행 속도(TUNING.pace = 1/3): 실제 dt 를 (1/60)/pace 로 넣어 월드 한 걸음을 1/60 로 같게 잰다 — 균형은 월드 시간 기준이고
 * 시뮬 비용도 그대로다(주인공 이동만 한 걸음에 세 배 움직인다 — 봇의 회피에는 영향이 거의 없다).
 *   node scripts/dodge-sim.mjs [--json]   — 체크포인트 스테이지마다 기대·덜 자란 계정의 클리어/5
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
  `export * as arrows from "${root}/src/game/arrows";`,
].join("\n"));
const out = join(dir, "bundle.mjs");
await build({ entryPoints: [entry], bundle: true, format: "esm", outfile: out, platform: "node", define: { "import.meta.env.BASE_URL": '"/"', "import.meta.env.DEV": "false", "import.meta.env.VITE_QA_BUILD": "undefined", "import.meta.env.VITE_TOSS_AD_GROUP_ID": "undefined", "import.meta.env.PROD": "true" } });
globalThis.window ??= { setTimeout, clearTimeout, addEventListener() {}, removeEventListener() {} };
globalThis.document ??= { createElement: () => ({ getContext: () => null, style: {} }) };
globalThis.Image ??= class { set src(_v) {} };
const { world: W, shop, input: I, stages, perks: P, skills: SK, chips: CH, arrows: AR } = await import(pathToFileURL(out).href);
rmSync(dir, { recursive: true, force: true });

/** 결정적 난수 (mulberry32) — Math.random 을 시드별로 바꿔 끼운다 */
function seeded(seed) { let a = seed >>> 0; return () => { a += 0x6d2b79f5; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/** 봇의 카드 선택 — 에픽 > 레어 > 일반 */
function pickCard(cards) {
  const score = (c) => (c.rarity === "epic" ? 30 : c.rarity === "rare" ? 20 : 10);
  return [...cards].sort((x, y) => score(y) - score(x))[0];
}

/** 봇의 한 프레임 입력 — 좌우 이동만. 떨어질 자리를 비키고, 안전하면 가운데로 */
function botInput(w, p, inp, opts) {
  const look = opts.look ?? 0.9, margin = opts.margin ?? 34;
  const minX = w.safeLeft + 18, maxX = w.width - w.safeRight - 18;
  const dangers = [];
  for (const a of w.arrows) {
    if (!a.active || a.reflected || a.warningMs > 0) continue;
    const dy = p.y - a.y;
    if (a.vy <= 1) { if (Math.abs(dy) < 40) dangers.push({ x: a.x + a.vx * 0.3, t: 0.1, r: margin }); continue; }
    const t = dy / a.vy;
    if (t < -0.05 || t > look) continue;
    let x = a.x + a.vx * Math.max(0, t);
    if (a.kind === "homing") x = (x + p.x) / 2;
    dangers.push({ x, t: Math.max(0.05, t), r: margin + (a.boss ? 24 : a.kind === "explosive" ? 30 : 0) + (a.hitRadius ?? 6) });
  }
  inp.left = false; inp.right = false; inp.jumpPressed = false; inp.slowPressed = false; inp.dashPressed = false;
  const danger = (x) => dangers.reduce((s, d) => s + (Math.abs(x - d.x) < d.r ? (d.r - Math.abs(x - d.x)) / d.t : 0), 0);
  const here = danger(p.x);
  if (here <= 0) {
    const mid = (minX + maxX) / 2;
    if (Math.abs(p.x - mid) > 60) { if (p.x < mid) inp.right = true; else inp.left = true; }
    return;
  }
  let best = null;
  for (let d = 12; d <= 240; d += 12) {
    for (const x of [p.x - d, p.x + d]) {
      if (x < minX || x > maxX) continue;
      const v = danger(x);
      if (v <= 0) { best = x; break; }
      if (!best && v < here * 0.5) best = x;
    }
    if (best !== null) break;
  }
  if (best === null) best = p.x < (minX + maxX) / 2 ? maxX : minX;
  if (best > p.x + 2) inp.right = true; else if (best < p.x - 2) inp.left = true;
}

/** 장착 우선순위 — 해금된 것 중 뒤에 열린(센) 무기부터 넷 */
const LOADOUT_PREF = ["meteor", "holy", "shadow", "poison", "wind", "bolt", "earth", "ice", "water", "fire"];

/**
 * 스테이지 s(0-based)에 도달할 때의 **기대 성장** — 주간 시뮬·경제와 맞춘 대략값.
 * lag 만큼 덜 자란 계정(= s − lag 의 성장)은 "8 스테이지 덜 자란" 비교에 쓴다
 */
export function profileFor(stageIndex, lag = 0) {
  const s = Math.max(0, stageIndex - lag);
  const level = Math.round(8 + 0.95 * s);
  const skillLv = Math.min(SK.SKILL_MAX_LEVEL, 1 + Math.floor(s / 5));
  const skills = {};
  for (const d of SK.EXPEDITION_SKILLS) if (d.id !== "ultimate" && level >= d.unlockLevel) skills[d.id] = skillLv;
  skills.ultimate = Math.min(SK.SKILL_MAX_LEVEL, Math.floor(s / 6));
  const loadout = LOADOUT_PREF.filter((id) => (skills[id] ?? 0) > 0).slice(0, SK.LOADOUT_MAX);
  const chipLv = Math.min(5, Math.floor(s / 8));
  return {
    label: lag ? `덜 자람(−${lag})` : "기대 성장",
    level, sword: Math.min(15, 3 + Math.floor(s / 4)), bestStage: s + 1,
    skills, loadout,
    forge: { bow: Math.min(SK.WEAPON_FORGE_MAX, Math.floor(s * 0.45)), staff: Math.min(SK.WEAPON_FORGE_MAX, Math.floor(s * 0.4)) },
    chipLevels: chipLv > 0 ? { focus: chipLv, vitality: chipLv, barrage: chipLv } : {},
    equipped: chipLv > 0 ? ["focus", "vitality", "barrage"] : [null, null, null],
    weapon: s >= 4 ? "staff" : "bow",
  };
}

/** 프로필을 월드에 싣는다 — App.loadLoadout 과 같은 순서(성장 파생 → 일섬 → 칩 → 런 카드) */
function loadProfile(w, prof) {
  w.skillLevels = { ...SK.emptySkillLevels(), ...prof.skills };
  w.rangedWeapon = prof.weapon ?? "bow";
  w.weaponForge = { ...(prof.forge ?? { bow: 0, staff: 0 }) };
  w.basicLevel = w.weaponForge.bow;
  w.loadout = (prof.loadout ?? []).filter((id) => (w.skillLevels[id] ?? 0) > 0);
  w.chips = CH.chipModsOf({ ...CH.emptyChipLevels(), ...(prof.chipLevels ?? {}) }, prof.equipped ?? [null, null, null], CH.chipSlotsOpen(prof.bestStage ?? 1));
  w.collectionMul = SK.collectionCooldownMul(w.skillLevels);
  const st = SK.applySkillLevels(shop.statsFromLevels(shop.derivedShopLevels({ level: prof.level ?? 8, equippedWeaponLevel: prof.sword ?? 3, dodgeBestStage: prof.bestStage ?? 1 })), w.skillLevels);
  st.extraLives += w.chips.extraLives;
  W.applyStats(w, st);
}

/**
 * 한 스테이지 — 대장을 쓰러뜨리면 클리어, 방어막이 0 이면 패배.
 * opts.profile 이 없으면 그 스테이지의 기대 성장. 예전 인자(opts.skills · weapon · basic · mods)도 받는다
 */
export function simulateStage(stageIndex, seed, opts = {}) {
  const rng = seeded(seed);
  const realRandom = Math.random;
  Math.random = rng;
  const w = W.createWorld(390, 700, 1);
  let prof = opts.profile ?? profileFor(stageIndex);
  if (opts.skills) prof = { ...prof, skills: { ...opts.skills }, loadout: opts.loadout ?? Object.keys(opts.skills).filter((k) => k !== "ultimate"), weapon: opts.weapon ?? "bow", forge: { bow: opts.basic ?? 0, staff: 0 }, chipLevels: {}, equipped: [null, null, null] };
  loadProfile(w, prof);
  W.resetRun(w, stageIndex);
  if (opts.mods) w.runMods = { ...w.runMods, ...opts.mods, evolutions: { ...w.runMods.evolutions, ...(opts.mods.evolutions ?? {}) } };
  const inp = I.createInputState();
  // 실제 dt 1/60 — 주인공 무기·화살은 실제 시간이라 큰 걸음이면 화살이 몬스터를 건너뛴다. 월드는 1/180 씩
  const dt = 1 / 60;
  const stage = stages.getStage(stageIndex);
  // 대장이 아주 천천히 내려오므로(TUNING.bossDescent) 길이의 3배까지 본다 (월드 초 → 실제 프레임)
  const totalFrames = Math.ceil((stage.durationMs / 1000) * 60 / AR.TUNING.pace * 3);
  let frames = 0, clear = false, dead = false, perkSeed = seed * 0.11, minRatio = 1, maxActive = 0, bossAt = -1, killedAt = -1;
  const p = w.player;
  while (frames < totalFrames) {
    frames += 1;
    botInput(w, p, inp, opts);
    const ev = W.updateWorld(w, dt, true, inp);
    if (w.levelUps > 0) { w.levelUps = 0; const card = pickCard(P.pickPerks(w, () => ((perkSeed += 0.37) % 1))); if (card) P.applyPerk(w, card.id); }
    if (w.barrierMaxHp > 0) minRatio = Math.min(minRatio, w.barrierHp / w.barrierMaxHp);
    maxActive = Math.max(maxActive, w.arrows.reduce((n, a) => n + (a.active ? 1 : 0), 0));
    if (bossAt < 0 && w.bossSpawned) bossAt = frames;
    if (ev.type === "dead") { dead = true; break; }
    if (ev.type === "clear") { clear = true; killedAt = frames; break; }
  }
  Math.random = realRandom;
  return {
    stage: stageIndex, seed, clear, dead, barrierMinRatio: minRatio, maxActive, poolFull: maxActive >= w.arrows.length,
    deathCause: dead ? w.lastHitCause : "", deathBoss: dead && w.bossSpawned,
    // 실제 초(= 월드 초 ÷ pace) — 대장이 나온 뒤 쓰러지기까지
    bossFightSec: bossAt >= 0 && killedAt > 0 ? Math.round((killedAt - bossAt) / 60) : -1,
    realSec: Math.round(frames / 60),
    skillKills: w.skillKills, ultCount: w.ultCount, runSkills: Object.keys(w.runSkills).filter((k) => w.runSkills[k]),
    hits: 0, barrierBreaks: w.barrierBreaks,
  };
}

/** 시드 n 개 — 클리어 수 · 방어막 최저 평균(%) */
export function stageGate(stageIndex, profile, seeds = 5) {
  const runs = Array.from({ length: seeds }, (_, i) => simulateStage(stageIndex, (i + 1) * 7919 + stageIndex * 31, { profile }));
  return {
    clear: runs.filter((r) => r.clear).length,
    minPct: Math.round(runs.reduce((s, r) => s + r.barrierMinRatio, 0) / runs.length * 100),
    pool: runs.some((r) => r.poolFull),
    realSec: Math.round(runs.reduce((s, r) => s + r.realSec, 0) / runs.length),
    runs,
  };
}

/** 체크포인트 — 각 장의 1·5·10칸 + 마지막 */
export const CHECKPOINTS = [0, 4, 9, 14, 19, 24, 29, 34, 39, 44, 49];

/** 체크포인트마다 기대 성장 vs 8 스테이지 덜 자란 계정 */
export function checkpointCurve(seeds = 5, lag = 8) {
  return CHECKPOINTS.map((s) => {
    const exp = stageGate(s, profileFor(s), seeds);
    const under = s >= lag ? stageGate(s, profileFor(s, lag), seeds) : null;
    return { stage: s, name: stages.STAGES[s].name, expected: exp.clear, expectedMin: exp.minPct, under: under ? under.clear : null, realSec: exp.realSec, pool: exp.pool };
  });
}

/** 주간 시뮬(dodge-week-sim)이 쓰는 모듈 묶음 — 번들에서 꺼낸 실제 소스 */
export const api = { SK, CH, W, shop, P, stages, AR, I };

const isMain = !!process.argv[1] && process.argv[1].endsWith("dodge-sim.mjs");
if (isMain) {
  const rows = checkpointCurve();
  if (process.argv.includes("--json")) console.log(JSON.stringify(rows));
  else {
    console.log("| 스테이지 | 이름 | 기대 성장 클리어/5 | 방어막 최저 | 덜 자람(−8) 클리어/5 | 실제 시간(초) |");
    console.log("|---|---|---|---|---|---|");
    for (const r of rows) console.log(`| ${r.stage + 1} | ${r.name} | ${r.expected} | ${r.expectedMin}% | ${r.under ?? "—"} | ${r.realSec}${r.pool ? " · 풀 가득" : ""} |`);
  }
}
