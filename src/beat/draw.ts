import { LANE_KEYS, type BeatSound, type BeatWorld, type NoteLane, type RingSkinId } from "./types";
import { laneOfSound, laneXAt, PAD_FLASH_MS, railGeometry } from "./world";

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

/** Pad accents shared with the DOM buttons so lane and key read as one thing. */
const LANE_ACCENT: Record<NoteLane, string> = {
  0: "#fbbf24",
  1: "#22d3ee",
  2: "#f472b6",
};

const SOUND_SHORT: Record<BeatSound, string> = {
  boots: "B",
  cats: "T",
  rim: "K",
  click: "TK",
  breath: "H",
  firebeat: "PF",
  trumpet: "TR",
  throat: "TH",
};

/**
 * Everything animated by the music reads from here, so the stage swings on the
 * BGM grid only — player taps never speed it up or interrupt it.
 */
type MusicClock = {
  /** Fractional chart step position. */
  position: number;
  /** Fractional quarter-note position. */
  beatFloat: number;
  /** 1 on the beat, decaying to 0 before the next one. */
  beatEnv: number;
  /** 0..1 through the current bar. */
  barPhase: number;
  /** Accent colour of the syllable the guide is playing. */
  accent: string;
};

function musicClock(world: BeatWorld): MusicClock {
  const position = world.beatPosition;
  const stepsPerBeat = Math.max(1, world.subdivision / 4);
  const beatFloat = position / stepsPerBeat;
  const beatPhase = beatFloat - Math.floor(beatFloat);
  const current = world.chart[Math.floor(position)];
  return {
    position,
    beatFloat,
    beatEnv: (1 - beatPhase) ** 2.2,
    barPhase: (position % world.subdivision) / world.subdivision,
    accent: current ? LANE_ACCENT[laneOfSound(current.sound)] : LANE_ACCENT[1],
  };
}

const TUNNEL_RINGS = 12;
const RING_SPACING = 0.62;
/** Half-width in world units; small enough that near rings sweep past the camera. */
const TUNNEL_HALF = 0.5;
const TUNNEL_NEAR = 0.55;

/** Deterministic star field so the club haze is stable across frames. */
const STARS = Array.from({ length: 84 }, (_, i) => {
  const rand = (seed: number) => {
    const v = Math.sin((i + 1) * seed) * 43758.5453;
    return v - Math.floor(v);
  };
  return {
    x: rand(12.9898) * 1.6 - 0.8,
    y: rand(78.233) * 1.5 - 0.75,
    z: rand(3.14159) * TUNNEL_RINGS * RING_SPACING,
    size: 0.7 + rand(9.71) * 1.8,
  };
});

/** Octahedron edges for the wireframe centrepiece. */
const OCTA_VERTS: [number, number, number][] = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
];
const OCTA_EDGES: [number, number][] = [
  [0, 2],
  [0, 3],
  [0, 4],
  [0, 5],
  [1, 2],
  [1, 3],
  [1, 4],
  [1, 5],
  [2, 4],
  [2, 5],
  [3, 4],
  [3, 5],
];

type Projected = { sx: number; sy: number; s: number };

function project(
  world: BeatWorld,
  vanishY: number,
  x: number,
  y: number,
  z: number,
): Projected {
  const focal = Math.min(world.width, world.height) * 0.82;
  const depth = Math.max(0.12, z);
  return {
    sx: world.cx + (x * focal) / depth,
    sy: vanishY + (y * focal) / depth,
    s: focal / depth,
  };
}

/**
 * BGM-synced 3D club: a tunnel that advances one slot per beat, a rotating
 * wireframe over the stage, and haze streaming past the camera. Damage shake
 * lives here so the note rail itself never moves.
 */
function drawStage3D(
  ctx: CanvasRenderingContext2D,
  world: BeatWorld,
  music: MusicClock,
  vanishY: number,
): void {
  const { width, height } = world;
  const shake =
    world.shakeMs > 0 ? (Math.random() - 0.5) * 7 * (world.shakeMs / 200) : 0;
  // No per-beat scaling: the room may light up on the beat, never wobble.
  const breathe = 1 + world.zoomPulse * 0.05;

  ctx.save();
  ctx.translate(width / 2 + shake, height / 2 + shake);
  ctx.scale(breathe, breathe);
  ctx.translate(-width / 2, -height / 2);

  ctx.fillStyle = "#03030a";
  ctx.fillRect(-40, -40, width + 80, height + 80);

  const haze = ctx.createRadialGradient(
    world.cx,
    vanishY,
    10,
    world.cx,
    vanishY,
    Math.max(width, height) * 0.9,
  );
  haze.addColorStop(0, `rgba(139, 92, 246, ${0.18 + music.beatEnv * 0.05})`);
  haze.addColorStop(0.45, "rgba(6, 182, 212, 0.08)");
  haze.addColorStop(1, "rgba(3, 3, 10, 0)");
  ctx.fillStyle = haze;
  ctx.fillRect(0, 0, width, height);

  // One ring slot per bar, not per beat: a slow drift reads as depth, whereas
  // a per-beat advance made the whole room lurch outward on every count.
  const scroll = (music.beatFloat / 4) % TUNNEL_RINGS;

  // Longitudinal corner rails give the room its depth.
  ctx.save();
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(124, 58, 237, 0.28)";
  for (const [cx, cy] of [
    [-TUNNEL_HALF, -TUNNEL_HALF],
    [TUNNEL_HALF, -TUNNEL_HALF],
    [TUNNEL_HALF, TUNNEL_HALF],
    [-TUNNEL_HALF, TUNNEL_HALF],
  ]) {
    const near = project(world, vanishY, cx, cy, TUNNEL_NEAR);
    const far = project(world, vanishY, cx, cy, TUNNEL_NEAR + TUNNEL_RINGS * RING_SPACING);
    ctx.beginPath();
    ctx.moveTo(far.sx, far.sy);
    ctx.lineTo(near.sx, near.sy);
    ctx.stroke();
  }
  ctx.restore();

  // Tunnel rings step one slot toward the camera on every quarter note.
  for (let i = 0; i < TUNNEL_RINGS; i++) {
    const slot = (i + TUNNEL_RINGS - scroll) % TUNNEL_RINGS;
    const z = TUNNEL_NEAR + slot * RING_SPACING;
    const corners = [
      project(world, vanishY, -TUNNEL_HALF, -TUNNEL_HALF, z),
      project(world, vanishY, TUNNEL_HALF, -TUNNEL_HALF, z),
      project(world, vanishY, TUNNEL_HALF, TUNNEL_HALF, z),
      project(world, vanishY, -TUNNEL_HALF, TUNNEL_HALF, z),
    ];
    // Fade in at the far end and back out as the ring sweeps past the camera,
    // so no ring ever becomes a hard frame over the playfield.
    const fade =
      Math.min(1, 2.2 / z) *
      Math.min(1, (TUNNEL_RINGS - slot) / 3) *
      Math.min(1, slot / 2.2);
    // A single mid-depth ring glows with the beat. Kept faint and never
    // recoloured, so the room never reads as a flash across the whole screen.
    const flash = music.beatEnv * Math.max(0, 1 - Math.abs(slot - 2.5) / 1.5);
    ctx.beginPath();
    ctx.moveTo(corners[0].sx, corners[0].sy);
    for (let c = 1; c < corners.length; c++) ctx.lineTo(corners[c].sx, corners[c].sy);
    ctx.closePath();
    ctx.strokeStyle = "rgba(148, 130, 240, 0.7)";
    ctx.globalAlpha = Math.min(0.26, fade * (0.16 + flash * 0.16));
    ctx.lineWidth = 1;
    ctx.shadowBlur = 0;
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;

  // Haze motes drifting toward the camera.
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const travel = music.beatFloat * RING_SPACING;
  for (const star of STARS) {
    const span = TUNNEL_RINGS * RING_SPACING;
    let z = star.z - (travel % span);
    if (z < TUNNEL_NEAR) z += span;
    const p = project(world, vanishY, star.x, star.y, z);
    if (p.sx < -60 || p.sx > width + 60 || p.sy < -60 || p.sy > height + 60) continue;
    const alpha = Math.min(0.6, 1.4 / z) * (0.72 + music.beatEnv * 0.18);
    ctx.beginPath();
    ctx.arc(p.sx, p.sy, Math.max(0.7, (star.size * p.s) / 620), 0, Math.PI * 2);
    ctx.fillStyle = `rgba(186, 230, 253, ${alpha})`;
    ctx.fill();
  }
  ctx.restore();

  // Wireframe centrepiece spinning over the Guide MC.
  const spinY = world.elapsedMs * 0.00055;
  const spinX = Math.sin(world.elapsedMs * 0.0004) * 0.6;
  const radius = 0.2 + music.beatEnv * 0.012;
  const centreZ = 2.6;
  // Sits above the Guide MC's head so it never overlaps the performer.
  const centreY = -0.78;
  const verts = OCTA_VERTS.map(([vx, vy, vz]) => {
    const x1 = vx * Math.cos(spinY) + vz * Math.sin(spinY);
    const z1 = -vx * Math.sin(spinY) + vz * Math.cos(spinY);
    const y1 = vy * Math.cos(spinX) - z1 * Math.sin(spinX);
    const z2 = vy * Math.sin(spinX) + z1 * Math.cos(spinX);
    return project(world, vanishY, x1 * radius, y1 * radius + centreY, centreZ + z2 * radius);
  });
  ctx.save();
  ctx.strokeStyle = music.accent;
  ctx.globalAlpha = 0.26 + music.beatEnv * 0.14;
  ctx.lineWidth = 1.4;
  ctx.shadowColor = music.accent;
  ctx.shadowBlur = 8;
  for (const [a, b] of OCTA_EDGES) {
    ctx.beginPath();
    ctx.moveTo(verts[a].sx, verts[a].sy);
    ctx.lineTo(verts[b].sx, verts[b].sy);
    ctx.stroke();
  }
  ctx.restore();

  // Bar-line sweep: a light bar crosses the room once per bar.
  const sweepZ = TUNNEL_NEAR + (1 - music.barPhase) * TUNNEL_RINGS * RING_SPACING;
  const sweepL = project(world, vanishY, -TUNNEL_HALF, TUNNEL_HALF, sweepZ);
  const sweepR = project(world, vanishY, TUNNEL_HALF, TUNNEL_HALF, sweepZ);
  ctx.save();
  ctx.strokeStyle = music.accent;
  ctx.globalAlpha = 0.18;
  ctx.lineWidth = 2;
  ctx.shadowColor = music.accent;
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.moveTo(sweepL.sx, sweepL.sy);
  ctx.lineTo(sweepR.sx, sweepR.sy);
  ctx.stroke();
  ctx.restore();

  ctx.restore();
}

function drawLoopStack(ctx: CanvasRenderingContext2D, world: BeatWorld): void {
  const entries = (Object.entries(world.loopCounts) as [BeatSound, number][])
    .filter(([, count]) => count > 0)
    .slice(0, 5);
  if (entries.length === 0) return;
  const x = world.safeLeft + 14;
  const y = world.safeTop + 116;
  ctx.save();
  ctx.font = "700 10px system-ui, sans-serif";
  ctx.fillStyle = "rgba(226,232,240,.62)";
  ctx.fillText("YOUR LOOP", x, y);
  entries.forEach(([sound, count], index) => {
    const yy = y + 18 + index * 15;
    const width = Math.min(84, 18 + count * 4);
    ctx.fillStyle = "rgba(34,211,238,.22)";
    ctx.fillRect(x, yy, 88, 8);
    ctx.fillStyle = "rgba(34,211,238,.9)";
    ctx.fillRect(x, yy, width, 8);
    ctx.fillStyle = "rgba(226,232,240,.75)";
    ctx.fillText(SOUND_SHORT[sound], x + 94, yy + 8);
  });
  ctx.restore();
}

export function drawBeatFrame(ctx: CanvasRenderingContext2D, world: BeatWorld): void {
  const palette = RING_PALETTE[world.cosmetics.ringSkin];
  const music = musicClock(world);
  // Musical pulse only — presses must not drive the stage.
  const pulse = Math.max(world.beatPulse, music.beatEnv * 0.7);

  // 3D timing runway: notes travel from the Guide MC to the player's hit line.
  const { horizonY, hitY, farHalf, nearHalf } = railGeometry(world);

  drawStage3D(ctx, world, music, horizonY);
  // BeatGame layers the shared 2D adventurer over the former Guide MC position.

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(world.cx - farHalf, horizonY);
  ctx.lineTo(world.cx + farHalf, horizonY);
  ctx.lineTo(world.cx + nearHalf, hitY);
  ctx.lineTo(world.cx - nearHalf, hitY);
  ctx.closePath();
  ctx.fillStyle = "rgba(15,23,42,.7)";
  ctx.fill();
  ctx.strokeStyle = palette.dim;
  ctx.lineWidth = 2;
  ctx.stroke();

  for (let lane = 0 as NoteLane; lane <= 2; lane = (lane + 1) as NoteLane) {
    ctx.beginPath();
    ctx.moveTo(laneXAt(world, lane, 0), horizonY);
    ctx.lineTo(laneXAt(world, lane, 1), hitY);
    const flash = world.laneFlashMs[lane] / PAD_FLASH_MS;
    ctx.strokeStyle = flash > 0 ? LANE_ACCENT[lane] : "rgba(148,163,184,.2)";
    ctx.lineWidth = flash > 0 ? 1 + flash * 2 : 1;
    ctx.globalAlpha = flash > 0 ? 0.35 + flash * 0.55 : 1;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // Beat-depth crossbars make speed and timing legible.
  for (let i = 1; i <= 8; i++) {
    const z = i / 8;
    const eased = z * z;
    const y = horizonY + (hitY - horizonY) * eased;
    const half = farHalf + (nearHalf - farHalf) * eased;
    ctx.beginPath();
    ctx.moveTo(world.cx - half, y);
    ctx.lineTo(world.cx + half, y);
    ctx.strokeStyle = `rgba(34,211,238,${0.05 + eased * 0.16})`;
    ctx.stroke();
  }
  ctx.restore();

  // Notes ride the rail on the audio clock: a note touches MIX LINE exactly
  // when the transport position equals its chart index.
  const position = music.position;
  const preview = world.subdivision === 16 ? 14 : 10;
  const head = Math.floor(position);
  for (let offset = preview; offset >= -1; offset--) {
    const index = head + offset;
    if (index < 0) continue;
    const step = world.chart[index];
    if (!step) continue;
    const distance = index - position;
    if (distance < -0.6) continue;
    const z = 1 - distance / preview;
    if (z <= 0) continue;
    // Notes stop at the MIX LINE and pop out there instead of sliding onto the pads.
    const eased = Math.min(1, z) ** 2;
    const overshoot = Math.max(0, z - 1);
    const lane = laneOfSound(step.sound);
    const x = laneXAt(world, lane, eased);
    const y = horizonY + (hitY - horizonY) * eased;
    const size = (5 + eased * 21) * (1 + overshoot * 1.6);
    const consumed = world.hitSteps.has(index);
    ctx.save();
    ctx.translate(x, y);
    const fade = overshoot > 0 ? Math.max(0, 1 - overshoot / 0.24) : 1;
    ctx.globalAlpha = (0.35 + eased * 0.65) * fade * (consumed ? 0.3 : 1);
    ctx.beginPath();
    if (step.spike) {
      ctx.moveTo(0, -size);
      ctx.lineTo(size * 0.82, size * 0.65);
      ctx.lineTo(-size * 0.82, size * 0.65);
      ctx.closePath();
    } else {
      ctx.arc(0, 0, size * 0.72, 0, Math.PI * 2);
    }
    ctx.fillStyle = consumed ? "#94a3b8" : LANE_ACCENT[lane];
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 8 + eased * 18;
    ctx.fill();
    if (step.spike && !consumed) {
      ctx.shadowBlur = 0;
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(248,250,252,.9)";
      ctx.stroke();
    }
    if (eased > 0.3) {
      ctx.font = `900 ${Math.round(8 + eased * 8)}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#f8fafc";
      ctx.shadowBlur = 0;
      ctx.fillText(SOUND_SHORT[step.sound], 0, 1);
    }
    ctx.restore();
  }

  // Player hit line / mixer pad.
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(world.cx - nearHalf, hitY);
  ctx.lineTo(world.cx + nearHalf, hitY);
  ctx.strokeStyle = palette.lit;
  ctx.lineWidth = 5 + pulse * 5;
  ctx.shadowColor = palette.glow;
  ctx.shadowBlur = 18 + pulse * 24;
  ctx.stroke();
  ctx.restore();

  // Three pads under the line, one per lane, labelled with their keys.
  const padLabel: Record<NoteLane, string> = { 0: "B", 1: "T", 2: "K" };
  for (let lane = 0 as NoteLane; lane <= 2; lane = (lane + 1) as NoteLane) {
    const x = laneXAt(world, lane, 1);
    const flash = Math.min(1, world.laneFlashMs[lane] / PAD_FLASH_MS);
    const padW = Math.min(96, nearHalf * 0.58);
    const padH = 34;
    ctx.save();
    ctx.translate(x, hitY + 24);
    ctx.beginPath();
    ctx.roundRect(-padW / 2, -padH / 2, padW, padH, 10);
    ctx.fillStyle = flash > 0 ? LANE_ACCENT[lane] : "rgba(15,23,42,.82)";
    ctx.globalAlpha = flash > 0 ? 0.35 + flash * 0.5 : 0.9;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.lineWidth = 1.5 + flash * 2;
    ctx.strokeStyle = flash > 0 ? LANE_ACCENT[lane] : "rgba(148,163,184,.35)";
    ctx.shadowColor = LANE_ACCENT[lane];
    ctx.shadowBlur = flash * 20;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.textAlign = "center";
    ctx.font = "900 14px system-ui, sans-serif";
    ctx.fillStyle = "#f8fafc";
    ctx.fillText(padLabel[lane], 0, -1);
    ctx.font = "700 8px system-ui, sans-serif";
    ctx.fillStyle = "rgba(226,232,240,.7)";
    ctx.fillText(LANE_KEYS[lane], 0, 11);
    ctx.restore();
  }

  drawLoopStack(ctx, world);

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

  if (world.judgeText && world.judgeMs > 0) {
    const alpha = Math.min(1, world.judgeMs / 180);
    const scale = 1 + (420 - Math.min(420, world.judgeMs)) / 900;
    ctx.save();
    ctx.translate(world.cx, hitY - 58);
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
    ctx.fillText(world.stageBannerText, world.cx, horizonY - 54);
    ctx.font = "700 13px system-ui, sans-serif";
    ctx.fillStyle = `rgba(34, 211, 238, ${alpha * 0.9})`;
    ctx.fillText(world.lessonHint.slice(0, 36), world.cx, horizonY - 28);
    ctx.restore();
  }
}
