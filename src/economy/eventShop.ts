/**
 * 이벤트 상점·특별 상점 실상품 (하단 시트 '이벤트'·'특별' 탭).
 *
 * 원칙 (LIVEOPS §3.1): 전부 확정 구매·보석 소비형. 확률 없음.
 * 기간 한정의 실체는 "주간 구매 한도" — 주가 바뀌면 한도가 리셋된다 (weeklyEventBuys).
 * 수량은 진행도 비례(killGold·최고 스테이지)라 후반에도 의미가 있다.
 */
import { HEROES, killGold, type TitanHeroId } from "../titans/model";
import { ALLY_RARITY, SHOP_ALLY_GEM_COST } from "../titans/allies";
import type { CharacterProgress } from "../progression/model";

export type EventShopTab = "event-shop" | "event-shop2";

export type EventGrant = {
  gold?: number;
  materials?: number;
  cores?: number;
  shoulderShards?: number;
  /** 동료 조각 — 2026-10-28 부터 가진 동료 모두에게 이만큼씩(예전: 고른 동료 하나에게 몰아서). 수량은 예전 합계를 동료 약 5명에 나눈 값 */
  allyShards?: number;
  /** 신화 · 초월 동료 조각 — 가진 신화 · 초월 동료 모두에게 이만큼씩 (2026-10-28) */
  topTierShards?: number;
  /** 특가 동료 — 없으면 합류(Lv.1), 있으면 그 동료 조각 dupeShards 만큼 (2026-10-28) */
  allyUnlock?: TitanHeroId;
  /** 대장간 방지권 — ForgeSave.tickets (사냥터에서 즉시 반영은 progress 경유 불가라 forgeTickets 필드에 적립) */
  forgeTickets?: number;
  gems?: number;
  /** 원정 인장 — 성문 방어 칩·스킬 무기를 올린다 (2026-10-08, 루프 ⑤ 메타 상품) */
  seals?: number;
  /** 방치 가속 시간(h) */
  idleBoostHours?: number;
  /** 끝없는 성벽 등반권 (game/towerTickets) */
  towerTickets?: number;
};

export type EventProduct = {
  id: string;
  tab: EventShopTab;
  name: string;
  desc: string;
  badge: string;
  icon: "dodge" | "beat" | "forge" | "hunt";
  gemCost: number;
  /** 이벤트 코인 가격 — 있으면 보석 대신 코인으로 산다 (2026-10-22 아처 키우기 8번) */
  coinCost?: number;
  /** 주간 구매 한도 */
  weeklyLimit: number;
  /** 진행도 비례 수량 계산 */
  grant: (progress: CharacterProgress) => EventGrant;
  /** 지급 요약(카드 표시용) */
  summary: (progress: CharacterProgress) => string;
};

/** 이번 주 특가 동료 — 그 등급(상점 전용 제외)에서 주마다 한 명씩 돈다 (2026-10-28) */
export function featuredAlly(tier: "UR" | "LR", now: number = Date.now()): TitanHeroId | null {
  const list = HEROES.filter((h) => ALLY_RARITY[h.id] === tier && SHOP_ALLY_GEM_COST[h.id] === undefined && h.unlockStage < 9999).map((h) => h.id);
  if (!list.length) return null;
  const week = Math.floor((now - Date.UTC(2026, 0, 5)) / (7 * 86400000));
  return list[((week % list.length) + list.length) % list.length];
}
const allyName = (id: TitanHeroId | null) => HEROES.find((h) => h.id === id)?.name ?? "";

const bossGold = (p: CharacterProgress, mult: number) => Math.floor(killGold(Math.max(1, p.titanBestStage), true, false) * mult);
const fmt = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : n >= 1e4 ? `${(n / 1e3).toFixed(1)}K` : n.toLocaleString());

export const EVENT_PRODUCTS: EventProduct[] = [
  // ── 이벤트 상점: 원정 시즌 보급 ──
  {
    id: "ev-pioneer-pack", tab: "event-shop", name: "원정 개척 패키지", desc: "성문 방어 강화석 · 골드 · 가진 동료 모두 조각", badge: "HOT", icon: "dodge", gemCost: 150, weeklyLimit: 2,
    grant: (p) => ({ materials: 60, gold: bossGold(p, 1500), allyShards: 3 }),
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
  // ── 루프 ⑤ 메타 상품 (2026-10-08, docs/LOOP_2026-10-08.md): 빌드를 바꾸는 유일한 보석 상품 — 재화 탭에도 같이 보인다 ──
  {
    id: "gem-seal-pack", tab: "event-shop", name: "원정 인장 묶음", desc: "성문 방어 칩·스킬 무기를 올리는 인장", badge: "META", icon: "dodge", gemCost: 90, weeklyLimit: 3,
    grant: () => ({ seals: 20 }),
    summary: () => "원정 인장 20 (주 3회)",
  },
  // ── 코인 교환 (2026-10-22 아처 키우기 8번) — 사냥 중 몬스터가 떨어뜨린 이벤트 코인으로 산다 ──
  {
    id: "coin-stone", tab: "event-shop", name: "코인 교환 · 강화석", desc: "이벤트 코인으로 강화석", badge: "COIN", icon: "forge", gemCost: 0, coinCost: 20, weeklyLimit: 5,
    grant: () => ({ materials: 25 }),
    summary: () => "강화석 25",
  },
  {
    id: "coin-shards", tab: "event-shop", name: "코인 교환 · 동료 조각", desc: "가진 동료 모두 조각", badge: "COIN", icon: "hunt", gemCost: 0, coinCost: 40, weeklyLimit: 3,
    grant: () => ({ allyShards: 2 }),
    summary: () => "동료 조각 10(선택)",
  },
  {
    id: "coin-gems", tab: "event-shop", name: "코인 교환 · 보석", desc: "붉은 보석", badge: "COIN", icon: "beat", gemCost: 0, coinCost: 60, weeklyLimit: 2,
    grant: () => ({ gems: 40 }),
    summary: () => "보석 40",
  },
  // ── 특별 상점: 성장 가속 ──
  {
    id: "sp-welcome-5", tab: "event-shop2", name: "5일 출석 패키지", desc: "구매 즉시 보석 60 + 방치 가속 24h", badge: "WELCOME", icon: "hunt", gemCost: 40, weeklyLimit: 1,
    grant: () => ({ gems: 60, idleBoostHours: 24 }),
    summary: () => "보석 60 환급 · 방치 가속 24h (주 1회)",
  },
  {
    id: "sp-shadow-rush", tab: "event-shop2", name: "그림자 원정대 러시", desc: "가진 동료 모두 조각 6 · 스킬 코어", badge: "PICK UP", icon: "hunt", gemCost: 200, weeklyLimit: 2,
    grant: () => ({ allyShards: 6, cores: 3 }),
    summary: () => "동료 조각 30(선택) · 스킬 코어 3",
  },
  {
    id: "sp-abyss-gear", tab: "event-shop2", name: "심연 장비 완성팩", desc: "무기·견갑 강화 재료를 한 번에", badge: "SPECIAL", icon: "forge", gemCost: 180, weeklyLimit: 1,
    grant: (p) => ({ materials: 120, shoulderShards: 60, forgeTickets: 3, gold: bossGold(p, 2000) }),
    summary: (p) => `강화석 120 · 견갑 조각 60 · 방지권 3 · 골드 ${fmt(bossGold(p, 2000))}`,
  },
  // ── 끝없는 성벽 등반권 (2026-10-02) — 하루 무료 3장 위로 더 오르고 싶을 때. 인장으로도 산다(원정 보급창) ──
  {
    id: "ev-tower-ticket", tab: "event-shop2", name: "성벽 등반권", desc: "끝없는 성벽을 한 번 더 오른다", badge: "TOWER", icon: "dodge", gemCost: 30, weeklyLimit: 10,
    grant: () => ({ towerTickets: 1 }),
    summary: () => "성벽 등반권 1장",
  },
  {
    id: "ev-tower-ticket-5", tab: "event-shop2", name: "등반권 묶음", desc: "등반권 5장 — 1장씩보다 20% 싸다", badge: "BUNDLE", icon: "dodge", gemCost: 120, weeklyLimit: 2,
    grant: () => ({ towerTickets: 5 }),
    summary: () => "성벽 등반권 5장",
  },
];

// ── 특별: 신화 · 초월 (2026-10-28) — 특가 동료(주마다 교대) · 높은 등급 성장 상자. 전부 붉은 보석(실결제 상품 아님) ──
EVENT_PRODUCTS.push(
  {
    id: "sp-ur-ally", tab: "event-shop2", name: "신화 동료 특가", desc: "이번 주 신화 동료 — 없으면 합류 · 있으면 조각 60", badge: "신화 -40%", icon: "hunt", gemCost: 2400, weeklyLimit: 1,
    grant: () => ({ allyUnlock: featuredAlly("UR") ?? undefined }),
    summary: () => `${allyName(featuredAlly("UR"))} (신화) · 뽑기 기대 비용의 약 60%`,
  },
  {
    id: "sp-lr-ally", tab: "event-shop2", name: "초월 동료 특가", desc: "이번 주 초월 동료 — 없으면 합류 · 있으면 조각 80", badge: "초월 -40%", icon: "hunt", gemCost: 6000, weeklyLimit: 1,
    grant: () => ({ allyUnlock: featuredAlly("LR") ?? undefined }),
    summary: () => `${allyName(featuredAlly("LR"))} (초월) · 초월 천장 200회의 약 1/3 값`,
  },
  {
    id: "sp-top-tier-box", tab: "event-shop2", name: "신화 · 초월 성장 상자", desc: "가진 신화 · 초월 동료 모두 조각 15 · 스킬 코어 5", badge: "HIGH TIER", icon: "forge", gemCost: 500, weeklyLimit: 2,
    grant: () => ({ topTierShards: 15, cores: 5 }),
    summary: () => "신화 · 초월 동료 모두 조각 15 · 코어 5",
  },
);

export function eventProductsFor(tab: EventShopTab): EventProduct[] {
  return EVENT_PRODUCTS.filter((p) => p.tab === tab);
}

/** 이번 주 구매 횟수 — 주가 바뀌면 0 */
export function eventBuysThisWeek(progress: CharacterProgress, productId: string, week: string): number {
  return progress.weeklyEventBuys.week === week ? progress.weeklyEventBuys.bought[productId] ?? 0 : 0;
}
