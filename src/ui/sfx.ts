/**
 * 공용 UI 효과음 — 방치 정산 / 지역 개척 / 슬롯 해금 / 성벽 등반용.
 *
 * `game/sound.ts`의 SoundController는 성문 방어 전용 인스턴스라 다른 화면에서 쓸 수 없다.
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
    // 비버 테마(2026-10-07): 기본 음색을 나무 마림바(삼각파 + 빠른 감쇠)로 — 사각파·톱니파 지정은 그대로 둔다
    osc.type = note.type ?? "triangle";
    osc.frequency.setValueAtTime(note.freq, t0 + note.at);
    const peak = note.gain ?? 0.07;
    gain.gain.setValueAtTime(0.0001, t0 + note.at);
    gain.gain.exponentialRampToValueAtTime(peak, t0 + note.at + 0.008);
    gain.gain.exponentialRampToValueAtTime(peak * 0.35, t0 + note.at + Math.min(note.dur * 0.4, 0.06));
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

/* ── 사냥터 타격음 (2026-10-21, 사용자: "지금 들어간 원화는 효과음 없이 화면만 바뀝니다" 마저 수정) ──
   속성 색 불꽃 · 큰 폭발 · 동료 탄에 맞춘 짧은 합성음. 동료 넷이 연타하므로 부르는 쪽(TitansGame)이 간격을 둔다 */
let noiseBuf: AudioBuffer | null = null;
function noise(at: number, dur: number, gain: number, freq: number, q = 1, kind: BiquadFilterType = "bandpass", sweepTo?: number): void {
  if (!loadSoundEnabled()) return;
  const audio = context();
  if (!audio || !master) return;
  if (audio.state === "suspended") void audio.resume().catch(() => undefined);
  if (!noiseBuf) {
    noiseBuf = audio.createBuffer(1, Math.floor(audio.sampleRate * 0.5), audio.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i += 1) d[i] = Math.random() * 2 - 1;
  }
  const t0 = audio.currentTime + at;
  const src = audio.createBufferSource();
  src.buffer = noiseBuf;
  const filter = audio.createBiquadFilter();
  filter.type = kind;
  filter.Q.value = q;
  filter.frequency.setValueAtTime(freq, t0);
  if (sweepTo) filter.frequency.exponentialRampToValueAtTime(sweepTo, t0 + dur);
  const g = audio.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter); filter.connect(g); g.connect(master);
  src.start(t0); src.stop(t0 + dur + 0.02);
}
const EL_PITCH: Record<string, { f: number; type: OscillatorType }> = {
  fire: { f: 196, type: "sawtooth" }, water: { f: 523, type: "sine" }, earth: { f: 110, type: "square" },
  wind: { f: 880, type: "triangle" }, blade: { f: 1318, type: "triangle" }, light: { f: 1046, type: "sine" },
};
/** 평타 — 짧은 "탁" + 속성 음 한 점 */
export function sfxHuntHit(el: string): void {
  const p = EL_PITCH[el] ?? EL_PITCH.blade;
  noise(0, 0.05, 0.05, el === "earth" ? 600 : 2200, 1.2);
  play([{ freq: p.f, at: 0, dur: 0.06, type: p.type, gain: 0.018 }]);
}
/** 치명타 · 스킬 · 특수기 — 저음 쿵 + 터지는 잡음 + 위로 반짝 */
export function sfxHuntBurst(el: string): void {
  const p = EL_PITCH[el] ?? EL_PITCH.blade;
  noise(0, 0.28, 0.11, 1600, 0.7, "lowpass", 300);
  play([
    { freq: 82, at: 0, dur: 0.22, type: "sine", gain: 0.12 },
    { freq: p.f, at: 0.01, dur: 0.16, type: p.type, gain: 0.03 },
    { freq: p.f * 1.5, at: 0.06, dur: 0.2, type: "sine", gain: 0.02 },
  ]);
}
/** 동료 탄 발사 — 바람 가르는 짧은 휙 */
export function sfxHuntShoot(el: string): void {
  noise(0, 0.12, 0.025, el === "earth" ? 500 : 1200, 2, "bandpass", el === "earth" ? 300 : 3200);
}

/* ── 무기 · 쓰러짐 · 펫 · 스킬 등급 (2026-10-28, 사용자: "스테이지별 콘텐츠별 알맞은 음악 효과음 다시 넣어줘") ──
   주인공 한 방은 무기마다 다른 소리(검 쇳소리 · 창 찌르기 · 활 시위 · 지팡이 마법), 몬스터 쓰러짐 · 펫 덤빔 · 스킬 시전은 등급만큼 크게.
   부르는 쪽(TitansGame)이 간격을 둔다 — 연타가 소리를 덮지 않게 */
/** 주인공 무기 한 방 */
export function sfxWeapon(kind: "sword" | "spear" | "bow" | "staff"): void {
  if (kind === "sword") {   // 휙 베고 쨍 — 높은 잡음 내림 + 쇳소리 두 점
    noise(0, 0.11, 0.05, 5200, 1.4, "bandpass", 1400);
    play([{ freq: 2093, at: 0.05, dur: 0.12, type: "triangle", gain: 0.022 }, { freq: 2637, at: 0.055, dur: 0.1, type: "sine", gain: 0.014 }]);
  } else if (kind === "spear") {   // 쉭 찌르고 퍽 — 짧은 바람 + 낮은 둔탁
    noise(0, 0.08, 0.045, 2600, 2.2, "bandpass", 4200);
    noise(0.07, 0.06, 0.06, 420, 1, "lowpass");
    play([{ freq: 147, at: 0.07, dur: 0.09, type: "sine", gain: 0.05 }]);
  } else if (kind === "bow") {   // 팅 시위 + 쉬익 날아감
    play([{ freq: 392, at: 0, dur: 0.16, type: "triangle", gain: 0.05 }, { freq: 294, at: 0.02, dur: 0.12, type: "sine", gain: 0.02 }]);
    noise(0.03, 0.18, 0.025, 1800, 3, "bandpass", 5200);
  } else {   // 지팡이 — 반짝이는 세 음 + 윙
    play([{ freq: 1175, at: 0, dur: 0.14, type: "sine", gain: 0.025 }, { freq: 1568, at: 0.05, dur: 0.14, type: "sine", gain: 0.022 }, { freq: 2093, at: 0.1, dur: 0.2, type: "sine", gain: 0.02 }]);
    noise(0, 0.22, 0.018, 3000, 6, "bandpass", 900);
  }
}
/** 몬스터 쓰러짐 — 쿵 + 펑(먼지) + 내려가는 두 음 */
export function sfxMonsterDown(boss = false): void {
  play([{ freq: boss ? 62 : 92, at: 0, dur: boss ? 0.42 : 0.26, type: "sine", gain: boss ? 0.16 : 0.1 }, { freq: 392, at: 0.04, dur: 0.12, gain: 0.03 }, { freq: 262, at: 0.12, dur: 0.16, gain: 0.03 }]);
  noise(0.02, boss ? 0.5 : 0.3, boss ? 0.09 : 0.06, 900, 0.8, "lowpass", 160);
}
/** 펫 덤빔 — 깡총 두 음 */
export function sfxPetPounce(): void {
  play([{ freq: 988, at: 0, dur: 0.07, type: "square", gain: 0.014 }, { freq: 1319, at: 0.06, dur: 0.09, type: "square", gain: 0.012 }]);
}
/** 스킬 시전 — 등급(N · R · SR · SSR · UR · LR)이 높을수록 음이 늘고 저음 쿵 · 반짝이 붙는다 */
export function sfxSkillTier(tier: "N" | "R" | "SR" | "SSR" | "UR" | "LR"): void {
  const rank = ["N", "R", "SR", "SSR", "UR", "LR"].indexOf(tier);
  const scale = [523.25, 659.25, 783.99, 1046.5, 1318.5, 1568];
  const notes: Note[] = scale.slice(0, Math.max(1, rank + 1)).map((f, i) => ({ freq: f, at: i * 0.055, dur: 0.18 + rank * 0.02, type: "sine", gain: 0.03 + rank * 0.004 }));
  if (rank >= 3) notes.push({ freq: 98, at: 0, dur: 0.4 + rank * 0.05, type: "sine", gain: 0.06 + rank * 0.012 });
  if (rank >= 4) notes.push({ freq: 1568 * (rank === 5 ? 1.5 : 1.25), at: 0.32, dur: 0.4, type: "triangle", gain: 0.02 });
  play(notes);
  if (rank >= 3) noise(0.05, 0.3 + rank * 0.08, 0.02 + rank * 0.006, 6000, 4, "bandpass", 2400);   // 반짝이
}

/**
 * 유물 뽑기 (2026-10-28, 사용자: "상점 유물뽑기에 동료처럼 이펙트 넣어주고 이펙트 음악도 각각 넣어줘").
 * 소환진 1.2초 동안 낮은 울림이 차오르고 반짝이가 모인다 → 공개 때 등급마다 다른 짧은 곡(일반 종 한 번 … 초월 긴 화음 + 반짝이 비).
 */
export function sfxRelicSummon(): void {
  const notes: Note[] = [];
  for (let k = 0; k < 8; k += 1) notes.push({ freq: 196 * Math.pow(2, k / 12), at: k * 0.13, dur: 0.22, type: "triangle", gain: 0.018 + k * 0.003 });
  notes.push({ freq: 65.4, at: 0, dur: 1.15, type: "sine", gain: 0.05 });
  play(notes);
  noise(0.1, 1.0, 0.012, 3200, 3, "bandpass", 7200);   // 모이는 반짝이
}

export function sfxRelicReveal(tier: "N" | "R" | "SR" | "SSR" | "UR" | "LR"): void {
  const rank = ["N", "R", "SR", "SSR", "UR", "LR"].indexOf(tier);
  // 등급마다 다른 음계 · 길이 — 일반 종 하나 · 희귀 두 음 · 영웅 화음 · 전설 팡파르 · 신화 팡파르+종 · 초월 긴 화음+반짝이 비
  const SONGS: number[][] = [
    [784],
    [659.25, 987.77],
    [523.25, 659.25, 783.99, 1046.5],
    [392, 523.25, 659.25, 783.99, 1046.5, 1318.5],
    [440, 554.37, 659.25, 880, 1108.7, 1318.5, 1760],
    [349.23, 440, 523.25, 698.46, 880, 1046.5, 1396.9, 1760, 2093],
  ];
  const song = SONGS[Math.max(0, rank)];
  const step = rank >= 4 ? 0.07 : 0.09;
  const notes: Note[] = song.map((f, i) => ({ freq: f, at: i * step, dur: 0.22 + rank * 0.06, type: rank >= 2 ? "triangle" : "sine", gain: 0.035 + rank * 0.004 }));
  if (rank >= 3) notes.push({ freq: 98, at: 0, dur: 0.6 + rank * 0.1, type: "sine", gain: 0.06 + rank * 0.01 });              // 낮은 울림
  if (rank >= 4) for (const f of [song[0] * 2, song[2] * 2]) notes.push({ freq: f, at: song.length * step, dur: 0.9, type: "sine", gain: 0.02 });   // 종
  if (rank === 5) for (const f of [349.23, 440, 523.25, 698.46]) notes.push({ freq: f, at: song.length * step + 0.1, dur: 1.4, type: "sine", gain: 0.02 });   // 긴 화음
  play(notes);
  if (rank >= 2) noise(0.05, 0.25 + rank * 0.12, 0.012 + rank * 0.005, 5200, 4, "bandpass", 9000);   // 반짝이
}
