/**
 * 장비 등급 (2026-11-05, 사용자: "장비의 종류도 동료나 스킬처럼 등급 및 ICON 테두리를 변경해줘") — 동료 · 스킬 · 유물과 같은 6등급으로 말한다.
 * 그림 · 이름표에만 쓰고 효과 값은 바꾸지 않는다. 같은 종류끼리 값이 같아 종류로 나누면 거짓말이 되므로, 키운 만큼 등급이 오른다.
 *   무기 +15 · 부위 강화 +10 · 세트 파츠 강화 +10 이 초월. 세트 파츠는 보석으로 사는 물건이라 영웅에서 시작한다. 견갑은 종류마다 값이 달라 종류로 정한다.
 */
import type { Tier } from "../titans/allyRoster";

// 2026-11-09 (사용자: "장비 등급들도 골고루 설정되게") — 구간을 고르게. 예전 무기 구간은 일반 1 · 희귀 4 · 영웅 5 · 전설 3 · 신화 2 · 초월 1칸이라 오래 영웅에 머물렀다
//   무기 0~15: 3 · 3 · 3 · 3 · 2 · 2 칸 / 부위 0~10: 2 · 2 · 2 · 2 · 2 · 1 칸 / 세트 0~10(영웅부터): 3 · 3 · 3 · 2 칸
export function weaponEquipTier(level: number): Tier { return level >= 14 ? "LR" : level >= 12 ? "UR" : level >= 9 ? "SSR" : level >= 6 ? "SR" : level >= 3 ? "R" : "N"; }
export function partEquipTier(enhance: number): Tier { return enhance >= 10 ? "LR" : enhance >= 8 ? "UR" : enhance >= 6 ? "SSR" : enhance >= 4 ? "SR" : enhance >= 2 ? "R" : "N"; }
export function setEquipTier(level: number): Tier { return level >= 9 ? "LR" : level >= 6 ? "UR" : level >= 3 ? "SSR" : "SR"; }
export function shoulderEquipTier(grade: "normal" | "rare" | "epic" | "legendary"): Tier { return grade === "legendary" ? "SSR" : grade === "epic" ? "SR" : grade === "rare" ? "R" : "N"; }
