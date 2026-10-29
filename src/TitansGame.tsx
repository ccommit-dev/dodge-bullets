import { createPortal } from "react-dom";
import { GEAR_PARTS, GEAR_PART_DEF, gearEffects, gearPartValue, gearTierOfEnhance, gearTrainingCost, type GearPart } from "./equipment/parts";
import { appWidth } from "./ui/webFrame";
import { AllySigInfo } from "./titans/AllySigInfo";
import { allySignature, isSignatureHit, signatureBaseMul, SIG_HALO_CD_SEC, SIG_QUAKE_FREEZE_MS, type SigFx } from "./titans/allySignature";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import { qaUnlockOpen, subscribeQaUnlock } from "./progression/qaUnlock";
import { heroFrameMs, heroFrames } from "./titans/spriteAnim";
import { heroPortrait } from "./titans/anim";
import type { SafeInsets } from "./game/toss";
import {
  ATTACK_CLIP_MS,
  preloadTitanSheets, CHARACTER_LABEL, type CharacterSkinId } from "./titans/anim";
import {
  BOSS_TIME_SEC,
  HEROES,
  MOBS_PER_STAGE,
  SKILLS,
  bulkUpgradeQuote,
  defaultTitansSave,
  formatGold,
  heroDps,
  heroUpgradeCost,
  killGold,
  monsterHp,
  monsterKind,
  monsterLabel,
  playerIdleDps,
  huntingArea,
  stageClearBonus,
  equipmentTrainingCost,
  SURPRISE_GIFT_GEMS,
  tapDamage,
  type TitanHeroId,
  type TitanMonsterKind,
  type TitanSkillId,
  type TitanSkillSlot,
  type TitansSave,
} from "./titans/model";
import { WEAK_LABEL, WEAK_MUL, WEAK_WINDOW_MS, allyHitsWeak, partyWeakMatches, rollBossWeak, skillHitsWeak, type BossWeak } from "./titans/bossWeak";
import { ALLY_FEATURES, allyFeatureEffects } from "./titans/allyFeatures";
import { bootsTierOf, glovesTierOf, shieldTierOf } from "./equipment/anchors";
import { GachaFx } from "./ui/GachaFx";
import { BOSS_ATTACK_GAP_MS, MOB_ATTACK_GAP_MS, bossHitFraction, bossPace, partyMaxHpLabel } from "./titans/bossPressure";
import { AllyArt, MonsterArt, formationCells, monsterAssetFor, monsterVisibleMargin } from "./titans/SpriteArt";
import { useTween } from "./ui/useTween";
import { ALLY_SKINS, skinPrice } from "./titans/skins";
import { FIRST_LR_STAGE, FIRST_TEN_SSR, GACHA, gachaPool, pullOnce, pullTen, rateTable, type PullResult } from "./titans/gacha";
import { BUFF_LABEL, ELEMENT_LABEL_KR, SKILL_EFFECTS, SKILL_PRESETS, SKILL_TIER, SLOT_LABEL, SLOT_ORDER, autoSkillOrder, buffDurationMs, passiveTotals, skillEffectLabel, skillLevelMult, skillPreviewPct, type BuffKind, type SkillPreset } from "./titans/skills";
import { GEM_PACK, TITLES, WEAPON_SKINS, goldPackAmount, weaponSkinIcon, weaponSkinStyle } from "./economy/gemCatalog";
import { loadTitansSave, saveTitansSave } from "./titans/storage";
import { PROGRESSION_BALANCE } from "./progression/balance";
import { grantCharacterReward, loadCharacterProgress, QA_BUILD, qaGemsEnabled, testModeEnabled, updateCharacterProgress } from "./progression/storage";
import { track as trackEvent } from "./analytics/events";
import { loadBeatRpg } from "./game/storage";
import { bestScoreOverall } from "./beat/rpg";
import { emptyCharacterProgress, type CharacterProgress, type ShoulderId } from "./progression/model";
import {
  BEAT_SKILL_BY_SLOT,
  IDLE,
  computeIdleYield,
  rollIdleRareDrops,
  idleBottleneck,
  idleCapHours,
  masteryToNextSlotLevel,
  nextAreaName,
  slotLevels,
  stageCeilingFor,
  type IdleBottleneck,
  type IdleYield,
} from "./progression/idle";
import { SKILL_LABEL } from "./beat/rpg";
import { IdleReturnModal } from "./IdleReturnModal";
import { AreaGateModal } from "./AreaGateModal";
import { setHuntBgm, type HuntMood } from "./ui/bgm";
import { sfxGateBlocked, sfxHuntBurst, sfxHuntHit, sfxHuntShoot, sfxMonsterDown, sfxPetPounce, sfxRelicReveal, sfxRelicSummon, sfxSkillTier, sfxSlotUnlock, sfxWeapon } from "./ui/sfx";
import { rollCoinDrop } from "./titans/eventCoins";
import { trialCeiling, trialDpsMul } from "./titans/trialAlly";
import { HERO_FIG } from "./equipment/heroAnchors";
import { canRebirthNow, performRebirth } from "./progression/rebirth";
import { QuestPanel } from "./titans/QuestPanel";
import { WEAPON_EFFECTS, WEAPON_KINDS, WEAPON_LABEL, WEAPON_TECH, weaponHuntLevel, weaponIconPath, weaponStatText, type WeaponKind } from "./titans/weapons";
import { SUMMON_LEVEL_PULLS, summonLevel, summonLevelProgress, TIERS, TIER_LABEL, TIER_RANK } from "./titans/summonLevel";
import type { Tier as AllyRarity } from "./titans/allyRoster";
import { RelicTabPanel } from "./titans/RelicTabPanel";
import { buyQuest, claimQuestBonus, QUESTS, questBlock, questBonusAmount, questBonusLeftMs, questCost, questPay, tickQuests } from "./titans/quests";
import { climbLadder, ladderEffects, ladderLevel, perkForStage, perkLabel, LADDER_LABEL } from "./titans/bossLadder";
import { freeCrystals, permanentEffects } from "./progression/crystalTree";
import { drawRelicShards, grantRelicShards, relicBannerCost, relicBannerTierRates, relicDef, relicDrawRates, relicIconUrl, relicStars, RELICS, RELIC_BANNERS, RELIC_BANNER_LABEL, RELIC_BANNER_RATES, RELIC_FAMILY_LABEL, RELIC_SET, RELIC_SHARDS_PER_STAR, addRelicSpare, consumeRelicSpare, relicMerged, relicSpareUsable, setActive, type RelicBanner, type RelicId } from "./titans/relics";
import type { Tier as RelicTierRank } from "./titans/allyRoster";
import "./titans/skillTab.css";
import { discoveryGems, discoveryKey, discoveryTitle, type DiscoveryKind } from "./titans/discovery";
import {
  ALLY_IDS,
  ALLY_ELEMENT,
  ALLY_RARITY,
  ALLY_ROLE,
  EXPEDITION_HOURS,
  EXPEDITION_MAX,
  RARITY_COLOR,
  RARITY_LABEL,
  ELEMENT_LABEL,
  ROLE_LABEL,
  SHOP_ALLY_GEM_COST,
  STAR_CAP,
  STAR_MULT,
  effectiveStars,
  expeditionReward,
  partySlotCount,
  partyRoleEffects,
  canFieldAlly,
  fieldedParty,
  partySynergies,
  shardCostToNext,
  starMultiplier,
  randomOwnedAlly,
} from "./titans/allies";
import { BEAT_TICKET_MAX_BOUGHT } from "./beat/tickets";
import { PET_ATTACK_SEC, PET_DEFS, PET_GEM_PRICE, PET_IDS, activePetEffect, pendingHatches, petAttackMul, type PetId } from "./titans/pets";
import { assetUrl } from "./asset";
import { NOTIFY_ID, cancelLocalNotification, scheduleLocalNotification, weeklyDeadlineAt, setNotifyPromptAllowed } from "./game/native";
import { emptyEventSave, loadEventSave, updateEventSave, type EventSave } from "./events/eventSave";
import { weeklyChallenges } from "./events/weekly";
import { ROUTINE_HELP, ROUTINE_REWARD_GEMS, routineItems, routineRewardAvailable, type RoutineItem } from "./progression/routine";
import { hubCards } from "./titans/hubCards";
import { lowFxOn } from "./ui/perfMode";
import { CHEST_POINTS_FOR_CHEST, CHEST_TABLE, grantChest, openChest } from "./economy/chests";
import { recommendNext, type RecommendAction, type WallInfo } from "./progression/recommend";
import {
  LOCK_HINT,
  UNLOCK_BANNER,
  contentUnlocked,
  onboardingTargetStep,
} from "./progression/onboarding";
import { EquippedCharacter } from "./ui/EquippedCharacter";
import { ContentIcon, type ContentIconName } from "./ui/ContentIcon";
import { RewardIcon, grantRewardKinds } from "./ui/RewardIcon";
import { CurrencyIcon, GemMark } from "./ui/CurrencyIcon";
import { WalletBar, formatWallet } from "./ui/WalletBar";
import { monsterArtKey } from "./titans/bestiary";
import { BEAT_SHOP_ITEMS, beatItemIcon, equipBeatItem, equippedBeatItem, grantBeatItem, ownsBeatItem, type BeatShopItem } from "./beat/shop";
import { CURRENCY_LABEL, closestGoal, purchaseAdvice, shortfallLabel, topAffordable, type AdviceAction, type PurchaseAdvice } from "./economy/purchaseAdvice";
import { SkillIcon } from "./ui/SkillIcon";
import { SKILL_BANNERS, SKILL_BANNER_LABEL, SKILL_BANNER_RATES, consumeSkillCopies, drawSkillCopies, skillBannerCost, skillCardPlan, skillBannerTierRates, skillDrawRates, type SkillBanner } from "./titans/skillGacha";
import { shoulderIconUrl } from "./ui/ShoulderIcon";
import { SHOULDER_DEFINITIONS } from "./equipment/shoulders";
import { PAID_GROUPS, PATRON, SHARD_PACK_AMOUNT, SHARD_PACK_WEEKLY_LIMIT, STORE_PRODUCTS, dealState, packageTriggered } from "./economy/productCatalog";
import { eventBuysThisWeek, eventProductsFor, type EventGrant, type EventProduct } from "./economy/eventShop";
import { SEASON, SEASON_CORE_REFUND_KEY, SEASON_CORE_REFUND_PAST_KEY, addSeasonXp, seasonCoreRefund, seasonDaysLeft, seasonIndex, seasonTier } from "./economy/seasonPass";
import { BOOSTER_AD_HOURS, BOSS_RETRY_BONUS_SEC, consumeAdReward, rewardedAvailability, showRewarded, type AdPlacement } from "./ads/rewarded";
import { THEMES, WEAPON_FX } from "./economy/cosmetics";
import { MOMENT_OFFERS, activeMomentOffers, momentBonusGems, momentTimeLeft, openMomentOffer, paidOffersUnlocked, patronPreview, type MomentOfferKind } from "./economy/momentOffers";
import { firstDoubleAvailable, packagePurchased, paidStoreNote, paidStoreVisible, paymentsConfigured, purchaseGrant, purchaseProduct } from "./payments/store";
import { gemPackBonusPercent } from "./economy/gateFund";
import { onStorePricesChanged, priceLabel, productOnSale } from "./payments/prices";
import { weekKey as currentWeekKey } from "./events/shadowArena";
import { TOWER_TICKET_MAX } from "./game/towerTickets";

type TitansGameProps = {
  insets: SafeInsets;
  userHash: string;
  forgedWeaponLevel?: number;
  /** 견갑 강화 단계 — 전장 견갑 외형 티어 */
  armorLevel?: number;
  onOpenContent: (content: "dodge" | "beat" | "forge" | "profile" | "tower") => void;
  /** 설정 버튼+메뉴 — 헤더의 마이페이지 왼쪽에 (App 이 만든다) */
  settingsNode?: ReactNode;
  /** 처음 열 탭 (2026-10-14) — 마이페이지의 콘텐츠 바로가기는 모드를 바로 켜지 않고 모험 허브(hub)로 보낸다 */
  initialTab?: ShopTab;
  /** 이벤트 센터를 특정 탭으로 연다 (추천 배너·루틴 보드) */
  onOpenEvents?: (tab: "daily" | "rift" | "weekly" | "journal" | "season") => void;
};

/** 사냥 저장의 숙련 → 파츠 숙련표 (2026-10-14) */
const gearMasteryOf = (t: TitansSave["equipmentTraining"]) => ({ helmet: t.helmetMastery ?? 0, armor: t.armorMastery ?? 0, gloves: t.glovesMastery ?? 0, boots: t.bootsMastery ?? 0 });
type ShopTab = "sword" | "quest" | "relic" | "hub" | "expedition" | "heroes" | "skills" | "premium" | "gacha" | "event-shop" | "event-shop2";
/** 동료 도감 한 쪽 장 수 — 폰 세로에서 스크롤 없이 보이는 양 (2026-10-08) */
/**
 * 두 무리 깊이(전장 높이 %) — 2026-10-20 "땅은 그대로 두고 더 넓게 분산".
 * 왼쪽 무리(주인공 · 원거리)는 −16~6%(위로는 얕게 — 원거리 셋이 앞뒤 줄로 서는 대열은 깊을수록 세로 간격이 좁아져 서로 28% 겹쳤다, verify-formation [back]): 아래(앞)로도 내려온다 — AUTO · 배속 버튼을 스킬 줄 왼쪽 끝에 세로로 옮겨(위끝 62px) 그 위까지 땅을 쓴다.
 * −16%(375px 전장 ≈75px)에서 주인공 발 84px · 원거리 발 79px. −18% 는 주인공 무기가 알림 칩 왼끝에 닿았다(실측).
 * 오른쪽 무리(몬스터 · 근접)는 −7~9%: 알림 칩을 전장 오른쪽 위로 옮겨 스킬 줄(위끝 49px) 위까지 내려온다(몬스터 이름표가 스킬 줄 위에 남는 −7%).
 *   9% 넘으면 뒷줄 발이 풀밭 선에 닿는다(실측: 개인 간격 최대 · 10% 에서 스테이지 나갈 때 선 위, 12% 는 교전 중에도 3px 넘음).
 * 둘 다 제 범위 아래쪽 45% 밖이면 한쪽(반반)을 뒤집어 아래 땅이 비지 않게 한다.
 */
/**
 * 전장이 낮으면(< 440px — 360×640 등) 동료 몸(px)에 비해 전장이 작아 넓은 깊이에서 머리가 HUD · 알림 칩에 닿았다(실측 allyTop 78px).
 * 그때는 알림 칩을 예전 자리(오른쪽 아래)에 두고 깊이를 좁힌다(왼쪽 −9~3 · 오른쪽 0~7, 대열 세로 간격 0.65배 — 왼쪽 −10% 부터 주인공 무기 끝이 오른쪽 아래 칩에 닿았다, 360×640 실측). 넓은 전장(390×844 의 490px 등)은 위 범위.
 */
const LANES_WIDE = { lMin: -16, lMax: 6, rMin: -7, rMax: 9 }, LANES_COMPACT = { lMin: -9, lMax: 3, rMin: 0, rMax: 7 };
const WIDE_FIELD_MIN_H = 440;
function lanePair(wide: boolean): { laneL: number; laneR: number; wide: boolean } {
  const { lMin, lMax, rMin, rMax } = wide ? LANES_WIDE : LANES_COMPACT;
  let l = lMin + Math.random() * (lMax - lMin);
  let r = rMin + Math.random() * (rMax - rMin);
  // 둘 다 아래쪽 45% 밖이면 한쪽을 뒤집는다 — 절반 기준이면 가운데쯤에 둘이 서서 아래 땅이 빌 때가 있었다(verify-walk-y 최저 발 126px)
  const tl = lMin + (lMax - lMin) * 0.45, tr = rMin + (rMax - rMin) * 0.45;
  if (l > tl && r > tr) {
    // 가운데 기준 뒤집기는 45% 선을 넘겨 그대로 위쪽에 남기도 해서 비율로 아래쪽 45% 안에 옮긴다
    if (Math.random() < 0.5) l = lMin + ((l - tl) / (lMax - tl)) * (tl - lMin); else r = rMin + ((r - tr) / (rMax - tr)) * (tr - rMin);
  }
  return { laneL: Math.round(l * 10) / 10, laneR: Math.round(r * 10) / 10, wide };
}
const ALLY_PAGE_SIZE = typeof window !== "undefined" && appWidth() <= 600 ? 4 : 6;   // 폰 세로 시트(≈680px)엔 4장, 넓은 화면 6장
const MANAGEMENT_PAGE_COPY: Partial<Record<ShopTab, { kicker: string; title: string; desc: string }>> = {
  // 모험 허브 (2026-10-13, docs/FOCUS_CAPYGO P0): 콘텐츠·모험 팝업 둘을 한 화면으로 — 카드 6장 + 루틴 줄
  hub: { kicker: "ADVENTURE", title: "모험", desc: "오늘 할 수 있는 콘텐츠와 남은 횟수 · 빨간 점은 지금 보상이 남은 것" },
  expedition: { kicker: "EXPEDITION", title: "파견", desc: "벤치 동료를 보내 두면 시간이 지난 뒤 조각·강화석을 들고 돌아옵니다." },
  heroes: { kicker: "ALLY ARCHIVE", title: "동료 도감", desc: "보유 동료를 편성하고 역할·속성·성급을 관리하세요." },
  gacha: { kicker: "ALLY RECRUIT", title: "동료 뽑기", desc: "지역 픽업 동료를 소환하고 천장 진행도를 확인하세요." },
  premium: { kicker: "PREMIUM SHOP", title: "상점", desc: "재화, 성장 패키지, 동료와 외형 상품을 확인하세요." },
  "event-shop": { kicker: "LIMITED EVENT", title: "이벤트 상점", desc: "원정 시즌 한정 보급품과 성장 재료를 교환하세요." },
  "event-shop2": { kicker: "SPECIAL SUPPLY", title: "특별 상점", desc: "주간 도전과 출석을 위한 기간 한정 패키지입니다." },
};
type PremiumCategory = "currency" | "package" | "relic" | "skill" | "ally" | "title" | "weapon" | "pet";
/**
 * 상점 카드 화면 문구 (2026-10-26 사용자: "글이 너무 길다") — 상품 데이터(productCatalog)의 설명은 스토어 등록 CSV 에도 쓰여 그대로 두고,
 * 카드에선 한 줄 설명(blurb) + 짧은 효과 칩(lines)만 보인다. 없는 상품은 원래 설명 · 내용 그대로
 */
const SHOP_COPY: Record<string, { blurb?: string; lines?: string[] }> = {
  "remove-ads": { blurb: "광고 없이 보상 자동 적용", lines: ["정산 2배 하루 3회", "가속 4h 하루 1회", "보스 +10초"] },
  "dodge-x3": { blurb: "성문 방어를 3배 빠르게", lines: [] },
  "gate-fund": { blurb: "성문 방어를 깰 때마다 보석", lines: ["보석 총 1,700", "깬 단계는 바로 받음"] },
  "adventurer-starter": { blurb: "초반 성장 입문 세트" },
  "pack-wall": { blurb: "벽에 막혔을 때 1회" },
  "pack-rebirth": { blurb: "첫 환생 뒤 1회" },
  "patron-30d": { blurb: "30일 동안 매일", lines: ["보석 15/일", "방치 캡 +2h", "균열 +1회/일"] },
  "char-obsidian": { blurb: "전용 외형 + 방치 효율 +1%p", lines: [] },
  "char-dawn": { blurb: "전용 외형 + 방치 시간 +30분", lines: [] },
  "char-ember": { blurb: "외형 전용 코스튬", lines: [] },
  "char-frost": { blurb: "외형 전용 코스튬", lines: [] },
};

/** 실제 앱 이탈이 이 시간 이상일 때만 귀환 정산을 표시한다. */
const IDLE_REPORT_MIN_SECONDS = 10 * 60;

/** 피해 출처 — 숫자 색·아이콘을 분리해 "누가 때렸는지" 읽히게 한다 (첫 플레이 점검표 #2) */
type FloatSource = "tap" | "hero" | "ally" | "skill";

type FloatText = {
  id: number;
  x: number;
  y: number;
  text: string;
  crit: boolean;
  source: FloatSource;
  hue?: number;
  /** 스킬 숫자에 붙는 이름("꼬리 치기 박자")·아이콘 — 누가 무엇으로 때렸는지 */
  label?: string;
  skill?: TitanSkillId;
  /** 평타 연타 합산 숫자(2026-10-21) — 같은 숫자에 더하며 다시 튀어 오른다(bump 가 key) */
  sum?: boolean;
  bump?: number;
};

/** 스킬 발동 연출 한 조각 — 좌표는 필드 기준 px (2026-10-06) */
type SkillShot = { id: number; kind: "shot" | "beam" | "impact" | "link" | "aura" | "proj"; skill?: TitanSkillId; fly?: number; element: string; x: number; y: number; dx: number; dy: number; ang: number; len: number; big: boolean };

type FxBurst = {
  id: number;
  kind: "slash" | "thrust" | "hit" | "ally" | "strike" | "crit" | "clone" | "warcry" | "spark" | "burst" | "debris" | "bolt" | "coin" | `sig-${SigFx}`;
  x: number;
  y: number;
  hue?: number;
  /** 때린 쪽 속성(fire·water·earth·wind·blade·light) — 타격 그림 색 (2026-10-21) */
  el?: string;
};

/** 버프 상태 — 만료 시각(performance.now 기준)과 그때의 수치. 값은 titans/skills.ts가 정한다 */
type BuffState = {
  critUntil: number;
  critBonus: number;
  cloneUntil: number;
  cloneMult: number;
  warcryUntil: number;
  warMult: number;
  hasteUntil: number;
  hasteMult: number;
  freezeUntil: number;
  burnUntil: number;
  /** 초당 화상 피해(절대값 — 시전 시점의 탭 기본 피해 × 배율) */
  burnPerSec: number;
  burnBossOnly: boolean;
};

const EMPTY_BUFFS: BuffState = { critUntil: 0, critBonus: 0, cloneUntil: 0, cloneMult: 1, warcryUntil: 0, warMult: 1, hasteUntil: 0, hasteMult: 1, freezeUntil: 0, burnUntil: 0, burnPerSec: 0, burnBossOnly: false };
const AUTO_SKILL_ORDER = autoSkillOrder();

type CooldownMap = Record<TitanSkillId, number>;
type BattlePhase = "combat" | "monster-death" | "boss-ready" | "stage-clear" | "stage-exit" | "stage-enter";

function emptyCds(): CooldownMap {
  return Object.fromEntries(SKILLS.map((skill) => [skill.id, 0])) as CooldownMap;
}

function shoulderTrainingMaterials(level: number): { expedition: number; beat: number } {
  if (level < 5) return { expedition: 0, beat: 0 };
  if (level < 15) return { expedition: 1 + Math.floor((level - 5) / 3), beat: 0 };
  return { expedition: 4 + Math.floor((level - 15) / 4), beat: 1 + Math.floor((level - 15) / 5) };
}

/**
 * 무료 지급 게이트 (과금 점검): ₩ 상품 6종을 무료로 1회씩 주던 QA 경로는 개발 빌드 또는
 * `dodgebullets:qa-free-store` 플래그에서만 열린다(QA 빌드 한정). 출시 빌드에서는 토스·플레이 결제로만 팔고, 결제가 안 되는 웹에서는 유료 상품을 숨긴다.
 */
const FREE_STORE_ENABLED =
  import.meta.env.DEV ||
  (QA_BUILD && typeof localStorage !== "undefined" && (() => { try { return localStorage.getItem("dodgebullets:qa-free-store") === "1"; } catch { return false; } })());

export function TitansGame({ insets, userHash, forgedWeaponLevel: drumLevel = 0, armorLevel = 0, onOpenContent, onOpenEvents, settingsNode, initialTab }: TitansGameProps) {
  const [save, setSave] = useState<TitansSave>(() => defaultTitansSave());
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<ShopTab>(initialTab ?? "sword");
  /** 가로 화면의 장비 성장·스킬 서랍 (2026-10-15, 사용자: "가로모드에 장비성장 스킬 ui 가 하단으로 빠지고 맵이 잘 보이게") — 세로에선 쓰지 않는다 */
  const [growthOpen, setGrowthOpen] = useState(false);
  const [premiumCategory, setPremiumCategory] = useState<PremiumCategory>("currency");
  const [wave, setWave] = useState(1);
  const [boss, setBoss] = useState(false);
  const [chesterson, setChesterson] = useState(false);
  const [hp, setHp] = useState(10);
  const [maxHp, setMaxHp] = useState(10);
  const [bossLeft, setBossLeft] = useState(BOSS_TIME_SEC);
  // 보스 약점 (2026-10-08, titans/bossWeak.ts) — 8초마다 바뀐다. 사냥 강화 선택권이 있으면 3장을 띄운다 (titans/huntPerks.ts)
  const [bossWeak, setBossWeak] = useState<BossWeak | null>(null);
  const bossWeakRef = useRef<BossWeak | null>(null);
  const [bossReady, setBossReady] = useState(false);
  const [monsterHit, setMonsterHit] = useState(0);
  /** 보스 처치 3단계 (계획안 B): 1 경직 → 2 균열 → 3 붕괴+골드 분출. 0이면 없음 */
  const [bossBreak, setBossBreak] = useState<0 | 1 | 2 | 3>(0);
  const [impact, setImpact] = useState<"normal" | "critical" | null>(null);
  const [floats, setFloats] = useState<FloatText[]>([]);
  const [fx, setFx] = useState<FxBurst[]>([]);
  const [shots, setShots] = useState<SkillShot[]>([]);
  const shotIdRef = useRef(0);
  /** 버프 종류 → 건 스킬 (영웅 머리 위 강화 칸) */
  const [buffSource, setBuffSource] = useState<Partial<Record<BuffKind, TitanSkillId>>>({});
  const [toast, setToast] = useState("");
  const [cds, setCds] = useState<CooldownMap>(() => emptyCds());
  const [buffs, setBuffs] = useState<BuffState>(EMPTY_BUFFS);
  /** 소환 결과 연출 (확률형 재설계) — 카드 뒤집기 모달. null이면 닫힘 */
  const [gachaReveal, setGachaReveal] = useState<PullResult[] | null>(null);
  /** 연출 카드 설명 (2026-10-14): 탭/마우스 오버한 카드 — 등급 설명·역할·특성·능력치 */
  const [gachaFocus, setGachaFocus] = useState<number | null>(null);
  /** 소환진 사전 연출 (계획안 E) — 1.2초 뒤 gachaReveal로 넘어간다 */
  const [gachaSummoning, setGachaSummoning] = useState<{ tier: AllyRarity; count: number } | null>(null);
  const [showGachaRates, setShowGachaRates] = useState(false);
  /** 상점 유물 뽑기 결과 (titans/relics drawRelicShards, 2026-10-26) — 나온 조각 차례 */
  const [relicDrawResult, setRelicDrawResult] = useState<RelicId[] | null>(null);
  /** 유물 뽑기 소환진 (2026-10-28, "상점 유물뽑기에 동료처럼 이펙트") — 1.2초 뒤 결과 */
  const [relicSummoning, setRelicSummoning] = useState<{ tier: RelicTierRank; count: number } | null>(null);
  /** 스킬 뽑기 (2026-10-28 titans/skillGacha.ts) — 소환진 · 공개 · 확률 정보를 펼친 재화 */
  const [skillSummoning, setSkillSummoning] = useState<{ tier: RelicTierRank; count: number } | null>(null);
  const [skillDrawResult, setSkillDrawResult] = useState<TitanSkillId[] | null>(null);
  const [skillRatesOpen, setSkillRatesOpen] = useState<SkillBanner | null>(null);
  /** 파견 출정 팝업 (2026-10-27, 사용자: "파견 출정 시 간단한 애니 팝업") — 동료가 오른쪽으로 걸어 나간다 · 1.6초 뒤 저절로 닫힘 */
  const [expeditionSendPop, setExpeditionSendPop] = useState<{ allyId: TitanHeroId; hours: number; seq: number } | null>(null);
  useEffect(() => {
    if (!expeditionSendPop) return;
    const t = window.setTimeout(() => setExpeditionSendPop(null), 1600);
    return () => window.clearTimeout(t);
  }, [expeditionSendPop]);
  const [showRelicRates, setShowRelicRates] = useState(false);
  /** 동료 값 조정 다시 계산 안내 (2026-10-27) — normalizeTitansSave 가 남긴 rebalanceNotice */
  const [rebalanceInfo, setRebalanceInfo] = useState<NonNullable<TitansSave["rebalanceNotice"]> | null>(null);
  /** 상점 유물 뽑기 — 고른 등급 탭 */
  const [relicShopBanner, setRelicShopBanner] = useState<RelicBanner>("gold");
  const [skillSlotTab, setSkillSlotTab] = useState<TitanSkillSlot | null>(null);   // 조합 칸을 누른 슬롯(카드 표시) — 처음엔 없음
  const [animMode, setAnimMode] = useState<"idle" | "attack">("idle");
  const [frameIdx, setFrameIdx] = useState(0);
  const [skillVisual, setSkillVisual] = useState<TitanSkillId | null>(null);
  /** 시전 등급 연출 (2026-10-28) — 스킬 등급(SKILL_TIER)이 높을수록 전장 전체 빛 · 고리가 커진다(hunt-motion.css .skill-tier-fx) */
  const [tierFx, setTierFx] = useState<{ tier: AllyRarity; seq: number } | null>(null);
  /** 장착 연출 (2026-10-28, 사용자: "실제 장착시 바로 스킬 이펙트 화려하게") — 카드 · 칸이 빛나고 전장에서 그 스킬 시전 연출을 한 번(피해 · 쿨타임 없음) */
  const [equipFx, setEquipFx] = useState<{ id: TitanSkillId; seq: number } | null>(null);
  /** 펫 덤빔(2026-10-28) — 번호가 바뀔 때마다 주인공 곁 펫이 몬스터 쪽으로 뛰었다 돌아온다(hunt-motion.css .hero-pet.pet-attack) */
  const [petAtk, setPetAtk] = useState(0);
  const petAccRef = useRef(0);
  const [allyPulse, setAllyPulse] = useState<Record<string, number>>({});
  // 몬스터 한 번 덤빔 = 동료 한 명 피격 (2026-10-19) — 예전엔 한 카운터를 전원이 받아 덤빌 때마다 파티가 같이 움찔하고 공격이 끊겼다
  const [allyHit, setAllyHit] = useState<Record<string, number>>({});
  /** 원정대 체력 (titans/bossPressure, 2026-10-27) — 대장전마다 1 에서 시작, 대장의 공격이 깎는다. 0 이면 대장 도전 실패 */
  const partyHpRef = useRef(1);
  const [partyHp, setPartyHp] = useState(1);
  const partyDownRef = useRef(false);
  /** 원정대 쓰러짐 연출 (2026-10-28, 사용자: "죽는모션 피격 애니메이션 모두 수정") — 대장 반격에 체력 0 이면 1.3초 쓰러졌다 일어난다 */
  const [partyKo, setPartyKo] = useState(0);
  const lastBossHitLeftRef = useRef(0);
  /** 동료 위 피해 숫자 — 몬스터 · 대장의 공격 */
  const [partyDmg, setPartyDmg] = useState<{ id: string; text: string; key: number; boss: boolean } | null>(null);
  const [equippedShoulder, setEquippedShoulder] = useState<ShoulderId | null>(null);
  const [skillPoints, setSkillPoints] = useState(0);
  const [redGems, setRedGems] = useState(0);
  // 결제로 받은 스킬 코어 — 진행도의 pendingSkillCores 를 사냥터 저장이 준비된 뒤에 옮긴다 (부팅 정산·실시간 결제 공통, 리뷰 #4).
  // 진행도 큐에서 0 으로 만들며 그 순간의 정확한 개수를 받아 더하므로 두 번 더해지지 않는다
  const coresMovingRef = useRef(false);
  // 스토어 가격을 받으면 다시 그린다 (payments/prices)
  const [, setPriceTick] = useState(0);
  useEffect(() => { const off = onStorePricesChanged(() => setPriceTick((t) => t + 1)); return () => { off(); }; }, []);
  // 지갑 숫자는 굴러간다 — 뚝 바뀌면 웹 같다 (2026-10-01)
  const goldShown = useTween(save.gold);
  const gemsShown = useTween(redGems);
  const [claimingProduct, setClaimingProduct] = useState<string | null>(null);
  const [character, setCharacter] = useState<CharacterProgress>(() => emptyCharacterProgress());
  // 주인공 무기 (2026-10-15, 사용자: "캐릭터 아이템도 북 외에도 두 가지 더") — 북은 대장간 북(+0~15), 활·지팡이는 대장간 원정 무기(+0~20 → 15 눈금)
  // 주인공 무기 4종 (2026-10-27, titans/weapons.ts) — 검은 대장간 단계(예전 북 자리), 창 · 활 · 지팡이는 대장간 무기 강화(0~20 → 15 눈금)
  /** 고른 무기(저장) — 2026-10-28 (사용자: "아이템 탈부착은 다음 스테이지에 반영되게") 사냥터 모습 · 공격은 appliedLook(지금 스테이지에 들고 들어온 장비) */
  const wantedWeaponKind: WeaponKind = character.equippedWeaponKind ?? "sword";
  const [appliedLook, setAppliedLook] = useState<{ weaponKind: WeaponKind; weaponSkin: string; shoulder: ShoulderId | null } | null>(null);
  /** 고른 장비(아래에서 매 렌더 채운다) — spawn 이 다음 몬스터를 부를 때 꺼내 든다 */
  const lookWantedRef = useRef<{ weaponKind: WeaponKind; weaponSkin: string; shoulder: ShoulderId | null } | null>(null);
  const weaponKind: WeaponKind = appliedLook?.weaponKind ?? wantedWeaponKind;
  const forgedWeaponLevel = weaponHuntLevel(weaponKind, drumLevel, character.expeditionWeaponForge ?? {});
  /** 메인 루프(의존성 고정)가 읽는 지금 무기 단계 */
  /** DEV — 준 피해 합계(출처별). 무기 밸런스를 실제 게임에서 잰다(scripts/_probe-weapon-dps.mjs) */
  const devDmgRef = useRef<Record<string, number>>({});
  const forgedWeaponLevelRef = useRef(forgedWeaponLevel);
  forgedWeaponLevelRef.current = forgedWeaponLevel;
  const weaponKindRef = useRef<WeaponKind>(weaponKind);
  weaponKindRef.current = weaponKind;
  const weaponTechRef = useRef(0);
  // 하한 2 — 기본 스킬(도토리 북치기)이 시동기 한도 1을 선점해 Lv.11까지 다른 시동기를 못 배우던 함정 제거
  // 테스트 모드 해금 (2026-10-16, progression/qaUnlock) — 스킬 칸·보유 한도·콘텐츠 카드 잠금을 읽을 때만 연다. 설정에서 끄면 바로 다시 잠긴다
  const qaOpen = useSyncExternalStore(subscribeQaUnlock, qaUnlockOpen, () => false);
  const skillTypeCapacity = qaOpen ? 10 : Math.min(10, Math.max(2, Math.ceil(character.level / 10)));
  const [idleReport, setIdleReport] = useState<{
    result: IdleYield;
    stage: number;
    bottleneck: IdleBottleneck;
    /** 희귀 드랍 (2026-10-29) — 정산 화면을 열 때 정해 보여 주고, 받을 때 남은 조각(relicSpare) · 스킬 카드(copies)로 들어간다 */
    drops: { relics: RelicId[]; skills: TitanSkillId[] };
  } | null>(null);
  const [gateNotice, setGateNotice] = useState(false);
  const [shardPackTarget, setShardPackTarget] = useState<TitanHeroId>("mia");
  const [battlePhase, setBattlePhase] = useState<BattlePhase>("combat");
  /** QoL — 일괄 레벨업 수량 (0 = MAX) */
  const [buyAmount, setBuyAmount] = useState<1 | 10 | 0>(1);
  /** 펼친 카드(동료 · 스킬) — 접힌 카드는 이름 · 한 줄 · 오른쪽 주 버튼 하나만, 누르면 설명 · 보조 버튼 (2026-10-22, 사용자: "버튼과 글자가 너무 많다 · 버튼은 최대한 우측") */
  const [openCard, setOpenCard] = useState<string | null>(null);
  /** 퀘스트 (titans/quests.ts, 2026-10-26) — 주기 진행은 ref 로 돌리고 골드가 들어올 때만 저장 · 화면 막대는 퀘스트 탭일 때만 250ms 마다 */
  const questAccRef = useRef(0);
  const questProgRef = useRef<number[]>([]);
  const [questProg, setQuestProg] = useState<number[]>([]);
  const [questDone, setQuestDone] = useState<{ rows: number[]; key: number } | null>(null);
  /** 전환이 끝나면 부를 spawn(스테이지, 처치 수) — 건너뛰기가 같은 걸 바로 부른다 */
  const pendingSpawnRef = useRef<[number, number] | null>(null);
  /** spawn 이 건 "대열 준비" 타이머 — 이게 돌아야 교전이 시작된다. 전환 스킵은 이것만 남기고 지운다 */
  const formationTimerRef = useRef<number | null>(null);
  // 관리 시트는 탭이 바뀌어도 같은 요소라 스크롤이 남는다 — 모험 맨 아래 파견 카드를 누르면 파견 화면이 아래로 내려간 채 열려 자리 · 수령 단추가 머리 밑에 숨었다 (2026-10-26 모바일 점검)
  const hubSheetRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => { hubSheetRef.current?.scrollTo({ top: 0 }); }, [tab]);
  const tabRef = useRef<ShopTab>("sword");
  /** 보상 팝업 — 첫 발견 · 대장 사다리 (2026-10-22 아처 키우기 3 · 4번) */
  const [rewardPop, setRewardPop] = useState<{ kicker: string; title: string; detail: string; tone: "discovery" | "ladder" | "gift" | "relic"; icon?: string; key: number } | null>(null);
  const discoveredLocalRef = useRef(new Set<string>());
  /** 자동 환생 뒤 사냥터를 처음 불러올 때와 같은 길로 다시 세운다(편성 · 스테이지 · 저장) */
  const [reloadKey, setReloadKey] = useState(0);
  const autoRebirthBusyRef = useRef(false);
  /** 환생 중 사냥터 저장 멈춤 (2026-10-28) — performRebirth 가 사냥터 저장을 1층으로 비우는 동안 돌던 사냥이 옛 층 · 골드로 덮어썼다(전체 검사 9층 · 1101). 다시 불러와 준비되면 푼다 */
  const saveFrozenRef = useRef(false);
  const rewardQueueRef = useRef<{ kicker: string; title: string; detail: string; tone: "discovery" | "ladder" | "gift" | "relic"; icon?: string }[]>([]);
  /** 불 유물 세트 화상 — 준 피해의 일부를 모았다가 0.6초마다 화상 숫자로 (titans/relics.ts) */
  const relicBurnPoolRef = useRef(0);
  const relicBurnAccRef = useRef(0);
  const rewardBusyRef = useRef(false);
  const toggleCard = (id: string) => (e: { target: EventTarget | null }) => { if ((e.target as Element | null)?.closest?.("button, select, a, input")) return; setOpenCard((cur) => (cur === id ? null : id)); };
  /**
   * 자동 강화 (2026-10-21, 사용자: "오늘도 환생2 처럼 장비 성장 UI에 자동으로 업그레이드 모드를 추가해줘") — 켜 두면 장비 성장 탭이 열려 있는 동안
   * 0.3초마다 무기 · 파츠 4종 중 가장 싼 훈련 1단계를 사냥 골드로 산다(견갑은 강화석 · 조각을 써서 빼다). 켬/끔은 이 기기에 기억
   */
  const [autoTrain, setAutoTrain] = useState(() => { try { return localStorage.getItem("dodgebullets:auto-train") === "1"; } catch { return false; } });
  const [autoTrainHit, setAutoTrainHit] = useState<{ slot: string; seq: number; count: number } | null>(null);
  /** 온보딩(§8) 개방 연출 — 방금 열린 단계 번호 */
  const [unlockBanner, setUnlockBanner] = useState<number | null>(null);
  /** 동료 탭 역할 필터 (점검표 #4) */
  const [allyFilter, setAllyFilter] = useState<"all" | "melee" | "ranged" | "tank" | "healer">("all");
  const [allyPage, setAllyPage] = useState(0);   // 동료 도감 쪽(6장씩)
  /** 이벤트 저장(균열·토벌령·주간) — 루틴 보드·추천 엔진이 읽는다 */
  const [events, setEvents] = useState<EventSave>(() => emptyEventSave());
  const [navPopup, setNavPopup] = useState<"content" | "adventure" | null>(null);
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);
  /** 벽 미터 — 마지막 보스 실패의 정량 정보 (RETENTION D) */
  const [wallInfo, setWallInfo] = useState<WallInfo | null>(null);
  /** 첫 보스 실패 직후 무료 +10초 카드 (세션 1회) — 두 번째 실패부터는 순간 제안(초급 세트) */
  const [freeRetryCard, setFreeRetryCard] = useState(false);
  const freeRetryUsedRef = useRef(false);
  const sessionBossFailsRef = useRef(0);
  /** 이번 세션에서 '나중에'를 누른 순간 제안 (상품 id) */
  const [dismissedOffers, setDismissedOffers] = useState<string[]>([]);
  const openOffer = (kind: MomentOfferKind) => {
    void updateCharacterProgress(userHash, (current) => openMomentOffer(current, kind)).then((next) => { setCharacter(next); });
  };
  const [nowTick, setNowTick] = useState(() => Date.now());
  /** 콘텐츠 선택 카드 "최고점수" — 비트 기록은 비트 저장소에 있어 팝업을 열 때 읽는다 */
  const [beatBestScore, setBeatBestScore] = useState(0);
  const onboardHintShownRef = useRef(false);
  const [monsterAction, setMonsterAction] = useState<"idle" | "prepare" | "attack">("idle");
  const [formationEngaged, setFormationEngaged] = useState(false);
  const [formationReady, setFormationReady] = useState(false);
  // 2026-10-20 사용자: "공격할 때마다 움직이는데 — stage 가 갱신되고 첫 공격 전에만 움직이게". 사용자의 "stage" = 몬스터 한 마리(STAGE CLEAR 마다, 확인함).
  // 몬스터가 나올 때마다 주인공 · 동료가 새 자리로 걸어 들어가고(partyApproach), 교전 중엔 공격 때 몸이 자리를 옮기는 돌진 · 반동을 모두 뺐다(anim-plus.css).
  // monsterIn — 몬스터가 오른쪽에서 걸어 들어오는 것(대열과 같은 때)
  const [partyApproach, setPartyApproach] = useState(false);
  const [monsterIn, setMonsterIn] = useState(false);
  const spawnedOnceRef = useRef(false);
  // seq — 만남(몬스터 등장)마다 1씩. 동료가 걸어 들어갈 높이를 만남마다 새로 뽑는다 (SpriteArt allyStageJitter)
  // laneL · laneR — 만남 깊이(전장 높이 %, 왼쪽 −16~6 · 오른쪽 −7~9, lanePair). 왼쪽 무리(주인공 · 원거리 동료)와 오른쪽 무리(몬스터 · 근접 동료)가 따로 (2026-10-20, 사용자: "몬스터 y 고정" → "더 넓게 분산")
  // partyMeetRight · partyMl — 스테이지 첫 몬스터의 자리 · 보이는 몸 왼쪽 여백. 근접 동료 자리를 이것으로 굳히고, 다음 몬스터가 제 여백만큼 비켜 선다
  const [encounterMotion, setEncounterMotion] = useState({ heroLeft: 27, monsterRight: 8, monsterJit: 0, durationMs: 1250, seq: 0, laneL: 0, laneR: 0, wide: false, partyMeetRight: 8, partyMl: 0.22 });

  const saveRef = useRef(save);
  const characterRef = useRef(character);
  const waveRef = useRef(wave);
  const bossRef = useRef(boss);
  const chestRef = useRef(chesterson);
  const hpRef = useRef(hp);
  const bossLeftRef = useRef(bossLeft);
  const buffsRef = useRef(buffs);
  const cdsRef = useRef(cds);
  const floatId = useRef(0);
  const fxId = useRef(0);
  /** 평타 합산 숫자 — 지금 올라가는 숫자에 더한다 (2026-10-21, 사용자: "피해 숫자는 연타를 하나로 합쳐 올라가게") */
  const sumFloatRef = useRef<{ id: number; total: number; at: number; bump: number; timer: number; x: number; y: number } | null>(null);
  /** 몬스터 번쩍임 간격 · 히트스톱 간격 — 동료 넷이 연타해도 몬스터가 늘 보이게 */
  const lastFlashRef = useRef(0);
  const hitStopAtRef = useRef({ big: 0, small: 0 });
  /** 타격음 간격 — 동료 넷 연타가 소리를 덮지 않게 평타 70ms · 탄 110ms (2026-10-21) */
  const sfxAtRef = useRef({ hit: 0, shoot: 0 });
  /** 주인공 무기 소리 간격(2026-10-28) — 탭 연타가 소리를 덮지 않게 120ms */
  const weaponSfxAtRef = useRef(0);
  const fieldRef = useRef<HTMLDivElement>(null);
  // 간단한 충돌 분리 (2026-10-08, 사용자: "캐릭터별 간단한 충돌 체크로 간격을 벌려줘") — 발 높이가 비슷한(같은 줄) 주인공·동료끼리
  const sepFrozenRef = useRef(false);
  // 가로로 35% 넘게 겹치면 뒤에 선 동료를 민다(원거리는 왼쪽, 근접은 오른쪽). 겹침이 없어지면 서서히 제자리로. 슬롯 % 계산은 그대로 두고 margin 만 더한다
  useEffect(() => {
    const tick = () => {
      const field = fieldRef.current;
      if (!field) return;
      // 교전 중(다 걸어 들어온 뒤)엔 도착 순간 한 번 끝까지 풀고(같은 계산을 여러 번 돌려 수렴) 다음 만남까지 굳힌다 (2026-10-20, 사용자 "첫 공격 전에만 움직이게").
      // 예전처럼 320ms 마다 밀고 · 2px 씩 되돌리면 교전 중 동료가 4~8px 미끄러졌다(verify-walk-y). 걸을 때는 예전대로 틱마다 한 번
      const settled = field.classList.contains("phase-combat") && !field.querySelector(".is-approaching");
      if (!settled) sepFrozenRef.current = false;
      else if (sepFrozenRef.current) return;
      const hero = field.querySelector<HTMLElement>(".titans-hero");
      const allies = [...field.querySelectorAll<HTMLElement>(".titan-ally-art[data-party-slot]")];
      // 칸 상자엔 투명 여백이 양옆 22% 씩 있다 — 그린 몸(가운데)만으로 잰다. 칸 전체로 재면 주인공과 닿지도 않은 동료를 밀어 옆 동료에 올렸다
      const coreRect = (el: HTMLElement, trim: number) => { const r = el.getBoundingClientRect(); const t = r.width * trim; return { left: r.left + t, right: r.right - t, width: r.width - 2 * t, bottom: r.bottom }; };
      // 바탕 상자(지금 --sep-dx 를 뺀 것) + 계산 중 dx — 여러 번 돌릴 때 매번 다시 재지 않고 dx 만 옮긴다
      const items = [hero, ...allies].filter((el): el is HTMLElement => !!el).map((el, k) => {
        const cur = k === 0 ? 0 : Number.parseFloat(el.style.getPropertyValue("--sep-dx")) || 0;
        const r = coreRect(el, k === 0 ? 0.15 : 0.22);
        return { el, cur, dx: cur, base: { left: r.left - cur, right: r.right - cur, width: r.width, bottom: r.bottom } };
      });
      const rectOf = (it: (typeof items)[number]) => ({ left: it.base.left + it.dx, right: it.base.right + it.dx, width: it.base.width, bottom: it.base.bottom });
      const fr = field.getBoundingClientRect();
      // 원거리는 전장 왼쪽 28px(자세 애니메이션 폭) 안쪽까지만, 근접은 몬스터 왼쪽 가장자리(−6px)까지만 — 몬스터 오른쪽에서 치면 안 된다
      const mon = field.querySelector<HTMLElement>(".titans-monster")?.getBoundingClientRect();
      for (let round = 0; round < (settled ? 10 : 1); round += 1) {
        for (let i = 1; i < items.length; i += 1) {
          const b = items[i], br = rectOf(b);
          let dx = b.dx;
          let pushed = false;
          // 되돌림은 겹침이 20% 밑일 때만 — 35% 경계에서 밀고 되돌리기를 되풀이하지 않게. 밀린 뒤 20~35% 사이면 그 자리에 머문다
          let relaxOk = true;
          // 주인공 + 앞서 놓인 동료 전부와 잰다 (2026-10-14, 사용자: "동료끼리 충돌체크가 안 돼서 어색") — 예전엔 주인공만 봐서,
          // 주인공을 피해 왼쪽으로 민 원거리 동료가 옆 동료 위로 14px 올라탔다(luna×orion 28%)
          for (let j = 0; j < i; j += 1) {
            const ar = rectOf(items[j]);
            if (Math.abs(ar.bottom - br.bottom) > 26) continue;   // 다른 줄은 앞뒤 깊이 (호흡·공격 바운스 ±6px 를 넘는 여유)
            const overlap = Math.min(ar.right, br.right) - Math.max(ar.left, br.left);
            const minW = Math.min(ar.width, br.width);
            if (overlap > minW * 0.2) relaxOk = false;
            if (overlap > minW * 0.35) {
              const push = Math.min(18, overlap - minW * 0.35 + 2);
              // 주인공에게서는 예전 규칙(원거리 왼쪽 · 근접 오른쪽), 동료끼리는 멀어지는 쪽으로
              const away = j === 0 ? (b.el.classList.contains("combat-ranged") ? -1 : 1) : (br.left + br.width / 2 < ar.left + ar.width / 2 ? -1 : 1);
              dx += away * push;
              pushed = true;
            }
          }
          // 겹침이 풀리면 제자리로 — 최소 2px 씩 줄인다(10% 만 줄이면 2px 미만 변화는 쓰지 않는 규칙에 걸려 14px 에서 영영 멈췄다)
          if (!pushed && relaxOk) dx = Math.sign(dx) * Math.max(0, Math.abs(dx) - Math.max(2, Math.abs(dx) * 0.1));
          dx = Math.max(-60, Math.min(60, dx));
          // 전장 밖으로는 밀지 않는다 — 원거리 동료가 왼쪽 가장자리 밖(+24px)으로 나가 verify-anim-clip 이 잡았다
          const minDx = fr.left + 28 - b.base.left;
          const maxDx = mon ? mon.left - 6 - b.base.right : fr.right - 28 - b.base.right;
          b.dx = Math.max(Math.min(minDx, 0), Math.min(Math.max(maxDx, 0), dx));
        }
      }
      for (const it of items.slice(1)) {
        const next = Math.abs(it.dx) < 0.5 ? 0 : Math.round(it.dx);
        if (Math.abs(next - it.cur) >= 2) it.el.style.setProperty("--sep-dx", `${next}px`);   // 2px 미만 변화는 쓰지 않는다 — 전환이 계속 돌지 않게
      }
      if (settled) sepFrozenRef.current = true;
    };
    const id = window.setInterval(tick, 320);
    return () => window.clearInterval(id);
  }, []);
  const toastTimer = useRef<number | null>(null);
  /** 동료별 누적 공격 수 — N 타마다 시그니처 기술 (allySignature.ts) */
  const allyAttackNo = useRef<Partial<Record<TitanHeroId, number>>>({});
  // DEV 훅 (2026-10-14) — 시그니처 부가 효과 실검사(shoot-all-allies)가 대장 제한 시간·정지 시각을 읽는다. 출시 번들엔 없다
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    (window as unknown as { __huntState?: () => unknown }).__huntState = () => ({ now: performance.now(), bossLeft: bossLeftRef.current, freezeUntil: buffsRef.current.freezeUntil, boss: !!bossRef.current, dmg: { ...devDmgRef.current }, kills: saveRef.current.totalKills, stage: saveRef.current.stage, phase: battlePhaseRef.current, formation: formationReadyRef.current });
    (window as unknown as { __huntDmgReset?: () => void }).__huntDmgReset = () => { devDmgRef.current = {}; };
    return () => { delete (window as unknown as { __huntState?: unknown }).__huntState; delete (window as unknown as { __huntDmgReset?: unknown }).__huntDmgReset; };
  }, []);
  const allyAttackAcc = useRef<Record<TitanHeroId, number>>(Object.fromEntries(ALLY_IDS.map((id, index) => [id, (index * .17) % 1])) as Record<TitanHeroId, number>);
  const autoAttackAcc = useRef(0);
  const burnAcc = useRef(0);
  /** L 보스 실패 후 광고 +10초 — 다음 보스 도전 1회에만 적용 */
  const bossRetryBonusRef = useRef(0);
  const attackUntil = useRef(0);
  const animResetRef = useRef(false);
  const animModeRef = useRef<"idle" | "attack">("idle");
  /** 주인공이 걸어 들어오는 중 — 칸 넘기기(rAF)가 걷기 칸을 쓴다 */
  const heroWalkRef = useRef(false);
  /** 이번 만남 걷는 시간 ÷ 기준 1250ms — 주인공 걷기 칸도 그만큼 느리게/빠르게 (발이 미끄러지지 않게) */
  const heroWalkRateRef = useRef(1);
  useEffect(() => { heroWalkRef.current = partyApproach; }, [partyApproach]);
  const battlePhaseRef = useRef<BattlePhase>("combat");
  const battleTimers = useRef<number[]>([]);
  const pendingStageRef = useRef<number | null>(null);
  const formationReadyRef = useRef(false);
  const bossFailStreakRef = useRef(0);
  const killCountsRef = useRef<Partial<Record<TitanMonsterKind, number>>>({});
  /** castSkill은 렌더마다 재생성 — 전투 인터벌(의존성 없음)에서 최신본을 쓰기 위한 ref */
  const castSkillRef = useRef<(id: TitanSkillId) => void>(() => {});
  /**
   * 저사양 판정 (점검표 #12) — 코어 4개 이하 또는 메모리 3GB 이하면 이펙트·숫자
   * 동시 개수를 줄이고 대기 호흡 애니메이션을 끈다. 동료는 이미 출전 인원만 렌더한다.
   */
  const lowFxRef = useRef<boolean>(
    (navigator.hardwareConcurrency ?? 8) <= 4 ||
      ((navigator as unknown as { deviceMemory?: number }).deviceMemory ?? 8) <= 3,
  );

  useEffect(() => {
    saveRef.current = save;
  }, [save]);
  useEffect(() => {
    characterRef.current = character;
  }, [character]);
  useEffect(() => {
    tabRef.current = tab;
  }, [tab]);
  useEffect(() => {
    waveRef.current = wave;
  }, [wave]);
  useEffect(() => {
    bossRef.current = boss;
  }, [boss]);
  useEffect(() => {
    chestRef.current = chesterson;
  }, [chesterson]);
  useEffect(() => {
    hpRef.current = hp;
  }, [hp]);
  useEffect(() => {
    bossLeftRef.current = bossLeft;
  }, [bossLeft]);
  useEffect(() => {
    buffsRef.current = buffs;
  }, [buffs]);
  useEffect(() => {
    cdsRef.current = cds;
  }, [cds]);
  useEffect(() => {
    animModeRef.current = animMode;
  }, [animMode]);
  useEffect(() => {
    battlePhaseRef.current = battlePhase;
  }, [battlePhase]);

  const later = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    battleTimers.current.push(id);
  }, []);

  /** 방치 캡이 차는 시각에 로컬 푸시 예약 — 정산할 때마다 갱신 (네이티브에서만 동작) */
  /** retention-6: 주간 도전 마감(일 20시) — 미수령이 남아 있을 때만 예약, 다 받았으면 취소 */
  const scheduleWeeklyDeadlineNotify = useCallback((ev: EventSave) => {
    const at = weeklyDeadlineAt();
    const unclaimed = weeklyChallenges(ev.week).filter((ch) => !ev.weeklyClaimed.includes(ch.id)).length;
    if (!at || unclaimed === 0) { void cancelLocalNotification([NOTIFY_ID.weeklyDeadline]); return; }
    void scheduleLocalNotification(NOTIFY_ID.weeklyDeadline, "주간 도전 마감 임박", `오늘 밤 초기화 — 아직 받지 않은 주간 보상 ${unclaimed}개가 있어요.`, at);
  }, []);
  // 알림 권한은 두 번째 접속 · 튜토리얼 뒤에만 묻는다 (native.setNotifyPromptAllowed, 2026-10-06)
  useEffect(() => { setNotifyPromptAllowed(character.sessionCount >= 2 && character.onboardingStep >= 4); }, [character.sessionCount, character.onboardingStep]);
  useEffect(() => { scheduleWeeklyDeadlineNotify(events); }, [events, scheduleWeeklyDeadlineNotify]);
  const scheduleIdleCapNotify = useCallback((progress: CharacterProgress) => {
    const at = new Date(Date.now() + idleCapHours(progress) * 3600 * 1000);
    void scheduleLocalNotification(
      NOTIFY_ID.idleCap,
      "방치 보상이 가득 찼어요",
      "사냥터 보상이 캡에 닿았습니다. 지금 정산하면 손해가 없어요!",
      at,
    );
  }, []);

  // 보스 제한시간 — 방진 시너지(§2)와 아기 늑대 펫(§1)이 연장한다.
  // spawn이 의존성 없는 콜백이라 ref로 전달한다.
  // + 탱커 도발(역할 효과 +5초/명) + 댐지기의 혼(패시브)
  const bossTimeSec = useMemo(
    () =>
      BOSS_TIME_SEC +
      partySynergies(fieldedParty(character.partyIds, stageCeilingFor(character.pioneeredArea), character.claimedRewards)).effects.bossTimeBonus +
      partyRoleEffects(character.partyIds).bossTimeBonus +
      passiveTotals(save.skillInventory.learned, save.skillInventory.equipped, save.skillInventory.levels).bossTime +
      activePetEffect(character.pets, character.activePet, "bossTime") +
      save.huntMods.bossTimeBonus +
      gearEffects(gearMasteryOf(save.equipmentTraining), character.gearEnhance).bossTimeSec +   // 투구 (equipment/parts)
      permanentEffects(character).bossTimeSec,   // 서리 유물 (titans/relics.ts)
    [character.partyIds, character.pets, character.activePet, save.skillInventory, save.huntMods, save.equipmentTraining, character.gearEnhance, character.relics],
  );
  /** 결정 강화 트리 × 유물 (progression/crystalTree.ts, 2026-10-26) — 탭 · 동료 · 대장 · 골드 배율 */
  const perm = useMemo(() => permanentEffects(character), [character.crystalTree, character.relics]);
  const permRef = useRef(perm);
  permRef.current = perm;
  const bossTimeRef = useRef(bossTimeSec);
  useEffect(() => {
    bossTimeRef.current = bossTimeSec;
  }, [bossTimeSec]);

  const spawn = useCallback((stage: number, nextWave: number, asBoss: boolean) => {
    relicBurnPoolRef.current = 0;   // 앞 대상에 모인 화상이 새 몬스터에 떨어지지 않게
    const isChest = !asBoss && Math.random() < 0.04;
    const mhp = monsterHp(stage, asBoss) * (isChest ? 1.6 : 1);
    setWave(nextWave);
    setBoss(asBoss);
    setChesterson(isChest);
    setHp(mhp);
    setMaxHp(mhp);
    setBossLeft(bossTimeRef.current);
    waveRef.current = nextWave;
    bossRef.current = asBoss;
    chestRef.current = isChest;
    hpRef.current = mhp;
    bossLeftRef.current = bossTimeRef.current;
    // 원정대 체력은 대장전마다 가득 (일반 몬스터의 공격은 숫자만)
    partyHpRef.current = 1;
    setPartyHp(1);
    partyDownRef.current = false;
    lastBossHitLeftRef.current = bossTimeRef.current;
    // 보스 약점 — 보스전 시작과 함께 첫 창. 일반 몬스터는 약점 없음
    const weak = asBoss ? rollBossWeak(performance.now(), null, Math.random, WEAK_WINDOW_MS + saveRef.current.huntMods.weakWindowMs + allyFeatureEffects(characterRef.current.partyIds).weakWindowMs) : null;
    bossWeakRef.current = weak;
    setBossWeak(weak);
    formationReadyRef.current = false;
    setFormationReady(false);
    // 자리 다시 잡기는 대열이 화면 밖일 때만 (2026-10-20, 사용자: "몬스터도 오른쪽 끝에서부터 걸어오게 · 캐릭터도 자연스럽게 방향이 정해지면 걸어오게 —
    // 지금은 어색하게 y로 각각 움직임"). STAGE CLEAR 뒤엔 대열이 오른쪽으로 뛰어 나갔다(stage-exit) 왼쪽에서 들어오므로(stage-enter) 그 사이 새 높이로 옮겨
    // 두면 화면에서는 왼쪽에서 가로로 걸어 들어온다. 대장 바로 부르기처럼 대열이 화면에 있으면 자리를 그대로 두고 몬스터만 들어온다
    const relocate = battlePhaseRef.current === "stage-exit" || !spawnedOnceRef.current;
    spawnedOnceRef.current = true;
    // 장비 탈부착은 다음 서브 스테이지에 (2026-10-28, 사용자: "메인 스테이지 예약이 아니라 1-1 처럼 서브스테이지 다음때") — 새 몬스터(대장 · 반복 사냥 포함)를 부를 때 고른 장비를 든다
    // 같은 장비면 상태를 바꾸지 않는다 — 몬스터마다 새 객체로 다시 그리지 않게
    const want = lookWantedRef.current;
    if (want) setAppliedLook((prev) => (prev && prev.weaponKind === want.weaponKind && prev.weaponSkin === want.weaponSkin && prev.shoulder === want.shoulder ? prev : { ...want }));
    setMonsterIn(false);
    if (relocate) setFormationEngaged(false);
    const rolledKind = monsterKind(stage, asBoss, isChest);
    const speedBase = rolledKind === "wolf" ? 820 : rolledKind === "slime" ? 1180 : rolledKind === "ogre" ? 1550 : rolledKind === "dragon" ? 1080 : asBoss ? 1500 : 1250;
    // 걷는 속도 (2026-10-20, 사용자: "걷는 속도도 항상 같지 않게") — 종별 기준에 만남마다 0.7~1.3배(예전 0.88~1.12 는 늘 같아 보였다)
    const durationMs = Math.round(speedBase * (.7 + Math.random() * .6));
    if (relocate) heroWalkRateRef.current = durationMs / 1250;
    const monsterJit = Math.random() * 2;
    setEncounterMotion((prev) => !relocate ? { ...prev, durationMs, monsterRight: (rolledKind === "dragon" ? 2 : 8) + prev.monsterJit, partyMl: prev.partyMl } : ({
      // 바닥 스폰 배치: 주인공 16~19% · 근접 동료 14~24%(몬스터 왼쪽에 붙음) · 몬스터는 오른쪽 28~34%(폭 30% → 왼쪽 가장자리 36~42%)
      // 2026-10-08 사용자: 주인공·동료 겹침 — 주인공 54~66px 가 되면서 근접 슬롯(몬스터 왼쪽에 붙음)과 100% 겹쳤다.
      // 몬스터를 오른쪽으로(30 → 16%) 물려 왼쪽부터 원거리(0~3%) · 주인공(28%) · 근접(몬스터 왼쪽) · 몬스터 네 띠가 생긴다
      heroLeft: 26 + Math.random() * 2,
      // 흔들림을 ±1%로 — 근접 동료가 몬스터 좌표에 붙으므로(App.css) 넓게 흔들면 주인공과 겹친다
      // 용은 2026-10-02 에 보이는 몸이 상자를 꽉 채우는 드레이크로 바뀌어(여백 23/32% → 4/2%) 근접 동료가 20px 왼쪽에 붙으며 주인공을 덮었다 — 더 오른쪽에 세운다
      // 390px 실측: 몬스터 오른쪽 8% → 왼쪽 가장자리 247px, 근접 163~237, 주인공 26% = 101~155, 원거리 0~3% = 50~124 — 네 띠가 겹치지 않는다
      monsterRight: (rolledKind === "dragon" ? 2 : 8) + monsterJit,
      monsterJit,
      partyMeetRight: (rolledKind === "dragon" ? 2 : 8) + monsterJit,
      partyMl: monsterVisibleMargin(monsterAssetFor(rolledKind, huntingArea(stage), asBoss, isChest, "idle", stage))[0],
      durationMs,
      seq: prev.seq + 1,
      // 무리마다 깊이 — lanePair 주석
      // 전장이 아직 안 그려졌으면(불러온 직후 첫 스테이지) 창 높이로 가늠 — 390×844 창의 전장 490 · 360×640 은 380 (전장 ≈ 창 높이의 0.58)
      ...lanePair((document.querySelector(".titans-field")?.getBoundingClientRect().height || window.innerHeight * 0.58) >= WIDE_FIELD_MIN_H),
    }));
    // 두 프레임 뒤에 — 한 프레임 안에 꺼짐 · 켜짐이 같이 계산되면 몬스터가 오른쪽 밖 자리를 거치지 않고(전환 없음) 걸어 들어오지 않았다
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => { setFormationEngaged(true); setMonsterIn(true); if (relocate) setPartyApproach(true); }));
    const approachMs = durationMs + 120;
    const formationTimer = window.setTimeout(() => {
      formationReadyRef.current = true;
      setFormationReady(true);
      setPartyApproach(false);
    }, approachMs);
    formationTimerRef.current = formationTimer;
    battleTimers.current.push(formationTimer);
  }, []);
  // 장비 탈부착은 다음 서브 스테이지에 (2026-10-28) — 무기 · 무기 외형 · 견갑을 바꾸면 저장은 바로, 사냥터의 모습 · 공격은 다음 몬스터가 나올 때(spawn).
  // 불러온 직후 · 스테이지가 바뀔 때도 한 번(대비)
  const lookWanted = { weaponKind: wantedWeaponKind, weaponSkin: character.equippedWeaponSkin ?? "", shoulder: equippedShoulder };
  lookWantedRef.current = lookWanted;
  useEffect(() => {
    if (!ready || !lookWantedRef.current) return;
    setAppliedLook({ ...lookWantedRef.current });
  }, [ready, save.stage]);
  const lookPending = !!appliedLook && (appliedLook.weaponKind !== lookWanted.weaponKind || appliedLook.weaponSkin !== lookWanted.weaponSkin || appliedLook.shoulder !== lookWanted.shoulder);
  // DEV 훅 — 검사가 스테이지를 넘기지 않고 고른 장비를 바로 들게(verify-weapons-play 등)
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    (window as unknown as { __huntApplyLook?: () => void }).__huntApplyLook = () => { if (lookWantedRef.current) setAppliedLook({ ...lookWantedRef.current }); };
    return () => { delete (window as unknown as { __huntApplyLook?: unknown }).__huntApplyLook; };
  }, []);
  // DEV 훅 (2026-10-27) — 대장의 반격 실검사(_probe-b-items)가 일반 몬스터 10마리를 기다리지 않고 지금 층의 대장전을 연다. 출시 번들엔 없다
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    (window as unknown as { __huntStartBoss?: () => void }).__huntStartBoss = () => {
      setBossReady(false);
      spawn(saveRef.current.stage, MOBS_PER_STAGE, true);
      battlePhaseRef.current = "combat";
      setBattlePhase("combat");
    };
    return () => { delete (window as unknown as { __huntStartBoss?: unknown }).__huntStartBoss; };
  }, [spawn]);

  useEffect(() => {
    let cancelled = false;
    preloadTitanSheets();
    void Promise.all([loadTitansSave(userHash), loadCharacterProgress(userHash)]).then(([rawLoaded, rawProgress]) => {
      if (cancelled) return;
      const loaded = rawLoaded;
      let progress = rawProgress;

      // 도감(§7) 보유 동기화 — effectiveStars의 암묵 ★1을 저장값에도 반영해야
      // progress만 보는 도감 전투력·성급 마일스톤이 보유 동료를 셀 수 있다.
      const starsFix = ALLY_IDS.filter((id) => loaded.heroes[id] > 0 && (progress.allyStars[id] ?? 0) <= 0);
      // 편성(§2) 소급 — 편성 도입 전 세이브는 전원이 출전 중이었다. 보유 수만큼(최대 6)
      // 슬롯 하한을 보장하고, DPS 상위 순으로 자동 편성해 전력 손실 없이 넘어온다.
      const owned = HEROES.filter((h) => loaded.heroes[h.id] > 0);
      const needsParty = progress.partyIds.length === 0 && owned.length > 0;
      if (starsFix.length > 0 || needsParty) {
        const cap = needsParty ? Math.min(6, Math.max(progress.partyCap, owned.length)) : progress.partyCap;
        const autoParty = needsParty
          ? [...owned]
              .sort(
                (a, b) =>
                  heroDps(b, loaded.heroes[b.id]) * starMultiplier(effectiveStars(progress.allyStars[b.id], loaded.heroes[b.id])) -
                  heroDps(a, loaded.heroes[a.id]) * starMultiplier(effectiveStars(progress.allyStars[a.id], loaded.heroes[a.id])),
              )
              .slice(0, partySlotCount(progress.towerBestFloor, cap))
              .map((h) => h.id)
          : progress.partyIds;
        const stars = { ...progress.allyStars };
        starsFix.forEach((id) => {
          stars[id] = 1;
        });
        progress = { ...progress, allyStars: stars, partyIds: autoParty, partyCap: cap };
        void updateCharacterProgress(userHash, (current) => {
          const merged = { ...current.allyStars };
          starsFix.forEach((id) => {
            merged[id] = Math.max(1, merged[id] ?? 0);
          });
          return {
            ...current,
            allyStars: merged,
            partyIds: current.partyIds.length === 0 ? autoParty : current.partyIds,
            partyCap: Math.max(current.partyCap, cap),
          };
        });
      }

      // 은퇴한 동료·스킬의 환불 — normalizeTitansSave 가 계산해 둔 보석·SP 를 진행도에 얹고 비운다 (2026-10-01)
      if (loaded.pendingRefund && (loaded.pendingRefund.gems > 0 || loaded.pendingRefund.sp > 0)) {
        const r = loaded.pendingRefund;
        progress = { ...progress, redGems: progress.redGems + r.gems, skillPoints: progress.skillPoints + r.sp };
        void updateCharacterProgress(userHash, (current) => ({ ...current, redGems: current.redGems + r.gems, skillPoints: current.skillPoints + r.sp }));
        loaded.pendingRefund = null;
        void saveTitansSave(userHash, loaded);
      }

      // 동료 값 조정(2026-10-27) — 다시 계산한 레벨 · 돌려준 골드를 한 번 알리고 비운다
      if (loaded.rebalanceNotice && loaded.rebalanceNotice.changes.length > 0) {
        setRebalanceInfo(loaded.rebalanceNotice);
        loaded.rebalanceNotice = null;
        void saveTitansSave(userHash, loaded);
      }

      // 번개 강화 삭제(2026-10-28) — 옛 단계에 쓴 골드를 돌려줬다는 걸 한 번 알린다
      if ((loaded.lightningRefund ?? 0) > 0) {
        const g = loaded.lightningRefund ?? 0;
        window.setTimeout(() => flash(`번개 강화를 없앴어요 · 쓴 골드 ${formatGold(g)} 돌려받음`, 4000, true), 1200);   // 한 번뿐인 알림이라 4초
        loaded.lightningRefund = 0;
        void saveTitansSave(userHash, loaded);
      }

      // 개척하지 않은 지역으로는 진입할 수 없다 — 저장값이 앞서 있으면 경계로 되돌린다.
      const ceiling = qaUnlockOpen() ? Number.MAX_SAFE_INTEGER : stageCeilingFor(progress.pioneeredArea);   // 테스트 모드는 지역 문 없음(대장 처치 판정과 같이)
      const stage = Math.min(loaded.stage, ceiling);
      // idleClaimedAt은 마지막 보상 수령 시각이라 플레이 중에도 오래될 수 있다.
      // 실제 사냥터 저장 시각을 써야 콘텐츠 탭 이동을 오프라인 복귀로 오인하지 않는다.
      const lastActiveAt = loaded.lastActiveAt || progress.idleClaimedAt || Date.now();
      const awaySeconds = Math.max(0, (Date.now() - lastActiveAt) / 1000);
      const eligibleAwaySeconds = awaySeconds >= IDLE_REPORT_MIN_SECONDS ? awaySeconds : 0;
      const result = computeIdleYield(progress, stage, loaded.skillInventory.equipped, eligibleAwaySeconds);

      // P1 따라잡기 — 방치가 진행시킨 스테이지(endStage)에서 재개한다
      const resumeStage = Math.max(stage, result.endStage);
      setSave({ ...loaded, stage: resumeStage, lastActiveAt: Date.now() });
      setCharacter(progress);
      setEquippedShoulder(progress.equippedShoulder);
      setSkillPoints(progress.skillPoints);
      setRedGems(progress.redGems);
      // 첫 접속 보석 1000 은 30일 출석 첫날 칸으로 옮겼다(AttendanceModal, 2026-10-22 "출석 1,000") — 받으면 claimedRewards 에 welcome-gift
      if (!progress.discoverySeeded) {
        const seeded = [
          ...Object.entries(progress.monsterKills).filter(([, n]) => (n ?? 0) > 0).map(([k]) => discoveryKey("monster", k)),
          ...HEROES.filter((h) => (loaded.heroes[h.id] ?? 0) > 0).map((h) => discoveryKey("ally", h.id)),
          ...Array.from({ length: Math.max(0, loaded.acorns.best) }, (_, i) => discoveryKey("acorn", i + 1)),
        ];
        void updateCharacterProgress(userHash, (cur) => ({ ...cur, discoverySeeded: true, discovered: [...new Set([...cur.discovered, ...seeded])] })).then(setCharacter);
      }

      // 오프라인 10분 이상일 때만 정산 화면과 보상을 만든다.
      // 짧은 새로고침·콘텐츠 이동은 보상 수령 시각도 변경하지 않는다.
      if (awaySeconds >= IDLE_REPORT_MIN_SECONDS && result.seconds >= IDLE_REPORT_MIN_SECONDS && result.gold > 0) {
        // 희귀 드랍 — 쌓인 시간마다 낮은 확률로 유물 조각 · 스킬 카드(골드 뽑기 풀). DEV 검사는 __idleRareForce 로 개수를 고정한다
        const force = import.meta.env.DEV ? (window as unknown as { __idleRareForce?: { relicShards: number; skillCards: number } }).__idleRareForce : undefined;
        const rare = force ?? rollIdleRareDrops(result.seconds);
        setIdleReport({
          result,
          stage,
          bottleneck: idleBottleneck(progress, result, resumeStage, progress.pioneeredArea),
          drops: {
            relics: drawRelicShards(relicMerged(progress.relics, progress.relicSpare), rare.relicShards, Math.random, "gold").got,
            skills: drawSkillCopies(loaded.skillInventory, rare.skillCards, "gold").got,
          },
        });
      }

      spawn(resumeStage, 1, false);
      saveFrozenRef.current = false;   // 다시 불러온 저장으로 준비됐다 — 환생 중 멈춘 저장을 푼다
      setReady(true);
      scheduleIdleCapNotify(progress);
      // 자동 환생을 켰는데 이미 조건을 채운 채 들어오면(마이페이지에서 켜고 돌아온 경우) 잠깐 뒤 환생
      if (progress.autoRebirth && canRebirthNow(progress)) window.setTimeout(() => void autoRebirthRef.current(), 2500);
      // 세션 카운트(종료 예고 카드는 첫 3세션) + 이벤트 저장 로드
      void updateCharacterProgress(userHash, (current) => {
        // 원정 후원 계약(월정액) — 하루 1회 보석 지급. 결제 연동 시 patronUntil이 세팅된다
        const today = new Date().toLocaleDateString("sv-SE");
        const patronDue = current.patronUntil > Date.now() && current.patronClaimedDate !== today;
        return {
          ...current,
          sessionCount: current.sessionCount + (reloadKey > 0 ? 0 : 1),   // 자동 환생으로 다시 불러온 것은 새 세션이 아니다
          redGems: current.redGems + (patronDue ? PATRON.dailyGems : 0),
          patronClaimedDate: patronDue ? today : current.patronClaimedDate,
        };
      }).then((next) => {
        setCharacter(next);
        setRedGems(next.redGems);
        if (next.patronUntil > Date.now() && next.patronClaimedDate === new Date().toLocaleDateString("sv-SE") && next.redGems > progress.redGems) flash(`후원 계약 · 오늘의 보석 +${PATRON.dailyGems}`);
      });
      void loadEventSave(userHash).then(setEvents);
    });
    return () => {
      cancelled = true;
      if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
      battleTimers.current.forEach(window.clearTimeout);
      battleTimers.current = [];
    };
  }, [userHash, spawn, scheduleIdleCapNotify, reloadKey]);

  useEffect(() => {
    if (!ready || saveFrozenRef.current) return;
    void saveTitansSave(userHash, { ...save, lastActiveAt: Date.now() });
  }, [ready, save, userHash]);

  /** 방치 보상 확정 — 골드는 사냥터 저장에, EXP·강화석은 공유 진행도에 들어간다. */
  const claimIdle = useCallback(
    (then?: () => void, goldMult = 1) => {
      const report = idleReport;
      if (!report) return;
      setIdleReport(null);
      // L 보상형 광고 2배 — 골드만 2배 (조각·EXP·강화석은 그대로)
      if (goldMult !== 1) report.result = { ...report.result, gold: Math.floor(report.result.gold * goldMult) };
      // 방치 골드는 공유 지갑(대장간 소비처)으로 간다.
      // 사냥터 자체 골드(save.gold)는 액티브 전투 보상으로 남겨 방치가 플레이를 대체하지 않게 한다.
      void updateCharacterProgress(userHash, (current) => {
        // 조각 드랍 (4h당 1개) — 보유 동료 중 무작위 배분
        const shards = { ...current.allyShards };
        for (let i = 0; i < report.result.allyShardDrops; i += 1) {
          const target = randomOwnedAlly(saveRef.current.heroes, Math.random, current.partyIds);
          shards[target] = (shards[target] ?? 0) + 1;
        }
        return {
          ...current,
          sharedCoins: current.sharedCoins + report.result.gold,
          exp: current.exp + report.result.exp,
          enhancementMaterials: current.enhancementMaterials + report.result.materials,
          allyShards: shards,
          relicSpare: addRelicSpare(current.relicSpare, report.drops.relics),   // 희귀 드랍 유물 조각 → 남은 조각(유물 탭에서 소진)
          idleClaimedAt: Date.now(),
          // 온보딩 마지막 단계(§8) — 첫 방치 정산이 이벤트·상점을 연다
          onboardingStep: current.onboardingStep === 3 ? 4 : current.onboardingStep,
          // 복귀 워밍업 (RETENTION C): 2h+ 이탈 후 정산 = 5분 골드 ×2, 하루 3회
          ...(() => {
            const today = new Date().toLocaleDateString("sv-SE");
            const day = current.warmupDay.date === today ? current.warmupDay : { date: today, count: 0 };
            if (report.result.seconds + report.result.wastedSeconds < 2 * 3600 || day.count >= 3) return {};
            return { warmupUntil: Date.now() + 5 * 60 * 1000, warmupDay: { date: today, count: day.count + 1 } };
          })(),
        };
      }).then((next) => {
        if (report.drops.skills.length) {
          // 희귀 드랍 스킬 카드 → 스킬 카드(상점 스킬 뽑기와 같은 곳 — 스킬 탭에서 배우거나 소진)
          setSave((prev) => {
            const copies = { ...(prev.skillInventory.copies ?? {}) };
            for (const id of report.drops.skills) copies[id] = (copies[id] ?? 0) + 1;
            return { ...prev, skillInventory: { ...prev.skillInventory, copies } };
          });
        }
        trackEvent("dungeon_reward_claim", { stage: report.stage, reward: report.result.gold, duration: Math.round(report.result.seconds) });
        const finishedOnboarding = characterRef.current.onboardingStep === 3 && next.onboardingStep === 4;
        setCharacter(next);
        setSkillPoints(next.skillPoints);
        scheduleIdleCapNotify(next);
        if (finishedOnboarding) {
          sfxSlotUnlock();
          setUnlockBanner(4);
          window.setTimeout(() => setUnlockBanner(null), 3200);
        }
        then?.();
      });
    },
    [idleReport, userHash, scheduleIdleCapNotify],
  );

  // Idle / attack sprite playback
  useEffect(() => {
    if (!ready) return;
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      acc += dt;
      // 공격 시작 시 누적치를 비운다 — idle에서 남은 최대 150ms가 그대로 이월되면
      // 와인드업(0번) 프레임이 간헐적으로 즉시 넘어가 펀치가 뚝 끊겨 보인다.
      if (animResetRef.current) {
        animResetRef.current = false;
        acc = 0;
      }
      const attacking = animModeRef.current === "attack" && now < attackUntil.current;
      if (!attacking && animModeRef.current === "attack") {
        animModeRef.current = "idle";
        setAnimMode("idle");
        setFrameIdx(0);
        acc = 0;
      }
      // 애니메이션 2판(2026-10-19): 동작마다 칸 수·속도가 다르다 — 대기 6칸 1.2s · 걷기 6칸 0.6s(걸어 들어올 때) · 공격 8칸 0.48s
      const mode = attacking ? "attack" : heroWalkRef.current ? "walk" : "idle";
      const step = heroFrameMs(mode) * (mode === "walk" ? heroWalkRateRef.current : 1);
      if (acc >= step) {
        const steps = Math.floor(acc / step);
        acc -= steps * step;
        setFrameIdx((i) => (i + steps) % heroFrames(mode));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [ready]);

  // 보상 팝업은 줄을 세운다 — 환영 선물 위로 첫 처치 발견이 바로 덮어 쓰던 것(2026-10-22). 밀리면 오래된 발견부터 버린다
  const pumpRewardPop = () => {
    const next = rewardQueueRef.current.shift();
    if (!next) { rewardBusyRef.current = false; setRewardPop(null); return; }
    rewardBusyRef.current = true;
    setRewardPop({ ...next, key: Date.now() + Math.random() });
    window.setTimeout(pumpRewardPop, next.tone === "gift" ? 4800 : 2800);
  };
  const showRewardPop = (tone: "discovery" | "ladder" | "gift" | "relic", kicker: string, title: string, detail: string, icon?: string) => {
    const q = rewardQueueRef.current;
    q.push({ tone, kicker, title, detail, icon });
    if (q.length > 3) { const i = q.findIndex((x) => x.tone === "discovery"); q.splice(i >= 0 ? i : 0, 1); }
    if (!rewardBusyRef.current) pumpRewardPop();
  };
  /** 첫 발견 — 처음 한 번만 보석 + 팝업 (titans/discovery.ts). 옮겨 담기(seeded) 전에는 주지 않는다 */
  const discover = (kind: DiscoveryKind, id: string | number, name: string) => {
    const key = discoveryKey(kind, id);
    const c = characterRef.current;
    if (!c.discoverySeeded || c.discovered.includes(key) || discoveredLocalRef.current.has(key)) return;
    discoveredLocalRef.current.add(key);
    const gems = discoveryGems(kind, id);
    void updateCharacterProgress(userHash, (cur) => (cur.discovered.includes(key) ? cur : { ...cur, discovered: [...cur.discovered, key], redGems: cur.redGems + gems }))
      .then((next) => { setCharacter(next); setRedGems(next.redGems); });
    showRewardPop("discovery", discoveryTitle(kind), name, gems > 0 ? `첫 발견 보상 · 보석 +${gems}` : "도감에 기록");
  };
  /** 자동 환생 — 마이페이지 단추와 같은 처리(progression/rebirth.ts) 뒤 사냥터를 다시 불러온다 */
  const autoRebirth = async () => {
    const cur = characterRef.current;
    if (autoRebirthBusyRef.current || !cur.autoRebirth || !canRebirthNow(cur)) return;
    autoRebirthBusyRef.current = true;
    saveFrozenRef.current = true;
    let reloaded = false;
    try {
      const r = await performRebirth(userHash, cur);
      reloaded = true;
      window.setTimeout(() => { saveFrozenRef.current = false; }, 10000);   // 안전망 — 다시 불러오기가 어떤 이유로 준비에 닿지 못해도 저장이 영영 멈추지 않게
      setCharacter(r.next);
      setRedGems(r.next.redGems);
      // 진행 중이던 전투 연출(STAGE CLEAR → 퇴장 → 입장)을 끊는다 — 다시 불러오기가 그 타이머를 지워 단계가 멈춰 있었다
      battlePhaseRef.current = "combat";
      setBattlePhase("combat");
      pendingStageRef.current = null;
      setBossReady(false);
      bossFailStreakRef.current = 0;
      setReady(false);
      setReloadKey((k) => k + 1);
      // later() 는 다시 불러오기 정리에서 지워진다 — 그냥 타이머로
      window.setTimeout(() => showRewardPop("ladder", `자동 환생 · ${r.next.rebirthCount}회`, `${r.startStage}층부터 다시`, `결정 +${r.crystals}(쓸 결정 ${freeCrystals(r.next)} — 마이페이지 결정 강화) · 출발 골드 ${formatGold(r.startGold)} · 24시간 방치 2배`), 600);
    } finally {
      autoRebirthBusyRef.current = false;
      if (!reloaded) saveFrozenRef.current = false;   // 환생이 실패하면 저장을 다시 연다
    }
  };
  const autoRebirthRef = useRef(autoRebirth);
  autoRebirthRef.current = autoRebirth;
  // 한 번뿐인 안내(hold)는 떠 있는 동안 흔한 안내(황금 몬스터 등)가 덮지 못한다 — 번개 환급 안내가 1초 만에 지워졌다(2026-10-28)
  const toastHoldUntil = useRef(0);
  const flash = (msg: string, ms = 1400, hold = false) => {
    if (!hold && Date.now() < toastHoldUntil.current) return;
    if (hold) toastHoldUntil.current = Date.now() + ms;
    setToast(msg);
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), ms);
  };

  // 부팅 스토어 정산(App → payments/reconcile)이 지급·회수했으면 화면과 스킬 코어를 맞춘다
  useEffect(() => {
    const onReconciled = (e: Event) => {
      const d = (e as CustomEvent<{ granted: number; revoked: number; cores: number; handled: boolean }>).detail;
      if (!d) return;
      d.handled = true;
      void loadCharacterProgress(userHash).then((next) => { setCharacter(next); setRedGems(next.redGems); });
      setToast(d.granted ? `결제 ${d.granted}건을 지급했습니다` : `환불된 구매 ${d.revoked}건을 회수했습니다`);
      if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
      toastTimer.current = window.setTimeout(() => setToast(""), 2400);
    };
    window.addEventListener("dodgebullets:store-reconciled", onReconciled);
    return () => window.removeEventListener("dodgebullets:store-reconciled", onReconciled);
  }, [userHash]);
  useEffect(() => {
    if (!ready || coresMovingRef.current || character.pendingSkillCores <= 0) return;
    coresMovingRef.current = true;
    let moved = 0;
    void updateCharacterProgress(userHash, (current) => { moved = current.pendingSkillCores; return { ...current, pendingSkillCores: 0 }; })
      .then((next) => {
        if (moved > 0) setSave((prev) => ({ ...prev, skillInventory: { ...prev.skillInventory, skillCores: prev.skillInventory.skillCores + moved } }));
        setCharacter(next);
      })
      .catch(() => undefined)
      // 옮기는 동안 더 쌓였으면(시즌 패스 모두 받기) 다시 읽어 이어 옮긴다
      .finally(() => { coresMovingRef.current = false; void loadCharacterProgress(userHash).then((p) => { if (p.pendingSkillCores > 0) setCharacter(p); }); });
  }, [ready, character.pendingSkillCores, userHash]);
  // 불러온 뒤 한 번 (2026-10-28, 사용자 확정): ① 시즌 패스 코어 보상 — 예전엔 받은 코어가 사냥터 저장에 덮여 사라질 수 있었다(economy/seasonPass.seasonCoreRefund).
  // ② 유물 조각이 이제 '남은 조각'으로 쌓인다는 안내 — 소진할 조각이 처음 생겼을 때 한 번(claimedRewards "relic-spare-notice-v1")
  useEffect(() => {
    if (!ready) return;
    let refund = 0, notice = false;
    void updateCharacterProgress(userHash, (cur) => {
      refund = seasonCoreRefund(cur);
      notice = !cur.claimedRewards.includes("relic-spare-notice-v1") && RELICS.some((r) => relicSpareUsable(cur.relics, cur.relicSpare, r.id) > 0);
      const keys = [...(cur.claimedRewards.includes(SEASON_CORE_REFUND_KEY) ? [] : [SEASON_CORE_REFUND_KEY]), ...(cur.claimedRewards.includes(SEASON_CORE_REFUND_PAST_KEY) ? [] : [SEASON_CORE_REFUND_PAST_KEY]), ...(notice ? ["relic-spare-notice-v1"] : [])];
      if (keys.length === 0) return cur;
      return { ...cur, pendingSkillCores: cur.pendingSkillCores + refund, claimedRewards: [...cur.claimedRewards, ...keys] };
    }).then((next) => {
      setCharacter(next);
      if (refund > 0) flash(`시즌 패스 스킬 코어 ${refund}개를 다시 드렸어요 — 예전에 받은 코어가 사라질 수 있던 문제 보상`, 4000, true);
      else if (notice) flash("유물 조각은 이제 '남은 조각'으로 쌓여요 — 사냥터 → 유물에서 소진해 ★ 를 올리세요", 4000, true);
    }).catch(() => undefined);
  }, [ready, userHash]);
  // 다른 화면(이벤트 센터 시즌 패스)이 진행도에 코어를 쌓았다 — 다시 읽으면 위 효과가 사냥터 저장으로 옮긴다
  useEffect(() => {
    const onPending = () => void loadCharacterProgress(userHash).then((p) => { if (p.pendingSkillCores > 0) setCharacter(p); });
    window.addEventListener("dodgebullets:pending-cores", onPending);
    return () => window.removeEventListener("dodgebullets:pending-cores", onPending);
  }, [userHash]);

  const pushFx = (kind: FxBurst["kind"], x: number, y: number, hue?: number, el?: string) => {
    const id = ++fxId.current;
    setFx((prev) => [...prev.slice(lowFxRef.current ? -8 : -22), { id, kind, x, y, hue, el }]);
    window.setTimeout(() => {
      setFx((prev) => prev.filter((f) => f.id !== id));
    }, kind === "slash" || kind === "thrust" ? 360 : kind === "hit" || kind === "ally" || kind === "spark" ? 420 : kind === "burst" || kind === "debris" ? 620 : 850);
  };
  /**
   * 이펙트를 캐릭터 몸 위에 (2026-10-20, 사용자: "이펙트 위치가 이상해 — 캐릭터나 몬스터 근처로").
   * 예전엔 전장 고정 % (타격 72~82% · 38~52% 등)라 만남마다 깊이가 바뀌는 몬스터 · 대열(두 무리 깊이)을 따라가지 못하고 허공에 떴다.
   * 지금 그 캐릭터 상자를 재서 상자 안 비율(fx, fy)에 놓는다. 못 재면(전장 밖 · 아직 안 그려짐) 예전 고정 자리
   */
  const fxSpot = (target: "monster" | "hero" | "pet" | TitanHeroId, fx: number, fy: number, fallbackX: number, fallbackY: number, jitter = 0): { x: number; y: number } => {
    const field = fieldRef.current;
    const sel = target === "monster" ? ".titans-monster .titan-monster-art" : target === "hero" ? ".titans-hero .titans-hero-facing" : target === "pet" ? ".titans-pet" : `.titans-allies .ally-${target} .ally-body`;
    const el = field?.querySelector(sel) ?? (target === "hero" ? field?.querySelector(".titans-hero") : target !== "monster" && target !== "pet" ? field?.querySelector(`.titans-allies .ally-${target}`) : null);
    const fr = field?.getBoundingClientRect(), r = el?.getBoundingClientRect();
    if (!fr || !r || fr.width === 0 || r.width === 0) return { x: fallbackX, y: fallbackY };
    const j = () => (Math.random() - 0.5) * 2 * jitter;
    return { x: ((r.left + r.width * (fx + j()) - fr.left) / fr.width) * 100, y: ((r.top + r.height * (fy + j()) - fr.top) / fr.height) * 100 };
  };
  const pushFxAt = (kind: FxBurst["kind"], target: Parameters<typeof fxSpot>[0], fx: number, fy: number, fallbackX: number, fallbackY: number, hue?: number, jitter = 0, el?: string) => {
    const { x, y } = fxSpot(target, fx, fy, fallbackX, fallbackY, jitter);
    // 가장자리 캐릭터에 붙인 이펙트가 전장 밖으로 나가지 않게 반폭만큼 안쪽으로 — 시그니처(120px · 회전 · 고리)가 왼쪽 끝 원거리 동료 · 오른쪽 몬스터에서 삐져나갔다(verify-anim-clip)
    const fw = fieldRef.current?.getBoundingClientRect().width ?? 0;
    const half = fw > 0 ? ((kind.startsWith("sig-") ? 100 : kind === "burst" ? 68 : kind === "debris" || kind === "spark" ? 46 : 30) / fw) * 100 : 0;   // 시그니처는 120px 사각이 돌며 대각선 ≈170px · 큰 폭발 136px · 불꽃 · 파편 92px
    pushFx(kind, Math.max(half, Math.min(100 - half, x)), y, hue, el);
  };
  /** 치명타 · 스킬 · 특수기 순간 캐릭터를 0.06초 멈춘다(히트스톱) — 이펙트는 계속 돈다. 자리는 안 움직인다 (2026-10-21). 평타는 짧게(0.035초, 0.4초에 한 번) */
  const hitStop = (ms = 60, gap = 220) => {
    const el = fieldRef.current;
    const pn = performance.now();
    // 큰 타격과 평타는 따로 센다 — 같은 시각을 쓰면 근접 평타의 짧은 멈춤 뒤 0.22초 안의 치명 · 스킬 · 특수기 멈춤이 빠졌다. 평타는 큰 멈춤 직후엔 쉰다
    const big = ms >= 50;
    const at = hitStopAtRef.current;
    if (!el || (big ? pn - at.big < gap : pn - at.small < gap || pn - at.big < 220)) return;   // 저사양에서도 — data 속성 하나라 비용이 거의 없다
    if (big) at.big = pn; else at.small = pn;
    // data 속성으로 — 같은 순간 setImpact 가 전장 className 을 통째로 다시 써서 classList 로 붙인 클래스는 바로 지워졌다
    el.dataset.hitstop = "1";
    const until = Math.max(Number(el.dataset.hitstopUntil ?? 0), pn + ms);   // 짧은 멈춤이 끝나며 진행 중인 큰 멈춤을 자르지 않게
    el.dataset.hitstopUntil = String(until);
    window.setTimeout(() => { if (performance.now() >= until - 2 && Number(el.dataset.hitstopUntil) === until) delete el.dataset.hitstop; }, until - pn);
  };
  /**
   * 원거리 · 힐러 동료의 탄 — 동료 손에서 몬스터까지 날아가는 속성 탄(public/titans/fx/proj-<속성>.webp, fx2.py).
   * 공격 칸의 놓는 순간(≈0.2초)에 떠나 거리 비례로 날아가고, 돌려준 ms 뒤에 피해 · 타격 그림이 난다. 못 재면 0 (2026-10-21)
   */
  const spawnAllyProj = (id: TitanHeroId, el: string, big: boolean): number => {
    const field = fieldRef.current;
    const fr = field?.getBoundingClientRect();
    const a = field?.querySelector(`.titans-allies .ally-${id} .ally-body`)?.getBoundingClientRect();
    const m = field?.querySelector(".titans-monster .titan-monster-art")?.getBoundingClientRect();
    if (!fr || !a || !m || fr.width === 0 || a.width === 0 || m.width === 0) return 0;
    const x = a.left + a.width * 0.78 - fr.left, y = a.top + a.height * 0.42 - fr.top;
    const tx = m.left + m.width * 0.4 - fr.left, ty = m.top + m.height * (0.42 + Math.random() * 0.16) - fr.top;
    if (tx <= x) return 0;
    const fly = Math.round(Math.min(360, Math.max(150, Math.hypot(tx - x, ty - y) / 1.1)));
    const release = 200;
    const sid = ++shotIdRef.current;
    const dx = tx - x, dy = ty - y;
    const shot: SkillShot = { id: sid, kind: "proj", element: el, x, y, dx, dy, ang: (Math.atan2(dy, dx) * 180) / Math.PI, len: Math.hypot(dx, dy), big, fly };
    window.setTimeout(() => {
      const pn = performance.now();
      if (pn - sfxAtRef.current.shoot > 110) { sfxAtRef.current.shoot = pn; sfxHuntShoot(el); }
      setShots((prev) => [...prev.slice(lowFxRef.current ? -4 : -10), shot]);
      window.setTimeout(() => setShots((prev) => prev.filter((s) => s.id !== sid)), fly + 40);
    }, release);
    return release + fly;
  };

  /**
   * 주인공의 활 화살 · 지팡이 마법탄 (2026-10-28) — 주인공 무기 손에서 몬스터까지 날아간다(동료 탄과 같은 길 · hunt-motion.css el-arrow / el-arcane).
   * 돌려준 ms 뒤에 맞는 그림(번쩍임 · 불꽃). 피해 숫자 · 체력은 바로(fxDelayMs) — 처치 속도 · 숫자 합산이 그대로다. 못 재면 0
   */
  const spawnHeroProj = (kind: "bow" | "staff"): number => {
    const field = fieldRef.current;
    const fr = field?.getBoundingClientRect();
    const h = field?.querySelector(".titans-hero")?.getBoundingClientRect();
    const m = field?.querySelector(".titans-monster .titan-monster-art")?.getBoundingClientRect();
    if (!fr || !h || !m || fr.width === 0 || h.width === 0 || m.width === 0) return 0;
    const x = h.left + h.width * 0.86 - fr.left, y = h.top + h.height * 0.6 - fr.top;
    const tx = m.left + m.width * 0.42 - fr.left, ty = m.top + m.height * (0.4 + Math.random() * 0.16) - fr.top;
    if (tx <= x) return 0;
    const fly = Math.round(Math.min(320, Math.max(140, Math.hypot(tx - x, ty - y) / (kind === "bow" ? 1.4 : 1.0))));
    const release = kind === "bow" ? 150 : 200;   // 활은 시위를 놓는 칸, 지팡이는 내뻗는 칸
    const sid = ++shotIdRef.current;
    const dx = tx - x, dy = ty - y;
    const shot: SkillShot = { id: sid, kind: "proj", element: kind === "bow" ? "arrow" : "arcane", x, y, dx, dy, ang: (Math.atan2(dy, dx) * 180) / Math.PI, len: Math.hypot(dx, dy), big: false, fly };
    window.setTimeout(() => {
      setShots((prev) => [...prev.slice(lowFxRef.current ? -4 : -10), shot]);
      window.setTimeout(() => setShots((prev) => prev.filter((q) => q.id !== sid)), fly + 40);
    }, release);
    return release + fly;
  };
  /** 주인공 한 방의 그림 — 검: 붙어서 베기 · 창: 앞으로 찌르기 · 활: 화살 · 지팡이: 마법탄. 돌려준 ms 뒤에 맞는 그림 */
  const heroAttackFx = (jitter = 0): number => {
    const k = weaponKindRef.current;
    { const pn = performance.now(); if (pn - weaponSfxAtRef.current > 120) { weaponSfxAtRef.current = pn; sfxWeapon(k); } }   // 무기마다 다른 한 방 소리(2026-10-28)
    if (k === "bow" || k === "staff") {
      const ms = spawnHeroProj(k);
      if (ms > 0) {
        window.setTimeout(() => pushFxAt(k === "bow" ? "hit" : "burst", "monster", 0.42, 0.48, 70, 45, k === "bow" ? 40 : 275, 0.06, k === "bow" ? undefined : "light"), ms);
        return ms;
      }
    }
    if (k === "spear") { pushFxAt("thrust", "hero", 0.8, 0.84, 34, 52, undefined, jitter); return 0; }   // 손(상자 가로 80% · 세로 84% — 상자 위 58% 는 빈칸)에서 몬스터 쪽으로
    // 검: 몬스터에 붙어 몸 높이(상자 세로 78%)에서 크게 벤다(el-hero) — 예전 0.5 는 상자 위 빈칸이라 머리 위 허공을 벴다
    pushFxAt("slash", "hero", 0.98, 0.78, 28 + Math.random() * 8, 50 + Math.random() * 8, undefined, jitter, "hero");
    return 0;
  };

  const pushFloat = (
    dmg: number,
    crit: boolean,
    clientX?: number,
    clientY?: number,
    source: FloatSource = "hero",
    hue?: number,
    label?: string,
    skill?: TitanSkillId,
    delayMs = 0,
    merge = false,
  ) => {
    // 평타 연타는 숫자 하나에 더한다 — 0.6초 안에 다시 맞으면 같은 숫자가 커지며 제자리에서 다시 튀고, 멈추면 올라가 사라진다
    if (merge) {
      const pn = performance.now();
      const cur = sumFloatRef.current;
      if (cur && pn - cur.at < 600) {
        cur.total += dmg; cur.at = pn; cur.bump += 1;
        window.clearTimeout(cur.timer);
        const { id, total, bump, x, y } = cur;
        setFloats((prev) => (prev.some((f) => f.id === id)
          ? prev.map((f) => (f.id === id ? { ...f, text: formatGold(total), bump } : f))
          : [...prev, { id, x, y, text: formatGold(total), crit: false, source, sum: true, bump }]));
        cur.timer = window.setTimeout(() => {
          setFloats((prev) => prev.filter((f) => f.id !== id));
          if (sumFloatRef.current?.id === id) sumFloatRef.current = null;
        }, 780);
        return;
      }
      const spot = fxSpot("monster", 0.5, 0.14, 62 + Math.random() * 10, 34 + Math.random() * 10, 0.08);
      const id = ++floatId.current;
      const timer = window.setTimeout(() => {
        setFloats((prev) => prev.filter((f) => f.id !== id));
        if (sumFloatRef.current?.id === id) sumFloatRef.current = null;
      }, 780);
      sumFloatRef.current = { id, total: dmg, at: pn, bump: 0, timer, x: spot.x, y: spot.y };
      setFloats((prev) => [...prev.slice(lowFxRef.current ? -8 : -18), { id, x: spot.x, y: spot.y, text: formatGold(dmg), crit: false, source, sum: true, bump: 0 }]);
      return;
    }
    const rect = fieldRef.current?.getBoundingClientRect();
    // 좌표가 없으면 몬스터 머리 위(지금 상자에서) — 예전 고정 58~74% · 30~46% 는 깊이가 바뀐 몬스터와 떨어져 떴다 (2026-10-20)
    // 치명타는 몬스터 머리 위로 — 손가락 · 명중 자리(몬스터 몸 38%)에 두면 큰 글자 · 이름이 아래 몬스터 이름표와 겹쳤다 (2026-10-21)
    const spot = clientX && clientY && rect && !crit ? null : fxSpot("monster", 0.5, crit ? -0.06 : 0.12, 58 + Math.random() * 16, crit ? 24 : 30 + Math.random() * 16, crit ? 0.06 : 0.18);
    const x = spot ? spot.x : ((clientX! - rect!.left) / rect!.width) * 100;
    const y = spot ? spot.y : ((clientY! - rect!.top) / rect!.height) * 100;
    const id = ++floatId.current;
    // 저사양 모드는 동시 숫자를 절반으로 — 숫자 폭주가 프레임을 먹는다
    const show = () => {
      setFloats((prev) => [...prev.slice(lowFxRef.current ? -8 : -18), { id, x, y, text: formatGold(dmg), crit, source, hue, label, skill }]);
      window.setTimeout(() => {
        setFloats((prev) => prev.filter((f) => f.id !== id));
      }, label ? 900 : 700);
    };
    if (delayMs > 0) window.setTimeout(show, delayMs); else show();
  };

  const playAttackAnim = () => {
    attackUntil.current = performance.now() + ATTACK_CLIP_MS;
    animModeRef.current = "attack";
    animResetRef.current = true;
    setAnimMode("attack");
    setFrameIdx(0);
  };

  const applyDamageRef = useRef<((raw: number, crit: boolean, opts?: { source?: FloatSource; label?: string; skill?: TitanSkillId; chain?: boolean }) => void) | null>(null);
  const applyDamage = useCallback(
    (
      raw: number,
      crit: boolean,
      opts?: { clientX?: number; clientY?: number; fromAlly?: TitanHeroId | "tap"; source?: FloatSource; hue?: number; label?: string; skill?: TitanSkillId; delayMs?: number; chain?: boolean; /** 맞는 그림만 늦춘다(화살 · 마법탄이 꽂히는 순간) — 숫자 · 체력은 바로 */ fxDelayMs?: number },
    ) => {
      if (raw <= 0 || battlePhaseRef.current !== "combat") return;
      // 보스 약점 (2026-10-08): 약점 속성 스킬·같은 속성 동료는 ×1.6(+사냥 강화) · 오리온 성창은 보스 전체 ×1.15 · [약점 사냥]은 명중마다 +1초
      let mul = 1;
      let label = opts?.label;
      if (bossRef.current) {
        const pn = performance.now();
        const wk = bossWeakRef.current;
        const hm = saveRef.current.huntMods;
        const af = allyFeatureEffects(characterRef.current.partyIds);
        const skillEl = opts?.skill ? SKILLS.find((s) => s.id === opts.skill)?.element ?? "" : "";
        const weakHit = (opts?.skill && skillHitsWeak(wk, skillEl, pn)) || (opts?.fromAlly && opts.fromAlly !== "tap" && allyHitsWeak(wk, opts.fromAlly, pn));
        // DEV 측정 모드 — 대장 약점(무작위 속성 ×1.6)을 끈다. 무기마다 굴림 순서가 달라 약점이 다르게 걸렸다
        if (weakHit && !(import.meta.env.DEV && (window as unknown as { __huntProbe?: { noWeak?: boolean } }).__huntProbe?.noWeak)) {
          mul *= WEAK_MUL + hm.weakBonus;
          label = "약점!";
          if (hm.weakHunt && opts?.skill) { bossLeftRef.current += 1; setBossLeft(bossLeftRef.current); }
        }
        mul *= af.bossMul * permRef.current.bossMul * WEAPON_EFFECTS[weaponKindRef.current].bossMul;   // × 결정 트리 대장 사냥꾼 · 유물 (2026-10-26) · 창 (2026-10-27)
      }
      if (opts?.skill) mul *= WEAPON_EFFECTS[weaponKindRef.current].skillDmgMul;   // 지팡이 — 스킬 피해 (2026-10-27)
      const dealt = Math.floor(raw * mul);
      if (import.meta.env.DEV) {
        // 탭 · 자동(주인공 자동 공격) · 기술(무기 기술) · 동료 · 스킬(스킬 · 화상 · 번개)
        const k = opts?.fromAlly && opts.fromAlly !== "tap" ? "ally" : opts?.source === "hero" ? (opts?.fromAlly === "tap" ? "auto" : "tech") : opts?.source === "skill" ? "skill" : "tap";
        const kk = bossRef.current ? `${k}@boss` : k;   // 대장에게 준 피해는 따로 — 대장 실패 뒤 일반 몬스터 피해가 섞이지 않게
        devDmgRef.current[kk] = (devDmgRef.current[kk] ?? 0) + dealt;
        devDmgRef.current[bossRef.current ? "boss" : "mob"] = (devDmgRef.current[bossRef.current ? "boss" : "mob"] ?? 0) + dealt;
        // 스킬은 이름별 피해 · 횟수도 — 무기 간 스킬 배율을 한 방 단위로 잰다(운석 쿨 38초 > 측정 창이라 합계는 위상에 흔들린다)
        if (k === "skill") { const sk = `${kk}:${opts?.label ?? "?"}`; devDmgRef.current[sk] = (devDmgRef.current[sk] ?? 0) + dealt; devDmgRef.current[`#${sk}`] = (devDmgRef.current[`#${sk}`] ?? 0) + 1; }
      }
      if (permRef.current.burnShare > 0 && opts?.label !== "화상") relicBurnPoolRef.current += raw * permRef.current.burnShare;
      // 타격 표현 (2026-10-21, 사용자: "흰 조준선을 공격한 동료의 속성 색 타격 그림으로 · 평타는 작은 불꽃만, 치명타 · 스킬 · 특수기는 크게") —
      // 때린 쪽 속성: 동료 = ALLY_ELEMENT, 스킬 = 스킬 원소, 화상 = 불, 주인공 · 탭 = 칼날
      const hitEl = opts?.skill
        ? (SKILLS.find((s) => s.id === opts.skill)?.element ?? "blade")
        : opts?.label === "화상"
          ? "fire"
          : opts?.fromAlly && opts.fromAlly !== "tap"
            ? ALLY_ELEMENT[opts.fromAlly]
            : "blade";
      const big = crit || (opts?.source === "ally" && !!opts?.label);
      const physical = !opts?.skill && opts?.label !== "화상" && (!opts?.fromAlly || opts.fromAlly === "tap" || ALLY_ROLE[opts.fromAlly] === "melee" || ALLY_ROLE[opts.fromAlly] === "tank");
      const merge = !big && !label && !opts?.delayMs && (opts?.source === "ally" || opts?.source === "hero");   // 탭은 손가락 자리에 따로 (verify-checklist #2)
      pushFloat(dealt, crit, merge ? undefined : opts?.clientX, merge ? undefined : opts?.clientY, opts?.source ?? "hero", opts?.hue, label, opts?.skill, opts?.delayMs, merge);
      // [연쇄 번개]·녹스 치명 연계 — 치명 스킬 명중 뒤 한 번 더 (한 단계만, chain 표시로 재귀 차단)
      if (crit && opts?.source === "skill" && !opts?.chain) {
        const chain = (saveRef.current.huntMods.chainLightning ? 0.3 : 0) + allyFeatureEffects(characterRef.current.partyIds).critChain;
        if (chain > 0) window.setTimeout(() => applyDamageRef.current?.(raw * chain, false, { source: "skill", label: "연쇄", skill: opts?.skill, chain: true }), 140 + (opts?.delayMs ?? 0));
      }
      // 몬스터 번쩍임 · 찌그러짐 · 타격 그림 — 탄이 날아가는 스킬은 꽂히는 순간(delayMs)에
      const hitFx = () => {
        const pn = performance.now();
        // 번쩍임은 한 번 짧게 — 동료 넷이 연타하면 0.15초 안 재타격은 번쩍임을 다시 켜지 않아 몬스터 제 색이 보인다
        if (big || pn - lastFlashRef.current > 150) {
          lastFlashRef.current = pn;
          setMonsterHit((n) => n + 1);
        }
        setImpact(big ? "critical" : "normal");
        // 피격 프레임은 짧게(90/130ms) — 파티 4명이 연타하면 흰 프레임이 거의 상시 노출되던 문제
        window.setTimeout(() => setImpact(null), big ? 130 : 90);
        if (big) sfxHuntBurst(hitEl);
        else if (pn - sfxAtRef.current.hit > 70) { sfxAtRef.current.hit = pn; sfxHuntHit(hitEl); }
        if (big) {
          // 탄으로 날아간 스킬은 명중 칸(.shot-impact)이 같은 폭발을 그린다 — 겹치지 않게
          if (!(opts?.skill && opts?.delayMs)) pushFxAt("burst", "monster", 0.45, 0.48, 72, 42, undefined, 0.06, hitEl);
          if (!lowFxRef.current) pushFxAt("debris", "monster", 0.42, 0.62, 72, 50, undefined, 0.06, hitEl);
          hitStop();
        } else {
          pushFxAt("spark", "monster", 0.42, 0.5, 72 + Math.random() * 10, 38 + Math.random() * 14, undefined, 0.12, hitEl);
          if (physical) hitStop(35, 400);
          if (physical && !lowFxRef.current && Math.random() < 0.45) pushFxAt("debris", "monster", 0.42, 0.62, 72, 50, undefined, 0.1, hitEl);
        }
      };
      const fxDelay = opts?.delayMs || opts?.fxDelayMs;
      // 늦춘 맞는 그림은 쏠 때의 몬스터가 아직 있을 때만 — 날아가는 사이 다음 몬스터로 바뀌면 빈 자리에 번쩍였다(2026-10-28 verify-walk-y 이펙트 자리)
      const fxTarget = `${saveRef.current.stage}:${waveRef.current}:${bossRef.current ? 1 : 0}`;
      if (fxDelay) window.setTimeout(() => { if (`${saveRef.current.stage}:${waveRef.current}:${bossRef.current ? 1 : 0}` === fxTarget) hitFx(); }, fxDelay); else hitFx();

      const next = hpRef.current - dealt;
      if (next > 0) {
        hpRef.current = next;
        setHp(next);
        return;
      }

      const s = saveRef.current;
      const wasBoss = bossRef.current;
      sfxMonsterDown(wasBoss);   // 쓰러짐 소리(2026-10-28)
      battlePhaseRef.current = "monster-death";
      setBattlePhase("monster-death");

      // 몬스터 도감 (LIVEOPS §2.3) — 종별 카운트는 배치로 모아 보스 클리어 때 플러시.
      // 킬마다 storage 쓰기를 하면 저장 부하가 크다.
      const killedKind = monsterKind(s.stage, wasBoss, chestRef.current);
      discover("monster", killedKind, monsterLabel(killedKind, chestRef.current, s.stage));
      // 이벤트 코인 (2026-10-22 아처 키우기 8번) — 가끔 떨어진다. 드물어서 떨어질 때만 저장
      const coins = rollCoinDrop(Math.random(), Math.random(), wasBoss);
      if (coins > 0) {
        pushFxAt("coin", "monster", 0.5, 0.35, 62, 34, undefined, 0.04, `c${coins}`);
        void updateCharacterProgress(userHash, (cur) => ({ ...cur, eventCoins: cur.eventCoins + coins })).then(setCharacter);
      }
      killCountsRef.current[killedKind] = (killCountsRef.current[killedKind] ?? 0) + 1;
      if (wasBoss) {
        bossFailStreakRef.current = 0;
        setWallInfo(null);
        bossWeakRef.current = null;
        setBossWeak(null);
      }

      // 도감 마일스톤 보너스: 10/100/1,000 처치 → +2/4/8%
      const codexKills =
        (characterRef.current.monsterKills[killedKind] ?? 0) + (killCountsRef.current[killedKind] ?? 0);
      const codexMult = codexKills >= 1000 ? 1.08 : codexKills >= 100 ? 1.04 : codexKills >= 10 ? 1.02 : 1;

      // 오늘의 첫 보스 클리어 2배 (LIVEOPS §2.4)
      const today = new Date().toLocaleDateString("sv-SE");
      const firstClearToday = wasBoss && characterRef.current.firstClearDates.hunt !== today;

      // 아기 슬라임 펫(§1) — 사냥 골드 가산
      const petGold = 1 + activePetEffect(characterRef.current.pets, characterRef.current.activePet, "gold");
      const warmupMult = characterRef.current.warmupUntil > Date.now() ? 2 : 1;
      const goldGain = Math.floor(
        (killGold(s.stage, wasBoss, chestRef.current) + (wasBoss ? stageClearBonus(s.stage) : 0)) *
          codexMult *
          petGold *
          warmupMult *
          gearEffects(gearMasteryOf(saveRef.current.equipmentTraining), characterRef.current.gearEnhance).goldMul *   // 갑옷 (equipment/parts)
          ladderEffects(characterRef.current.bossLadder).goldMul *   // 대장 사다리 (2026-10-22)
          permRef.current.goldMul *   // 결정 트리 처치 골드 · 황금 유물 (2026-10-26)
          (firstClearToday ? 2 : 1),
      );
      if (firstClearToday) {
        flash("오늘의 첫 보스 클리어 · 보상 2배!");
        void updateCharacterProgress(userHash, (current) => ({
          ...current,
          firstClearDates: { ...current.firstClearDates, hunt: today },
        })).then(setCharacter);
      }
      if (wasBoss) {
        // 주간 도전(보스 처치) 카운트
        void updateEventSave(userHash, (e) => ({ ...e, weeklyBossKills: e.weeklyBossKills + 1 })).then(setEvents);
        // 3단계 처치 연출 — 경직(0.3s) → 균열(0.35s) → 붕괴+골드 분출. 다음 스폰(1.5s) 직전에 정리
        setBossBreak(1);
        later(() => setBossBreak(2), 300);
        later(() => setBossBreak(3), 650);
        later(() => setBossBreak(0), 1450);
        // 도감 카운트 플러시 (보스 주기 = 자연스러운 배치 경계)
        const pending = killCountsRef.current;
        killCountsRef.current = {};
        void updateCharacterProgress(userHash, (current) => {
          const merged = { ...current.monsterKills };
          (Object.keys(pending) as TitanMonsterKind[]).forEach((k) => {
            merged[k] = (merged[k] ?? 0) + (pending[k] ?? 0);
          });
          // 펫 부화 (§1) — 도감 최종 마일스톤(1,000처치) 도달 시 아기 버전이 태어난다.
          // 플러시 경계에서만 판정하므로 킬마다 검사하는 비용이 없다.
          const hatched = pendingHatches(merged, current.pets);
          if (hatched.length === 0) return { ...current, monsterKills: merged };
          const pets = { ...current.pets };
          hatched.forEach((id) => {
            pets[id] = 1;
          });
          return {
            ...current,
            monsterKills: merged,
            pets,
            activePet: current.activePet || hatched[0],
          };
        }).then((next) => {
          const born = Object.keys(next.pets).filter(
            (id) => (next.pets[id as TitanMonsterKind] ?? 0) > 0 && (characterRef.current.pets[id as TitanMonsterKind] ?? 0) <= 0,
          ) as TitanMonsterKind[];
          setCharacter(next);
          if (born.length > 0) {
            flash(`${PET_DEFS[born[0]].name} 부화! 마이페이지에서 확인하세요`);
            // 필드 펫 자리(좌측)에서 황금 버스트 — 부화가 눈에 보이게
            pushFxAt("crit", "pet", 0.5, 0.5, 15, 50, 45);
            pushFxAt("warcry", "pet", 0.5, 0.5, 15, 50, 45);
          }
        });
      }

      // 지역 개척 게이트 — 미개척 지역으로는 넘어갈 수 없다. 성문 방어으로만 열린다.
      // 스테이지 증가보다 **먼저** 판정해야 한다. 나중에 보면 이미 상한을 넘긴 뒤라
      // 헤더는 다음 스테이지를 가리키는데 몬스터는 이전 스테이지가 나온다.
      // 테스트 모드(qaUnlock)에서는 지역 문을 연다 (2026-10-26 사용자: "보스 잡아도 다음 스테이지로 안 넘어간다" — QA 배포는 테스트 모드가 기본이라
      // 지역 끝 대장을 잡아도 성문 방어 개척 전에는 같은 스테이지에 머물렀다). 테스트 모드를 끄면 예전처럼 성문 방어로 연다
      const gateBlocked =
        wasBoss && !qaUnlockOpen() && s.stage >= stageCeilingFor(characterRef.current.pioneeredArea);
      const advancing = wasBoss && !gateBlocked;

      setSave((prev) => ({
        ...prev,
        gold: prev.gold + goldGain,
        skillInventory: wasBoss ? { ...prev.skillInventory, skillCores: prev.skillInventory.skillCores + 1 } : prev.skillInventory,
        // 사냥 강화 (2026-10-08): 보스마다 선택권 +1(최대 3) · 새 지역으로 넘어가면 지역 효과는 비운다 (지역 = 런)
        huntPicks: 0,   // 사냥 강화 3택 제거 (2026-10-21)
        huntMods: advancing && huntingArea(prev.stage + 1).id !== huntingArea(prev.stage).id ? { ...prev.huntMods, tapMul: 1, allyMul: 1, bossTimeBonus: 0, cooldownMul: 1, burnMul: 1, freezeMul: 1, critDmgMul: 1, weakWindowMs: 0, weakBonus: 0, weakHunt: false, thermalShock: false, chainLightning: false, picked: [] } : prev.huntMods,
        totalKills: prev.totalKills + 1,
        bestStage: advancing ? Math.max(prev.bestStage, prev.stage + 1) : prev.bestStage,
        stage: advancing ? prev.stage + 1 : prev.stage,
      }));

      if (wasBoss) {
        setBossReady(false);
        const clearedStage = s.stage;
        // 대장 사다리 (2026-10-22 아처 키우기 3번) — 처음 깬 대장 높이마다 영구 특성 한 칸
        // 깜짝 선물 (2026-10-22 아처 키우기 5번) — 환영 선물을 받은 새 계정이 처음 대장을 잡으면 +500 한 번
        if (characterRef.current.claimedRewards.includes("welcome-gift") && !characterRef.current.claimedRewards.includes("surprise-gift")) {
          void updateCharacterProgress(userHash, (cur) => (cur.claimedRewards.includes("surprise-gift") ? cur : { ...cur, redGems: cur.redGems + SURPRISE_GIFT_GEMS, claimedRewards: [...cur.claimedRewards, "surprise-gift"] }))
            .then((next) => { setCharacter(next); setRedGems(next.redGems); });
          later(() => showRewardPop("gift", "깜짝 선물", `붉은 보석 +${SURPRISE_GIFT_GEMS}`, "첫 대장 처치 축하 — 첫 10연은 전설 확정"), 900);
        }
        const climbed = climbLadder(characterRef.current.bossLadder, clearedStage);
        if (climbed.perk) {
          const perk = climbed.perk;
          const detail = perkLabel(characterRef.current.bossLadder, perk);
          void updateCharacterProgress(userHash, (cur) => ({ ...cur, bossLadder: climbLadder(cur.bossLadder, clearedStage).ladder })).then(setCharacter);
          later(() => showRewardPop("ladder", `대장 사다리 Lv.${ladderLevel(climbed.ladder)}`, `${LADDER_LABEL[perk]} 영구 상승`, detail), 500);
        } else if (Math.random() < permRef.current.relicChance) {
          // 유물 (2026-10-26, "오늘도 환생 2" 차용) — 이미 잡아 본 높이의 대장을 다시 잡으면 확률로 조각 1개. 환생해도 남는다
          const roll = Math.random();
          // 조각은 남은 조각으로(2026-10-28 중복 소진) — 유물 탭에서 소진해 ★ 에 넣는다
          const before = relicMerged(characterRef.current.relics, characterRef.current.relicSpare);
          const { got } = grantRelicShards(before, 1, () => roll);
          if (got.length) {
            const id = got[0];
            void updateCharacterProgress(userHash, (cur) => ({ ...cur, relicSpare: addRelicSpare(cur.relicSpare, grantRelicShards(relicMerged(cur.relics, cur.relicSpare), 1, () => roll).got) })).then((next) => {
              setCharacter(next);
              const def = relicDef(id);
              const spare = next.relicSpare[id] ?? 0;
              later(() => showRewardPop(
                "relic",
                "유물 조각",
                def.name,
                `남은 조각 ${spare}개 · 유물 탭에서 소진해 ★ 올리기 · 다시 잡은 대장`,
                relicIconUrl(id),
              ), 500);
            });
          }
        }
        // 보스 처치 보상은 막혀도 그대로 준다 — 잡은 건 잡은 것이다.
        void grantCharacterReward(userHash, `titans:${clearedStage}:${Date.now()}`, {
          exp: PROGRESSION_BALANCE.titans.bossExpBase + clearedStage * 8,
          lastContent: "titans",
        }).then(() =>
          updateCharacterProgress(userHash, (current) => ({
            ...current,
            // 막혔으면 최고 기록도 올리지 않는다 — 벽 앞에서 파밍한다고
            // titanBestStage가 상한 너머로 포화되면 프로필 표기가 어긋난다.
            titanBestStage: advancing
              ? Math.max(current.titanBestStage, clearedStage + 1)
              : current.titanBestStage,
            // 개척도(pioneeredArea)는 여기서 올리지 않는다 — 성문 방어만 지역을 연다.
            lastContent: "titans",
          })),
        );
        if (gateBlocked) {
          sfxGateBlocked();
          setGateNotice(true);
          flash(`${nextAreaName(characterRef.current.pioneeredArea) ?? "다음 지역"} 진입로가 막혀 있습니다`);
          later(() => {
            spawn(s.stage, 1, false);
            battlePhaseRef.current = "combat";
            setBattlePhase("combat");
          }, 700);
          return;
        }

        flash(`STAGE ${s.stage} CLEAR! +${formatGold(goldGain)}G`);
        // 첫 5분 대본(§8) — 첫 보스 클리어 직후 방치 개념을 1회 안내
        if (characterRef.current.onboardingStep < 4 && !onboardHintShownRef.current) {
          onboardHintShownRef.current = true;
          later(() => flash("잠깐 닫았다 와도 원정대가 계속 사냥합니다 — 방치 보상이 쌓여요"), 1700);
        }
        pendingStageRef.current = s.stage + 1;
        pendingSpawnRef.current = [s.stage + 1, 1];
        later(() => {
          battlePhaseRef.current = "stage-clear";
          setBattlePhase("stage-clear");
        }, 360);
        later(() => {
          battlePhaseRef.current = "stage-exit";
          setBattlePhase("stage-exit");
        }, 820);
        later(() => {
          pendingSpawnRef.current = null;
          spawn(s.stage + 1, 1, false);
          battlePhaseRef.current = "stage-enter";
          setBattlePhase("stage-enter");
        }, 1500);
        later(() => {
          battlePhaseRef.current = "combat";
          setBattlePhase("combat");
          pendingStageRef.current = null;
        }, 1980);
        return;
      }

      if (chestRef.current) flash(`황금 몬스터! +${formatGold(goldGain)}G`);
      if (waveRef.current >= MOBS_PER_STAGE) {
        if (bossReady) {
          later(() => {
            spawn(s.stage, MOBS_PER_STAGE, false);
            battlePhaseRef.current = "combat";
            setBattlePhase("combat");
          }, 360);
          return;
        }
        setBossReady(true);
        pendingStageRef.current = s.stage;
        pendingSpawnRef.current = [s.stage, MOBS_PER_STAGE];
        flash("일반 스테이지 완료 · 보스 도전 가능!");
        later(() => {
          battlePhaseRef.current = "stage-clear";
          setBattlePhase("stage-clear");
        }, 300);
        later(() => {
          battlePhaseRef.current = "stage-exit";
          setBattlePhase("stage-exit");
        }, 680);
        later(() => {
          pendingSpawnRef.current = null;
          spawn(s.stage, MOBS_PER_STAGE, false);
          battlePhaseRef.current = "stage-enter";
          setBattlePhase("stage-enter");
        }, 1360);
        later(() => {
          battlePhaseRef.current = "combat";
          setBattlePhase("combat");
        }, 1840);
      } else {
        pendingSpawnRef.current = [s.stage, waveRef.current + 1];
        later(() => {
          pendingStageRef.current = s.stage;
          battlePhaseRef.current = "stage-clear";
          setBattlePhase("stage-clear");
        }, 220);
        later(() => {
          battlePhaseRef.current = "stage-exit";
          setBattlePhase("stage-exit");
        }, 540);
        later(() => {
          pendingSpawnRef.current = null;
          spawn(s.stage, waveRef.current + 1, false);
          battlePhaseRef.current = "stage-enter";
          setBattlePhase("stage-enter");
        }, 1_180);
        later(() => {
          pendingStageRef.current = null;
          battlePhaseRef.current = "combat";
          setBattlePhase("combat");
        }, 1_660);
      }
    },
    [bossReady, later, spawn, userHash],
  );

  useEffect(() => {
    applyDamageRef.current = applyDamage;
  }, [applyDamage]);

  const computeTapHit = useCallback(() => {
    const now = performance.now();
    const inv = saveRef.current.skillInventory;
    const passive = passiveTotals(inv.learned, inv.equipped, inv.levels);
    // 단단한 앞니(패시브) — 탭 기본 피해 상시 증가
    // × 대장 사다리 탭 피해 — 2026-10-22 아처 키우기 3번 (번개 강화는 2026-10-28 삭제)
    const base = WEAPON_EFFECTS[weaponKindRef.current].tapMul * tapDamage(saveRef.current.equipmentTraining.weaponMastery + Math.floor(forgedWeaponLevel * 1.5)) * (1 + passive.tapDmg) * ladderEffects(characterRef.current.bossLadder).tapMul * permRef.current.tapMul;   // × 결정 트리 공격력 · 불씨 반지 (2026-10-26)
    const b = buffsRef.current;
    const clone = now < b.cloneUntil ? b.cloneMult : 1;
    // 북채 집중(패시브) + 치명 버프
    const critChance = Math.min(0.95, 0.08 + WEAPON_EFFECTS[weaponKindRef.current].critAdd + passive.critChance + (now < b.critUntil ? b.critBonus : 0) + gearEffects(gearMasteryOf(saveRef.current.equipmentTraining), characterRef.current.gearEnhance).critChance);   // + 장갑
    // 사냥 강화 — 탭·스킬 배수와 치명 피해 배수 (지역 런 효과)
    const hm = saveRef.current.huntMods;
    // DEV 측정 모드 (scripts/_probe-weapon-dps2.mjs) — 치명을 굴리지 않고 기댓값으로. 운석 같은 큰 한 방 몇 번의 치명이 측정을 ±15% 흔들었다
    if (import.meta.env.DEV && (window as unknown as { __huntProbe?: { expectCrit?: boolean } }).__huntProbe?.expectCrit) {
      return { dmg: base * hm.tapMul * clone * (1 + Math.min(1, critChance) * (3.2 * hm.critDmgMul - 1)), crit: false, base: base * hm.tapMul };
    }
    const crit = Math.random() < critChance;
    return { dmg: base * hm.tapMul * clone * (crit ? 3.2 * hm.critDmgMul : 1), crit, base: base * hm.tapMul };
  }, [forgedWeaponLevel]);

  const doTap = useCallback(
    (clientX?: number, clientY?: number) => {
      if (battlePhaseRef.current !== "combat" || !formationReadyRef.current) return;
      const { dmg, crit } = computeTapHit();
      playAttackAnim();
      const fly = heroAttackFx(0.08);   // 무기마다 다른 한 방(2026-10-28)
      setSave((prev) => ({ ...prev, totalTaps: prev.totalTaps + 1 }));
      applyDamage(dmg, crit, { clientX, clientY, fromAlly: "tap", source: "tap", fxDelayMs: fly });
      // 무기 기술 (2026-10-27, titans/weapons.ts) — 무기마다 N 번째 탭에 이름 있는 한 방
      const tech = WEAPON_TECH[weaponKindRef.current];
      weaponTechRef.current += 1;
      if (weaponTechRef.current >= tech.every) {
        weaponTechRef.current = 0;
        const mul = bossRef.current && tech.bossMul ? tech.bossMul : tech.mul;
        if (tech.fx === "bolt") pushFxAt("bolt", "monster", 0.5, 0.3, 58, 30, 285);
        else pushFxAt("slash", "monster", 0.5, 0.45, 44, 50, undefined, 0.05);
        applyDamage(computeTapHit().base * mul, true, { source: "hero", label: tech.name, delayMs: 120 });
      }
    },
    [applyDamage, computeTapHit],
  );

  // Player/ally auto attacks + boss timer. Damage lands with each visible attack.
  useEffect(() => {
    if (!ready) return;
    let last = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      // 배속(QoL)은 공격·보스 타이머·쿨타임에 대칭 적용 — 보스 1초당 DPS가
      // 변하지 않아 벽 판정이 그대로다. 빨라지는 건 체감 진행 속도뿐이다.
      const dt = Math.min(0.25, (now - last) / 1000) * saveRef.current.battleSpeed;
      last = now;

      if (
        saveRef.current.autoSkill &&
        battlePhaseRef.current === "combat" &&
        formationReadyRef.current &&
        document.visibilityState !== "hidden"
      ) {
        // 순서: 연계(버프) → 시동기 → 마무리. 가시덤불 처형은 보스 30% 미만(또는 시간 촉박)까지 아낀다
        for (const id of AUTO_SKILL_ORDER) {
          const sk = SKILLS.find((s) => s.id === id)!;
          if (cdsRef.current[id] > 0) continue;
          if (!saveRef.current.skillInventory.learned.includes(id)) continue;
          if (saveRef.current.skillInventory.equipped[sk.slot] !== id) continue;
          if (id === "voidFinish" && bossRef.current && hpRef.current >= monsterHp(saveRef.current.stage, true) * 0.3 && bossLeftRef.current > 6) continue;
          castSkillRef.current(id);
        }
      }

      const buff = buffsRef.current;
      const inv = saveRef.current.skillInventory;
      const passive = passiveTotals(inv.learned, inv.equipped, inv.levels);
      // 동료 배율 = 고무 버프(댐 방벽 북소리·번개 합주·별빛 피날레) × 숲의 공명(패시브)
      const war = (now < buff.warcryUntil ? buff.warMult : 1) * (1 + passive.allyDmg);
      if (document.visibilityState !== "hidden") {
        // 도토리 합성은 뺐다 (2026-10-26 사용자: "도토리 콘텐츠는 삭제 · 오늘도 환생 자동 돈 버는 시스템으로") — 저장의 acorns 는 옛 저장 호환으로만 남는다
        // 퀘스트 — 배속과 무관하게 실제 시간으로 돈다
        questAccRef.current += dt / Math.max(1, saveRef.current.battleSpeed);
        if (questAccRef.current >= 0.25) {
          const add = questAccRef.current;
          questAccRef.current = 0;
          if (questProgRef.current.length !== QUESTS.length) questProgRef.current = saveRef.current.quests.prog.slice();
          const r = tickQuests({ ...saveRef.current.quests, prog: questProgRef.current }, add);
          questProgRef.current = r.state.prog;
          if (r.gold > 0) {
            const prog = r.state.prog.slice();
            setSave((prev) => ({ ...prev, gold: prev.gold + r.gold, quests: { ...prev.quests, prog } }));
            if (tabRef.current === "quest") setQuestDone({ rows: r.done, key: now });
          }
          if (tabRef.current === "quest") setQuestProg(r.state.prog);
        }
      }
      if (battlePhaseRef.current === "combat" && formationReadyRef.current && document.visibilityState !== "hidden") {
        // 급류 연타(가속) — 영웅 자동 공격 간격 단축
        const autoInterval = Math.max(.48, 1.08 - Math.min(.6, saveRef.current.equipmentTraining.weaponMastery * .012)) * (now < buff.hasteUntil ? buff.hasteMult : 1) / (1 + gearEffects(gearMasteryOf(saveRef.current.equipmentTraining), characterRef.current.gearEnhance).autoSpeed) / ladderEffects(characterRef.current.bossLadder).speedMul / WEAPON_EFFECTS[weaponKindRef.current].autoSpeedMul;   // ÷ 신발 · ÷ 대장 사다리 공속 · ÷ 활(2026-10-27)
        // 화상(불꽃 장작 타·용암 북 울림) — 0.5초 단위로 몰아서 넣어 피해 숫자 도배를 막는다
        if (now < buff.burnUntil && buff.burnPerSec > 0 && (!buff.burnBossOnly || bossRef.current)) {
          burnAcc.current += dt;
          if (burnAcc.current >= 0.5) {
            applyDamage(buff.burnPerSec * burnAcc.current * saveRef.current.huntMods.burnMul * allyFeatureEffects(characterRef.current.partyIds).burnMul, false, { source: "skill", label: "화상" });
            burnAcc.current = 0;
          }
        } else burnAcc.current = 0;
        // 불 유물 세트 화상 — 모은 피해를 0.6초마다 한 번에 (숫자 도배 방지)
        if (relicBurnPoolRef.current > 0) {
          relicBurnAccRef.current += dt;
          if (relicBurnAccRef.current >= 0.6) {
            const pool = relicBurnPoolRef.current;
            relicBurnPoolRef.current = 0;
            relicBurnAccRef.current = 0;
            applyDamage(pool, false, { source: "skill", label: "화상" });
          }
        }
        // 펫 (2026-10-28) — 장착 · 부화한 펫이 PET_ATTACK_SEC 마다 덤빈다. 뛰어 닿는 순간(0.24초) 맞는 그림, 숫자 · 체력은 바로
        const petId = characterRef.current.activePet as PetId;
        const petLv = PET_IDS.includes(petId) ? characterRef.current.pets[petId] ?? 0 : 0;
        if (petLv > 0) {
          petAccRef.current += dt;
          if (petAccRef.current >= PET_ATTACK_SEC) {
            petAccRef.current %= PET_ATTACK_SEC;
            setPetAtk((n) => n + 1);
            sfxPetPounce();
            applyDamage(playerIdleDps(saveRef.current.equipmentTraining.weaponMastery + Math.floor(forgedWeaponLevelRef.current * 1.5)) * petAttackMul(petLv), false, { source: "ally", hue: 95, fxDelayMs: 240 });   // 주인공 자동 공격과 같은 바탕(ref 로 — 인터벌 안)
          }
        } else petAccRef.current = 0;
        autoAttackAcc.current += dt;
        if (autoAttackAcc.current >= autoInterval) {
          autoAttackAcc.current %= autoInterval;
          attackUntil.current = performance.now() + ATTACK_CLIP_MS;
          animModeRef.current = "attack";
          animResetRef.current = true;
          setAnimMode("attack");
          setFrameIdx(0);
          const fly = heroAttackFx();   // 무기마다 다른 한 방(2026-10-28) — 활 · 지팡이는 날아가 꽂히는 순간 맞는 그림
          // 자동 공격에도 대장간 단계 · 무기 탭 배율 (2026-10-27 감사: 예전엔 숙련만 봐서 방치하면 대장간 강화가 사냥 DPS 를 전혀 안 올렸다)
          applyDamage(playerIdleDps(saveRef.current.equipmentTraining.weaponMastery + Math.floor(forgedWeaponLevelRef.current * 1.5)) * WEAPON_EFFECTS[weaponKindRef.current].tapMul, false, { fromAlly: "tap", source: "hero", fxDelayMs: fly });
        }
      } else {
        autoAttackAcc.current = 0;
      }

      if (battlePhaseRef.current === "combat" && formationReadyRef.current && document.visibilityState !== "hidden") {
        // 보호구 강화(대장간)는 동료 지원 배율로 붙는다 — 견갑 훈련(사냥터 골드)과 별개 축
        const shoulderBoost = 1 + saveRef.current.equipmentTraining.shoulderMastery * .025 + (characterRef.current.shoulderEnhance ?? 0) * 0.02;
        // 편성(§2): 출전 슬롯에 오른 동료만 싸운다 · 엄호 사격 시너지가 DPS를 증폭한다
        const synergyDps = partySynergies(fieldedParty(characterRef.current.partyIds, stageCeilingFor(characterRef.current.pioneeredArea), characterRef.current.claimedRewards)).effects.dpsMult;
        for (const h of HEROES) {
          const level = saveRef.current.heroes[h.id];
          if (level <= 0 || !characterRef.current.partyIds.includes(h.id)) continue;
          allyAttackAcc.current[h.id] += dt * WEAPON_EFFECTS[weaponKindRef.current].autoSpeedMul;   // 활 — 동료 공격 속도도 (2026-10-27 감사)
          if (allyAttackAcc.current[h.id] < h.attackInterval) continue;
          allyAttackAcc.current[h.id] %= h.attackInterval;
          setAllyPulse((prev) => ({ ...prev, [h.id]: (prev[h.id] ?? 0) + 1 }));
          // 시그니처 (2026-10-14) — N 타마다 이름 있는 기술 ×mul, 나머지 타는 평균이 1 이 되게 낮춘다(밸런스 불변)
          const sig = allySignature(h.id);
          const no = (allyAttackNo.current[h.id] = (allyAttackNo.current[h.id] ?? 0) + 1);
          const isSig = isSignatureHit(sig, no);
          // 시그니처: 화살 · 마력탄 · 베기는 날아가 꽂히는 곳(몬스터), 충격파는 탱커 발밑, 빛 고리는 힐러 몸. 평타 고리는 그 동료 앞
          // 평타는 예전 동료 앞 고리(.titans-fx-ally) 대신 — 근접은 휘두르는 칸이, 원거리 · 힐러는 날아가는 탄(spawnAllyProj)이 보여 준다 (2026-10-21)
          // 타격 그림은 applyDamage 가 몬스터에 낸다
          if (isSig && sig.fx === "quake") pushFxAt(`sig-${sig.fx}`, h.id, 0.5, 0.9, 40, 60, h.hue);
          else if (isSig && sig.fx === "halo") pushFxAt(`sig-${sig.fx}`, h.id, 0.5, 0.45, 40, 55, h.hue);
          else if (isSig) pushFxAt(`sig-${sig.fx}`, "monster", 0.42, 0.5, 72, 45, h.hue, 0.08);
          // 부가 효과 (2026-10-14 보완) — 힐러 빛 고리: 모든 스킬 쿨 −0.25초 · 탱커 충격파: 대장 제한 시간 0.2초 정지
          if (isSig && sig.fx === "halo") setCds((prev) => { const next = { ...prev }; for (const k of Object.keys(next) as TitanSkillId[]) next[k] = Math.max(0, next[k] - SIG_HALO_CD_SEC); return next; });
          if (import.meta.env.DEV && isSig && (sig.fx === "halo" || sig.fx === "quake")) ((window as unknown as { __huntSigLog?: unknown[] }).__huntSigLog ??= []).push({ t: performance.now(), id: h.id, fx: sig.fx, boss: !!bossRef.current, bossLeft: bossLeftRef.current });
          if (isSig && sig.fx === "quake" && bossRef.current) { const until = performance.now() + SIG_QUAKE_FREEZE_MS; buffsRef.current = { ...buffsRef.current, freezeUntil: Math.max(buffsRef.current.freezeUntil, until) }; setBuffs((b) => ({ ...b, freezeUntil: Math.max(b.freezeUntil, until) })); }
          const hitBase = heroDps(h, level) * starMultiplier(effectiveStars(characterRef.current.allyStars[h.id], level)) * h.attackInterval * war * shoulderBoost * synergyDps * saveRef.current.huntMods.allyMul * ladderEffects(characterRef.current.bossLadder).allyMul * trialDpsMul(h, trialCeiling(stageCeilingFor(characterRef.current.pioneeredArea), saveRef.current.bestStage)) * permRef.current.allyMul;   // × 결정 트리 공격력 · 화염 깃털 (2026-10-26)   // × 도토리 · 대장 사다리 (2026-10-22) · 체험 출전(titans/trialAlly, 2026-10-23)
          const hitMul = isSig ? sig.mul : signatureBaseMul(sig);
          if (import.meta.env.DEV) { const log = ((window as unknown as { __huntHitLog?: unknown[] }).__huntHitLog ??= []); if (log.length < 4000) log.push({ id: h.id, no, sig: isSig, base: hitBase, dmg: hitBase * hitMul, fx: sig.fx, move: sig.move }); }
          const land = () => applyDamage(hitBase * hitMul, false, { fromAlly: h.id, source: "ally", hue: h.hue, label: isSig ? sig.move : undefined });
          // 원거리 · 힐러는 탄이 꽂히는 순간에 피해 — 눈으로 따라간다 (2026-10-21, 사용자: "공격이 몬스터까지 날아가는 탄과 궤적")
          const role = ALLY_ROLE[h.id];
          const flight = role === "ranged" || role === "healer" ? spawnAllyProj(h.id, ALLY_ELEMENT[h.id], isSig) : 0;
          if (flight > 0) window.setTimeout(land, flight); else land();
        }
      }

      // 보스 약점 창 교체 (2026-10-08) — 창이 닫히면 직전과 다른 속성으로. 레온 표식·[약점 관찰]이 창을 늘린다
      if (bossRef.current && battlePhaseRef.current === "combat") {
        const pn = performance.now();
        const wk = bossWeakRef.current;
        if (!wk || pn >= wk.until) {
          const nw = rollBossWeak(pn, wk, Math.random, WEAK_WINDOW_MS + saveRef.current.huntMods.weakWindowMs + allyFeatureEffects(characterRef.current.partyIds).weakWindowMs);
          bossWeakRef.current = nw;
          setBossWeak(nw);
        }
      }
      if (bossRef.current) {
        // 빙결(얼음 물방울·댐 수문 개방) — 제한시간 정지
        // 등장 걷기 동안도 정지 (2026-10-27 난이도 감사): 원정대가 자리 잡기 전엔 아무도 못 때리는데 시간이 흘러,
        // 대장의 반격(bossPressure)이 그 1~2초를 "느린 페이스"로 읽어 첫 한 대에 체력 19% 를 깎았다(×2 배속이면 두 배 — 걷기는 실제 시간)
        const left = bossLeftRef.current - (now < buffsRef.current.freezeUntil || !formationReadyRef.current ? 0 : dt);
        bossLeftRef.current = left;
        setBossLeft(Math.max(0, left));
        if (left <= 0) {
          flash(partyDownRef.current ? "원정대가 쓰러졌다 · 동료를 키워 다시 도전!" : "보스 실패 · 다시 도전!");
          if (partyDownRef.current) { const k = performance.now(); setPartyKo(k); window.setTimeout(() => setPartyKo((cur) => (cur === k ? 0 : cur)), 1300); }
          partyDownRef.current = false;
          // 벽 미터 (RETENTION D): 제한시간 동안 깎은 비율 — 추천 배너가 정량 게이지로 보여준다
          setWallInfo({ ratio: Math.max(0.02, Math.min(0.99, 1 - hpRef.current / Math.max(1, monsterHp(saveRef.current.stage, true)))), stage: saveRef.current.stage });
          setBossReady(true);
          spawn(saveRef.current.stage, MOBS_PER_STAGE, false);
          battlePhaseRef.current = "combat";
          setBattlePhase("combat");
          // DPS 벽 감지 (LIVEOPS §1.3) — 2연속 실패 = 이 지역의 벽.
          // 벽은 실패가 아니라 이정표다: 최초 도달 시 보석 보상 + 돌파 3택 배너,
          // 그리고 wallAreas 기록이 환생 조건(3지역)을 채운다.
          bossFailStreakRef.current += 1;
          sessionBossFailsRef.current += 1;
          void scheduleLocalNotification(NOTIFY_ID.bossRetry, "보스 재도전 준비 완료", `Stage ${saveRef.current.stage} 보스가 기다립니다 — 동료 레벨업 후 다시 도전하세요.`, new Date(Date.now() + 30 * 60000));
          // 결제 타이밍 (retention-2): 실패 1회차 → 무료 +10초 카드(세션 1회), 2회차부터 → 초급 세트 순간 제안.
          // 단 이번 실패가 지역 벽 최초 도달이면 아래 벽 제안이 대신 뜬다.
          const wallNow = bossFailStreakRef.current >= 2 && !characterRef.current.wallAreas.includes(huntingArea(saveRef.current.stage).id);
          if (!wallNow) {
            if (sessionBossFailsRef.current === 1 && !freeRetryUsedRef.current) setFreeRetryCard(true);
            else openOffer("boss-fail");
          }
          if (bossFailStreakRef.current >= 2) {
            bossFailStreakRef.current = 0;
            const areaId = huntingArea(saveRef.current.stage).id;
            if (!characterRef.current.wallAreas.includes(areaId)) {
              // 벽 기록과 벽 제안(retention-2)은 같은 갱신에서 — 따로 쓰면 나중 쓰기가 앞의 momentOffers 를 덮는다
              void updateCharacterProgress(userHash, (current) =>
                current.wallAreas.includes(areaId)
                  ? current
                  : openMomentOffer({
                      ...current,
                      wallAreas: [...current.wallAreas, areaId],
                      redGems: current.redGems + 30,
                    }, "wall"),
              ).then((next) => {
                setCharacter(next);
                setRedGems(next.redGems);
                flash(`${huntingArea(saveRef.current.stage).name}의 벽 도달 · 보석 +30`);
                // 자동 환생 (2026-10-22 아처 키우기 7번) — 조건을 채우면 잠깐 알린 뒤 바로 환생
                if (next.autoRebirth && canRebirthNow(next)) window.setTimeout(() => void autoRebirthRef.current(), 1600);
              });
            }
          }
        }
      }

      setCds((prev) => {
        let changed = false;
        const next = { ...prev };
        (Object.keys(next) as TitanSkillId[]).forEach((k) => {
          if (next[k] > 0) {
            next[k] = Math.max(0, next[k] - dt);
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }, 100);
    return () => window.clearInterval(id);
  }, [ready, applyDamage, spawn, userHash]);

  // 몬스터 기질 (2026-10-16, 사용자: "몬스터도 너무 가만히 있어 — 공격·피격 등 스테이지마다 랜덤성 요소로 긴장감") — 스테이지마다 정해진다
  const temper = useMemo(() => monsterTemper(save.stage, boss), [save.stage, boss]);
  const monsterCounterRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    if (!ready || battlePhase !== "combat" || !formationReady) {
      setMonsterAction("idle");
      return;
    }
    const timers: number[] = [];
    const later = (fn: () => void, ms: number) => { timers.push(window.setTimeout(fn, ms)); };
    // 타이밍 체인: 준비(0.32s 클립) → 타격(0.48s 클립) → 복귀. 클립 내부 타이밍은 그대로 두고(줄이면 모션이 뭉개진다) 간격·횟수만 흔든다
    let busyUntil = 0;   // 덤비는 중엔 반격·다음 공격을 겹치지 않는다
    const strike = (prep: number) => {
      busyUntil = performance.now() + prep + 540;
      setMonsterAction("prepare");
      later(() => setMonsterAction("attack"), prep);
      later(() => {
        const ids = characterRef.current.partyIds.filter((pid) => (saveRef.current.heroes[pid as TitanHeroId] ?? 0) > 0);
        const target = ids[Math.floor(Math.random() * ids.length)];
        if (target) setAllyHit((prev) => ({ ...prev, [target]: (prev[target] ?? 0) + 1 }));
        // 실제 피해 (2026-10-27, titans/bossPressure) — 대장은 원정대 체력을 깎고(0 이면 실패), 일반 몬스터는 숫자만
        const stageNow = saveRef.current.stage;
        const label = partyMaxHpLabel(stageNow);
        if (bossRef.current && !partyDownRef.current) {
          const T = Math.max(1, bossTimeRef.current);
          const left = bossLeftRef.current;
          const gap = Math.max(0.3, Math.min(4, lastBossHitLeftRef.current - left));
          lastBossHitLeftRef.current = left;
          const hpMax = Math.max(1, monsterHp(stageNow, true));
          const role = partyRoleEffects(characterRef.current.partyIds);
          const frac = bossHitFraction(stageNow, role.tanks, role.healers, bossPace(hpRef.current / hpMax, 1 - left / T), T, gap);
          partyHpRef.current = Math.max(0, partyHpRef.current - frac);
          setPartyHp(partyHpRef.current);
          if (target) setPartyDmg({ id: target, text: `-${Math.max(1, Math.round(frac * label)).toLocaleString()}`, key: performance.now(), boss: true });
          if (partyHpRef.current <= 0) { partyDownRef.current = true; bossLeftRef.current = 0; }
        } else if (target) {
          setPartyDmg({ id: target, text: `-${Math.max(1, Math.round(label * (0.02 + Math.random() * 0.02))).toLocaleString()}`, key: performance.now(), boss: false });
        }
      }, prep + 70);
      later(() => setMonsterAction("idle"), prep + 540);
      return prep + 540;
    };
    // 맞으면 가끔 바로 되받아친다(기질 counter 확률) — 일반 몬스터는 1초 안에 쓰러져 정해진 주기로는 한 번도 못 덤볐다
    monsterCounterRef.current = () => {
      if (performance.now() < busyUntil + 250 || Math.random() >= temper.counter) return;
      strike(200);
    };
    const cycle = () => {
      let busy: number;
      if (Math.random() < temper.feint) {
        // 헛손질 — 웅크렸다가 안 친다(다음 공격 타이밍을 못 읽게)
        busyUntil = performance.now() + 300;
        setMonsterAction("prepare");
        later(() => setMonsterAction("idle"), 300);
        busy = 300;
      } else {
        busy = strike(boss ? 360 : 320);
        // 연속 공격 — 짧게 한 번 더(준비 0.2초)
        if (Math.random() < temper.combo) { const at = busy + 140; later(() => strike(200), at); busy = at + 740; }
      }
      // 다음 공격까지 — 기질 속도 × 0.55~1.25 무작위 (배속이면 조인다). 화면 연출만이라 밸런스와 무관
      const gap = ((boss ? BOSS_ATTACK_GAP_MS : MOB_ATTACK_GAP_MS) * temper.pace * (0.55 + Math.random() * 0.7)) / save.battleSpeed;   // 2026-10-27: 1.8 · 2.3초 → 1.1 · 1.5초 ("너무 공격을 안 해")
      later(cycle, Math.max(busy + 200, gap));
    };
    // 첫 덤빔은 자리 잡자마자(0.25~0.6초) — 예전 1.4초는 일반 몬스터가 쓰러진 뒤라 "가만히 있다"로 보였다 (2026-10-16)
    later(cycle, ((boss ? 520 : 420) * (0.6 + Math.random() * 0.8)) / save.battleSpeed);
    return () => { timers.forEach((t) => window.clearTimeout(t)); monsterCounterRef.current = null; };
  }, [battlePhase, boss, formationReady, ready, save.battleSpeed, temper]);
  useEffect(() => { if (monsterHit > 0) monsterCounterRef.current?.(); }, [monsterHit]);
  // 제자리에서 어슬렁 — 교전 중 0.9~1.8초마다 다른 자리로 조금씩 움직인다(기질 폭만큼). 공격·피격 모션은 그 위에서 그대로
  const [monsterDrift, setMonsterDrift] = useState({ x: 0, y: 0 });
  useEffect(() => {
    // 2026-10-20 사용자: "첫 공격 전에만 움직이게" — 교전 중 어슬렁(0.9~1.8초마다 자리 이동)은 끈다. 공격 · 피격 모션(제자리로 돌아오는 것)은 그대로.
    // 상태는 남겨 둔다 — 인라인 translate 가 idle.css 의 지상 띠 올림(−52px)을 덮어 온 몬스터 높이를 그대로 두려고
    setMonsterDrift({ x: 0, y: 0 });
  }, [battlePhase, formationReady, ready, temper]);

  useEffect(() => {
    if (!ready) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.code === "Space" || e.code.startsWith("Key") || e.code.startsWith("Digit")) {
        e.preventDefault();
        doTap();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ready, doTap]);

  const trainEquipment = async (slot: "weapon" | "shoulder" | GearPart) => {
    if (slot !== "weapon" && slot !== "shoulder") {
      // 파츠 4종 — 사냥 골드만, 무기처럼 일괄 구매 (2026-10-14)
      const pkey = `${slot}Mastery` as "helmetMastery" | "armorMastery" | "glovesMastery" | "bootsMastery";
      const plevel = save.equipmentTraining[pkey] ?? 0;
      const pq = bulkUpgradeQuote((l) => gearTrainingCost(slot, l), plevel, save.gold, buyAmount);
      if (pq.count === 0) return;
      setSave((prev) => ({ ...prev, gold: prev.gold - pq.cost, equipmentTraining: { ...prev.equipmentTraining, [pkey]: (prev.equipmentTraining[pkey] ?? 0) + pq.count } }));
      flash(`${GEAR_PART_DEF[slot].name} 숙련 Lv.${plevel + pq.count}${pq.count > 1 ? ` (+${pq.count})` : ""}`);
      setAutoTrainHit((h) => ({ slot, seq: (h?.seq ?? 0) + 1, count: pq.count }));   // 손으로 훈련해도 카드 아이콘이 튄다 (2026-10-23)
      return;
    }
    const key = slot === "weapon" ? "weaponMastery" : "shoulderMastery";
    const level = save.equipmentTraining[key];
    if (slot === "shoulder") {
      const maxCount = buyAmount === 0 ? 999 : buyAmount;
      let count = 0;
      let gold = 0;
      let expedition = 0;
      let beat = 0;
      while (count < maxCount) {
        const nextLevel = level + count;
        const nextGold = equipmentTrainingCost("shoulder", nextLevel);
        const materials = shoulderTrainingMaterials(nextLevel);
        if (gold + nextGold > save.gold || expedition + materials.expedition > character.enhancementMaterials || beat + materials.beat > character.shoulderShards) break;
        gold += nextGold;
        expedition += materials.expedition;
        beat += materials.beat;
        count += 1;
      }
      if (count === 0) return;
      const next = await updateCharacterProgress(userHash, (current) => ({
        ...current,
        enhancementMaterials: Math.max(0, current.enhancementMaterials - expedition),
        shoulderShards: Math.max(0, current.shoulderShards - beat),
      }));
      setCharacter(next);
      setSave((prev) => ({ ...prev, gold: prev.gold - gold, equipmentTraining: { ...prev.equipmentTraining, shoulderMastery: prev.equipmentTraining.shoulderMastery + count } }));
      flash(`견갑 숙련 Lv.${level + count}${count > 1 ? ` (+${count})` : ""}`);
      return;
    }
    const quote = bulkUpgradeQuote((l) => equipmentTrainingCost(slot, l), level, save.gold, buyAmount);
    if (quote.count === 0) return;
    setSave((prev) => ({
      ...prev,
      gold: prev.gold - quote.cost,
      equipmentTraining: { ...prev.equipmentTraining, [key]: prev.equipmentTraining[key] + quote.count },
    }));
    if (slot === "weapon") setAutoTrainHit((h) => ({ slot, seq: (h?.seq ?? 0) + 1, count: quote.count }));
    const fw = Math.floor(forgedWeaponLevel * 1.5);
    flash(`${slot === "weapon" ? "무기" : "견갑"} 숙련 Lv.${level + quote.count}${quote.count > 1 ? ` (+${quote.count})` : ""}${slot === "weapon" ? ` · 탭 피해 ${formatGold(tapDamage(level + fw))} → ${formatGold(tapDamage(level + quote.count + fw))}` : ""}`);
  };

  // 자동 강화 루프 — 저장은 함수형 setSave 안에서 다시 계산(같은 틱에 두 번 사지 않게), 표시는 마지막으로 산 칸만 반짝
  useEffect(() => {
    try { localStorage.setItem("dodgebullets:auto-train", autoTrain ? "1" : "0"); } catch { /* 저장 못 해도 이번 실행엔 켜짐 */ }
    if (!autoTrain || tab !== "sword") return;
    const id = window.setInterval(() => {
      const cur = saveRef.current;
      const options: { slot: "weapon" | GearPart; cost: number }[] = [{ slot: "weapon", cost: equipmentTrainingCost("weapon", cur.equipmentTraining.weaponMastery) }];
      for (const part of GEAR_PARTS) {
        const lv = cur.equipmentTraining[`${part}Mastery` as "helmetMastery"] ?? 0;
        const enh = characterRef.current.gearEnhance?.[part] ?? 0;
        if (gearPartValue(part, lv, enh) >= GEAR_PART_DEF[part].cap) continue;
        options.push({ slot: part, cost: gearTrainingCost(part, lv) });
      }
      const pick = options.filter((o) => o.cost <= cur.gold).sort((a, b) => a.cost - b.cost)[0];
      if (!pick) return;
      const key = pick.slot === "weapon" ? "weaponMastery" : (`${pick.slot}Mastery` as "helmetMastery");
      setSave((prev) => {
        const lv = prev.equipmentTraining[key] ?? 0;
        const cost = pick.slot === "weapon" ? equipmentTrainingCost("weapon", lv) : gearTrainingCost(pick.slot, lv);
        if (prev.gold < cost) return prev;
        return { ...prev, gold: prev.gold - cost, equipmentTraining: { ...prev.equipmentTraining, [key]: lv + 1 } };
      });
      setAutoTrainHit((h) => ({ slot: pick.slot, seq: (h?.seq ?? 0) + 1, count: (h?.count ?? 0) + 1 }));
    }, 300);
    return () => window.clearInterval(id);
  }, [autoTrain, tab]);
  const autoTrainAffordable = tab === "sword" && (save.gold >= equipmentTrainingCost("weapon", save.equipmentTraining.weaponMastery) || GEAR_PARTS.some((part) => {
    const lv = save.equipmentTraining[`${part}Mastery` as "helmetMastery"] ?? 0;
    return gearPartValue(part, lv, character.gearEnhance?.[part] ?? 0) < GEAR_PART_DEF[part].cap && save.gold >= gearTrainingCost(part, lv);
  }));

  /** 이번 주 조각팩 구매 횟수 — 주간 제한(과금 상한 설계)의 판정 */
  const shardPackBoughtThisWeek = (id: TitanHeroId): number => {
    const week = currentWeekKey();
    if (character.weeklyShardPacks.week !== week) return 0;
    return character.weeklyShardPacks.bought[id] ?? 0;
  };

  /** 이벤트·특별 상점 (확정 구매, 주간 한도). 골드는 공유 지갑, 코어는 사냥터 저장, 방지권은 대장간 진입 시 이관 */
  const buyEventProduct = async (product: EventProduct) => {
    const week = currentWeekKey();
    if (redGems < product.gemCost || (product.coinCost ?? 0) > character.eventCoins || eventBuysThisWeek(character, product.id, week) >= product.weeklyLimit) return;
    // 조각은 가진 동료 모두에게(2026-10-28 — 동료 고르기 없음) · 신화 · 초월 상자는 가진 신화 · 초월에게 · 특가 동료는 없으면 합류
    const owned = HEROES.filter((h) => saveRef.current.heroes[h.id] > 0).map((h) => h.id);
    const ownedTop = owned.filter((id) => ALLY_RARITY[id] === "UR" || ALLY_RARITY[id] === "LR");
    const pre = product.grant(character);
    const unlockNew = !!pre.allyUnlock && (saveRef.current.heroes[pre.allyUnlock] ?? 0) <= 0;
    if (pre.topTierShards && !ownedTop.length) { flash("가진 신화 · 초월 동료가 없습니다 — 특가 동료나 뽑기로 먼저 만나세요"); return; }
    let grant: EventGrant | null = null;
    const next = await updateCharacterProgress(userHash, (current) => {
      const record = current.weeklyEventBuys.week === week ? current.weeklyEventBuys : { week, bought: {} };
      const bought = record.bought[product.id] ?? 0;
      if (bought >= product.weeklyLimit || current.redGems < product.gemCost || current.eventCoins < (product.coinCost ?? 0)) return current;
      const g = product.grant(current);
      // 등반권은 보유 상한이 있다 — 넘치게 사면 보석만 사라진다
      if (g.towerTickets && current.towerTickets + g.towerTickets > TOWER_TICKET_MAX) return current;
      if (g.beatTickets && current.beatTicketsBought + g.beatTickets > BEAT_TICKET_MAX_BOUGHT) return current;   // 비트 시도권 보유 상한 (2026-10-28)
      grant = g;
      return {
        ...current,
        redGems: current.redGems - product.gemCost + (g.gems ?? 0),
        eventCoins: current.eventCoins - (product.coinCost ?? 0),
        sharedCoins: current.sharedCoins + (g.gold ?? 0),
        enhancementMaterials: current.enhancementMaterials + (g.materials ?? 0),
        expeditionSeals: current.expeditionSeals + (g.seals ?? 0),
        shoulderShards: current.shoulderShards + (g.shoulderShards ?? 0),
        allyShards: (() => {
          const out = { ...current.allyShards };
          if (g.allyShards) for (const id of owned) out[id] = (out[id] ?? 0) + g.allyShards;
          if (g.topTierShards) for (const id of ownedTop) out[id] = (out[id] ?? 0) + g.topTierShards;
          if (g.allyUnlock && !unlockNew) out[g.allyUnlock] = (out[g.allyUnlock] ?? 0) + GACHA.dupeShards[ALLY_RARITY[g.allyUnlock]];
          return out;
        })(),
        forgeTicketsPending: current.forgeTicketsPending + (g.forgeTickets ?? 0),
        towerTickets: Math.min(TOWER_TICKET_MAX, current.towerTickets + (g.towerTickets ?? 0)),
        beatTicketsBought: current.beatTicketsBought + (g.beatTickets ?? 0),
        idleBoostUntil: g.idleBoostHours ? Math.max(Date.now(), current.idleBoostUntil) + g.idleBoostHours * 3600 * 1000 : current.idleBoostUntil,
        weeklyEventBuys: { week, bought: { ...record.bought, [product.id]: bought + 1 } },
        lastContent: "titans",
      };
    });
    if (!grant) {
      if (product.grant(character).towerTickets) flash(`등반권은 ${TOWER_TICKET_MAX}장까지 가질 수 있습니다`);
      if (product.grant(character).beatTickets) flash(`산 비트 시도권은 ${BEAT_TICKET_MAX_BOUGHT}장까지 가질 수 있습니다`);
      return;
    }
    const g: EventGrant = grant;
    setCharacter(next);
    setRedGems(next.redGems);
    if (g.cores) setSave((prev) => ({ ...prev, skillInventory: { ...prev.skillInventory, skillCores: prev.skillInventory.skillCores + (g.cores ?? 0) } }));
    if (g.allyUnlock && unlockNew) {
      const uid = g.allyUnlock;
      setSave((prev) => ({ ...prev, heroes: { ...prev.heroes, [uid]: Math.max(1, prev.heroes[uid] ?? 0) } }));
      discover("ally", uid, HEROES.find((h) => h.id === uid)?.name ?? uid);
    }
    sfxSlotUnlock();
    flash(`${product.name} 구매 — ${product.summary(next)}`);
  };

  const buyShardPack = async () => {
    const id = shardPackTarget;
    if (redGems < 120 || save.heroes[id] <= 0) return;
    const week = currentWeekKey();
    const next = await updateCharacterProgress(userHash, (current) => {
      const record = current.weeklyShardPacks.week === week ? current.weeklyShardPacks : { week, bought: {} };
      const bought = record.bought[id] ?? 0;
      if (bought >= SHARD_PACK_WEEKLY_LIMIT || current.redGems < 120) return current;
      return {
        ...current,
        redGems: current.redGems - 120,
        allyShards: { ...current.allyShards, [id]: (current.allyShards[id] ?? 0) + SHARD_PACK_AMOUNT },
        weeklyShardPacks: { week, bought: { ...record.bought, [id]: bought + 1 } },
      };
    });
    setCharacter(next);
    setRedGems(next.redGems);
    flash(`${HEROES.find((h) => h.id === id)?.name} 조각 +${SHARD_PACK_AMOUNT}`);
  };

  const buyIdleBooster = async () => {
    if (redGems < 80 || character.idleBoostUntil > Date.now()) return;
    const next = await updateCharacterProgress(userHash, (current) =>
      current.redGems < 80 || current.idleBoostUntil > Date.now()
        ? current
        : { ...current, redGems: current.redGems - 80, idleBoostUntil: Date.now() + 24 * 3600 * 1000 },
    );
    setCharacter(next);
    setRedGems(next.redGems);
    flash("방치 가속 24시간 시작 — 산출 2배");
  };

  /** 상점 전용 동료(luna·volt) — 보석으로 ★1 확정 해금. 성급은 조각 파밍으로만. */
  const buyShopAlly = async (id: TitanHeroId) => {
    const gemCost = SHOP_ALLY_GEM_COST[id];
    const def = HEROES.find((h) => h.id === id);
    if (!def || gemCost === undefined || save.heroes[id] > 0 || redGems < gemCost) return;
    const next = await updateCharacterProgress(userHash, (current) => {
      const slots = partySlotCount(current.towerBestFloor, current.partyCap);
      return {
        ...current,
        redGems: Math.max(0, current.redGems - gemCost),
        allyStars: { ...current.allyStars, [id]: Math.max(1, current.allyStars[id]) },
        partyIds:
          current.partyIds.includes(id) || current.partyIds.length >= slots
            ? current.partyIds
            : [...current.partyIds, id],
      };
    });
    setCharacter(next);
    setRedGems(next.redGems);
    setSave((prev) => ({ ...prev, heroes: { ...prev.heroes, [id]: 1 } }));
    setAllyPulse((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }));
    flash(`${def.name} 합류! (★1)`);
    discover("ally", id, def.name);
  };

  /**
   * 동료 소환 (확률형 재설계) — titans/gacha.ts 엔진. 풀은 현재 진행도 기준(상점 동료 제외),
   * 천장 60·10연 SR 보장·픽업 2배. 새 동료는 빈 슬롯이 있으면 자동 편성 — "뽑았는데 안 싸우는" 상황을 막는다.
   */
  /** 상점 유물 뽑기 — 재화마다 등급 확률이 다르다(2026-10-28: 골드 일반 ~ 영웅 · 강화석 희귀 ~ 신화 · 보석 영웅 ~ 초월) · 등급 안에서 균등 */
  const drawRelic = async (banner: RelicBanner, count: 1 | 10) => {
    const c = relicBannerCost(banner, saveRef.current.stage);
    const cost = count === 10 ? c.ten : c.single;
    const cur = banner;
    if (relicDrawRates(relicMerged(characterRef.current.relics, characterRef.current.relicSpare), banner).every((x) => x.rate === 0)) return;
    if (cur === "gold" && saveRef.current.gold < cost) { flash(`골드가 모자랍니다 — ${formatGold(cost)} 필요`); return; }
    let got: RelicId[] = [];
    const next = await updateCharacterProgress(userHash, (current) => {
      const have = cur === "stone" ? current.enhancementMaterials : cur === "gem" ? current.redGems : Infinity;
      if (have < cost) return current;
      // 뽑은 조각은 남은 조각으로(2026-10-28 중복 소진) — 유물 탭에서 소진해 ★ 에 넣는다
      const d = drawRelicShards(relicMerged(current.relics, current.relicSpare), count, Math.random, banner);
      if (d.got.length === 0) return current;
      got = d.got;
      return { ...current, relicSpare: addRelicSpare(current.relicSpare, d.got), ...(cur === "stone" ? { enhancementMaterials: current.enhancementMaterials - cost } : cur === "gem" ? { redGems: current.redGems - cost } : {}) };
    });
    if (got.length === 0) { flash(cur === "stone" ? "강화석이 모자랍니다" : "보석이 모자랍니다"); return; }
    if (cur === "gold") setSave((prev) => ({ ...prev, gold: Math.max(0, prev.gold - cost) }));
    setCharacter(next);
    setRedGems(next.redGems);
    // 소환진 → 공개 (동료 소환과 같은 꼴 · 최고 등급 색 · 등급별 소리)
    const best = got.map((id) => relicDef(id).tier).sort((x, y) => TIERS.indexOf(y) - TIERS.indexOf(x))[0] ?? "N";
    setRelicSummoning({ tier: best, count: got.length });
    sfxRelicSummon();
    window.setTimeout(() => {
      setRelicSummoning(null);
      sfxRelicReveal(best);
      setRelicDrawResult(got);
    }, 1200);
  };

  /** 유물 남은 조각 소진 (2026-10-28 중복 소진) — 넣을 수 있는 만큼 ★ 에. ★ 가 오르면 등급 소리 · 세트가 새로 켜지면 세트 안내 */
  const consumeRelic = async (id: RelicId) => {
    const before = characterRef.current.relics;
    let used = 0;
    const next = await updateCharacterProgress(userHash, (cur) => { const r = consumeRelicSpare(cur.relics, cur.relicSpare, id); used = r.used; return r.used > 0 ? { ...cur, relics: r.state, relicSpare: r.spare } : cur; });
    if (used <= 0) return;
    setCharacter(next);
    const def = relicDef(id);
    const stars = relicStars(next.relics, id);
    const up = stars > relicStars(before, id);
    const setNow = setActive(next.relics, def.family) && !setActive(before, def.family);
    if (up) sfxRelicReveal(def.tier); else sfxSlotUnlock();
    showRewardPop("relic", setNow ? `${RELIC_FAMILY_LABEL[def.family]} 세트 완성!` : up ? `유물 ${"★".repeat(stars)}` : "조각 소진", def.name,
      setNow ? `${RELIC_SET[def.family].name} — ${RELIC_SET[def.family].blurb}` : `조각 ${used}개 소진 · ★${stars}${stars < 5 ? ` · 다음 ★ 까지 ${(stars + 1) * RELIC_SHARDS_PER_STAR - (next.relics[id] ?? 0)}개` : " · 최대"}`, relicIconUrl(id));
  };

  /** 상점 스킬 뽑기 (2026-10-28, 사용자: "스킬도 상점에서 돈으로 배울수 있게 동료, 유물처럼 이펙트") — 골드는 사냥터 저장, 보석은 진행도.
   *  뽑은 스킬은 스킬 카드로(사냥터 저장 setSave 로만 — 밖에서 저장에 쓰면 사냥터가 덮어쓴다) */
  const drawSkill = async (banner: SkillBanner, count: 1 | 10) => {
    const c = skillBannerCost(banner, saveRef.current.stage, saveRef.current.skillInventory);
    const cost = count === 10 ? c.ten : c.single;
    const inv = saveRef.current.skillInventory;
    if (skillDrawRates(inv, banner).every((x) => x.rate === 0)) { flash("이 뽑기의 스킬을 모두 최대 레벨까지 모았어요"); return; }
    if (banner === "gold" && saveRef.current.gold < cost) { flash(`골드가 모자랍니다 — ${formatGold(cost)} 필요`); return; }
    if (banner === "gem") {
      let paid = false;
      const next = await updateCharacterProgress(userHash, (cur) => { if (cur.redGems < cost) return cur; paid = true; return { ...cur, redGems: cur.redGems - cost }; });
      if (!paid) { flash("보석이 모자랍니다"); return; }
      setCharacter(next);
      setRedGems(next.redGems);
    }
    const { got } = drawSkillCopies(saveRef.current.skillInventory, count, banner);
    if (got.length === 0) return;
    setSave((prev) => {
      const copies = { ...(prev.skillInventory.copies ?? {}) };
      for (const id of got) copies[id] = (copies[id] ?? 0) + 1;
      return { ...prev, gold: banner === "gold" ? Math.max(0, prev.gold - cost) : prev.gold, skillInventory: { ...prev.skillInventory, copies } };
    });
    // 소환진 → 공개 (동료 · 유물 소환과 같은 판 · 최고 등급 색 · 등급별 소리)
    const best = got.map((id) => SKILL_TIER[id]).sort((x, y) => TIERS.indexOf(y) - TIERS.indexOf(x))[0] ?? "N";
    setSkillSummoning({ tier: best, count: got.length });
    sfxRelicSummon();
    window.setTimeout(() => {
      setSkillSummoning(null);
      sfxSkillTier(best);
      setSkillDrawResult(got);
    }, 1200);
  };

  /** 스킬 카드 소진 — 안 배운 스킬은 1장으로 배우고(칸 한도는 그대로), 배운 스킬은 남은 카드를 모두 Lv 로. 장착 연출을 한 번 */
  const consumeSkillCard = (id: TitanSkillId) => {
    const def = SKILLS.find((x) => x.id === id);
    const inv = saveRef.current.skillInventory;
    if (!def || (inv.copies?.[id] ?? 0) <= 0) return;
    if (!inv.learned.includes(id)) {
      const inType = SKILLS.filter((x) => x.slot === def.slot && inv.learned.includes(x.id)).length;
      if (inType >= skillTypeCapacity) { flash(`${SLOT_LABEL[def.slot]} 보유 한도 ${skillTypeCapacity}개 · 캐릭터 레벨을 올리세요`); return; }
    }
    const r = consumeSkillCopies(inv, id);
    if (r.used <= 0) return;
    setSave((prev) => {
      const again = consumeSkillCopies(prev.skillInventory, id);
      if (again.used <= 0) return prev;
      const equipped = again.learnedNow && !prev.skillInventory.equipped[def.slot] ? { ...again.inv.equipped, [def.slot]: id } : again.inv.equipped;
      return { ...prev, skillInventory: { ...again.inv, equipped } };
    });
    previewSkillEquip(id);
    flash(r.learnedNow ? `${def.name} 학습 · 카드 1장` : `${def.name} Lv.${r.inv.levels[id] ?? 1} · 카드 ${r.used}장 소진`, 1800);
  };

  const summonAlly = async (count: 1 | 10) => {
    const cost = count === 10 ? GACHA.tenCost : GACHA.singleCost;
    if (redGems < cost || gacha.entries.length === 0) return;
    const pulled =
      count === 10
        ? pullTen(gacha, save.heroes, Math.min(GACHA.pityLimit - 1, character.gachaPity), Math.random, character.gachaPulls === 0, FIRST_TEN_SSR, character.gachaLrPity)
        : (() => { const r = pullOnce(gacha, save.heroes, Math.min(GACHA.pityLimit - 1, character.gachaPity), Math.random, null, character.gachaLrPity); return { results: [r.result], pity: r.pity, lrPity: r.lrPity }; })();   // 옛 저장의 60 초과 카운터는 천장 직전으로
    // 높은 등급부터 빈 편성 칸에 — 첫 10연 전설이 맨 뒤에 나와 칸이 차서 못 들어가던 것(2026-10-22)
    const newIds = [...new Set(pulled.results.filter((r) => !r.duplicate).sort((x, y) => TIERS.indexOf(y.rarity) - TIERS.indexOf(x.rarity)).map((r) => r.id))];
    let paid = false;
    const next = await updateCharacterProgress(userHash, (current) => {
      if (current.redGems < cost) return current;
      paid = true;
      const slots = partySlotCount(current.towerBestFloor, current.partyCap);
      const stars = { ...current.allyStars };
      const shards = { ...current.allyShards };
      for (const r of pulled.results) {
        if (r.duplicate) shards[r.id] = (shards[r.id] ?? 0) + r.shards;
        else stars[r.id] = Math.max(1, stars[r.id] ?? 0);
      }
      const party = [...current.partyIds];
      // 빈 칸은 높은 등급부터 채운다(2026-10-28) — 풀에 동료가 다 들어가 10연에 새 동료가 많아져, 뽑은 순서대로면 첫 10연 전설이 칸이 없어 빠졌다
      for (const id of [...newIds].sort((x, y) => TIER_RANK[ALLY_RARITY[y]] - TIER_RANK[ALLY_RARITY[x]])) if (!party.includes(id) && party.length < slots) party.push(id);
      // 10연이면 비버 상자 1개 (economy/chests, 2026-10-13 P2)
      const withChest = count === 10 ? grantChest(current) : current;
      // 첫 10연 전설이 아직 못 여는 지역 동료면 출전 허가를 같이 — 뽑고 바로 같이 싸워 봐야 "4성 경험"
      const passes = pulled.results.filter((r) => r.fieldPass).map((r) => `field-pass:${r.id}`);
      const claimed = passes.length > 0 ? [...new Set([...withChest.claimedRewards, ...passes])] : withChest.claimedRewards;
      return { ...withChest, claimedRewards: claimed, redGems: current.redGems - cost, allyStars: stars, allyShards: shards, partyIds: party, gachaPity: pulled.pity, gachaLrPity: pulled.lrPity, gachaPulls: current.gachaPulls + count };
    });
    if (!paid) return;
    setCharacter(next);
    setRedGems(next.redGems);
    for (const id of newIds) discover("ally", id, HEROES.find((h) => h.id === id)?.name ?? id);
    if (newIds.length > 0) {
      setSave((cur) => {
        const heroes = { ...cur.heroes };
        for (const id of newIds) heroes[id] = Math.max(1, heroes[id]);
        return { ...cur, heroes };
      });
      setAllyPulse((prev) => { const out = { ...prev }; for (const id of newIds) out[id] = (out[id] ?? 0) + 1; return out; });
    }
    // 사전 연출 (계획안 E): 소환진 1.2s — 색은 최종 최고 등급을 예고하되 30%는 한 단계 위로 페이크
    // 6등급 (2026-10-27) — 소환진 색은 최고 등급을 예고하되 30%는 한 단계 위로 페이크(초월은 페이크 없음)
    const order = TIERS;
    const best = pulled.results.map((r) => r.rarity).sort((a, b) => TIER_RANK[b] - TIER_RANK[a])[0] ?? "R";
    const fake = best !== "LR" && Math.random() < 0.3;
    const tease = fake ? order[Math.min(order.length - 1, TIER_RANK[best] + 1)] : best;
    setGachaSummoning({ tier: tease, count });
    window.setTimeout(() => {
      setGachaSummoning(null);
      sfxSlotUnlock();
      setGachaReveal(pulled.results);
    }, 1200);
  };

  /** 성급 승급 — 조각 소비, 환생에도 보존되는 영구 성장 */
  const starUpAlly = async (id: TitanHeroId) => {
    const lv = save.heroes[id];
    const stars = effectiveStars(character.allyStars[id], lv);
    const cost = shardCostToNext(id, stars);
    if (lv <= 0 || cost === null || character.allyShards[id] < cost) return;
    const next = await updateCharacterProgress(userHash, (current) => {
      const cur = effectiveStars(current.allyStars[id], lv);
      const need = shardCostToNext(id, cur);
      if (need === null || current.allyShards[id] < need) return current;
      return {
        ...current,
        allyShards: { ...current.allyShards, [id]: current.allyShards[id] - need },
        allyStars: { ...current.allyStars, [id]: cur + 1 },
      };
    });
    setCharacter(next);
    sfxSlotUnlock();
    flash(`${HEROES.find((h) => h.id === id)?.name} ★${effectiveStars(next.allyStars[id], lv)} 승급!`);
  };

  /** 출전/벤치 토글 (§2) — 슬롯이 차 있으면 추가 불가, 파견 중 동료는 출전 불가 */
  const toggleParty = async (id: TitanHeroId) => {
    const onExpedition = character.expeditions.some((e) => e.allyId === id);
    if (onExpedition) return;
    // 개척 상한 게이트 — 소환으로 얻은 후반 동료가 Lv.1로 25스테이지를 건너뛰던 구멍을 막는다
    const def = HEROES.find((h) => h.id === id);
    if (def && !character.partyIds.includes(id) && !canFieldAlly(id, def.unlockStage, stageCeilingFor(character.pioneeredArea), character.claimedRewards)) {
      flash(`${def.name}은(는) STAGE ${def.unlockStage} 지역을 개척해야 출전합니다 — 성문 방어으로 지역을 여세요`);
      return;
    }
    const slots = partySlotCount(character.towerBestFloor, character.partyCap);
    const inParty = character.partyIds.includes(id);
    if (!inParty && character.partyIds.length >= slots) {
      flash(`출전 슬롯이 가득 찼습니다 (${slots}자리)`);
      return;
    }
    const next = await updateCharacterProgress(userHash, (current) => ({
      ...current,
      partyIds: current.partyIds.includes(id)
        ? current.partyIds.filter((p) => p !== id)
        : [...current.partyIds, id].slice(0, slots),
    }));
    setCharacter(next);
  };

  /** 파견 (§3) — 벤치 동료를 4/8/12시간 보내 등급·성급 비례 보상을 받는다 */
  const sendExpedition = async (id: TitanHeroId, hours: 4 | 8 | 12) => {
    if (
      save.heroes[id] <= 0 ||
      character.partyIds.includes(id) ||
      character.expeditions.length >= EXPEDITION_MAX ||
      character.expeditions.some((e) => e.allyId === id)
    )
      return;
    const endsAt = Date.now() + hours * 3600 * 1000;
    const next = await updateCharacterProgress(userHash, (current) =>
      current.expeditions.length >= EXPEDITION_MAX || current.expeditions.some((e) => e.allyId === id)
        ? current
        : {
            ...current,
            expeditions: [...current.expeditions, { allyId: id, endsAt, hours }],
          },
    );
    setCharacter(next);
    const name = HEROES.find((h) => h.id === id)?.name ?? "동료";
    setExpeditionSendPop((prev) => ({ allyId: id, hours, seq: (prev?.seq ?? 0) + 1 }));
    const slot = next.expeditions.findIndex((e) => e.allyId === id);
    if (slot >= 0) {
      void scheduleLocalNotification(
        NOTIFY_ID.expeditionBase + slot,
        "파견대 귀환",
        `${name} 파견대가 돌아왔습니다. 보상을 수령하세요!`,
        new Date(endsAt),
      );
    }
  };

  /** 완료된 파견 일괄 수령 — 보상 조각은 파견 간 동료 본인에게 쌓인다 */
  const claimExpeditions = async () => {
    const done = character.expeditions.filter((e) => e.endsAt <= Date.now());
    if (done.length === 0) return;
    const next = await updateCharacterProgress(userHash, (current) => {
      const finished = current.expeditions.filter((e) => e.endsAt <= Date.now());
      if (finished.length === 0) return current;
      const shards = { ...current.allyShards };
      let materials = 0;
      let gems = 0;
      finished.forEach((e) => {
        const stars = effectiveStars(current.allyStars[e.allyId], saveRef.current.heroes[e.allyId]);
        const reward = expeditionReward(e.allyId, stars, e.hours);
        shards[e.allyId] = (shards[e.allyId] ?? 0) + reward.shards;
        materials += reward.materials;
        gems += reward.gems;
      });
      return {
        ...current,
        allyShards: shards,
        enhancementMaterials: current.enhancementMaterials + materials,
        redGems: current.redGems + gems,
        expeditions: current.expeditions.filter((e) => e.endsAt > Date.now()),
      };
    });
    setCharacter(next);
    setRedGems(next.redGems);
    flash(`파견 ${done.length}건 귀환 — 조각·강화석 수령 완료`);
    // 알림 정리: 전부 취소 후 아직 진행 중인 파견만 다시 예약 (슬롯 재배치)
    void cancelLocalNotification([NOTIFY_ID.expeditionBase, NOTIFY_ID.expeditionBase + 1]).then(() => {
      next.expeditions.forEach((e, slot) => {
        const name = HEROES.find((h) => h.id === e.allyId)?.name ?? "동료";
        void scheduleLocalNotification(
          NOTIFY_ID.expeditionBase + slot,
          "파견대 귀환",
          `${name} 파견대가 돌아왔습니다. 보상을 수령하세요!`,
          new Date(e.endsAt),
        );
      });
    });
  };

  /** 동료 스킨 구매 — 확정 구매, 구매 즉시 자동 장착 */
  const buyAllySkin = async (skinId: string) => {
    const def = ALLY_SKINS[skinId];
    // J: 픽업 동료의 스킨은 20% 할인 — 가격은 구매 시점의 픽업 목록으로 확정
    const price = skinPrice(skinId, gacha.pickups);
    if (!def || price === null || character.ownedAllySkins.includes(skinId) || redGems < price) return;
    const next = await updateCharacterProgress(userHash, (current) =>
      current.ownedAllySkins.includes(skinId) || current.redGems < price
        ? current
        : {
            ...current,
            redGems: current.redGems - price,
            ownedAllySkins: [...current.ownedAllySkins, skinId],
            equippedAllySkins: { ...current.equippedAllySkins, [def.ally]: skinId },
          },
    );
    setCharacter(next);
    setRedGems(next.redGems);
    setAllyPulse((prev) => ({ ...prev, [def.ally]: (prev[def.ally] ?? 0) + 1 }));
    flash(`${def.name} 스킨 장착!`);
  };

  /** 스킨 장착/해제 토글 */
  const toggleAllySkin = async (allyId: TitanHeroId, skinId: string) => {
    if (!character.ownedAllySkins.includes(skinId)) return;
    const next = await updateCharacterProgress(userHash, (current) => {
      const equipped = { ...current.equippedAllySkins };
      if (equipped[allyId] === skinId) delete equipped[allyId];
      else equipped[allyId] = skinId;
      return { ...current, equippedAllySkins: equipped };
    });
    setCharacter(next);
  };

  /** 비트 커스텀 구매·장착 — 소유는 진행도 저장에 (비트 메뉴의 커스텀 상점과 같은 아이템) */
  const buyBeatCustom = async (item: BeatShopItem) => {
    const owned = ownsBeatItem(character.beatCosmetics, item);
    if (!owned && redGems < item.cost) return;
    const next = await updateCharacterProgress(userHash, (current) => {
      if (ownsBeatItem(current.beatCosmetics, item)) return { ...current, beatCosmetics: equipBeatItem(current.beatCosmetics, item) };
      if (current.redGems < item.cost) return current;
      return { ...current, redGems: current.redGems - item.cost, beatCosmetics: grantBeatItem(current.beatCosmetics, item) };
    });
    setCharacter(next);
    setRedGems(next.redGems);
    flash(owned ? `${item.name} 장착 — 비트 수련에 적용` : `${item.name} 구매 · 장착 — 비트 수련에 적용`);
  };

  /** 무기 외형 구매 — 확정 구매, 즉시 장착 */
  /** 펫 바로 부화 (2026-10-28) — 붉은 보석. 장착 펫이 없으면 바로 장착 */
  const buyPet = async (pid: PetId) => {
    const price = PET_GEM_PRICE[pid];
    if ((character.pets[pid] ?? 0) > 0 || redGems < price) return;
    const next = await updateCharacterProgress(userHash, (current) =>
      (current.pets[pid] ?? 0) > 0 || current.redGems < price
        ? current
        : { ...current, redGems: current.redGems - price, pets: { ...current.pets, [pid]: 1 }, activePet: current.activePet || pid },
    );
    setCharacter(next);
    setRedGems(next.redGems);
    flash(`${PET_DEFS[pid].name} 부화! 주인공 곁에서 같이 사냥한다`);
  };
  const equipPetShop = async (pid: PetId) => {
    if ((character.pets[pid] ?? 0) <= 0) return;
    const next = await updateCharacterProgress(userHash, (current) => ({ ...current, activePet: current.activePet === pid ? "" : pid }));
    setCharacter(next);
    flash(next.activePet === pid ? `${PET_DEFS[pid].name} 장착` : `${PET_DEFS[pid].name} 해제`);
  };
  const buyWeaponSkin = async (skinId: string) => {
    const def = WEAPON_SKINS[skinId];
    if (!def || character.ownedWeaponSkins.includes(skinId) || redGems < def.gemCost) return;
    const next = await updateCharacterProgress(userHash, (current) =>
      current.ownedWeaponSkins.includes(skinId) || current.redGems < def.gemCost
        ? current
        : {
            ...current,
            redGems: current.redGems - def.gemCost,
            ownedWeaponSkins: [...current.ownedWeaponSkins, skinId],
            equippedWeaponSkin: skinId,
          },
    );
    setCharacter(next);
    setRedGems(next.redGems);
    flash(`${def.name} 장착 — 다음 몬스터부터 무기가 물든다`);   // 외형도 다음 몬스터(서브 스테이지)부터(2026-10-28)
  };

  const toggleWeaponSkin = async (skinId: string) => {
    if (!character.ownedWeaponSkins.includes(skinId)) return;
    const next = await updateCharacterProgress(userHash, (current) => ({
      ...current,
      equippedWeaponSkin: current.equippedWeaponSkin === skinId ? "" : skinId,
    }));
    setCharacter(next);
    flash(next.equippedWeaponSkin ? `${WEAPON_SKINS[skinId]?.name ?? "외형"} 장착 · 다음 몬스터부터` : "무기 외형 해제 · 다음 몬스터부터");   // 장비 탈부착은 다음 몬스터(서브 스테이지)부터(2026-10-28)
  };

  /** 칭호 구매 — 표시 칭호가 없으면 자동 장착 */
  const buyTitle = async (titleId: string) => {
    const def = TITLES[titleId];
    if (!def || character.ownedTitles.includes(titleId) || redGems < def.gemCost) return;
    const next = await updateCharacterProgress(userHash, (current) =>
      current.ownedTitles.includes(titleId) || current.redGems < def.gemCost
        ? current
        : {
            ...current,
            redGems: current.redGems - def.gemCost,
            ownedTitles: [...current.ownedTitles, titleId],
            activeTitle: current.activeTitle || titleId,
          },
    );
    setCharacter(next);
    setRedGems(next.redGems);
    flash(`칭호 「${def.name}」 획득 — 마이페이지에서 표시`);
  };

  /** 재화 팩 — 수량이 진행도 비례(goldPackAmount)라 어느 시점에도 유의미하다 */
  const buyGoldPack = async () => {
    if (redGems < GEM_PACK.goldPackCost) return;
    const amount = goldPackAmount(character);
    const next = await updateCharacterProgress(userHash, (current) =>
      current.redGems < GEM_PACK.goldPackCost
        ? current
        : { ...current, redGems: current.redGems - GEM_PACK.goldPackCost },
    );
    if (next.redGems === redGems) return;
    setCharacter(next);
    setRedGems(next.redGems);
    setSave((prev) => ({ ...prev, gold: prev.gold + amount }));
    flash(`황금 보급 상자 개봉 — +${formatGold(amount)}G`);
  };

  const buyMaterialPack = async () => {
    if (redGems < GEM_PACK.materialPackCost) return;
    const next = await updateCharacterProgress(userHash, (current) =>
      current.redGems < GEM_PACK.materialPackCost
        ? current
        : {
            ...current,
            redGems: current.redGems - GEM_PACK.materialPackCost,
            enhancementMaterials: current.enhancementMaterials + GEM_PACK.materialPackAmount,
          },
    );
    setCharacter(next);
    setRedGems(next.redGems);
    flash(`강화석 상자 개봉 — +${GEM_PACK.materialPackAmount}`);
  };

  // 스킬 코어 상자·파견 즉시 완료권은 BM 간결화로 뺐다 (2026-10-08) — 코어는 성문 방어·시즌 패스, 파견은 기다리는 콘텐츠

  const buyHero = (id: TitanHeroId) => {
    const def = HEROES.find((h) => h.id === id);
    if (!def) return;
    // 2026-10-28 스테이지 해금 없음 — 골드 소환 값(baseCost, 후반 동료일수록 비싸다)이 곧 문이다
    const lv = save.heroes[id];
    // 소환(0→1)은 항상 1레벨 — 일괄 수량은 레벨업에만 적용된다
    const quote =
      lv === 0
        ? { count: save.gold >= def.baseCost ? 1 : 0, cost: def.baseCost }
        : bulkUpgradeQuote((l) => heroUpgradeCost(def, l), lv, save.gold, buyAmount);
    if (quote.count === 0) return;
    setSave((prev) => ({
      ...prev,
      gold: prev.gold - quote.cost,
      heroes: { ...prev.heroes, [id]: prev.heroes[id] + quote.count },
    }));
    // 레벨업은 DPS 전후를 같이 (2026-10-22 "효과가 안 보이는 강화" 피하기)
    const stars = starMultiplier(effectiveStars(character.allyStars[id], Math.max(1, lv + quote.count)));
    flash(lv === 0 ? `${def.name} 소환!` : `${def.name} Lv.${lv + quote.count}${quote.count > 1 ? ` (+${quote.count})` : ""} · DPS ${formatGold(heroDps(def, lv) * stars)} → ${formatGold(heroDps(def, lv + quote.count) * stars)}`);
    if (lv === 0) discover("ally", id, def.name);
    if (lv === 0) {
      setAllyPulse((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }));
      pushFxAt("ally", id, 0.5, 0.5, 36, 58, def.hue);
      // 첫 소환은 빈 슬롯에 자동 출전 — 소환했는데 안 싸우는 상황을 막는다.
      // 도감(§7) 보유 판정용 ★1 기록도 여기서 함께 남긴다.
      void updateCharacterProgress(userHash, (current) => {
        const slots = partySlotCount(current.towerBestFloor, current.partyCap);
        return {
          ...current,
          allyStars: { ...current.allyStars, [id]: Math.max(1, current.allyStars[id] ?? 0) },
          partyIds:
            current.partyIds.includes(id) || current.partyIds.length >= slots
              ? current.partyIds
              : [...current.partyIds, id],
        };
      }).then(setCharacter);
    }
  };

  /**
   * 스킬 발동 연출 (2026-10-06, 사용자: "스킬이 현재 모험가 기준으로 발동되는지 구분이 안되 이팩트나 데미지를 실제 모험가가 쓰는걸로 보이게") —
   * 예전엔 화면 고정 좌표(56%, 44%)에 폭발이 터지고 숫자가 아무 데나 떠 누가 쓴 기술인지 읽히지 않았다.
   * 시전 순간 영웅·몬스터·동료의 실제 위치를 재서 영웅 → 몬스터로 날아가고(빛 원소·관통은 빛줄기), 몬스터에서 터지며 숫자에 스킬 이름이 붙는다.
   * 동료 강화는 영웅 → 동료 연결선. transform·opacity 만 움직인다(기기 실측: box-shadow·filter 애니메이션이 FPS 를 깎았다).
   */
  const castGeometry = () => {
    const field = fieldRef.current;
    if (!field) return null;
    const fr = field.getBoundingClientRect();
    const hero = field.querySelector(".titans-hero .titans-hero-facing")?.getBoundingClientRect() ?? field.querySelector(".titans-hero")?.getBoundingClientRect();
    const mon = field.querySelector(".titans-monster")?.getBoundingClientRect();
    if (!hero || !mon || fr.width === 0) return null;
    const allies = [...field.querySelectorAll(".titans-allies .titan-ally-art")].map((el) => {
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2 - fr.left, y: r.top + r.height * 0.45 - fr.top };
    });
    return {
      hx: hero.left + hero.width * 0.62 - fr.left, hy: hero.top + hero.height * 0.42 - fr.top,
      mx: mon.left + mon.width * 0.42 - fr.left, my: mon.top + mon.height * 0.5 - fr.top,
      clientMx: mon.left + mon.width * 0.42, clientMy: mon.top + mon.height * 0.38,
      allies,
    };
  };
  const spawnShot = (kind: SkillShot["kind"], skill: TitanSkillId, element: string, x: number, y: number, tx = x, ty = y, big = false, delayMs = 0) => {
    const id = ++shotIdRef.current;
    const dx = tx - x, dy = ty - y;
    const shot: SkillShot = { id, kind, skill, element, x, y, dx, dy, ang: (Math.atan2(dy, dx) * 180) / Math.PI, len: Math.hypot(dx, dy), big };
    const add = () => {
      setShots((prev) => [...prev.slice(lowFxRef.current ? -3 : -7), shot]);
      window.setTimeout(() => setShots((prev) => prev.filter((s) => s.id !== id)), kind === "impact" ? 620 : kind === "aura" ? 760 : 520);
    };
    if (delayMs > 0) window.setTimeout(add, delayMs); else add();
  };
  /** 시동기·마무리는 원소 투사체, 빛·관통은 빛줄기 — 명중 시각(ms) */
  const SHOT_TRAVEL_MS = 230;

  /** 무기 바꾸기 (2026-10-27) — 장착만 바꾸고, 스킬 세트는 아래 효과가 맞바꾼다(대장간에서 바꿔도 같은 길) */
  const equipWeapon = (k: WeaponKind) => {
    if (wantedWeaponKind === k) return;
    weaponTechRef.current = 0;
    // 다음 몬스터(서브 스테이지)부터 든다(2026-10-28) — 지금 몬스터와 싸우는 동안엔 무기가 바뀌지 않는다
    void updateCharacterProgress(userHash, (c) => ({ ...c, equippedWeaponKind: k })).then((next) => { setCharacter(next); flash(`${WEAPON_LABEL[k]} 장착 예약 · 다음 몬스터부터 · ${weaponStatText(k)}`, 2400); });
  };
  // 무기별 스킬 세트 — 지금 세트(loadoutKind)를 그 무기에 맡기고, 장착 무기에 맡겨 둔 세트를 꺼낸다(처음이면 지금 세트 그대로)
  useEffect(() => {
    if (!ready) return;
    const inv = saveRef.current.skillInventory;
    const from = inv.loadoutKind;
    if (from === weaponKind) return;
    setSave((prev) => {
      const cur = prev.skillInventory;
      if (cur.loadoutKind === weaponKind) return prev;
      const loadouts = cur.loadoutKind ? { ...(cur.loadouts ?? {}), [cur.loadoutKind]: { ...cur.equipped } } : { ...(cur.loadouts ?? {}) };
      const stored = loadouts[weaponKind];
      return { ...prev, skillInventory: { ...cur, loadouts, loadoutKind: weaponKind, equipped: stored && Object.keys(stored).length ? { ...stored } : { ...cur.equipped } } };
    });
  }, [ready, weaponKind]);

  const castSkill = (id: TitanSkillId) => {
    const def = SKILLS.find((s) => s.id === id);
    if (!def) return;
    if (!save.skillInventory.learned.includes(id) || save.skillInventory.equipped[def.slot] !== id || def.slot === "passive") return;
    if (cdsRef.current[id] > 0) return;
    const now = performance.now();
    setSkillVisual(id);
    window.setTimeout(() => setSkillVisual((active) => (active === id ? null : active)), 820);
    { const seq = now; setTierFx({ tier: SKILL_TIER[id], seq }); window.setTimeout(() => setTierFx((cur) => (cur?.seq === seq ? null : cur)), 1100); sfxSkillTier(SKILL_TIER[id]); }
    const visualKind: FxBurst["kind"] = def.slot === "starter" ? "strike" : def.slot === "finisher" ? "warcry" : def.element === "fire" ? "clone" : "crit";
    // 효과 숫자는 titans/skills.ts 한 곳에서 온다. 레벨 = ×(1+0.05/Lv), 힐러 축복 = 쿨 −10%/명
    const level = Math.max(1, save.skillInventory.levels[id] ?? 1);
    const mult = skillLevelMult(level);
    const effect = SKILL_EFFECTS[id];
    setCds((prev) => ({ ...prev, [id]: def.cooldownSec * partyRoleEffects(characterRef.current.partyIds).cooldownMult * saveRef.current.huntMods.cooldownMul * WEAPON_EFFECTS[weaponKindRef.current].skillCdMul }));   // × 지팡이 (2026-10-27)
    const geo = castGeometry();
    // 위치를 못 재면(전장이 아직 안 그려짐) 예전 고정 위치 폭발로 — 잴 수 있으면 영웅에서 나가는 연출만 (2026-10-06)
    if (!geo) pushFx(visualKind, 56, 44, def.element === "fire" ? 18 : def.element === "wind" ? 185 : def.element === "earth" ? 75 : def.element === "light" ? 48 : 330);
    const ALLY_BUFF: TitanSkillId[] = ["stoneGuard", "thunderLink", "warcry"];
    if (geo) {
      // 영웅 발밑 원소 오라 — 누가 시전했는지
      spawnShot("aura", id, def.element, geo.hx, geo.hy + 28);
      if (effect.kind === "hit" || effect.kind === "execute") {
        const beam = id === "pierce";   // 빛 스킬도 이제 탄 그림(proj-light) — 빛줄기는 관통 찌르기만 (2026-10-21)
        spawnShot(beam ? "beam" : "shot", id, def.element, geo.hx, geo.hy, geo.mx, geo.my, def.slot === "finisher");
        spawnShot("impact", id, def.element, geo.mx, geo.my, geo.mx, geo.my, def.slot === "finisher", SHOT_TRAVEL_MS);
      }
      if (ALLY_BUFF.includes(id)) geo.allies.forEach((a, i) => spawnShot("link", id, def.element, geo.hx, geo.hy, a.x, a.y, false, 60 + i * 50));
    }
    // 지속은 배속만큼 실시간이 줄어 쿨타임과 대칭 — ×2가 업타임을 2배로 만들던 버그 제거
    const durMs = buffDurationMs(def, level, saveRef.current.battleSpeed);
    const bossOnlyBurn = effect.kind === "buff" && !!effect.bossOnly;
    // 버프는 연장만 한다 — 짧은 버프가 긴 버프를 잘라먹지 않게 (물수제비 스텝이 붉은 달 난타를 1초 줄이던 문제)
    const applyBuff = (kind: BuffKind, value: number) => {
      // 빙결은 [깊은 얼음]·루나 결박만큼 길다. [열충격] — 불타는 적을 얼리면 탭 피해 ×6 폭발 (사냥 강화 콤보)
      const freezeMul = kind === "freeze" ? saveRef.current.huntMods.freezeMul * allyFeatureEffects(characterRef.current.partyIds).freezeMul : 1;
      const until = now + durMs * freezeMul;
      if (kind === "freeze" && saveRef.current.huntMods.thermalShock && now < buffsRef.current.burnUntil) {
        applyDamage(computeTapHit().base * 6, true, { source: "skill", label: "열충격", skill: id, delayMs: 200 });
        pushFxAt("burst", "monster", 0.45, 0.45, 70, 40, 18, 0, "fire");
      }
      setBuffSource((prev) => (prev[kind] === id ? prev : { ...prev, [kind]: id }));
      setBuffs((b) => {
        switch (kind) {
          case "crit": return { ...b, critUntil: Math.max(b.critUntil, until), critBonus: value };
          case "clone": return { ...b, cloneUntil: Math.max(b.cloneUntil, until), cloneMult: value };
          case "war": return { ...b, warcryUntil: Math.max(b.warcryUntil, until), warMult: value };
          case "haste": return { ...b, hasteUntil: Math.max(b.hasteUntil, until), hasteMult: value };
          case "freeze": return { ...b, freezeUntil: Math.max(b.freezeUntil, until) };
          case "burn": return { ...b, burnUntil: Math.max(b.burnUntil, until), burnPerSec: value, burnBossOnly: bossOnlyBurn };
        }
      });
    };
    if (effect.kind === "hit" || effect.kind === "execute") {
      playAttackAnim();
      if (!geo) {
        if (def.slot === "starter") pushFxAt("slash", "hero", 0.95, 0.5, 30, 40);
        else pushFxAt("warcry", "monster", 0.45, 0.5, 58, 42, def.element === "fire" ? 18 : 210);
      }
      const { dmg, base } = computeTapHit();
      const low = effect.kind === "execute" && hpRef.current < monsterHp(saveRef.current.stage, bossRef.current) * 0.3;
      const hitMult = effect.kind === "execute" ? (low ? effect.lowMult : effect.mult) : effect.mult;
      applyDamage(dmg * hitMult * mult, true, { source: "skill", clientX: geo?.clientMx, clientY: geo?.clientMy, label: def.name, skill: id, delayMs: geo ? SHOT_TRAVEL_MS : 0 });
      if (effect.kind === "hit" && effect.buff) {
        applyBuff(effect.buff, effect.buff === "burn" ? base * (effect.buffValue ?? 0) * mult : (effect.buffValue ?? 1) * mult);
      }
      flash(low ? `${def.name} · 처형!` : `${def.name}!`);
      return;
    }
    if (effect.kind === "buff") {
      // 강화도 모험가가 시전한다 — 예전엔 버프를 걸 때 영웅이 가만히 있어 누가 건 기술인지 읽히지 않았다 (2026-10-06)
      playAttackAnim();
      const value =
        effect.buff === "burn" ? computeTapHit().base * effect.value * mult
        : effect.buff === "haste" ? effect.value
        : effect.buff === "crit" ? Math.min(0.85, effect.value * mult)
        : effect.value * mult;
      applyBuff(effect.buff, value);
      flash(`${def.name} · ${BUFF_LABEL[effect.buff]}!`);
    }
  };

  useEffect(() => {
    castSkillRef.current = castSkill;
  });


  // 이벤트 센터가 저장을 바꾸면 루틴 보드·추천이 즉시 따라온다 · 1초 틱은 워밍업 타이머용
  useEffect(() => {
    const refresh = () => void loadEventSave(userHash).then(setEvents);
    window.addEventListener("dodgebullets:events-changed", refresh);
    const tick = window.setInterval(() => setNowTick(Date.now()), 1000);
    return () => {
      window.removeEventListener("dodgebullets:events-changed", refresh);
      window.clearInterval(tick);
    };
  }, [userHash]);

  // 온보딩(§8) 자동 진행 — 조건(Stage 5 / 첫 개척 / Stage 10)을 채우면 다음 단계로.
  // 단계 4(이벤트·상점)는 조건이 아니라 "첫 방치 정산" 행위로만 오른다 (claimIdle 참조).
  useEffect(() => {
    if (!ready || character.onboardingStep >= 4) return;
    const target = onboardingTargetStep(character);
    if (target <= character.onboardingStep) return;
    void updateCharacterProgress(userHash, (current) => {
      const next = onboardingTargetStep(current);
      return next > current.onboardingStep ? { ...current, onboardingStep: next } : current;
    }).then((next) => {
      setCharacter(next);
      sfxSlotUnlock();
      setUnlockBanner(next.onboardingStep);
      window.setTimeout(() => setUnlockBanner(null), 3200);
    });
  }, [ready, character, userHash]);

  const learnSkill = async (id: TitanSkillId) => {
    const def = SKILLS.find((skill) => skill.id === id);
    if (!def || save.skillInventory.learned.includes(id)) return;
    const learnedInType = SKILLS.filter((skill) => skill.slot === def.slot && save.skillInventory.learned.includes(skill.id)).length;
    if (learnedInType >= skillTypeCapacity) { flash(`${def.slot} 보유 한도 ${skillTypeCapacity}개 · 캐릭터 레벨을 올리세요`); return; }
    if (save.skillInventory.skillCores < def.learnCoreCost || skillPoints < def.learnSpCost) { flash("스킬 포인트 또는 코어가 부족합니다"); return; }
    let paid = false;
    const progress = await updateCharacterProgress(userHash, (current) => {
      if (current.skillPoints < def.learnSpCost) return current;
      paid = true;
      return { ...current, skillPoints: current.skillPoints - def.learnSpCost, lastContent: "titans" };
    });
    if (!paid) return;
    setSkillPoints(progress.skillPoints);
    setSave((prev) => ({ ...prev, skillInventory: { ...prev.skillInventory, learned: [...prev.skillInventory.learned, id], levels: { ...prev.skillInventory.levels, [id]: 1 }, equipped: { ...prev.skillInventory.equipped, [def.slot]: id }, skillCores: prev.skillInventory.skillCores - def.learnCoreCost } }));
    flash(`${def.name} 학습 완료`);
    previewSkillEquip(id);   // 배우면 바로 그 칸에 끼워진다 — 장착 연출도 같이
  };

  /** 장착 미리보기 — 시전 연출만(컷인 · 등급 빛 · 원소 오라 · 소리). 피해 · 쿨타임 · 버프는 없다 */
  const previewSkillEquip = (id: TitanSkillId) => {
    const def = SKILLS.find((s) => s.id === id);
    if (!def) return;
    const seq = performance.now();
    setEquipFx({ id, seq });
    window.setTimeout(() => setEquipFx((cur) => (cur?.seq === seq ? null : cur)), 1200);
    setSkillVisual(id);
    window.setTimeout(() => setSkillVisual((active) => (active === id ? null : active)), 820);
    setTierFx({ tier: SKILL_TIER[id], seq });
    window.setTimeout(() => setTierFx((cur) => (cur?.seq === seq ? null : cur)), 1100);
    sfxSkillTier(SKILL_TIER[id]);
    const geo = castGeometry();
    if (geo) spawnShot("aura", id, def.element, geo.hx, geo.hy + 28);
    else pushFx(def.slot === "starter" ? "strike" : def.slot === "finisher" ? "warcry" : def.element === "fire" ? "clone" : "crit", 56, 44, def.element === "fire" ? 18 : def.element === "wind" ? 185 : def.element === "earth" ? 75 : def.element === "light" ? 48 : 330);
  };

  const toggleSkill = (id: TitanSkillId) => {
    const def = SKILLS.find((skill) => skill.id === id);
    if (!def || !save.skillInventory.learned.includes(id)) return;
    // 슬롯은 연습실에서 해금한다 — 비트 숙련이 0레벨이면 장착할 수 없다.
    const equippedNow = save.skillInventory.equipped[def.slot] === id;
    if (!equippedNow && !qaOpen && slotLevels(character)[def.slot] <= 0) {
      const beatSkill = BEAT_SKILL_BY_SLOT[def.slot];
      flash(`연습실에서 ${SKILL_LABEL[beatSkill]} 숙련 5를 먼저 올리세요`);
      return;
    }
    if (!equippedNow) previewSkillEquip(id);
    setSave((prev) => ({ ...prev, skillInventory: { ...prev.skillInventory, equipped: { ...prev.skillInventory.equipped, [def.slot]: prev.skillInventory.equipped[def.slot] === id ? undefined : id } } }));
  };

  const upgradeSkill = (id: TitanSkillId) => {
    const def = SKILLS.find((skill) => skill.id === id);
    const level = save.skillInventory.levels[id];
    const cost = Math.floor(240 * Math.pow(1.75, Math.max(0, level - 1)));
    if (!def || !save.skillInventory.learned.includes(id) || level >= def.maxLevel || save.gold < cost) return;
    setSave((prev) => ({
      ...prev,
      gold: prev.gold - cost,
      skillInventory: { ...prev.skillInventory, levels: { ...prev.skillInventory.levels, [id]: level + 1 } },
    }));
    flash(`${def.name} Lv.${level + 1}`);
  };

  /** L 보상형 광고 — 자리 상태를 확인하고, 광고(또는 광고 제거 보유)면 보상을 적용한 뒤 카운터를 올린다 */
  const [adBusy, setAdBusy] = useState(false);
  const watchAd = async (placement: AdPlacement, apply: () => void) => {
    if (adBusy) return;
    const today = new Date().toLocaleDateString("sv-SE");
    const availability = rewardedAvailability(characterRef.current, placement, today);
    if (availability === "none") return;
    setAdBusy(true);
    trackEvent("ad_start", { placement });
    try {
      const ok = availability === "free" ? true : await showRewarded(placement);
      if (!ok) { flash("광고를 끝까지 보지 않아 보상이 적용되지 않았습니다"); return; }
      trackEvent("ad_complete", { placement });
      const next = await updateCharacterProgress(userHash, (current) => consumeAdReward(current, placement, today));
      setCharacter(next);
      apply();
    } finally {
      setAdBusy(false);
    }
  };
  const buyAdBooster = () => watchAd("booster4h", () => {
    void updateCharacterProgress(userHash, (current) => ({ ...current, idleBoostUntil: Math.max(Date.now(), current.idleBoostUntil) + BOOSTER_AD_HOURS * 3600 * 1000 })).then((next) => { setCharacter(next); flash(`방치 가속 ${BOOSTER_AD_HOURS}시간 — 산출 2배`); });
  });
  const retryBossWithAd = () => watchAd("bossRetry", () => { bossRetryBonusRef.current = BOSS_RETRY_BONUS_SEC; flash(`다음 보스 도전 제한시간 +${BOSS_RETRY_BONUS_SEC}초`); });

  /** 실결제(₩) — 어댑터가 검증한 구매만 지급. 미연동 환경에서는 안내 토스트만 */
  const buyPaidProduct = async (productId: string) => {
    if (claimingProduct) return;
    // 결제 흐름은 하나 — QA 빌드 테스트 모드면 무료 테스트 지급, 아니면 스토어 (payments/store.purchaseProduct)
    setClaimingProduct(productId);
    try {
      const result = await purchaseProduct(userHash, productId);
      if (result.status === "pending") { flash("결제 확인 중입니다 — 확인되면 자동으로 지급됩니다"); return; }
      if (result.status === "unavailable") { flash(paidStoreNote()); return; }
      if (result.status === "cancelled" || !result.progress) return;
      if (result.status === "duplicate") { flash("이미 지급된 구매입니다"); return; }
      const { progress, bonus } = result;
      setCharacter(progress);
      setRedGems(progress.redGems);
      sfxSlotUnlock();
      flash(`${STORE_PRODUCTS.find((p) => p.id === productId)?.name ?? productId} 구매 완료${bonus ? ` · 보너스 보석 +${bonus}` : ""}`);
    } finally {
      setClaimingProduct(null);
    }
  };

  const claimFreeProduct = async (productId: string) => {
    const claimKey = `free-store-v1:${productId}`;
    if (claimingProduct || characterRef.current.claimedRewards.includes(claimKey)) return;
    setClaimingProduct(productId);
    const grants: Record<string, { gems: number; gold: number; materials: number; cores: number; shoulder?: ShoulderId }> = {
      "gems-80": { gems: 80, gold: 0, materials: 0, cores: 0 },
      "gems-450": { gems: 450, gold: 0, materials: 0, cores: 0 },
      "gems-1200": { gems: 1200, gold: 0, materials: 0, cores: 0 },
      "adventurer-starter": { gems: 80, gold: 5000, materials: 10, cores: 0, shoulder: "scout" },
      // 송사리 모델 (2026-10-08) — QA 무료 경로. 실결제 지급·한도 기록은 payments/store.ts applyPurchase 가 담당
      "daily-deal": { gems: 40, gold: 3000, materials: 15, cores: 0 },
      "weekend-pack": { gems: 300, gold: 0, materials: 60, cores: 0 },
      // 순간 제안 패키지 (QA 무료 경로)
      "pack-wall": { gems: 100, gold: 0, materials: 0, cores: 0 },
      "pack-rebirth": { gems: 400, gold: 0, materials: 0, cores: 10 },
    };
    const grant = grants[productId];
    if (!grant) {
      setClaimingProduct(null);
      return;
    }
    try {
      const updated = await updateCharacterProgress(userHash, (current) => {
        if (current.claimedRewards.includes(claimKey)) return current;
        return {
          ...current,
          redGems: current.redGems + grant.gems,
          sharedCoins: current.sharedCoins + grant.gold,
          enhancementMaterials: current.enhancementMaterials + grant.materials,
          ownedShoulders: grant.shoulder
            ? [...new Set([...current.ownedShoulders, grant.shoulder])]
            : current.ownedShoulders,
          claimedRewards: [...current.claimedRewards, claimKey],
          lastContent: "titans",
        };
      });
      setCharacter(updated);
      characterRef.current = updated;
      setRedGems(updated.redGems);
      if (grant.gold > 0 || grant.cores > 0) {
        setSave((current) => ({
          ...current,
          gold: current.gold + grant.gold,
          skillInventory: {
            ...current.skillInventory,
            skillCores: current.skillInventory.skillCores + grant.cores,
          },
        }));
      }
      flash(`${STORE_PRODUCTS.find((product) => product.id === productId)?.name ?? "체험 상품"} 무료 수령 완료`);
    } finally {
      setClaimingProduct(null);
    }
  };

  // 전환 건너뛰기 (2026-10-26 사용자: "스킵하면 다음 스테이지로 안 넘어간다") — 예전엔 일반 몬스터 사이 전환에서도 spawn(스테이지, 1)을 불러
  // 처치 수가 매번 1로 되돌아갔다(10마리를 못 채워 대장 · 다음 스테이지가 영영 안 왔다). 이제 전환이 하려던 spawn 을 그대로 한다 — 이미 나왔으면 다시 부르지 않는다
  const skipStageTransition = () => {
    if (pendingStageRef.current === null && pendingSpawnRef.current === null) return;
    // 대열 준비 타이머는 남긴다 — 새 몬스터가 이미 나온 뒤(입장 연출 중)에 누르면 그 타이머까지 지워 교전이 영영 시작되지 않았다.
    // 폰 터치는 클릭보다 늦게 닿아 이 구간에 자주 걸렸다 (2026-10-26 모바일 실터치 검사: 스킵 한 번 뒤 사냥이 멈춤)
    const keep = formationTimerRef.current;
    battleTimers.current.forEach((id) => { if (id !== keep) window.clearTimeout(id); });
    battleTimers.current = keep !== null ? [keep] : [];
    pendingStageRef.current = null;
    const next = pendingSpawnRef.current;
    pendingSpawnRef.current = null;
    if (next) spawn(next[0], next[1], false);
    battlePhaseRef.current = "combat";
    setBattlePhase("combat");
  };

  const kind: TitanMonsterKind = monsterKind(save.stage, boss, chesterson);
  const area = huntingArea(save.stage);
  // 배경 음악 분위기 (2026-10-28, 사용자: "스테이지별 콘텐츠별 알맞은 음악") — 대장전 = 오케스트라 전투 · 상점 · 뽑기 = 글로켄슈필 · 폐허(11층)부터 = 축제 피리 · 그 앞 = 숲(ui/bgm)
  const huntMood: HuntMood = boss ? "boss" : tab === "premium" || tab === "event-shop" || tab === "event-shop2" || tab === "gacha" ? "shop" : save.stage >= 11 ? "late" : "field";
  useEffect(() => { setHuntBgm(huntMood); }, [huntMood]);
  useEffect(() => () => setHuntBgm("field"), []);
  const monsterRanged = kind === "dragon" || (boss && (area.id === "volcano" || area.id === "abyss"));
  const label = monsterLabel(kind, chesterson, save.stage);
  // 편성(§2) — 출전 동료만 DPS·필드 렌더에 반영한다
  const partySlots = partySlotCount(character.towerBestFloor, character.partyCap);
  const synergy = useMemo(() => partySynergies(fieldedParty(character.partyIds, stageCeilingFor(character.pioneeredArea), character.claimedRewards)), [character.partyIds, character.pioneeredArea, character.claimedRewards]);
  const now = performance.now();
  const fieldCeiling = stageCeilingFor(character.pioneeredArea);
  /** I 외형: 장착한 무기 이펙트·전장 테마 정의 (없으면 undefined) */
  const equippedFxDef = character.equippedWeaponFx ? WEAPON_FX[character.equippedWeaponFx] : undefined;
  const equippedThemeDef = character.equippedTheme ? THEMES[character.equippedTheme] : undefined;
  const buyCosmetic = async (kind: "fx" | "theme", id: string) => {
    const cost = kind === "fx" ? WEAPON_FX[id]?.gemCost : THEMES[id]?.gemCost;
    if (cost == null || redGems < cost) return;
    const next = await updateCharacterProgress(userHash, (current) => {
      const owned = kind === "fx" ? current.ownedWeaponFx : current.ownedThemes;
      if (owned.includes(id) || current.redGems < cost) return current;
      return kind === "fx"
        ? { ...current, redGems: current.redGems - cost, ownedWeaponFx: [...current.ownedWeaponFx, id], equippedWeaponFx: id }
        : { ...current, redGems: current.redGems - cost, ownedThemes: [...current.ownedThemes, id], equippedTheme: id };
    });
    setCharacter(next);
    setRedGems(next.redGems);
    flash(`${kind === "fx" ? WEAPON_FX[id].name : THEMES[id].name} 구매 · 장착`);
  };
  const toggleCosmetic = async (kind: "fx" | "theme", id: string) => {
    const next = await updateCharacterProgress(userHash, (current) =>
      kind === "fx"
        ? { ...current, equippedWeaponFx: current.equippedWeaponFx === id ? "" : (current.ownedWeaponFx.includes(id) ? id : current.equippedWeaponFx) }
        : { ...current, equippedTheme: current.equippedTheme === id ? "" : (current.ownedThemes.includes(id) ? id : current.equippedTheme) },
    );
    setCharacter(next);
  };
  const allies = useMemo(
    () => HEROES.filter((h) => save.heroes[h.id] > 0 && character.partyIds.includes(h.id) && canFieldAlly(h.id, h.unlockStage, fieldCeiling, character.claimedRewards)),
    [save.heroes, character.partyIds, fieldCeiling, character.claimedRewards],
  );
  // 대형 칸 (2026-10-14) — 근딜·탱커가 몬스터 앞 두 칸(R), 나머지는 주인공 뒤 칸(L). 역할표(ALLY_ROLE)로 정한다
  const allyLines = useMemo(() => allies.map((h) => (ALLY_ROLE[h.id] === "ranged" || ALLY_ROLE[h.id] === "healer" ? "back" as const : "front" as const)), [allies]);
  const allyCells = useMemo(() => formationCells(allyLines), [allyLines]);
  // 주인공 장착 파츠 (2026-10-15, 사용자: "장비 성장 아이템들이 캐릭터에 장착되게") — 숙련 Lv1 이면 나무로 보이고, 대장간 강화 +5 철 · +10 금
  const heroGear = useMemo(() => {
    const m = gearMasteryOf(save.equipmentTraining), e = character.gearEnhance ?? { helmet: 0, armor: 0, gloves: 0, boots: 0 };
    const pt = (p: GearPart) => (m[p] >= 1 ? Math.max(1, gearTierOfEnhance(e[p])) : 0);
    return {
      shield: shieldTierOf(character.dodgeBestStage),
      helmet: pt("helmet"), armor: pt("armor"),
      gloves: Math.max(glovesTierOf(save.equipmentTraining.weaponMastery), pt("gloves")),
      boots: Math.max(bootsTierOf(character.towerBestFloor), pt("boots")),
    };
  }, [save.equipmentTraining, character.gearEnhance, character.dodgeBestStage, character.towerBestFloor]);
  // 뽑기 레벨(누적 뽑기 수)이 등급 확률을 정한다 (2026-10-27 · titans/summonLevel.ts)
  const summonLv = summonLevel(character.gachaPulls);
  const gacha = useMemo(() => gachaPool(save.stage, character.pioneeredArea, Date.now(), summonLv), [save.stage, character.pioneeredArea, summonLv]);
  // retention-5: 뽑기 페이지에서 픽업 회전 D-2 이하면 보석 1,200 제안(천장 절반) — 창은 회전 종료까지
  useEffect(() => {
    if (tab !== "gacha" || gacha.rotationPool <= 2) return;
    // retention-6: 픽업 교체 24시간 전 알림 — 뽑기 페이지를 본 유저에게만
    const rotationEndMs = Date.now() + gacha.rotationDaysLeft * 86400000;
    void scheduleLocalNotification(NOTIFY_ID.pickupRotation, "픽업 동료 교체 D-1", "내일 픽업이 바뀝니다. 지금 픽업 동료의 스킨은 20% 할인 중이에요.", new Date(rotationEndMs - 86400000));
  }, [tab, gacha.rotationPool, gacha.rotationDaysLeft]);
  useEffect(() => {
    if (tab !== "gacha" || gacha.rotationPool <= 2 || gacha.rotationDaysLeft > 2) return;
    if (!paidOffersUnlocked(characterRef.current)) return;
    const rotationEnd = Date.now() + gacha.rotationDaysLeft * 86400000;
    void updateCharacterProgress(userHash, (current) => openMomentOffer(current, "pickup", Date.now(), rotationEnd)).then((next) => setCharacter(next));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, gacha.rotationPool, gacha.rotationDaysLeft, userHash]);

  const expeditionsDone = character.expeditions.filter((e) => e.endsAt <= Date.now()).length;

  // 다음 목표 3종 (점검표 #3): 동료 합류 · 스킬 학습 · 지역 개척 — 남은 거리를 항상 보여준다
  const nextGoals = useMemo(() => {
    // 2026-10-28 스테이지 해금 없음 — 아직 없는 동료 중 골드로 가장 싸게 부를 수 있는 동료(뽑기로도 만난다)
    const nextAlly = HEROES.filter((h) => h.unlockStage < 9999 && save.heroes[h.id] <= 0 && SHOP_ALLY_GEM_COST[h.id] === undefined)
      .sort((a, b) => a.baseCost - b.baseCost)[0];
    const nextSkill = SKILLS.find((sk) => !save.skillInventory.learned.includes(sk.id));
    const ceiling = stageCeilingFor(character.pioneeredArea);
    const areaName = nextAreaName(character.pioneeredArea);
    const goals: { id: string; label: string; value: string; ratio: number; done: boolean; onClick: () => void }[] = [];
    if (nextAlly) {
      const reachable = save.gold >= nextAlly.baseCost;
      goals.push({
        id: "ally",
        label: "다음 동료",
        value: reachable ? `${nextAlly.name} 소환 가능` : `${nextAlly.name} · ${formatGold(nextAlly.baseCost)}G`,
        ratio: reachable ? 1 : save.gold / Math.max(1, nextAlly.baseCost),
        done: reachable,
        onClick: () => setTab("heroes"),
      });
    }
    if (nextSkill) {
      const ok = skillPoints >= nextSkill.learnSpCost && save.skillInventory.skillCores >= nextSkill.learnCoreCost;
      goals.push({
        id: "skill",
        label: "다음 스킬",
        value: ok ? `${nextSkill.name} 학습 가능` : `${nextSkill.name} · SP ${skillPoints}/${nextSkill.learnSpCost}`,
        ratio: ok ? 1 : Math.min(skillPoints / nextSkill.learnSpCost, save.skillInventory.skillCores / Math.max(1, nextSkill.learnCoreCost)),
        done: ok,
        onClick: () => setTab("skills"),
      });
    }
    if (areaName) {
      goals.push({
        id: "area",
        label: "다음 지역",
        value: save.stage >= ceiling ? `${areaName} · 성문 방어 필요` : `${areaName} · STAGE ${ceiling}까지 ${ceiling - save.stage}`,
        ratio: Math.min(1, save.stage / ceiling),
        done: save.stage >= ceiling,
        onClick: () => (contentUnlocked(character.onboardingStep, "dodge") ? onOpenContent("dodge") : flash(LOCK_HINT.dodge)),
      });
    }
    return goals;
  }, [save.heroes, save.stage, save.skillInventory, character.pioneeredArea, character.onboardingStep, skillPoints, onOpenContent, qaOpen]);

  // ── 리텐션: 루틴 보드 · 추천 1개 · 워밍업 · 종료 예고 ──
  const routine = useMemo(() => routineItems(character, events, nowTick), [character, events, nowTick]);
  useEffect(() => {
    if (tab !== "hub") return;
    let alive = true;
    void loadBeatRpg(userHash).then((r) => { if (alive) setBeatBestScore(bestScoreOverall(r)); });
    return () => { alive = false; };
  }, [tab, userHash]);
  const hubCardList = useMemo(() => hubCards(character, events, { beatBest: beatBestScore, now: nowTick }), [character, events, beatBestScore, nowTick, qaOpen]);
  const routineReward = routineRewardAvailable(character, routine);
  const recommendation = useMemo(
    () => recommendNext(character, save, events, { wall: wallInfo, equipped: save.skillInventory.equipped, now: nowTick }),
    [character, save, events, wallInfo, nowTick],
  );
  // 구매 추천 (2026-10-06) — 재화가 모이면 지금 살 수 있는 것을 효과 순으로. 알림 줄에 저절로 뜬다
  const advice = useMemo(() => purchaseAdvice({ ...character, redGems }, save, nowTick), [character, redGems, save, nowTick]);
  const adviceTop = useMemo(() => topAffordable(advice, 3), [advice]);
  const adviceGoal = useMemo(() => (adviceTop.length ? null : closestGoal(advice)), [advice, adviceTop]);
  const [adviceOpen, setAdviceOpen] = useState(false);
  const runAdvice = (a: AdviceAction) => {
    setAdviceOpen(false);
    if (a.kind === "content") onOpenContent(a.content);
    else setTab(a.tab);
  };
  const adviceCost = (a: PurchaseAdvice) => a.cost.filter((c) => c.amount > 0).map((c) => `${CURRENCY_LABEL[c.currency]} ${formatWallet(c.amount)}`).join(" · ");
  // 도감 발견 — 사냥터에 처음 나온 몬스터 그림을 기록한다 (2026-10-06, 미발견은 도감에서 실루엣)
  const fieldArtKey = monsterArtKey(monsterAssetFor(kind, area, boss, chesterson, "idle", save.stage));
  useEffect(() => {
    if (!fieldArtKey || character.seenMonsters.includes(fieldArtKey) || fieldArtKey === "golden-lion-clean") return;
    void updateCharacterProgress(userHash, (current) => (current.seenMonsters.includes(fieldArtKey) ? current : { ...current, seenMonsters: [...current.seenMonsters, fieldArtKey] })).then(setCharacter).catch(() => {});
  }, [fieldArtKey, character.seenMonsters, userHash]);
  const warmupLeft = Math.max(0, character.warmupUntil - nowTick);
  const idlePreview = useMemo(
    () => (character.sessionCount <= 3 ? computeIdleYield(character, save.stage, save.skillInventory.equipped, 8 * 3600) : null),
    [character, save.stage, save.skillInventory.equipped],
  );
  const runAction = (action: RecommendAction) => {
    if (action.kind === "content") onOpenContent(action.content);
    else if (action.kind === "tab") setTab(action.tab);
    else if (action.kind === "events") {
      if (onOpenEvents) onOpenEvents(action.tab);
      else flash("설정 → 모험가 이벤트에서 열 수 있습니다");
    }
  };
  const runRoutine = (item: RoutineItem) => {
    if (item.go.kind === "claim") {
      flash(item.done ? "오늘 정산을 이미 받았습니다" : "방치 보상은 접속 시 자동 정산 · 균열로 즉시 정산할 수 있어요");
      if (!item.done && onOpenEvents) onOpenEvents("rift");
      return;
    }
    if (item.go.kind === "content") runAction({ kind: "content", content: item.go.content });
    else if (item.go.kind === "events") runAction({ kind: "events", tab: item.go.tab });
    else runAction({ kind: "tab", tab: item.go.tab });
  };
  const claimRoutine = async () => {
    if (!routineReward) return;
    const today = new Date().toLocaleDateString("sv-SE");
    const next = await updateCharacterProgress(userHash, (current) =>
      current.routineClaimedDate === today ? current : addSeasonXp({ ...current, routineClaimedDate: today, redGems: current.redGems + ROUTINE_REWARD_GEMS }, SEASON.xp.routine),
    );
    setCharacter(next);
    setRedGems(next.redGems);
    flash(`오늘 루틴 완료 — 보석 +${ROUTINE_REWARD_GEMS}`);
  };

  const paidProductsUnlocked = paidOffersUnlocked(character);

  // 스킬 예상 DPS 보정 (점검표 #5) — 장착 액티브의 평균 업타임 가중치 합. 정확한 시뮬이
  // 아니라 "이 조합이 얼마나 강한가"의 상대 지표다.
  const skillDpsPreview = useMemo(
    () =>
      SKILLS.reduce((sum, sk) => {
        if (save.skillInventory.equipped[sk.slot] !== sk.id || !save.skillInventory.learned.includes(sk.id)) return sum;
        return sum + skillPreviewPct(sk.id, save.skillInventory.levels[sk.id]);
      }, 0),
    [save.skillInventory],
  ).toFixed(0);

  /** 프리셋 — 슬롯마다 후보 순서 중 학습한 첫 스킬. 잠긴 슬롯(비트 숙련 0)은 건드리지 않고, 후보가 없으면 기존 장착을 유지 */
  const applyPreset = (preset: SkillPreset) => {
    const locks = slotLevels(character);
    setSave((prev) => {
      const equipped: Partial<Record<TitanSkillSlot, TitanSkillId>> = { ...prev.skillInventory.equipped };
      for (const slot of SLOT_ORDER) {
        if (locks[slot] <= 0 && !qaOpen) continue;
        const pick = preset.picks[slot].find((id) => prev.skillInventory.learned.includes(id));
        if (pick) equipped[slot] = pick;
      }
      return { ...prev, skillInventory: { ...prev.skillInventory, equipped } };
    });
    flash(`${preset.name} 프리셋 적용 — 학습한 스킬만 장착됐습니다`);
  };

  /** 추천 편성 (점검표 #4) — DPS 상위를 뽑되 원거리 2명을 보장해 엄호 사격 시너지를 켠다 */
  const recommendParty = async () => {
    const ceiling = stageCeilingFor(character.pioneeredArea);
    const owned = HEROES.filter((h) => save.heroes[h.id] > 0 && canFieldAlly(h.id, h.unlockStage, ceiling, character.claimedRewards) && !character.expeditions.some((e) => e.allyId === h.id));
    const slots = partySlotCount(character.towerBestFloor, character.partyCap);
    const dpsOf = (h: (typeof HEROES)[number]) =>
      heroDps(h, save.heroes[h.id]) * starMultiplier(effectiveStars(character.allyStars[h.id], save.heroes[h.id]));
    const sorted = [...owned].sort((a, b) => dpsOf(b) - dpsOf(a));
    const pick = sorted.slice(0, slots).map((h) => h.id);
    const rangedIn = pick.filter((id) => ALLY_ROLE[id] === "ranged").length;
    const rangedOut = sorted.filter((h) => ALLY_ROLE[h.id] === "ranged" && !pick.includes(h.id));
    for (let i = rangedIn; i < 2 && rangedOut.length > 0 && pick.length >= 2; i += 1) {
      const swapIdx = [...pick].reverse().findIndex((id) => ALLY_ROLE[id] !== "ranged");
      if (swapIdx < 0) break;
      pick.splice(pick.length - 1 - swapIdx, 1, rangedOut.shift()!.id);
    }
    const next = await updateCharacterProgress(userHash, (current) => ({ ...current, partyIds: pick }));
    setCharacter(next);
    flash(`추천 편성 적용 — ${pick.length}명 출전`);
  };

  // 첫 60초 코치 (점검표 #1) — 신규(step 0)에게 공격→소환→훈련 순으로 한 번에 하나만 보여준다
  const coach = useMemo(() => {
    if (character.onboardingStep > 0) return null;
    if (save.totalTaps < 3) return { id: "tap", text: "몬스터를 탭해서 공격해 보세요", target: "field" as const };
    if (save.heroes.mia <= 0) return { id: "summon", text: "동료 탭에서 스카우트 미아를 소환하세요", target: "heroes" as const };
    if (save.equipmentTraining.weaponMastery < 2) return { id: "train", text: "장비 성장에서 무기를 훈련하면 탭 공격력이 오릅니다", target: "sword" as const };
    return null;
  }, [character.onboardingStep, save.totalTaps, save.heroes.mia, save.equipmentTraining.weaponMastery]);

  const pad = {
    paddingTop: Math.max(12, insets.top),
    paddingRight: Math.max(12, insets.right),
    paddingBottom: Math.max(12, insets.bottom),
    paddingLeft: Math.max(12, insets.left),
  };

  if (!ready) {
    return (
      <div className="titans-layer titans-loading">
        <p>댐 사냥터 준비 중…</p>
      </div>
    );
  }

  /** 순간 제안 카드 (retention-2~5) — 전장 위와 뽑기 페이지 상단에 같은 카드 */
  const momentOfferCard = (() => {
          const offer = activeMomentOffers(character, nowTick).find((o) => !dismissedOffers.includes(o.productId));
          if (!offer) return null;
          const def = MOMENT_OFFERS[offer.kind as MomentOfferKind];
          const product = STORE_PRODUCTS.find((p) => p.id === offer.productId && paidStoreVisible() && productOnSale(p.id));
          if (!def || !product) return null;
          const doubleReady = firstDoubleAvailable(character, product.id);
          return (
            <div className={`moment-offer kind-${offer.kind}`} role="dialog" data-product={product.id} onPointerDown={(e) => e.stopPropagation()}>
              <div className="moment-head">{def.title} <small>{priceLabel(product)}</small>{doubleReady && <small>첫 구매 2배</small>}</div>
              <span className="moment-timer">{momentTimeLeft(offer.until, nowTick)}</span>
              <div className="moment-sub">{def.subtitle} · 지금 사면 보석 +{offer.bonusGems}</div>
              <div className="moment-actions">
                <button type="button" className="moment-buy" disabled={claimingProduct !== null} onClick={() => void buyPaidProduct(product.id)}>{product.name}<em>{priceLabel(product)}</em></button>
                <button type="button" className="moment-later" onClick={() => setDismissedOffers((d) => [...d, product.id])}>나중에</button>
              </div>
            </div>
          );
  })();

  return (
    <div className={`titans-layer ${lowFxRef.current || lowFxOn() ? "perf-low" : ""} ${recommendation ? "has-recommend" : ""} ${MANAGEMENT_PAGE_COPY[tab] ? "is-management-page" : ""} page-${tab} ${navPopup ? "has-popup" : ""} ${growthOpen ? "growth-open" : ""}`} style={pad}>
      <header className="titans-header">
        <button type="button" className="titans-back" onClick={() => onOpenContent("profile")}>
          <span className="mypage-icon" aria-hidden="true" style={{ backgroundImage:`url(${heroPortrait()})`, backgroundSize:"cover", backgroundPosition:"center" }} />
          <span className="mypage-label">마이페이지{character.activeTitle && TITLES[character.activeTitle] ? <small style={{ color:TITLES[character.activeTitle].color }}>「{TITLES[character.activeTitle].name}」</small> : <small>칭호 미설정</small>}</span>
        </button>
        <div className="titans-wallet">
          <span><CurrencyIcon kind="gold" /><strong>{formatGold(goldShown)}</strong></span>
          {/* 강화석(파란 수정) — 상점 강화석 상자·대장간이 쓰는데 머리에 없어 '하늘색 보석'이 안 보인다고 읽혔다 (2026-10-06) */}
          <span className="titans-stone" title="강화석"><img src={assetUrl("ui/attendance/enhance-stone.png")} alt="강화석" /><strong data-wallet="stone">{formatGold(character.enhancementMaterials)}</strong></span>
          {/* 붉은 보석 — 테스트 빌드에서도 숫자로(예전 ∞ 라 보유량이 안 보였다), 누르면 상점 (2026-10-06) */}
          <span className="titans-gem" role="button" tabIndex={0} title={qaGemsEnabled() ? "테스트 단계 · 보석 자동 충전" : "붉은 보석 · 누르면 상점"} onClick={() => setTab("premium")} onKeyDown={(e) => { if (e.key === "Enter") setTab("premium"); }}><CurrencyIcon kind="gem" /><strong data-wallet="gem">{formatGold(gemsShown)}</strong></span>
        </div>
      </header>

      <section
        ref={fieldRef}
        className={`titans-field phase-${battlePhase} ${partyKo ? "party-ko" : ""} hero-${weaponKind === "sword" || weaponKind === "spear" ? "melee" : "ranged"} ${partyApproach ? "party-entering" : ""} ${encounterMotion.wide ? "lanes-wide" : ""} ${boss ? "boss" : ""} ${chesterson ? "chest" : ""} ${impact ? `impact-${impact}` : ""} ${bossBreak ? `boss-break-${bossBreak}` : ""} ${bossBreak === 1 || bossBreak === 2 ? "boss-breaking" : ""}`}
        data-weapon-fx={equippedFxDef ? character.equippedWeaponFx : undefined}
        data-theme={equippedThemeDef ? character.equippedTheme : undefined}
        data-area={area.id}
        style={{
          ...(equippedThemeDef ? { "--fx-theme": "1" } : {}),
          ...(equippedFxDef ? { "--fx-trail": equippedFxDef.trail, "--fx-rot": `${equippedFxDef.hue - 200}deg` } : {}),
          "--area-sky": equippedThemeDef?.sky ?? area.sky,
          "--area-ground": area.ground,
          "--area-accent": area.accent,
          "--area-background": `url(${area.background})`,
          "--hero-meet-left": `${encounterMotion.heroLeft}%`,
          "--party-meet-right": `${encounterMotion.partyMeetRight}%`,
          "--party-ml": String(encounterMotion.partyMl),
          // 일반 몬스터: 보이는 몸 왼쪽 가장자리가 스테이지 첫 몬스터와 같은 자리에 오도록 — 근접 동료가 몬스터마다 옮겨 서지 않는다.
          // 대장은 몸(--boss-size)이 달라 예전처럼 제 자리에 서고 근접 동료가 한 번 옮겨 선다
          "--monster-meet-right": boss ? `${encounterMotion.monsterRight}%` : `calc(${encounterMotion.partyMeetRight}% + var(--monster-size, 112px) * (${monsterVisibleMargin(monsterAssetFor(kind, area, boss, chesterson, "idle", save.stage))[0]} - ${encounterMotion.partyMl}))`,
          // 근접 슬롯이 몬스터 박스가 아니라 '보이는' 몸 가장자리에 붙도록 — (옛 새끼 용처럼) 좌우 여백이 큰 원화에서 동료가 허공에 서던 문제
          "--monster-ml": String(monsterVisibleMargin(monsterAssetFor(kind, area, boss, chesterson, "idle", save.stage))[0]),
          "--monster-mr": String(monsterVisibleMargin(monsterAssetFor(kind, area, boss, chesterson, "idle", save.stage))[1]),
          "--encounter-duration": `${encounterMotion.durationMs}ms`,
          "--lane-l": `${encounterMotion.laneL}%`,
          "--lane-ln": String(encounterMotion.laneL),   // 원근(대열 세로 간격 · 몸 크기)용 숫자 — anim-plus.css
          "--lane-r": `${encounterMotion.laneR}%`,
          "--fk": encounterMotion.wide ? "1" : "0.65",   // 낮은 전장 대열 세로 간격(anim-plus.css) — 0.8 은 개인 간격 최대 · 오른쪽 5% 에서 뒷줄 발이 풀밭 선 2px 아래뿐(360×640)
          "--lane-rn": String(encounterMotion.laneR),
        } as CSSProperties}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          if (battlePhase === "combat") doTap(e.clientX, e.clientY);
        }}
      >
        <div className="titans-background" aria-hidden="true" />
        {tierFx && !lowFxRef.current && <i key={tierFx.seq} className={`skill-tier-fx tier-${tierFx.tier}`} data-tier={tierFx.tier} aria-hidden="true"><b /></i>}
        {/* 땅 띠 (2026-10-12, 사용자: "땅을 걷는 듯한 맵"): 배경은 위 지평선 띠, 아래는 평평한 흙 — 캐릭터가 이 위에 선다 */}
        <div className="titans-ground" aria-hidden="true" />
        {/* 2026-10-07 사용자: "스테이지 줄·자동 사냥 문구를 작게 해 맵 HP바 아래로, 맵은 더 크게" — 위에 있던 스테이지 줄·방치 카드를 전장 안 한 줄로 */}
        <div className="titans-stagebar in-field">
          <div>
            <p className="titans-kicker">BEAVER DAM · IDLE DEFENSE</p>
            <h1>
              STAGE {save.stage}
              {boss ? " BOSS" : bossReady ? " · 10/10 · 반복 사냥" : ` · ${wave}/${MOBS_PER_STAGE}`}
            </h1>
            <small className="titans-area-name">{area.name} · STAGE {area.stageFrom}–{area.stageTo >= 9999 ? "∞" : area.stageTo}</small>
            {warmupLeft > 0 && (
              <span className="warmup-chip">워밍업 ×2 · {Math.floor(warmupLeft / 60000)}:{String(Math.floor((warmupLeft % 60000) / 1000)).padStart(2, "0")}</span>
            )}
            {idlePreview && !idleReport && (
              <span className="idle-preview-chip" title="지금 닫아도 원정대가 8시간 동안 사냥합니다">
                지금 닫아도 8시간 후 +{formatGold(idlePreview.gold)}G
              </span>
            )}
          </div>
          <div className="titans-best">
            최고
            <strong>{save.bestStage}</strong>
          </div>
        </div>
        {/* 같은 말(닫아도 쌓인다)을 하는 "지금 닫아도 8시간 후" 칩(첫 3세션)이 떠 있으면 줄은 숨긴다 — WebKit 에서 둘이 겹쳤다 (2026-10-21 단순화) */}
        {ready && !(idlePreview && !idleReport) && (() => {
          const capHours = idleCapHours(character);
          const full = computeIdleYield(character, save.stage, save.skillInventory.equipped, capHours * 3600);
          const boosted = character.idleBoostUntil > nowTick;
          return (
            <div className="idle-status-strip" role="status">
              <i className="idle-status-dot" />자동 사냥 중{boosted ? " · 가속 ×2" : ""}
              <small>{capHours}시간 쌓으면 +{formatGold(full.gold)}G · 강화석 {full.materials}</small>
            </div>
          );
        })()}
        {/* I 전장 테마 파티클 — 오로라 띠 · 꽃잎 · 공허 별 */}
        {equippedThemeDef && (
          <span className={`theme-particles theme-${equippedThemeDef.particles}`} aria-hidden="true">
            {Array.from({ length: equippedThemeDef.particles === "aurora" ? 1 : 6 }, (_, i) => <i key={i} />)}
          </span>
        )}
        {/* 스킬 컷인 (계획안 C): 시동기 검 궤적 · 연계 마법진 · 마무리 플래시+줌 */}
        {skillVisual && (() => {
          const slot = SKILLS.find((s) => s.id === skillVisual)?.slot ?? "starter";
          const element = SKILLS.find((s) => s.id === skillVisual)?.element ?? "blade";
          return (
            <div key={`${skillVisual}-${cds[skillVisual]}`} className={`skill-cutin cutin-${slot} element-${element}`} aria-hidden="true">
              {/* 2026-10-06: 이름·마법진은 화면 가운데가 아니라 영웅 머리 위(hero-cast-tag)로 — 가운데에 뜨면 누가 썼는지 읽히지 않았다 */}
              {slot === "finisher" && <span className="cutin-flash" />}
            </div>
          );
        })()}
        <div className={`titans-hero ${formationEngaged ? "is-engaged" : ""} ${partyApproach ? "is-approaching" : ""} ${animMode} ${skillVisual ? `skill-${skillVisual}` : ""} ${now < buffs.hasteUntil ? "hero-haste" : ""} ${now < buffs.critUntil ? "hero-crit-aura" : ""} ${now < buffs.cloneUntil ? "hero-clone" : ""}`} style={{ "--hero-fig-top": `${HERO_FIG.y0}%` } as CSSProperties}>
          {/* 칭호 이름표 — 과금 점검: 칭호가 전투에서 전혀 보이지 않아 150~250보석 가치가 없었다 */}
          {character.activeTitle && TITLES[character.activeTitle] && (
            <span className="hero-title-plate" style={{ color: TITLES[character.activeTitle].color }}>✦ {TITLES[character.activeTitle].name}</span>
          )}
          {/* 주인공 표시 — 동료와 같은 크기가 되면서 누가 나인지 읽히지 않았다: 머리 위 명패 + 발밑 링 */}
          <span className="hero-marker" aria-hidden="true"><b>{TITLES[character.activeTitle ?? ""]?.name ?? (character.activeCharacter && character.activeCharacter !== "default" ? CHARACTER_LABEL[character.activeCharacter as CharacterSkinId] ?? "모험가" : "모험가")}</b><i>▼</i></span>
          <span className="hero-ring" aria-hidden="true" />
          {/* 시전 이름표 — 영웅을 따라다닌다 (예전엔 화면 가운데 컷인) */}
          {skillVisual && (() => {
            const sd = SKILLS.find((s) => s.id === skillVisual);
            return sd ? (
              <span key={`tag-${skillVisual}-${cds[skillVisual]}`} className={`hero-cast-tag el-${sd.element}`} data-skill={skillVisual}>
                <SkillIcon id={skillVisual} size={22} /><b>{sd.name}</b>
              </span>
            ) : null;
          })()}
          {/* 걸려 있는 강화 — 아이콘 + 남은 초 (어느 스킬이 모험가에게 걸려 있는지) */}
          {(() => {
            const rows = (Object.keys(buffSource) as BuffKind[]).map((k) => {
              const until = k === "crit" ? buffs.critUntil : k === "clone" ? buffs.cloneUntil : k === "war" ? buffs.warcryUntil : k === "haste" ? buffs.hasteUntil : k === "freeze" ? buffs.freezeUntil : buffs.burnUntil;
              return { k, skill: buffSource[k]!, left: Math.ceil((until - now) / 1000) };
            }).filter((r) => r.left > 0);
            return rows.length ? (
              <span className="hero-buff-tray" aria-label="걸려 있는 스킬">
                {rows.map((r) => <span key={r.k} className={`hero-buff k-${r.k}`}><SkillIcon id={r.skill} size={18} /><small>{r.left}</small></span>)}
              </span>
            ) : null;
          })()}
          <div className={`titans-hero-facing facing-${animMode}`}>
            {/* 펫 (2026-10-28) — 주인공 뒤 발치에서 같이 걷고(주인공 상자 안이라 들어오고 나갈 때 같이 움직인다) 덤빌 땐 몬스터 쪽으로 뛴다. 예전엔 전장 왼쪽 위에 떠 있기만 했다 */}
            {character.activePet && (character.pets[character.activePet as TitanMonsterKind] ?? 0) > 0 && (
              <div key={`pet-${petAtk}`} className={`hero-pet titans-pet-${character.activePet} ${petAtk > 0 ? "pet-attack" : ""}`} title={PET_DEFS[character.activePet as TitanMonsterKind].name} aria-hidden="true">
                <MonsterArt kind={character.activePet as TitanMonsterKind} area={area} boss={false} golden={false} state={petAtk > 0 ? "attack" : "idle"} />
              </div>
            )}
            <EquippedCharacter mode={animMode === "attack" ? "attack" : partyApproach ? "walk" : "idle"} frame={frameIdx} weaponLevel={forgedWeaponLevel} weaponKind={weaponKind} shoulder={appliedLook ? appliedLook.shoulder : equippedShoulder} character={character.activeCharacter} weaponSkin={appliedLook ? appliedLook.weaponSkin : character.equippedWeaponSkin} armorLevel={armorLevel} gear={heroGear} />
          </div>
        </div>

        {/* 상태 이펙트 (계획안 C): 고무 = 동료 발밑 금색 링 */}
        <div className={`titans-allies ${now < buffs.warcryUntil ? "party-inspired" : ""}`}>
          {allies.map((h, allySlot) => (
            <AllyArt
              key={h.id}
              id={h.id}
              partySlot={allySlot}
              line={allyLines[allySlot]}
              cell={allyCells[allySlot].cell}
              lineIndex={allyCells[allySlot].index}
              skin={character.equippedAllySkins[h.id]}
              attacking
              pulse={allyPulse[h.id] ?? 0}
              hitPulse={allyHit[h.id] ?? 0}
              engaged={formationEngaged}
              approaching={partyApproach}
              stage={save.stage}
              encounter={encounterMotion.seq}
              speed={save.battleSpeed}
              walkRate={encounterMotion.durationMs / 1250}
            />
          ))}
          {/* 맞은 동료 위 피해 숫자 (2026-10-27, titans/bossPressure) — 대장은 붉게 크게 */}
          {partyDmg && <b key={partyDmg.key} className={`party-dmg-float ${partyDmg.boss ? "boss" : ""}`} style={{ "--slot": Math.max(0, allies.findIndex((h) => h.id === partyDmg.id)) } as CSSProperties}>{partyDmg.text}</b>}
        </div>


        {/*
          피격 반동은 hit-a/hit-b를 번갈아 붙여 매 타격마다 CSS 애니메이션을 재시작한다.
          단일 "hit" 클래스를 monsterHit % 2로 토글하면 절반의 타격에는 클래스가 떨어져
          반동이 아예 재생되지 않는다 (같은 이름은 재적용해도 재시작하지 않으므로).
        */}
        <div className={`titans-monster kind-${kind} combat-${monsterRanged ? "ranged" : "melee"} atk-${temper.style} ${monsterIn ? "is-engaged" : ""} ${monsterIn && !formationReady ? "is-approaching" : ""} action-${monsterAction} ${monsterHit > 0 ? (monsterHit % 2 ? "hit-a" : "hit-b") : ""} ${monsterHit > 0 && (monsterHit * 7 + save.stage * 3) % 4 === 0 ? "hit-strong" : ""} ${impact === "critical" ? "critical hit-big" : ""} ${now < buffs.freezeUntil ? "st-frozen" : ""} ${now < buffs.burnUntil && (!buffs.burnBossOnly || boss) ? "st-burning" : ""}`} style={{ translate: `${monsterDrift.x}px ${monsterDrift.y}px` }}>
          {/* 스테이지 기질(atk-*)의 몸놀림은 이 겉 상자에서 — 안쪽 그림은 종별 공격 키프레임(슬라임 덮치기·고블린 찌르기 …)을 그대로 쓴다 */}
          <div className="monster-temper">
          {/* 맞을 때 제자리에서 찌그러지는 상자(2026-10-21) — 발이 바닥에 붙은 채 scale 만, 자리 이동 없음 */}
          <div className="monster-squash">
          <MonsterArt
            kind={kind}
            area={area}
            boss={boss}
            golden={chesterson}
            stage={save.stage}
            action={monsterAction}
            hitKey={monsterHit}
            state={
              bossBreak >= 3 || (bossBreak === 0 && (battlePhase === "monster-death" || battlePhase === "stage-clear" || battlePhase === "stage-exit"))
                ? "defeat"
                : impact || bossBreak === 1
                  ? "hit"
                  : monsterAction === "attack"
                    ? "attack"   // 2026-10-13: 돌진 프레임(-attack.png, make-monster-states) — CSS 돌진과 겹쳐 "친다"가 읽힌다
                    : "idle"
            }
          />
          </div>
          </div>
          {/* 상태 이펙트 (계획안 C): 화상 불꽃 · 빙결 결정 — HUD 칩 없이도 전장에서 읽힌다 */}
          <span className="status-layer" aria-hidden="true">
            {now < buffs.burnUntil && (!buffs.burnBossOnly || boss) && <i className="st-burn"><b /><b /><b /></i>}
            {now < buffs.freezeUntil && <i className="st-freeze"><b /><b /><b /><b /></i>}
          </span>
          {bossBreak === 2 && <i className="boss-crack" aria-hidden="true" />}
          {bossBreak === 3 && (
            <span className="boss-gold-burst" aria-hidden="true">
              {Array.from({ length: 14 }, (_, i) => (
                <i key={i} style={{ "--i": i, "--dx": Math.round(Math.cos((i / 14) * Math.PI * 2) * (34 + (i % 3) * 14)), "--dy": Math.round(40 + Math.abs(Math.sin((i / 14) * Math.PI * 2)) * 50) } as CSSProperties} />
              ))}
            </span>
          )}
          <strong>{label}</strong>
          {/* 보스 약점 배지 (2026-10-08) — 속성·남은 시간 링. 같은 속성 스킬·동료가 ×1.6 */}
          {boss && bossWeak && (
            <i key={bossWeak.seq} className={`boss-weak weak-${bossWeak.element}`} style={{ "--weak-ms": `${bossWeak.windowMs}ms` } as CSSProperties} aria-label={`약점 ${WEAK_LABEL[bossWeak.element]}`}>
              <b>약점</b><span>{WEAK_LABEL[bossWeak.element]}</span>
            </i>
          )}
          {monsterAction === "prepare" && <i className="monster-telegraph" aria-hidden="true" />}
          {monsterAction === "attack" && <i className="monster-attack-fx" aria-hidden="true" />}
        </div>

        {(battlePhase === "stage-clear" || battlePhase === "stage-exit") && (
          <div className="titans-clear-banner">STAGE CLEAR</div>
        )}
        {(battlePhase === "stage-clear" || battlePhase === "stage-exit" || battlePhase === "stage-enter") && (
          <button type="button" className="titans-transition-skip" onPointerDown={(event) => event.stopPropagation()} onClick={skipStageTransition}>
            스킵
          </button>
        )}

        {/* 스킬 투사체·빛줄기·명중·연결선·오라 — 영웅 위치에서 출발 (2026-10-06) */}
        {shots.map((s) => (
          <span
            key={s.id}
            className={`skill-shot shot-${s.kind} el-${s.element} ${s.big ? "big" : ""}`}
            style={{ left: `${s.x}px`, top: `${s.y}px`, "--dx": `${s.dx}px`, "--dy": `${s.dy}px`, "--ang": `${s.ang}deg`, "--len": `${s.len}px`, ...(s.fly ? { "--fly": `${s.fly}ms` } : {}) } as CSSProperties}
            data-skill={s.skill}
            aria-hidden="true"
          >
            {s.kind === "impact" && <i className="fx-burst" />}
            {s.kind === "impact" && s.skill && <SkillIcon id={s.skill} size={s.big ? 46 : 34} />}
            {(s.kind === "shot" || s.kind === "proj") && <i />}
          </span>
        ))}
        {fx.map((f) => (
          <span
            key={f.id}
            className={`titans-fx titans-fx-${f.kind}${f.el ? ` el-${f.el}` : ""}`}
            style={{
              left: `${f.x}%`,
              top: `${f.y}%`,
              ["--fx-hue" as string]: f.hue ?? 200,
            }}
          />
        ))}

        {floats.map((f) => (
          <span
            key={f.sum ? `${f.id}-${f.bump ?? 0}` : f.id}
            className={`titans-float src-${f.source} ${f.crit ? "crit" : ""} ${f.sum ? "sum" : ""}`}
            data-bump={f.sum ? f.bump ?? 0 : undefined}
            style={{ left: `${f.x}%`, top: `${f.y}%`, ...(f.hue !== undefined ? { "--float-hue": f.hue } : {}) } as CSSProperties}
          >
            {!f.sum && <i aria-hidden="true">{f.source === "tap" ? "☝" : f.source === "ally" ? "◆" : f.source === "skill" ? "✦" : "⚔"}</i>}
            {f.label && <em className="float-label">{f.label}</em>}
            {f.crit && <small className="float-crit">CRIT</small>}-{f.text}
          </span>
        ))}

        <div className="titans-hp">
          <div className="titans-hp-fill" style={{ width: `${(hp / Math.max(1, maxHp)) * 100}%` }} />
          <span>
            {formatGold(Math.max(0, hp))} / {formatGold(maxHp)}
          </span>
        </div>

        {boss && (<>
          <div className={`titans-party-hp ${partyHp < 0.3 ? "low" : ""}`} role="meter" aria-label="원정대 체력" aria-valuenow={Math.round(partyHp * 100)} aria-valuemin={0} aria-valuemax={100}>
            <i><em style={{ width: `${partyHp * 100}%` }} /></i>
            <small>원정대 {Math.round(partyHp * partyMaxHpLabel(save.stage)).toLocaleString()}</small>
          </div>
          <div className="titans-boss-timer">
            BOSS {bossLeft.toFixed(1)}s
            <i style={{ width: `${(bossLeft / bossTimeSec) * 100}%` }} />
          </div>
        </>)}

        {bossReady && !boss && battlePhase === "combat" && (
          <button
            type="button"
            className="titans-boss-challenge"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              setBossReady(false);
              setFormationEngaged(false);
              setFormationReady(false);
              spawn(save.stage, MOBS_PER_STAGE, true);
              battlePhaseRef.current = "stage-enter";
              setBattlePhase("stage-enter");
              later(() => {
                setFormationEngaged(true);
                battlePhaseRef.current = "combat";
                setBattlePhase("combat");
              }, 760);
            }}
          >
            보스 도전하기
            {perkForStage(character.bossLadder, save.stage) && <small className="boss-ladder-hint">처치 시 {LADDER_LABEL[perkForStage(character.bossLadder, save.stage)!]} 영구 +</small>}
          </button>
        )}
        {/* L 보상형 광고: 보스 실패 후 +10초 — 미연동이면 자리 없음 */}
        {bossReady && !boss && battlePhase === "combat" && bossFailStreakRef.current > 0 && bossRetryBonusRef.current === 0 && rewardedAvailability(character, "bossRetry", new Date().toLocaleDateString("sv-SE")) !== "none" && (
          <button type="button" className="ad-boss-retry" disabled={adBusy} onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); void retryBossWithAd(); }}>
            {character.adFree ? "광고 제거 · " : "광고 보고 "}다음 도전 +{BOSS_RETRY_BONUS_SEC}초
          </button>
        )}

        {/* 스킬 독 — 전장 안 좌하단. 스킬은 전투 중 누르는 것이라 전장 밖(하단 카드 열)에
            있으면 시선이 오간다. 힌트 텍스트는 우하단으로 비켜난다 (사용자 지시). */}
        <div className="titans-skill-dock" onPointerDown={(e) => e.stopPropagation()}>
          <div className="battle-qol" role="group" aria-label="전투 편의">
            <button
              type="button"
              className={`qol-btn ${save.autoSkill ? "on" : ""}`}
              title="쿨타임 찬 스킬 자동 시전"
              onClick={() => setSave((prev) => ({ ...prev, autoSkill: !prev.autoSkill }))}
            >
              AUTO
            </button>
            <button
              type="button"
              className={`qol-btn ${save.battleSpeed === 2 ? "on" : ""}`}
              title="전투 배속"
              onClick={() => setSave((prev) => ({ ...prev, battleSpeed: prev.battleSpeed === 2 ? 1 : 2 }))}
            >
              ×2
            </button>
          </div>
          {/* 장착 스킬만 — 로스터가 20종이라 전부 그리면 독이 화면 밖으로 넘친다 (inspect-mobile.mjs) */}
          {SKILLS.filter((sk) => save.skillInventory.equipped[sk.slot] === sk.id && sk.slot !== "passive").map((sk) => {
            const learned = save.skillInventory.learned.includes(sk.id);
            const equipped = save.skillInventory.equipped[sk.slot] === sk.id;
            const cd = cds[sk.id];
            const ready = learned && equipped && cd <= 0 && sk.slot !== "passive";
            return (
              <button
                key={sk.id}
                type="button"
                className={`titans-skill tier-${SKILL_TIER[sk.id]} ${ready ? "ready" : ""} ${skillVisual === sk.id ? "casting" : ""}`}
                disabled={!learned || !equipped || cd > 0 || sk.slot === "passive"}
                onClick={() => castSkill(sk.id)}
                title={`${sk.name} · ${sk.desc}`}
                aria-label={sk.name}
              >
                <SkillIcon id={sk.id} />
                <small>
                  {!learned ? "미학습" : !equipped ? "미장착" : sk.slot === "passive" ? "PASSIVE" : cd > 0 ? `${cd.toFixed(1)}s` : "READY"}
                </small>
                {learned && equipped && cd > 0 && sk.slot !== "passive" && (
                  <i className="skill-cd-ring" style={{ "--cd": cd / sk.cooldownSec } as CSSProperties} aria-hidden="true" />
                )}
              </button>
            );
          })}
        </div>
        {/* 결제 타이밍 카드 (retention-2~5): 무료 +10초 → 순간 제안 1장. 창이 닫히면 상점 패키지 탭에 정가로 남는다 */}
        {freeRetryCard && (
          <div className="moment-offer free" role="dialog" onPointerDown={(e) => e.stopPropagation()}>
            <div className="moment-head">첫 보스 실패 — 다음 도전 +10초 <small>무료 1회</small></div>
            <div className="moment-sub">몬스터 10마리를 다시 처치하면 보스가 돌아옵니다. 이번 한 번은 제한시간을 늘려 드려요.</div>
            <div className="moment-actions">
              <button type="button" className="moment-buy" onClick={() => { freeRetryUsedRef.current = true; bossRetryBonusRef.current = BOSS_RETRY_BONUS_SEC; setFreeRetryCard(false); flash(`다음 보스 도전 제한시간 +${BOSS_RETRY_BONUS_SEC}초`); }}>+{BOSS_RETRY_BONUS_SEC}초 받기</button>
              <button type="button" className="moment-later" onClick={() => setFreeRetryCard(false)}>괜찮아요</button>
            </div>
          </div>
        )}
        {!freeRetryCard && momentOfferCard}
        <div className="battle-alert-stack" onPointerDown={(event) => event.stopPropagation()}>
          {recommendation && !dismissedAlerts.includes(`recommend:${recommendation.title}`) && (
            <button
              type="button"
              className={`battle-alert tone-${recommendation.tone}`}
              onClick={() => {
                setDismissedAlerts((items) => [...items, `recommend:${recommendation.title}`]);
                runAction(recommendation.action);
              }}
            >
              <small>{recommendation.tone === "claim" ? "받을 보상" : "성장 알림"}</small>
              <b>{recommendation.title}</b><i>›</i>
            </button>
          )}
          {/* 구매 추천은 성장 추천 다음 자리 (2026-10-06) */}
          {adviceTop[0] && !dismissedAlerts.includes(`advice:${adviceTop[0].id}`) && (
            <button type="button" className="battle-alert tone-buy advice-alert" data-advice={adviceTop[0].id} onClick={() => setAdviceOpen(true)}>
              <small>구매 추천{adviceTop.length > 1 ? ` · ${adviceTop.length}개` : ""}</small>
              <b>{adviceTop[0].title}</b><i>›</i>
            </button>
          )}
          {routine.filter((item) => item.id === "claim" && !item.done && !dismissedAlerts.includes(`routine:${item.id}:${item.detail}`)).map((item) => (
            <button key={item.id} type="button" className="battle-alert claim" onClick={() => { setDismissedAlerts((items) => [...items, `routine:${item.id}:${item.detail}`]); runRoutine(item); }}>
              <small>귀환 정산</small><b>{item.detail}</b><i>›</i>
            </button>
          ))}
          {routineReward && !dismissedAlerts.includes(`routine-reward:${character.routineClaimedDate}`) && (
            <button type="button" className="battle-alert reward" onClick={() => { setDismissedAlerts((items) => [...items, `routine-reward:${character.routineClaimedDate}`]); void claimRoutine(); }}>
              <small>일일 루틴</small><b>보상 받기 · 보석 {ROUTINE_REWARD_GEMS}</b><i>›</i>
            </button>
          )}
          {/* 알림이 최대 5줄까지 쌓여 전장을 덮었다 — 급한 것(보상·정산) 뒤에 목표는 1줄만 (2026-09-18) */}
          {nextGoals.filter((g) => !dismissedAlerts.includes(`goal:${g.id}:${g.value}`)).slice(0, 1).map((g) => (
            <button key={g.id} type="button" className={`battle-alert goal ${g.done ? "done" : ""}`} onClick={() => { setDismissedAlerts((items) => [...items, `goal:${g.id}:${g.value}`]); g.onClick(); }}>
              <small>{g.label}</small><b>{g.value}</b><i>›</i>
            </button>
          ))}
        </div>
      </section>

      <div className="titans-buffs">
        {now < buffs.critUntil && <span>치명 +{Math.round(buffs.critBonus * 100)}%</span>}
        {now < buffs.cloneUntil && <span>분신 ×{buffs.cloneMult.toFixed(1)}</span>}
        {now < buffs.warcryUntil && <span>고무 ×{buffs.warMult.toFixed(1)}</span>}
        {now < buffs.hasteUntil && <span>가속</span>}
        {now < buffs.freezeUntil && <span>빙결</span>}
        {now < buffs.burnUntil && <span>화상</span>}
      </div>


      <div className="titans-tabs titans-growth-tabs">
        {/* 2×2 (2026-10-26, 사용자: "퀘스트를 왼쪽으로 · 4번째 유물") — 장비 성장 · 스킬 / 퀘스트 · 유물 */}
        <button type="button" className={tab === "sword" ? "on" : ""} aria-expanded={growthOpen && tab === "sword"} onClick={() => { setGrowthOpen((o) => (tab === "sword" ? !o : true)); setTab("sword"); }}>
          장비 성장
        </button>
        <button type="button" className={tab === "skills" ? "on" : ""} aria-expanded={growthOpen && tab === "skills"} onClick={() => { setGrowthOpen((o) => (tab === "skills" ? !o : true)); setTab("skills"); }}>
          스킬{save.skillInventory.learned.length > 0 && SKILLS.some((x) => (save.skillInventory.copies?.[x.id] ?? 0) > 0 && (!save.skillInventory.learned.includes(x.id) || skillCardPlan(save.skillInventory, x.id).used > 0)) && <i className="tab-dot" aria-label="쓸 수 있는 스킬 카드" />}
        </button>
        {/* 퀘스트 (2026-10-26, "오늘도 환생 2" — 시간마다 골드) · 2×2 의 왼쪽 아래 — 지금 살 수 있는 줄이 있으면 점 */}
        <button type="button" className={tab === "quest" ? "on" : ""} aria-expanded={growthOpen && tab === "quest"} onClick={() => { setGrowthOpen((o) => (tab === "quest" ? !o : true)); setTab("quest"); setQuestProg(questProgRef.current.slice()); }}>
          퀘스트{(QUESTS.some((_, i) => questBlock(save.quests, i, save.gold) === null) || (questBonusLeftMs(save.quests, Date.now()) === 0 && questBonusAmount(save.quests) > 0)) && <i className="tab-dot" aria-label="올릴 수 있는 퀘스트" />}
        </button>
        {/* 유물 (2026-10-26, 사용자: "4번째에는 유물 추가") — 마이페이지에만 있던 유물 판을 성장 서랍으로 · 뽑기는 상점 */}
        <button type="button" className={tab === "relic" ? "on" : ""} aria-expanded={growthOpen && tab === "relic"} onClick={() => { setGrowthOpen((o) => (tab === "relic" ? !o : true)); setTab("relic"); }}>
          유물{RELICS.some((r) => relicSpareUsable(character.relics, character.relicSpare, r.id) > 0) && <i className="tab-dot" aria-label="소진할 유물 조각" />}
        </button>
        <button type="button" className="growth-drawer-close" aria-label="서랍 닫기" onClick={() => setGrowthOpen(false)}>▾</button>
      </div>

      {adviceOpen && (
        <div className="advice-backdrop" role="presentation" onClick={() => setAdviceOpen(false)}>
          <div className="advice-sheet" role="dialog" aria-label="구매 추천" onClick={(e) => e.stopPropagation()}>
            <header><b>구매 추천</b><small>지금 가진 재화로 살 수 있는 것 · 효과 순</small><button type="button" className="hub-sheet-close" onClick={() => setAdviceOpen(false)} aria-label="닫기">×</button></header>
            <WalletBar testGems={qaGemsEnabled()} items={[{ kind: "gem", amount: redGems }, { kind: "gold", amount: save.gold, label: "사냥터 골드" }, { kind: "gold", amount: character.sharedCoins, label: "공용 골드" }, { kind: "stone", amount: character.enhancementMaterials }, { kind: "seal", amount: character.expeditionSeals }]} />
            <ol className="advice-list">
              {adviceTop.map((a, i) => (
                <li key={a.id} className={`advice-row cur-${a.currency}`}>
                  <span className="advice-rank">{i + 1}</span>
                  <span className="advice-body"><b>{a.title}</b><small>{a.reason}</small><em>{adviceCost(a)}</em></span>
                  <button type="button" onClick={() => { setDismissedAlerts((items) => [...items, `advice:${a.id}`]); runAdvice(a.action); }}>가기</button>
                </li>
              ))}
              {adviceTop.length === 0 && adviceGoal && (
                <li className="advice-row goal">
                  <span className="advice-rank">◎</span>
                  <span className="advice-body"><b>다음 목표 · {adviceGoal.title}</b><small>{adviceGoal.reason}</small><em>{shortfallLabel(adviceGoal, character, save)} 모으면 살 수 있어요 ({Math.round(adviceGoal.ratio * 100)}%)</em></span>
                </li>
              )}
            </ol>
          </div>
        </div>
      )}
      {/* 관리 페이지(동료·뽑기·상점)는 전장을 가리는 전체 페이지가 아니라 하단 바 위로 올라오는 시트다 (사용자 지시: 하단 UI) */}
      {MANAGEMENT_PAGE_COPY[tab] && <div className="hub-sheet-backdrop" onClick={() => setTab("sword")} aria-hidden="true" />}
      {/* 장비 성장·스킬은 전장 아래 인라인, 관리 페이지(동료·뽑기·상점)는 같은 섹션을 시트로 띄운다 */}
      <div ref={hubSheetRef} className={MANAGEMENT_PAGE_COPY[tab] ? "hub-sheet" : "hub-inline"} role={MANAGEMENT_PAGE_COPY[tab] ? "dialog" : undefined} aria-label={MANAGEMENT_PAGE_COPY[tab]?.title}>
        {MANAGEMENT_PAGE_COPY[tab] && <button type="button" className="hub-sheet-handle" onClick={() => setTab("sword")} aria-label="닫기"><i /></button>}
        {MANAGEMENT_PAGE_COPY[tab] && (
        <header className="hub-sheet-head">
          {/* 제목이 바로 옆 전환 탭과 같은 말이라 빼고 전환 탭이 제목 역할을 한다 (동료 도감 / 상점 — 2026-09-18) */}
          {(tab === "heroes" || tab === "gacha") && (
            <nav className="hub-sheet-switch" aria-label="동료 메뉴">
              <button type="button" className={tab === "heroes" ? "on" : ""} onClick={() => setTab("heroes")}>동료 도감</button>
              <button type="button" className={tab === "gacha" ? "on" : ""} onClick={() => setTab("gacha")}>동료 뽑기</button>
            </nav>
          )}
          {tab === "expedition" && (
            <nav className="hub-sheet-switch" aria-label="파견 메뉴">
              <button type="button" onClick={() => setTab("hub")}>모험</button>
              <button type="button" className="on">파견</button>
            </nav>
          )}
          {(tab === "premium" || tab === "event-shop" || tab === "event-shop2") && (
            <nav className="hub-sheet-switch" aria-label="상점 메뉴">
              <button type="button" className={tab === "premium" ? "on" : ""} onClick={() => setTab("premium")}>상점</button>
              <button type="button" className={tab === "event-shop" ? "on" : ""} onClick={() => setTab("event-shop")}>이벤트</button>
              <button type="button" className={tab === "event-shop2" ? "on" : ""} onClick={() => setTab("event-shop2")}>특별</button>
            </nav>
          )}
          <button type="button" className="hub-sheet-close" onClick={() => setTab("sword")} aria-label="닫기">×</button>
        </header>
        )}
        {/* 보석·골드를 쓰는 시트에는 지갑 줄 — 시트가 머리의 보석 칩을 가렸다 (2026-10-06) */}
        {(tab === "premium" || tab === "event-shop" || tab === "event-shop2" || tab === "gacha") && (
          <WalletBar className="hub-sheet-wallet" testGems={qaGemsEnabled()} items={[
            { kind: "gem", amount: redGems },
            { kind: "gold", amount: save.gold, label: "사냥터 골드" },
            tab === "event-shop" ? { kind: "coin", amount: character.eventCoins } : { kind: "stone", amount: character.enhancementMaterials },
          ]} />
        )}
        {(tab === "premium" || tab === "event-shop2") && (() => {
          const gemPick = advice.find((a) => a.currency === "gems" && a.affordable);
          return gemPick ? (
            <button type="button" className="advice-inline" data-advice={gemPick.id} onClick={() => setAdviceOpen(true)}>
              <small>보석 추천</small><b>{gemPick.title}</b><em>{gemPick.reason}</em>
            </button>
          ) : null;
        })()}
      <section className="titans-shop">
        {tab === "relic" && (
          <RelicTabPanel relics={character.relics} spare={character.relicSpare} onConsume={(id) => void consumeRelic(id)} chance={perm.relicChance} onDraw={() => { setPremiumCategory("relic"); setTab("premium"); }} />
        )}
        {tab === "quest" && (
          <QuestPanel
            key={questDone?.key ?? 0}
            state={save.quests}
            gold={save.gold}
            prog={questProg.length ? questProg : save.quests.prog}
            done={questDone?.rows ?? []}
            onBonus={() => {
              // 10분 보너스 (2026-10-27, 사용자: "10분당 돈을 현재 초당 금액의 100배 더 주는 버튼")
              const r = claimQuestBonus(saveRef.current.quests, Date.now());
              if (!r) {
                const left = questBonusLeftMs(saveRef.current.quests, Date.now());
                flash(left > 0 ? `10분 보너스 · ${Math.ceil(left / 60000)}분 뒤에 다시` : "퀘스트를 먼저 돌려 보세요");
                return;
              }
              setSave((prev) => { const rr = claimQuestBonus(prev.quests, Date.now()); return rr ? { ...prev, gold: prev.gold + rr.gold, quests: { ...rr.state, prog: questProgRef.current.length ? questProgRef.current.slice() : rr.state.prog } } : prev; });
              flash(`10분 보너스 · 골드 +${formatGold(r.gold)}`);
              showRewardPop("gift", "퀘스트 10분 보너스", `골드 +${formatGold(r.gold)}`, "초당 퀘스트 골드 × 100 · 10분 뒤 다시");
            }}
            onBuy={(i) => {
              const cur = saveRef.current;
              const r = buyQuest(cur.quests, i, cur.gold);
              if (!r) {
                const lv = cur.quests.levels[i];
                const why = questBlock(cur.quests, i, cur.gold);
                flash(why === "prev" ? "앞 퀘스트를 먼저 여세요" : why === "max" ? "최대 레벨입니다" : `골드가 모자랍니다 — ${formatGold(questCost(i, lv))} 필요`);
                return;
              }
              const lv = saveRef.current.quests.levels[i];
              setSave((prev) => { const rr = buyQuest(prev.quests, i, prev.gold); return rr ? { ...prev, gold: prev.gold - rr.cost, quests: { ...rr.state, prog: questProgRef.current.length ? questProgRef.current.slice() : rr.state.prog } } : prev; });
              flash(lv === 0 ? `퀘스트 열림 · ${QUESTS[i].name}` : `${QUESTS[i].name} Lv.${lv + 1} · 한 번에 ${formatGold(questPay(i, lv))} → ${formatGold(questPay(i, lv + 1))}`);
            }}
          />
        )}
        {tab === "sword" && (
          <button
            type="button"
            className={`auto-train-toggle ${autoTrain ? "on" : ""} ${autoTrain && !autoTrainAffordable ? "waiting" : ""}`}
            aria-pressed={autoTrain}
            onClick={() => { setAutoTrain((v) => !v); setAutoTrainHit(null); }}
          >
            <i aria-hidden="true" />
            <b>자동 강화</b>
            <small>{autoTrain ? (autoTrainAffordable ? `가장 싼 장비부터 · ${autoTrainHit?.count ?? 0}회` : "골드 모으는 중 — 모이면 이어서") : "켜 두면 골드로 알아서 훈련"}</small>
          </button>
        )}
        {(tab === "sword" || tab === "heroes") && (
          <div className="bulk-toggle" role="group" aria-label="일괄 레벨업 수량">
            <span>일괄 레벨업</span>
            {([1, 10, 0] as const).map((n) => (
              <button
                key={n}
                type="button"
                className={buyAmount === n ? "on" : ""}
                onClick={() => setBuyAmount(n)}
              >
                {n === 0 ? "MAX" : `×${n}`}
              </button>
            ))}
          </div>
        )}
        {tab === "sword" && (
          <>
            <article key={autoTrainHit?.slot === "weapon" ? `w${autoTrainHit.seq}` : "w"} className={`titans-card equipment-training-card ${autoTrainHit?.slot === "weapon" ? "auto-hit" : ""}`}>
              <div className="training-item-icon weapon"><img src={assetUrl(weaponIconPath(weaponKind, forgedWeaponLevel))} alt="" aria-hidden="true" /></div>
              <div>
                <strong>무기 숙련 · Lv.{save.equipmentTraining.weaponMastery}</strong><p>탭 피해 {formatGold(tapDamage(save.equipmentTraining.weaponMastery + Math.floor(forgedWeaponLevel * 1.5)))} → {formatGold(tapDamage(save.equipmentTraining.weaponMastery + 1 + Math.floor(forgedWeaponLevel * 1.5)))}</p>
                {/* 무기 4종 (2026-10-27) — 검 · 창 · 활 · 지팡이. 강화는 대장간(장착 무기) · 바꾸면 그 무기의 스킬 세트로 */}
                <span className="weapon-kind-chips four" role="group" aria-label="주인공 무기">
                  {WEAPON_KINDS.map((k) => {
                    const lv = weaponHuntLevel(k, drumLevel, character.expeditionWeaponForge ?? {});
                    return (
                      <button key={k} type="button" className={`weapon-kind-chip ${wantedWeaponKind === k ? "on" : ""} ${wantedWeaponKind === k && weaponKind !== k ? "pending" : ""}`} aria-pressed={wantedWeaponKind === k} title={`${weaponStatText(k)} · ${WEAPON_TECH[k].desc}`} onClick={() => equipWeapon(k)}>
                        {WEAPON_LABEL[k]} +{lv}
                      </button>
                    );
                  })}
                </span>
                <small className="weapon-kind-stat">{lookPending ? <b className="look-pending">다음 몬스터부터 {WEAPON_LABEL[wantedWeaponKind]} · </b> : null}{weaponStatText(wantedWeaponKind)} · 기술 {WEAPON_TECH[wantedWeaponKind].name} — {WEAPON_TECH[wantedWeaponKind].desc}</small>
              </div>
              <button type="button" disabled={save.gold < equipmentTrainingCost("weapon", save.equipmentTraining.weaponMastery)} onClick={() => trainEquipment("weapon")}>훈련<small className="btn-cost">{formatGold(equipmentTrainingCost("weapon", save.equipmentTraining.weaponMastery))}G</small></button>
            </article>
            <article className="titans-card equipment-training-card">
              {/* 다른 파츠와 같은 틀·크기 (2026-10-16) — 미장착이면 정찰 견갑을 흐리게 */}
              <div className={`training-item-icon gear-icon shoulder-gear ${equippedShoulder ? "" : "is-empty"}`}><img src={shoulderIconUrl(equippedShoulder ?? "scout")} alt="" aria-hidden="true" /></div>
              <div><strong>{equippedShoulder ? SHOULDER_DEFINITIONS[equippedShoulder].name : "견갑 미장착"} · 숙련 Lv.{save.equipmentTraining.shoulderMastery}</strong><p>{equippedShoulder ? SHOULDER_DEFINITIONS[equippedShoulder].effect : "기본 견갑"}{shoulderTrainingMaterials(save.equipmentTraining.shoulderMastery).expedition > 0 ? ` · 강화석 ${shoulderTrainingMaterials(save.equipmentTraining.shoulderMastery).expedition}` : ""}{shoulderTrainingMaterials(save.equipmentTraining.shoulderMastery).beat > 0 ? ` · 견갑 조각 ${shoulderTrainingMaterials(save.equipmentTraining.shoulderMastery).beat}` : ""}</p></div>
              <button type="button" disabled={save.gold < equipmentTrainingCost("shoulder", save.equipmentTraining.shoulderMastery) || character.enhancementMaterials < shoulderTrainingMaterials(save.equipmentTraining.shoulderMastery).expedition || character.shoulderShards < shoulderTrainingMaterials(save.equipmentTraining.shoulderMastery).beat} onClick={() => void trainEquipment("shoulder")}>훈련<small className="btn-cost">{formatGold(equipmentTrainingCost("shoulder", save.equipmentTraining.shoulderMastery))}G</small></button>
            </article>
            {/* 파츠 4종 (2026-10-14, 사용자: "카피바라 키우기처럼 파츠 4개 더 · 총 6개 성장") — 숙련은 사냥 골드, 강화는 대장간 */}
            {GEAR_PARTS.map((part) => {
              const def = GEAR_PART_DEF[part];
              const lv = save.equipmentTraining[`${part}Mastery` as "helmetMastery"] ?? 0;
              const enh = character.gearEnhance?.[part] ?? 0;
              const cost = gearTrainingCost(part, lv);
              const now = gearPartValue(part, lv, enh), next = gearPartValue(part, lv + 1, enh);
              const capped = now >= def.cap;
              return (
                <article key={autoTrainHit?.slot === part ? `${part}${autoTrainHit.seq}` : part} className={`titans-card equipment-training-card gear-part-card gear-${part} ${autoTrainHit?.slot === part ? "auto-hit" : ""}`} data-gear-part={part}>
                  <div className="training-item-icon gear-icon"><img src={assetUrl(`titans/gear/${part === "armor" ? "armor" : part}-${Math.max(1, gearTierOfEnhance(enh))}.png`)} alt="" aria-hidden="true" /></div>
                  <div>
                    <strong>{def.name}{enh > 0 ? ` +${enh}` : ""} · 숙련 Lv.{lv}</strong>
                    <p>{def.stat} {def.format(now)}{capped ? " (최대)" : ` → ${def.format(next)}`}</p>
                  </div>
                  <button type="button" disabled={capped || save.gold < cost} onClick={() => void trainEquipment(part)}>{capped ? "최대" : <>훈련<small className="btn-cost">{formatGold(cost)}G</small></>}</button>
                </article>
              );
            })}
          </>
        )}

        {tab === "hub" && (
          <section className="hub-page" aria-label="모험 허브">
            {/* 루틴 줄 — 예전 '모험' 팝업의 항목(정산 제외)과 시즌. 같은 클래스라 캡처·검사 스크립트가 그대로 찾는다 */}
            <div className="nav-popup-grid adventure-grid hub-routine">
              {routine.filter((item) => item.id !== "claim").map((item) => (
                <button key={item.id} type="button" className={item.done ? "done" : ""} onClick={() => runRoutine(item)}>
                  {item.id === "forge" ? <ContentIcon name="forge" /> : <img className="nav-icon-svg" src={assetUrl(item.id === "rift" ? "ui/idle/rift.png" : item.id === "expedition" ? "ui/idle/expedition.png" : "ui/idle/pioneer-flag.png")} alt="" aria-hidden="true" />}
                  <span><b>{item.label}</b><small>{item.detail}</small><small className="nav-help">{ROUTINE_HELP[item.id]}</small></span>
                </button>
              ))}
              <button type="button" className="season-nav" onClick={() => onOpenEvents?.("season")}><img className="nav-icon-svg" src={assetUrl("ui/idle/star.png")} alt="" aria-hidden="true" /><span><b>시즌 패스 {seasonIndex(nowTick)}</b><small>티어 {seasonTier(character.seasonPass.xp)} · {seasonDaysLeft(nowTick)}일 남음</small></span></button>
            </div>
            {/* 비버 상자 줄 (economy/chests, P2): 성벽 10층 · 균열 3회 · 10연에서 오고, 열면 포인트 → 100점에 상자 1 */}
            <div className="hub-chests" data-chests={character.chests}>
              <img className="nav-icon-svg" src={assetUrl("ui/idle/gate-supply.png")} alt="" aria-hidden="true" />
              <span>
                <b>비버 상자 {character.chests}개</b>
                <small>포인트 {character.chestPoints}/{CHEST_POINTS_FOR_CHEST} · {CHEST_TABLE.map((d) => `${d.label.split(" (")[0]} ${d.percent}%`).join(" · ")}</small>
              </span>
              <button type="button" className="hub-chest-open" disabled={character.chests <= 0} onClick={() => {
                void updateCharacterProgress(userHash, (current) => openChest(current, Math.random, () => randomOwnedAlly(saveRef.current.heroes, Math.random, current.partyIds)).progress).then((next) => {
                  const opened = next.chestsOpened - character.chestsOpened;
                  if (opened > 0) {
                    const gotMat = next.enhancementMaterials - character.enhancementMaterials, gotSeal = next.expeditionSeals - character.expeditionSeals;
                    flash(gotMat > 0 ? `상자 · 강화석 +${gotMat}` : gotSeal > 0 ? `상자 · 인장 +${gotSeal}` : "상자 · 동료 조각 +3");
                  }
                  setCharacter(next);
                });
              }}>{character.chests > 0 ? "열기" : "없음"}</button>
            </div>
            {/* 카드 6장 (titans/hubCards): 남은 횟수 · 오늘 재화 · 빨간 점(최대 3) */}
            <div className="hub-cards nav-popup-grid">
              {hubCardList.map((card) => (
                <button key={card.id} type="button" data-card={card.id} className={`hub-card ${card.locked ? "tab-locked" : ""} ${card.dot ? "has-dot" : ""}`} style={{ "--card-art": `url(${assetUrl(`ui/content-cards/${card.id}.webp`)})` } as CSSProperties}
                  onClick={() => {
                    if (card.locked) { flash(card.lockHint ?? "아직 잠겨 있습니다"); return; }
                    if (card.go.kind === "content") onOpenContent(card.go.content);
                    else if (card.go.kind === "events") { if (onOpenEvents) onOpenEvents(card.go.tab); else flash("설정 → 모험가 이벤트에서 열 수 있습니다"); }
                    else setTab(card.go.tab);
                  }}>
                  {card.id === "dodge" || card.id === "beat" || card.id === "forge" ? <ContentIcon name={card.id} /> : <img className="nav-icon-svg" src={assetUrl(card.id === "tower" ? "ui/idle/tower.png" : card.id === "rift" ? "ui/idle/rift.png" : "ui/idle/expedition.png")} alt="" aria-hidden="true" />}
                  <span className="hub-card-body">
                    <b>{card.label}{card.dot && <i className="hub-dot" aria-label="지금 할 수 있음" />}</b>
                    <small>{card.desc}</small>
                    <small className="hub-remaining">{card.remaining}</small>
                    <span className="hub-feeds" aria-label="오늘 얻는 것">{card.feeds.map((x) => <em key={x}>{x}</em>)}</span>
                    {/* 잠금 조건 + 진행도 (2026-10-14, 사용자: "언제 해금되는지 불친절") — 누르지 않아도 카드 위에 보인다 */}
                    {card.locked && card.unlock && (
                      <span className="hub-unlock" aria-label={`잠금 해제 조건: ${card.unlock.label}`}>
                        <b>🔒 {card.unlock.label}</b>
                        {card.unlock.goal > 1 && <i className="hub-unlock-bar"><i style={{ width: `${Math.round((card.unlock.now / card.unlock.goal) * 100)}%` }} /></i>}
                        {card.unlock.goal > 1 && <small>{card.unlock.unit === "S" ? `지금 S${card.unlock.now}` : `지금 ${card.unlock.now} / ${card.unlock.goal} ${card.unlock.unit}`}</small>}
                      </span>
                    )}
                  </span>
                  {card.locked && <img className="tab-lock" src={assetUrl("ui/idle/lock.png")} alt="" />}
                  {card.locked && card.lockHint && <span className="hub-unlock-tip" role="tooltip">{card.lockHint}</span>}
                </button>
              ))}
            </div>
          </section>
        )}
        {tab === "expedition" && (() => {
          // 파견 전용 화면 (2026-10-26 사용자: "파견 콘텐츠 수정") — 예전엔 허브 카드가 동료 도감으로만 보내고 보내기 단추는 접힌 동료 카드 안에 숨어 있었다.
          // 위: 자리 2칸(남은 시간 · 진행 막대 · 들고 올 것) · 가운데: 귀환 수령 · 아래: 보낼 수 있는 벤치 동료와 시간별 보상
          const leftText = (ms: number) => { const min = Math.ceil(ms / 60000); return min >= 60 ? `${Math.floor(min / 60)}시간 ${min % 60}분` : `${min}분`; };
          const rarityRank = { LR: 0, UR: 1, SSR: 2, SR: 3, R: 4, N: 5 } as const;
          const bench = HEROES.filter((h) => save.heroes[h.id] > 0 && !character.partyIds.includes(h.id) && !character.expeditions.some((e) => e.allyId === h.id))
            .sort((a, b) => rarityRank[ALLY_RARITY[a.id]] - rarityRank[ALLY_RARITY[b.id]]);
          const full = character.expeditions.length >= EXPEDITION_MAX;
          return (
            <section className="expedition-panel" aria-label="파견" data-slots={character.expeditions.length} data-done={expeditionsDone}>
              <div className="expedition-slots">
                {Array.from({ length: EXPEDITION_MAX }, (_, i) => {
                  const e = character.expeditions[i];
                  if (!e) return <div key={`empty-${i}`} className="expedition-slot empty"><b>빈 자리</b><small>아래에서 동료와 시간을 고르세요</small></div>;
                  const h = HEROES.find((x) => x.id === e.allyId)!;
                  const left = Math.min(e.hours * 3600000, Math.max(0, e.endsAt - Date.now()));   // nowTick 은 최대 1초 늦어 갓 보낸 파견이 "8시간 1분" 으로 보였다
                  const done = left <= 0;
                  const r = expeditionReward(e.allyId, effectiveStars(character.allyStars[e.allyId], save.heroes[e.allyId]), e.hours);
                  return (
                    <div key={e.allyId} className={`expedition-slot ${done ? "done" : ""}`}>
                      <AllyArt id={e.allyId} skin={character.equippedAllySkins[e.allyId]} />
                      <span>
                        <b>{h.name} · {e.hours}시간</b>
                        <small className="expedition-left">{done ? "귀환 완료" : `${leftText(left)} 남음`}</small>
                        <i className="expedition-bar"><i style={{ width: `${Math.round((1 - left / (e.hours * 3600000)) * 100)}%` }} /></i>
                        <small>조각 +{r.shards} · 강화석 +{r.materials}{r.gems > 0 ? ` · 보석 +${r.gems}` : ""}</small>
                      </span>
                    </div>
                  );
                })}
              </div>
              {expeditionsDone > 0 && (
                <button type="button" className="expedition-claim" onClick={() => void claimExpeditions()}>
                  <img src={assetUrl("ui/idle/expedition.png")} alt="" aria-hidden="true" />
                  파견 {expeditionsDone}건 귀환 — 보상 받기
                </button>
              )}
              <h3 className="expedition-bench-title">보낼 수 있는 동료 {bench.length}명{full ? " · 자리가 다 찼어요" : ""}</h3>
              {bench.length === 0 ? (
                <p className="expedition-empty">출전 중이 아닌 동료가 없습니다 — 동료 도감에서 벤치로 내리거나 새 동료를 소환하면 보낼 수 있어요</p>
              ) : (
                <div className="expedition-bench">
                  {bench.map((h) => {
                    const stars = effectiveStars(character.allyStars[h.id], save.heroes[h.id]);
                    return (
                      <article key={h.id} className="expedition-ally" data-ally={h.id}>
                        <AllyArt id={h.id} skin={character.equippedAllySkins[h.id]} />
                        <span className="expedition-ally-name"><b>{h.name}</b><small className={`rar-${ALLY_RARITY[h.id].toLowerCase()}`}>{ALLY_RARITY[h.id]} ★{stars}</small></span>
                        <span className="expedition-hours">
                          {EXPEDITION_HOURS.map((hours) => {
                            const r = expeditionReward(h.id, stars, hours);
                            return (
                              <button key={hours} type="button" disabled={full} onClick={() => void sendExpedition(h.id, hours)}>
                                <b>{hours}시간</b>
                                <small>조각 {r.shards} · 석 {r.materials}{r.gems > 0 ? ` · 보석 ${r.gems}` : ""}</small>
                              </button>
                            );
                          })}
                        </span>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })()}
        {tab === "heroes" && (
          <article className="titans-card party-panel">
            <div className="party-panel-head">
              <strong>
                원정대 편성 {character.partyIds.length}/{partySlots}
              </strong>
              <small>
                {partySlots < 6
                  ? `성벽 ${character.towerBestFloor < 50 ? 50 : 100}층 등반 시 슬롯 +1`
                  : "슬롯 최대"}
              </small>
            </div>
            <div className="party-synergies">
              {synergy.list.map((s) => (
                <span key={s.id} className={`synergy-chip ${s.active ? "on" : ""}`} title={s.desc}>
                  {s.name}
                </span>
              ))}
              {/* 역할 실효과 — 탱커 도발(보스 시간) · 힐러 축복(스킬 쿨) */}
              {(() => {
                const role = partyRoleEffects(character.partyIds);
                return (
                  <>
                    <span className={`synergy-chip role-chip ${role.tanks > 0 ? "on" : ""}`} title="탱커 1명당 보스 제한시간 +5초 (최대 2명)">도발 +{role.bossTimeBonus}초</span>
                    <span className={`synergy-chip role-chip ${role.healers > 0 ? "on" : ""}`} title="힐러 1명당 스킬 쿨타임 −10% (최대 2명)">축복 쿨 −{Math.round((1 - role.cooldownMult) * 100)}%</span>
                  </>
                );
              })()}
              {/* 동료 특성 실효과 (2026-10-08) · 약점 상성 — 편성이 보스에서 시험받는다 */}
              {allyFeatureEffects(character.partyIds).active.map((id) => (
                <span key={id} className="synergy-chip feature-chip on" title={ALLY_FEATURES[id].desc}>{ALLY_FEATURES[id].label}</span>
              ))}
              <span className="synergy-chip weak-chip on" title="보스 약점(불·바람·땅)이 뜰 때 같은 속성 동료는 피해 ×1.6 — 세 속성을 고루 두면 어떤 약점이든 답이 있다">
                약점 상성 불 {partyWeakMatches(character.partyIds, "fire")} · 바람 {partyWeakMatches(character.partyIds, "wind")} · 땅 {partyWeakMatches(character.partyIds, "earth")}
              </span>
            </div>
            <div className="party-tools">
              <div className="role-filter" role="group" aria-label="역할 필터">
                {(["all", "melee", "ranged", "tank", "healer"] as const).map((role) => (
                  <button key={role} type="button" className={allyFilter === role ? "on" : ""} onClick={() => setAllyFilter(role)}>
                    {role === "all" ? "전체" : ROLE_LABEL[role]}
                  </button>
                ))}
              </div>
              <button type="button" className="recommend-party" onClick={() => void recommendParty()}>
                추천 편성
              </button>
            </div>
            {/* 동료 소환 (확률형 재설계) — 픽업 2명 노출 · 1회/10연 · 천장 카운터 · 확률 공시 */}
            <div className="gacha-panel" aria-label="동료 소환">
              <div className="gacha-head">
                <strong>동료 소환</strong>
                <button type="button" className="gacha-rates-link" onClick={() => setShowGachaRates(true)}>확률 보기</button>
              </div>
              {gacha.pickups.length > 0 ? (
                <div className="gacha-pickups">
                  {gacha.pickups.map((id) => {
                    const h = HEROES.find((x) => x.id === id)!;
                    return (
                      <div key={id} className={`gacha-pickup rarity-${ALLY_RARITY[id].toLowerCase()}`}>
                        <AllyArt id={id} />
                        <b style={{ color: RARITY_COLOR[ALLY_RARITY[id]] }}>{ALLY_RARITY[id]} 픽업 ×2</b>
                        <small>{h.name}{save.heroes[id] > 0 ? " · 보유" : ` · ${TIER_LABEL[ALLY_RARITY[id]]}`}</small>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="gacha-empty">이 지역의 동료를 모두 만났습니다 — 성문 방어으로 다음 지역을 개척하면 새 픽업이 열립니다</p>
              )}
              <div className="gacha-actions">
                <button type="button" disabled={redGems < GACHA.singleCost || gacha.entries.length === 0} onClick={() => void summonAlly(1)}>
                  1회 <small><GemMark />{GACHA.singleCost}</small>
                </button>
                <button type="button" className="gacha-ten" disabled={redGems < GACHA.tenCost || gacha.entries.length === 0} onClick={() => void summonAlly(10)}>
                  10연 <small><GemMark />{GACHA.tenCost} · SR 이상 1 보장</small>
                </button>
              </div>
              <small className="gacha-pity">
                {gacha.entries.some((e) => e.rarity === "SSR") ? "전설" : "최고 등급"} 확정까지 {Math.max(1, GACHA.pityLimit - Math.min(GACHA.pityLimit - 1, character.gachaPity))}회 · 중복 시 조각 R {GACHA.dupeShards.R} / SR {GACHA.dupeShards.SR} / SSR {GACHA.dupeShards.SSR} · 뽑은 동료는 빈 슬롯에 자동 출전
              </small>
            </div>
            {expeditionsDone > 0 && (
              <button type="button" className="expedition-claim" onClick={() => void claimExpeditions()}>
                <img src={assetUrl("ui/idle/expedition.png")} alt="" aria-hidden="true" />
                파견 {expeditionsDone}건 귀환 — 보상 받기
              </button>
            )}
            {expeditionsDone === 0 && character.expeditions.length > 0 && (
              <p className="expedition-progress">
                <img src={assetUrl("ui/idle/expedition.png")} alt="" aria-hidden="true" />
                파견 {character.expeditions.length}팀 진행 중
              </p>
            )}
          </article>
        )}
        {tab === "gacha" && (
          <section className="gacha-stage-page" aria-label="동료 뽑기">
            {/* 자리표시자 마감: 배지 = 픽업 최고 등급, 제목 = 지역·픽업 이름, 게이지 = 천장 진행도(gachaPity/60) */}
            <div className="gacha-stage-hero">
              {gacha.pickups.length > 0 && (() => {
                const best = gacha.pickups.map((id) => ALLY_RARITY[id]).sort((a, b) => TIERS.indexOf(b) - TIERS.indexOf(a))[0];
                return <span className="gacha-rarity-badge" style={{ background: `linear-gradient(135deg, ${RARITY_COLOR[best]}, #ec4899)` }}>{best} 픽업</span>;
              })()}
              <div className="gacha-pickup-showcase">
                {gacha.pickups.slice(0, 2).map((id) => <AllyArt key={id} id={id} />)}
              </div>
              <div>
                <small>{area.name.toUpperCase()} · PICK UP{gacha.rotationPool > 2 ? ` · 회전까지 ${gacha.rotationDaysLeft}일` : ""}</small>
                <h2>{gacha.pickups.length ? gacha.pickups.map((id) => HEROES.find((h) => h.id === id)?.name).join(" · ") : "다음 지역 픽업 준비 중"}</h2>
                <p>{gacha.pickups.length ? `픽업 확률 2배(같은 등급 안) · 전설 이상 ${gacha.pickups.length}명 · ${gacha.rotationDaysLeft}일마다 교대` : "픽업 준비 중"} · 10회 소환 시 SR 이상 1명 보장</p>
              </div>
            </div>
            {(() => {
              const sp = summonLevelProgress(character.gachaPulls);
              // 다음 레벨 확률도 지금 풀(개척 지역)로 — 기본표(tierRates)를 그대로 보이면 지역에 전설이 없을 때 받을 수 없는 확률을 공시하게 된다
              const nextBand = sp.to !== null ? gachaPool(save.stage, character.pioneeredArea, Date.now(), sp.level + 1).bandRate : null;
              const topNow = gacha.bandRate.SSR + gacha.bandRate.UR + gacha.bandRate.LR;
              const topNext = nextBand ? nextBand.SSR + nextBand.UR + nextBand.LR : topNow;
              return (
                <>
                  <div className="gacha-level summon-level">
                    <b>뽑기 Lv.{sp.level}</b>
                    <i><em style={{ width: `${sp.to === null ? 100 : Math.min(100, ((character.gachaPulls - sp.from) / (sp.to - sp.from)) * 100)}%` }} /></i>
                    <span>{sp.to === null ? "최고 레벨" : topNext <= 0 ? `Lv.${sp.level + 1} 까지 ${sp.to - character.gachaPulls}회 · 이 지역엔 전설 없음` : `Lv.${sp.level + 1} 까지 ${sp.to - character.gachaPulls}회 · 전설 이상 ${(topNow * 100).toFixed(1)}% → ${(topNext * 100).toFixed(1)}%`}</span>
                  </div>
                  <ul className="summon-tier-rates" aria-label="지금 등급 확률">
                    {TIERS.map((t) => <li key={t} className={`rarity-${t.toLowerCase()}`}><b>{TIER_LABEL[t]}</b><small>{gacha.bandRate[t] > 0 ? `${(gacha.bandRate[t] * 100).toFixed(gacha.bandRate[t] < 0.01 ? 2 : 1)}%` : "—"}</small></li>)}
                  </ul>
                </>
              );
            })()}
            <div className="gacha-level">
              <b>천장 {Math.min(GACHA.pityLimit, character.gachaPity)}/{GACHA.pityLimit}</b>
              <i><em style={{ width: `${Math.min(100, (character.gachaPity / GACHA.pityLimit) * 100)}%` }} /></i>
              <span>{gacha.entries.some((e) => TIER_RANK[e.rarity] >= TIER_RANK.SSR) ? "전설 이상" : "최고 등급"} 확정까지 {Math.max(1, GACHA.pityLimit - Math.min(GACHA.pityLimit - 1, character.gachaPity))}회</span>
            </div>
            {/* 초월 천장 — 초반 지역에서도 쌓인다. 풀에 초월이 없으면 확정은 초월 지역(FIRST_LR_STAGE~)에서 */}
            <div className="gacha-level gacha-lr-pity">
              <b>초월 천장 {character.gachaLrPity}/{GACHA.lrPityLimit}</b>
              <i><em style={{ width: `${Math.min(100, (character.gachaLrPity / GACHA.lrPityLimit) * 100)}%` }} /></i>
              <span>{gacha.entries.some((e) => e.rarity === "LR")
                ? `초월 확정까지 ${Math.max(1, GACHA.lrPityLimit - character.gachaLrPity)}회`
                : character.gachaLrPity >= GACHA.lrPityLimit - 1
                  ? `가득 참 · STAGE ${FIRST_LR_STAGE} 지역 첫 소환에 초월 확정`
                  : `쌓는 중 · 초월은 STAGE ${FIRST_LR_STAGE} 지역부터`}</span>
            </div>
            {momentOfferCard}
            <div className="gacha-page-actions">
              <button type="button" disabled={redGems < GACHA.singleCost || gacha.entries.length === 0} onClick={() => void summonAlly(1)}><b>1회 소환</b><small><GemMark />{GACHA.singleCost}</small></button>
              <button type="button" disabled={redGems < GACHA.tenCost || gacha.entries.length === 0} onClick={() => void summonAlly(10)}><b>10회 소환</b><small><GemMark />{GACHA.tenCost}</small>{character.gachaPulls === 0 && <em className="first-ten-badge">첫 10연 전설 확정</em>}</button>
              <button type="button" onClick={() => setShowGachaRates(true)}><b>확률 정보</b><small>등급별 확률 보기</small></button>
            </div>
          </section>
        )}
        {tab === "heroes" && <div className="ally-roster-grid" aria-label={`동료 도감 ${HEROES.length}명`} data-roster-count={HEROES.filter((h) => allyFilter === "all" || ALLY_ROLE[h.id] === allyFilter).length}>
          <header className="ally-roster-summary"><strong>동료 도감 {HEROES.length}명</strong><small>스테이지 해금 없음 — 뽑기(등급 확률) · 골드 소환으로 만난다</small>
            <ul className="codex-tier-rates" aria-label="등급별 뽑기 확률">{TIERS.map((t) => <li key={t} className={`rarity-${t.toLowerCase()}`}><b>{TIER_LABEL[t]}</b><small>{(gacha.bandRate[t] * 100).toFixed(t === "LR" || t === "UR" ? 2 : 1)}%</small></li>)}</ul>
          </header>
          {/* 13장 세로 스크롤 → 6장씩 쪽 (2026-10-08 사용자: "동료 쪽 스크롤 남아 있는 거 리팩토링") */}
          {(() => { const roster = HEROES.filter((h) => allyFilter === "all" || ALLY_ROLE[h.id] === allyFilter); const pages = Math.max(1, Math.ceil(roster.length / ALLY_PAGE_SIZE)); const pg = Math.min(allyPage, pages - 1); return pages > 1 ? (
            <nav className="ally-pages" role="tablist" aria-label="동료 쪽">{Array.from({ length: pages }, (_, i) => <button key={i} type="button" role="tab" aria-selected={pg === i} className={pg === i ? "on" : ""} onClick={() => setAllyPage(i)}>{i * ALLY_PAGE_SIZE + 1}–{Math.min(roster.length, (i + 1) * ALLY_PAGE_SIZE)}</button>)}</nav>
          ) : null; })()}
          {HEROES.filter((h) => allyFilter === "all" || ALLY_ROLE[h.id] === allyFilter).slice(Math.min(allyPage, Math.max(0, Math.ceil(HEROES.filter((h) => allyFilter === "all" || ALLY_ROLE[h.id] === allyFilter).length / ALLY_PAGE_SIZE) - 1)) * ALLY_PAGE_SIZE, Math.min(allyPage, Math.max(0, Math.ceil(HEROES.filter((h) => allyFilter === "all" || ALLY_ROLE[h.id] === allyFilter).length / ALLY_PAGE_SIZE) - 1)) * ALLY_PAGE_SIZE + ALLY_PAGE_SIZE).map((h) => {
            const lv = save.heroes[h.id];
            const gemCost = SHOP_ALLY_GEM_COST[h.id];
            const shopOnly = gemCost !== undefined;
            // 출전 허가(첫 10연 전설)로 가진 동료는 잠금으로 보이지 않는다 — DPS · 체험 배율을 보여 준다 (2026-10-23)
            // 2026-10-28 스테이지 해금 없음 — 잠금은 상점 전용 미보유만. 아직 없는 동료는 등급 · 이 동료의 뽑기 확률을 보인다
            const locked = shopOnly && lv === 0;
            const drawRate = gacha.entries.find((e) => e.id === h.id)?.rate ?? 0;
            const cost = heroUpgradeCost(h, lv);
            const rarity = ALLY_RARITY[h.id];
            const stars = effectiveStars(character.allyStars[h.id], lv);
            const shards = character.allyShards[h.id];
            const nextCost = shardCostToNext(h.id, Math.max(1, stars));
            const cap = STAR_CAP[rarity];
            const mult = starMultiplier(Math.max(1, stars));
            const inParty = character.partyIds.includes(h.id);
            const expedition = character.expeditions.find((e) => e.allyId === h.id);
            const expeditionLeft = expedition ? Math.max(0, expedition.endsAt - Date.now()) : 0;
            const skinEntry = Object.entries(ALLY_SKINS).find(
              ([skinId, def]) => def.ally === h.id && character.ownedAllySkins.includes(skinId),
            );
            return (
              <article key={h.id} data-ally={h.id} className={`titans-card ally-card rarity-${rarity.toLowerCase()} ${inParty ? "in-party" : ""} ${expedition ? "on-expedition" : ""} ${openCard === `ally:${h.id}` ? "is-open" : ""}`} onClick={toggleCard(`ally:${h.id}`)}>
                <AllyArt id={h.id} skin={character.equippedAllySkins[h.id]} />
                <div>
                  <strong>
                    <em className="rarity-tag" style={{ color: RARITY_COLOR[rarity] }}>{rarity}</em>
                    <em className="role-tag">{ROLE_LABEL[ALLY_ROLE[h.id]]}</em>
                    <em className={`role-tag element-${ALLY_ELEMENT[h.id]}`}>{ELEMENT_LABEL[ALLY_ELEMENT[h.id]]}</em>
                    {h.name} {lv > 0 ? `· Lv.${lv}` : ""}
                  </strong>
                  {lv > 0 && !canFieldAlly(h.id, h.unlockStage, fieldCeiling, character.claimedRewards) && <small className="ceiling-tag" title="성문 방어로 지역을 개척하면 출전합니다">STAGE {h.unlockStage} 개척 후 출전</small>}
                  {lv > 0 && (
                    <span className="ally-stars" aria-label={`성급 ${stars}/${cap}`}>
                      {Array.from({ length: cap }, (_, i) => (
                        <i key={i} className={i < stars ? "on" : ""}>★</i>
                      ))}
                      {mult > 1 && <b>×{mult}</b>}
                    </span>
                  )}
                  <p>
                    {shopOnly && lv === 0
                      ? `보석 상점 전용 동료 · ${h.attackType}`
                      : locked
                        ? `${TIER_LABEL[rarity]} · ${h.attackType}`
                        : `${h.attackType} · DPS ${formatGold(heroDps(h, lv || 1) * mult * trialDpsMul(h, trialCeiling(fieldCeiling, save.bestStage)))}${lv > 0 ? ` → ${formatGold(heroDps(h, lv + 1) * mult * trialDpsMul(h, trialCeiling(fieldCeiling, save.bestStage)))}` : ""}${(save.acorns.allyAmmo[h.id] ?? 0) > 0 ? ` · 도토리 Lv.${save.acorns.allyAmmo[h.id]}` : ""}${trialDpsMul(h, trialCeiling(fieldCeiling, save.bestStage)) < 1 ? ` · 체험 ×${trialDpsMul(h, trialCeiling(fieldCeiling, save.bestStage)).toFixed(2)}(STAGE ${h.unlockStage} 개척 시 제 힘)` : ""}`}
                  </p>
                  {lv === 0 && !shopOnly && <small className="ally-draw-rate">뽑기 {(drawRate * 100).toFixed(drawRate < 0.001 ? 3 : 2)}% · 골드 소환 {formatGold(h.baseCost)}G</small>}
                  <small className="ally-feature">{h.feature}</small>
                  <AllySigInfo hero={h} />
                  {lv > 0 && (
                    <small className="ally-shards">
                      조각 {shards}
                      {nextCost !== null ? ` / ${nextCost} · ★${Math.max(1, stars) + 1} 승급` : " · 최대 성급"}
                    </small>
                  )}
                  {lv > 0 && skinEntry && (
                    <button
                      type="button"
                      className={`ally-skin-chip ${character.equippedAllySkins[h.id] === skinEntry[0] ? "on" : ""}`}
                      onClick={() => void toggleAllySkin(h.id, skinEntry[0])}
                    >
                      {skinEntry[1].name.split(" ")[0]} 스킨 {character.equippedAllySkins[h.id] === skinEntry[0] ? "장착 중" : "장착"}
                    </button>
                  )}
                </div>
                <div className="ally-card-actions">
                  {shopOnly && lv === 0 ? (
                    <button type="button" disabled={redGems < (gemCost ?? 0)} onClick={() => void buyShopAlly(h.id)}>
                      <GemMark />{gemCost}
                    </button>
                  ) : (
                    <button type="button" disabled={locked || save.gold < cost} onClick={() => buyHero(h.id)}>
                      {lv === 0 ? "소환" : "레벨업"}
                    </button>
                  )}
                  {lv > 0 && nextCost !== null && (
                    <button
                      type="button"
                      className="ally-star-up"
                      disabled={shards < nextCost}
                      onClick={() => void starUpAlly(h.id)}
                    >
                      ★ 승급
                    </button>
                  )}
                  {lv > 0 && !expedition && (
                    <button
                      type="button"
                      className={`ally-party-toggle ${inParty ? "benched-action" : ""}`}
                      onClick={() => void toggleParty(h.id)}
                    >
                      {inParty ? "벤치로" : "출전"}
                    </button>
                  )}
                  {lv > 0 && expedition && (expeditionLeft > 0 ? (
                    <span className="ally-expedition-status">
                      파견 중 · {(() => { const min = Math.ceil(expeditionLeft / 60000); return min >= 60 ? `${Math.floor(min / 60)}시간 ${min % 60}분` : `${min}분`; })()} 남음
                    </span>
                  ) : (
                    <button type="button" className="ally-expedition-status returned" onClick={(ev) => { ev.stopPropagation(); void claimExpeditions(); }}>
                      파견 귀환 · 보상 받기
                    </button>
                  ))}
                  {lv > 0 && !inParty && !expedition && character.expeditions.length < EXPEDITION_MAX && (
                    <span className="ally-expedition-send">
                      {EXPEDITION_HOURS.map((hours) => (
                        <button key={hours} type="button" onClick={() => void sendExpedition(h.id, hours)}>
                          {hours}h
                        </button>
                      ))}
                    </span>
                  )}
                </div>
              </article>
            );
          })}</div>}

        {tab === "skills" && (
          <article className="titans-card skill-preset-card">
            <div className="party-panel-head">
              <strong>모험가 스킬</strong>
              <small>{WEAPON_LABEL[weaponKind]} 스킬 세트 — 무기마다 따로 기억 · 학습한 스킬만 장착 · 예상 DPS 보정 +{skillDpsPreview}%</small>
            </div>
            {/* 모험가 스킬 연계 (2026-10-06) — 스킬은 동료가 아니라 모험가가 쓴다: 초상 → 시전 순서 ①~④ → 패시브 */}
            <div className="hero-skill-combo" aria-label="모험가 스킬 시전 순서">
              <span className="combo-hero" style={{ backgroundImage: `url(${heroPortrait()})`, backgroundSize: "contain", backgroundPosition: "center" }} aria-hidden="true" />
              {SLOT_ORDER.map((slot, i) => {
                const eq = save.skillInventory.equipped[slot];
                const locked = !qaOpen && slotLevels(character)[slot] <= 0;
                return (
                  <button key={slot} type="button" className={`combo-step ${slot === "passive" ? "passive" : ""} ${eq ? "on" : ""} ${locked ? "locked" : ""} ${skillSlotTab === slot ? "focus" : ""} ${equipFx && eq === equipFx.id ? "equip-pop" : ""}`} onClick={() => { setSkillSlotTab(slot); window.requestAnimationFrame(() => document.querySelector(`.skill-learn-card[data-slot="${slot}"]`)?.scrollIntoView({ block: "center", behavior: "smooth" })); }} title={SLOT_LABEL[slot]}>
                    {eq ? <SkillIcon id={eq} size={34} /> : <span className="combo-empty">{locked ? "🔒" : "+"}</span>}
                    <small>{slot === "passive" ? "상시" : `${i + 1}`} {SLOT_LABEL[slot]}</small>
                    <b className="combo-name">{eq ? SKILLS.find((x) => x.id === eq)?.name ?? "" : locked ? "잠김" : "비어 있음"}</b>
                  </button>
                );
              })}
            </div>
            <div className="preset-row">
              {SKILL_PRESETS.map((preset) => (
                <button key={preset.id} type="button" onClick={() => applyPreset(preset)} title={preset.desc}>
                  <b>{preset.name}</b>
                  <small>{preset.desc}</small>
                </button>
              ))}
            </div>
          </article>
        )}
        {/* 전체 스킬 — 등급 묶음(일반 → 초월, 2026-10-28 사용자: "복잡한 탭들 모두 삭제 · 전체 스킬 등급별"). 슬롯(시동기 · 연계 · 마무리 · 패시브)은 카드의 칩으로.
            예전 슬롯 탭 5개는 한 번에 한 슬롯(3장)만 보여 줘서 무엇이 있는지 알려면 다섯 번 눌러야 했다. 조합 칸을 누르면 그 슬롯 카드로 내려가 표시(slot-focus) */}
        {/* 2026-10-28 (사용자: "스킬탭 … 등급별 이 내용은 삭제하고 … 윤곽선으로만 등급 · 스킬 장착시스템이 너무 불편해 조금더 가독성좋게") —
            등급 머리줄 · 등급 글자를 걷고 카드 윤곽선 색(동료 등급색)으로만. 목록은 장착 칸(시동기 → 연계 A → 연계 B → 마무리 → 패시브)마다 묶고,
            머리줄에 그 칸에 지금 낀 스킬을 보여 준다 — 무엇을 어디에 끼우는지 한눈에 */}
        {tab === "skills" &&
          SLOT_ORDER.flatMap((slotOf, slotIdx) => {
            const inSlot = SKILLS.filter((sk) => sk.slot === slotOf).sort((x, y) => TIERS.indexOf(SKILL_TIER[x.id]) - TIERS.indexOf(SKILL_TIER[y.id]));
            if (!inSlot.length) return [];
            const eqId = save.skillInventory.equipped[slotOf];
            const eqDef = eqId ? SKILLS.find((x) => x.id === eqId) : undefined;
            const shut = !qaOpen && slotLevels(character)[slotOf] <= 0;
            return [
              <h3 key={`slot-${slotOf}`} className={`skill-slot-head ${eqDef ? "has-eq" : ""} ${shut ? "locked" : ""}`} data-slot={slotOf}>
                <b>{slotOf === "passive" ? "상시" : `${slotIdx + 1}`}</b><span>{SLOT_LABEL[slotOf]}</span>
                <small>{shut ? "🔒 연습실에서 열기" : eqDef ? <>장착 · <em>{eqDef.name}</em></> : "비어 있음 — 아래에서 골라 장착"}</small>
              </h3>,
              ...inSlot.map((sk) => {
            const learned = save.skillInventory.learned.includes(sk.id);
            const equipped = save.skillInventory.equipped[sk.slot] === sk.id;
            const level = save.skillInventory.levels[sk.id];
            const learnedInType = SKILLS.filter((skill) => skill.slot === sk.slot && save.skillInventory.learned.includes(skill.id)).length;
            const upgradeCost = Math.floor(240 * Math.pow(1.75, Math.max(0, level - 1)));
            const beatSkill = BEAT_SKILL_BY_SLOT[sk.slot];
            const mastery = character.beatSkills[beatSkill];
            const slotLevel = slotLevels(character)[sk.slot];
            const slotShut = slotLevel <= 0 && !qaOpen;
            const toNext = masteryToNextSlotLevel(mastery);
            const tier = SKILL_TIER[sk.id];
            const cards = save.skillInventory.copies?.[sk.id] ?? 0;
            // 카드 값은 Lv 따라 1 · 2 · 3 · 5장(2026-10-28 skillGacha.skillCardsPerLevel) — 지금 카드로 오를 Lv · 다음 Lv 에 드는 카드
            const cardPlan = skillCardPlan(save.skillInventory, sk.id);
            return <article key={sk.id} data-slot={sk.slot} data-tier={tier} title={`${TIER_LABEL[tier]} 스킬`} className={`titans-card skill-learn-card skill-outline rarity-${tier.toLowerCase()} tier-${tier} ${equipFx?.id === sk.id ? "equip-pop" : ""} ${skillSlotTab === sk.slot ? "slot-focus" : ""} element-${sk.element} ${equipped ? "equipped" : ""} ${slotShut ? "slot-locked" : ""} ${learned ? "" : "unlearned"} ${openCard === `skill:${sk.id}` ? "is-open" : ""}`} onClick={toggleCard(`skill:${sk.id}`)}>
              <SkillIcon id={sk.id} />
              <div>
                <strong>
                  {sk.name} <em className="skill-element-tag">{ELEMENT_LABEL_KR[sk.element]}</em>
                  {learned && <em className="skill-level-tag">Lv.{level}/{sk.maxLevel}</em>}
                  {equipped && <em className="skill-equipped-tag">장착</em>}
                </strong>
                <p className="skill-effect">{skillEffectLabel(sk.id, Math.max(1, level))}</p>
                <p>{sk.desc}{learned && level < sk.maxLevel ? ` · 다음 Lv: ${skillEffectLabel(sk.id, level + 1).split(" · ")[0]}` : ""}</p>
                <small className={`slot-link ${slotShut ? "locked" : ""}`}>
                  <em>{SKILL_LABEL[beatSkill]}</em> 숙련 {mastery} · 슬롯 {slotLevel > 0 ? `Lv.${slotLevel}` : slotShut ? "잠김" : "테스트 해금"}
                  {toNext !== null && ` · 다음까지 ${toNext}`}
                  {slotLevel > 0 && ` · 방치 효율 +${(slotLevel * IDLE.ratePerSlotLevel * 100).toFixed(1)}%p`}
                </small>
                {!learned && <small>학습 비용 SP {sk.learnSpCost} · 코어 {sk.learnCoreCost}{cards > 0 ? " · 또는 카드 1장" : ""} · {SLOT_LABEL[sk.slot]} {learnedInType}/{skillTypeCapacity}</small>}
                {cards > 0 && <small className="skill-card-count">스킬 카드 {cards}장{learned ? (cardPlan.used > 0 ? ` · 소진하면 Lv.${cardPlan.toLevel}` : level < sk.maxLevel ? ` · 다음 Lv 에 ${cardPlan.nextNeed}장` : "") : ""}</small>}
              </div>
              <div className="skill-card-actions">
                <button type="button" className={`skill-equip-btn ${equipped ? "is-equipped" : learned ? "is-ready" : "is-learn"}`} disabled={!learned && (learnedInType >= skillTypeCapacity || skillPoints < sk.learnSpCost || save.skillInventory.skillCores < sk.learnCoreCost)} onClick={() => learned ? toggleSkill(sk.id) : void learnSkill(sk.id)}>
                  {learned ? equipped ? "장착됨 · 해제" : eqDef && eqDef.id !== sk.id ? `${eqDef.name} 대신 장착` : "장착" : "학습"}
                </button>
                {learned && <button type="button" className="skill-level-button" disabled={level >= sk.maxLevel || save.gold < upgradeCost} onClick={() => upgradeSkill(sk.id)}>{level >= sk.maxLevel ? "MAX" : `${formatGold(upgradeCost)}G 강화`}</button>}
                {cards > 0 && (learned ? cardPlan.used > 0 : true) && <button type="button" className="skill-card-consume" data-skill={sk.id} disabled={!learned && learnedInType >= skillTypeCapacity} onClick={() => consumeSkillCard(sk.id)}>{learned ? `카드 ${cardPlan.used}장 소진 · Lv.${cardPlan.toLevel}` : "카드로 학습"}</button>}
              </div>
            </article>
          }),
            ];
          })}
        {tab === "premium" && (
          <>
            <nav className="premium-category-tabs" aria-label="상점 카테고리">
              {([['currency','재화'],['package','패키지'],['relic','유물'],['skill','스킬'],['ally','동료'],['pet','펫'],['title','칭호'],['weapon','외형']] as const).map(([id,label])=><button key={id} type="button" className={premiumCategory===id?'on':''} onClick={()=>setPremiumCategory(id)}>{label}</button>)}
            </nav>
            {/* 유물 뽑기 (2026-10-26 보석 → 조각 · 10-27 재화별 · 뽑기 화면) · 3판 2026-10-28 (사용자: "유물도 … 등급을 동료처럼") —
                36종 6등급. 재화마다 등급 확률이 다른 뽑기 셋: 골드(일반 ~ 영웅) · 강화석(희귀 ~ 신화) · 보석(영웅 ~ 초월). 다 모은 유물은 빠진다 */}
            {/* 유물 뽑기 4판 (2026-10-28, 사용자: "상점 유물탭 ui 패키지 아이템 각각 ui처럼 변경") — 재화 탭 · 진열 대신 패키지 칸처럼
                재화마다 머리줄 하나 + 1회 · 10회 상품 칸. 확률 정보는 머리줄의 단추로 그 재화 아래에 펼친다(유물별 확률 공시) */}
            {premiumCategory === "relic" && (
              <section className="relic-draw-page relic-gacha-page relic-shop-list" aria-label="유물 뽑기">
                <p className="premium-subhead">유물 뽑기 <small>조각 {RELIC_SHARDS_PER_STAR}개 = ★1 · 같은 유물 조각은 유물 탭에서 소진해 ★ 올리기 · 같은 계열 3개면 세트</small></p>
                {RELIC_BANNERS.map((banner) => {
                  // 들어간 조각 + 남은 조각(2026-10-28 중복 소진) — 남은 조각으로 채울 수 있는 유물은 나오지 않는다
                  const merged = relicMerged(character.relics, character.relicSpare);
                  const rates = relicDrawRates(merged, banner);
                  const open = rates.filter((x) => x.rate > 0).length;
                  const tierRates = relicBannerTierRates(merged, banner);
                  const bannerTiers = TIERS.filter((t) => (RELIC_BANNER_RATES[banner][t] ?? 0) > 0);
                  const topTier = bannerTiers[bannerTiers.length - 1];
                  const cost = relicBannerCost(banner, save.stage);
                  const have = banner === "gold" ? save.gold : banner === "stone" ? character.enhancementMaterials : redGems;
                  const mark = banner === "gold" ? <CurrencyIcon kind="gold" /> : banner === "stone" ? <img className="relic-cost-stone" src={assetUrl("ui/attendance/enhance-stone.png")} alt="" aria-hidden="true" /> : <GemMark />;
                  const fmt = (n: number) => (banner === "gold" ? formatGold(n) : n.toLocaleString());
                  const pool = RELICS.filter((r) => bannerTiers.includes(r.tier));
                  const ownedInPool = pool.filter((r) => relicStars(character.relics, r.id) >= 1).length;
                  const face = pool.filter((r) => r.tier === topTier)[0] ?? pool[0];
                  const rateLine = bannerTiers.map((t) => `${TIER_LABEL[t]} ${(tierRates[t] ?? 0) > 0 ? `${((tierRates[t] ?? 0) * 100).toFixed(1)}%` : "완성"}`).join(" · ");
                  const ratesOpen = showRelicRates && relicShopBanner === banner;
                  const off = Math.round((1 - cost.ten / (cost.single * 10)) * 100);
                  return (
                    <Fragment key={banner}>
                      <h4 className={`paid-group-head relic-banner-head banner-${banner}`} data-banner={banner}>
                        <span className="relic-banner-title">{RELIC_BANNER_LABEL[banner]} 유물 <small>{TIER_LABEL[bannerTiers[0]]} ~ {TIER_LABEL[topTier]} · 보유 {ownedInPool}/{pool.length}종 · {RELIC_BANNER_LABEL[banner]} {fmt(have)}</small></span>
                        <button type="button" className="relic-gacha-rates" aria-expanded={ratesOpen} onClick={() => { setRelicShopBanner(banner); setShowRelicRates(!ratesOpen); }}>{ratesOpen ? "확률 접기" : "확률 정보"}</button>
                      </h4>
                      {([1, 10] as const).map((n) => (
                        <article key={n} className={`titans-card premium-product-card relic-draw-product banner-${banner}`} data-banner={banner} data-count={n}>
                          <span className={`relic-product-thumb rarity-${topTier.toLowerCase()}`} aria-hidden="true">
                            <img src={assetUrl(relicIconUrl(face.id))} alt="" />
                            {n === 10 && <i>×10</i>}
                          </span>
                          <div>
                            <strong>{RELIC_BANNER_LABEL[banner]} 유물 {n}회 뽑기 {n === 10 ? (off > 0 ? <em>{off}% 할인</em> : <em>10회</em>) : <em>{TIER_LABEL[topTier]} 등장</em>}</strong>
                            <p>{open > 0 ? `${bannerTiers.map((t) => TIER_LABEL[t]).join(" · ")} 유물 ${pool.length}종 중 ${n === 1 ? "하나" : "10번"}` : "이 뽑기의 유물을 모두 ★5 로 모았어요"} · {rateLine}</p>
                          </div>
                          <button type="button" disabled={have < (n === 1 ? cost.single : cost.ten) || open === 0} onClick={() => void drawRelic(banner, n)}>{mark}{fmt(n === 1 ? cost.single : cost.ten)}</button>
                        </article>
                      ))}
                      {ratesOpen && (
                        <div className="relic-rates-groups" aria-label={`${RELIC_BANNER_LABEL[banner]} 유물 뽑기 확률`}>
                          {bannerTiers.map((t) => (
                            <section key={t} className={`relic-rates-group rarity-${t.toLowerCase()}`}>
                              <h5><b>{TIER_LABEL[t]}</b><span>{((tierRates[t] ?? 0) * 100).toFixed(1)}%</span></h5>
                              <ul className="relic-rates">
                                {rates.filter((x) => relicDef(x.id).tier === t).map((x) => (
                                  <li key={x.id}><img src={assetUrl(relicIconUrl(x.id))} alt="" aria-hidden="true" /><span>{RELIC_FAMILY_LABEL[relicDef(x.id).family]} · {relicDef(x.id).name}</span><b>{x.rate > 0 ? `${(x.rate * 100).toFixed(2)}%` : "완성 · 제외"}</b></li>
                                ))}
                              </ul>
                            </section>
                          ))}
                        </div>
                      )}
                    </Fragment>
                  );
                })}
              </section>
            )}
            {/* 스킬 뽑기 (2026-10-28, 사용자: "스킬도 상점에서 돈으로 배울수 있게 동료, 유물처럼") — 유물 칸과 같은 패키지 줄 칸.
                골드(일반 ~ 영웅) · 보석(영웅 ~ 초월). 뽑은 스킬은 카드 — 사냥터 스킬 탭에서 카드로 배우거나 소진해 Lv +1. 스킬별 확률 공시 */}
            {premiumCategory === "skill" && (
              <section className="relic-draw-page relic-gacha-page relic-shop-list skill-shop-list" aria-label="스킬 뽑기">
                <p className="premium-subhead">스킬 뽑기 <small>뽑은 스킬은 카드 · 안 배운 스킬은 카드 1장으로 학습 · 같은 스킬 카드는 소진해 Lv +1 (사냥터 → 스킬)</small></p>
                {SKILL_BANNERS.map((banner) => {
                  const inv = save.skillInventory;
                  const rates = skillDrawRates(inv, banner);
                  const open = rates.filter((x) => x.rate > 0).length;
                  const tierRates = skillBannerTierRates(inv, banner);
                  const bannerTiers = TIERS.filter((t) => (SKILL_BANNER_RATES[banner][t] ?? 0) > 0);
                  const topTier = bannerTiers[bannerTiers.length - 1];
                  const cost = skillBannerCost(banner, save.stage, save.skillInventory);
                  const have = banner === "gold" ? save.gold : redGems;
                  const mark = banner === "gold" ? <CurrencyIcon kind="gold" /> : <GemMark />;
                  const fmt = (n: number) => (banner === "gold" ? formatGold(n) : n.toLocaleString());
                  const pool = SKILLS.filter((x) => bannerTiers.includes(SKILL_TIER[x.id]));
                  const learnedInPool = pool.filter((x) => inv.learned.includes(x.id)).length;
                  const face = pool.filter((x) => SKILL_TIER[x.id] === topTier)[0] ?? pool[0];
                  const rateLine = bannerTiers.map((t) => `${TIER_LABEL[t]} ${(tierRates[t] ?? 0) > 0 ? `${((tierRates[t] ?? 0) * 100).toFixed(1)}%` : "완성"}`).join(" · ");
                  const ratesOpen = skillRatesOpen === banner;
                  const off = Math.round((1 - cost.ten / (cost.single * 10)) * 100);
                  return (
                    <Fragment key={banner}>
                      <h4 className={`paid-group-head relic-banner-head skill-banner-head banner-${banner}`} data-banner={banner}>
                        <span className="relic-banner-title">{SKILL_BANNER_LABEL[banner]} 스킬 <small>{TIER_LABEL[bannerTiers[0]]} ~ {TIER_LABEL[topTier]} · 배움 {learnedInPool}/{pool.length}종 · {SKILL_BANNER_LABEL[banner]} {fmt(have)}</small></span>
                        <button type="button" className="relic-gacha-rates" aria-expanded={ratesOpen} onClick={() => setSkillRatesOpen(ratesOpen ? null : banner)}>{ratesOpen ? "확률 접기" : "확률 정보"}</button>
                      </h4>
                      {([1, 10] as const).map((n) => (
                        <article key={n} className={`titans-card premium-product-card relic-draw-product skill-draw-product banner-${banner}`} data-banner={banner} data-count={n}>
                          <span className={`relic-product-thumb skill-product-thumb rarity-${topTier.toLowerCase()}`} aria-hidden="true">
                            <SkillIcon id={face.id} size={36} />
                            {n === 10 && <i>×10</i>}
                          </span>
                          <div>
                            <strong>{SKILL_BANNER_LABEL[banner]} 스킬 {n}회 뽑기 {n === 10 ? (off > 0 ? <em>{off}% 할인</em> : <em>10회</em>) : <em>{TIER_LABEL[topTier]} 등장</em>}</strong>
                            <p>{open > 0 ? `${bannerTiers.map((t) => TIER_LABEL[t]).join(" · ")} 스킬 ${pool.length}종 중 ${n === 1 ? "하나" : "10번"}` : "이 뽑기의 스킬을 모두 최대 레벨까지 모았어요"} · {rateLine}</p>
                          </div>
                          <button type="button" disabled={have < (n === 1 ? cost.single : cost.ten) || open === 0} onClick={() => void drawSkill(banner, n)}>{mark}{fmt(n === 1 ? cost.single : cost.ten)}</button>
                        </article>
                      ))}
                      {ratesOpen && (
                        <div className="relic-rates-groups" aria-label={`${SKILL_BANNER_LABEL[banner]} 스킬 뽑기 확률`}>
                          {bannerTiers.map((t) => (
                            <section key={t} className={`relic-rates-group rarity-${t.toLowerCase()}`}>
                              <h5><b>{TIER_LABEL[t]}</b><span>{((tierRates[t] ?? 0) * 100).toFixed(1)}%</span></h5>
                              <ul className="relic-rates">
                                {rates.filter((x) => SKILL_TIER[x.id] === t).map((x) => (
                                  <li key={x.id}><SkillIcon id={x.id} size={28} /><span>{SLOT_LABEL[SKILLS.find((y) => y.id === x.id)?.slot ?? "starter"]} · {SKILLS.find((y) => y.id === x.id)?.name}</span><b>{x.rate > 0 ? `${(x.rate * 100).toFixed(2)}%` : "완성 · 제외"}</b></li>
                                ))}
                              </ul>
                            </section>
                          ))}
                        </div>
                      )}
                    </Fragment>
                  );
                })}
              </section>
            )}
            {/* 보석 소비형 상품 (LIVEOPS §3.3) — 확정 구매, 확률 없음 */}
            {premiumCategory === "ally" && <article className="titans-card premium-product-card gem-product">
              <CurrencyIcon kind="gem" />
              <div>
                <strong>성급 조각 선택팩 <em>주 {SHARD_PACK_WEEKLY_LIMIT}회/동료</em></strong>
                <p>원하는 동료의 조각 ×{SHARD_PACK_AMOUNT} · 확정 지급</p>
                <select
                  className="shard-pack-select"
                  value={shardPackTarget}
                  onChange={(e) => setShardPackTarget(e.target.value as TitanHeroId)}
                  aria-label="조각 받을 동료"
                >
                  {HEROES.filter((h) => save.heroes[h.id] > 0).map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} · 이번 주 {shardPackBoughtThisWeek(h.id)}/{SHARD_PACK_WEEKLY_LIMIT}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                disabled={redGems < 120 || shardPackBoughtThisWeek(shardPackTarget) >= SHARD_PACK_WEEKLY_LIMIT || save.heroes[shardPackTarget] <= 0}
                onClick={() => void buyShardPack()}
              >
                <GemMark />120
              </button>
            </article>}
            {/* 무기 외형 3종(진홍·빙하·황금) — 지금 장착한 무기 그림의 색 바꾸기 · 오라 (2026-10-27, 북 그림 대신) */}
            {/* 펫 (2026-10-28, 사용자: "상점에서도 팔게") — 도감 1,000 처치 대신 붉은 보석으로 바로 부화 · 장착. 부화한 펫은 장착 단추만 */}
            {premiumCategory === "pet" && <p className="premium-subhead">펫 <small>주인공 곁에서 같이 사냥 · 장착 1마리 효과</small></p>}
            {premiumCategory === "pet" && PET_IDS.map((pid) => {
              const def = PET_DEFS[pid];
              const lv = character.pets[pid] ?? 0;
              const on = character.activePet === pid;
              return (
                <article key={`pet-${pid}`} className="titans-card premium-product-card gem-product pet-product" data-pet={pid}>
                  <span className="pet-thumb" aria-hidden="true"><MonsterArt kind={pid} area={area} boss={false} golden={false} /></span>
                  <div><strong>{def.name} <em>펫</em></strong><p>{def.desc} · 같이 사냥(주인공 한 방 ×{petAttackMul(Math.max(1, lv)).toFixed(2)} · {PET_ATTACK_SEC}초마다){lv > 0 ? ` · Lv.${lv}` : ""}</p></div>
                  <button type="button" disabled={lv <= 0 && redGems < PET_GEM_PRICE[pid]} onClick={() => void (lv > 0 ? equipPetShop(pid) : buyPet(pid))}>
                    {lv > 0 ? (on ? "해제" : "장착") : <><GemMark />{PET_GEM_PRICE[pid]}</>}
                  </button>
                </article>
              );
            })}
            {premiumCategory === "weapon" && <p className="premium-subhead">주인공 무기 외형 <small>장착한 검 · 창 · 활 · 지팡이 색</small></p>}
            {premiumCategory === "weapon" && Object.entries(WEAPON_SKINS).map(([skinId, def]) => {
              const owned = character.ownedWeaponSkins.includes(skinId);
              const equipped = character.equippedWeaponSkin === skinId;
              return (
                <article key={skinId} className="titans-card premium-product-card gem-product blade-product">
                  <span className="blade-thumb" style={weaponSkinStyle(def) as CSSProperties} aria-hidden="true">
                    <img className="weapon-skin-thumb weapon-skin" src={assetUrl(weaponSkinIcon(skinId, weaponKind, forgedWeaponLevel))} alt="" />
                  </span>
                  <div>
                    <strong>{def.name} <em>무기 외형</em></strong>
                    <p>{def.desc}</p>
                  </div>
                  <button
                    type="button"
                    disabled={!owned && redGems < def.gemCost}
                    onClick={() => void (owned ? toggleWeaponSkin(skinId) : buyWeaponSkin(skinId))}
                  >
                    {owned ? (equipped ? "해제" : "장착") : <><GemMark />{def.gemCost}</>}
                  </button>
                </article>
              );
            })}
            {/* 비트 수련 커스텀 — 판정 레일 · 구호 (2026-10-06, "커스텀 아이템 리소스 및 상점 연동").
                2026-10-27: 무기 외형과 섞여 '북' 이 주인공 무기처럼 읽혔다 → 소제목으로 갈라 비트 디펜스 꾸미기임을 밝힌다 */}
            {premiumCategory === "weapon" && <p className="premium-subhead">비트 디펜스 꾸미기 <small>판정 레일 빛 · 노트 장식 — 주인공 무기와 무관</small></p>}
            {premiumCategory === "weapon" && BEAT_SHOP_ITEMS.filter((item) => item.cost > 0).map((item) => {
              const owned = ownsBeatItem(character.beatCosmetics, item);
              const on = equippedBeatItem(character.beatCosmetics, item);
              return (
                <article key={`beat-${item.kind}-${item.id}`} className="titans-card premium-product-card gem-product beat-custom-product" data-beat-item={`${item.kind}-${item.id}`}>
                  <img className="beat-custom-thumb" src={beatItemIcon(item)} alt="" aria-hidden="true" />
                  <div><strong>{item.name} <em>{item.kind === "ring" ? "비트 · 판정 레일" : "비트 · 구호"}</em></strong><p>{item.desc}</p></div>
                  <button type="button" disabled={on || (!owned && redGems < item.cost)} onClick={() => void buyBeatCustom(item)}>
                    {on ? "장착 중" : owned ? "장착" : <><GemMark />{item.cost}</>}
                  </button>
                </article>
              );
            })}
            {/* I 무기 이펙트 · 전장 테마 — 외형 탭 (소제목: 위 비트 꾸미기와 갈라 사냥터 것임을 밝힌다) */}
            {premiumCategory === "weapon" && <p className="premium-subhead">무기 이펙트 · 전장 테마 <small>사냥터 타격 빛 · 배경</small></p>}
            {premiumCategory === "weapon" && Object.entries(WEAPON_FX).filter(([, def]) => def.gemCost !== null || character.ownedWeaponFx.includes("fx-season")).map(([fxId, def]) => {
              const owned = character.ownedWeaponFx.includes(fxId);
              const equipped = character.equippedWeaponFx === fxId;
              return (
                <article key={fxId} className="titans-card premium-product-card gem-product fx-product">
                  <span className="fx-thumb" style={{ "--fx-trail": def.trail } as CSSProperties} aria-hidden="true"><i /></span>
                  <div><strong>{def.name} <em>무기 이펙트</em></strong><p>{def.desc}</p></div>
                  <button type="button" disabled={!owned && (def.gemCost === null || redGems < def.gemCost)} onClick={() => void (owned ? toggleCosmetic("fx", fxId) : buyCosmetic("fx", fxId))}>
                    {owned ? (equipped ? "해제" : "장착") : def.gemCost === null ? "시즌 한정" : <><GemMark />{def.gemCost}</>}
                  </button>
                </article>
              );
            })}
            {premiumCategory === "weapon" && Object.entries(THEMES).map(([themeId, def]) => {
              const owned = character.ownedThemes.includes(themeId);
              const equipped = character.equippedTheme === themeId;
              return (
                <article key={themeId} className="titans-card premium-product-card gem-product theme-product">
                  <span className="theme-thumb" style={{ "--t-sky": def.sky, "--t-ground": def.ground, "--t-accent": def.accent } as CSSProperties} aria-hidden="true" />
                  <div><strong>{def.name} <em>전장 테마</em></strong><p>{def.desc}</p></div>
                  <button type="button" disabled={!owned && redGems < def.gemCost} onClick={() => void (owned ? toggleCosmetic("theme", themeId) : buyCosmetic("theme", themeId))}>
                    {owned ? (equipped ? "해제" : "장착") : <><GemMark />{def.gemCost}</>}
                  </button>
                </article>
              );
            })}
            {/* 칭호 — 프로필 과시 축. 표시 변경은 마이페이지에서 */}
            {premiumCategory === "title" && Object.entries(TITLES).map(([titleId, def]) => {
              const owned = character.ownedTitles.includes(titleId);
              return (
                <article key={titleId} className="titans-card premium-product-card gem-product title-product">
                  <span className="title-thumb" style={{ color: def.color }} aria-hidden="true">✦</span>
                  <div>
                    <strong style={{ color: def.color }}>{def.name} <em>칭호</em></strong>
                    <p>{def.desc}</p>
                  </div>
                  <button type="button" disabled={owned || redGems < def.gemCost} onClick={() => void buyTitle(titleId)}>
                    {owned ? "보유 중" : <><GemMark />{def.gemCost}</>}
                  </button>
                </article>
              );
            })}
            {/* 재화 팩 — 수량이 진행도 비례라 후반에도 유의미하다 */}
            {premiumCategory === "currency" && <><article className="titans-card premium-product-card gem-product">
              <RewardIcon kind="gold" size={38} className="pack-icon" />
              <div>
                <strong>황금 보급 상자</strong>
                <p>사냥터 골드 +{formatGold(goldPackAmount(character))} · 최고 스테이지 비례 <i className="feeds">→ 동료 레벨 · 무기 훈련</i></p>
              </div>
              <button type="button" disabled={redGems < GEM_PACK.goldPackCost} onClick={() => void buyGoldPack()}>
                <GemMark />{GEM_PACK.goldPackCost}
              </button>
            </article>
            <article className="titans-card premium-product-card gem-product">
              <RewardIcon kind="materials" size={38} className="pack-icon" />
              <div>
                <strong>강화석 상자</strong>
                <p>강화석 +{GEM_PACK.materialPackAmount} · 대장간·펫 간식 재료 <i className="feeds">→ 북 강화 · 보호구</i></p>
              </div>
              <button type="button" disabled={redGems < GEM_PACK.materialPackCost} onClick={() => void buyMaterialPack()}>
                <GemMark />{GEM_PACK.materialPackCost}
              </button>
            </article>
            {/* 루프 ⑤ (2026-10-08): 빌드를 바꾸는 보석 상품 — 성문 방어 칩·스킬 무기의 인장. 이벤트 상점 상품을 재화 탭에도 보인다 */}
            {(() => {
              const sp = eventProductsFor("event-shop").find((p) => p.id === "gem-seal-pack");
              if (!sp) return null;
              const left = sp.weeklyLimit - eventBuysThisWeek(character, sp.id, currentWeekKey());
              return (
                <article className="titans-card premium-product-card gem-product seal-product">
                  <img className="pack-icon" src={assetUrl("ui/idle/expedition.png")} alt="" aria-hidden="true" />
                  <div>
                    <strong>원정 인장 묶음 <em>주 {sp.weeklyLimit}회</em></strong>
                    <p>원정 인장 +20 · 이번 주 {Math.max(0, left)}회 남음 <i className="feeds">→ 성문 방어 칩 · 스킬 무기</i></p>
                  </div>
                  <button type="button" disabled={redGems < sp.gemCost || left <= 0} onClick={() => void buyEventProduct(sp)}>
                    {left <= 0 ? "이번 주 한도" : <><GemMark />{sp.gemCost}</>}
                  </button>
                </article>
              );
            })()}</>}
            {/* 동료 스킨(코스튬) — 외형 전용 확정 구매. 얼터너티브(별도 동료)와 다른 축 */}
            {premiumCategory === "ally" && Object.entries(ALLY_SKINS).filter(([skinId, def]) => def.gemCost !== null || character.ownedAllySkins.includes(skinId)).map(([skinId, skinDef]) => {
              const owned = character.ownedAllySkins.includes(skinId);
              const price = skinPrice(skinId, gacha.pickups);
              const pickupDeal = price !== null && skinDef.gemCost !== null && price < skinDef.gemCost;
              return (
                <article key={skinId} className={`titans-card premium-product-card gem-product skin-product ${pickupDeal ? "pickup-deal" : ""}`}>
                  <span className="skin-thumb" style={{ backgroundImage: `url(${skinDef.url})` }} aria-hidden="true" />
                  <div>
                    <strong>{skinDef.name} <em>코스튬</em>{pickupDeal && <i className="skin-pickup">픽업 -20%</i>}</strong>
                    <p>{skinDef.desc} · 동료 탭에서 장착/해제</p>
                  </div>
                  <button
                    type="button"
                    disabled={owned || price === null || redGems < price}
                    onClick={() => void buyAllySkin(skinId)}
                  >
                    {owned ? "보유 중" : price === null ? "시즌 한정" : pickupDeal ? <><s>{skinDef.gemCost}</s><GemMark />{price}</> : <><GemMark />{price}</>}
                  </button>
                </article>
              );
            })}
            {/* L 보상형 광고: 방치 가속 4h (1일 1회) — 미연동이면 카드 자체가 없다 */}
            {premiumCategory === "currency" && rewardedAvailability(character, "booster4h", new Date().toLocaleDateString("sv-SE")) !== "none" && (
              <article className="titans-card premium-product-card gem-product ad-product">
                <CurrencyIcon kind="gem" />
                <div>
                  <strong>방치 가속 {BOOSTER_AD_HOURS}h {character.adFree ? <em>광고 제거</em> : <em>광고</em>}</strong>
                  <p>{character.adFree ? "광고 없이 오늘 1회 자동 적용" : "30초 광고 시청 · 오늘 1회"}</p>
                </div>
                <button type="button" disabled={adBusy} onClick={() => void buyAdBooster()}>{adBusy ? "재생 중…" : character.adFree ? "받기" : "▶ 광고"}</button>
              </article>
            )}
            {premiumCategory === "currency" && <article className="titans-card premium-product-card gem-product">
              <RewardIcon kind="boost" size={38} className="pack-icon" />
              <div>
                <strong>방치 가속권 24h {character.idleBoostUntil > Date.now() && <em>적용 중</em>}</strong>
                <p>24시간 동안 방치 산출 2배 · 중첩 불가 <i className="feeds">→ 방치 정산 골드·경험치</i></p>
              </div>
              <button
                type="button"
                disabled={redGems < 80 || character.idleBoostUntil > Date.now()}
                onClick={() => void buyIdleBooster()}
              >
                <GemMark />80
              </button>
            </article>}
          </>
        )}
        {/* 결제 준비 (점검표 #14): 강한 유료 패키지는 D3 잔존(출석 3일) 또는 Lv.20 전에는 숨긴다 */}
        {tab === "premium" && premiumCategory === "package" && !paidProductsUnlocked && (
          <p className="paid-gate-note">모험가 세트·캐릭터·월정액 상품은 출석 3일차(또는 Lv.20)부터 열립니다 — 먼저 성장 구조를 충분히 경험해 보세요.</p>
        )}
        {tab === "premium" && premiumCategory === "package" && !paidStoreVisible() && (
          <p className="paid-gate-note">{paidStoreNote()}</p>
        )}
        {tab === "premium" && premiumCategory === "package" && paidStoreVisible() && (() => {
          // 2026-10-08 송사리 모델 — 상품을 5묶음(매일·주말 / 보석 / 패스·영구 / 1회 한정 / 외형)으로 보여 준다. 묶음 안 순서는 PAID_GROUPS
          const paidList = STORE_PRODUCTS.filter((product) => product.visible && productOnSale(product.id)).filter((product) => paidProductsUnlocked || product.id.startsWith("gems")).filter((product) => !product.trigger || (packageTriggered(product.trigger, character) && !packagePurchased(character, product.id)));
          return PAID_GROUPS.map((group) => {
          const items = group.ids.map((id) => paidList.find((p) => p.id === id)).filter((p): p is (typeof paidList)[number] => !!p);
          if (items.length === 0) return null;
          return <Fragment key={group.id}><h4 className="paid-group-head">{group.label} <small>{group.note}</small></h4>{items.map((product) => {
          const claimed = character.claimedRewards.includes(`free-store-v1:${product.id}`);
          const deal = dealState(character, product.id, nowTick);
          const dealLabel = deal === "bought" ? (product.id === "daily-deal" ? "오늘 구매 완료" : "이번 주 구매 완료") : deal === "weekday" ? "토·일 한정" : null;
          const doubleReady = firstDoubleAvailable(character, product.id);
          // 실결제 전용 상품(캐릭터·월정액)은 무료 체험 지급 대상이 아니다 — Play Billing 연동 후 판매
          const paidOnly = product.id.startsWith("char-") || product.id === "patron-30d" || product.id === "remove-ads";
          return <article key={product.id} className="titans-card premium-product-card">
          <CurrencyIcon kind={product.id.startsWith("gems") ? "gem" : "gold"} />
          <div><strong>{product.name} {product.badge && <em>{product.badge}</em>}{(() => {
            // 보석팩 보너스 — 기준 팩(80개) 가격 대비, 화면 가격으로 계산한 값만 (근거 없는 % 를 쓰지 않는다)
            const gems = purchaseGrant(product.id)?.gems ?? 0;
            const base = STORE_PRODUCTS.find((p) => p.id === "gems-80");
            const pct = product.id.startsWith("gems-") && product.id !== "gems-80" && base ? gemPackBonusPercent(gems, priceLabel(product), priceLabel(base), 80) : null;
            return pct ? <em className="gem-bonus-badge">+{pct}% 보너스</em> : null;
          })()}{product.id === "gate-fund" && <em className="gem-bonus-badge">수령: 보급·임무</em>}{doubleReady && <em className="first-double-badge">첫 구매 2배</em>}{momentBonusGems(character, product.id, nowTick) > 0 && <em className="moment-bonus-badge">지금 +{momentBonusGems(character, product.id, nowTick)} 보석</em>}</strong><p>{SHOP_COPY[product.id]?.blurb ?? product.description}</p>{(SHOP_COPY[product.id]?.lines ?? product.contents).length > 0 && <small className="shop-lines">{(SHOP_COPY[product.id]?.lines ?? product.contents).map((line) => <i key={line}>{line}</i>)}</small>}</div>
          {paidOnly || !FREE_STORE_ENABLED ? (
            <button type="button" className={paymentsConfigured() ? "paid-buy" : ""} title={paymentsConfigured() ? "스토어 결제" : QA_BUILD && testModeEnabled() ? "테스트 구매 (즉시 지급)" : "토스 앱·안드로이드 앱에서 구매할 수 있습니다"} disabled={claimingProduct !== null || dealLabel !== null} onClick={() => void buyPaidProduct(product.id)}>{claimingProduct === product.id ? "결제 중…" : dealLabel ?? priceLabel(product)}</button>
          ) : (
            <button type="button" disabled={claimed || claimingProduct !== null || dealLabel !== null} onClick={() => void claimFreeProduct(product.id)}>{claimed ? "수령 완료" : claimingProduct === product.id ? "지급 중…" : dealLabel ?? "무료 1회 (QA)"}</button>
          )}
        </article>;})}</Fragment>;
          });
        })()}
        {(tab === "event-shop" || tab === "event-shop2") && (
          <div className="event-offer-grid">
            {/* 실상품 (economy/eventShop.ts): 확정 구매 · 주간 한도 · 진행도 비례 수량 */}
            {/* 동료 고르기 칸은 걷었다(2026-10-28) — 조각 상품은 가진 동료 모두에게, 신화 · 초월 상품은 가진 신화 · 초월 모두에게 */}
            {eventProductsFor(tab).map((product, index) => {
              const bought = eventBuysThisWeek(character, product.id, currentWeekKey());
              const left = product.weeklyLimit - bought;
              return (
                <article key={product.id} className={`event-offer-card offer-${index + 1}${product.coinCost ? " coin-offer" : ""}`}>
                  <div className="event-offer-art"><ContentIcon name={product.icon as ContentIconName} /><span>{product.badge}</span></div>
                  <div>
                    <small>이번 주 {left}/{product.weeklyLimit}회 남음</small>
                    <h2>{product.name}</h2>
                    <p>{product.summary(character)}</p>
                    <span className="reward-row">{grantRewardKinds(product.grant(character)).map((k) => <RewardIcon key={k} kind={k} size={22} />)}</span>
                  </div>
                  <button type="button" disabled={left <= 0 || redGems < product.gemCost || character.eventCoins < (product.coinCost ?? 0) || (!!product.grant(character).allyShards && !HEROES.some((h) => save.heroes[h.id] > 0))} onClick={() => void buyEventProduct(product)}>
                    {left <= 0 ? "이번 주 한도 소진" : product.coinCost ? <><i className="coin-mark" aria-hidden="true" />{product.coinCost}</> : <><GemMark />{product.gemCost}</>}
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </section>
      </div>

      <nav className="titans-bottom-nav compact" aria-label="주요 메뉴">
        <button type="button" className={tab === "sword" ? "on" : ""} onClick={() => { setNavPopup(null); setTab("sword"); }}><ContentIcon name="hunt" /><span>사냥터</span></button>
        <button type="button" className={tab === "hub" ? "on" : ""} onClick={() => { setNavPopup(null); setTab("hub"); }}><ContentIcon name="event" /><span>모험</span></button>
        <button type="button" className={tab === "heroes" || tab === "gacha" ? "on" : ""} onClick={() => { setNavPopup(null); setTab("heroes"); }}><ContentIcon name="ally" /><span>동료</span></button>
        <button type="button" className={tab === "premium" || tab === "event-shop" || tab === "event-shop2" ? "on" : ""} onClick={() => { setNavPopup(null); setTab("premium"); }}><ContentIcon name="shop" /><span>상점</span></button>
        {/* 설정 (2026-10-14 사용자: "설정 아이콘을 상점 탭 오른쪽으로") — 메뉴는 위로 연다 */}
        {settingsNode}
      </nav>

      {toast && <div className="titans-toast">{toast}</div>}
      {rewardPop && (
        <div key={rewardPop.key} className={`reward-pop tone-${rewardPop.tone}`} role="status">
          {rewardPop.icon && <img className="reward-pop-icon" src={assetUrl(rewardPop.icon)} alt="" aria-hidden="true" />}
          <small>{rewardPop.kicker}</small>
          <b>{rewardPop.title}</b>
          {rewardPop.detail && <em>{rewardPop.detail}</em>}
        </div>
      )}

      {/* 소환진 (계획안 E) — 등급 예고 색(파랑 R · 보라 SR · 금 SSR)으로 1.2초 기대감을 만든 뒤 카드 공개 */}
      {gachaSummoning && (
        <div className={`gacha-reveal gacha-summoning tier-${gachaSummoning.tier.toLowerCase()}`} role="status" aria-label="소환 중">
          {/* 2026-10-16 (사용자: "가챠 이펙트 원복하고 원래 내용에 조금 더 화려하게 — 폭죽·조명 연산 이펙트") — 원래 마법진 그대로 + 뒤에 GachaFx(빛·폭죽 캔버스) */}
          <GachaFx tier={gachaSummoning.tier} phase="summon" />
          <div className="gacha-summon-circle">
            <i className="ring r1" /><i className="ring r2" /><i className="ring r3" />
            <i className="sparks" aria-hidden="true" /><i className="sparks s2" aria-hidden="true" />
            <svg viewBox="0 0 200 200" aria-hidden="true"><polygon className="sigil" points="100,18 128,72 186,80 143,120 156,180 100,150 44,180 57,120 14,80 72,72" /><circle className="sigil-ring" cx="100" cy="100" r="88" /></svg>
            <b>{gachaSummoning.count === 10 ? "10회 소환" : "소환"}</b>
            <small>{gachaSummoning.tier === "SSR" ? "전설의 기운이 감돕니다" : gachaSummoning.tier === "SR" ? "영웅의 기운" : "동료가 응답합니다"}</small>
          </div>
        </div>
      )}
      {/* 소환 연출 — 카드가 순서대로 뒤집히고 등급색으로 빛난다. 새 동료/중복 조각을 구분해 보여준다 */}
      {gachaReveal && (
        <div className={`gacha-reveal gacha-result ${gachaReveal.some((r) => r.rarity === "SSR") ? "has-ssr" : gachaReveal.some((r) => r.rarity === "SR") ? "has-sr" : ""}`} role="dialog" aria-label="소환 결과" onClick={() => setGachaReveal(null)}>
          <i className="gacha-burst" aria-hidden="true" />
          <i className="gacha-rays" aria-hidden="true" />
          <GachaFx tier={gachaReveal.some((r) => r.rarity === "SSR") ? "SSR" : gachaReveal.some((r) => r.rarity === "SR") ? "SR" : "R"} phase="reveal" />
          <i className="gacha-light-sweep" aria-hidden="true" />
          <div className={`gacha-reveal-grid count-${gachaReveal.length}`} onClick={(e) => e.stopPropagation()}>
            {gachaReveal.map((r, i) => {
              const h = HEROES.find((x) => x.id === r.id)!;
              return (
                <div key={`${r.id}-${i}`} data-ally={r.id} className={`gacha-card rarity-${r.rarity.toLowerCase()} ${r.duplicate ? "dup" : "new"} ${r.duplicate && (() => { const st = Math.max(1, character.allyStars[r.id] ?? 1); const need = shardCostToNext(r.id, st); return need !== null && (character.allyShards[r.id] ?? 0) >= need; })() ? "dup-ready-card" : ""} ${gachaFocus === i ? "is-focus" : ""}`} style={{ "--flip-delay": `${i * 0.18}s`, animationDelay: `${i * 0.18}s` } as CSSProperties}
                  role="button" tabIndex={0} aria-label={`${RARITY_LABEL[r.rarity]} ${h.name}`} title={`${RARITY_LABEL[r.rarity]}(${r.rarity}) · ${ROLE_LABEL[ALLY_ROLE[h.id]]} · ${h.feature}`}
                  onMouseEnter={() => setGachaFocus(i)} onClick={() => setGachaFocus((f) => (f === i ? null : i))} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setGachaFocus(i); } }}>
                  <div className="gacha-card-inner">
                    <div className="gacha-card-back"><i className="gacha-back-sigil" aria-hidden="true" /><i className="gacha-back-glow" aria-hidden="true" /></div>
                    <div className="gacha-card-front">
                      {/* 카드 머리 한 줄: 등급 · (잠금) — 2026-10-23 아이폰 캡처: 잠금 "🔒 S10" 이 등급 표를 덮었고 ★ 가 잘렸다. 자세한 건 카드를 누르면 설명 패널 */}
                      <span className="gacha-card-head">
                        <em className="gacha-rarity-badge" style={{ "--rc": RARITY_COLOR[r.rarity] } as CSSProperties}>{r.rarity}{r.pickup && <i className="pickup">픽업</i>}</em>
                        {!canFieldAlly(h.id, h.unlockStage, fieldCeiling, character.claimedRewards) && <i className="gacha-lock" title={`STAGE ${h.unlockStage} 지역을 개척해야 출전`} aria-label={`STAGE ${h.unlockStage} 개척 후 출전`}>🔒</i>}
                      </span>
                      <span className="gacha-art"><AllyArt id={r.id} />{r.rarity !== "R" && <i className="gacha-sparkles" aria-hidden="true">{Array.from({ length: r.rarity === "SSR" ? 8 : 4 }, (_, k) => <i key={k} />)}</i>}
                      </span>
                      <b>{h.name.split(" ").slice(-1)[0]}</b>
{r.duplicate && (() => {
                        // 중복은 재료 — 다음 성급까지 조각이 얼마나 찼는지 (2026-10-22 아처 키우기 6번). 같은 동료가 뒤에 또 나오면 그 몫은 빼고 차례로 찬다
                        const later = gachaReveal.slice(i + 1).filter((x) => x.id === r.id && x.duplicate).reduce((a, x) => a + x.shards, 0);
                        const have = Math.max(0, (character.allyShards[r.id] ?? 0) - later);
                        const st = Math.max(1, character.allyStars[r.id] ?? 1);
                        const need = shardCostToNext(r.id, st);
                        if (need === null) return <em className="dup-progress max" title={`★${st} 최대`} aria-label={`★${st} 최대`}><i className="dup-bar"><i style={{ width: "100%" }} /></i></em>;
                        const ready = have >= need;
                        return (
                          // 작은 카드(10연 · 360px 폭은 그림 칸 45×40)에서 글자 판이 비버를 다 가렸다 — 그림 위에는 얇은 막대만, 승급 가능이면 작은 ★ 표만. 숫자는 title · 설명 패널
                          <em className={`dup-progress ${ready ? "ready" : ""}`} title={ready ? `★${st + 1} 승급 가능` : `★${st + 1}까지 ${have}/${need}`} aria-label={ready ? `★${st + 1} 승급 가능` : `★${st + 1}까지 ${have}/${need}`}>
                            <i className="dup-bar"><i style={{ width: `${Math.min(100, (have / need) * 100)}%` }} /></i>
                          </em>
                        );
                      })()}
                      <small>{r.duplicate ? `조각 +${r.shards}` : "새 동료!"}</small>
                    </div>
                  </div>
                  {/* 데스크톱 말풍선 (2026-10-14 보완): hover 가 되는 기기에서만 CSS 로 보인다 — 탭 기기는 아래 설명 패널 */}
                  <span className="gacha-tip" role="tooltip">
                    <b style={{ color: RARITY_COLOR[r.rarity] }}>{RARITY_LABEL[r.rarity]} {r.rarity}</b> {h.name}
                    <small>{ROLE_LABEL[ALLY_ROLE[h.id]]} · {ELEMENT_LABEL[ALLY_ELEMENT[h.id]]} · {h.attackType}</small>
                    <small>{h.feature}</small>
                    <AllySigInfo hero={h} compact />
                    <small>DPS {h.baseDps.toLocaleString()} · ★{STAR_CAP[r.rarity]} (×{STAR_MULT[STAR_CAP[r.rarity]]}) · 중복 조각 +{GACHA.dupeShards[r.rarity]}</small>
                  </span>
                </div>
              );
            })}
            {/* 설명 패널 — 탭/마우스 오버한 카드. 등급이 능력치에 어떻게 닿는지(성급 상한·중복 조각·파견 조각·고유 특성) */}
            {(() => {
              const r = gachaFocus !== null ? gachaReveal[gachaFocus] : null;
              const h = r ? HEROES.find((x) => x.id === r.id) : null;
              if (!r || !h) return <p className="gacha-detail gacha-detail-hint">카드를 누르면 등급·역할·특성 설명이 보입니다</p>;
              const feat = ALLY_FEATURES[r.id as keyof typeof ALLY_FEATURES];
              const dupe = GACHA.dupeShards[r.rarity];
              const expMul = { N: 0.75, R: 1, SR: 1.5, SSR: 2, UR: 2.5, LR: 3 }[r.rarity];
              return (
                <div className={`gacha-detail rarity-${r.rarity.toLowerCase()}`} onClick={(e) => e.stopPropagation()}>
                  <b><em style={{ color: RARITY_COLOR[r.rarity] }}>{RARITY_LABEL[r.rarity]} {r.rarity}</em> {h.name}</b>
                  <small>{h.role} · {ROLE_LABEL[ALLY_ROLE[h.id]]} · {ELEMENT_LABEL[ALLY_ELEMENT[h.id]]} 속성 · {h.attackType}</small>
                  <p>{h.feature}{feat ? ` · 고유 특성 「${feat.label}」 ${feat.desc}` : ""}</p>
                  <AllySigInfo hero={h} />
                  <ul>
                    <li>기본 DPS <b>{h.baseDps.toLocaleString()}</b></li>
                    <li>성급 상한 <b>★{STAR_CAP[r.rarity]}</b> (최대 ×{STAR_MULT[STAR_CAP[r.rarity]]})</li>
                    <li>중복 조각 <b>+{dupe}</b> · 파견 조각 <b>×{expMul}</b></li>
                    {/* 중복은 재료 — 지금 조각으로 다음 성급까지, 오르면 피해 배율 전 → 후 (2026-10-22 아처 키우기 6번) */}
                    {r.duplicate && (() => {
                      const st = Math.max(1, character.allyStars[r.id] ?? 1);
                      const need = shardCostToNext(r.id, st);
                      const have = character.allyShards[r.id] ?? 0;
                      return need === null
                        ? <li>성급 <b>★{st} 최대</b></li>
                        : <li className={have >= need ? "dup-ready" : ""}>★{st + 1} 조각 <b>{have}/{need}</b> · 피해 <b>×{STAR_MULT[st]} → ×{STAR_MULT[st + 1]}</b>{have >= need ? " · 동료 탭에서 승급" : ""}</li>;
                    })()}
                    {!canFieldAlly(h.id, h.unlockStage, fieldCeiling, character.claimedRewards) && <li className="warn">STAGE {h.unlockStage} 지역을 성문 방어로 개척해야 출전</li>}
                    {canFieldAlly(h.id, h.unlockStage, fieldCeiling, character.claimedRewards) && trialDpsMul(h, trialCeiling(fieldCeiling, save.bestStage)) < 1 && <li className="trial">체험 출전 · 피해 ×{trialDpsMul(h, trialCeiling(fieldCeiling, save.bestStage)).toFixed(2)} — STAGE {h.unlockStage} 개척 시 제 힘</li>}
                  </ul>
                </div>
              );
            })()}
            <button type="button" className="cta gacha-close" onClick={() => { setGachaReveal(null); setGachaFocus(null); }}>확인</button>
          </div>
        </div>
      )}

      {/* 확률 공시 — 게임산업법 확률형 아이템 표시. 풀·등급·동료별 확률·천장·보장 규칙 */}
      {expeditionSendPop && (
        <div key={expeditionSendPop.seq} className="expedition-send-pop" role="status" aria-live="polite" onClick={() => setExpeditionSendPop(null)}>
          <div className="expedition-send-card">
            <div className="expedition-send-road" aria-hidden="true">
              <span className="expedition-send-walker"><AllyArt id={expeditionSendPop.allyId} skin={character.equippedAllySkins[expeditionSendPop.allyId]} /></span>
              <i className="expedition-send-dust" />
            </div>
            <b>{HEROES.find((h) => h.id === expeditionSendPop.allyId)?.name ?? "동료"} 파견 출발!</b>
            <small>{expeditionSendPop.hours}시간 뒤 조각 · 강화석을 들고 돌아와요</small>
          </div>
        </div>
      )}
      {/* 문서 끝(body)에 띄운다 — 사냥터 안 층(stacking context)에 있으면 App 의 첫 접속 출석 창 아래에 깔렸다 */}
      {rebalanceInfo && createPortal(
        <div className="relic-draw-modal rebalance-modal" role="dialog" aria-modal="true" aria-label="동료 밸런스 조정 안내" onClick={() => setRebalanceInfo(null)}>
          <div className="relic-draw-card" onClick={(e) => e.stopPropagation()}>
            <b>동료 밸런스 조정</b>
            <p className="rebalance-lead">오리온 · 새 동료의 힘과 강화 비용을 함께 낮췄어요. 키워 둔 동료는 예전 힘 이상이 되도록 레벨을 올려 드렸어요.</p>
            <ul className="rebalance-list">
              {rebalanceInfo.changes.slice(0, 6).map((c) => (
                <li key={c.id}><span>{HEROES.find((h) => h.id === c.id)?.name ?? c.id}</span><b>Lv.{c.from} → Lv.{c.to}</b></li>
              ))}
              {rebalanceInfo.changes.length > 6 && <li><span>외 {rebalanceInfo.changes.length - 6}명</span><b /></li>}
            </ul>
            {rebalanceInfo.gold > 0 && <p className="rebalance-gold"><CurrencyIcon kind="gold" /> 남은 골드 {formatGold(rebalanceInfo.gold)} 돌려받음</p>}
            <button type="button" className="cta" onClick={() => setRebalanceInfo(null)}>확인</button>
          </div>
        </div>,
        document.body,
      )}
      {/* 유물 소환진 (2026-10-28) — 동료 소환진 판을 그대로(등급색 · GachaFx) · 글만 유물 */}
      {relicSummoning && (
        <div className={`gacha-reveal gacha-summoning relic-summoning tier-${relicSummoning.tier.toLowerCase()}`} role="status" aria-label="유물 뽑는 중">
          <GachaFx tier={relicSummoning.tier} phase="summon" />
          <div className="gacha-summon-circle">
            <i className="ring r1" /><i className="ring r2" /><i className="ring r3" />
            <i className="sparks" aria-hidden="true" /><i className="sparks s2" aria-hidden="true" />
            <svg viewBox="0 0 200 200" aria-hidden="true"><polygon className="sigil" points="100,18 128,72 186,80 143,120 156,180 100,150 44,180 57,120 14,80 72,72" /><circle className="sigil-ring" cx="100" cy="100" r="88" /></svg>
            <b>{relicSummoning.count >= 10 ? "유물 10회" : "유물 뽑기"}</b>
            <small>{TIER_RANK[relicSummoning.tier] >= TIER_RANK.UR ? "오래된 힘이 깨어납니다" : TIER_RANK[relicSummoning.tier] >= TIER_RANK.SSR ? "전설의 유물이 빛납니다" : "유물이 응답합니다"}</small>
          </div>
        </div>
      )}
      {relicDrawResult && (
        <div className={`relic-draw-modal relic-draw-reveal best-${(relicDrawResult.map((id) => relicDef(id).tier).sort((x, y) => TIERS.indexOf(y) - TIERS.indexOf(x))[0] ?? "N").toLowerCase()}`} role="dialog" aria-modal="true" aria-label="유물 뽑기 결과" onClick={() => setRelicDrawResult(null)}>
          <GachaFx tier={relicDrawResult.map((id) => relicDef(id).tier).sort((x, y) => TIERS.indexOf(y) - TIERS.indexOf(x))[0] ?? "N"} phase="reveal" />
          <div className="relic-draw-card" onClick={(e) => e.stopPropagation()}>
            <b>유물 조각 {relicDrawResult.length}개</b>
            <div className="relic-draw-grid">
              {[...new Set(relicDrawResult)].sort((x, y) => TIERS.indexOf(relicDef(y).tier) - TIERS.indexOf(relicDef(x).tier)).map((id, k) => {
                const n = relicDrawResult.filter((x) => x === id).length;
                const stars = relicStars(character.relics, id);
                return (
                  <div key={id} className={`relic-draw-item relic-outline rarity-${relicDef(id).tier.toLowerCase()}`} data-relic={id} data-tier={relicDef(id).tier} style={{ animationDelay: `${k * 90}ms` } as CSSProperties}>
                    <img src={assetUrl(relicIconUrl(id))} alt="" aria-hidden="true" />
                    <span>{relicDef(id).name}</span>
                    <small>조각 +{n} · {stars >= 1 ? "★".repeat(stars) : "★ 없음"} · 남은 {character.relicSpare[id] ?? 0}</small>
                  </div>
                );
              })}
            </div>
            <button type="button" className="cta" onClick={() => setRelicDrawResult(null)}>확인</button>
          </div>
        </div>
      )}
      {/* 스킬 소환진 · 공개 (2026-10-28) — 유물 · 동료 소환과 같은 판(등급색 · GachaFx) · 글만 스킬 */}
      {skillSummoning && (
        <div className={`gacha-reveal gacha-summoning relic-summoning skill-summoning tier-${skillSummoning.tier.toLowerCase()}`} role="status" aria-label="스킬 뽑는 중">
          <GachaFx tier={skillSummoning.tier} phase="summon" />
          <div className="gacha-summon-circle">
            <i className="ring r1" /><i className="ring r2" /><i className="ring r3" />
            <i className="sparks" aria-hidden="true" /><i className="sparks s2" aria-hidden="true" />
            <svg viewBox="0 0 200 200" aria-hidden="true"><polygon className="sigil" points="100,18 128,72 186,80 143,120 156,180 100,150 44,180 57,120 14,80 72,72" /><circle className="sigil-ring" cx="100" cy="100" r="88" /></svg>
            <b>{skillSummoning.count >= 10 ? "스킬 10회" : "스킬 뽑기"}</b>
            <small>{TIER_RANK[skillSummoning.tier] >= TIER_RANK.UR ? "전설의 비기가 깨어납니다" : TIER_RANK[skillSummoning.tier] >= TIER_RANK.SSR ? "숨은 기술이 빛납니다" : "기술이 응답합니다"}</small>
          </div>
        </div>
      )}
      {skillDrawResult && (() => {
        const best = skillDrawResult.map((id) => SKILL_TIER[id]).sort((x, y) => TIERS.indexOf(y) - TIERS.indexOf(x))[0] ?? "N";
        return (
          <div className={`relic-draw-modal relic-draw-reveal skill-draw-reveal best-${best.toLowerCase()}`} role="dialog" aria-modal="true" aria-label="스킬 뽑기 결과" onClick={() => setSkillDrawResult(null)}>
            <GachaFx tier={best} phase="reveal" />
            <div className="relic-draw-card" onClick={(e) => e.stopPropagation()}>
              <b>스킬 카드 {skillDrawResult.length}장</b>
              <div className="relic-draw-grid">
                {[...new Set(skillDrawResult)].sort((x, y) => TIERS.indexOf(SKILL_TIER[y]) - TIERS.indexOf(SKILL_TIER[x])).map((id, k) => {
                  const n = skillDrawResult.filter((x) => x === id).length;
                  const learned = save.skillInventory.learned.includes(id);
                  return (
                    <div key={id} className={`relic-draw-item relic-outline skill-draw-item rarity-${SKILL_TIER[id].toLowerCase()}`} data-skill={id} data-tier={SKILL_TIER[id]} style={{ animationDelay: `${k * 90}ms` } as CSSProperties}>
                      <SkillIcon id={id} size={44} />
                      <span>{SKILLS.find((x) => x.id === id)?.name}</span>
                      <small>카드 +{n} · {learned ? `Lv.${save.skillInventory.levels[id] ?? 1} · 소진해 Lv 올리기` : "새 스킬 · 카드로 학습"}</small>
                    </div>
                  );
                })}
              </div>
              <button type="button" className="cta" onClick={() => setSkillDrawResult(null)}>확인</button>
            </div>
          </div>
        );
      })()}
      {showGachaRates && (
        <div className="gacha-reveal gacha-rates" role="dialog" aria-label="소환 확률 공시" onClick={() => setShowGachaRates(false)}>
          <div className="gacha-rates-sheet" onClick={(e) => e.stopPropagation()}>
            <strong>소환 · 뽑기 확률 공시</strong>
            {/* 2026-10-28 (사용자: "확률공시 요약 및 가독성 좋게") — 한 문단에 다 적던 것을 ① 등급 요약 칸 ② 규칙 줄 ③ 등급별로 접은 동료 표로 */}
            <small className="rates-sub">뽑기 Lv.{summonLv} · 누적 {character.gachaPulls}회 · 스테이지 해금 없음(상점 전용 동료만 제외)</small>
            <ul className="rates-tier-grid" aria-label="등급별 확률 요약">
              {TIERS.map((t) => {
                const n = gacha.entries.filter((e) => e.rarity === t).length;
                return <li key={t} className={`rarity-${t.toLowerCase()}`}><b style={{ color: RARITY_COLOR[t] }}>{TIER_LABEL[t]}</b><strong>{(gacha.bandRate[t] * 100).toFixed(2)}%</strong><small>{n}명{n ? ` · 각 ${((gacha.bandRate[t] / n) * 100).toFixed(t === "LR" || t === "UR" ? 3 : 2)}%` : ""}</small></li>;
              })}
            </ul>
            <ul className="rates-rules">
              <li><b>천장</b> 전설 이상 없이 {GACHA.pityLimit}회째는 전설 이상 확정 · 지금 {Math.min(GACHA.pityLimit, character.gachaPity)}회</li>
              <li><b>초월 천장</b> 초월 없이 {GACHA.lrPityLimit}회째는 초월 확정 · 지금 {character.gachaLrPity}회</li>
              <li><b>10회 소환</b> 영웅(SR) 이상 1명 보장 · 첫 10회는 전설 1명 확정</li>
              <li><b>픽업</b> 전설 이상 {gacha.pickups.length}명 · 같은 등급 안에서 2배 · {gacha.rotationDaysLeft}일 뒤 교대</li>
              <li><b>중복</b> 조각 {TIERS.map((t) => `${TIER_LABEL[t]} ${GACHA.dupeShards[t]}`).join(" · ")}</li>
              <li><b>뽑기 레벨</b> 누적 {SUMMON_LEVEL_PULLS.join(" · ")}회에 오르고 높은 등급 확률이 오른다</li>
            </ul>
            {TIERS.slice().reverse().map((t) => {
              const rows = rateTable(gacha).filter((r) => r.rarity === t);
              if (!rows.length) return null;
              return (
                <details key={t} className={`rates-tier rarity-${t.toLowerCase()}`} open={t === "LR" || t === "UR"}>
                  <summary><b style={{ color: RARITY_COLOR[t] }}>{TIER_LABEL[t]}</b> {rows.length}명 · 합 {(gacha.bandRate[t] * 100).toFixed(2)}%</summary>
                  <table>
                    <tbody>
                      {rows.map((row) => (
                        <tr key={row.id}>
                          <td>{HEROES.find((h) => h.id === row.id)?.name}{row.pickup ? " (픽업)" : ""}</td>
                          <td>{row.percent}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </details>
              );
            })}
            {/* 유물 · 스킬 뽑기도 한 창에서 (2026-10-28, 사용자 아쉬운 점 "확률 공시 창") — 재화별 등급 합은 머리줄, 펼치면 하나하나. 지금 보유로 빠진 것은 '완성 · 제외' */}
            <strong className="rates-more-head">유물 · 스킬 뽑기 확률</strong>
            {RELIC_BANNERS.map((b) => {
              const merged = relicMerged(character.relics, character.relicSpare);
              const rates = relicDrawRates(merged, b);
              const tr = relicBannerTierRates(merged, b);
              const tiers = TIERS.filter((t) => (RELIC_BANNER_RATES[b][t] ?? 0) > 0);
              return (
                <details key={`relic-${b}`} className="rates-tier rates-other" data-rates={`relic-${b}`}>
                  <summary><b>유물 · {RELIC_BANNER_LABEL[b]}</b> {tiers.map((t) => `${TIER_LABEL[t]} ${((tr[t] ?? 0) * 100).toFixed(1)}%`).join(" · ")}</summary>
                  <table><tbody>{rates.filter((x) => tiers.includes(relicDef(x.id).tier)).map((x) => <tr key={x.id}><td>{TIER_LABEL[relicDef(x.id).tier]} · {relicDef(x.id).name}</td><td>{x.rate > 0 ? `${(x.rate * 100).toFixed(2)}%` : "완성 · 제외"}</td></tr>)}</tbody></table>
                </details>
              );
            })}
            {SKILL_BANNERS.map((b) => {
              const rates = skillDrawRates(save.skillInventory, b);
              const tr = skillBannerTierRates(save.skillInventory, b);
              const tiers = TIERS.filter((t) => (SKILL_BANNER_RATES[b][t] ?? 0) > 0);
              return (
                <details key={`skill-${b}`} className="rates-tier rates-other" data-rates={`skill-${b}`}>
                  <summary><b>스킬 · {SKILL_BANNER_LABEL[b]}</b> {tiers.map((t) => `${TIER_LABEL[t]} ${((tr[t] ?? 0) * 100).toFixed(1)}%`).join(" · ")}</summary>
                  <table><tbody>{rates.filter((x) => tiers.includes(SKILL_TIER[x.id])).map((x) => <tr key={x.id}><td>{TIER_LABEL[SKILL_TIER[x.id]]} · {SKILLS.find((y) => y.id === x.id)?.name}</td><td>{x.rate > 0 ? `${(x.rate * 100).toFixed(2)}%` : "완성 · 제외"}</td></tr>)}</tbody></table>
                </details>
              );
            })}
            <button type="button" className="cta" onClick={() => setShowGachaRates(false)}>닫기</button>
          </div>
        </div>
      )}

      {coach && (
        <button
          type="button"
          className={`coach-bubble coach-${coach.target}`}
          onClick={() => {
            // 2026-10-07: 이미 그 탭에 있으면(탭 전환이 아무것도 안 했다) 대상 요소로 스크롤하고 2.4초 강조한다
            const pulse = (sel: string) => {
              const el = document.querySelector<HTMLElement>(sel);
              if (!el) return false;
              el.scrollIntoView({ block: "center", behavior: "smooth" });
              el.classList.add("coach-pulse");
              window.setTimeout(() => el.classList.remove("coach-pulse"), 2400);
              return true;
            };
            if (coach.target === "heroes") { if (tab !== "heroes") setTab("heroes"); else pulse('[data-ally="mia"] .ally-card-actions button'); }
            if (coach.target === "sword") { if (tab !== "sword") setTab("sword"); else pulse(".equipment-training-card button"); }
            if (coach.target === "field") { fieldRef.current?.scrollIntoView({ block: "center", behavior: "smooth" }); flash("몬스터를 탭하면 공격합니다"); }
          }}
        >
          <img className="coach-hand" src={assetUrl("ui/content-icons/ui-pointer.png")} alt="" aria-hidden="true" />
          {coach.target === "heroes" && tab === "heroes" ? "스카우트 미아 카드의 소환 버튼을 누르세요" : coach.target === "sword" && tab === "sword" ? "무기 훈련 버튼을 누르세요" : coach.text}
        </button>
      )}

      {idleReport && (
        <IdleReturnModal
          result={idleReport.result}
          drops={idleReport.drops}
          stage={idleReport.stage}
          bottleneck={idleReport.bottleneck}
          onClaim={() => claimIdle()}
          onGoContent={(content) => claimIdle(() => onOpenContent(content))}
          adOption={(() => { const a = rewardedAvailability(character, "idleDouble", new Date().toLocaleDateString("sv-SE")); return a === "none" ? null : a; })()}
          adBusy={adBusy}
          onClaimDouble={() => void watchAd("idleDouble", () => claimIdle(undefined, 2))}
          patronOption={(() => {
            const pv = patronPreview(character, idleReport.result.seconds + idleReport.result.wastedSeconds, idleReport.result.wastedSeconds, idleReport.result.gold, idleReport.result.seconds);
            return pv ? { ...pv, price: (() => { const p = STORE_PRODUCTS.find((x) => x.id === "patron-30d"); return p ? priceLabel(p) : "₩5,500"; })(), busy: claimingProduct !== null } : null;
          })()}
          onBuyPatron={() => void buyPaidProduct("patron-30d")}
        />
      )}

      {unlockBanner !== null && UNLOCK_BANNER[unlockBanner] && (
        <div className="content-unlock-banner" role="status">
          <span className="unlock-rays" aria-hidden="true" />
          <img src={assetUrl("ui/idle/unlock-crest.png")} alt="" aria-hidden="true" />
          <b>{UNLOCK_BANNER[unlockBanner].title}</b>
          <small>{UNLOCK_BANNER[unlockBanner].desc}</small>
        </div>
      )}

      {gateNotice && (
        <AreaGateModal
          pioneeredArea={character.pioneeredArea}
          onGoDodge={() => {
            setGateNotice(false);
            onOpenContent("dodge");
          }}
          onDismiss={() => setGateNotice(false)}
        />
      )}
    </div>
  );
}

/**
 * 몬스터 기질 (2026-10-16) — 스테이지로 정해지는 의사난수. 같은 스테이지는 늘 같고, 스테이지마다 달라 긴장감이 생긴다.
 *   pace 공격 간격 배수 0.75~1.3 · combo 연속 공격 확률 0~0.45 · feint 헛손질 확률 0~0.22
 *   style 덤비는 모양(lunge 앞으로 · leap 뛰어올라 내리찍기 · slam 내려치기 · dash 길게 돌진) · wander 어슬렁 폭(px) · counter 맞으면 되받아칠 확률 0.06~0.18
 * 대장은 더 사납게(연속 공격 +0.15, 간격 ×0.9).
 */
export function monsterTemper(stage: number, boss: boolean): { pace: number; combo: number; feint: number; style: "lunge" | "leap" | "slam" | "dash"; wanderX: number; wanderY: number; counter: number } {
  let h = Math.imul(stage + 7, 2654435761) ^ (boss ? 0x9e3779b9 : 0);
  const r = () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
  const styles = ["lunge", "leap", "slam", "dash"] as const;
  return {
    pace: (0.75 + r() * 0.55) * (boss ? 0.9 : 1),
    combo: Math.min(0.6, r() * 0.45 + (boss ? 0.15 : 0)),
    feint: r() * 0.22,
    style: styles[Math.floor(r() * styles.length)],
    wanderX: 4 + Math.round(r() * 10),
    wanderY: Math.round(r() * 6),
    counter: 0.06 + r() * 0.12 + (boss ? 0.06 : 0),   // 맞을 때마다 되받아칠 확률 — 아군 타격이 초당 여러 번이라 작게
  };
}
