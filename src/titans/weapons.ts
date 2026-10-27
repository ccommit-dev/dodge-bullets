/**
 * 주인공 무기 4종 (2026-10-27, 사용자: "비버의 무기가 북이라 너무 어색해, 사냥터에서도 검, 창, 활, 지팡이 4개 특징별 기술 및 능력치 배정해서
 * 리소스 별 애니메이션 포함 모두 다시 생성 · 원정무기 탭을 대장간에서 없애고 장착한 무기를 대장간에서 업그레이드 · 모든 무기를 댐 방어전에서도 ·
 * 변하는 무기마다 스킬도 무기에 따라 설정할 수 있게").
 *
 * - 검 = 예전 북 자리(대장간 강화 단계 0~15 · ForgeSave.level). 창 · 활 · 지팡이 = 대장간 무기 강화(0~20 · CharacterProgress.expeditionWeaponForge).
 *   사냥터에서는 0~15 눈금으로 맞춰 쓴다(20 → 15).
 * - 능력치: 무기마다 하나 둘 — 검 탭 · 치명 / 창 대장 / 활 자동 공격 속도 / 지팡이 스킬 쿨타임 · 피해.
 * - 기술: 무기마다 N 번째 탭에 이름 있는 한 방(번개와 따로 센다).
 * - 스킬 세트: 무기를 바꾸면 그 무기에 장착해 둔 스킬 세트로 바뀐다(TitansSave.skillInventory.loadouts).
 */
export type WeaponKind = "sword" | "spear" | "bow" | "staff";
export const WEAPON_KINDS: readonly WeaponKind[] = ["sword", "spear", "bow", "staff"];

export const WEAPON_LABEL: Record<WeaponKind, string> = { sword: "검", spear: "창", bow: "활", staff: "지팡이" };
/** 대장간 · 강화 화면 이름 */
export const WEAPON_FORGE_NAME: Record<WeaponKind, string> = { sword: "비버 대검", spear: "강철 장창", bow: "원정 장궁", staff: "수정 지팡이" };

export type WeaponEffects = {
  tapMul: number; critAdd: number; bossMul: number; autoSpeedMul: number; skillCdMul: number; skillDmgMul: number;
};
const BASE: WeaponEffects = { tapMul: 1, critAdd: 0, bossMul: 1, autoSpeedMul: 1, skillCdMul: 1, skillDmgMul: 1 };

// 2026-10-27 난이도 감사: 같은 단계에서 검이 사실상 최강 · 활은 모든 상황 꼴찌(×0.70~0.76) · 창은 대장 특화인데 대장에서도 검 이하(×0.94~0.99)였다.
// 창 대장 1.2 → 1.35 · 활 탭 0.9 → 1.0(자동 공격 속도는 동료에게도 — TitansGame). 검 · 지팡이는 그대로(옛 계정이 모두 검이라 검을 깎으면 벽이 당겨진다)
// 같은 날 아쉬운 점: 계산 모델에 자동 공격(대장간 단계 · 탭 배율)과 활 속도 → 동료를 넣고 다시 재니 활이 아직 ×0.79~0.86 —
// 검의 탭 ×1.2 · 치명이 탭 · 스킬 · 자동 공격 모두에 붙어서다. 활 탭 1.0 → 1.15 로 ×0.91~0.98 · 지팡이 ×0.87~1.06.
// 창은 일반 몬스터 ×0.75~0.83 이라 탭 1.0 → 1.12 · 대장 1.35 → 1.25 — 일반 ×0.84~0.90 · 대장 ×1.09~1.13 (대장 특화는 남긴다)
export const WEAPON_EFFECTS: Record<WeaponKind, WeaponEffects> = {
  sword: { ...BASE, tapMul: 1.2, critAdd: 0.05 },
  spear: { ...BASE, tapMul: 1.12, bossMul: 1.25 },
  bow: { ...BASE, tapMul: 1.15, autoSpeedMul: 1.25 },
  staff: { ...BASE, tapMul: 0.9, skillCdMul: 0.85, skillDmgMul: 1.2 },
};

/** 무기 기술 — every 번째 탭마다 탭 기본 피해 × mul (창은 대장에게 bossMul) */
export type WeaponTech = { name: string; every: number; mul: number; bossMul?: number; fx: "slash" | "arrow" | "bolt"; desc: string };
export const WEAPON_TECH: Record<WeaponKind, WeaponTech> = {
  sword: { name: "연속 베기", every: 6, mul: 2.5, fx: "slash", desc: "6탭마다 두 번 베기 ×2.5" },
  spear: { name: "관통 찌르기", every: 8, mul: 2, bossMul: 4, fx: "slash", desc: "8탭마다 꿰뚫기 ×2 · 대장 ×4" },
  bow: { name: "연사", every: 4, mul: 2.2, fx: "arrow", desc: "4탭마다 화살 연사 ×2.2" },   // 5탭 ×1.8 → 4탭 ×2.2 (2026-10-27 감사)
  staff: { name: "마력 폭발", every: 8, mul: 3, fx: "bolt", desc: "8탭마다 마력 폭발 ×3" },
};

/** 한 줄 능력치 문구 */
export function weaponStatText(kind: WeaponKind): string {
  const e = WEAPON_EFFECTS[kind];
  const parts: string[] = [];
  if (e.tapMul !== 1) parts.push(`탭 ${e.tapMul > 1 ? "+" : ""}${Math.round((e.tapMul - 1) * 100)}%`);
  if (e.critAdd) parts.push(`치명 +${Math.round(e.critAdd * 100)}%p`);
  if (e.bossMul !== 1) parts.push(`대장 +${Math.round((e.bossMul - 1) * 100)}%`);
  if (e.autoSpeedMul !== 1) parts.push(`자동 공격 +${Math.round((e.autoSpeedMul - 1) * 100)}%`);
  if (e.skillCdMul !== 1) parts.push(`스킬 쿨 −${Math.round((1 - e.skillCdMul) * 100)}%`);
  if (e.skillDmgMul !== 1) parts.push(`스킬 피해 +${Math.round((e.skillDmgMul - 1) * 100)}%`);
  return parts.join(" · ");
}

export function normalizeWeaponKind(v: unknown): WeaponKind {
  // 옛 저장의 북(drum)은 검 자리 — 강화 단계(ForgeSave.level)를 그대로 잇는다
  return v === "spear" || v === "bow" || v === "staff" ? v : "sword";
}

/** 사냥터 눈금(0~15) — 검은 대장간 단계 그대로, 나머지는 0~20 → 0~15 */
export function weaponHuntLevel(kind: WeaponKind, swordLevel: number, forge: Partial<Record<"spear" | "bow" | "staff", number>>): number {
  if (kind === "sword") return Math.max(0, Math.min(15, Math.floor(swordLevel)));
  return Math.round(((forge[kind] ?? 0) * 15) / 20);
}

/** 아이콘 단계(1~3) */
export function weaponTier(level15: number): 1 | 2 | 3 {
  return level15 >= 10 ? 3 : level15 >= 5 ? 2 : 1;
}
/** 장비 그림 — 검은 weapon-N(기존 검 아이콘), 나머지는 <kind>-N */
export function weaponIconPath(kind: WeaponKind, level15: number): string {
  return `titans/gear/${kind === "sword" ? "weapon" : kind}-${weaponTier(level15)}.png`;
}
