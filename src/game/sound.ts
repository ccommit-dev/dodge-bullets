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

/** 짧은 잡음 — 북 가죽 두드림·물 튀김 (2026-10-07) */
function playNoise(ctx: AudioContext, master: GainNode, duration: number, gain: number, hp: number, when = 0): void {
  const t0 = ctx.currentTime + when;
  const n = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i += 1) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = ctx.createBufferSource(); src.buffer = buf;
  const f = ctx.createBiquadFilter(); f.type = "highpass"; f.frequency.value = hp;
  const g = ctx.createGain(); g.gain.setValueAtTime(gain, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  src.connect(f); f.connect(g); g.connect(master);
  src.start(t0); src.stop(t0 + duration + 0.02);
}

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
  /** 활 사격 — 시위 튕기는 소리 · 명중 · 속성별 (2026-09-29) */
  playShot: () => void;
  playArrowHit: () => void;
  playBoom: () => void;
  playFreeze: () => void;
  playZap: () => void;
  playThud: () => void;
  playLearn: () => void;
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
    // 비버 북 리듬 — 펜타토닉 마림바 + 매 4박 북 (2026-10-07)
    const notes = [262, 330, 392, 440, 392, 330];
    bgmTimer = window.setInterval(() => {
      if (!canPlay() || !ctx || !master) return;
      playTone(ctx, master, { freq: notes[bgmStep % notes.length], duration: 0.2, type: "triangle", gain: 0.03 });
      if (bgmStep % 4 === 0) { playTone(ctx, master, { freq: 95, duration: 0.14, type: "sine", gain: 0.05 }); playNoise(ctx, master, 0.05, 0.02, 1200); }
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
      // 북 세 번 (출격)
      if (!canPlay() || !ctx || !master) return;
      for (let i = 0; i < 3; i += 1) { playTone(ctx, master, { freq: i === 2 ? 140 : 100, duration: 0.12, type: "sine", gain: 0.07 }, i * 0.11); playNoise(ctx, master, 0.04, 0.025, 1500, i * 0.11); }
      playTone(ctx, master, { freq: 784, duration: 0.16, type: "triangle", gain: 0.04 }, 0.34);
    },

    playHit() {
      // 통나무에 쿵 — 낮은 북 + 나무 잡음
      if (!canPlay() || !ctx || !master) return;
      playTone(ctx, master, { freq: 110, duration: 0.2, type: "sine", gain: 0.07 });
      playNoise(ctx, master, 0.08, 0.04, 600);
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
      // 마림바 상행 + 마무리 북
      if (!canPlay() || !ctx || !master) return;
      [523, 659, 784, 1047].forEach((f, i) => playTone(ctx!, master!, { freq: f, duration: 0.14, type: "triangle", gain: 0.055 }, i * 0.08));
      playTone(ctx, master, { freq: 120, duration: 0.18, type: "sine", gain: 0.06 }, 0.34);
      playNoise(ctx, master, 0.06, 0.03, 1200, 0.34);
    },

    playCoin() {
      // 도토리 톡 — 짧은 나무 틱
      if (!canPlay() || !ctx || !master) return;
      playTone(ctx, master, { freq: 1480, duration: 0.05, type: "sine", gain: 0.04 });
      playTone(ctx, master, { freq: 1975, duration: 0.07, type: "sine", gain: 0.03 }, 0.045);
      playNoise(ctx, master, 0.02, 0.02, 4000);
    },

    playBuy() {
      if (!canPlay() || !ctx || !master) return;
      playTone(ctx, master, { freq: 392, duration: 0.07, type: "triangle", gain: 0.05 });
      playTone(ctx, master, { freq: 523, duration: 0.1, type: "triangle", gain: 0.05 }, 0.06);
    },

    // ── 활 사격. 자주 울리므로 짧고 작게 — 배경음과 검격 소리를 덮으면 안 된다
    playShot() {
      // 북 한 번 — 음파 고리가 나간다
      if (!canPlay() || !ctx || !master) return;
      playTone(ctx, master, { freq: 160, duration: 0.07, type: "sine", gain: 0.03 });
      playNoise(ctx, master, 0.025, 0.018, 2000);
    },
    playArrowHit() {
      // 도토리가 맞는 톡
      if (!canPlay() || !ctx || !master) return;
      playTone(ctx, master, { freq: 1200, duration: 0.035, type: "sine", gain: 0.022 });
    },
    playBoom() {
      // 물 폭발 — 낮은 쿵 + 물보라 잡음
      if (!canPlay() || !ctx || !master) return;
      playTone(ctx, master, { freq: 90, duration: 0.22, type: "sine", gain: 0.06 });
      playNoise(ctx, master, 0.22, 0.05, 900, 0.02);
    },
    playFreeze() {
      if (!canPlay() || !ctx || !master) return;
      playTone(ctx, master, { freq: 1568, duration: 0.08, type: "sine", gain: 0.03 });
      playTone(ctx, master, { freq: 2093, duration: 0.12, type: "sine", gain: 0.025 }, 0.05);
    },
    playZap() {
      if (!canPlay() || !ctx || !master) return;
      playTone(ctx, master, { freq: 1200, duration: 0.04, type: "sawtooth", gain: 0.03 });
      playTone(ctx, master, { freq: 1800, duration: 0.05, type: "square", gain: 0.022 }, 0.03);
    },
    playThud() {
      if (!canPlay() || !ctx || !master) return;
      playTone(ctx, master, { freq: 85, duration: 0.18, type: "sine", gain: 0.07 });
      playNoise(ctx, master, 0.06, 0.03, 500);
    },
    playLearn() {
      if (!canPlay() || !ctx || !master) return;
      playTone(ctx, master, { freq: 523, duration: 0.09, type: "triangle", gain: 0.05 });
      playTone(ctx, master, { freq: 784, duration: 0.09, type: "triangle", gain: 0.05 }, 0.08);
      playTone(ctx, master, { freq: 1047, duration: 0.16, type: "sine", gain: 0.05 }, 0.16);
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
