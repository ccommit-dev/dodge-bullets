/**
 * 체험 출전 (2026-10-23) — 첫 10연 전설(field-pass)이 아직 못 여는 지역에서 싸울 때의 세기.
 *
 * 아리 기본 DPS 620 은 초반 동료(세라 28 · 가렌 120)의 5~20배라, 그대로 출전하면 초반 밸런스가 무너진다.
 * 그래서 지역이 열리기 전에는 "그 지역에서 열린 가장 센 동료의 2배"까지만 — 팀에서 가장 세다는 느낌은 주되 몇 단계를 건너뛰지 않는다.
 * 지역(unlockStage)을 개척하면 배율 1 로 제 힘.
 */
import { HEROES, type TitanHeroDef } from "./model";
import { SHOP_ALLY_GEM_COST } from "./allies";

export const TRIAL_BEST_MUL = 2;

/** 이 지역 상한까지 스테이지로 열리는 동료 중 가장 높은 기본 DPS */
export function bestUnlockedBaseDps(stageCeiling: number): number {
  return HEROES.filter((h) => h.unlockStage <= stageCeiling && SHOP_ALLY_GEM_COST[h.id] === undefined).reduce((m, h) => Math.max(m, h.baseDps), 0);
}

/** 체험 배율 — 잠긴 지역 동료를 허가로 출전시킬 때만 1 미만 */
export function trialDpsMul(def: Pick<TitanHeroDef, "id" | "unlockStage" | "baseDps">, stageCeiling: number): number {
  if (def.unlockStage <= stageCeiling || SHOP_ALLY_GEM_COST[def.id] !== undefined || def.baseDps <= 0) return 1;
  return Math.min(1, (TRIAL_BEST_MUL * bestUnlockedBaseDps(stageCeiling)) / def.baseDps);
}
