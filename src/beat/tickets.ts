/**
 * 비트 디펜스 시도권 · 난도별 첫 클리어 보상 (2026-10-28, 사용자: "비트디펜스 시작 ui에 곡종류가 모두 나오고 난도별 클리어시 아이템 얻을 수 있고
 * 일별 티켓 시도권 ui 추가 · 상점에서도 해당 티켓을 유료로 구매하게 상품 추가").
 *
 * 시도권: 매일 무료 BEAT_DAILY_TICKETS 장(날이 바뀌면 다시 채운다) + 상점에서 산 장(날이 바뀌어도 남는다). 한 판 시작에 1장 —
 *   무료분을 먼저 쓴다. 같은 곡 즉시 재도전(하루 1회 · 곡마다)은 시도권 없이.
 *   상점 '특별' 탭에서 붉은 보석으로 산다(실결제 상품 아님 — economy/eventShop beatTickets).
 * 난도별 첫 클리어: 곡 × 난도(EASY · NORMAL · HARD)마다 처음 한 번 — 높은 난도일수록 좋은 아이템. claimedRewards 에 "beat-first:<곡>:<난도>"
 */
import type { CharacterProgress } from "../progression/model";
import type { BeatDifficulty } from "./types";

export const BEAT_DAILY_TICKETS = 5;
/** 산 시도권 보유 상한 — 넘치게 사면 보석만 사라지지 않게 상점이 막는다 */
export const BEAT_TICKET_MAX_BOUGHT = 50;

function today(now = new Date()): string {
  return now.toLocaleDateString("sv-SE");
}

/** 오늘 남은 시도권 — 무료(오늘 몫) · 산 것 */
export function beatTicketsLeft(p: CharacterProgress, now = new Date()): { free: number; bought: number; total: number } {
  const used = p.beatTicketDay === today(now) ? p.beatTicketsUsed : 0;
  const free = Math.max(0, BEAT_DAILY_TICKETS - used);
  return { free, bought: p.beatTicketsBought, total: free + p.beatTicketsBought };
}

/** 한 판에 1장 — 무료분 먼저. 없으면 null */
export function spendBeatTicket(p: CharacterProgress, now = new Date()): CharacterProgress | null {
  const d = today(now);
  const used = p.beatTicketDay === d ? p.beatTicketsUsed : 0;
  if (used < BEAT_DAILY_TICKETS) return { ...p, beatTicketDay: d, beatTicketsUsed: used + 1 };
  if (p.beatTicketsBought > 0) return { ...p, beatTicketDay: d, beatTicketsUsed: used, beatTicketsBought: p.beatTicketsBought - 1 };
  return null;
}

export type BeatClearReward = { gems?: number; materials?: number; shoulderShards?: number };
/** 난도별 첫 클리어 보상 — EASY 강화석 · NORMAL 보석 + 견갑 조각 · HARD 보석 많이 + 견갑 조각 + 강화석 */
export const BEAT_FIRST_CLEAR: Record<BeatDifficulty, BeatClearReward> = {
  easy: { materials: 20 },
  medium: { gems: 30, shoulderShards: 3 },
  hard: { gems: 80, shoulderShards: 8, materials: 40 },
};
export const BEAT_DIFF_LABEL: Record<BeatDifficulty, string> = { easy: "EASY", medium: "NORMAL", hard: "HARD" };

export function beatRewardText(r: BeatClearReward): string {
  return [r.gems ? `보석 ${r.gems}` : "", r.shoulderShards ? `견갑 조각 ${r.shoulderShards}` : "", r.materials ? `강화석 ${r.materials}` : ""].filter(Boolean).join(" · ");
}

const firstKey = (trackId: string, diff: BeatDifficulty) => `beat-first:${trackId}:${diff}`;
export function beatFirstClaimed(p: CharacterProgress, trackId: string, diff: BeatDifficulty): boolean {
  return p.claimedRewards.includes(firstKey(trackId, diff));
}

/** 첫 클리어 보상 지급 — 이미 받았으면 그대로(reward null) */
export function claimBeatFirstClear(p: CharacterProgress, trackId: string, diff: BeatDifficulty): { next: CharacterProgress; reward: BeatClearReward | null } {
  if (beatFirstClaimed(p, trackId, diff)) return { next: p, reward: null };
  const r = BEAT_FIRST_CLEAR[diff];
  return {
    reward: r,
    next: {
      ...p,
      claimedRewards: [...p.claimedRewards, firstKey(trackId, diff)],
      redGems: p.redGems + (r.gems ?? 0),
      enhancementMaterials: p.enhancementMaterials + (r.materials ?? 0),
      shoulderShards: p.shoulderShards + (r.shoulderShards ?? 0),
    },
  };
}
