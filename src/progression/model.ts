import { emptySkills, type BeatSkills } from "../beat/rpg";

export const PROGRESSION_VERSION = 4;

export type ShoulderId = "scout" | "shadow" | "ogre" | "dragon";
export type EvolutionPath = "novice" | "swordmaster" | "guardian" | "arcane";

export type CharacterProgress = {
  version: number;
  level: number;
  exp: number;
  sharedCoins: number;
  redGems: number;
  enhancementMaterials: number;
  equippedWeaponLevel: number;
  bestForgeLevel: number;
  equippedShoulder: ShoulderId | null;
  ownedShoulders: ShoulderId[];
  shoulderShards: number;
  unlockedHuntingArea: number;
  dodgeBestStage: number;
  dodgeBestScore: number;
  titanBestStage: number;
  beatSkills: BeatSkills;
  skillPoints: number;
  claimedRewards: string[];
  claimedBadges: string[];
  equippedBadges: string[];
  rebirthCount: number;
  inheritanceCrystals: number;
  evolutionPoints: number;
  evolutionPath: EvolutionPath;
  lastContent: "dodge" | "beat" | "forge" | "titans" | null;
  updatedAt: number;
};

export function expForLevel(level: number): number {
  const safe = Math.max(1, Math.floor(level));
  return Math.floor(90 * safe + 35 * safe * safe);
}

export function levelFromExp(exp: number): number {
  let level = 1;
  const safeExp = Math.max(0, Math.floor(exp));
  while (level < 999 && safeExp >= expForLevel(level + 1)) level += 1;
  return level;
}

export function emptyCharacterProgress(): CharacterProgress {
  return {
    version: PROGRESSION_VERSION,
    level: 1,
    exp: 0,
    sharedCoins: 0,
    redGems: 0,
    enhancementMaterials: 0,
    equippedWeaponLevel: 0,
    bestForgeLevel: 0,
    equippedShoulder: null,
    ownedShoulders: [],
    shoulderShards: 0,
    unlockedHuntingArea: 1,
    dodgeBestStage: 1,
    dodgeBestScore: 0,
    titanBestStage: 1,
    beatSkills: emptySkills(),
    skillPoints: 0,
    claimedRewards: [],
    claimedBadges: [],
    equippedBadges: [],
    rebirthCount: 0,
    inheritanceCrystals: 0,
    evolutionPoints: 0,
    evolutionPath: "novice",
    lastContent: null,
    updatedAt: Date.now(),
  };
}

function integer(value: unknown, fallback: number, max = Number.MAX_SAFE_INTEGER): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.min(max, Math.floor(value)))
    : fallback;
}

export function normalizeCharacterProgress(
  raw: Partial<CharacterProgress> | null,
): CharacterProgress {
  const base = emptyCharacterProgress();
  if (!raw) return base;
  const beatSkills = { ...base.beatSkills, ...(raw.beatSkills ?? {}) };
  (Object.keys(beatSkills) as Array<keyof BeatSkills>).forEach((id) => {
    beatSkills[id] = integer(beatSkills[id], 0, 99);
  });
  const exp = integer(raw.exp, base.exp);
  const content = raw.lastContent;
  const evolutionPaths: EvolutionPath[] = ["novice", "swordmaster", "guardian", "arcane"];
  const shoulderIds: ShoulderId[] = ["scout", "shadow", "ogre", "dragon"];
  const ownedShoulders = Array.isArray(raw.ownedShoulders)
    ? raw.ownedShoulders.filter((id): id is ShoulderId => shoulderIds.includes(id as ShoulderId))
    : [];
  const equippedShoulder = shoulderIds.includes(raw.equippedShoulder as ShoulderId)
    ? (raw.equippedShoulder as ShoulderId)
    : null;
  return {
    version: PROGRESSION_VERSION,
    level: Math.max(levelFromExp(exp), integer(raw.level, base.level, 999)),
    exp,
    sharedCoins: integer(raw.sharedCoins, base.sharedCoins),
    redGems: integer(raw.redGems, base.redGems),
    enhancementMaterials: integer(raw.enhancementMaterials, base.enhancementMaterials),
    equippedWeaponLevel: integer(raw.equippedWeaponLevel, base.equippedWeaponLevel, 9999),
    bestForgeLevel: integer(raw.bestForgeLevel, base.bestForgeLevel, 15),
    equippedShoulder: equippedShoulder && ownedShoulders.includes(equippedShoulder) ? equippedShoulder : null,
    ownedShoulders: [...new Set(ownedShoulders)],
    shoulderShards: integer(raw.shoulderShards, 0),
    unlockedHuntingArea: Math.max(1, integer(raw.unlockedHuntingArea, 1, 9999)),
    dodgeBestStage: Math.max(1, integer(raw.dodgeBestStage, 1, 9999)),
    dodgeBestScore: integer(raw.dodgeBestScore, 0),
    titanBestStage: Math.max(1, integer(raw.titanBestStage, 1, 9999)),
    beatSkills,
    skillPoints: integer(raw.skillPoints, base.skillPoints),
    claimedRewards: Array.isArray(raw.claimedRewards)
      ? [...new Set(raw.claimedRewards.filter((id): id is string => typeof id === "string"))].slice(-500)
      : [],
    claimedBadges: Array.isArray(raw.claimedBadges)
      ? [...new Set(raw.claimedBadges.filter((id): id is string => typeof id === "string"))].slice(-100)
      : [],
    equippedBadges: Array.isArray(raw.equippedBadges)
      ? [...new Set(raw.equippedBadges.filter((id): id is string => typeof id === "string"))].slice(0, 3)
      : [],
    rebirthCount: integer(raw.rebirthCount, 0, 999),
    inheritanceCrystals: integer(raw.inheritanceCrystals, 0),
    evolutionPoints: integer(raw.evolutionPoints, 0, 999),
    evolutionPath: evolutionPaths.includes(raw.evolutionPath as EvolutionPath)
      ? (raw.evolutionPath as EvolutionPath)
      : "novice",
    lastContent:
      content === "dodge" || content === "beat" || content === "forge" || content === "titans"
        ? content
        : null,
    updatedAt: integer(raw.updatedAt, Date.now()),
  };
}

export function totalSkillMastery(progress: CharacterProgress): number {
  return Object.values(progress.beatSkills).reduce((sum, value) => sum + value, 0);
}

export function combatPower(progress: CharacterProgress): number {
  return Math.max(
    1,
    progress.level * 20 +
      progress.equippedWeaponLevel * 28 +
      progress.bestForgeLevel * 14 +
      progress.titanBestStage * 7 +
      totalSkillMastery(progress) * 3,
  );
}

export function progressToNextLevel(progress: CharacterProgress): {
  current: number;
  required: number;
  ratio: number;
} {
  const floor = progress.level <= 1 ? 0 : expForLevel(progress.level);
  const ceiling = expForLevel(progress.level + 1);
  const current = Math.max(0, progress.exp - floor);
  const required = Math.max(1, ceiling - floor);
  return { current, required, ratio: Math.min(1, current / required) };
}
