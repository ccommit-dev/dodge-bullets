import { loadBeatRpg, loadCoins, loadHighScore } from "../game/storage";
import { storageGet, storageSet } from "../game/toss";
import { loadForgeSave } from "../forge/storage";
import { loadTitansSave } from "../titans/storage";
import {
  areaIndexFromLegacyStage,
  emptyCharacterProgress,
  levelFromExp,
  normalizeCharacterProgress,
  type CharacterProgress,
} from "./model";

function progressionKey(userHash: string): string {
  return `dodgebullets:progression:v1:${userHash}`;
}

export async function saveCharacterProgress(
  userHash: string,
  value: CharacterProgress,
): Promise<CharacterProgress> {
  const next = normalizeCharacterProgress({ ...value, updatedAt: Date.now() });
  await storageSet(progressionKey(userHash), JSON.stringify(next));
  return next;
}

export async function loadCharacterProgress(userHash: string): Promise<CharacterProgress> {
  const raw = await storageGet(progressionKey(userHash));
  if (!raw) return migrateLegacyProgress(userHash, emptyCharacterProgress());
  try {
    const current = normalizeCharacterProgress(JSON.parse(raw) as Partial<CharacterProgress>);
    return migrateLegacyProgress(userHash, current);
  } catch {
    return migrateLegacyProgress(userHash, emptyCharacterProgress());
  }
}

export async function migrateLegacyProgress(
  userHash: string,
  current: CharacterProgress,
): Promise<CharacterProgress> {
  const [coins, highScore, beat, forge, titans] = await Promise.all([
    loadCoins(userHash),
    loadHighScore(userHash),
    loadBeatRpg(userHash),
    loadForgeSave(userHash),
    loadTitansSave(userHash),
  ]);
  const titanExp = Math.max(0, titans.bestStage - 1) * 55;
  const next = normalizeCharacterProgress({
    ...current,
    exp: Math.max(current.exp, titanExp),
    level: Math.max(current.level, levelFromExp(titanExp)),
    sharedCoins: coins,
    enhancementMaterials: Math.max(current.enhancementMaterials, forge.shards),
    equippedWeaponLevel: Math.max(current.equippedWeaponLevel, forge.level),
    bestForgeLevel: Math.max(current.bestForgeLevel, forge.bestLevel),
    // 진행도 레코드가 아예 없는 구 유저 — 사냥터 최고 기록이 속한 지역까지는 개척 완료로 인정한다.
    // (소급 잠금 없음. 이후부터는 화살 원정만 개척도를 올린다.)
    pioneeredArea: Math.max(current.pioneeredArea, areaIndexFromLegacyStage(titans.bestStage)),
    dodgeBestScore: Math.max(current.dodgeBestScore, highScore),
    titanBestStage: Math.max(current.titanBestStage, titans.bestStage),
    beatSkills: Object.fromEntries(
      Object.entries(current.beatSkills).map(([id, value]) => [
        id,
        Math.max(value, beat.skills[id as keyof typeof beat.skills]),
      ]),
    ) as CharacterProgress["beatSkills"],
    skillPoints: Math.max(current.skillPoints, beat.sp),
  });
  return saveCharacterProgress(userHash, next);
}

export async function updateCharacterProgress(
  userHash: string,
  updater: (current: CharacterProgress) => CharacterProgress,
): Promise<CharacterProgress> {
  const current = await loadCharacterProgress(userHash);
  return saveCharacterProgress(userHash, updater(current));
}

export async function grantCharacterReward(
  userHash: string,
  rewardId: string,
  reward: Partial<Pick<CharacterProgress, "exp" | "sharedCoins" | "enhancementMaterials">> & {
    lastContent?: CharacterProgress["lastContent"];
    dodgeStage?: number;
  },
): Promise<CharacterProgress> {
  return updateCharacterProgress(userHash, (current) => {
    if (current.claimedRewards.includes(rewardId)) return current;
    return normalizeCharacterProgress({
      ...current,
      exp: current.exp + Math.max(0, reward.exp ?? 0),
      sharedCoins: current.sharedCoins + Math.max(0, reward.sharedCoins ?? 0),
      enhancementMaterials:
        current.enhancementMaterials + Math.max(0, reward.enhancementMaterials ?? 0),
      dodgeBestStage: Math.max(current.dodgeBestStage, reward.dodgeStage ?? 1),
      lastContent: reward.lastContent ?? current.lastContent,
      claimedRewards: [...current.claimedRewards, rewardId],
    });
  });
}
