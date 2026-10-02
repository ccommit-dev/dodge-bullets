import type { CharacterProgress } from "../progression/model";

/**
 * 끝없는 성벽 등반권 (2026-10-02, 사용자: "끝없는 성벽 등반은 조금 더 어렵게 하되 티켓 제한을 두고 상점에서 구매할 수 있게").
 *
 * 한 번 오르기(죽을 때까지 층을 잇는 한 판)에 1장. 매일 첫 접속에 무료분(3장)까지 채운다 — 넘치게 가진 것은 그대로 둔다.
 * 더 얻는 길: 원정 보급창(인장) · 사냥터 특별 상점(보석) · 30일 출석.
 */
export const TOWER_DAILY_TICKETS = 3;
/** 보유 상한 — 무한히 쟁여 두면 "오늘 몇 번 오를까"라는 선택이 사라진다 */
export const TOWER_TICKET_MAX = 30;
/** 원정 보급창에서 인장으로 살 때 — 보급 한 개(6~12)와 비슷한 값 */
export const TOWER_TICKET_SEALS = 8;

const today = (now = Date.now()) => new Date(now).toLocaleDateString("sv-SE");

/** 날짜가 바뀌었으면 무료분까지 채운다 (이미 그 이상이면 그대로) */
export function refillTowerTickets(p: CharacterProgress, now = Date.now()): CharacterProgress {
  const d = today(now);
  if (p.towerTicketDate === d) return p;
  return { ...p, towerTickets: Math.max(p.towerTickets, TOWER_DAILY_TICKETS), towerTicketDate: d };
}

/** 등반 시작 — 1장 쓴다. 없으면 null */
export function consumeTowerTicket(p: CharacterProgress): CharacterProgress | null {
  if (p.towerTickets <= 0) return null;
  return { ...p, towerTickets: p.towerTickets - 1 };
}

/** 인장으로 1장 산다. 인장이 모자라거나 가득 차면 null */
export function buyTowerTicketWithSeals(p: CharacterProgress): CharacterProgress | null {
  if (p.expeditionSeals < TOWER_TICKET_SEALS || p.towerTickets >= TOWER_TICKET_MAX) return null;
  return { ...p, expeditionSeals: p.expeditionSeals - TOWER_TICKET_SEALS, towerTickets: p.towerTickets + 1 };
}
