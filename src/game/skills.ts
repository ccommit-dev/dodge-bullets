import type { PlayerStats } from "./types";

/**
 * 화살 원정 영구 스킬 — **속성 화살** (2026-09-29).
 *
 * 2026-09-28 설계(연속 사격·관통 화살·화염탄·빙결 파동·번개 사슬)는 활을 장착해도 **스킬 레벨이
 * 0 이면 아무것도 쏘지 않았다** — 실기기에서 "활은 들었는데 공격이 안 나간다"로 읽혔다(스크린샷).
 * 이름도 활과 연결이 안 됐다(화염탄·파동).
 *
 * 다시 설계한다:
 *   · **기본 사격** — 활/지팡이를 끼면 스킬과 무관하게 **항상** 화살이 나간다 (skillShots.ts).
 *     스킬 레벨 0 계정도 활을 쏜다. 보스는 못 깎는다 — 보스는 속성 화살·검격의 몫.
 *   · **속성 화살 5종** — 불·물·얼음·흙·번개. 각각 위력(보스를 깎는 양)·속성 효과·**상성**
 *     (특정 적 화살 종류에 강함)을 가진다. 표는 화면에 그대로 보인다.
 *   · **일섬** — 게이지 필살기(검격)는 그대로.
 *
 * 참고 게임 구조는 유지한다: 레벨 1~10 · 재화 둘(골드 + 원정 인장) · **짝수 레벨이 마일스톤** ·
 * 잠긴 스킬은 원정 스테이지 클리어로 열린다.
 */

/* ────────────────── 원거리 무기 (탈착) ────────────────── */

export type RangedWeaponId = "none" | "bow" | "staff";

export type RangedWeaponDef = {
  id: Exclude<RangedWeaponId, "none">;
  name: string;
  desc: string;
  /** 이 계열 스킬의 쿨타임을 줄인다 */
  affinity: SkillFamily;
  /** 원정 최고 스테이지 조건 */
  unlockStage: number;
};

/** 스킬 계열 — 무기 상성에 쓴다 */
export type SkillFamily = "physical" | "magic" | "none";

export const RANGED_WEAPONS: RangedWeaponDef[] = [
  { id: "bow", name: "장궁", desc: "기본 사격 + 물리 화살(물·흙) 재사용 −12%", affinity: "physical", unlockStage: 1 },
  { id: "staff", name: "수정 지팡이", desc: "기본 사격 + 마법 화살(불·얼음·번개) 재사용 −12%", affinity: "magic", unlockStage: 2 },
];

export const WEAPON_BY_ID: Record<string, RangedWeaponDef> =
  Object.fromEntries(RANGED_WEAPONS.map((w) => [w.id, w]));

/** 무기 상성 배수 — 계열이 맞으면 쿨타임 0.88배 */
export function weaponCooldownMul(weapon: RangedWeaponId, family: SkillFamily): number {
  if (weapon === "none" || family === "none") return 1;
  return WEAPON_BY_ID[weapon]?.affinity === family ? 0.88 : 1;
}

/* ────────────────── 기본 사격 ────────────────── */

/** 활/지팡이만 끼면 나가는 기본 화살 — 스킬이 아니라 무기의 것이다 */
export const BASIC_SHOT_COOLDOWN = 1.5;
export const BASIC_SHOT_SPEED = 720;

/* ────────────────── 속성 ────────────────── */

export type Element = "basic" | "fire" | "water" | "ice" | "earth" | "bolt";

/** 적 화살 종류 (types.Arrow.kind) — 상성표가 이걸 가리킨다 */
export type ArrowKind = "normal" | "aimed" | "fan" | "ricochet" | "explosive" | "homing";

export const ARROW_KIND_LABEL: Record<ArrowKind, string> = {
  normal: "일반", aimed: "조준", fan: "부채꼴", ricochet: "튕김", explosive: "폭발", homing: "유도",
};

export const ELEMENT_LABEL: Record<Element, string> = {
  basic: "무속성", fire: "불", water: "물", ice: "얼음", earth: "흙", bolt: "번개",
};

/** 화면·이펙트 색 — 속성마다 하나 */
export const ELEMENT_COLOR: Record<Element, string> = {
  basic: "#e2e8f0", fire: "#fb923c", water: "#38bdf8", ice: "#a5f3fc", earth: "#d6a35c", bolt: "#fde047",
};

/* ────────────────── 스킬 ────────────────── */

export type ExpeditionSkillId = "fire" | "water" | "ice" | "earth" | "bolt" | "ultimate";

export const SKILL_MAX_LEVEL = 10;

export type SkillMilestone = { level: number; kind: "unlock" | "stat"; label: string };

export type ExpeditionSkillDef = {
  id: ExpeditionSkillId;
  name: string;
  /** 참고 게임의 '유형' 칸 */
  kind: string;
  family: SkillFamily;
  element: Element;
  icon: string;
  desc: string;
  /** 명중 효과 한 줄 — 표의 '효과' 칸 */
  effect: string;
  /** 상성 — 이 종류의 적 화살에 피해 ×1.5 · 보스 깎기 +1 · 효과 ×1.5. null 이면 없음(일섬) */
  strongVs: ArrowKind | null;
  /** 이 스테이지를 클리어해야 열린다. 0 이면 처음부터 */
  unlockStage: number;
  goldBase: number;
  sealBase: number;
  milestones: SkillMilestone[];
  readout: (level: number) => Array<{ label: string; value: string; delta?: string }>;
};

/**
 * 강화 비용 — 골드 + **그 스킬의 조각**. 참고 게임의 진행바 `126/225` 가 이것이다:
 * 스킬마다 제 조각을 모아 제 레벨을 올린다. 공용 재화로 두면 모든 카드의 진행바가 같은 숫자가 된다.
 */
export function skillCost(def: ExpeditionSkillDef, level: number): { gold: number; shards: number } {
  const n = Math.max(1, level);
  return {
    gold: Math.round(def.goldBase * Math.pow(1.55, n - 1)),
    shards: Math.round(def.sealBase * Math.pow(1.4, n - 1)),
  };
}

export type SkillShards = Record<ExpeditionSkillId, number>;

export function emptyShards(): SkillShards {
  return { fire: 0, water: 0, ice: 0, earth: 0, bolt: 0, ultimate: 0 };
}

/**
 * 한 스테이지가 끝났을 때 받는 조각 — **그 판에 습득해 쓴 스킬의 조각**이 나온다.
 * 쓴 것이 자란다 — 참고 게임 가이드의 "자주 나오는 스킬부터 강화" 가 저절로 된다.
 * 일섬은 카드로 습득하는 것이 아니라 게이지 필살기라 쓴 횟수만큼.
 */
export function shardDrops(
  acquired: Partial<Record<ExpeditionSkillId, boolean>>,
  stageIndex: number,
  cleared: boolean,
  ultCount: number,
): Partial<SkillShards> {
  const out: Partial<SkillShards> = {};
  (Object.keys(acquired) as ExpeditionSkillId[]).forEach((id) => {
    if (!acquired[id] || id === "ultimate") return;
    out[id] = cleared ? 2 + Math.max(0, stageIndex) : 1;
  });
  const ult = Math.min(3, Math.max(0, ultCount)) + (cleared ? 1 : 0);
  if (ult > 0) out.ultimate = ult;
  return out;
}

/** 수집 보너스 — 누적 스킬 레벨 하나당 모든 화살 재사용 −0.3% (최대 −18%). 배너의 숫자가 실제 효과다 */
export const COLLECTION_PER_LEVEL = 0.003;
export const COLLECTION_CAP = 0.18;
export function collectionCooldownMul(levels: ExpeditionSkillLevels): number {
  const total = (Object.values(levels) as number[]).reduce((s, v) => s + Math.max(0, v), 0);
  return 1 - Math.min(COLLECTION_CAP, COLLECTION_PER_LEVEL * total);
}

export type ExpeditionSkillLevels = Record<ExpeditionSkillId, number>;

export function emptySkillLevels(): ExpeditionSkillLevels {
  return { fire: 0, water: 0, ice: 0, earth: 0, bolt: 0, ultimate: 0 };
}

/**
 * 2026-09-28 저장(연속 사격·관통·화염탄·빙결·번개)을 새 키로 옮긴다 — 올린 레벨을 잃지 않게.
 * 연속 사격은 기본 사격이 됐으므로 그 레벨은 불화살에 얹는다(둘 중 큰 값).
 */
export function migrateSkillLevels(raw: Record<string, unknown> | undefined): Partial<ExpeditionSkillLevels> {
  if (!raw) return {};
  const n = (k: string) => (typeof raw[k] === "number" ? (raw[k] as number) : 0);
  const out: Partial<ExpeditionSkillLevels> = {};
  const legacy = ["volley", "pierce", "flame", "frost", "chain"].some((k) => k in raw);
  if (!legacy) return raw as Partial<ExpeditionSkillLevels>;
  out.fire = Math.max(n("flame"), n("volley"), n("fire"));
  out.water = Math.max(n("pierce"), n("water"));
  out.ice = Math.max(n("frost"), n("ice"));
  out.bolt = Math.max(n("chain"), n("bolt"));
  out.earth = n("earth");
  out.ultimate = n("ultimate");
  return out;
}

/* ── 레벨 → 효과. 짝수 레벨(마일스톤)에서만 계단식으로 오른다 ──
 * 아래 함수가 유일한 진실이고 milestones 의 문구는 이것을 설명한 것이다.
 * verify-systems 가 "표와 수치가 같은 레벨에서 움직이는지" 를 단언한다.
 */
const step = (lv: number, at: number) => (lv >= at ? 1 : 0);

/** 불화살 — 재사용 · 폭발 반경 · 위력(보스 깎기) */
export function fireCooldown(lv: number): number { return 5.5 - 0.6 * step(lv, 4) - 0.7 * step(lv, 10); }
export function fireRadius(lv: number): number { return 48 + 10 * step(lv, 2) + 12 * step(lv, 6) + 14 * step(lv, 8); }
export function firePower(lv: number): number { return 1 + step(lv, 8); }
/** 물화살 — 재사용 · 관통 수 · 위력 */
export function waterCooldown(lv: number): number { return 4.5 - 0.5 * step(lv, 4) - 0.6 * step(lv, 8); }
export function waterPierce(lv: number): number { return 2 + step(lv, 2) + step(lv, 6) + step(lv, 10); }
export function waterPower(lv: number): number { void lv; return 1; }
/** 얼음화살 — 재사용 · 빙결 반경 · 감속 배수 · 위력 */
export function iceCooldown(lv: number): number { return 6.5 - 0.7 * step(lv, 4) - 0.8 * step(lv, 8); }
export function iceRadius(lv: number): number { return 70 + 14 * step(lv, 2) + 18 * step(lv, 6); }
export function iceSlow(lv: number): number { return 0.55 - 0.08 * step(lv, 10); }
export function icePower(lv: number): number { void lv; return 1; }
/** 흙화살 — 재사용 · 위력(보스를 크게 깎는다) · 명중 반경 */
export function earthCooldown(lv: number): number { return 8 - 0.7 * step(lv, 4) - 0.8 * step(lv, 8); }
export function earthPower(lv: number): number { return 2 + step(lv, 6) + step(lv, 10); }
export function earthRadius(lv: number): number { return 18 + 4 * step(lv, 2); }
/** 번개화살 — 재사용 · 연쇄 수 · 위력 */
export function boltCooldown(lv: number): number { return 8 - 0.8 * step(lv, 6); }
export function boltTargets(lv: number): number { return 2 + step(lv, 2) + step(lv, 4) + step(lv, 8) + step(lv, 10); }
export function boltPower(lv: number): number { void lv; return 1; }
/* ── 피해와 화살 체력 (2026-09-29) ──
 * 참고 게임처럼 적(화살)에게 체력이 있고 스테이지가 깊을수록 단단하다. 피해는 **레벨마다** 오른다 —
 * 짝수 레벨의 마일스톤(재사용·반경·관통…)과 따로. 홀수 레벨이 아무것도 안 올리던 것을 고친다.
 * 검격·일섬은 체력과 무관하게 한 번에 벤다.
 */
export const DAMAGE_PER_LEVEL = 0.1;
const scaled = (base: number, lv: number) => Math.round(base * (1 + DAMAGE_PER_LEVEL * Math.max(0, lv - 1)) * 100) / 100;
/** 기본 사격 피해 — 무기의 것, 스킬 레벨과 무관 */
export const BASIC_DAMAGE = 1;
export function fireDamage(lv: number): number { return scaled(1.6, lv); }
export function waterDamage(lv: number): number { return scaled(1.4, lv); }
export function iceDamage(lv: number): number { return scaled(1.2, lv); }
export function earthDamage(lv: number): number { return scaled(2.6, lv); }
export function boltDamage(lv: number): number { return scaled(1.3, lv); }

/** 스테이지별 화살 체력 — S1 은 기본 사격 한 발, 깊어질수록 속성 화살과 레벨이 필요하다. 성벽은 계속 오른다 */
// S2 는 1.6 — 불화살 Lv1(1.6)이 S2 까지 한 발이다. 초반 웨이브는 안정적으로 넘어야 한다(가이드)
export const ARROW_HP = [1, 1.6, 2.8, 3.6];
export function arrowHpFor(stageIndex: number): number {
  const i = Math.max(0, stageIndex);
  return i < ARROW_HP.length ? ARROW_HP[i] : ARROW_HP[ARROW_HP.length - 1] + (i - ARROW_HP.length + 1) * 0.7;
}

/** 그 피해로 한 발에 부수는 가장 깊은 스테이지 — 표의 "S2 까지 한 발". 0 이면 S1 도 두 발 */
export function oneShotStage(damage: number): number {
  let n = 0;
  for (let i = 0; i < ARROW_HP.length; i += 1) if (damage + 1e-9 >= ARROW_HP[i]) n = i + 1;
  return n;
}
const reach = (d: number) => { const n = oneShotStage(d); return n > 0 ? `${num(d)} · S${n} 까지 한 발` : `${num(d)}`; };

/** 일섬 — 베기 창 배수 · 게이지 획득 배수 */
export function ultSwingMul(lv: number): number { return 1 + 0.08 * step(lv, 2) + 0.08 * step(lv, 6) + 0.12 * step(lv, 10); }
export function ultGaugeMul(lv: number): number { return 1 + 0.12 * step(lv, 4) + 0.12 * step(lv, 8); }

function num(v: number, unit = ""): string { return `${Math.round(v * 10) / 10}${unit}`; }
/** 다음 레벨 증가분 — 변화가 없으면 undefined (초록 숫자는 '다음 레벨에 오른다'는 뜻이어야 한다) */
function nextDelta(lv: number, f: (n: number) => number, unit = "", digits = 0): string | undefined {
  if (lv >= SKILL_MAX_LEVEL) return undefined;
  const d = f(lv + 1) - f(lv);
  if (Math.abs(d) < 1e-9) return undefined;
  const v = digits ? d.toFixed(digits) : String(Math.round(d));
  return `${d > 0 ? "+" : ""}${v}${unit}`;
}

const vs = (k: ArrowKind) => `${ARROW_KIND_LABEL[k]} 화살`;

export const EXPEDITION_SKILLS: ExpeditionSkillDef[] = [
  {
    id: "fire",
    name: "불화살",
    kind: "폭발",
    family: "magic",
    element: "fire",
    icon: "fire",
    desc: "[불화살] 학습. 명중한 자리에서 터져 주변 화살을 함께 태운다.",
    effect: "명중 시 폭발",
    strongVs: "fan",
    unlockStage: 0,
    goldBase: 260,
    sealBase: 3,
    milestones: [
      { level: 2, kind: "unlock", label: "해금 [확산] — 폭발 반경 +10" },
      { level: 4, kind: "stat", label: "재사용 −0.6초" },
      { level: 6, kind: "unlock", label: "해금 [연소] — 폭발 반경 +12" },
      { level: 8, kind: "unlock", label: "해금 [맹화] — 보스 깎기 +1 · 반경 +14" },
      { level: 10, kind: "stat", label: "재사용 −0.7초" },
    ],
    readout: (lv) => [
      { label: "피해", value: reach(fireDamage(lv)), delta: nextDelta(lv, fireDamage, "", 2) },
      { label: "보스 깎기", value: `${firePower(lv)}`, delta: nextDelta(lv, firePower) },
      { label: "폭발 반경", value: `${fireRadius(lv)}`, delta: nextDelta(lv, fireRadius) },
      { label: "재사용", value: num(fireCooldown(lv), "초"), delta: nextDelta(lv, fireCooldown, "초", 1) },
      { label: "상성", value: vs("fan") },
    ],
  },
  {
    id: "water",
    name: "물화살",
    kind: "관통",
    family: "physical",
    element: "water",
    icon: "water",
    desc: "[물화살] 학습. 멈추지 않고 흘러가며 여러 화살을 꿰뚫는다. 폭발 화살을 끈다.",
    effect: "관통",
    strongVs: "explosive",
    unlockStage: 1,
    goldBase: 300,
    sealBase: 4,
    milestones: [
      { level: 2, kind: "unlock", label: "해금 [급류] — 관통 +1" },
      { level: 4, kind: "stat", label: "재사용 −0.5초" },
      { level: 6, kind: "unlock", label: "해금 [범람] — 관통 +1" },
      { level: 8, kind: "stat", label: "재사용 −0.6초" },
      { level: 10, kind: "unlock", label: "해금 [해일] — 관통 +1" },
    ],
    readout: (lv) => [
      { label: "피해", value: reach(waterDamage(lv)), delta: nextDelta(lv, waterDamage, "", 2) },
      { label: "보스 깎기", value: `${waterPower(lv)}` },
      { label: "관통", value: `${waterPierce(lv)}개`, delta: nextDelta(lv, waterPierce, "개") },
      { label: "재사용", value: num(waterCooldown(lv), "초"), delta: nextDelta(lv, waterCooldown, "초", 1) },
      { label: "상성", value: vs("explosive") },
    ],
  },
  {
    id: "ice",
    name: "얼음화살",
    kind: "빙결",
    family: "magic",
    element: "ice",
    icon: "ice",
    desc: "[얼음화살] 학습. 명중한 화살과 주변을 얼려 느리게 만든다. 유도 화살은 길을 잃는다.",
    effect: "명중 시 빙결",
    strongVs: "homing",
    unlockStage: 2,
    goldBase: 320,
    sealBase: 4,
    milestones: [
      { level: 2, kind: "unlock", label: "해금 [서리] — 빙결 반경 +14" },
      { level: 4, kind: "stat", label: "재사용 −0.7초" },
      { level: 6, kind: "unlock", label: "해금 [한파] — 빙결 반경 +18" },
      { level: 8, kind: "stat", label: "재사용 −0.8초" },
      { level: 10, kind: "unlock", label: "해금 [절대 영도] — 감속 강화" },
    ],
    readout: (lv) => [
      { label: "피해", value: reach(iceDamage(lv)), delta: nextDelta(lv, iceDamage, "", 2) },
      { label: "보스 깎기", value: `${icePower(lv)}` },
      { label: "빙결 반경", value: `${iceRadius(lv)}`, delta: nextDelta(lv, iceRadius) },
      { label: "감속", value: `${Math.round((1 - iceSlow(lv)) * 100)}%` },
      { label: "재사용", value: num(iceCooldown(lv), "초"), delta: nextDelta(lv, iceCooldown, "초", 1) },
      { label: "상성", value: vs("homing") },
    ],
  },
  {
    id: "earth",
    name: "흙화살",
    kind: "강타",
    family: "physical",
    element: "earth",
    icon: "earth",
    desc: "[흙화살] 학습. 무거운 돌촉 화살. 느리지만 보스 화살을 크게 깎고 튕기는 화살을 땅에 박는다.",
    effect: "고피해 · 튕김 봉쇄",
    strongVs: "ricochet",
    unlockStage: 2,
    goldBase: 360,
    sealBase: 4,
    milestones: [
      { level: 2, kind: "unlock", label: "해금 [굵은 촉] — 명중 반경 +4" },
      { level: 4, kind: "stat", label: "재사용 −0.7초" },
      { level: 6, kind: "unlock", label: "해금 [바위 촉] — 보스 깎기 +1" },
      { level: 8, kind: "stat", label: "재사용 −0.8초" },
      { level: 10, kind: "unlock", label: "해금 [산사태] — 보스 깎기 +1" },
    ],
    readout: (lv) => [
      { label: "피해", value: reach(earthDamage(lv)), delta: nextDelta(lv, earthDamage, "", 2) },
      { label: "보스 깎기", value: `${earthPower(lv)}`, delta: nextDelta(lv, earthPower) },
      { label: "명중 반경", value: `${earthRadius(lv)}`, delta: nextDelta(lv, earthRadius) },
      { label: "재사용", value: num(earthCooldown(lv), "초"), delta: nextDelta(lv, earthCooldown, "초", 1) },
      { label: "상성", value: vs("ricochet") },
    ],
  },
  {
    id: "bolt",
    name: "번개화살",
    kind: "연쇄",
    family: "magic",
    element: "bolt",
    icon: "bolt",
    desc: "[번개화살] 학습. 쏘는 순간 가까운 화살 여러 개를 번개로 잇는다. 조준 화살을 먼저 끊는다.",
    effect: "즉발 연쇄",
    strongVs: "aimed",
    unlockStage: 3,
    goldBase: 420,
    sealBase: 5,
    milestones: [
      { level: 2, kind: "unlock", label: "해금 [분기] — 연쇄 +1" },
      { level: 4, kind: "stat", label: "연쇄 +1" },
      { level: 6, kind: "unlock", label: "해금 [과부하] — 재사용 −0.8초" },
      { level: 8, kind: "stat", label: "연쇄 +1" },
      { level: 10, kind: "unlock", label: "해금 [뇌전 폭풍] — 연쇄 +1" },
    ],
    readout: (lv) => [
      { label: "피해", value: reach(boltDamage(lv)), delta: nextDelta(lv, boltDamage, "", 2) },
      { label: "보스 깎기", value: `${boltPower(lv)}` },
      { label: "연쇄 수", value: `${boltTargets(lv)}`, delta: nextDelta(lv, boltTargets) },
      { label: "재사용", value: num(boltCooldown(lv), "초"), delta: nextDelta(lv, boltCooldown, "초", 1) },
      { label: "상성", value: vs("aimed") },
    ],
  },
  {
    id: "ultimate",
    name: "일섬",
    kind: "궁극",
    family: "none",
    element: "basic",
    icon: "ultimate",
    desc: "[일섬] 강화. 게이지가 빨리 차고 베기 창이 길어진다.",
    effect: "화면 전체 파쇄",
    strongVs: null,
    unlockStage: 0,
    goldBase: 360,
    sealBase: 5,
    milestones: [
      { level: 2, kind: "unlock", label: "해금 [잔광] — 베기 창 +8%" },
      { level: 4, kind: "stat", label: "게이지 획득 +12%" },
      { level: 6, kind: "unlock", label: "해금 [여운] — 베기 창 +8%" },
      { level: 8, kind: "stat", label: "게이지 획득 +12%" },
      { level: 10, kind: "unlock", label: "해금 [무한 일섬] — 베기 창 +12%" },
    ],
    readout: (lv) => [
      { label: "유형", value: "궁극" },
      { label: "베기 창", value: ultSwingMul(lv) === 1 ? "기본" : `+${Math.round(ultSwingMul(lv) * 100 - 100)}%` },
      { label: "게이지", value: ultGaugeMul(lv) === 1 ? "기본" : `+${Math.round(ultGaugeMul(lv) * 100 - 100)}%` },
      { label: "사거리", value: "자신 주변" },
    ],
  },
];

export const SKILL_BY_ID: Record<ExpeditionSkillId, ExpeditionSkillDef> =
  Object.fromEntries(EXPEDITION_SKILLS.map((s) => [s.id, s])) as Record<ExpeditionSkillId, ExpeditionSkillDef>;

/**
 * 일섬만 PlayerStats 에 닿는다 (베기 창 = slowDurationMs). 속성 화살은 자동 발사 스킬이라
 * `skillShots.ts` 가 world 를 보고 직접 쏜다 — 스탯에 얹을 것이 없다.
 */
export function applySkillLevels(stats: PlayerStats, levels: ExpeditionSkillLevels): PlayerStats {
  const out = { ...stats };
  out.slowDurationMs *= ultSwingMul(levels.ultimate);
  return out;
}

/** 게이지 획득 배수 — arrows.addGauge 가 곱한다 */
export function gaugeGainMul(levels: ExpeditionSkillLevels): number { return ultGaugeMul(levels.ultimate); }

/** 상단 배너 — 참고 게임의 "총 치명타 피해 증가 +N%" 자리. bonusPct 는 **실제로 걸리는** 수집 보너스다 */
export function skillSummary(levels: ExpeditionSkillLevels): { totalLevels: number; bonusPct: number } {
  const totalLevels = EXPEDITION_SKILLS.reduce((s, d) => s + (levels[d.id] ?? 0), 0);
  const bonusPct = Math.round((1 - collectionCooldownMul(levels)) * 1000) / 10;
  return { totalLevels, bonusPct };
}

export function skillUnlocked(def: ExpeditionSkillDef, dodgeBestStage: number): boolean {
  return dodgeBestStage >= def.unlockStage;
}

export function weaponUnlocked(def: RangedWeaponDef, dodgeBestStage: number): boolean {
  return dodgeBestStage >= def.unlockStage;
}
