/**
 * 도감 = 영구 능력치 (CRUMBLE_GAP §7)
 *
 * 크럼블의 "도감 등록만으로 영구 능력치" 원칙 — 수집이 곧 성장이라
 * 중복·벤치 자원도 무가치하지 않다. 전부 기존 필드에서의 파생 계산이며
 * 새 저장 데이터가 없다.
 */
import { ALLY_IDS, ALLY_RARITY } from "../titans/allies";
import { PET_IDS } from "../titans/pets";
import type { CharacterProgress } from "./model";

/** 동료 도감 — 최초 획득 시 영구 전투력 (R 20 / SR 50 / SSR 120) */
export function allyCollectionPower(progress: CharacterProgress): number {
  return ALLY_IDS.reduce((sum, id) => {
    if ((progress.allyStars[id] ?? 0) <= 0) return sum;
    return sum + { R: 20, SR: 50, SSR: 120 }[ALLY_RARITY[id]];
  }, 0);
}

/** 펫 도감 — 부화 1마리당 영구 전투력 +30 (장착 여부 무관) */
export function petCollectionPower(progress: CharacterProgress): number {
  return PET_IDS.filter((id) => (progress.pets[id] ?? 0) > 0).length * 30;
}

export function totalStars(progress: CharacterProgress): number {
  return ALLY_IDS.reduce((sum, id) => sum + (progress.allyStars[id] ?? 0), 0);
}

/** 성급 도감 — 전체 성급 합 마일스톤(10/25/50)마다 방치 배율 M +0.02 영구 */
export function starMilestoneMultiplier(progress: CharacterProgress): number {
  const stars = totalStars(progress);
  return [10, 25, 50].filter((at) => stars >= at).length * 0.02;
}

export function starMilestoneNext(progress: CharacterProgress): number | null {
  const stars = totalStars(progress);
  return [10, 25, 50].find((at) => stars < at) ?? null;
}
