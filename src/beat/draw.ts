import { orbitPoint, orbitTilt, playerPos } from "./world";
import type { BeatWorld } from "./types";

/** How far ahead the lit "danger path" arc reaches, in radians. */
const PATH_ARC = 1.9;

function orbitPos(world: BeatWorld, angle: number) {
  return orbitPoint(world, angle);
}

export function drawBeatFrame(ctx: CanvasRenderingContext2D, world: BeatWorld): void {
  const { width, height } = world;
  const shake =
    world.shakeMs > 0
      ? (Math.random() - 0.5) * 8 * (world.shakeMs / 220)
      : 0;
  const zoom = 1 + world.zoomPulse * 0.08;

  ctx.save();
  ctx.translate(width / 2 + shake, height / 2 + shake);
  ctx.scale(zoom, zoom);
  ctx.translate(-width / 2, -height / 2);

  // Premium arcade background
  ctx.fillStyle = "#03030a";
  ctx.fillRect(-10, -10, width + 20, height + 20);

  const time = world.elapsedMs * 0.001;
  const pulse = world.beatPulse;
  const glow = ctx.createRadialGradient(
    world.cx,
    world.cy,
    world.radius * 0.05,
    world.cx,
    world.cy,
    world.radius * 2.6,
  );
  glow.addColorStop(0, `rgba(139, 92, 246, ${0.2 + pulse * 0.2})`);
  glow.addColorStop(0.42, "rgba(6, 182, 212, 0.12)");
  glow.addColorStop(1, "rgba(3, 3, 10, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  // Moving laser grid gives depth and speed.
  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.strokeStyle = "#7c3aed";
  ctx.lineWidth = 1;
  const horizon = world.cy + world.radius * 0.72;
  for (let i = -8; i <= 8; i++) {
    ctx.beginPath();
    ctx.moveTo(world.cx + i * 26, horizon);
    ctx.lineTo(world.cx + i * 95, height + 20);
    ctx.stroke();
  }
  for (let i = 0; i < 8; i++) {
    const progress = (i / 8 + time * 0.18) % 1;
    const y = horizon + Math.pow(progress, 2.2) * (height - horizon);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  ctx.restore();

  const tilt = orbitTilt(world);

  // The orbit is one track. The lit arc is the part the player is about to
  // travel through, so its colour is information, not decoration.
  ctx.save();
  ctx.translate(world.cx, world.cy);
  ctx.scale(1, tilt);

  ctx.beginPath();
  ctx.arc(0, 0, world.radius, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(124, 58, 237, 0.3)";
  ctx.lineWidth = 3;
  ctx.stroke();

  const forward = world.direction > 0;
  const pathStart = forward ? world.playerAngle : world.playerAngle - PATH_ARC;
  const pathEnd = forward ? world.playerAngle + PATH_ARC : world.playerAngle;
  ctx.beginPath();
  ctx.arc(0, 0, world.radius, pathStart, pathEnd);
  const head = orbitPoint(world, pathEnd);
  const tail = orbitPoint(world, pathStart);
  const ringGradient = ctx.createLinearGradient(
    (forward ? tail.x : head.x) - world.cx,
    ((forward ? tail.y : head.y) - world.cy) / tilt,
    (forward ? head.x : tail.x) - world.cx,
    ((forward ? head.y : tail.y) - world.cy) / tilt,
  );
  ringGradient.addColorStop(0, "rgba(34, 211, 238, 0.95)");
  ringGradient.addColorStop(1, "rgba(244, 114, 182, 0.15)");
  ctx.strokeStyle = ringGradient;
  ctx.lineWidth = 6 + pulse * 5;
  ctx.lineCap = "round";
  ctx.shadowColor = "#22d3ee";
  ctx.shadowBlur = 16 + pulse * 20;
  ctx.stroke();
  ctx.restore();

  // Chevrons on the lit arc spell out which way you are orbiting.
  for (let i = 1; i <= 3; i++) {
    const a = world.playerAngle + world.direction * (i * 0.42);
    const p = orbitPos(world, a);
    const face = Math.atan2(p.y - world.cy, p.x - world.cx) + world.direction * (Math.PI / 2);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(face);
    ctx.globalAlpha = 0.5 - i * 0.11;
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(7, 0);
    ctx.lineTo(0, 7);
    ctx.strokeStyle = "#22d3ee";
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();
  }

  // Center hub
  const hubR = 18 + pulse * 10;
  ctx.beginPath();
  ctx.arc(world.cx, world.cy, hubR, 0, Math.PI * 2);
  const hubGlow = ctx.createRadialGradient(
    world.cx,
    world.cy,
    0,
    world.cx,
    world.cy,
    hubR,
  );
  hubGlow.addColorStop(0, "#f8fafc");
  hubGlow.addColorStop(0.25, "#22d3ee");
  hubGlow.addColorStop(1, "rgba(124, 58, 237, 0)");
  ctx.fillStyle = hubGlow;
  ctx.fill();

  // Beat ticks around ring
  const ticks = world.subdivision;
  for (let i = 0; i < ticks; i++) {
    const a = (i / ticks) * Math.PI * 2 - Math.PI / 2;
    const p1 = orbitPos(world, a);
    const p2 = orbitPos(world, a + 0.012);
    ctx.beginPath();
    ctx.arc(p1.x, p1.y, i % Math.max(1, ticks / 4) === 0 ? 3 : 1.5, 0, Math.PI * 2);
    ctx.fillStyle = i === 0 ? "#fbbf24" : "rgba(226, 232, 240, 0.52)";
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.strokeStyle = "rgba(255,255,255,.25)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Danger pulse on approaching spikes
  for (let i = 0; i < world.spikes.length; i++) {
    const s = world.spikes[i];
    if (!s.active) continue;
    const p = orbitPos(world, s.angle);
    const ang = Math.atan2(p.y - world.cy, p.x - world.cx);
    // Warning ring
    ctx.beginPath();
    ctx.arc(p.x, p.y, 22 + Math.sin(time * 14) * 3, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(251, 44, 148, 0.45)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(ang + Math.PI / 2);
    ctx.beginPath();
    ctx.scale(p.depth, p.depth);
    ctx.moveTo(0, -17);
    ctx.lineTo(9, 11);
    ctx.lineTo(-9, 11);
    ctx.closePath();
    ctx.fillStyle = "#fb2c94";
    ctx.shadowColor = "#fb2c94";
    ctx.shadowBlur = 20;
    ctx.fill();
    ctx.restore();
  }

  // Particle bursts: player input literally lights the stage.
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const p of world.particles) {
    if (!p.active) continue;
    const alpha = p.lifeMs / p.maxLifeMs;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${p.hue}, 95%, 68%, ${alpha})`;
    ctx.shadowColor = `hsl(${p.hue}, 95%, 62%)`;
    ctx.shadowBlur = 14;
    ctx.fill();
  }
  ctx.restore();

  // Player: neon arcade avatar on the single orbit
  const pp = playerPos(world);
  ctx.beginPath();
  ctx.arc(pp.x, pp.y, 18 + pulse * 4, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(34, 211, 238, 0.14)";
  ctx.fill();

  const inv = world.invulnMs > 0 && Math.floor(world.invulnMs / 50) % 2 === 0;
  if (!inv) {
    ctx.beginPath();
    ctx.arc(pp.x, pp.y, 8, 0, Math.PI * 2);
    ctx.fillStyle = "#f8fafc";
    ctx.shadowColor = "#22d3ee";
    ctx.shadowBlur = 20;
    ctx.fill();
    const dirA = world.playerAngle + (world.direction > 0 ? Math.PI / 2 : -Math.PI / 2);
    ctx.beginPath();
    ctx.moveTo(pp.x + Math.cos(dirA) * 22, pp.y + Math.sin(dirA) * 22);
    ctx.lineTo(pp.x + Math.cos(dirA + 2.45) * 11, pp.y + Math.sin(dirA + 2.45) * 11);
    ctx.lineTo(pp.x + Math.cos(dirA - 2.45) * 11, pp.y + Math.sin(dirA - 2.45) * 11);
    ctx.closePath();
    ctx.fillStyle = "#22d3ee";
    ctx.fill();
  }

  // In-canvas judgment is fast and visually tied to the beat.
  if (world.judgeText && world.judgeMs > 0) {
    const alpha = Math.min(1, world.judgeMs / 180);
    const scale = 1 + (420 - Math.min(420, world.judgeMs)) / 900;
    ctx.save();
    ctx.translate(world.cx, world.cy - world.radius * 0.82);
    ctx.scale(scale, scale);
    ctx.textAlign = "center";
    ctx.font = "900 26px system-ui, sans-serif";
    ctx.fillStyle =
      world.judgeText === "PERFECT" || world.judgeText === "CLUTCH"
        ? `rgba(34, 211, 238, ${alpha})`
        : world.judgeText === "GREAT" || world.judgeText === "GOOD"
          ? `rgba(251, 191, 36, ${alpha})`
          : `rgba(251, 44, 148, ${alpha})`;
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 22;
    ctx.fillText(world.judgeText, 0, 0);
    ctx.restore();
  }

  // Seamless stage banner (no overlay interrupt)
  if (world.stageBannerMs > 0) {
    const alpha = Math.min(1, world.stageBannerMs / 350);
    ctx.save();
    ctx.textAlign = "center";
    ctx.font = "900 34px system-ui, sans-serif";
    ctx.fillStyle = `rgba(248, 250, 252, ${alpha})`;
    ctx.shadowColor = "rgba(34, 211, 238, 0.8)";
    ctx.shadowBlur = 28;
    ctx.fillText(world.stageBannerText, world.cx, world.cy);
    ctx.font = "700 14px system-ui, sans-serif";
    ctx.fillStyle = `rgba(34, 211, 238, ${alpha * 0.9})`;
    ctx.fillText("TAP TO REVERSE", world.cx, world.cy + 28);
    ctx.restore();
  }

  ctx.restore();
}
