/**
 * 이벤트 저장 — 일일(토벌령·균열)과 주간(랭크 시험·주간 도전) 상태.
 *
 * EventCenter 안에 갇혀 있던 것을 모듈로 뺐다: 데일리 루틴 보드(사냥터 허브)와
 * 추천 엔진, 주간 도전이 같은 상태를 읽어야 하기 때문이다. 리셋 규칙은 여기 한 곳.
 */
import { storageGet, storageSet } from "../game/toss";
import { weekKey } from "./shadowArena";

export type EventSave = {
  date: string;
  week: string;
  claimed: string[];
  riftAttempts: number;
  shadowCleared: string[];
  shadowBonus: number;
  /** 주간 도전 카운터 — 주차가 바뀌면 0 */
  weeklyRiftRuns: number;
  weeklyMissionDays: number;
  weeklyBossKills: number;
  weeklyClaimed: string[];
  /** 토벌령을 완료한 마지막 날짜 — weeklyMissionDays 중복 집계 방지 */
  lastMissionDay: string;
};

export const dateKey = () => new Date().toLocaleDateString("sv-SE");

/** 일일 던전 1회 = 방치 2시간 즉시 정산. */
export const RIFT_SECONDS = 2 * 3600;
export const RIFT_ATTEMPTS = 3;

/** 하루 균열 횟수 — 원정 후원 계약(월정액) 중이면 +1 */
export function riftAttemptsFor(patronUntil: number, now: number = Date.now()): number {
  return RIFT_ATTEMPTS + (patronUntil > now ? 1 : 0);
}

export function emptyEventSave(): EventSave {
  return {
    date: dateKey(),
    week: weekKey(),
    claimed: [],
    riftAttempts: 0,
    shadowCleared: [],
    shadowBonus: 0,
    weeklyRiftRuns: 0,
    weeklyMissionDays: 0,
    weeklyBossKills: 0,
    weeklyClaimed: [],
    lastMissionDay: "",
  };
}

function eventKey(userHash: string): string {
  return `dodgebullets:events:v2:${userHash}`;
}

/** 일일·주간 리셋을 적용한 정규화 — 로드 직후와 저장 직전에 같은 규칙 */
export function normalizeEventSave(raw: Partial<EventSave> | null): EventSave {
  let value: EventSave = { ...emptyEventSave(), ...(raw ?? {}) };
  if (!Array.isArray(value.claimed)) value.claimed = [];
  if (!Array.isArray(value.weeklyClaimed)) value.weeklyClaimed = [];
  if (!Array.isArray(value.shadowCleared)) value.shadowCleared = [];
  if (value.date !== dateKey()) {
    value = {
      ...value,
      date: dateKey(),
      claimed: value.claimed.filter((id) => id.startsWith("weekly:")),
      riftAttempts: 0,
    };
  }
  if (value.week !== weekKey()) {
    value = {
      ...value,
      week: weekKey(),
      claimed: value.claimed.filter((id) => id.startsWith("daily:")),
      shadowCleared: [],
      shadowBonus: 0,
      weeklyRiftRuns: 0,
      weeklyMissionDays: 0,
      weeklyBossKills: 0,
      weeklyClaimed: [],
      lastMissionDay: "",
    };
  }
  return value;
}

export async function loadEventSave(userHash: string): Promise<EventSave> {
  const raw = await storageGet(eventKey(userHash));
  try {
    return normalizeEventSave(raw ? (JSON.parse(raw) as Partial<EventSave>) : null);
  } catch {
    return normalizeEventSave(null);
  }
}

export async function saveEventSave(userHash: string, value: EventSave): Promise<EventSave> {
  const next = normalizeEventSave(value);
  await storageSet(eventKey(userHash), JSON.stringify(next));
  return next;
}

/** load → modify → save. 여러 화면이 같은 키를 만지므로 항상 이 경로로 */
export async function updateEventSave(userHash: string, fn: (current: EventSave) => EventSave): Promise<EventSave> {
  const current = await loadEventSave(userHash);
  return saveEventSave(userHash, fn(current));
}

/** 오늘 토벌령 4종을 전부 수령했는지 */
export function dailyMissionsDone(save: EventSave, missionIds = ["hunt", "pioneer", "forge", "beat"]): boolean {
  const today = dateKey();
  return missionIds.every((id) => save.claimed.includes(`daily:${today}:${id}`));
}
