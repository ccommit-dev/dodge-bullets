import { useCallback, useEffect, useRef, useState } from "react";
import { getCampaignStage } from "./beat/tracks";
import { drawBeatFrame } from "./beat/draw";
import {
  applyBeatInsets,
  createBeatSession,
  disposeBeatSession,
  performBeatTap,
  resizeBeatWorld,
  updateBeatWorld,
  type BeatSession,
} from "./beat/world";
import { BEAT_SOUND_LABEL } from "./beat/types";
import { computeClearReward, saveCoins, saveHighScore } from "./game/storage";
import type { SafeInsets } from "./game/toss";

type BeatUi = "menu" | "playing" | "clear" | "gameover";

type Props = {
  insets: SafeInsets;
  soundEnabled: boolean;
  userHash: string;
  coins: number;
  onCoins: (n: number) => void;
  onBack: () => void;
};

export function BeatGame({
  insets,
  soundEnabled,
  userHash,
  coins,
  onCoins,
  onBack,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sessionRef = useRef<BeatSession | null>(null);
  const uiRef = useRef<BeatUi>("menu");
  const rafRef = useRef(0);
  const lastTsRef = useRef(0);
  const coinsRef = useRef(coins);
  coinsRef.current = coins;
  const lastTapMs = useRef(0);

  const [ui, setUi] = useState<BeatUi>("menu");
  const [score, setScore] = useState(0);
  const [lastScore, setLastScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [hp, setHp] = useState(3);
  const [maxHp, setMaxHp] = useState(3);
  const [remainSec, setRemainSec] = useState(0);
  const [coinGain, setCoinGain] = useState(0);
  const [trackLabel, setTrackLabel] = useState(() => getCampaignStage(0).name);
  const [stageNo, setStageNo] = useState(1);
  const [nextSoundLabel, setNextSoundLabel] = useState("부츠");
  const [lastSoundLabel, setLastSoundLabel] = useState("");
  const hudNextRef = useRef("");
  const hudLastRef = useRef("");

  const syncUi = useCallback((next: BeatUi) => {
    uiRef.current = next;
    setUi(next);
  }, []);

  const fit = useCallback(() => {
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
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (sessionRef.current) {
      resizeBeatWorld(sessionRef.current.world, width, height, dpr);
      applyBeatInsets(sessionRef.current.world, insets);
    }
  }, [insets]);

  useEffect(() => {
    fit();
    const onResize = () => fit();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [fit]);

  useEffect(() => {
    if (sessionRef.current) applyBeatInsets(sessionRef.current.world, insets);
  }, [insets]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const fireTap = () => {
      if (uiRef.current !== "playing" || !sessionRef.current) return;
      const now = performance.now();
      // Debounce double-fire from pointer+click
      if (now - lastTapMs.current < 40) return;
      lastTapMs.current = now;
      performBeatTap(sessionRef.current);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (uiRef.current !== "playing" || !sessionRef.current) return;
      // Orbit or Beat: any direction key / space = reverse + beat
      if (
        e.code === "Space" ||
        e.code === "ArrowUp" ||
        e.code === "ArrowDown" ||
        e.code === "ArrowLeft" ||
        e.code === "ArrowRight" ||
        e.code === "KeyW" ||
        e.code === "KeyA" ||
        e.code === "KeyS" ||
        e.code === "KeyD"
      ) {
        fireTap();
        e.preventDefault();
      }
    };

    // Instant feel: reverse on press, not release
    const onPointerDown = (e: PointerEvent) => {
      if (uiRef.current !== "playing" || !sessionRef.current) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      canvas.setPointerCapture(e.pointerId);
      fireTap();
      e.preventDefault();
    };

    window.addEventListener("keydown", onKeyDown);
    canvas.addEventListener("pointerdown", onPointerDown);

    const loop = (ts: number) => {
      const ctx = canvas.getContext("2d");
      const session = sessionRef.current;
      if (ctx) {
        if (!lastTsRef.current) lastTsRef.current = ts;
        const dtSec = Math.min((ts - lastTsRef.current) / 1000, 0.05);
        lastTsRef.current = ts;

        if (session && uiRef.current === "playing") {
          const event = updateBeatWorld(session, dtSec, true);
          const w = session.world;
          setScore(w.score);
          setCombo(w.combo);
          setHp(w.hp);
          setMaxHp(w.maxHp);
          setRemainSec(Math.ceil(Math.max(0, w.durationMs - w.elapsedMs) / 1000));
          setStageNo(w.stageIndex + 1);
          setTrackLabel(w.trackName);
          const nextL = BEAT_SOUND_LABEL[w.nextSound];
          if (nextL !== hudNextRef.current) {
            hudNextRef.current = nextL;
            setNextSoundLabel(nextL);
          }
          if (w.lastSound) {
            const lastL = BEAT_SOUND_LABEL[w.lastSound];
            if (lastL !== hudLastRef.current) {
              hudLastRef.current = lastL;
              setLastSoundLabel(lastL);
            }
          }

          if (event.type === "stage-clear") {
            // Stage 3→4 and all mid clears: keep playing, no overlay
            void saveHighScore(userHash, w.score);
            const midReward = 25 + event.nextStage * 8;
            void (async () => {
              const next = await saveCoins(userHash, coinsRef.current + midReward);
              coinsRef.current = next;
              onCoins(next);
            })();
          }

          if (event.type === "dead") {
            setLastScore(w.score);
            void saveHighScore(userHash, w.score);
            syncUi("gameover");
          }
          if (event.type === "clear") {
            const base = 200;
            const reward =
              computeClearReward(base, w.hp, w.maxHp, w.elapsedMs, w.durationMs) +
              Math.min(80, w.maxCombo * 3);
            setCoinGain(reward);
            setLastScore(w.score);
            void (async () => {
              const next = await saveCoins(userHash, coinsRef.current + reward);
              coinsRef.current = next;
              onCoins(next);
            })();
            void saveHighScore(userHash, w.score);
            syncUi("clear");
          }
          drawBeatFrame(ctx, w);
        } else if (session) {
          drawBeatFrame(ctx, session.world);
        } else {
          ctx.fillStyle = "#03030a";
          ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("keydown", onKeyDown);
      canvas.removeEventListener("pointerdown", onPointerDown);
      if (sessionRef.current) {
        disposeBeatSession(sessionRef.current);
        sessionRef.current = null;
      }
    };
  }, [onCoins, syncUi, userHash]);

  const startCampaign = async (fromStage = 0) => {
    if (sessionRef.current) {
      disposeBeatSession(sessionRef.current);
      sessionRef.current = null;
    }
    const canvas = canvasRef.current;
    const width = window.innerWidth;
    const height = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const track = getCampaignStage(fromStage);
    const session = await createBeatSession(
      width,
      height,
      dpr,
      track.id,
      soundEnabled,
      fromStage,
    );
    applyBeatInsets(session.world, insets);
    sessionRef.current = session;
    setTrackLabel(track.name);
    setStageNo(fromStage + 1);
    setScore(0);
    setCombo(0);
    setHp(session.world.hp);
    setMaxHp(session.world.maxHp);
    setRemainSec(Math.ceil(session.world.durationMs / 1000));
    setCoinGain(0);
    setLastSoundLabel("");
    lastTsRef.current = 0;
    if (canvas) {
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      canvas.getContext("2d")?.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    syncUi("playing");
  };

  const handleStart = () => {
    void startCampaign(0);
  };

  const dockStyle = {
    paddingTop: insets.top,
    paddingLeft: insets.left,
    paddingRight: insets.right,
  } as const;

  return (
    <div className="beat-layer">
      <canvas ref={canvasRef} className="game-canvas" />

      {ui === "menu" && (
        <div className="game-overlay">
          <div className="overlay-content overlay-wide">
            <p className="brand beat-kicker">ORBIT OR BEAT</p>
            <h1 className="title beat-title">ORBIT//BEAT</h1>
            <p className="subtitle">
              원을 돌며 탭으로 반전 · 가시를 피하고 비트박스로 곡을 완성하세요
            </p>
            <p className="score-line">STAGE 1 → 6 · 클리어하면 곧바로 다음 스테이지</p>
            <p className="controls-hint">
              화면 아무 곳이나 탭 / Space / 방향키 = 궤도 반전 + 비트 연주
            </p>
            <p className="controls-hint beat-legend">
              <b className="legend-lit" />
              밝게 빛나는 구간이 지금 달려가는 방향입니다. 그 위에 가시가 뜨면 탭해서 반대로
              도세요.
            </p>
            <button type="button" className="cta beat-start" onClick={handleStart}>
              PLAY FROM STAGE 1
            </button>
            <button type="button" className="cta cta-ghost" onClick={onBack}>
              게임 선택
            </button>
          </div>
        </div>
      )}

      {ui === "playing" && (
        <>
          <div className="hud beat-hud" style={dockStyle}>
            <div className="hud-left">
              <span className="hud-score beat-track-name">
                STAGE {stageNo}/6 · {remainSec}s
              </span>
              <span className="hud-hint">
                {trackLabel} · NEXT {nextSoundLabel}
                {lastSoundLabel ? ` · ${lastSoundLabel}` : ""} · HP {"♥".repeat(hp)}
                {"♡".repeat(Math.max(0, maxHp - hp))}
              </span>
            </div>
            <div className="beat-score">{score.toLocaleString()}</div>
            {combo >= 2 && <div className="combo-flash">COMBO x{combo}</div>}
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
              className="action-btn beat-pad"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (sessionRef.current) performBeatTap(sessionRef.current);
              }}
            >
              <span>REVERSE</span>
              <small>밝은 쪽으로 달리는 중</small>
            </button>
          </div>
        </>
      )}

      {ui === "clear" && (
        <div className="game-overlay">
          <div className="overlay-content">
            <p className="brand">ALL CLEAR</p>
            <h1 className="title">STAGE 6 클리어!</h1>
            <p className="score-line">+{coinGain} 코인</p>
            <p className="subtitle">점수 {lastScore} · 보유 {coins}</p>
            <button type="button" className="cta" onClick={handleStart}>
              처음부터
            </button>
            <button type="button" className="cta cta-ghost" onClick={() => syncUi("menu")}>
              메뉴
            </button>
          </div>
        </div>
      )}

      {ui === "gameover" && (
        <div className="game-overlay">
          <div className="overlay-content">
            <p className="brand">게임 오버</p>
            <h1 className="title">비트 아웃</h1>
            <p className="score-line">점수 {lastScore}</p>
            <p className="subtitle">STAGE {stageNo}에서 아웃</p>
            <button
              type="button"
              className="cta"
              onClick={() => void startCampaign(Math.max(0, stageNo - 1))}
            >
              이 스테이지부터
            </button>
            <button type="button" className="cta cta-ghost" onClick={handleStart}>
              STAGE 1부터
            </button>
            <button type="button" className="cta cta-ghost" onClick={() => syncUi("menu")}>
              메뉴
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
