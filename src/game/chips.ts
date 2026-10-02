import type { ExpeditionSkillId } from "./skills";

/**
 * 원정 칩 — 랜덤에 좌우되지 않는 영구 패시브 (2026-09-28).
 *
 * 참고 게임 가이드의 **영구 성장 2순위**: "모든 런에 걸쳐 능력치를 올려 주는 칩과 장비 슬롯.
 * 이런 요소는 랜덤 요소에 좌우되지 않는 패시브 이점이다. 작은 영구 피해 증가나 쿨다운 감소도
 * 수십 번의 런이 쌓이면 체감이 커지고, 실험적인 빌드를 시도할 때 부담도 줄어든다."
 *
 * 재화는 **원정 인장** — 보급창과 같은 재화다. 그래야 "지금 무엇에 먼저 쓸까"(오래 남는 칩 vs
 * 이번 판을 바꾸는 보급)라는 선택이 실제로 생긴다. 스킬은 제 조각으로 올린다 (2026-09-29).
 *
 * 슬롯은 3칸이고 원정 스테이지 기록으로 하나씩 열린다. 칩은 **레벨을 올려도 장착해야 효과가
 * 난다** — 들고 있는 것과 끼운 것을 구분해야 슬롯이 선택의 자리가 된다.
 */

export type ChipId = "focus" | "barrage" | "ember" | "rime" | "vitality" | "edge";

export const CHIP_MAX_LEVEL = 5;
export const CHIP_SLOTS = 3;

/** 슬롯이 열리는 원정 최고 스테이지 */
export const CHIP_SLOT_UNLOCK = [1, 2, 4];

export type ChipDef = {
  id: ChipId;
  name: string;
  /** 어떤 스킬과 맞물리는지 — 강화 화면이 안내에 쓴다. "basic" 은 기본 사격, null 이면 범용 */
  pairs: ExpeditionSkillId | "basic" | null;
  desc: (lv: number) => string;
};

/** 장착한 칩들이 만들어 내는 값 — 런 내내 고정(카드와 달리 무작위가 아니다) */
export type ChipMods = {
  /** 모든 원거리 스킬 재사용 배수 */
  cooldownMul: number;
  /** 기본 사격 발수 +N */
  volleyExtra: number;
  /** 불화살 폭발 반경 배수 */
  flameRadiusMul: number;
  /** 빙결 지속 배수 */
  chillMsMul: number;
  /** 최대 HP +N */
  extraLives: number;
  /** 일섬 게이지 획득 배수 */
  gaugeMul: number;
};

export function emptyChipMods(): ChipMods {
  return { cooldownMul: 1, volleyExtra: 0, flameRadiusMul: 1, chillMsMul: 1, extraLives: 0, gaugeMul: 1 };
}

export type ChipLevels = Record<ChipId, number>;

export function emptyChipLevels(): ChipLevels {
  return { focus: 0, barrage: 0, ember: 0, rime: 0, vitality: 0, edge: 0 };
}

/** 레벨당 효과 — 아래 함수가 유일한 진실이고 desc 는 이것을 설명한 것이다 */
const step = (lv: number, at: number) => (lv >= at ? 1 : 0);

export const chipCooldown = (lv: number) => 1 - 0.03 * lv;                 // focus  : 최대 −15%
export const chipVolley = (lv: number) => step(lv, 3) + step(lv, 5);       // barrage: Lv3·Lv5 에 +1
export const chipFlame = (lv: number) => 1 + 0.06 * lv;                    // ember  : 최대 +30%
export const chipChill = (lv: number) => 1 + 0.2 * lv;                     // rime   : 최대 +100%
export const chipLives = (lv: number) => step(lv, 2) + step(lv, 5);        // vitality: Lv2·Lv5 에 +1
export const chipGauge = (lv: number) => 1 + 0.05 * lv;                    // edge   : 최대 +25%

export const CHIPS: ChipDef[] = [
  { id: "focus", name: "조준 칩", pairs: null, desc: (lv) => `모든 원거리 스킬 재사용 −${Math.round((1 - chipCooldown(lv)) * 100)}%` },
  { id: "barrage", name: "연사 칩", pairs: "basic", desc: (lv) => (chipVolley(lv) > 0 ? `기본 사격 발수 +${chipVolley(lv)} (Lv3 · Lv5 에 +1)` : "Lv3 부터 기본 사격 발수 +1 (Lv5 에 +2)") },
  { id: "ember", name: "잔열 칩", pairs: "fire", desc: (lv) => `불화살 폭발 반경 +${Math.round((chipFlame(lv) - 1) * 100)}%` },
  { id: "rime", name: "서리 칩", pairs: "ice", desc: (lv) => `빙결 지속 +${Math.round((chipChill(lv) - 1) * 100)}% (콤보가 오래 물린다)` },
  { id: "vitality", name: "활력 칩", pairs: null, desc: (lv) => (chipLives(lv) > 0 ? `방어막 +${chipLives(lv) * 15}% (Lv2 · Lv5 에 +15%)` : "Lv2 부터 방어막 +15% (Lv5 에 +30%)") },
  { id: "edge", name: "예기 칩", pairs: "ultimate", desc: (lv) => `화살비 게이지 획득 +${Math.round((chipGauge(lv) - 1) * 100)}%` },
];

export const CHIP_BY_ID: Record<ChipId, ChipDef> = Object.fromEntries(CHIPS.map((c) => [c.id, c])) as Record<ChipId, ChipDef>;

/** 강화 비용 — 원정 인장. 1단계는 보급 하나(6~12)보다 싸서 첫 인장의 쓸 곳이 된다 */
export function chipCost(level: number): number {
  return Math.round(3 * 1.45 ** (level - 1));
}

export function chipSlotsOpen(dodgeBestStage: number): number {
  return CHIP_SLOT_UNLOCK.filter((s) => dodgeBestStage >= s).length;
}

/** 끼운 칩들을 하나의 값으로 — 같은 칩을 두 칸에 끼워도 한 번만 센다 */
export function chipModsOf(levels: ChipLevels, equipped: Array<ChipId | null>, slotsOpen: number): ChipMods {
  const out = emptyChipMods();
  const seen = new Set<ChipId>();
  equipped.slice(0, slotsOpen).forEach((id) => {
    if (!id || seen.has(id)) return;
    const lv = levels[id] ?? 0;
    if (lv <= 0) return;                       // 레벨 0 칩은 끼워도 아무 일도 없다
    seen.add(id);
    if (id === "focus") out.cooldownMul *= chipCooldown(lv);
    if (id === "barrage") out.volleyExtra += chipVolley(lv);
    if (id === "ember") out.flameRadiusMul *= chipFlame(lv);
    if (id === "rime") out.chillMsMul *= chipChill(lv);
    if (id === "vitality") out.extraLives += chipLives(lv);
    if (id === "edge") out.gaugeMul *= chipGauge(lv);
  });
  return out;
}
