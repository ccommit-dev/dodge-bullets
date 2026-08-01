import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";

type GameState = "ready" | "playing" | "gameover";

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>("ready");

  const resizeCanvas = useCallback(() => {
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
    ctx.fillStyle = "#0b1220";
    ctx.fillRect(0, 0, width, height);

    // Placeholder player — Day 1에서 교체
    ctx.fillStyle = "#5eead4";
    ctx.beginPath();
    ctx.arc(width / 2, height * 0.78, 18, 0, Math.PI * 2);
    ctx.fill();
  }, []);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, [resizeCanvas]);

  const handleStart = () => {
    setGameState("playing");
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
            <button type="button" className="cta" onClick={handleStart}>
              게임 시작
            </button>
          </div>
        </div>
      )}

      {gameState === "playing" && (
        <div className="hud safe-area">
          <span className="hud-score">점수 0</span>
        </div>
      )}
    </div>
  );
}

export default App;
