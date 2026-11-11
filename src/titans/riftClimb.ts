/**
 * 균열 계단 (2026-11-11, 슬레이어 키우기 비교표 사냥터 3번) — 사냥터에서 손으로 미는 계단 던전.
 * 요일 균열은 "방치 2시간 즉시 정산"뿐이라 싸움이 없었다. 계단은 단마다 대장 한 판(특수 대결, titans/specialFight.ts)이고,
 * 오를 때마다 강화석 · 5단마다 보석 · 3단마다 동료 조각, 그리고 균열 정산이 단당 +2%(최대 +30%) 영구로 오른다.
 *
 * 하루 5단까지 — 한 번에 몰아서 다 오르지 않고 날마다 다시 올 이유가 된다(지면 횟수를 쓰지 않는다).
 * 단 f 의 대장 = 사냥터 2f+3 층 대장 체력(1단 = 5층 · 10단 = 23층 · 20단 = 43층) — 사냥터를 밀면 계단도 열린다.
 * 상태는 CharacterProgress.climb (사냥터 · 이벤트 센터 둘 다 읽는다).
 */
import { HUNTING_AREAS, monsterHp, type HuntingAreaDef } from "./model";
import { HUNT_BOSSES } from "./bestiary";

export type ClimbState = {
  /** 다음에 오를 단 (1부터) */
  floor: number;
  /** 오늘 기록의 날짜(로컬 YYYY-MM-DD) */
  day: string;
  /** 그날 오른 단 수 */
  clears: number;
};

export const CLIMB_DAILY_CLEARS = 5;
export const CLIMB_RIFT_BONUS_PER_FLOOR = 0.02;
export const CLIMB_RIFT_BONUS_MAX = 0.3;
export const CLIMB_GEMS_EVERY = 5;
export const CLIMB_GEMS = 10;

export function emptyClimb(): ClimbState {
  return { floor: 1, day: "", clears: 0 };
}

export function normalizeClimb(raw: unknown): ClimbState {
  const v = (raw && typeof raw === "object" ? raw : {}) as Partial<ClimbState>;
  const floor = Math.floor(Number(v.floor));
  const clears = Math.floor(Number(v.clears));
  return {
    floor: Number.isFinite(floor) ? Math.max(1, Math.min(9999, floor)) : 1,
    day: typeof v.day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v.day) ? v.day : "",
    clears: Number.isFinite(clears) ? Math.max(0, Math.min(CLIMB_DAILY_CLEARS, clears)) : 0,
  };
}

export function climbClearsToday(state: ClimbState, day: string): number {
  return state.day === day ? state.clears : 0;
}

export function canClimbToday(state: ClimbState, day: string): boolean {
  return climbClearsToday(state, day) < CLIMB_DAILY_CLEARS;
}

/** 단 f 를 넘었다 — 다음 단으로 · 오늘 수 +1. 그 단이 아니거나 오늘 다 올랐으면 그대로(같은 객체) */
export function afterClimb(state: ClimbState, floor: number, day: string): ClimbState {
  if (state.floor !== floor || !canClimbToday(state, day)) return state;
  return { floor: floor + 1, day, clears: climbClearsToday(state, day) + 1 };
}

/** 사냥터 몇 층 대장과 같은가 */
export function climbStage(floor: number): number {
  return 2 * Math.max(1, Math.floor(floor)) + 3;
}

export function climbHp(floor: number): number {
  return monsterHp(climbStage(floor), true);
}

/** 얼굴 — 사냥터 대장 15종을 지역 순으로 돈다(1~3단 초원 · 4~6단 숲 …) */
export function climbFace(floor: number): { area: HuntingAreaDef; stage: number; art: string; name: string } {
  const i = (Math.max(1, Math.floor(floor)) - 1) % (HUNTING_AREAS.length * 3);
  const area = HUNTING_AREAS[Math.floor(i / 3)];
  const list = HUNT_BOSSES[area.id] ?? [];
  const def = list[i % 3] ?? list[0];
  return { area, stage: area.stageFrom + (i % 3), art: def?.art ?? "", name: def?.name ?? area.bossName };
}

export type ClimbReward = { stones: number; gems: number; shards: number };

export function climbReward(floor: number): ClimbReward {
  const f = Math.max(1, Math.floor(floor));
  return { stones: 2 + Math.floor(f / 4), gems: f % CLIMB_GEMS_EVERY === 0 ? CLIMB_GEMS : 0, shards: f % 3 === 0 ? 1 : 0 };
}

/** 균열 정산 배수 — 오른 단마다 +2%, 최대 +30% (15단) */
export function climbRiftMult(state: ClimbState): number {
  return 1 + Math.min(CLIMB_RIFT_BONUS_MAX, CLIMB_RIFT_BONUS_PER_FLOOR * Math.max(0, state.floor - 1));
}

/** 이벤트 센터 → 사냥터: 계단 전단을 연다 */
export const CLIMB_OPEN_EVENT = "dodgebullets:climb-open";
