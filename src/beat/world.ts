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
  JUDGE_THRESHOLDS,
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
import { assetUrl } from "../asset";

/** Which pad a syllable belongs to. Drawing and judging share this map. */
const SOUND_LANE: Record<BeatSound, NoteLane> = {
  boots: 0,
  firebeat: 0,
  rim: 1,
  trumpet: 1,
  cats: 2,
  click: 2,
  breath: 2,
  throat: 3,
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
    horizonY: Math.max(world.safeTop + 215, world.height * 0.25),
    hitY: world.height - world.safeBottom - Math.max(150, world.height * 0.2),
    farHalf: Math.min(world.width * 0.46, 230),
    nearHalf: Math.min(world.width * 0.46, 230),
  };
}

/** Horizontal position of a lane at depth `eased` (0 = horizon, 1 = hit line). */
export function laneXAt(world: BeatWorld, lane: NoteLane, eased: number): number {
  const { farHalf, nearHalf } = railGeometry(world);
  const half = farHalf + (nearHalf - farHalf) * eased;
  const laneWidth = (half * 2) / 4;
  return world.cx - half + laneWidth * (lane + 0.5);
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
    scoreMultiplier: 1,
    feverMs: 0,
    combo: 0,
    maxCombo: 0,
    comboTimerMs: 0,
    hp: track.difficulty === "hard" ? 6 : track.difficulty === "medium" ? 7 : 8,
    healGauge: 0,
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
    holdLane: -1,
    holdEndStep: -1,
    holdLane2: -1,
    holdEndStep2: -1,
    loopCompletion: 0,
    laneFlashMs: [0, 0, 0, 0],
    hitSteps: new Set<number>(),
    hitSteps2: new Set<number>(),
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
  backingAudio: HTMLAudioElement | null;
  enabled: boolean;
  skills: BeatSkills;
  isSpar: boolean;
  /** Perfect-ish locks this run (for RPG fame). */
  lockHits: number;
  taps: number;
  hitSteps: Set<number>;
  evaluatedStep: number;
  /** 기기 싱크 보정(초) — 양수면 유저가 늦게 누르는 기기. 판정 위치에서 뺀다 */
  calibrationSec: number;
  /** 누르고 있는 롱노트 — 레인과 꼬리 스텝. -1이면 없음 */
  holdLane: number;
  holdEndStep: number;
  holdLane2: number;
  holdEndStep2: number;
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
    // The licensed backing track has a fixed tempo. Difficulty changes chart
    // density and judgement, never playback BPM, otherwise notes drift away.
    bpm: baseTrack.bpm,
    difficulty: difficultyProfile.difficulty,
    subdivision: difficultyProfile.force16
      ? 16 as const
      : difficultyProfile.difficulty === "easy"
        ? 4 as const
        : difficultyProfile.difficulty === "medium"
          ? 8 as const
          : 16 as const,
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
  let backingAudio: HTMLAudioElement | null = null;
  if (soundEnabled) {
    backingAudio = new Audio(assetUrl(`audio/${track.audioFile}`));
    backingAudio.preload = "metadata";
    backingAudio.volume = 0.72;
    backingAudio.setAttribute("playsinline", "true");
    // Called inside the stage CTA handler so iOS/Android treat this element as
    // user-initiated. The transport below resets it to the exact chart origin.
    void backingAudio.play().catch(() => {});
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
    () => world.loopCompletion,
    backingAudio,
  );

  const session: BeatSession = {
    world,
    chart,
    track,
    box,
    ctx,
    master,
    backingAudio,
    enabled: soundEnabled,
    skills,
    isSpar,
    lockHits: 0,
    taps: 0,
    hitSteps: new Set<number>(),
    evaluatedStep: 0,
    calibrationSec: 0,
    holdLane: -1,
    holdEndStep: -1,
    holdLane2: -1,
    holdEndStep2: -1,
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
  session.backingAudio?.pause();
  session.backingAudio = null;
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
/** 판정 창 하한(초) — 스텝이 아무리 짧아도 이보다 좁아지지 않는다 */
export const JUDGE_WINDOW_FLOOR_SEC = 0.11;
/** 회복 게이지 상한 — PERFECT 4번(=8) 마다 HP 1 */
export const HEAL_GAUGE_MAX = 8;
/** GREAT/PERFECT·롱노트 완주가 게이지를 채워 HP 를 돌려준다 — 잘 치는 동안은 게임 오버가 늦춰진다 */
export function gainHeal(world: BeatWorld, amount: number): boolean {
  if (amount <= 0) return false;
  world.healGauge += amount;
  if (world.healGauge < HEAL_GAUGE_MAX) return false;
  world.healGauge -= HEAL_GAUGE_MAX;
  if (world.hp >= world.maxHp) return false;
  world.hp += 1;
  return true;
}

/** 탭 결과 — hit: 노트를 침 · empty: 노트가 없는 스텝(판정·콤보·피해 없음, 소리만) · held: 롱노트 유지 중이라 무시 */
export type BeatTapResult = "hit" | "empty" | "held";
export function performBeatLane(session: BeatSession, lane: NoteLane): BeatTapResult {
  // 롱노트를 누르고 있는 레인의 추가 입력(키 반복·홀드 연타)은 무시 — 유지 중에 MISS 로 끊기지 않게
  if ((session.holdLane === lane && session.holdEndStep >= 0) || (session.holdLane2 === lane && session.holdEndStep2 >= 0)) return "held";
  const world = session.world;
  if (world.dead || world.cleared) return "held";

  if (session.backingAudio?.paused) {
    void session.backingAudio.play().catch(() => {});
  }

  session.taps += 1;
  world.laneFlashMs[lane] = PAD_FLASH_MS;
  world.performIndex += 1;

  const stepSec = world.stepSec;
  // Judge against the same playhead the notes are drawn from.
  // 싱크 보정: 기기 오디오 지연만큼 판정 위치를 되돌린다 (늦게 누르는 기기 = 양수)
  const position =
    (session.enabled && session.box.isTransportRunning()
      ? Math.max(world.beatPosition, session.box.getTransportPosition())
      : world.beatPosition) - session.calibrationSec / stepSec;

  // 판정 창: 기본 190ms(스킬 보너스 +), 스텝의 62% 까지 좁히되 110ms 아래로는 안 내려간다.
  // 예전엔 170BPM 16분(88ms)에서 55ms 가 되어 지터 80ms 인 사람은 거의 못 맞혔다(봇 시뮬 novice 전멸).
  // 이웃 가로채기는 창 폭이 아니라 선택 규칙으로 막는다: 창 안의 "가장 이른 미타 노트"를 잡는다 (리듬게임 관례).
  const windowSec = Math.min(
    0.19 + timingBonusFromSkills(session.skills) * 0.2,
    Math.max(stepSec * 0.62, JUDGE_WINDOW_FLOOR_SEC),
  );

  let bestIndex = -1;
  let bestDistSec = Infinity;
  let bestSlot: 1 | 2 = 1; // 1 = 첫 레인(sound) · 2 = 점프의 두 번째 레인(jumpSound)
  const from = Math.max(0, Math.floor(position) - 2);
  const to = Math.min(session.chart.length - 1, Math.floor(position) + 3);
  for (let i = from; i <= to; i++) {
    const step = session.chart[i];
    if (!step || !step.spike) continue;
    const slot: 0 | 1 | 2 = laneOfSound(step.sound) === lane && !world.hitSteps.has(i) ? 1 : step.jumpSound && laneOfSound(step.jumpSound) === lane && !world.hitSteps2.has(i) ? 2 : 0;
    if (!slot) continue;
    const distSec = Math.abs(i - position) * stepSec;
    if (distSec <= windowSec) { bestIndex = i; bestDistSec = distSec; bestSlot = slot; break; } // 창 안의 가장 이른 노트
    if (distSec < bestDistSec) { bestDistSec = distSec; bestIndex = i; bestSlot = slot; }
  }

  const onTime = bestIndex >= 0 && bestDistSec <= windowSec;
  const lock = onTime ? Math.max(0, 1 - bestDistSec / windowSec) : 0;
  const sound = onTime
    ? (bestSlot === 2 ? session.chart[bestIndex].jumpSound ?? session.chart[bestIndex].sound : session.chart[bestIndex].sound)
    : LANE_FALLBACK_SOUND[lane];

  if (onTime) {
    const offsetSec = (position - bestIndex) * stepSec;
    world.lastOffsetMs = Math.round(offsetSec * 1000);
    (bestSlot === 2 ? world.hitSteps2 : world.hitSteps).add(bestIndex);
    session.hitSteps.add(bestIndex);
    // 점프: 두 레인을 모두 쳤으면 보너스 — "JUMP" 문구는 두 번째 타격에 붙는다
    const jumpDone = !!session.chart[bestIndex].jumpSound && world.hitSteps.has(bestIndex) && world.hitSteps2.has(bestIndex);
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
    world.score += (18 + Math.floor(lock * 16)) * world.scoreMultiplier;
    const [perfectAt, greatAt] = JUDGE_THRESHOLDS[world.difficulty];
    world.judgeText = lock > perfectAt ? "PERFECT" : lock > greatAt ? "GREAT" : "GOOD";
    if (gainHeal(world, world.judgeText === "PERFECT" ? 2 : world.judgeText === "GREAT" ? 1 : 0)) world.judgeText += " ♥";
    // 롱노트 머리: 꼬리 스텝까지 누르고 있어야 한다 (performBeatRelease가 판정)
    const holdLen = session.chart[bestIndex].hold ?? 0;
    if (holdLen > 0) {
      if (bestSlot === 2) {
        session.holdLane2 = lane; session.holdEndStep2 = bestIndex + holdLen;
        world.holdLane2 = lane; world.holdEndStep2 = session.holdEndStep2;
      } else {
        session.holdLane = lane; session.holdEndStep = bestIndex + holdLen;
        world.holdLane = lane; world.holdEndStep = session.holdEndStep;
      }
    }
    if (jumpDone) { world.score += 12 * world.scoreMultiplier; world.judgeText = ("JUMP " + world.judgeText) as `JUMP ${string}`; }
  } else {
    // 노트가 없는 스텝의 탭 — 리듬 게임 관례대로 벌점 없음 (예전엔 MISS + 콤보 초기화라 홀드 중 반복 입력이 콤보를 끊었다)
    world.lastOffsetMs = 0;
    session.box.playLead(sound, 0, 0);
    world.lastSound = sound;
    world.timingHint = 0.25;
    return "empty";
  }

  world.lastSound = sound;
  // Deliberately no beatPulse/zoom/shake here: the note stream and the
  // BGM-driven stage must keep a steady tempo no matter how the player taps.
  world.timingHint = onTime ? 1 : 0.25;
  world.judgeMs = 380;
  spawnMoveParticles(world, onTime ? 26 : 8, onTime ? LANE_HUE[lane] : 0, lane);
  return "hit";
}

/** Center pad — kept so pointer taps without a lane still play. */
export function performBeatTap(session: BeatSession, lane: NoteLane = 1): void {
  performBeatLane(session, lane);
}

/**
 * 롱노트 릴리즈 판정 (점검표 #8) — 꼬리 스텝 근처에서 떼면 보너스, 너무 일찍 떼면 콤보가 끊긴다.
 * 릴리즈 시점의 진동(navigator.vibrate)은 호출부(BeatGame)가 담당한다.
 */
export function performBeatRelease(session: BeatSession, lane: NoteLane): "release-good" | "release-early" | null {
  const world = session.world;
  const slot = session.holdLane === lane && session.holdEndStep >= 0 ? 1 : session.holdLane2 === lane && session.holdEndStep2 >= 0 ? 2 : 0;
  if (!slot) return null;
  const stepSec = world.stepSec;
  const position =
    (session.enabled && session.box.isTransportRunning()
      ? Math.max(world.beatPosition, session.box.getTransportPosition())
      : world.beatPosition) - session.calibrationSec / stepSec;
  const endStep = slot === 2 ? session.holdEndStep2 : session.holdEndStep;
  const distSec = (endStep - position) * stepSec;
  const windowSec = Math.min(0.22, stepSec * 0.9);
  if (slot === 2) { session.holdLane2 = -1; session.holdEndStep2 = -1; world.holdLane2 = -1; world.holdEndStep2 = -1; }
  else { session.holdLane = -1; session.holdEndStep = -1; world.holdLane = -1; world.holdEndStep = -1; }
  if (distSec <= windowSec) {
    bumpCombo(world, 1);
    world.score += 24 * world.scoreMultiplier;
    world.judgeText = "PERFECT";
    world.judgeMs = 320;
    spawnMoveParticles(world, 18, LANE_HUE[lane], lane);
    return "release-good";
  }
  world.combo = 0;
  world.comboTimerMs = 0;
  world.judgeText = "MISS";
  world.judgeMs = 320;
  // 일찍 뗀 롱노트는 놓친 노트와 같다 — 유지해야 유효하다
  if (world.invulnMs <= 0) { world.hp -= 1; world.invulnMs = 450; world.shakeMs = 120; }
  return "release-early";
}

/** 롱노트를 끝까지 누른 채 꼬리를 지나치면 자동 성공 처리 (틱에서 호출) */
export function settleHoldIfPassed(session: BeatSession): void {
  const world = session.world;
  const position = world.beatPosition - session.calibrationSec / world.stepSec;
  // 홀드 점프의 두 번째 슬롯도 같은 규칙
  if (session.holdEndStep2 >= 0 && position > session.holdEndStep2 + 0.9) {
    session.holdLane2 = -1; session.holdEndStep2 = -1; world.holdLane2 = -1; world.holdEndStep2 = -1;
    bumpCombo(world, 1); world.score += 16 * world.scoreMultiplier;
  }
  if (session.holdEndStep < 0) return;
  if (position > session.holdEndStep + 0.9) {
    session.holdLane = -1;
    session.holdEndStep = -1;
    world.holdLane = -1;
    world.holdEndStep = -1;
    bumpCombo(world, 1);
    world.score += 16 * world.scoreMultiplier;
    world.judgeText = gainHeal(world, 2) ? "HOLD ♥" : "HOLD";
    world.judgeMs = 320;
  }
}

const LANE_FALLBACK_SOUND: Record<NoteLane, BeatSound> = {
  0: "boots",
  1: "rim",
  2: "cats",
  3: "throat",
};

/** Matches LANE_ACCENT in draw.ts. */
const LANE_HUE: Record<NoteLane, number> = { 0: 42, 1: 330, 2: 187, 3: 270 };

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
  if (world.feverMs > 0) {
    world.feverMs = Math.max(0, world.feverMs - dtSec * 1000);
    if (world.feverMs <= 0) world.scoreMultiplier = 1;
  }
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
    if (step?.spike && (!world.hitSteps.has(index) || (step.jumpSound && !world.hitSteps2.has(index)))) missed = true;
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

  if (world.hp <= 0 && !world.dead) {
    world.dead = true;
    session.box.stopLessonTransport();
    return { type: "dead" };
  }
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
