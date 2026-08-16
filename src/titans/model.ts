export type TitanHeroId = "mia" | "leon" | "sera" | "garen" | "ari" | "nox";

export type TitanSkillId = "strike" | "crit" | "clone" | "warcry";

export type TitanMonsterKind = "slime" | "goblin" | "wolf" | "ogre" | "dragon" | "boss";

export type HuntingAreaDef = {
  id: string;
  name: string;
  stageFrom: number;
  stageTo: number;
  normalKinds: Exclude<TitanMonsterKind, "boss">[];
  bossName: string;
  rewardMultiplier: number;
  sky: string;
  ground: string;
  accent: string;
};

export const HUNTING_AREAS: HuntingAreaDef[] = [
  { id: "meadow", name: "새벽 초원", stageFrom: 1, stageTo: 5, normalKinds: ["slime", "goblin"], bossName: "이끼 골렘", rewardMultiplier: 1, sky: "#155e75", ground: "#166534", accent: "#67e8f9" },
  { id: "forest", name: "그림자 숲", stageFrom: 6, stageTo: 10, normalKinds: ["goblin", "wolf"], bossName: "월광 늑대왕", rewardMultiplier: 1.45, sky: "#1e3a5f", ground: "#14532d", accent: "#a7f3d0" },
  { id: "ruins", name: "붉은 폐허", stageFrom: 11, stageTo: 15, normalKinds: ["wolf", "ogre"], bossName: "고대 오우거", rewardMultiplier: 2.05, sky: "#7f1d1d", ground: "#451a03", accent: "#fdba74" },
  { id: "volcano", name: "용암 협곡", stageFrom: 16, stageTo: 23, normalKinds: ["ogre", "dragon"], bossName: "화염 비룡", rewardMultiplier: 3.1, sky: "#7c2d12", ground: "#3f1d16", accent: "#fb7185" },
  { id: "abyss", name: "심연의 성", stageFrom: 24, stageTo: 9999, normalKinds: ["dragon", "wolf", "ogre"], bossName: "심연의 타이탄", rewardMultiplier: 5, sky: "#312e81", ground: "#1e1b4b", accent: "#c4b5fd" },
];

export function huntingArea(stage: number): HuntingAreaDef {
  return HUNTING_AREAS.find((area) => stage >= area.stageFrom && stage <= area.stageTo) ?? HUNTING_AREAS[HUNTING_AREAS.length - 1];
}

export type TitanHeroDef = {
  id: TitanHeroId;
  name: string;
  role: string;
  unlockStage: number;
  baseCost: number;
  baseDps: number;
  hue: number;
};

export type TitanSkillDef = {
  id: TitanSkillId;
  name: string;
  desc: string;
  unlockSword: number;
  cooldownSec: number;
  durationSec: number;
};

export type TitansSave = {
  gold: number;
  stage: number;
  bestStage: number;
  swordLevel: number;
  heroes: Record<TitanHeroId, number>;
  totalKills: number;
  totalTaps: number;
  lastActiveAt: number;
};

export const MOBS_PER_STAGE = 10;
export const BOSS_TIME_SEC = 30;

export const HEROES: TitanHeroDef[] = [
  {
    id: "mia",
    name: "스카우트 미아",
    role: "기본 동료 DPS",
    unlockStage: 1,
    baseCost: 50,
    baseDps: 1.2,
    hue: 195,
  },
  {
    id: "leon",
    name: "궁수 레온",
    role: "원거리 지속딜",
    unlockStage: 3,
    baseCost: 320,
    baseDps: 6,
    hue: 145,
  },
  {
    id: "sera",
    name: "마법사 세라",
    role: "마법 광역딜",
    unlockStage: 6,
    baseCost: 2_200,
    baseDps: 28,
    hue: 280,
  },
  {
    id: "garen",
    name: "기사 가렌",
    role: "전열 탱커형 딜",
    unlockStage: 10,
    baseCost: 18_000,
    baseDps: 120,
    hue: 42,
  },
  {
    id: "ari",
    name: "용기사 아리",
    role: "화염 돌진",
    unlockStage: 16,
    baseCost: 160_000,
    baseDps: 620,
    hue: 12,
  },
  {
    id: "nox",
    name: "암살자 녹스",
    role: "치명 특화",
    unlockStage: 24,
    baseCost: 1_400_000,
    baseDps: 3_200,
    hue: 310,
  },
];

export const SKILLS: TitanSkillDef[] = [
  {
    id: "strike",
    name: "천상의 일격",
    desc: "현재 탭 데미지 ×40의 즉시 피해",
    unlockSword: 3,
    cooldownSec: 12,
    durationSec: 0,
  },
  {
    id: "crit",
    name: "치명 폭풍",
    desc: "8초간 치명타 확률 +45%",
    unlockSword: 8,
    cooldownSec: 22,
    durationSec: 8,
  },
  {
    id: "clone",
    name: "그림자 분신",
    desc: "10초간 탭 데미지 ×2",
    unlockSword: 15,
    cooldownSec: 30,
    durationSec: 10,
  },
  {
    id: "warcry",
    name: "전장의 함성",
    desc: "12초간 동료 DPS ×2.5",
    unlockSword: 25,
    cooldownSec: 40,
    durationSec: 12,
  },
];

export function emptyHeroLevels(): Record<TitanHeroId, number> {
  return { mia: 0, leon: 0, sera: 0, garen: 0, ari: 0, nox: 0 };
}

export function defaultTitansSave(): TitansSave {
  return {
    gold: 0,
    stage: 1,
    bestStage: 1,
    swordLevel: 1,
    heroes: emptyHeroLevels(),
    totalKills: 0,
    totalTaps: 0,
    lastActiveAt: Date.now(),
  };
}

export function normalizeTitansSave(value: Partial<TitansSave> | null): TitansSave {
  const base = defaultTitansSave();
  if (!value) return base;
  const n = (v: unknown, fallback: number, max = 1e15) =>
    typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.min(max, Math.floor(v))) : fallback;
  const heroes = emptyHeroLevels();
  for (const h of HEROES) {
    heroes[h.id] = n(value.heroes?.[h.id], 0, 9999);
  }
  return {
    gold: n(value.gold, 0),
    stage: Math.max(1, n(value.stage, 1, 9999)),
    bestStage: Math.max(1, n(value.bestStage, 1, 9999)),
    swordLevel: Math.max(1, n(value.swordLevel, 1, 9999)),
    heroes,
    totalKills: n(value.totalKills, 0),
    totalTaps: n(value.totalTaps, 0),
    lastActiveAt: n(value.lastActiveAt, Date.now(), Date.now()),
  };
}

export function playerIdleDps(swordLevel: number): number {
  return Math.max(1, tapDamage(swordLevel) * 0.45);
}

export function formatGold(value: number): string {
  if (value >= 1e12) return `${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e4) return `${(value / 1e3).toFixed(1)}K`;
  return Math.floor(value).toLocaleString();
}

export function monsterHp(stage: number, boss: boolean): number {
  const base = 14 * Math.pow(1.38, stage - 1);
  return Math.max(8, Math.floor(base * (boss ? 11 : 1)));
}

export function killGold(stage: number, boss: boolean, chesterson: boolean): number {
  const base = 5 * Math.pow(1.26, stage - 1);
  let gold = base * (boss ? 7.5 : 1);
  if (chesterson) gold *= 10;
  gold *= huntingArea(stage).rewardMultiplier;
  return Math.max(1, Math.floor(gold));
}

export function stageClearBonus(stage: number): number {
  return Math.floor(28 * Math.pow(1.3, stage - 1));
}

export function tapDamage(swordLevel: number): number {
  return Math.max(1, Math.floor(1.2 * Math.pow(1.145, swordLevel - 1)));
}

export function swordUpgradeCost(level: number): number {
  return Math.floor(20 * Math.pow(1.17, level - 1));
}

export function heroUpgradeCost(def: TitanHeroDef, level: number): number {
  if (level <= 0) return def.baseCost;
  return Math.floor(def.baseCost * Math.pow(1.19, level));
}

export function heroDps(def: TitanHeroDef, level: number): number {
  if (level <= 0) return 0;
  const milestone =
    (level >= 10 ? 1.5 : 1) *
    (level >= 25 ? 2 : 1) *
    (level >= 50 ? 2.5 : 1) *
    (level >= 100 ? 3 : 1);
  return def.baseDps * Math.pow(1.125, level - 1) * milestone;
}

export function totalHeroDps(heroes: Record<TitanHeroId, number>): number {
  return HEROES.reduce((sum, def) => sum + heroDps(def, heroes[def.id]), 0);
}

export function monsterKind(stage: number, boss: boolean, chesterson: boolean): TitanMonsterKind {
  if (boss) return "boss";
  if (chesterson) return "ogre";
  const pool = huntingArea(stage).normalKinds;
  return pool[(stage - 1) % pool.length];
}

export function monsterLabel(kind: TitanMonsterKind, chesterson: boolean, stage = 1): string {
  if (chesterson) return "황금 상자 몬스터";
  switch (kind) {
    case "slime":
      return "슬라임";
    case "goblin":
      return "고블린";
    case "wolf":
      return "그림자 늑대";
    case "ogre":
      return "오우거";
    case "dragon":
      return "새끼 용";
    case "boss":
      return huntingArea(stage).bossName;
  }
}
