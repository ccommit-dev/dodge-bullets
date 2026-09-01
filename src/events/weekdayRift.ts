/**
 * 요일 균열 (CRUMBLE_GAP §5) — 차원 균열의 보상이 요일마다 다른 축을 민다.
 *
 * "오늘은 조각의 날이니 균열을 꼭 돌자"는 요일 단위 리듬이 목적.
 * 별도 콘텐츠가 아니라 기존 균열의 배율 테이블 하나로 구현한다.
 */
export type WeekdayRift = {
  name: string;
  desc: string;
  /** 균열 골드 배율 */
  goldMult: number;
  /** 균열 1회당 동료 조각 (기본 2) */
  shards: number;
  /** 균열 강화석 배율 */
  matMult: number;
};

const RIFTS: Record<number, WeekdayRift> = {
  0: { name: "무지개 균열", desc: "모든 보상 1.5배", goldMult: 1.5, shards: 3, matMult: 1.5 },
  1: { name: "황금 균열", desc: "골드 3배", goldMult: 3, shards: 2, matMult: 1 },
  2: { name: "조각 균열", desc: "동료 조각 6개", goldMult: 1, shards: 6, matMult: 1 },
  3: { name: "각암 균열", desc: "강화석 3배", goldMult: 1, shards: 2, matMult: 3 },
  4: { name: "황금 균열", desc: "골드 3배", goldMult: 3, shards: 2, matMult: 1 },
  5: { name: "조각 균열", desc: "동료 조각 6개", goldMult: 1, shards: 6, matMult: 1 },
  6: { name: "각암 균열", desc: "강화석 3배", goldMult: 1, shards: 2, matMult: 3 },
};

export function weekdayRift(day: number = new Date().getDay()): WeekdayRift {
  return RIFTS[((day % 7) + 7) % 7];
}

const DAY_LABEL = ["일", "월", "화", "수", "목", "금", "토"];

export function weekdayRiftSchedule(): { day: string; rift: WeekdayRift; today: boolean }[] {
  const today = new Date().getDay();
  return [1, 2, 3, 4, 5, 6, 0].map((d) => ({ day: DAY_LABEL[d], rift: RIFTS[d], today: d === today }));
}
