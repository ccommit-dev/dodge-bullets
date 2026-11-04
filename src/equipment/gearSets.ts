/**
 * 무기 세트 파츠 (2026-11-04, 사용자: "나머지 부위 파츠별도 · 무기 속성 4개 있는 것처럼 속성에 맞는 파츠 모두 생성 · 상점에서도 팔게 · 장비 성장 인벤토리에서 탈부착").
 *
 * 무기 4종마다 다섯 부위 — 검 = 기사 · 창 = 창기병 · 활 = 숲 사수 · 지팡이 = 현자. 상점에서 보석으로 사고 장비창에서 끌어다 낀다.
 * 효과는 같은 무기를 들었을 때만 켜지고 그 무기의 특기를 올린다(검 탭 · 창 대장 · 활 자동 공격 · 지팡이 스킬). 사냥터 값에만 붙어 성문 방어 밸런스는 그대로다.
 * 숙련 · 강화(equipment/parts)와 따로 움직인다 — 부위 칸에 무엇을 끼든 숙련 효과는 그대로.
 */
import type { WeaponKind } from "../titans/weapons";

export type GearSetSlot = "helmet" | "armor" | "gloves" | "boots" | "shoulder";
export const GEAR_SET_SLOTS: readonly GearSetSlot[] = ["helmet", "armor", "gloves", "boots", "shoulder"];
export const GEAR_SET_KINDS: readonly WeaponKind[] = ["sword", "spear", "bow", "staff"];
export type GearItemId = `${WeaponKind}-${GearSetSlot}`;

export const GEAR_SLOT_LABEL: Record<GearSetSlot, string> = { helmet: "투구", armor: "갑옷", gloves: "장갑", boots: "신발", shoulder: "견갑" };
/** 세트 이름 — 장비창 칸은 좁아 이 이름만 쓴다 */
export const GEAR_SET_NAME: Record<WeaponKind, string> = { sword: "기사", spear: "창기병", bow: "숲 사수", staff: "현자" };
const STAT_LABEL: Record<WeaponKind, string> = { sword: "탭 피해", spear: "대장 피해", bow: "자동 공격 속도", staff: "스킬 피해" };

/** 한 부위당 · 다섯 부위를 다 모으면 더 — 소수(0.03 = +3%) */
export const GEAR_PIECE_BONUS: Record<WeaponKind, number> = { sword: 0.025, spear: 0.04, bow: 0.03, staff: 0.04 };
export const GEAR_FULL_SET_BONUS: Record<WeaponKind, number> = { sword: 0.05, spear: 0.08, bow: 0.06, staff: 0.08 };

/** 보석 값 — 탈것(300~2000 · 골드 +2~5%)과 견줘 낱개 300, 세트로 사면 20% 싸다 */
export const GEAR_ITEM_PRICE = 300;
export const GEAR_SET_PRICE = 1200;

export const gearItemId = (kind: WeaponKind, slot: GearSetSlot): GearItemId => `${kind}-${slot}`;
export const GEAR_ITEM_IDS: readonly GearItemId[] = GEAR_SET_KINDS.flatMap((k) => GEAR_SET_SLOTS.map((s) => gearItemId(k, s)));
export const isGearItemId = (v: unknown): v is GearItemId => typeof v === "string" && (GEAR_ITEM_IDS as readonly string[]).includes(v);
export function gearItemKind(id: GearItemId): WeaponKind { return id.split("-")[0] as WeaponKind; }
export function gearItemSlot(id: GearItemId): GearSetSlot { return id.split("-")[1] as GearSetSlot; }
export function gearItemName(id: GearItemId): string { return `${GEAR_SET_NAME[gearItemKind(id)]} ${GEAR_SLOT_LABEL[gearItemSlot(id)]}`; }
export function gearItemIconPath(id: GearItemId): string { return `titans/gear/set-${id}.png`; }
export function gearItemEffectText(id: GearItemId): string { const k = gearItemKind(id); return `${WEAPON_NAME[k]}을 들면 ${STAT_LABEL[k]} +${pct(GEAR_PIECE_BONUS[k])}%`; }
const WEAPON_NAME: Record<WeaponKind, string> = { sword: "검", spear: "창", bow: "활", staff: "지팡이" };
const pct = (v: number) => (Math.round(v * 1000) / 10).toString();

export type EquippedGear = Partial<Record<GearSetSlot, GearItemId>>;

/** 낀 부위 중 지금 무기와 같은 세트 수 */
export function matchedPieces(equipped: EquippedGear | undefined, kind: WeaponKind): number {
  return GEAR_SET_SLOTS.filter((s) => { const id = equipped?.[s]; return !!id && gearItemKind(id) === kind; }).length;
}

export type GearSetEffects = { tapMul: number; bossMul: number; autoSpeedMul: number; skillDmgMul: number };
export function gearSetEffects(equipped: EquippedGear | undefined, kind: WeaponKind): GearSetEffects {
  const n = matchedPieces(equipped, kind);
  const total = 1 + n * GEAR_PIECE_BONUS[kind] + (n >= GEAR_SET_SLOTS.length ? GEAR_FULL_SET_BONUS[kind] : 0);
  return { tapMul: kind === "sword" ? total : 1, bossMul: kind === "spear" ? total : 1, autoSpeedMul: kind === "bow" ? total : 1, skillDmgMul: kind === "staff" ? total : 1 };
}

/** 장비창 한 줄 — "기사 세트 3/5 · 탭 피해 +7.5%" */
export function gearSetSummary(equipped: EquippedGear | undefined, kind: WeaponKind): string {
  const n = matchedPieces(equipped, kind);
  const v = n * GEAR_PIECE_BONUS[kind] + (n >= GEAR_SET_SLOTS.length ? GEAR_FULL_SET_BONUS[kind] : 0);
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
