/**
 * 성문 방어 소탕 (2026-10-13, docs/FOCUS_CAPYGO P0 — 카피바라 Go! "탐방 배율"):
 * 이미 깬 스테이지(최고 −1 이하)는 전투 없이 그 스테이지 보상을 배율만큼 받는다. 지켜보지 않아도 되는 출구.
 *
 * - 하루 소탕 예산 SWEEP_DAILY(5). dodge-x3(성문 ×3 배속 영구) 보유자는 10 — ×10 소탕은 그들만(시간 절약형 유료 가치, 밸런스 불변).
 * - 보상은 한 판 기대값: 코인 = baseReward × 0.72(평균 생존 비율), 견갑 조각 = 중복 드랍 기대값. 런 XP·강화 카드·첫 클리어 2배는 없다(손으로 하는 이유를 남긴다).
 * - 일일 미션 "원정 스테이지 클리어" 카운트에는 배율만큼 더해 준다.
 */
import type { CharacterProgress } from "../progression/model";
import { getStage, isBranchIndex, towerFloorOf } from "./stages";
import { addDailyProgress, rolledDaily, type DailyState } from "./expeditionOps";
import { TALENT_EFFECT, hasTalent } from "../forge/talents";

export const SWEEP_DAILY = 5;
export const SWEEP_DAILY_X3 = 10;
export const SWEEP_MULTIPLIERS = [1, 3, 5, 10] as const;
export type SweepMultiplier = (typeof SWEEP_MULTIPLIERS)[number];
/** 한 판 평균 생존 비율 — handleExtract 의 0.72 와 같은 값 */
export const SWEEP_SURVIVAL = 0.72;

export function sweepBudget(progress: CharacterProgress): number {
  return (progress.dodgeSpeed3 ? SWEEP_DAILY_X3 : SWEEP_DAILY) + (hasTalent(progress.talents, "sturdy") ? TALENT_EFFECT.sturdySweepExtra : 0);   // 특성 건장 +1
}

export function sweepsLeft(progress: CharacterProgress, now = Date.now()): number {
  return Math.max(0, sweepBudget(progress) - rolledDaily(progress.expeditionDaily, now).sweeps);
}

/** 소탕 가능한 가장 높은 스테이지 index (0-based) — 최고 클리어 스테이지의 바로 아래. 없으면 null */
export function sweepStageIndex(progress: CharacterProgress): number | null {
  const n = progress.dodgeBestStage - 1;   // dodgeBestStage = 깬 스테이지 수(1-based 최고)
  return n >= 1 ? n - 1 : null;
}

export function canSweep(progress: CharacterProgress, stageIndex: number, mult: SweepMultiplier, now = Date.now()): { ok: true } | { ok: false; reason: string } {
  const top = sweepStageIndex(progress);
  if (top === null) return { ok: false, reason: "스테이지 2까지 깨면 1부터 소탕할 수 있어요" };
  if (isBranchIndex(stageIndex) || towerFloorOf(stageIndex) > 0) return { ok: false, reason: "본선 스테이지만 소탕할 수 있어요" };
  if (stageIndex > top) return { ok: false, reason: `최고 스테이지(S${progress.dodgeBestStage})보다 아래만 소탕돼요` };
  if (mult === 10 && !progress.dodgeSpeed3) return { ok: false, reason: "×10 소탕은 '성문 방어 ×3 배속'(영구) 보유자만" };
  const left = sweepsLeft(progress, now);
  if (left < mult) return { ok: false, reason: `오늘 소탕 ${left}회 남음 (매일 ${sweepBudget(progress)}회)` };
  return { ok: true };
}

export type SweepReward = { coins: number; shoulderShards: number; clears: number };

export function sweepReward(stageIndex: number, mult: SweepMultiplier): SweepReward {
  const stage = getStage(stageIndex);
  const ch = Math.min(3, stage.chapter);
  const coins = Math.floor(stage.baseReward * SWEEP_SURVIVAL) * mult;
  // 중복 견갑 드랍 기대값: 확률 .18 × (15 + 장×10)
  const shoulderShards = Math.round((15 + ch * 10) * 0.18 * mult);
  return { coins, shoulderShards, clears: mult };
}

/** 소탕 적용 — 예산을 쓰고 보상을 더한다. 불가하면 그대로 돌려준다 */
export function applySweep(progress: CharacterProgress, stageIndex: number, mult: SweepMultiplier, now = Date.now()): { progress: CharacterProgress; reward: SweepReward | null; reason?: string } {
  const check = canSweep(progress, stageIndex, mult, now);
  if (!check.ok) return { progress, reward: null, reason: check.reason };
  const reward = sweepReward(stageIndex, mult);
  const daily: DailyState = rolledDaily(progress.expeditionDaily, now);
  const withClears = addDailyProgress({ ...daily, sweeps: daily.sweeps + mult }, { skillKills: 0, epicPicks: 0, clears: reward.clears }, now);
  return {
    progress: {
      ...progress,
      sharedCoins: progress.sharedCoins + reward.coins,
      shoulderShards: progress.shoulderShards + reward.shoulderShards,
      expeditionDaily: withClears,
    },
    reward,
  };
}
