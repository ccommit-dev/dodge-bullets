/**
 * 장비 등급 (2026-11-05, 사용자: "장비의 종류도 동료나 스킬처럼 등급 및 ICON 테두리를 변경해줘") — 동료 · 스킬 · 유물과 같은 6등급으로 말한다.
 * 그림 · 이름표에만 쓰고 효과 값은 바꾸지 않는다. 같은 종류끼리 값이 같아 종류로 나누면 거짓말이 되므로, 키운 만큼 등급이 오른다.
 *   무기 +15 · 부위 강화 +10 · 세트 파츠 강화 +10 이 초월. 세트 파츠는 보석으로 사는 물건이라 영웅에서 시작한다. 견갑은 종류마다 값이 달라 종류로 정한다.
 */
import type { Tier } from "../titans/allyRoster";

export function weaponEquipTier(level: number): Tier { return level >= 15 ? "LR" : level >= 13 ? "UR" : level >= 10 ? "SSR" : level >= 5 ? "SR" : level >= 1 ? "R" : "N"; }
export function partEquipTier(enhance: number): Tier { return enhance >= 10 ? "LR" : enhance >= 9 ? "UR" : enhance >= 7 ? "SSR" : enhance >= 4 ? "SR" : enhance >= 1 ? "R" : "N"; }
export function setEquipTier(level: number): Tier { return level >= 10 ? "LR" : level >= 7 ? "UR" : level >= 4 ? "SSR" : "SR"; }
export function shoulderEquipTier(grade: "normal" | "rare" | "epic" | "legendary"): Tier { return grade === "legendary" ? "SSR" : grade === "epic" ? "SR" : grade === "rare" ? "R" : "N"; }
