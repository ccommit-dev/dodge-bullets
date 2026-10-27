import { emptyHuntMods, type HuntMods } from "./huntPerks";
import { NEW_ALLIES, newAllyBaseCost, newAllyBaseDps, type NewAllyId } from "./allyRoster";
import { emptyAcorns, normalizeAcorns, type AcornState } from "./acorns";
import { emptyQuests, normalizeQuests, type QuestState } from "./quests";
import { assetUrl } from "../asset";
import { huntBossVariant, huntMonsterVariant } from "./bestiary";

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
  | "iris" | "cain" | "sylph" | "orion" | "ember"
  // 동료 3배 (2026-10-27) — 새 40명은 titans/allyRoster.ts
  | NewAllyId;

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
  /** 장비 숙련 — 무기·견갑 + 파츠 4종(투구·갑옷·장갑·신발, 2026-10-14 equipment/parts) */
  equipmentTraining: { weaponMastery: number; shoulderMastery: number; helmetMastery: number; armorMastery: number; glovesMastery: number; bootsMastery: number };
  skillInventory: {
    learned: TitanSkillId[];
    levels: Record<TitanSkillId, number>;
    equipped: Partial<Record<TitanSkillSlot, TitanSkillId>>;
    skillCores: number;
    /** 무기별 스킬 세트 (2026-10-27, "변하는 무기마다 스킬도 무기에 따라 설정할 수 있게") — 무기를 바꾸면 equipped 와 맞바꾼다 */
    loadouts?: Partial<Record<"sword" | "spear" | "bow" | "staff", Partial<Record<TitanSkillSlot, TitanSkillId>>>>;
    /** 지금 equipped 가 어느 무기의 세트인가 — 장착 무기와 다르면 사냥터가 맞바꾼다(대장간에서 무기를 바꿔도 따라온다) */
    loadoutKind?: "sword" | "spear" | "bow" | "staff";
  };
  heroes: Record<TitanHeroId, number>;
  /** 은퇴한 동료·스킬의 환불 — 진행도(보석·SP)에 아직 안 얹은 것. TitansGame 부팅이 얹고 비운다 */
  pendingRefund: { gems: number; sp: number } | null;
  totalKills: number;
  totalTaps: number;
  /** QoL — 스킬 자동 시전 (쿨타임 찬 액티브를 자동 사용) */
  autoSkill: boolean;
  /** QoL — 전투 배속. 공격·보스 타이머·쿨타임에 대칭 적용이라 밸런스 중립 */
  battleSpeed: 1 | 2;
  lastActiveAt: number;
  /** 사냥 강화 (2026-10-08, titans/huntPerks.ts) — 지역 안에서 쌓이는 런 효과. 새 지역·환생에 비워진다 */
  huntMods: HuntMods;
  /** 아직 안 고른 사냥 강화 선택권 — 보스 처치마다 +1, 최대 HUNT_PICK_CAP */
  huntPicks: number;
  /** 도토리 탄약 합성 (2026-10-22, titans/acorns.ts) */
  acorns: AcornState;
  /** 탭 번개 강화 단계 (2026-10-22) — 탭 피해 ×(1 + 0.12·단계) · 번개 연출 */
  lightningLevel: number;
  /** 퀘스트 — 시간마다 골드 (titans/quests.ts, 2026-10-26) · 환생하면 첫 줄 Lv.1 로 */
  quests: QuestState;
};

export const MOBS_PER_STAGE = 10;
export const BOSS_TIME_SEC = 30;

/**
 * 은퇴한 동료·스킬 (2026-10-01) — 역할·속성이 겹쳐 "무분별하게 많다"고 지적된 것들. 타입과 표(ALLY_ROLE 등)는 남겨
 * 예전 저장을 읽되, 로스터(HEROES)·뽑기·상점·도감·스킨에서는 뺀다. 보유분은 normalizeTitansSave 가 환불로 바꾼다.
 *   동료 13 남김: 근딜 미아·아리·녹스·파이로 / 원딜 레온·세라·볼트·오리온·엠버 / 탱커 가렌·브론 / 힐러 루나·마리나
 *   스킬 12 남김: 시동기 3 (기본·화상·빙결) · 연계 A 2 (치명·동료) · 연계 B 2 (분신·동료) · 마무리 2 (한 방·처형) · 패시브 3 (탭·보스 시간·동료)
 */
export const RETIRED_ALLY_IDS: readonly TitanHeroId[] = ["cain", "mia_dark", "zephyr", "iris", "terra", "sylph", "sera_light"];
export const RETIRED_SKILL_IDS: readonly TitanSkillId[] = ["pierce", "waterStep", "galeChain", "bloodMoon", "dragonBreath", "warcry", "tidalBurst", "focus"];
/** 은퇴 동료 보유분 환불(보석) — 등급별 + 상점 동료는 산 값 */
export const RETIRED_ALLY_REFUND_GEMS: Record<"R" | "SR" | "SSR", number> = { R: 100, SR: 200, SSR: 400 };
/** 은퇴 동료의 등급·상점가 — allies.ts 의 표와 같아야 한다 (verify-systems 대조). allies 가 이 파일을 타입으로만 쓰므로 순환을 피해 여기 둔다 */
export const RETIRED_ALLY_RARITY: Partial<Record<TitanHeroId, "R" | "SR" | "SSR">> = { cain: "SSR", mia_dark: "SR", zephyr: "SR", iris: "SSR", terra: "SR", sylph: "SSR", sera_light: "SSR" };
export const RETIRED_ALLY_SHOP_GEMS: Partial<Record<TitanHeroId, number>> = { mia_dark: 600, sera_light: 1100 };

/** 전체 정의(은퇴 포함) — 저장 이관·환불이 읽는다 */
export const ALL_HEROES: TitanHeroDef[] = [
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
    feature: "약점 표식 — 보스 약점 창 +2초", attackType: "원거리 화살", attackInterval: 1.05,
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
    feature: "치명 연계 — 치명 스킬 명중 뒤 +30% 추가 타", attackType: "치명 연격", attackInterval: .62,
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
    feature: "성광 결박 — 빙결 지속 +30%", attackType: "광역 성광", attackInterval: 1.4,
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
  { id:"pyro", name:"화염검 파이로", role:"화염 근접 딜러", unlockStage:8, baseCost:1_750, baseDps:55, hue:12, feature:"화상 중첩 — 화상 틱 피해 ×1.5", attackType:"화염 쌍검", attackInterval:.78 },
  { id:"marina", name:"파도사제 마리나", role:"회복 지원", unlockStage:12, baseCost:2_650, baseDps:95, hue:195, feature:"아군 회복과 물 보호막", attackType:"수류 마법", attackInterval:1.45 },
  { id:"terra", name:"대지방패 테라", role:"전열 탱커", unlockStage:14, baseCost:4_700, baseDps:180, hue:82, feature:"공격을 막고 지진 반격", attackType:"방패 강타", attackInterval:1.6 },
  { id:"zephyr", name:"바람궁수 제피르", role:"고속 원거리", unlockStage:18, baseCost:17_000, baseDps:720, hue:155, feature:"관통 화살 연속 사격", attackType:"질풍 화살", attackInterval:.68 },
  { id:"bronn", name:"용암기사 브론", role:"중갑 근접", unlockStage:22, baseCost:35_000, baseDps:1_650, hue:25, feature:"피격 시 용암 반격", attackType:"용암 대검", attackInterval:1.35 },
  { id:"iris", name:"빙결술사 아이리스", role:"제어 원거리", unlockStage:26, baseCost:84_000, baseDps:4_300, hue:205, feature:"적 공격 속도를 낮추는 빙결", attackType:"빙결 창", attackInterval:1.18 },
  { id:"cain", name:"뇌광검 카인", role:"치명 근접", unlockStage:30, baseCost:210_000, baseDps:11_500, hue:55, feature:"치명타마다 연쇄 번개", attackType:"뇌광 발도", attackInterval:.58 },
  { id:"sylph", name:"정령왕 실프", role:"바람 지원", unlockStage:34, baseCost:470_000, baseDps:28_000, hue:135, feature:"파티 공격 속도 강화", attackType:"정령 탄환", attackInterval:.82 },
  { id:"orion", name:"성창 오리온", role:"보스 전문", unlockStage:30, baseCost:1_150_000, baseDps:75_000, hue:225, feature:"성창 — 보스에게 피해 +15%", attackType:"성창 투척", attackInterval:1.05 },
  { id:"ember", name:"불사조 엠버", role:"전설 광역 딜러", unlockStage:48, baseCost:2_800_000, baseDps:210_000, hue:350, feature:"전장을 태우는 불사조 폭발", attackType:"불사조 강하", attackInterval:1.3 },
];

// 동료 3배 (2026-10-27) — 새 40명. 열리는 층 · 힘은 allyRoster(기존 동료의 층별 곡선 × 등급 배율)
ALL_HEROES.push(...NEW_ALLIES.map((d): TitanHeroDef => ({
  id: d.id, name: d.name, role: d.feature, unlockStage: d.stage, baseCost: newAllyBaseCost(d), baseDps: newAllyBaseDps(d),
  hue: d.hue, feature: d.feature, attackType: d.attackType, attackInterval: d.attackInterval,
})));

/** 로스터 — 은퇴 동료를 뺀 것 */
export const HEROES: TitanHeroDef[] = ALL_HEROES.filter((h) => !RETIRED_ALLY_IDS.includes(h.id));

export const ALL_SKILLS: TitanSkillDef[] = [
  // 설명은 titans/skills.ts SKILL_EFFECTS의 실제 효과와 1:1로 맞춘다 — 숫자는 카드가 skillEffectLabel로 보여준다.
  // 2026-10-07 비버 키우기: 이름만 북·도토리·댐 테마로 (id · 효과 · 수치 불변 — 저장 호환)
  // ── 시동기 4종: 탭 배율 단발 + 서로 다른 부가 효과 ──
  { id: "strike", name: "도토리 북치기", desc: "기본 시동기 — 북 한 타", slot: "starter", element: "blade", learnSpCost: 2, learnCoreCost: 0, maxLevel: 20, cooldownSec: 12, durationSec: 0 },
  { id: "pierce", name: "통나무 돌진", desc: "가장 강한 단발 시동기", slot: "starter", element: "blade", learnSpCost: 3, learnCoreCost: 1, maxLevel: 20, cooldownSec: 10, durationSec: 0 },
  { id: "emberCut", name: "불꽃 장작 타", desc: "타격 후 화상 — 초당 탭 피해가 이어진다", slot: "starter", element: "fire", learnSpCost: 4, learnCoreCost: 1, maxLevel: 20, cooldownSec: 9, durationSec: 5 },
  { id: "frostEdge", name: "얼음 물방울", desc: "타격 후 빙결 — 보스 제한시간이 멈춘다", slot: "starter", element: "wind", learnSpCost: 4, learnCoreCost: 1, maxLevel: 20, cooldownSec: 11, durationSec: 4 },
  // ── 연계 A 4종: 치명 · 짧은 치명 · 동료 강화 · 영웅 가속 ──
  { id: "crit", name: "꼬리 치기 박자", desc: "치명 확률 대폭 상승", slot: "linkA", element: "wind", learnSpCost: 4, learnCoreCost: 1, maxLevel: 20, cooldownSec: 22, durationSec: 8 },
  { id: "waterStep", name: "물수제비 스텝", desc: "짧고 자주 — 치명 확률 상승", slot: "linkA", element: "wind", learnSpCost: 5, learnCoreCost: 1, maxLevel: 20, cooldownSec: 18, durationSec: 7 },
  { id: "stoneGuard", name: "댐 방벽 북소리", desc: "동료 전원의 공격력 강화 — 후반 핵심", slot: "linkA", element: "earth", learnSpCost: 6, learnCoreCost: 2, maxLevel: 20, cooldownSec: 21, durationSec: 9 },
  { id: "galeChain", name: "급류 연타", desc: "영웅 자동 공격 속도 2배", slot: "linkA", element: "wind", learnSpCost: 7, learnCoreCost: 2, maxLevel: 20, cooldownSec: 16, durationSec: 6 },
  // ── 연계 B 4종: 분신 · 동료 번개 · 강한 분신 · 보스 화상 ──
  { id: "clone", name: "불씨 더블 비트", desc: "탭 피해 2배", slot: "linkB", element: "fire", learnSpCost: 6, learnCoreCost: 2, maxLevel: 20, cooldownSec: 30, durationSec: 10 },
  { id: "thunderLink", name: "번개 합주", desc: "동료 공격에 번개 — 동료 피해 상승", slot: "linkB", element: "light", learnSpCost: 8, learnCoreCost: 2, maxLevel: 20, cooldownSec: 25, durationSec: 9 },
  { id: "bloodMoon", name: "붉은 달 난타", desc: "짧고 강한 분신 — 탭 피해 2.4배", slot: "linkB", element: "blade", learnSpCost: 9, learnCoreCost: 3, maxLevel: 20, cooldownSec: 28, durationSec: 8 },
  { id: "dragonBreath", name: "용암 북 울림", desc: "보스 전용 화상 — 초당 탭 피해 ×10", slot: "linkB", element: "fire", learnSpCost: 10, learnCoreCost: 3, maxLevel: 20, cooldownSec: 30, durationSec: 10 },
  // ── 마무리 4종: 파티 고무 · 최대 단발 · 빙결 · 처형 ──
  { id: "warcry", name: "별빛 피날레", desc: "마무리 타격 후 동료를 고무한다", slot: "finisher", element: "light", learnSpCost: 9, learnCoreCost: 3, maxLevel: 20, cooldownSec: 40, durationSec: 12 },
  { id: "meteor", name: "도토리 유성우", desc: "가장 강한 단발 마무리", slot: "finisher", element: "fire", learnSpCost: 12, learnCoreCost: 4, maxLevel: 20, cooldownSec: 38, durationSec: 0 },
  { id: "tidalBurst", name: "댐 수문 개방", desc: "타격 후 빙결 — 보스 제한시간 정지", slot: "finisher", element: "wind", learnSpCost: 12, learnCoreCost: 4, maxLevel: 20, cooldownSec: 36, durationSec: 4 },
  { id: "voidFinish", name: "가시덤불 처형", desc: "보스 HP 30% 미만이면 처형 배율", slot: "finisher", element: "blade", learnSpCost: 15, learnCoreCost: 5, maxLevel: 20, cooldownSec: 42, durationSec: 0 },
  // ── 패시브 4종: 탭 · 치명 · 보스 시간 · 동료 ──
  { id: "steel", name: "단단한 앞니", desc: "탭 피해 상시 증가", slot: "passive", element: "earth", learnSpCost: 5, learnCoreCost: 1, maxLevel: 20, cooldownSec: 0, durationSec: 0 },
  { id: "focus", name: "북채 집중", desc: "치명 확률 상시 증가", slot: "passive", element: "blade", learnSpCost: 7, learnCoreCost: 2, maxLevel: 20, cooldownSec: 0, durationSec: 0 },
  { id: "guardianSoul", name: "댐지기의 혼", desc: "보스 제한시간 상시 연장", slot: "passive", element: "earth", learnSpCost: 8, learnCoreCost: 2, maxLevel: 20, cooldownSec: 0, durationSec: 0 },
  { id: "elementalMastery", name: "숲의 공명", desc: "동료 피해 상시 증가", slot: "passive", element: "light", learnSpCost: 10, learnCoreCost: 3, maxLevel: 20, cooldownSec: 0, durationSec: 0 },
];

/** 스킬 목록 — 은퇴 스킬을 뺀 것 */
export const SKILLS: TitanSkillDef[] = ALL_SKILLS.filter((s) => !RETIRED_SKILL_IDS.includes(s.id));

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
    equipmentTraining: { weaponMastery: 1, shoulderMastery: 0, helmetMastery: 0, armorMastery: 0, glovesMastery: 0, bootsMastery: 0 },
    skillInventory: defaultSkillInventory(),
    heroes: emptyHeroLevels(),
    pendingRefund: null,
    totalKills: 0,
    totalTaps: 0,
    autoSkill: false,
    battleSpeed: 1,
    lastActiveAt: Date.now(),
    huntMods: emptyHuntMods(),
    huntPicks: 0,
    acorns: emptyAcorns(),
    lightningLevel: 0,
    quests: emptyQuests(),
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
  // 은퇴 환불 — 보유하던 은퇴 동료는 등급별 보석(+상점가), 배운 은퇴 스킬은 SP·코어를 돌려준다. 한 번만: 이 함수가 지운 뒤에는 원본에 없다
  const refund = { gems: value.pendingRefund?.gems ?? 0, sp: value.pendingRefund?.sp ?? 0, cores: 0 };
  for (const h of ALL_HEROES) {
    if (!RETIRED_ALLY_IDS.includes(h.id) || n(value.heroes?.[h.id], 0, 9999) <= 0) continue;
    refund.gems += RETIRED_ALLY_REFUND_GEMS[RETIRED_ALLY_RARITY[h.id] ?? "R"] + (RETIRED_ALLY_SHOP_GEMS[h.id] ?? 0);
  }
  const rawLearned = Array.isArray(value.skillInventory?.learned) ? value.skillInventory.learned : [];
  for (const sk of ALL_SKILLS) {
    if (!RETIRED_SKILL_IDS.includes(sk.id) || !rawLearned.includes(sk.id)) continue;
    refund.sp += sk.learnSpCost; refund.cores += sk.learnCoreCost;
  }
  const learned = Array.isArray(value.skillInventory?.learned)
    ? value.skillInventory.learned.filter((id): id is TitanSkillId => SKILLS.some((skill) => skill.id === id))
    : (["strike", "crit", "clone", "meteor", "steel"] as TitanSkillId[]).filter((_id, index) => legacySword >= [1, 8, 15, 25, 30][index]);
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
      helmetMastery: n(value.equipmentTraining?.helmetMastery, 0, 9999),
      armorMastery: n(value.equipmentTraining?.armorMastery, 0, 9999),
      glovesMastery: n(value.equipmentTraining?.glovesMastery, 0, 9999),
      bootsMastery: n(value.equipmentTraining?.bootsMastery, 0, 9999),
    },
    skillInventory: {
      learned: [...new Set(learned)], levels, equipped, skillCores: n(value.skillInventory?.skillCores, 0, 9999) + refund.cores,
      // 무기별 스킬 세트 — 배운 스킬 · 맞는 칸만 남긴다
      loadouts: Object.fromEntries(Object.entries((value.skillInventory as { loadouts?: Record<string, Partial<Record<TitanSkillSlot, TitanSkillId>>> } | undefined)?.loadouts ?? {})
        .filter(([k]) => k === "sword" || k === "spear" || k === "bow" || k === "staff")
        .map(([k, eq]) => [k, Object.fromEntries(Object.entries(eq ?? {}).filter(([slot, id]) => learned.includes(id as TitanSkillId) && SKILLS.find((sk) => sk.id === id)?.slot === slot))])),
      loadoutKind: ((k) => (k === "spear" || k === "bow" || k === "staff" || k === "sword" ? k : undefined))((value.skillInventory as { loadoutKind?: unknown } | undefined)?.loadoutKind),
    },
    heroes,
    pendingRefund: refund.gems > 0 || refund.sp > 0 ? { gems: refund.gems, sp: refund.sp } : null,
    totalKills: n(value.totalKills, 0),
    totalTaps: n(value.totalTaps, 0),
    autoSkill: value.autoSkill === true,
    battleSpeed: value.battleSpeed === 2 ? 2 : 1,
    lastActiveAt: n(value.lastActiveAt, Date.now(), Date.now()),
    // 사냥 강화 3택은 뺐다(2026-10-21, 사용자: "사냥터에서도 3개중 하나 선택하는 내용은 제거") — 남은 강화 · 선택권도 중립으로
    huntMods: emptyHuntMods(),
    huntPicks: 0,
    acorns: normalizeAcorns((value as { acorns?: unknown }).acorns),
    lightningLevel: n((value as { lightningLevel?: unknown }).lightningLevel, 0, 500),
    quests: normalizeQuests((value as { quests?: unknown }).quests),
  };
}

export function playerIdleDps(swordLevel: number): number {
  return Math.max(1, tapDamage(swordLevel) * 0.45);
}

export function formatGold(value: number): string {
  // 반올림 경계 (2026-10-12, 사용자: "금액 잘림"): 999,950 은 "1000.0K" 가 아니라 "1.00M" — 자릿수가 한 칸 늘어 지갑 칩에서 잘렸다
  if (value >= 999.5e9) return `${(value / 1e12).toFixed(2)}T`;
  if (value >= 999.5e6) return `${(value / 1e9).toFixed(2)}B`;
  if (value >= 999.95e3) return `${(value / 1e6).toFixed(2)}M`;
  if (value >= 9999.5) return `${(value / 1e3).toFixed(1)}K`;
  return Math.floor(value).toLocaleString();
}

export function monsterHp(stage: number, boss: boolean): number {
  const base = 14 * Math.pow(1.38, stage - 1);
  // 첫 세션 곡선 (RETENTION E): Stage 1~4는 HP를 감쇠해 신규가 5분 안에 Stage 5(원정 개방)에
  // 닿게 한다. scripts/first-session-probe.mjs로 측정 — 감쇠 없이는 547초가 걸렸다.
  const earlyRelief = stage < 5 ? 0.4 + 0.08 * (stage - 1) : 1;
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
  // 단계마다 최소 +1 (2026-10-22, 아처 키우기 "효과가 안 보이는 강화" 피하기) — 예전 floor(1.2·1.145^n) 는 Lv1~6 이 전부 2 라 무기 숙련을 올려도 탭 피해가 그대로였다.
  // 지수 성장은 그대로 두고 단계만큼 더해 초반에도 숫자가 오른다(후반은 지수 항이 압도해 거의 같다)
  return Math.max(2, Math.floor(1 + swordLevel + 1.2 * (Math.pow(1.145, swordLevel - 1) - 1)));
}

export function swordUpgradeCost(level: number): number {
  return Math.floor(20 * Math.pow(1.17, level - 1));
}
/** 환생 출발 골드 (2026-10-22 아처 키우기 7번 "환생 직후 체감 이득") — 환생 전 최고 스테이지에 비례. 30 → 약 6K · 60 → 약 18만 */
export function rebirthStartGold(bestStage: number): number { return Math.floor(200 * Math.pow(1.12, Math.min(90, Math.max(1, bestStage)))); }
/** 환생 결정 — CharacterStatus 와 미리 보기가 같은 식을 쓴다 */
export function rebirthCrystals(bestStage: number): number { return Math.max(3, Math.floor(Math.sqrt(Math.max(0, bestStage)) * 3)); }
/** 첫 접속 환영 선물 (2026-10-22 아처 키우기 5번) — 동료 10연차(보석 900) 한 번 + 여유 */
export const WELCOME_GIFT_GEMS = 1000;
/** 깜짝 선물 — 환영 선물을 받은 새 계정의 첫 대장 처치 때 한 번 */
export const SURPRISE_GIFT_GEMS = 500;
/** 번개 (2026-10-22 아처 키우기 2번) — 무기 숙련과 따로 오르는 탭 강화 줄. 단계마다 탭 피해 +12% · LIGHTNING_EVERY 번째 탭마다 번개가 떨어진다 */
export const LIGHTNING_EVERY = 10;
export function lightningCost(level: number): number { return Math.floor(150 * Math.pow(1.24, level)); }
/** 탭 피해 배율 */
export function lightningTapMul(level: number): number { return 1 + 0.12 * Math.max(0, level); }
/** 번개 한 번 = 탭 기본 피해 × (4 + 0.5·단계). 0단계는 번개 없음 */
export function lightningBoltMul(level: number): number { return level > 0 ? 4 + 0.5 * level : 0; }
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
  // 지역 변종 이름 (2026-10-06 bestiary) — 그림과 이름이 같이 바뀐다
  const area = huntingArea(stage);
  const variant = kind === "boss" ? huntBossVariant(area, stage) : huntMonsterVariant(kind, area, stage);
  if (variant) return variant.name;
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
      return "보라 비룡";   // 2026-10-02 원화를 치비 새끼 용 → 반실사 드레이크로 다시 그리며 이름도
    case "boss":
      return huntingArea(stage).bossName;
  }
}
