export type GameState = "ready" | "intro" | "playing" | "clear" | "gameover";

export type PlayerAnim = "idle" | "run" | "jump" | "fall" | "dash" | "skill" | "hit" | "dead";

export type Player = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Collision radius (torso). */
  radius: number;
  onGround: boolean;
  facing: 1 | -1;
  anim: PlayerAnim;
  animTime: number;
  invulnMs: number;
  hp: number;
  maxHp: number;
  /** Fractional damage accumulated by weakened split arrows. */
  damageBuffer: number;
  dashCdMs: number;
  dashActiveMs: number;
  slowCdMs: number;
  slowActiveMs: number;
  landingFxMs: number;
};

export type Arrow = {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Visual length in px. */
  length: number;
  /** Tip hit radius. */
  hitRadius: number;
  /** Movement angle in radians. */
  angle: number;
  /** Near-miss scored once per arrow. */
  nearMissed: boolean;
  warningMs: number;
  kind: "normal" | "aimed" | "fan" | "ricochet" | "explosive" | "homing";
  bounces: number;
  telegraph: "sniper" | "blast" | "charge" | "aerial" | "dash" | "perfect" | "homing";
  homingMs: number;
  homingTurnRate: number;
  /** Number of times this projectile has been cut by the player's slash. */
  splitLevel: 0 | 1 | 2 | 3;
  /** Damage is reduced every time the arrow is split. */
  damage: number;
  /** 정타로 반사된 화살 — 플레이어를 해치지 않고 화면 밖으로 나가면 궁수 처치로 친다 */
  reflected: boolean;
  /** Brief spherical orbit before a split fragment homes back toward the player. */
  orbitMs: number;
  orbitX: number;
  orbitY: number;
  orbitAngle: number;
  orbitRadius: number;
  orbitDirection: -1 | 1;
  orbitStretch: number;
  orbitWobble: number;
  orbitDriftX: number;
  orbitDriftY: number;
  /** Prevents one slash window from splitting the same fragment repeatedly. */
  splitGraceMs: number;
  boss: boolean;
  bossTier: number;
  bossCutsLeft: number;
  bossMaxCuts: number;
};

export type SlashHitFx = {
  active: boolean;
  x: number;
  y: number;
  value: number;
  lifeMs: number;
  maxLifeMs: number;
  boss: boolean;
  /** 치명 반격 — 숫자 색·크기가 달라진다 (메이플식 피드백) */
  crit: boolean;
  /** 화살 에너지 0~1 — 빠르고 위험한 화살일수록 높다. 색 등급·오브 지속에 반영 */
  energy: number;
};

export type SlashDrop = {
  active: boolean;
  x: number;
  y: number;
  vy: number;
  kind: "edge" | "core" | "rune";
};

export type Platform = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type ArrowPatternKind =
  | "rain"
  | "side"
  | "cross"
  | "sweep"
  | "burst"
  | "aimed"
  | "fan"
  | "ricochet"
  | "explosive"
  | "rest";

export type ArrowPattern = {
  kind: ArrowPatternKind;
  /** Start offset within the stage (ms). */
  atMs: number;
  durationMs: number;
  spawnMs?: number;
  speed?: number;
};

export type StageDef = {
  id: number;
  name: string;
  /** Survive this long to clear. */
  durationMs: number;
  baseReward: number;
  speedMul: number;
  spawnMul: number;
  patterns: ArrowPattern[];
  /** Platforms in normalized coords (0–1 of playfield). */
  platforms: Array<{ x: number; y: number; w: number; h: number }>;
  intro: string;
};

export type ShopUpgradeId =
  | "moveSpeed"
  | "jumpPower"
  | "dash"
  | "slowField"
  | "extraLife";

export type ShopLevels = Record<ShopUpgradeId, number>;

export type PlayerStats = {
  moveSpeed: number;
  jumpPower: number;
  dashUnlocked: boolean;
  dashSpeed: number;
  dashDurationMs: number;
  dashCooldownMs: number;
  dashIFramesMs: number;
  slowUnlocked: boolean;
  slowRadius: number;
  slowFactor: number;
  slowDurationMs: number;
  slowCooldownMs: number;
  /** Counter-sword item level; controls split weakening and orbit disruption. */
  slashLevel: number;
  extraLives: number;
  hitboxScale: number;
};

export type GameWorld = {
  width: number;
  height: number;
  dpr: number;
  safeTop: number;
  safeBottom: number;
  safeLeft: number;
  safeRight: number;
  player: Player;
  arrows: Arrow[];
  platforms: Platform[];
  spawnAccMs: number;
  /** Time inside current stage. */
  stageElapsedMs: number;
  /** Global run timer (score). */
  elapsedMs: number;
  dodged: number;
  score: number;
  stageIndex: number;
  stageClear: boolean;
  floorY: number;
  stats: PlayerStats;
  animClock: number;
  /** Near-miss / tight dodge streak. */
  combo: number;
  maxCombo: number;
  comboTimerMs: number;
  /** 검격으로 쳐낸 투사체 수와 회수한 원정 보급품. */
  countered: number;
  supplies: number;
  enemyKills: number;
  perfectDodges: number;
  chests: number;
  expeditionSeals: number;
  slashScore: number;
  slashBuff: number;
  /** 참격 게이지 0~100 — 반사 +22 · 파쇄 +9 · 근접 회피 +4. 가득 차면 일섬 (docs/CONTENT_BEAT_DODGE_PLAN.md §2) */
  slashGauge: number;
  /** 일섬 섬광 남은 ms */
  ultFlashMs: number;
  /** 반사로 처치한 궁수 수 · 일섬 횟수 */
  reflectKills: number;
  ultCount: number;
  /** 마지막 베기 결과 (HUD 문구) */
  lastCut: "" | "reflect" | "shatter" | "ult";
  lastCutMs: number;
  slashHitFx: SlashHitFx[];
  slashDrops: SlashDrop[];
  /** 마지막 피격 원인 — 게임오버 화면의 "다음엔 이렇게" 팁 근거 (RETENTION G) */
  lastHitCause: "normal" | "aimed" | "fan" | "ricochet" | "explosive" | "homing" | "boss" | "fragment" | "";
  bossSpawned: boolean;
  bossDefeated: boolean;
  bossCutsLeft: number;
  bossMaxCuts: number;
};
