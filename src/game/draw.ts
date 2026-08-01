import type { GameWorld } from "./types";

export function drawFrame(ctx: CanvasRenderingContext2D, world: GameWorld): void {
  const { width, height, player, safeTop, safeBottom } = world;

  // Background
  ctx.fillStyle = "#0b1220";
  ctx.fillRect(0, 0, width, height);

  // Soft vertical gradient for depth
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "rgba(30, 58, 95, 0.45)");
  gradient.addColorStop(0.55, "rgba(11, 18, 32, 0)");
  gradient.addColorStop(1, "rgba(15, 23, 42, 0.55)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Safe-area guide lines (subtle) — helps verify insets during Day 1
  ctx.strokeStyle = "rgba(148, 163, 184, 0.18)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, safeTop);
  ctx.lineTo(width, safeTop);
  ctx.moveTo(0, height - safeBottom);
  ctx.lineTo(width, height - safeBottom);
  ctx.stroke();

  // Placeholder player (circle)
  ctx.fillStyle = "#5eead4";
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
  ctx.fill();

  // Small accent so movement is easy to see
  ctx.fillStyle = "#0b1220";
  ctx.beginPath();
  ctx.arc(player.x, player.y - player.radius * 0.25, player.radius * 0.35, 0, Math.PI * 2);
  ctx.fill();
}
