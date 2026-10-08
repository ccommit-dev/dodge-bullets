import type { Arrow, GameWorld, RunMods } from "./types";
import { PRIMED_COOLDOWN_MUL } from "./expeditionOps";
import { cutArrow, pushSlashFx, TUNING } from "./arrows";
import { gainRunXp } from "./world";
import { DODGE_WEAK_EXTRA_POWER } from "./bossWeak";
import { SHOOT_MS } from "./player";
import {
  arrowHpFor, BASIC_DAMAGE, basicCooldownMul, basicDamageMul,
  BASIC_SHOT_SPEED,
  boltCooldown, boltDamage, boltPower, boltTargets,
  earthCooldown, earthDamage, earthPower, earthRadius,
  fireCooldown, fireDamage, firePower, fireRadius,
  iceCooldown, iceDamage, icePower, iceRadius, iceSlow,
  waterCooldown, waterDamage, waterPierce, waterPower,
  windCooldown, windDamage, windPower, windRange,
  poisonCooldown, poisonDamage, poisonDpsMul, poisonPower, poisonSeconds,
  holyCooldown, holyDamage, holyPower, holyRepair,
  shadowCooldown, shadowCount, shadowDamage, shadowPower,
  meteorCooldown, meteorDamage, meteorPower, meteorRadius,
  forgeFamilyLevel, weaponForgeCooldownMul, weaponForgeDamageMul,
  weaponCooldownMul,
  SKILL_BY_ID,
  type Element,
  type ExpeditionSkillId,
  type SkillWeaponId,
} from "./skills";

/**
 * 활 사격 — 기본 사격 + 속성 화살 (2026-09-29).
 *
 * 조준은 자동이고 플레이어는 위치와 성장에 집중한다 (참고 게임과 같다).
 *
 *   · **기본 사격** — 주인공이 손에 든 활. 늘 나가고(자동 조준), 한 발에 보스를 1 깎는다 — 일제 사격이 없어진 뒤로(2026-10-01)
 *     보스를 떨구는 것도 사격의 몫이다. 속성 화살은 곁을 떠다니는 **무기 정령**(장착 무기)이 쏜다.
 *   · **속성 화살** — **이번 런에서 카드로 습득한 것만** 재사용마다 한 발. 각각 피해(화살 체력을
 *     깎는 양) · 위력(보스를 깎는 양) · 명중 효과 · 상성(피해 ×1.5 · 위력 +1 · 효과 ×1.5)이 있다.
 *
 * 난이도 원칙: 봇 시뮬 게이트의 기준선은 **장궁 + 불화살 Lv1**(새 계정의 기본 상태)이다.
 * 스킬을 올린 만큼, 칩을 끼운 만큼만 쉬워진다 — 성장의 보상이 난이도 완화로 나타나는 구조다.
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
  /** 화살 체력을 깎는 양 */
  damage: number;
  /** 기본 사격인가 — [원소 전환]으로 속성을 띠어도 동작은 기본 화살이다(폭발·빙결 없음) */
  basic: boolean;
  /** [유도] 진화 — 가장 가까운 화살을 쫓아간다 */
  seeker: boolean;
  /** 이동 거리 누적(px) — 궤적 연출 */
  dist: number;
  /** 그리기 전용 시작 어긋남 — 기본 화살을 활 앞에서 그리고 60px 안에 실제 궤적으로 합친다 (판정·밸런스와 무관, 2026-10-02) */
  drawOx: number;
  drawOy: number;
  /** 이번에 지나가며 이미 벤 몬스터 — 꿰뚫는 무기(부메랑)가 겹친 프레임마다 같은 몬스터를 또 베지 않게 */
  struck: Arrow[];
  /** 부메랑 — 이 거리(px)를 날면 주인공 쪽으로 되돌아온다. 0 이면 없음 */
  turnAt: number;
  /** 운석 — 이 높이에 닿으면 터진다. 0 이면 없음 */
  targetY: number;
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
  wind: ["#f0fdfa", "#99f6e4", "#2dd4bf"],
  poison: ["#ecfccb", "#a3e635", "#65a30d"],
  holy: ["#ffffff", "#fef9c3", "#fde68a"],
  shadow: ["#ede9fe", "#a78bfa", "#4c1d95"],
  meteor: ["#fff7ed", "#fb923c", "#b91c1c"],
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
    radius: 0, lifeMs: 0, fade: 1, hits: 0, power: 0, damage: 1, basic: false, seeker: false, dist: 0, drawOx: 0, drawOy: 0,
    struck: [] as Arrow[], turnAt: 0, targetY: 0,
  }));
}

export function makeSkillFx(): SkillFx[] {
  return Array.from({ length: FX_POOL }, () => ({ active: false, element: "basic" as Element, x: 0, y: 0, radius: 0, ms: 0, total: 1 }));
}

/** 카드가 하나도 안 쌓인 상태 — 이게 기존 난이도 기준선이다 */
export function emptyRunMods(): RunMods {
  return {
    shotExtra: 0, shotPierce: 0, fireRadiusMul: 1, waterPierceExtra: 0, iceSlowBonus: 0, earthPowerBonus: 0, boltExtra: 0,
    windDamageMul: 1, poisonMul: 1, shadowExtra: 0, meteorRadiusMul: 1, holyRepairMul: 1,
    cooldownMul: 1, damageMul: 1, convert: null, chillHunt: false, chillBurst: false, evolutions: {},
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
  shot.damage = s.damage ?? 1;
  shot.basic = s.basic ?? false;
  shot.seeker = s.seeker ?? false;
  shot.dist = 0;
  shot.drawOx = 0;
  shot.drawOy = 0;
  shot.struck.length = 0;
  shot.turnAt = s.turnAt ?? 0;
  shot.targetY = s.targetY ?? 0;
  return shot;
}

export function spawnFx(world: GameWorld, element: Element, x: number, y: number, radius: number, ms = 360): void {
  const fx = world.skillFx.find((f) => !f.active) ?? world.skillFx[0];
  fx.active = true; fx.element = element; fx.x = x; fx.y = y; fx.radius = radius; fx.ms = ms; fx.total = ms;
}

/** 요격 대상 — 살아 있고 경고 중이 아니며 아직 반사되지 않은 화살 */
function targetable(a: Arrow): boolean {
  return a.active && a.warningMs <= 0 && !a.reflected && !a.bossEntering;
}

/**
 * 무기 정령의 자리 — 주인공 어깨 뒤 위를 둥둥 떠다닌다 (아웃로 디펜스의 펫처럼). 속성 화살은 여기서 나간다.
 * 주인공이 바라보는 반대쪽 뒤에 두어 활을 가리지 않는다. 그리기(draw.ts)도 같은 함수를 쓴다
 */
export function spiritPos(world: GameWorld, slot = 0): { x: number; y: number } {
  const t = world.animClock + slot * 0.9;
  // 장착 무기 넷이 주인공 머리 위에 반원으로 떠 있다 (2026-10-02) — 0번이 바라보는 반대쪽 뒤, 3번이 바라보는 쪽
  const fan = [-1.15, -0.4, 0.4, 1.15][Math.max(0, Math.min(3, slot))];
  const back = -world.player.facing;
  return { x: world.player.x + back * 34 * fan + Math.sin(t * 1.7) * 4, y: world.player.y - 66 - (1.2 - Math.abs(fan)) * 18 + Math.sin(t * 2.3) * 5 };
}

/** 장착 무기의 정령 칸 — 로드아웃 순서. 장착하지 않았으면 0 */
export function spiritSlotOf(world: GameWorld, id: SkillWeaponId): number {
  const i = (world.loadout ?? []).indexOf(id);
  return i < 0 ? 0 : i;
}

/** 이 무기에 붙는 대장간 피해 배수 — 물리는 활, 마법은 지팡이 */
function forgeDmg(world: GameWorld, id: SkillWeaponId): number {
  return weaponForgeDamageMul(forgeFamilyLevel(world.weaponForge ?? { bow: 0, staff: 0 }, SKILL_BY_ID[id].family));
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
function hit(world: GameWorld, a: Arrow, element: Element, power: number, damage: number, quiet = false): boolean {
  if (!targetable(a)) return false;
  const aff = affinity(element, a);
  const p = power + aff.power;
  if (!a.boss) {
    // 체력 — 처음 맞을 때 그 스테이지 값으로 채운다. 상성이면 피해 ×1.5
    if (a.maxHp <= 0) { a.maxHp = arrowHpFor(world.stageIndex); a.hp = a.maxHp; }
    a.hp -= damage * aff.mul * world.runMods.damageMul;
    if (a.hp > 0.001) {
      // 안 부서졌다 — 번쩍이고 파편 조금. 체력 눈금이 남은 양을 보여 준다
      if (quiet) { if (a.hitFlashMs <= 0) a.hitFlashMs = 140; return false; }
      a.hitFlashMs = 140;
      burst(world, element, a.x, a.y, 3, 110);
      world.sfx.hit += 1;
      return false;
    }
  }
  if (a.boss) {
    // 약점 무기 (2026-10-08): 처치 −1 추가 · "약점!" 팝. 기본 사격(위력 0)은 약점이어도 흠집을 못 낸다
    const weak = world.bossWeak !== null && element === world.bossWeak && power > 0;
    const pw = p + (weak ? DODGE_WEAK_EXTRA_POWER : 0);
    if (pw <= 0) return false;
    // 보스는 위력만큼 '격추'한다 — 마지막 한 번까지 사격이 한다(일제 사격이 없어졌으므로, 2026-10-01). 파편·격파는 arrows.cutArrow 가 맡는다
    let took = 0;
    for (let i = 0; i < pw && a.active && a.bossCutsLeft > 0; i += 1) { cutArrow(world, a, 1e9); took += 1; }
    if (took > 0 && weak) { world.affinityPop = { x: a.x, y: a.y, element, ms: 620, text: "약점!" }; spawnFx(world, element, a.x, a.y, 34, 460); }
    if (took > 0) {
      world.skillKills += 1;
      burst(world, element, a.x, a.y, 10 + took * 3, 190);
      shake(world, 130, 2 + took);
      world.sfx.thud += 1;
    }
    return took > 0;
  }
  const chilled = a.chilledMs > 0;
  // 쓰러짐 — 몬스터는 사라지는 대신 쓰러짐 프레임이 커지며 흐려진다 (2026-10-01)
  if (!a.fromBoss && world.fades.length < 24) world.fades.push({ kind: a.kind, boss: false, bossTier: a.bossTier, x: a.x, y: a.y, size: a.hitRadius, ms: 420, facing: a.vx < 0 ? -1 : 1 });
  a.active = false;
  world.skillKills += 1;
  world.supplies += 1;
  // 루프 ① (2026-10-08): 스킬 처치도 런 XP — 카드가 보스 구간에만 몰리지 않고 30~60초마다 온다 · ③ 피해 숫자가 뜬다
  gainRunXp(world, 1);
  pushSlashFx(world, a.x, a.y, Math.round(damage * aff.mul * world.runMods.damageMul * 100), false, aff.power > 0, 0.3, ((Math.floor(a.x) % 13) - 6));
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
function recoil(world: GameWorld, ang: number, from?: { x: number; y: number }): void {
  world.shotFlashMs = 160;
  world.shotAngle = ang;
  world.sfx.shot += 1;
  // 주인공이 쏘는 쪽을 본다 + 쏘는 동작 (2026-10-08) — 정령(from)이 쏠 때도 주인공은 그쪽을 본다
  const p = world.player;
  p.shootMs = SHOOT_MS;
  p.shootAngle = ang;
  const cx = Math.cos(ang);
  if (cx > 0.18) p.facing = 1; else if (cx < -0.18) p.facing = -1;
  const ox = from ? from.x : world.player.x, oy = from ? from.y : world.player.y - 14;
  const reach = from ? BOW_REACH + 12 : 16;
  const mx = ox + Math.cos(ang) * reach, my = oy + Math.sin(ang) * reach;
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
              : id === "wind" ? windCooldown(level)
                : id === "poison" ? poisonCooldown(level)
                  : id === "holy" ? holyCooldown(level)
                    : id === "shadow" ? shadowCooldown(level)
                      : id === "meteor" ? meteorCooldown(level)
                        : 0;
  return base * weaponCooldownMul(weapon, family);
}

/**
 * 속성 화살의 **실제** 재사용(초) — 무기 상성 · 카드 · 칩 · 수집 보너스 · 화살통 · [화염 장판]의 대가까지.
 * 쏘는 쪽(tick)과 화면의 독이 같은 값을 읽는다 — 따로 계산하면 독의 게이지가 실제와 어긋난다.
 */
export function skillCooldown(world: GameWorld, id: Exclude<ExpeditionSkillId, "ultimate">): number {
  return effectiveCooldown(id, world.skillLevels[id] ?? 0, world.rangedWeapon)
    * weaponForgeCooldownMul(forgeFamilyLevel(world.weaponForge ?? { bow: 0, staff: 0 }, SKILL_BY_ID[id].family))
    * world.runMods.cooldownMul * world.chips.cooldownMul * world.collectionMul
    * (world.primedMs > 0 ? PRIMED_COOLDOWN_MUL : 1)
    * (id === "fire" && world.runMods.evolutions.fire === "pyre" ? 1.25 : 1);
}

/** 기본 사격 재사용(초) — 카드·칩·화살통이 줄인다 */
export function basicCooldown(world: GameWorld): number {
  return TUNING.basicCooldown * basicCooldownMul(world.basicLevel) * world.runMods.cooldownMul * world.chips.cooldownMul * world.collectionMul
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

/**
 * 활 손 — 주인공이 활을 쥔 자리(바라보는 쪽 가슴 앞). 그리기(player.ts drawHeroBow)가 여기에 활을 쥐고, 기본 화살은 **그림만** 여기 활 앞에서
 * 출발해 60px 안에 실제 궤적(플레이어 중심 −14 에서 나간 것)에 합쳐진다. 판정 출발점을 활 손으로 옮기면 20px 차이에 주간·곡선 게이트가
 * 경계에서 흔들려(중간 S4 8 → 6, 주간 첫 S4 7일) 판정은 그대로 두었다 (2026-10-02)
 */
export const BOW_HAND_X = 12, BOW_HAND_Y = -34, BOW_REACH = 8;
export function bowHand(world: GameWorld): { x: number; y: number } {
  return { x: world.player.x + world.player.facing * BOW_HAND_X, y: world.player.y + BOW_HAND_Y };
}

/** 매 프레임 — 쿨타임을 돌리고 다 찬 것을 쏜다 */
export function updateSkillShots(world: GameWorld, dtSec: number): void {
  if (world.primedMs > 0) world.primedMs = Math.max(0, world.primedMs - dtSec * 1000);
  if (world.shotFlashMs > 0) world.shotFlashMs = Math.max(0, world.shotFlashMs - dtSec * 1000);
  const lv = world.skillLevels;
  const timers = world.skillTimers;
  const px = world.player.x, py = world.player.y - 14;
  // 리드 조준 — 표적이 움직이는 만큼 앞을 겨눈다. 보스가 좌우로 떠다니게 되면서(2026-10-01) 발사 순간 위치를 겨누면 30~50px 빗나갔다
  const lead = (fx: number, fy: number, t: Arrow, speed: number) => {
    const d = Math.hypot(t.x - fx, t.y - fy);
    const tt = d / Math.max(1, speed);
    return Math.atan2(t.y + t.vy * tt - fy, t.x + t.vx * tt - fx);
  };
  const aimAt = (t: Arrow, speed = BASIC_SHOT_SPEED) => lead(px, py, t, speed);
  // 활을 겨누는 각 — 가장 가까운 화살 쪽, 없으면 위. 그리기가 활을 이 각으로 든다
  { const [near] = nearest(world, 1, px, py); const want = near ? aimAt(near) : -Math.PI / 2; let d = want - world.aimAngle; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; world.aimAngle += Math.max(-9 * dtSec, Math.min(9 * dtSec, d)); }

  // ── 기본 사격 — 무기만 있으면 항상. 지팡이는 마력탄이지만 같은 궤적이다
  if (world.rangedWeapon !== "none") {
    world.basicTimer -= dtSec;
    if (world.basicTimer <= 0) {
      const shots = 1 + world.runMods.shotExtra + world.chips.volleyExtra;
      let targets = nearest(world, shots, px, py);
      // 보스가 떠 있으면 번갈아 보스를 쏜다 — 늘 가장 가까운 화살만 쏘면 보스의 조준 화살이 끝없이 더 가까워 보스를 영영 못 깎는다 (2026-10-01 시뮬: 클리어 0/5)
      const bossArrow = world.arrows.find((a) => a.boss && targetable(a));
      if (bossArrow && !targets.includes(bossArrow)) {
        const closest = targets[0];
        const threatNear = !!closest && closest.y > py - 260;
        world.bossFocus = (world.bossFocus + 1) % 2;
        if (!threatNear || world.bossFocus === 0) targets = [bossArrow, ...targets.slice(0, Math.max(0, shots - 1))];
      }
      if (targets.length) {
        world.basicTimer = basicCooldown(world);
        const evo = world.runMods.evolutions.basic;
        const hand = bowHand(world);
        for (const t of targets) {
          const ang = aimAt(t, evo === "beam" ? 1000 : evo === "seeker" ? 540 : BASIC_SHOT_SPEED);
          const sp = evo === "beam" ? 1000 : evo === "seeker" ? 540 : BASIC_SHOT_SPEED;
          const conv = world.runMods.convert;
          const shot = spawn(world, {
            element: conv ?? "basic", basic: true, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
            radius: evo === "beam" ? 12 : 9, lifeMs: 1400, power: 1, damage: BASIC_DAMAGE * basicDamageMul(world.basicLevel) * (conv ? 1.2 : 1),
            hits: world.runMods.shotPierce + (evo === "beam" ? 99 : 0), seeker: evo === "seeker",
          });
          // 그림은 활 앞(화살받침)에서 — 판정 출발점과의 차이는 그리기가 60px 안에 메운다
          if (shot) { shot.drawOx = hand.x + Math.cos(ang) * BOW_REACH - shot.x; shot.drawOy = hand.y + Math.sin(ang) * BOW_REACH - shot.y; }
        }
        recoil(world, aimAt(targets[0]), hand);
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
    timers[id] = skillCooldown(world, id);
  };

  const spiritOf = (id: SkillWeaponId) => spiritPos(world, spiritSlotOf(world, id));
  /**
   * 스킬 무기의 표적 — 대장이 떠 있고 방어막 가까이(띠 위 220px 안) 몬스터가 없으면 대장을, 아니면 가장 가까운 몬스터 (2026-10-02).
   * 늘 가장 가까운 것만 쏘면 대장전이 기본 사격에만 기대 50 스테이지의 대장들이 끝나지 않았다(시뮬)
   */
  const skillTarget = (): Arrow | undefined => {
    const boss = world.arrows.find((a) => a.boss && targetable(a));
    if (boss) {
      const line = world.floorY - 150 - 220;
      if (!world.arrows.some((a) => !a.boss && targetable(a) && a.y > line)) return boss;
    }
    return nearest(world, 1, px, py)[0];
  };
  let sp0 = spiritPos(world);
  const fromSpirit = (t: Arrow, speed = 640) => lead(sp0.x, sp0.y, t, speed);
  tick("fire", () => {
    sp0 = spiritOf("fire");
    const t = skillTarget();
    if (!t) return false;
    const ang = fromSpirit(t);
    spawn(world, { x: sp0.x, y: sp0.y, element: "fire", vx: Math.cos(ang) * 640, vy: Math.sin(ang) * 640, radius: 10, lifeMs: 1600, power: firePower(lv.fire), damage: fireDamage(lv.fire) * forgeDmg(world, "fire") });
    world.sfx.shot += 1;
    return true;
  });

  tick("water", () => {
    sp0 = spiritOf("water");
    const t = skillTarget();
    if (!t) return false;
    const ang = fromSpirit(t, 700);
    spawn(world, {
      x: sp0.x, y: sp0.y, element: "water", vx: Math.cos(ang) * 700, vy: Math.sin(ang) * 700, radius: 11, lifeMs: 1700,
      power: waterPower(lv.water), damage: waterDamage(lv.water) * forgeDmg(world, "water"), hits: waterPierce(lv.water) + world.runMods.waterPierceExtra - 1,
    });
    world.sfx.shot += 1;
    return true;
  });

  tick("ice", () => {
    sp0 = spiritOf("ice");
    const t = skillTarget();
    if (!t) return false;
    const ang = fromSpirit(t, 620);
    spawn(world, { x: sp0.x, y: sp0.y, element: "ice", vx: Math.cos(ang) * 620, vy: Math.sin(ang) * 620, radius: 10, lifeMs: 1600, power: icePower(lv.ice), damage: iceDamage(lv.ice) * forgeDmg(world, "ice") });
    world.sfx.shot += 1;
    return true;
  });

  tick("earth", () => {
    sp0 = spiritOf("earth");
    const t = skillTarget();
    if (!t) return false;
    const ang = fromSpirit(t, 460);
    spawn(world, {
      x: sp0.x, y: sp0.y, element: "earth", vx: Math.cos(ang) * 460, vy: Math.sin(ang) * 460,
      radius: earthRadius(lv.earth), lifeMs: 2000, power: earthPower(lv.earth) + world.runMods.earthPowerBonus,
      damage: (earthDamage(lv.earth) + world.runMods.earthPowerBonus) * forgeDmg(world, "earth"),
    });
    world.sfx.shot += 1;
    return true;
  });

  tick("bolt", () => {
    sp0 = spiritOf("bolt");
    // 즉발 연쇄 — 조준 화살(상성)을 먼저 끊는다
    const n = boltTargets(lv.bolt) + world.runMods.boltExtra;
    const pool = world.arrows.filter(targetable)
      .map((a) => ({ a, d: (a.x - px) ** 2 + (a.y - py) ** 2 - (a.kind === "aimed" ? 1e9 : 0) }))
      .sort((p, q) => p.d - q.d).slice(0, n).map((p) => p.a);
    if (!pool.length) return false;
    for (const t of pool) {
      spawnFx(world, "bolt", t.x, t.y, 22, 260);
      hit(world, t, "bolt", boltPower(lv.bolt), boltDamage(lv.bolt) * forgeDmg(world, "bolt"));
    }
    world.sfx.zap += 1;
    world.boltFrom = { x: sp0.x, y: sp0.y, ms: 220, targets: pool.map((t) => ({ x: t.x, y: t.y })) };
    return true;
  });

  // ── 새 스킬 무기 5종 (2026-10-02) ──
  tick("wind", () => {
    sp0 = spiritOf("wind");
    const t = skillTarget();
    if (!t) return false;
    const ang = fromSpirit(t, 520);
    spawn(world, {
      x: sp0.x, y: sp0.y, element: "wind", vx: Math.cos(ang) * 520, vy: Math.sin(ang) * 520, radius: 13, lifeMs: 2600,
      power: windPower(lv.wind), damage: windDamage(lv.wind) * forgeDmg(world, "wind") * world.runMods.windDamageMul, hits: 99, turnAt: windRange(lv.wind),
    });
    world.sfx.shot += 1;
    return true;
  });

  tick("poison", () => {
    sp0 = spiritOf("poison");
    const t = skillTarget();
    if (!t) return false;
    const ang = fromSpirit(t, 680);
    spawn(world, { x: sp0.x, y: sp0.y, element: "poison", vx: Math.cos(ang) * 680, vy: Math.sin(ang) * 680, radius: 9, lifeMs: 1600, power: poisonPower(lv.poison), damage: poisonDamage(lv.poison) * forgeDmg(world, "poison") });
    world.sfx.shot += 1;
    return true;
  });

  tick("holy", () => {
    sp0 = spiritOf("holy");
    // 대장이 있으면 대장을, 없으면 방어막에 가장 가까이 온(가장 아래) 몬스터를 내리친다 — 즉발
    const pool = world.arrows.filter(targetable);
    if (!pool.length) return false;
    const boss = pool.find((a) => a.boss);
    const t = boss ?? pool.reduce((m, a) => (a.y > m.y ? a : m), pool[0]);
    spawnFx(world, "holy", t.x, t.y, 34, 380);
    burst(world, "holy", t.x, t.y, 14, 180);
    hit(world, t, "holy", holyPower(lv.holy), holyDamage(lv.holy) * forgeDmg(world, "holy"));
    // 방어막 수리 — 맞힐 때마다 조금 (최대치를 넘지 않는다)
    world.barrierHp = Math.min(world.barrierMaxHp, world.barrierHp + holyRepair(lv.holy) * world.runMods.holyRepairMul);
    world.holyBeam = { x: sp0.x, y: sp0.y, tx: t.x, ty: t.y, ms: 260 };
    world.sfx.zap += 1;
    return true;
  });

  tick("shadow", () => {
    sp0 = spiritOf("shadow");
    const t = skillTarget();
    if (!t) return false;
    const ang = fromSpirit(t, 600);
    const n = shadowCount(lv.shadow) + world.runMods.shadowExtra;
    for (let k = 0; k < n; k += 1) {
      const a2 = ang + (k - (n - 1) / 2) * 0.13;
      spawn(world, { x: sp0.x, y: sp0.y, element: "shadow", vx: Math.cos(a2) * 600, vy: Math.sin(a2) * 600, radius: 9, lifeMs: 1500, power: shadowPower(lv.shadow), damage: shadowDamage(lv.shadow) * forgeDmg(world, "shadow") });
    }
    world.sfx.shot += 1;
    return true;
  });

  tick("meteor", () => {
    sp0 = spiritOf("meteor");
    // 가장 많이 모인 곳 — 대장이 있으면 대장
    const pool = world.arrows.filter(targetable);
    if (!pool.length) return false;
    const r = meteorRadius(lv.meteor) * world.runMods.meteorRadiusMul;
    let best = pool.find((a) => a.boss) ?? pool[0], bestN = -1;
    if (!best.boss) for (const a of pool) {
      let n = 0;
      for (const b of pool) if ((a.x - b.x) ** 2 + (a.y - b.y) ** 2 <= r * r) n += 1;
      if (n > bestN) { bestN = n; best = a; }
    }
    // 화면 위에서 곧장 떨어진다 — 몬스터가 내려오는 만큼 조금 아래를 노린다
    const ty = Math.min(world.floorY - 40, best.y + best.vy * 0.5);
    spawn(world, { x: best.x, y: world.safeTop - 40, element: "meteor", vx: 0, vy: 760, radius: 16, lifeMs: 2400, power: meteorPower(lv.meteor), damage: meteorDamage(lv.meteor) * forgeDmg(world, "meteor"), targetY: ty, hits: 99 });
    world.sfx.shot += 1;
    return true;
  });

  // 중독 — 몬스터가 초당 독 피해를 받는다 (보스는 처치 수라 독이 듣지 않는다)
  for (const a of world.arrows) {
    if (!a.active || a.poisonMs <= 0) continue;
    a.poisonMs = Math.max(0, a.poisonMs - dtSec * 1000);
    if (!a.boss && targetable(a)) hit(world, a, "poison", 0, a.poisonDps * dtSec, true);
  }
  if (world.holyBeam && world.holyBeam.ms > 0) { world.holyBeam.ms -= dtSec * 1000; if (world.holyBeam.ms <= 0) world.holyBeam = null; }

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
    // 부메랑 — 사거리에 닿으면 주인공 쪽으로 되돌아오며 다시 벤다
    if (s.turnAt > 0 && s.dist >= s.turnAt) {
      const sp = Math.hypot(s.vx, s.vy);
      const back = Math.atan2(world.player.y - 30 - s.y, world.player.x - s.x);
      s.vx = Math.cos(back) * sp; s.vy = Math.sin(back) * sp;
      s.turnAt = 0; s.struck.length = 0;
    }
    // 운석 — 노린 높이에 닿으면 그 자리에서 터진다
    if (s.targetY > 0 && s.y >= s.targetY) {
      const r = meteorRadius(lv.meteor) * world.runMods.meteorRadiusMul;
      spawnFx(world, "meteor", s.x, s.y, r, 520);
      burst(world, "meteor", s.x, s.y, 26, 80 + r * 2.4);
      shake(world, 220, 4.5);
      world.sfx.boom += 1;
      for (const b of world.arrows) if (targetable(b) && (b.x - s.x) ** 2 + (b.y - s.y) ** 2 <= (r + (b.boss ? b.hitRadius : 0)) ** 2) hit(world, b, "meteor", s.power, s.damage);
      s.active = false; continue;
    }
    if (s.targetY > 0) continue;   // 떨어지는 중엔 닿아도 터지지 않는다 — 노린 자리까지 간다
    if (s.element !== "basic" && (s.vx !== 0 || s.vy !== 0) && vr() < dtSec * (s.basic ? 18 : 34)) {
      const c = SPARK_COLOR[s.element];
      const g = s.element === "fire" ? -70 : s.element === "water" ? 300 : s.element === "earth" ? 420 : 0;
      spark(world, s.x + (vr() - 0.5) * 6, s.y + (vr() - 0.5) * 6, (vr() - 0.5) * 40, (vr() - 0.5) * 40, 240 + vr() * 200, c[Math.floor(vr() * c.length)], s.element === "earth" ? 2.6 : 1.8, g);
    }
    s.fade = Math.max(0, Math.min(1, s.lifeMs / 300));
    if (s.lifeMs <= 0 || s.y < -80 || s.y > world.height + 80 || s.x < -80 || s.x > world.width + 80) { s.active = false; continue; }

    // 머무는 화염 장판은 아래 전용 루프가 태운다 — 여기서 또 충돌을 보면 닿는 화살마다 매 프레임 통째로 다시 터진다
    if (s.vx === 0 && s.vy === 0) continue;

    for (const a of world.arrows) {
      if (!targetable(a)) continue;
      if ((a.x - s.x) ** 2 + (a.y - s.y) ** 2 > (s.radius + a.hitRadius) ** 2) continue;

      const aff = affinity(s.element, a);
      if (s.element === "fire" && !s.basic) {
        // 폭발 — 반경 안을 함께 태운다. 콤보 [열충격]: 얼어붙은 화살이 섞여 있으면 넓어진다
        let r = fireRadius(lv.fire) * world.runMods.fireRadiusMul * world.chips.flameRadiusMul * aff.mul;
        if (world.runMods.chillBurst && world.arrows.some((b) => targetable(b) && b.chilledMs > 0 && (b.x - s.x) ** 2 + (b.y - s.y) ** 2 <= r * r)) r *= 1.6;
        spawnFx(world, "fire", s.x, s.y, r, 420);
        burst(world, "fire", s.x, s.y, 18, 60 + r * 2.2);
        shake(world, 150, 3);
        world.sfx.boom += 1;
        for (const b of world.arrows) if (targetable(b) && (b.x - s.x) ** 2 + (b.y - s.y) ** 2 <= r * r) hit(world, b, "fire", s.power, s.damage);
        if (world.runMods.evolutions.fire === "pyre") { s.vx = 0; s.vy = 0; s.lifeMs = Math.min(s.lifeMs, 1400); s.radius = r * 0.8; s.hits = 99; break; }
        s.active = false; break;
      }
      if (s.element === "ice" && !s.basic) {
        const r = iceRadius(lv.ice) * aff.mul * (world.runMods.evolutions.ice === "lingering" ? 1.4 : 1);
        const slow = Math.max(0.2, iceSlow(lv.ice) - world.runMods.iceSlowBonus);
        const chill = world.runMods.evolutions.ice === "lingering" ? 4500 : 1500;
        spawnFx(world, "ice", s.x, s.y, r, 420);
        burst(world, "ice", s.x, s.y, 12, 40 + r * 1.6);
        world.sfx.freeze += 1;
        hit(world, a, "ice", s.power, s.damage);
        for (const b of world.arrows) {
          if (!targetable(b) || (b.x - s.x) ** 2 + (b.y - s.y) ** 2 > r * r) continue;
          // [서리 파쇄] 진화 — 안쪽 절반은 얼리는 대신 부순다
          if (world.runMods.evolutions.ice === "shatter" && (b.x - s.x) ** 2 + (b.y - s.y) ** 2 <= (r * 0.5) ** 2) { hit(world, b, "ice", 0, 99); continue; }
          freeze(world, b, slow, chill);
        }
        s.active = false; break;
      }
      if (s.element === "earth" && !s.basic) {
        // 강타 — 튕기는 화살은 더 못 튄다 (상성), 보스를 크게 깎는다
        if (a.kind === "ricochet") a.bounces = 0;
        spawnFx(world, "earth", s.x, s.y, s.radius + 14, 320);
        burst(world, "earth", s.x, s.y, 12, 200);
        shake(world, 120, 2.4);
        world.sfx.thud += 1;
        hit(world, a, "earth", s.power, s.damage);
        s.active = false; break;
      }
      if (s.element === "wind" && !s.basic) {
        // 부메랑 — 한 번 지나가며 같은 몬스터는 한 번만 벤다 (되돌아올 때 다시)
        if (s.struck.includes(a)) continue;
        s.struck.push(a);
        spawnFx(world, "wind", a.x, a.y, 16, 200);
        hit(world, a, "wind", s.power, s.damage);
        continue;
      }
      if (s.element === "poison" && !s.basic) {
        // 독침 — 맞으면 중독(지속 피해). 상성(오우거)이면 독도 1.5배
        spawnFx(world, "poison", s.x, s.y, 14, 260);
        const alive = !hit(world, a, "poison", s.power, s.damage);
        if (alive && a.active && !a.boss) {
          a.poisonMs = poisonSeconds(lv.poison) * 1000;
          a.poisonDps = Math.max(a.poisonDps, s.damage * poisonDpsMul(lv.poison) * aff.mul * world.runMods.poisonMul);
        }
        s.active = false; break;
      }
      // basic · water · shadow — 관통 수만큼 지나간다
      spawnFx(world, s.element, s.x, s.y, s.element === "water" ? 18 : 12, 220);
      hit(world, a, s.element, s.power, s.damage);
      if (s.hits > 0) { s.hits -= 1; continue; }
      s.active = false; break;
    }
  }

  // 화염 장판 — 머무는 동안 들어오는 화살을 계속 태운다 (hits 99 로 표시)
  for (const s of world.skillShots) {
    if (!s.active || s.basic || s.element !== "fire" || s.vx !== 0 || s.vy !== 0) continue;
    // 장판은 매 프레임 닿으므로 초당 피해(피해 ×3/초)로 나눠 준다 — 한 프레임에 통째로 주면 즉사다
    for (const a of world.arrows) if (targetable(a) && (a.x - s.x) ** 2 + (a.y - s.y) ** 2 <= s.radius * s.radius) hit(world, a, "fire", 0, s.damage * 3 * dtSec, true);
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
  for (let i = world.fades.length - 1; i >= 0; i -= 1) { world.fades[i].ms -= dtSec * 1000; if (world.fades[i].ms <= 0) world.fades.splice(i, 1); }

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
  world.skillTimers = { fire: 0, water: 0, ice: 0, earth: 0, bolt: 0, wind: 0, poison: 0, holy: 0, shadow: 0, meteor: 0, ultimate: 0 };
  world.holyBeam = null;
  world.basicTimer = 0;
  world.shotFlashMs = 0;
  world.boltFrom = null;
  world.affinityPop = null;
  for (const p of world.sparks) p.active = false;
  world.shakeMs = 0; world.shakeAmp = 0;
  world.streak = 0; world.streakMs = 0;
  world.heroAura = null;
  world.fades.length = 0;
  world.skillKills = 0;
  world.epicPicks = 0;   // 클리어마다 일일 임무에 더하므로 skillKills 처럼 스테이지 단위
}
