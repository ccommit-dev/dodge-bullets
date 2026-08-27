/**
 * 동료 등급·성급 시스템 (LIVEOPS_DESIGN §2).
 *
 * 하나의 시스템이 세 역할을 한다:
 * - 밸런스: 후반 DPS 곡선 (★5 = ×7) — DPS 벽을 뚫는 무·과금 공용 성장선
 * - 집중도: 조각이 방치·균열·주간 시험·성벽 4곳에서 나와 전 콘텐츠에 수집 동기
 * - 결제: 동료 "획득"은 과금 가능하지만 "성급"은 조각 파밍으로만 — 확정 구매 원칙
 */
import type { TitanHeroId } from "./model";

export type AllyRarity = "R" | "SR" | "SSR";

export const ALLY_RARITY: Record<TitanHeroId, AllyRarity> = {
  mia: "R",
  leon: "R",
  sera: "SR",
  garen: "SR",
  ari: "SSR",
  nox: "SSR",
  luna: "SSR",
  volt: "SR",
};

export const RARITY_LABEL: Record<AllyRarity, string> = { R: "희귀", SR: "영웅", SSR: "전설" };
export const RARITY_COLOR: Record<AllyRarity, string> = { R: "#7dd3fc", SR: "#c4b5fd", SSR: "#fcd34d" };

/** 등급별 성급 상한 — R ★3 / SR ★4 / SSR ★5 */
export const STAR_CAP: Record<AllyRarity, number> = { R: 3, SR: 4, SSR: 5 };

/** 성급 DPS 배율 (index = 성급). ★0은 미보유. */
export const STAR_MULT = [0, 1, 1.6, 2.6, 4.2, 7] as const;

/** ★n → ★n+1 승급에 필요한 조각 (index = 현재 성급) */
export const STAR_SHARD_COST = [0, 20, 50, 120, 300] as const;

/** 상점 전용 동료 — 스테이지가 아니라 보석으로 해금된다 */
export const SHOP_ALLY_GEM_COST: Partial<Record<TitanHeroId, number>> = {
  luna: 900,
  volt: 450,
};

/**
 * 유효 성급 — 보유(레벨≥1)한 동료는 최소 ★1.
 * 기존 유저 소급: 별도 마이그레이션 없이 이 함수가 ★1을 보장한다.
 */
export function effectiveStars(stars: number | undefined, ownedLevel: number): number {
  if (ownedLevel <= 0) return 0;
  return Math.max(1, Math.floor(stars ?? 0));
}

export function starMultiplier(stars: number): number {
  return STAR_MULT[Math.max(0, Math.min(STAR_MULT.length - 1, Math.floor(stars)))];
}

export function shardCostToNext(id: TitanHeroId, stars: number): number | null {
  const cap = STAR_CAP[ALLY_RARITY[id]];
  if (stars >= cap) return null;
  return STAR_SHARD_COST[stars] ?? null;
}

export function emptyAllyRecord(): Record<TitanHeroId, number> {
  return { mia: 0, leon: 0, sera: 0, garen: 0, ari: 0, nox: 0, luna: 0, volt: 0 };
}

export const ALLY_IDS: TitanHeroId[] = ["mia", "leon", "sera", "garen", "ari", "nox", "luna", "volt"];

/** 보유 동료 중 무작위 1명 — 조각 드랍 대상 선정용 (미보유뿐이면 mia). */
export function randomOwnedAlly(
  heroes: Record<TitanHeroId, number>,
  rng: () => number = Math.random,
): TitanHeroId {
  const owned = ALLY_IDS.filter((id) => heroes[id] > 0);
  if (owned.length === 0) return "mia";
  return owned[Math.floor(rng() * owned.length)];
}
