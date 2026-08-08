import type {
  BeatChartStep,
  BeatDifficulty,
  BeatSound,
  BeatSubdivision,
} from "./types";

/**
 * Lesson curriculum inspired by Bukbak TV beginner sound guides:
 * Kick → Hi-hat → Snare → Boots&Cats → 8-beat → Firebeat → Throat/Trumpet → 16-beat.
 */
export type BeatPatternId =
  | "kick-only"
  | "hat-only"
  | "snare-only"
  | "boots-cats"
  | "eight-basic"
  | "firebeat"
  | "throat-trumpet"
  | "sixteen-mix";

export type BeatTrackDef = {
  id: string;
  name: string;
  patternId: BeatPatternId;
  bpm: number;
  subdivision: BeatSubdivision;
  difficulty: BeatDifficulty;
  bars: number;
  desc: string;
  lessonTitle: string;
  lessonHint: string;
  reward: number;
  /** Dual orbit rings for immersion. */
  ringCount: 1 | 2;
};

/** Quiet guide + loud player share these loops. */
const PATTERN_LOOPS: Record<BeatPatternId, BeatSound[]> = {
  "kick-only": ["boots", "breath", "boots", "breath"],
  "hat-only": ["cats", "click", "cats", "click"],
  "snare-only": ["rim", "breath", "rim", "click"],
  "boots-cats": ["boots", "cats", "boots", "cats"],
  "eight-basic": ["boots", "click", "cats", "click", "boots", "click", "rim", "click"],
  firebeat: ["firebeat", "click", "firebeat", "rim", "firebeat", "click", "firebeat", "cats"],
  "throat-trumpet": [
    "trumpet",
    "breath",
    "throat",
    "click",
    "trumpet",
    "breath",
    "boots",
    "cats",
  ],
  "sixteen-mix": [
    "boots",
    "click",
    "cats",
    "click",
    "boots",
    "rim",
    "cats",
    "click",
    "firebeat",
    "click",
    "trumpet",
    "breath",
    "throat",
    "rim",
    "boots",
    "cats",
  ],
};

function expandLoop(loop: BeatSound[], subdivision: BeatSubdivision): BeatSound[] {
  if (loop.length === subdivision) return loop.slice();
  if (subdivision === 4) {
    if (loop.length >= 4) return loop.slice(0, 4);
    const out: BeatSound[] = [];
    while (out.length < 4) out.push(...loop);
    return out.slice(0, 4);
  }
  if (subdivision === 8) {
    if (loop.length >= 8) return loop.slice(0, 8);
    const out: BeatSound[] = [];
    while (out.length < 8) {
      for (const s of loop) {
        out.push(s);
        if (out.length >= 8) break;
      }
    }
    return out.slice(0, 8);
  }
  if (loop.length >= 16) return loop.slice(0, 16);
  const base8 = expandLoop(loop, 8);
  const out: BeatSound[] = [];
  for (const s of base8) {
    out.push(s);
    out.push(s === "firebeat" || s === "trumpet" ? "click" : "breath");
  }
  return out.slice(0, 16);
}

function accentSpike(
  sound: BeatSound,
  inBar: number,
  subdivision: BeatSubdivision,
  diff: BeatDifficulty,
): boolean {
  const dens = diff === "easy" ? 0.32 : diff === "medium" ? 0.52 : 0.72;
  const isDown = inBar === 0;
  const strong =
    sound === "boots" ||
    sound === "firebeat" ||
    sound === "trumpet" ||
    sound === "throat" ||
    sound === "rim";
  if (diff === "easy") return isDown && strong;
  if (strong && (isDown || Math.random() < dens)) return true;
  if (sound === "cats") return Math.random() < dens * 0.4;
  if (subdivision === 16 && diff === "hard") return Math.random() < dens * 0.22;
  return false;
}

export const BEAT_TRACKS: BeatTrackDef[] = [
  {
    id: "lesson-kick",
    name: "STAGE 1 · 킥(B)",
    patternId: "kick-only",
    bpm: 92,
    subdivision: 4,
    difficulty: "easy",
    bars: 8,
    desc: "입술로 '부' 킥 — 강좌 1강",
    lessonTitle: "기초 1 · 킥 드럼",
    lessonHint: "가이드 킥에 맞춰 탭하면 같은 킥이 크게 납니다",
    reward: 40,
    ringCount: 1,
  },
  {
    id: "lesson-hat",
    name: "STAGE 2 · 하이햇(T)",
    patternId: "hat-only",
    bpm: 96,
    subdivision: 4,
    difficulty: "easy",
    bars: 8,
    desc: "'츠' 하이햇 — 강좌 2강",
    lessonTitle: "기초 2 · 하이햇",
    lessonHint: "짧은 하이햇을 박자에 맞춰 따라 치세요",
    reward: 45,
    ringCount: 1,
  },
  {
    id: "lesson-snare",
    name: "STAGE 3 · 스네어(K)",
    patternId: "snare-only",
    bpm: 100,
    subdivision: 4,
    difficulty: "easy",
    bars: 8,
    desc: "입술 마찰 스네어 — 강좌 3강",
    lessonTitle: "기초 3 · 스네어",
    lessonHint: "스네어 타이밍에 탭해 같은 소리를 내세요",
    reward: 50,
    ringCount: 1,
  },
  {
    id: "lesson-bc4",
    name: "STAGE 4 · 부츠앤캣츠",
    patternId: "boots-cats",
    bpm: 104,
    subdivision: 4,
    difficulty: "easy",
    bars: 8,
    desc: "킥+하이햇 4비트 루프",
    lessonTitle: "조합 1 · Boots & Cats",
    lessonHint: "부츠–캣츠 루프를 가이드와 맞춰 연주",
    reward: 60,
    ringCount: 1,
  },
  {
    id: "lesson-8",
    name: "STAGE 5 · 8비트",
    patternId: "eight-basic",
    bpm: 112,
    subdivision: 8,
    difficulty: "medium",
    bars: 8,
    desc: "8분할 리듬 · 3D 멀티 레일",
    lessonTitle: "리듬 2 · 8비트",
    lessonHint: "8비트 가이드를 따라 반전 타이밍을 잡으세요",
    reward: 75,
    ringCount: 2,
  },
  {
    id: "lesson-fire",
    name: "STAGE 6 · 파이어빗",
    patternId: "firebeat",
    bpm: 118,
    subdivision: 8,
    difficulty: "medium",
    bars: 9,
    desc: "롤링 파이어빗 테크닉",
    lessonTitle: "스킬 1 · 파이어빗",
    lessonHint: "파이어빗 가이드와 같은 소리로 리드하세요",
    reward: 90,
    ringCount: 2,
  },
  {
    id: "lesson-throat",
    name: "STAGE 7 · 스로트·트럼펫",
    patternId: "throat-trumpet",
    bpm: 124,
    subdivision: 8,
    difficulty: "hard",
    bars: 9,
    desc: "스로트 베이스 + 트럼펫",
    lessonTitle: "스킬 2 · 스로트 & 트럼펫",
    lessonHint: "저음 가이드가 MIX LINE에 닿을 때 탭",
    reward: 110,
    ringCount: 2,
  },
  {
    id: "lesson-16",
    name: "STAGE 8 · 16비트 실전",
    patternId: "sixteen-mix",
    bpm: 132,
    subdivision: 16,
    difficulty: "hard",
    bars: 8,
    desc: "기초→스킬 총정리 16비트",
    lessonTitle: "실전 · 16비트 믹스",
    lessonHint: "강좌 전체를 한 루프로 — 박자에 탭하세요",
    reward: 140,
    ringCount: 2,
  },
];

export const BEAT_CAMPAIGN = BEAT_TRACKS.map((t) => t.id);

export function getTrack(id: string): BeatTrackDef {
  return BEAT_TRACKS.find((t) => t.id === id) ?? BEAT_TRACKS[0];
}

export function getCampaignStage(index: number): BeatTrackDef {
  const id = BEAT_CAMPAIGN[Math.min(Math.max(0, index), BEAT_CAMPAIGN.length - 1)];
  return getTrack(id);
}

export function isLastCampaignStage(index: number): boolean {
  return index >= BEAT_CAMPAIGN.length - 1;
}

export function stageCount(): number {
  return BEAT_CAMPAIGN.length;
}

export function buildChart(track: BeatTrackDef): BeatChartStep[] {
  const loop = expandLoop(PATTERN_LOOPS[track.patternId], track.subdivision);
  const stepsPerBar = track.subdivision;
  const total = track.bars * stepsPerBar;
  const chart: BeatChartStep[] = new Array(total);
  let lane: 0 | 1 = 0;

  for (let i = 0; i < total; i++) {
    const sound = loop[i % loop.length];
    const inBar = i % stepsPerBar;
    let spike = accentSpike(sound, inBar, track.subdivision, track.difficulty);
    if (i < 2) spike = false;
    if (spike && track.ringCount === 2 && track.difficulty === "hard") {
      lane = Math.random() < 0.45 ? ((lane ^ 1) as 0 | 1) : lane;
    } else {
      lane = 0;
    }
    chart[i] = { sound, spike, lane };
  }
  return chart;
}

export function trackDurationMs(track: BeatTrackDef): number {
  const beatSec = 60 / track.bpm;
  return track.bars * beatSec * 4 * 1000;
}

export function stepDurationSec(track: BeatTrackDef): number {
  const beatSec = 60 / track.bpm;
  return (beatSec * 4) / track.subdivision;
}

export function angularSpeedFor(track: BeatTrackDef): number {
  const barSec = (60 / track.bpm) * 4;
  const orbitsPerBar =
    track.difficulty === "easy" ? 0.5 : track.difficulty === "medium" ? 0.68 : 0.85;
  return (Math.PI * 2 * orbitsPerBar) / barSec;
}
