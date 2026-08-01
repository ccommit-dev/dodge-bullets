import type { Bullet, GameWorld } from "./types";

const POOL_SIZE = 64;
const BULLET_RADIUS = 8;
const BASE_SPEED = 180; // px/s
const MAX_SPEED = 520;
const BASE_SPAWN_MS = 780;
const MIN_SPAWN_MS = 280;

export function createBulletPool(size = POOL_SIZE): Bullet[] {
  const pool: Bullet[] = new Array(size);
  for (let i = 0; i < size; i++) {
    pool[i] = {
      active: false,
      x: 0,
      y: 0,
      radius: BULLET_RADIUS,
      vy: BASE_SPEED,
    };
  }
  return pool;
}

export function resetBullets(world: GameWorld): void {
  for (let i = 0; i < world.bullets.length; i++) {
    world.bullets[i].active = false;
  }
  world.spawnAccMs = 0;
}

function difficulty(elapsedMs: number) {
  // Ramps over ~60s then soft-caps
  const t = Math.min(elapsedMs / 60000, 1);
  const speed = BASE_SPEED + (MAX_SPEED - BASE_SPEED) * t;
  const spawnMs = BASE_SPAWN_MS - (BASE_SPAWN_MS - MIN_SPAWN_MS) * t;
  return { speed, spawnMs };
}

function acquireBullet(world: GameWorld): Bullet | null {
  for (let i = 0; i < world.bullets.length; i++) {
    if (!world.bullets[i].active) return world.bullets[i];
  }
  return null;
}

function spawnBullet(world: GameWorld, speed: number): void {
  const bullet = acquireBullet(world);
  if (!bullet) return;

  const minX = world.safeLeft + BULLET_RADIUS;
  const maxX = world.width - world.safeRight - BULLET_RADIUS;
  const span = Math.max(0, maxX - minX);

  bullet.active = true;
  bullet.x = minX + Math.random() * span;
  bullet.y = world.safeTop - BULLET_RADIUS;
  bullet.radius = BULLET_RADIUS;
  bullet.vy = speed * (0.85 + Math.random() * 0.3);
}

export function updateBullets(world: GameWorld, dtSec: number): boolean {
  const { speed, spawnMs } = difficulty(world.elapsedMs);
  world.spawnAccMs += dtSec * 1000;

  while (world.spawnAccMs >= spawnMs) {
    world.spawnAccMs -= spawnMs;
    spawnBullet(world, speed);
  }

  const player = world.player;
  const bottomLimit = world.height + 40;

  for (let i = 0; i < world.bullets.length; i++) {
    const b = world.bullets[i];
    if (!b.active) continue;

    b.y += b.vy * dtSec;

    if (b.y - b.radius > bottomLimit) {
      b.active = false;
      world.dodged += 1;
      continue;
    }

    // Circle vs circle collision
    const dx = b.x - player.x;
    const dy = b.y - player.y;
    const r = b.radius + player.radius;
    if (dx * dx + dy * dy <= r * r) {
      return true;
    }
  }

  return false;
}
