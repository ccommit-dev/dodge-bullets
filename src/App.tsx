import { preloadStageBackgrounds } from "./game/draw";
import { QA_BUILD, QA_GEMS_AMOUNT, QA_GEMS_KEY, QA_MODE_KEY, qaGemsEnabled } from "./progression/storage";
import { Suspense, lazy, useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import "./App.css";
import "./idle.css";
import "./weight.css";
import { haptic } from "./ui/haptics";
import { subscribeAppVisibility } from "./ui/appLifecycle";
import { assetUrl } from "./asset";
// 번들 분할: 비트·대장간·마이페이지·이벤트 센터는 첫 화면(사냥터)에 필요 없다 — 동적 import로 분리
const BeatGame = lazy(() => import("./BeatGame").then((m) => ({ default: m.BeatGame })));
const ForgeGame = lazy(() => import("./ForgeGame").then((m) => ({ default: m.ForgeGame })));
import { TitansGame } from "./TitansGame";
const CharacterStatus = lazy(() => import("./CharacterStatus").then((m) => ({ default: m.CharacterStatus })));
import { AttendanceModal } from "./AttendanceModal";
const EventCenter = lazy(() => import("./EventCenter").then((m) => ({ default: m.EventCenter })));
import { combatPower, emptyCharacterProgress, type CharacterProgress, type ShoulderId } from "./progression/model";
import { renderShareCard, shareCard } from "./ui/shareCard";
import { TITLES } from "./economy/gemCatalog";
import { sheetFor } from "./titans/anim";
import { dodgeClearReward } from "./progression/balance";
import { HUNTING_AREAS } from "./titans/model";
import { loadTitansSave } from "./titans/storage";
import { randomOwnedAlly } from "./titans/allies";
import { sfxAreaUnlock, sfxTowerFloor, sfxTowerMilestone } from "./ui/sfx";
import { AreaUnlockBanner } from "./AreaUnlockBanner";
import { IdleQaPanel } from "./dev/IdleQaPanel";
import { bindAndroidBackButton, exitAppNative, isNativePlatform, requestReviewOnce } from "./game/native";
import { detectPaymentEnvironment, setPaymentEnvironment } from "./payments/environment";
import { reconcileStore } from "./payments/reconcile";
import { barrierRatio, starsForClear } from "./game/barrierLife";
import { syncBarrierLives } from "./game/arrows";
import { primeRewardedAds } from "./ads/rewarded";
import { SaveBackupModal } from "./SaveBackupModal";
import { copyToClipboard } from "./game/backup";
import { errorLogCount, serializeErrorLog } from "./game/errlog";
import { ContentIcon } from "./ui/ContentIcon";
import {
  grantCharacterReward,
  loadCharacterProgress,
  migrateLegacyProgress,
  updateCharacterProgress,
} from "./progression/storage";
import { activeMomentOffers, MOMENT_OFFERS, momentTimeLeft, openMomentOffer, paidOffersUnlocked } from "./economy/momentOffers";
import { STORE_PRODUCTS } from "./economy/productCatalog";
import { claimGateFundTier, gemValueRatio, GATE_FUND_TOTAL_GEMS } from "./economy/gateFund";
import { paidStoreNote, paidStoreVisible, purchaseInFlight, purchaseProduct } from "./payments/store";
import { onStorePricesChanged, priceLabel, productOnSale } from "./payments/prices";
import { paymentEnvironment } from "./payments/environment";
import { subscribeAppVisibility as subscribeResume } from "./ui/appLifecycle";
import { drawFrame } from "./game/draw";
import {
  applyKeyDown,
  applyKeyUp,
  clearKeys,
  consumeActionEdges,
  createInputState,
  setPointer,
  type InputState,
} from "./game/input";
import {
  derivedShopLevels,
  emptyShopLevels,
  mergeShopLevels,
  statsFromLevels,
} from "./game/shop";
import { createSoundController, loadSoundEnabled } from "./game/sound";
import { PATTERN_LABEL, STAGES, TOWER_START_INDEX, getStage, isLastStage, towerFloorOf, waveAt } from "./game/stages";
import { RewardIcon, type RewardIconKind } from "./ui/RewardIcon";
import { track as trackEvent } from "./analytics/events";
import { bossPatternFor } from "./game/bossPatterns";
import { applyPerk, pickPerks, rarityOdds, RARITY_LABEL, type PerkDef, type PerkId } from "./game/perks";
import { basicCooldown, skillCooldown } from "./game/skillShots";
import { chipCost, chipModsOf, chipSlotsOpen, CHIP_MAX_LEVEL, type ChipId } from "./game/chips";
import {
  DAILIES, dailyClaimable, DAILY_BY_ID, PRIMED_MS, rolledDaily, SUPPLIES, SUPPLY_BY_ID, SUPPLY_MAX,
  type DailyId, type SupplyId,
} from "./game/expeditionOps";
import { applySkillLevels, collectionCooldownMul, shardDrops, skillCost, SKILL_BY_ID, SKILL_MAX_LEVEL, skillUnlocked, type ExpeditionSkillId, type ExpeditionSkillLevels, type RangedWeaponId } from "./game/skills";
import { EXPEDITION_SKILLS, WEAPON_BY_ID, weaponUnlocked, BASIC_LEVEL_MAX, basicShotCost } from "./game/skills";
import { SkillPanel } from "./game/SkillPanel";
import { consumeAdReward, rewardedAvailability, showRewarded } from "./ads/rewarded";
import {
  computeClearReward,
  loadCoins,
  loadHighScore,
  loadShopLevels,
  saveCoins,
  saveHighScore,
  saveShopLevels,
} from "./game/storage";
import {
  closeMiniApp,
  lockScreenForGame,
  normalizeInsets,
  readSafeInsets,
  resolveUserKey,
  subscribeSafeInsets,
  type SafeInsets,
} from "./game/toss";
import type { GameState, GameWorld, ShopLevels, ShopUpgradeId } from "./game/types";
import {
  applyStats,
  beginStage,
  createWorld,
  resetRun,
  resizeWorld,
  updateWorld,
  runXpToNext,
} from "./game/world";

function applyInsetsToWorld(world: GameWorld, insets: SafeInsets): void {
  world.safeTop = insets.top;
  world.safeRight = insets.right;
  world.safeBottom = insets.bottom;
  world.safeLeft = insets.left;
}

function clientToCanvas(canvas: HTMLCanvasElement, clientX: number, clientY: number) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((clientX - rect.left) / rect.width) * canvas.clientWidth,
    y: ((clientY - rect.top) / rect.height) * canvas.clientHeight,
  };
}

type AppMode = "profile" | "dodge" | "beat" | "forge" | "titans";
/** 성장 선택 아이콘 — 일반 카드는 기존 보상 아이콘 재사용 (게이지=스킬 오브 · HP=경험 오브) */
const PERK_ICON: Partial<Record<PerkId, RewardIconKind | "exp">> = { heal: "exp" };
/** 스킬을 바꾸는 카드는 그 스킬의 아이콘을 그대로 쓴다 — 무엇이 세지는지 한 눈에 보이게. basic 은 기본 사격(활) (2026-09-29) */
const PERK_SKILL_ICON: Partial<Record<PerkId, string>> = {
  learnFire: "fire", learnWater: "water", learnIce: "ice", learnEarth: "earth", learnBolt: "bolt",
  gauge: "ultimate",   // 화살비 게이지 카드는 화살비 아이콘
  damageUp: "basic", convertFire: "fire", convertWater: "water", convertIce: "ice", convertEarth: "earth", convertBolt: "bolt",
  shotExtra: "basic", quickdraw: "basic", shotPierce: "basic", arrowStorm: "basic", overdrive: "basic",
  evoBeam: "basic", evoSeeker: "basic",
  boltExtra: "bolt", waterMore: "water", fireWide: "fire", iceDeep: "ice", earthHeavy: "earth",
  chillHunt: "ice", chillBurst: "fire", evoCluster: "fire", evoPyre: "fire", evoShatter: "ice", evoLingering: "ice",
};

const COMMUNITY_URL = import.meta.env.VITE_COMMUNITY_URL?.trim() ?? "";
/** 사망 원인 → 다음 판을 위한 한 줄 (RETENTION G) */
/** 패배 팁 — 방어막을 마지막으로 깎은 쪽 기준 (방어막이 유일한 생명, 2026-10-02) */
const DEATH_TIPS: Record<string, string> = {
  homing: "달빛 늑대왕은 단단하고 방어막을 세게 두드립니다 — 보이면 먼저 떨구세요",
  explosive: "폭염 비룡은 돔에 닿으면 터져 한 번에 크게 깎습니다 — 물화살이 불을 끕니다",
  ricochet: "오우거는 느리지만 단단합니다 — 흙화살이 오우거를 붙잡습니다",
  fan: "고블린은 셋이 나란히 옵니다 — 불화살 폭발로 한꺼번에 정리하세요",
  aimed: "그림자 늑대가 돔에 붙기 전에 떨구세요 — 번개화살이 먼저 끊습니다",
  fragment: "대장을 깎으면 조각이 흩어져 돔을 두드립니다 — 화살비로 한 번에 지우세요",
  boss: "대장의 마력탄이 돔을 깎습니다 — 대장을 빨리 쓰러뜨릴수록 덜 맞습니다. 기본 사격을 강화해 보세요",
  normal: "슬라임 떼가 돔에 붙으면 조금씩 깎습니다 — 정비에서 기본 사격·속성 화살을 올려 보세요",
  barrier: "방어막이 깨지면 집니다 — 붙은 몬스터부터 떨구고, 성장 카드의 방어막 수리를 챙기세요",
};
const EXPEDITION_SHOULDERS: ShoulderId[] = ["scout", "shadow", "ogre", "dragon"];
/**
 * 원정 스탯 조립의 **유일한** 지점 — 파생(캐릭터 성장) → 견갑 → 영구 스킬 순으로 얹는다.
 * 세 호출부가 모두 이 함수를 지나므로 전투·시뮬·미리보기가 같은 값을 본다 (2026-09-28).
 */
/** 지금 강화할 수 있는 스킬이 하나라도 있나 — 탭의 "!" 배지 */
function EXPEDITION_SKILL_READY(p: CharacterProgress | null): boolean {
  if (!p) return false;
  return EXPEDITION_SKILLS.some((d) => {
    const lv = p.expeditionSkills[d.id] ?? 0;
    if (lv >= SKILL_MAX_LEVEL || !skillUnlocked(d, p.dodgeBestStage)) return false;
    const c = skillCost(d, lv + 1);
    return p.sharedCoins >= c.gold && (p.expeditionShards[d.id] ?? 0) >= c.shards && p.expeditionSeals >= c.seals;
  });
}

/**
 * 출격 적재 — 스탯 · 스킬 레벨 · 장착 무기를 **한 군데서** 월드에 싣는다 (2026-09-28).
 * 스탯만 넣고 스킬 레벨을 빠뜨리면 화면에는 Lv.10 인데 전투에서는 아무것도 쏘지 않는다.
 */
function loadLoadout(world: GameWorld, levels: ShopLevels, p: CharacterProgress) {
  const stats = statsWithShoulder(levels, p.equippedShoulder, p.expeditionSkills);
  // 이번 런에서 고른 카드를 다시 얹는다 — 스테이지가 넘어갈 때 여기를 지나며 상점 값으로
  // 덮이므로, 안 얹으면 "이번 런 동안 적용"이 스테이지 하나짜리 거짓말이 된다 (2026-09-28)
  // 칩은 랜덤이 아니라 고정 패시브 — 카드보다 먼저 얹는다
  world.chips = chipModsOf(p.expeditionChips, p.equippedChips, chipSlotsOpen(p.dodgeBestStage));
  // 수집 보너스 — 배너의 숫자가 실제로 걸린다
  world.collectionMul = collectionCooldownMul(p.expeditionSkills);
  stats.extraLives += world.chips.extraLives;
  const m = world.runMods;
  stats.moveSpeed *= m.moveSpeedMul;
  stats.dashCooldownMs *= m.dashCooldownMul;
  stats.slashLevel += m.slashLevelBonus;
  stats.extraLives += m.maxHpBonus;
  applyStats(world, stats);
  world.skillLevels = { ...p.expeditionSkills };
  world.basicLevel = p.expeditionBasic;
  world.rangedWeapon = p.expeditionWeapon;
  return stats;
}

function statsWithShoulder(levels: ShopLevels, shoulder: ShoulderId | null, skills?: ExpeditionSkillLevels) {
  const base = statsFromLevels(levels);
  if (shoulder === "scout") base.moveSpeed *= 1.03;
  if (shoulder === "shadow") base.dashCooldownMs *= .95;
  if (shoulder === "ogre") base.extraLives += 1;
  if (shoulder === "dragon") base.dashIFramesMs *= 1.1;
  if (!skills) return base;
  return applySkillLevels(base, skills);
}

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const worldRef = useRef<GameWorld | null>(null);
  const inputRef = useRef<InputState>(createInputState());
  const soundRef = useRef(createSoundController());
  const stateRef = useRef<GameState>("ready");
  const scoreRef = useRef(0);
  const userHashRef = useRef("mock-local-dev");
  const rafRef = useRef<number>(0);
  const lastTsRef = useRef<number>(0);
  const insetsRef = useRef<SafeInsets>(normalizeInsets(null));
  const lastJumpAtRef = useRef(0);
  const lastSpaceAtRef = useRef(0);
  const dodgeRunIdRef = useRef(`boot-${Date.now()}`);
  /** 죽는 동작이 재생되는 0.65초 — 이 동안은 계속 '플레이 중'으로 그리되 입력·3택·재사망을 막는다 */
  const dyingRef = useRef(false);

  const hudRemainSecRef = useRef(0);
  const hudHpRef = useRef(1);
  const hudMaxHpRef = useRef(1);
  const hudComboRef = useRef(0);
  const coinsRef = useRef(0);
  const shopLevelsRef = useRef<ShopLevels>(emptyShopLevels());
  const [bootReady, setBootReady] = useState(false);
  // 값은 화면에 안 쓴다 — 개발용 배선 상태라 로비에서 뺐다(2026-09-21). 세터는 부팅 경로가 계속 쓴다
  const [, setUserKeySource] = useState<"sdk" | "mock">("mock");
  const [gameState, setGameState] = useState<GameState>("ready");
  // 구 '보급소' 탭은 용도 불명으로 삭제돼 상태만 남아 있었다 — 그 자리에 영구 스킬 화면을 넣는다 (2026-09-28)
  const [menuTab, setMenuTab] = useState<"play" | "skill">("play");
  /** 배속 — 참고 게임의 전투 배속. 빨리 돌리면 그만큼 위험해서 인장을 더 준다 */
  const [speedMul, setSpeedMul] = useState(1);
  const speedRef = useRef(1);
  /** 스킬 슬롯 — 자동 발사라 쿨타임이 안 보이면 내 스킬이 도는지 알 수 없다 */
  const [skillHud, setSkillHud] = useState<{ id: ExpeditionSkillId | "basic"; lv: number; ready: number }[]>([]);
  const skillHudTsRef = useRef(0);
  /** 효과음 — 로직이 센 값(world.sfx)과 마지막으로 본 값을 비교해 여기서 낸다 */
  const sfxSeenRef = useRef({ shot: 0, hit: 0, boom: 0, freeze: 0, zap: 0, thud: 0, learn: 0 });
  const shotSfxTsRef = useRef(0);
  /** 방어막 붕괴 햅틱 — 마지막으로 본 붕괴 수 */
  const breachSeenRef = useRef(0);
  const [score, setScore] = useState(0);
  const [lastScore, setLastScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [coins, setCoins] = useState(0);
  const [coinGain, setCoinGain] = useState(0);
  /** 런 중 성장 선택 (P1) — 스테이지당 1회, 마지막 웨이브 앞 */
  const perkStageRef = useRef(-1);
  const hudLevelRef = useRef(1);
  const hudXpRef = useRef(0);
  const [runHud, setRunHud] = useState({ level: 1, pct: 0, tempo: 1 });
  const qaGodmodeRef = useRef(false);
  useEffect(() => { try { qaGodmodeRef.current = import.meta.env.DEV && localStorage.getItem("dodgebullets:qa-godmode") === "1"; } catch { qaGodmodeRef.current = false; } }, []);
  const [perkOptions, setPerkOptions] = useState<PerkDef[]>([]);
  /** 웨이브 전환·보스 등장 배너 (아트 후속) — key 가 바뀔 때마다 CSS 애니메이션이 다시 돈다 */
  const [hudBanner, setHudBanner] = useState<{ key: number; title: string; sub: string; boss: boolean } | null>(null);
  const hudWaveRef = useRef(0);
  const hudBossRef = useRef(false);
  const bannerTimerRef = useRef(0);
  const showBanner = (title: string, sub: string, boss: boolean) => {
    setHudBanner({ key: Date.now(), title, sub, boss });
    window.clearTimeout(bannerTimerRef.current);
    bannerTimerRef.current = window.setTimeout(() => setHudBanner(null), boss ? 2600 : 1700);
  };
  /** 클리어 보상 ×2 광고 (P1) */
  const [adBusy, setAdBusy] = useState(false);
  const [adDoubled, setAdDoubled] = useState(false);
  const [, setShopLevels] = useState<ShopLevels>(() => emptyShopLevels());   // 값은 화면에 안 쓴다 — 점프·대시·일제 사격 버튼이 빠지며 표시할 레벨이 없다 (2026-10-01)
  const [stageIndex, setStageIndex] = useState(0);
  const [stageLabel, setStageLabel] = useState(STAGES[0].name);
  const [stageIntro, setStageIntro] = useState(STAGES[0].intro);
  const [, setHp] = useState(1);   // 하트 HUD 는 없앴다(방어막이 유일한 생명) — 값은 다른 화면용으로만 갱신
  const [, setMaxHp] = useState(1);
  const [combo, setCombo] = useState(0);
  /** 첫 원정 슬로모션 튜토리얼 (점검표 #6) — 1회만 */
  const [tutorialActive, setTutorialActive] = useState(false);
  const tutorialRef = useRef(false);
  const tutorialEligibleRef = useRef(false);
  const tutorialStartRef = useRef(0);
  /** dodge 별점 획득 연출 (§4) — 클리어 직후 2.4초 팝업 */
  const [starResult, setStarResult] = useState<{ stars: number; improved: boolean; total: number } | null>(null);
  /** 실패 완화 (RETENTION G): 사망 원인별 한 줄 팁 */
  const [deathTip, setDeathTip] = useState("");
  const [stageRemainMs, setStageRemainMs] = useState(STAGES[0].durationMs);
  const [soundOn, setSoundOn] = useState(() => loadSoundEnabled());
  const [exitOpen, setExitOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  // 테스트 모드 — 빌드 라벨을 3초 안에 7번 탭하면 토글 (안드로이드 개발자 옵션식 숨은 제스처)
  // 출시 빌드(QA_BUILD false)에서는 제스처도 플래그도 없다 — 테스터 기기에 남은 qa-mode=1 도 무시
  const [testMode, setTestMode] = useState(() => { if (!QA_BUILD) return false; try { return localStorage.getItem(QA_MODE_KEY) === "1"; } catch { return false; } });
  const buildTapsRef = useRef<number[]>([]);
  const tapBuildLabel = () => {
    if (!QA_BUILD) return;
    const now = Date.now();
    buildTapsRef.current = [...buildTapsRef.current.filter((t) => now - t < 3000), now];
    if (buildTapsRef.current.length < 7) return;
    buildTapsRef.current = [];
    const next = !testMode;
    try { if (next) localStorage.setItem(QA_MODE_KEY, "1"); else { localStorage.removeItem(QA_MODE_KEY); localStorage.removeItem(QA_GEMS_KEY); } } catch { /* 저장 불가 환경 */ }
    setTestMode(next);
    setSettingsToast(next ? "테스트 모드 ON — 보석 무제한 메뉴가 열립니다" : "테스트 모드 OFF");
    window.setTimeout(() => setSettingsToast(""), 2200);
  };
  const [insets, setInsets] = useState<SafeInsets>(() => normalizeInsets(null));
  const [allClear, setAllClear] = useState(false);
  const [extracted, setExtracted] = useState(false);
  const [appMode, setAppMode] = useState<AppMode>("titans");
  // 마이페이지 진입 시 저장소에서 진행도를 다시 읽는다 — 사냥터 상점에서 산 외형(이펙트·테마)·보석이
  // App의 progress 상태에 반영되지 않은 채 프로필이 열리는 문제(계획안 I) 방지
  useEffect(() => {
    if (appMode !== "profile" || !userHashRef.current) return;
    let cancelled = false;
    void loadCharacterProgress(userHashRef.current).then((next) => { if (!cancelled) setProgress(next); });
    return () => { cancelled = true; };
  }, [appMode]);
  const [profileRefresh, setProfileRefresh] = useState(0);
  const [progress, setProgress] = useState<CharacterProgress>(() => emptyCharacterProgress());
  /**
   * 최신 진행도 — 게임 루프(한 번 만들어지는 effect)가 읽는다. 루프가 `progress` 를 직접 잡으면 **만들어질 때의
   * 초기값**이라, 스테이지를 깨고 자동으로 넘어갈 때 영구 스킬·칩·무기가 기본값으로 실렸다 (2026-09-29 캡처:
   * 2스테이지 슬롯이 불화살 Lv1 하나로 줄어 있었다).
   */
  const progressRef = useRef(progress);
  useEffect(() => { progressRef.current = progress; }, [progress]);
  const [shoulderDrop, setShoulderDrop] = useState("");
  const [pioneeredAreaIndex, setPioneeredAreaIndex] = useState<number | null>(null);
  const [attendanceOpen, setAttendanceOpen] = useState(true);
  const [eventOpen, setEventOpen] = useState(false);
  const [eventTab, setEventTab] = useState<"daily" | "rift" | "weekly" | "journal" | "season">("daily");
  const [backupOpen, setBackupOpen] = useState(false);
  const [settingsToast, setSettingsToast] = useState("");
  const showToast = (msg: string, ms = 2400) => { setSettingsToast(msg); window.setTimeout(() => setSettingsToast(""), ms); };
  // 성문 보급소 결제 (2026-10-02) — 진행 중인 결제 상품 · 같은 판에서 성문에 진 횟수(3·4스테이지)
  const [buyingProduct, setBuyingProduct] = useState<string | null>(null);
  const gateFailsRef = useRef<Record<number, number>>({});
  const [, setStoreTick] = useState(0);
  useEffect(() => { const off = onStorePricesChanged(() => setStoreTick((t) => t + 1)); return () => { off(); }; }, []);
  const appModeRef = useRef<AppMode>("titans");

  const setMode = useCallback((mode: AppMode) => {
    appModeRef.current = mode;
    setAppMode(mode);
    setSettingsOpen(false);
    if (mode !== "dodge") {
      soundRef.current.stopBgm();
      clearKeys(inputRef.current);
      setPointer(inputRef.current, false);
    }
  }, []);

  // Android 하드웨어 뒤로가기 — 콘텐츠 안이면 허브로, 허브면 앱 최소화.
  // 웹/앱인토스에서는 native.ts 가드가 no-op을 돌려준다.
  useEffect(() => {
    let dispose = () => undefined as void;
    void bindAndroidBackButton({
      onBack: () => {
        // 앱 안 공유 카드(ui/shareCard)가 떠 있으면 그것부터 닫는다 — 웹의 "탭 닫기"와 같은 자리
        const card = document.querySelector<HTMLButtonElement>(".share-card-overlay button");
        if (card) { card.click(); return true; }
        if (appModeRef.current !== "titans") {
          setMode("titans");
          return true;
        }
        return false;
      },
    }).then((fn) => {
      dispose = fn;
    });
    return () => dispose();
  }, [setMode]);

  const syncState = useCallback((next: GameState) => {
    stateRef.current = next;
    setGameState(next);
    if (next !== "playing" && next !== "intro") {
      clearKeys(inputRef.current);
      setPointer(inputRef.current, false);
      soundRef.current.stopBgm();
    }
  }, []);

  const unlockAudio = useCallback(async () => {
    await soundRef.current.unlock();
  }, []);

  const toggleSound = useCallback(async () => {
    await unlockAudio();
    const next = !soundRef.current.isEnabled();
    soundRef.current.setEnabled(next);
    setSoundOn(next);
    if (next && stateRef.current === "playing") {
      soundRef.current.startBgm();
    } else {
      soundRef.current.stopBgm();
    }
  }, [unlockAudio]);

  const applyInsets = useCallback((next: SafeInsets) => {
    insetsRef.current = next;
    setInsets(next);
    document.documentElement.style.setProperty("--safe-top", `${next.top}px`);
    document.documentElement.style.setProperty("--safe-right", `${next.right}px`);
    document.documentElement.style.setProperty("--safe-bottom", `${next.bottom}px`);
    document.documentElement.style.setProperty("--safe-left", `${next.left}px`);
    if (worldRef.current) applyInsetsToWorld(worldRef.current, next);
  }, []);

  const fitCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = window.innerWidth;
    const height = window.innerHeight;

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (!worldRef.current) {
      worldRef.current = createWorld(width, height, dpr);
      // 개발 전용 관찰 창구 — 헤드리스 하니스가 전투 내부(스킬 탄·장착 무기)를 읽을 수 있게.
      // DOM 만으로는 "강화했는데 실제로 쏘는가"를 확인할 길이 없다 (2026-09-28)
      if (import.meta.env.DEV) (window as unknown as { __dodgeWorld?: GameWorld }).__dodgeWorld = worldRef.current;
    } else {
      resizeWorld(worldRef.current, width, height, dpr);
    }
    applyInsetsToWorld(worldRef.current, insetsRef.current);
  }, []);

  useEffect(() => {
    if (appMode === "dodge") {
      fitCanvas();
    }
  }, [appMode, fitCanvas]);

  useEffect(() => {
    let cancelled = false;
    let unsub: () => void = () => undefined;
    let offResume: () => void = () => undefined;

    (async () => {
      const [key, safe] = await Promise.all([
        resolveUserKey(),
        readSafeInsets(),
        lockScreenForGame(),
      ]);
      if (cancelled) return;

      userHashRef.current = key.hash;
      setUserKeySource(key.source);
      applyInsets(safe);
      const [best, savedCoins, levels, character] = await Promise.all([
        loadHighScore(key.hash),
        loadCoins(key.hash),
        loadShopLevels(key.hash),
        loadCharacterProgress(key.hash),
      ]);
      if (cancelled) return;
      setHighScore(best);
      // 지갑 권위는 sharedCoins다. 레거시 코인 키는 마이그레이션 하한으로만 쓰이므로
      // (progression/storage.ts 참조) 부팅 시 진행도 쪽 잔고로 맞추고 레거시 키를 따라오게 한다.
      const wallet = Math.max(savedCoins, character.sharedCoins);
      setCoins(wallet);
      coinsRef.current = wallet;
      if (wallet !== savedCoins) void saveCoins(key.hash, wallet);
      // 보급소 삭제 — 저장된 구매 레벨과 성장 파생 레벨 중 높은 쪽 (기존 구매 손실 없음)
      const mergedLevels = mergeShopLevels(levels, derivedShopLevels(character));
      setShopLevels(mergedLevels);
      shopLevelsRef.current = mergedLevels;
      setProgress(character);
      tutorialEligibleRef.current = !character.claimedRewards.includes("dodge-tutorial") && character.dodgeBestStage <= 1;
      const stats = worldRef.current
        ? loadLoadout(worldRef.current, mergedLevels, character)
        : statsWithShoulder(mergedLevels, character.equippedShoulder, character.expeditionSkills);
      setMaxHp(1 + stats.extraLives);
      setHp(1 + stats.extraLives);
      setBootReady(true);

      // 결제 환경은 부팅 때 한 번 정하고(토스 · 안드로이드 · 웹), 뒤에서 스토어 정산 — 가격 · 지급 전에 죽은 구매 복구 ·
      // 재설치 영구 상품 복원 · 환불 회수 (payments/reconcile). 부팅을 기다리게 하지 않는다
      const payEnv = detectPaymentEnvironment(key.source, isNativePlatform());
      setPaymentEnvironment(payEnv);
      void primeRewardedAds(payEnv);
      const applyReconcile = async (r: { granted: number; revoked: number; cores: number }) => {
        if (cancelled || (!r.granted && !r.revoked && !r.cores)) return;
        const detail = { ...r, handled: false };
        window.dispatchEvent(new CustomEvent("dodgebullets:store-reconciled", { detail }));
        // 스킬 코어는 진행도의 pendingSkillCores 로 쌓였다 — 사냥터가 준비되면 옮긴다 (TitansGame)
        setProgress(await loadCharacterProgress(key.hash));
      };
      void reconcileStore(key.hash).then(applyReconcile).catch(() => undefined);
      // 복귀 정산 — 대기 중이던 플레이 결제가 승인됐으면 다음 실행까지 기다리지 않는다. 결제 시트에서 돌아오는 순간에는
      // 실시간 결제가 지급하므로 건너뛴다(purchaseInFlight) — 둘이 겹치면 실시간 쪽이 "이미 지급"을 보게 된다
      let lastReconcile = Date.now();
      offResume = subscribeResume((hidden) => {
        if (hidden || cancelled || purchaseInFlight() || Date.now() - lastReconcile < 30_000) return;
        lastReconcile = Date.now();
        void reconcileStore(key.hash).then(applyReconcile).catch(() => undefined);
      });

      unsub = await subscribeSafeInsets((next) => {
        if (!cancelled) applyInsets(next);
      });
    })();

    return () => {
      cancelled = true;
      unsub();
      offResume();
    };
  }, [applyInsets]);

  // 지갑 단일화 — 다른 콘텐츠(방치 정산·대장간 이관)가 sharedCoins를 올리면
  // 원정 코인 UI와 레거시 코인 키가 따라온다. 소비 경로는 둘을 함께 내리므로 여기서 no-op이 된다.
  useEffect(() => {
    if (!bootReady || progress.sharedCoins === coinsRef.current) return;
    coinsRef.current = progress.sharedCoins;
    setCoins(progress.sharedCoins);
    void saveCoins(userHashRef.current, progress.sharedCoins);
  }, [bootReady, progress.sharedCoins]);

  useEffect(() => {
    const sound = soundRef.current;
    fitCanvas();

    const onResize = () => {
      void readSafeInsets().then(applyInsets);
      fitCanvas();
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);

    // 웹 visibilitychange + Capacitor pause/resume — 상태가 바뀔 때만 (ui/appLifecycle)
    const onVisibility = (hidden: boolean) => {
      if (hidden) {
        sound.enterBackground();
      } else {
        sound.enterForeground();
        if (stateRef.current === "playing" && sound.isEnabled() && appModeRef.current === "dodge") {
          sound.startBgm();
        }
      }
    };
    const onPageHide = () => sound.enterBackground();
    const onPageShow = () => {
      sound.enterForeground();
      if (stateRef.current === "playing" && sound.isEnabled() && appModeRef.current === "dodge") {
        sound.startBgm();
      }
    };

    const offVisibility = subscribeAppVisibility(onVisibility);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("pageshow", onPageShow);

    const canvas = canvasRef.current;
    if (!canvas) {
      return () => {
        window.removeEventListener("resize", onResize);
        window.removeEventListener("orientationchange", onResize);
        offVisibility();
        window.removeEventListener("pagehide", onPageHide);
        window.removeEventListener("pageshow", onPageShow);
      };
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (appModeRef.current !== "dodge") return;
      if (stateRef.current !== "playing") return;
      if (applyKeyDown(inputRef.current, e.code)) {
        // 점프·대시·일제 사격 키는 더 없다 (2026-10-01) — 좌우만 뜻이 있다. 나머지 키는 삼키기만 한다
        lastSpaceAtRef.current = performance.now();
        e.preventDefault();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (applyKeyUp(inputRef.current, e.code)) e.preventDefault();
    };
    const onBlur = () => {
      clearKeys(inputRef.current);
      setPointer(inputRef.current, false);
    };

    const onPointerDown = (e: PointerEvent) => {
      if (appModeRef.current !== "dodge") return;
      if (stateRef.current !== "playing") return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      canvas.setPointerCapture(e.pointerId);
      const { x, y } = clientToCanvas(canvas, e.clientX, e.clientY);
      // 더블탭 점프는 없다 (2026-10-01) — 누른 자리로 이동만
      lastJumpAtRef.current = performance.now();
      setPointer(inputRef.current, true, x, y);
      e.preventDefault();
    };
    const onPointerMove = (e: PointerEvent) => {
      if (appModeRef.current !== "dodge") return;
      if (stateRef.current !== "playing") return;
      if (!inputRef.current.pointerActive) return;
      const { x, y } = clientToCanvas(canvas, e.clientX, e.clientY);
      setPointer(inputRef.current, true, x, y);
      e.preventDefault();
    };
    const onPointerUp = (e: PointerEvent) => {
      if (inputRef.current.pointerActive) {
        setPointer(inputRef.current, false);
        e.preventDefault();
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (stateRef.current === "playing") e.preventDefault();
    };
    const onGesture = (e: Event) => e.preventDefault();

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("gesturestart", onGesture, { passive: false });
    document.addEventListener("gesturechange", onGesture, { passive: false });

    const loop = (ts: number) => {
      if (appModeRef.current !== "dodge") {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }
      const world = worldRef.current;
      const ctx = canvasRef.current?.getContext("2d");
      if (world && ctx) {
        if (!lastTsRef.current) lastTsRef.current = ts;
        // 첫 스테이지 슬로모션 튜토리얼 (점검표 #6): 첫 원정의 처음 7초만 45% 속도로,
        // 분열 화살 규칙을 안전하게 한 번 본 뒤 정상 속도로 복귀한다
        // 실시간 기준 7초 — 감속된 게임 시간(stageElapsedMs)으로 재면 실제로는 15초가 걸린다
        const tutorialSlow = tutorialRef.current && world.stageIndex === 0 && performance.now() - tutorialStartRef.current < 7000;
        if (tutorialRef.current && !tutorialSlow) {
          tutorialRef.current = false;
          setTutorialActive(false);
        }
        const rawMs = Math.min(ts - lastTsRef.current, 50);
        let dtSec = (rawMs / 1000) * (tutorialSlow ? 0.45 : speedRef.current);
        lastTsRef.current = ts;
        // 히트스톱 — 보스 격추·방어막 붕괴·화살비 순간 세계가 한 박자 멈춘다 (실시간 기준이라 시뮬엔 없다, 2026-10-01)
        if (world.hitStopMs > 0) { world.hitStopMs = Math.max(0, world.hitStopMs - rawMs); dtSec *= 0.1; }
        if (world.barrierBreaks !== breachSeenRef.current) { breachSeenRef.current = world.barrierBreaks; if (world.barrierBreaks > 0) haptic("heavy"); }

        // QA(개발 빌드 전용): localStorage dodgebullets:qa-godmode=1 이면 피격해도 죽지 않는다 — 클리어·성장 선택·보스 화면을 브라우저 검증이 볼 수 있게
        if (import.meta.env.DEV && qaGodmodeRef.current && stateRef.current === "playing") world.barrierHp = world.barrierMaxHp;
        // 성장 선택: 런 XP 로 레벨업할 때마다(perks.ts) 멈추고 3택 — 레벨이 오를수록 화살도 빨라진다(world.tempo)
        if (stateRef.current === "playing" && !dyingRef.current && world.levelUps > 0) {
          world.levelUps = 0;
          setPerkOptions(pickPerks(world));
          stateRef.current = "perk";
          setGameState("perk");
        }
        // ×2 배속에서 느린 프레임(50ms)이면 한 번에 100ms 가 흐른다 — 기본 화살(720px/s)이 72px 를 건너뛰어 몬스터를 지나친다.
        // 33ms 넘게 흐르면 나눠서 돌리고, 사건(피격·사망·클리어)이 나면 거기서 멈춘다
        const steps = Math.max(1, Math.ceil(dtSec / 0.033));
        let event: ReturnType<typeof updateWorld> = { type: "none" };
        for (let i = 0; i < steps; i += 1) {
          event = updateWorld(world, dtSec / steps, stateRef.current === "playing", inputRef.current);
          if (event.type !== "none") break;
        }
        consumeActionEdges(inputRef.current);
        drawFrame(ctx, world);
        // 활 사격 효과음 — 한 프레임에 여럿이 겹치면 시끄럽다. 센 것 하나만, 발사음은 90ms 에 한 번
        {
          const f = world.sfx, seen = sfxSeenRef.current;
          if (f.shot < seen.shot) sfxSeenRef.current = { ...f };   // 새 런 — 계수기가 되돌아갔다
          else {
            if (f.boom !== seen.boom) sound.playBoom();
            else if (f.thud !== seen.thud) sound.playThud();
            else if (f.zap !== seen.zap) sound.playZap();
            else if (f.freeze !== seen.freeze) sound.playFreeze();
            else if (f.hit !== seen.hit) sound.playArrowHit();
            else if (f.shot !== seen.shot && ts - shotSfxTsRef.current > 90) { shotSfxTsRef.current = ts; sound.playShot(); }
            if (f.learn !== seen.learn) sound.playLearn();
            sfxSeenRef.current = { ...f };
          }
        }

        if (stateRef.current === "playing") {
          if (world.score !== scoreRef.current) {
            scoreRef.current = world.score;
            setScore(world.score);
          }
          if (ts - skillHudTsRef.current > 100) {
            skillHudTsRef.current = ts;
            // 기본 사격은 무기의 것 — 스킬이 없어도 독이 비지 않게 맨 앞에 (2026-09-29)
            const basic = world.rangedWeapon !== "none"
              ? [{ id: "basic" as const, lv: 0, ready: 1 - Math.max(0, world.basicTimer) / Math.max(0.01, basicCooldown(world)) }]
              : [];
            setSkillHud([...basic, ...EXPEDITION_SKILLS
              .filter((d) => d.id !== "ultimate" && !!world.runSkills[d.id] && (world.skillLevels[d.id] ?? 0) > 0)
              .map((d) => {
                // 쏘는 쪽과 같은 값 — 칩·수집 보너스·화살통을 빼고 재면 게이지가 실제보다 늦게 찬다
                const full = skillCooldown(world, d.id as Exclude<typeof d.id, "ultimate">);
                const left = Math.max(0, world.skillTimers[d.id] ?? 0);
                return { id: d.id, lv: world.skillLevels[d.id], ready: full > 0 ? 1 - left / full : 1 };
              })]);
          }
          if (world.runLevel !== hudLevelRef.current || Math.abs(world.runXp - hudXpRef.current) >= 1) {
            hudLevelRef.current = world.runLevel;
            hudXpRef.current = world.runXp;
            setRunHud({ level: world.runLevel, pct: Math.min(100, Math.round((world.runXp / runXpToNext(world.runLevel)) * 100)), tempo: world.tempo });
          }
          const stage = getStage(world.stageIndex);
          const remain = Math.max(0, stage.durationMs - world.stageElapsedMs);
          const remainSecNow = Math.ceil(remain / 1000);
          if (remainSecNow !== hudRemainSecRef.current) {
            hudRemainSecRef.current = remainSecNow;
            setStageRemainMs(remain);
          }
          if (world.player.hp !== hudHpRef.current) {
            hudHpRef.current = world.player.hp;
            setHp(world.player.hp);
          }
          if (world.player.maxHp !== hudMaxHpRef.current) {
            hudMaxHpRef.current = world.player.maxHp;
            setMaxHp(world.player.maxHp);
          }
          // 웨이브 전환 · 보스 등장 배너
          {
            const wv = waveAt(getStage(world.stageIndex), world.stageElapsedMs);
            const waveKey = world.stageIndex * 100 + wv.index;
            if (waveKey !== hudWaveRef.current) {
              const first = hudWaveRef.current === 0 || Math.floor(hudWaveRef.current / 100) !== world.stageIndex;
              hudWaveRef.current = waveKey;
              hudBossRef.current = false;
              if (!first && !world.bossSpawned) showBanner(`WAVE ${wv.index}`, PATTERN_LABEL[getStage(world.stageIndex).patterns[wv.index - 1]?.kind ?? ""] ?? "", false);
            }
            if (world.bossSpawned && !hudBossRef.current) {
              hudBossRef.current = true;
              const bp = bossPatternFor(world.stageIndex + 1);
              showBanner(`BOSS · ${bp.name}`, bp.hint, true);
            }
          }
          if (world.combo !== hudComboRef.current) {
            if (world.combo > hudComboRef.current && world.combo > 0 && world.combo % 5 === 0) {
              sound.playWhoosh();
            }
            hudComboRef.current = world.combo;
            setCombo(world.combo);
          }
        }

        if (event.type === "hit" && stateRef.current === "playing") {
          sound.playHit();
          haptic("hit");
        }

        // 쓰러지는 동작(0.5초)이 보이게 — 전에는 죽는 프레임에 바로 결과 화면이 떠서 주인공이 선 채로 멈췄다 (2026-10-01)
        if (event.type === "dead" && stateRef.current === "playing" && !dyingRef.current) {
          haptic("fail");
          dyingRef.current = true;
          clearKeys(inputRef.current);
          setPointer(inputRef.current, false);
          sound.stopBgm();
          sound.playHit();
          window.setTimeout(() => {
            dyingRef.current = false;
            if (stateRef.current !== "playing") return;
            clearKeys(inputRef.current);
            setPointer(inputRef.current, false);
            const finalScore = world.score;
            scoreRef.current = finalScore;
            setScore(finalScore);
            setLastScore(finalScore);
            setAllClear(false);
            setExtracted(false);
            void saveHighScore(userHashRef.current, finalScore).then(setHighScore);
            stateRef.current = "gameover";
            setGameState("gameover");
            // 일일 임무는 결과와 무관하게 이 스테이지에서 한 만큼 센다 (클리어 보상과 다른 id)
            void grantCharacterReward(userHashRef.current, `dodge:${dodgeRunIdRef.current}:fail:${world.stageIndex}`, {
              dailyProgress: { skillKills: world.skillKills, epicPicks: world.epicPicks, clears: 0 },
              skillShards: shardDrops(world.runSkills, world.stageIndex, false, world.ultCount),
              lastContent: "dodge",
            }).then(async (next) => {
              // 성문 방어 3·4스테이지에서 두 번째 실패 — 성문 수비 보급 순간 제안 (유료 게이트·이미 열린 창은 openMomentOffer 가 거른다)
              if (world.stageIndex >= 2) {
                const fails = (gateFailsRef.current[world.stageIndex] ?? 0) + 1;
                gateFailsRef.current[world.stageIndex] = fails;
                if (fails >= 2) next = await updateCharacterProgress(userHashRef.current, (current) => openMomentOffer(current, "gate-wall"));
              }
              setProgress(next);
            });
            trackEvent("arrow_expedition_fail", { stage: world.stageIndex + 1, score: finalScore, duration: Math.round(world.elapsedMs / 1000) });
            setDeathTip(DEATH_TIPS[world.lastHitCause] ?? "");
          }, 650);
        }

        if (event.type === "clear" && stateRef.current === "playing") {
          sound.stopBgm();
          sound.playClear();
          haptic("success");
          const stage = getStage(world.stageIndex);
          const reward =
            computeClearReward(
              stage.baseReward,
              world.barrierHp,
              world.barrierMaxHp,
              world.stageElapsedMs,
              stage.durationMs,
            ) + Math.min(40, world.maxCombo * 2) + world.supplies * 3
              + world.enemyKills * 5 + world.perfectDodges * 8 + world.chests * 30 + world.expeditionSeals * 20;
          setCoinGain(reward);
          sound.playCoin();
          // dodge 별점 — ★ 클리어 · ★★ 방어막 50% 이상 · ★★★ 방어막 90% 이상 + 콤보 10 (방어막이 유일한 생명, 2026-10-02).
          // 성벽(무한)은 층수가 이미 목적이라 미적용.
          const starFloor = towerFloorOf(world.stageIndex);
          const starsGained = starFloor > 0 ? 0 : starsForClear(world);
          void (async () => {
            const nextCoins = await saveCoins(
              userHashRef.current,
              coinsRef.current + reward,
            );
            coinsRef.current = nextCoins;
            setCoins(nextCoins);
            const growth = dodgeClearReward(world.stageIndex, world.maxCombo);
            let nextProgress = await grantCharacterReward(
              userHashRef.current,
              `dodge:${dodgeRunIdRef.current}:stage:${world.stageIndex}`,
              {
                exp: growth.exp,
                sharedCoins: reward,
                enhancementMaterials: growth.materials + Math.floor(world.supplies / 8)
                  + world.enemyKills + world.perfectDodges * 2 + world.chests * 4,
                dodgeStage: world.stageIndex + 1,
                dailyProgress: { skillKills: world.skillKills, epicPicks: world.epicPicks, clears: 1 },
                skillShards: shardDrops(world.runSkills, world.stageIndex, true, world.ultCount),
                // 배속은 순수한 손해가 아니라 선택이어야 한다 — 빨리 돌린 만큼 인장을 더 준다 (2026-09-28)
                expeditionSeals: Math.round(world.expeditionSeals * (speedRef.current > 1 ? 1.25 : 1)),
                lastContent: "dodge",
              },
            );

            // 원정 클리어 = 사냥터 지역 개척. Stage 1~4 → 지역 2~5.
            const openedArea = Math.min(HUNTING_AREAS.length, world.stageIndex + 2);
            if (nextProgress.pioneeredArea < openedArea) {
              // retention-4: 개척 직후 축하 제안(개척 축하 세트) — 사냥터로 돌아오면 카드가 뜬다
              nextProgress = await updateCharacterProgress(userHashRef.current, (current) => openMomentOffer({
                ...current,
                pioneeredArea: Math.max(current.pioneeredArea, openedArea),
              }, "pioneer"));
              sfxAreaUnlock();
              setPioneeredAreaIndex(openedArea);
              // 첫 지역 개척 = 게임 루프가 처음으로 완성되는 감정 고점 — 리뷰 요청 적기
              if (openedArea === 2) void requestReviewOnce("first-pioneer");
            }

            // 끝없는 성벽 — 층 기록은 방치 배율(M)로 환산된다. 100층당 ×+0.05.
            const floor = towerFloorOf(world.stageIndex);
            if (floor > 0) {
              if (floor > nextProgress.towerBestFloor) {
                nextProgress = await updateCharacterProgress(userHashRef.current, (current) => ({
                  ...current,
                  towerBestFloor: Math.max(current.towerBestFloor, floor),
                }));
              }
              if (floor % 10 === 0) {
                sfxTowerMilestone();
                // 성벽 10층마다 동료 조각 +1 (LIVEOPS §2.2)
                const titansSave = await loadTitansSave(userHashRef.current);
                nextProgress = await updateCharacterProgress(userHashRef.current, (current) => {
                  const target = randomOwnedAlly(titansSave.heroes, Math.random, current.partyIds);
                  return {
                    ...current,
                    allyShards: { ...current.allyShards, [target]: (current.allyShards[target] ?? 0) + 1 },
                  };
                });
              } else {
                sfxTowerFloor(floor);
              }
            }

            // 별점 기록 — 스테이지별 최고 기록만 남긴다. 12개 마일스톤은 1회 보상.
            if (starsGained > 0) {
              const stageKey = String(world.stageIndex);
              const prevStars = nextProgress.dodgeStars[stageKey] ?? 0;
              if (starsGained > prevStars) {
                nextProgress = await updateCharacterProgress(userHashRef.current, (current) => ({
                  ...current,
                  dodgeStars: {
                    ...current.dodgeStars,
                    [stageKey]: Math.max(current.dodgeStars[stageKey] ?? 0, starsGained),
                  },
                }));
              }
              const totalStars = Object.values(nextProgress.dodgeStars).reduce((a, b) => a + b, 0);
              setStarResult({ stars: starsGained, improved: starsGained > prevStars, total: totalStars });
              window.setTimeout(() => setStarResult(null), 2400);
              if (totalStars >= 12 && !nextProgress.claimedRewards.includes("dodge-stars-12")) {
                const titansForStars = await loadTitansSave(userHashRef.current);
                nextProgress = await updateCharacterProgress(userHashRef.current, (current) => {
                  if (current.claimedRewards.includes("dodge-stars-12")) return current;
                  const shards = { ...current.allyShards };
                  for (let i = 0; i < 10; i += 1) {
                    const target = randomOwnedAlly(titansForStars.heroes, Math.random, current.partyIds);
                    shards[target] = (shards[target] ?? 0) + 1;
                  }
                  return {
                    ...current,
                    redGems: current.redGems + 60,
                    allyShards: shards,
                    claimedRewards: [...current.claimedRewards, "dodge-stars-12"],
                  };
                });
                setShoulderDrop("원정 전 별 12개 달성 · 보석 +60 · 동료 조각 +10");
              }
            }

            // 오늘의 첫 원정 클리어 2배 (LIVEOPS §2.4)
            const dodgeToday = new Date().toLocaleDateString("sv-SE");
            if (nextProgress.firstClearDates.dodge !== dodgeToday) {
              nextProgress = await updateCharacterProgress(userHashRef.current, (current) => ({
                ...current,
                sharedCoins: current.sharedCoins + reward, // 기본 보상만큼 추가 = 2배
                firstClearDates: { ...current.firstClearDates, dodge: dodgeToday },
              }));
              setShoulderDrop("오늘의 첫 원정 클리어 · 코인 2배!");
            }

            const shoulder = EXPEDITION_SHOULDERS[Math.min(3, world.stageIndex)];
            const first = !nextProgress.ownedShoulders.includes(shoulder);
            const dropped = first || Math.random() < (barrierRatio(world) >= 0.9 ? .35 : .18);
            if (dropped) {
              const equipped = await updateCharacterProgress(userHashRef.current, (current) => ({
                ...current,
                ownedShoulders: [...new Set([...current.ownedShoulders, shoulder])],
                shoulderShards: current.shoulderShards + (first ? 0 : 15 + world.stageIndex * 5),
              }));
              setProgress(equipped);
              setShoulderDrop(first ? `${getStage(world.stageIndex).name} 견갑 획득!` : "중복 견갑 · 조각으로 변환");
            } else {
              setProgress(nextProgress);
              setShoulderDrop("");
            }
          })();
          void saveHighScore(userHashRef.current, world.score).then(setHighScore);
          setLastScore(world.score);
          const last = isLastStage(world.stageIndex);
          setAllClear(last);
          setExtracted(false);

          // Stage 3+ and all mid clears: skip menu, keep flowing
          if (!last) {
            const next = world.stageIndex + 1;
            prepareWorldForStage(next);
            lastTsRef.current = 0;
            sound.playStart();
            stateRef.current = "intro";
            setGameState("intro");
          } else {
            stateRef.current = "clear";
            setGameState("clear");
            trackEvent("arrow_expedition_clear", { stage: world.stageIndex + 1, score: world.score, duration: Math.round(world.elapsedMs / 1000), combo: world.maxCombo });
          }
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      sound.stopBgm();
      sound.enterBackground();
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      offVisibility();
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      canvas.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("gesturestart", onGesture);
      document.removeEventListener("gesturechange", onGesture);
    };
  // The stage preparer reads mutable world refs and is intentionally not an effect dependency.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applyInsets, fitCanvas]);

  const prepareWorldForStage = (index: number) => {
    const world = worldRef.current;
    if (!world) return;
    applyInsetsToWorld(world, insetsRef.current);
    // progressRef — 이 함수는 게임 루프의 오래된 클로저에서도 불린다
    loadLoadout(world, shopLevelsRef.current, progressRef.current);
    beginStage(world, index);
    const stage = getStage(index);
    setStageIndex(index);
    setStageLabel(stage.name);
    setStageIntro(stage.intro);
    setStageRemainMs(stage.durationMs);
    setHp(world.player.hp);
    setMaxHp(world.player.maxHp);
  };

  const handleStart = async (fromStage = 0) => {
    if (!bootReady) return;
    await unlockAudio();
    dodgeRunIdRef.current = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    trackEvent("arrow_expedition_start", { stage: fromStage + 1, player_power: progress.equippedWeaponLevel });
    perkStageRef.current = -1;
    setAdDoubled(false);
    hudWaveRef.current = 0;
    hudBossRef.current = false;
    setHudBanner(null);
    const world = worldRef.current;
    if (world) {
      applyInsetsToWorld(world, insetsRef.current);
      loadLoadout(world, shopLevelsRef.current, progress);
      resetRun(world, fromStage);
      // 보급 소모 — 산 것을 이번 런에 쓴다. 안 쓰고 남겨 두면 인장만 잠긴다
      const stock = progress.expeditionSupplies;
      const used: SupplyId[] = [];
      if (stock.draft > 0) { world.draftBoost = true; used.push("draft"); }
      if (stock.primed > 0) {
        world.primedMs = PRIMED_MS;
        world.slashGauge = Math.min(99, world.slashGauge + 30);
        used.push("primed");
      }
      if (stock.insurance > 0) {
        world.player.maxHp += 1;
        world.player.hp += 1;
        world.runMods.maxHpBonus += 1;   // 스테이지가 넘어가도 유지되게
        syncBarrierLives(world);          // 생명 +1 = 방어막 +15%
        used.push("insurance");
      }
      if (used.length) {
        setHp(world.player.hp);
        setMaxHp(world.player.maxHp);
        showBanner("보급 사용", used.map((id) => SUPPLY_BY_ID[id].name).join(" · "), false);
        void (async () => {
          const next = await updateCharacterProgress(userHashRef.current, (p) => {
            const s = { ...p.expeditionSupplies };
            used.forEach((id) => { s[id] = Math.max(0, (s[id] ?? 0) - 1); });
            return { ...p, expeditionSupplies: s };
          });
          setProgress(next);
        })();
      }
    }
    prepareWorldForStage(fromStage);
    scoreRef.current = 0;
    setScore(0);
    setCombo(0);
    hudComboRef.current = 0;
    setCoinGain(0);
    setAllClear(false);
    setExtracted(false);
    clearKeys(inputRef.current);
    setPointer(inputRef.current, false);
    lastTsRef.current = 0;
    soundRef.current.playStart();
    syncState("intro");
  };

  /** 결과 공유 카드 (RETENTION H) — 별점·전투력·칭호를 canvas 카드로 */
  const shareDodgeCard = async () => {
    const stars = Object.values(progress.dodgeStars).reduce((a, b) => a + b, 0);
    const blob = await renderShareCard({
      headline: extracted ? "보급품 확보" : allClear ? "전 스테이지 클리어" : `${stageLabel} 클리어`,
      subline: `점수 ${lastScore.toLocaleString()} · 원정 별 ${stars}/12`,
      stars: progress.dodgeStars[String(stageIndex)] ?? 0,
      power: combatPower(progress),
      titleName: progress.activeTitle ? TITLES[progress.activeTitle]?.name : undefined,
      titleColor: progress.activeTitle ? TITLES[progress.activeTitle]?.color : undefined,
      characterSheet: sheetFor(progress.activeCharacter, "idle"),
      accent: "#7dd3fc",
    });
    if (!blob) return;
    const result = await shareCard(blob);
    setShoulderDrop(result === "shared" ? "기록 카드를 공유했습니다" : result === "opened" ? "기록 카드를 새 탭에 열었습니다 — 길게 눌러 저장" : result === "shown" ? "기록 카드를 띄웠습니다 — 스크린샷으로 저장하세요" : "공유를 지원하지 않는 환경입니다");
  };

  /** 성문 보급소 결제 — QA 빌드 테스트 모드면 무료 테스트 지급, 아니면 스토어 (payments/store.purchaseProduct) */
  const handleBuyProduct = async (productId: string) => {
    if (buyingProduct) return;
    setBuyingProduct(productId);
    try {
      const r = await purchaseProduct(userHashRef.current, productId);
      const name = STORE_PRODUCTS.find((p) => p.id === productId)?.name ?? productId;
      if (r.status === "granted" && r.progress) { setProgress(r.progress); showToast(`${name} 구매 완료${r.bonus ? ` · 보너스 보석 +${r.bonus}` : ""}`); }
      else if (r.status === "duplicate") showToast("이미 지급된 구매입니다");
      else if (r.status === "pending") showToast("결제 확인 중입니다 — 확인되면 자동으로 지급됩니다", 3200);
      else if (r.status === "unavailable") showToast(paidStoreNote(), 3200);
    } finally {
      setBuyingProduct(null);
    }
  };
  /** 원정 기금 단계 수령 */
  const handleClaimFund = (tierId: string) => {
    let gems = 0;
    void updateCharacterProgress(userHashRef.current, (current) => { const r = claimGateFundTier(current, tierId); gems = r.gems; return r.progress; })
      .then((next) => { setProgress(next); if (gems > 0) showToast(`원정 기금 보석 +${gems}`); });
  };
  /** 구매 복원 — 스토어 내역으로 지급 전에 죽은 구매·재설치 영구 상품을 되살리고 환불을 거둔다 */
  const handleRestorePurchases = async () => {
    showToast("구매 내역을 확인하는 중…", 6000);
    const r = await reconcileStore(userHashRef.current);
    // 바뀐 것이 있을 때만 사냥터에 알린다 — 없을 때 알리면 사냥터가 "0건 회수" 토스트를 띄웠다
    if (r.granted || r.revoked || r.cores) window.dispatchEvent(new CustomEvent("dodgebullets:store-reconciled", { detail: { ...r, handled: false } }));
    setProgress(await loadCharacterProgress(userHashRef.current));
    showToast(r.granted || r.revoked ? `구매 ${r.granted}건 지급 · ${r.revoked}건 회수` : "되살릴 구매가 없습니다");
  };

  /** 기본 사격 강화 — 골드만 쓴다 (2026-10-02). 즉시 전투 월드에 반영 */
  const handleUpgradeBasic = useCallback(() => {
    const lv = progress.expeditionBasic;
    if (lv >= BASIC_LEVEL_MAX || progress.sharedCoins < basicShotCost(lv + 1)) return;
    void (async () => {
      const next = await updateCharacterProgress(userHashRef.current, (p) => {
        const now = p.expeditionBasic;
        if (now >= BASIC_LEVEL_MAX) return p;
        const c = basicShotCost(now + 1);
        if (p.sharedCoins < c) return p;
        return { ...p, sharedCoins: p.sharedCoins - c, expeditionBasic: now + 1 };
      });
      setProgress(next);
      const merged = mergeShopLevels(shopLevelsRef.current, derivedShopLevels(next));
      if (worldRef.current) loadLoadout(worldRef.current, merged, next);
    })();
  }, [progress]);

  /** 스킬 강화 — 골드(공용 코인)와 **그 스킬의 조각**을 쓰고 레벨을 올린다. 즉시 스탯에 반영된다 */
  const handleUpgradeSkill = useCallback((id: ExpeditionSkillId) => {
    const current = progress;
    const def = SKILL_BY_ID[id];
    const lv = current.expeditionSkills[id] ?? 0;
    if (lv >= SKILL_MAX_LEVEL || !skillUnlocked(def, current.dodgeBestStage)) return;
    const cost = skillCost(def, lv + 1);
    if (current.sharedCoins < cost.gold || (current.expeditionShards[id] ?? 0) < cost.shards || current.expeditionSeals < cost.seals) return;
    void (async () => {
      const next = await updateCharacterProgress(userHashRef.current, (p) => {
        // 저장된 값으로 다시 본다 — 빠르게 두 번 누르면 밖의 검사는 둘 다 통과한다
        const now = p.expeditionSkills[id] ?? 0;
        if (now >= SKILL_MAX_LEVEL) return p;
        const c = skillCost(def, now + 1);
        if (p.sharedCoins < c.gold || (p.expeditionShards[id] ?? 0) < c.shards || p.expeditionSeals < c.seals) return p;
        return {
          ...p,
          sharedCoins: p.sharedCoins - c.gold,
          expeditionSeals: p.expeditionSeals - c.seals,
          expeditionShards: { ...p.expeditionShards, [id]: (p.expeditionShards[id] ?? 0) - c.shards },
          expeditionSkills: { ...p.expeditionSkills, [id]: now + 1 },
        };
      });
      setProgress(next);
      const merged = mergeShopLevels(shopLevelsRef.current, derivedShopLevels(next));
      if (worldRef.current) loadLoadout(worldRef.current, merged, next);
    })();
  }, [progress]);

  /** 원거리 무기 교체 — 같은 캐릭터에 활/지팡이를 바꿔 끼운다. 맨손은 없다 */
  const handleEquipWeapon = useCallback((id: RangedWeaponId) => {
    void (async () => {
      const next = await updateCharacterProgress(userHashRef.current, (p) => {
        const def = id === "none" ? null : WEAPON_BY_ID[id];
        if (def && !weaponUnlocked(def, p.dodgeBestStage)) return p;   // 잠긴 무기는 못 낀다
        if (id === "none") return p;                                       // 맨손은 없다 — 활만 쓰는 콘텐츠다 (2026-10-01)
        return { ...p, expeditionWeapon: id };
      });
      setProgress(next);
      const merged = mergeShopLevels(shopLevelsRef.current, derivedShopLevels(next));
      if (worldRef.current) loadLoadout(worldRef.current, merged, next);
    })();
  }, []);

  /** 칩 강화 — 원정 인장을 쓴다. 보급창과 같은 재화라 "칩이냐 보급이냐"가 선택이 된다 */
  const handleUpgradeChip = useCallback((id: ChipId) => {
    const lv = progress.expeditionChips[id] ?? 0;
    if (lv >= CHIP_MAX_LEVEL) return;
    const cost = chipCost(lv + 1);
    if (progress.expeditionSeals < cost) return;
    void (async () => {
      const next = await updateCharacterProgress(userHashRef.current, (p) => {
        const now = p.expeditionChips[id] ?? 0;
        if (now >= CHIP_MAX_LEVEL) return p;
        const c = chipCost(now + 1);
        if (p.expeditionSeals < c) return p;
        return { ...p, expeditionSeals: p.expeditionSeals - c, expeditionChips: { ...p.expeditionChips, [id]: now + 1 } };
      });
      setProgress(next);
      const merged = mergeShopLevels(shopLevelsRef.current, derivedShopLevels(next));
      if (worldRef.current) loadLoadout(worldRef.current, merged, next);
    })();
  }, [progress]);

  /** 칩 탈착 — 같은 칩을 다시 누르면 빼고, 다른 칸에 이미 끼워 둔 것은 옮겨 온다 */
  const handleEquipChip = useCallback((slot: number, id: ChipId | null) => {
    void (async () => {
      const next = await updateCharacterProgress(userHashRef.current, (p) => {
        const slots = [...p.equippedChips];
        if (id && slots.includes(id)) slots[slots.indexOf(id)] = null;
        slots[slot] = slots[slot] === id ? null : id;
        return { ...p, equippedChips: slots };
      });
      setProgress(next);
      const merged = mergeShopLevels(shopLevelsRef.current, derivedShopLevels(next));
      if (worldRef.current) loadLoadout(worldRef.current, merged, next);
    })();
  }, []);

  /** 보급 구매 — 인장을 "지금 쓰는" 자리. 칩과 같은 재화라 선택이 생긴다 */
  const handleBuySupply = useCallback((id: SupplyId) => {
    const def = SUPPLY_BY_ID[id];
    if (progress.expeditionSeals < def.seals) return;
    if ((progress.expeditionSupplies[id] ?? 0) >= SUPPLY_MAX) return;
    void (async () => {
      const next = await updateCharacterProgress(userHashRef.current, (p) => {
        const have = p.expeditionSupplies[id] ?? 0;
        if (p.expeditionSeals < def.seals || have >= SUPPLY_MAX) return p;
        return { ...p, expeditionSeals: p.expeditionSeals - def.seals, expeditionSupplies: { ...p.expeditionSupplies, [id]: have + 1 } };
      });
      setProgress(next);
    })();
  }, [progress]);

  /** 일일 임무 보상 수령 — 보상은 인장이라 칩·보급으로 되돌아간다 */
  const handleClaimDaily = useCallback((id: DailyId) => {
    if (!dailyClaimable(rolledDaily(progress.expeditionDaily), id)) return;
    void (async () => {
      const next = await updateCharacterProgress(userHashRef.current, (p) => {
        const d = rolledDaily(p.expeditionDaily);
        if (!dailyClaimable(d, id)) return p;
        return {
          ...p,
          expeditionSeals: p.expeditionSeals + DAILY_BY_ID[id].seals,
          expeditionDaily: { ...d, claimed: [...d.claimed, id] },
        };
      });
      setProgress(next);
    })();
  }, [progress]);

  const handleBeginPlay = useCallback(() => {
    lastTsRef.current = 0;
    // 첫 원정 1회: 슬로모션 튜토리얼 시작 + 기록 (다음 판부터는 정상 속도)
    if (tutorialEligibleRef.current && worldRef.current?.stageIndex === 0) {
      tutorialEligibleRef.current = false;
      tutorialRef.current = true;
      tutorialStartRef.current = performance.now();
      setTutorialActive(true);
      void updateCharacterProgress(userHashRef.current, (current) =>
        current.claimedRewards.includes("dodge-tutorial")
          ? current
          : { ...current, claimedRewards: [...current.claimedRewards, "dodge-tutorial"] },
      );
    }
    syncState("playing");
    soundRef.current.startBgm();
  }, [syncState]);

  useEffect(() => {
    if (gameState !== "intro") return;
    const id = window.setTimeout(() => {
      if (stateRef.current === "intro") handleBeginPlay();
    }, 750);
    return () => window.clearTimeout(id);
  }, [gameState, stageIndex, handleBeginPlay]);

  const handleNextStage = () => {
    if (allClear || extracted) {
      syncState("ready");
      setMenuTab("play");
      return;
    }
    const next = stageIndex + 1;
    prepareWorldForStage(next);
    lastTsRef.current = 0;
    soundRef.current.playStart();
    syncState("intro");
  };

  const handleRestart = () => {
    void handleStart(stageIndex);
  };

  const handleExtract = () => {
    const world = worldRef.current;
    if (!world || stateRef.current !== "playing" || world.stageElapsedMs < 15_000) return;
    const stage = getStage(world.stageIndex);
    const survivalRatio = Math.min(1, world.stageElapsedMs / stage.durationMs);
  const reward = Math.max(20, Math.floor(stage.baseReward * survivalRatio * 0.72 + world.maxCombo * 2 + world.supplies * 2
    + world.enemyKills * 4 + world.perfectDodges * 6 + world.chests * 24));
    const growth = dodgeClearReward(world.stageIndex, world.maxCombo);
    soundRef.current.stopBgm();
    soundRef.current.playCoin();
    clearKeys(inputRef.current);
    setPointer(inputRef.current, false);
    stateRef.current = "clear";
    setGameState("clear");
    setExtracted(true);
    setAllClear(false);
    setCoinGain(reward);
    setLastScore(world.score);
    void (async () => {
      const nextCoins = await saveCoins(userHashRef.current, coinsRef.current + reward);
      coinsRef.current = nextCoins;
      setCoins(nextCoins);
      const nextProgress = await grantCharacterReward(
        userHashRef.current,
        `dodge:${dodgeRunIdRef.current}:extract:${world.stageIndex}`,
        {
          exp: Math.floor(growth.exp * survivalRatio * 0.65),
          sharedCoins: reward,
          enhancementMaterials: Math.max(1, Math.floor(growth.materials * survivalRatio * 0.6)
            + Math.floor(world.supplies / 10) + world.enemyKills + world.perfectDodges + world.chests * 3),
          dodgeStage: world.stageIndex + 1,
          dailyProgress: { skillKills: world.skillKills, epicPicks: world.epicPicks, clears: 0 },
          skillShards: shardDrops(world.runSkills, world.stageIndex, false, world.ultCount),
          lastContent: "dodge",
        },
      );
      setProgress(nextProgress);
      // 추격대장 격파(4스테이지 보스) — 대장의 활시위: 대장간 강화 방지권 2 + 강화석 30 (특수 드랍)
      if (world.stageIndex === 3 && world.bossDefeated) {
        const dropped = await updateCharacterProgress(userHashRef.current, (current) => ({
          ...current,
          forgeTicketsPending: current.forgeTicketsPending + 2,
          enhancementMaterials: current.enhancementMaterials + 30,
        }));
        setProgress(dropped);
        setShoulderDrop("추격대장 격파 · 「대장의 활시위」 — 강화 방지권 +2 · 강화석 +30");
      }
    })();
  };

  const handleBackToReady = () => {
    soundRef.current.stopBgm();
    syncState("ready");
    setMenuTab("play");
  };

  const handleBackToHub = () => {
    soundRef.current.stopBgm();
    syncState("ready");
    setMenuTab("play");
    setProfileRefresh((value) => value + 1);
    setMode("titans");
    // 화면의 progress 가 아니라 저장본에서 합친다 — 오래된 화면 값이 부팅 결제 정산·다른 화면의 저장을 덮어쓰지 않게
    void migrateLegacyProgress(userHashRef.current).then(setProgress);
  };

  // 보급소 삭제 후: 기동·검격 스탯은 캐릭터 성장에서 파생된다. 진행도가 바뀔 때마다
  // (강화·레벨업 후 복귀) 저장된 구매 레벨과 파생 레벨 중 높은 쪽을 적용한다.
  useEffect(() => {
    if (!bootReady) return;
    const merged = mergeShopLevels(shopLevelsRef.current, derivedShopLevels(progress));
    const changed = (Object.keys(merged) as ShopUpgradeId[]).some((id) => merged[id] !== shopLevelsRef.current[id]);
    if (!changed) return;
    shopLevelsRef.current = merged;
    setShopLevels(merged);
    if (worldRef.current) loadLoadout(worldRef.current, merged, progress);
    void saveShopLevels(userHashRef.current, merged);
  }, [bootReady, progress]);

  const confirmExit = async () => {
    soundRef.current.stopBgm();
    soundRef.current.enterBackground();
    setExitOpen(false);
    // 네이티브(안드로이드/iOS)면 Capacitor 경로, 아니면 앱인토스 closeView.
    if (await exitAppNative()) return;
    await closeMiniApp();
  };

  const openCommunity = () => {
    if (!COMMUNITY_URL) return;
    window.open(COMMUNITY_URL, "_blank", "noopener,noreferrer");
    setSettingsOpen(false);
  };

  const qaMode = import.meta.env.DEV && new URLSearchParams(location.search).has("qa");
  const isNewRecord = lastScore > 0 && lastScore >= highScore;
  const stage = getStage(stageIndex);
  const towerFloor = towerFloorOf(stageIndex);
  const expeditionElapsed = Math.max(0, stage.durationMs - stageRemainMs);
  const expeditionRatio = Math.min(1, expeditionElapsed / stage.durationMs);
  const threatLevel = expeditionRatio < 0.25 ? 1 : expeditionRatio < 0.5 ? 2 : expeditionRatio < 0.78 ? 3 : 4;

  const dockStyle = {
    paddingTop: insets.top,
    paddingLeft: insets.left,
    paddingRight: insets.right,
  } as const;

  return (
    <div className="game-root">
      <canvas
        ref={canvasRef}
        className={`game-canvas ${appMode === "dodge" ? "is-active" : "is-inactive"}`}
        aria-label="성문 방어 게임 화면"
        aria-hidden={appMode !== "dodge"}
      />

      <div className="sound-dock" style={dockStyle}>
        {(appMode === "titans" || appMode === "profile") && (
          <div className="settings-wrap">
            <button
              type="button"
              className="settings-toggle"
              onClick={() => setSettingsOpen((open) => !open)}
              aria-expanded={settingsOpen}
              aria-haspopup="menu"
            >
              <span aria-hidden="true">⚙</span> 설정
            </button>
            {settingsOpen && (
              <div className="settings-menu" role="menu">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setSettingsOpen(false);
                    setAppMode("profile");
                  }}
                >
                  <span><ContentIcon name="profile" /> 마이페이지</span><b>›</b>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => void toggleSound()}
                  aria-pressed={soundOn}
                >
                  <span>사운드</span>
                  <b>{soundOn ? "ON" : "OFF"}</b>
                </button>
                {/* 온보딩(§8) — 이벤트류는 마지막 단계(4)에서 열린다 */}
                <button
                  type="button"
                  role="menuitem"
                  disabled={progress.onboardingStep < 4}
                  onClick={() => { setSettingsOpen(false); setAttendanceOpen(true); }}
                >
                  <span>출석 이벤트</span><b>{progress.onboardingStep < 4 ? "잠김" : "7일"}</b>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  disabled={progress.onboardingStep < 4}
                  onClick={() => { setSettingsOpen(false); setEventOpen(true); }}
                >
                  <span>모험가 이벤트</span><b>{progress.onboardingStep < 4 ? "잠김" : "NEW"}</b>
                </button>
                <button type="button" role="menuitem" onClick={() => { setSettingsOpen(false); setBackupOpen(true); }}>
                  <span>세이브 백업</span><b className="menu-badge-warn">권장</b>
                </button>
                {paymentEnvironment() !== "web" && (
                  <button type="button" role="menuitem" onClick={() => { setSettingsOpen(false); void handleRestorePurchases(); }}>
                    <span>구매 복원</span><b>스토어</b>
                  </button>
                )}
                {/* 테스트용 — 보석 무제한. 라이브에 노출되지 않도록 DEV 빌드이거나 빌드 라벨을 7번 탭해 테스트 모드를 연 뒤에만 보인다 */}
                {QA_BUILD && (import.meta.env.DEV || testMode) && <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    const on = localStorage.getItem(QA_GEMS_KEY) === "1";
                    if (on) localStorage.removeItem(QA_GEMS_KEY); else localStorage.setItem(QA_GEMS_KEY, "1");
                    setSettingsOpen(false);
                    void updateCharacterProgress(userHashRef.current, (current) => (on ? current : { ...current, redGems: QA_GEMS_AMOUNT })).then((next) => setProgress(next));
                  }}
                  aria-pressed={qaGemsEnabled()}
                >
                  <span>테스트 · 보석 무제한</span><b>{qaGemsEnabled() ? "ON" : "OFF"}</b>
                </button>}
                <button type="button" role="menuitem" className="settings-build" onClick={tapBuildLabel}>
                  <span>DODGE LAB</span><b>{testMode ? "테스트 모드" : "빌드 2026.09"}</b>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  disabled={errorLogCount() === 0}
                  title="문의 시 GitHub Issues에 붙여넣어 주세요"
                  onClick={() => {
                    void copyToClipboard(serializeErrorLog()).then((done) => {
                      setSettingsToast(done ? "오류 로그를 클립보드에 복사했습니다" : "복사에 실패했습니다");
                      window.setTimeout(() => setSettingsToast(""), 2200);
                    });
                  }}
                >
                  <span>오류 로그 복사</span>
                  <b>{errorLogCount()}건</b>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={openCommunity}
                  disabled={!COMMUNITY_URL}
                  title={COMMUNITY_URL ? "공식 카페 글 열기" : "카페 주소 설정이 필요합니다"}
                >
                  <span>카페 글 가기</span>
                  <b>{COMMUNITY_URL ? "↗" : "준비 중"}</b>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="settings-exit"
                  onClick={() => {
                    setSettingsOpen(false);
                    setExitOpen(true);
                  }}
                >
                  <span>게임 종료</span>
                  <b>›</b>
                </button>
              </div>
            )}
          </div>
        )}
        {appMode === "dodge" && (
          <>
            <button
              type="button"
              className="sound-toggle"
              onClick={() => void toggleSound()}
              aria-pressed={soundOn}
              aria-label={soundOn ? "사운드 끄기" : "사운드 켜기"}
            >
              {soundOn ? "사운드 On" : "사운드 Off"}
            </button>
            {(gameState === "playing" || gameState === "paused") && (
              <>
                <button
                  type="button"
                  className="battle-toggle"
                  aria-pressed={gameState === "paused"}
                  aria-label={gameState === "paused" ? "계속하기" : "일시정지"}
                  onClick={() => {
                    const next = stateRef.current === "paused" ? "playing" : "paused";
                    lastTsRef.current = 0;
                    stateRef.current = next;
                    setGameState(next);
                  }}
                >
                  {gameState === "paused" ? "계속" : "일시정지"}
                </button>
                <button
                  type="button"
                  className="battle-toggle speed-toggle"
                  aria-label={`전투 속도 ${speedMul === 1 ? "1배" : "2배"}`}
                  onClick={() => {
                    const next = speedRef.current === 1 ? 2 : 1;
                    speedRef.current = next;
                    setSpeedMul(next);
                  }}
                >
                  ×{speedMul === 1 ? "1" : "2"}
                </button>
              </>
            )}
            <button
              type="button"
              className="exit-toggle"
              onClick={handleBackToHub}
              aria-label="타이탄 사냥터로 돌아가기"
            >
              사냥터로
            </button>
          </>
        )}
      </div>

      {!bootReady && (
        <div className="game-overlay">
          <div className="overlay-content">
            <p className="brand">통합 성장 허브</p>
            <p className="subtitle">준비 중…</p>
          </div>
        </div>
      )}

      {bootReady && appMode === "profile" && (
        <Suspense fallback={<div className="lazy-screen" aria-busy="true" />}>
        <CharacterStatus
          insets={insets}
          userHash={userHashRef.current}
          coins={coins}
          highScore={highScore}
          progress={progress}
          onProgressChange={setProgress}
          refreshKey={profileRefresh}
          onOpenContent={(content) => {
            if (content === "dodge") syncState("ready");
            setMode(content);
          }}
          onBack={() => setMode("titans")}
        />
        </Suspense>
      )}

      {bootReady && appMode === "beat" && (
        <Suspense fallback={<div className="lazy-screen" aria-busy="true" />}>
        <BeatGame
          insets={insets}
          soundEnabled
          userHash={userHashRef.current}
          coins={coins}
          onCoins={(n) => {
            coinsRef.current = n;
            setCoins(n);
          }}
          onBack={handleBackToHub}
        />
        </Suspense>
      )}

      {bootReady && appMode === "forge" && (
        <Suspense fallback={<div className="lazy-screen" aria-busy="true" />}>
          <ForgeGame insets={insets} userHash={userHashRef.current} onBack={handleBackToHub} />
        </Suspense>
      )}

      {bootReady && appMode === "titans" && (
        <TitansGame
          insets={insets}
          userHash={userHashRef.current}
          forgedWeaponLevel={progress.equippedWeaponLevel}
          armorLevel={progress.armorLevel}
          onOpenEvents={(tab) => { setEventTab(tab); setEventOpen(true); }}
          onOpenContent={(content) => {
            if (content === "dodge") syncState("ready");
            setMode(content);
          }}
        />
      )}

      {bootReady && appMode === "dodge" && gameState === "ready" && preloadStageBackgrounds() && (
        <div className="game-overlay">
          <div className="overlay-content overlay-wide exp-menu-content">
            <p className="brand">GATE DEFENSE</p>
            <h1 className="title">성문 방어전</h1>
            <p className="subtitle">몬스터가 성문 <b>방어막</b>으로 걸어 내려온다 — <b>활</b>이 알아서 쏘고, 방어막이 깨지면 진다. 곁의 <b>무기 정령</b>이 속성 화살을 보태고, 게이지가 차면 <b>화살비</b>가 하늘을 덮는다</p>
            {/* 정비 화면의 칩·보급은 인장으로 산다 — 잔액이 안 보이면 살 수 있는지 알 수 없다 (2026-09-29) */}
            <p className="score-line">코인 {coins.toLocaleString()} · 인장 <b data-testid="exp-seals">{progress.expeditionSeals.toLocaleString()}</b> · 최고 {highScore.toLocaleString()}</p>

            {/* 원정대 보급소는 삭제됐다 (사용자 지시: 용도 불명). 기동·검격 스탯은
                캐릭터 성장(레벨·강화)에서 자동 파생된다 — derivedShopLevels 참조 */}
            <div className="exp-menu-tabs" role="tablist">
              <button type="button" role="tab" aria-selected={menuTab === "play"} className={menuTab === "play" ? "on" : ""} onClick={() => setMenuTab("play")}>원정</button>
              <button type="button" role="tab" aria-selected={menuTab === "skill"} className={menuTab === "skill" ? "on" : ""} onClick={() => setMenuTab("skill")} aria-label="정비 — 스킬 · 무기 · 칩 · 보급 · 임무">
                정비
                {/* 하나라도 지금 강화할 수 있으면 배지 — 참고 게임의 "!" */}
                {(EXPEDITION_SKILL_READY(progress) || DAILIES.some((d) => dailyClaimable(rolledDaily(progress.expeditionDaily), d.id))) && <i className="exp-tab-badge">!</i>}
              </button>
            </div>
            {menuTab === "play" ? (
              <>
                {/* 키 안내는 마우스·키보드 기기에서만 — 미니앱은 터치라 Space/Shift 가 없다.
                    '식별키 … 로컬 mock' 줄은 개발용 배선 상태였다 — 플레이어에게는 뜻이 없어 뺐다 (2026-09-21) */}
                <p className="controls-hint desktop-keys">
                  ← → 또는 A/D 로 이동 · 활은 자동으로 당긴다 · 게이지가 차면 화살비
                </p>

                <div className="pioneer-board">
                  <p className="pioneer-heading">
                    <b>개척 진척</b>
                    <span>
                      {progress.pioneeredArea} / {HUNTING_AREAS.length} 지역 · ★
                      {Object.values(progress.dodgeStars).reduce((a, b) => a + b, 0)}/12
                    </span>
                  </p>
                  {STAGES.map((stage, index) => {
                    const area = HUNTING_AREAS[index + 1];
                    const opened = progress.pioneeredArea >= index + 2;
                    const reachable = progress.dodgeBestStage >= index || index === 0;
                    const stars = progress.dodgeStars[String(index)] ?? 0;
                    return (
                      <button
                        key={stage.id}
                        type="button"
                        className={`pioneer-row ${opened ? "opened" : ""} ${reachable ? "" : "far"}`}
                        onClick={() => void handleStart(index)}
                      >
                        <span className="pioneer-stage">S{index + 1}</span>
                        <span className="pioneer-name">
                          {stage.name}
                          <span className="pioneer-stars" aria-label={`별 ${stars}/3`}>
                            {[1, 2, 3].map((n) => (
                              <img key={n} src={assetUrl("ui/idle/star.svg")} alt="" className={n <= stars ? "on" : ""} />
                            ))}
                          </span>
                        </span>
                        <span className="pioneer-area" style={opened ? { color: area.accent } : undefined}>
                          {opened ? "개척 완료" : `→ ${area.name}`}
                        </span>
                        <span className="pioneer-mult">×{area.rewardMultiplier}</span>
                      </button>
                    );
                  })}
                  <p className="pioneer-star-hint">
                    ★★ 방어막 50% 이상 지킴 · ★★★ 방어막 90% 이상 + 콤보 10 — 별 12개 달성 시 보석 60 · 조각 10
                  </p>
                </div>

                <button type="button" className="cta" onClick={() => void handleStart(0)}>
                  스테이지 1 시작
                </button>
                {SUPPLIES.some((sp) => (progress.expeditionSupplies[sp.id] ?? 0) > 0) && (
                  <p className="exp-next-supply">
                    다음 출격 보급 · {SUPPLIES.filter((sp) => (progress.expeditionSupplies[sp.id] ?? 0) > 0)
                      .map((sp) => `${sp.name}${progress.expeditionSupplies[sp.id] > 1 ? ` (남은 ${progress.expeditionSupplies[sp.id]})` : ""}`).join(" · ")}
                  </p>
                )}
                {progress.dodgeBestStage >= STAGES.length && (
                  <button
                    type="button"
                    className="cta cta-tower"
                    onClick={() => void handleStart(TOWER_START_INDEX)}
                  >
                    <img src={assetUrl("ui/idle/tower.svg")} alt="" aria-hidden="true" />
                    <b>끝없는 성벽 등반</b>
                    <small>
                      최고 {progress.towerBestFloor}층 · 방치 배율 +
                      {(Math.min(10, Math.floor(progress.towerBestFloor / 100)) * 0.05).toFixed(2)}
                    </small>
                  </button>
                )}
                <button type="button" className="cta cta-ghost" onClick={handleBackToHub}>
                  타이탄 사냥터
                </button>
              </>
            ) : (
              <SkillPanel
                levels={progress.expeditionSkills}
                gold={progress.sharedCoins}
                seals={progress.expeditionSeals}
                shards={progress.expeditionShards}
                dodgeBestStage={progress.dodgeBestStage}
                supplies={progress.expeditionSupplies}
                daily={rolledDaily(progress.expeditionDaily)}
                onBuySupply={handleBuySupply}
                onClaimDaily={handleClaimDaily}
                chipLevels={progress.expeditionChips}
                equippedChips={progress.equippedChips}
                chipSlots={chipSlotsOpen(progress.dodgeBestStage)}
                onUpgradeChip={handleUpgradeChip}
                onEquipChip={handleEquipChip}
                weapon={progress.expeditionWeapon}
                onEquipWeapon={handleEquipWeapon}
                onUpgrade={handleUpgradeSkill}
                basicLevel={progress.expeditionBasic}
                onUpgradeBasic={handleUpgradeBasic}
                shop={{
                  visible: paidStoreVisible(),
                  unlocked: paidOffersUnlocked(progress),
                  note: paidStoreNote(),
                  busy: buyingProduct,
                  price: (id) => { const p = STORE_PRODUCTS.find((x) => x.id === id); return p ? priceLabel(p) : ""; },
                  onSale: productOnSale,
                  onBuy: (id) => void handleBuyProduct(id),
                  fund: progress.gateFund,
                  stars: progress.dodgeStars,
                  fundRatio: (() => {
                    const fund = STORE_PRODUCTS.find((x) => x.id === "gate-fund"), base = STORE_PRODUCTS.find((x) => x.id === "gems-80");
                    return fund && base ? gemValueRatio(GATE_FUND_TOTAL_GEMS, priceLabel(fund), priceLabel(base), 80) : null;
                  })(),
                  onClaimFund: handleClaimFund,
                }}
              />
            )}
          </div>
        </div>
      )}

      {appMode === "dodge" && gameState === "intro" && (
        <div className="game-overlay">
          <div className="overlay-content">
            <p className="brand">STAGE {stage.id}</p>
            <h1 className="title">{stageLabel}</h1>
            <p className="subtitle">{stageIntro}</p>
            <p className="score-line">몰려오는 몬스터를 넘기고 대장 몬스터를 끝까지 쓰러뜨리면 스테이지 클리어</p>
            <button type="button" className="cta" onClick={handleBeginPlay}>
              바로 시작
            </button>
          </div>
        </div>
      )}

      {appMode === "dodge" && gameState === "playing" && (
        <>
          <div
            className="hud"
            style={{
              paddingTop: insets.top,
              paddingLeft: insets.left,
              paddingRight: insets.right,
            }}
          >
            <div className="hud-left">
              {towerFloor > 0 && (
                <span className="hud-tower">
                  성벽 {towerFloor}층
                  {towerFloor > progress.towerBestFloor && <em> NEW</em>}
                </span>
              )}
              <span className="hud-score">
                {towerFloor > 0 ? `${towerFloor}F` : `Stage ${stage.id}`} · {worldRef.current?.bossDefeated ? "CLEAR" : worldRef.current?.bossSpawned ? `BOSS ${worldRef.current.bossCutsLeft} · ${bossPatternFor(worldRef.current.stageIndex + 1).name}` : (() => { const wv = waveAt(stage, worldRef.current?.stageElapsedMs ?? 0); return `WAVE ${wv.index}/${wv.count}`; })()}
                {combo >= 2 ? ` · x${combo}` : ""}
              </span>
              <span className="hud-hint">
                점수 {score}
              </span>
              <span className="threat-label">위험도 {"◆".repeat(threatLevel)}{"◇".repeat(4 - threatLevel)}</span>
              <span className="run-level">Lv.{runHud.level}{runHud.tempo > 1 ? ` · 속도 ×${runHud.tempo.toFixed(2)}` : ""}<i className="run-xp"><b style={{ width: `${runHud.pct}%` }} /></i></span>
              <i className="expedition-progress"><b style={{ width: `${expeditionRatio * 100}%` }} /></i>
            </div>
            {combo >= 3 && <div className="combo-flash">NEAR x{combo}</div>}
            {hudBanner && (
              <div key={hudBanner.key} className={`wave-banner ${hudBanner.boss ? "is-boss" : ""}`} aria-live="polite">
                <b>{hudBanner.title}</b>
                {hudBanner.sub && <small>{hudBanner.sub}</small>}
              </div>
            )}
            {tutorialActive && (
              <div className="dodge-tutorial" role="status">
                <b>슬로모션 튜토리얼</b>
                <span>몬스터는 <em>위에서</em> 성문 <em>방어막</em>으로 내려옵니다 — 방어막이 깨지면 집니다. 활은 <em>알아서</em> 가장 가까운 몬스터를 쏘고, 곁의 <em>무기 정령</em>이 속성 화살을 쏩니다. 게이지가 차면 <em>화살비</em>가 화면을 비웁니다.</span>
              </div>
            )}
          </div>
          {skillHud.length > 0 && (
            <div className="skill-dock" style={{ paddingBottom: insets.bottom, paddingRight: insets.right, paddingLeft: insets.left }} aria-label="장착 스킬">
              {skillHud.map((s) => (
                <span key={s.id} className={`skill-slot ${s.ready >= 1 ? "on" : ""} ${s.ready < 0.12 ? "fired" : ""}`} title={s.id === "basic" ? "기본 사격" : SKILL_BY_ID[s.id].name}>
                  <img src={assetUrl(s.id === "basic" ? `dodge/weapons/icon-${progress.expeditionWeapon === "staff" ? "staff" : "bow"}.png` : `dodge/skills/${SKILL_BY_ID[s.id].icon}.png`)} alt="" aria-hidden="true" />
                  {/* 아직 안 찬 만큼 위에서 덮는다 — 자동 발사라도 언제 나가는지는 보여야 한다 */}
                  <i style={{ height: `${Math.round((1 - Math.min(1, s.ready)) * 100)}%` }} />
                  {s.id !== "basic" && <b>{s.lv}</b>}
                </span>
              ))}
              <span className="skill-dock-auto">자동 조준</span>
            </div>
          )}
          <div
            className="action-dock"
            style={{
              paddingBottom: insets.bottom,
              paddingRight: insets.right,
              paddingLeft: insets.left,
            }}
          >
            {/* 점프·대시·일제 사격은 없다 (2026-10-01, 아웃로 디펜스) — 이동은 화면을 누르거나 ←→, 활은 자동 */}
            <span className="action-note">화면을 눌러 이동 · 활은 자동 · 방어막을 지키세요</span>
            <button
              type="button"
              className="action-btn extract-btn"
              disabled={expeditionElapsed < 15_000}
              onClick={handleExtract}
            >
              {expeditionElapsed < 15_000 ? `${Math.ceil((15_000 - expeditionElapsed) / 1000)}s` : "귀환"}
            </button>
          </div>
        </>
      )}

      {appMode === "dodge" && starResult && (
        <div className="star-result" role="status" aria-label={`별 ${starResult.stars}개 획득`}>
          <div className="star-result-row">
            {[1, 2, 3].map((n) => (
              <img
                key={n}
                src={assetUrl("ui/idle/star.svg")}
                alt=""
                className={n <= starResult.stars ? "earned" : "empty"}
                style={{ animationDelay: `${(n - 1) * 0.16}s` }}
              />
            ))}
          </div>
          <p>
            {starResult.improved && <b>신기록! </b>}원정 별 {starResult.total}/12
          </p>
        </div>
      )}

      {appMode === "dodge" && gameState === "paused" && (
        <div className="game-overlay">
          <div className="overlay-content">
            <p className="brand">PAUSED</p>
            <h1 className="title">일시정지</h1>
            <p className="subtitle">몬스터는 멈춰 있습니다. 장착 스킬은 계속 자동으로 나갑니다 — 재개하면 쿨타임이 이어집니다.</p>
            <button type="button" className="cta" onClick={() => { lastTsRef.current = 0; stateRef.current = "playing"; setGameState("playing"); }}>계속하기</button>
          </div>
        </div>
      )}

      {appMode === "dodge" && gameState === "perk" && (
        <div className="game-overlay perk-overlay">
          <div className="overlay-content">
            <p className="brand">LEVEL UP</p>
            <h1 className="title">성장 선택</h1>
            <p className="subtitle">런 레벨 {worldRef.current?.runLevel ?? runHud.level} 달성 — 이번 런에만 듣는 카드를 하나 고르세요. <b>습득</b>한 속성 화살의 강화·<b>콤보</b>·<b>진화</b>가 함께 나옵니다. 레벨이 오를수록 몬스터가 빨라집니다 (×{(worldRef.current?.tempo ?? 1).toFixed(2)})</p>
            {(() => {
              // 스테이지가 깊을수록 상위 등급이 잘 나온다 — 지금 확률을 밝혀 둔다
              const odds = rarityOdds(worldRef.current?.stageIndex ?? 0);
              return (
                <p className="perk-odds">
                  STAGE {(worldRef.current?.stageIndex ?? 0) + 1} 등급 확률 ·
                  <i className="perk-rarity r-common">일반</i> <span>{Math.round(odds.common * 100)}%</span>
                  <i className="perk-rarity r-rare">레어</i> <span>{Math.round(odds.rare * 100)}%</span>
                  <i className="perk-rarity r-epic">에픽</i> <span>{Math.round(odds.epic * 100)}%</span>
                </p>
              );
            })()}
            {perkOptions.map((perk, i) => (
              <button key={perk.id} type="button" className={`cta perk-choice perk-${perk.id} rarity-${perk.rarity}`} style={{ "--i": i } as CSSProperties} onClick={() => {
                const world = worldRef.current;
                if (world) {
                  applyPerk(world, perk.id as PerkId);
                  if (perk.rarity === "epic") world.epicPicks += 1;
                  world.draftBoost = false;   // [선발 보급]은 한 번만 듣는다
                }
                trackEvent("upgrade", { content: "dodge", result: `${perk.rarity}:${perk.id}`, stage: (world?.stageIndex ?? 0) + 1 });
                lastTsRef.current = 0;
                stateRef.current = "playing";
                setGameState("playing");
                showBanner(`[${RARITY_LABEL[perk.rarity]}] ${perk.label}`, "이번 런 동안 적용", perk.rarity === "epic");
              }}>
                <span className="perk-icon">
                  {PERK_SKILL_ICON[perk.id as PerkId]
                    ? <img src={assetUrl(`dodge/skills/${PERK_SKILL_ICON[perk.id as PerkId]}.png`)} alt="" width={30} height={30} />
                    : PERK_ICON[perk.id as PerkId] === "exp"
                      ? <img src={assetUrl("ui/idle/exp-orb.svg")} alt="" width={30} height={30} />
                      : <RewardIcon kind={PERK_ICON[perk.id as PerkId] as RewardIconKind} size={30} />}
                </span>
                <span className="perk-copy">
                  <b>
                    <i className={`perk-rarity r-${perk.rarity}`}>{RARITY_LABEL[perk.rarity]}</i>
                    {perk.label}
                    {perk.combo && <i className="perk-combo">콤보</i>}
                    {perk.evolution && <i className="perk-evo">진화</i>}
                    {perk.learns && <i className="perk-learn">습득</i>}
                  </b>
                  <small>{perk.desc}</small>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {appMode === "dodge" && gameState === "clear" && (
        <div className="game-overlay">
          <div className="overlay-content">
            <p className="brand">{extracted ? "SAFE RETURN" : allClear ? "ALL CLEAR" : "STAGE CLEAR"}</p>
            <button type="button" className="share-card-btn" onClick={() => void shareDodgeCard()}>기록 카드 공유</button>
            <h1 className="title">{extracted ? "보급품 확보!" : allClear ? "전 스테이지 클리어!" : stageLabel}</h1>
            <p className="score-line">+{coinGain} 코인{adDoubled ? " (광고 ×2 적용)" : ""}</p>
            <p className="subtitle">보유 코인 {coins} · 점수 {lastScore}</p>
            {/* 계획안 §25 — 선택형 광고: 클리어 보상 ×2 (미연동·한도 소진이면 자리 없음) */}
            {!adDoubled && coinGain > 0 && (() => {
              const avail = rewardedAvailability(progress, "dodgeDouble", new Date().toLocaleDateString("sv-SE"));
              if (avail === "none") return null;
              return (
                <button type="button" className="cta idle-claim-ad" disabled={adBusy} onClick={() => void (async () => {
                  if (adBusy) return;
                  setAdBusy(true);
                  trackEvent("ad_start", { placement: "dodgeDouble" });
                  try {
                    const ok = avail === "free" ? true : await showRewarded("dodgeDouble");
                    if (!ok) return;
                    trackEvent("ad_complete", { placement: "dodgeDouble" });
                    const today = new Date().toLocaleDateString("sv-SE");
                    const next = await updateCharacterProgress(userHashRef.current, (current) => consumeAdReward(current, "dodgeDouble", today));
                    setProgress(next);
                    const nextCoins = await saveCoins(userHashRef.current, coinsRef.current + coinGain);
                    coinsRef.current = nextCoins;
                    setCoins(nextCoins);
                    setAdDoubled(true);
                  } finally {
                    setAdBusy(false);
                  }
                })()}>
                  {adBusy ? "광고 재생 중…" : avail === "free" ? "광고 제거 보유 · 코인 ×2" : "광고 보고 코인 ×2"}
                  <small>+{coinGain} 코인 추가 · 오늘 남은 횟수 포함</small>
                </button>
              );
            })()}
            {!extracted && worldRef.current && (
              <p className="controls-hint">
                철광석 ×{worldRef.current.enemyKills} · 속성 결정 ×{worldRef.current.perfectDodges} · 정제 강철 ×{worldRef.current.chests * 4} · 원정 인장 ×{worldRef.current.expeditionSeals} · 보급 ×{worldRef.current.supplies}
                {worldRef.current.player.hp === worldRef.current.player.maxHp ? " · 노히트 설계도 판정" : ""}
              </p>
            )}
            {/* 쓴 스킬의 조각이 돌아온다 — 무엇을 얼마나 받았는지 보여야 고리가 읽힌다 (2026-09-29) */}
            {worldRef.current && (() => {
              const drops = shardDrops(worldRef.current.runSkills, worldRef.current.stageIndex, !extracted, worldRef.current.ultCount);
              const rows = (Object.keys(drops) as ExpeditionSkillId[]).filter((id) => (drops[id] ?? 0) > 0);
              if (!rows.length) return null;
              return <p className="subtitle exp-shard-line">스킬 조각 · {rows.map((id) => `${SKILL_BY_ID[id].name} +${drops[id]}`).join(" · ")}</p>;
            })()}
            {shoulderDrop && <p className="shop-toast">{shoulderDrop}</p>}
            <button type="button" className="cta" onClick={handleNextStage}>
              {allClear || extracted ? "원정 준비" : "다음 스테이지"}
            </button>
            <button type="button" className="cta cta-ghost" onClick={handleBackToReady}>
              상점 / 메뉴
            </button>
            <button type="button" className="cta cta-ghost" onClick={handleBackToHub}>
              사냥터로 돌아가기
            </button>
          </div>
        </div>
      )}

      {appMode === "dodge" && gameState === "gameover" && (
        <div className="game-overlay">
          <div className="overlay-content">
            <p className="brand">게임 오버</p>
            <h1 className="title">{isNewRecord ? "신기록!" : "다시 도전?"}</h1>
            <p className="score-line">점수 {lastScore}</p>
            <p className="subtitle">
              Stage {stage.id} · 최고 {highScore} · 코인 {coins}
            </p>
            {deathTip && <p className="death-tip"><b>다음엔 이렇게</b> {deathTip}</p>}
            {(() => {
              const offer = activeMomentOffers(progress).find((o) => o.productId === "gate-supply");
              const product = STORE_PRODUCTS.find((p) => p.id === "gate-supply");
              if (!offer || !product || !paidStoreVisible() || !productOnSale(product.id)) return null;
              const def = MOMENT_OFFERS[offer.kind];
              return (
                <div className="gate-offer">
                  <img src={assetUrl("ui/idle/gate-supply.svg")} alt="" aria-hidden="true" />
                  <div>
                    <b>{def.title}</b>
                    <small>{def.subtitle}</small>
                    <em>지금 사면 보석 +{offer.bonusGems} · {momentTimeLeft(offer.until)} 남음</em>
                  </div>
                  <button type="button" className="gate-offer-buy" disabled={buyingProduct !== null} onClick={() => void handleBuyProduct(product.id)}>
                    {buyingProduct === product.id ? "결제 중…" : priceLabel(product)}
                  </button>
                </div>
              );
            })()}
            <button type="button" className="cta" onClick={handleRestart}>
              이 스테이지 다시
            </button>
            <button type="button" className="cta cta-ghost" onClick={handleBackToReady}>
              시작 화면
            </button>
            <button type="button" className="cta cta-ghost" onClick={handleBackToHub}>
              사냥터로 돌아가기
            </button>
          </div>
        </div>
      )}

      {exitOpen && (
        <div className="exit-modal" role="dialog" aria-modal="true" aria-labelledby="exit-title">
          <div className="exit-card">
            <h2 id="exit-title" className="exit-title">
              게임을 종료할까요?
            </h2>
            <p className="exit-desc">진행 중인 판은 저장되지 않아요. 코인·강화는 유지됩니다.</p>
            <button type="button" className="cta" onClick={() => void confirmExit()}>
              종료하기
            </button>
            <button type="button" className="cta cta-ghost" onClick={() => setExitOpen(false)}>
              계속하기
            </button>
          </div>
        </div>
      )}
      {/* 온보딩 첫 5분 대본(§8) — 신규(step<4)에게는 출석 모달을 띄우지 않는다 */}
      {bootReady && appMode === "titans" && progress.onboardingStep >= 4 && (
        <AttendanceModal userHash={userHashRef.current} open={attendanceOpen} onClose={() => setAttendanceOpen(false)} onUpdated={setProgress} />
      )}
      {bootReady && appMode === "titans" && eventOpen && (
        <Suspense fallback={null}>
          <EventCenter userHash={userHashRef.current} progress={progress} open={eventOpen} initialTab={eventTab} onClose={() => setEventOpen(false)} onUpdated={setProgress} />
        </Suspense>
      )}

      {pioneeredAreaIndex !== null && (
        <AreaUnlockBanner
          area={HUNTING_AREAS[pioneeredAreaIndex - 1]}
          onDone={() => setPioneeredAreaIndex(null)}
        />
      )}

      {bootReady && backupOpen && (
        <SaveBackupModal userHash={userHashRef.current} onClose={() => setBackupOpen(false)} />
      )}
      {settingsToast && <div className="titans-toast settings-copy-toast">{settingsToast}</div>}

      {/* 개발 전용 UI 점검 패널 — `?qa=1`. DEV 상수 뒤라 프로덕션 번들에서 제거된다. */}
      {import.meta.env.DEV && qaMode && <IdleQaPanel userHash={userHashRef.current} />}
    </div>
  );
}

export default App;
