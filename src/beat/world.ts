import { createAudioChain, createBeatboxPlayer, type BeatboxPlayer } from "./audio";
import { emptyBeatCosmetics } from "./shop";
import {
  hpBonusFromSkills,
  timingBonusFromSkills,
  type BeatSkills,
  emptySkills,
} from "./rpg";
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
  BeatSound,
  BeatSpike,
  BeatWorld,
  NoteLane,
} from "./types";

/** Which pad a syllable belongs to. Drawing and judging share this map. */
const SOUND_LANE: Record<BeatSound, NoteLane> = {
  boots: 0,
  firebeat: 0,
  throat: 0,
  cats: 1,
  click: 1,
  breath: 1,
  rim: 2,
  trumpet: 2,
};

export function laneOfSound(sound: BeatSound): NoteLane {
  return SOUND_LANE[sound];
}

/** Rail geometry shared by renderer, pads and particle bursts. */
export function railGeometry(world: BeatWorld): {
  horizonY: number;
  hitY: number;
  farHalf: number;
  nearHalf: number;
} {
  return {
    horizonY: Math.max(world.safeTop + 180, world.height * 0.34),
    hitY: world.height - world.safeBottom - Math.max(150, world.height * 0.2),
    farHalf: Math.min(45, world.width * 0.12),
    nearHalf: Math.min(world.width * 0.46, 230),
  };
}

/** Horizontal position of a lane at depth `eased` (0 = horizon, 1 = hit line). */
export function laneXAt(world: BeatWorld, lane: NoteLane, eased: number): number {
  const { farHalf, nearHalf } = railGeometry(world);
  const spread = farHalf * 0.45 + (nearHalf * 0.62 - farHalf * 0.45) * eased;
  return world.cx + (lane - 1) * spread;
}

const SPIKE_POOL = 48;
/** Playhead advance per frame that means the render loop stalled, not played. */
const MAX_JUMP_SEC = 0.5;
/** Pad lit time after a press — the only input-driven visual. */
export const PAD_FLASH_MS = 170;

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
    hp: track.difficulty === "hard" ? 6 : track.difficulty === "medium" ? 7 : 8,
    maxHp: track.difficulty === "hard" ? 6 : track.difficulty === "medium" ? 7 : 8,
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
    chart: [],
    loopCounts: {
      breath: 0,
      firebeat: 0,
      trumpet: 0,
      boots: 0,
      cats: 0,
      throat: 0,
      click: 0,
      rim: 0,
    },
    lastOffsetMs: 0,
    loopCompletion: 0,
    laneFlashMs: [0, 0, 0],
    hitSteps: new Set<number>(),
    beatPosition: 0,
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

export type BeatSession = {
  world: BeatWorld;
  chart: BeatChartStep[];
  track: BeatTrackDef;
  box: BeatboxPlayer;
  ctx: AudioContext | null;
  master: GainNode | null;
  enabled: boolean;
  skills: BeatSkills;
  isSpar: boolean;
  /** Perfect-ish locks this run (for RPG fame). */
  lockHits: number;
  taps: number;
  hitSteps: Set<number>;
  evaluatedStep: number;
};

export async function createBeatSession(
  width: number,
  height: number,
  dpr: number,
  trackId: string,
  soundEnabled: boolean,
  stageIndex = 0,
  cosmetics: BeatCosmetics = emptyBeatCosmetics(),
  skills: BeatSkills = emptySkills(),
  isSpar = false,
  difficultyProfile?: { bpmMultiplier: number; difficulty: "easy" | "medium" | "hard"; force16?: boolean },
): Promise<BeatSession> {
  const baseTrack = getTrack(trackId);
  const track = difficultyProfile ? {
    ...baseTrack,
    bpm: Math.round(baseTrack.bpm * difficultyProfile.bpmMultiplier),
    difficulty: difficultyProfile.difficulty,
    subdivision: difficultyProfile.force16 ? 16 as const : baseTrack.subdivision,
    ringCount: difficultyProfile.difficulty === "easy" ? 1 as const : 2 as const,
  } : baseTrack;
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
  world.chart = chart;

  const bonusHp = hpBonusFromSkills(skills);
  world.hp = Math.min(5, world.hp + bonusHp);
  world.maxHp = world.hp;
  if (isSpar) {
    world.stageBannerText = `SPAR · ${track.lessonTitle}`;
    world.lessonHint = "박자에 탭해 BGM 가이드 위에 리드를 겹치세요";
  }

  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  if (soundEnabled) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC();
    master = createAudioChain(ctx);
    if (ctx.state === "suspended") await ctx.resume();
  }

  const box = createBeatboxPlayer(
    () => ctx,
    () => master,
    () => soundEnabled && !!ctx,
  );

  const session: BeatSession = {
    world,
    chart,
    track,
    box,
    ctx,
    master,
    enabled: soundEnabled,
    skills,
    isSpar,
    lockHits: 0,
    taps: 0,
    hitSteps: new Set<number>(),
    evaluatedStep: 0,
  };

  // Audio-clock lesson BGM — same syllables the player will layer on tap.
  // This fires up to LOOKAHEAD ahead of the sound, so it must never touch the
  // playhead (stepIndex / beatPosition) or the note stream would jump forward.
  box.startLessonTransport(track.bpm, world.stepSec, chart, (stepIndex, sound) => {
    world.nextSound =
      chart[Math.min(stepIndex + 1, chart.length - 1)]?.sound ?? sound;
  });

  return session;
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
 * Hit the pad matching the lane of the note arriving at the MIX LINE.
 * The lead is scheduled on that note's own grid time so it stacks with the guide.
 */
export function performBeatLane(session: BeatSession, lane: NoteLane): void {
  const world = session.world;
  if (world.dead || world.cleared) return;

  session.taps += 1;
  world.laneFlashMs[lane] = PAD_FLASH_MS;
  world.performIndex += 1;

  const stepSec = world.stepSec;
  // Judge against the same playhead the notes are drawn from.
  const position =
    session.enabled && session.box.isTransportRunning()
      ? Math.max(world.beatPosition, session.box.getTransportPosition())
      : world.beatPosition;

  // Widest forgiving window, tightened so 16ths cannot claim a neighbour's note.
  const windowSec = Math.min(
    0.19 + timingBonusFromSkills(session.skills) * 0.2,
    stepSec * 0.62,
  );

  let bestIndex = -1;
  let bestDistSec = Infinity;
  const from = Math.max(0, Math.floor(position) - 2);
  const to = Math.min(session.chart.length - 1, Math.floor(position) + 3);
  for (let i = from; i <= to; i++) {
    const step = session.chart[i];
    if (!step || laneOfSound(step.sound) !== lane) continue;
    if (world.hitSteps.has(i)) continue;
    const distSec = Math.abs(i - position) * stepSec;
    if (distSec < bestDistSec) {
      bestDistSec = distSec;
      bestIndex = i;
    }
  }

  const onTime = bestIndex >= 0 && bestDistSec <= windowSec;
  const lock = onTime ? Math.max(0, 1 - bestDistSec / windowSec) : 0;
  const sound = onTime
    ? session.chart[bestIndex].sound
    : LANE_FALLBACK_SOUND[lane];

  if (onTime) {
    const offsetSec = (position - bestIndex) * stepSec;
    world.lastOffsetMs = Math.round(offsetSec * 1000);
    world.hitSteps.add(bestIndex);
    session.hitSteps.add(bestIndex);
    if (lock > 0.55) session.lockHits += 1;
    world.loopCounts[sound] += 1;
    const distinct = Object.values(world.loopCounts).filter((count) => count > 0).length;
    const required = new Set(session.chart.map((step) => step.sound)).size;
    world.loopCompletion = Math.min(1, distinct / Math.max(1, required));

    // Schedule on the note's own grid time so guide and lead share one attack.
    const gridWhen = session.box.isTransportRunning()
      ? session.box.getTransportStepTime(bestIndex)
      : 0;
    session.box.playLead(sound, gridWhen, lock);

    bumpCombo(world, 1);
    world.score += 18 + Math.floor(lock * 16);
    world.judgeText = lock > 0.78 ? "PERFECT" : lock > 0.45 ? "GREAT" : "GOOD";
  } else {
    world.lastOffsetMs = 0;
    session.box.playLead(sound, 0, 0);
    world.score += 2;
    world.judgeText = "MISS";
    world.combo = 0;
    world.comboTimerMs = 0;
  }

  world.lastSound = sound;
  // Deliberately no beatPulse/zoom/shake here: the note stream and the
  // BGM-driven stage must keep a steady tempo no matter how the player taps.
  world.timingHint = onTime ? 1 : 0.25;
  world.judgeMs = 380;
  spawnMoveParticles(world, onTime ? 26 : 8, onTime ? LANE_HUE[lane] : 0, lane);
}

/** Center pad — kept so pointer taps without a lane still play. */
export function performBeatTap(session: BeatSession, lane: NoteLane = 1): void {
  performBeatLane(session, lane);
}

const LANE_FALLBACK_SOUND: Record<NoteLane, BeatSound> = {
  0: "boots",
  1: "cats",
  2: "rim",
};

/** Matches LANE_ACCENT in draw.ts. */
const LANE_HUE: Record<NoteLane, number> = { 0: 42, 1: 187, 2: 330 };

function spawnMoveParticles(
  world: BeatWorld,
  count: number,
  hue: number,
  lane: NoteLane = 1,
): void {
  const { hitY } = railGeometry(world);
  const x = laneXAt(world, lane, 1);
  const y = hitY;
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

  // One playhead for everything. On the audio clock it is read straight from
  // AudioContext time, so visuals can never drift from what you hear.
  const stepMs = world.stepSec * 1000;
  const onAudioClock = session.enabled && session.box.isTransportRunning();
  let position = onAudioClock
    ? session.box.getTransportPosition()
    : (world.elapsedMs + dtSec * 1000) / stepMs;
  if (onAudioClock && world.beatPosition > 0) {
    // A throttled render loop lets audio time run away while no frame is drawn.
    // Pull the transport back so the note stream stays continuous.
    const jumpSec = (position - world.beatPosition) * world.stepSec;
    if (jumpSec > MAX_JUMP_SEC) {
      session.box.rebaseTransport(Math.floor(world.beatPosition));
      position = world.beatPosition;
    }
  }
  world.beatPosition = position;
  world.elapsedMs = position * stepMs;

  if (world.invulnMs > 0) world.invulnMs = Math.max(0, world.invulnMs - dtSec * 1000);
  if (world.shakeMs > 0) world.shakeMs = Math.max(0, world.shakeMs - dtSec * 1000);
  if (world.comboTimerMs > 0) {
    world.comboTimerMs = Math.max(0, world.comboTimerMs - dtSec * 1000);
    if (world.comboTimerMs <= 0) world.combo = 0;
  }
  for (let lane = 0; lane < world.laneFlashMs.length; lane++) {
    if (world.laneFlashMs[lane] > 0) {
      world.laneFlashMs[lane] = Math.max(0, world.laneFlashMs[lane] - dtSec * 1000);
    }
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

  let event: BeatEvent = { type: "none" };

  const currentStep = Math.floor(position);
  world.stepAccSec = (position - currentStep) * world.stepSec;
  if (currentStep > world.stepIndex) {
    world.stepIndex = currentStep;
    const upcoming =
      session.chart[Math.min(world.stepIndex + 1, session.chart.length - 1)];
    if (upcoming) world.nextSound = upcoming.sound;
    if (world.stepIndex > 0 && world.stepIndex % world.subdivision === 0) {
      event = { type: "beat" };
      world.beatPulse = Math.max(world.beatPulse, 0.4);
    }
  }

  if (world.stepIndex >= session.chart.length || world.elapsedMs >= world.durationMs) {
    return beginClear(session);
  }

  // Notes are judged only after the late half of their window closes,
  // so a slightly late pad hit still counts.
  const lateGrace = 0.62;
  let missed = false;
  while (session.evaluatedStep < position - lateGrace) {
    const index = session.evaluatedStep;
    const step = session.chart[index];
    if (step?.spike && !world.hitSteps.has(index)) missed = true;
    session.evaluatedStep += 1;
  }

  world.score = Math.max(
    world.score,
    Math.floor(world.elapsedMs / 40) +
      world.combo * 6 +
      world.maxCombo * 10 +
      world.performIndex * 4 +
      world.stageIndex * 80,
  );

  if (missed && world.invulnMs <= 0) {
    world.hp -= 1;
    world.invulnMs = 450;
    world.shakeMs = 140;
    world.judgeText = "MISS";
    world.judgeMs = 520;
    spawnMoveParticles(world, 32, 345);
    world.combo = 0;
    world.comboTimerMs = 0;
    if (world.hp <= 0) {
      world.dead = true;
      session.box.stopLessonTransport();
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
  session.box.stopLessonTransport();
  // Fanfare = last lesson sound loud
  const last = session.chart[Math.max(0, session.chart.length - 1)];
  if (last) session.box.playSound(last.sound, 1);
  for (const s of world.spikes) s.active = false;
  return { type: "none" };
}
