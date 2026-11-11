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
  { id: "kick", label: "킥 강타", desc: "킥 피해 +40% · 점수 +10% · 클리어 골드 +15%", icon: "kick" },
  { id: "ensemble", label: "합주", desc: "스네어·햇 피해 +40% · 판정 창 +18ms · 점수 +12%", icon: "allies" },
  { id: "dropBurst", label: "드롭 폭발", desc: "스킬 피해 +50% · 피버 충전 +35% · 골드 +15%", icon: "drop" },
  { id: "feverLong", label: "긴 피버", desc: "피버 지속 +2초 · 피버 중 점수 +15%", icon: "fever" },
  { id: "healPlus", label: "숨 고르기", desc: "최대 HP +2", icon: "heal" },
  { id: "comboResonance", label: "콤보 공명", desc: "콤보 피해 ×1.5 · 첫 MISS 한 번은 콤보 · HP 유지 · 점수 +15%", icon: "combo" },
  { id: "weakTracker", label: "약점 추적", desc: "약점 피해 ×3.5 · 약점 적중 +60점 · 골드 +15% (장 대장 곡)", icon: "weak" },
];

export const BEAT_PERK_BY_ID: Record<BeatPerkId, BeatPerkDef> = Object.fromEntries(BEAT_PERKS.map((p) => [p.id, p])) as Record<BeatPerkId, BeatPerkDef>;

export type BeatMods = {
  laneMul: [number, number, number, number];
  feverExtraMs: number;
  healBonus: number;
  comboMul: number;
  weakMul: number;
  scoreMul: number;
  feverScoreMul: number;
  coinMul: number;
  comboShield: number;
  judgeWindowBonusSec: number;
  dropChargeMul: number;
  extraHp: number;
  weakScoreBonus: number;
};

export const WEAK_LANE_MUL = 2.5;

export function emptyBeatMods(): BeatMods {
  return {
    laneMul: [1, 1, 1, 1],
    feverExtraMs: 0,
    healBonus: 0,
    comboMul: 1,
    weakMul: WEAK_LANE_MUL,
    scoreMul: 1,
    feverScoreMul: 1,
    coinMul: 1,
    comboShield: 0,
    judgeWindowBonusSec: 0,
    dropChargeMul: 1,
    extraHp: 0,
    weakScoreBonus: 0,
  };
}

export function beatModsOf(id: BeatPerkId | null | undefined): BeatMods {
  const m = emptyBeatMods();
  switch (id) {
    case "kick": m.laneMul[0] = 1.4; m.scoreMul = 1.1; m.coinMul = 1.15; break;
    case "ensemble": m.laneMul[1] = 1.4; m.laneMul[2] = 1.4; m.judgeWindowBonusSec = 0.018; m.scoreMul = 1.12; break;
    case "dropBurst": m.laneMul[3] = 1.5; m.dropChargeMul = 1.35; m.coinMul = 1.15; break;
    case "feverLong": m.feverExtraMs = 2000; m.feverScoreMul = 1.15; break;
    case "healPlus": m.extraHp = 2; break;
    case "comboResonance": m.comboMul = 1.5; m.comboShield = 1; m.scoreMul = 1.15; break;
    case "weakTracker": m.weakMul = 3.5; m.weakScoreBonus = 60; m.coinMul = 1.15; break;
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

/** 곡·날짜별 3장 — 서로 다른 카드. 약점 추적은 약점 레인이 열리는 장 대장 곡(beatBossStage)에만 */
export function beatPerkOffer(trackId: string, dayKey: string, bossTrack = true): BeatPerkId[] {
  const ids = BEAT_PERKS.map((p) => p.id).filter((id) => bossTrack || id !== "weakTracker");
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
