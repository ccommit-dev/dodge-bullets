/**
 * 분석 이벤트 큐 (계획안 §41) — SDK 없이 구조만 준비한다.
 * 로컬 링버퍼(최근 200건)에 쌓고 DEV 콘솔에 찍는다. P3에서 실제 Analytics 연동 시 flush 지점만 바꾼다.
 * 각 이벤트는 최소 데이터(stage·score·duration·reward·player_power)만 싣는다 — 개인정보 없음.
 */
export type AnalyticsEvent =
  | "game_start" | "game_end"
  | "beat_expedition_start" | "beat_expedition_end" | "beat_score_record"
  | "dungeon_enter" | "dungeon_start" | "dungeon_complete" | "dungeon_reward_claim"
  | "arrow_expedition_start" | "arrow_expedition_end" | "arrow_expedition_clear" | "arrow_expedition_fail"
  | "upgrade" | "reward_claim" | "ad_start" | "ad_complete" | "revive";

export type AnalyticsData = Partial<{
  stage: number; score: number; duration: number; reward: number; player_power: number;
  track: string; difficulty: string; combo: number; placement: string; content: string; result: string;
}>;

export type AnalyticsEntry = { event: AnalyticsEvent; at: number; data: AnalyticsData };

const KEY = "dodgebullets:analytics";
const MAX = 200;
let buffer: AnalyticsEntry[] | null = null;

function load(): AnalyticsEntry[] {
  if (buffer) return buffer;
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    buffer = Array.isArray(parsed) ? (parsed as AnalyticsEntry[]).filter((e) => e && typeof e.event === "string") : [];
  } catch {
    buffer = [];
  }
  return buffer;
}

/** 이벤트 기록 — 실패해도 게임을 멈추지 않는다 */
export function track(event: AnalyticsEvent, data: AnalyticsData = {}): void {
  try {
    const list = load();
    list.push({ event, at: Date.now(), data });
    while (list.length > MAX) list.shift();
    localStorage.setItem(KEY, JSON.stringify(list));
    if (import.meta.env.DEV) console.debug("[analytics]", event, data);
  } catch {
    /* storage unavailable */
  }
}

export function readEvents(): AnalyticsEntry[] {
  return [...load()];
}

export function clearEvents(): void {
  buffer = [];
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}
