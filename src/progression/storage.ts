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
  if (!raw) return migrateLegacyProgress(userHash, emptyCharacterProgress(), true);
  try {
    const parsed = JSON.parse(raw) as Partial<CharacterProgress>;
    // v5 이전 레코드에만 사냥터 기록으로 개척도를 소급 부여한다.
    // 매 로드마다 부여하면 titans가 개척도를 계속 밀어 올려 게이트가 영영 걸리지 않는다.
    const preV5 = typeof parsed.pioneeredArea !== "number";
    return migrateLegacyProgress(userHash, normalizeCharacterProgress(parsed), preV5);
  } catch {
    return migrateLegacyProgress(userHash, emptyCharacterProgress(), true);
  }
}

export async function migrateLegacyProgress(
  userHash: string,
  current: CharacterProgress,
  /** 사냥터 최고 기록으로 개척도를 소급 부여할지. v5 이전 레코드 1회만 true. */
  grantPioneerFromTitans = false,
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
    // 레거시 코인 키는 **하한**이지 권위가 아니다.
    // 그대로 덮어쓰면 방치 정산·대장간 이관처럼 sharedCoins에만 들어온 금액이
    // 다음 로드에서 통째로 사라진다. 단일 진실 소스는 sharedCoins다.
    sharedCoins: Math.max(current.sharedCoins, coins),
    enhancementMaterials: Math.max(current.enhancementMaterials, forge.shards),
    equippedWeaponLevel: Math.max(current.equippedWeaponLevel, forge.level),
    bestForgeLevel: Math.max(current.bestForgeLevel, forge.bestLevel),
    // v5 이전 유저 — 사냥터 최고 기록이 속한 지역까지는 개척 완료로 인정한다(소급 잠금 없음).
    // 이후 로드에서는 grantPioneerFromTitans=false라 화살 원정만 개척도를 올린다.
    pioneeredArea: grantPioneerFromTitans
      ? Math.max(current.pioneeredArea, areaIndexFromLegacyStage(titans.bestStage))
      : current.pioneeredArea,
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
