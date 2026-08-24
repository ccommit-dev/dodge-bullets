import { createArrowPool, resetArrows, updateArrows } from "./arrows";
import type { InputState } from "./input";
import { createPlayer, GRAVITY, resetPlayer } from "./player";
import { emptyShopLevels, statsFromLevels } from "./shop";
import { getStage } from "./stages";
import type { GameWorld, Platform, PlayerStats } from "./types";

function floorYOf(height: number, safeBottom: number): number {
  return height - safeBottom - 18;
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
  };
  applyStageLayout(world);
  return world;
}

export function applyStats(world: GameWorld, stats: PlayerStats): void {
  world.stats = stats;
  world.player.radius = 16 * stats.hitboxScale;
}

export function applyStageLayout(world: GameWorld): void {
  const stage = getStage(world.stageIndex);
  world.platforms = materializePlatforms(world, stage.platforms);
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
  world.maxCombo = 0;
  world.comboTimerMs = 0;
  world.countered = 0;
  world.supplies = 0;
  world.enemyKills = 0;
  world.perfectDodges = 0;
  world.chests = 0;
  world.expeditionSeals = 0;
  world.floorY = floorYOf(world.height, world.safeBottom);
  resetArrows(world);
  resetPlayer(world.player, world.width, world.floorY, world.stats.extraLives);
  world.player.radius = 16 * world.stats.hitboxScale;
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
  resetArrows(world);
  resetPlayer(world.player, world.width, world.floorY, world.stats.extraLives);
  world.player.radius = 16 * world.stats.hitboxScale;
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

  world.elapsedMs += dtSec * 1000;
  world.stageElapsedMs += dtSec * 1000;

  const p = world.player;
  const stats = world.stats;
  p.animTime += dtSec;
  if (p.invulnMs > 0) p.invulnMs = Math.max(0, p.invulnMs - dtSec * 1000);
  if (p.dashCdMs > 0) p.dashCdMs = Math.max(0, p.dashCdMs - dtSec * 1000);
  if (p.dashActiveMs > 0) p.dashActiveMs = Math.max(0, p.dashActiveMs - dtSec * 1000);
  if (p.slowCdMs > 0) p.slowCdMs = Math.max(0, p.slowCdMs - dtSec * 1000);
  if (p.slowActiveMs > 0) p.slowActiveMs = Math.max(0, p.slowActiveMs - dtSec * 1000);
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

    // Jump
    if (input.jumpPressed && p.onGround) {
      p.vy = -stats.jumpPower;
      p.onGround = false;
    }

    // Dash
    if (input.dashPressed && stats.dashUnlocked && p.dashCdMs <= 0 && p.dashActiveMs <= 0) {
      p.dashActiveMs = stats.dashDurationMs;
      p.dashCdMs = stats.dashCooldownMs;
      p.invulnMs = Math.max(p.invulnMs, stats.dashIFramesMs);
      if (!input.left && !input.right && !input.pointerActive) {
        // keep facing
      }
    }

    // Slow field
    if (input.slowPressed && stats.slowUnlocked && p.slowCdMs <= 0 && p.slowActiveMs <= 0) {
      p.slowActiveMs = stats.slowDurationMs;
      p.slowCdMs = stats.slowCooldownMs;
    }
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

  const arrowHit = updateArrows(world, dtSec);

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
  );

  const stage = getStage(world.stageIndex);
  if (!world.stageClear && world.stageElapsedMs >= stage.durationMs) {
    world.stageClear = true;
    if (p.hp === p.maxHp) world.expeditionSeals += 2;
    if (world.chests > 0) world.expeditionSeals += 1;
    return { type: "clear" };
  }

  if (arrowHit && p.hp > 0) {
    p.hp -= 1;
    p.anim = "hit";
    p.animTime = 0;
    p.invulnMs = 950;
    p.vy = -220;
    p.onGround = false;
    world.combo = 0;
    world.comboTimerMs = 0;
    if (p.hp <= 0) {
      p.anim = "dead";
      p.animTime = 0;
      return { type: "dead" };
    }
    return { type: "hit", remainingHp: p.hp };
  }

  return { type: "none" };
}
