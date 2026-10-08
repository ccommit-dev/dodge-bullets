import { getStage } from "./stages";
import { BASIC_SHOT_COOLDOWN, gaugeGainMul } from "./skills";
import { bossCutsFor, gainRunXp } from "./world";
import { bossPatternFor } from "./bossPatterns";
import { loadoutElements, rollDodgeWeak } from "./bossWeak";
import type { Arrow, ArrowPattern, GameWorld } from "./types";

const POOL_SIZE = 260;   // 120 → 260: 몬스터가 3배 느려져 화면에 오래 머문다 — 풀이 마르면 생성이 조용히 빠져 쉬워 보인다
const ARROW_LEN = 28;
const HIT_R = 5;
/** Tip within this band (beyond hit radius) counts as near-miss. */
const COMBO_WINDOW_MS = 1600;
const SPLIT_ORBIT_MS = 1_325;
const SPLIT_DAMAGE = [1, 0.65, 0.4, 0.25] as const;

export function createArrowPool(size = POOL_SIZE): Arrow[] {
  const pool: Arrow[] = new Array(size);
  for (let i = 0; i < size; i++) {
    pool[i] = {
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      length: ARROW_LEN,
      hitRadius: HIT_R,
      angle: Math.PI / 2,
      nearMissed: false,
      warningMs: 0,
      kind: "normal",
      bounces: 0,
      telegraph: "aerial",
      homingMs: 0,
      homingTurnRate: 0,
      splitLevel: 0,
      damage: 1,
      reflected: false,
      hp: 0,
      maxHp: 0,
      hitFlashMs: 0,
      chilledMs: 0,
      poisonMs: 0,
      poisonDps: 0,
      orbitMs: 0,
      orbitX: 0,
      orbitY: 0,
      orbitAngle: 0,
      orbitRadius: 0,
      orbitDirection: 1,
      orbitStretch: 1,
      orbitWobble: 0,
      orbitDriftX: 0,
      orbitDriftY: 0,
      splitGraceMs: 0,
      boss: false,
      bossTier: 0,
      bossCutsLeft: 0,
      bossMaxCuts: 0,
      bossEntering: false,
      fromBoss: false,
      atBarrier: false,
      barrierHitMs: 0,
      barrierVy: 0,
    };
  }
  return pool;
}

/* ────────────────── 방어막 (2026-10-01, 아웃로 디펜스 차용) ──────────────────
 * 몬스터는 플레이어가 아니라 **방어막**을 향해 걸어 내려온다. 방어막에 닿으면 멈춰 서서 주기마다 HP 를 깎고,
 * 2026-10-02 부터 방어막이 **유일한 생명**이다 — 0 이 되면 패배. 회복은 없고(스테이지 시작에만 가득), 생명(+1)은 방어막 +15% 로 바뀐다.
 * 대장 마력탄·조각도 플레이어가 아니라 돔에 맞는다. 할 일은 "방어막이 깨지기 전에 떨구기" 하나다.
 * (옛 규칙: 붕괴하면 주인공 HP −1 · 방어막 즉시 복구 · 붙은 몬스터가 없으면 초당 4 회복 — HP 하트가 너무 많다는 피드백으로 걷어 냈다) */
/**
 * 조정 손잡이 — 방어막 모델의 밸런스 값은 전부 여기. 시뮬(dodge-sim)이 스윕할 때 이 표만 바꾼다 (소스 수정 없이).
 * 게임은 런 시작마다 읽으므로 한 런 안에서는 고정이다
 */
export const TUNING = {
  monsterSpeedMul: 0.14,     // 0.6 → 0.42 → 0.14 (2026-10-02, 사용자: "3배 느리되 난이도 높게") — 대신 수·체력·피해로 압박한다
  spawnScale: 1.4,           // 생성 간격 배수 — 1.8 → 1.4: 느려진 만큼 촘촘히, "너무 쉽다"에 맞춰 (스윕 2026-10-02)
  barrierHp: 120,
  barrierHitMs: 1200,        // 붙은 몬스터의 공격 주기
  barrierDmgMul: 0.65,       // 종류별 방어막 피해 배수 — 0.5 → 0.65 (1 이면 S2 부터 벽, 0.5 는 S1 이 긁히지도 않았다)
  /**
   * 진행 속도 (2026-10-02, 사용자: "성벽원정 전반적으로 진행속도가 너무 빠름 3배는 느리게") — 몬스터·대장·화살·스테이지 시계가
   * 실제 시간의 1/3 로 흐른다(world.updateWorld). 주인공 이동만 실제 시간이라 조작은 그대로 빠르다.
   * 균형은 월드 시간 기준이라 그대로 — 대신 스테이지가 3배 길다. 시뮬은 실제 dt 를 (1/60)/pace 로 넣어 월드 한 걸음을 같게 잰다
   */
  pace: 1 / 3,
  /** 대장 하강 속도(월드 px/s) — "내려오는 속도는 완전 느리게" (실제로는 pace 배 더 느리다) */
  bossDescent: 18,
  /** 대장이 살아 있는 동안 생성 간격 배수 */
  bossSpawnSlow: 1.6,
  barrierRegen: 0,           // 방어막이 유일한 생명이 된 뒤(2026-10-02)에는 저절로 차지 않는다 — 스테이지마다 가득 찬다
  barrierPerLife: 0.15,      // 예전 "최대 HP +1" 하나가 방어막 +15% (성장 · 견갑 · 활력 칩 · 수호 부적 · 성장 카드)
  bossOrbDmg: 8,            // 대장 마력탄이 돔에 맞는 피해
  /** @deprecated 스테이지 표(stages.ts spawnScale)로 옮겼다 — 시뮬 스윕이 덮어쓰는 이름만 남긴다 */
  stageSpawnScale: [1, 1, 1, 1] as number[],   // 스테이지별 생성 간격 배수 — 1 보다 크면 드물게. S1·S2 는 촘촘히(방어막이 실제로 깎이게), S3 은 비룡·폭발이 세서 드물게 (스윕 2026-10-02)
  basicCooldown: BASIC_SHOT_COOLDOWN,
  bossCutMul: 3,             // 보스 격추 수 배수 — 무기가 실제 시간으로 쏘는 만큼 ×3 (2026-10-02 pace)
};
export const BARRIER_OFFSET = 150;          // 바닥선에서 위로 — 주인공 머리·무기 정령보다 위
export const BARRIER_BREACH_MS = 900;       // 붕괴 연출 시간
const BARRIER_STAND = 22;                   // 몬스터 중심이 띠에서 이만큼 위에 선다
export function barrierY(world: GameWorld): number { return world.floorY - BARRIER_OFFSET; }
/** 돔의 가로 반지름 — 화면 폭의 0.62배. 가장자리(x=safeLeft)에서 돔 높이는 꼭대기의 60% 쯤 */
export function barrierRx(world: GameWorld): number { return world.width * 0.62; }
/**
 * 돔(반원) 방어막 (2026-10-02, 황야의 무법자) — 띠가 아니라 주인공을 덮는 반타원. x 에 따라 닿는 높이가 다르다:
 * 가운데가 가장 높고(바닥선 −150) 가장자리로 갈수록 낮다. 몬스터는 자기 x 의 돔 표면에서 멈춘다
 */
export function barrierYAt(world: GameWorld, x: number): number {
  const cx = world.width * 0.5, rx = barrierRx(world), ry = BARRIER_OFFSET;
  const k = Math.max(0, 1 - ((x - cx) / rx) ** 2);
  return world.floorY - ry * Math.sqrt(k);
}
/** 종류별 방어막 피해 — 덩치가 클수록 세다. 드래곤은 터지며 한 번에 크게(자폭) */
export function barrierDamageOf(a: Pick<Arrow, "kind">): number {
  return a.kind === "explosive" ? 14 : a.kind === "ricochet" ? 9 : a.kind === "homing" ? 8 : a.kind === "aimed" ? 7 : 5;
}
/**
 * 방어막 최대치 — 기본 × (1 + 15% × 추가 생명). 플레이어 HP 는 없다(2026-10-02): 예전 HP 를 올리던 모든 것(성장 · 오우거 견갑 · 활력 칩 ·
 * 수호 부적 · 성장 카드)이 player.maxHp 를 올리고, 그 '추가 생명'만큼 방어막이 두꺼워진다
 */
export function barrierMaxFor(world: GameWorld): number {
  const lives = Math.max(0, world.player.maxHp - 3);
  return Math.round(TUNING.barrierHp * (1 + TUNING.barrierPerLife * lives));
}
/** 런 중에 생명이 늘면(수호 부적 · 성장 카드) 최대치와 현재치를 같이 올린다 */
export function syncBarrierLives(world: GameWorld): void {
  const next = barrierMaxFor(world);
  world.barrierHp = Math.min(next, world.barrierHp + Math.max(0, next - world.barrierMaxHp));
  world.barrierMaxHp = next;
}
export function resetBarrier(world: GameWorld): void {
  world.barrierMaxHp = barrierMaxFor(world);
  world.barrierHp = world.barrierMaxHp;
  world.barrierDownMs = 0;
  world.barrierFlashMs = 0;
  world.barrierHitX = world.width * 0.5;
  world.barrierBreaks = 0;
  world.barrierHits = 0;
  world.barrierBreachDamage = 0;
}
function hitBarrier(world: GameWorld, a: Arrow, damage = barrierDamageOf(a)): void {
  world.barrierHp = Math.max(0, world.barrierHp - damage * TUNING.barrierDmgMul * getStage(world.stageIndex).barrierDmgMul);
  world.lastHitCause = a.fromBoss ? "boss" : a.splitLevel > 0 ? "fragment" : a.kind;
  world.barrierFlashMs = 220;
  world.barrierHitX = a.x;
  world.barrierHits += 1;
  world.sfx.thud += 1;
  if (world.barrierHp <= 0 && world.barrierBreaks === 0) {
    // 방어막 붕괴 = 패배 (유일한 생명). 붕괴 고리를 그리고 세계가 한 박자 멈춘다
    world.barrierBreaks = 1;
    world.barrierDownMs = BARRIER_BREACH_MS;
    world.hitStopMs = Math.max(world.hitStopMs, 160);
    world.shakeMs = Math.max(world.shakeMs, 360); world.shakeAmp = Math.max(world.shakeAmp, 7);
    world.sfx.boom += 1;
  }
}
export function updateBarrier(world: GameWorld, dtSec: number): void {
  world.barrierFlashMs = Math.max(0, world.barrierFlashMs - dtSec * 1000);
  world.barrierDownMs = Math.max(0, world.barrierDownMs - dtSec * 1000);
  if (world.barrierHp > 0 && TUNING.barrierRegen > 0 && !world.arrows.some((a) => a.active && a.atBarrier)) world.barrierHp = Math.min(world.barrierMaxHp, world.barrierHp + TUNING.barrierRegen * dtSec);
}

export function resetArrows(world: GameWorld): void {
  for (let i = 0; i < world.arrows.length; i++) {
    world.arrows[i].active = false;
    world.arrows[i].nearMissed = false;
  }
  world.spawnAccMs = 0;
}

function acquire(world: GameWorld): Arrow | null {
  for (let i = 0; i < world.arrows.length; i++) {
    if (!world.arrows[i].active) return world.arrows[i];
  }
  return null;
}

function activate(
  arrow: Arrow,
  x: number,
  y: number,
  vx: number,
  vy: number,
  kind: Arrow["kind"] = "normal",
  warningMs = 400,
): void {
  arrow.active = true;
  arrow.x = x;
  arrow.y = y;
  arrow.vx = vx;
  arrow.vy = vy;
  arrow.length = ARROW_LEN;
  arrow.hitRadius = HIT_R;
  arrow.angle = Math.atan2(vy, vx);
  arrow.nearMissed = false;
  arrow.warningMs = warningMs;
  arrow.kind = kind;
  arrow.bounces = kind === "ricochet" ? 1 : 0;
  arrow.hitRadius = kind === "explosive" ? 10 : HIT_R;
  arrow.length = kind === "explosive" ? 36 : ARROW_LEN;
  arrow.telegraph = kind === "aimed" ? "sniper" : kind === "explosive" ? "blast" : kind === "ricochet" ? "dash" : kind === "fan" ? "perfect" : kind === "normal" && Math.abs(vx) > Math.abs(vy) ? "charge" : "aerial";
  arrow.homingMs = 0;
  arrow.homingTurnRate = 0;
  // Spawn variation keeps repeated patterns from becoming a memorised wall.
  // Homing rounds remain readable thanks to their longer purple telegraph.
  const velocityJitter = 0.88 + Math.random() * 0.26;
  const angleJitter = 0;   // 1자 하강 — 기울기 없음 (2026-10-02)
  const speed = Math.hypot(arrow.vx, arrow.vy) * velocityJitter;
  const heading = Math.atan2(arrow.vy, arrow.vx) + angleJitter;
  arrow.vx = Math.cos(heading) * speed;
  arrow.vy = Math.sin(heading) * speed;
  arrow.angle = heading;
  if ((kind === "normal" || kind === "aimed" || kind === "fan") && Math.random() < currentHomingChance) {
    arrow.kind = "homing";
    arrow.telegraph = "homing";
    arrow.warningMs = Math.max(warningMs, 680);
    // 달빛 늑대왕 — 휘지 않는다(1자 하강, 2026-10-02). 승격은 "정예 한 마리"(방어막 피해 8)라는 뜻만 남는다
    arrow.homingMs = 0;
    arrow.homingTurnRate = 0;
    arrow.hitRadius = HIT_R + 1;
  }
  arrow.splitLevel = 0;
  arrow.reflected = false;
  arrow.hp = 0; arrow.maxHp = 0; arrow.hitFlashMs = 0;   // 체력은 처음 맞을 때 그 스테이지 값으로 채운다
  arrow.chilledMs = 0;
  arrow.poisonMs = 0;
  arrow.poisonDps = 0;
  arrow.damage = SPLIT_DAMAGE[0];
  arrow.orbitMs = 0;
  arrow.orbitX = x;
  arrow.orbitY = y;
  arrow.orbitAngle = 0;
  arrow.orbitRadius = 0;
  arrow.orbitDirection = 1;
  arrow.orbitStretch = 1;
  arrow.orbitWobble = 0;
  arrow.orbitDriftX = 0;
  arrow.orbitDriftY = 0;
  arrow.splitGraceMs = 0;
  arrow.boss = false;
  arrow.bossTier = 0;
  arrow.fromBoss = false;
  arrow.atBarrier = false;
  arrow.barrierHitMs = 0;
  arrow.barrierVy = 0;
  arrow.bossCutsLeft = 0;
  arrow.bossMaxCuts = 0;
  arrow.bossEntering = false;
}

function activePattern(world: GameWorld): ArrowPattern | null {
  const stage = getStage(world.stageIndex);
  const t = world.stageElapsedMs;
  for (let i = 0; i < stage.patterns.length; i++) {
    const p = stage.patterns[i];
    if (t >= p.atMs && t < p.atMs + p.durationMs) return p;
  }
  return null;
}

/** 유도탄 승격 확률 — 스테이지별. 유도탄은 뒤로 돌아 들어와 "앞쪽만 벤다" 규칙과 가장 충돌하므로 1스테이지엔 없다 (봇 시뮬 피격 1위) */
export function homingChanceFor(stageIndex: number): number {
  // 스테이지 표의 값 — 1장(초원)엔 없고 장이 깊을수록 오른다 (2026-10-02)
  return getStage(Math.max(0, stageIndex)).homingChance;
}
let currentHomingChance = 0.13;

function spawnFromPattern(world: GameWorld, pattern: ArrowPattern): void {
  const stage = getStage(world.stageIndex);
  currentHomingChance = homingChanceFor(world.stageIndex);
  const speed = (pattern.speed ?? 220) * stage.speedMul * world.tempo * TUNING.monsterSpeedMul;
  const arrow = acquire(world);
  if (!arrow) return;

  const minX = world.safeLeft + 12;
  const maxX = world.width - world.safeRight - 12;
  const spanX = Math.max(1, maxX - minX);

  switch (pattern.kind) {
    case "rest":
      return;
    case "rain": {
      activate(arrow, minX + Math.random() * spanX, world.safeTop - 20, 0, speed);
      break;
    }
    // 아래 세 패턴은 예전에 옆에서 왔다 — 화살은 **위에서 아래로만** (2026-10-01). 모양만 다르게: 측면 기습은 모서리에서 비스듬히,
    // 교차 사격은 양쪽 모서리에서 엇갈려, 휩쓸기는 왼쪽에서 오른쪽으로(또는 반대로) 훑으며 떨어진다
    // 몬스터는 **1자로** 내려온다 (2026-10-02, 황야의 무법자) — 비스듬히 오던 측면·교차·부채·조준·튕김·폭발이 전부 수직.
    // 패턴의 차이는 "어디서 나오나"뿐: 측면은 가장자리, 교차는 양쪽, 조준·폭발은 플레이어 머리 위, 부채는 셋이 나란히
    case "side": {
      const fromLeft = Math.random() < 0.5;
      const x = fromLeft ? minX + spanX * (0.04 + Math.random() * 0.12) : maxX - spanX * (0.04 + Math.random() * 0.12);
      activate(arrow, x, world.safeTop - 20, 0, speed * 0.95);
      break;
    }
    case "cross": {
      if (Math.random() < 0.55) {
        activate(arrow, minX + Math.random() * spanX, world.safeTop - 20, 0, speed);
      } else {
        const fromLeft = Math.random() < 0.5;
        const x = fromLeft ? minX + spanX * (0.1 + Math.random() * 0.25) : maxX - spanX * (0.1 + Math.random() * 0.25);
        activate(arrow, x, world.safeTop - 20, 0, speed * 0.9);
      }
      break;
    }
    case "sweep": {
      const phase = ((world.stageElapsedMs / 1000) % 3) / 3;      // 3초에 한 번 왕복
      const t = phase < 0.5 ? phase * 2 : 2 - phase * 2;
      activate(arrow, minX + spanX * t, world.safeTop - 20, 0, speed * 1.05);
      break;
    }
    case "burst": {
      const cx = minX + Math.random() * spanX;
      activate(arrow, cx, world.safeTop - 20, 0, speed * 1.15);
      break;
    }
    case "aimed": {
      // 위쪽 어딘가에서 플레이어를 겨눈다 — 옆에서 오던 것을 위로 (2026-10-01)
      // 플레이어 머리 위에서 곧장 — "조준"은 나오는 자리가 플레이어를 따른다는 뜻
      const x = Math.max(minX, Math.min(maxX, world.player.x + world.player.vx * 0.28 + (Math.random() - 0.5) * 40));
      activate(arrow, x, world.safeTop - 20, 0, speed, "aimed", 800);
      break;
    }
    case "fan": {
      // 셋이 나란히 — 고블린 떼
      const originX = minX + 48 + Math.random() * Math.max(1, spanX - 96);
      for (let i = -1; i <= 1; i++) {
        const target = i === -1 ? arrow : acquire(world);
        if (!target) continue;
        activate(target, originX + i * 44, world.safeTop - 20 - Math.abs(i) * 18, 0, speed, "fan", 460);
      }
      break;
    }
    case "ricochet": {
      // 위 모서리에서 비스듬히 떨어지며 벽에 튕긴다 — 위로 되튀지는 않는다 (2026-10-01)
      // 오우거 — 느리고 단단하게 곧장 (벽 튕김 없음)
      activate(arrow, minX + Math.random() * spanX, world.safeTop - 20, 0, speed * 0.75, "ricochet", 500);
      arrow.bounces = 0;
      break;
    }
    case "explosive": {
      // 드래곤 — 플레이어 머리 위 근처에서 곧장
      const originX = Math.max(minX, Math.min(maxX, world.player.x + (Math.random() - 0.5) * 80));
      activate(arrow, originX, world.safeTop - 20, 0, speed * 0.86, "explosive", 560);
      break;
    }
  }
}


function bumpCombo(world: GameWorld): void {
  world.combo += 1;
  if (world.combo > world.maxCombo) world.maxCombo = world.combo;
  world.comboTimerMs = COMBO_WINDOW_MS;
}

function launchAtPlayer(world: GameWorld, arrow: Arrow, speed: number): void {
  const dx = world.player.x - arrow.x;
  const dy = world.player.y - arrow.y;
  const len = Math.max(1, Math.hypot(dx, dy));
  arrow.vx = (dx / len) * speed;
  arrow.vy = (dy / len) * speed;
  arrow.angle = Math.atan2(arrow.vy, arrow.vx);
}

function configureSplitFragment(
  world: GameWorld,
  arrow: Arrow,
  source: Arrow,
  level: 1 | 2 | 3,
  direction: -1 | 1,
  slashLevel: number,
): void {
  arrow.active = true;
  arrow.x = source.x;
  arrow.y = source.y;
  arrow.vx = 0;
  arrow.vy = 0;
  arrow.hp = 1; arrow.maxHp = 1; arrow.hitFlashMs = 0;   // 베어 낸 조각은 약하다 — 한 발이면 된다
  arrow.length = Math.max(12, ARROW_LEN - level * 4);
  arrow.hitRadius = Math.max(2.5, HIT_R - level * 0.65);
  arrow.angle = source.angle + direction * 0.48;
  arrow.nearMissed = false;
  arrow.warningMs = 0;
  arrow.kind = source.kind;
  arrow.bounces = 0;
  arrow.telegraph = source.telegraph;
  arrow.homingMs = source.kind === "homing" ? 1_350 + Math.random() * 650 : 0;
  arrow.homingTurnRate = source.kind === "homing" ? 1.5 + Math.random() * 1.2 : 0;
  arrow.splitLevel = level;
  const itemWeakening = Math.max(0.62, 1 - slashLevel * 0.065);
  arrow.damage = SPLIT_DAMAGE[level] * itemWeakening;
  arrow.orbitMs = SPLIT_ORBIT_MS + (Math.random() - 0.5) * 220;
  arrow.orbitX = source.x;
  arrow.orbitY = source.y;
  arrow.orbitAngle = source.angle + (direction < 0 ? 0 : Math.PI) + (Math.random() - 0.5) * 0.9;
  const mapOrbit = Math.min(world.width, world.height) * 0.1;
  arrow.orbitRadius = mapOrbit * (0.9 + Math.random() * 0.16) + level * 4;
  arrow.orbitDirection = direction;
  arrow.orbitStretch = 0.9 + Math.random() * 0.18;
  arrow.orbitWobble = 0.035 + Math.random() * 0.075;
  arrow.orbitDriftX = (Math.random() - 0.5) * 16;
  arrow.orbitDriftY = (Math.random() - 0.5) * 12;
  arrow.splitGraceMs = SPLIT_ORBIT_MS + 120;
  arrow.boss = false;
  arrow.bossTier = 0;
  arrow.fromBoss = false;
  arrow.atBarrier = false;
  arrow.barrierHitMs = 0;
  arrow.barrierVy = 0;
  arrow.bossCutsLeft = 0;
  arrow.bossMaxCuts = 0;
  arrow.bossEntering = false;
}

function pushDebris(world: GameWorld, kind: "tip" | "tail" | "spark" | "streak", x: number, y: number, vx: number, vy: number, angle: number, len: number, lifeMs: number, color: string): void {
  const d = world.slashDebris.find((item) => !item.active) ?? world.slashDebris[0];
  if (!d) return;
  d.active = true; d.kind = kind; d.x = x; d.y = y; d.vx = vx; d.vy = vy; d.angle = angle; d.len = len; d.lifeMs = lifeMs; d.maxLifeMs = lifeMs; d.color = color;
  d.spin = kind === "spark" ? 0 : (Math.random() - 0.5) * 16;
}

/**
 * 쪼개짐 연출 — "베었는데 그냥 사라진다"를 고친다. 파쇄는 화살이 검격 지점에서 두 토막(촉 쪽·깃 쪽)으로 갈라져
 * 검이 지나간 방향으로 튕겨 나가고, 반사·보스 베기는 불꽃만. 검광(streak)은 베인 자리에 남는 흰 선.
 */
export function spawnCutDebris(world: GameWorld, a: Arrow, mode: "shatter" | "reflect" | "boss"): void {
  const facing = world.player.facing;
  const cos = Math.cos(a.angle), sin = Math.sin(a.angle);
  const px = -sin, py = cos;
  const color = mode === "reflect" ? "#fde68a" : mode === "boss" ? "#fb7185" : "#67e8f9";
  // 검광: 화살 진행 방향에 직교하는 짧은 선 — 베인 자리
  pushDebris(world, "streak", a.x, a.y, 0, 0, a.angle + Math.PI / 2, mode === "boss" ? 34 : 26, 170, mode === "reflect" ? "#fef3c7" : "#f8fafc");
  if (mode === "shatter") {
    const half = a.length * 0.5;
    const fwd = Math.hypot(a.vx, a.vy) * 0.22;
    // 촉 토막은 검이 미는 쪽(플레이어 방향 → 바깥)으로, 깃 토막은 반대편으로 갈라진다
    const side = facing;
    pushDebris(world, "tip", a.x + cos * half * 0.5, a.y + sin * half * 0.5, px * 95 * side + cos * fwd + facing * 40, py * 95 * side - 120, a.angle, half, 620, color);
    pushDebris(world, "tail", a.x - cos * half * 0.5, a.y - sin * half * 0.5, -px * 85 * side + cos * fwd * 0.6 + facing * 20, -py * 85 * side - 90, a.angle, half, 620, color);
  }
  const sparks = mode === "reflect" ? 7 : mode === "boss" ? 5 : 5;
  for (let i = 0; i < sparks; i += 1) {
    const ang = Math.atan2(-a.vy, -a.vx) + (Math.random() - 0.5) * 1.6;
    const sp = 120 + Math.random() * 220;
    pushDebris(world, "spark", a.x, a.y, Math.cos(ang) * sp, Math.sin(ang) * sp - 60, ang, 3 + Math.random() * 4, 260 + Math.random() * 220, color);
  }
}

export function pushSlashFx(world: GameWorld, x: number, y: number, value: number, boss: boolean, crit = false, energy = 0, dx?: number): void {
  const fx = world.slashHitFx.find((item) => !item.active) ?? world.slashHitFx[0];
  if (!fx) return;
  fx.active = true;
  // dx 를 주면 결정적(스킬 처치 숫자 — 봇 시뮬 수열을 안 건드린다), 없으면 검격처럼 흔든다
  fx.x = x + (dx ?? (Math.random() - 0.5) * 18);
  fx.y = y - 8;
  fx.value = value;
  fx.lifeMs = boss ? 850 : crit ? 780 : 620;
  fx.maxLifeMs = fx.lifeMs;
  fx.boss = boss;
  fx.crit = crit;
  fx.energy = energy;
}

/**
 * 화살 에너지 0~1 — 반격 대미지와 오브 지속의 근거. 같은 110이 찍히던 것을
 * "무엇을 베었는가"로 갈라 읽히게 한다: 속도·종류·분열 단계·피해량이 오를수록 높다.
 */
export function arrowEnergy(arrow: Arrow): number {
  const speed = Math.hypot(arrow.vx, arrow.vy);
  const speedPart = Math.min(1, speed / 560);
  const kindPart = arrow.kind === "homing" ? 0.9 : arrow.kind === "explosive" ? 0.85 : arrow.kind === "ricochet" ? 0.7 : arrow.kind === "aimed" ? 0.55 : arrow.kind === "fan" ? 0.45 : 0.3;
  const damagePart = Math.min(1, arrow.damage / 1.2);
  const splitPart = arrow.splitLevel * 0.12;
  return Math.max(0, Math.min(1, speedPart * 0.35 + kindPart * 0.35 + damagePart * 0.2 + splitPart));
}

function maybeDropSlashItem(world: GameWorld, x: number, y: number, guaranteed = false): void {
  if (!guaranteed && Math.random() >= 0.09) return;
  const drop = world.slashDrops.find((item) => !item.active);
  if (!drop) return;
  const roll = Math.random();
  drop.active = true;
  drop.x = x;
  drop.y = y;
  drop.vy = -95;
  drop.kind = roll < 0.55 ? "edge" : roll < 0.86 ? "core" : "rune";
}

function registerSlash(world: GameWorld, arrow: Arrow, boss = false): number {
  // 에너지(0~1)로 기본치가 0.6~1.8배 — 빠른 유도탄을 벤 반격이 느린 화살보다 값지다
  const energy = arrowEnergy(arrow);
  const base = (boss ? 520 : 110) * (0.6 + energy * 1.2);
  // 치명 반격: 검술 레벨·콤보가 확률을 올린다 (메이플식 CRIT 피드백)
  const critChance = 0.12 + world.stats.slashLevel * 0.03 + Math.min(0.15, world.combo * 0.006);
  const crit = Math.random() < critChance;
  const value = Math.round(base * (1 + world.stats.slashLevel * 0.22 + world.slashBuff * 0.12) * (crit ? 2.2 : 1));
  world.slashScore += value;
  gainRunXp(world, boss ? 4 : 1);
  pushSlashFx(world, arrow.x, arrow.y, value, boss, crit, energy);
  maybeDropSlashItem(world, arrow.x, arrow.y, boss && arrow.bossCutsLeft <= 0);
  return energy;
}

function spawnBossSplitPattern(world: GameWorld, source: Arrow): void {
  // 검객 규칙 재조정 (docs/CONTENT_BEAT_DODGE_PLAN.md §2): 보스를 베면 파편이 플레이어 주위를 돌다 뒤에서 덮치던 방식은
  // "앞쪽만 벤다" 규칙과 충돌해(봇 시뮬 피격 1위) 없앴다. 파편은 보스 위치에서 520ms 예고 뒤 플레이어를 향해 날아온다 —
  // 보스를 보고 있으면 파편도 보인다. 1~2티어 1발(일반), 3티어부터 2발, 유도는 3티어부터.
  // 패턴은 티어별로 고정 (bossPatterns.ts) — 학습 가능한 보스
  const tier = source.bossTier;
  const pattern = bossPatternFor(tier);
  const count = pattern.count;
  for (let i = 0; i < count; i++) {
    const fragment = acquire(world);
    if (!fragment) break;
    const kind = pattern.kinds[i % pattern.kinds.length];
    const direction: -1 | 1 = i % 2 === 0 ? -1 : 1;
    const level = Math.min(3, 1 + Math.floor(tier / 2)) as 1 | 2 | 3;
    configureSplitFragment(world, fragment, source, level, direction, world.stats.slashLevel);
    fragment.kind = kind;
    fragment.telegraph = kind === "homing" ? "homing" : kind === "ricochet" ? "dash" : "aerial";
    fragment.damage = Math.max(fragment.damage, 0.25 + tier * 0.03);
    fragment.length += 5 + tier;
    fragment.hitRadius += 1;
    // 공전 없이 보스 위치에서 예고 후 발사
    fragment.orbitMs = 0;
    fragment.x = source.x + direction * (10 + i * 8);
    fragment.y = source.y;
    fragment.warningMs = pattern.warningMs;
    fragment.splitGraceMs = 0;
    launchAtPlayer(world, fragment, (190 + tier * 14) * pattern.speedMul);
    // 부채꼴 확산 — 가운데 파편을 기준으로 좌우 대칭
    if (pattern.spreadDeg > 0 && count > 1) {
      const rot = ((i - (count - 1) / 2) * pattern.spreadDeg * Math.PI) / 180;
      const vx = fragment.vx, vy = fragment.vy;
      fragment.vx = vx * Math.cos(rot) - vy * Math.sin(rot);
      fragment.vy = vx * Math.sin(rot) + vy * Math.cos(rot);
      fragment.angle = Math.atan2(fragment.vy, fragment.vx);
    }
    if (kind === "homing") {
      fragment.homingMs = 1_600 + tier * 120;
      fragment.homingTurnRate = 0.9 + tier * 0.06;
    } else if (kind === "ricochet") {
      fragment.bounces = 1 + Math.min(2, tier);
    } else {
      fragment.homingMs = 0;
    }
  }
}

/** 검격 스윙 창(ms) — 지속 시간의 앞부분만 베기가 유효하다 */
export const SWING_MS = 320;
/** 스윙 호 — 바라보는 방향 기준 ±110° (뒤에서 오는 화살은 못 벤다) */
export const SWING_ARC = (220 / 180) * Math.PI;
/**
 * 정타(반사) 거리 — 화살이 몸에서 이 거리 안일 때 베면 반사된다.
 * 16 일 때는 플레이어 반지름(16)과 같아 의도적으로 노릴 수 없었다 — 봇 5시드 평균 반사 0.2회/런,
 * 베기 27회 중 0.7%. 콘텐츠의 재미 포인트(코앞에서 베어 궁수에게 되돌리기)를 사실상 못 겪는다.
 * 22 로 넓히면 1.6회/런 이 되고 클리어율은 그대로다 (1·2·3스테이지 5/5, 4스테이지 4/5).
 * 더 넓히면 오히려 어려워진다 — 반사된 화살은 사라지지 않고 계속 날아다녀서,
 * 26 에서 2스테이지가 4/5, 30 에서 3/5 로 떨어지고 4스테이지에 사망이 생겼다 (2026-09-21 실측).
 */
export const REFLECT_DIST = 22;
export const GAUGE_REFLECT = 22;
export const GAUGE_SHATTER = 9;

export function inSwingArc(facing: -1 | 1, dx: number, dy: number): boolean {
  const ang = Math.atan2(dy, dx);
  const front = facing > 0 ? 0 : Math.PI;
  let d = ang - front;
  d = Math.atan2(Math.sin(d), Math.cos(d));
  return Math.abs(d) <= SWING_ARC / 2;
}

function addGauge(world: GameWorld, amount: number): void {
  // [일섬] 레벨이 게이지 획득을 늘린다 (2026-09-28)
  world.slashGauge = Math.min(100, world.slashGauge + amount * gaugeGainMul(world.skillLevels) * world.chips.gaugeMul);
  if (world.slashGauge >= 100) ultimateSlash(world);
}

/** 일섬 — 화면의 일반 화살 전부 파쇄 + 1.2초 시간 지연 + 섬광 */
export function ultimateSlash(world: GameWorld): void {
  world.slashGauge = 0;
  world.ultCount += 1;
  world.ultFlashMs = 600;
  world.hitStopMs = Math.max(world.hitStopMs, 90);
  world.lastCut = "ult";
  world.lastCutMs = 900;
  world.player.slowActiveMs = Math.max(world.player.slowActiveMs, 1200);
  for (const a of world.arrows) {
    if (!a.active || a.boss || a.reflected || a.warningMs > 0) continue;
    spawnCutDebris(world, a, "shatter");
    a.active = false;
    world.countered += 1;
    world.supplies += 1;
    world.slashScore += 12;
  }
  bumpCombo(world);
}

/** 화살 베기 — 정타(몸에서 REFLECT_DIST 안)면 반사, 아니면 파쇄. 보스는 기존 다단 베기 */
export function cutArrow(world: GameWorld, a: Arrow, dist: number): void {
  if (a.boss) {
    if (a.bossEntering) return;   // 내려오는 중엔 맞지 않는다
    // 보스 정타(코앞)는 2컷 — 위험을 감수한 만큼 빨리 무너뜨린다
    if (dist <= world.player.radius + a.hitRadius + REFLECT_DIST && a.bossCutsLeft > 1) a.bossCutsLeft -= 1;
    spawnCutDebris(world, a, "boss"); splitArrow(world, a); addGauge(world, GAUGE_SHATTER); return;
  }
  const player = world.player;
  const value = registerSlash(world, a);
  const close = dist <= player.radius + a.hitRadius + REFLECT_DIST;
  if (close) {
    // 반사: 온 길로 1.4배 속도로 되돌린다 — 화면 밖으로 나가면 궁수 처치
    const speed = Math.max(220, Math.hypot(a.vx, a.vy)) * 1.4;
    const back = Math.atan2(-a.vy, -a.vx || 0.0001);
    a.vx = Math.cos(back) * speed;
    a.vy = Math.sin(back) * speed;
    a.reflected = true;
    a.damage = 0;
    a.homingMs = 0;
    a.bounces = 0;
    a.orbitMs = 0;
    world.lastCut = "reflect";
    world.lastCutMs = 700;
    spawnCutDebris(world, a, "reflect");
    pushSlashFx(world, a.x, a.y, Math.round(40 + value * 40), false, true, value);
    addGauge(world, GAUGE_REFLECT);
  } else {
    spawnCutDebris(world, a, "shatter");
    a.active = false;
    world.countered += 1;
    world.supplies += 1;
    world.lastCut = "shatter";
    world.lastCutMs = 500;
    maybeDropSlashItem(world, a.x, a.y, false);
    addGauge(world, GAUGE_SHATTER);
  }
  if (world.countered % 3 === 0) world.enemyKills += 1;
  bumpCombo(world);
}

function splitArrow(world: GameWorld, arrow: Arrow): void {
  if (arrow.boss) {
    arrow.bossCutsLeft = Math.max(0, arrow.bossCutsLeft - 1);
    world.bossCutsLeft = arrow.bossCutsLeft;
    registerSlash(world, arrow, true);
    bumpCombo(world);
    // 처치 수가 TUNING.bossCutMul(3)배가 된 뒤로 깎일 때마다 파편·튀기를 하면 세 배가 쏟아져 몬스터 풀이 찼다(시뮬 45 스테이지) —
    // 배수만큼에 한 번만 (예전 빈도)
    const beat = (arrow.bossMaxCuts - arrow.bossCutsLeft) % Math.max(1, Math.round(TUNING.bossCutMul)) === 0;
    if (beat) {
      spawnBossSplitPattern(world, { ...arrow });
      // 파편 패턴과 함께 약점도 바뀐다 — 보스가 "다음 답"을 요구한다
      world.bossWeak = rollDodgeWeak(loadoutElements(world.runSkills), world.bossWeak);
    }
    if (arrow.bossCutsLeft <= 0) {
      arrow.active = false;
      world.bossDefeated = true;
      world.hitStopMs = Math.max(world.hitStopMs, 180);
      world.enemyKills += 1;
      world.supplies += 12 + arrow.bossTier * 3;
      world.expeditionSeals += 2;
      maybeDropSlashItem(world, arrow.x, arrow.y, true);
    } else if (beat) {
      // 깎이면 옆으로 튀어 자리를 바꾼다 — 쫓아오지 않는다 (2026-10-01). 종류는 그대로(위쪽 띠에서 떠다님)
      const speed = 220 + arrow.bossTier * 15 + Math.random() * 45;
      arrow.vx = (Math.random() < 0.5 ? -1 : 1) * speed;
      arrow.vy = 0;
      arrow.homingMs = 0;
      arrow.bounces = 0;
      arrow.splitGraceMs = 330;
    }
    return;
  }

  const energy = registerSlash(world, arrow);
  // 일반 화살은 한 번만 두 갈래로 쳐낸다. 두 번째 검격은 파편을 소멸시켜
  // 화면이 기하급수적으로 난잡해지지 않고 "반격→마무리" 목적이 선명해진다.
  if (arrow.splitLevel >= 1) {
    arrow.active = false;
    world.countered += 1;
    world.supplies += 1;
    bumpCombo(world);
    return;
  }

  const source = { ...arrow };
  const nextLevel = 1 as const;
  const sibling = acquire(world);
  configureSplitFragment(world, arrow, source, nextLevel, -1, world.stats.slashLevel);
  if (sibling) configureSplitFragment(world, sibling, source, nextLevel, 1, world.stats.slashLevel);
  // 에너지가 높은 화살일수록 조각이 오브로 더 오래·더 넓게 돌다가 덮친다 —
  // "무엇을 베었는지"가 반격 결과(지속·궤도)로 이어진다 (사용자 지시)
  const orbitBonus = 1 + energy * 1.1;
  for (const fragment of [arrow, sibling]) {
    if (!fragment) continue;
    fragment.orbitMs *= orbitBonus;
    fragment.orbitRadius *= 1 + energy * 0.35;
    fragment.splitGraceMs = fragment.orbitMs + 120;
  }
  world.countered += 1;
  if (world.countered % 3 === 0) world.enemyKills += 1;
  bumpCombo(world);
}

/** 추격대장 활 위치 — 화면 **위 가운데**(성문 위)에서 좌우 ±70px 흔들린다. 화살은 위에서 아래로만 오므로 대장도 위에 선다 (2026-10-01) */
export const CAPTAIN_TOP = 330;   // 150 → 330 (2026-10-01 캡처): 150 은 화살비 게이지·제목과 겹쳤다. HUD 왼쪽 열(~182)·게이지 아래, 보스 막대(350) 위
/** 보스 화살이 떠다니는 높이 — 대장 발밑(safeTop+CAPTAIN_TOP+70)이되, 바닥에서 320px 은 띄운다(시뮬 화면 700 처럼 낮은 화면) */
/** 대장 몬스터 크기(그림 높이 px) — 5배 (96~136 → 480~528, 사용자: "크게도 5배", 2026-10-02). 화면 폭보다 커서 위쪽을 덮는다 */
/**
 * 대장 크기 — 2026-10-02 에 5배(480+)로 키웠다가 같은 날 "너무 커, 2/3 로" (사용자). tier 는 1~5(장 + 1).
 * 2/3 이면 약 330px — 화면 폭(390)보다 조금 좁아 양옆이 보인다
 */
export const BOSS_SIZE_SCALE = 2 / 3;
export function bossSize(tier: number): number { return Math.round((480 + Math.min(48, tier * 12)) * BOSS_SIZE_SCALE); }
/** 대장이 떠 있는 높이(중심) — 몸의 윗부분이 화면 위로 나가고 아래쪽이 화면 위쪽을 덮는다 (아웃로 디펜스의 모선처럼). 예전 412 → 약 130 */
export function bossHoverY(world: GameWorld): number { return world.safeTop + bossSize(getStage(world.stageIndex).bossTier + 1) * 0.32; }   // 462 로 내려 보니 사격 거리가 줄어 곡선이 바뀌었다 — 412 유지, 대신 보스 바를 올림
/** 보스의 조준 사격 주기(ms) — 단계가 오를수록 잦다 */
export function bossSalvoMs(tier: number): number { return Math.max(1_100, 1_800 - tier * 220); }
function spawnBossArrow(world: GameWorld): void {
  const arrow = acquire(world);
  if (!arrow) return;
  const tier = getStage(world.stageIndex).bossTier + 1;   // 장 1~5 — 그림·크기·사격 주기
  const cuts = bossCutsFor(world.stageIndex);
  // 대장은 화면 **맨 위 밖**에서 내려온다 (사용자: "보스가 너무 아래서 리스폰됨 — 맨 위부터", 2026-10-02)
  const size = bossSize(tier);
  const x = world.width * 0.5;
  const y = world.safeTop - size * 0.6;
  // 보스 화살은 플레이어를 쫓지 않는다 (2026-10-01, 아웃로 디펜스) — 화면 위쪽 띠(성문 아래)에서 좌우로 떠다니며
  // 아래로 조준 화살을 쏘고, 플레이어의 사격이 격추 수만큼 깎아 떨어뜨린다. 일제 사격이 없어진 뒤 쫓아오는 보스는 피할 길이 없었다
  const speed = 18 + tier * 4;
  activate(arrow, x, y, (tier % 2 === 0 ? -1 : 1) * speed, 0, "normal", 0);
  world.bossSalvoMs = 0;
  arrow.boss = true;
  arrow.bossTier = tier;
  arrow.bossCutsLeft = cuts;
  arrow.bossMaxCuts = cuts;
  arrow.bossEntering = true;
  arrow.length = size * 0.5;
  arrow.hitRadius = size * 0.3;   // 그림이 큰 만큼 맞는 범위도 — 화살이 몸통에 박히면 맞는다
  arrow.damage = 0.75;
  arrow.homingMs = 0;
  arrow.homingTurnRate = 0;
  arrow.telegraph = "homing";
  world.bossSpawned = true;
  world.bossCutsLeft = cuts;
  world.bossMaxCuts = cuts;
  // 보스 약점 (2026-10-08) — 장착 무기 중 하나. 기본 사격뿐이면 없다
  world.bossWeak = rollDodgeWeak(loadoutElements(world.runSkills), null, world.stageIndex);
}

/** @returns accumulated damage from projectiles that hit this frame. */
export function updateArrows(world: GameWorld, dtSec: number): number {
  const stage = getStage(world.stageIndex);
  const pattern = activePattern(world);
  updateBarrier(world, dtSec);

  if (!world.bossSpawned && world.stageElapsedMs >= stage.durationMs * 0.58) {
    spawnBossArrow(world);
  }

  // A short readable opening prevents a random spawn from ending a run before
  // the player has seen the first telegraph and taken control.
  if (world.stageElapsedMs < 2_000) {
    world.spawnAccMs = 0;
  } else if (pattern && pattern.kind !== "rest") {
    // 대장이 살아 있는 동안은 몬스터가 줄어든다 — 보스전에 집중하게 (2026-10-02, 50 스테이지: 대장 + 웨이브가 겹쳐 방어막이 녹던 것)
    const bossLive = world.bossSpawned && !world.bossDefeated;
    const spawnMs = (pattern.spawnMs ?? 700) * TUNING.spawnScale * stage.spawnScale * (bossLive ? TUNING.bossSpawnSlow : 1) / (stage.spawnMul * world.tempo);
    world.spawnAccMs += dtSec * 1000;
    while (world.spawnAccMs >= spawnMs) {
      world.spawnAccMs -= spawnMs;
      spawnFromPattern(world, pattern);
    }
  } else {
    world.spawnAccMs = 0;
  }

  const player = world.player;
  const slow = player.slowActiveMs > 0;
  const slowR = world.stats.slowRadius + world.slashBuff * 8;
  const slowF = world.stats.slowFactor;
  const hitDamage = 0;   // 플레이어는 맞지 않는다 — 방어막이 받는다 (반환 형식만 유지)

  for (let i = 0; i < world.arrows.length; i++) {
    const a = world.arrows[i];
    if (!a.active) continue;

    a.splitGraceMs = Math.max(0, a.splitGraceMs - dtSec * 1000);
    a.chilledMs = Math.max(0, a.chilledMs - dtSec * 1000);
    if (a.hitFlashMs > 0) a.hitFlashMs = Math.max(0, a.hitFlashMs - dtSec * 1000);

    if (a.warningMs > 0) {
      a.warningMs = Math.max(0, a.warningMs - dtSec * 1000);
      continue;
    }

    let mul = 1;
    if (slow) {
      const dx = a.x - player.x;
      const dy = a.y - player.y;
      const inRadius = dx * dx + dy * dy <= slowR * slowR;
      // 검객 규칙: 베기는 스윙(처음 SWING_MS) 동안, 앞쪽 SWING_ARC 안의 화살만. 나머지 지속 시간은 시간 지연만 (docs/CONTENT_BEAT_DODGE_PLAN.md §2)
      const swinging = player.slowActiveMs > world.stats.slowDurationMs - SWING_MS;
      if (inRadius && swinging && !a.reflected && a.warningMs <= 0 && a.splitGraceMs <= 0 && inSwingArc(player.facing, dx, dy)) {
        cutArrow(world, a, Math.sqrt(dx * dx + dy * dy));
        continue;
      }
      if (inRadius && !a.reflected) mul = slowF;
    }

    if (a.orbitMs > 0) {
      const previousX = a.x;
      const previousY = a.y;
      a.orbitMs = Math.max(0, a.orbitMs - dtSec * 1000);
      const direction = a.orbitDirection;
      const life = Math.max(0, Math.min(1, a.orbitMs / SPLIT_ORBIT_MS));
      const angularJitter = 1 + Math.sin(a.orbitAngle * 2.7 + a.orbitWobble * 9) * a.orbitWobble;
      a.orbitAngle += direction * dtSec * (3.44 + a.splitLevel * 0.36) * angularJitter;
      const collapse = 0.48 + 0.52 * life;
      const wobbleX = Math.sin(a.orbitAngle * 3.1) * a.orbitRadius * a.orbitWobble;
      const wobbleY = Math.cos(a.orbitAngle * 2.35) * a.orbitRadius * a.orbitWobble;
      const driftProgress = 1 - life;
      a.x = a.orbitX + a.orbitDriftX * driftProgress + Math.cos(a.orbitAngle) * a.orbitRadius * a.orbitStretch * collapse + wobbleX;
      a.y = a.orbitY + a.orbitDriftY * driftProgress + Math.sin(a.orbitAngle) * a.orbitRadius / a.orbitStretch * collapse + wobbleY;
      // Face the arrowhead along the actual wide parabolic/orbital trajectory,
      // instead of rotating it around a mechanically perfect circle.
      const travelX = a.x - previousX;
      const travelY = a.y - previousY;
      if (travelX * travelX + travelY * travelY > 0.01) {
        a.angle = Math.atan2(travelY, travelX);
      }
      if (a.orbitMs <= 0) {
        const baseSpeed = Math.max(185, Math.hypot(sourceVelocityX(a), sourceVelocityY(a)));
        launchAtPlayer(world, a, baseSpeed + a.splitLevel * 22);
      }
      continue;
    }

    if (a.boss) {
      // 맨 위 밖에서 **아주 천천히** 곧게 내려와 화면 위쪽에 자리 잡는다 (2026-10-02, "내려오는 속도는 완전 느리게").
      // 예전엔 거리 비례(lerp)로 1~2초 만에 자리를 잡았다. 이제 일정 속도(TUNING.bossDescent)라 실제로는 수십 초 걸린다 —
      // 그동안 기다리기만 하지 않게, 몸이 화면에 드러나면(bossEntering 해제) 맞고 쏜다
      const hoverY = bossHoverY(world);
      const size = bossSize(a.bossTier);
      if (a.y < hoverY) a.y = Math.min(hoverY, a.y + TUNING.bossDescent * dtSec);
      a.vy = 0;
      const cruise = 18 + a.bossTier * 4;
      if (Math.abs(a.vx) > cruise) a.vx *= Math.max(0, 1 - dtSec * 2.5);
      if (Math.abs(a.vx) < cruise * 0.5) a.vx = (a.vx < 0 ? -1 : 1) * cruise;
      if ((a.x < world.width * 0.38 && a.vx < 0) || (a.x > world.width * 0.62 && a.vx > 0)) a.vx *= -1;
      // 마력탄 — 몸이 화면에 드러난 뒤부터(아래쪽 절반이 보이면), 주기마다 몸 아래에서 플레이어 머리 위 돔을 겨눈다 (돔에 맞는다)
      const shown = a.y + size * 0.15 >= world.safeTop;
      if (shown && a.bossEntering) { a.bossEntering = false; world.bossSalvoMs = bossSalvoMs(a.bossTier) * 0.5; }   // 드러나자마자 곧 첫 마력탄
      if (shown) world.bossSalvoMs += dtSec * 1000;
      if (shown && world.bossSalvoMs >= bossSalvoMs(a.bossTier)) {
        world.bossSalvoMs = 0;
        const shot = acquire(world);
        if (shot) {
          const sx = a.x + (Math.random() - 0.5) * size * 0.4, sy = a.y + size * 0.36;
          const tx = player.x + (Math.random() - 0.5) * 40, ty = barrierYAt(world, tx);
          const dx = tx - sx, dy = ty - sy, len = Math.max(1, Math.hypot(dx, dy));
          const sp = 170 + a.bossTier * 20;
          activate(shot, sx, sy, dx / len * sp, dy / len * sp, "aimed", 600);
          shot.fromBoss = true;
        }
      }
    }
    if (a.kind === "homing" && a.homingMs > 0) {
      a.homingMs = Math.max(0, a.homingMs - dtSec * 1000);
      const desired = Math.atan2(player.y - a.y, player.x - a.x);
      let delta = desired - Math.atan2(a.vy, a.vx);
      delta = Math.atan2(Math.sin(delta), Math.cos(delta));
      const current = Math.atan2(a.vy, a.vx);
      const turn = Math.max(-a.homingTurnRate * dtSec, Math.min(a.homingTurnRate * dtSec, delta));
      const speed = Math.hypot(a.vx, a.vy);
      a.vx = Math.cos(current + turn) * speed;
      a.vy = Math.sin(current + turn) * speed;
    }

    a.x += a.vx * mul * dtSec;
    a.y += a.vy * mul * dtSec;
    if (a.kind === "ricochet" && a.bounces > 0) {
      if ((a.x < world.safeLeft + 8 && a.vx < 0) || (a.x > world.width - world.safeRight - 8 && a.vx > 0)) {
        a.vx *= -1;
        a.bounces -= 1;
      }
      // 천장·바닥 되튀김은 없다 — 화살은 위에서 아래로만 (2026-10-01)
    }
    a.angle = Math.atan2(a.vy, a.vx || 0.0001);

    // ── 대장 마력탄 · 조각 — 돔 표면에 맞아 방어막을 깎고 사라진다 (플레이어는 맞지 않는다, 2026-10-02) ──
    if ((a.fromBoss || a.splitLevel > 0) && !a.reflected && a.vy > 0 && a.y >= barrierYAt(world, a.x) - 4) {
      hitBarrier(world, a, a.fromBoss ? TUNING.bossOrbDmg : barrierDamageOf(a));
      world.barrierFlashMs = 300;
      a.active = false;
      continue;
    }
    // ── 방어막 — 몬스터(보스·보스 마력탄·조각 제외)는 띠에서 멈춰 두드린다 ──
    if (!a.boss && !a.fromBoss && a.splitLevel === 0 && !a.reflected) {
      const standY = barrierYAt(world, a.x) - BARRIER_STAND;
      if (a.atBarrier) {
        a.y = standY; a.vx = 0; a.vy = 0;
        a.barrierHitMs -= dtSec * 1000;
        if (a.barrierHitMs <= 0) {
          a.barrierHitMs = TUNING.barrierHitMs;
          hitBarrier(world, a);
          if (a.kind === "explosive") {
            // 드래곤은 방어막에 터진다 — 자폭(처치 수에 안 센다), 쓰러짐 프레임 대신 폭발
            if (world.fades.length < 24) world.fades.push({ kind: a.kind, boss: false, bossTier: 0, x: a.x, y: a.y, size: a.hitRadius, ms: 420, facing: 1 });
            a.active = false;
            world.sfx.boom += 1;
          }
        }
        continue;
      }
      if (a.y >= standY && a.vy > 0) {
        a.atBarrier = true;
        a.barrierVy = Math.max(60, Math.hypot(a.vx, a.vy));
        a.y = standY; a.vx = 0; a.vy = 0;
        a.x = Math.max(world.safeLeft + 16, Math.min(world.width - world.safeRight - 16, a.x));
        a.homingMs = 0; a.bounces = 0;
        a.barrierHitMs = 380;   // 닿자마자가 아니라 한 박자 뒤 첫 타
        continue;
      }
    }

    // 푸른 공격은 대시로 관통하며 역으로 정찰병을 제압한다.
    if (a.telegraph === "dash" && player.dashActiveMs > 0) {
      const dx = a.x - player.x;
      const dy = a.y - player.y;
      if (dx * dx + dy * dy <= (player.radius + 34) ** 2) {
        a.active = false;
        world.enemyKills += 1;
        world.supplies += 2;
        bumpCombo(world);
        continue;
      }
    }

    const out =
      a.y > world.height + 60 ||
      a.y < -80 ||
      a.x < -80 ||
      a.x > world.width + 80;
    if (out) {
      if (a.reflected) {
        a.active = false;
        world.reflectKills += 1;
        world.enemyKills += 1;
        world.supplies += 2;
        world.slashScore += 40;
        continue;
      }
      if (a.boss) continue;   // 대장은 화면보다 커서 '밖'에 걸쳐 있다 — 지우지 않는다
      a.active = false;
      world.dodged += 1;
      gainRunXp(world, 1);
      continue;
    }

    // 플레이어 충돌·아슬아슬 피하기는 없다 — 몬스터는 돔에 멈추고 대장 마력탄은 돔에 맞는다 (방어막이 유일한 생명, 2026-10-02)
  }
  return hitDamage;
}

function sourceVelocityX(a: Arrow): number {
  return a.vx || Math.cos(a.angle) * 220;
}

function sourceVelocityY(a: Arrow): number {
  return a.vy || Math.sin(a.angle) * 220;
}
