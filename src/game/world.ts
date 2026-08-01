import type { InputState } from "./input";
import type { GameWorld, Player } from "./types";

const PLAYER_RADIUS = 18;
const KEYBOARD_SPEED = 420; // px / sec — feels instant on phone-sized screens

export function createPlayer(width: number, height: number, safeBottom: number): Player {
  return {
    x: width / 2,
    y: Math.min(height - safeBottom - 64, height * 0.78),
    radius: PLAYER_RADIUS,
  };
}

export function createWorld(width: number, height: number, dpr: number): GameWorld {
  const safeTop = 12;
  const safeBottom = 12;
  const safeLeft = 8;
  const safeRight = 8;

  return {
    width,
    height,
    dpr,
    safeTop,
    safeBottom,
    safeLeft,
    safeRight,
    player: createPlayer(width, height, safeBottom),
    elapsedMs: 0,
  };
}

export function resizeWorld(world: GameWorld, width: number, height: number, dpr: number): void {
  const prevW = world.width || 1;
  const prevH = world.height || 1;
  const nx = world.player.x / prevW;
  const ny = world.player.y / prevH;

  world.width = width;
  world.height = height;
  world.dpr = dpr;
  world.player.x = nx * width;
  world.player.y = ny * height;
  clampPlayer(world);
}

export function clampPlayer(world: GameWorld): void {
  const { player, width, height, safeLeft, safeRight, safeTop, safeBottom } = world;
  const minX = safeLeft + player.radius;
  const maxX = width - safeRight - player.radius;
  const minY = safeTop + player.radius;
  const maxY = height - safeBottom - player.radius;
  player.x = Math.min(Math.max(player.x, minX), Math.max(minX, maxX));
  player.y = Math.min(Math.max(player.y, minY), Math.max(minY, maxY));
}

export function updateWorld(
  world: GameWorld,
  dtSec: number,
  running: boolean,
  input: InputState,
): void {
  if (!running) return;
  world.elapsedMs += dtSec * 1000;

  // Touch/pointer: follow finger immediately (no lag / lerp delay).
  if (input.pointerActive) {
    world.player.x = input.pointerX;
    world.player.y = input.pointerY;
    clampPlayer(world);
    return;
  }

  let dx = 0;
  let dy = 0;
  if (input.left) dx -= 1;
  if (input.right) dx += 1;
  if (input.up) dy -= 1;
  if (input.down) dy += 1;

  if (dx !== 0 || dy !== 0) {
    const len = Math.hypot(dx, dy) || 1;
    world.player.x += (dx / len) * KEYBOARD_SPEED * dtSec;
    world.player.y += (dy / len) * KEYBOARD_SPEED * dtSec;
  }

  clampPlayer(world);
}
