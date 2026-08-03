import { createBeatboxPlayer, type BeatboxPlayer } from "./audio";
import {
  angularSpeedFor,
  buildChart,
  getCampaignStage,
  getTrack,
  isLastCampaignStage,
  stepDurationSec,
  trackDurationMs,
  type BeatTrackDef,
} from "./tracks";
import type { BeatChartStep, BeatParticle, BeatSpike, BeatWorld } from "./types";

const SPIKE_POOL = 48;
const HIT_ANGLE = 0.12;
const NEAR_ANGLE = 0.32;
const TIMING_WINDOW = 0.45;

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

function applyTrackToWorld(
  world: BeatWorld,
  track: BeatTrackDef,
  firstSound: BeatChartStep["sound"],
  keepRun: boolean,
): void {
  world.bpm = track.bpm;
  world.subdivision = track.subdivision;
  world.difficulty = track.difficulty;
  world.stepSec = stepDurationSec(track);
  world.durationMs = trackDurationMs(track);
  world.angularSpeed = angularSpeedFor(track);
  world.trackName = track.name;
  world.nextSound = firstSound;
  world.lastSound = null;
  world.stepIndex = 0;
  world.stepAccSec = 0;
  world.elapsedMs = 0;
  world.cleared = false;
  world.dead = false;
  world.beatPulse = 0.8;
  world.shakeMs = 0;
  world.judgeText = "";
  world.judgeMs = 0;
  world.zoomPulse = 0.35;
  for (const s of world.spikes) s.active = false;
  if (!keepRun) {
    world.score = 0;
    world.combo = 0;
    world.maxCombo = 0;
    world.performIndex = 0;
    world.hp = track.difficulty === "hard" ? 2 : 3;
    world.maxHp = world.hp;
    world.playerAngle = -Math.PI / 2;
    world.direction = 1;
  } else {
    // Soft heal between stages
    world.hp = Math.min(world.maxHp, world.hp + 1);
  }
  world.invulnMs = 600;
}

export function createBeatWorld(
  width: number,
  height: number,
  dpr: number,
  track: BeatTrackDef,
  firstSound: BeatChartStep["sound"],
  stageIndex = 0,
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
    playerAngle: -Math.PI / 2,
    playerLane: 0,
    direction: 1,
    angularSpeed: angularSpeedFor(track),
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
    lastSound: null,
    nextSound: firstSound,
    timingHint: 0,
    judgeText: "",
    judgeMs: 0,
    stageIndex,
    stageBannerMs: 1400,
    stageBannerText: `STAGE ${stageIndex + 1}`,
    zoomPulse: 0,
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

const SPAWN_AHEAD_MIN = 1.0;
const SPAWN_AHEAD_MAX = 1.5;
/** Reversing must always be a valid escape, so keep the rear lane clear. */
const ESCAPE_CLEARANCE = 0.95;
const SPIKE_LIFE_MS = 2400;

/**
 * Place a spike ahead on the orbit — reverse or die (Orbit or Beat).
 * Never spawn if it would sandwich the player between two spikes.
 */
function spawnSpike(world: BeatWorld): boolean {
  const ahead = SPAWN_AHEAD_MIN + Math.random() * (SPAWN_AHEAD_MAX - SPAWN_AHEAD_MIN);
  const angle = world.playerAngle + world.direction * ahead;

  for (const other of world.spikes) {
    if (!other.active) continue;
    // Something already blocks the escape route behind the player
    const behind = signedDelta(other.angle, world.playerAngle) * world.direction < 0;
    if (behind && angularDist(other.angle, world.playerAngle) < ESCAPE_CLEARANCE) {
      return false;
    }
    // Avoid stacking spikes on top of each other
    if (angularDist(other.angle, angle) < 0.38) return false;
  }

  const s = acquireSpike(world);
  if (!s) return false;
  s.active = true;
  s.angle = angle;
  s.lane = 0;
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
  box.startBacking(track.bpm);

  return { world, chart, track, box, ctx, master, enabled: soundEnabled };
}

/** Seamless next stage — keep audio, score, HP; no menu interrupt. */
export function continueCampaignStage(session: BeatSession): boolean {
  const nextIndex = session.world.stageIndex + 1;
  if (isLastCampaignStage(session.world.stageIndex)) return false;

  const track = getCampaignStage(nextIndex);
  const chart = buildChart(track);
  session.chart = chart;
  session.track = track;
  session.world.stageIndex = nextIndex;
  applyTrackToWorld(session.world, track, chart[0]?.sound ?? "boots", true);
  session.world.stageBannerText = `STAGE ${nextIndex + 1}`;
  session.world.stageBannerMs = 1200;
  session.box.stopBacking();
  session.box.startBacking(track.bpm);
  return true;
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
 * Orbit or Beat core: ONE button = reverse direction + play your beatbox note.
 * Instant, tactile, music = your clicks.
 */
export function performBeatMove(session: BeatSession): void {
  const world = session.world;
  if (world.dead || world.cleared) return;

  world.direction = world.direction === 1 ? -1 : 1;

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

  // Near-spike reverse = clutch dodge bonus
  for (const s of world.spikes) {
    if (!s.active) continue;
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
  const { x, y } = orbitPoint(world, world.playerAngle);
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
  | { type: "stage-clear"; nextStage: number }
  | { type: "beat" };

export function updateBeatWorld(
  session: BeatSession,
  dtSec: number,
  running: boolean,
): BeatEvent {
  const world = session.world;
  if (!running || world.dead || world.cleared) return { type: "none" };

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
    if (step?.spike && spawnSpike(world)) {
      event = { type: "beat" };
    }
    if (world.stepIndex % world.subdivision === 0) {
      world.beatPulse = Math.max(world.beatPulse, 0.3);
    }
    const upcoming = session.chart[Math.min(world.stepIndex + 1, session.chart.length - 1)];
    if (upcoming) world.nextSound = upcoming.sound;

    world.stepIndex += 1;
    if (world.stepIndex >= session.chart.length || world.elapsedMs >= world.durationMs) {
      return finishStage(session);
    }
  }

  if (world.elapsedMs >= world.durationMs) {
    return finishStage(session);
  }

  let hit = false;
  for (let i = 0; i < world.spikes.length; i++) {
    const s = world.spikes[i];
    if (!s.active) continue;
    s.ageMs += dtSec * 1000;

    const dAng = angularDist(s.angle, world.playerAngle);

    if (dAng <= HIT_ANGLE && world.invulnMs <= 0) {
      hit = true;
      s.active = false;
      continue;
    }

    if (!s.nearMissed && dAng <= NEAR_ANGLE && dAng > HIT_ANGLE) {
      s.nearMissed = true;
    }

    // Spikes linger on the ring, so every reversal is a real decision.
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
      return { type: "dead" };
    }
    return { type: "hit", hp: world.hp };
  }

  return event;
}

function finishStage(session: BeatSession): BeatEvent {
  const world = session.world;
  // Stages 1–5 (incl. stage 3→4): seamless continue
  if (!isLastCampaignStage(world.stageIndex)) {
    const next = world.stageIndex + 1;
    continueCampaignStage(session);
    return { type: "stage-clear", nextStage: next };
  }
  world.cleared = true;
  return { type: "clear" };
}

function normalizeAngle(a: number): number {
  let x = a % (Math.PI * 2);
  if (x < 0) x += Math.PI * 2;
  return x;
}

/** Signed shortest delta from b to a, in (-PI, PI]. */
function signedDelta(a: number, b: number): number {
  let d = normalizeAngle(a) - normalizeAngle(b);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function angularDist(a: number, b: number): number {
  return Math.abs(signedDelta(a, b));
}

/** Single source of truth so player, spikes and ring share one projection. */
export function orbitTilt(world: BeatWorld): number {
  return 0.62 + Math.sin(world.elapsedMs * 0.0006) * 0.06;
}

export function orbitPoint(
  world: BeatWorld,
  angle: number,
): { x: number; y: number; depth: number } {
  const tilt = orbitTilt(world);
  const sin = Math.sin(angle);
  return {
    x: world.cx + Math.cos(angle) * world.radius,
    y: world.cy + sin * world.radius * tilt,
    depth: 0.75 + 0.25 * (sin * 0.5 + 0.5) * 2,
  };
}

export function playerPos(world: BeatWorld): { x: number; y: number; r: number } {
  const p = orbitPoint(world, world.playerAngle);
  return { x: p.x, y: p.y, r: world.radius };
}
