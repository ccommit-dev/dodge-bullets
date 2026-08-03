import { drawStickman } from "./player";
import type { Arrow, GameWorld } from "./types";

function drawArrow(ctx: CanvasRenderingContext2D, a: Arrow): void {
  const cos = Math.cos(a.angle);
  const sin = Math.sin(a.angle);
  const half = a.length * 0.5;
  const tx = a.x + cos * half;
  const ty = a.y + sin * half;
  const bx = a.x - cos * half;
  const by = a.y - sin * half;
  const px = -sin;
  const py = cos;

  ctx.strokeStyle = "#f87171";
  ctx.fillStyle = "#fca5a5";
  ctx.lineWidth = 2.4;
  ctx.lineCap = "round";

  // shaft
  ctx.beginPath();
  ctx.moveTo(bx, by);
  ctx.lineTo(tx, ty);
  ctx.stroke();

  // tip
  ctx.beginPath();
  ctx.moveTo(tx, ty);
  ctx.lineTo(tx - cos * 9 + px * 4.5, ty - sin * 9 + py * 4.5);
  ctx.lineTo(tx - cos * 9 - px * 4.5, ty - sin * 9 - py * 4.5);
  ctx.closePath();
  ctx.fill();

  // fletching
  ctx.strokeStyle = "#fda4af";
  ctx.beginPath();
  ctx.moveTo(bx, by);
  ctx.lineTo(bx + cos * 6 + px * 5, by + sin * 6 + py * 5);
  ctx.moveTo(bx, by);
  ctx.lineTo(bx + cos * 6 - px * 5, by + sin * 6 - py * 5);
  ctx.stroke();
}

export function drawFrame(ctx: CanvasRenderingContext2D, world: GameWorld): void {
  const { width, height, safeTop, safeBottom, arrows, platforms, floorY } = world;

  ctx.fillStyle = "#0b1220";
  ctx.fillRect(0, 0, width, height);

  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "rgba(30, 58, 95, 0.45)");
  gradient.addColorStop(0.55, "rgba(11, 18, 32, 0)");
  gradient.addColorStop(1, "rgba(15, 23, 42, 0.55)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "rgba(148, 163, 184, 0.18)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, safeTop);
  ctx.lineTo(width, safeTop);
  ctx.moveTo(0, height - safeBottom);
  ctx.lineTo(width, height - safeBottom);
  ctx.stroke();

  // Floor line
  ctx.strokeStyle = "rgba(94, 234, 212, 0.35)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, floorY);
  ctx.lineTo(width, floorY);
  ctx.stroke();

  // Platforms
  for (let i = 0; i < platforms.length; i++) {
    const pl = platforms[i];
    ctx.fillStyle = "rgba(51, 65, 85, 0.95)";
    ctx.fillRect(pl.x, pl.y, pl.w, pl.h);
    ctx.fillStyle = "rgba(94, 234, 212, 0.45)";
    ctx.fillRect(pl.x, pl.y, pl.w, 3);
  }

  for (let i = 0; i < arrows.length; i++) {
    if (arrows[i].active) drawArrow(ctx, arrows[i]);
  }

  drawStickman(ctx, world);
}
