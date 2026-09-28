/**
 * 원정 보급창 · 일일 임무 (2026-09-28).
 *
 * 참고 게임 가이드가 반복하는 두 가지를 화살 원정 안에서 받아 준다:
 *
 *   · "영구 성장 재화를 아껴만 두기 … 영구 강화는 **구매해야 효과가 있다**"
 *     → 인장을 **쓸 곳**이 스킬·칩뿐이면 결국 쌓아 두게 된다. 다음 런 한 번에만 듣는
 *       소모품(보급)을 두어, 지금 당장 판을 바꾸는 쓰임새를 만든다.
 *   · "짧은 런을 여러 번 … 오프라인 보상은 꾸준히 받아 두세요"
 *     → 하루치 목표를 세 개 걸어 두면 "한 판 더"의 이유가 생긴다. 보상은 인장이라
 *       스킬·칩·보급 전부로 되돌아간다.
 *
 * 둘 다 **화살 원정 안에서 닫힌다** — 게임 전체 경제(코인·보석·강화석)는 건드리지 않는다.
 */

export type SupplyId = "draft" | "primed" | "insurance";

export type SupplyDef = {
  id: SupplyId;
  name: string;
  desc: string;
  /** 인장 가격 — 칩 한 단계(3~13)보다 비싸되 한 판을 확실히 바꾼다 */
  seals: number;
};

export const SUPPLIES: SupplyDef[] = [
  { id: "draft", name: "선발 보급", desc: "다음 런의 첫 3택이 전부 레어 이상으로 나온다", seals: 12 },
  { id: "primed", name: "예비 탄창", desc: "출격 즉시 모든 스킬 재사용 완료 · 일섬 게이지 +30", seals: 8 },
  { id: "insurance", name: "보험 계약", desc: "이번 런 동안 최대 HP +1", seals: 6 },
];

export const SUPPLY_BY_ID: Record<SupplyId, SupplyDef> =
  Object.fromEntries(SUPPLIES.map((s) => [s.id, s])) as Record<SupplyId, SupplyDef>;

export type SupplyStock = Record<SupplyId, number>;

export function emptySupplyStock(): SupplyStock {
  return { draft: 0, primed: 0, insurance: 0 };
}

/** 한 번에 쌓아 둘 수 있는 수량 — 무한히 쟁여 두면 "지금 쓴다"는 선택이 사라진다 */
export const SUPPLY_MAX = 5;

// ── 일일 임무 ──────────────────────────────────────────────────────────

export type DailyId = "intercept" | "epic" | "clear";

export type DailyDef = {
  id: DailyId;
  name: string;
  goal: number;
  /** 달성 보상 (원정 인장) */
  seals: number;
};

export const DAILIES: DailyDef[] = [
  { id: "intercept", name: "스킬로 화살 40개 요격", goal: 40, seals: 6 },
  { id: "epic", name: "에픽 강화 카드 1장 획득", goal: 1, seals: 8 },
  { id: "clear", name: "원정 스테이지 2회 클리어", goal: 2, seals: 5 },
];

export const DAILY_BY_ID: Record<DailyId, DailyDef> =
  Object.fromEntries(DAILIES.map((d) => [d.id, d])) as Record<DailyId, DailyDef>;

export type DailyState = {
  /** 로컬 날짜 키 (YYYY-MM-DD) — 바뀌면 진행도와 수령 기록이 초기화된다 */
  day: string;
  counts: Record<DailyId, number>;
  claimed: DailyId[];
};

export function dayKey(now = Date.now()): string {
  const d = new Date(now);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function emptyDaily(now = Date.now()): DailyState {
  return { day: dayKey(now), counts: { intercept: 0, epic: 0, clear: 0 }, claimed: [] };
}

/** 날짜가 바뀌었으면 새 하루로 — 읽는 쪽이 매번 이걸 지나게 한다 */
export function rolledDaily(state: DailyState, now = Date.now()): DailyState {
  return state.day === dayKey(now) ? state : emptyDaily(now);
}

/** 한 판의 결과를 일일 진행도에 더한다 */
export function addDailyProgress(
  state: DailyState,
  run: { skillKills: number; epicPicks: number; clears: number },
  now = Date.now(),
): DailyState {
  const base = rolledDaily(state, now);
  return {
    ...base,
    counts: {
      intercept: base.counts.intercept + Math.max(0, run.skillKills),
      epic: base.counts.epic + Math.max(0, run.epicPicks),
      clear: base.counts.clear + Math.max(0, run.clears),
    },
  };
}

export function dailyDone(state: DailyState, id: DailyId): boolean {
  return (state.counts[id] ?? 0) >= DAILY_BY_ID[id].goal;
}

export function dailyClaimable(state: DailyState, id: DailyId): boolean {
  return dailyDone(state, id) && !state.claimed.includes(id);
}
