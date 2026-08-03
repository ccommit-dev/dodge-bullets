import { useCallback, useEffect, useRef, useState } from "react";
import { BEAT_SHOP_ITEMS } from "./beat/shop";
import { drawBeatFrame } from "./beat/draw";
import { BEAT_TRACKS, getCampaignStage, isLastCampaignStage, stageCount } from "./beat/tracks";
import type { BeatCosmetics, RingSkinId, SpikeSkinId } from "./beat/types";
import { BEAT_SOUND_LABEL } from "./beat/types";
import {
  applyBeatInsets,
  createBeatSession,
  disposeBeatSession,
  performBeatTap,
  resizeBeatWorld,
  updateBeatWorld,
  type BeatSession,
} from "./beat/world";
import {
  computeClearReward,
  loadBeatCosmetics,
  loadBeatUnlock,
  saveBeatCosmetics,
  saveBeatUnlock,
  saveCoins,
  saveHighScore,
} from "./game/storage";
import type { SafeInsets } from "./game/toss";

type BeatUi = "menu" | "playing" | "clear" | "gameover" | "shop";

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
  const cosmeticsRef = useRef<BeatCosmetics | null>(null);
  const pendingClearRef = useRef(false);

  const [ui, setUi] = useState<BeatUi>("menu");
  const [score, setScore] = useState(0);
  const [lastScore, setLastScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [hp, setHp] = useState(3);
  const [maxHp, setMaxHp] = useState(3);
  const [remainSec, setRemainSec] = useState(0);
  const [coinGain, setCoinGain] = useState(0);
  const [lessonTitle, setLessonTitle] = useState(() => getCampaignStage(0).lessonTitle);
  const [stageNo, setStageNo] = useState(1);
  const [nextSoundLabel, setNextSoundLabel] = useState("킥(B)");
  const [lastSoundLabel, setLastSoundLabel] = useState("");
  const [unlocked, setUnlocked] = useState(0);
  const [cosmetics, setCosmetics] = useState<BeatCosmetics | null>(null);
  const [shopMsg, setShopMsg] = useState("");
  const hudNextRef = useRef("");
  const hudLastRef = useRef("");

  const syncUi = useCallback((next: BeatUi) => {
    uiRef.current = next;
    setUi(next);
  }, []);

  useEffect(() => {
    void (async () => {
      const [u, c] = await Promise.all([
        loadBeatUnlock(userHash),
        loadBeatCosmetics(userHash),
      ]);
      setUnlocked(u);
      setCosmetics(c);
      cosmeticsRef.current = c;
    })();
  }, [userHash]);

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
      if (now - lastTapMs.current < 40) return;
      lastTapMs.current = now;
      performBeatTap(sessionRef.current);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (uiRef.current !== "playing" || !sessionRef.current) return;
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
          setLessonTitle(w.lessonTitle);
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

          if (event.type === "dead") {
            setLastScore(w.score);
            void saveHighScore(userHash, w.score);
            syncUi("gameover");
          }
          if (event.type === "clear" && !pendingClearRef.current) {
            pendingClearRef.current = true;
            const track = session.track;
            const reward =
              computeClearReward(
                track.reward,
                w.hp,
                w.maxHp,
                w.elapsedMs,
                w.durationMs,
              ) + Math.min(60, w.maxCombo * 2);
            setCoinGain(reward);
            setLastScore(w.score);
            void (async () => {
              const next = await saveCoins(userHash, coinsRef.current + reward);
              coinsRef.current = next;
              onCoins(next);
              const unlockTo = Math.min(stageCount() - 1, w.stageIndex + 1);
              setUnlocked((prev) => Math.max(prev, unlockTo));
              await saveBeatUnlock(userHash, unlockTo);
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

  const startStage = async (fromStage: number) => {
    if (fromStage > unlocked) return;
    if (sessionRef.current) {
      disposeBeatSession(sessionRef.current);
      sessionRef.current = null;
    }
    pendingClearRef.current = false;
    const canvas = canvasRef.current;
    const width = window.innerWidth;
    const height = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const track = getCampaignStage(fromStage);
    const cos = cosmeticsRef.current;
    const session = await createBeatSession(
      width,
      height,
      dpr,
      track.id,
      soundEnabled,
      fromStage,
      cos ?? undefined,
    );
    applyBeatInsets(session.world, insets);
    sessionRef.current = session;
    setLessonTitle(track.lessonTitle);
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

  const buyOrEquip = async (kind: "ring" | "spike", id: string) => {
    if (!cosmetics) return;
    const item = BEAT_SHOP_ITEMS.find((i) => i.kind === kind && i.id === id);
    if (!item) return;
    const next = { ...cosmetics, ownedRings: [...cosmetics.ownedRings], ownedSpikes: [...cosmetics.ownedSpikes] };

    if (kind === "ring") {
      const rid = id as RingSkinId;
      if (!next.ownedRings.includes(rid)) {
        if (coinsRef.current < item.cost) {
          setShopMsg("코인이 부족해요");
          return;
        }
        const bal = await saveCoins(userHash, coinsRef.current - item.cost);
        coinsRef.current = bal;
        onCoins(bal);
        next.ownedRings.push(rid);
        setShopMsg(`${item.name} 구매!`);
      }
      next.ringSkin = rid;
    } else {
      const sid = id as SpikeSkinId;
      if (!next.ownedSpikes.includes(sid)) {
        if (coinsRef.current < item.cost) {
          setShopMsg("코인이 부족해요");
          return;
        }
        const bal = await saveCoins(userHash, coinsRef.current - item.cost);
        coinsRef.current = bal;
        onCoins(bal);
        next.ownedSpikes.push(sid);
        setShopMsg(`${item.name} 구매!`);
      }
      next.spikeSkin = sid;
    }

    setCosmetics(next);
    cosmeticsRef.current = next;
    await saveBeatCosmetics(userHash, next);
    if (sessionRef.current) sessionRef.current.world.cosmetics = next;
  };

  const dockStyle = {
    paddingTop: insets.top,
    paddingLeft: insets.left,
    paddingRight: insets.right,
  } as const;

  const totalStages = stageCount();

  return (
    <div className="beat-layer">
      <canvas ref={canvasRef} className="game-canvas" />

      {ui === "menu" && (
        <div className="game-overlay">
          <div className="overlay-content overlay-wide">
            <p className="brand beat-kicker">BEATBOX LESSON</p>
            <h1 className="title beat-title">ORBIT//BEAT</h1>
            <p className="subtitle">
              Bukbak 스타일 강좌 순서 · 가이드 소리 = 탭 소리 · 박자에 맞춰 배우세요
            </p>
            <p className="score-line">코인 {coins} · 해금 STAGE {unlocked + 1}/{totalStages}</p>
            <div className="stage-grid">
              {BEAT_TRACKS.map((t, i) => {
                const locked = i > unlocked;
                return (
                  <button
                    key={t.id}
                    type="button"
                    className={`stage-card ${locked ? "locked" : ""}`}
                    disabled={locked}
                    onClick={() => void startStage(i)}
                  >
                    <span className="stage-card-no">S{i + 1}</span>
                    <span className="stage-card-name">{t.lessonTitle}</span>
                    <span className="stage-card-desc">
                      {locked ? "🔒 이전 스테이지 클리어" : t.desc}
                    </span>
                    <span className="stage-card-meta">
                      {t.subdivision}비트 · {t.difficulty}
                      {t.ringCount === 2 ? " · 이중원" : ""}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="menu-actions">
              <button type="button" className="cta beat-start" onClick={() => void startStage(0)}>
                STAGE 1 시작
              </button>
              <button type="button" className="cta cta-ghost" onClick={() => syncUi("shop")}>
                비트 상점
              </button>
              <button type="button" className="cta cta-ghost" onClick={onBack}>
                게임 선택
              </button>
            </div>
          </div>
        </div>
      )}

      {ui === "shop" && cosmetics && (
        <div className="game-overlay">
          <div className="overlay-content overlay-wide">
            <p className="brand beat-kicker">BEAT SHOP</p>
            <h1 className="title">궤도 · 비트 꾸미기</h1>
            <p className="subtitle">클리어 코인으로 링/화살표 비트를 커스텀하세요</p>
            <p className="score-line">보유 {coins} 코인</p>
            {shopMsg && <p className="shop-toast">{shopMsg}</p>}
            <div className="beat-shop-list">
              {BEAT_SHOP_ITEMS.map((item) => {
                const owned =
                  item.kind === "ring"
                    ? cosmetics.ownedRings.includes(item.id)
                    : cosmetics.ownedSpikes.includes(item.id);
                const equipped =
                  item.kind === "ring"
                    ? cosmetics.ringSkin === item.id
                    : cosmetics.spikeSkin === item.id;
                return (
                  <div key={`${item.kind}-${item.id}`} className="beat-shop-item">
                    <div className="shop-item-text">
                      <strong>
                        {item.kind === "ring" ? "링" : "비트"} · {item.name}
                      </strong>
                      <span>{item.desc}</span>
                      <span className="shop-lv">
                        {owned ? (equipped ? "착용 중" : "보유") : `${item.cost} 코인`}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="shop-buy"
                      onClick={() => void buyOrEquip(item.kind, item.id)}
                    >
                      {equipped ? "착용됨" : owned ? "착용" : "구매"}
                    </button>
                  </div>
                );
              })}
            </div>
            <button type="button" className="cta" onClick={() => syncUi("menu")}>
              스테이지 선택
            </button>
          </div>
        </div>
      )}

      {ui === "playing" && (
        <>
          <div className="hud beat-hud" style={dockStyle}>
            <div className="hud-left">
              <span className="hud-score beat-track-name">
                STAGE {stageNo}/{totalStages} · {remainSec}s
              </span>
              <span className="hud-hint">
                {lessonTitle} · NEXT {nextSoundLabel}
                {lastSoundLabel ? ` · YOU ${lastSoundLabel}` : ""} · HP {"♥".repeat(hp)}
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
              <span>TAP = 연주</span>
              <small>가이드와 같은 소리 · 밝은 쪽으로</small>
            </button>
          </div>
        </>
      )}

      {ui === "clear" && (
        <div className="game-overlay">
          <div className="overlay-content">
            <p className="brand">STAGE CLEAR</p>
            <h1 className="title">{lessonTitle}</h1>
            <p className="score-line">+{coinGain} 코인</p>
            <p className="subtitle">점수 {lastScore} · 보유 {coins}</p>
            <p className="controls-hint">강좌 한 단원 완료! 상점에서 링·비트를 꾸며보세요</p>
            {!isLastCampaignStage(stageNo - 1) && stageNo <= unlocked && (
              <button
                type="button"
                className="cta"
                onClick={() => void startStage(stageNo)}
              >
                다음 스테이지
              </button>
            )}
            <button type="button" className="cta beat-start" onClick={() => syncUi("shop")}>
              비트 상점
            </button>
            <button type="button" className="cta cta-ghost" onClick={() => syncUi("menu")}>
              스테이지 선택
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
            <p className="subtitle">{lessonTitle}</p>
            <button type="button" className="cta" onClick={() => void startStage(stageNo - 1)}>
              다시 도전
            </button>
            <button type="button" className="cta cta-ghost" onClick={() => syncUi("menu")}>
              스테이지 선택
            </button>
            <button type="button" className="cta cta-ghost" onClick={() => syncUi("shop")}>
              비트 상점
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
