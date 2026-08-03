import { emptyShopLevels } from "./shop";
import { storageGet, storageSet } from "./toss";
import type { ShopLevels, ShopUpgradeId } from "./types";

const LEGACY_HIGH_SCORE_KEY = "dodge-bullets:highScore";

function highScoreKey(userHash: string): string {
  return `dodgebullets:highScore:${userHash}`;
}

function coinsKey(userHash: string): string {
  return `dodgebullets:coins:${userHash}`;
}

function shopKey(userHash: string): string {
  return `dodgebullets:shop:${userHash}`;
}

export async function loadHighScore(userHash: string): Promise<number> {
  const key = highScoreKey(userHash);
  const raw = await storageGet(key);
  if (raw) {
    const value = Number.parseInt(raw, 10);
    if (Number.isFinite(value) && value > 0) return value;
  }

  try {
    const legacy = localStorage.getItem(LEGACY_HIGH_SCORE_KEY);
    if (legacy) {
      const value = Number.parseInt(legacy, 10);
      if (Number.isFinite(value) && value > 0) {
        await storageSet(key, String(value));
        return value;
      }
    }
  } catch {
    // ignore
  }

  return 0;
}

export async function saveHighScore(userHash: string, score: number): Promise<number> {
  const key = highScoreKey(userHash);
  const raw = await storageGet(key);
  let prev = 0;
  if (raw) {
    const value = Number.parseInt(raw, 10);
    if (Number.isFinite(value) && value > 0) prev = value;
  }
  const next = Math.max(prev, Math.max(0, Math.floor(score)));
  await storageSet(key, String(next));
  return next;
}

export async function loadCoins(userHash: string): Promise<number> {
  const raw = await storageGet(coinsKey(userHash));
  if (!raw) return 0;
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export async function saveCoins(userHash: string, coins: number): Promise<number> {
  const next = Math.max(0, Math.floor(coins));
  await storageSet(coinsKey(userHash), String(next));
  return next;
}

export async function loadShopLevels(userHash: string): Promise<ShopLevels> {
  const raw = await storageGet(shopKey(userHash));
  if (!raw) return emptyShopLevels();
  try {
    const parsed = JSON.parse(raw) as Partial<ShopLevels>;
    const base = emptyShopLevels();
    (Object.keys(base) as ShopUpgradeId[]).forEach((id) => {
      const v = parsed[id];
      if (typeof v === "number" && Number.isFinite(v) && v >= 0) {
        base[id] = Math.floor(v);
      }
    });
    return base;
  } catch {
    return emptyShopLevels();
  }
}

export async function saveShopLevels(userHash: string, levels: ShopLevels): Promise<void> {
  await storageSet(shopKey(userHash), JSON.stringify(levels));
}

/** Stage clear reward: base + small HP/time leftovers. */
export function computeClearReward(
  baseReward: number,
  remainingHp: number,
  maxHp: number,
  stageElapsedMs: number,
  stageDurationMs: number,
): number {
  const hpBonus = Math.round((remainingHp / Math.max(1, maxHp)) * 15);
  const timeRatio = Math.min(1, stageElapsedMs / Math.max(1, stageDurationMs));
  const timeBonus = timeRatio >= 0.98 ? 10 : 0;
  return baseReward + hpBonus + timeBonus;
}
