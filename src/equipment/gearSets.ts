/**
 * 무기 세트 파츠 (2026-11-04, 사용자: "나머지 부위 파츠별도 · 무기 속성 4개 있는 것처럼 속성에 맞는 파츠 모두 생성 · 상점에서도 팔게 · 장비 성장 인벤토리에서 탈부착").
 *
 * 무기 4종마다 다섯 부위 — 검 = 기사 · 창 = 창기병 · 활 = 숲 사수 · 지팡이 = 현자. 상점에서 보석으로 사고 장비창에서 끌어다 낀다.
 * 효과는 같은 무기를 들었을 때만 켜지고 그 무기의 특기를 올린다(검 탭 · 창 대장 · 활 자동 공격 · 지팡이 스킬). 사냥터 값에만 붙어 성문 방어 밸런스는 그대로다.
 * 숙련 · 강화(equipment/parts)와 따로 움직인다 — 부위 칸에 무엇을 끼든 숙련 효과는 그대로.
 */
import type { WeaponKind } from "../titans/weapons";
import { LIMITED_GEAR_BOSS_BONUS, type LimitedGearId } from "../titans/limitedAllies";

export type GearSetSlot = "helmet" | "armor" | "gloves" | "boots" | "shoulder";
export const GEAR_SET_SLOTS: readonly GearSetSlot[] = ["helmet", "armor", "gloves", "boots", "shoulder"];
export const GEAR_SET_KINDS: readonly WeaponKind[] = ["sword", "spear", "bow", "staff"];
/** 월간 한정 전용 장비 (2026-11-16, titans/limitedAllies) — 세트가 아니라 한 동료 전용. 이벤트 상점에서만 얻는다 */
export const LIMITED_GEAR: Record<LimitedGearId, { slot: GearSetSlot; name: string; ally: string; allyName: string }> = {
  "autumn-gloves": { slot: "gloves", name: "단풍 사냥꾼 장갑", ally: "autumn", allyName: "오텀" },
};
export const LIMITED_GEAR_IDS = Object.keys(LIMITED_GEAR) as LimitedGearId[];
export const isLimitedGear = (id: string): id is LimitedGearId => (LIMITED_GEAR_IDS as string[]).includes(id);
export type GearItemId = `${WeaponKind}-${GearSetSlot}` | LimitedGearId;

export const GEAR_SLOT_LABEL: Record<GearSetSlot, string> = { helmet: "투구", armor: "갑옷", gloves: "장갑", boots: "신발", shoulder: "견갑" };
/** 세트 이름 — 장비창 칸은 좁아 이 이름만 쓴다 */
export const GEAR_SET_NAME: Record<WeaponKind, string> = { sword: "기사", spear: "창기병", bow: "숲 사수", staff: "현자" };
const STAT_LABEL: Record<WeaponKind, string> = { sword: "탭 피해", spear: "대장 피해", bow: "자동 공격 속도", staff: "스킬 피해" };

/** 한 부위당 · 다섯 부위를 다 모으면 더 — 소수(0.03 = +3%) */
export const GEAR_PIECE_BONUS: Record<WeaponKind, number> = { sword: 0.025, spear: 0.04, bow: 0.03, staff: 0.04 };
export const GEAR_FULL_SET_BONUS: Record<WeaponKind, number> = { sword: 0.05, spear: 0.08, bow: 0.06, staff: 0.08 };

/** 보석 값 — 탈것(30~200 · 골드 +2~5%)과 견줘 낱개 30, 세트로 사면 20% 싸다 (보석 ÷10, 2026-11-18) */
export const GEAR_ITEM_PRICE = 30;
export const GEAR_SET_PRICE = 120;

export const gearItemId = (kind: WeaponKind, slot: GearSetSlot): GearItemId => `${kind}-${slot}`;
export const GEAR_ITEM_IDS: readonly GearItemId[] = GEAR_SET_KINDS.flatMap((k) => GEAR_SET_SLOTS.map((s) => gearItemId(k, s)));
export const isGearItemId = (v: unknown): v is GearItemId => typeof v === "string" && ((GEAR_ITEM_IDS as readonly string[]).includes(v) || isLimitedGear(v));
/** 세트 종류(무기) — 한정 장비는 그 이름 앞부분("autumn")이라 어느 무기와도 같지 않아 세트 보너스에 안 든다. 입은 그림 파일 이름에도 쓴다 */
export function gearItemKind(id: GearItemId): WeaponKind { return id.split("-")[0] as WeaponKind; }
export function gearItemSlot(id: GearItemId): GearSetSlot { return id.split("-")[1] as GearSetSlot; }
export function gearItemName(id: GearItemId): string { return isLimitedGear(id) ? LIMITED_GEAR[id].name : `${GEAR_SET_NAME[gearItemKind(id)]} ${GEAR_SLOT_LABEL[gearItemSlot(id)]}`; }
/** 장비창 가방 칸 이름 — 세트는 세트 이름, 한정은 '한정' */
export function gearItemSetLabel(id: GearItemId): string { return isLimitedGear(id) ? "한정" : GEAR_SET_NAME[gearItemKind(id)]; }
export function gearItemIconPath(id: GearItemId): string { return `titans/gear/set-${id}.png`; }
export function gearItemEffectText(id: GearItemId, level = 0): string { if (isLimitedGear(id)) return `${LIMITED_GEAR[id].allyName} 출전 중이면 대장 피해 +${pct(LIMITED_GEAR_BOSS_BONUS)}%`; const k = gearItemKind(id); return `${WEAPON_NAME[k]}을 들면 ${STAT_LABEL[k]} +${pct(gearItemPieceBonus(id, level))}%`; }
const WEAPON_NAME: Record<WeaponKind, string> = { sword: "검", spear: "창", bow: "활", staff: "지팡이" };
const pct = (v: number) => (Math.round(v * 1000) / 10).toString();

export type EquippedGear = Partial<Record<GearSetSlot, GearItemId>>;

/** 세트 파츠 강화 (2026-11-04, 사용자 요청) — 대장간 파츠 강화(equipment/parts gearPartValue)와 같은 규칙: 단계마다 부위 효과 ×(1 + 0.1·단계), +10 이 끝. 다섯 부위 보너스는 그대로 */
export const GEAR_SET_ENHANCE_MAX = 10;
export type GearSetLevels = Partial<Record<GearItemId, number>>;
const levelOf = (levels: GearSetLevels | undefined, id: GearItemId) => Math.max(0, Math.min(GEAR_SET_ENHANCE_MAX, levels?.[id] ?? 0));
/** 강화 비용 — 대장간 파츠 강화와 같은 공용 코인 + 강화석 */
export function gearSetEnhanceCost(level: number): { coins: number; materials: number } | null {
  if (level >= GEAR_SET_ENHANCE_MAX) return null;
  return { coins: Math.floor(8 * Math.pow(1.6, level)), materials: 1 + Math.floor(level / 3) };   // 예전 단위 800 (economy/units)
}
export function gearItemPieceBonus(id: GearItemId, level: number): number { if (isLimitedGear(id)) return 0; return GEAR_PIECE_BONUS[gearItemKind(id)] * (1 + 0.1 * Math.max(0, Math.min(GEAR_SET_ENHANCE_MAX, level))); }
export function normalizeGearSetLevels(raw: unknown, owned: readonly GearItemId[]): GearSetLevels {
  const out: GearSetLevels = {};
  if (!raw || typeof raw !== "object") return out;
  for (const id of owned) { const v = (raw as Record<string, unknown>)[id]; if (typeof v === "number" && v > 0) out[id] = Math.min(GEAR_SET_ENHANCE_MAX, Math.floor(v)); }
  return out;
}
/** 지금 무기와 같은 세트 부위 효과 합 + 다섯 부위 보너스 */
function setBonus(equipped: EquippedGear | undefined, kind: WeaponKind, levels: GearSetLevels | undefined): number {
  let total = 0;
  for (const s of GEAR_SET_SLOTS) { const id = equipped?.[s]; if (id && gearItemKind(id) === kind) total += gearItemPieceBonus(id, levelOf(levels, id)); }
  return total + (matchedPieces(equipped, kind) >= GEAR_SET_SLOTS.length ? GEAR_FULL_SET_BONUS[kind] : 0);
}

/** 낀 부위 중 지금 무기와 같은 세트 수 */
export function matchedPieces(equipped: EquippedGear | undefined, kind: WeaponKind): number {
  return GEAR_SET_SLOTS.filter((s) => { const id = equipped?.[s]; return !!id && gearItemKind(id) === kind; }).length;
}

export type GearSetEffects = { tapMul: number; bossMul: number; autoSpeedMul: number; skillDmgMul: number };
export function gearSetEffects(equipped: EquippedGear | undefined, kind: WeaponKind, levels?: GearSetLevels): GearSetEffects {
  const total = 1 + setBonus(equipped, kind, levels);
  return { tapMul: kind === "sword" ? total : 1, bossMul: kind === "spear" ? total : 1, autoSpeedMul: kind === "bow" ? total : 1, skillDmgMul: kind === "staff" ? total : 1 };
}

/** 장비창 한 줄 — "기사 세트 3/5 · 탭 피해 +7.5%" */
export function gearSetSummary(equipped: EquippedGear | undefined, kind: WeaponKind, levels?: GearSetLevels): string {
  const n = matchedPieces(equipped, kind);
  const v = setBonus(equipped, kind, levels);
  return `${GEAR_SET_NAME[kind]} 세트 ${n}/${GEAR_SET_SLOTS.length} · ${STAT_LABEL[kind]} +${pct(v)}%`;
}
export function gearFullSetText(kind: WeaponKind): string { return `부위마다 ${STAT_LABEL[kind]} +${pct(GEAR_PIECE_BONUS[kind])}% · 다섯 부위면 +${pct(GEAR_FULL_SET_BONUS[kind])}% 더`; }

/** 저장 정규화 — 모르는 값은 버리고, 안 가진 것은 못 낀다 */
export function normalizeOwnedGear(raw: unknown): GearItemId[] {
  return Array.isArray(raw) ? [...new Set(raw.filter(isGearItemId))] : [];
}
export function normalizeEquippedGear(raw: unknown, owned: readonly GearItemId[]): EquippedGear {
  const out: EquippedGear = {};
  if (raw && typeof raw === "object") for (const s of GEAR_SET_SLOTS) {
    const id = (raw as Record<string, unknown>)[s];
    if (isGearItemId(id) && gearItemSlot(id) === s && owned.includes(id)) out[s] = id;
  }
  return out;
}
