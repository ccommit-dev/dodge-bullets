import { useCallback, useEffect, useRef, useState } from "react";
import { BEAT_SHOP_ITEMS } from "./beat/shop";
import { drawBeatFrame } from "./beat/draw";
import {
  applyLessonClear,
  buildStageSlots,
  SKILL_LABEL,
  skillTotal,
  spendStamina,
  type BeatRpgProgress,
  type PracticeSlot,
  type SkillId,
} from "./beat/rpg";
import { getCampaignStage, isLastCampaignStage, stageCount } from "./beat/tracks";
import type { BeatCosmetics, NoteLane, RingSkinId, SpikeSkinId } from "./beat/types";
import { BEAT_SOUND_LABEL, LANE_KEYS, LANE_LABEL, LANE_MEMBERS } from "./beat/types";
import {
  applyBeatInsets,
  createBeatSession,
  disposeBeatSession,
  laneOfSound,
  performBeatLane,
  resizeBeatWorld,
  updateBeatWorld,
  type BeatSession,
} from "./beat/world";
import {
  computeClearReward,
  loadBeatCosmetics,
  loadBeatRpg,
  loadBeatUnlock,
  saveBeatCosmetics,
  saveBeatRpg,
  saveBeatUnlock,
  saveCoins,
  saveHighScore,
} from "./game/storage";
import type { SafeInsets } from "./game/toss";
import { grantCharacterReward, updateCharacterProgress } from "./progression/storage";
import { PROGRESSION_BALANCE } from "./progression/balance";
import { AdventurerSprite } from "./ui/AdventurerSprite";

type BeatUi = "menu" | "playing" | "clear" | "gameover" | "shop";

/** Each pad has its own keys so the lane you see is the key you press. */
const KEY_LANE: Record<string, NoteLane> = {
  KeyA: 0,
  ArrowLeft: 0,
  Digit1: 0,
  KeyS: 1,
  ArrowDown: 1,
  KeyW: 1,
  ArrowUp: 1,
  Space: 1,
  Digit2: 1,
  KeyD: 2,
  ArrowRight: 2,
  Digit3: 2,
};

const LANES: NoteLane[] = [0, 1, 2];

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
  const rpgRef = useRef<BeatRpgProgress | null>(null);
  const pendingClearRef = useRef(false);
  const activeSlotRef = useRef<PracticeSlot | null>(null);

  const [ui, setUi] = useState<BeatUi>("menu");
  const [score, setScore] = useState(0);
  const [lastScore, setLastScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [hp, setHp] = useState(3);
  const [maxHp, setMaxHp] = useState(3);
  const [remainSec, setRemainSec] = useState(0);
  const [coinGain, setCoinGain] = useState(0);
  const [rpgGain, setRpgGain] = useState("");
  const [lessonTitle, setLessonTitle] = useState(() => getCampaignStage(0).lessonTitle);
  const [stageNo, setStageNo] = useState(1);
  const [nextSoundLabel, setNextSoundLabel] = useState("킥(B)");
  const [lastSoundLabel, setLastSoundLabel] = useState("");
  const [timingOffset, setTimingOffset] = useState(0);
  const [loopCompletion, setLoopCompletion] = useState(0);
  const [unlocked, setUnlocked] = useState(0);
  const [cosmetics, setCosmetics] = useState<BeatCosmetics | null>(null);
  const [rpg, setRpg] = useState<BeatRpgProgress | null>(null);
  const [shopMsg, setShopMsg] = useState("");
  const [hubMsg, setHubMsg] = useState("");
  const [practiceKind, setPracticeKind] = useState<"lesson" | "spar">("lesson");
  const slots = buildStageSlots(practiceKind);
  const hudNextRef = useRef("");
  const hudLastRef = useRef("");

  const syncUi = useCallback((next: BeatUi) => {
    uiRef.current = next;
    setUi(next);
  }, []);

  useEffect(() => {
    void (async () => {
      const [u, c, r] = await Promise.all([
        loadBeatUnlock(userHash),
        loadBeatCosmetics(userHash),
        loadBeatRpg(userHash),
      ]);
      setUnlocked(u);
      setCosmetics(c);
      cosmeticsRef.current = c;
      setRpg(r);
      rpgRef.current = r;
      await saveBeatRpg(userHash, r);
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

    const fireTap = (lane: NoteLane) => {
      if (uiRef.current !== "playing" || !sessionRef.current) return;
      const now = performance.now();
      if (now - lastTapMs.current < 40) return;
      lastTapMs.current = now;
      performBeatLane(sessionRef.current, lane);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (uiRef.current !== "playing" || !sessionRef.current) return;
      if (e.repeat) return;
      const lane = KEY_LANE[e.code];
      if (lane === undefined) return;
      fireTap(lane);
      e.preventDefault();
    };

    // Tap position picks the pad: left third = B, middle = T, right = K.
    const onPointerDown = (e: PointerEvent) => {
      if (uiRef.current !== "playing" || !sessionRef.current) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      canvas.setPointerCapture(e.pointerId);
      const rect = canvas.getBoundingClientRect();
      const ratio = rect.width > 0 ? (e.clientX - rect.left) / rect.width : 0.5;
      fireTap(ratio < 0.34 ? 0 : ratio > 0.66 ? 2 : 1);
      e.preventDefault();
    };

    // Hidden tabs stop requestAnimationFrame while the AudioContext keeps
    // ticking, so freeze the audio clock too and re-sync the frame delta.
    const onVisibility = () => {
      const session = sessionRef.current;
      if (!session?.ctx) return;
      if (document.visibilityState === "hidden") {
        void session.ctx.suspend();
      } else {
        lastTsRef.current = 0;
        void session.ctx.resume();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    canvas.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("visibilitychange", onVisibility);

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
          setTimingOffset(w.lastOffsetMs);
          setLoopCompletion(w.loopCompletion);
          const nextL = `${BEAT_SOUND_LABEL[w.nextSound]} → ${LANE_KEYS[laneOfSound(w.nextSound)]}`;
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
            const slot = activeSlotRef.current;
            const reward =
              computeClearReward(
                track.reward + (session.isSpar ? 20 : 0),
                w.hp,
                w.maxHp,
                w.elapsedMs,
                w.durationMs,
              ) + Math.min(60, w.maxCombo * 2);
            setCoinGain(reward);
            setLastScore(w.score);
            const perfectRatio =
              session.taps > 0 ? session.lockHits / session.taps : 0;
            void (async () => {
              const nextCoins = await saveCoins(userHash, coinsRef.current + reward);
              coinsRef.current = nextCoins;
              onCoins(nextCoins);
              const unlockTo = Math.min(stageCount() - 1, w.stageIndex + 1);
              setUnlocked((prev) => Math.max(prev, unlockTo));
              await saveBeatUnlock(userHash, unlockTo);
              if (rpgRef.current) {
                const grown = applyLessonClear(rpgRef.current, track, {
                  perfectRatio,
                  isSpar: session.isSpar || slot?.kind === "spar",
                });
                rpgRef.current = grown;
                setRpg(grown);
                await saveBeatRpg(userHash, grown);
                const rewardId = `beat:${track.id}:${Date.now()}`;
                await grantCharacterReward(userHash, rewardId, {
                  exp: PROGRESSION_BALANCE.beat.clearExp,
                  sharedCoins: reward,
                  lastContent: "beat",
                });
                await updateCharacterProgress(userHash, (current) => ({
                  ...current,
                  beatSkills: { ...grown.skills },
                  skillPoints: Math.max(current.skillPoints, grown.sp),
                  lastContent: "beat",
                }));
                setRpgGain(
                  `숙련↑ · SP+${session.isSpar ? 3 : 2} · 명성+${
                    (session.isSpar ? 12 : 6) + Math.round(perfectRatio * (session.isSpar ? 20 : 10))
                  }`,
                );
              }
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
      document.removeEventListener("visibilitychange", onVisibility);
      if (sessionRef.current) {
        disposeBeatSession(sessionRef.current);
        sessionRef.current = null;
      }
    };
  }, [onCoins, syncUi, userHash]);

  const startSlot = async (slot: PracticeSlot) => {
    if (!slot.track || !rpgRef.current) return;
    const spent = spendStamina(rpgRef.current, slot.staminaCost);
    if (!spent) {
      setHubMsg("스태미나 부족 · 내일 다시 충전됩니다");
      return;
    }
    rpgRef.current = spent;
    setRpg(spent);
    await saveBeatRpg(userHash, spent);
    setHubMsg("");

    if (sessionRef.current) {
      disposeBeatSession(sessionRef.current);
      sessionRef.current = null;
    }
    pendingClearRef.current = false;
    activeSlotRef.current = slot;

    const canvas = canvasRef.current;
    const width = window.innerWidth;
    const height = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const track = slot.track;
    const cos = cosmeticsRef.current;
    const session = await createBeatSession(
      width,
      height,
      dpr,
      track.id,
      soundEnabled,
      slot.stageIndex,
      cos ?? undefined,
      spent.skills,
      slot.kind === "spar",
    );
    applyBeatInsets(session.world, insets);
    sessionRef.current = session;
    setLessonTitle(slot.title);
    setStageNo(slot.stageIndex + 1);
    setScore(0);
    setCombo(0);
    setHp(session.world.hp);
    setMaxHp(session.world.maxHp);
    setRemainSec(Math.ceil(session.world.durationMs / 1000));
    setCoinGain(0);
    setRpgGain("");
    setLastSoundLabel("");
    setTimingOffset(0);
    setLoopCompletion(0);
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
    const next = {
      ...cosmetics,
      ownedRings: [...cosmetics.ownedRings],
      ownedSpikes: [...cosmetics.ownedSpikes],
    };

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
  const skillIds = Object.keys(SKILL_LABEL) as SkillId[];

  return (
    <div className="beat-layer">
      <canvas ref={canvasRef} className="game-canvas" />

      {ui === "menu" && rpg && (
        <div className="game-overlay">
          <div className="overlay-content overlay-wide">
            <p className="brand beat-kicker">PRACTICE ROOM</p>
            <AdventurerSprite className="beat-menu-adventurer" />
            <h1 className="title beat-title">비트박스 연습실</h1>
            <p className="subtitle">
              배우고 싶은 비트를 골라 연습하세요 · 내려오는 노트의 레인 패드를 눌러 리드를 겹칩니다
            </p>
            <p className="controls-hint">
              {LANES.map((lane) => `${LANE_KEYS[lane]} = ${LANE_LABEL[lane]}(${LANE_MEMBERS[lane]})`).join(
                " · ",
              )}
            </p>
            <p className="controls-hint">화면은 좌·중·우 3분할 탭으로도 연주됩니다</p>
            <p className="score-line">
              코인 {coins} · 자유 연습 · 명성 {rpg.fame} · SP {rpg.sp}
            </p>
            <div className="rpg-stats">
              {skillIds.map((id) => (
                <div key={id} className="rpg-stat">
                  <span>{SKILL_LABEL[id]}</span>
                  <strong>Lv.{rpg.skills[id]}</strong>
                </div>
              ))}
              <div className="rpg-stat">
                <span>합계</span>
                <strong>{skillTotal(rpg.skills)}</strong>
              </div>
            </div>
            {hubMsg && <p className="shop-toast">{hubMsg}</p>}
            <div className="mode-row" role="tablist">
              {(["lesson", "spar"] as const).map((kind) => (
                <button
                  key={kind}
                  type="button"
                  role="tab"
                  aria-selected={practiceKind === kind}
                  className={`mode-tab ${practiceKind === kind ? "on" : ""}`}
                  onClick={() => setPracticeKind(kind)}
                >
                  {kind === "lesson" ? "레슨 · 차근차근" : "스파링 · 보상 2배"}
                </button>
              ))}
            </div>
            <div className="schedule-list">
              {slots.map((slot) => {
                const done = rpg.clearedToday.includes(slot.track.id);
                const recommended = slot.stageIndex === Math.min(unlocked, totalStages - 1);
                return (
                  <button
                    key={slot.track.id}
                    type="button"
                    className={`schedule-card ${recommended ? "today" : ""} ${
                      done ? "done" : ""
                    }`}
                    onClick={() => void startSlot(slot)}
                  >
                    <span className="schedule-day">
                      STAGE {slot.stageIndex + 1} · {slot.track.bpm}BPM ·{" "}
                      {slot.track.subdivision}비트
                      {recommended ? " · 추천" : ""}
                    </span>
                    <span className="schedule-title">{slot.title}</span>
                    <span className="schedule-hint">{done ? `오늘 완료 · ${slot.hint}` : slot.hint}</span>
                    <span className="schedule-cost">
                      {slot.kind === "spar" ? "스파링" : "레슨"} · +{slot.track.reward} 코인
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="menu-actions">
              <button
                type="button"
                className="cta beat-start"
                onClick={() => {
                  const next =
                    slots[Math.min(unlocked, slots.length - 1)] ?? slots[0];
                  void startSlot(next);
                }}
              >
                이어서 연습하기
              </button>
              <button type="button" className="cta cta-ghost" onClick={() => syncUi("shop")}>
                비트 상점
              </button>
              <button type="button" className="cta cta-ghost" onClick={onBack}>
                타이탄 사냥터
              </button>
            </div>
          </div>
        </div>
      )}

      {ui === "shop" && cosmetics && (
        <div className="game-overlay">
          <div className="overlay-content overlay-wide">
            <p className="brand beat-kicker">BEAT SHOP</p>
            <h1 className="title">레일 · 노트 꾸미기</h1>
            <p className="subtitle">클리어 코인으로 3D 레일과 비트 노트를 커스텀하세요</p>
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
              연습실로
            </button>
          </div>
        </div>
      )}

      {ui === "playing" && (
        <>
          <AdventurerSprite className="beat-stage-adventurer" />
          <div className="hud beat-hud" style={dockStyle}>
            <div className="hud-left">
              <span className="hud-score beat-track-name">
                {activeSlotRef.current?.kind === "spar" ? "SPAR" : "LESSON"} {stageNo}/
                {totalStages} · {remainSec}s
              </span>
              <span className="hud-hint">
                {lessonTitle} · NEXT {nextSoundLabel}
                {lastSoundLabel ? ` · YOU ${lastSoundLabel}` : ""} · HP {"♥".repeat(hp)}
                {"♡".repeat(Math.max(0, maxHp - hp))}
              </span>
              <span className="hud-hint">
                LOOP {Math.round(loopCompletion * 100)}% ·{" "}
                {timingOffset === 0
                  ? "ON GRID"
                  : timingOffset < 0
                    ? `EARLY ${Math.abs(timingOffset)}ms`
                    : `LATE ${timingOffset}ms`}
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
            {LANES.map((lane) => (
              <button
                key={lane}
                type="button"
                className={`action-btn beat-pad beat-pad--${lane}`}
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (sessionRef.current) performBeatLane(sessionRef.current, lane);
                }}
              >
                <span>{LANE_LABEL[lane]}</span>
                <small>{LANE_KEYS[lane]}</small>
              </button>
            ))}
          </div>
        </>
      )}

      {ui === "clear" && (
        <div className="game-overlay">
          <div className="overlay-content">
            <p className="brand">CLEAR</p>
            <h1 className="title">{lessonTitle}</h1>
            <p className="score-line">+{coinGain} 코인</p>
            {rpgGain && <p className="subtitle">{rpgGain}</p>}
            <p className="subtitle">점수 {lastScore} · 보유 {coins}</p>
            <p className="controls-hint">숙련도가 올랐습니다 · 상점에서 링·비트를 꾸며보세요</p>
            {!isLastCampaignStage(stageNo - 1) && (
              <button
                type="button"
                className="cta"
                onClick={() => {
                  const next = slots[stageNo];
                  if (next) void startSlot(next);
                  else syncUi("menu");
                }}
              >
                다음 스테이지
              </button>
            )}
            <button type="button" className="cta beat-start" onClick={() => syncUi("shop")}>
              비트 상점
            </button>
            <button type="button" className="cta cta-ghost" onClick={() => syncUi("menu")}>
              연습실
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
            <button
              type="button"
              className="cta"
              onClick={() => {
                const slot = activeSlotRef.current ?? slots[stageNo - 1] ?? slots[0];
                void startSlot(slot);
              }}
            >
              다시 도전
            </button>
            <button type="button" className="cta cta-ghost" onClick={() => syncUi("menu")}>
              연습실
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
