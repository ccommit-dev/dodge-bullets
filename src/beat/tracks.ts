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
  /** 난이도 레벨 1~10 — BPM × 분할 × 패턴 복잡도 × 길이. 스케줄은 이 값 오름차순 (docs/CONTENT_BEAT_DODGE_PLAN.md) */
  level: number;
  desc: string;
  lessonTitle: string;
  lessonHint: string;
  reward: number;
  /** Dual orbit rings for immersion. */
  ringCount: 1 | 2;
  /** 곡의 무박 인트로 동안 필수 노트를 만들지 않는다. */
  audioOffsetMs?: number;
};

/**
 * 소리 크기(데시벨 근사) — audio.ts 각 악기의 피크 게인. 큰 소리(킥·파이어빗)는 노트로 남고
 * 작은 소리(숨·클릭)는 저레벨에서 노트가 되지 않는다. 채보가 "곡의 소리"를 따르게 하는 축.
 */
export const SOUND_LOUDNESS: Record<BeatSound, number> = { boots: 0.32, firebeat: 0.2, throat: 0.16, cats: 0.16, trumpet: 0.14, rim: 0.12, click: 0.1, breath: 0.07 };

/**
 * 펌프 잇 업 레벨별 채보 특징 (S1~S10 감각을 4레인에 옮김):
 *   1~2  4분음·강박만, 롱노트 없음                  3~4  8분음, 짧은 롱노트(2스텝)
 *   5~6  레인 계단(0→1→2→3), 롱노트 3스텝           7~8  16분음 드릴(같은 레인 3연타), 롱노트 4스텝
 *   9~10 드릴 + 계단 + 긴 롱노트, 초당 5노트까지
 *   노트 종류(손 게임 기준): 탭 · 홀드(3+) · 점프 = 두 레인 동시(5+) · 롤 = 두 레인 교대 연타(6+) · 홀드 점프 = 두 레인 동시 홀드(8+)
 * notesPerSec: 손이 따라갈 초당 노트 상한 · minLoud: 이 크기(킥 대비 비율) 미만 소리는 노트 제외
 */
export type LevelFeature = { notesPerSec: number; minLoud: number; holdEvery: number; holdSteps: number; stairs: boolean; drill: boolean; jump: boolean; holdJump: boolean; roll: boolean };
export const LEVEL_FEATURES: LevelFeature[] = [
  // 저레벨에도 노트 종류가 섞인다 (손 게임 기준 — 탭만 있는 채보는 "단건"으로 읽혔다): 1 홀드+점프, 3 롤, 4 홀드 점프. 밀도는 그대로.
  { notesPerSec: 2.0, minLoud: 0.45, holdEvery: 10, holdSteps: 2, stairs: false, drill: false, jump: true, holdJump: false, roll: false },
  { notesPerSec: 2.4, minLoud: 0.45, holdEvery: 10, holdSteps: 2, stairs: false, drill: false, jump: true, holdJump: false, roll: false },
  { notesPerSec: 2.9, minLoud: 0.38, holdEvery: 12, holdSteps: 2, stairs: false, drill: false, jump: true, holdJump: false, roll: false },
  { notesPerSec: 3.2, minLoud: 0.38, holdEvery: 11, holdSteps: 2, stairs: false, drill: false, jump: true, holdJump: false, roll: true },
  { notesPerSec: 3.6, minLoud: 0.3, holdEvery: 9, holdSteps: 3, stairs: true, drill: false, jump: true, holdJump: true, roll: true },
  { notesPerSec: 3.9, minLoud: 0.3, holdEvery: 9, holdSteps: 3, stairs: true, drill: false, jump: true, holdJump: false, roll: true },
  { notesPerSec: 4.2, minLoud: 0.22, holdEvery: 8, holdSteps: 4, stairs: true, drill: true, jump: true, holdJump: false, roll: true },
  { notesPerSec: 4.5, minLoud: 0.22, holdEvery: 7, holdSteps: 4, stairs: true, drill: true, jump: true, holdJump: true, roll: true },
  { notesPerSec: 4.8, minLoud: 0, holdEvery: 6, holdSteps: 4, stairs: true, drill: true, jump: true, holdJump: true, roll: true },
  { notesPerSec: 5.2, minLoud: 0, holdEvery: 6, holdSteps: 5, stairs: true, drill: true, jump: true, holdJump: true, roll: true },
];
/** 곡 레벨 + 난이도 변형(EASY −2 · HARD +2) → 1~10 */
export function effectiveLevel(track: BeatTrackDef): number {
  const shift = track.difficulty === "easy" ? -2 : track.difficulty === "hard" ? 2 : 0;
  return Math.max(1, Math.min(10, (track.level ?? 5) + shift));
}
export function levelFeatureFor(track: BeatTrackDef): LevelFeature {
  return LEVEL_FEATURES[effectiveLevel(track) - 1];
}

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
  if (diff === "easy") return isDown || isBackBeat;
  if (diff === "medium") return quarter;
  return eighth;
}

const TRACK_DEFS: BeatTrackDef[] = [
  { id:"azure-sky", level: 5, name:"Azure Sky", audioFile:"o2jam/azure-sky.m4a", patternId:"eight-basic", bpm:130, subdivision:8, difficulty:"medium", bars:79, audioOffsetMs:1850, desc:"넓은 신스 구간과 상승 멜로디", lessonTitle:"AZURE SKY", lessonHint:"긴 호흡 뒤의 킥과 하이햇 교차를 읽으세요", reward:120, ringCount:2 },
  { id:"cherry-pop", level: 3, name:"Cherry Pop", audioFile:"o2jam/cherry-pop.m4a", patternId:"boots-cats", bpm:123, subdivision:8, difficulty:"medium", bars:48, audioOffsetMs:620, desc:"팝 리듬의 경쾌한 백비트", lessonTitle:"CHERRY POP", lessonHint:"스네어 백비트에서 방어를 연결하세요", reward:105, ringCount:1 },
  { id:"strawberry-lemonade", level: 10, name:"Strawberry Lemonade", audioFile:"o2jam/strawberry-lemonade.m4a", patternId:"sixteen-mix", bpm:165, subdivision:16, difficulty:"hard", bars:112, audioOffsetMs:480, desc:"빠른 전개와 연속 멜로디 러시", lessonTitle:"STRAWBERRY LEMONADE", lessonHint:"연타 사이 회피 노트를 놓치지 마세요", reward:180, ringCount:2 },
  { id:"turkish-march", level: 6, name:"Turkish March", audioFile:"o2jam/turkish-march.m4a", patternId:"throat-trumpet", bpm:140, subdivision:8, difficulty:"medium", bars:68, audioOffsetMs:720, desc:"피아노 행진 악센트 전투", lessonTitle:"TURKISH MARCH", lessonHint:"피아노 프레이즈 끝의 스킬 노트를 노리세요", reward:145, ringCount:2 },
  { id:"plasma-gun", level: 9, name:"Plasma Gun", audioFile:"o2jam/plasma-gun.m4a", patternId:"firebeat", bpm:160, subdivision:16, difficulty:"hard", bars:39, audioOffsetMs:300, desc:"짧고 강한 전자음 보스 러시", lessonTitle:"PLASMA GUN", lessonHint:"밀집 노트를 공격-회피-스킬로 연결하세요", reward:170, ringCount:2 },
  { id:"dual-racing", level: 9, name:"Dual Racing RED vs BLUE", audioFile:"o2jam/dual-racing.m4a", patternId:"sixteen-mix", bpm:165, subdivision:16, difficulty:"hard", bars:79, audioOffsetMs:540, desc:"두 테마가 교차하는 고속 결전", lessonTitle:"DUAL RACING", lessonHint:"RED 공격과 BLUE 방어 구절을 교대하세요", reward:195, ringCount:2 },
  { id:"black-city-beat", level: 1, name:"Black City Beat", audioFile:"o2jam/black-city-beat.m4a", patternId:"boots-cats", bpm:95, subdivision:8, difficulty:"easy", bars:43, audioOffsetMs:1100, desc:"묵직한 록 그루브 입문전", lessonTitle:"BLACK CITY BEAT", lessonHint:"느린 킥을 정확히 눌러 재료 콤보를 만드세요", reward:100, ringCount:1 },
  { id:"andromeda", level: 8, name:"Andromeda", audioFile:"o2jam/andromeda.m4a", patternId:"firebeat", bpm:147, subdivision:16, difficulty:"hard", bars:75, audioOffsetMs:880, desc:"우주 신스와 고밀도 테크노", lessonTitle:"ANDROMEDA", lessonHint:"16비트 구간은 모든 노트보다 핵심 악센트를 우선하세요", reward:185, ringCount:2 },
  { id:"one-more-time", level: 5, name:"1 More Time", audioFile:"o2jam/one-more-time.m4a", patternId:"eight-basic", bpm:125, subdivision:8, difficulty:"medium", bars:89, audioOffsetMs:900, desc:"반복 구절을 성장시키는 장기전", lessonTitle:"1 MORE TIME", lessonHint:"반복될수록 공격-방어 패턴이 확장됩니다", reward:155, ringCount:2 },
  { id:"duel", level: 8, name:"Duel", audioFile:"o2jam/duel.m4a", patternId:"sixteen-mix", bpm:150, subdivision:16, difficulty:"hard", bars:77, audioOffsetMs:650, desc:"공격과 반격이 교차하는 결투", lessonTitle:"DUEL", lessonHint:"방어 직후 스킬 노트로 반격하세요", reward:190, ringCount:2 },
  {
    id: "cybernetic-overload", level: 2,
    name: "Cybernetic Overload",
    audioFile: "cybernetic-overload.mp3",
    patternId: "boots-cats",
    bpm: 170,
    subdivision: 4,
    difficulty: "easy",
    bars: 28,
    desc: "하드 트랜스의 강한 킥을 따라가는 입문 수련",
    lessonTitle: "CYBERNETIC OVERLOAD",
    lessonHint: "강박의 방향 노트부터 천천히 맞추세요",
    reward: 55,
    ringCount: 1,
  },
  {
    id: "arcade-overdrive", level: 2,
    name: "Arcade Overdrive",
    audioFile: "arcade-overdrive.mp3",
    patternId: "eight-basic",
    bpm: 128,
    subdivision: 4,
    difficulty: "easy",
    bars: 24,
    desc: "신스웨이브 리듬을 읽는 레트로 아케이드 수련",
    lessonTitle: "ARCADE OVERDRIVE",
    lessonHint: "킥과 스네어의 교차 박자를 확인하세요",
    reward: 65,
    ringCount: 1,
  },
  {
    id: "pixel-rush", level: 4,
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
    id: "playful-pixels", level: 3,
    name: "Playful Pixels",
    audioFile: "playful-pixels.mp3",
    patternId: "boots-cats",
    bpm: 120,
    subdivision: 8,
    difficulty: "medium",
    bars: 24,
    desc: "경쾌한 멜로디의 엇박을 익히는 변칙 수련",
    lessonTitle: "PLAYFUL PIXELS",
    lessonHint: "색보다 방향을 먼저 읽고 입력하세요",
    reward: 90,
    ringCount: 1,
  },
  {
    id: "happy-strum-day", level: 4,
    name: "Happy Strum Day",
    audioFile: "happy-strum-day.mp3",
    patternId: "throat-trumpet",
    bpm: 112,
    subdivision: 8,
    difficulty: "medium",
    bars: 24,
    desc: "기타 스트럼과 박수 악센트를 교차하는 리듬 수련",
    lessonTitle: "HAPPY STRUM DAY",
    lessonHint: "백비트 노트를 정확하게 이어 피버를 채우세요",
    reward: 105,
    ringCount: 2,
  },
  {
    id: "starlight-strut", level: 7,
    name: "Starlight Strut",
    audioFile: "starlight-strut.mp3",
    patternId: "sixteen-mix",
    bpm: 124,
    subdivision: 16,
    difficulty: "hard",
    bars: 28,
    desc: "스윙과 디스코 싱코페이션을 섞은 최종 수련",
    lessonTitle: "STARLIGHT STRUT",
    lessonHint: "16비트 구간에서도 필수 악센트만 정확히 노리세요",
    reward: 135,
    ringCount: 2,
  },
];

/** 스케줄 사다리 — 레벨 오름차순(같은 레벨은 정의 순). stageIndex 는 이 순서다 */
export const BEAT_TRACKS: BeatTrackDef[] = [...TRACK_DEFS].sort((a, b) => a.level - b.level);

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

/** 구간 밀도표 — intro/break: 4분음 확률, build: 램프 시작→끝, drop: 기본 강박 유지 확률, fill: 프레이즈 끝 채움 스텝 수 */
export const SECTION_DENSITY: Record<BeatDifficulty, { intro: number; buildFrom: number; buildTo: number; drop: number; break: number; fill: number }> = {
  easy: { intro: 0.2, buildFrom: 0.35, buildTo: 0.6, drop: 0.75, break: 0.15, fill: 0 },
  medium: { intro: 0.35, buildFrom: 0.45, buildTo: 0.9, drop: 0.95, break: 0.3, fill: 2 },
  hard: { intro: 0.45, buildFrom: 0.55, buildTo: 1.0, drop: 1.0, break: 0.45, fill: 4 },
};

/**
 * 곡별 실제 전개 비율 [인트로 끝, 빌드업 끝, 1차 하이라이트(드롭) 끝, 브레이크 끝]
 * 예전의 전 곡 일괄 0.18/0.40/0.62/0.72 고정 비율 대신 곡 장르·마디 구조에 맞춰 하이라이트 진입 시점을 조정한다.
 */
export const TRACK_SECTION_PROFILES: Record<string, [number, number, number, number]> = {
  "black-city-beat": [0.16, 0.37, 0.63, 0.74],
  "cybernetic-overload": [0.14, 0.32, 0.64, 0.75],
  "arcade-overdrive": [0.14, 0.34, 0.66, 0.76],
  "cherry-pop": [0.15, 0.35, 0.65, 0.75],
  "playful-pixels": [0.14, 0.34, 0.64, 0.75],
  "pixel-rush": [0.12, 0.32, 0.66, 0.76],
  "happy-strum-day": [0.16, 0.36, 0.65, 0.76],
  "azure-sky": [0.18, 0.40, 0.62, 0.72],
  "one-more-time": [0.18, 0.42, 0.66, 0.76],
  "turkish-march": [0.12, 0.32, 0.60, 0.72],
  "starlight-strut": [0.14, 0.35, 0.64, 0.75],
  "andromeda": [0.17, 0.39, 0.65, 0.76],
  "duel": [0.13, 0.34, 0.62, 0.73],
  "plasma-gun": [0.10, 0.28, 0.66, 0.76],
  "dual-racing": [0.12, 0.32, 0.60, 0.72],
  "strawberry-lemonade": [0.14, 0.34, 0.64, 0.75],
};

/**
 * 대표곡 전용 수제 하이라이트 레인 모티프 — 드롭(클라이맥스) 구간에서 곡의 주제 선율·교차 감각을 손끝에 전달한다.
 */
export const TRACK_DROP_MOTIFS: Record<string, Array<0 | 1 | 2 | 3>> = {
  "black-city-beat": [0, 1, 0, 2, 0, 1, 3, 2],
  "cherry-pop": [0, 1, 2, 1, 0, 3, 2, 1],
  "azure-sky": [0, 2, 1, 3, 2, 0, 1, 3],
  "turkish-march": [0, 1, 2, 3, 2, 1, 0, 3],
  "plasma-gun": [0, 2, 3, 0, 1, 2, 3, 1],
  "dual-racing": [0, 3, 0, 3, 1, 2, 1, 2],
  "duel": [1, 3, 0, 2, 1, 3, 2, 0],
  "andromeda": [0, 2, 1, 2, 3, 2, 1, 0],
  "starlight-strut": [0, 2, 1, 3, 0, 1, 2, 3],
  "strawberry-lemonade": [2, 1, 0, 3, 1, 2, 3, 0],
};

export function sectionAtForTrack(trackId: string, bar: number, bars: number): NonNullable<BeatChartStep["section"]> {
  const [introEnd, buildEnd, dropEnd, breakEnd] = TRACK_SECTION_PROFILES[trackId] ?? [0.18, 0.4, 0.62, 0.72];
  const t = bar / Math.max(1, bars);
  if (t < introEnd) return "intro";
  if (t < buildEnd) return "build";
  if (t < dropEnd) return "drop";
  if (t < breakEnd) return "break";
  return "drop";
}

export function buildChart(track: BeatTrackDef): BeatChartStep[] {
  const loop = expandLoop(PATTERN_LOOPS[track.patternId], track.subdivision);
  const stepsPerBar = track.subdivision;
  const total = track.bars * stepsPerBar;
  const chart: BeatChartStep[] = new Array(total);
  const rng = seededRng(track.id);
  const stepSec = (60 / track.bpm) * 4 / stepsPerBar;
  const bpmKeep = Math.min(1, (stepSec * 4.2));
  const feat = levelFeatureFor(track);
  const levelKeep = Math.min(1, (stepSec * feat.notesPerSec) / Math.max(0.05, bpmKeep));
  let accentOrdinal = 0;
  const offsetSteps = Math.max(0, Math.round((track.audioOffsetMs ?? 0) / (stepDurationSec(track) * 1000)));
  const laneSounds: Record<0 | 1 | 2 | 3, BeatSound[]> = {
    0: ["boots", "firebeat"], 1: ["rim", "trumpet"],
    2: ["cats", "click", "breath"], 3: ["throat"],
  };
  const trackOffset = [...track.id].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 4;
  const lanePhrase = track.difficulty === "easy"
    ? [0, 2, 1, 2, 0, 3, 1, 2]
    : track.difficulty === "medium"
      ? [0, 2, 1, 2, 3, 1, 0, 2, 1, 3, 2, 0]
      : [0, 2, 1, 3, 2, 0, 1, 2, 3, 1, 0, 2, 1, 3, 0, 2];
  const dropMotif = TRACK_DROP_MOTIFS[track.id];
  const [introEnd, buildEnd] = TRACK_SECTION_PROFILES[track.id] ?? [0.18, 0.4, 0.62, 0.72];

  for (let i = 0; i < total; i++) {
    let sound = loop[i % loop.length];
    const inBar = i % stepsPerBar;
    const bar = Math.floor(i / stepsPerBar);
    const section = sectionAtForTrack(track.id, bar, track.bars);
    const base = accentSpike(sound, inBar, track.subdivision, track.difficulty);
    const isDown = inBar === 0;
    const quarter = inBar % Math.max(1, stepsPerBar / 4) === 0;
    const dens = SECTION_DENSITY[track.difficulty];
    const t = bar / Math.max(1, track.bars);
    let spike = false;
    if (section === "intro") spike = isDown || (quarter && rng() < dens.intro);
    else if (section === "build") {
      const span = Math.max(0.08, buildEnd - introEnd);
      const ramp = dens.buildFrom + Math.max(0, Math.min(1, (t - introEnd) / span)) * (dens.buildTo - dens.buildFrom);
      spike = base && rng() < ramp * bpmKeep;
    } else if (section === "drop") {
      // 클라이맥스 구간: 첫 마디 진입 악센트와 마지막 10% 피날레를 확실하게 살린다
      const dropEntry = (bar > 0 && sectionAtForTrack(track.id, bar - 1, track.bars) !== "drop") && isDown;
      spike = dropEntry || (base && (t >= 0.9 ? bpmKeep >= 0.5 || rng() < bpmKeep : rng() < bpmKeep * dens.drop));
    } else spike = isDown || (quarter && rng() < dens.break);

    if (spike && !isDown) {
      const loud = SOUND_LOUDNESS[sound] / SOUND_LOUDNESS.boots;
      if (loud < feat.minLoud) spike = false;
      else if (rng() > 0.6 + 0.4 * loud) spike = false;
    }
    if (spike && !isDown && levelKeep < 1 && rng() > levelKeep) spike = false;
    if (feat.notesPerSec <= 2.4 && quarter && (section === "drop" || section === "build")) spike = true;
    const fillSteps = dens.fill;
    if (fillSteps > 0 && (section === "build" || section === "drop") && bar % 4 === 3 && inBar >= stepsPerBar - fillSteps && stepSec >= 0.1) spike = true;
    if (i < Math.max(2, offsetSteps) || i >= total - 1) spike = false;
    if (spike) {
      const stairs = feat.stairs && section === "drop" && bar % 4 >= 2;
      const motifLane = section === "drop" && dropMotif ? dropMotif[accentOrdinal % dropMotif.length] : null;
      const noteLane = (stairs
        ? ((bar % 8 >= 4 ? 3 - (accentOrdinal % 4) : accentOrdinal % 4))
        : motifLane !== null
          ? motifLane
          : lanePhrase[(accentOrdinal + trackOffset) % lanePhrase.length]) as 0 | 1 | 2 | 3;
      const poolAll = laneSounds[noteLane];
      const poolLoud = poolAll.filter((snd) => SOUND_LOUDNESS[snd] / SOUND_LOUDNESS.boots >= feat.minLoud);
      const pool = poolLoud.length ? poolLoud : poolAll;
      sound = pool[(Math.floor(accentOrdinal / lanePhrase.length) + accentOrdinal) % pool.length];
      accentOrdinal += 1;
    }
    let lane: 0 | 1 = 0;
    if (track.ringCount === 2 && spike) {
      if (section === "drop") lane = (Math.floor(i / Math.max(1, stepsPerBar / 4)) % 2) as 0 | 1;
      else if (section === "build") lane = (bar % 2) as 0 | 1;
    }
    chart[i] = { sound, spike, lane, section };
  }
  let noteOrdinal = 0;
  for (let i = 0; i < chart.length; i++) {
    const step = chart[i];
    if (!step.spike) continue;
    noteOrdinal += 1;
    if (track.difficulty === "hard") step.trick = noteOrdinal % 11 === 0 ? "late" : noteOrdinal % 7 === 0 ? "ghost" : undefined;
    else if (track.difficulty === "medium" && noteOrdinal % 13 === 0) step.trick = "flash";
    if (feat.drill && stepSec >= 0.09 && step.section === "drop" && noteOrdinal % 8 === 0) {
      for (let d = 1; d <= 2 && i + d < chart.length; d += 1) {
        if (chart[i + d].holdTail || chart[i + d].hold) break;
        chart[i + d] = { ...chart[i + d], sound: step.sound, spike: true, section: step.section, trick: undefined };
      }
      i += 2;
      noteOrdinal += 2;
      continue;
    }
    if (feat.holdEvery === 0 || noteOrdinal % feat.holdEvery !== 0) continue;
    const holdSteps = Math.min(feat.holdSteps, chart.length - 1 - i);
    if (holdSteps < 2) continue;
    step.hold = holdSteps;
    step.holdSteps = holdSteps;
    for (let tail = 1; tail < holdSteps; tail++) {
      chart[i + tail] = { ...chart[i + tail], sound: step.sound, spike: false, holdTail: true, trick: undefined };
    }
    i += holdSteps - 1;
  }
  const laneOf = (snd: BeatSound): 0 | 1 | 2 | 3 => (snd === "boots" || snd === "firebeat" ? 0 : snd === "rim" || snd === "trumpet" ? 1 : snd === "throat" ? 3 : 2);
  const otherLaneSound = (snd: BeatSound, k: number): BeatSound => { const target = ((laneOf(snd) + 2 + (k % 2)) % 4) as 0 | 1 | 2 | 3; const pool = laneSounds[target]; return pool[k % pool.length]; };
  const jumpEvery = effectiveLevel(track) <= 3 ? 16 : effectiveLevel(track) <= 6 ? 12 : 10;
  if (feat.jump || feat.roll || feat.holdJump) {
    let n = 0, holdN = 0;
    for (let i = 0; i < chart.length; i++) {
      const step = chart[i];
      if (!step.spike || step.holdTail) continue;
      n += 1;
      const sec = step.section;
      if (feat.jump && !step.hold && (sec === "drop" || sec === "build") && n % jumpEvery === 0) step.jumpSound = otherLaneSound(step.sound, n);
      if (step.hold) { holdN += 1; if (feat.holdJump && holdN % 3 === 0) step.jumpSound = otherLaneSound(step.sound, holdN); }
      if (feat.roll && sec === "drop" && n % 14 === 0 && stepSec >= 0.09 && !step.hold) {
        const other = otherLaneSound(step.sound, n);
        for (let d = 0; d < 4 && i + d < chart.length; d += 1) {
          if (chart[i + d].hold || chart[i + d].holdTail) break;
          chart[i + d] = { ...chart[i + d], sound: d % 2 === 0 ? step.sound : other, spike: true, roll: true, trick: undefined, jumpSound: undefined, section: sec };
        }
        i += 3;
      }
    }
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

/** 난이도 변형별 판정 임계(락 값): [PERFECT, GREAT] — 고난도 ±18ms 극단 판정을 완화해 손맛과 정확도 변별력을 함께 살린다 */
export const JUDGE_THRESHOLDS: Record<BeatDifficulty, [number, number]> = { easy: [0.62, 0.35], medium: [0.68, 0.4], hard: [0.74, 0.45] };

/** 등급 — 총 노트 대비 가중 정확도 */
export type BeatGrade = "S" | "A" | "B" | "C";
export function gradeOf(accuracy: number): BeatGrade {
  return accuracy >= 0.9 ? "S" : accuracy >= 0.75 ? "A" : accuracy >= 0.55 ? "B" : "C";
}
export const GRADE_ORDER: Record<BeatGrade, number> = { C: 0, B: 1, A: 2, S: 3 };
