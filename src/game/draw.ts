import { drawStickman } from "./player";
import { getStage } from "./stages";
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

  if (a.warningMs > 0) {
    const pulse = 0.25 + 0.45 * (1 - a.warningMs / 560);
    ctx.save();
    ctx.globalAlpha = pulse;
    const warningColor = a.telegraph === "dash" ? "#38bdf8" : a.telegraph === "perfect" ? "#facc15" : a.telegraph === "blast" ? "#f97316" : "#fb3f5c";
    ctx.strokeStyle = warningColor;
    ctx.lineWidth = a.telegraph === "blast" ? 9 : 3;
    ctx.setLineDash([8, 8]);
    if (a.telegraph === "blast") {
      ctx.beginPath();
      ctx.ellipse(a.x, Math.max(a.y, ty), 34, 12, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(a.x + cos * 900, a.y + sin * 900);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.fillStyle = warningColor;
    ctx.font = "800 11px system-ui";
    const warningText = a.telegraph === "sniper" ? "저격 0.8" : a.telegraph === "blast" ? "폭발" : a.telegraph === "charge" ? "측면 돌진" : a.telegraph === "aerial" ? "점프" : a.telegraph === "dash" ? "대시 관통" : "PERFECT";
    ctx.fillText(warningText, Math.max(8, Math.min(ctx.canvas.clientWidth - 76, a.x)), Math.max(18, Math.min(ctx.canvas.clientHeight - 18, a.y + 18)));
    ctx.restore();
  }

  ctx.strokeStyle = a.telegraph === "perfect" ? "#facc15" : a.kind === "explosive" ? "#f59e0b" : a.kind === "ricochet" ? "#38bdf8" : "#f87171";
  ctx.fillStyle = a.telegraph === "perfect" ? "#fef08a" : a.kind === "explosive" ? "#fde68a" : "#fca5a5";
  ctx.lineWidth = 2.4;
  ctx.lineCap = "round";

  // shaft
  ctx.beginPath();
  ctx.moveTo(bx, by);
  ctx.lineTo(tx, ty);
  ctx.stroke();

  if (a.kind === "explosive") {
    ctx.beginPath();
    ctx.arc(a.x, a.y, 9, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(251, 191, 36, 0.5)";
    ctx.fill();
  }

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

  // 원정 추격대 — 단순 탄막이 아니라 적이 사격하는 전장으로 읽히게 한다.
  const enemyX = width - world.safeRight - 42;
  const enemyY = floorY - 40;
  ctx.save();
  ctx.strokeStyle = "rgba(251,113,133,.9)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(enemyX, enemyY - 28, 9, 0, Math.PI * 2);
  ctx.moveTo(enemyX, enemyY - 18); ctx.lineTo(enemyX, enemyY + 12);
  ctx.moveTo(enemyX, enemyY - 8); ctx.lineTo(enemyX - 14, enemyY + 4);
  ctx.moveTo(enemyX, enemyY - 8); ctx.lineTo(enemyX + 15, enemyY - 18);
  ctx.moveTo(enemyX, enemyY + 12); ctx.lineTo(enemyX - 10, enemyY + 30);
  ctx.moveTo(enemyX, enemyY + 12); ctx.lineTo(enemyX + 10, enemyY + 30);
  ctx.stroke();
  ctx.strokeStyle = "#fbbf24";
  ctx.beginPath(); ctx.arc(enemyX + 18, enemyY - 18, 15, -1.2, 1.2); ctx.stroke();
  ctx.restore();

  if (world.stageIndex === 3) {
    ctx.save();
    ctx.globalAlpha = 0.32 + Math.sin(world.animClock * 8) * 0.05;
    ctx.fillStyle = "#7f1d1d";
    ctx.beginPath();
    ctx.arc(width - 18, floorY - 42, 42, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fecaca";
    ctx.font = "900 11px system-ui";
    ctx.fillText("추격대장", width - 72, floorY - 88);
    ctx.restore();
  }

  const stageProgress = world.stageElapsedMs / Math.max(1, getStage(world.stageIndex).durationMs);
  if (world.chests === 0 && stageProgress >= 0.42 && stageProgress <= 0.78) {
    const chestX = width * 0.7;
    const chestY = floorY - 23;
    ctx.save();
    ctx.fillStyle = "#92400e";
    ctx.strokeStyle = "#fde68a";
    ctx.lineWidth = 3;
    ctx.fillRect(chestX - 21, chestY - 17, 42, 27);
    ctx.strokeRect(chestX - 21, chestY - 17, 42, 27);
    ctx.fillStyle = "#fbbf24";
    ctx.fillRect(chestX - 4, chestY - 17, 8, 27);
    ctx.font = "800 11px system-ui";
    ctx.fillText("재료 상자", chestX - 27, chestY - 24);
    ctx.restore();
  }

  // 쳐낸 공격이 보급품으로 쌓이는 즉각적인 목표 피드백.
  ctx.save();
  const trackerW = Math.min(190, width - world.safeLeft - world.safeRight - 24);
  const trackerX = width - world.safeRight - trackerW - 12;
  const trackerY = world.safeTop + 76;
  ctx.fillStyle = "rgba(8,47,73,.88)";
  ctx.strokeStyle = "#67e8f9";
  ctx.lineWidth = 2;
  ctx.fillRect(trackerX, trackerY, trackerW, 40);
  ctx.strokeRect(trackerX, trackerY, trackerW, 40);
  ctx.fillStyle = "#e0f2fe";
  ctx.font = "700 11px system-ui";
  ctx.fillText(`처치 ${world.enemyKills} · 완벽 ${world.perfectDodges} · 상자 ${world.chests}`, trackerX + 10, trackerY + 16);
  ctx.font = "700 10px system-ui";
  ctx.fillStyle = "#fde68a";
  ctx.fillText(`보급 ${world.supplies} · 원정 인장 ${world.expeditionSeals}`, trackerX + 10, trackerY + 31);
  ctx.restore();

  for (let i = 0; i < arrows.length; i++) {
    if (arrows[i].active) drawArrow(ctx, arrows[i]);
  }

  drawStickman(ctx, world);

  if (world.player.slowActiveMs > 0) {
    const pulse = 1 - world.player.slowActiveMs / Math.max(1, world.stats.slowDurationMs);
    ctx.save();
    ctx.globalAlpha = 0.85 - pulse * 0.55;
    ctx.strokeStyle = "#67e8f9";
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(world.player.x, world.player.y, world.stats.slowRadius * (0.55 + pulse * 0.55), -1.25, 1.3);
    ctx.stroke();
    ctx.restore();
  }
}
