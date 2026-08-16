import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";
import { BeatGame } from "./BeatGame";
import { ForgeGame } from "./ForgeGame";
import { TitansGame } from "./TitansGame";
import { CharacterStatus } from "./CharacterStatus";
import { emptyCharacterProgress, type CharacterProgress } from "./progression/model";
import { dodgeClearReward } from "./progression/balance";
import {
  grantCharacterReward,
  loadCharacterProgress,
  migrateLegacyProgress,
} from "./progression/storage";
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
  SHOP_MAX,
  SHOP_META,
  emptyShopLevels,
  statsFromLevels,
  upgradeCost,
} from "./game/shop";
import { createSoundController, loadSoundEnabled } from "./game/sound";
import { STAGES, getStage, isLastStage } from "./game/stages";
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
  const [stageRemainMs, setStageRemainMs] = useState(STAGES[0].durationMs);
  const [soundOn, setSoundOn] = useState(() => loadSoundEnabled());
  const [exitOpen, setExitOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [insets, setInsets] = useState<SafeInsets>(() => normalizeInsets(null));
  const [allClear, setAllClear] = useState(false);
  const [extracted, setExtracted] = useState(false);
  const [appMode, setAppMode] = useState<AppMode>("titans");
  const [profileRefresh, setProfileRefresh] = useState(0);
  const [progress, setProgress] = useState<CharacterProgress>(() => emptyCharacterProgress());
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
      setCoins(savedCoins);
      coinsRef.current = savedCoins;
      setShopLevels(levels);
      shopLevelsRef.current = levels;
      setProgress(character);
      const stats = statsFromLevels(levels);
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
        const dtSec = Math.min((ts - lastTsRef.current) / 1000, 0.05);
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
            ) + Math.min(40, world.maxCombo * 2);
          setCoinGain(reward);
          sound.playCoin();
          void (async () => {
            const nextCoins = await saveCoins(
              userHashRef.current,
              coinsRef.current + reward,
            );
            coinsRef.current = nextCoins;
            setCoins(nextCoins);
            const growth = dodgeClearReward(world.stageIndex, world.maxCombo);
            const nextProgress = await grantCharacterReward(
              userHashRef.current,
              `dodge:${dodgeRunIdRef.current}:stage:${world.stageIndex}`,
              {
                exp: growth.exp,
                sharedCoins: reward,
                enhancementMaterials: growth.materials,
                dodgeStage: world.stageIndex + 1,
                lastContent: "dodge",
              },
            );
            setProgress(nextProgress);
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
  }, [applyInsets, fitCanvas]);

  const prepareWorldForStage = (index: number) => {
    const world = worldRef.current;
    if (!world) return;
    applyInsetsToWorld(world, insetsRef.current);
    applyStats(world, statsFromLevels(shopLevelsRef.current));
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
      applyStats(world, statsFromLevels(shopLevelsRef.current));
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

  const handleBeginPlay = useCallback(() => {
    lastTsRef.current = 0;
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
    const reward = Math.max(20, Math.floor(stage.baseReward * survivalRatio * 0.72 + world.maxCombo * 2));
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
          enhancementMaterials: Math.max(1, Math.floor(growth.materials * survivalRatio * 0.6)),
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

  const buyUpgrade = async (id: ShopUpgradeId) => {
    await unlockAudio();
    const level = shopLevels[id];
    if (level >= SHOP_MAX[id]) return;
    const cost = upgradeCost(id, level);
    if (coins < cost) return;
    const nextLevels = { ...shopLevels, [id]: level + 1 };
    const nextCoins = coins - cost;
    setShopLevels(nextLevels);
    shopLevelsRef.current = nextLevels;
    setCoins(nextCoins);
    coinsRef.current = nextCoins;
    soundRef.current.playBuy();
    if (worldRef.current) applyStats(worldRef.current, statsFromLevels(nextLevels));
    await Promise.all([
      saveCoins(userHashRef.current, nextCoins),
      saveShopLevels(userHashRef.current, nextLevels),
    ]);
    setProgress((current) => ({ ...current, sharedCoins: nextCoins, updatedAt: Date.now() }));
  };

  const confirmExit = async () => {
    soundRef.current.stopBgm();
    soundRef.current.enterBackground();
    setExitOpen(false);
    await closeMiniApp();
  };

  const openCommunity = () => {
    if (!COMMUNITY_URL) return;
    window.open(COMMUNITY_URL, "_blank", "noopener,noreferrer");
    setSettingsOpen(false);
  };

  const isNewRecord = lastScore > 0 && lastScore >= highScore;
  const stage = getStage(stageIndex);
  const remainSec = Math.ceil(stageRemainMs / 1000);
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
      {appMode !== "beat" && appMode !== "forge" && appMode !== "titans" && (
        <canvas
          ref={canvasRef}
          className="game-canvas"
          aria-label="졸라맨 화살 피하기 게임 화면"
        />
      )}

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
                  onClick={() => void toggleSound()}
                  aria-pressed={soundOn}
                >
                  <span>사운드</span>
                  <b>{soundOn ? "ON" : "OFF"}</b>
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
              onClick={() => setExitOpen(true)}
              aria-label="미니앱 종료"
            >
              종료
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
        <CharacterStatus
          insets={insets}
          userHash={userHashRef.current}
          coins={coins}
          highScore={highScore}
          progress={progress}
          refreshKey={profileRefresh}
          onOpenContent={(content) => {
            if (content === "dodge") syncState("ready");
            setMode(content);
          }}
          onBack={() => setMode("titans")}
        />
      )}

      {bootReady && appMode === "beat" && (
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
      )}

      {bootReady && appMode === "forge" && (
        <ForgeGame insets={insets} userHash={userHashRef.current} onBack={handleBackToHub} />
      )}

      {bootReady && appMode === "titans" && (
        <TitansGame
          insets={insets}
          userHash={userHashRef.current}
          forgedWeaponLevel={progress.equippedWeaponLevel}
          onOpenContent={(content) => {
            if (content === "dodge") syncState("ready");
            setMode(content);
          }}
        />
      )}

      {bootReady && appMode === "dodge" && gameState === "ready" && (
        <div className="game-overlay">
          <div className="overlay-content overlay-wide">
            <p className="brand">총알피하기</p>
            <h1 className="title">Arrow Dodge</h1>
            <p className="subtitle">졸라맨으로 화살을 피하고 스테이지를 클리어하세요</p>
            <p className="score-line">코인 {coins} · 최고 {highScore}</p>

            <div className="tab-row" role="tablist">
              <button
                type="button"
                className={`tab ${menuTab === "play" ? "tab-active" : ""}`}
                onClick={() => setMenuTab("play")}
              >
                플레이
              </button>
              <button
                type="button"
                className={`tab ${menuTab === "shop" ? "tab-active" : ""}`}
                onClick={() => setMenuTab("shop")}
              >
                상점
              </button>
            </div>

            {menuTab === "play" ? (
              <>
                <p className="controls-hint">
                  드래그 이동 · 더블탭/스페이스 점프 · Shift 대시 · E 슬로우
                </p>
                <p className="controls-hint">
                  식별키 {userKeySource === "sdk" ? "연동됨" : "로컬 mock"} · 스테이지 {STAGES.length}개
                </p>
                <button type="button" className="cta" onClick={() => void handleStart(0)}>
                  스테이지 1 시작
                </button>
                <button type="button" className="cta cta-ghost" onClick={handleBackToHub}>
                  타이탄 사냥터
                </button>
              </>
            ) : (
              <div className="shop-list">
                {(Object.keys(SHOP_META) as ShopUpgradeId[]).map((id) => {
                  const level = shopLevels[id];
                  const max = SHOP_MAX[id];
                  const cost = upgradeCost(id, level);
                  const soldOut = level >= max;
                  const canBuy = !soldOut && coins >= cost;
                  return (
                    <div key={id} className="shop-item">
                      <div className="shop-item-text">
                        <strong>
                          {SHOP_META[id].name}{" "}
                          <span className="shop-lv">
                            Lv.{level}/{max}
                          </span>
                        </strong>
                        <span>{SHOP_META[id].desc}</span>
                      </div>
                      <button
                        type="button"
                        className="shop-buy"
                        disabled={!canBuy}
                        onClick={() => void buyUpgrade(id)}
                      >
                        {soldOut ? "MAX" : `${cost}c`}
                      </button>
                    </div>
                  );
                })}
              </div>
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
            <p className="score-line">목표 {Math.round(stage.durationMs / 1000)}초 · 0.7초 후 자동시작</p>
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
              <span className="hud-score">
                Stage {stage.id} · {remainSec}s
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
              disabled={shopLevels.slowField <= 0}
              onClick={() => {
                inputRef.current.slowPressed = true;
              }}
            >
              슬로우
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

      {appMode === "dodge" && gameState === "clear" && (
        <div className="game-overlay">
          <div className="overlay-content">
            <p className="brand">{extracted ? "SAFE RETURN" : allClear ? "ALL CLEAR" : "STAGE CLEAR"}</p>
            <h1 className="title">{extracted ? "보급품 확보!" : allClear ? "전 스테이지 클리어!" : stageLabel}</h1>
            <p className="score-line">+{coinGain} 코인</p>
            <p className="subtitle">보유 코인 {coins} · 점수 {lastScore}</p>
            <button type="button" className="cta" onClick={handleNextStage}>
              {allClear || extracted ? "원정 준비" : "다음 스테이지"}
            </button>
            <button type="button" className="cta cta-ghost" onClick={handleBackToReady}>
              상점 / 메뉴
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
            <button type="button" className="cta" onClick={handleRestart}>
              이 스테이지 다시
            </button>
            <button type="button" className="cta cta-ghost" onClick={handleBackToReady}>
              시작 화면
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
    </div>
  );
}

export default App;
