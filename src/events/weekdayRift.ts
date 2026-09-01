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

/* ───────── 기간 한정 이벤트 균열 — 요일 테이블 위의 배율 레이어 ───────── */

export type RiftEvent = {
  id: string;
  name: string;
  desc: string;
  /** 요일 균열 보상 전체에 곱해지는 추가 배율 */
  mult: number;
};

/**
 * 날짜 범위 이벤트 — 서버 없이 클라이언트 달력으로 판정한다.
 * 새 이벤트는 여기에 한 줄 추가가 전부다 (배포 = 이벤트 공지).
 */
const DATED_EVENTS: Array<RiftEvent & { from: string; to: string }> = [
  {
    id: "launch-festival",
    name: "개장 축제 균열",
    desc: "출시 기념 — 모든 균열 보상 3배",
    mult: 3,
    from: "2026-09-14",
    to: "2026-09-20",
  },
];

/**
 * 활성 이벤트 판정 — 날짜 범위 이벤트가 우선, 없으면 상시 주말(토·일) 2배.
 * 요일 테이블과 곱으로 중첩된다: 일요일(만능 1.5배) + 주말 2배 = 3배 체감.
 */
export function riftEventFor(date: Date = new Date()): RiftEvent | null {
  const key = date.toLocaleDateString("sv-SE");
  const dated = DATED_EVENTS.find((e) => key >= e.from && key <= e.to);
  if (dated) return dated;
  const day = date.getDay();
  if (day === 0 || day === 6) {
    return { id: "weekend-double", name: "주말 2배 균열", desc: "토·일 상시 — 균열 보상 2배", mult: 2 };
  }
  return null;
}

const DAY_LABEL = ["일", "월", "화", "수", "목", "금", "토"];

export function weekdayRiftSchedule(): { day: string; rift: WeekdayRift; today: boolean }[] {
  const today = new Date().getDay();
  return [1, 2, 3, 4, 5, 6, 0].map((d) => ({ day: DAY_LABEL[d], rift: RIFTS[d], today: d === today }));
}
