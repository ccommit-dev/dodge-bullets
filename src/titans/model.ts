import { assetUrl } from "../asset";

export type TitanHeroId =
  | "mia"
  | "leon"
  | "sera"
  | "garen"
  | "ari"
  | "nox"
  | "luna"
  | "volt"
  // 얼터너티브 동료 (CRUMBLE_GAP §9) — 기존 동료의 재해석 버전, 상점 전용
  | "mia_dark"
  | "sera_light"
  | "pyro" | "marina" | "terra" | "zephyr" | "bronn"
  | "iris" | "cain" | "sylph" | "orion" | "ember";

export type TitanSkillId =
  | "strike" | "crit" | "clone" | "warcry" | "steel"
  | "pierce" | "frostEdge" | "emberCut"
  | "waterStep" | "stoneGuard" | "galeChain"
  | "thunderLink" | "bloodMoon" | "dragonBreath"
  | "meteor" | "tidalBurst" | "voidFinish"
  | "focus" | "guardianSoul" | "elementalMastery";
export type TitanSkillSlot = "starter" | "linkA" | "linkB" | "finisher" | "passive";

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
  background: string;
};

export const HUNTING_AREAS: HuntingAreaDef[] = [
  { id: "meadow", name: "새벽 초원", stageFrom: 1, stageTo: 5, normalKinds: ["slime", "goblin"], bossName: "이끼 골렘", rewardMultiplier: 1, sky: "#155e75", ground: "#166534", accent: "#67e8f9", background: assetUrl("titans/backgrounds/meadow.webp") },
  { id: "forest", name: "그림자 숲", stageFrom: 6, stageTo: 10, normalKinds: ["goblin", "wolf"], bossName: "월광 늑대왕", rewardMultiplier: 1.45, sky: "#1e3a5f", ground: "#14532d", accent: "#a7f3d0", background: assetUrl("titans/backgrounds/forest.webp") },
  { id: "ruins", name: "붉은 폐허", stageFrom: 11, stageTo: 15, normalKinds: ["wolf", "ogre"], bossName: "고대 오우거", rewardMultiplier: 2.05, sky: "#7f1d1d", ground: "#451a03", accent: "#fdba74", background: assetUrl("titans/backgrounds/ruins.webp") },
  { id: "volcano", name: "용암 협곡", stageFrom: 16, stageTo: 23, normalKinds: ["ogre", "dragon"], bossName: "화염 비룡", rewardMultiplier: 3.1, sky: "#7c2d12", ground: "#3f1d16", accent: "#fb7185", background: assetUrl("titans/backgrounds/volcano.webp") },
  { id: "abyss", name: "심연의 성", stageFrom: 24, stageTo: 9999, normalKinds: ["dragon", "wolf", "ogre"], bossName: "심연의 타이탄", rewardMultiplier: 5, sky: "#312e81", ground: "#1e1b4b", accent: "#c4b5fd", background: assetUrl("titans/backgrounds/abyss.webp") },
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
  feature: string;
  attackType: string;
  attackInterval: number;
};

export type TitanSkillDef = {
  id: TitanSkillId;
  name: string;
  desc: string;
  slot: TitanSkillSlot;
  element: "blade" | "wind" | "fire" | "earth" | "light";
  learnSpCost: number;
  learnCoreCost: number;
  maxLevel: number;
  cooldownSec: number;
  durationSec: number;
};

export type TitansSave = {
  gold: number;
  stage: number;
  bestStage: number;
  swordLevel: number;
  equipmentTraining: { weaponMastery: number; shoulderMastery: number };
  skillInventory: {
    learned: TitanSkillId[];
    levels: Record<TitanSkillId, number>;
    equipped: Partial<Record<TitanSkillSlot, TitanSkillId>>;
    skillCores: number;
  };
  heroes: Record<TitanHeroId, number>;
  totalKills: number;
  totalTaps: number;
  /** QoL — 스킬 자동 시전 (쿨타임 찬 액티브를 자동 사용) */
  autoSkill: boolean;
  /** QoL — 전투 배속. 공격·보스 타이머·쿨타임에 대칭 적용이라 밸런스 중립 */
  battleSpeed: 1 | 2;
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
    feature: "빠른 단검 연타 · 일반 몬스터 특화", attackType: "근접 2연격", attackInterval: .72,
  },
  {
    id: "leon",
    name: "궁수 레온",
    role: "원거리 지속딜",
    unlockStage: 3,
    baseCost: 230,
    baseDps: 6,
    hue: 145,
    feature: "약점 표식으로 보스 피해 증가", attackType: "원거리 화살", attackInterval: 1.05,
  },
  {
    id: "sera",
    name: "마법사 세라",
    role: "마법 광역딜",
    unlockStage: 6,
    baseCost: 950,
    baseDps: 28,
    hue: 280,
    feature: "마력탄 폭발로 범위 피해", attackType: "범위 마법", attackInterval: 1.3,
  },
  {
    id: "garen",
    name: "기사 가렌",
    role: "전열 탱커형 딜",
    unlockStage: 10,
    baseCost: 3_600,
    baseDps: 120,
    hue: 42,
    feature: "느리지만 강력한 대검 내려찍기", attackType: "중량 근접", attackInterval: 1.55,
  },
  {
    id: "ari",
    name: "용기사 아리",
    role: "화염 돌진",
    unlockStage: 16,
    baseCost: 15_500,
    baseDps: 620,
    hue: 12,
    feature: "화염 창으로 지속 피해 부여", attackType: "화염 돌진", attackInterval: 1.15,
  },
  {
    id: "nox",
    name: "암살자 녹스",
    role: "치명 특화",
    unlockStage: 24,
    baseCost: 65_000,
    baseDps: 3_200,
    hue: 310,
    feature: "쌍단검 두 번째 타격 치명 보정", attackType: "치명 연격", attackInterval: .62,
  },
  // luna·volt는 상점 전용 동료 — unlockStage 대신 보석 구매로 해금된다 (allies.ts 참조).
  // unlockStage 9999는 "스테이지로는 열리지 않음"의 표기.
  {
    id: "luna",
    name: "성기사 루나",
    role: "광역 성광 · 실드",
    unlockStage: 9999,
    baseCost: 18_500,
    baseDps: 1_100,
    hue: 48,
    feature: "성광 파동으로 광역 피해 · 파티 실드", attackType: "광역 성광", attackInterval: 1.4,
  },
  {
    id: "volt",
    name: "기계공 볼트",
    role: "포탑 지속딜",
    unlockStage: 9999,
    baseCost: 4_700,
    baseDps: 210,
    hue: 200,
    feature: "자동 포탑을 설치해 지속 사격", attackType: "포탑 사격", attackInterval: .9,
  },
  // 얼터너티브 동료 (§9) — 기존 로스터의 팔레트 재해석. 별도 성급을 갖는 독립 동료다.
  {
    id: "mia_dark",
    name: "흑화 미아",
    role: "심연 연격 딜러",
    unlockStage: 9999,
    baseCost: 8_500,
    baseDps: 380,
    hue: 265,
    feature: "어둠에 물든 단검 — 연격이 그림자 잔상을 남긴다", attackType: "근접 2연격", attackInterval: .68,
  },
  {
    id: "sera_light",
    name: "성광 세라",
    role: "광역 성광 폭발",
    unlockStage: 9999,
    baseCost: 21_000,
    baseDps: 1_250,
    hue: 50,
    feature: "빛으로 재해석된 마력탄 — 광역 성광 폭발", attackType: "범위 성광", attackInterval: 1.25,
  },
  { id:"pyro", name:"화염검 파이로", role:"화염 근접 딜러", unlockStage:8, baseCost:1_750, baseDps:55, hue:12, feature:"화상 중첩 후 폭발", attackType:"화염 쌍검", attackInterval:.78 },
  { id:"marina", name:"파도사제 마리나", role:"회복 지원", unlockStage:12, baseCost:2_650, baseDps:95, hue:195, feature:"아군 회복과 물 보호막", attackType:"수류 마법", attackInterval:1.45 },
  { id:"terra", name:"대지방패 테라", role:"전열 탱커", unlockStage:14, baseCost:4_700, baseDps:180, hue:82, feature:"공격을 막고 지진 반격", attackType:"방패 강타", attackInterval:1.6 },
  { id:"zephyr", name:"바람궁수 제피르", role:"고속 원거리", unlockStage:18, baseCost:17_000, baseDps:720, hue:155, feature:"관통 화살 연속 사격", attackType:"질풍 화살", attackInterval:.68 },
  { id:"bronn", name:"용암기사 브론", role:"중갑 근접", unlockStage:22, baseCost:35_000, baseDps:1_650, hue:25, feature:"피격 시 용암 반격", attackType:"용암 대검", attackInterval:1.35 },
  { id:"iris", name:"빙결술사 아이리스", role:"제어 원거리", unlockStage:26, baseCost:84_000, baseDps:4_300, hue:205, feature:"적 공격 속도를 낮추는 빙결", attackType:"빙결 창", attackInterval:1.18 },
  { id:"cain", name:"뇌광검 카인", role:"치명 근접", unlockStage:30, baseCost:210_000, baseDps:11_500, hue:55, feature:"치명타마다 연쇄 번개", attackType:"뇌광 발도", attackInterval:.58 },
  { id:"sylph", name:"정령왕 실프", role:"바람 지원", unlockStage:34, baseCost:470_000, baseDps:28_000, hue:135, feature:"파티 공격 속도 강화", attackType:"정령 탄환", attackInterval:.82 },
  { id:"orion", name:"성창 오리온", role:"보스 전문", unlockStage:40, baseCost:1_150_000, baseDps:75_000, hue:225, feature:"보스에게 성창 추가 피해", attackType:"성창 투척", attackInterval:1.05 },
  { id:"ember", name:"불사조 엠버", role:"전설 광역 딜러", unlockStage:48, baseCost:2_800_000, baseDps:210_000, hue:350, feature:"전장을 태우는 불사조 폭발", attackType:"불사조 강하", attackInterval:1.3 },
];

export const SKILLS: TitanSkillDef[] = [
  // 설명은 titans/skills.ts SKILL_EFFECTS의 실제 효과와 1:1로 맞춘다 — 숫자는 카드가 skillEffectLabel로 보여준다.
  // ── 시동기 4종: 탭 배율 단발 + 서로 다른 부가 효과 ──
  { id: "strike", name: "초승 검격", desc: "기본 시동기 — 빠른 단일 검격", slot: "starter", element: "blade", learnSpCost: 2, learnCoreCost: 0, maxLevel: 20, cooldownSec: 12, durationSec: 0 },
  { id: "pierce", name: "관통 찌르기", desc: "가장 강한 단발 시동기", slot: "starter", element: "blade", learnSpCost: 3, learnCoreCost: 1, maxLevel: 20, cooldownSec: 10, durationSec: 0 },
  { id: "emberCut", name: "잔불 베기", desc: "타격 후 화상 — 초당 탭 피해가 이어진다", slot: "starter", element: "fire", learnSpCost: 4, learnCoreCost: 1, maxLevel: 20, cooldownSec: 9, durationSec: 5 },
  { id: "frostEdge", name: "서리 칼날", desc: "타격 후 빙결 — 보스 제한시간이 멈춘다", slot: "starter", element: "wind", learnSpCost: 4, learnCoreCost: 1, maxLevel: 20, cooldownSec: 11, durationSec: 4 },
  // ── 연계 A 4종: 치명 · 짧은 치명 · 동료 강화 · 영웅 가속 ──
  { id: "crit", name: "질풍 보법", desc: "치명 확률 대폭 상승", slot: "linkA", element: "wind", learnSpCost: 4, learnCoreCost: 1, maxLevel: 20, cooldownSec: 22, durationSec: 8 },
  { id: "waterStep", name: "수면 보법", desc: "짧고 자주 — 치명 확률 상승", slot: "linkA", element: "wind", learnSpCost: 5, learnCoreCost: 1, maxLevel: 20, cooldownSec: 18, durationSec: 7 },
  { id: "stoneGuard", name: "대지 수호", desc: "동료 전원의 공격력 강화 — 후반 핵심", slot: "linkA", element: "earth", learnSpCost: 6, learnCoreCost: 2, maxLevel: 20, cooldownSec: 21, durationSec: 9 },
  { id: "galeChain", name: "질풍 연계", desc: "영웅 자동 공격 속도 2배", slot: "linkA", element: "wind", learnSpCost: 7, learnCoreCost: 2, maxLevel: 20, cooldownSec: 16, durationSec: 6 },
  // ── 연계 B 4종: 분신 · 동료 번개 · 강한 분신 · 보스 화상 ──
  { id: "clone", name: "화염 분신", desc: "탭 피해 2배", slot: "linkB", element: "fire", learnSpCost: 6, learnCoreCost: 2, maxLevel: 20, cooldownSec: 30, durationSec: 10 },
  { id: "thunderLink", name: "뇌광 연쇄", desc: "동료 공격에 번개 — 동료 피해 상승", slot: "linkB", element: "light", learnSpCost: 8, learnCoreCost: 2, maxLevel: 20, cooldownSec: 25, durationSec: 9 },
  { id: "bloodMoon", name: "혈월 난무", desc: "짧고 강한 분신 — 탭 피해 2.4배", slot: "linkB", element: "blade", learnSpCost: 9, learnCoreCost: 3, maxLevel: 20, cooldownSec: 28, durationSec: 8 },
  { id: "dragonBreath", name: "용염 숨결", desc: "보스 전용 화상 — 초당 탭 피해 ×10", slot: "linkB", element: "fire", learnSpCost: 10, learnCoreCost: 3, maxLevel: 20, cooldownSec: 30, durationSec: 10 },
  // ── 마무리 4종: 파티 고무 · 최대 단발 · 빙결 · 처형 ──
  { id: "warcry", name: "별빛 처형", desc: "마무리 타격 후 동료를 고무한다", slot: "finisher", element: "light", learnSpCost: 9, learnCoreCost: 3, maxLevel: 20, cooldownSec: 40, durationSec: 12 },
  { id: "meteor", name: "유성 낙하", desc: "가장 강한 단발 마무리", slot: "finisher", element: "fire", learnSpCost: 12, learnCoreCost: 4, maxLevel: 20, cooldownSec: 38, durationSec: 0 },
  { id: "tidalBurst", name: "해일 폭발", desc: "타격 후 빙결 — 보스 제한시간 정지", slot: "finisher", element: "wind", learnSpCost: 12, learnCoreCost: 4, maxLevel: 20, cooldownSec: 36, durationSec: 4 },
  { id: "voidFinish", name: "심연 절단", desc: "보스 HP 30% 미만이면 처형 배율", slot: "finisher", element: "blade", learnSpCost: 15, learnCoreCost: 5, maxLevel: 20, cooldownSec: 42, durationSec: 0 },
  // ── 패시브 4종: 탭 · 치명 · 보스 시간 · 동료 ──
  { id: "steel", name: "강철 호흡", desc: "탭 피해 상시 증가", slot: "passive", element: "earth", learnSpCost: 5, learnCoreCost: 1, maxLevel: 20, cooldownSec: 0, durationSec: 0 },
  { id: "focus", name: "검심 집중", desc: "치명 확률 상시 증가", slot: "passive", element: "blade", learnSpCost: 7, learnCoreCost: 2, maxLevel: 20, cooldownSec: 0, durationSec: 0 },
  { id: "guardianSoul", name: "수호자의 혼", desc: "보스 제한시간 상시 연장", slot: "passive", element: "earth", learnSpCost: 8, learnCoreCost: 2, maxLevel: 20, cooldownSec: 0, durationSec: 0 },
  { id: "elementalMastery", name: "원소 공명", desc: "동료 피해 상시 증가", slot: "passive", element: "light", learnSpCost: 10, learnCoreCost: 3, maxLevel: 20, cooldownSec: 0, durationSec: 0 },
];

export function emptySkillLevels(): Record<TitanSkillId, number> { return Object.fromEntries(SKILLS.map((skill) => [skill.id, 0])) as Record<TitanSkillId, number>; }
export function defaultSkillInventory(): TitansSave["skillInventory"] { return { learned: ["strike"], levels: { ...emptySkillLevels(), strike: 1 }, equipped: { starter: "strike" }, skillCores: 0 }; }

export function emptyHeroLevels(): Record<TitanHeroId, number> {
  return Object.fromEntries(HEROES.map((hero) => [hero.id, 0])) as Record<TitanHeroId, number>;
}

export function defaultTitansSave(): TitansSave {
  return {
    gold: 0,
    stage: 1,
    bestStage: 1,
    swordLevel: 1,
    equipmentTraining: { weaponMastery: 1, shoulderMastery: 0 },
    skillInventory: defaultSkillInventory(),
    heroes: emptyHeroLevels(),
    totalKills: 0,
    totalTaps: 0,
    autoSkill: false,
    battleSpeed: 1,
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
  const legacySword = Math.max(1, n(value.swordLevel, 1, 9999));
  const learned = Array.isArray(value.skillInventory?.learned)
    ? value.skillInventory.learned.filter((id): id is TitanSkillId => SKILLS.some((skill) => skill.id === id))
    : (["strike", "crit", "clone", "warcry", "steel"] as TitanSkillId[]).filter((_id, index) => legacySword >= [1, 8, 15, 25, 30][index]);
  const levels = emptySkillLevels();
  for (const skill of SKILLS) levels[skill.id] = n(value.skillInventory?.levels?.[skill.id], learned.includes(skill.id) ? 1 : 0, skill.maxLevel);
  const equipped: Partial<Record<TitanSkillSlot, TitanSkillId>> = {};
  // 장착 맵이 있는 세이브는 그대로 존중한다(학습한 스킬만 통과). 빈 슬롯을 자동으로 채우면
  // 프리셋·수동 해제가 저장 시점에 되돌아간다. 장착 맵이 아예 없는 레거시 세이브만 자동 장착.
  const storedEquipped = value.skillInventory?.equipped;
  if (storedEquipped) {
    for (const skill of SKILLS) if (learned.includes(skill.id) && storedEquipped[skill.slot] === skill.id) equipped[skill.slot] = skill.id;
  } else {
    for (const skill of SKILLS) if (learned.includes(skill.id)) equipped[skill.slot] = equipped[skill.slot] ?? skill.id;
  }
  return {
    gold: n(value.gold, 0),
    stage: Math.max(1, n(value.stage, 1, 9999)),
    bestStage: Math.max(1, n(value.bestStage, 1, 9999)),
    swordLevel: legacySword,
    equipmentTraining: {
      weaponMastery: Math.max(1, n(value.equipmentTraining?.weaponMastery, legacySword, 9999)),
      shoulderMastery: n(value.equipmentTraining?.shoulderMastery, 0, 9999),
    },
    skillInventory: { learned: [...new Set(learned)], levels, equipped, skillCores: n(value.skillInventory?.skillCores, 0, 9999) },
    heroes,
    totalKills: n(value.totalKills, 0),
    totalTaps: n(value.totalTaps, 0),
    autoSkill: value.autoSkill === true,
    battleSpeed: value.battleSpeed === 2 ? 2 : 1,
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
  // 첫 세션 곡선 (RETENTION E): Stage 1~4는 HP를 감쇠해 신규가 5분 안에 Stage 5(원정 개방)에
  // 닿게 한다. scripts/first-session-probe.mjs로 측정 — 감쇠 없이는 547초가 걸렸다.
  const earlyRelief = stage < 5 ? 0.5 + 0.125 * (stage - 1) : 1;
  return Math.max(8, Math.floor(base * earlyRelief * (boss ? 11 : 1)));
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
  // 하한 2 — 첫 탭이 1이면 초반 몬스터(HP 7~14)를 10번 넘게 눌러야 해 첫 60초가 늘어진다
  return Math.max(2, Math.floor(1.2 * Math.pow(1.145, swordLevel - 1)));
}

export function swordUpgradeCost(level: number): number {
  return Math.floor(20 * Math.pow(1.17, level - 1));
}
export function equipmentTrainingCost(slot: "weapon" | "shoulder", level: number): number { return Math.floor((slot === "weapon" ? 20 : 34) * Math.pow(slot === "weapon" ? 1.17 : 1.19, level)); }

export function heroUpgradeCost(def: TitanHeroDef, level: number): number {
  if (level <= 0) return def.baseCost;
  return Math.floor(def.baseCost * Math.pow(1.19, level));
}

/**
 * 일괄 구매 견적 (QoL) — amount 레벨(0 = MAX)까지, 골드가 허용하는 만큼.
 * ×10도 부분 구매를 허용한다: 7레벨만 살 수 있으면 7을 산다. "10 못 사면 0"보다
 * 후반 연타 피로를 줄이는 목적에 충실하다.
 */
export function bulkUpgradeQuote(
  costOf: (level: number) => number,
  fromLevel: number,
  gold: number,
  amount: number,
): { count: number; cost: number } {
  const limit = amount <= 0 ? 999 : amount;
  let count = 0;
  let cost = 0;
  let level = fromLevel;
  while (count < limit) {
    const next = costOf(level);
    if (cost + next > gold) break;
    cost += next;
    level += 1;
    count += 1;
  }
  return { count, cost };
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

/** starMultOf — 동료별 성급 배율 콜백 (allies.ts starMultiplier). 생략 시 ×1. */
export function totalHeroDps(
  heroes: Record<TitanHeroId, number>,
  starMultOf?: (id: TitanHeroId) => number,
): number {
  return HEROES.reduce((sum, def) => sum + heroDps(def, heroes[def.id]) * (starMultOf?.(def.id) ?? 1), 0);
}

export function monsterKind(stage: number, boss: boolean, chesterson: boolean): TitanMonsterKind {
  if (boss) return "boss";
  if (chesterson) return "ogre";
  const pool = huntingArea(stage).normalKinds;
  return pool[(stage - 1) % pool.length];
}

export function monsterLabel(kind: TitanMonsterKind, chesterson: boolean, stage = 1): string {
  if (chesterson) return "황금사자";
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
