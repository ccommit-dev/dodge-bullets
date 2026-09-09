import { getStage } from "./stages";
import { BOSS_CUTS_BASE, BOSS_CUTS_PER_STAGE } from "./world";
import type { Arrow, ArrowPattern, GameWorld } from "./types";

const POOL_SIZE = 120;
const ARROW_LEN = 28;
const HIT_R = 5;
/** Tip within this band (beyond hit radius) counts as near-miss. */
const NEAR_MISS_PAD = 22;
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
    };
  }
  return pool;
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
  const angleJitter = (Math.random() - 0.5) * 0.16;
  const speed = Math.hypot(arrow.vx, arrow.vy) * velocityJitter;
  const heading = Math.atan2(arrow.vy, arrow.vx) + angleJitter;
  arrow.vx = Math.cos(heading) * speed;
  arrow.vy = Math.sin(heading) * speed;
  arrow.angle = heading;
  if ((kind === "normal" || kind === "aimed" || kind === "fan") && Math.random() < currentHomingChance) {
    arrow.kind = "homing";
    arrow.telegraph = "homing";
    arrow.warningMs = Math.max(warningMs, 680);
    arrow.homingMs = 1_800 + Math.random() * 1_300;
    // 회전율 완화(1.25~2.35 → 0.9~1.8): 등 뒤로 감아 도는 궤도를 줄여 정면에서 벨 여지를 준다
    arrow.homingTurnRate = 0.9 + Math.random() * 0.9;
    arrow.hitRadius = HIT_R + 1;
  }
  arrow.splitLevel = 0;
  arrow.reflected = false;
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
  arrow.bossCutsLeft = 0;
  arrow.bossMaxCuts = 0;
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
  return [0, 0.05, 0.06, 0.09][Math.min(3, Math.max(0, stageIndex))];
}
let currentHomingChance = 0.13;

function spawnFromPattern(world: GameWorld, pattern: ArrowPattern): void {
  const stage = getStage(world.stageIndex);
  currentHomingChance = homingChanceFor(world.stageIndex);
  const speed = (pattern.speed ?? 220) * stage.speedMul;
  const arrow = acquire(world);
  if (!arrow) return;

  const minX = world.safeLeft + 12;
  const maxX = world.width - world.safeRight - 12;
  const spanX = Math.max(1, maxX - minX);
  const midY = (world.safeTop + world.floorY) * 0.45;

  switch (pattern.kind) {
    case "rest":
      return;
    case "rain": {
      activate(arrow, minX + Math.random() * spanX, world.safeTop - 20, 0, speed);
      break;
    }
    case "side": {
      const fromLeft = Math.random() < 0.5;
      const y = world.safeTop + 40 + Math.random() * (world.floorY - world.safeTop - 80);
      if (fromLeft) activate(arrow, -20, y, speed, 0);
      else activate(arrow, world.width + 20, y, -speed, 0);
      break;
    }
    case "cross": {
      if (Math.random() < 0.55) {
        activate(arrow, minX + Math.random() * spanX, world.safeTop - 20, 0, speed);
      } else {
        const fromLeft = Math.random() < 0.5;
        const y = midY + (Math.random() - 0.5) * 160;
        if (fromLeft) activate(arrow, -20, y, speed * 0.95, speed * 0.15);
        else activate(arrow, world.width + 20, y, -speed * 0.95, speed * 0.15);
      }
      break;
    }
    case "sweep": {
      const y = world.floorY - 28 - Math.random() * 36;
      const fromLeft = Math.random() < 0.5;
      if (fromLeft) activate(arrow, -20, y, speed * 1.05, 0);
      else activate(arrow, world.width + 20, y, -speed * 1.05, 0);
      break;
    }
    case "burst": {
      const cx = minX + Math.random() * spanX;
      activate(arrow, cx, world.safeTop - 20, (Math.random() - 0.5) * speed * 0.35, speed * 1.15);
      break;
    }
    case "aimed": {
      const fromLeft = Math.random() < 0.5;
      const x = fromLeft ? -20 : world.width + 20;
      const y = world.safeTop + 35 + Math.random() * Math.max(60, world.floorY * 0.35);
      const targetX = world.player.x + world.player.vx * 0.28;
      const targetY = world.player.y;
      const dx = targetX - x;
      const dy = targetY - y;
      const len = Math.max(1, Math.hypot(dx, dy));
      activate(arrow, x, y, (dx / len) * speed, (dy / len) * speed, "aimed", 800);
      break;
    }
    case "fan": {
      const originX = minX + Math.random() * spanX;
      const originY = world.safeTop - 20;
      const baseAngle = Math.atan2(world.player.y - originY, world.player.x - originX);
      for (let i = -1; i <= 1; i++) {
        const target = i === -1 ? arrow : acquire(world);
        if (!target) continue;
        const angle = baseAngle + i * 0.2;
        activate(target, originX, originY, Math.cos(angle) * speed, Math.sin(angle) * speed, "fan", 460);
      }
      break;
    }
    case "ricochet": {
      const fromLeft = Math.random() < 0.5;
      const x = fromLeft ? -20 : world.width + 20;
      const y = world.safeTop + 60 + Math.random() * Math.max(80, world.floorY - world.safeTop - 140);
      activate(
        arrow,
        x,
        y,
        (fromLeft ? 1 : -1) * speed,
        speed * (Math.random() < 0.5 ? 0.38 : -0.38),
        "ricochet",
        500,
      );
      break;
    }
    case "explosive": {
      const originX = minX + Math.random() * spanX;
      const dx = world.player.x - originX;
      const dy = world.player.y - (world.safeTop - 20);
      const len = Math.max(1, Math.hypot(dx, dy));
      activate(
        arrow,
        originX,
        world.safeTop - 20,
        (dx / len) * speed * 0.86,
        (dy / len) * speed * 0.86,
        "explosive",
        560,
      );
      break;
    }
  }
}

function tipPos(a: Arrow): { x: number; y: number } {
  const half = a.length * 0.45;
  return {
    x: a.x + Math.cos(a.angle) * half,
    y: a.y + Math.sin(a.angle) * half,
  };
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
  arrow.bossCutsLeft = 0;
  arrow.bossMaxCuts = 0;
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

function pushSlashFx(world: GameWorld, x: number, y: number, value: number, boss: boolean, crit = false, energy = 0): void {
  const fx = world.slashHitFx.find((item) => !item.active) ?? world.slashHitFx[0];
  if (!fx) return;
  fx.active = true;
  fx.x = x + (Math.random() - 0.5) * 18;
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
  pushSlashFx(world, arrow.x, arrow.y, value, boss, crit, energy);
  maybeDropSlashItem(world, arrow.x, arrow.y, boss && arrow.bossCutsLeft <= 0);
  return energy;
}

function spawnBossSplitPattern(world: GameWorld, source: Arrow): void {
  // 검객 규칙 재조정 (docs/CONTENT_BEAT_DODGE_PLAN.md §2): 보스를 베면 파편이 플레이어 주위를 돌다 뒤에서 덮치던 방식은
  // "앞쪽만 벤다" 규칙과 충돌해(봇 시뮬 피격 1위) 없앴다. 파편은 보스 위치에서 520ms 예고 뒤 플레이어를 향해 날아온다 —
  // 보스를 보고 있으면 파편도 보인다. 1~2티어 1발(일반), 3티어부터 2발, 유도는 3티어부터.
  const tier = source.bossTier;
  const count = tier >= 3 ? 2 : 1;
  const variants: Arrow["kind"][] = tier >= 3 ? ["homing", "ricochet", "fan"] : ["normal", "fan"];
  const kind = variants[Math.floor(Math.random() * variants.length)];
  for (let i = 0; i < count; i++) {
    const fragment = acquire(world);
    if (!fragment) break;
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
    fragment.warningMs = 520;
    fragment.splitGraceMs = 0;
    launchAtPlayer(world, fragment, 190 + tier * 14);
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
/** 정타(반사) 거리 — 화살이 몸에서 이 거리 안일 때 베면 반사 */
export const REFLECT_DIST = 16;
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
  world.slashGauge = Math.min(100, world.slashGauge + amount);
  if (world.slashGauge >= 100) ultimateSlash(world);
}

/** 일섬 — 화면의 일반 화살 전부 파쇄 + 1.2초 시간 지연 + 섬광 */
export function ultimateSlash(world: GameWorld): void {
  world.slashGauge = 0;
  world.ultCount += 1;
  world.ultFlashMs = 600;
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
    spawnBossSplitPattern(world, { ...arrow });
    if (arrow.bossCutsLeft <= 0) {
      arrow.active = false;
      world.bossDefeated = true;
      world.enemyKills += 1;
      world.supplies += 12 + arrow.bossTier * 3;
      world.expeditionSeals += 2;
      maybeDropSlashItem(world, arrow.x, arrow.y, true);
    } else {
      const away = Math.atan2(arrow.y - world.player.y, arrow.x - world.player.x) + (Math.random() - 0.5) * 0.8;
      const speed = 190 + arrow.bossTier * 15 + Math.random() * 45;
      arrow.vx = Math.cos(away) * speed;
      arrow.vy = Math.sin(away) * speed;
      const bossVariants: Arrow["kind"][] = ["homing", "ricochet", "explosive", "fan"];
      arrow.kind = bossVariants[Math.floor(Math.random() * bossVariants.length)];
      arrow.telegraph = arrow.kind === "homing" ? "homing" : arrow.kind === "explosive" ? "blast" : arrow.kind === "ricochet" ? "dash" : "perfect";
      arrow.homingMs = arrow.kind === "homing" ? Number.POSITIVE_INFINITY : 0;
      arrow.bounces = arrow.kind === "ricochet" ? 2 + Math.min(2, arrow.bossTier) : 0;
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

/** 추격대장 활 위치 — 화면 오른쪽 끝에서 앞뒤 30px·위아래 60px 흔들린다 (한 점에서만 나오면 왼쪽 끝에 붙어 서서 외우게 된다) */
function captainBowX(world: GameWorld): number { return world.width - 44 - Math.random() * 30; }
function captainBowY(world: GameWorld): number { return world.floorY - 84 - Math.random() * 60; }
/** 예고 시간(ms) = 420 + 거리 × 1.1, 520~1200 — 거리에 비례해 반응 시간을 보장 */
export function captainWarningMs(distance: number): number { return Math.max(520, Math.min(1200, Math.round(420 + distance * 1.1))); }

function spawnBossArrow(world: GameWorld): void {
  const arrow = acquire(world);
  if (!arrow) return;
  const tier = world.stageIndex + 1;
  const cuts = BOSS_CUTS_BASE + world.stageIndex * BOSS_CUTS_PER_STAGE;
  const fromLeft = tier % 2 === 0;
  // 4스테이지: 보스 화살은 화면 오른쪽 끝에 선 추격대장의 활에서 나온다 (draw.ts 의 궁수 대장 원화 위치)
  const captain = world.stageIndex === 3;
  const cx = captainBowX(world), cy = captainBowY(world);
  const x = captain ? cx : fromLeft ? -48 : world.width + 48;
  const y = captain ? cy : world.safeTop + Math.max(80, (world.floorY - world.safeTop) * (0.25 + (tier % 3) * 0.14));
  const dx = world.player.x - x;
  const dy = world.player.y - y;
  const len = Math.max(1, Math.hypot(dx, dy));
  const speed = 150 + Math.min(120, tier * 10);
  // 대장 화살 예고: 가까우면 짧고(최소 520ms) 멀면 길다(최대 1,200ms) — 대장 근처에 서면 반응 시간이 0 이 되던 문제
  activate(arrow, x, y, dx / len * speed, dy / len * speed, "homing", captain ? captainWarningMs(len) : 1_050);
  arrow.boss = true;
  arrow.bossTier = tier;
  arrow.bossCutsLeft = cuts;
  arrow.bossMaxCuts = cuts;
  arrow.length = 58 + Math.min(42, tier * 5);
  arrow.hitRadius = 12 + Math.min(10, tier * 1.2);
  arrow.damage = 0.75;
  arrow.homingMs = Number.POSITIVE_INFINITY;
  arrow.homingTurnRate = 0.62 + Math.min(0.75, tier * 0.05);
  arrow.telegraph = "homing";
  world.bossSpawned = true;
  world.bossCutsLeft = cuts;
  world.bossMaxCuts = cuts;
}

/** @returns accumulated damage from projectiles that hit this frame. */
export function updateArrows(world: GameWorld, dtSec: number): number {
  const stage = getStage(world.stageIndex);
  const pattern = activePattern(world);

  if (!world.bossSpawned && world.stageElapsedMs >= stage.durationMs * 0.58) {
    spawnBossArrow(world);
  }

  // A short readable opening prevents a random spawn from ending a run before
  // the player has seen the first telegraph and taken control.
  if (world.stageElapsedMs < 2_000) {
    world.spawnAccMs = 0;
  } else if (pattern && pattern.kind !== "rest") {
    const spawnMs = (pattern.spawnMs ?? 700) / stage.spawnMul;
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
  let hitDamage = 0;

  for (let i = 0; i < world.arrows.length; i++) {
    const a = world.arrows[i];
    if (!a.active) continue;

    a.splitGraceMs = Math.max(0, a.splitGraceMs - dtSec * 1000);

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
      if ((a.y < world.safeTop + 8 && a.vy < 0) || (a.y > world.floorY - 8 && a.vy > 0)) {
        a.vy *= -1;
        a.bounces -= 1;
      }
    }
    a.angle = Math.atan2(a.vy, a.vx || 0.0001);

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
      if (a.boss) {
        const side = world.stageIndex === 3 ? 1 : Math.random() < 0.5 ? -1 : 1;
        a.x = world.stageIndex === 3 ? captainBowX(world) : side < 0 ? -36 : world.width + 36;
        a.y = world.stageIndex === 3 ? captainBowY(world) : world.safeTop + 50 + Math.random() * Math.max(80, world.floorY - world.safeTop - 100);
        launchAtPlayer(world, a, 170 + a.bossTier * 10);
        if (world.stageIndex === 3) a.warningMs = captainWarningMs(Math.hypot(world.player.x - a.x, world.player.y - a.y));
        continue;
      }
      a.active = false;
      world.dodged += 1;
      continue;
    }

    if (a.reflected || player.invulnMs > 0 || player.anim === "dead") continue;

    const tip = tipPos(a);
    const pr = player.radius;
    const dx = tip.x - player.x;
    const dy = tip.y - player.y;
    const distSq = dx * dx + dy * dy;
    const hitR = a.hitRadius + pr;
    if (distSq <= hitR * hitR) {
      hitDamage += a.damage;
      world.lastHitCause = a.boss ? "boss" : a.splitLevel > 0 ? "fragment" : a.kind;
      if (a.boss) {
        const away = Math.atan2(a.y - player.y, a.x - player.x) + (Math.random() - 0.5) * 0.7;
        a.vx = Math.cos(away) * 210;
        a.vy = Math.sin(away) * 210;
        a.x += Math.cos(away) * 38;
        a.y += Math.sin(away) * 38;
      } else {
        a.active = false;
      }
      continue;
    }

    const nearR = hitR + NEAR_MISS_PAD;
    if (!a.nearMissed && distSq <= nearR * nearR) {
      a.nearMissed = true;
      bumpCombo(world);
      addGauge(world, 4);
      if (a.telegraph === "perfect") {
        world.perfectDodges += 1;
        world.expeditionSeals += 1;
      }
    }
  }

  return hitDamage;
}

function sourceVelocityX(a: Arrow): number {
  return a.vx || Math.cos(a.angle) * 220;
}

function sourceVelocityY(a: Arrow): number {
  return a.vy || Math.sin(a.angle) * 220;
}
