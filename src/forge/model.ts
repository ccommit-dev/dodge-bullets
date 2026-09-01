export type ForgeMode = "steady" | "rush";

export type SwordTier = {
  level: number;
  name: string;
  cost: number;
  sell: number;
  chance: number;
  shards: number;
  hue: number;
};

export type ForgeSave = {
  /**
   * 레거시 대장간 지갑. v5부터 대장간은 공유 골드(`CharacterProgress.sharedCoins`)를 쓴다.
   * 이 값은 1회 이관 후 0이 되며 `goldMigrated`로 재이관을 막는다.
   */
  gold: number;
  goldMigrated: boolean;
  level: number;
  tickets: number;
  shards: number;
  bestLevel: number;
  totalAttempts: number;
  mode: ForgeMode;
  pendingFailure: boolean;
  /** 무한 재련 시도 횟수 (등급은 공유 진행도에 저장) */
  reforgeAttempts: number;
  armorLevel: number;
  bestArmorLevel: number;
  armorAttempts: number;
};

export const FORGE_TIERS: SwordTier[] = [
  { level: 0, name: "낡은 단검", cost: 300, sell: 0, chance: 1, shards: 1, hue: 205 },
  { level: 1, name: "단단한 단검", cost: 600, sell: 500, chance: 0.95, shards: 1, hue: 195 },
  { level: 2, name: "청동 장검", cost: 1_200, sell: 1_400, chance: 0.88, shards: 2, hue: 180 },
  { level: 3, name: "강철 장검", cost: 2_400, sell: 3_400, chance: 0.78, shards: 3, hue: 165 },
  { level: 4, name: "푸른 기사검", cost: 5_000, sell: 8_000, chance: 0.67, shards: 5, hue: 200 },
  { level: 5, name: "화염의 검", cost: 11_000, sell: 19_000, chance: 0.56, shards: 8, hue: 18 },
  { level: 6, name: "번개의 검", cost: 24_000, sell: 45_000, chance: 0.46, shards: 12, hue: 52 },
  { level: 7, name: "서리 군주의 검", cost: 52_000, sell: 105_000, chance: 0.37, shards: 18, hue: 190 },
  { level: 8, name: "심연의 대검", cost: 115_000, sell: 250_000, chance: 0.29, shards: 26, hue: 268 },
  { level: 9, name: "별빛 마검", cost: 250_000, sell: 590_000, chance: 0.22, shards: 38, hue: 310 },
  { level: 10, name: "용살검", cost: 540_000, sell: 1_350_000, chance: 0.16, shards: 55, hue: 2 },
  { level: 11, name: "천공의 검", cost: 1_150_000, sell: 3_100_000, chance: 0.11, shards: 80, hue: 215 },
  { level: 12, name: "차원 절단검", cost: 2_400_000, sell: 7_200_000, chance: 0.075, shards: 120, hue: 285 },
  { level: 13, name: "신화의 종언", cost: 5_000_000, sell: 16_500_000, chance: 0.05, shards: 180, hue: 42 },
  { level: 14, name: "무한의 검", cost: 10_000_000, sell: 38_000_000, chance: 0.03, shards: 280, hue: 330 },
  { level: 15, name: "초월자의 검", cost: 0, sell: 100_000_000, chance: 0, shards: 500, hue: 155 },
];

/**
 * 신규 유저의 대장간 개업 자금. 공유 골드가 0이면 첫 강화(300G)조차 못 하므로
 * 최초 1회만 지급한다. 구 기본값 1,000,000은 공유 지갑에 그대로 넣으면 초반 인플레가 난다.
 */
export const FORGE_STARTER_COINS = 50_000;

export function defaultForgeSave(): ForgeSave {
  return {
    gold: 0,
    goldMigrated: false,
    level: 0,
    tickets: 2,
    shards: 0,
    bestLevel: 0,
    totalAttempts: 0,
    mode: "steady",
    pendingFailure: false,
    reforgeAttempts: 0,
    armorLevel: 0,
    bestArmorLevel: 0,
    armorAttempts: 0,
  };
}

export function normalizeForgeSave(value: Partial<ForgeSave> | null): ForgeSave {
  const base = defaultForgeSave();
  if (!value) return base;
  const integer = (candidate: unknown, fallback: number, max = Number.MAX_SAFE_INTEGER) =>
    typeof candidate === "number" && Number.isFinite(candidate)
      ? Math.max(0, Math.min(max, Math.floor(candidate)))
      : fallback;
  return {
    gold: integer(value.gold, base.gold),
    goldMigrated: value.goldMigrated === true,
    reforgeAttempts: integer(value.reforgeAttempts, 0),
    armorLevel: integer(value.armorLevel, 0, 15),
    bestArmorLevel: integer(value.bestArmorLevel, 0, 15),
    armorAttempts: integer(value.armorAttempts, 0),
    level: integer(value.level, base.level, FORGE_TIERS.length - 1),
    tickets: integer(value.tickets, base.tickets, 999),
    shards: integer(value.shards, base.shards),
    bestLevel: integer(value.bestLevel, base.bestLevel, FORGE_TIERS.length - 1),
    totalAttempts: integer(value.totalAttempts, base.totalAttempts),
    mode: value.mode === "rush" ? "rush" : "steady",
    pendingFailure: value.pendingFailure === true,
  };
}

export function tierAt(level: number): SwordTier {
  return FORGE_TIERS[Math.max(0, Math.min(FORGE_TIERS.length - 1, Math.floor(level)))];
}

export function effectiveChance(tier: SwordTier, mode: ForgeMode): number {
  return Math.max(0.01, Math.min(1, tier.chance * (mode === "rush" ? 0.72 : 1)));
}

export function effectiveSell(tier: SwordTier, mode: ForgeMode): number {
  return Math.floor(tier.sell * (mode === "rush" ? 1.75 : 1));
}

export function protectionCost(level: number): number {
  if (level < 5) return 1;
  if (level < 9) return 2;
  if (level < 12) return 3;
  return 5;
}

/** Shard cost to craft a sword at the given enhancement level. */
export function shardSwordCost(level: number): number {
  const tier = tierAt(level);
  return Math.max(40, tier.shards * 12);
}

/**
 * 무한 재련 — +15(초월자의 검) 도달 후 열리는 반복 루프.
 * 등급이 오를수록 비용은 지수로, 성공률은 완만하게 떨어져 파밍이 끝나지 않는다.
 */
export function reforgeCost(rank: number): number {
  return Math.floor(2_000_000 * Math.pow(1.26, Math.max(0, rank)));
}

export function reforgeChance(rank: number): number {
  return Math.max(0.08, 0.6 * Math.pow(0.965, Math.max(0, rank)));
}

/** 재련 실패 시 돌려받는 조각 — 완전 손실은 체감이 너무 나쁘다. */
export function reforgeConsolationShards(rank: number): number {
  return 20 + Math.floor(rank * 1.5);
}

export function formatGold(value: number): string {
  if (value >= 100_000_000) return `${(value / 100_000_000).toFixed(1)}억`;
  if (value >= 10_000) return `${Math.floor(value / 10_000).toLocaleString()}만`;
  return value.toLocaleString();
}
