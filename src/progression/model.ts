import { emptySkills, type BeatSkills } from "../beat/rpg";
import { HUNTING_AREAS, huntingArea, type TitanHeroId, type TitanMonsterKind } from "../titans/model";
import { ALLY_IDS, EXPEDITION_MAX, emptyAllyRecord, type Expedition } from "../titans/allies";
import { PET_IDS, PET_MAX_LEVEL } from "../titans/pets";
import { allyCollectionPower, petCollectionPower } from "./collection";

export const PROGRESSION_VERSION = 5;

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
  /** 무한 재련 등급 — +15 도달 후 반복 재련으로만 오른다. 방치 배율(M)에 붙는다. */
  reforgeRank: number;
  equippedShoulder: ShoulderId | null;
  ownedShoulders: ShoulderId[];
  shoulderShards: number;
  /**
   * 개척한 사냥터 지역 인덱스 (1~5). 화살 원정 클리어로만 오른다.
   * 구 `unlockedHuntingArea`는 이름과 달리 스테이지 번호를 담고 있어 그대로 쓸 수 없다 —
   * v4→v5에서 `huntingArea()`로 지역 인덱스로 환산한다.
   */
  pioneeredArea: number;
  dodgeBestStage: number;
  dodgeBestScore: number;
  /** 끝없는 성벽 최고 층 */
  towerBestFloor: number;
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
  /** 출석 연속일 — 방치 시간 캡(T) 보너스에 쓰인다. */
  attendanceStreak: number;
  /** 마지막 방치 정산 시각 (구 `TitansSave.lastActiveAt`에서 승격) */
  idleClaimedAt: number;
  /** 동료 성급 (★0~5) — 환생에도 보존되는 영구 성장 */
  allyStars: Record<TitanHeroId, number>;
  /** 동료별 승급 조각 */
  allyShards: Record<TitanHeroId, number>;
  /** 몬스터 도감 — 종류별 처치 수 (마일스톤 → 골드 보너스) */
  monsterKills: Record<TitanMonsterKind, number>;
  /** DPS 벽에 도달했던 지역 id — 벽 보상 1회 지급 + 환생 조건(≥3) 겸용 */
  wallAreas: string[];
  /** 방치 산출 2배 만료 시각 — 환생 복귀 버프·가속권이 공유 */
  idleBoostUntil: number;
  /** 구매한 플레이어블 캐릭터 */
  ownedCharacters: string[];
  /** 장착 캐릭터 ("default" = 기본 소년) */
  activeCharacter: string;
  /** 성급 조각팩 주간 구매 기록 — { week: "2026-35", bought: { luna: 2 } } */
  weeklyShardPacks: { week: string; bought: Partial<Record<TitanHeroId, number>> };
  /** 콘텐츠별 오늘의 첫 클리어 날짜 (YYYY-MM-DD) — 첫 클리어 2배 판정 */
  firstClearDates: Record<"hunt" | "dodge" | "forge" | "beat", string>;
  /** 펫 레벨 — 0=미부화, 종별 1,000처치로 부화(레벨 1). 환생에도 보존. */
  pets: Record<TitanMonsterKind, number>;
  /** 장착 펫 ("" = 없음) — 1마리만 액티브 패시브 */
  activePet: string;
  /** 원정대 편성 — 출전 동료만 전투·DPS에 반영 */
  partyIds: TitanHeroId[];
  /** 편성 슬롯 소급 하한 — 편성 도입 이전 유저는 보유 수만큼(최대 6) 보장 */
  partyCap: number;
  /** 진행 중 파견 (최대 2팀) */
  expeditions: Expedition[];
  /** 원정 일지 — 수령한 마일스톤 id */
  journalClaimed: string[];
  /**
   * 온보딩 순차 개방 단계 (CRUMBLE_GAP §8) — 0 사냥터만 → 1 화살 원정 →
   * 2 대장간 → 3 연습실 → 4 전부(이벤트·보석 상점). 단조 증가.
   * 기존 유저는 마이그레이션에서 4로 소급 — 신규에게만 적용된다.
   */
  onboardingStep: number;
  /** dodge 스테이지 별점 (§4) — key는 스테이지 인덱스 "0"~"3", 성벽 미적용 */
  dodgeStars: Record<string, number>;
  /** 보유 동료 스킨 id */
  ownedAllySkins: string[];
  /** 동료별 장착 스킨 (미장착 = 기본 외형) */
  equippedAllySkins: Partial<Record<TitanHeroId, string>>;
  /** 보유 무기 외형 id — 칼날 색·오라 커스텀 (성능 무관) */
  ownedWeaponSkins: string[];
  /** 장착 무기 외형 ("" = 강화 티어 기본색) */
  equippedWeaponSkin: string;
  /** 보유 칭호 id */
  ownedTitles: string[];
  /** 표시 칭호 ("" = 없음) */
  activeTitle: string;
  /** 보호구(견갑) 강화 단계 — 대장간에서 검처럼 강화한다 (0~10). 파괴 없음 */
  shoulderEnhance: number;
  lastContent: "dodge" | "beat" | "forge" | "titans" | null;
  updatedAt: number;
  /** 복귀 워밍업(RETENTION C) — 골드 ×2가 끝나는 시각(ms). 0이면 없음 */
  warmupUntil: number;
  /** 워밍업 일일 발동 횟수(하루 3회 상한) */
  warmupDay: { date: string; count: number };
  /** 데일리 루틴 보드(RETENTION A) 완료 보상을 받은 날짜(sv-SE) */
  routineClaimedDate: string;
  /** 사냥터 진입 세션 수 — 종료 예고 칩은 첫 3세션만 */
  sessionCount: number;
  /** 소환 천장 카운터 — SSR 없이 누적된 뽑기 수 (60에서 확정) */
  gachaPity: number;
  /** 누적 뽑기 수 (공시·통계) */
  gachaPulls: number;
  /** 원정 후원 계약 만료 시각(ms). 0이면 없음 */
  patronUntil: number;
  /** 후원 일일 보석을 받은 날짜(sv-SE) */
  patronClaimedDate: string;
  /** 비트 RPG sp 중 이미 SP로 합산한 값 — 매 로드마다 재합산되던 환불 버그 방지 */
  beatSpMigrated: number;
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
    reforgeRank: 0,
    equippedShoulder: "scout",
    ownedShoulders: ["scout"],
    shoulderShards: 0,
    pioneeredArea: 1,
    dodgeBestStage: 1,
    dodgeBestScore: 0,
    towerBestFloor: 0,
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
    attendanceStreak: 0,
    idleClaimedAt: Date.now(),
    allyStars: emptyAllyRecord(),
    allyShards: emptyAllyRecord(),
    monsterKills: { slime: 0, goblin: 0, wolf: 0, ogre: 0, dragon: 0, boss: 0 },
    wallAreas: [],
    idleBoostUntil: 0,
    ownedCharacters: [],
    activeCharacter: "default",
    weeklyShardPacks: { week: "", bought: {} },
    firstClearDates: { hunt: "", dodge: "", forge: "", beat: "" },
    pets: { slime: 0, goblin: 0, wolf: 0, ogre: 0, dragon: 0, boss: 0 },
    activePet: "",
    partyIds: [],
    partyCap: 4,
    expeditions: [],
    journalClaimed: [],
    onboardingStep: 0,
    dodgeStars: {},
    ownedAllySkins: [],
    equippedAllySkins: {},
    ownedWeaponSkins: [],
    equippedWeaponSkin: "",
    ownedTitles: [],
    activeTitle: "",
    shoulderEnhance: 0,
    warmupUntil: 0,
    warmupDay: { date: "", count: 0 },
    routineClaimedDate: "",
    sessionCount: 0,
    gachaPity: 0,
    gachaPulls: 0,
    patronUntil: 0,
    patronClaimedDate: "",
    beatSpMigrated: 0,
    lastContent: null,
    updatedAt: Date.now(),
  };
}

/**
 * v4 → v5 개척도 환산.
 *
 * 구 `unlockedHuntingArea`에는 **스테이지 번호**가 들어 있다
 * (`titans.bestStage`, `clearedStage + 1`을 `Math.max`로 누적).
 * 그대로 지역 인덱스로 읽으면 Stage 30 유저의 값 30이 "지역 30 개방"이 되어
 * 게이트가 영구히 무력화된다. 그 스테이지가 속한 지역까지를 개척 완료로 인정해
 * 이미 도달했던 곳은 돌려주고(소급 잠금 없음), 그 이후부터 게이트가 작동하게 한다.
 */
export function areaIndexFromLegacyStage(stage: number): number {
  const safe = Math.max(1, Math.floor(stage));
  const area = huntingArea(safe);
  return HUNTING_AREAS.findIndex((candidate) => candidate.id === area.id) + 1;
}

function integer(value: unknown, fallback: number, max = Number.MAX_SAFE_INTEGER): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.min(max, Math.floor(value)))
    : fallback;
}

function allyRecordOf(
  raw: Partial<Record<TitanHeroId, number>> | undefined,
  max: number,
): Record<TitanHeroId, number> {
  const base = emptyAllyRecord();
  if (!raw) return base;
  (Object.keys(base) as TitanHeroId[]).forEach((id) => {
    base[id] = integer(raw[id], 0, max);
  });
  return base;
}

/** v5 필드가 있으면 그대로, 없으면 구 `unlockedHuntingArea`(스테이지 번호)에서 환산. */
function pioneeredAreaOf(raw: Partial<CharacterProgress> & { unlockedHuntingArea?: unknown }): number {
  const stored = raw.pioneeredArea;
  if (typeof stored === "number" && Number.isFinite(stored) && stored >= 1) {
    return Math.max(1, Math.min(HUNTING_AREAS.length, Math.floor(stored)));
  }
  const legacy = raw.unlockedHuntingArea;
  if (typeof legacy === "number" && Number.isFinite(legacy) && legacy >= 1) {
    return areaIndexFromLegacyStage(legacy);
  }
  return 1;
}

/**
 * 온보딩 단계 마이그레이션 (§8) — 필드가 없는 세이브는 진행 흔적이 하나라도
 * 있으면 4(전부 개방)로 소급한다. 업데이트가 기존 유저의 콘텐츠를 잠그면 안 된다.
 * 완전 신규(모든 기본값)만 0에서 시작한다.
 */
function onboardingStepOf(raw: Partial<CharacterProgress>): number {
  const stored = raw.onboardingStep;
  if (typeof stored === "number" && Number.isFinite(stored)) {
    return Math.max(0, Math.min(4, Math.floor(stored)));
  }
  const hasProgress =
    (raw.titanBestStage ?? 1) > 1 ||
    (raw.dodgeBestStage ?? 1) > 1 ||
    (raw.exp ?? 0) > 0 ||
    (raw.bestForgeLevel ?? 0) > 0 ||
    (raw.attendanceStreak ?? 0) > 0 ||
    (raw.pioneeredArea ?? 1) > 1;
  return hasProgress ? 4 : 0;
}

function dodgeStarsOf(raw: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (raw && typeof raw === "object") {
    Object.entries(raw as Record<string, unknown>).forEach(([key, value]) => {
      if (/^\d+$/.test(key) && typeof value === "number") {
        out[key] = Math.max(0, Math.min(3, Math.floor(value)));
      }
    });
  }
  return out;
}

function equippedSkinsOf(
  raw: Partial<Record<TitanHeroId, string>> | undefined,
  owned: unknown,
): Partial<Record<TitanHeroId, string>> {
  const out: Partial<Record<TitanHeroId, string>> = {};
  if (!raw) return out;
  const ownedList = Array.isArray(owned) ? owned : [];
  ALLY_IDS.forEach((id) => {
    const skin = raw[id];
    if (typeof skin === "string" && ownedList.includes(skin)) out[id] = skin;
  });
  return out;
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
  const storedShoulders = Array.isArray(raw.ownedShoulders)
    ? raw.ownedShoulders.filter((id): id is ShoulderId => shoulderIds.includes(id as ShoulderId))
    : [];
  const ownedShoulders = storedShoulders.length > 0 ? storedShoulders : ["scout" as ShoulderId];
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
    reforgeRank: integer(raw.reforgeRank, 0, 999),
    equippedShoulder: equippedShoulder && ownedShoulders.includes(equippedShoulder) ? equippedShoulder : "scout",
    ownedShoulders: [...new Set(ownedShoulders)],
    shoulderShards: integer(raw.shoulderShards, 0),
    pioneeredArea: pioneeredAreaOf(raw),
    dodgeBestStage: Math.max(1, integer(raw.dodgeBestStage, 1, 9999)),
    dodgeBestScore: integer(raw.dodgeBestScore, 0),
    towerBestFloor: integer(raw.towerBestFloor, 0, 99999),
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
    attendanceStreak: integer(raw.attendanceStreak, 0, 9999),
    idleClaimedAt: integer(raw.idleClaimedAt, Date.now(), Date.now()),
    allyStars: allyRecordOf(raw.allyStars, 5),
    allyShards: allyRecordOf(raw.allyShards, 99999),
    monsterKills: {
      slime: integer(raw.monsterKills?.slime, 0),
      goblin: integer(raw.monsterKills?.goblin, 0),
      wolf: integer(raw.monsterKills?.wolf, 0),
      ogre: integer(raw.monsterKills?.ogre, 0),
      dragon: integer(raw.monsterKills?.dragon, 0),
      boss: integer(raw.monsterKills?.boss, 0),
    },
    wallAreas: Array.isArray(raw.wallAreas)
      ? [...new Set(raw.wallAreas.filter((id): id is string => typeof id === "string"))].slice(0, 10)
      : [],
    idleBoostUntil: integer(raw.idleBoostUntil, 0),
    ownedCharacters: Array.isArray(raw.ownedCharacters)
      ? [...new Set(raw.ownedCharacters.filter((id): id is string => typeof id === "string"))].slice(0, 20)
      : [],
    activeCharacter: typeof raw.activeCharacter === "string" ? raw.activeCharacter : "default",
    weeklyShardPacks:
      raw.weeklyShardPacks && typeof raw.weeklyShardPacks.week === "string"
        ? { week: raw.weeklyShardPacks.week, bought: { ...(raw.weeklyShardPacks.bought ?? {}) } }
        : { week: "", bought: {} },
    firstClearDates: {
      hunt: typeof raw.firstClearDates?.hunt === "string" ? raw.firstClearDates.hunt : "",
      dodge: typeof raw.firstClearDates?.dodge === "string" ? raw.firstClearDates.dodge : "",
      forge: typeof raw.firstClearDates?.forge === "string" ? raw.firstClearDates.forge : "",
      beat: typeof raw.firstClearDates?.beat === "string" ? raw.firstClearDates.beat : "",
    },
    pets: {
      slime: integer(raw.pets?.slime, 0, PET_MAX_LEVEL),
      goblin: integer(raw.pets?.goblin, 0, PET_MAX_LEVEL),
      wolf: integer(raw.pets?.wolf, 0, PET_MAX_LEVEL),
      ogre: integer(raw.pets?.ogre, 0, PET_MAX_LEVEL),
      dragon: integer(raw.pets?.dragon, 0, PET_MAX_LEVEL),
      boss: integer(raw.pets?.boss, 0, PET_MAX_LEVEL),
    },
    activePet:
      typeof raw.activePet === "string" && PET_IDS.includes(raw.activePet as TitanMonsterKind)
        ? raw.activePet
        : "",
    partyIds: Array.isArray(raw.partyIds)
      ? [...new Set(raw.partyIds.filter((id): id is TitanHeroId => ALLY_IDS.includes(id as TitanHeroId)))].slice(0, 6)
      : [],
    partyCap: Math.max(4, integer(raw.partyCap, 4, 6)),
    expeditions: Array.isArray(raw.expeditions)
      ? raw.expeditions
          .filter(
            (e): e is Expedition =>
              !!e &&
              typeof e === "object" &&
              ALLY_IDS.includes((e as Expedition).allyId) &&
              typeof (e as Expedition).endsAt === "number" &&
              [4, 8, 12].includes((e as Expedition).hours),
          )
          .slice(0, EXPEDITION_MAX)
      : [],
    journalClaimed: Array.isArray(raw.journalClaimed)
      ? [...new Set(raw.journalClaimed.filter((id): id is string => typeof id === "string"))].slice(-50)
      : [],
    onboardingStep: onboardingStepOf(raw),
    dodgeStars: dodgeStarsOf(raw.dodgeStars),
    ownedAllySkins: Array.isArray(raw.ownedAllySkins)
      ? [...new Set(raw.ownedAllySkins.filter((id): id is string => typeof id === "string"))].slice(0, 20)
      : [],
    equippedAllySkins: equippedSkinsOf(raw.equippedAllySkins, raw.ownedAllySkins),
    ownedWeaponSkins: Array.isArray(raw.ownedWeaponSkins)
      ? [...new Set(raw.ownedWeaponSkins.filter((id): id is string => typeof id === "string"))].slice(0, 20)
      : [],
    equippedWeaponSkin:
      typeof raw.equippedWeaponSkin === "string" &&
      Array.isArray(raw.ownedWeaponSkins) &&
      raw.ownedWeaponSkins.includes(raw.equippedWeaponSkin)
        ? raw.equippedWeaponSkin
        : "",
    ownedTitles: Array.isArray(raw.ownedTitles)
      ? [...new Set(raw.ownedTitles.filter((id): id is string => typeof id === "string"))].slice(0, 30)
      : [],
    activeTitle:
      typeof raw.activeTitle === "string" &&
      Array.isArray(raw.ownedTitles) &&
      raw.ownedTitles.includes(raw.activeTitle)
        ? raw.activeTitle
        : "",
    shoulderEnhance: integer(raw.shoulderEnhance, 0, 10),
    warmupUntil: integer(raw.warmupUntil, 0),
    warmupDay:
      raw.warmupDay && typeof raw.warmupDay.date === "string"
        ? { date: raw.warmupDay.date, count: integer(raw.warmupDay.count, 0, 99) }
        : { date: "", count: 0 },
    routineClaimedDate: typeof raw.routineClaimedDate === "string" ? raw.routineClaimedDate : "",
    sessionCount: integer(raw.sessionCount, 0, 999999),
    gachaPity: integer(raw.gachaPity, 0, 999),
    gachaPulls: integer(raw.gachaPulls, 0, 9999999),
    patronUntil: integer(raw.patronUntil, 0),
    patronClaimedDate: typeof raw.patronClaimedDate === "string" ? raw.patronClaimedDate : "",
    beatSpMigrated: integer(raw.beatSpMigrated, 0, 9999999),
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
      totalSkillMastery(progress) * 3 +
      // 도감 영구 전투력 (CRUMBLE_GAP §7) — 동료·펫 최초 획득만으로 붙는다
      allyCollectionPower(progress) +
      petCollectionPower(progress) +
      progress.shoulderEnhance * 20,
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
