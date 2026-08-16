import { getStage } from "./stages";
import type { Arrow, ArrowPattern, GameWorld } from "./types";

const POOL_SIZE = 120;
const ARROW_LEN = 28;
const HIT_R = 5;
/** Tip within this band (beyond hit radius) counts as near-miss. */
const NEAR_MISS_PAD = 22;
const COMBO_WINDOW_MS = 1600;

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
      activate(arrow, x, y, (dx / len) * speed, (dy / len) * speed, "aimed", 480);
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

/** @returns true if lethal hit this frame (hp already applied by caller path). */
export function updateArrows(world: GameWorld, dtSec: number): boolean {
  const stage = getStage(world.stageIndex);
  const pattern = activePattern(world);

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
  const slowR = world.stats.slowRadius;
  const slowF = world.stats.slowFactor;
  let hit = false;

  for (let i = 0; i < world.arrows.length; i++) {
    const a = world.arrows[i];
    if (!a.active) continue;

    if (a.warningMs > 0) {
      a.warningMs = Math.max(0, a.warningMs - dtSec * 1000);
      continue;
    }

    let mul = 1;
    if (slow) {
      const dx = a.x - player.x;
      const dy = a.y - player.y;
      if (dx * dx + dy * dy <= slowR * slowR) mul = slowF;
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

    const out =
      a.y > world.height + 60 ||
      a.y < -80 ||
      a.x < -80 ||
      a.x > world.width + 80;
    if (out) {
      a.active = false;
      world.dodged += 1;
      continue;
    }

    if (player.invulnMs > 0 || player.anim === "dead") continue;

    const tip = tipPos(a);
    const pr = player.radius * world.stats.hitboxScale;
    const dx = tip.x - player.x;
    const dy = tip.y - player.y;
    const distSq = dx * dx + dy * dy;
    const hitR = a.hitRadius + pr;
    if (distSq <= hitR * hitR) {
      hit = true;
      continue;
    }

    const nearR = hitR + NEAR_MISS_PAD;
    if (!a.nearMissed && distSq <= nearR * nearR) {
      a.nearMissed = true;
      bumpCombo(world);
    }
  }

  return hit;
}
