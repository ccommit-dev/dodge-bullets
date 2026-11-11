/**
 * 보물 동굴 반복 보너스 (2026-11-11, 탕탕에이스 비교표 댐 방어전 4번 "반복 골드 던전") — 보물 동굴은 첫 클리어 보상뿐이라
 * 깬 뒤엔 다시 갈 이유가 없었다. 이제 하루 3번까지 클리어마다 그 칸 기본 보상의 1.5배를 골드로 더 준다(별 · 첫 보상과 별개).
 * 장마다 하나씩 있는 보물 동굴(장 3칸 깊이) 중 어디서든 — 깊은 장일수록 많다. 상태는 CharacterProgress.treasureRuns.
 */
export type TreasureRuns = { day: string; count: number };

export const TREASURE_DAILY = 3;
export const TREASURE_BONUS_MUL = 1.5;

export function emptyTreasureRuns(): TreasureRuns {
  return { day: "", count: 0 };
}

export function normalizeTreasureRuns(raw: unknown): TreasureRuns {
  const v = (raw && typeof raw === "object" ? raw : {}) as Partial<TreasureRuns>;
  const count = Math.floor(Number(v.count));
  return {
    day: typeof v.day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v.day) ? v.day : "",
    count: Number.isFinite(count) ? Math.max(0, Math.min(TREASURE_DAILY, count)) : 0,
  };
}

export function treasureRunsToday(state: TreasureRuns, day: string): number {
  return state.day === day ? state.count : 0;
}

/** 보너스를 하나 쓴다 — 오늘 다 썼으면 그대로(같은 객체) */
export function spendTreasureRun(state: TreasureRuns, day: string): TreasureRuns {
  const n = treasureRunsToday(state, day);
  return n >= TREASURE_DAILY ? state : { day, count: n + 1 };
}

export function treasureBonusGold(baseReward: number): number {
  return Math.max(1, Math.round(baseReward * TREASURE_BONUS_MUL));
}
