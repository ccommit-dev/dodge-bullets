import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";
import { drawFrame } from "./game/draw";
import {
  applyKeyDown,
  applyKeyUp,
  clearKeys,
  createInputState,
  setPointer,
  type InputState,
} from "./game/input";
import { createSoundController, loadSoundEnabled } from "./game/sound";
import { loadHighScore, saveHighScore } from "./game/storage";
import {
  closeMiniApp,
  lockScreenForGame,
  normalizeInsets,
  readSafeInsets,
  resolveUserKey,
  subscribeSafeInsets,
  type SafeInsets,
} from "./game/toss";
import type { GameState, GameWorld } from "./game/types";
import { createWorld, resetRun, resizeWorld, updateWorld } from "./game/world";

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

  const [bootReady, setBootReady] = useState(false);
  const [userKeySource, setUserKeySource] = useState<"sdk" | "mock">("mock");
  const [gameState, setGameState] = useState<GameState>("ready");
  const [score, setScore] = useState(0);
  const [lastScore, setLastScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [soundOn, setSoundOn] = useState(() => loadSoundEnabled());
  const [exitOpen, setExitOpen] = useState(false);
  const [insets, setInsets] = useState<SafeInsets>(() => normalizeInsets(null));

  const syncState = useCallback((next: GameState) => {
    stateRef.current = next;
    setGameState(next);
    if (next !== "playing") {
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

  // Boot: user key + high score + safe area
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
      const best = await loadHighScore(key.hash);
      if (cancelled) return;
      setHighScore(best);
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
        if (stateRef.current === "playing" && sound.isEnabled()) {
          sound.startBgm();
        }
      }
    };
    const onPageHide = () => sound.enterBackground();
    const onPageShow = () => {
      sound.enterForeground();
      if (stateRef.current === "playing" && sound.isEnabled()) {
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
      if (stateRef.current !== "playing") return;
      if (applyKeyDown(inputRef.current, e.code)) e.preventDefault();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (applyKeyUp(inputRef.current, e.code)) e.preventDefault();
    };
    const onBlur = () => {
      clearKeys(inputRef.current);
      setPointer(inputRef.current, false);
    };

    const onPointerDown = (e: PointerEvent) => {
      if (stateRef.current !== "playing") return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      canvas.setPointerCapture(e.pointerId);
      const { x, y } = clientToCanvas(canvas, e.clientX, e.clientY);
      setPointer(inputRef.current, true, x, y);
      e.preventDefault();
    };
    const onPointerMove = (e: PointerEvent) => {
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
      const world = worldRef.current;
      const ctx = canvasRef.current?.getContext("2d");
      if (world && ctx) {
        if (!lastTsRef.current) lastTsRef.current = ts;
        const dtSec = Math.min((ts - lastTsRef.current) / 1000, 0.05);
        lastTsRef.current = ts;

        const hit = updateWorld(
          world,
          dtSec,
          stateRef.current === "playing",
          inputRef.current,
        );
        drawFrame(ctx, world);

        if (stateRef.current === "playing" && world.score !== scoreRef.current) {
          scoreRef.current = world.score;
          setScore(world.score);
        }

        if (hit && stateRef.current === "playing") {
          clearKeys(inputRef.current);
          setPointer(inputRef.current, false);
          sound.stopBgm();
          sound.playHit();
          const finalScore = world.score;
          scoreRef.current = finalScore;
          setScore(finalScore);
          setLastScore(finalScore);
          void saveHighScore(userHashRef.current, finalScore).then(setHighScore);
          stateRef.current = "gameover";
          setGameState("gameover");
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

  const handleStart = async () => {
    if (!bootReady) return;
    await unlockAudio();
    const world = worldRef.current;
    if (world) {
      applyInsetsToWorld(world, insetsRef.current);
      resetRun(world);
    }
    scoreRef.current = 0;
    setScore(0);
    clearKeys(inputRef.current);
    setPointer(inputRef.current, false);
    lastTsRef.current = 0;
    soundRef.current.playStart();
    syncState("playing");
    soundRef.current.startBgm();
  };

  const handleRestart = () => {
    void handleStart();
  };

  const handleBackToReady = () => {
    soundRef.current.stopBgm();
    syncState("ready");
  };

  const confirmExit = async () => {
    soundRef.current.stopBgm();
    soundRef.current.enterBackground();
    setExitOpen(false);
    await closeMiniApp();
  };

  const isNewRecord = lastScore > 0 && lastScore >= highScore;

  const dockStyle = {
    paddingTop: insets.top,
    paddingLeft: insets.left,
    paddingRight: insets.right,
  } as const;

  const soundToggle = (
    <button
      type="button"
      className="sound-toggle"
      onClick={() => void toggleSound()}
      aria-pressed={soundOn}
      aria-label={soundOn ? "사운드 끄기" : "사운드 켜기"}
    >
      {soundOn ? "사운드 On" : "사운드 Off"}
    </button>
  );

  return (
    <div className="game-root">
      <canvas
        ref={canvasRef}
        className="game-canvas"
        aria-label="총알 피하기 게임 화면"
      />

      {/* 좌측 상단 — 토스 닫기(우측 상단)와 겹치지 않음 */}
      <div className="sound-dock" style={dockStyle}>
        {soundToggle}
        <button
          type="button"
          className="exit-toggle"
          onClick={() => setExitOpen(true)}
          aria-label="미니앱 종료"
        >
          종료
        </button>
      </div>

      {!bootReady && (
        <div className="game-overlay">
          <div className="overlay-content">
            <p className="brand">총알피하기</p>
            <p className="subtitle">준비 중…</p>
          </div>
        </div>
      )}

      {bootReady && gameState === "ready" && (
        <div className="game-overlay">
          <div className="overlay-content">
            <p className="brand">총알피하기</p>
            <h1 className="title">Dodge Bullets</h1>
            <p className="subtitle">위에서 내려오는 총알을 피하세요</p>
            <p className="score-line">최고 점수 {highScore}</p>
            <p className="controls-hint">
              터치로 드래그 · 키보드 ←→↑↓ / WASD
            </p>
            <p className="controls-hint">
              식별키 {userKeySource === "sdk" ? "연동됨" : "로컬 mock"}
            </p>
            <button type="button" className="cta" onClick={() => void handleStart()}>
              게임 시작
            </button>
          </div>
        </div>
      )}

      {gameState === "playing" && (
        <div
          className="hud"
          style={{
            paddingTop: insets.top,
            paddingLeft: insets.left,
            paddingRight: insets.right,
          }}
        >
          <div className="hud-left">
            <span className="hud-score">점수 {score}</span>
            <span className="hud-hint">최고 {highScore}</span>
          </div>
        </div>
      )}

      {gameState === "gameover" && (
        <div className="game-overlay">
          <div className="overlay-content">
            <p className="brand">게임 오버</p>
            <h1 className="title">{isNewRecord ? "신기록!" : "다시 도전?"}</h1>
            <p className="score-line">점수 {lastScore}</p>
            <p className="subtitle">최고 점수 {highScore}</p>
            <button type="button" className="cta" onClick={handleRestart}>
              다시하기
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
            <p className="exit-desc">진행 중인 판은 저장되지 않아요.</p>
            <button type="button" className="cta" onClick={() => void confirmExit()}>
              종료하기
            </button>
            <button
              type="button"
              className="cta cta-ghost"
              onClick={() => setExitOpen(false)}
            >
              계속하기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
