import type { ChipMods } from "./chips";
import type { SkillFx, SkillShot } from "./skillShots";
import type { ExpeditionSkillId, ExpeditionSkillLevels, RangedWeaponId } from "./skills";
export type GameState = "ready" | "intro" | "playing" | "paused" | "perk" | "clear" | "gameover";

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
  /** 빙결 파동에 얼어붙은 남은 시간(ms) — 콤보 카드가 이걸 보고 추가 효과를 낸다 (2026-09-28) */
  chilledMs: number;
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

/** 베기 파편 — 파쇄된 화살의 두 토막·불꽃·검광. 순수 연출(충돌 없음) */
export type SlashDebris = {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  spin: number;
  len: number;
  lifeMs: number;
  maxLifeMs: number;
  kind: "tip" | "tail" | "spark" | "streak";
  color: string;
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

/**
 * 런 강화 카드가 쌓는 값 (2026-09-28). 영구 스킬 레벨과 달리 런이 끝나면 초기화된다.
 * 카드가 하나도 안 뜬 상태(전부 0/false)가 기존 난이도 기준선이다.
 */
export type RunMods = {
  /** 기본 사격 발수 +N */
  shotExtra: number;
  /** 기본 화살이 추가로 더 꿰는 화살 수 */
  shotPierce: number;
  /** 불화살 폭발 반경 배수 */
  fireRadiusMul: number;
  /** 물화살 관통 +N */
  waterPierceExtra: number;
  /** 얼음화살 감속을 더 깊게 (배수를 이만큼 더 낮춘다) */
  iceSlowBonus: number;
  /** 흙화살 위력 +N */
  earthPowerBonus: number;
  /** 번개화살 연쇄 +N */
  boltExtra: number;
  /** [과부하]·[속사] — 모든 화살 재사용 배수 */
  cooldownMul: number;
  /** 콤보 — 얼어붙은 화살을 부수면 일섬 게이지를 더 준다 */
  chillHunt: boolean;
  /** 콤보 — 불화살이 얼어붙은 화살을 함께 터뜨리면 폭발이 넓어진다 */
  chillBurst: boolean;
  /**
   * 진화 — 스킬마다 **하나만** 고를 수 있는 분기. 작동 방식 자체가 바뀐다.
   * basic 은 기본 사격(무기의 것)이다 (2026-09-29)
   */
  evolutions: { basic?: "beam" | "seeker"; fire?: "cluster" | "pyre"; ice?: "shatter" | "lingering" };
  /**
   * 스탯을 건드리는 카드도 여기 남긴다 — 스테이지가 넘어갈 때 applyStats 가 상점 값으로
   * 덮어쓰므로, 다시 얹지 않으면 "이번 런 동안"이 거짓말이 된다 (2026-09-28)
   */
  moveSpeedMul: number;
  dashCooldownMul: number;
  slashLevelBonus: number;
  maxHpBonus: number;
};

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
  /** 일섬 게이지 0~100 — 반사 +22 · 파쇄 +9 · 근접 회피 +4. 가득 차면 일섬 (docs/CONTENT_BEAT_DODGE_PLAN.md §2) */
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
  /** 베기 파편 풀 — 파쇄 시 화살이 두 토막으로 쪼개져 날아가는 것이 보여야 한다 */
  slashDebris: SlashDebris[];
  /** 활 사격 — 날아가는 화살 (game/skillShots.ts) */
  skillShots: SkillShot[];
  /** 명중 이펙트 — 속성별 색 폭발 */
  skillFx: SkillFx[];
  /** 기본 사격 남은 재사용(초) — 무기만 있으면 항상 돈다 */
  basicTimer: number;
  /** 활 반동 연출 남은 시간(ms) · 쏜 방향 — player.ts 가 무기를 기울이고 시위를 그린다 */
  shotFlashMs: number;
  shotAngle: number;
  /** 번개화살 연쇄 선 — 쏜 자리에서 표적들로. ms 가 0 이 되면 사라진다 */
  boltFrom: { x: number; y: number; ms: number; targets: Array<{ x: number; y: number }> } | null;
  /** 스킬 레벨 — 런 시작 때 진행도에서 복사한다. 0 이면 그 스킬은 아무것도 하지 않는다 */
  skillLevels: ExpeditionSkillLevels;
  /** 스킬별 남은 쿨타임(초) */
  skillTimers: Record<ExpeditionSkillId, number>;
  /** 장착한 원거리 무기 — 계열이 맞는 스킬의 쿨타임을 줄인다 */
  rangedWeapon: RangedWeaponId;
  /** 이번 런에서 스킬로 떨어뜨린 화살 수 (결과 화면) */
  skillKills: number;
  /** 이번 런에서 고른 에픽 카드 수 — 일일 임무가 센다 (2026-09-28) */
  epicPicks: number;
  /** [정예 선발] 소모품 — 다음 3택을 전부 레어 이상으로. 한 번 쓰면 꺼진다 */
  draftBoost: boolean;
  /** [예비 화살통] 소모품 — 남은 동안 모든 스킬 재사용이 짧다 (ms) */
  primedMs: number;
  /** 런 중 강화 카드가 쌓은 스킬 진화 — 런이 끝나면 사라진다 (game/perks.ts) */
  runMods: RunMods;
  /**
   * 장착한 원정 칩이 만들어 내는 값 (game/chips.ts) — 카드와 달리 **무작위가 아니고**
   * 런 내내 고정이다. 출격 적재(loadLoadout)에서 매번 다시 싣는다
   */
  chips: ChipMods;
  /** 마지막 피격 원인 — 게임오버 화면의 "다음엔 이렇게" 팁 근거 (RETENTION G) */
  lastHitCause: "normal" | "aimed" | "fan" | "ricochet" | "explosive" | "homing" | "boss" | "fragment" | "";
  bossSpawned: boolean;
  bossDefeated: boolean;
  bossCutsLeft: number;
  bossMaxCuts: number;
  /** 런 성장 (계획안 §23·§24) — 베기·회피로 XP, 레벨업마다 성장 선택. tempo 는 레벨에 따라 화살 속도·빈도를 올린다 (실력 요소) */
  runXp: number;
  runLevel: number;
  /** 아직 UI 가 소비하지 않은 레벨업 수 */
  levelUps: number;
  tempo: number;
};
