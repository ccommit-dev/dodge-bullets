export function loadSoundEnabled(): boolean {
  try {
    const raw = localStorage.getItem("dodge-bullets:soundEnabled");
    if (raw === null) return true;
    return raw === "1" || raw === "true";
  } catch {
    return true;
  }
}

export function saveSoundEnabled(enabled: boolean): void {
  try {
    localStorage.setItem("dodge-bullets:soundEnabled", enabled ? "1" : "0");
  } catch {
    // ignore
  }
}

type Tone = {
  freq: number;
  duration: number;
  type?: OscillatorType;
  gain?: number;
};

function playTone(ctx: AudioContext, master: GainNode, tone: Tone, when = 0): void {
  const t0 = ctx.currentTime + when;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = tone.type ?? "sine";
  osc.frequency.setValueAtTime(tone.freq, t0);
  const peak = tone.gain ?? 0.08;
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(peak, t0 + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + tone.duration);
  osc.connect(gain);
  gain.connect(master);
  osc.start(t0);
  osc.stop(t0 + tone.duration + 0.02);
}

export type SoundController = {
  isEnabled: () => boolean;
  setEnabled: (enabled: boolean) => void;
  unlock: () => Promise<void>;
  enterBackground: () => void;
  enterForeground: () => void;
  playStart: () => void;
  playHit: () => void;
  playJump: () => void;
  playDash: () => void;
  playWhoosh: () => void;
  playClear: () => void;
  playCoin: () => void;
  playBuy: () => void;
  startBgm: () => void;
  stopBgm: () => void;
  dispose: () => void;
};

export function createSoundController(initialEnabled = loadSoundEnabled()): SoundController {
  let enabled = initialEnabled;
  let unlocked = false;
  let suspendedByBackground = false;
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let bgmTimer: number | null = null;
  let bgmStep = 0;

  const ensureContext = async () => {
    if (!ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 1;
      master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") {
      await ctx.resume();
    }
    unlocked = true;
  };

  const canPlay = () => enabled && unlocked && !suspendedByBackground && !!ctx && !!master;

  const stopBgmInternal = () => {
    if (bgmTimer !== null) {
      window.clearInterval(bgmTimer);
      bgmTimer = null;
    }
    bgmStep = 0;
  };

  const startBgmInternal = () => {
    if (!canPlay() || bgmTimer !== null || !ctx || !master) return;
    const notes = [262, 330, 392, 330];
    bgmTimer = window.setInterval(() => {
      if (!canPlay() || !ctx || !master) return;
      playTone(ctx, master, {
        freq: notes[bgmStep % notes.length],
        duration: 0.22,
        type: "triangle",
        gain: 0.035,
      });
      bgmStep += 1;
    }, 420);
  };

  return {
    isEnabled: () => enabled,

    setEnabled(next: boolean) {
      enabled = next;
      saveSoundEnabled(next);
      if (!next) {
        stopBgmInternal();
        if (master) master.gain.value = 0;
      } else if (unlocked && !suspendedByBackground) {
        if (master) master.gain.value = 1;
      }
    },

    async unlock() {
      await ensureContext();
      if (enabled && master) master.gain.value = 1;
    },

    enterBackground() {
      suspendedByBackground = true;
      stopBgmInternal();
      if (ctx && ctx.state === "running") {
        void ctx.suspend();
      }
      if (master) master.gain.value = 0;
    },

    enterForeground() {
      suspendedByBackground = false;
      if (!unlocked || !ctx) return;
      if (enabled) {
        void ctx.resume().then(() => {
          if (master) master.gain.value = 1;
        });
      }
    },

    playStart() {
      if (!canPlay() || !ctx || !master) return;
      playTone(ctx, master, { freq: 523, duration: 0.08, type: "sine", gain: 0.07 });
      playTone(ctx, master, { freq: 784, duration: 0.12, type: "sine", gain: 0.06 }, 0.07);
    },

    playHit() {
      if (!canPlay() || !ctx || !master) return;
      playTone(ctx, master, { freq: 180, duration: 0.18, type: "square", gain: 0.06 });
      playTone(ctx, master, { freq: 120, duration: 0.22, type: "sawtooth", gain: 0.04 }, 0.04);
    },

    playJump() {
      if (!canPlay() || !ctx || !master) return;
      playTone(ctx, master, { freq: 420, duration: 0.07, type: "triangle", gain: 0.05 });
      playTone(ctx, master, { freq: 620, duration: 0.08, type: "triangle", gain: 0.04 }, 0.04);
    },

    playDash() {
      if (!canPlay() || !ctx || !master) return;
      playTone(ctx, master, { freq: 880, duration: 0.05, type: "sawtooth", gain: 0.035 });
      playTone(ctx, master, { freq: 240, duration: 0.1, type: "sine", gain: 0.03 }, 0.03);
    },

    playWhoosh() {
      if (!canPlay() || !ctx || !master) return;
      playTone(ctx, master, { freq: 700, duration: 0.04, type: "triangle", gain: 0.02 });
    },

    playClear() {
      if (!canPlay() || !ctx || !master) return;
      playTone(ctx, master, { freq: 523, duration: 0.1, type: "sine", gain: 0.06 });
      playTone(ctx, master, { freq: 659, duration: 0.1, type: "sine", gain: 0.06 }, 0.08);
      playTone(ctx, master, { freq: 784, duration: 0.16, type: "sine", gain: 0.07 }, 0.16);
    },

    playCoin() {
      if (!canPlay() || !ctx || !master) return;
      playTone(ctx, master, { freq: 988, duration: 0.06, type: "square", gain: 0.04 });
      playTone(ctx, master, { freq: 1319, duration: 0.08, type: "square", gain: 0.035 }, 0.05);
    },

    playBuy() {
      if (!canPlay() || !ctx || !master) return;
      playTone(ctx, master, { freq: 392, duration: 0.07, type: "triangle", gain: 0.05 });
      playTone(ctx, master, { freq: 523, duration: 0.1, type: "triangle", gain: 0.05 }, 0.06);
    },

    startBgm() {
      if (!enabled || suspendedByBackground) return;
      void ensureContext().then(() => startBgmInternal());
    },

    stopBgm() {
      stopBgmInternal();
    },

    dispose() {
      stopBgmInternal();
      if (ctx) {
        void ctx.close();
        ctx = null;
        master = null;
      }
    },
  };
}
