import { type BeatSound, type BeatWorld, type NoteLane, type RingSkinId } from "./types";
import { drawDropShape, drawLeafShape } from "../ui/shapes";
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
/** 레인 = 노트 모양·색 (2026-10-07 비버 테마): 0 도토리(주황) · 1 잎(초록) · 2 물방울(파랑) · 3 음표(분홍) */
const LANE_ACCENT: Record<NoteLane, string> = {
  0: "#f59e0b",
  1: "#4ade80",
  2: "#38bdf8",
  3: "#f472b6",
};
const LANE_ACCENT_DARK: Record<NoteLane, string> = { 0: "#92400e", 1: "#166534", 2: "#075985", 3: "#9d174d" };

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

const LANE_SYMBOL: Record<NoteLane, string> = {
  0: "←",
  1: "↓",
  2: "↑",
  3: "→",
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

/** 비트 무대 배경 그림 (2026-10-07, 사용자: "비트 배경 너무 그대로") — 콘셉트 04-beat 의 댐 요새 무대. BeatGame 이 setBeatStageImage 로 넣고,
 *  다 받으면 네온 터널 대신 이 그림을 cover 로 깔고 어둡게 눌러 레일이 읽히게 한다. 없으면 예전 터널 그대로(조용한 폴백이 아니라 그림이 아직 없는 상태) */
let stageImage: HTMLImageElement | null = null;
let stageCache: HTMLCanvasElement | null = null;
export function setBeatStageImage(url: string): void {
  if (typeof Image === "undefined") return;
  const img = new Image();
  img.decoding = "async";
  img.src = url;
  stageImage = img;
  stageCache = null;
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

  // 무대 그림 — cover 맞춤(가로·세로 어느 쪽이든), 위쪽은 살짝 어둡게 해 HUD·노트가 읽히게. 박자에 맞춰 아주 약하게 밝아진다
  const stage = stageImage && stageImage.complete && stageImage.naturalWidth > 0 ? stageImage : null;
  if (stage) {
    // 매 프레임 원본(720×1052)을 cover 로 다시 축소하면 에뮬레이터에서 프레임이 튀어 패드 터치를 놓쳤다 — 화면 크기로 한 번 구워 둔다 (2026-10-07)
    if (!stageCache || stageCache.width !== width || stageCache.height !== height) {
      stageCache = document.createElement("canvas");
      stageCache.width = width; stageCache.height = height;
      const cc = stageCache.getContext("2d");
      if (cc) {
        const sc = Math.max(width / stage.naturalWidth, height / stage.naturalHeight);
        const dw = stage.naturalWidth * sc, dh = stage.naturalHeight * sc;
        cc.drawImage(stage, (width - dw) / 2, (height - dh) / 2, dw, dh);
      }
    }
    ctx.drawImage(stageCache, 0, 0);
    const dim = ctx.createLinearGradient(0, 0, 0, height);
    dim.addColorStop(0, "rgba(2, 6, 23, .55)");
    dim.addColorStop(0.55, "rgba(2, 6, 23, .35)");
    dim.addColorStop(1, "rgba(2, 6, 23, .6)");
    ctx.fillStyle = dim;
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = `rgba(125, 211, 252, ${(music.beatEnv * 0.06).toFixed(3)})`;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
    return;
  }

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
  ctx.fillStyle = "rgba(40, 22, 8, .38)";   // 무대 그림의 다리와 레일이 두 겹으로 보여 레일을 더 투명하게 (2026-10-08 검수 5)
  ctx.fill();
  ctx.strokeStyle = palette.dim;
  ctx.lineWidth = 2;
  ctx.stroke();

  for (let lane = 0 as NoteLane; lane <= 3; lane = (lane + 1) as NoteLane) {
    ctx.beginPath();
    ctx.moveTo(laneXAt(world, lane, 0), horizonY);
    ctx.lineTo(laneXAt(world, lane, 1), hitY);
    const flash = world.laneFlashMs[lane] / PAD_FLASH_MS;
    ctx.strokeStyle = flash > 0 ? LANE_ACCENT[lane] : "rgba(246,215,160,.28)";
    ctx.lineWidth = flash > 0 ? 1 + flash * 2 : 1;
    ctx.globalAlpha = flash > 0 ? 0.35 + flash * 0.55 : 1;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // Beat-depth crossbars make speed and timing legible.
  for (let i = 1; i <= 8; i++) {
    const z = i / 8;
    const eased = z;
    const y = horizonY + (hitY - horizonY) * eased;
    const half = farHalf + (nearHalf - farHalf) * eased;
    ctx.beginPath();
    ctx.moveTo(world.cx - half, y);
    ctx.lineTo(world.cx + half, y);
    ctx.strokeStyle = `rgba(125,211,252,${0.06 + eased * 0.18})`;
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
    if (!step || !step.spike) continue;
    const distance = index - position;
    if (distance < -0.6) continue;
    const z = 1 - distance / preview;
    if (z <= 0) continue;
    // Notes stop at the MIX LINE and pop out there instead of sliding onto the pads.
    const eased = Math.min(1, z);
    const overshoot = Math.max(0, z - 1);
    const lane = laneOfSound(step.sound);
    const trick = step.trick;
    const x = laneXAt(world, lane, eased);
    const y = horizonY + (hitY - horizonY) * eased;
    const size = (5 + eased * 21) * (1 + overshoot * 1.6);
    const consumed = world.hitSteps.has(index);
    const golden = (index + 1) % world.subdivision === 0;
    // 롱노트 몸통: 머리의 hold 길이만큼 (꼬리 스텝은 판정 대상이 아니라 spike=false)
    const holdLen = step.hold ?? 0;
    const sustained = holdLen > 0;
    ctx.save();
    ctx.translate(x, y);
    const fade = overshoot > 0 ? Math.max(0, 1 - overshoot / 0.24) : 1;
    const trickAlpha = trick === "late" ? (eased > .62 ? 1 : .04) : trick === "ghost" ? .34 : trick === "flash" ? (.35 + Math.abs(Math.sin(world.elapsedMs * .012)) * .65) : 1;
    ctx.globalAlpha = (0.35 + eased * 0.65) * fade * (consumed ? 0.3 : 1) * trickAlpha;
    if (sustained && !consumed) {
      // 꼬리 끝 = 다음 노트의 레일 위치 (현재 노트 기준 상대 좌표 — translate 이후)
      const nextEased = Math.max(0, Math.min(1, 1 - (index + holdLen - position) / preview));
      const tailX = laneXAt(world, lane, nextEased) - x;
      const tailY = horizonY + (hitY - horizonY) * nextEased - y;
      const bodyW = size;
      const holdingThis = world.holdLane === lane || world.holdLane2 === lane;
      ctx.strokeStyle = golden ? "rgba(250,204,21,.8)" : LANE_ACCENT[lane];
      ctx.lineWidth = Math.max(3, size * .26);
      ctx.globalAlpha *= .45;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(tailX, tailY);
      ctx.stroke();
      // 꼬리 캡
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(tailX, tailY, Math.max(4, bodyW * 0.55), 0, Math.PI * 2);
      ctx.fillStyle = holdingThis ? "#fef08a" : "#fda4af";
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(248,250,252,.9)";
      ctx.stroke();
      if (eased > 0.5) {
        ctx.font = `900 ${Math.round(7 + eased * 4)}px system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.fillStyle = "rgba(248,250,252,.9)";
        ctx.fillText("HOLD", tailX, tailY - bodyW * 0.9);
      }
    }
    drawNoteBody(ctx, lane, size, eased, consumed, golden, !!(step.holdSteps || step.holdTail));
    if (step.spike && !consumed) drawSpikeDecor(ctx, world.cosmetics.spikeSkin, size, eased, world.elapsedMs);
    if (eased > 0.3) {
      ctx.font = `900 ${Math.round(13 + eased * 15)}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#f8fafc";
      ctx.shadowBlur = 0;
      ctx.fillText(LANE_SYMBOL[lane], 0, -1);
      if (step.holdSteps) {
        ctx.font = `900 ${Math.round(7 + eased * 5)}px system-ui, sans-serif`;
        ctx.fillStyle = "#fde047";
        ctx.fillText(step.jumpSound ? `HOLD JUMP ×${step.holdSteps}` : `HOLD ×${step.holdSteps}`, 0, -size * .92);
      } else if (step.jumpSound) {
        ctx.font = `900 ${Math.round(7 + eased * 5)}px system-ui, sans-serif`;
        ctx.fillStyle = "#a5f3fc";
        ctx.fillText("JUMP", 0, -size * .92);
      } else if (step.roll) {
        ctx.font = `900 ${Math.round(7 + eased * 5)}px system-ui, sans-serif`;
        ctx.fillStyle = "#f9a8d4";
        ctx.fillText("ROLL", 0, -size * .92);
      }
      if (eased > 0.62) {
        ctx.font = `800 ${Math.round(6 + eased * 4)}px system-ui, sans-serif`;
        ctx.fillStyle = "rgba(248,250,252,.82)";
        ctx.fillText(SOUND_SHORT[step.sound], 0, size * 0.48);
      }
    }
    ctx.restore();
    // 점프의 두 번째 노트 — 다른 레인에 같은 깊이로, 두 노트를 잇는 연결선
    if (step.jumpSound) {
      const lane2 = laneOfSound(step.jumpSound);
      const x2 = laneXAt(world, lane2, eased);
      const consumed2 = world.hitSteps2.has(index);
      ctx.save();
      ctx.globalAlpha = (0.35 + eased * 0.65) * fade * 0.7;
      ctx.strokeStyle = "#a5f3fc"; ctx.lineWidth = Math.max(2, size * 0.18); ctx.setLineDash([size * 0.3, size * 0.25]);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x2, y); ctx.stroke(); ctx.setLineDash([]);
      ctx.translate(x2, y);
      ctx.globalAlpha = (0.35 + eased * 0.65) * fade * (consumed2 ? 0.3 : 1);
      drawNoteBody(ctx, lane2, size, eased, consumed2, false, !!step.holdSteps);
      if (eased > 0.3) {
        ctx.font = `900 ${Math.round(13 + eased * 15)}px system-ui, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "#f8fafc"; ctx.shadowBlur = 0;
        ctx.fillText(LANE_SYMBOL[lane2], 0, -1);
      }
      ctx.restore();
    }
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

  drawLoopStack(ctx, world);

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < world.particles.length; i += 1) {
    const p = world.particles[i];
    if (!p.active) continue;
    const alpha = p.lifeMs / p.maxLifeMs;
    ctx.fillStyle = `hsla(${p.hue}, 95%, 68%, ${alpha})`;
    ctx.shadowColor = `hsl(${p.hue}, 95%, 62%)`;
    ctx.shadowBlur = 14;
    // 비버 테마(2026-10-07): 셋 중 하나는 돌아가는 잎, 나머지는 물방울
    if (i % 3 === 0) drawLeafShape(ctx, p.x, p.y, p.size * alpha * 1.6, (1 - alpha) * 5 + i);
    else drawDropShape(ctx, p.x, p.y, p.size * alpha);
  }
  ctx.restore();

  drawHoldState(ctx, world, hitY, horizonY, position, preview);

  if (world.judgeText && world.judgeMs > 0) {
    const alpha = Math.min(1, world.judgeMs / 180);
    const scale = 1 + (420 - Math.min(420, world.judgeMs)) / 900;
    ctx.save();
    // 홀드 고리·끊김 글자가 패드 바로 위에 있으므로 그동안 판정 글자를 한 줄 위로 (2026-10-06)
    const holdUi = world.holdLane >= 0 || world.holdLane2 >= 0 || world.holdFx.length > 0;
    ctx.translate(world.cx, hitY - (holdUi ? 104 : 58));
    ctx.scale(scale, scale);
    ctx.textAlign = "center";
    ctx.font = "900 26px system-ui, sans-serif";
    ctx.fillStyle =
      world.judgeText === "HOLD 끊김"
        ? `rgba(248, 113, 113, ${alpha})`
        : world.judgeText.startsWith("HOLD 완료")
        ? `rgba(253, 224, 71, ${alpha})`
        : world.judgeText === "HOLD ▸ 유지"
        ? `rgba(94, 234, 212, ${alpha})`
        : world.judgeText.endsWith("♥")
        ? `rgba(74, 222, 128, ${alpha})`
        : world.judgeText === "PERFECT" || world.judgeText === "CLUTCH" || world.judgeText === "HOLD"
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

/**
 * 롱노트 상태 (2026-10-06, 사용자: "리듬게임에서는 HOLD 잘되고 있는지 실패한건지 더 가시화 명확히") —
 * 예전에는 머리를 치는 순간 노트가 '소비'되어 몸통이 사라졌고, 유지 중인지·끊겼는지 화면에 아무것도 없었다.
 *   유지 중: 패드에서 꼬리까지 빛줄기 + 패드의 진행률 고리 + "HOLD 63%"
 *   완료: 금빛 고리가 퍼지며 "완료!"      끊김: 붉은 X · 금 간 고리 · "끊김" + 어디까지 버텼는지(%)
 */
function drawHoldState(ctx: CanvasRenderingContext2D, world: BeatWorld, hitY: number, horizonY: number, position: number, preview: number): void {
  const slots: Array<[number, number, number]> = [[world.holdLane, world.holdStartStep, world.holdEndStep], [world.holdLane2, world.holdStartStep2, world.holdEndStep2]];
  const t = world.elapsedMs * 0.001;
  for (const [lane, start, end] of slots) {
    if (lane < 0 || end < 0) continue;
    const padX = laneXAt(world, lane as NoteLane, 1);
    const tailEased = Math.max(0, Math.min(1, 1 - (end - position) / preview));
    const tailX = laneXAt(world, lane as NoteLane, tailEased);
    const tailY = horizonY + (hitY - horizonY) * tailEased;
    const progress = start >= 0 && end > start ? Math.max(0, Math.min(1, (position - start) / (end - start))) : 0;
    const accent = LANE_ACCENT[lane as NoteLane];
    ctx.save();
    // 빛줄기 — 남은 꼬리까지, 숨쉬듯 밝아진다
    const pulse = 0.75 + Math.sin(t * 14) * 0.25;
    const g = ctx.createLinearGradient(padX, hitY, tailX, tailY);
    g.addColorStop(0, "rgba(255,255,255,.95)");
    g.addColorStop(0.35, accent);
    g.addColorStop(1, "rgba(253,224,71,.85)");
    ctx.strokeStyle = g;
    ctx.lineCap = "round";
    ctx.shadowColor = accent;
    ctx.shadowBlur = 24 * pulse;
    ctx.globalAlpha = 0.9;
    ctx.lineWidth = 16;
    ctx.beginPath(); ctx.moveTo(padX, hitY); ctx.lineTo(tailX, tailY); ctx.stroke();
    ctx.lineWidth = 6; ctx.strokeStyle = "rgba(255,255,255,.9)"; ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.moveTo(padX, hitY); ctx.lineTo(tailX, tailY); ctx.stroke();
    // 꼬리 캡 — 놓을 곳
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#fde047"; ctx.strokeStyle = "#fff"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(tailX, tailY, 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    // 패드 진행률 고리
    const r = 30;
    ctx.lineWidth = 6;
    ctx.strokeStyle = "rgba(15,23,42,.75)";
    ctx.beginPath(); ctx.arc(padX, hitY, r, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = "#fde047"; ctx.shadowColor = "#fde047"; ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.arc(padX, hitY, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress); ctx.stroke();
    ctx.shadowBlur = 0;
    // 글자
    ctx.textAlign = "center";
    ctx.font = "900 15px system-ui, sans-serif";
    ctx.lineWidth = 4; ctx.strokeStyle = "rgba(2,6,23,.85)";
    const label = `HOLD ${Math.round(progress * 100)}%`;
    ctx.strokeText(label, padX, hitY - r - 10);
    ctx.fillStyle = "#fef08a";
    ctx.fillText(label, padX, hitY - r - 10);
    ctx.font = "800 11px system-ui, sans-serif";
    ctx.strokeText("떼지 마세요", padX, hitY + r + 16);
    ctx.fillStyle = "#e2e8f0";
    ctx.fillText("떼지 마세요", padX, hitY + r + 16);
    ctx.restore();
  }
  for (const fx of world.holdFx) {
    const padX = laneXAt(world, fx.lane as NoteLane, 1);
    const life = fx.kind === "done" ? 650 : 750;
    const k = 1 - fx.ms / life;                 // 0 → 1
    const alpha = Math.max(0, Math.min(1, fx.ms / 260));
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.textAlign = "center";
    if (fx.kind === "done") {
      ctx.strokeStyle = "#fde047"; ctx.shadowColor = "#fde047"; ctx.shadowBlur = 22; ctx.lineWidth = 6 * (1 - k) + 2;
      ctx.beginPath(); ctx.arc(padX, hitY, 30 + k * 46, 0, Math.PI * 2); ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.font = "900 18px system-ui, sans-serif";
      ctx.lineWidth = 4; ctx.strokeStyle = "rgba(2,6,23,.85)";
      ctx.strokeText("완료!", padX, hitY - 44 - k * 18);
      ctx.fillStyle = "#fde047";
      ctx.fillText("완료!", padX, hitY - 44 - k * 18);
    } else {
      // 금 간 고리 — 버틴 만큼만 남은 호가 붉게 흩어진다
      ctx.strokeStyle = "#ef4444"; ctx.shadowColor = "#ef4444"; ctx.shadowBlur = 18; ctx.lineWidth = 5;
      const segs = 8;
      for (let i = 0; i < segs; i += 1) {
        if (i / segs > Math.max(0.12, fx.progress)) break;
        const a0 = -Math.PI / 2 + (i / segs) * Math.PI * 2 + 0.06, a1 = a0 + (Math.PI * 2) / segs - 0.12;
        const push = k * 18;
        const mid = (a0 + a1) / 2;
        ctx.beginPath(); ctx.arc(padX + Math.cos(mid) * push, hitY + Math.sin(mid) * push, 30, a0, a1); ctx.stroke();
      }
      // 큰 X
      const xr = 16 + k * 6;
      ctx.lineWidth = 7; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(padX - xr, hitY - xr); ctx.lineTo(padX + xr, hitY + xr); ctx.moveTo(padX + xr, hitY - xr); ctx.lineTo(padX - xr, hitY + xr); ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.font = "900 18px system-ui, sans-serif";
      ctx.lineWidth = 4; ctx.strokeStyle = "rgba(2,6,23,.85)";
      const text = `끊김 ${Math.round(fx.progress * 100)}%`;
      ctx.strokeText(text, padX, hitY - 44 - k * 10);
      ctx.fillStyle = "#f87171";
      ctx.fillText(text, padX, hitY - 44 - k * 10);
    }
    ctx.restore();
  }
}

/**
 * 구호(내 노트 장식) — 비트 커스텀 상점 (2026-10-06). 예전엔 spikeSkin 을 사도 아무것도 그리지 않았다.
 * 노트 기준 좌표(translate 이후)에서 그린다. 판정·크기는 바꾸지 않는다 — 외형 전용
 */
function drawSpikeDecor(ctx: CanvasRenderingContext2D, skin: BeatWorld["cosmetics"]["spikeSkin"], size: number, eased: number, ms: number): void {
  if (skin === "triangle" || eased < 0.2) return;
  ctx.save();
  const bx = size * 0.95, by = -size * 0.8, br = Math.max(4, size * 0.42);
  if (skin === "arrow") {
    // 붉은 돌격 꼬리 — 노트 위(멀리) 쪽으로 세 줄
    ctx.strokeStyle = "rgba(248,113,113,.85)"; ctx.lineCap = "round";
    for (let i = -1; i <= 1; i += 1) {
      ctx.lineWidth = Math.max(1.5, size * 0.12);
      ctx.beginPath(); ctx.moveTo(i * size * 0.45, -size * 0.85); ctx.lineTo(i * size * 0.45, -size * (1.5 + Math.abs(i) * -0.2)); ctx.stroke();
    }
  } else if (skin === "diamond") {
    ctx.strokeStyle = "rgba(125,211,252,.95)"; ctx.lineWidth = Math.max(2, size * 0.14);
    ctx.shadowColor = "#38bdf8"; ctx.shadowBlur = 10;
    const r = size * 1.25;
    ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(r * 1.1, 0); ctx.lineTo(0, r); ctx.lineTo(-r * 1.1, 0); ctx.closePath(); ctx.stroke();
  } else if (skin === "star") {
    ctx.fillStyle = "#c084fc"; ctx.shadowColor = "#e9d5ff"; ctx.shadowBlur = 12;
    ctx.beginPath();
    for (let i = 0; i < 10; i += 1) { const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? br * 0.45 : br; ctx.lineTo(bx + Math.cos(a) * r, by + Math.sin(a) * r); }
    ctx.closePath(); ctx.fill();
    const tw = 0.5 + 0.5 * Math.sin(ms * 0.012);
    ctx.globalAlpha = tw; ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(-size * 0.9, -size * 0.7, Math.max(1.5, size * 0.1), 0, Math.PI * 2); ctx.fill();
  } else if (skin === "bolt") {
    ctx.strokeStyle = "rgba(253,224,71,.95)"; ctx.lineWidth = Math.max(1.5, size * 0.1); ctx.shadowColor = "#fde047"; ctx.shadowBlur = 12;
    const j = (ms * 0.02) % 2 < 1 ? 1 : -1;
    ctx.beginPath(); ctx.roundRect(-size * 1.0, -size * 0.9, size * 2.0, size * 1.8, size * 0.35); ctx.stroke();
    ctx.fillStyle = "#facc15";
    ctx.beginPath();
    ctx.moveTo(bx + br * 0.2, by - br); ctx.lineTo(bx - br * 0.55, by + br * 0.1 * j); ctx.lineTo(bx - br * 0.05, by + br * 0.1); ctx.lineTo(bx - br * 0.3, by + br); ctx.lineTo(bx + br * 0.55, by - br * 0.15); ctx.lineTo(bx + br * 0.05, by - br * 0.15); ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/**
 * 노트 본체 (2026-10-07 비버 테마) — 레인마다 다른 물건: 도토리 · 잎 · 물방울 · 음표. 예전엔 전부 붉은 둥근 사각형이었다.
 * 노트 기준 좌표(translate 이후). 방향 화살표 글자는 위에 그대로 얹힌다(입력 신호)
 */
function drawNoteBody(ctx: CanvasRenderingContext2D, lane: NoteLane, size: number, eased: number, consumed: boolean, golden: boolean, tall: boolean): void {
  const main = consumed ? "#94a3b8" : golden ? "#facc15" : LANE_ACCENT[lane];
  const dark = consumed ? "#475569" : golden ? "#a16207" : LANE_ACCENT_DARK[lane];
  const h = tall ? 1.9 : 1.56;
  ctx.save();
  ctx.shadowColor = main;
  ctx.shadowBlur = consumed ? 0 : 8 + eased * 18;
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(248,250,252,.9)";
  if (lane === 0) {
    // 도토리 — 아래 열매(밝은 갈색) + 위 깍정이(짙은 갈색) + 꼭지
    ctx.fillStyle = consumed ? main : golden ? "#facc15" : "#fbbf24";
    ctx.beginPath(); ctx.ellipse(0, size * 0.15, size * 0.78, size * h * 0.42, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = dark;
    ctx.beginPath(); ctx.ellipse(0, -size * 0.32, size * 0.86, size * 0.36, 0, Math.PI, Math.PI * 2); ctx.lineTo(size * 0.86, -size * 0.2); ctx.lineTo(-size * 0.86, -size * 0.2); ctx.closePath(); ctx.fill();
    ctx.fillRect(-size * 0.07, -size * 0.8, size * 0.14, size * 0.3);
    if (!consumed) { ctx.shadowBlur = 0; ctx.beginPath(); ctx.ellipse(0, 0, size * 0.86, size * h * 0.5, 0, 0, Math.PI * 2); ctx.stroke(); }
  } else if (lane === 1) {
    // 잎 — 기울어진 타원 + 잎맥
    ctx.fillStyle = main;
    ctx.beginPath(); ctx.ellipse(0, 0, size * 0.62, size * h * 0.5, -0.5, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = dark; ctx.lineWidth = Math.max(1.5, size * 0.1);
    ctx.beginPath(); ctx.moveTo(-size * 0.36, size * 0.6); ctx.lineTo(size * 0.36, -size * 0.6); ctx.stroke();
    if (!consumed) { ctx.strokeStyle = "rgba(248,250,252,.9)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, 0, size * 0.62, size * h * 0.5, -0.5, 0, Math.PI * 2); ctx.stroke(); }
  } else if (lane === 2) {
    // 물방울 — 위가 뾰족한 둥근 방울 + 하이라이트
    ctx.fillStyle = main;
    ctx.beginPath();
    ctx.moveTo(0, -size * h * 0.55);
    ctx.bezierCurveTo(size * 0.9, size * 0.05, size * 0.85, size * h * 0.45, 0, size * h * 0.48);
    ctx.bezierCurveTo(-size * 0.85, size * h * 0.45, -size * 0.9, size * 0.05, 0, -size * h * 0.55);
    ctx.closePath(); ctx.fill();
    if (!consumed) { ctx.shadowBlur = 0; ctx.stroke(); ctx.fillStyle = "rgba(255,255,255,.7)"; ctx.beginPath(); ctx.ellipse(-size * 0.25, size * 0.1, size * 0.14, size * 0.26, -0.4, 0, Math.PI * 2); ctx.fill(); }
  } else {
    // 음표 — 머리 + 기둥 + 깃발
    ctx.fillStyle = main;
    ctx.beginPath(); ctx.ellipse(-size * 0.2, size * h * 0.28, size * 0.5, size * 0.38, -0.4, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillRect(size * 0.2, -size * h * 0.5, Math.max(2, size * 0.16), size * h * 0.78);
    ctx.beginPath(); ctx.moveTo(size * 0.2, -size * h * 0.5); ctx.quadraticCurveTo(size * 0.95, -size * h * 0.3, size * 0.5, size * 0.1); ctx.quadraticCurveTo(size * 0.6, -size * h * 0.25, size * 0.2, -size * h * 0.28); ctx.closePath(); ctx.fill();
    if (!consumed) { ctx.beginPath(); ctx.ellipse(-size * 0.2, size * h * 0.28, size * 0.5, size * 0.38, -0.4, 0, Math.PI * 2); ctx.stroke(); }
  }
  ctx.restore();
}
