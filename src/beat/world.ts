import { createBeatboxPlayer, type BeatboxPlayer } from "./audio";
import { emptyBeatCosmetics } from "./shop";
import {
  angularSpeedFor,
  buildChart,
  getTrack,
  stepDurationSec,
  trackDurationMs,
  type BeatTrackDef,
} from "./tracks";
import type {
  BeatChartStep,
  BeatCosmetics,
  BeatParticle,
  BeatSpike,
  BeatWorld,
} from "./types";

const SPIKE_POOL = 48;
const HIT_ANGLE = 0.12;
const NEAR_ANGLE = 0.32;
const TIMING_WINDOW = 0.45;
const SPAWN_AHEAD_MIN = 1.0;
const SPAWN_AHEAD_MAX = 1.5;
const ESCAPE_CLEARANCE = 0.95;
const SPIKE_LIFE_MS = 2400;
const CLEAR_FX_MS = 900;

function makeSpikes(): BeatSpike[] {
  return Array.from({ length: SPIKE_POOL }, () => ({
    active: false,
    angle: 0,
    lane: 0,
    ageMs: 0,
    nearMissed: false,
  }));
}

function makeParticles(): BeatParticle[] {
  return Array.from({ length: 120 }, () => ({
    active: false,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    lifeMs: 0,
    maxLifeMs: 0,
    size: 0,
    hue: 185,
  }));
}

function layout(world: BeatWorld): void {
  const playW = world.width - world.safeLeft - world.safeRight;
  const playH = world.height - world.safeTop - world.safeBottom;
  world.cx = world.safeLeft + playW * 0.5;
  world.cy = world.safeTop + playH * 0.5;
  world.radius = Math.min(playW, playH) * 0.34;
  world.laneGap = Math.max(18, world.radius * 0.22);
}

export function createBeatWorld(
  width: number,
  height: number,
  dpr: number,
  track: BeatTrackDef,
  firstSound: BeatChartStep["sound"],
  stageIndex = 0,
  cosmetics: BeatCosmetics = emptyBeatCosmetics(),
): BeatWorld {
  const world: BeatWorld = {
    width,
    height,
    dpr,
    safeTop: 12,
    safeBottom: 12,
    safeLeft: 8,
    safeRight: 8,
    cx: width / 2,
    cy: height / 2,
    radius: 120,
    laneGap: 28,
    ringCount: track.ringCount,
    playerAngle: -Math.PI / 2,
    playerLane: 0,
    direction: 1,
    angularSpeed: angularSpeedFor(track),
    ringYaw: 0,
    ringPitch: 0,
    ringRoll: 0,
    spikes: makeSpikes(),
    particles: makeParticles(),
    elapsedMs: 0,
    durationMs: trackDurationMs(track),
    bpm: track.bpm,
    subdivision: track.subdivision,
    difficulty: track.difficulty,
    stepSec: stepDurationSec(track),
    stepIndex: 0,
    stepAccSec: 0,
    performIndex: 0,
    score: 0,
    combo: 0,
    maxCombo: 0,
    comboTimerMs: 0,
    hp: track.difficulty === "hard" ? 2 : 3,
    maxHp: track.difficulty === "hard" ? 2 : 3,
    invulnMs: 900,
    dead: false,
    cleared: false,
    beatPulse: 0,
    shakeMs: 0,
    trackName: track.name,
    lessonTitle: track.lessonTitle,
    lessonHint: track.lessonHint,
    lastSound: null,
    nextSound: firstSound,
    timingHint: 0,
    judgeText: "",
    judgeMs: 0,
    stageIndex,
    stageBannerMs: 1600,
    stageBannerText: track.lessonTitle,
    zoomPulse: 0,
    clearFxMs: 0,
    cosmetics,
  };
  layout(world);
  return world;
}

export function resizeBeatWorld(
  world: BeatWorld,
  width: number,
  height: number,
  dpr: number,
): void {
  world.width = width;
  world.height = height;
  world.dpr = dpr;
  layout(world);
}

export function applyBeatInsets(
  world: BeatWorld,
  insets: { top: number; right: number; bottom: number; left: number },
): void {
  world.safeTop = insets.top;
  world.safeRight = insets.right;
  world.safeBottom = insets.bottom;
  world.safeLeft = insets.left;
  layout(world);
}

function acquireSpike(world: BeatWorld): BeatSpike | null {
  for (let i = 0; i < world.spikes.length; i++) {
    if (!world.spikes[i].active) return world.spikes[i];
  }
  return null;
}

function spawnSpike(world: BeatWorld, lane: 0 | 1): boolean {
  const ahead = SPAWN_AHEAD_MIN + Math.random() * (SPAWN_AHEAD_MAX - SPAWN_AHEAD_MIN);
  const angle = world.playerAngle + world.direction * ahead;

  for (const other of world.spikes) {
    if (!other.active) continue;
    if (other.lane !== lane) continue;
    const behind = signedDelta(other.angle, world.playerAngle) * world.direction < 0;
    if (behind && angularDist(other.angle, world.playerAngle) < ESCAPE_CLEARANCE) {
      return false;
    }
    if (angularDist(other.angle, angle) < 0.38) return false;
  }

  const s = acquireSpike(world);
  if (!s) return false;
  s.active = true;
  s.angle = angle;
  s.lane = world.ringCount === 1 ? 0 : lane;
  s.ageMs = 0;
  s.nearMissed = false;
  return true;
}

export type BeatSession = {
  world: BeatWorld;
  chart: BeatChartStep[];
  track: BeatTrackDef;
  box: BeatboxPlayer;
  ctx: AudioContext | null;
  master: GainNode | null;
  enabled: boolean;
};

export async function createBeatSession(
  width: number,
  height: number,
  dpr: number,
  trackId: string,
  soundEnabled: boolean,
  stageIndex = 0,
  cosmetics: BeatCosmetics = emptyBeatCosmetics(),
): Promise<BeatSession> {
  const track = getTrack(trackId);
  const chart = buildChart(track);
  const world = createBeatWorld(
    width,
    height,
    dpr,
    track,
    chart[0]?.sound ?? "boots",
    stageIndex,
    cosmetics,
  );

  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  if (soundEnabled) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 1;
    master.connect(ctx.destination);
    if (ctx.state === "suspended") await ctx.resume();
  }

  const box = createBeatboxPlayer(
    () => ctx,
    () => master,
    () => soundEnabled && !!ctx,
  );
  box.startMetronome(track.bpm);
  // First guide note — same syllable the player will reinforce on tap
  if (chart[0]) box.playGuide(chart[0].sound);

  return { world, chart, track, box, ctx, master, enabled: soundEnabled };
}

export function disposeBeatSession(session: BeatSession): void {
  session.box.dispose();
  void session.ctx?.close();
  session.ctx = null;
  session.master = null;
}

function bumpCombo(world: BeatWorld, amount = 1): void {
  world.combo += amount;
  if (world.combo > world.maxCombo) world.maxCombo = world.combo;
  world.comboTimerMs = 1800;
}

/**
 * ONE button = reverse (+ lane flip on dual hard) + play the lesson syllable loudly.
 * Guide track already whispered the same sound — matching feels like learning.
 */
export function performBeatMove(session: BeatSession): void {
  const world = session.world;
  if (world.dead || world.cleared) return;

  world.direction = world.direction === 1 ? -1 : 1;
  if (world.ringCount === 2 && world.difficulty === "hard") {
    world.playerLane = world.playerLane === 0 ? 1 : 0;
  }

  const phase = world.stepAccSec / Math.max(0.001, world.stepSec);
  const dist = Math.min(phase, 1 - phase);
  const onBeat = dist <= TIMING_WINDOW;
  const timingQuality = onBeat ? 1 - dist / TIMING_WINDOW : 0.4;

  let idx = world.stepIndex;
  if (phase > 0.5 && idx + 1 < session.chart.length) idx = world.stepIndex + 1;
  idx = Math.min(idx, session.chart.length - 1);
  const step = session.chart[idx];
  if (!step) return;

  session.box.playSound(step.sound, timingQuality);
  world.lastSound = step.sound;
  world.beatPulse = onBeat ? 1 : 0.65;
  world.zoomPulse = onBeat ? 0.55 : 0.28;
  world.shakeMs = Math.max(world.shakeMs, onBeat ? 90 : 40);
  world.performIndex += 1;
  world.timingHint = onBeat ? 1 : 0.35;
  world.judgeText = timingQuality > 0.72 ? "PERFECT" : onBeat ? "GREAT" : "GOOD";
  world.judgeMs = 380;
  spawnMoveParticles(world, onBeat ? 26 : 12, onBeat ? 185 : 300);

  for (const s of world.spikes) {
    if (!s.active) continue;
    if (s.lane !== world.playerLane) continue;
    let dAng = Math.abs(normalizeAngle(s.angle - world.playerAngle));
    if (dAng > Math.PI) dAng = Math.PI * 2 - dAng;
    if (dAng < NEAR_ANGLE) {
      bumpCombo(world, 2);
      world.score += 40;
      world.judgeText = "CLUTCH";
      spawnMoveParticles(world, 20, 45);
      break;
    }
  }

  if (onBeat) {
    bumpCombo(world, 1);
    world.score += 18 + Math.floor(timingQuality * 14);
  } else {
    world.score += 8;
  }

  const next = session.chart[Math.min(idx + 1, session.chart.length - 1)];
  world.nextSound = next?.sound ?? step.sound;
}

export function performBeatTap(session: BeatSession): void {
  performBeatMove(session);
}

export function reverseBeatDir(session: BeatSession): void {
  performBeatMove(session);
}

function spawnMoveParticles(world: BeatWorld, count: number, hue: number): void {
  const { x, y } = orbitPoint(world, world.playerAngle, world.playerLane);
  let made = 0;
  for (let i = 0; i < world.particles.length && made < count; i++) {
    const p = world.particles[i];
    if (p.active) continue;
    const a = Math.random() * Math.PI * 2;
    const speed = 80 + Math.random() * 220;
    p.active = true;
    p.x = x;
    p.y = y;
    p.vx = Math.cos(a) * speed;
    p.vy = Math.sin(a) * speed;
    p.maxLifeMs = 220 + Math.random() * 320;
    p.lifeMs = p.maxLifeMs;
    p.size = 2 + Math.random() * 5;
    p.hue = hue + Math.random() * 40;
    made += 1;
  }
}

export type BeatEvent =
  | { type: "none" }
  | { type: "hit"; hp: number }
  | { type: "dead" }
  | { type: "clear" }
  | { type: "beat" };

export function updateBeatWorld(
  session: BeatSession,
  dtSec: number,
  running: boolean,
): BeatEvent {
  const world = session.world;
  if (!running || world.dead) return { type: "none" };

  if (world.cleared) {
    if (world.clearFxMs > 0) {
      world.clearFxMs = Math.max(0, world.clearFxMs - dtSec * 1000);
      world.beatPulse = Math.max(world.beatPulse, 0.6);
      world.zoomPulse = Math.max(world.zoomPulse, 0.35);
      world.ringYaw += dtSec * 1.2;
      if (world.clearFxMs <= 0) return { type: "clear" };
    }
    return { type: "none" };
  }

  world.elapsedMs += dtSec * 1000;
  if (world.invulnMs > 0) world.invulnMs = Math.max(0, world.invulnMs - dtSec * 1000);
  if (world.shakeMs > 0) world.shakeMs = Math.max(0, world.shakeMs - dtSec * 1000);
  if (world.comboTimerMs > 0) {
    world.comboTimerMs = Math.max(0, world.comboTimerMs - dtSec * 1000);
    if (world.comboTimerMs <= 0) world.combo = 0;
  }
  world.beatPulse = Math.max(0, world.beatPulse - dtSec * 2.8);
  world.timingHint = Math.max(0, world.timingHint - dtSec * 2.2);
  world.judgeMs = Math.max(0, world.judgeMs - dtSec * 1000);
  if (world.judgeMs <= 0) world.judgeText = "";
  world.stageBannerMs = Math.max(0, world.stageBannerMs - dtSec * 1000);
  world.zoomPulse = Math.max(0, world.zoomPulse - dtSec * 1.8);

  // Slow 3D tumble — more dramatic on dual-ring stages
  const tumble = world.ringCount === 2 ? 1.15 : 0.75;
  world.ringYaw += dtSec * 0.35 * tumble;
  world.ringPitch = Math.sin(world.elapsedMs * 0.00055) * (0.18 + world.ringCount * 0.06);
  world.ringRoll = Math.sin(world.elapsedMs * 0.0004) * 0.08;

  for (const p of world.particles) {
    if (!p.active) continue;
    p.lifeMs -= dtSec * 1000;
    if (p.lifeMs <= 0) {
      p.active = false;
      continue;
    }
    p.x += p.vx * dtSec;
    p.y += p.vy * dtSec;
    p.vx *= Math.pow(0.92, dtSec * 60);
    p.vy *= Math.pow(0.92, dtSec * 60);
  }

  world.playerAngle += world.direction * world.angularSpeed * dtSec;

  let event: BeatEvent = { type: "none" };

  world.stepAccSec += dtSec;
  while (world.stepAccSec >= world.stepSec) {
    world.stepAccSec -= world.stepSec;
    const step = session.chart[world.stepIndex];
    if (step) {
      // Quiet teacher voice — identical synthesizer to player taps
      session.box.playGuide(step.sound);
      if (step.spike && spawnSpike(world, step.lane)) {
        event = { type: "beat" };
      }
      if (world.stepIndex % world.subdivision === 0) {
        world.beatPulse = Math.max(world.beatPulse, 0.35);
      }
    }
    const upcoming = session.chart[Math.min(world.stepIndex + 1, session.chart.length - 1)];
    if (upcoming) world.nextSound = upcoming.sound;

    world.stepIndex += 1;
    if (world.stepIndex >= session.chart.length || world.elapsedMs >= world.durationMs) {
      return beginClear(session);
    }
  }

  if (world.elapsedMs >= world.durationMs) {
    return beginClear(session);
  }

  let hit = false;
  for (let i = 0; i < world.spikes.length; i++) {
    const s = world.spikes[i];
    if (!s.active) continue;
    s.ageMs += dtSec * 1000;

    if (s.lane !== world.playerLane) {
      if (s.ageMs > SPIKE_LIFE_MS) s.active = false;
      continue;
    }

    const dAng = angularDist(s.angle, world.playerAngle);

    if (dAng <= HIT_ANGLE && world.invulnMs <= 0) {
      hit = true;
      s.active = false;
      continue;
    }

    if (!s.nearMissed && dAng <= NEAR_ANGLE && dAng > HIT_ANGLE) {
      s.nearMissed = true;
    }

    if (s.ageMs > SPIKE_LIFE_MS) {
      s.active = false;
    }
  }

  world.score = Math.max(
    world.score,
    Math.floor(world.elapsedMs / 40) +
      world.combo * 6 +
      world.maxCombo * 10 +
      world.performIndex * 4 +
      world.stageIndex * 80,
  );

  if (hit) {
    world.hp -= 1;
    world.invulnMs = 750;
    world.shakeMs = 280;
    world.zoomPulse = 0.4;
    world.judgeText = "MISS";
    world.judgeMs = 520;
    spawnMoveParticles(world, 32, 345);
    world.combo = 0;
    world.comboTimerMs = 0;
    if (world.hp <= 0) {
      world.dead = true;
      session.box.stopMetronome();
      return { type: "dead" };
    }
    return { type: "hit", hp: world.hp };
  }

  return event;
}

function beginClear(session: BeatSession): BeatEvent {
  const world = session.world;
  if (world.cleared) return { type: "none" };
  world.cleared = true;
  world.clearFxMs = CLEAR_FX_MS;
  world.judgeText = "PERFECT";
  world.judgeMs = CLEAR_FX_MS;
  world.stageBannerText = "STAGE CLEAR";
  world.stageBannerMs = CLEAR_FX_MS;
  world.beatPulse = 1;
  world.zoomPulse = 0.7;
  session.box.stopMetronome();
  // Fanfare = last lesson sound loud
  const last = session.chart[Math.max(0, session.chart.length - 1)];
  if (last) session.box.playSound(last.sound, 1);
  for (const s of world.spikes) s.active = false;
  return { type: "none" };
}

function normalizeAngle(a: number): number {
  let x = a % (Math.PI * 2);
  if (x < 0) x += Math.PI * 2;
  return x;
}

function signedDelta(a: number, b: number): number {
  let d = normalizeAngle(a) - normalizeAngle(b);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function angularDist(a: number, b: number): number {
  return Math.abs(signedDelta(a, b));
}

/** Base ellipse tilt combined with live 3D pitch. */
export function orbitTilt(world: BeatWorld): number {
  return 0.55 + Math.sin(world.ringPitch + 0.4) * 0.12 + world.ringPitch * 0.35;
}

/**
 * Project an orbit angle through yaw/pitch/roll so the ring feels 3D.
 * lane 0 = outer ring, lane 1 = inner ring.
 */
export function orbitPoint(
  world: BeatWorld,
  angle: number,
  lane: 0 | 1 = 0,
): { x: number; y: number; depth: number } {
  const r = lane === 1 ? world.radius * 0.62 : world.radius;
  const a = angle + world.ringYaw * 0.15;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  // Local ring plane → rotate by pitch/roll
  const x = cos * r;
  const y = sin * r;
  const z = 0;
  const cp = Math.cos(world.ringPitch);
  const sp = Math.sin(world.ringPitch);
  const cr = Math.cos(world.ringRoll);
  const sr = Math.sin(world.ringRoll);
  // pitch around X
  const y1 = y * cp - z * sp;
  const z1 = y * sp + z * cp;
  // roll around Z
  const x2 = x * cr - y1 * sr;
  const y2 = x * sr + y1 * cr;
  const z2 = z1;
  const perspective = 1 / (1 + z2 / (world.radius * 2.8));
  return {
    x: world.cx + x2 * perspective,
    y: world.cy + y2 * perspective * orbitTilt(world),
    depth: Math.max(0.55, Math.min(1.35, perspective * (0.85 + (sin * 0.5 + 0.5) * 0.3))),
  };
}

export function playerPos(world: BeatWorld): { x: number; y: number; r: number } {
  const p = orbitPoint(world, world.playerAngle, world.playerLane);
  const r = world.playerLane === 1 ? world.radius * 0.62 : world.radius;
  return { x: p.x, y: p.y, r };
}
