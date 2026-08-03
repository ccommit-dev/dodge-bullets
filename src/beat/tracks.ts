import type {
  BeatChartStep,
  BeatDifficulty,
  BeatSound,
  BeatSubdivision,
} from "./types";

export type BeatPatternId =
  | "boots-cats"
  | "firebeat"
  | "trumpet-bass"
  | "breath-roll"
  | "classic-mix";

export type BeatTrackDef = {
  id: string;
  name: string;
  patternId: BeatPatternId;
  bpm: number;
  subdivision: BeatSubdivision;
  difficulty: BeatDifficulty;
  bars: number;
  desc: string;
};

/** Loop phrases inspired by classic beatbox techniques (synthesized in-game). */
const PATTERN_LOOPS: Record<BeatPatternId, BeatSound[]> = {
  // Classic "boots and cats"
  "boots-cats": ["boots", "cats", "boots", "cats"],
  // Rolling firebeat feel
  firebeat: ["firebeat", "click", "firebeat", "rim", "firebeat", "click", "firebeat", "cats"],
  // Trumpet / throat bass groove
  "trumpet-bass": ["trumpet", "breath", "trumpet", "click", "trumpet", "breath", "boots", "cats"],
  // Breath-led learning
  "breath-roll": ["breath", "boots", "breath", "cats", "breath", "firebeat", "breath", "rim"],
  // Famous-style mix (homage collage)
  "classic-mix": [
    "boots",
    "cats",
    "boots",
    "cats",
    "firebeat",
    "firebeat",
    "trumpet",
    "breath",
    "throat",
    "click",
    "boots",
    "rim",
    "firebeat",
    "cats",
    "trumpet",
    "breath",
  ],
};

function expandLoop(loop: BeatSound[], subdivision: BeatSubdivision): BeatSound[] {
  if (subdivision === 4) {
    // Keep quarter feel — take every Nth or pad to 4
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
        // densify with click/breath fillers
        if (out.length < 8 && (s === "boots" || s === "trumpet")) out.push("breath");
        if (out.length >= 8) break;
      }
    }
    return out.slice(0, 8);
  }
  // 16
  const base = expandLoop(loop, 8);
  const out: BeatSound[] = [];
  for (const s of base) {
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
  const dens = diff === "easy" ? 0.35 : diff === "medium" ? 0.55 : 0.75;
  const isDown = inBar === 0;
  const strong =
    sound === "boots" ||
    sound === "firebeat" ||
    sound === "trumpet" ||
    sound === "throat";
  if (diff === "easy") return isDown && strong;
  if (strong && (isDown || Math.random() < dens)) return true;
  if (sound === "cats" || sound === "rim") return Math.random() < dens * 0.45;
  if (subdivision === 16 && diff === "hard") return Math.random() < dens * 0.25;
  return false;
}

export const BEAT_TRACKS: BeatTrackDef[] = [
  {
    id: "bc4-easy",
    name: "STAGE 1 · 부츠앤캣츠",
    patternId: "boots-cats",
    bpm: 100,
    subdivision: 4,
    difficulty: "easy",
    bars: 8,
    desc: "탭으로 궤도 반전 · 가시 피하기",
  },
  {
    id: "fb8-easy",
    name: "STAGE 2 · 파이어빗",
    patternId: "firebeat",
    bpm: 108,
    subdivision: 8,
    difficulty: "easy",
    bars: 8,
    desc: "박자에 맞춰 반전",
  },
  {
    id: "tp8-mid",
    name: "STAGE 3 · 트럼펫",
    patternId: "trumpet-bass",
    bpm: 116,
    subdivision: 8,
    difficulty: "medium",
    bars: 9,
    desc: "트럼펫 그루브 · 클리어 후 즉시 이어짐",
  },
  {
    id: "fb8-mid",
    name: "STAGE 4 · 파이어빗 중",
    patternId: "firebeat",
    bpm: 124,
    subdivision: 8,
    difficulty: "medium",
    bars: 9,
    desc: "밀집 가시",
  },
  {
    id: "mix16-mid",
    name: "STAGE 5 · 클래식 믹스",
    patternId: "classic-mix",
    bpm: 128,
    subdivision: 16,
    difficulty: "medium",
    bars: 8,
    desc: "16빗 풀 패턴",
  },
  {
    id: "mix16-hard",
    name: "STAGE 6 · 결전",
    patternId: "classic-mix",
    bpm: 140,
    subdivision: 16,
    difficulty: "hard",
    bars: 10,
    desc: "최종 스테이지",
  },
];

/** Campaign order — stage 3 clear auto-continues into stage 4. */
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
    if (spike) lane = Math.random() < 0.55 ? ((lane ^ 1) as 0 | 1) : lane;
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
  // Faster orbit = Orbit-or-Beat urgency
  const orbitsPerBar =
    track.difficulty === "easy" ? 0.55 : track.difficulty === "medium" ? 0.72 : 0.9;
  return (Math.PI * 2 * orbitsPerBar) / barSec;
}
