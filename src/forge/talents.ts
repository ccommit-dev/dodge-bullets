/**
 * 대장간 장인 이정표 · 영구 특성 (2026-10-13, docs/FOCUS_CAPYGO P1 — 카피바라 Go! "특성 승급 이정표":
 * 숫자만 오르던 강화에 "다음 보상이 보이는 중간 계단"을 둔다).
 *
 * 장인 점수 = 북(검) 최고 강화 + 보호구 최고 강화 + 원정 무기(활·지팡이) 강화 합. 10점마다 장인 등급이 오르고,
 * 등급 안에서 4점(≈1/3)에 골드, 7점(≈2/3)에 **영구 특성 1개 선택**. 특성 5종은 중복 선택 불가(5등급이면 전부).
 */
export type TalentId = "gold-digger" | "flex" | "sturdy" | "scholar" | "survivor";
export type TalentDef = { id: TalentId; name: string; desc: string };

export const TALENTS: TalentDef[] = [
  { id: "gold-digger", name: "골드 디거", desc: "성문 방어 결과 코인 +50%" },
  { id: "flex", name: "융통", desc: "한 판에 한 번 레벨업 카드를 다시 뽑는다" },
  { id: "sturdy", name: "건장", desc: "하루 소탕 횟수 +1" },
  { id: "scholar", name: "지식욕", desc: "성문 방어 런 XP +10% (카드가 더 자주 온다)" },
  { id: "survivor", name: "황야 서바이벌", desc: "출발 전 '휴식' 방어막 +30% (기본 +20%)" },
];
export const TALENT_BY_ID: Record<TalentId, TalentDef> = Object.fromEntries(TALENTS.map((t) => [t.id, t])) as Record<TalentId, TalentDef>;

export const MASTERY_STEP = 10;
/** 등급 안의 골드 이정표(1/3)·특성 이정표(2/3) 위치 */
export const MASTERY_GOLD_AT = 4;
export const MASTERY_PICK_AT = 7;
/** 골드 이정표 보상 — 등급이 오를수록 커진다 */
export function masteryGoldReward(rank: number): number { return 2000 * (rank + 1); }

export type MasteryInput = { bestLevel: number; bestArmorLevel: number; bow: number; staff: number };
export function masteryPoints(x: MasteryInput): number {
  return Math.max(0, x.bestLevel) + Math.max(0, x.bestArmorLevel) + Math.max(0, x.bow) + Math.max(0, x.staff);
}
export function masteryRank(points: number): number { return Math.floor(points / MASTERY_STEP); }

/** points 까지 열린 골드 이정표 수 (등급 r 의 골드는 10r+4 에서 열린다) */
export function goldMilestonesEarned(points: number): number { return points >= MASTERY_GOLD_AT ? Math.floor((points - MASTERY_GOLD_AT) / MASTERY_STEP) + 1 : 0; }
/** points 까지 열린 특성 선택권 수 (등급 r 의 선택은 10r+7 에서 열린다), 특성은 5개까지 */
export function pickMilestonesEarned(points: number): number { return Math.min(TALENTS.length, points >= MASTERY_PICK_AT ? Math.floor((points - MASTERY_PICK_AT) / MASTERY_STEP) + 1 : 0); }

export type MasteryState = {
  points: number;
  rank: number;
  /** 등급 안 진행 0~9 */
  within: number;
  /** 받을 수 있는 골드 이정표 수 · 그 합 */
  goldPending: number;
  goldPendingAmount: number;
  /** 고를 수 있는 특성 선택권 수 */
  picksPending: number;
  /** 다음 이정표까지 남은 점수와 종류 */
  next: { kind: "gold" | "pick" | "rank"; left: number };
};

export function masteryState(points: number, claimedGold: number, talents: TalentId[]): MasteryState {
  const rank = masteryRank(points), within = points % MASTERY_STEP;
  const goldEarned = goldMilestonesEarned(points);
  const goldPending = Math.max(0, goldEarned - claimedGold);
  let goldPendingAmount = 0;
  for (let i = claimedGold; i < goldEarned; i += 1) goldPendingAmount += masteryGoldReward(i);
  const picksPending = Math.max(0, pickMilestonesEarned(points) - talents.length);
  const next: MasteryState["next"] = within < MASTERY_GOLD_AT ? { kind: "gold", left: MASTERY_GOLD_AT - within }
    : within < MASTERY_PICK_AT ? { kind: "pick", left: MASTERY_PICK_AT - within }
    : { kind: "rank", left: MASTERY_STEP - within };
  return { points, rank, within, goldPending, goldPendingAmount, picksPending, next };
}

/** 특성 효과 숫자 — 소비처가 이 함수만 보면 된다 */
export const TALENT_EFFECT = {
  goldDiggerCoinMul: 1.5,
  sturdySweepExtra: 1,
  scholarRunXpMul: 1.1,
  survivorRestBarrier: 0.3,
} as const;
export const hasTalent = (talents: readonly string[] | undefined, id: TalentId): boolean => !!talents && talents.includes(id);
