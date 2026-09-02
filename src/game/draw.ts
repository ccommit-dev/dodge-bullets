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
  const bossPalette = ["#fb7185", "#f97316", "#a78bfa", "#facc15", "#22d3ee"];
  const bossColor = bossPalette[Math.max(0, a.bossTier - 1) % bossPalette.length];

  if (a.splitLevel > 0) {
    ctx.save();
    const splitColor = a.splitLevel === 1 ? "#67e8f9" : a.splitLevel === 2 ? "#c084fc" : "#fbbf24";
    ctx.globalAlpha = a.orbitMs > 0 ? 0.82 : 0.42;
    ctx.strokeStyle = splitColor;
    ctx.lineWidth = 2 + a.splitLevel * 0.45;
    ctx.shadowColor = splitColor;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    if (a.orbitMs > 0) {
      ctx.ellipse(a.orbitX, a.orbitY, a.orbitRadius * a.orbitStretch, a.orbitRadius / a.orbitStretch, a.orbitAngle * 0.18, 0, Math.PI * 1.72);
    } else {
      ctx.arc(a.x, a.y, 7 + a.splitLevel * 2, 0, Math.PI * 2);
    }
    ctx.stroke();
    ctx.fillStyle = splitColor;
    ctx.globalAlpha = 0.65;
    for (let i = 0; i < 4; i++) {
      const trail = a.angle + Math.PI + i * 0.18;
      ctx.beginPath();
      ctx.arc(a.x + Math.cos(trail) * (6 + i * 4), a.y + Math.sin(trail) * (6 + i * 4), Math.max(1, 3 - i * 0.55), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  if (a.warningMs > 0) {
    const pulse = 0.25 + 0.45 * (1 - a.warningMs / 560);
    ctx.save();
    ctx.globalAlpha = pulse;
    const warningColor = a.telegraph === "homing" ? "#c084fc" : a.telegraph === "dash" ? "#38bdf8" : a.telegraph === "perfect" ? "#facc15" : a.telegraph === "blast" ? "#f97316" : "#fb3f5c";
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
    const warningText = a.telegraph === "homing" ? "유도탄" : a.telegraph === "sniper" ? "저격 0.8" : a.telegraph === "blast" ? "폭발" : a.telegraph === "charge" ? "측면 돌진" : a.telegraph === "aerial" ? "점프" : a.telegraph === "dash" ? "대시 관통" : "PERFECT";
    ctx.fillText(warningText, Math.max(8, Math.min(ctx.canvas.clientWidth - 76, a.x)), Math.max(18, Math.min(ctx.canvas.clientHeight - 18, a.y + 18)));
    ctx.restore();
  }

  ctx.strokeStyle = a.boss ? bossColor : a.kind === "homing" ? "#c084fc" : a.telegraph === "perfect" ? "#facc15" : a.kind === "explosive" ? "#f59e0b" : a.kind === "ricochet" ? "#38bdf8" : "#f87171";
  ctx.fillStyle = a.boss ? "#fff7ed" : a.kind === "homing" ? "#e9d5ff" : a.telegraph === "perfect" ? "#fef08a" : a.kind === "explosive" ? "#fde68a" : "#fca5a5";
  ctx.lineWidth = a.boss ? 6 + Math.min(5, a.bossTier) : 2.4;
  ctx.lineCap = "round";

  if (a.boss) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = bossColor;
    ctx.globalAlpha = 0.42;
    ctx.lineWidth = 14 + Math.min(12, a.bossTier * 2);
    ctx.shadowColor = bossColor;
    ctx.shadowBlur = 24;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(tx, ty);
    ctx.stroke();
    ctx.restore();
  }

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
  if (a.kind === "homing") {
    ctx.save();
    ctx.strokeStyle = "rgba(192,132,252,.58)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(a.x, a.y, 9 + Math.sin(performance.now() * 0.012) * 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
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

  for (const drop of world.slashDrops) {
    if (!drop.active) continue;
    const color = drop.kind === "rune" ? "#f472b6" : drop.kind === "core" ? "#facc15" : "#67e8f9";
    ctx.save();
    ctx.translate(drop.x, drop.y);
    ctx.rotate(world.animClock * 2.4);
    ctx.fillStyle = color;
    ctx.strokeStyle = "#f8fafc";
    ctx.lineWidth = 2;
    ctx.shadowColor = color;
    ctx.shadowBlur = 16;
    ctx.beginPath();
    if (drop.kind === "edge") {
      ctx.moveTo(0, -13); ctx.lineTo(6, 5); ctx.lineTo(0, 12); ctx.lineTo(-6, 5);
    } else {
      ctx.moveTo(0, -11); ctx.lineTo(10, 0); ctx.lineTo(0, 11); ctx.lineTo(-10, 0);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  for (const fx of world.slashHitFx) {
    if (!fx.active) continue;
    const alpha = Math.max(0, fx.lifeMs / fx.maxLifeMs);
    const pop = 1 + (1 - alpha) * 0.35;
    ctx.save();
    ctx.translate(fx.x, fx.y);
    ctx.scale(pop, pop);
    ctx.globalAlpha = alpha;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    // 에너지 등급별 색: 낮음(시안) → 중간(보라) → 높음(주황). 치명은 금-적 + CRIT 라벨
    const tier = fx.energy >= 0.66 ? 2 : fx.energy >= 0.36 ? 1 : 0;
    const midColor = fx.boss ? "#fde047" : fx.crit ? "#fde68a" : tier === 2 ? "#fb923c" : tier === 1 ? "#a78bfa" : "#67e8f9";
    const lowColor = fx.boss ? "#fb7185" : fx.crit ? "#f97316" : tier === 2 ? "#ef4444" : tier === 1 ? "#7c3aed" : "#0ea5e9";
    const size = fx.boss ? 30 : fx.crit ? 28 : 20 + tier * 2;
    ctx.font = `italic 1000 ${size}px system-ui, sans-serif`;
    ctx.lineWidth = fx.boss || fx.crit ? 7 : 5;
    ctx.strokeStyle = fx.crit ? "#7c2d12" : "#3b0764";
    ctx.shadowColor = fx.crit ? "#fbbf24" : midColor;
    ctx.shadowBlur = fx.crit ? 22 : 16;
    ctx.strokeText(String(fx.value), 0, 0);
    const grad = ctx.createLinearGradient(0, -18, 0, 14);
    grad.addColorStop(0, "#ffffff");
    grad.addColorStop(0.45, midColor);
    grad.addColorStop(1, lowColor);
    ctx.fillStyle = grad;
    ctx.fillText(String(fx.value), 0, 0);
    if (fx.crit) {
      ctx.font = "italic 900 11px system-ui, sans-serif";
      ctx.lineWidth = 3;
      ctx.strokeText("CRITICAL", 0, -size * 0.78);
      ctx.fillStyle = "#fef3c7";
      ctx.fillText("CRITICAL", 0, -size * 0.78);
    } else if (tier === 2 && !fx.boss) {
      ctx.font = "900 9px system-ui, sans-serif";
      ctx.lineWidth = 3;
      ctx.strokeText("HIGH ENERGY", 0, -size * 0.8);
      ctx.fillStyle = "#ffedd5";
      ctx.fillText("HIGH ENERGY", 0, -size * 0.8);
    }
    ctx.restore();
  }

  if (world.bossSpawned && !world.bossDefeated) {
    const barW = Math.min(280, width - world.safeLeft - world.safeRight - 36);
    const barX = (width - barW) * 0.5;
    const barY = world.safeTop + 126;
    const ratio = world.bossMaxCuts > 0 ? world.bossCutsLeft / world.bossMaxCuts : 0;
    ctx.save();
    ctx.fillStyle = "rgba(15,23,42,.9)";
    ctx.strokeStyle = "#fbbf24";
    ctx.lineWidth = 2;
    ctx.fillRect(barX, barY, barW, 25);
    ctx.strokeRect(barX, barY, barW, 25);
    ctx.fillStyle = "#ef4444";
    ctx.fillRect(barX + 3, barY + 3, (barW - 6) * ratio, 19);
    ctx.fillStyle = "#fff";
    ctx.font = "900 11px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(`보스 화살 · 남은 검격 ${world.bossCutsLeft}/${world.bossMaxCuts}`, width * 0.5, barY + 17);
    ctx.restore();
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
