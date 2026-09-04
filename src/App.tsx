import { Suspense, lazy, useCallback, useEffect, useRef, useState } from "react";
import "./App.css";
import "./idle.css";
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
import { bindAndroidBackButton, exitAppNative, requestReviewOnce } from "./game/native";
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
import { openMomentOffer } from "./economy/momentOffers";
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
import { STAGES, TOWER_START_INDEX, getStage, isLastStage, towerFloorOf } from "./game/stages";
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

const COMMUNITY_URL = import.meta.env.VITE_COMMUNITY_URL?.trim() ?? "";
/** 사망 원인 → 다음 판을 위한 한 줄 (RETENTION G) */
const DEATH_TIPS: Record<string, string> = {
  homing: "유도탄은 빨간 궤적이 붙기 전에 검격으로 베면 조각이 되어 흩어집니다",
  explosive: "폭발 화살은 점프로 넘기지 말고 대시로 관통하세요 — 폭발 범위가 넓어요",
  ricochet: "튕기는 화살은 벽 근처에서 두 번 옵니다 — 벽에서 떨어져 서세요",
  fan: "부채꼴 화살은 한 발만 베면 틈이 열립니다",
  aimed: "조준 화살은 붉은 선이 사라지는 순간 위치를 바꾸세요",
  fragment: "베어 낸 조각은 돌다가 되돌아옵니다 — 조각이 남았을 땐 점프 후 대시",
  boss: "보스 화살은 끝까지 베야 합니다 — 검격이 준비되기 전엔 거리를 두세요",
  normal: "일반 화살은 검격으로 베면 코인과 조각이 됩니다 — 피하지 말고 베세요",
};
const EXPEDITION_SHOULDERS: ShoulderId[] = ["scout", "shadow", "ogre", "dragon"];
function statsWithShoulder(levels: ShopLevels, shoulder: ShoulderId | null) {
  const stats = statsFromLevels(levels);
  if (shoulder === "scout") stats.moveSpeed *= 1.03;
  if (shoulder === "shadow") stats.dashCooldownMs *= .95;
  if (shoulder === "ogre") stats.extraLives += 1;
  if (shoulder === "dragon") stats.dashIFramesMs *= 1.1;
  return stats;
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

  const hudRemainSecRef = useRef(0);
  const hudHpRef = useRef(1);
  const hudMaxHpRef = useRef(1);
  const hudComboRef = useRef(0);
  const coinsRef = useRef(0);
  const shopLevelsRef = useRef<ShopLevels>(emptyShopLevels());
  const [bootReady, setBootReady] = useState(false);
  const [userKeySource, setUserKeySource] = useState<"sdk" | "mock">("mock");
  const [gameState, setGameState] = useState<GameState>("ready");
  const [menuTab, setMenuTab] = useState<"play" | "shop">("play");
  const [score, setScore] = useState(0);
  const [lastScore, setLastScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [coins, setCoins] = useState(0);
  const [coinGain, setCoinGain] = useState(0);
  const [shopLevels, setShopLevels] = useState<ShopLevels>(() => emptyShopLevels());
  const [stageIndex, setStageIndex] = useState(0);
  const [stageLabel, setStageLabel] = useState(STAGES[0].name);
  const [stageIntro, setStageIntro] = useState(STAGES[0].intro);
  const [hp, setHp] = useState(1);
  const [maxHp, setMaxHp] = useState(1);
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
  const [shoulderDrop, setShoulderDrop] = useState("");
  const [pioneeredAreaIndex, setPioneeredAreaIndex] = useState<number | null>(null);
  const [attendanceOpen, setAttendanceOpen] = useState(true);
  const [eventOpen, setEventOpen] = useState(false);
  const [eventTab, setEventTab] = useState<"daily" | "rift" | "weekly" | "journal" | "season">("daily");
  const [backupOpen, setBackupOpen] = useState(false);
  const [settingsToast, setSettingsToast] = useState("");
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
      const stats = statsWithShoulder(mergedLevels, character.equippedShoulder);
      if (worldRef.current) applyStats(worldRef.current, stats);
      setMaxHp(1 + stats.extraLives);
      setHp(1 + stats.extraLives);
      setBootReady(true);

      unsub = await subscribeSafeInsets((next) => {
        if (!cancelled) applyInsets(next);
      });
    })();

    return () => {
      cancelled = true;
      unsub();
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

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
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

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("pageshow", onPageShow);

    const canvas = canvasRef.current;
    if (!canvas) {
      return () => {
        window.removeEventListener("resize", onResize);
        window.removeEventListener("orientationchange", onResize);
        document.removeEventListener("visibilitychange", onVisibility);
        window.removeEventListener("pagehide", onPageHide);
        window.removeEventListener("pageshow", onPageShow);
      };
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (appModeRef.current !== "dodge") return;
      if (stateRef.current !== "playing") return;
      if (applyKeyDown(inputRef.current, e.code)) {
        if (e.code === "Space") {
          const now = performance.now();
          if (now - lastSpaceAtRef.current < 280) {
            inputRef.current.dashPressed = true;
            sound.playDash();
          }
          lastSpaceAtRef.current = now;
        }
        if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") sound.playJump();
        if (e.code === "ShiftLeft" || e.code === "ShiftRight") sound.playDash();
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
      const now = performance.now();
      // Double-tap near previous tap → jump
      if (now - lastJumpAtRef.current < 280) {
        inputRef.current.jumpPressed = true;
        sound.playJump();
      }
      lastJumpAtRef.current = now;
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
        const dtSec = Math.min((ts - lastTsRef.current) / 1000, 0.05) * (tutorialSlow ? 0.45 : 1);
        lastTsRef.current = ts;

        const event = updateWorld(
          world,
          dtSec,
          stateRef.current === "playing",
          inputRef.current,
        );
        consumeActionEdges(inputRef.current);
        drawFrame(ctx, world);

        if (stateRef.current === "playing") {
          if (world.score !== scoreRef.current) {
            scoreRef.current = world.score;
            setScore(world.score);
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
        }

        if (event.type === "dead" && stateRef.current === "playing") {
          clearKeys(inputRef.current);
          setPointer(inputRef.current, false);
          sound.stopBgm();
          sound.playHit();
          const finalScore = world.score;
          scoreRef.current = finalScore;
          setScore(finalScore);
          setLastScore(finalScore);
          setAllClear(false);
          setExtracted(false);
          void saveHighScore(userHashRef.current, finalScore).then(setHighScore);
          stateRef.current = "gameover";
          setGameState("gameover");
          setDeathTip(DEATH_TIPS[world.lastHitCause] ?? "");
        }

        if (event.type === "clear" && stateRef.current === "playing") {
          sound.stopBgm();
          sound.playClear();
          const stage = getStage(world.stageIndex);
          const reward =
            computeClearReward(
              stage.baseReward,
              world.player.hp,
              world.player.maxHp,
              world.stageElapsedMs,
              stage.durationMs,
            ) + Math.min(40, world.maxCombo * 2) + world.supplies * 3
              + world.enemyKills * 5 + world.perfectDodges * 8 + world.chests * 30 + world.expeditionSeals * 20;
          setCoinGain(reward);
          sound.playCoin();
          // dodge 별점 (CRUMBLE_GAP §4) — ★ 클리어 · ★★ 피격 1회 이하 · ★★★ 노히트+콤보 10.
          // 성벽(무한)은 층수가 이미 목적이라 미적용.
          const starFloor = towerFloorOf(world.stageIndex);
          const hitsTaken = world.player.maxHp - world.player.hp;
          const starsGained =
            starFloor > 0 ? 0 : hitsTaken <= 0 && world.maxCombo >= 10 ? 3 : hitsTaken <= 1 ? 2 : 1;
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
            const dropped = first || Math.random() < (world.player.hp === world.player.maxHp ? .35 : .18);
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
      document.removeEventListener("visibilitychange", onVisibility);
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
    applyStats(world, statsWithShoulder(shopLevelsRef.current, progress.equippedShoulder));
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
    const world = worldRef.current;
    if (world) {
      applyInsetsToWorld(world, insetsRef.current);
      applyStats(world, statsWithShoulder(shopLevelsRef.current, progress.equippedShoulder));
      resetRun(world, fromStage);
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
    setShoulderDrop(result === "shared" ? "기록 카드를 공유했습니다" : result === "opened" ? "기록 카드를 새 탭에 열었습니다 — 길게 눌러 저장" : "공유를 지원하지 않는 환경입니다");
  };

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
          lastContent: "dodge",
        },
      );
      setProgress(nextProgress);
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
    void migrateLegacyProgress(userHashRef.current, progress).then(setProgress);
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
    if (worldRef.current) applyStats(worldRef.current, statsWithShoulder(merged, progress.equippedShoulder));
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
        aria-label="검의 주인 화살 원정 게임 화면"
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
          onOpenEvents={(tab) => { setEventTab(tab); setEventOpen(true); }}
          onOpenContent={(content) => {
            if (content === "dodge") syncState("ready");
            setMode(content);
          }}
        />
      )}

      {bootReady && appMode === "dodge" && gameState === "ready" && (
        <div className="game-overlay">
          <div className="overlay-content overlay-wide">
            <p className="brand">BATTLE EXPEDITION</p>
            <h1 className="title">전장의 돌파 원정</h1>
            <p className="subtitle">이동·회피·검격 반격으로 적진의 보급품을 확보하고 탈출하세요</p>
            <p className="score-line">코인 {coins} · 최고 {highScore}</p>

            {/* 원정대 보급소는 삭제됐다 (사용자 지시: 용도 불명). 기동·검격 스탯은
                캐릭터 성장(레벨·강화)에서 자동 파생된다 — derivedShopLevels 참조 */}
            {menuTab === "play" ? (
              <>
                <p className="controls-hint">
                  전진 · Space 점프/두 번 대시 · Shift 대시 · Enter/Ctrl/E 검격
                </p>
                <p className="controls-hint">
                  식별키 {userKeySource === "sdk" ? "연동됨" : "로컬 mock"} · 스테이지 {STAGES.length}개
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
                    ★★ 피격 1회 이하 · ★★★ 노히트+콤보 10 — 별 12개 달성 시 보석 60 · 조각 10
                  </p>
                </div>

                <button type="button" className="cta" onClick={() => void handleStart(0)}>
                  스테이지 1 시작
                </button>
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
            ) : null}
          </div>
        </div>
      )}

      {appMode === "dodge" && gameState === "intro" && (
        <div className="game-overlay">
          <div className="overlay-content">
            <p className="brand">STAGE {stage.id}</p>
            <h1 className="title">{stageLabel}</h1>
            <p className="subtitle">{stageIntro}</p>
            <p className="score-line">전초전을 돌파하고 보스 화살을 끝까지 베면 스테이지 클리어</p>
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
                {towerFloor > 0 ? `${towerFloor}F` : `Stage ${stage.id}`} · {worldRef.current?.bossDefeated ? "CLEAR" : worldRef.current?.bossSpawned ? `BOSS ${worldRef.current.bossCutsLeft}` : "전초전"}
                {combo >= 2 ? ` · x${combo}` : ""}
              </span>
              <span className="hud-hint">
                점수 {score} · 코인 {coins} · HP {"♥".repeat(hp)}
                {"♡".repeat(Math.max(0, maxHp - hp))}
              </span>
              <span className="threat-label">위험도 {"◆".repeat(threatLevel)}{"◇".repeat(4 - threatLevel)}</span>
              <i className="expedition-progress"><b style={{ width: `${expeditionRatio * 100}%` }} /></i>
            </div>
            {combo >= 3 && <div className="combo-flash">NEAR x{combo}</div>}
            {tutorialActive && (
              <div className="dodge-tutorial" role="status">
                <b>슬로모션 튜토리얼</b>
                <span>위협 화살을 <em>검격</em>으로 쳐내 보급 점수를 얻으세요. 한 번 분해된 파편은 다시 베면 소멸합니다.</span>
              </div>
            )}
          </div>
          <div
            className="action-dock"
            style={{
              paddingBottom: insets.bottom,
              paddingRight: insets.right,
              paddingLeft: insets.left,
            }}
          >
            <button
              type="button"
              className="action-btn"
              onClick={() => {
                inputRef.current.jumpPressed = true;
                soundRef.current.playJump();
              }}
            >
              점프
            </button>
            <button
              type="button"
              className="action-btn"
              disabled={shopLevels.dash <= 0}
              onClick={() => {
                inputRef.current.dashPressed = true;
                soundRef.current.playDash();
              }}
            >
              대시
            </button>
            <button
              type="button"
              className="action-btn"
              onClick={() => {
                inputRef.current.slowPressed = true;
              }}
            >
              검격 Lv.{shopLevels.slowField}
            </button>
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

      {appMode === "dodge" && gameState === "clear" && (
        <div className="game-overlay">
          <div className="overlay-content">
            <p className="brand">{extracted ? "SAFE RETURN" : allClear ? "ALL CLEAR" : "STAGE CLEAR"}</p>
            <button type="button" className="share-card-btn" onClick={() => void shareDodgeCard()}>기록 카드 공유</button>
            <h1 className="title">{extracted ? "보급품 확보!" : allClear ? "전 스테이지 클리어!" : stageLabel}</h1>
            <p className="score-line">+{coinGain} 코인</p>
            <p className="subtitle">보유 코인 {coins} · 점수 {lastScore}</p>
            {!extracted && worldRef.current && (
              <p className="controls-hint">
                철광석 ×{worldRef.current.enemyKills} · 속성 결정 ×{worldRef.current.perfectDodges} · 정제 강철 ×{worldRef.current.chests * 4} · 원정 인장 ×{worldRef.current.expeditionSeals}
                {worldRef.current.player.hp === worldRef.current.player.maxHp ? " · 노히트 설계도 판정" : ""}
              </p>
            )}
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
