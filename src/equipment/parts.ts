/**
 * 장비 파츠 4종 (2026-10-14, 사용자: "장비 성장 쪽에 카피바라 키우기처럼 파츠 4개 더 추가해서 총 6개 성장 및 강화 · 대장간에도 내용 추가").
 *
 * 장비 성장 6칸 = 무기 숙련 · 견갑 숙련(기존) + 투구 · 갑옷 · 장갑 · 신발(여기).
 *   - 사냥터 "장비 성장"에서 사냥 골드로 숙련(Lv)을 올린다 — 무기·견갑과 같은 일괄 구매(×1/×10/MAX).
 *   - 대장간 "장비 강화"에서 공용 코인 + 강화석으로 +0 ~ +10 강화 — 숙련 효과를 +10%/강화 키우고, 그림 티어(나무 · 철 · 금)를 올린다.
 * 효과는 사냥터가 실제로 계산하는 값에만 붙는다(파티 체력이 없으니 방어·회복 같은 효과는 없다):
 *   투구 = 대장 제한 시간 · 갑옷 = 처치 골드 · 장갑 = 치명타 확률 · 신발 = 자동 공격 속도.
 * 모두 상한이 있어 무한 성장이 밸런스를 깨지 않는다.
 */
import type { GearTier } from "./anchors";

export type GearPart = "helmet" | "armor" | "gloves" | "boots";
export const GEAR_PARTS: GearPart[] = ["helmet", "armor", "gloves", "boots"];
export type GearLevels = Record<GearPart, number>;
export const emptyGearLevels = (): GearLevels => ({ helmet: 0, armor: 0, gloves: 0, boots: 0 });

export const GEAR_ENHANCE_MAX = 10;

type PartDef = { name: string; stat: string; perLevel: number; cap: number; costBase: number; costGrowth: number; format: (v: number) => string };
export const GEAR_PART_DEF: Record<GearPart, PartDef> = {
  helmet: { name: "투구", stat: "대장 제한 시간", perLevel: 0.1, cap: 8, costBase: 26, costGrowth: 1.18, format: (v) => `+${v.toFixed(1)}초` },
  armor: { name: "갑옷", stat: "처치 골드", perLevel: 0.02, cap: 1.5, costBase: 30, costGrowth: 1.18, format: (v) => `+${Math.round(v * 100)}%` },
  gloves: { name: "장갑", stat: "치명타 확률", perLevel: 0.0025, cap: 0.15, costBase: 28, costGrowth: 1.19, format: (v) => `+${(v * 100).toFixed(1)}%p` },
  boots: { name: "신발", stat: "자동 공격 속도", perLevel: 0.006, cap: 0.3, costBase: 24, costGrowth: 1.18, format: (v) => `+${Math.round(v * 100)}%` },
};

/** 숙련 1레벨 비용(사냥 골드) — 무기(20·1.17)·견갑(34·1.19)과 같은 결 */
export function gearTrainingCost(part: GearPart, level: number): number {
  const d = GEAR_PART_DEF[part];
  return Math.floor(d.costBase * Math.pow(d.costGrowth, level));
}

/** 대장간 강화 비용 — 공용 코인 + 강화석 (+10 이 끝) */
export function gearEnhanceCost(level: number): { coins: number; materials: number } | null {
  if (level >= GEAR_ENHANCE_MAX) return null;
  return { coins: Math.floor(800 * Math.pow(1.6, level)), materials: 1 + Math.floor(level / 3) };
}

/** 한 파츠의 효과 값 — 숙련 × 강화 배율, 상한 */
export function gearPartValue(part: GearPart, mastery: number, enhance: number): number {
  const d = GEAR_PART_DEF[part];
  return Math.min(d.cap, Math.max(0, mastery) * d.perLevel * (1 + 0.1 * Math.max(0, Math.min(GEAR_ENHANCE_MAX, enhance))));
}

export type GearEffects = { bossTimeSec: number; goldMul: number; critChance: number; autoSpeed: number };
export function gearEffects(mastery: Partial<GearLevels> | undefined, enhance: Partial<GearLevels> | undefined): GearEffects {
  const m = { ...emptyGearLevels(), ...(mastery ?? {}) }, e = { ...emptyGearLevels(), ...(enhance ?? {}) };
  return {
    bossTimeSec: gearPartValue("helmet", m.helmet, e.helmet),
    goldMul: 1 + gearPartValue("armor", m.armor, e.armor),
    critChance: gearPartValue("gloves", m.gloves, e.gloves),
    autoSpeed: gearPartValue("boots", m.boots, e.boots),
  };
}

/** 그림 티어 — 강화 +1 나무 · +5 철 · +10 금 */
export function gearTierOfEnhance(enhance: number): GearTier { return enhance >= 10 ? 3 : enhance >= 5 ? 2 : enhance >= 1 ? 1 : 0; }

/** 저장 정규화 — 모르는 키는 버리고 0~상한으로 */
export function normalizeGearLevels(raw: unknown, max: number): GearLevels {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const out = emptyGearLevels();
  for (const p of GEAR_PARTS) { const v = Number(r[p]); out[p] = Number.isFinite(v) ? Math.max(0, Math.min(max, Math.floor(v))) : 0; }
  return out;
}
