export type BeatSubdivision = 4 | 8 | 16;
export type BeatDifficulty = "easy" | "medium" | "hard";

/** Beatbox syllables aligned with Bukbak-style beginner lessons. */
export type BeatSound =
  | "breath"
  | "firebeat"
  | "trumpet"
  | "boots"
  | "cats"
  | "throat"
  | "click"
  | "rim";

export type BeatSpike = {
  active: boolean;
  angle: number;
  lane: 0 | 1;
  ageMs: number;
  nearMissed: boolean;
};

export type BeatParticle = {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  lifeMs: number;
  maxLifeMs: number;
  size: number;
  hue: number;
};

export type RingSkinId = "neon" | "gold" | "magenta" | "ice" | "ember";
export type SpikeSkinId = "triangle" | "arrow" | "diamond" | "star" | "bolt";

export type BeatCosmetics = {
  ringSkin: RingSkinId;
  spikeSkin: SpikeSkinId;
  ownedRings: RingSkinId[];
  ownedSpikes: SpikeSkinId[];
};

export type BeatWorld = {
  width: number;
  height: number;
  dpr: number;
  safeTop: number;
  safeBottom: number;
  safeLeft: number;
  safeRight: number;
  cx: number;
  cy: number;
  radius: number;
  laneGap: number;
  /** Dual orbit for medium/hard immersion. */
  ringCount: 1 | 2;
  playerAngle: number;
  playerLane: 0 | 1;
  direction: 1 | -1;
  angularSpeed: number;
  /** 3D ring orientation (radians). */
  ringYaw: number;
  ringPitch: number;
  ringRoll: number;
  spikes: BeatSpike[];
  particles: BeatParticle[];
  elapsedMs: number;
  durationMs: number;
  bpm: number;
  subdivision: BeatSubdivision;
  difficulty: BeatDifficulty;
  stepSec: number;
  stepIndex: number;
  stepAccSec: number;
  performIndex: number;
  score: number;
  scoreMultiplier: 1 | 2 | 3 | 5;
  feverMs: number;
  combo: number;
  maxCombo: number;
  comboTimerMs: number;
  hp: number;
  maxHp: number;
  invulnMs: number;
  dead: boolean;
  cleared: boolean;
  beatPulse: number;
  shakeMs: number;
  trackName: string;
  lessonTitle: string;
  lessonHint: string;
  lastSound: BeatSound | null;
  nextSound: BeatSound;
  timingHint: number;
  judgeText: "PERFECT" | "GREAT" | "GOOD" | "CLUTCH" | "MISS" | "";
  judgeMs: number;
  stageIndex: number;
  stageBannerMs: number;
  stageBannerText: string;
  zoomPulse: number;
  /** Clear fanfare countdown before UI takes over. */
  clearFxMs: number;
  cosmetics: BeatCosmetics;
  /** Chart copy used by the 3D timing rail renderer. */
  chart: BeatChartStep[];
  /** Successful player layers by syllable. */
  loopCounts: Record<BeatSound, number>;
  /** Last lead offset from grid in milliseconds. */
  lastOffsetMs: number;
  /** 누르는 중인 롱노트 (렌더용) — 레인/꼬리 스텝, 없으면 -1 */
  holdLane: number;
  holdEndStep: number;
  /** 0..1 lesson loop completion from distinct sounds recorded. */
  loopCompletion: number;
  /** Pad flash per lane (0=kick, 1=snare, 2=hat, 3=bass), milliseconds remaining. */
  laneFlashMs: number[];
  /** Chart indexes already consumed by the player. */
  hitSteps: Set<number>;
  /**
   * The one continuous playhead, in fractional chart steps. Notes, judgement
   * and the stage animation all read this so the stream never jumps.
   */
  beatPosition: number;
};

/** 0 = kick (B), 1 = hi-hat (T), 2 = snare (K) */
export type NoteLane = 0 | 1 | 2 | 3;

export const LANE_LABEL: Record<NoteLane, string> = {
  0: "KICK 공격",
  1: "SNARE 방어",
  2: "HAT 회피",
  3: "BASS 스킬",
};

/** Which syllables live on each pad, shown in the practice room. */
export const LANE_MEMBERS: Record<NoteLane, string> = {
  0: "검격 · 집중 공격",
  1: "방패 · 피해 경감",
  2: "회피 · 반격 준비",
  3: "합동 스킬 · 재료 보너스",
};

export const LANE_KEYS: Record<NoteLane, string> = {
  0: "A / ←",
  1: "S / ↓",
  2: "W / ↑",
  3: "D / →",
};

export type BeatChartStep = {
  sound: BeatSound;
  spike: boolean;
  lane: 0 | 1;
  /** 롱노트 길이(스텝). 머리에서 누르고 꼬리에서 떼야 한다. 0/undefined = 단타 */
  hold?: number;
  /** 곡 구간 — 인트로/빌드업/드롭/브레이크. 노트 밀도와 색의 근거 */
  section?: "intro" | "build" | "drop" | "break";
  /** 펌프형 롱노트의 머리에서 유지해야 하는 스텝 수. */
  holdSteps?: number;
  /** 롱노트 몸통. 같은 버튼을 누른 채 유지하면 연속 판정된다. */
  holdTail?: boolean;
  /** 난이도별 시야 트릭. 판정 레인은 바뀌지 않아 암기 강요를 줄인다. */
  trick?: "late" | "ghost" | "flash";
};

export const BEAT_SOUND_LABEL: Record<BeatSound, string> = {
  breath: "숨소리",
  firebeat: "파이어빗",
  trumpet: "트럼펫",
  boots: "킥(B)",
  cats: "하이햇(T)",
  throat: "스로트",
  click: "클릭",
  rim: "스네어(K)",
};

export const RING_SKIN_LABEL: Record<RingSkinId, string> = {
  neon: "네온 시안",
  gold: "골드 링",
  magenta: "마젠타 링",
  ice: "아이스 링",
  ember: "엠버 링",
};

export const SPIKE_SKIN_LABEL: Record<SpikeSkinId, string> = {
  triangle: "기본 삼각",
  arrow: "화살표 비트",
  diamond: "다이아 비트",
  star: "스타 비트",
  bolt: "볼트 비트",
};
