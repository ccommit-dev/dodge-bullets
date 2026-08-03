import type { BeatSound } from "./types";

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
  g.gain.setValueAtTime(gain, when);
  g.gain.exponentialRampToValueAtTime(0.0001, when + duration);
  src.connect(filter);
  filter.connect(g);
  g.connect(master);
  src.start(when);
  src.stop(when + duration + 0.02);
}

function breath(ctx: AudioContext, master: GainNode, when: number, gainScale: number): void {
  noiseBurst(ctx, master, when, 0.16, 0.055 * gainScale, 400);
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(180, when);
  osc.frequency.exponentialRampToValueAtTime(90, when + 0.14);
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(0.04 * gainScale, when + 0.03);
  g.gain.exponentialRampToValueAtTime(0.0001, when + 0.16);
  osc.connect(g);
  g.connect(master);
  osc.start(when);
  osc.stop(when + 0.18);
}

function firebeat(ctx: AudioContext, master: GainNode, when: number, gainScale: number): void {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(110, when);
  osc.frequency.exponentialRampToValueAtTime(42, when + 0.09);
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(0.16 * gainScale, when + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, when + 0.12);
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(900, when);
  filter.frequency.exponentialRampToValueAtTime(220, when + 0.1);
  osc.connect(filter);
  filter.connect(g);
  g.connect(master);
  osc.start(when);
  osc.stop(when + 0.14);
  noiseBurst(ctx, master, when + 0.02, 0.05, 0.06 * gainScale, 2500);
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
  g.gain.exponentialRampToValueAtTime(0.09 * gainScale, when + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, when + 0.22);
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 700;
  filter.Q.value = 4;
  osc.connect(filter);
  osc2.connect(filter);
  filter.connect(g);
  g.connect(master);
  osc.start(when);
  osc2.start(when);
  osc.stop(when + 0.24);
  osc2.stop(when + 0.24);
}

function boots(ctx: AudioContext, master: GainNode, when: number, gainScale: number): void {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(160, when);
  osc.frequency.exponentialRampToValueAtTime(45, when + 0.14);
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(0.24 * gainScale, when + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, when + 0.2);
  osc.connect(g);
  g.connect(master);
  osc.start(when);
  osc.stop(when + 0.22);
}

function cats(ctx: AudioContext, master: GainNode, when: number, gainScale: number): void {
  noiseBurst(ctx, master, when, 0.09, 0.12 * gainScale, 1800);
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(240, when);
  g.gain.setValueAtTime(0.07 * gainScale, when);
  g.gain.exponentialRampToValueAtTime(0.0001, when + 0.08);
  osc.connect(g);
  g.connect(master);
  osc.start(when);
  osc.stop(when + 0.1);
}

function throat(ctx: AudioContext, master: GainNode, when: number, gainScale: number): void {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(70, when);
  osc.frequency.linearRampToValueAtTime(55, when + 0.15);
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(0.12 * gainScale, when + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, when + 0.18);
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 320;
  osc.connect(filter);
  filter.connect(g);
  g.connect(master);
  osc.start(when);
  osc.stop(when + 0.2);
}

function click(ctx: AudioContext, master: GainNode, when: number, gainScale: number): void {
  noiseBurst(ctx, master, when, 0.025, 0.07 * gainScale, 5000);
}

function rim(ctx: AudioContext, master: GainNode, when: number, gainScale: number): void {
  noiseBurst(ctx, master, when, 0.04, 0.09 * gainScale, 3200);
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(420, when);
  g.gain.setValueAtTime(0.05 * gainScale, when);
  g.gain.exponentialRampToValueAtTime(0.0001, when + 0.05);
  osc.connect(g);
  g.connect(master);
  osc.start(when);
  osc.stop(when + 0.06);
}

function synthSound(
  ctx: AudioContext,
  master: GainNode,
  sound: BeatSound,
  when: number,
  gainScale: number,
): void {
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

export type BeatboxPlayer = {
  /** Loud lead — same synthesizer as the quiet lesson guide. */
  playSound: (sound: BeatSound, timingQuality?: number) => void;
  /** Soft guide note so the player learns by matching the teacher. */
  playGuide: (sound: BeatSound) => void;
  /** Tiny metronome tick only — not a different club song. */
  startMetronome: (bpm: number) => void;
  stopMetronome: () => void;
  /** @deprecated use startMetronome */
  startBacking: (bpm: number) => void;
  stopBacking: () => void;
  dispose: () => void;
};

/**
 * Lesson audio model:
 * - Guide track quietly plays the stage's beatbox syllables on the grid
 * - Player taps play the *same* syllable loudly
 * - Metronome is a faint click so timing stays clear without competing BGM
 */
export function createBeatboxPlayer(
  getCtx: () => AudioContext | null,
  getMaster: () => GainNode | null,
  isLive: () => boolean,
): BeatboxPlayer {
  let metroTimer: number | null = null;
  let metroStep = 0;

  const stopMetronome = () => {
    if (metroTimer !== null) {
      window.clearInterval(metroTimer);
      metroTimer = null;
    }
    metroStep = 0;
  };

  const startMetronome = (bpm: number) => {
    stopMetronome();
    if (!isLive()) return;
    const intervalMs = 60_000 / bpm;
    const tick = () => {
      const ctx = getCtx();
      const master = getMaster();
      if (!ctx || !master || !isLive()) return;
      const t = ctx.currentTime + 0.01;
      // Soft click — downbeats a touch louder
      noiseBurst(ctx, master, t, 0.018, metroStep % 4 === 0 ? 0.028 : 0.014, 7000);
      metroStep += 1;
    };
    tick();
    metroTimer = window.setInterval(tick, intervalMs);
  };

  return {
    playSound(sound, timingQuality = 1) {
      if (!isLive()) return;
      const ctx = getCtx();
      const master = getMaster();
      if (!ctx || !master) return;
      const t = ctx.currentTime + 0.005;
      const g = 0.55 + 0.55 * Math.max(0.2, Math.min(1, timingQuality));
      synthSound(ctx, master, sound, t, g);
    },
    playGuide(sound) {
      if (!isLive()) return;
      const ctx = getCtx();
      const master = getMaster();
      if (!ctx || !master) return;
      const t = ctx.currentTime + 0.005;
      // Same voice as player taps, but soft — "teacher" layer
      synthSound(ctx, master, sound, t, 0.22);
    },
    startMetronome,
    stopMetronome,
    startBacking: startMetronome,
    stopBacking: stopMetronome,
    dispose() {
      stopMetronome();
    },
  };
}
