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
  mia_dark: "SR",
  sera_light: "SSR",
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
  // 얼터너티브 동료 (§9) — 원본과 다른 역할·등급의 재해석 버전
  mia_dark: 600,
  sera_light: 1100,
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
  return { mia: 0, leon: 0, sera: 0, garen: 0, ari: 0, nox: 0, luna: 0, volt: 0, mia_dark: 0, sera_light: 0 };
}

export const ALLY_IDS: TitanHeroId[] = ["mia", "leon", "sera", "garen", "ari", "nox", "luna", "volt", "mia_dark", "sera_light"];

/* ───────────────────────── 원정대 편성 + 시너지 (CRUMBLE_GAP §2) ───────────────────────── */

export type AllyRole = "melee" | "ranged" | "flame";

export const ALLY_ROLE: Record<TitanHeroId, AllyRole> = {
  mia: "melee",
  leon: "ranged",
  sera: "ranged",
  garen: "melee",
  ari: "flame",
  nox: "melee",
  luna: "melee",
  volt: "ranged",
  mia_dark: "melee",
  sera_light: "ranged",
};

export const ROLE_LABEL: Record<AllyRole, string> = { melee: "근접", ranged: "원거리", flame: "화염" };

/** 편성 슬롯 수 — 기본 4, 성벽 50/100층에서 +1씩. partyCap은 소급 완화 하한(기존 유저). */
export function partySlotCount(towerBestFloor: number, partyCap: number): number {
  const fromTower = 4 + (towerBestFloor >= 50 ? 1 : 0) + (towerBestFloor >= 100 ? 1 : 0);
  return Math.min(6, Math.max(fromTower, partyCap));
}

export type Synergy = {
  id: string;
  name: string;
  desc: string;
  active: boolean;
};

export type SynergyEffects = {
  /** 보스 제한시간 가산(초) */
  bossTimeBonus: number;
  /** 전체 DPS 배율 */
  dpsMult: number;
  /** 조각 드랍 배율 */
  shardMult: number;
  /** 방치 효율 가산(%p → 0.01 단위) */
  idleRateBonus: number;
};

/** 편성 조합에서 발동하는 시너지 — 편성 화면과 전투가 같은 함수를 쓴다. */
export function partySynergies(party: TitanHeroId[]): { list: Synergy[]; effects: SynergyEffects } {
  const roles = party.map((id) => ALLY_ROLE[id]);
  const melee = roles.filter((r) => r === "melee").length;
  const ranged = roles.filter((r) => r === "ranged").length;
  const ssr = party.filter((id) => ALLY_RARITY[id] === "SSR").length;
  const distinctRoles = new Set(roles).size;
  const list: Synergy[] = [
    { id: "phalanx", name: "방진", desc: "근접 3+ · 보스 시간 +4초", active: melee >= 3 },
    { id: "volley", name: "엄호 사격", desc: "원거리 2+ · DPS +8%", active: ranged >= 2 },
    { id: "legend", name: "전설의 공명", desc: "SSR 2+ · 조각 드랍 2배", active: ssr >= 2 },
    { id: "balance", name: "균형 편성", desc: "3역할 혼성 · 방치 효율 +1%p", active: distinctRoles >= 3 },
  ];
  return {
    list,
    effects: {
      bossTimeBonus: melee >= 3 ? 4 : 0,
      dpsMult: ranged >= 2 ? 1.08 : 1,
      shardMult: ssr >= 2 ? 2 : 1,
      idleRateBonus: distinctRoles >= 3 ? 0.01 : 0,
    },
  };
}

/* ───────────────────────── 파견 (CRUMBLE_GAP §3 · 길드 대체) ───────────────────────── */

export type Expedition = { allyId: TitanHeroId; endsAt: number; hours: 4 | 8 | 12 };

export const EXPEDITION_MAX = 2;
export const EXPEDITION_HOURS = [4, 8, 12] as const;

/** 파견 보상 — 등급·성급 비례 (벤치 동료의 성급 투자 가치). 보석은 SSR 12h에만 소량. */
export function expeditionReward(
  allyId: TitanHeroId,
  stars: number,
  hours: number,
): { shards: number; materials: number; gems: number } {
  const rarityMult = { R: 1, SR: 1.5, SSR: 2 }[ALLY_RARITY[allyId]];
  const starMult = 1 + Math.max(0, stars - 1) * 0.25;
  return {
    shards: Math.max(1, Math.round((hours / 4) * rarityMult * starMult)),
    materials: Math.max(1, Math.round((hours / 2) * starMult)),
    gems: ALLY_RARITY[allyId] === "SSR" && hours >= 12 ? 5 : 0,
  };
}

/** 보유 동료 중 무작위 1명 — 조각 드랍 대상 선정용 (미보유뿐이면 mia). */
export function randomOwnedAlly(
  heroes: Record<TitanHeroId, number>,
  rng: () => number = Math.random,
): TitanHeroId {
  const owned = ALLY_IDS.filter((id) => heroes[id] > 0);
  if (owned.length === 0) return "mia";
  return owned[Math.floor(rng() * owned.length)];
}
