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
    name: "NEON VANGUARD · 기동",
    patternId: "kick-only",
    bpm: 92,
    subdivision: 4,
    difficulty: "easy",
    bars: 20,
    desc: "킥으로 주인공의 검격을 만들며 네온 던전에 진입",
    lessonTitle: "NEON VANGUARD · 진입",
    lessonHint: "KICK을 맞혀 첫 음악 레이어와 검격을 활성화하세요",
    reward: 40,
    ringCount: 1,
  },
  {
    id: "lesson-hat",
    name: "NEON VANGUARD · 추격",
    patternId: "hat-only",
    bpm: 96,
    subdivision: 4,
    difficulty: "easy",
    bars: 20,
    desc: "하이햇 원거리 지원과 킥 검격을 겹쳐 추격대를 돌파",
    lessonTitle: "NEON VANGUARD · 추격",
    lessonHint: "HAT을 쌓으면 원거리 동료와 조명이 깨어납니다",
    reward: 45,
    ringCount: 1,
  },
  {
    id: "lesson-snare",
    name: "CYBER PURSUIT · 잠입",
    patternId: "snare-only",
    bpm: 100,
    subdivision: 4,
    difficulty: "easy",
    bars: 20,
    desc: "클럽 스네어 빌드업에 맞춘 백비트 훈련",
    lessonTitle: "CYBER PURSUIT · 잠입",
    lessonHint: "SNARE로 근접 동료의 연계 공격을 지휘하세요",
    reward: 50,
    ringCount: 1,
  },
  {
    id: "lesson-bc4",
    name: "CYBER PURSUIT · 코어",
    patternId: "boots-cats",
    bpm: 104,
    subdivision: 4,
    difficulty: "easy",
    bars: 20,
    desc: "4-on-the-floor 그루브와 Boots & Cats 조합",
    lessonTitle: "CYBER PURSUIT · 코어",
    lessonHint: "네 악기를 교차해 DROP 게이지를 빠르게 충전하세요",
    reward: 60,
    ringCount: 1,
  },
  {
    id: "lesson-8",
    name: "INFERNO BREAKER · 폭주",
    patternId: "eight-basic",
    bpm: 138,
    subdivision: 8,
    difficulty: "medium",
    bars: 20,
    desc: "퓨처하우스 베이스 위 8비트 명령 전투",
    lessonTitle: "INFERNO BREAKER · 폭주",
    lessonHint: "빠른 HAT과 SNARE로 화염 보스의 방어를 파괴하세요",
    reward: 75,
    ringCount: 2,
  },
  {
    id: "lesson-fire",
    name: "INFERNO BREAKER · 붕괴",
    patternId: "firebeat",
    bpm: 144,
    subdivision: 8,
    difficulty: "medium",
    bars: 24,
    desc: "빅룸 드롭과 롤링 파이어빗 테크닉",
    lessonTitle: "INFERNO BREAKER · 붕괴",
    lessonHint: "DROP 직전까지 레이어를 쌓고 BASS로 폭발시키세요",
    reward: 90,
    ringCount: 2,
  },
  {
    id: "lesson-throat",
    name: "TITAN OVERDRIVE · 각성",
    patternId: "throat-trumpet",
    bpm: 124,
    subdivision: 8,
    difficulty: "hard",
    bars: 24,
    desc: "베이스하우스 드롭에 스로트·트럼펫을 섞는 전투",
    lessonTitle: "TITAN OVERDRIVE · 각성",
    lessonHint: "베이스와 동료 연계를 유지해 타이탄을 경직시키세요",
    reward: 110,
    ringCount: 2,
  },
  {
    id: "lesson-16",
    name: "TITAN OVERDRIVE · 최종 DROP",
    patternId: "sixteen-mix",
    bpm: 132,
    subdivision: 16,
    difficulty: "hard",
    bars: 24,
    desc: "하드클럽 피날레에 모든 비트박스 음색을 조합",
    lessonTitle: "TITAN OVERDRIVE · 최종 DROP",
    lessonHint: "네 레이어를 완성하고 연속 DROP으로 타이탄을 처치하세요",
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
