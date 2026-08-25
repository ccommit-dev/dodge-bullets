import { getStage } from "./stages";
import type { Arrow, ArrowPattern, GameWorld } from "./types";

const POOL_SIZE = 120;
const ARROW_LEN = 28;
const HIT_R = 5;
/** Tip within this band (beyond hit radius) counts as near-miss. */
const NEAR_MISS_PAD = 22;
const COMBO_WINDOW_MS = 1600;
const SPLIT_ORBIT_MS = 1_850;
const SPLIT_DAMAGE = [1, 0.65, 0.4, 0.25] as const;

export function createArrowPool(size = POOL_SIZE): Arrow[] {
  const pool: Arrow[] = new Array(size);
  for (let i = 0; i < size; i++) {
    pool[i] = {
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      length: ARROW_LEN,
      hitRadius: HIT_R,
      angle: Math.PI / 2,
      nearMissed: false,
      warningMs: 0,
      kind: "normal",
      bounces: 0,
      telegraph: "aerial",
      homingMs: 0,
      homingTurnRate: 0,
      splitLevel: 0,
      damage: 1,
      orbitMs: 0,
      orbitX: 0,
      orbitY: 0,
      orbitAngle: 0,
      orbitRadius: 0,
      orbitDirection: 1,
      orbitStretch: 1,
      orbitWobble: 0,
      orbitDriftX: 0,
      orbitDriftY: 0,
      splitGraceMs: 0,
      boss: false,
      bossTier: 0,
      bossCutsLeft: 0,
      bossMaxCuts: 0,
    };
  }
  return pool;
}

export function resetArrows(world: GameWorld): void {
  for (let i = 0; i < world.arrows.length; i++) {
    world.arrows[i].active = false;
    world.arrows[i].nearMissed = false;
  }
  world.spawnAccMs = 0;
}

function acquire(world: GameWorld): Arrow | null {
  for (let i = 0; i < world.arrows.length; i++) {
    if (!world.arrows[i].active) return world.arrows[i];
  }
  return null;
}

function activate(
  arrow: Arrow,
  x: number,
  y: number,
  vx: number,
  vy: number,
  kind: Arrow["kind"] = "normal",
  warningMs = 400,
): void {
  arrow.active = true;
  arrow.x = x;
  arrow.y = y;
  arrow.vx = vx;
  arrow.vy = vy;
  arrow.length = ARROW_LEN;
  arrow.hitRadius = HIT_R;
  arrow.angle = Math.atan2(vy, vx);
  arrow.nearMissed = false;
  arrow.warningMs = warningMs;
  arrow.kind = kind;
  arrow.bounces = kind === "ricochet" ? 1 : 0;
  arrow.hitRadius = kind === "explosive" ? 10 : HIT_R;
  arrow.length = kind === "explosive" ? 36 : ARROW_LEN;
  arrow.telegraph = kind === "aimed" ? "sniper" : kind === "explosive" ? "blast" : kind === "ricochet" ? "dash" : kind === "fan" ? "perfect" : kind === "normal" && Math.abs(vx) > Math.abs(vy) ? "charge" : "aerial";
  arrow.homingMs = 0;
  arrow.homingTurnRate = 0;
  // Spawn variation keeps repeated patterns from becoming a memorised wall.
  // Homing rounds remain readable thanks to their longer purple telegraph.
  const velocityJitter = 0.88 + Math.random() * 0.26;
  const angleJitter = (Math.random() - 0.5) * 0.16;
  const speed = Math.hypot(arrow.vx, arrow.vy) * velocityJitter;
  const heading = Math.atan2(arrow.vy, arrow.vx) + angleJitter;
  arrow.vx = Math.cos(heading) * speed;
  arrow.vy = Math.sin(heading) * speed;
  arrow.angle = heading;
  if ((kind === "normal" || kind === "aimed" || kind === "fan") && Math.random() < 0.13) {
    arrow.kind = "homing";
    arrow.telegraph = "homing";
    arrow.warningMs = Math.max(warningMs, 680);
    arrow.homingMs = 1_800 + Math.random() * 1_300;
    arrow.homingTurnRate = 1.25 + Math.random() * 1.1;
    arrow.hitRadius = HIT_R + 1;
  }
  arrow.splitLevel = 0;
  arrow.damage = SPLIT_DAMAGE[0];
  arrow.orbitMs = 0;
  arrow.orbitX = x;
  arrow.orbitY = y;
  arrow.orbitAngle = 0;
  arrow.orbitRadius = 0;
  arrow.orbitDirection = 1;
  arrow.orbitStretch = 1;
  arrow.orbitWobble = 0;
  arrow.orbitDriftX = 0;
  arrow.orbitDriftY = 0;
  arrow.splitGraceMs = 0;
  arrow.boss = false;
  arrow.bossTier = 0;
  arrow.bossCutsLeft = 0;
  arrow.bossMaxCuts = 0;
}

function activePattern(world: GameWorld): ArrowPattern | null {
  const stage = getStage(world.stageIndex);
  const t = world.stageElapsedMs;
  for (let i = 0; i < stage.patterns.length; i++) {
    const p = stage.patterns[i];
    if (t >= p.atMs && t < p.atMs + p.durationMs) return p;
  }
  return null;
}

function spawnFromPattern(world: GameWorld, pattern: ArrowPattern): void {
  const stage = getStage(world.stageIndex);
  const speed = (pattern.speed ?? 220) * stage.speedMul;
  const arrow = acquire(world);
  if (!arrow) return;

  const minX = world.safeLeft + 12;
  const maxX = world.width - world.safeRight - 12;
  const spanX = Math.max(1, maxX - minX);
  const midY = (world.safeTop + world.floorY) * 0.45;

  switch (pattern.kind) {
    case "rest":
      return;
    case "rain": {
      activate(arrow, minX + Math.random() * spanX, world.safeTop - 20, 0, speed);
      break;
    }
    case "side": {
      const fromLeft = Math.random() < 0.5;
      const y = world.safeTop + 40 + Math.random() * (world.floorY - world.safeTop - 80);
      if (fromLeft) activate(arrow, -20, y, speed, 0);
      else activate(arrow, world.width + 20, y, -speed, 0);
      break;
    }
    case "cross": {
      if (Math.random() < 0.55) {
        activate(arrow, minX + Math.random() * spanX, world.safeTop - 20, 0, speed);
      } else {
        const fromLeft = Math.random() < 0.5;
        const y = midY + (Math.random() - 0.5) * 160;
        if (fromLeft) activate(arrow, -20, y, speed * 0.95, speed * 0.15);
        else activate(arrow, world.width + 20, y, -speed * 0.95, speed * 0.15);
      }
      break;
    }
    case "sweep": {
      const y = world.floorY - 28 - Math.random() * 36;
      const fromLeft = Math.random() < 0.5;
      if (fromLeft) activate(arrow, -20, y, speed * 1.05, 0);
      else activate(arrow, world.width + 20, y, -speed * 1.05, 0);
      break;
    }
    case "burst": {
      const cx = minX + Math.random() * spanX;
      activate(arrow, cx, world.safeTop - 20, (Math.random() - 0.5) * speed * 0.35, speed * 1.15);
      break;
    }
    case "aimed": {
      const fromLeft = Math.random() < 0.5;
      const x = fromLeft ? -20 : world.width + 20;
      const y = world.safeTop + 35 + Math.random() * Math.max(60, world.floorY * 0.35);
      const targetX = world.player.x + world.player.vx * 0.28;
      const targetY = world.player.y;
      const dx = targetX - x;
      const dy = targetY - y;
      const len = Math.max(1, Math.hypot(dx, dy));
      activate(arrow, x, y, (dx / len) * speed, (dy / len) * speed, "aimed", 800);
      break;
    }
    case "fan": {
      const originX = minX + Math.random() * spanX;
      const originY = world.safeTop - 20;
      const baseAngle = Math.atan2(world.player.y - originY, world.player.x - originX);
      for (let i = -1; i <= 1; i++) {
        const target = i === -1 ? arrow : acquire(world);
        if (!target) continue;
        const angle = baseAngle + i * 0.2;
        activate(target, originX, originY, Math.cos(angle) * speed, Math.sin(angle) * speed, "fan", 460);
      }
      break;
    }
    case "ricochet": {
      const fromLeft = Math.random() < 0.5;
      const x = fromLeft ? -20 : world.width + 20;
      const y = world.safeTop + 60 + Math.random() * Math.max(80, world.floorY - world.safeTop - 140);
      activate(
        arrow,
        x,
        y,
        (fromLeft ? 1 : -1) * speed,
        speed * (Math.random() < 0.5 ? 0.38 : -0.38),
        "ricochet",
        500,
      );
      break;
    }
    case "explosive": {
      const originX = minX + Math.random() * spanX;
      const dx = world.player.x - originX;
      const dy = world.player.y - (world.safeTop - 20);
      const len = Math.max(1, Math.hypot(dx, dy));
      activate(
        arrow,
        originX,
        world.safeTop - 20,
        (dx / len) * speed * 0.86,
        (dy / len) * speed * 0.86,
        "explosive",
        560,
      );
      break;
    }
  }
}

function tipPos(a: Arrow): { x: number; y: number } {
  const half = a.length * 0.45;
  return {
    x: a.x + Math.cos(a.angle) * half,
    y: a.y + Math.sin(a.angle) * half,
  };
}

function bumpCombo(world: GameWorld): void {
  world.combo += 1;
  if (world.combo > world.maxCombo) world.maxCombo = world.combo;
  world.comboTimerMs = COMBO_WINDOW_MS;
}

function launchAtPlayer(world: GameWorld, arrow: Arrow, speed: number): void {
  const dx = world.player.x - arrow.x;
  const dy = world.player.y - arrow.y;
  const len = Math.max(1, Math.hypot(dx, dy));
  arrow.vx = (dx / len) * speed;
  arrow.vy = (dy / len) * speed;
  arrow.angle = Math.atan2(arrow.vy, arrow.vx);
}

function configureSplitFragment(
  world: GameWorld,
  arrow: Arrow,
  source: Arrow,
  level: 1 | 2 | 3,
  direction: -1 | 1,
  slashLevel: number,
): void {
  arrow.active = true;
  arrow.x = source.x;
  arrow.y = source.y;
  arrow.vx = 0;
  arrow.vy = 0;
  arrow.length = Math.max(12, ARROW_LEN - level * 4);
  arrow.hitRadius = Math.max(2.5, HIT_R - level * 0.65);
  arrow.angle = source.angle + direction * 0.48;
  arrow.nearMissed = false;
  arrow.warningMs = 0;
  arrow.kind = source.kind;
  arrow.bounces = 0;
  arrow.telegraph = source.telegraph;
  arrow.homingMs = source.kind === "homing" ? 1_350 + Math.random() * 650 : 0;
  arrow.homingTurnRate = source.kind === "homing" ? 1.5 + Math.random() * 1.2 : 0;
  arrow.splitLevel = level;
  const itemWeakening = Math.max(0.62, 1 - slashLevel * 0.065);
  arrow.damage = SPLIT_DAMAGE[level] * itemWeakening;
  arrow.orbitMs = SPLIT_ORBIT_MS + (Math.random() - 0.5) * 360;
  arrow.orbitX = source.x;
  arrow.orbitY = source.y;
  arrow.orbitAngle = source.angle + (direction < 0 ? 0 : Math.PI) + (Math.random() - 0.5) * 0.9;
  const mapOrbit = Math.min(world.width, world.height) * 0.27;
  arrow.orbitRadius = mapOrbit * (0.9 + Math.random() * 0.42) + level * 7;
  arrow.orbitDirection = direction;
  arrow.orbitStretch = 0.72 + Math.random() * 0.92;
  arrow.orbitWobble = 0.18 + Math.random() * (0.36 + slashLevel * 0.035);
  arrow.orbitDriftX = (Math.random() - 0.5) * (46 + slashLevel * 5);
  arrow.orbitDriftY = (Math.random() - 0.5) * (38 + slashLevel * 4);
  arrow.splitGraceMs = SPLIT_ORBIT_MS + 120;
  arrow.boss = false;
  arrow.bossTier = 0;
  arrow.bossCutsLeft = 0;
  arrow.bossMaxCuts = 0;
}

function pushSlashFx(world: GameWorld, x: number, y: number, value: number, boss: boolean): void {
  const fx = world.slashHitFx.find((item) => !item.active) ?? world.slashHitFx[0];
  if (!fx) return;
  fx.active = true;
  fx.x = x + (Math.random() - 0.5) * 18;
  fx.y = y - 8;
  fx.value = value;
  fx.lifeMs = boss ? 850 : 620;
  fx.maxLifeMs = fx.lifeMs;
  fx.boss = boss;
}

function maybeDropSlashItem(world: GameWorld, x: number, y: number, guaranteed = false): void {
  if (!guaranteed && Math.random() >= 0.09) return;
  const drop = world.slashDrops.find((item) => !item.active);
  if (!drop) return;
  const roll = Math.random();
  drop.active = true;
  drop.x = x;
  drop.y = y;
  drop.vy = -95;
  drop.kind = roll < 0.55 ? "edge" : roll < 0.86 ? "core" : "rune";
}

function registerSlash(world: GameWorld, arrow: Arrow, boss = false): void {
  const value = Math.round((boss ? 520 : 110) * (1 + world.stats.slashLevel * 0.22 + world.slashBuff * 0.12));
  world.slashScore += value;
  pushSlashFx(world, arrow.x, arrow.y, value, boss);
  maybeDropSlashItem(world, arrow.x, arrow.y, boss && arrow.bossCutsLeft <= 0);
}

function spawnBossSplitPattern(world: GameWorld, source: Arrow): void {
  const count = 2 + Math.min(2, Math.floor(source.bossTier / 2)) + (Math.random() < 0.35 ? 1 : 0);
  const variants: Arrow["kind"][] = ["homing", "ricochet", "explosive", "fan"];
  const kind = variants[Math.floor(Math.random() * variants.length)];
  for (let i = 0; i < count; i++) {
    const fragment = acquire(world);
    if (!fragment) break;
    const direction: -1 | 1 = i % 2 === 0 ? -1 : 1;
    const level = Math.min(3, 1 + Math.floor(source.bossTier / 2)) as 1 | 2 | 3;
    configureSplitFragment(world, fragment, source, level, direction, world.stats.slashLevel);
    fragment.kind = kind;
    fragment.telegraph = kind === "homing" ? "homing" : kind === "explosive" ? "blast" : kind === "ricochet" ? "dash" : "perfect";
    fragment.damage = Math.max(fragment.damage, 0.34 + source.bossTier * 0.035);
    fragment.length += 7 + source.bossTier * 1.5;
    fragment.hitRadius += 1.5;
    fragment.orbitMs += 260 + Math.random() * 420;
    fragment.orbitRadius *= 1.08 + Math.random() * 0.24;
    fragment.orbitAngle += (i / Math.max(1, count)) * Math.PI * 1.35;
    fragment.orbitWobble += 0.12 + Math.random() * 0.18;
    if (kind === "homing") {
      fragment.homingMs = 2_300 + source.bossTier * 180;
      fragment.homingTurnRate = 1.05 + source.bossTier * 0.08;
    } else if (kind === "ricochet") {
      fragment.bounces = 2 + Math.min(2, source.bossTier);
    }
  }
}

function splitArrow(world: GameWorld, arrow: Arrow): void {
  if (arrow.boss) {
    arrow.bossCutsLeft = Math.max(0, arrow.bossCutsLeft - 1);
    world.bossCutsLeft = arrow.bossCutsLeft;
    registerSlash(world, arrow, true);
    bumpCombo(world);
    spawnBossSplitPattern(world, { ...arrow });
    if (arrow.bossCutsLeft <= 0) {
      arrow.active = false;
      world.bossDefeated = true;
      world.enemyKills += 1;
      world.supplies += 12 + arrow.bossTier * 3;
      world.expeditionSeals += 2;
      maybeDropSlashItem(world, arrow.x, arrow.y, true);
    } else {
      const away = Math.atan2(arrow.y - world.player.y, arrow.x - world.player.x) + (Math.random() - 0.5) * 0.8;
      const speed = 190 + arrow.bossTier * 15 + Math.random() * 45;
      arrow.vx = Math.cos(away) * speed;
      arrow.vy = Math.sin(away) * speed;
      const bossVariants: Arrow["kind"][] = ["homing", "ricochet", "explosive", "fan"];
      arrow.kind = bossVariants[Math.floor(Math.random() * bossVariants.length)];
      arrow.telegraph = arrow.kind === "homing" ? "homing" : arrow.kind === "explosive" ? "blast" : arrow.kind === "ricochet" ? "dash" : "perfect";
      arrow.homingMs = arrow.kind === "homing" ? Number.POSITIVE_INFINITY : 0;
      arrow.bounces = arrow.kind === "ricochet" ? 2 + Math.min(2, arrow.bossTier) : 0;
      arrow.splitGraceMs = 330;
    }
    return;
  }

  registerSlash(world, arrow);
  if (arrow.splitLevel >= 3) {
    arrow.active = false;
    world.countered += 1;
    world.supplies += 1;
    bumpCombo(world);
    return;
  }

  const source = { ...arrow };
  const nextLevel = (arrow.splitLevel + 1) as 1 | 2 | 3;
  const sibling = acquire(world);
  configureSplitFragment(world, arrow, source, nextLevel, -1, world.stats.slashLevel);
  if (sibling) configureSplitFragment(world, sibling, source, nextLevel, 1, world.stats.slashLevel);
  world.countered += 1;
  if (world.countered % 3 === 0) world.enemyKills += 1;
  bumpCombo(world);
}

function spawnBossArrow(world: GameWorld): void {
  const arrow = acquire(world);
  if (!arrow) return;
  const tier = world.stageIndex + 1;
  const cuts = 10 + world.stageIndex * 4;
  const fromLeft = tier % 2 === 0;
  const x = fromLeft ? -48 : world.width + 48;
  const y = world.safeTop + Math.max(80, (world.floorY - world.safeTop) * (0.25 + (tier % 3) * 0.14));
  const dx = world.player.x - x;
  const dy = world.player.y - y;
  const len = Math.max(1, Math.hypot(dx, dy));
  const speed = 150 + Math.min(120, tier * 10);
  activate(arrow, x, y, dx / len * speed, dy / len * speed, "homing", 1_050);
  arrow.boss = true;
  arrow.bossTier = tier;
  arrow.bossCutsLeft = cuts;
  arrow.bossMaxCuts = cuts;
  arrow.length = 58 + Math.min(42, tier * 5);
  arrow.hitRadius = 12 + Math.min(10, tier * 1.2);
  arrow.damage = 0.75;
  arrow.homingMs = Number.POSITIVE_INFINITY;
  arrow.homingTurnRate = 0.62 + Math.min(0.75, tier * 0.05);
  arrow.telegraph = "homing";
  world.bossSpawned = true;
  world.bossCutsLeft = cuts;
  world.bossMaxCuts = cuts;
}

/** @returns accumulated damage from projectiles that hit this frame. */
export function updateArrows(world: GameWorld, dtSec: number): number {
  const stage = getStage(world.stageIndex);
  const pattern = activePattern(world);

  if (!world.bossSpawned && world.stageElapsedMs >= stage.durationMs * 0.58) {
    spawnBossArrow(world);
  }

  // A short readable opening prevents a random spawn from ending a run before
  // the player has seen the first telegraph and taken control.
  if (world.stageElapsedMs < 2_000) {
    world.spawnAccMs = 0;
  } else if (pattern && pattern.kind !== "rest") {
    const spawnMs = (pattern.spawnMs ?? 700) / stage.spawnMul;
    world.spawnAccMs += dtSec * 1000;
    while (world.spawnAccMs >= spawnMs) {
      world.spawnAccMs -= spawnMs;
      spawnFromPattern(world, pattern);
    }
  } else {
    world.spawnAccMs = 0;
  }

  const player = world.player;
  const slow = player.slowActiveMs > 0;
  const slowR = world.stats.slowRadius + world.slashBuff * 8;
  const slowF = world.stats.slowFactor;
  let hitDamage = 0;

  for (let i = 0; i < world.arrows.length; i++) {
    const a = world.arrows[i];
    if (!a.active) continue;

    a.splitGraceMs = Math.max(0, a.splitGraceMs - dtSec * 1000);

    if (a.warningMs > 0) {
      a.warningMs = Math.max(0, a.warningMs - dtSec * 1000);
      continue;
    }

    let mul = 1;
    if (slow) {
      const dx = a.x - player.x;
      const dy = a.y - player.y;
      if (dx * dx + dy * dy <= slowR * slowR && a.warningMs <= 0 && a.splitGraceMs <= 0) {
        splitArrow(world, a);
        continue;
      }
      if (dx * dx + dy * dy <= slowR * slowR) mul = slowF;
    }

    if (a.orbitMs > 0) {
      const previousX = a.x;
      const previousY = a.y;
      a.orbitMs = Math.max(0, a.orbitMs - dtSec * 1000);
      const direction = a.orbitDirection;
      const life = Math.max(0, Math.min(1, a.orbitMs / SPLIT_ORBIT_MS));
      const angularJitter = 1 + Math.sin(a.orbitAngle * 2.7 + a.orbitWobble * 9) * a.orbitWobble;
      a.orbitAngle += direction * dtSec * (2.65 + a.splitLevel * 0.38) * angularJitter;
      const collapse = 0.48 + 0.52 * life;
      const wobbleX = Math.sin(a.orbitAngle * 3.1) * a.orbitRadius * a.orbitWobble;
      const wobbleY = Math.cos(a.orbitAngle * 2.35) * a.orbitRadius * a.orbitWobble;
      const driftProgress = 1 - life;
      a.x = a.orbitX + a.orbitDriftX * driftProgress + Math.cos(a.orbitAngle) * a.orbitRadius * a.orbitStretch * collapse + wobbleX;
      a.y = a.orbitY + a.orbitDriftY * driftProgress + Math.sin(a.orbitAngle) * a.orbitRadius / a.orbitStretch * collapse + wobbleY;
      // Face the arrowhead along the actual wide parabolic/orbital trajectory,
      // instead of rotating it around a mechanically perfect circle.
      const travelX = a.x - previousX;
      const travelY = a.y - previousY;
      if (travelX * travelX + travelY * travelY > 0.01) {
        a.angle = Math.atan2(travelY, travelX);
      }
      if (a.orbitMs <= 0) {
        const baseSpeed = Math.max(185, Math.hypot(sourceVelocityX(a), sourceVelocityY(a)));
        launchAtPlayer(world, a, baseSpeed + a.splitLevel * 22);
      }
      continue;
    }

    if (a.kind === "homing" && a.homingMs > 0) {
      a.homingMs = Math.max(0, a.homingMs - dtSec * 1000);
      const desired = Math.atan2(player.y - a.y, player.x - a.x);
      let delta = desired - Math.atan2(a.vy, a.vx);
      delta = Math.atan2(Math.sin(delta), Math.cos(delta));
      const current = Math.atan2(a.vy, a.vx);
      const turn = Math.max(-a.homingTurnRate * dtSec, Math.min(a.homingTurnRate * dtSec, delta));
      const speed = Math.hypot(a.vx, a.vy);
      a.vx = Math.cos(current + turn) * speed;
      a.vy = Math.sin(current + turn) * speed;
    }

    a.x += a.vx * mul * dtSec;
    a.y += a.vy * mul * dtSec;
    if (a.kind === "ricochet" && a.bounces > 0) {
      if ((a.x < world.safeLeft + 8 && a.vx < 0) || (a.x > world.width - world.safeRight - 8 && a.vx > 0)) {
        a.vx *= -1;
        a.bounces -= 1;
      }
      if ((a.y < world.safeTop + 8 && a.vy < 0) || (a.y > world.floorY - 8 && a.vy > 0)) {
        a.vy *= -1;
        a.bounces -= 1;
      }
    }
    a.angle = Math.atan2(a.vy, a.vx || 0.0001);

    // 푸른 공격은 대시로 관통하며 역으로 정찰병을 제압한다.
    if (a.telegraph === "dash" && player.dashActiveMs > 0) {
      const dx = a.x - player.x;
      const dy = a.y - player.y;
      if (dx * dx + dy * dy <= (player.radius + 34) ** 2) {
        a.active = false;
        world.enemyKills += 1;
        world.supplies += 2;
        bumpCombo(world);
        continue;
      }
    }

    const out =
      a.y > world.height + 60 ||
      a.y < -80 ||
      a.x < -80 ||
      a.x > world.width + 80;
    if (out) {
      if (a.boss) {
        const side = Math.random() < 0.5 ? -1 : 1;
        a.x = side < 0 ? -36 : world.width + 36;
        a.y = world.safeTop + 50 + Math.random() * Math.max(80, world.floorY - world.safeTop - 100);
        launchAtPlayer(world, a, 170 + a.bossTier * 10);
        continue;
      }
      a.active = false;
      world.dodged += 1;
      continue;
    }

    if (player.invulnMs > 0 || player.anim === "dead") continue;

    const tip = tipPos(a);
    const pr = player.radius;
    const dx = tip.x - player.x;
    const dy = tip.y - player.y;
    const distSq = dx * dx + dy * dy;
    const hitR = a.hitRadius + pr;
    if (distSq <= hitR * hitR) {
      hitDamage += a.damage;
      if (a.boss) {
        const away = Math.atan2(a.y - player.y, a.x - player.x) + (Math.random() - 0.5) * 0.7;
        a.vx = Math.cos(away) * 210;
        a.vy = Math.sin(away) * 210;
        a.x += Math.cos(away) * 38;
        a.y += Math.sin(away) * 38;
      } else {
        a.active = false;
      }
      continue;
    }

    const nearR = hitR + NEAR_MISS_PAD;
    if (!a.nearMissed && distSq <= nearR * nearR) {
      a.nearMissed = true;
      bumpCombo(world);
      if (a.telegraph === "perfect") {
        world.perfectDodges += 1;
        world.expeditionSeals += 1;
      }
    }
  }

  return hitDamage;
}

function sourceVelocityX(a: Arrow): number {
  return a.vx || Math.cos(a.angle) * 220;
}

function sourceVelocityY(a: Arrow): number {
  return a.vy || Math.sin(a.angle) * 220;
}
