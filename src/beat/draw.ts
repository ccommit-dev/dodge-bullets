import { orbitPoint, orbitTilt, playerPos } from "./world";
import type { BeatWorld, RingSkinId, SpikeSkinId } from "./types";

const PATH_ARC = 1.9;

const RING_PALETTE: Record<
  RingSkinId,
  { lit: string; dim: string; glow: string; mid: string }
> = {
  neon: {
    lit: "rgba(34, 211, 238, 0.95)",
    dim: "rgba(124, 58, 237, 0.32)",
    glow: "#22d3ee",
    mid: "rgba(244, 114, 182, 0.2)",
  },
  gold: {
    lit: "rgba(251, 191, 36, 0.95)",
    dim: "rgba(180, 120, 40, 0.35)",
    glow: "#fbbf24",
    mid: "rgba(253, 224, 71, 0.25)",
  },
  magenta: {
    lit: "rgba(244, 114, 182, 0.95)",
    dim: "rgba(157, 23, 77, 0.35)",
    glow: "#f472b6",
    mid: "rgba(192, 132, 252, 0.25)",
  },
  ice: {
    lit: "rgba(165, 243, 252, 0.95)",
    dim: "rgba(56, 189, 248, 0.28)",
    glow: "#67e8f9",
    mid: "rgba(186, 230, 253, 0.22)",
  },
  ember: {
    lit: "rgba(251, 146, 60, 0.95)",
    dim: "rgba(154, 52, 18, 0.35)",
    glow: "#fb923c",
    mid: "rgba(248, 113, 113, 0.22)",
  },
};

function drawSpikeShape(
  ctx: CanvasRenderingContext2D,
  skin: SpikeSkinId,
  depth: number,
): void {
  ctx.scale(depth, depth);
  ctx.beginPath();
  switch (skin) {
    case "arrow":
      ctx.moveTo(0, -18);
      ctx.lineTo(8, 4);
      ctx.lineTo(3, 4);
      ctx.lineTo(3, 12);
      ctx.lineTo(-3, 12);
      ctx.lineTo(-3, 4);
      ctx.lineTo(-8, 4);
      break;
    case "diamond":
      ctx.moveTo(0, -16);
      ctx.lineTo(11, 0);
      ctx.lineTo(0, 16);
      ctx.lineTo(-11, 0);
      break;
    case "star":
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
        const b = ((i + 0.5) / 5) * Math.PI * 2 - Math.PI / 2;
        const ox = Math.cos(a) * 15;
        const oy = Math.sin(a) * 15;
        const ix = Math.cos(b) * 7;
        const iy = Math.sin(b) * 7;
        if (i === 0) ctx.moveTo(ox, oy);
        else ctx.lineTo(ox, oy);
        ctx.lineTo(ix, iy);
      }
      break;
    case "bolt":
      ctx.moveTo(2, -16);
      ctx.lineTo(-6, 0);
      ctx.lineTo(1, 0);
      ctx.lineTo(-2, 16);
      ctx.lineTo(8, -2);
      ctx.lineTo(0, -2);
      break;
    default:
      ctx.moveTo(0, -17);
      ctx.lineTo(9, 11);
      ctx.lineTo(-9, 11);
      break;
  }
  ctx.closePath();
}

function drawOrbitRing(
  ctx: CanvasRenderingContext2D,
  world: BeatWorld,
  lane: 0 | 1,
  pulse: number,
): void {
  const palette = RING_PALETTE[world.cosmetics.ringSkin];
  const samples = 72;
  const isPlayerLane = lane === world.playerLane;

  // Dim full orbit
  ctx.beginPath();
  for (let i = 0; i <= samples; i++) {
    const a = (i / samples) * Math.PI * 2;
    const p = orbitPoint(world, a, lane);
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  ctx.closePath();
  ctx.strokeStyle = palette.dim;
  ctx.lineWidth = lane === 1 ? 2.5 : 3.5;
  ctx.stroke();

  // Lit forward path
  const pathSteps = 28;
  ctx.beginPath();
  for (let i = 0; i <= pathSteps; i++) {
    const t = i / pathSteps;
    const ang = world.playerAngle + world.direction * (PATH_ARC * t);
    const p = orbitPoint(world, ang, lane);
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  if (isPlayerLane) {
    ctx.strokeStyle = palette.lit;
    ctx.lineWidth = (lane === 1 ? 4 : 6) + pulse * 4;
    ctx.shadowColor = palette.glow;
    ctx.shadowBlur = 14 + pulse * 18;
  } else {
    ctx.strokeStyle = palette.mid;
    ctx.lineWidth = 3;
    ctx.shadowBlur = 0;
  }
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.shadowBlur = 0;

  if (isPlayerLane) {
    for (let i = 1; i <= 3; i++) {
      const a = world.playerAngle + world.direction * (i * 0.42);
      const p = orbitPoint(world, a, lane);
      const face =
        Math.atan2(p.y - world.cy, p.x - world.cx) + world.direction * (Math.PI / 2);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(face);
      ctx.globalAlpha = 0.5 - i * 0.11;
      ctx.beginPath();
      ctx.moveTo(0, -7);
      ctx.lineTo(7, 0);
      ctx.lineTo(0, 7);
      ctx.strokeStyle = palette.glow;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.restore();
    }
  }
}

export function drawBeatFrame(ctx: CanvasRenderingContext2D, world: BeatWorld): void {
  const { width, height } = world;
  const shake =
    world.shakeMs > 0 ? (Math.random() - 0.5) * 8 * (world.shakeMs / 220) : 0;
  const zoom = 1 + world.zoomPulse * 0.08;
  const palette = RING_PALETTE[world.cosmetics.ringSkin];

  ctx.save();
  ctx.translate(width / 2 + shake, height / 2 + shake);
  ctx.scale(zoom, zoom);
  ctx.translate(-width / 2, -height / 2);

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
  glow.addColorStop(0, `rgba(139, 92, 246, ${0.18 + pulse * 0.18})`);
  glow.addColorStop(0.42, "rgba(6, 182, 212, 0.1)");
  glow.addColorStop(1, "rgba(3, 3, 10, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

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

  // Draw rear (inner) ring first when dual
  if (world.ringCount === 2) {
    drawOrbitRing(ctx, world, 1, pulse * 0.7);
  }
  drawOrbitRing(ctx, world, 0, pulse);

  // Center hub
  const hubR = 16 + pulse * 10;
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
  hubGlow.addColorStop(0.25, palette.glow);
  hubGlow.addColorStop(1, "rgba(124, 58, 237, 0)");
  ctx.fillStyle = hubGlow;
  ctx.fill();

  // Beat ticks on active ring
  const ticks = world.subdivision;
  for (let i = 0; i < ticks; i++) {
    const a = (i / ticks) * Math.PI * 2 - Math.PI / 2;
    const p1 = orbitPoint(world, a, world.playerLane);
    ctx.beginPath();
    ctx.arc(p1.x, p1.y, i % Math.max(1, ticks / 4) === 0 ? 3 : 1.5, 0, Math.PI * 2);
    ctx.fillStyle = i === 0 ? "#fbbf24" : "rgba(226, 232, 240, 0.5)";
    ctx.fill();
  }

  // Spikes
  for (let i = 0; i < world.spikes.length; i++) {
    const s = world.spikes[i];
    if (!s.active) continue;
    const p = orbitPoint(world, s.angle, s.lane);
    const ang = Math.atan2(p.y - world.cy, p.x - world.cx);
    ctx.beginPath();
    ctx.arc(p.x, p.y, 20 + Math.sin(time * 14) * 3, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(251, 44, 148, 0.4)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(ang + Math.PI / 2);
    drawSpikeShape(ctx, world.cosmetics.spikeSkin, p.depth);
    ctx.fillStyle = "#fb2c94";
    ctx.shadowColor = "#fb2c94";
    ctx.shadowBlur = 18;
    ctx.fill();
    ctx.restore();
  }

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
    ctx.shadowColor = palette.glow;
    ctx.shadowBlur = 20;
    ctx.fill();
    const dirA = world.playerAngle + (world.direction > 0 ? Math.PI / 2 : -Math.PI / 2);
    ctx.beginPath();
    ctx.moveTo(pp.x + Math.cos(dirA) * 22, pp.y + Math.sin(dirA) * 22 * orbitTilt(world));
    ctx.lineTo(
      pp.x + Math.cos(dirA + 2.45) * 11,
      pp.y + Math.sin(dirA + 2.45) * 11 * orbitTilt(world),
    );
    ctx.lineTo(
      pp.x + Math.cos(dirA - 2.45) * 11,
      pp.y + Math.sin(dirA - 2.45) * 11 * orbitTilt(world),
    );
    ctx.closePath();
    ctx.fillStyle = palette.glow;
    ctx.fill();
  }

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

  if (world.stageBannerMs > 0) {
    const alpha = Math.min(1, world.stageBannerMs / 350);
    ctx.save();
    ctx.textAlign = "center";
    ctx.font = "900 28px system-ui, sans-serif";
    ctx.fillStyle = `rgba(248, 250, 252, ${alpha})`;
    ctx.shadowColor = palette.glow;
    ctx.shadowBlur = 28;
    ctx.fillText(world.stageBannerText, world.cx, world.cy);
    ctx.font = "700 13px system-ui, sans-serif";
    ctx.fillStyle = `rgba(34, 211, 238, ${alpha * 0.9})`;
    ctx.fillText(world.lessonHint.slice(0, 36), world.cx, world.cy + 28);
    ctx.restore();
  }

  ctx.restore();
}
