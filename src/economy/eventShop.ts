/**
 * 이벤트 상점·특별 상점 실상품 (하단 시트 '이벤트'·'특별' 탭).
 *
 * 원칙 (LIVEOPS §3.1): 전부 확정 구매·보석 소비형. 확률 없음.
 * 기간 한정의 실체는 "주간 구매 한도" — 주가 바뀌면 한도가 리셋된다 (weeklyEventBuys).
 * 수량은 진행도 비례(killGold·최고 스테이지)라 후반에도 의미가 있다.
 */
import { killGold } from "../titans/model";
import type { CharacterProgress } from "../progression/model";

export type EventShopTab = "event-shop" | "event-shop2";

export type EventGrant = {
  gold?: number;
  materials?: number;
  cores?: number;
  shoulderShards?: number;
  /** 원하는 동료 조각 — 구매 시 선택한 동료에게 지급 */
  allyShards?: number;
  /** 대장간 방지권 — ForgeSave.tickets (사냥터에서 즉시 반영은 progress 경유 불가라 forgeTickets 필드에 적립) */
  forgeTickets?: number;
  gems?: number;
  /** 방치 가속 시간(h) */
  idleBoostHours?: number;
};

export type EventProduct = {
  id: string;
  tab: EventShopTab;
  name: string;
  desc: string;
  badge: string;
  icon: "dodge" | "beat" | "forge" | "hunt";
  gemCost: number;
  /** 주간 구매 한도 */
  weeklyLimit: number;
  /** 진행도 비례 수량 계산 */
  grant: (progress: CharacterProgress) => EventGrant;
  /** 지급 요약(카드 표시용) */
  summary: (progress: CharacterProgress) => string;
};

const bossGold = (p: CharacterProgress, mult: number) => Math.floor(killGold(Math.max(1, p.titanBestStage), true, false) * mult);
const fmt = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : n >= 1e4 ? `${(n / 1e3).toFixed(1)}K` : n.toLocaleString());

export const EVENT_PRODUCTS: EventProduct[] = [
  // ── 이벤트 상점: 원정 시즌 보급 ──
  {
    id: "ev-pioneer-pack", tab: "event-shop", name: "원정 개척 패키지", desc: "화살 원정 강화석 · 골드 · 원하는 동료 조각", badge: "HOT", icon: "dodge", gemCost: 150, weeklyLimit: 2,
    grant: (p) => ({ materials: 60, gold: bossGold(p, 1500), allyShards: 15 }),
    summary: (p) => `강화석 60 · 골드 ${fmt(bossGold(p, 1500))} · 동료 조각 15(선택)`,
  },
  {
    id: "ev-beat-support", tab: "event-shop", name: "비트 수련 지원팩", desc: "견갑 조각 · 스킬 코어 · 붉은 보석 환급", badge: "7 DAYS", icon: "beat", gemCost: 120, weeklyLimit: 2,
    grant: () => ({ shoulderShards: 40, cores: 4, gems: 20 }),
    summary: () => "견갑 조각 40 · 스킬 코어 4 · 보석 20 환급",
  },
  {
    id: "ev-boss-supply", tab: "event-shop", name: "보스 토벌 보급품", desc: "강화 방지권 · 강화석 · 골드", badge: "LIMITED", icon: "forge", gemCost: 90, weeklyLimit: 3,
    grant: (p) => ({ forgeTickets: 2, materials: 30, gold: bossGold(p, 600) }),
    summary: (p) => `방지권 2 · 강화석 30 · 골드 ${fmt(bossGold(p, 600))}`,
  },
  // ── 특별 상점: 성장 가속 ──
  {
    id: "sp-welcome-5", tab: "event-shop2", name: "5일 출석 패키지", desc: "구매 즉시 보석 60 + 방치 가속 24h", badge: "WELCOME", icon: "hunt", gemCost: 40, weeklyLimit: 1,
    grant: () => ({ gems: 60, idleBoostHours: 24 }),
    summary: () => "보석 60 환급 · 방치 가속 24h (주 1회)",
  },
  {
    id: "sp-shadow-rush", tab: "event-shop2", name: "그림자 원정대 러시", desc: "원하는 동료 조각 30 · 스킬 코어", badge: "PICK UP", icon: "hunt", gemCost: 200, weeklyLimit: 2,
    grant: () => ({ allyShards: 30, cores: 3 }),
    summary: () => "동료 조각 30(선택) · 스킬 코어 3",
  },
  {
    id: "sp-abyss-gear", tab: "event-shop2", name: "심연 장비 완성팩", desc: "무기·견갑 강화 재료를 한 번에", badge: "SPECIAL", icon: "forge", gemCost: 180, weeklyLimit: 1,
    grant: (p) => ({ materials: 120, shoulderShards: 60, forgeTickets: 3, gold: bossGold(p, 2000) }),
    summary: (p) => `강화석 120 · 견갑 조각 60 · 방지권 3 · 골드 ${fmt(bossGold(p, 2000))}`,
  },
];

export function eventProductsFor(tab: EventShopTab): EventProduct[] {
  return EVENT_PRODUCTS.filter((p) => p.tab === tab);
}

/** 이번 주 구매 횟수 — 주가 바뀌면 0 */
export function eventBuysThisWeek(progress: CharacterProgress, productId: string, week: string): number {
  return progress.weeklyEventBuys.week === week ? progress.weeklyEventBuys.bought[productId] ?? 0 : 0;
}
