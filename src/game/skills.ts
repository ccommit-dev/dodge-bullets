import type { PlayerStats } from "./types";
import { STAGES, getStage } from "./stages";

/**
 * 성문 방어 영구 스킬 — **속성 화살** (2026-09-29).
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
 * 참고 게임 구조는 유지한다: 레벨 1~10 · 재화 둘(골드 + 그 스킬의 조각) · **짝수 레벨이 마일스톤** ·
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
  // 맨손은 없다 — 활만 쓰는 콘텐츠다. 저장의 "none" 은 장궁으로 되돌린다 (progression/model.ts, 2026-10-01)
  { id: "bow", name: "장궁", desc: "기본 사격 + 일제 사격 · 물리 화살(물·흙) 재사용 −12%", affinity: "physical", unlockStage: 0 },
  { id: "staff", name: "수정 지팡이", desc: "마력탄 + 일제 사격 · 마법 화살(불·얼음·번개) 재사용 −12%", affinity: "magic", unlockStage: 2 },
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
export const BASIC_SHOT_COOLDOWN = 0.55;   // 1.5 → 0.55 (2026-10-01 방어막): 할 일이 피하기에서 떨구기로 — 활이 쉴 새 없이 나간다
export const BASIC_SHOT_SPEED = 720;
/**
 * 기본 사격 강화 (2026-10-02) — 정비 화면에서 **골드만으로** 올린다. 속성 화살과 달리 조각·인장이 없다:
 * 활은 늘 쓰는 것이라 꾸준한 골드 싱크가 되고, 새 계정도 첫날부터 올릴 것이 있다. 레벨마다 피해 +15% · 재사용 −3%
 */
/** 2026-10-02 부터 기본 사격 단계 = 대장간 **활** 단계(0~20). 피해 +8%·재사용 −1.5% (아래 weaponForge* 와 같은 곡선) */
export const BASIC_LEVEL_MAX = 20;
export function basicShotCost(level: number): number { return Math.round(80 * Math.pow(1.6, Math.max(1, level) - 1)); }
export function basicDamageMul(level: number): number { return 1 + 0.08 * Math.max(0, Math.min(20, level)); }
export function basicCooldownMul(level: number): number { return 1 - 0.015 * Math.max(0, Math.min(20, level)); }

/* ────────────────── 속성 ────────────────── */

export type Element = "basic" | "fire" | "water" | "ice" | "earth" | "bolt" | "wind" | "poison" | "holy" | "shadow" | "meteor";

/** 몬스터 종류 (types.Arrow.kind — 엔티티 이름은 호환상 Arrow) — 상성표가 이걸 가리킨다 */
export type ArrowKind = "normal" | "aimed" | "fan" | "ricochet" | "explosive" | "homing";

/** 몬스터 종류 이름 — 내려오는 것은 화살이 아니라 몬스터다 (2026-10-01). 종류(kind)는 그대로, 겉모습·이름만 몬스터 */
export const ARROW_KIND_LABEL: Record<ArrowKind, string> = {
  normal: "슬라임", aimed: "그림자 늑대", fan: "고블린 떼", ricochet: "오우거", explosive: "폭염 비룡", homing: "달빛 늑대",
};

export const ELEMENT_LABEL: Record<Element, string> = {
  basic: "무속성", fire: "불", water: "물", ice: "얼음", earth: "흙", bolt: "번개",
  wind: "바람", poison: "독", holy: "성광", shadow: "그림자", meteor: "운석",
};

/** 화면·이펙트 색 — 속성마다 하나 */
export const ELEMENT_COLOR: Record<Element, string> = {
  basic: "#e2e8f0", fire: "#fb923c", water: "#38bdf8", ice: "#a5f3fc", earth: "#d6a35c", bolt: "#fde047",
  wind: "#5eead4", poison: "#a3e635", holy: "#fef9c3", shadow: "#a78bfa", meteor: "#f97316",
};

/* ────────────────── 스킬 ────────────────── */

/**
 * 스킬 무기 10종 + 화살비 (2026-10-02, 사용자: "아웃로 디펜스 참고해서 레벨별로 10개 스킬무기 장착하되 한 판에는 최대 4개").
 * 예전엔 속성 화살 5종을 런 중 카드로 '습득'했다 — 화면에는 활·지팡이·기본 활만 보여 무기가 셋뿐으로 읽혔다.
 * 이제 각 스킬은 **무기**다: 계정 레벨로 해금 → 인장으로 배움 → 골드·조각으로 강화 → 정비에서 **4칸에 장착**하면
 * 그 판은 처음부터 쏜다(곁에 무기 정령으로 떠 있다). 화살비(ultimate)는 무기가 아니라 게이지 필살기로 그대로.
 */
export type ExpeditionSkillId = "fire" | "water" | "ice" | "earth" | "bolt" | "wind" | "poison" | "holy" | "shadow" | "meteor" | "ultimate";
export type SkillWeaponId = Exclude<ExpeditionSkillId, "ultimate">;
export const SKILL_WEAPON_IDS: SkillWeaponId[] = ["fire", "water", "ice", "earth", "bolt", "wind", "poison", "holy", "shadow", "meteor"];
/** 한 판에 장착하는 스킬 무기 수 */
export const LOADOUT_MAX = 4;

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
  /** 상성 — 이 종류의 몬스터에 피해 ×1.5 · 보스 깎기 +1 · 효과 ×1.5. null 이면 없음(화살비) */
  strongVs: ArrowKind | null;
  /** 이 스테이지를 클리어해야 열린다. 0 이면 처음부터 (2026-10-02 부터는 unlockLevel 이 기준 — 이 값은 쓰지 않는다) */
  unlockStage: number;
  /** 계정 레벨 해금 — "레벨별로 10개 스킬 무기". 이미 배운 무기(레벨 ≥ 1)는 레벨이 모자라도 계속 쓴다 */
  unlockLevel: number;
  /** 무기 이름 — 카드·정비 화면에 보인다 (name 은 쏘는 화살의 이름) */
  weapon: string;
  goldBase: number;
  sealBase: number;
  milestones: SkillMilestone[];
  readout: (level: number) => Array<{ label: string; value: string; delta?: string }>;
};

/**
 * 강화 비용 — 골드 + **그 스킬의 조각**. 참고 게임의 진행바 `126/225` 가 이것이다:
 * 스킬마다 제 조각을 모아 제 레벨을 올린다. 공용 재화로 두면 모든 카드의 진행바가 같은 숫자가 된다.
 */
export function skillCost(def: ExpeditionSkillDef, level: number): { gold: number; shards: number; seals: number } {
  const n = Math.max(1, level);
  // **학습(Lv1)은 인장으로** — 조각은 그 스킬을 쓴 판에서만 나오고 습득 카드는 Lv1 이상이어야 뜨므로,
  // Lv1 에 조각을 요구하면 새 계정은 두 번째 스킬을 영원히 못 배운다 (주간 시뮬 실측, 2026-10-01).
  // 인장은 스테이지를 깰 때마다 나오니 "다음 스테이지를 깨면 다음 스킬을 배운다"는 리듬이 된다
  if (n === 1) return { gold: def.goldBase, shards: 0, seals: LEARN_SEALS[def.id] };
  return {
    gold: Math.round(def.goldBase * Math.pow(1.55, n - 1)),
    shards: Math.round(def.sealBase * Math.pow(1.4, n - 1)),
    seals: 0,
  };
}

/** 학습 인장 — 해금 스테이지 순서대로 비싸진다. 하루 서너 판이면 인장 15~25 가 모인다 */
export const LEARN_SEALS: Record<ExpeditionSkillId, number> = { fire: 0, ultimate: 6, water: 8, ice: 10, earth: 10, bolt: 14, wind: 16, poison: 18, holy: 20, shadow: 22, meteor: 26 };

export type SkillShards = Record<ExpeditionSkillId, number>;

export function emptyShards(): SkillShards {
  return { fire: 0, water: 0, ice: 0, earth: 0, bolt: 0, wind: 0, poison: 0, holy: 0, shadow: 0, meteor: 0, ultimate: 0 };
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
    // 50 스테이지(2026-10-02): 예전 "2 + 스테이지 번호"는 4 스테이지 시절 값이라 25 스테이지에선 한 판에 26개 — 일주일에 만렙이 셋 나왔다
    out[id] = cleared ? 2 + Math.min(6, Math.floor(Math.max(0, stageIndex) / 6)) : 1;
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
  return { fire: 0, water: 0, ice: 0, earth: 0, bolt: 0, wind: 0, poison: 0, holy: 0, shadow: 0, meteor: 0, ultimate: 0 };
}

/**
 * 장착 기본값 — 배운 무기를 레벨 높은 순으로 최대 4개 (2026-10-02). 장착 칸이 생기기 전 계정이 첫 판에
 * 기본 사격만 쏘는 일이 없게, 저장에 장착 정보가 없으면 이걸 쓴다
 */
export function defaultLoadout(levels: Partial<ExpeditionSkillLevels>): SkillWeaponId[] {
  return SKILL_WEAPON_IDS.filter((id) => (levels[id] ?? 0) > 0)
    .sort((a, b) => (levels[b] ?? 0) - (levels[a] ?? 0) || SKILL_WEAPON_IDS.indexOf(a) - SKILL_WEAPON_IDS.indexOf(b))
    .slice(0, LOADOUT_MAX);
}

/** 저장의 장착값 정리 — 모르는 id·중복·미습득은 빼고 4개까지. 비어 있으면(장착 칸 이전 저장) 기본값 */
export function normalizeLoadout(raw: unknown, levels: Partial<ExpeditionSkillLevels>): SkillWeaponId[] {
  if (!Array.isArray(raw)) return defaultLoadout(levels);
  const out: SkillWeaponId[] = [];
  for (const v of raw) {
    if (typeof v !== "string" || !SKILL_WEAPON_IDS.includes(v as SkillWeaponId) || out.includes(v as SkillWeaponId)) continue;
    if ((levels[v as SkillWeaponId] ?? 0) <= 0) continue;
    out.push(v as SkillWeaponId);
    if (out.length >= LOADOUT_MAX) break;
  }
  return out;
}

/* ────────────────── 대장간: 활 · 지팡이 강화 (2026-10-02) ──────────────────
 * 사용자: "대장간에는 성벽원정에서 사용하는 지팡이, 활을 추가로 강화하고 강화한 내용 가지고 성벽원정에 적용".
 * 활 = 기본 사격(주인공의 활)과 **물리** 스킬 무기, 지팡이 = **마법** 스킬 무기. 골드 + 강화석, 확정 강화(파괴 없음).
 * 예전 '기본 사격 강화'(정비, 골드만)는 활 강화로 옮겼다 — 저장의 expeditionBasic 은 활 단계로 이관된다.
 */
export type WeaponForgeLevels = { bow: number; staff: number };
export const WEAPON_FORGE_MAX = 20;
export function emptyWeaponForge(): WeaponForgeLevels { return { bow: 0, staff: 0 }; }
/** 한 단계 비용 — 골드는 1.32배씩, 강화석은 단계마다 +2 */
export function weaponForgeCost(level: number): { gold: number; stones: number } {
  const n = Math.max(1, level);
  return { gold: Math.round(1_500 * Math.pow(1.32, n - 1)), stones: 2 + n * 2 };
}
/** 피해 배수 — 단계마다 +8% (20단계 ×2.6) */
export function weaponForgeDamageMul(level: number): number { return 1 + 0.08 * Math.max(0, Math.min(WEAPON_FORGE_MAX, level)); }
/** 재사용 배수 — 단계마다 −1.5% (20단계 ×0.7) */
export function weaponForgeCooldownMul(level: number): number { return 1 - 0.015 * Math.max(0, Math.min(WEAPON_FORGE_MAX, level)); }
/** 이 스킬 무기에 붙는 대장간 배수 — 물리는 활, 마법은 지팡이 */
export function forgeFamilyLevel(levels: WeaponForgeLevels, family: SkillFamily): number {
  return family === "physical" ? levels.bow : family === "magic" ? levels.staff : 0;
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
/** 질풍 부메랑 — 재사용 · 사거리(되돌아오는 지점) · 꿰뚫고 돌아온다 */
export function windCooldown(lv: number): number { return 5 - 0.5 * step(lv, 4) - 0.6 * step(lv, 8); }
export function windRange(lv: number): number { return 300 + 40 * step(lv, 2) + 50 * step(lv, 6); }
export function windPower(lv: number): number { return 1 + step(lv, 10); }
/** 독침 단궁 — 재사용 · 중독 시간 · 초당 독 피해(명중 피해 대비) */
export function poisonCooldown(lv: number): number { return 4 - 0.4 * step(lv, 4) - 0.5 * step(lv, 8); }
export function poisonSeconds(lv: number): number { return 3 + step(lv, 2) + step(lv, 6); }
export function poisonDpsMul(lv: number): number { return 0.5 + 0.15 * step(lv, 6) + 0.2 * step(lv, 10); }
export function poisonPower(lv: number): number { void lv; return 1; }
/** 성광 홀 — 재사용 · 방어막 수리량(명중당) · 위력 */
export function holyCooldown(lv: number): number { return 7 - 0.7 * step(lv, 4) - 0.8 * step(lv, 8); }
/** 수리량은 명중당 — 무기가 실제 시간으로 쏘므로(월드의 3배) 예전 기준의 1/3 */
export function holyRepair(lv: number): number { return 0.5 + 0.35 * step(lv, 2) + 0.5 * step(lv, 6) + 0.65 * step(lv, 10); }
export function holyPower(lv: number): number { return 1 + step(lv, 6); }
/** 그림자 표창 — 재사용 · 표창 수 */
export function shadowCooldown(lv: number): number { return 4.5 - 0.5 * step(lv, 4) - 0.6 * step(lv, 8); }
export function shadowCount(lv: number): number { return 3 + step(lv, 2) + step(lv, 6) + step(lv, 10); }
export function shadowPower(lv: number): number { void lv; return 1; }
/** 운석 낙하포 — 재사용(길다) · 폭발 반경 · 위력(보스를 크게 깎는다) */
export function meteorCooldown(lv: number): number { return 12 - 1.2 * step(lv, 4) - 1.5 * step(lv, 8); }
export function meteorRadius(lv: number): number { return 80 + 16 * step(lv, 2) + 20 * step(lv, 6); }
export function meteorPower(lv: number): number { return 3 + step(lv, 6) + step(lv, 10); }
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
export function windDamage(lv: number): number { return scaled(1.2, lv); }
export function poisonDamage(lv: number): number { return scaled(1.0, lv); }
export function holyDamage(lv: number): number { return scaled(2.2, lv); }
export function shadowDamage(lv: number): number { return scaled(0.9, lv); }
export function meteorDamage(lv: number): number { return scaled(3.4, lv); }

/** 스테이지별 몬스터 체력 — S1 은 기본 사격 한 발, 깊어질수록 속성 화살과 레벨이 필요하다. 성벽은 계속 오른다 */
// S2 는 1.6 — 불화살 Lv1(1.6)이 S2 까지 한 발이다. 초반 웨이브는 안정적으로 넘어야 한다(가이드)
/** 스테이지 몬스터 체력 — 50 스테이지 표(stages.ts monsterHp)가 유일한 기준 (2026-10-02). 성벽 층도 거기서 만든다 */
export function arrowHpFor(stageIndex: number): number {
  return getStage(Math.max(0, stageIndex)).monsterHp * TUNING_HP.mul;
}
/**
 * 몬스터 체력 배수 — 무기는 실제 시간, 몬스터는 월드 시간(1/3)으로 흘러 같은 월드 시간에 무기가 세 배 쏜다 (2026-10-02 pace).
 * 시뮬 스윕은 이 값을 바꾼다 (arrows.TUNING 에 두면 skills ↔ arrows 가 서로를 불러 순환한다)
 */
export const TUNING_HP = { mul: 4 };   // 3 → 4 (스윕 2026-10-02: 기대 성장 89% · 8 스테이지 덜 자란 계정 32%)
/** 표의 '체력' 칸 — 앞 4 스테이지 (화면이 "S2 까지 한 발"을 보여 준다) */
export const ARROW_HP = STAGES.slice(0, 4).map((st) => st.monsterHp * TUNING_HP.mul);

/** 그 피해로 한 발에 부수는 가장 깊은 스테이지 — 표의 "S2 까지 한 발". 0 이면 S1 도 두 발 */
export function oneShotStage(damage: number): number {
  let n = 0;
  for (let i = 0; i < STAGES.length; i += 1) if (damage + 1e-9 >= STAGES[i].monsterHp * TUNING_HP.mul) n = i + 1;
  return n;
}
const reach = (d: number) => { const n = oneShotStage(d); return n > 0 ? `${num(d)} · S${n} 까지 한 발` : `${num(d)}`; };

/** 화살비 — 조준 창(일제 사격 지속) 배수 · 게이지 획득 배수 */
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

const vs = (k: ArrowKind) => ARROW_KIND_LABEL[k];

export const EXPEDITION_SKILLS: ExpeditionSkillDef[] = [
  {
    id: "fire",
    weapon: "화염 석궁",
    unlockLevel: 1,
    name: "불화살",
    kind: "폭발",
    family: "magic",
    element: "fire",
    icon: "fire",
    desc: "[화염 석궁] 학습. 불화살이 명중한 자리에서 터져 주변 몬스터를 함께 태운다.",
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
    weapon: "물살 작살",
    unlockLevel: 4,
    name: "물화살",
    kind: "관통",
    family: "physical",
    element: "water",
    icon: "water",
    desc: "[물살 작살] 학습. 물화살이 멈추지 않고 흘러가며 여러 몬스터를 꿰뚫는다. 폭염 비룡의 불을 끈다.",
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
    weapon: "서리 지팡이",
    unlockLevel: 8,
    name: "얼음화살",
    kind: "빙결",
    family: "magic",
    element: "ice",
    icon: "ice",
    desc: "[서리 지팡이] 학습. 얼음화살이 명중한 몬스터와 주변을 얼려 느리게 만든다. 달빛 늑대는 길을 잃는다.",
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
      { label: "감속", value: `${Math.round((1 - iceSlow(lv)) * 100)}%`, delta: nextDelta(lv, (n) => Math.round((1 - iceSlow(n)) * 100), "%") },
      { label: "재사용", value: num(iceCooldown(lv), "초"), delta: nextDelta(lv, iceCooldown, "초", 1) },
      { label: "상성", value: vs("homing") },
    ],
  },
  {
    id: "earth",
    weapon: "바위 투석기",
    unlockLevel: 12,
    name: "흙화살",
    kind: "강타",
    family: "physical",
    element: "earth",
    icon: "earth",
    desc: "[바위 투석기] 학습. 무거운 돌촉 화살. 느리지만 대장 몬스터를 크게 깎고 튕기는 오우거를 땅에 박는다.",
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
    weapon: "번개 창",
    unlockLevel: 16,
    name: "번개화살",
    kind: "연쇄",
    family: "magic",
    element: "bolt",
    icon: "bolt",
    desc: "[번개 창] 학습. 쏘는 순간 가까운 몬스터 여럿을 번개로 잇는다. 돌진하는 늑대를 먼저 끊는다.",
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
    id: "wind",
    weapon: "질풍 부메랑",
    unlockLevel: 20,
    name: "부메랑",
    kind: "왕복 관통",
    family: "physical",
    element: "wind",
    icon: "wind",
    desc: "[질풍 부메랑] 학습. 앞으로 날아가며 꿰뚫고, 끝까지 가면 되돌아오며 한 번 더 벤다. 슬라임 떼를 쓸어 낸다.",
    effect: "꿰뚫고 되돌아옴",
    strongVs: "normal",
    unlockStage: 0,
    goldBase: 480,
    sealBase: 5,
    milestones: [
      { level: 2, kind: "unlock", label: "해금 [돌풍] — 사거리 +40" },
      { level: 4, kind: "stat", label: "재사용 −0.5초" },
      { level: 6, kind: "unlock", label: "해금 [회오리] — 사거리 +50" },
      { level: 8, kind: "stat", label: "재사용 −0.6초" },
      { level: 10, kind: "unlock", label: "해금 [폭풍] — 보스 깎기 +1" },
    ],
    readout: (lv) => [
      { label: "피해", value: reach(windDamage(lv)), delta: nextDelta(lv, windDamage, "", 2) },
      { label: "보스 깎기", value: `${windPower(lv)}`, delta: nextDelta(lv, windPower) },
      { label: "사거리", value: `${windRange(lv)}`, delta: nextDelta(lv, windRange) },
      { label: "재사용", value: num(windCooldown(lv), "초"), delta: nextDelta(lv, windCooldown, "초", 1) },
      { label: "상성", value: vs("normal") },
    ],
  },
  {
    id: "poison",
    weapon: "독침 단궁",
    unlockLevel: 25,
    name: "독침",
    kind: "중독",
    family: "physical",
    element: "poison",
    icon: "poison",
    desc: "[독침 단궁] 학습. 맞은 몬스터가 몇 초 동안 독에 타들어 간다. 단단한 오우거를 녹인다.",
    effect: "명중 시 중독(지속 피해)",
    strongVs: "ricochet",
    unlockStage: 0,
    goldBase: 520,
    sealBase: 5,
    milestones: [
      { level: 2, kind: "unlock", label: "해금 [맹독] — 중독 +1초" },
      { level: 4, kind: "stat", label: "재사용 −0.4초" },
      { level: 6, kind: "unlock", label: "해금 [부식] — 중독 +1초 · 독 피해 +15%" },
      { level: 8, kind: "stat", label: "재사용 −0.5초" },
      { level: 10, kind: "unlock", label: "해금 [역병] — 독 피해 +20%" },
    ],
    readout: (lv) => [
      { label: "피해", value: reach(poisonDamage(lv)), delta: nextDelta(lv, poisonDamage, "", 2) },
      { label: "중독", value: `${poisonSeconds(lv)}초 · 초당 ${Math.round(poisonDpsMul(lv) * 100)}%`, delta: nextDelta(lv, poisonSeconds, "초") },
      { label: "재사용", value: num(poisonCooldown(lv), "초"), delta: nextDelta(lv, poisonCooldown, "초", 1) },
      { label: "상성", value: vs("ricochet") },
    ],
  },
  {
    id: "holy",
    weapon: "성광 홀",
    unlockLevel: 30,
    name: "성광",
    kind: "강타 · 수리",
    family: "magic",
    element: "holy",
    icon: "holy",
    desc: "[성광 홀] 학습. 가장 단단한 몬스터에 빛을 내리꽂고, 맞힐 때마다 방어막을 조금 고친다. 달빛 늑대를 붙잡는다.",
    effect: "강타 + 방어막 수리",
    strongVs: "homing",
    unlockStage: 0,
    goldBase: 560,
    sealBase: 6,
    milestones: [
      { level: 2, kind: "unlock", label: "해금 [축복] — 수리 +1" },
      { level: 4, kind: "stat", label: "재사용 −0.7초" },
      { level: 6, kind: "unlock", label: "해금 [신성] — 보스 깎기 +1 · 수리 +1.5" },
      { level: 8, kind: "stat", label: "재사용 −0.8초" },
      { level: 10, kind: "unlock", label: "해금 [구원] — 수리 +2" },
    ],
    readout: (lv) => [
      { label: "피해", value: reach(holyDamage(lv)), delta: nextDelta(lv, holyDamage, "", 2) },
      { label: "보스 깎기", value: `${holyPower(lv)}`, delta: nextDelta(lv, holyPower) },
      { label: "방어막 수리", value: num(holyRepair(lv)), delta: nextDelta(lv, holyRepair, "", 1) },
      { label: "재사용", value: num(holyCooldown(lv), "초"), delta: nextDelta(lv, holyCooldown, "초", 1) },
      { label: "상성", value: vs("homing") },
    ],
  },
  {
    id: "shadow",
    weapon: "그림자 표창",
    unlockLevel: 35,
    name: "표창",
    kind: "부채 연사",
    family: "physical",
    element: "shadow",
    icon: "shadow",
    desc: "[그림자 표창] 학습. 표창 여러 개를 부채꼴로 흩뿌린다. 나란히 오는 고블린 떼에 강하다.",
    effect: "부채꼴 다발",
    strongVs: "fan",
    unlockStage: 0,
    goldBase: 600,
    sealBase: 6,
    milestones: [
      { level: 2, kind: "unlock", label: "해금 [분신] — 표창 +1" },
      { level: 4, kind: "stat", label: "재사용 −0.5초" },
      { level: 6, kind: "unlock", label: "해금 [암영] — 표창 +1" },
      { level: 8, kind: "stat", label: "재사용 −0.6초" },
      { level: 10, kind: "unlock", label: "해금 [천영] — 표창 +1" },
    ],
    readout: (lv) => [
      { label: "피해", value: reach(shadowDamage(lv)), delta: nextDelta(lv, shadowDamage, "", 2) },
      { label: "표창 수", value: `${shadowCount(lv)}`, delta: nextDelta(lv, shadowCount) },
      { label: "재사용", value: num(shadowCooldown(lv), "초"), delta: nextDelta(lv, shadowCooldown, "초", 1) },
      { label: "상성", value: vs("fan") },
    ],
  },
  {
    id: "meteor",
    weapon: "운석 낙하포",
    unlockLevel: 40,
    name: "운석",
    kind: "광역 강타",
    family: "magic",
    element: "meteor",
    icon: "meteor",
    desc: "[운석 낙하포] 학습. 몬스터가 가장 많이 모인 곳에 운석을 떨어뜨린다. 느리지만 대장을 크게 깎는다.",
    effect: "광역 · 보스 강타",
    strongVs: "explosive",
    unlockStage: 0,
    goldBase: 700,
    sealBase: 7,
    milestones: [
      { level: 2, kind: "unlock", label: "해금 [파편] — 반경 +16" },
      { level: 4, kind: "stat", label: "재사용 −1.2초" },
      { level: 6, kind: "unlock", label: "해금 [유성우] — 반경 +20 · 보스 깎기 +1" },
      { level: 8, kind: "stat", label: "재사용 −1.5초" },
      { level: 10, kind: "unlock", label: "해금 [천벌] — 보스 깎기 +1" },
    ],
    readout: (lv) => [
      { label: "피해", value: reach(meteorDamage(lv)), delta: nextDelta(lv, meteorDamage, "", 2) },
      { label: "보스 깎기", value: `${meteorPower(lv)}`, delta: nextDelta(lv, meteorPower) },
      { label: "반경", value: `${meteorRadius(lv)}`, delta: nextDelta(lv, meteorRadius) },
      { label: "재사용", value: num(meteorCooldown(lv), "초"), delta: nextDelta(lv, meteorCooldown, "초", 1) },
      { label: "상성", value: vs("explosive") },
    ],
  },
  {
    id: "ultimate",
    weapon: "화살비",
    unlockLevel: 1,
    name: "화살비",
    kind: "궁극",
    family: "none",
    element: "basic",
    icon: "ultimate",
    desc: "[화살비] 강화. 게이지가 차면 하늘에서 화살이 쏟아져 화면의 몬스터를 전부 쓰러뜨린다. 게이지가 빨리 찬다.",
    effect: "화면 전체 처치",
    strongVs: null,
    unlockStage: 0,
    goldBase: 360,
    sealBase: 5,
    milestones: [
      { level: 2, kind: "unlock", label: "해금 [잔향] — 조준 창 +8%" },
      { level: 4, kind: "stat", label: "게이지 획득 +12%" },
      { level: 6, kind: "unlock", label: "해금 [소나기] — 조준 창 +8%" },
      { level: 8, kind: "stat", label: "게이지 획득 +12%" },
      { level: 10, kind: "unlock", label: "해금 [폭우] — 조준 창 +12%" },
    ],
    readout: (lv) => [
      { label: "유형", value: "궁극" },
      { label: "조준 창", value: ultSwingMul(lv) === 1 ? "기본" : `+${Math.round(ultSwingMul(lv) * 100 - 100)}%` },
      { label: "게이지", value: ultGaugeMul(lv) === 1 ? "기본" : `+${Math.round(ultGaugeMul(lv) * 100 - 100)}%` },
      { label: "사거리", value: "화면 전체" },
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

/**
 * 스킬 무기 해금 — 계정 레벨 (2026-10-02). 예전 기준(원정 최고 스테이지)으로 이미 배운 무기는 레벨이 모자라도 그대로 쓴다.
 * 두 번째 인자는 **계정 레벨**, 세 번째는 그 무기의 현재 레벨
 */
export function skillUnlocked(def: ExpeditionSkillDef, accountLevel: number, currentLevel = 0): boolean {
  return currentLevel > 0 || accountLevel >= def.unlockLevel;
}

export function weaponUnlocked(def: RangedWeaponDef, dodgeBestStage: number): boolean {
  return dodgeBestStage >= def.unlockStage;
}
