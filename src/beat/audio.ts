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

/** Soft inhale / exhale whoosh */
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

/** Classic rolling “pf / fire” lip bass + noise */
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

/** Trumpet / throat-bass buzz */
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

function clubKick(ctx: AudioContext, out: AudioNode, when: number): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(110, when);
  osc.frequency.exponentialRampToValueAtTime(42, when + 0.11);
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(0.12, when + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.16);
  osc.connect(gain);
  gain.connect(out);
  osc.start(when);
  osc.stop(when + 0.18);
}

function clubBass(
  ctx: AudioContext,
  out: AudioNode,
  when: number,
  frequency: number,
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(frequency, when);
  filter.type = "lowpass";
  filter.frequency.value = 260;
  filter.Q.value = 2.5;
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(0.045, when + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.2);
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(out);
  osc.start(when);
  osc.stop(when + 0.22);
}

export type BeatboxPlayer = {
  playSound: (sound: BeatSound, timingQuality?: number) => void;
  startBacking: (bpm: number) => void;
  stopBacking: () => void;
  dispose: () => void;
};

/**
 * Club backing supplies only a quiet kick/bass foundation.
 * User actions remain the lead melody and beatbox performance.
 */
export function createBeatboxPlayer(
  getCtx: () => AudioContext | null,
  getMaster: () => GainNode | null,
  isLive: () => boolean,
): BeatboxPlayer {
  let backingTimer: number | null = null;
  let backingStep = 0;

  const stopBacking = () => {
    if (backingTimer !== null) {
      window.clearInterval(backingTimer);
      backingTimer = null;
    }
    backingStep = 0;
  };

  return {
    playSound(sound, timingQuality = 1) {
      if (!isLive()) return;
      const ctx = getCtx();
      const master = getMaster();
      if (!ctx || !master) return;
      const t = ctx.currentTime + 0.005;
      const g = 0.45 + 0.55 * Math.max(0.2, Math.min(1, timingQuality));
      switch (sound) {
        case "breath":
          breath(ctx, master, t, g);
          break;
        case "firebeat":
          firebeat(ctx, master, t, g);
          break;
        case "trumpet":
          trumpet(ctx, master, t, g);
          break;
        case "boots":
          boots(ctx, master, t, g);
          break;
        case "cats":
          cats(ctx, master, t, g);
          break;
        case "throat":
          throat(ctx, master, t, g);
          break;
        case "click":
          click(ctx, master, t, g);
          break;
        case "rim":
          rim(ctx, master, t, g);
          break;
      }
    },
    startBacking(bpm) {
      stopBacking();
      if (!isLive()) return;
      const intervalMs = (60_000 / bpm) / 2;
      const bassNotes = [55, 55, 65.41, 49];
      const tick = () => {
        const ctx = getCtx();
        const master = getMaster();
        if (!ctx || !master || !isLive()) return;
        const t = ctx.currentTime + 0.01;
        if (backingStep % 2 === 0) {
          clubKick(ctx, master, t);
          clubBass(ctx, master, t + 0.03, bassNotes[(backingStep / 2) % bassNotes.length]);
        } else {
          noiseBurst(ctx, master, t, 0.025, 0.018, 7500);
        }
        backingStep += 1;
      };
      tick();
      backingTimer = window.setInterval(tick, intervalMs);
    },
    stopBacking,
    dispose() {
      stopBacking();
    },
  };
}
