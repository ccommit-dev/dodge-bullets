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
  audioFile: string;
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
  _sound: BeatSound,
  inBar: number,
  subdivision: BeatSubdivision,
  diff: BeatDifficulty,
): boolean {
  const isDown = inBar === 0;
  const isBackBeat = inBar === Math.floor(subdivision / 2);
  const quarter = inBar % Math.max(1, subdivision / 4) === 0;
  const eighth = inBar % Math.max(1, subdivision / 8) === 0;
  // Keep every chart deterministic and readable: 2 / 4 / 8 required notes per
  // bar. Difficulty changes density without changing the licensed song tempo.
  if (diff === "easy") return isDown || isBackBeat;
  if (diff === "medium") return quarter;
  return eighth;
}

export const BEAT_TRACKS: BeatTrackDef[] = [
  {
    id: "cybernetic-overload",
    name: "Cybernetic Overload",
    audioFile: "cybernetic-overload.mp3",
    patternId: "boots-cats",
    bpm: 170,
    subdivision: 4,
    difficulty: "easy",
    bars: 28,
    desc: "하드 트랜스의 강한 킥을 따라가는 입문 원정",
    lessonTitle: "CYBERNETIC OVERLOAD",
    lessonHint: "강박의 방향 노트부터 천천히 맞추세요",
    reward: 55,
    ringCount: 1,
  },
  {
    id: "arcade-overdrive",
    name: "Arcade Overdrive",
    audioFile: "arcade-overdrive.mp3",
    patternId: "eight-basic",
    bpm: 128,
    subdivision: 4,
    difficulty: "easy",
    bars: 24,
    desc: "신스웨이브 리듬을 읽는 레트로 아케이드 원정",
    lessonTitle: "ARCADE OVERDRIVE",
    lessonHint: "킥과 스네어의 교차 박자를 확인하세요",
    reward: 65,
    ringCount: 1,
  },
  {
    id: "pixel-rush",
    name: "Pixel Rush",
    audioFile: "pixel-rush.mp3",
    patternId: "firebeat",
    bpm: 150,
    subdivision: 8,
    difficulty: "medium",
    bars: 24,
    desc: "빠른 칩튠 악센트에 맞춘 8비트 돌파전",
    lessonTitle: "PIXEL RUSH",
    lessonHint: "연속 노트 사이의 빈 박자를 놓치지 마세요",
    reward: 80,
    ringCount: 1,
  },
  {
    id: "playful-pixels",
    name: "Playful Pixels",
    audioFile: "playful-pixels.mp3",
    patternId: "boots-cats",
    bpm: 120,
    subdivision: 8,
    difficulty: "medium",
    bars: 24,
    desc: "경쾌한 멜로디의 엇박을 익히는 변칙 원정",
    lessonTitle: "PLAYFUL PIXELS",
    lessonHint: "색보다 방향을 먼저 읽고 입력하세요",
    reward: 90,
    ringCount: 1,
  },
  {
    id: "happy-strum-day",
    name: "Happy Strum Day",
    audioFile: "happy-strum-day.mp3",
    patternId: "throat-trumpet",
    bpm: 112,
    subdivision: 8,
    difficulty: "medium",
    bars: 24,
    desc: "기타 스트럼과 박수 악센트를 교차하는 리듬 원정",
    lessonTitle: "HAPPY STRUM DAY",
    lessonHint: "백비트 노트를 정확하게 이어 FEVER를 채우세요",
    reward: 105,
    ringCount: 2,
  },
  {
    id: "starlight-strut",
    name: "Starlight Strut",
    audioFile: "starlight-strut.mp3",
    patternId: "sixteen-mix",
    bpm: 124,
    subdivision: 16,
    difficulty: "hard",
    bars: 28,
    desc: "스윙과 디스코 싱코페이션을 섞은 최종 원정",
    lessonTitle: "STARLIGHT STRUT",
    lessonHint: "16비트 구간에서도 필수 악센트만 정확히 노리세요",
    reward: 135,
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

/** 곡별 결정론적 난수 — 같은 곡은 항상 같은 채보 (연습 가능성) */
function seededRng(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 곡 구간 — 트랜스/신스웨이브 구조를 마디 비율로 근사한다.
 * 인트로(0~18%) → 빌드업(~40%) → 드롭(~62%) → 브레이크(~72%) → 드롭2(~100%)
 */
function sectionAt(bar: number, bars: number): NonNullable<BeatChartStep["section"]> {
  const t = bar / Math.max(1, bars);
  if (t < 0.18) return "intro";
  if (t < 0.4) return "build";
  if (t < 0.62) return "drop";
  if (t < 0.72) return "break";
  return "drop";
}

/**
 * 채보 생성 — 곡마다 다르다 (사용자 지시: 노래마다 노트가 똑같던 문제).
 *
 * 세 가지 축이 채보를 가른다:
 *  1. BPM: 빠른 곡(150+)은 16비트를 성기게, 느린 곡(≤120)은 8비트 엇박을 촘촘하게 —
 *     "손이 따라갈 수 있는 초당 노트 수"를 BPM에 맞춘다
 *  2. 구간: 인트로는 강박만, 빌드업은 점점 조밀, 드롭은 최대 밀도 + 레인 교차,
 *     브레이크는 롱노트(HOLD) 위주 — 곡의 에너지 곡선을 그대로 손에 옮긴다
 *  3. 패턴 루프(악기 배치)와 곡 id 시드: 같은 밀도라도 어떤 스텝이 노트가 되는지가 곡마다 다르다
 * 롱노트는 지속음(트럼펫·목청)이 놓인 스텝에서 2~4스텝으로 뻗는다.
 */
export function buildChart(track: BeatTrackDef): BeatChartStep[] {
  const loop = expandLoop(PATTERN_LOOPS[track.patternId], track.subdivision);
  const stepsPerBar = track.subdivision;
  const total = track.bars * stepsPerBar;
  const chart: BeatChartStep[] = new Array(total);
  const rng = seededRng(track.id);
  // BPM 보정: 초당 노트 상한 ≈ 4.2. 16비트 150BPM은 스텝당 0.1초라 절반만 노트로
  const stepSec = (60 / track.bpm) * 4 / stepsPerBar;
  const bpmKeep = Math.min(1, (stepSec * 4.2));
  let holdRemain = 0;

  for (let i = 0; i < total; i++) {
    const sound = loop[i % loop.length];
    const inBar = i % stepsPerBar;
    const bar = Math.floor(i / stepsPerBar);
    const section = sectionAt(bar, track.bars);
    const base = accentSpike(sound, inBar, track.subdivision, track.difficulty);
    const isDown = inBar === 0;
    const quarter = inBar % Math.max(1, stepsPerBar / 4) === 0;
    let spike = false;
    let hold = 0;
    if (holdRemain > 0) {
      // 롱노트 몸통 구간은 새 노트를 두지 않는다
      holdRemain -= 1;
    } else if (section === "intro") {
      spike = isDown || (quarter && rng() < 0.35);
    } else if (section === "build") {
      const ramp = 0.45 + ((bar / Math.max(1, track.bars)) - 0.18) / 0.22 * 0.45;
      spike = base && rng() < Math.min(0.95, ramp) * bpmKeep;
    } else if (section === "drop") {
      spike = base && rng() < bpmKeep * 0.95;
      // 드롭 강박에 가끔 짧은 롱노트 — 손을 눌러 붙잡는 감각
      if (spike && isDown && (sound === "trumpet" || sound === "throat" || sound === "firebeat") && rng() < 0.35) {
        hold = Math.min(3, Math.max(2, Math.round(stepsPerBar / 4)));
      }
    } else {
      // break: 성긴 롱노트 위주
      spike = isDown || (quarter && rng() < 0.25);
      if (spike && rng() < 0.6) hold = Math.min(4, Math.max(2, Math.round(stepsPerBar / 4) + 1));
    }
    if (i < 2 || i >= total - 1) {
      spike = false;
      hold = 0;
    }
    if (hold > 0) holdRemain = hold;
    // 레인: 드롭에서만 교차(2링 곡), 그 외 0. 빌드업 후반은 마디 단위 교차로 예고
    let lane: 0 | 1 = 0;
    if (track.ringCount === 2 && spike) {
      if (section === "drop") lane = (Math.floor(i / Math.max(1, stepsPerBar / 4)) % 2) as 0 | 1;
      else if (section === "build") lane = (bar % 2) as 0 | 1;
    }
    chart[i] = { sound, spike, lane, hold: hold || undefined, section };
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
