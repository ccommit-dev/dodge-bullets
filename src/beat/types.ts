export type BeatSubdivision = 4 | 8 | 16;
export type BeatDifficulty = "easy" | "medium" | "hard";

/** Beatbox syllables (synthesized homage techniques — not copyrighted recordings). */
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
  playerAngle: number;
  playerLane: 0 | 1;
  direction: 1 | -1;
  angularSpeed: number;
  spikes: BeatSpike[];
  particles: BeatParticle[];
  elapsedMs: number;
  durationMs: number;
  bpm: number;
  subdivision: BeatSubdivision;
  difficulty: BeatDifficulty;
  stepSec: number;
  /** Silent metronome index (obstacles). */
  stepIndex: number;
  stepAccSec: number;
  /** How far the player has performed with moves. */
  performIndex: number;
  score: number;
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
  /** Last triggered sound label for HUD. */
  lastSound: BeatSound | null;
  nextSound: BeatSound;
  timingHint: number;
  judgeText: "PERFECT" | "GREAT" | "GOOD" | "CLUTCH" | "MISS" | "";
  judgeMs: number;
  /** Campaign stage index 0..5 */
  stageIndex: number;
  /** Brief "STAGE N" banner without stopping play */
  stageBannerMs: number;
  stageBannerText: string;
  /** Camera punch on reverse */
  zoomPulse: number;
};

export type BeatChartStep = {
  sound: BeatSound;
  spike: boolean;
  lane: 0 | 1;
};

export const BEAT_SOUND_LABEL: Record<BeatSound, string> = {
  breath: "숨소리",
  firebeat: "파이어빗",
  trumpet: "트럼펫",
  boots: "부츠",
  cats: "캣츠",
  throat: "스로트",
  click: "클릭",
  rim: "림샷",
};
