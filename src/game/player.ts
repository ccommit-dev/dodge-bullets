import type { GameWorld, Player } from "./types";

const GRAVITY = 1650;
const BASE_RADIUS = 16;

export function createPlayer(width: number, floorY: number): Player {
  return {
    x: width / 2,
    y: floorY - BASE_RADIUS,
    vx: 0,
    vy: 0,
    radius: BASE_RADIUS,
    onGround: true,
    facing: 1,
    anim: "idle",
    animTime: 0,
    invulnMs: 0,
    hp: 1,
    maxHp: 1,
    dashCdMs: 0,
    dashActiveMs: 0,
    slowCdMs: 0,
    slowActiveMs: 0,
  };
}

export function resetPlayer(player: Player, width: number, floorY: number, extraLives: number): void {
  player.x = width / 2;
  player.y = floorY - player.radius;
  player.vx = 0;
  player.vy = 0;
  player.onGround = true;
  player.facing = 1;
  player.anim = "idle";
  player.animTime = 0;
  player.invulnMs = 0;
  player.maxHp = 1 + extraLives;
  player.hp = player.maxHp;
  player.dashCdMs = 0;
  player.dashActiveMs = 0;
  player.slowCdMs = 0;
  player.slowActiveMs = 0;
}

export function drawStickman(
  ctx: CanvasRenderingContext2D,
  world: GameWorld,
): void {
  const p = world.player;
  const blink = p.invulnMs > 0 && Math.floor(p.invulnMs / 60) % 2 === 0;
  if (blink) return;

  const floorY = world.floorY;
  const air = Math.max(0, floorY - (p.y + p.radius));
  const shadowScale = Math.max(0.35, 1 - air / 220);
  ctx.fillStyle = `rgba(0,0,0,${0.28 * shadowScale})`;
  ctx.beginPath();
  ctx.ellipse(p.x, floorY - 2, p.radius * 1.15 * shadowScale, 5 * shadowScale, 0, 0, Math.PI * 2);
  ctx.fill();

  const t = p.animTime;
  const facing = p.facing;
  let swing = 0;
  if (p.anim === "run") swing = Math.sin(t * 12) * 0.55;
  else if (p.anim === "idle") swing = Math.sin(t * 3) * 0.08;
  else if (p.anim === "air") swing = 0.35;
  else if (p.anim === "hit") swing = Math.sin(t * 20) * 0.8;
  else if (p.anim === "dead") swing = 1.2;

  const color = p.anim === "hit" || p.anim === "dead" ? "#fca5a5" : "#5eead4";
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 3.2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const hx = p.x;
  const hy = p.y - p.radius * 0.85;
  const bodyTop = hy + 10;
  const bodyBot = p.y + p.radius * 0.55;

  // head
  ctx.beginPath();
  ctx.arc(hx, hy, 7.5, 0, Math.PI * 2);
  ctx.stroke();

  // torso
  ctx.beginPath();
  ctx.moveTo(hx, bodyTop);
  ctx.lineTo(hx, bodyBot);
  ctx.stroke();

  // arms
  const ax = hx;
  const ay = bodyTop + 6;
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(ax - 12 * facing - swing * 8, ay + 14 + swing * 6);
  ctx.moveTo(ax, ay);
  ctx.lineTo(ax + 12 * facing + swing * 4, ay + 14 - swing * 6);
  ctx.stroke();

  // legs
  const lx = hx;
  const ly = bodyBot;
  ctx.beginPath();
  ctx.moveTo(lx, ly);
  ctx.lineTo(lx - 10 * facing - swing * 10, ly + 16 - Math.abs(swing) * 4);
  ctx.moveTo(lx, ly);
  ctx.lineTo(lx + 10 * facing + swing * 10, ly + 16 - Math.abs(swing) * 4);
  ctx.stroke();

  if (p.slowActiveMs > 0) {
    ctx.strokeStyle = "rgba(94, 234, 212, 0.35)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, world.stats.slowRadius, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (p.dashActiveMs > 0) {
    ctx.strokeStyle = "rgba(248, 250, 252, 0.35)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(p.x - facing * 22, p.y);
    ctx.lineTo(p.x - facing * 40, p.y - 6);
    ctx.moveTo(p.x - facing * 22, p.y);
    ctx.lineTo(p.x - facing * 40, p.y + 6);
    ctx.stroke();
  }
}

export { GRAVITY };
