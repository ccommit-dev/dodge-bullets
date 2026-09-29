import type { Arrow, GameWorld, RunMods } from "./types";
import { PRIMED_COOLDOWN_MUL } from "./expeditionOps";
import {
  BASIC_SHOT_COOLDOWN, BASIC_SHOT_SPEED,
  boltCooldown, boltPower, boltTargets,
  earthCooldown, earthPower, earthRadius,
  fireCooldown, firePower, fireRadius,
  iceCooldown, icePower, iceRadius, iceSlow,
  waterCooldown, waterPierce, waterPower,
  weaponCooldownMul,
  SKILL_BY_ID,
  type Element,
  type ExpeditionSkillId,
} from "./skills";

/**
 * 활 사격 — 기본 사격 + 속성 화살 (2026-09-29).
 *
 * 조준은 자동이고 플레이어는 위치와 성장에 집중한다 (참고 게임과 같다).
 *
 *   · **기본 사격** — 활/지팡이를 끼면 스킬과 무관하게 항상 나간다. 보스는 못 깎는다.
 *   · **속성 화살** — 스킬 레벨이 1 이상일 때 재사용마다 한 발. 각각 위력(보스를 깎는 양)과
 *     명중 효과, 상성(특정 종류에 위력 +1 · 효과 ×1.5)이 있다.
 *
 * 난이도 원칙: 봇 시뮬 게이트는 **맨손(weapon "none")** 에서 돈다. 무기를 끼운 만큼, 스킬을 올린
 * 만큼만 쉬워진다 — 성장의 보상이 난이도 완화로 나타나는 구조다.
 */

export type SkillShot = {
  active: boolean;
  element: Element;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** 명중 판정 반경 */
  radius: number;
  lifeMs: number;
  /** 연출용 — 0..1 로 줄어든다 */
  fade: number;
  /** 남은 관통 수 — 0 이면 첫 명중에 사라진다 */
  hits: number;
  /** 보스를 깎는 양 */
  power: number;
  /** [유도] 진화 — 가장 가까운 화살을 쫓아간다 */
  seeker: boolean;
  /** 이동 거리 누적(px) — 궤적 연출 */
  dist: number;
};

/** 명중 이펙트 — 속성별 색 폭발. 그리기는 draw.ts */
export type SkillFx = {
  active: boolean;
  element: Element;
  x: number;
  y: number;
  radius: number;
  ms: number;
  /** 시작 시간(ms) — 진행률 계산 */
  total: number;
};

const POOL = 40;
const FX_POOL = 24;
const SPARK_POOL = 120;

/** 불씨·물방울·서리·파편 한 알 */
export type Spark = {
  active: boolean;
  x: number; y: number; vx: number; vy: number;
  ms: number; total: number;
  color: string;
  size: number;
  /** 중력(px/s²) — 물방울·흙은 떨어지고 불씨는 떠오른다(음수) */
  grav: number;
};

export function makeSparks(): Spark[] {
  return Array.from({ length: SPARK_POOL }, () => ({ active: false, x: 0, y: 0, vx: 0, vy: 0, ms: 0, total: 1, color: "#fff", size: 2, grav: 0 }));
}

export function emptySfx(): GameWorld["sfx"] {
  return { shot: 0, hit: 0, boom: 0, freeze: 0, zap: 0, thud: 0, learn: 0 };
}

/**
 * 연출 전용 난수 — **Math.random 을 쓰지 않는다**. 봇 시뮬은 Math.random 을 시드로 갈아 끼워
 * 화살 생성을 재현하는데, 불씨가 그 수열을 소비하면 연출을 고칠 때마다 밸런스 수치가 움직인다.
 */
let vseed = 0x2f6e2b1;
function vr(): number {
  vseed = (Math.imul(vseed, 1664525) + 1013904223) | 0;
  return ((vseed >>> 8) & 0xffff) / 0x10000;
}

const SPARK_COLOR: Record<Element, string[]> = {
  basic: ["#f8fafc", "#cbd5e1"],
  fire: ["#fff7ed", "#fdba74", "#f97316"],
  water: ["#e0f2fe", "#7dd3fc", "#38bdf8"],
  ice: ["#f0f9ff", "#a5f3fc"],
  earth: ["#f5deb3", "#d6a35c", "#92400e"],
  bolt: ["#fefce8", "#fde047"],
};

function spark(world: GameWorld, x: number, y: number, vx: number, vy: number, ms: number, color: string, size: number, grav: number): void {
  const s = world.sparks.find((p) => !p.active);
  if (!s) return;   // 풀이 찼으면 조용히 건너뛴다 — 연출은 빠져도 된다
  s.active = true; s.x = x; s.y = y; s.vx = vx; s.vy = vy; s.ms = ms; s.total = ms; s.color = color; s.size = size; s.grav = grav;
}

/** 사방으로 튀는 파편 */
export function burst(world: GameWorld, element: Element, x: number, y: number, n: number, speed: number): void {
  const colors = SPARK_COLOR[element];
  const grav = element === "fire" ? -90 : element === "earth" ? 520 : element === "water" ? 380 : 0;
  for (let i = 0; i < n; i += 1) {
    const a = vr() * Math.PI * 2;
    const v = speed * (0.45 + vr() * 0.75);
    spark(world, x, y, Math.cos(a) * v, Math.sin(a) * v, 260 + vr() * 260, colors[Math.floor(vr() * colors.length)], element === "earth" ? 3.2 : 2 + vr() * 1.4, grav);
  }
}

/** 짧은 화면 흔들림 — 더 센 것이 이긴다 */
function shake(world: GameWorld, ms: number, amp: number): void {
  if (amp >= world.shakeAmp || world.shakeMs <= 0) { world.shakeMs = ms; world.shakeAmp = amp; }
}

export function makeSkillShots(): SkillShot[] {
  return Array.from({ length: POOL }, () => ({
    active: false, element: "basic" as Element, x: 0, y: 0, vx: 0, vy: 0,
    radius: 0, lifeMs: 0, fade: 1, hits: 0, power: 0, seeker: false, dist: 0,
  }));
}

export function makeSkillFx(): SkillFx[] {
  return Array.from({ length: FX_POOL }, () => ({ active: false, element: "basic" as Element, x: 0, y: 0, radius: 0, ms: 0, total: 1 }));
}

/** 카드가 하나도 안 쌓인 상태 — 이게 기존 난이도 기준선이다 */
export function emptyRunMods(): RunMods {
  return {
    shotExtra: 0, shotPierce: 0, fireRadiusMul: 1, waterPierceExtra: 0, iceSlowBonus: 0, earthPowerBonus: 0, boltExtra: 0,
    cooldownMul: 1, chillHunt: false, chillBurst: false, evolutions: {},
    moveSpeedMul: 1, dashCooldownMul: 1, slashLevelBonus: 0, maxHpBonus: 0,
  };
}

function spawn(world: GameWorld, s: Partial<SkillShot> & { element: Element }): SkillShot | null {
  const shot = world.skillShots.find((p) => !p.active);
  if (!shot) return null;
  shot.active = true;
  shot.element = s.element;
  shot.x = s.x ?? world.player.x;
  shot.y = s.y ?? world.player.y - 14;
  shot.vx = s.vx ?? 0;
  shot.vy = s.vy ?? 0;
  shot.radius = s.radius ?? 9;
  shot.lifeMs = s.lifeMs ?? 1400;
  shot.fade = 1;
  shot.hits = s.hits ?? 0;
  shot.power = s.power ?? 0;
  shot.seeker = s.seeker ?? false;
  shot.dist = 0;
  return shot;
}

export function spawnFx(world: GameWorld, element: Element, x: number, y: number, radius: number, ms = 360): void {
  const fx = world.skillFx.find((f) => !f.active) ?? world.skillFx[0];
  fx.active = true; fx.element = element; fx.x = x; fx.y = y; fx.radius = radius; fx.ms = ms; fx.total = ms;
}

/** 요격 대상 — 살아 있고 경고 중이 아니며 아직 반사되지 않은 화살 */
function targetable(a: Arrow): boolean {
  return a.active && a.warningMs <= 0 && !a.reflected;
}

/** 가장 가까운 화살 n개 */
function nearest(world: GameWorld, n: number, fromX: number, fromY: number): Arrow[] {
  return world.arrows
    .filter(targetable)
    .map((a) => ({ a, d: (a.x - fromX) ** 2 + (a.y - fromY) ** 2 }))
    .sort((p, q) => p.d - q.d)
    .slice(0, n)
    .map((p) => p.a);
}

/** 상성 — 그 종류면 위력 +1 · 효과 ×1.5 */
function affinity(element: Element, a: Arrow): { power: number; mul: number } {
  const def = element === "basic" ? null : SKILL_BY_ID[element as ExpeditionSkillId];
  const strong = !!def && def.strongVs === a.kind;
  return { power: strong ? 1 : 0, mul: strong ? 1.5 : 1 };
}

/**
 * 명중 — 화살을 떨군다. 보스는 지우지 않고 **위력만큼 깎되 마지막 일격 1 은 플레이어 몫**으로
 * 남긴다(스킬이 보스에 아무 영향이 없으면 강화할수록 벨 화살만 줄어 보스를 못 끝낸다 — 2026-09-28 실측).
 * 기본 사격(위력 0)은 보스에 흠집도 못 낸다 — 보스는 속성 화살·검격의 몫이다.
 */
function hit(world: GameWorld, a: Arrow, element: Element, power: number): boolean {
  if (!targetable(a)) return false;
  const aff = affinity(element, a);
  const p = power + aff.power;
  if (a.boss) {
    if (p <= 0) return false;
    const take = Math.min(p, Math.max(0, a.bossCutsLeft - 1));
    if (take > 0) {
      a.bossCutsLeft -= take; world.skillKills += 1;
      // 보스를 깎는 순간은 묵직하게
      burst(world, element, a.x, a.y, 10 + take * 3, 190);
      shake(world, 130, 2 + take);
      world.sfx.thud += 1;
    }
    return take > 0;
  }
  const chilled = a.chilledMs > 0;
  a.active = false;
  world.skillKills += 1;
  world.supplies += 1;
  // 손맛 — 파편이 튀고 연속 요격이 쌓인다. 얼어붙은 것을 부수면 얼음 조각이 더 튄다
  burst(world, chilled ? "ice" : element, a.x, a.y, chilled ? 12 : 7, 150);
  world.streak = world.streakMs > 0 ? world.streak + 1 : 1;
  world.streakMs = 1500;
  world.sfx.hit += 1;
  // 상성 명중 — 보스가 아니면 위력 +1 이 아무 뜻이 없다. 게이지·보급으로 되돌려 주고 화면에 띄운다
  if (aff.power > 0) {
    world.slashGauge = Math.min(100, world.slashGauge + 6);
    world.supplies += 1;
    world.affinityPop = { x: a.x, y: a.y, element, ms: 520 };
    burst(world, element, a.x, a.y, 10, 220);
    shake(world, 90, 1.6);
    spawnFx(world, element, a.x, a.y, 30, 420);
  }
  // 요격도 일섬 게이지를 조금 준다 — 안 주면 스킬이 벨 화살을 먼저 지워 게이지가 굶는다 (2026-09-28 실측)
  world.slashGauge = Math.min(100, world.slashGauge + 3);
  // 콤보 [서리 사냥] — 얼어붙은 화살을 부수면 게이지를 더 받는다
  if (chilled && world.runMods.chillHunt) world.slashGauge = Math.min(100, world.slashGauge + 4);
  return true;
}

/** 활을 당기는 연출 — player.ts 가 각도와 남은 시간으로 무기를 기울이고 시위를 그린다 */
function recoil(world: GameWorld, ang: number): void {
  world.shotFlashMs = 160;
  world.shotAngle = ang;
  world.sfx.shot += 1;
  const mx = world.player.x + Math.cos(ang) * 16, my = world.player.y - 14 + Math.sin(ang) * 16;
  for (let i = 0; i < 3; i += 1) {
    const a2 = ang + (vr() - 0.5) * 0.9;
    spark(world, mx, my, Math.cos(a2) * (90 + vr() * 80), Math.sin(a2) * (90 + vr() * 80), 160 + vr() * 80, "#f8fafc", 1.6, 0);
  }
}

/** 스킬 하나의 실제 쿨타임(초) — 무기 상성이 줄여 준다 */
export function effectiveCooldown(id: ExpeditionSkillId, level: number, weapon: GameWorld["rangedWeapon"]): number {
  const family = SKILL_BY_ID[id].family;
  const base =
    id === "fire" ? fireCooldown(level)
      : id === "water" ? waterCooldown(level)
        : id === "ice" ? iceCooldown(level)
          : id === "earth" ? earthCooldown(level)
            : id === "bolt" ? boltCooldown(level)
              : 0;
  return base * weaponCooldownMul(weapon, family);
}

/** 기본 사격 재사용(초) — 카드·칩·화살통이 줄인다 */
export function basicCooldown(world: GameWorld): number {
  return BASIC_SHOT_COOLDOWN * world.runMods.cooldownMul * world.chips.cooldownMul * world.collectionMul
    * (world.primedMs > 0 ? PRIMED_COOLDOWN_MUL : 1);
}

/** 얼린다 — 감속 + 표식. 유도 화살은 길을 잃는다 (얼음 상성) */
function freeze(world: GameWorld, a: Arrow, slow: number, chillMs: number): void {
  // 하한 — 배수를 매번 곱하면 화살이 사실상 멈춰 화면에 쌓인다
  const sp = Math.hypot(a.vx, a.vy);
  if (sp >= 150) {
    const k = Math.max(slow, 150 / sp);
    a.vx *= k; a.vy *= k;
  }
  a.chilledMs = Math.max(a.chilledMs, chillMs * world.chips.chillMsMul);
  if (a.kind === "homing") a.homingMs = 0;
}

/** 매 프레임 — 쿨타임을 돌리고 다 찬 것을 쏜다 */
export function updateSkillShots(world: GameWorld, dtSec: number): void {
  if (world.primedMs > 0) world.primedMs = Math.max(0, world.primedMs - dtSec * 1000);
  if (world.shotFlashMs > 0) world.shotFlashMs = Math.max(0, world.shotFlashMs - dtSec * 1000);
  const lv = world.skillLevels;
  const timers = world.skillTimers;
  const px = world.player.x, py = world.player.y - 14;
  const aimAt = (t: Arrow) => Math.atan2(t.y - py, t.x - px);

  // ── 기본 사격 — 무기만 있으면 항상. 지팡이는 마력탄이지만 같은 궤적이다
  if (world.rangedWeapon !== "none") {
    world.basicTimer -= dtSec;
    if (world.basicTimer <= 0) {
      const shots = 1 + world.runMods.shotExtra + world.chips.volleyExtra;
      const targets = nearest(world, shots, px, py);
      if (targets.length) {
        world.basicTimer = basicCooldown(world);
        const evo = world.runMods.evolutions.basic;
        for (const t of targets) {
          const ang = aimAt(t);
          const sp = evo === "beam" ? 1000 : evo === "seeker" ? 540 : BASIC_SHOT_SPEED;
          spawn(world, {
            element: "basic", vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
            radius: evo === "beam" ? 12 : 9, lifeMs: 1400, power: 0,
            hits: world.runMods.shotPierce + (evo === "beam" ? 99 : 0), seeker: evo === "seeker",
          });
        }
        recoil(world, aimAt(targets[0]));
      } else {
        world.basicTimer = 0.1;   // 표적이 없으면 곧 다시 본다
      }
    }
  }

  const tick = (id: Exclude<ExpeditionSkillId, "ultimate">, fire: () => boolean) => {
    // 이번 런에서 카드로 습득한 것만 나간다 — 영구 레벨은 습득했을 때의 성능이다
    const level = world.runSkills[id] ? (lv[id] ?? 0) : 0;
    if (level <= 0) return;                       // 미습득 스킬은 아무것도 하지 않는다
    timers[id] = (timers[id] ?? 0) - dtSec;
    if (timers[id] > 0) return;
    if (!fire()) { timers[id] = 0.1; return; }   // 표적이 없으면 쿨타임을 태우지 않는다
    timers[id] = effectiveCooldown(id, level, world.rangedWeapon) * world.runMods.cooldownMul * world.chips.cooldownMul * world.collectionMul
      * (world.primedMs > 0 ? PRIMED_COOLDOWN_MUL : 1)
      * (id === "fire" && world.runMods.evolutions.fire === "pyre" ? 1.25 : 1);
  };

  tick("fire", () => {
    const [t] = nearest(world, 1, px, py);
    if (!t) return false;
    const ang = aimAt(t);
    spawn(world, { element: "fire", vx: Math.cos(ang) * 640, vy: Math.sin(ang) * 640, radius: 10, lifeMs: 1600, power: firePower(lv.fire) });
    recoil(world, ang);
    return true;
  });

  tick("water", () => {
    const [t] = nearest(world, 1, px, py);
    if (!t) return false;
    const ang = aimAt(t);
    spawn(world, {
      element: "water", vx: Math.cos(ang) * 700, vy: Math.sin(ang) * 700, radius: 11, lifeMs: 1700,
      power: waterPower(lv.water), hits: waterPierce(lv.water) + world.runMods.waterPierceExtra - 1,
    });
    recoil(world, ang);
    return true;
  });

  tick("ice", () => {
    const [t] = nearest(world, 1, px, py);
    if (!t) return false;
    const ang = aimAt(t);
    spawn(world, { element: "ice", vx: Math.cos(ang) * 620, vy: Math.sin(ang) * 620, radius: 10, lifeMs: 1600, power: icePower(lv.ice) });
    recoil(world, ang);
    return true;
  });

  tick("earth", () => {
    const [t] = nearest(world, 1, px, py);
    if (!t) return false;
    const ang = aimAt(t);
    spawn(world, {
      element: "earth", vx: Math.cos(ang) * 460, vy: Math.sin(ang) * 460,
      radius: earthRadius(lv.earth), lifeMs: 2000, power: earthPower(lv.earth) + world.runMods.earthPowerBonus,
    });
    recoil(world, ang);
    return true;
  });

  tick("bolt", () => {
    // 즉발 연쇄 — 조준 화살(상성)을 먼저 끊는다
    const n = boltTargets(lv.bolt) + world.runMods.boltExtra;
    const pool = world.arrows.filter(targetable)
      .map((a) => ({ a, d: (a.x - px) ** 2 + (a.y - py) ** 2 - (a.kind === "aimed" ? 1e9 : 0) }))
      .sort((p, q) => p.d - q.d).slice(0, n).map((p) => p.a);
    if (!pool.length) return false;
    for (const t of pool) {
      spawnFx(world, "bolt", t.x, t.y, 22, 260);
      hit(world, t, "bolt", boltPower(lv.bolt));
    }
    world.sfx.zap += 1;
    world.boltFrom = { x: px, y: py, ms: 220, targets: pool.map((t) => ({ x: t.x, y: t.y })) };
    recoil(world, aimAt(pool[0]));
    return true;
  });

  if (world.boltFrom && world.boltFrom.ms > 0) world.boltFrom.ms -= dtSec * 1000;
  if (world.affinityPop) { world.affinityPop.ms -= dtSec * 1000; if (world.affinityPop.ms <= 0) world.affinityPop = null; }

  // ── 날아가는 화살 갱신
  for (const s of world.skillShots) {
    if (!s.active) continue;
    s.lifeMs -= dtSec * 1000;
    if (s.seeker) {
      const t = nearest(world, 1, s.x, s.y)[0];
      if (t) {
        const want = Math.atan2(t.y - s.y, t.x - s.x);
        const cur = Math.atan2(s.vy, s.vx);
        let d = want - cur;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        const next = cur + Math.max(-4 * dtSec, Math.min(4 * dtSec, d));
        const sp = Math.hypot(s.vx, s.vy);
        s.vx = Math.cos(next) * sp; s.vy = Math.sin(next) * sp;
      }
    }
    s.x += s.vx * dtSec;
    s.y += s.vy * dtSec;
    s.dist += Math.hypot(s.vx, s.vy) * dtSec;
    if (s.element !== "basic" && (s.vx !== 0 || s.vy !== 0) && vr() < dtSec * 34) {
      const c = SPARK_COLOR[s.element];
      const g = s.element === "fire" ? -70 : s.element === "water" ? 300 : s.element === "earth" ? 420 : 0;
      spark(world, s.x + (vr() - 0.5) * 6, s.y + (vr() - 0.5) * 6, (vr() - 0.5) * 40, (vr() - 0.5) * 40, 240 + vr() * 200, c[Math.floor(vr() * c.length)], s.element === "earth" ? 2.6 : 1.8, g);
    }
    s.fade = Math.max(0, Math.min(1, s.lifeMs / 300));
    if (s.lifeMs <= 0 || s.y < -80 || s.y > world.height + 80 || s.x < -80 || s.x > world.width + 80) { s.active = false; continue; }

    for (const a of world.arrows) {
      if (!targetable(a)) continue;
      if ((a.x - s.x) ** 2 + (a.y - s.y) ** 2 > (s.radius + a.hitRadius) ** 2) continue;

      const aff = affinity(s.element, a);
      if (s.element === "fire") {
        // 폭발 — 반경 안을 함께 태운다. 콤보 [열충격]: 얼어붙은 화살이 섞여 있으면 넓어진다
        let r = fireRadius(lv.fire) * world.runMods.fireRadiusMul * aff.mul;
        if (world.runMods.chillBurst && world.arrows.some((b) => targetable(b) && b.chilledMs > 0 && (b.x - s.x) ** 2 + (b.y - s.y) ** 2 <= r * r)) r *= 1.6;
        spawnFx(world, "fire", s.x, s.y, r, 420);
        burst(world, "fire", s.x, s.y, 18, 60 + r * 2.2);
        shake(world, 150, 3);
        world.sfx.boom += 1;
        for (const b of world.arrows) if (targetable(b) && (b.x - s.x) ** 2 + (b.y - s.y) ** 2 <= r * r) hit(world, b, "fire", s.power);
        if (world.runMods.evolutions.fire === "pyre") { s.vx = 0; s.vy = 0; s.lifeMs = Math.min(s.lifeMs, 1400); s.radius = r * 0.8; s.hits = 99; continue; }
        s.active = false; break;
      }
      if (s.element === "ice") {
        const r = iceRadius(lv.ice) * aff.mul * (world.runMods.evolutions.ice === "lingering" ? 1.4 : 1);
        const slow = Math.max(0.2, iceSlow(lv.ice) - world.runMods.iceSlowBonus);
        const chill = world.runMods.evolutions.ice === "lingering" ? 4500 : 1500;
        spawnFx(world, "ice", s.x, s.y, r, 420);
        burst(world, "ice", s.x, s.y, 12, 40 + r * 1.6);
        world.sfx.freeze += 1;
        hit(world, a, "ice", s.power);
        for (const b of world.arrows) {
          if (!targetable(b) || (b.x - s.x) ** 2 + (b.y - s.y) ** 2 > r * r) continue;
          // [서리 파쇄] 진화 — 안쪽 절반은 얼리는 대신 부순다
          if (world.runMods.evolutions.ice === "shatter" && (b.x - s.x) ** 2 + (b.y - s.y) ** 2 <= (r * 0.5) ** 2) { hit(world, b, "ice", 0); continue; }
          freeze(world, b, slow, chill);
        }
        s.active = false; break;
      }
      if (s.element === "earth") {
        // 강타 — 튕기는 화살은 더 못 튄다 (상성), 보스를 크게 깎는다
        if (a.kind === "ricochet") a.bounces = 0;
        spawnFx(world, "earth", s.x, s.y, s.radius + 14, 320);
        burst(world, "earth", s.x, s.y, 12, 200);
        shake(world, 120, 2.4);
        world.sfx.thud += 1;
        hit(world, a, "earth", s.power);
        s.active = false; break;
      }
      // basic · water — 관통 수만큼 지나간다
      spawnFx(world, s.element, s.x, s.y, s.element === "water" ? 18 : 12, 220);
      hit(world, a, s.element, s.power);
      if (s.hits > 0) { s.hits -= 1; continue; }
      s.active = false; break;
    }
  }

  // 화염 장판 — 머무는 동안 들어오는 화살을 계속 태운다 (hits 99 로 표시)
  for (const s of world.skillShots) {
    if (!s.active || s.element !== "fire" || s.vx !== 0 || s.vy !== 0) continue;
    for (const a of world.arrows) if (targetable(a) && (a.x - s.x) ** 2 + (a.y - s.y) ** 2 <= s.radius * s.radius) hit(world, a, "fire", s.power);
  }

  for (const p of world.sparks) {
    if (!p.active) continue;
    p.ms -= dtSec * 1000;
    if (p.ms <= 0) { p.active = false; continue; }
    p.vy += p.grav * dtSec;
    p.x += p.vx * dtSec; p.y += p.vy * dtSec;
    p.vx *= 1 - 1.6 * dtSec; p.vy *= 1 - 1.6 * dtSec;
  }
  if (world.shakeMs > 0) { world.shakeMs -= dtSec * 1000; if (world.shakeMs <= 0) { world.shakeMs = 0; world.shakeAmp = 0; } }
  if (world.streakMs > 0) { world.streakMs -= dtSec * 1000; if (world.streakMs <= 0) { world.streakMs = 0; world.streak = 0; } }
  if (world.heroAura) { world.heroAura.ms -= dtSec * 1000; if (world.heroAura.ms <= 0) world.heroAura = null; }

  for (const f of world.skillFx) {
    if (!f.active) continue;
    f.ms -= dtSec * 1000;
    if (f.ms <= 0) f.active = false;
  }
}

/** 스테이지 경계에서도 불린다 — **카드(runMods)는 여기서 지우지 않는다**. 런 전체에서 유지된다 */
export function resetSkillShots(world: GameWorld): void {
  for (const s of world.skillShots) s.active = false;
  for (const f of world.skillFx) f.active = false;
  world.skillTimers = { fire: 0, water: 0, ice: 0, earth: 0, bolt: 0, ultimate: 0 };
  world.basicTimer = 0;
  world.shotFlashMs = 0;
  world.boltFrom = null;
  world.affinityPop = null;
  for (const p of world.sparks) p.active = false;
  world.shakeMs = 0; world.shakeAmp = 0;
  world.streak = 0; world.streakMs = 0;
  world.heroAura = null;
  world.skillKills = 0;
  world.epicPicks = 0;   // 클리어마다 일일 임무에 더하므로 skillKills 처럼 스테이지 단위
}
