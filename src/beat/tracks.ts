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
  /** 곡의 무박 인트로 동안 필수 노트를 만들지 않는다. */
  audioOffsetMs?: number;
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
  { id:"azure-sky", name:"Azure Sky", audioFile:"o2jam/azure-sky.m4a", patternId:"eight-basic", bpm:130, subdivision:8, difficulty:"medium", bars:79, audioOffsetMs:1850, desc:"넓은 신스 구간과 상승 멜로디", lessonTitle:"AZURE SKY", lessonHint:"긴 호흡 뒤의 킥과 하이햇 교차를 읽으세요", reward:120, ringCount:2 },
  { id:"cherry-pop", name:"Cherry Pop", audioFile:"o2jam/cherry-pop.m4a", patternId:"boots-cats", bpm:123, subdivision:8, difficulty:"medium", bars:48, audioOffsetMs:620, desc:"팝 리듬의 경쾌한 백비트", lessonTitle:"CHERRY POP", lessonHint:"스네어 백비트에서 방어를 연결하세요", reward:105, ringCount:1 },
  { id:"strawberry-lemonade", name:"Strawberry Lemonade", audioFile:"o2jam/strawberry-lemonade.m4a", patternId:"sixteen-mix", bpm:165, subdivision:16, difficulty:"hard", bars:112, audioOffsetMs:480, desc:"빠른 전개와 연속 멜로디 러시", lessonTitle:"STRAWBERRY LEMONADE", lessonHint:"연타 사이 회피 노트를 놓치지 마세요", reward:180, ringCount:2 },
  { id:"turkish-march", name:"Turkish March", audioFile:"o2jam/turkish-march.m4a", patternId:"throat-trumpet", bpm:140, subdivision:8, difficulty:"medium", bars:68, audioOffsetMs:720, desc:"피아노 행진 악센트 전투", lessonTitle:"TURKISH MARCH", lessonHint:"피아노 프레이즈 끝의 스킬 노트를 노리세요", reward:145, ringCount:2 },
  { id:"plasma-gun", name:"Plasma Gun", audioFile:"o2jam/plasma-gun.m4a", patternId:"firebeat", bpm:160, subdivision:16, difficulty:"hard", bars:39, audioOffsetMs:300, desc:"짧고 강한 전자음 보스 러시", lessonTitle:"PLASMA GUN", lessonHint:"밀집 노트를 공격-회피-스킬로 연결하세요", reward:170, ringCount:2 },
  { id:"dual-racing", name:"Dual Racing RED vs BLUE", audioFile:"o2jam/dual-racing.m4a", patternId:"sixteen-mix", bpm:165, subdivision:16, difficulty:"hard", bars:79, audioOffsetMs:540, desc:"두 테마가 교차하는 고속 결전", lessonTitle:"DUAL RACING", lessonHint:"RED 공격과 BLUE 방어 구절을 교대하세요", reward:195, ringCount:2 },
  { id:"black-city-beat", name:"Black City Beat", audioFile:"o2jam/black-city-beat.m4a", patternId:"boots-cats", bpm:95, subdivision:8, difficulty:"easy", bars:43, audioOffsetMs:1100, desc:"묵직한 록 그루브 입문전", lessonTitle:"BLACK CITY BEAT", lessonHint:"느린 킥을 정확히 눌러 재료 콤보를 만드세요", reward:100, ringCount:1 },
  { id:"andromeda", name:"Andromeda", audioFile:"o2jam/andromeda.m4a", patternId:"firebeat", bpm:147, subdivision:16, difficulty:"hard", bars:75, audioOffsetMs:880, desc:"우주 신스와 고밀도 테크노", lessonTitle:"ANDROMEDA", lessonHint:"16비트 구간은 모든 노트보다 핵심 악센트를 우선하세요", reward:185, ringCount:2 },
  { id:"one-more-time", name:"1 More Time", audioFile:"o2jam/one-more-time.m4a", patternId:"eight-basic", bpm:125, subdivision:8, difficulty:"medium", bars:89, audioOffsetMs:900, desc:"반복 구절을 성장시키는 장기전", lessonTitle:"1 MORE TIME", lessonHint:"반복될수록 공격-방어 패턴이 확장됩니다", reward:155, ringCount:2 },
  { id:"duel", name:"Duel", audioFile:"o2jam/duel.m4a", patternId:"sixteen-mix", bpm:150, subdivision:16, difficulty:"hard", bars:77, audioOffsetMs:650, desc:"공격과 반격이 교차하는 결투", lessonTitle:"DUEL", lessonHint:"방어 직후 스킬 노트로 반격하세요", reward:190, ringCount:2 },
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

export function buildChart(track: BeatTrackDef): BeatChartStep[] {
  const loop = expandLoop(PATTERN_LOOPS[track.patternId], track.subdivision);
  const stepsPerBar = track.subdivision;
  const total = track.bars * stepsPerBar;
  const chart: BeatChartStep[] = new Array(total);
  let lane: 0 | 1 = 0;
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

  for (let i = 0; i < total; i++) {
    let sound = loop[i % loop.length];
    const inBar = i % stepsPerBar;
    let spike = accentSpike(sound, inBar, track.subdivision, track.difficulty);
    if (i < Math.max(2, offsetSteps)) spike = false;
    if (spike) {
      // 곡마다 시작 레인을 다르게 하고, 같은 레인이 연속 낙하하지 않도록
      // 킥·스네어·하이햇·베이스를 구절 단위로 순환한다.
      const noteLane = lanePhrase[(accentOrdinal + trackOffset) % lanePhrase.length] as 0 | 1 | 2 | 3;
      const pool = laneSounds[noteLane];
      sound = pool[(Math.floor(accentOrdinal / lanePhrase.length) + accentOrdinal) % pool.length];
      accentOrdinal += 1;
    }
    if (spike && track.ringCount === 2 && track.difficulty === "hard") {
      lane = (Math.floor(i / Math.max(1, track.subdivision / 4)) % 2) as 0 | 1;
    } else {
      lane = 0;
    }
    chart[i] = { sound, spike, lane };
  }
  let noteOrdinal = 0;
  for (let i = 0; i < chart.length; i++) {
    const step = chart[i];
    if (!step.spike) continue;
    noteOrdinal += 1;
    if (track.difficulty === "hard") step.trick = noteOrdinal % 11 === 0 ? "late" : noteOrdinal % 7 === 0 ? "ghost" : undefined;
    else if (track.difficulty === "medium" && noteOrdinal % 13 === 0) step.trick = "flash";
    const longEvery = track.difficulty === "easy" ? 11 : track.difficulty === "medium" ? 9 : 8;
    if (noteOrdinal % longEvery !== 0) continue;
    const holdSteps = track.difficulty === "easy" ? 2 : track.difficulty === "medium" ? 3 : 4;
    step.holdSteps = holdSteps;
    for (let tail = 1; tail < holdSteps && i + tail < chart.length; tail++) {
      chart[i + tail] = { ...chart[i + tail], sound:step.sound, spike:true, holdTail:true, trick:undefined };
    }
    i += holdSteps - 1;
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
