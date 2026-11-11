import { emptyBeatCosmetics, normalizeBeatCosmetics } from "../beat/shop";
import type { BeatCosmetics } from "../beat/types";
import { emptyBeatRpg, normalizeBeatRpg, type BeatRpgProgress } from "../beat/rpg";
import { emptyShopLevels } from "./shop";
import { storageGet, storageSet } from "./toss";
import type { ShopLevels, ShopUpgradeId } from "./types";

const LEGACY_HIGH_SCORE_KEY = "dodge-bullets:highScore";

function highScoreKey(userHash: string): string {
  return `dodgebullets:highScore:${userHash}`;
}

/**
 * 지갑 미러 키 (진행도 sharedCoins 의 하한 — progression/storage mergeLegacyProgress).
 * 2026-11-10 단위 낮추기 2차(economy/units)에 새로 팠다 — 예전 키에는 옛 단위 금액이 남아 있어, 하한으로 계속 읽으면 ÷100 한 지갑을 옛 금액으로 되돌린다.
 * 예전 키는 진행도를 바꾸는 그 한 번만 읽는다 (loadCoinsOldUnit)
 */
function coinsKey(userHash: string): string {
  return `dodgebullets:coins:u2:${userHash}`;
}

function oldUnitCoinsKey(userHash: string): string {
  return `dodgebullets:coins:${userHash}`;
}

function shopKey(userHash: string): string {
  return `dodgebullets:shop:${userHash}`;
}

function beatCosmeticsKey(userHash: string): string {
  return `dodgebullets:beatCosmetics:${userHash}`;
}

function beatRpgKey(userHash: string): string {
  return `dodgebullets:beatRpg:${userHash}`;
}

function beatUnlockKey(userHash: string): string {
  return `dodgebullets:beatUnlock:${userHash}`;
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

/** 예전 단위 금액 — 진행도 단위 이전 때만 */
export async function loadCoinsOldUnit(userHash: string): Promise<number> {
  const raw = await storageGet(oldUnitCoinsKey(userHash));
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

export async function loadBeatCosmetics(userHash: string): Promise<BeatCosmetics> {
  const raw = await storageGet(beatCosmeticsKey(userHash));
  if (!raw) return emptyBeatCosmetics();
  try {
    return normalizeBeatCosmetics(JSON.parse(raw) as Partial<BeatCosmetics>);
  } catch {
    return emptyBeatCosmetics();
  }
}

export async function saveBeatCosmetics(
  userHash: string,
  cosmetics: BeatCosmetics,
): Promise<void> {
  await storageSet(beatCosmeticsKey(userHash), JSON.stringify(normalizeBeatCosmetics(cosmetics)));
}

/** Highest stage index unlocked (0-based). Stage 0 always playable. */
export async function loadBeatUnlock(userHash: string): Promise<number> {
  const raw = await storageGet(beatUnlockKey(userHash));
  if (!raw) return 0;
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

export async function saveBeatUnlock(userHash: string, maxIndex: number): Promise<number> {
  const prev = await loadBeatUnlock(userHash);
  const next = Math.max(prev, Math.max(0, Math.floor(maxIndex)));
  await storageSet(beatUnlockKey(userHash), String(next));
  return next;
}

export async function loadBeatRpg(userHash: string): Promise<BeatRpgProgress> {
  const raw = await storageGet(beatRpgKey(userHash));
  if (!raw) return emptyBeatRpg();
  try {
    return normalizeBeatRpg(JSON.parse(raw) as Partial<BeatRpgProgress>);
  } catch {
    return emptyBeatRpg();
  }
}

export async function saveBeatRpg(
  userHash: string,
  progress: BeatRpgProgress,
): Promise<BeatRpgProgress> {
  const next = normalizeBeatRpg(progress);
  await storageSet(beatRpgKey(userHash), JSON.stringify(next));
  return next;
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
