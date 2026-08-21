/**
 * 공용 UI 효과음 — 방치 정산 / 지역 개척 / 슬롯 해금 / 성벽 등반용.
 *
 * `game/sound.ts`의 SoundController는 화살 원정 전용 인스턴스라 다른 화면에서 쓸 수 없다.
 * 여기서는 필요할 때만 AudioContext를 만들고, 토글 상태는 같은 localStorage 키를 공유한다.
 */
import { loadSoundEnabled } from "../game/sound";

type Note = { freq: number; at: number; dur: number; type?: OscillatorType; gain?: number };

let ctx: AudioContext | null = null;
let master: GainNode | null = null;

function context(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx) return ctx;
  try {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);
  } catch {
    return null;
  }
  return ctx;
}

function play(notes: Note[]): void {
  if (!loadSoundEnabled()) return;
  const audio = context();
  if (!audio || !master) return;
  if (audio.state === "suspended") void audio.resume().catch(() => undefined);
  const t0 = audio.currentTime;
  for (const note of notes) {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = note.type ?? "triangle";
    osc.frequency.setValueAtTime(note.freq, t0 + note.at);
    const peak = note.gain ?? 0.07;
    gain.gain.setValueAtTime(0.0001, t0 + note.at);
    gain.gain.exponentialRampToValueAtTime(peak, t0 + note.at + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + note.at + note.dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0 + note.at);
    osc.stop(t0 + note.at + note.dur + 0.02);
  }
}

/** 방치 보상 수령 — 동전이 쏟아지는 느낌의 상행 아르페지오 */
export function sfxIdleClaim(): void {
  play([
    { freq: 523.25, at: 0, dur: 0.16, gain: 0.06 },
    { freq: 659.25, at: 0.07, dur: 0.16, gain: 0.06 },
    { freq: 783.99, at: 0.14, dur: 0.18, gain: 0.06 },
    { freq: 1046.5, at: 0.22, dur: 0.3, gain: 0.05 },
    { freq: 1318.5, at: 0.3, dur: 0.34, type: "sine", gain: 0.035 },
  ]);
}

/** 지역 개척 성공 — 성문이 열리는 팡파르 */
export function sfxAreaUnlock(): void {
  play([
    { freq: 392, at: 0, dur: 0.22, type: "sawtooth", gain: 0.05 },
    { freq: 523.25, at: 0.1, dur: 0.24, type: "sawtooth", gain: 0.05 },
    { freq: 659.25, at: 0.2, dur: 0.28, type: "sawtooth", gain: 0.05 },
    { freq: 783.99, at: 0.32, dur: 0.5, type: "triangle", gain: 0.07 },
    { freq: 1046.5, at: 0.32, dur: 0.55, type: "sine", gain: 0.04 },
  ]);
}

/** 지역 게이트에 막힘 — 둔탁한 저음 2연타 */
export function sfxGateBlocked(): void {
  play([
    { freq: 138, at: 0, dur: 0.16, type: "square", gain: 0.05 },
    { freq: 110, at: 0.13, dur: 0.24, type: "square", gain: 0.045 },
  ]);
}

/** 비트 스킬 슬롯 해금 */
export function sfxSlotUnlock(): void {
  play([
    { freq: 880, at: 0, dur: 0.12, type: "sine", gain: 0.05 },
    { freq: 1174.7, at: 0.08, dur: 0.16, type: "sine", gain: 0.05 },
    { freq: 1760, at: 0.16, dur: 0.26, type: "sine", gain: 0.035 },
  ]);
}

/** 끝없는 성벽 층 돌파 */
export function sfxTowerFloor(floor: number): void {
  const base = 440 * Math.pow(2, (floor % 12) / 12);
  play([{ freq: base, at: 0, dur: 0.1, type: "triangle", gain: 0.04 }]);
}

/** 성벽 10층 단위 마일스톤 */
export function sfxTowerMilestone(): void {
  play([
    { freq: 659.25, at: 0, dur: 0.14, gain: 0.055 },
    { freq: 987.77, at: 0.09, dur: 0.22, gain: 0.05 },
  ]);
}

/** 대장간 재련 — 금속 타격 */
export function sfxReforge(success: boolean): void {
  if (success) {
    play([
      { freq: 1318.5, at: 0, dur: 0.09, type: "square", gain: 0.04 },
      { freq: 1760, at: 0.06, dur: 0.2, type: "sine", gain: 0.05 },
    ]);
    return;
  }
  play([
    { freq: 220, at: 0, dur: 0.1, type: "square", gain: 0.045 },
    { freq: 155, at: 0.08, dur: 0.22, type: "square", gain: 0.04 },
  ]);
}

/** 일일 던전 즉시 정산권 사용 */
export function sfxRiftClaim(): void {
  play([
    { freq: 294, at: 0, dur: 0.18, type: "sawtooth", gain: 0.04 },
    { freq: 440, at: 0.1, dur: 0.2, type: "triangle", gain: 0.05 },
    { freq: 880, at: 0.2, dur: 0.34, type: "sine", gain: 0.04 },
  ]);
}
