/**
 * 비트 수련 "출격 강화"와 보스 약점 레인 (2026-10-08, Galactic Outlaw 루프 ①②④).
 *
 * 곡마다 3장 중 1장을 고르고 출발한다 — 리듬 게임은 중간에 멈출 수 없으니 결정은 곡 사이에 둔다.
 * 장 대장(홀수 스테이지)은 8초마다 4초 동안 약점 레인을 바꿔 보인다 — 그 레인의 노트가 ×2.5.
 * 둘 다 순수 함수라 노드 검사(verify-systems)가 그대로 센다.
 */
import type { NoteLane } from "./types";

export type BeatPerkId = "kick" | "ensemble" | "dropBurst" | "feverLong" | "healPlus" | "comboResonance" | "weakTracker";

export type BeatPerkDef = { id: BeatPerkId; label: string; desc: string; icon: "kick" | "allies" | "drop" | "fever" | "heal" | "combo" | "weak" };

export const BEAT_PERKS: BeatPerkDef[] = [
  { id: "kick", label: "킥 강타", desc: "킥 레인 피해 +40%", icon: "kick" },
  { id: "ensemble", label: "합주", desc: "햇·스네어 레인 피해 +40%", icon: "allies" },
  { id: "dropBurst", label: "드롭 폭발", desc: "드롭 레인 피해 +50%", icon: "drop" },
  { id: "feverLong", label: "긴 FEVER", desc: "FEVER 지속 +2초", icon: "fever" },
  { id: "healPlus", label: "숨 고르기", desc: "시작 회복 게이지 +3 (8이면 HP 회복)", icon: "heal" },
  { id: "comboResonance", label: "콤보 공명", desc: "콤보 피해 보정 ×1.5", icon: "combo" },
  { id: "weakTracker", label: "약점 추적", desc: "약점 레인 피해 ×2.5 → ×3.5", icon: "weak" },
];

export const BEAT_PERK_BY_ID: Record<BeatPerkId, BeatPerkDef> = Object.fromEntries(BEAT_PERKS.map((p) => [p.id, p])) as Record<BeatPerkId, BeatPerkDef>;

export type BeatMods = {
  laneMul: [number, number, number, number];
  feverExtraMs: number;
  healBonus: number;
  comboMul: number;
  weakMul: number;
};

export const WEAK_LANE_MUL = 2.5;

export function emptyBeatMods(): BeatMods {
  return { laneMul: [1, 1, 1, 1], feverExtraMs: 0, healBonus: 0, comboMul: 1, weakMul: WEAK_LANE_MUL };
}

export function beatModsOf(id: BeatPerkId | null | undefined): BeatMods {
  const m = emptyBeatMods();
  switch (id) {
    case "kick": m.laneMul[0] = 1.4; break;
    case "ensemble": m.laneMul[1] = 1.4; m.laneMul[2] = 1.4; break;
    case "dropBurst": m.laneMul[3] = 1.5; break;
    case "feverLong": m.feverExtraMs = 2000; break;
    case "healPlus": m.healBonus = 3; break;
    case "comboResonance": m.comboMul = 1.5; break;
    case "weakTracker": m.weakMul = 3.5; break;
    default: break;
  }
  return m;
}

/** 결정적 해시 — 같은 곡·같은 날이면 같은 3장 (재접속해도 카드가 안 바뀐다) */
function hash32(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}

/** 곡·날짜별 3장 — 서로 다른 카드 */
export function beatPerkOffer(trackId: string, dayKey: string): BeatPerkId[] {
  const ids = BEAT_PERKS.map((p) => p.id);
  let h = hash32(`${trackId}:${dayKey}`);
  const out: BeatPerkId[] = [];
  while (out.length < 3 && ids.length > 0) {
    h = (Math.imul(h, 1103515245) + 12345) >>> 0;
    const idx = h % ids.length;
    out.push(ids.splice(idx, 1)[0]);
  }
  return out;
}

export const WEAK_LANE_PERIOD_MS = 8000;
export const WEAK_LANE_OPEN_MS = 4000;

/** 장 대장인가 — BeatGame 의 isChapterBoss 규칙(홀수 스테이지)과 같다 */
export function beatBossStage(stageIndex: number): boolean { return stageIndex % 2 === 1; }

/**
 * 지금 열린 약점 레인 — 8초 주기의 앞 4초만 열리고, 창마다 레인이 바뀐다(곡 id 로 결정적).
 * 장 대장이 아니면 null.
 */
export function weakLaneAt(elapsedMs: number, stageIndex: number, trackId: string): NoteLane | null {
  if (!beatBossStage(stageIndex) || elapsedMs < WEAK_LANE_PERIOD_MS) return null;
  const phase = elapsedMs % WEAK_LANE_PERIOD_MS;
  if (phase >= WEAK_LANE_OPEN_MS) return null;
  const window = Math.floor(elapsedMs / WEAK_LANE_PERIOD_MS);
  return ((hash32(`${trackId}:${window}`) % 4) as NoteLane);
}

/** 약점 창이 닫히기까지(ms) — HUD 링 */
export function weakLaneLeftMs(elapsedMs: number): number {
  const phase = elapsedMs % WEAK_LANE_PERIOD_MS;
  return Math.max(0, WEAK_LANE_OPEN_MS - phase);
}
