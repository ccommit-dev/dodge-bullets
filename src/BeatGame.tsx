import { useCallback, useEffect, useRef, useState } from "react";
import { assetUrl } from "./asset";
import { drawBeatFrame } from "./beat/draw";
import {
  applyLessonClear,
  buildStageSlots,
  spendStamina,
  type BeatRpgProgress,
  type PracticeSlot,
} from "./beat/rpg";
import { getCampaignStage, isLastCampaignStage, stageCount } from "./beat/tracks";
import type { BeatCosmetics, NoteLane } from "./beat/types";
import { BEAT_SOUND_LABEL, LANE_KEYS } from "./beat/types";
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
  saveBeatRpg,
  saveBeatUnlock,
  saveCoins,
  saveHighScore,
} from "./game/storage";
import type { SafeInsets } from "./game/toss";
import { grantCharacterReward, updateCharacterProgress } from "./progression/storage";
import { PROGRESSION_BALANCE } from "./progression/balance";
import type { ShoulderId } from "./progression/model";
import { EquippedCharacter } from "./ui/EquippedCharacter";
import { AllyArt } from "./titans/SpriteArt";

type BeatUi = "menu" | "playing" | "clear" | "gameover";
type DifficultyChoice = "easy" | "normal" | "hard" | "expert";
const DIFFICULTY = {
  easy: { label: "EASY", bpmMultiplier: .92, difficulty: "easy" as const, reward: 1 },
  normal: { label: "NORMAL", bpmMultiplier: 1, difficulty: "medium" as const, reward: 1.35 },
  hard: { label: "HARD", bpmMultiplier: 1.12, difficulty: "hard" as const, reward: 1.8 },
  expert: { label: "EXPERT", bpmMultiplier: 1.26, difficulty: "hard" as const, reward: 2.5, force16: true },
};

/** Each pad has its own keys so the lane you see is the key you press. */
const KEY_LANE: Record<string, NoteLane> = {
  KeyA: 0,
  ArrowLeft: 0,
  Digit1: 0,
  KeyS: 1,
  ArrowDown: 1,
  Digit2: 1,
  KeyW: 2,
  ArrowUp: 2,
  Digit3: 2,
  KeyD: 3,
  ArrowRight: 3,
  Space: 3,
  Digit4: 3,
};

type BeatDirection = "left" | "down" | "up" | "right";
const DIRECTIONS: Array<{ id: BeatDirection; symbol: string; key: string; lane: NoteLane }> = [
  { id: "left", symbol: "←", key: "← / A", lane: 0 },
  { id: "down", symbol: "↓", key: "↓ / S", lane: 1 },
  { id: "up", symbol: "↑", key: "↑ / W", lane: 2 },
  { id: "right", symbol: "→", key: "→ / D", lane: 3 },
];
const SHOULDER_BLUEPRINTS: Array<{ id: ShoulderId; name: string; desc: string }> = [
  { id: "scout", name: "정찰 견갑", desc: "4비트 · 원정 특화" },
  { id: "shadow", name: "그림자 견갑", desc: "8비트 · 치명 특화" },
  { id: "ogre", name: "오우거 견갑", desc: "복합 비트 · 보스 특화" },
  { id: "dragon", name: "용린 견갑", desc: "16비트 · 스킬 특화" },
];
const CHAPTER_SHOULDERS: ShoulderId[] = ["scout", "shadow", "ogre", "dragon"];

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
  const [rpg, setRpg] = useState<BeatRpgProgress | null>(null);
  const [hubMsg, setHubMsg] = useState("");
  const [difficultyChoice, setDifficultyChoice] = useState<DifficultyChoice>("normal");
  const [shoulderBlueprint, setShoulderBlueprint] = useState<ShoulderId>("scout");
  const [shoulderReward, setShoulderReward] = useState("");
  const [partyAction, setPartyAction] = useState<"march" | "attack" | "guard" | "focus">("focus");
  const [beatEnemyHp, setBeatEnemyHp] = useState(100);
  const [beatEnemyMaxHp, setBeatEnemyMaxHp] = useState(100);
  const [dropCharge, setDropCharge] = useState(0);
  const [instrumentLayers, setInstrumentLayers] = useState<[number, number, number, number]>([0, 0, 0, 0]);
  const [dropFlash, setDropFlash] = useState(0);
  const beatEnemyHpRef = useRef(100);
  const dropChargeRef = useRef(0);
  const dropCountRef = useRef(0);
  const upgradeRoundRef = useRef(0);
  const raidBuffRef = useRef({ kick: 0, allies: 0, drop: 0 });
  const lastRaidTapRef = useRef({ lane: -1, at: 0 });
  const slots = buildStageSlots("lesson");
  const hudNextRef = useRef("");
  const hudLastRef = useRef("");

  const playRaidLane = useCallback((lane: NoteLane) => {
    const session = sessionRef.current;
    if (!session) return;
    performBeatLane(session, lane);
    const world = session.world;
    const success = world.judgeText !== "MISS";
    const action = lane === 0 ? "attack" : lane === 1 ? "guard" : lane === 2 ? "march" : "focus";
    setPartyAction(action);
    if (!success) return;

    setInstrumentLayers((current) => {
      const next = [...current] as [number, number, number, number];
      next[lane] = Math.min(4, next[lane] + 1);
      return next;
    });
    const gain = world.judgeText === "PERFECT" ? 11 : world.judgeText === "GREAT" ? 8 : 5;
    dropChargeRef.current = Math.min(100, dropChargeRef.current + gain);
    const buff = lane === 0 ? raidBuffRef.current.kick : lane === 3 ? raidBuffRef.current.drop : raidBuffRef.current.allies;
    let damage = [12, 16, 9, 20][lane] + buff * 7 + Math.floor(world.combo * .8);
    const now = performance.now();
    if (lastRaidTapRef.current.lane >= 0 && lastRaidTapRef.current.lane !== lane && now - lastRaidTapRef.current.at <= 120) {
      damage += 24;
      dropChargeRef.current = Math.min(100, dropChargeRef.current + 12);
      world.zoomPulse = Math.max(world.zoomPulse, .38);
    }
    lastRaidTapRef.current = { lane, at: now };
    if (lane === 3 && dropChargeRef.current >= 100) {
      damage += 90 + world.combo * 2;
      dropChargeRef.current = 0;
      dropCountRef.current += 1;
      setDropFlash((value) => value + 1);
      world.zoomPulse = 1;
      world.beatPulse = 1;
      world.shakeMs = 260;
      session.box.playSound("firebeat", 1);
      session.box.playSound("trumpet", 1);
      session.box.playSound("throat", 1);
    }
    setDropCharge(dropChargeRef.current);
    beatEnemyHpRef.current = Math.max(0, beatEnemyHpRef.current - damage);
    setBeatEnemyHp(beatEnemyHpRef.current);
    if (beatEnemyHpRef.current === 0) world.elapsedMs = world.durationMs;
  }, []);

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
      playRaidLane(lane);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (uiRef.current !== "playing" || !sessionRef.current) return;
      if (e.repeat) return;
      const lane = KEY_LANE[e.code];
      if (lane === undefined) return;
      fireTap(lane);
      e.preventDefault();
    };

    // Tap position picks one of the four instrument lanes.
    const onPointerDown = (e: PointerEvent) => {
      if (uiRef.current !== "playing" || !sessionRef.current) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      canvas.setPointerCapture(e.pointerId);
      const rect = canvas.getBoundingClientRect();
      const ratio = rect.width > 0 ? (e.clientX - rect.left) / rect.width : 0.5;
      if (ratio < 0.25) fireTap(0);
      else if (ratio < 0.5) fireTap(1);
      else if (ratio < 0.75) fireTap(2);
      else fireTap(3);
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
          const upgradeRound = Math.min(3, Math.floor((w.elapsedMs / Math.max(1, w.durationMs)) * 4));
          if (upgradeRound > upgradeRoundRef.current) {
            upgradeRoundRef.current = upgradeRound;
            const kind = (["kick", "allies", "drop"] as const)[upgradeRound - 1];
            if (kind) raidBuffRef.current = { ...raidBuffRef.current, [kind]: raidBuffRef.current[kind] + 1 };
            setDropFlash((value) => value + 1);
          }
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
            beatEnemyHpRef.current = 0;
            setBeatEnemyHp(0);
            const track = session.track;
            const slot = activeSlotRef.current;
            const reward = Math.round(
              computeClearReward(
                track.reward + (session.isSpar ? 20 : 0),
                w.hp,
                w.maxHp,
                w.elapsedMs,
                w.durationMs,
              ) * DIFFICULTY[difficultyChoice].reward + Math.min(60, w.maxCombo * 2) + dropCountRef.current * 12);
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
                const fragmentGain = Math.max(5, Math.round(8 * DIFFICULTY[difficultyChoice].reward + perfectRatio * 14 + (w.maxCombo >= 20 ? 5 : 0) + Math.min(15, dropCountRef.current * 3)));
                const chapterShoulder = CHAPTER_SHOULDERS[Math.min(CHAPTER_SHOULDERS.length - 1, Math.floor(w.stageIndex / 2))];
                const isChapterBoss = w.stageIndex % 2 === 1;
                const clearKey = `beat-chapter:${Math.floor(w.stageIndex / 2) + 1}:boss-clear`;
                let craftedNow = false;
                const updated = await updateCharacterProgress(userHash, (current) => {
                  const firstBossClear = isChapterBoss && !current.claimedRewards.includes(clearKey);
                  const alreadyOwned = current.ownedShoulders.includes(chapterShoulder);
                  craftedNow = firstBossClear && !alreadyOwned;
                  return {
                    ...current,
                    beatSkills: { ...grown.skills },
                    skillPoints: Math.max(current.skillPoints, grown.sp),
                    shoulderShards: current.shoulderShards + (firstBossClear && !alreadyOwned ? 0 : fragmentGain),
                    ownedShoulders: craftedNow ? [...current.ownedShoulders, chapterShoulder] : current.ownedShoulders,
                    claimedRewards: firstBossClear ? [...current.claimedRewards, clearKey] : current.claimedRewards,
                    lastContent: "beat",
                  };
                });
                const shoulderName = SHOULDER_BLUEPRINTS.find((item) => item.id === chapterShoulder)?.name;
                setShoulderReward(craftedNow ? `${shoulderName} 최초 클리어 확정 획득!` : isChapterBoss && updated.ownedShoulders.includes(chapterShoulder) ? `${shoulderName} 보유 · 견갑 조각 +${fragmentGain}` : `공명 견갑 조각 +${fragmentGain} · 보유 ${updated.shoulderShards}`);
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
  }, [difficultyChoice, onCoins, playRaidLane, shoulderBlueprint, syncUi, userHash]);

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
    setShoulderBlueprint(CHAPTER_SHOULDERS[Math.min(3, Math.floor(slot.stageIndex / 2))]);

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
      DIFFICULTY[difficultyChoice],
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
    setShoulderReward("");
    setLastSoundLabel("");
    setTimingOffset(0);
    setLoopCompletion(0);
    const enemyMax = 90 + slot.stageIndex * 24;
    beatEnemyHpRef.current = enemyMax;
    setBeatEnemyHp(enemyMax);
    setBeatEnemyMaxHp(enemyMax);
    setPartyAction("focus");
    setDropCharge(0);
    dropChargeRef.current = 0;
    dropCountRef.current = 0;
    setInstrumentLayers([0, 0, 0, 0]);
    setDropFlash(0);
    raidBuffRef.current = { kick: 0, allies: 0, drop: 0 };
    upgradeRoundRef.current = 0;
    lastRaidTapRef.current = { lane: -1, at: 0 };
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

  const dockStyle = {
    paddingTop: insets.top,
    paddingLeft: insets.left,
    paddingRight: insets.right,
  } as const;

  const totalStages = stageCount();
  return (
    <div className="beat-layer">
      <canvas ref={canvasRef} className={`game-canvas ${ui === "playing" ? "beat-battle-canvas" : ""}`} />

      {ui === "menu" && rpg && (
        <div className="game-overlay">
          <div className="overlay-content overlay-wide">
            <p className="brand beat-kicker">RESONANCE MARCH</p>
            <h1 className="title beat-title">공명 행군 원정</h1>
            <p className="subtitle">입력이 곧 음악과 공격이 됩니다. KICK·SNARE·HAT·BASS 레이어를 완성하고 DROP으로 보스를 브레이크하세요</p>
            <p className="controls-hint">← KICK · ↓ SNARE · ↑ HAT · → BASS / A S W D</p>
            <p className="score-line">보유 골드 {coins.toLocaleString()} · SP {rpg.sp} · 명성 {rpg.fame}</p>
            {hubMsg && <p className="shop-toast">{hubMsg}</p>}
            <div className="beat-difficulty" aria-label="노래 난이도">
              {(["easy", "normal", "hard"] as DifficultyChoice[]).map((id) => <button key={id} type="button" className={difficultyChoice === id ? "on" : ""} onClick={() => setDifficultyChoice(id)}>
                <b>{DIFFICULTY[id].label}</b><small>보상 ×{DIFFICULTY[id].reward}</small>
              </button>)}
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
                      CHAPTER {Math.floor(slot.stageIndex / 2)+1}-{slot.stageIndex % 2 + 1} · {slot.track.bpm}BPM ·{" "}
                      {slot.track.subdivision}비트 · 약 {Math.round(slot.track.bars * 240 / slot.track.bpm)}초
                      {recommended ? " · 추천" : ""}
                    </span>
                    <span className="schedule-title">{slot.title}</span>
                    <span className="schedule-hint">{done ? `오늘 완료 · ${slot.hint}` : slot.hint}</span>
                    <span className="schedule-cost">{slot.stageIndex % 2 === 1 ? `${SHOULDER_BLUEPRINTS[Math.min(3,Math.floor(slot.stageIndex/2))].name} 최초 확정` : "명령 훈련 · 견갑 조각"} · +{slot.track.reward} 코인</span>
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
              <button type="button" className="cta cta-ghost" onClick={onBack}>
                타이탄 사냥터
              </button>
            </div>
          </div>
        </div>
      )}

      {ui === "playing" && (
        <>
          <div key={dropFlash} className={`beat-command-party action-${partyAction} ${dropFlash > 0 ? "drop-burst" : ""}`} aria-live="polite">
            <div className="beat-enemy-hp"><i style={{width:`${beatEnemyHp / beatEnemyMaxHp * 100}%`}}/><strong>{beatEnemyHp / beatEnemyMaxHp > .66 ? "접근" : beatEnemyHp / beatEnemyMaxHp > .3 ? "교전" : "DROP 결전"} · 몬스터 {beatEnemyHp}/{beatEnemyMaxHp}</strong></div>
            <div className="beat-command-track"><span className={`beat-party-character facing-${partyAction === "attack" ? "attack" : "idle"}`}><EquippedCharacter mode={partyAction === "attack" ? "attack" : "idle"} frame={combo % 4} shoulder={shoulderBlueprint} /></span><span className="beat-party-allies"><AllyArt id="mia" attacking pulse={partyAction === "guard" ? score : 0}/><AllyArt id="leon" attacking pulse={partyAction === "march" ? score : 0}/></span><img className="beat-training-monster" src={assetUrl(stageNo >= 7 ? "titans/generated/monsters/flame-wyvern-clean.png" : stageNo >= 5 ? "titans/generated/monsters/wolf-king-clean.png" : stageNo >= 3 ? "titans/generated/monsters/moon-wolf-king-clean.png" : "titans/generated/monsters/moss-golem-clean.png")} alt="레이드 몬스터" /></div>
            <div className="beat-fever"><i style={{width:`${dropCharge}%`}}/><span>DROP {dropCharge}% {dropCharge >= 100 ? "· BASS를 눌러 궁극기" : ""}</span></div>
            <div className="beat-layer-mixer">{["KICK 검격","SNARE 근접","HAT 원거리","BASS 궁극기"].map((label,index)=><span key={label} className={instrumentLayers[index] > 0 ? "on" : ""}><b>{label}</b><i>{"●".repeat(instrumentLayers[index])}{"○".repeat(4-instrumentLayers[index])}</i></span>)}</div>
          </div>
          <div className="hud beat-hud" style={dockStyle}>
            <div className="hud-left">
              <span className="hud-score beat-track-name">
                {activeSlotRef.current?.kind === "spar" ? "SPAR" : "MARCH"} {stageNo}/
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
              <span className="hud-hint">공명 제련 · {SHOULDER_BLUEPRINTS.find((item) => item.id === shoulderBlueprint)?.name}</span>
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
            {DIRECTIONS.map((direction) => (
              <button
                key={direction.id}
                type="button"
                className={`action-btn beat-pad direction-${direction.id}`}
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (sessionRef.current) playRaidLane(direction.lane);
                }}
              >
                <span>{direction.symbol}</span>
                <small>{["KICK","SNARE","HAT","BASS"][direction.lane]} · {direction.key}</small>
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
            {shoulderReward && <p className="shoulder-reward">{shoulderReward}</p>}
            <p className="subtitle">점수 {lastScore} · 보유 {coins}</p>
            <p className="controls-hint">완성한 음악 레이어·정확도·DROP 횟수가 높을수록 견갑 조각 보상이 증가합니다.</p>
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
            <button type="button" className="cta cta-ghost" onClick={() => syncUi("menu")}>
              연습실
            </button>
            <button type="button" className="cta cta-ghost" onClick={onBack}>
              사냥터로 돌아가기
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
            <button type="button" className="cta cta-ghost" onClick={onBack}>
              사냥터로 돌아가기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
