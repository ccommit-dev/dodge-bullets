import { TUNING, createArrowPool, resetArrows, resetBarrier, updateArrows } from "./arrows";
import { barrierRatio } from "./barrierLife";
import { emptyChipMods } from "./chips";
import { emptyRunMods, emptySfx, makeSkillFx, makeSkillShots, makeSparks, updateSkillShots, resetSkillShots } from "./skillShots";
import { emptySkillLevels } from "./skills";
import type { InputState } from "./input";
import { createPlayer, GRAVITY, resetPlayer } from "./player";
import { emptyShopLevels, statsFromLevels } from "./shop";
import { getStage } from "./stages";
import type { GameWorld, Platform, PlayerStats } from "./types";

/**
 * 조작 버튼(.action-dock, 높이 74px)이 화면 맨 아래에 깔려 있어 바닥이 그 뒤였다 —
 * 주인공이 버튼에 가려 "피하는 순간 내 캐릭터가 안 보이는" 상태였다 (2026-09-15 실측: 발 814, 독 770~844).
 * 바닥을 독 위로 올린다. 발판은 playH(= floorY − safeTop) 비율이라 같이 따라 올라간다.
 */
export const HUD_BOTTOM_RESERVE = 72;
function floorYOf(height: number, safeBottom: number): number {
  return height - safeBottom - 18 - HUD_BOTTOM_RESERVE;
}

function materializePlatforms(
  world: GameWorld,
  norms: Array<{ x: number; y: number; w: number; h: number }>,
): Platform[] {
  const playH = world.floorY - world.safeTop;
  return norms.map((n) => ({
    x: n.x * world.width,
    y: world.safeTop + n.y * playH,
    w: n.w * world.width,
    h: Math.max(10, n.h * playH),
  }));
}

export function createWorld(width: number, height: number, dpr: number): GameWorld {
  const safeTop = 12;
  const safeBottom = 12;
  const safeLeft = 8;
  const safeRight = 8;
  const floorY = floorYOf(height, safeBottom);
  const stats = statsFromLevels(emptyShopLevels());
  const player = createPlayer(width, floorY);
  player.maxHp = 3 + stats.extraLives;
  player.hp = player.maxHp;
  player.radius = 16 * stats.hitboxScale;

  const world: GameWorld = {
    width,
    height,
    dpr,
    safeTop,
    safeBottom,
    safeLeft,
    safeRight,
    player,
    arrows: createArrowPool(),
    platforms: [],
    spawnAccMs: 0,
    stageElapsedMs: 0,
    elapsedMs: 0,
    dodged: 0,
    score: 0,
    stageIndex: 0,
    stageClear: false,
    floorY,
    stats,
    animClock: 0,
    combo: 0,
    maxCombo: 0,
    comboTimerMs: 0,
    countered: 0,
    supplies: 0,
    enemyKills: 0,
    perfectDodges: 0,
    chests: 0,
    expeditionSeals: 0,
    slashScore: 0,
    slashBuff: 0,
    slashGauge: 0,
    skillShots: makeSkillShots(),
    skillFx: makeSkillFx(),
    basicTimer: 0,
    shotFlashMs: 0,
    shotAngle: -Math.PI / 2,
    boltFrom: null,
    aimAngle: -Math.PI / 2,
    fades: [],
    bossSalvoMs: 0,
    bossFocus: 0,
    barrierHp: TUNING.barrierHp,
    barrierMaxHp: TUNING.barrierHp,
    barrierDownMs: 0,
    barrierFlashMs: 0,
    barrierHitX: width * 0.5,
    barrierBreaks: 0,
    barrierHits: 0,
    barrierBreachDamage: 0,
    hitStopMs: 0,
    runSkills: {},
    collectionMul: 1,
    affinityPop: null,
    sparks: makeSparks(),
    shakeMs: 0,
    shakeAmp: 0,
    streak: 0,
    streakMs: 0,
    sfx: emptySfx(),
    heroAura: null,
    skillLevels: emptySkillLevels(),
    basicLevel: 0,
    skillTimers: { fire: 0, water: 0, ice: 0, earth: 0, bolt: 0, wind: 0, poison: 0, holy: 0, shadow: 0, meteor: 0, ultimate: 0 },
    rangedWeapon: "none",
    loadout: [],
    weaponForge: { bow: 0, staff: 0 },
    holyBeam: null,
    skillKills: 0,
    epicPicks: 0,
    draftBoost: false,
    primedMs: 0,
    runMods: emptyRunMods(),
    chips: emptyChipMods(),
    ultFlashMs: 0,
    reflectKills: 0,
    ultCount: 0,
    lastCut: "" as const,
    lastCutMs: 0,
    slashHitFx: Array.from({ length: 24 }, () => ({ active: false, x: 0, y: 0, value: 0, lifeMs: 0, maxLifeMs: 0, boss: false, crit: false, energy: 0 })),
    slashDrops: Array.from({ length: 8 }, () => ({ active: false, x: 0, y: 0, vy: 0, kind: "edge" as const })),
    slashDebris: Array.from({ length: 48 }, () => ({ active: false, x: 0, y: 0, vx: 0, vy: 0, angle: 0, spin: 0, len: 0, lifeMs: 0, maxLifeMs: 0, kind: "spark" as const, color: "#67e8f9" })),
    lastHitCause: "",
    bossSpawned: false,
    bossDefeated: false,
    bossCutsLeft: 0,
    bossMaxCuts: 10,
    runXp: 0,
    runLevel: 1,
    levelUps: 0,
    tempo: 1,
  };
  applyStageLayout(world);
  return world;
}

export function applyStats(world: GameWorld, stats: PlayerStats): void {
  world.stats = stats;
  world.player.radius = 16 * stats.hitboxScale;
}

export function applyStageLayout(world: GameWorld): void {
  world.platforms = materializePlatforms(world, []);   // 발판 없음 — 점프가 없다 (2026-10-01). stage.platforms 는 더 쓰지 않는다
}

export function resizeWorld(world: GameWorld, width: number, height: number, dpr: number): void {
  const prevW = world.width || 1;
  const nx = world.player.x / prevW;
  world.width = width;
  world.height = height;
  world.dpr = dpr;
  world.floorY = floorYOf(height, world.safeBottom);
  world.player.x = nx * width;
  if (world.player.onGround) {
    world.player.y = world.floorY - world.player.radius;
  }
  applyStageLayout(world);
  clampX(world);
}

function clampX(world: GameWorld): void {
  const { player, width, safeLeft, safeRight } = world;
  const minX = safeLeft + player.radius;
  const maxX = width - safeRight - player.radius;
  player.x = Math.min(Math.max(player.x, minX), Math.max(minX, maxX));
}

/** 대장 처치 수 — 스테이지 표(stages.ts bossCuts: 4 + 0.55×스테이지, 중간 보스 ×1.25 · 장 대장 ×2)가 기준 (2026-10-02) */
export function bossCutsFor(stageIndex: number): number { return Math.max(1, Math.round(getStage(stageIndex).bossCuts * TUNING.bossCutMul)); }   // 2 → 6 (2026-10-01): 좌우 이동만 남은 뒤 성장이 갈리는 지렛대는 보스를 깎는 속도다 — 새 계정 S4 2/20 · 중간 10/20 · 강함 18/20

/** 런 레벨업에 필요한 XP — 베기 1 · 회피 1 · 보스 베기 4. 레벨이 오를수록 더 필요하다 */
export function runXpToNext(level: number): number {
  return 8 + level * 5;
}
export const RUN_TEMPO_PER_LEVEL = 0.045;
export const RUN_TEMPO_CAP = 1.25;
/** 런 XP 획득 — 레벨업하면 levelUps 를 올리고(UI 가 성장 선택으로 소비) tempo 를 올린다 */
export function gainRunXp(world: GameWorld, amount: number): void {
  world.runXp += amount;
  while (world.runXp >= runXpToNext(world.runLevel)) {
    world.runXp -= runXpToNext(world.runLevel);
    world.runLevel += 1;
    world.levelUps += 1;
    world.tempo = Math.min(RUN_TEMPO_CAP, 1 + RUN_TEMPO_PER_LEVEL * (world.runLevel - 1));
  }
}

export function resetRun(world: GameWorld, stageIndex = 0): void {
  world.stageIndex = stageIndex;
  world.elapsedMs = 0;
  world.stageElapsedMs = 0;
  world.spawnAccMs = 0;
  world.dodged = 0;
  world.score = 0;
  world.stageClear = false;
  world.animClock = 0;
  world.combo = 0;
  world.slashGauge = 0;
  world.ultFlashMs = 0;
  world.reflectKills = 0;
  world.ultCount = 0;
  world.lastCut = "";
  world.lastCutMs = 0;
  world.maxCombo = 0;
  world.comboTimerMs = 0;
  world.countered = 0;
  world.supplies = 0;
  world.enemyKills = 0;
  world.perfectDodges = 0;
  world.chests = 0;
  world.expeditionSeals = 0;
  world.slashScore = 0;
  world.slashBuff = 0;
  world.slashHitFx.forEach((fx) => { fx.active = false; });
  world.slashDrops.forEach((drop) => { drop.active = false; });
  world.slashDebris.forEach((d) => { d.active = false; });
  world.bossSpawned = false;
  world.bossDefeated = false;
  world.bossCutsLeft = 0;
  world.bossMaxCuts = bossCutsFor(stageIndex);
  world.runXp = 0;
  world.runLevel = 1;
  world.levelUps = 0;
  world.tempo = 1;
  world.floorY = floorYOf(world.height, world.safeBottom);
  resetArrows(world);
  resetSkillShots(world);
  resetBarrier(world);
  world.hitStopMs = 0;
  // 카드는 런 단위 — 새 런에서만 비운다 (스테이지 경계에서는 유지)
  world.runMods = emptyRunMods();
  // 장착한 스킬 무기는 런 시작부터 쏜다 (2026-10-02) — 예전엔 런 중 카드로 '습득'해야 나갔다
  world.runSkills = {};
  for (const id of world.loadout ?? []) if ((world.skillLevels[id] ?? 0) > 0) world.runSkills[id] = true;
  world.draftBoost = false;
  world.primedMs = 0;
  resetPlayer(world.player, world.width, world.floorY, world.stats.extraLives);
  world.player.radius = 16 * world.stats.hitboxScale;
  resetBarrier(world);   // 생명(player.maxHp)이 정해진 뒤 — 방어막 최대치가 거기서 나온다
  applyStageLayout(world);
}

export function beginStage(world: GameWorld, stageIndex: number): void {
  world.stageIndex = stageIndex;
  world.stageElapsedMs = 0;
  world.spawnAccMs = 0;
  world.stageClear = false;
  world.combo = 0;
  world.comboTimerMs = 0;
  world.countered = 0;
  world.supplies = 0;
  world.enemyKills = 0;
  world.perfectDodges = 0;
  world.chests = 0;
  world.expeditionSeals = 0;
  world.slashScore = 0;
  world.slashBuff = 0;
  world.slashHitFx.forEach((fx) => { fx.active = false; });
  world.slashDrops.forEach((drop) => { drop.active = false; });
  world.slashDebris.forEach((d) => { d.active = false; });
  world.bossSpawned = false;
  world.bossDefeated = false;
  world.bossCutsLeft = 0;
  world.bossMaxCuts = bossCutsFor(stageIndex);
  resetArrows(world);
  resetSkillShots(world);
  resetBarrier(world);
  world.hitStopMs = 0;
  resetPlayer(world.player, world.width, world.floorY, world.stats.extraLives);
  world.player.radius = 16 * world.stats.hitboxScale;
  resetBarrier(world);
  applyStageLayout(world);
}

function resolvePlatforms(world: GameWorld): void {
  const p = world.player;
  p.onGround = false;

  // Floor
  if (p.vy >= 0 && p.y + p.radius >= world.floorY) {
    p.y = world.floorY - p.radius;
    p.vy = 0;
    p.onGround = true;
  }

  for (let i = 0; i < world.platforms.length; i++) {
    const pl = world.platforms[i];
    const withinX = p.x + p.radius * 0.4 > pl.x && p.x - p.radius * 0.4 < pl.x + pl.w;
    const wasAbove = p.y + p.radius <= pl.y + 8;
    const nowAt = p.y + p.radius >= pl.y && p.y + p.radius <= pl.y + pl.h + 12;
    if (withinX && wasAbove && nowAt && p.vy >= 0) {
      p.y = pl.y - p.radius;
      p.vy = 0;
      p.onGround = true;
    }
  }

  // Ceiling / top clamp soft
  if (p.y - p.radius < world.safeTop) {
    p.y = world.safeTop + p.radius;
    p.vy = Math.max(0, p.vy);
  }
}

function computeScore(
  elapsedMs: number,
  dodged: number,
  stageIndex: number,
  combo: number,
  maxCombo: number,
): number {
  const pace = Math.floor(elapsedMs / 70);
  const dodgePts = dodged * 12;
  const stagePts = stageIndex * 80;
  const comboPts = Math.floor(combo * 4 + maxCombo * 6);
  return pace + dodgePts + stagePts + comboPts;
}

export type WorldEvent =
  | { type: "none" }
  | { type: "hit"; remainingHp: number }
  | { type: "dead" }
  | { type: "clear" };

/** @returns gameplay event this frame */
export function updateWorld(
  world: GameWorld,
  dtSec: number,
  running: boolean,
  input: InputState,
): WorldEvent {
  world.animClock += dtSec;
  if (!running) return { type: "none" };
  // 월드 시간 — 몬스터·대장·마력탄·스테이지 시계는 실제의 TUNING.pace(1/3) 로 흐른다 (2026-10-02, "진행 속도 3배 느리게").
  // 주인공 쪽(이동 · 활 · 스킬 무기 · 날아가는 화살)은 실제 시간 — 아웃로 디펜스처럼 몬스터는 천천히 걸어오고 무기는 쉴 새 없이 쏜다.
  // 무기가 같은 시간에 세 배 쏘는 만큼 몬스터 체력·대장 처치 수가 세 배다(TUNING.monsterHpMul · bossCutMul)
  const wdt = dtSec * TUNING.pace;

  world.elapsedMs += wdt * 1000;
  world.stageElapsedMs += wdt * 1000;

  const p = world.player;
  const stats = world.stats;
  p.animTime += dtSec;
  if (p.invulnMs > 0) p.invulnMs = Math.max(0, p.invulnMs - dtSec * 1000);
  if (p.dashCdMs > 0) p.dashCdMs = Math.max(0, p.dashCdMs - dtSec * 1000);
  if (p.dashActiveMs > 0) p.dashActiveMs = Math.max(0, p.dashActiveMs - dtSec * 1000);
  if (p.slowCdMs > 0) p.slowCdMs = Math.max(0, p.slowCdMs - dtSec * 1000);
  if (p.slowActiveMs > 0) p.slowActiveMs = Math.max(0, p.slowActiveMs - dtSec * 1000);
  if (world.ultFlashMs > 0) world.ultFlashMs = Math.max(0, world.ultFlashMs - dtSec * 1000);
  if (world.lastCutMs > 0) world.lastCutMs = Math.max(0, world.lastCutMs - dtSec * 1000);
  if (p.landingFxMs > 0) p.landingFxMs = Math.max(0, p.landingFxMs - dtSec * 1000);
  const wasOnGround = p.onGround;

  // Horizontal control
  if (p.anim !== "dead") {
    if (p.dashActiveMs > 0) {
      p.vx = p.facing * stats.dashSpeed;
    } else if (input.pointerActive) {
      const dx = input.pointerX - p.x;
      p.vx = Math.max(-stats.moveSpeed, Math.min(stats.moveSpeed, dx * 14));
      if (Math.abs(dx) > 4) p.facing = dx > 0 ? 1 : -1;
    } else {
      let dx = 0;
      if (input.left) dx -= 1;
      if (input.right) dx += 1;
      p.vx = dx * stats.moveSpeed;
      if (dx !== 0) p.facing = dx > 0 ? 1 : -1;
    }

    // 점프·대시·일제 사격은 없다 (2026-10-01, 아웃로 디펜스 차용) — 좌우 이동만. 입력 플래그는 호환을 위해 남기되 읽지 않는다
  }

  // Integrate
  p.x += p.vx * dtSec;
  p.vy += GRAVITY * dtSec;
  p.y += p.vy * dtSec;
  clampX(world);
  resolvePlatforms(world);

  // Anim state
  if (wasOnGround === false && p.onGround) p.landingFxMs = 180;

  if (p.anim !== "dead" && p.anim !== "hit") {
    if (p.dashActiveMs > 0) {
      if (p.anim !== "dash") { p.anim = "dash"; p.animTime = 0; }
    } else if (p.slowActiveMs > 0 && p.slowActiveMs > world.stats.slowDurationMs - 260) {
      if (p.anim !== "skill") { p.anim = "skill"; p.animTime = 0; }
    } else if (!p.onGround) {
      const nextAnim = p.vy < 0 ? "jump" : "fall";
      if (p.anim !== nextAnim) {
        p.anim = nextAnim;
        p.animTime = 0;
      }
    } else if (Math.abs(p.vx) > 20) {
      if (p.anim !== "run") {
        p.anim = "run";
        p.animTime = 0;
      }
    } else if (p.anim !== "idle") {
      p.anim = "idle";
      p.animTime = 0;
    }
  } else if (p.anim === "hit" && p.animTime > 0.35 && p.hp > 0) {
    p.anim = p.onGround ? "idle" : p.vy < 0 ? "jump" : "fall";
    p.animTime = 0;
  }

  // 원거리 스킬 자동 발사 — 화살 갱신 **앞**에서 돌려 이번 프레임에 요격된 화살이 바로 사라지게
  updateSkillShots(world, dtSec);
  const arrowDamage = updateArrows(world, wdt);

  for (const fx of world.slashHitFx) {
    if (!fx.active) continue;
    fx.lifeMs -= dtSec * 1000;
    fx.y -= dtSec * (fx.boss ? 34 : 52);
    if (fx.lifeMs <= 0) fx.active = false;
  }
  for (const d of world.slashDebris) {
    if (!d.active) continue;
    d.lifeMs -= dtSec * 1000;
    if (d.lifeMs <= 0) { d.active = false; continue; }
    if (d.kind !== "streak") {
      d.vy += (d.kind === "spark" ? 420 : 760) * dtSec;
      d.vx *= 1 - 1.6 * dtSec;
      d.x += d.vx * dtSec;
      d.y += d.vy * dtSec;
      d.angle += d.spin * dtSec;
      if (d.y > world.floorY - 4 && d.kind !== "spark") { d.y = world.floorY - 4; d.vy *= -0.32; d.vx *= 0.6; d.spin *= 0.5; }
    }
  }
  for (const drop of world.slashDrops) {
    if (!drop.active) continue;
    drop.vy += 620 * dtSec;
    drop.y += drop.vy * dtSec;
    if (drop.y > world.floorY - 10) {
      drop.y = world.floorY - 10;
      drop.vy *= -0.28;
    }
    const dx = drop.x - p.x;
    const dy = drop.y - p.y;
    if (dx * dx + dy * dy <= (p.radius + 25) ** 2) {
      const gain = drop.kind === "rune" ? 3 : drop.kind === "core" ? 2 : 1;
      world.slashBuff = Math.min(8, world.slashBuff + gain);
      world.supplies += gain;
      world.slashScore += gain * 180;
      drop.active = false;
    }
  }

  // 전장의 중앙 보급 상자는 직접 전진해야 회수된다. 뒤에서 버티기만 해서는
  // 정제 강철 보상을 얻을 수 없다.
  const stageProgress = world.stageElapsedMs / Math.max(1, getStage(world.stageIndex).durationMs);
  if (world.chests === 0 && stageProgress >= 0.42 && stageProgress <= 0.78 && p.x >= world.width * 0.68) {
    world.chests = 1;
    world.supplies += 5;
  }

  if (world.comboTimerMs > 0) {
    world.comboTimerMs = Math.max(0, world.comboTimerMs - dtSec * 1000);
    if (world.comboTimerMs <= 0) world.combo = 0;
  }

  world.score = computeScore(
    world.elapsedMs,
    world.dodged,
    world.stageIndex,
    world.combo,
    world.maxCombo,
  ) + world.slashScore;

  if (!world.stageClear && world.bossSpawned && world.bossDefeated) {
    world.stageClear = true;
    if (barrierRatio(world) >= 0.9) world.expeditionSeals += 2;   // 방어막을 90% 이상 지키고 깼다
    if (world.chests > 0) world.expeditionSeals += 1;
    return { type: "clear" };
  }

  void arrowDamage;   // 플레이어는 맞지 않는다 (2026-10-02)
  // 패배 = 방어막 붕괴. 방어막이 유일한 생명이다
  if (world.barrierHp <= 0 && p.anim !== "dead") {
    p.hp = 0;
    p.anim = "dead";
    p.animTime = 0;
    return { type: "dead" };
  }

  return { type: "none" };
}
