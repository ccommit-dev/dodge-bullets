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
import type { GameState, GameWorld } from "./game/types";
import { createWorld, resizeWorld, updateWorld } from "./game/world";

function readCssSafeInsets(): { top: number; right: number; bottom: number; left: number } {
  const probe = document.createElement("div");
  probe.style.cssText = [
    "position:fixed",
    "visibility:hidden",
    "pointer-events:none",
    "padding-top:env(safe-area-inset-top)",
    "padding-right:env(safe-area-inset-right)",
    "padding-bottom:env(safe-area-inset-bottom)",
    "padding-left:env(safe-area-inset-left)",
  ].join(";");
  document.body.appendChild(probe);
  const style = getComputedStyle(probe);
  const insets = {
    top: Number.parseFloat(style.paddingTop) || 0,
    right: Number.parseFloat(style.paddingRight) || 0,
    bottom: Number.parseFloat(style.paddingBottom) || 0,
    left: Number.parseFloat(style.paddingLeft) || 0,
  };
  document.body.removeChild(probe);
  return insets;
}

function applySafeInsetsToWorld(world: GameWorld): void {
  const insets = readCssSafeInsets();
  world.safeTop = Math.max(12, insets.top);
  world.safeRight = Math.max(8, insets.right);
  world.safeBottom = Math.max(12, insets.bottom);
  world.safeLeft = Math.max(8, insets.left);
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
  const stateRef = useRef<GameState>("ready");
  const rafRef = useRef<number>(0);
  const lastTsRef = useRef<number>(0);

  const [gameState, setGameState] = useState<GameState>("ready");

  const syncState = useCallback((next: GameState) => {
    stateRef.current = next;
    setGameState(next);
    if (next !== "playing") {
      clearKeys(inputRef.current);
      setPointer(inputRef.current, false);
    }
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
    applySafeInsetsToWorld(worldRef.current);
  }, []);

  useEffect(() => {
    fitCanvas();

    const onResize = () => fitCanvas();
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);

    const canvas = canvasRef.current;
    if (!canvas) return;

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
    // iOS pinch-zoom / gesture interference
    document.addEventListener("gesturestart", onGesture, { passive: false });
    document.addEventListener("gesturechange", onGesture, { passive: false });

    const loop = (ts: number) => {
      const world = worldRef.current;
      const ctx = canvasRef.current?.getContext("2d");
      if (world && ctx) {
        if (!lastTsRef.current) lastTsRef.current = ts;
        const dtSec = Math.min((ts - lastTsRef.current) / 1000, 0.05);
        lastTsRef.current = ts;

        updateWorld(world, dtSec, stateRef.current === "playing", inputRef.current);
        drawFrame(ctx, world);
      }
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
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
  }, [fitCanvas]);

  const handleStart = () => {
    const world = worldRef.current;
    if (world) {
      world.elapsedMs = 0;
      applySafeInsetsToWorld(world);
      world.player.x = world.width / 2;
      world.player.y = Math.min(world.height - world.safeBottom - 64, world.height * 0.78);
    }
    clearKeys(inputRef.current);
    setPointer(inputRef.current, false);
    lastTsRef.current = 0;
    syncState("playing");
  };

  const handleGameOver = () => {
    syncState("gameover");
  };

  const handleRestart = () => {
    handleStart();
  };

  const handleBackToReady = () => {
    syncState("ready");
  };

  return (
    <div className="game-root">
      <canvas
        ref={canvasRef}
        className="game-canvas"
        aria-label="총알 피하기 게임 화면"
      />

      {gameState === "ready" && (
        <div className="game-overlay">
          <div className="overlay-content">
            <p className="brand">총알 피하기</p>
            <h1 className="title">Dodge Bullets</h1>
            <p className="subtitle">위에서 내려오는 총알을 피하세요</p>
            <p className="controls-hint">
              터치로 드래그 · 키보드 ←→↑↓ / WASD
            </p>
            <button type="button" className="cta" onClick={handleStart}>
              게임 시작
            </button>
          </div>
        </div>
      )}

      {gameState === "playing" && (
        <div className="hud safe-area">
          <div className="hud-left">
            <span className="hud-score">점수 0</span>
            <span className="hud-hint">드래그 또는 WASD</span>
          </div>
          {/* Day 1-1: 상태 전환 확인용. Day 1-3에서 충돌로 대체 */}
          <button type="button" className="hud-debug" onClick={handleGameOver}>
            게임오버
          </button>
        </div>
      )}

      {gameState === "gameover" && (
        <div className="game-overlay">
          <div className="overlay-content">
            <p className="brand">게임 오버</p>
            <h1 className="title">다시 도전?</h1>
            <p className="subtitle">점수 0</p>
            <button type="button" className="cta" onClick={handleRestart}>
              다시하기
            </button>
            <button type="button" className="cta cta-ghost" onClick={handleBackToReady}>
              시작 화면
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
