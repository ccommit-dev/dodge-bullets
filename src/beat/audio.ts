import type { BeatSound } from "./types";
import type { BeatChartStep } from "./types";

function noiseBurst(
  ctx: AudioContext,
  master: GainNode,
  when: number,
  duration: number,
  gain: number,
  hpFreq: number,
): void {
  const frames = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
  }
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = hpFreq;
  const g = ctx.createGain();
  g.gain.setValueAtTime(Math.max(0.0001, gain), when);
  g.gain.exponentialRampToValueAtTime(0.0001, when + duration);
  src.connect(filter);
  filter.connect(g);
  g.connect(master);
  src.start(when);
  src.stop(when + duration + 0.02);
}

function breath(ctx: AudioContext, master: GainNode, when: number, gainScale: number): void {
  noiseBurst(ctx, master, when, 0.18, 0.07 * gainScale, 350);
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(190, when);
  osc.frequency.exponentialRampToValueAtTime(85, when + 0.15);
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(0.055 * gainScale, when + 0.025);
  g.gain.exponentialRampToValueAtTime(0.0001, when + 0.17);
  osc.connect(g);
  g.connect(master);
  osc.start(when);
  osc.stop(when + 0.19);
}

function firebeat(ctx: AudioContext, master: GainNode, when: number, gainScale: number): void {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(120, when);
  osc.frequency.exponentialRampToValueAtTime(40, when + 0.1);
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(0.2 * gainScale, when + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, when + 0.13);
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(1100, when);
  filter.frequency.exponentialRampToValueAtTime(200, when + 0.11);
  osc.connect(filter);
  filter.connect(g);
  g.connect(master);
  osc.start(when);
  osc.stop(when + 0.15);
  noiseBurst(ctx, master, when + 0.015, 0.055, 0.08 * gainScale, 2200);
}

function trumpet(ctx: AudioContext, master: GainNode, when: number, gainScale: number): void {
  const osc = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = "square";
  osc2.type = "sawtooth";
  osc.frequency.setValueAtTime(220, when);
  osc.frequency.exponentialRampToValueAtTime(140, when + 0.18);
  osc2.frequency.setValueAtTime(226, when);
  osc2.frequency.exponentialRampToValueAtTime(146, when + 0.18);
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(0.14 * gainScale, when + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, when + 0.24);
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 280;
  filter.Q.value = 1.1;
  osc.connect(filter);
  osc2.connect(filter);
  filter.connect(g);
  g.connect(master);
  osc.start(when);
  osc2.start(when);
  osc.stop(when + 0.26);
  osc2.stop(when + 0.26);
}

function boots(ctx: AudioContext, master: GainNode, when: number, gainScale: number): void {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(170, when);
  osc.frequency.exponentialRampToValueAtTime(42, when + 0.16);
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(0.32 * gainScale, when + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, when + 0.22);
  osc.connect(g);
  g.connect(master);
  osc.start(when);
  osc.stop(when + 0.24);
}

function cats(ctx: AudioContext, master: GainNode, when: number, gainScale: number): void {
  noiseBurst(ctx, master, when, 0.1, 0.16 * gainScale, 1600);
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(260, when);
  g.gain.setValueAtTime(0.09 * gainScale, when);
  g.gain.exponentialRampToValueAtTime(0.0001, when + 0.09);
  osc.connect(g);
  g.connect(master);
  osc.start(when);
  osc.stop(when + 0.11);
}

function throat(ctx: AudioContext, master: GainNode, when: number, gainScale: number): void {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(75, when);
  osc.frequency.linearRampToValueAtTime(52, when + 0.16);
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(0.16 * gainScale, when + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, when + 0.2);
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 360;
  osc.connect(filter);
  filter.connect(g);
  g.connect(master);
  osc.start(when);
  osc.stop(when + 0.22);
}

function click(ctx: AudioContext, master: GainNode, when: number, gainScale: number): void {
  noiseBurst(ctx, master, when, 0.028, 0.1 * gainScale, 4800);
}

function rim(ctx: AudioContext, master: GainNode, when: number, gainScale: number): void {
  noiseBurst(ctx, master, when, 0.045, 0.12 * gainScale, 2800);
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(440, when);
  g.gain.setValueAtTime(0.07 * gainScale, when);
  g.gain.exponentialRampToValueAtTime(0.0001, when + 0.055);
  osc.connect(g);
  g.connect(master);
  osc.start(when);
  osc.stop(when + 0.07);
}

/** 저작권 음원을 복제하지 않는 오리지널 클럽 베드. 가이드와 같은 오디오 시계로 예약한다. */
function clubBed(
  ctx: AudioContext,
  master: GainNode,
  when: number,
  stepIndex: number,
  bpm: number,
  currentStepSec: number,
): void {
  const stepsPerBeat = Math.max(1, Math.round((60 / Math.max(1, bpm)) / currentStepSec));
  if (stepIndex % stepsPerBeat !== 0) return;
  const beat = Math.floor(stepIndex / stepsPerBeat);
  const roots = [55, 49, 65.41, 43.65];
  const root = roots[Math.floor(beat / 4) % roots.length];
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(root, when);
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(520, when);
  filter.frequency.exponentialRampToValueAtTime(120, when + 0.22);
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(0.045, when + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.28);
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(master);
  osc.start(when);
  osc.stop(when + 0.3);
}

const SOUND_MAKEUP: Record<BeatSound, number> = {
  boots: 1.15,
  rim: 1.35,
  cats: 1.25,
  click: 1.2,
  breath: 1.35,
  firebeat: 1.2,
  trumpet: 1.45,
  throat: 1.3,
};

/** Bed / teacher layer — always audible as the lesson BGM. */
const GUIDE_GAIN = 0.42;
/** Player lead when locked on the grid — stacks on top of guide. */
const LEAD_GAIN = 1.05;
/** Off-grid tap — still audible but thinner. */
const MISS_LEAD_GAIN = 0.45;

function synthSound(
  ctx: AudioContext,
  master: GainNode,
  sound: BeatSound,
  when: number,
  scale: number,
): void {
  const gainScale = scale * SOUND_MAKEUP[sound];
  switch (sound) {
    case "breath":
      breath(ctx, master, when, gainScale);
      break;
    case "firebeat":
      firebeat(ctx, master, when, gainScale);
      break;
    case "trumpet":
      trumpet(ctx, master, when, gainScale);
      break;
    case "boots":
      boots(ctx, master, when, gainScale);
      break;
    case "cats":
      cats(ctx, master, when, gainScale);
      break;
    case "throat":
      throat(ctx, master, when, gainScale);
      break;
    case "click":
      click(ctx, master, when, gainScale);
      break;
    case "rim":
      rim(ctx, master, when, gainScale);
      break;
  }
}

export function createAudioChain(ctx: AudioContext): GainNode {
  const input = ctx.createGain();
  input.gain.value = 1;
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -8;
  limiter.knee.value = 8;
  limiter.ratio.value = 10;
  limiter.attack.value = 0.002;
  limiter.release.value = 0.15;
  input.connect(limiter);
  limiter.connect(ctx.destination);
  return input;
}

export type LessonStepCallback = (stepIndex: number, sound: BeatSound, when: number) => void;

export type BeatboxPlayer = {
  playSound: (sound: BeatSound, timingQuality?: number) => void;
  playGuide: (sound: BeatSound, when?: number) => void;
  startLessonTransport: (
    bpm: number,
    stepSec: number,
    chart: BeatChartStep[],
    onStep?: LessonStepCallback,
  ) => void;
  stopLessonTransport: () => void;
  /** Current transport step (chart index about to play / just played). */
  getTransportStep: () => number;
  /** Phase within current step 0..1 from audio clock. */
  getTransportPhase: () => number;
  /** Fractional step position from the audio clock (e.g. 12.37). */
  getTransportPosition: () => number;
  /** Whether the audio-clock transport is running. */
  isTransportRunning: () => boolean;
  /** Play one syllable at an explicit grid time, stacking on the guide. */
  playLead: (sound: BeatSound, when: number, lock: number) => void;
  /** AudioContext time at which a chart step plays. */
  getTransportStepTime: (stepIndex: number) => number;
  /**
   * Re-anchor the transport so `fromStep` plays now. Used when the render loop
   * stalls (backgrounded tab) and the audio clock has run ahead of the game.
   */
  rebaseTransport: (fromStep: number) => void;
  startMetronome: (bpm: number) => void;
  stopMetronome: () => void;
  startBacking: (bpm: number) => void;
  stopBacking: () => void;
  dispose: () => void;
};

const LOOKAHEAD_SEC = 0.12;
const SCHEDULE_MS = 25;

/**
 * Lesson audio = continuous beatbox BGM (guide) + player lead mixed on the same syllables.
 * Transport is driven by AudioContext time so taps can lock to the grid.
 */
export function createBeatboxPlayer(
  getCtx: () => AudioContext | null,
  getMaster: () => GainNode | null,
  isLive: () => boolean,
): BeatboxPlayer {
  let transportTimer: number | null = null;
  let transportStartCtx = 0;
  let stepSec = 0.5;
  let chartRef: BeatChartStep[] = [];
  let nextStepToSchedule = 0;
  let onStepCb: LessonStepCallback | undefined;
  let running = false;
  let transportBpm = 120;

  const stopLessonTransport = () => {
    if (transportTimer !== null) {
      window.clearInterval(transportTimer);
      transportTimer = null;
    }
    running = false;
    nextStepToSchedule = 0;
    onStepCb = undefined;
  };

  const scheduleAhead = () => {
    const ctx = getCtx();
    const master = getMaster();
    if (!ctx || !master || !isLive() || !running) return;
    const horizon = ctx.currentTime + LOOKAHEAD_SEC;
    while (nextStepToSchedule < chartRef.length) {
      const when = transportStartCtx + nextStepToSchedule * stepSec;
      if (when > horizon) break;
      const step = chartRef[nextStepToSchedule];
      if (step && when >= ctx.currentTime - 0.02) {
        const playAt = Math.max(when, ctx.currentTime + 0.001);
        synthSound(ctx, master, step.sound, playAt, GUIDE_GAIN);
        clubBed(ctx, master, playAt, nextStepToSchedule, transportBpm, stepSec);
        onStepCb?.(nextStepToSchedule, step.sound, when);
      }
      nextStepToSchedule += 1;
    }
    if (nextStepToSchedule >= chartRef.length) {
      // Keep transport clock alive until game ends the stage
    }
  };

  const getTransportStep = () => {
    const ctx = getCtx();
    if (!ctx || !running || stepSec <= 0) return 0;
    const elapsed = ctx.currentTime - transportStartCtx;
    return Math.max(0, Math.min(chartRef.length, Math.floor(elapsed / stepSec)));
  };

  const getTransportPhase = () => {
    const ctx = getCtx();
    if (!ctx || !running || stepSec <= 0) return 0;
    const elapsed = ctx.currentTime - transportStartCtx;
    const phase = (elapsed / stepSec) % 1;
    return phase < 0 ? 0 : phase;
  };

  const getTransportPosition = () => {
    const ctx = getCtx();
    if (!ctx || !running || stepSec <= 0) return 0;
    return Math.max(0, (ctx.currentTime - transportStartCtx) / stepSec);
  };

  return {
    playSound(sound, timingQuality = 1) {
      if (!isLive()) return;
      const ctx = getCtx();
      const master = getMaster();
      if (!ctx || !master) return;
      const g = LEAD_GAIN * (0.7 + 0.3 * Math.max(0.2, Math.min(1, timingQuality)));
      synthSound(ctx, master, sound, ctx.currentTime + 0.003, g);
    },
    playGuide(sound, when) {
      if (!isLive()) return;
      const ctx = getCtx();
      const master = getMaster();
      if (!ctx || !master) return;
      synthSound(ctx, master, sound, when ?? ctx.currentTime + 0.003, GUIDE_GAIN);
    },
    startLessonTransport(bpm, stepSeconds, chart, onStep) {
      stopLessonTransport();
      if (!isLive()) return;
      const ctx = getCtx();
      if (!ctx) return;
      transportBpm = Math.max(60, bpm);
      stepSec = Math.max(0.05, stepSeconds);
      chartRef = chart;
      onStepCb = onStep;
      transportStartCtx = ctx.currentTime + 0.06;
      nextStepToSchedule = 0;
      running = true;
      scheduleAhead();
      transportTimer = window.setInterval(scheduleAhead, SCHEDULE_MS);
    },
    stopLessonTransport,
    getTransportStep,
    getTransportPhase,
    getTransportPosition,
    getTransportStepTime: (stepIndex) => transportStartCtx + stepIndex * stepSec,
    rebaseTransport(fromStep) {
      const ctx = getCtx();
      if (!ctx || !running || stepSec <= 0) return;
      const step = Math.max(0, Math.floor(fromStep));
      transportStartCtx = ctx.currentTime - step * stepSec;
      nextStepToSchedule = step;
    },
    isTransportRunning: () => running,
    playLead(sound, when, lock) {
      if (!isLive()) return;
      const ctx = getCtx();
      const master = getMaster();
      if (!ctx || !master) return;
      const clamped = Math.max(0, Math.min(1, lock));
      const gain = clamped > 0 ? LEAD_GAIN * (0.75 + 0.35 * clamped) : MISS_LEAD_GAIN;
      synthSound(ctx, master, sound, Math.max(when, ctx.currentTime + 0.002), gain);
    },
    startMetronome() {
      /* metronome replaced by lesson transport guide */
    },
    stopMetronome: stopLessonTransport,
    startBacking() {
      /* no club bed — lesson syllables are the BGM */
    },
    stopBacking: stopLessonTransport,
    dispose() {
      stopLessonTransport();
    },
  };
}
