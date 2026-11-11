/**
 * 핫타임 보급 (2026-11-11, 슬레이어 키우기 비교표 사냥터 4번) — 하루 두 번 정해진 시각에 들어오면 보급 한 번.
 * "정해진 시각에 다시 켤 이유"만 만든다. 보석은 하루 +15 — 지금 무과금 보석(하루 약 73)의 20% 남짓이라 뽑기 주기를 크게 바꾸지 않는다.
 * 받은 기록은 EventSave.claimed 의 `hottime:<날짜>:<창>` 키 — 날이 바뀌면 normalizeEventSave 가 지운다.
 */
export type HotTimeId = "lunch" | "evening";

export type HotTimeWindow = {
  id: HotTimeId;
  label: string;
  /** 로컬 시각 [startHour, endHour) */
  startHour: number;
  endHour: number;
  gems: number;
  stones: number;
  eventCoins: number;
};

export const HOT_TIME_WINDOWS: readonly HotTimeWindow[] = [
  { id: "lunch", label: "점심 보급", startHour: 12, endHour: 14, gems: 5, stones: 4, eventCoins: 3 },
  { id: "evening", label: "저녁 보급", startHour: 19, endHour: 22, gems: 10, stones: 6, eventCoins: 5 },
];

export function activeHotTime(now: Date = new Date()): HotTimeWindow | null {
  const h = now.getHours();
  return HOT_TIME_WINDOWS.find((w) => h >= w.startHour && h < w.endHour) ?? null;
}

/** 다음에 열리는 창과 그 시각 — 오늘 남은 창이 없으면 내일 첫 창 */
export function nextHotTime(now: Date = new Date()): { window: HotTimeWindow; at: Date; tomorrow: boolean } {
  const h = now.getHours();
  const today = HOT_TIME_WINDOWS.find((w) => w.startHour > h);
  const window = today ?? HOT_TIME_WINDOWS[0];
  const at = new Date(now);
  at.setHours(window.startHour, 0, 0, 0);
  if (!today) at.setDate(at.getDate() + 1);
  return { window, at, tomorrow: !today };
}

export function hotTimeClaimKey(id: HotTimeId, day: string): string {
  return `hottime:${day}:${id}`;
}

export function isHotTimeClaimed(claimed: readonly string[], id: HotTimeId, day: string): boolean {
  return claimed.includes(hotTimeClaimKey(id, day));
}

/** 지금 받을 수 있는 창 — 열려 있고 오늘 아직 안 받았으면 */
export function claimableHotTime(claimed: readonly string[], day: string, now: Date = new Date()): HotTimeWindow | null {
  const live = activeHotTime(now);
  return live && !isHotTimeClaimed(claimed, live.id, day) ? live : null;
}

export function hotTimeHours(w: HotTimeWindow): string {
  return `${w.startHour}~${w.endHour}시`;
}
