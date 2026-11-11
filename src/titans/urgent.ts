/**
 * 긴급 의뢰 (2026-11-11) — 사냥터에 "돌아오자마자 할 일"과 "놓치기 싫은 마감"을 만든다.
 * 조건을 채우면 현상범이 붙는다(하루 세 번: 오늘 첫 사냥 · 방치 보상 받기 · 대장 3번 처치). 15분 안에 [도전]을 눌러 짧은 대결로 잡는다.
 *
 * 난이도는 지금 층에 비례한다 — 바로 아래 층 대장 체력의 55% · 대장 제한 시간의 2/3.
 * 지금 층 대장을 잡는 데 드는 화력의 약 60%(0.55 ÷ 1.38 × 1.5)면 이긴다. 벽에 막힌 사람도 이기고, 그렇다고 한 대에 끝나지는 않는다.
 * 얼굴은 같은 지역의 다른 대장을 쓴다 — 새 그림 없이 "평소와 다른 놈이 나타났다"가 보인다.
 *
 * 상태는 사냥터 저장(TitansSave.urgent)에 둔다 — 붙이고 잡는 일이 모두 사냥터 화면 안에서 일어난다. 환생해도 남는다(titans/storage rebirthResetTitans).
 */
import { MOBS_PER_STAGE, huntingArea, killGold, monsterHp, stageClearBonus } from "./model";
import { huntBossVariant, type MonsterArtDef } from "./bestiary";

export type UrgentKind = "login" | "idle" | "boss";
export type UrgentState = {
  /** 이 기록의 날짜(로컬 YYYY-MM-DD) — 날이 바뀌면 통째로 비운다 */
  day: string;
  /** 붙은 시각(ms) — 종류마다 하루 한 번 */
  issued: Partial<Record<UrgentKind, number>>;
  done: UrgentKind[];
  /** 오늘 잡은 대장 수 — 세 번째에 "boss" 의뢰가 붙는다 */
  bossKills: number;
};

export const URGENT_KINDS: UrgentKind[] = ["login", "idle", "boss"];
/** 사냥터 최고 층이 여기 닿아야 열린다 — 첫 5분(1~4층)은 배우는 구간이라 팝업을 더 얹지 않는다 */
export const URGENT_OPEN_STAGE = 5;
export const URGENT_ACCEPT_MS = 15 * 60 * 1000;
export const URGENT_BOSS_KILLS = 3;
export const URGENT_HP_RATE = 0.55;
/** 보상 골드 — 지금 층을 이만큼 돈 값(처치 10 + 대장 + 클리어 보너스) */
export const URGENT_GOLD_LAPS = 5;
export const URGENT_EVENT_COINS = 5;

export const URGENT_LABEL: Record<UrgentKind, string> = {
  login: "오늘 첫 사냥",
  idle: "방치 보상 받기",
  boss: `대장 ${URGENT_BOSS_KILLS}번 처치`,
};

export function emptyUrgent(day = ""): UrgentState {
  return { day, issued: {}, done: [], bossKills: 0 };
}

export function normalizeUrgent(raw: unknown): UrgentState {
  const v = (raw && typeof raw === "object" ? raw : {}) as Partial<UrgentState>;
  const issuedRaw = (v.issued && typeof v.issued === "object" ? v.issued : {}) as Partial<Record<UrgentKind, unknown>>;
  const issued: Partial<Record<UrgentKind, number>> = {};
  for (const kind of URGENT_KINDS) {
    const at = Number(issuedRaw[kind]);
    if (Number.isFinite(at) && at > 0) issued[kind] = Math.floor(at);
  }
  const done = Array.isArray(v.done) ? URGENT_KINDS.filter((kind) => (v.done as unknown[]).includes(kind) && issued[kind] !== undefined) : [];
  const kills = Math.floor(Number(v.bossKills));
  return {
    day: typeof v.day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v.day) ? v.day : "",
    issued,
    done,
    bossKills: Number.isFinite(kills) ? Math.max(0, Math.min(9999, kills)) : 0,
  };
}

/** 오늘 기록 — 날이 바뀌었으면 빈 기록 */
export function urgentToday(state: UrgentState, day: string): UrgentState {
  return state.day === day ? state : emptyUrgent(day);
}

/** 의뢰를 붙인다 — 오늘 이미 붙은 종류면 그대로 돌려준다(같은 객체) */
export function issueUrgent(state: UrgentState, kind: UrgentKind, now: number, day: string): UrgentState {
  const today = urgentToday(state, day);
  if (today.issued[kind] !== undefined) return today === state ? state : today;
  return { ...today, issued: { ...today.issued, [kind]: now } };
}

/** 대장 하나를 셌다 — 세 번째에 "boss" 의뢰가 붙는다 */
export function countUrgentBoss(state: UrgentState, now: number, day: string): UrgentState {
  const today = urgentToday(state, day);
  const next = { ...today, bossKills: today.bossKills + 1 };
  return next.bossKills >= URGENT_BOSS_KILLS ? issueUrgent(next, "boss", now, day) : next;
}

export type UrgentActive = { kind: UrgentKind; deadline: number };

/** 지금 받을 수 있는 의뢰 — 마감이 가까운 것부터. 없으면 null */
export function activeUrgent(state: UrgentState, now: number, day: string): UrgentActive | null {
  if (state.day !== day) return null;
  let best: UrgentActive | null = null;
  for (const kind of URGENT_KINDS) {
    const at = state.issued[kind];
    if (at === undefined || state.done.includes(kind)) continue;
    const deadline = at + URGENT_ACCEPT_MS;
    if (now >= deadline) continue;
    if (!best || deadline < best.deadline) best = { kind, deadline };
  }
  return best;
}

/** 잡았다 — 마감은 보지 않는다(마감 직전에 들어간 싸움이 마감 뒤에 끝날 수 있다) */
export function completeUrgent(state: UrgentState, kind: UrgentKind, day: string): UrgentState {
  if (state.day !== day || state.issued[kind] === undefined || state.done.includes(kind)) return state;
  return { ...state, done: [...state.done, kind] };
}

export type UrgentSlot = "none" | "open" | "done" | "missed";

/** 벽보의 "오늘의 의뢰" 세 줄 */
export function urgentSlot(state: UrgentState, kind: UrgentKind, now: number, day: string): UrgentSlot {
  if (state.day !== day) return "none";
  const at = state.issued[kind];
  if (at === undefined) return "none";
  if (state.done.includes(kind)) return "done";
  return now < at + URGENT_ACCEPT_MS ? "open" : "missed";
}

export function urgentHp(stage: number): number {
  return Math.max(8, Math.floor(monsterHp(Math.max(1, stage - 1), true) * URGENT_HP_RATE));
}

/** 대결 시간 — 대장 제한 시간(특성 · 장비 · 유물로 늘어난 값)의 2/3. 기본 30초면 20초 */
export function urgentTimeSec(bossTimeSec: number): number {
  return Math.max(10, Math.round((bossTimeSec * 2) / 3));
}

/** 같은 지역의 다른 대장 얼굴을 고르는 층 번호 — 그림 · 이름을 고를 때만 쓴다 */
export function urgentFaceStage(stage: number): number {
  const area = huntingArea(stage);
  return area.stageFrom + ((Math.max(0, stage - area.stageFrom) + 1) % 3);
}

export function urgentFace(stage: number): MonsterArtDef {
  return huntBossVariant(huntingArea(stage), urgentFaceStage(stage));
}

export type UrgentReward = { gold: number; stones: number; coins: number };

/** 보상 — 골드는 영구 배수(펫 · 탈것 · 장비 · 사다리 · 결정)를 곱하기 전 값 */
export function urgentReward(stage: number): UrgentReward {
  const lap = MOBS_PER_STAGE * killGold(stage, false, false) + killGold(stage, true, false) + stageClearBonus(stage);
  return { gold: Math.max(1, Math.floor(URGENT_GOLD_LAPS * lap)), stones: 3 + Math.floor(stage / 10), coins: URGENT_EVENT_COINS };
}

export function formatUrgentLeft(ms: number): string {
  const sec = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}
