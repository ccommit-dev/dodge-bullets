import { heroPortrait } from "./titans/anim";
import { appWidth } from "./ui/webFrame";
import { hasMonsterAnim, heroFrames, monsterAnimStyle } from "./titans/spriteAnim";
import { HUNT_BOSSES, bestiaryThumb } from "./titans/bestiary";
import { HUNTING_AREAS, formatGold } from "./titans/model";
import { SLOT_LABEL } from "./titans/skills";
import type { BeatTrackDef } from "./beat/tracks";
import type { BeatDifficulty } from "./beat/types";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { assetUrl } from "./asset";
import { drawBeatFrame, setBeatStageImage } from "./beat/draw";
// 비트 무대 배경 (2026-10-07) — 모듈 로드 시 한 번 받아 둔다
setBeatStageImage(assetUrl("beat/bg/stage.webp"));
import {
  applyLessonClear,
  beatStageBonusGold,
  buildStageSlots,
  PATTERN_SKILLS,
  SKILL_LABEL,
  spendStamina,
  type BeatRpgProgress,
  type PracticeSlot,
  gradesFor,
  hardUnlocked, applyBeatRecord, bestRecord, emptyBeatRpg } from "./beat/rpg";
import { getCampaignStage, gradeOf, isLastCampaignStage, stageCount, type BeatGrade } from "./beat/tracks";
import type { BeatCosmetics, NoteLane } from "./beat/types";
import { BEAT_PERK_BY_ID, beatModsOf, beatPerkOffer, emptyBeatMods, weakLaneAt, type BeatPerkId } from "./beat/beatPerks";
import {
  applyBeatInsets,
  beatRunAccuracy,
  createBeatSession,
  disposeBeatSession,
  laneOfSound,
  loadBeatCalibrationMs,
  performBeatLane,
  performBeatRelease,
  resizeBeatWorld,
  saveBeatCalibrationMs,
  settleHoldIfPassed,
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
} from "./game/storage";
import { track as trackEvent } from "./analytics/events";
import { beatMasteryMedals, weeklyRanking } from "./beat/ranking";
import { IDLE, masteryToNextSlotLevel, SLOT_BY_BEAT_SKILL, slotLevelFromMastery } from "./progression/idle";
import { beatBossStage } from "./beat/beatPerks";
import { haptic } from "./ui/haptics";
import { shadowPortrait } from "./events/shadowArena";
import { consumeAdReward, rewardedAvailability, showRewarded } from "./ads/rewarded";
import { loadCharacterProgress, qaGemsEnabled } from "./progression/storage";
import { mergeBeatCosmetics } from "./beat/shop";
import { WalletBar } from "./ui/WalletBar";
import { applyLowFx, frameMonitor, setLowFx } from "./ui/perfMode";
import type { SafeInsets } from "./game/toss";
import { grantCharacterReward, updateCharacterProgress } from "./progression/storage";
import { PROGRESSION_BALANCE } from "./progression/balance";
import "./ui/beat-menu.css";   // 2026-11-09 곡 카드 단순화
import { BEAT_DAILY_TICKETS, BEAT_DIFF_LABEL, BEAT_FIRST_CLEAR, beatFirstClaimed, beatRewardText, beatTicketsLeft, claimBeatFirstClear, spendBeatTicket, type BeatClearReward } from "./beat/tickets";
import type { CharacterProgress } from "./progression/model";
import type { ShoulderId } from "./progression/model";
import { EquippedCharacter } from "./ui/EquippedCharacter";
import { AllyArt, monsterFacesRight } from "./titans/SpriteArt";
import { subscribeAppVisibility } from "./ui/appLifecycle";

type BeatUi = "menu" | "playing" | "clear" | "gameover";
/**
 * 난이도 선택(상·중·하)은 삭제됐다 (사용자 지시). 곡마다 고정 난이도가 있고
 * 채보는 BPM·구간으로 곡별로 다르게 생성된다 (beat/tracks.ts buildChart).
 * 보상 배율은 곡의 고정 난이도를 따른다.
 */
function trackRewardMult(track: { difficulty: "easy" | "medium" | "hard" }): number {
  return track.difficulty === "hard" ? 1.8 : track.difficulty === "medium" ? 1.35 : 1;
}

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
/**
 * 비트 수련 무대 = 사냥터 지역 (2026-11-11, 비트 아쉬운 점 6번 "배경 1장") — 곡마다 지역 하나(곡 순서대로 다섯 지역을 돈다).
 * 배경은 그 지역 사냥터 그림(같은 비율의 지평선 띠), 바닥 · 풀 띠는 사냥터와 같은 색, 분위기 색도 지역에 맞춘다.
 * 상대는 그 지역 대장 셋이 번갈아(사냥터와 같은 2판 시트, 왼쪽 보기) — 배경 · 상대 · 색이 한 지역으로 맞는다
 */
const BEAT_AREA_FLOOR: Record<string, { flat: string; line: string; mood: number }> = {
  meadow: { flat: "#d4ac6a", line: "#7fc24c", mood: 3 },
  forest: { flat: "#b99a66", line: "#5fae4a", mood: 0 },
  ruins: { flat: "#d9b48a", line: "#c2a35a", mood: 4 },
  volcano: { flat: "#8f6a54", line: "#b7643a", mood: 1 },
  abyss: { flat: "#7d6f9a", line: "#8f7fc4", mood: 2 },
};
const beatAreaOf = (stageNo: number) => HUNTING_AREAS[Math.max(0, stageNo - 1) % HUNTING_AREAS.length];
const beatMonsterAt = (stageNo: number, wave: number) => { const list = HUNT_BOSSES[beatAreaOf(stageNo).id] ?? []; return list[Math.max(0, wave) % Math.max(1, list.length)]?.art ?? "moss-golem-clean"; };
function setBeatAreaStage(stageNo: number) {
  const area = beatAreaOf(stageNo), f = BEAT_AREA_FLOOR[area.id];
  setBeatStageImage(area.background, f ? { flat: f.flat, line: f.line } : undefined, f?.mood);
}

type BeatRunStats = {
  grade: BeatGrade;
  accuracyPct: number;
  perfect: number;
  great: number;
  good: number;
  miss: number;
  wavesCleared: number;
  stageBonusGold: number;
};

function shoulderForTrack(stageIndex: number, totalStages = stageCount()): ShoulderId {
  const tier = Math.floor((stageIndex * CHAPTER_SHOULDERS.length) / Math.max(1, totalStages));
  return CHAPTER_SHOULDERS[Math.min(CHAPTER_SHOULDERS.length - 1, tier)];
}

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
  const [unlocked, setUnlocked] = useState(0);
  /** 곡별 선택 난이도 변형 (docs/CONTENT_BEAT_DODGE_PLAN.md §1) — 기본은 곡 정의 난이도 */
  const [variants, setVariants] = useState<Record<string, BeatDifficulty>>({});
  const variantOf = (track: BeatTrackDef): BeatDifficulty => variants[track.id] ?? track.difficulty;
  const [rpg, setRpg] = useState<BeatRpgProgress | null>(null);
  // 커스텀 상점은 비트 메뉴에서 뺐다 (2026-10-27 사용자) — 장착한 지휘 북 · 구호는 cosmeticsRef 로 연주에 그대로 입힌다(사기는 사냥터 상점 '외형')
  const [gems, setGems] = useState(0);
  const [hubMsg, setHubMsg] = useState("");
  /** 시도권 · 첫 클리어 표시용 진행 (2026-10-28, beat/tickets.ts) — 메뉴에 돌아올 때마다 다시 읽는다 */
  const [charProg, setCharProg] = useState<CharacterProgress | null>(null);
  const charProgRef = useRef<CharacterProgress | null>(null);
  charProgRef.current = charProg;
  const [firstReward, setFirstReward] = useState<{ diff: string; reward: BeatClearReward } | null>(null);
  useEffect(() => { let alive = true; void loadCharacterProgress(userHash).then((p) => { if (alive) setCharProg(p); }); return () => { alive = false; }; }, [userHash, ui]);
  const [calibrationMs, setCalibrationMs] = useState<number>(() => loadBeatCalibrationMs());
  const adjustCalibration = (next: number) => {
    const clamped = saveBeatCalibrationMs(next);
    setCalibrationMs(clamped);
    if (sessionRef.current) sessionRef.current.calibrationSec = clamped / 1000;
  };
  const [guideDismissed, setGuideDismissed] = useState(false);
  const [lastRunStats, setLastRunStats] = useState<BeatRunStats | null>(null);
  const [waveCount, setWaveCount] = useState(0);
  const waveCountRef = useRef(0);
  useEffect(() => {
    const next = beatMonsterAt(stageNo, waveCount + 1);
    if (!hasMonsterAnim(next)) return;
    const img = new Image();
    img.src = assetUrl(`titans/anim/monsters/${next}.webp`);
  }, [stageNo, waveCount]);
  const beatEnemyMaxHpRef = useRef(100);
  const [shoulderBlueprint, setShoulderBlueprint] = useState<ShoulderId>("scout");
  const onCoinsRef = useRef(onCoins);
  useEffect(() => { onCoinsRef.current = onCoins; }, [onCoins]);
  const [shoulderReward, setShoulderReward] = useState("");
  /** 결과 화면의 기록 비교 — 곡×난이도 최고 점수/콤보와 신기록 여부 (P0-3) */
  const [resultRecord, setResultRecord] = useState<{ bestScore: number; bestCombo: number; combo: number; newScore: boolean; newCombo: boolean } | null>(null);
  const runStartedAtRef = useRef(0);
  /** 클리어 보상 ×2 광고 자리 (P1) — 클리어 화면에서 가용성을 읽는다 */
  const [adDouble, setAdDouble] = useState<"none" | "ad" | "free" | "busy" | "done">("none");
  /** 한 판 결과를 곡×난이도 기록에 반영하고 저장한다 (클리어·게임오버 공통) */
  useEffect(() => {
    if (ui !== "clear") return;
    let alive = true;
    void loadCharacterProgress(userHash).then((p) => { if (!alive) return; const a = rewardedAvailability(p, "beatDouble", new Date().toLocaleDateString("sv-SE")); setAdDouble(a); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ui, userHash]);
  const doubleBeatReward = async () => {
    if (adDouble !== "ad" && adDouble !== "free") return;
    const free = adDouble === "free";
    setAdDouble("busy");
    trackEvent("ad_start", { placement: "beatDouble" });
    try {
      const ok = free ? true : await showRewarded("beatDouble");
      if (!ok) { setAdDouble(free ? "free" : "ad"); return; }
      trackEvent("ad_complete", { placement: "beatDouble" });
      const today = new Date().toLocaleDateString("sv-SE");
      // 진행 저장의 지갑에 더한다 — 미러 키에만 쓰면 다음 불러오기의 max 합치기에서 사라졌다(2026-11-11)
      await updateCharacterProgress(userHash, (current) => ({ ...consumeAdReward(current, "beatDouble", today), sharedCoins: current.sharedCoins + coinGain }));
      const nextCoins = await saveCoins(userHash, coinsRef.current + coinGain);
      coinsRef.current = nextCoins;
      onCoinsRef.current(nextCoins);
      setAdDouble("done");
    } catch {
      setAdDouble("none");
    }
  };
  const commitRecord = (session: BeatSession, cleared: boolean) => {
    const w = session.world;
    const accuracy = beatRunAccuracy(w, cleared);
    const stageBonusGold = beatStageBonusGold(charProgRef.current?.titanBestStage ?? 1, session.track.difficulty);
    setLastRunStats({
      grade: gradeOf(accuracy),
      accuracyPct: Math.round(accuracy * 1000) / 10,
      perfect: w.judgeCounts.perfect,
      great: w.judgeCounts.great,
      good: w.judgeCounts.good,
      miss: w.judgeCounts.miss,
      wavesCleared: waveCountRef.current,
      stageBonusGold,
    });
    const base = rpgRef.current ?? emptyBeatRpg();
    const rec = applyBeatRecord(base, session.track.id, session.track.difficulty, { score: w.score, maxCombo: w.maxCombo, accuracy, cleared });
    rpgRef.current = rec.progress;
    setRpg(rec.progress);
    void saveBeatRpg(userHash, rec.progress);
    const best = bestRecord(rec.progress, session.track.id, session.track.difficulty);
    setResultRecord({ bestScore: best?.score ?? w.score, bestCombo: best?.combo ?? w.maxCombo, combo: w.maxCombo, newScore: rec.newScore, newCombo: rec.newCombo });
    trackEvent("beat_expedition_end", { track: session.track.id, difficulty: session.track.difficulty, score: w.score, combo: w.maxCombo, duration: Math.round((Date.now() - runStartedAtRef.current) / 1000), result: cleared ? "clear" : "fail" });
    if (rec.newScore) trackEvent("beat_score_record", { track: session.track.id, difficulty: session.track.difficulty, score: w.score, combo: w.maxCombo });
  };
  const [partyAction, setPartyAction] = useState<"idle" | "attack" | "guard" | "dodge" | "skill">("idle");
  const [enemyAction, setEnemyAction] = useState<"idle" | "hit" | "attack" | "guard" | "stagger" | "skill">("idle");
  const [materialGain, setMaterialGain] = useState(0);
  const [beatEnemyHp, setBeatEnemyHp] = useState(100);
  const [beatEnemyMaxHp, setBeatEnemyMaxHp] = useState(100);
  const [dropCharge, setDropCharge] = useState(0);
  const [instrumentLayers, setInstrumentLayers] = useState<[number, number, number, number]>([0, 0, 0, 0]);
  const [dropFlash, setDropFlash] = useState(0);
  /** 박자 번호 — 바뀔 때마다 적 래퍼가 리마운트되어 맥동 애니메이션이 재생된다 */
  const [beatTick, setBeatTick] = useState(0);
  const beatNoRef = useRef(-1);
  const [feverMultiplier, setFeverMultiplier] = useState<1 | 2 | 3 | 5>(1);
  const [feverRemainSec, setFeverRemainSec] = useState(0);
  const beatEnemyHpRef = useRef(100);
  const materialGainRef = useRef(0);
  const dropChargeRef = useRef(0);
  const dropCountRef = useRef(0);
  const upgradeRoundRef = useRef(0);
  const raidBuffRef = useRef({ kick: 0, allies: 0, drop: 0 });
  // 출격 강화 · 약점 레인 · 피해 숫자 (2026-10-08, beat/beatPerks.ts) — 곡 사이 1택, 장 대장 약점 레인, 노트마다 숫자
  const [beatPerkChoice, setBeatPerkChoice] = useState<Record<string, BeatPerkId>>({});
  // 고른 곡 (2026-11-09, 사용자: 곡 칩 16 + 곡 카드 16 이 같은 곡을 두 번 보였다 → "칩을 누르면 카드 하나만") — 없으면 추천 곡
  const [pickedTrack, setPickedTrack] = useState<string | null>(null);
  const pickedCardRef = useRef<HTMLDivElement | null>(null);
  const beatModsRef = useRef(emptyBeatMods());
  const weakLaneRef = useRef<NoteLane | null>(null);
  const [weakLane, setWeakLane] = useState<NoteLane | null>(null);
  const [beatFloats, setBeatFloats] = useState<Array<{ id: number; text: string; lane: NoteLane; weak: boolean }>>([]);
  const beatFloatId = useRef(0);
  const pushBeatFloat = useCallback((damage: number, lane: NoteLane, weak: boolean) => {
    const id = ++beatFloatId.current;
    setBeatFloats((prev) => [...prev.slice(-7), { id, text: String(damage), lane, weak }]);
    window.setTimeout(() => setBeatFloats((prev) => prev.filter((x) => x.id !== id)), weak ? 820 : 600);
  }, []);
  const lastRaidTapRef = useRef({ lane: -1, at: 0 });
  const laneHoldTimersRef = useRef<Partial<Record<NoteLane, number>>>({});
  /**
   * 손가락(pointerId) 하나가 어느 레인을 누르고 있는지 — 뗄 때 그 레인만 놓기 위해.
   * 전에는 window 의 pointerup 이 레인 인자 없이 stopLaneHold() 를 불러 네 레인을 통째로 놓았다.
   * 그래서 두 손가락이 필요한 점프·홀드점프에서 한 손가락만 떼도 나머지 홀드가 같이 끊겼다 (2026-09-21).
   */
  const pointerLaneRef = useRef(new Map<number, NoteLane>());
  const slots = buildStageSlots("lesson");
  const drainRaidRewardsRef = useRef<() => void>(() => {});

  /**
   * 완성된 노트 하나의 레이드 보상 — 적 피해·악기 층·드롭 게이지·재료 (2026-10-02).
   * 예전엔 누르는 순간 줬다: 롱노트 머리만 톡 치거나 점프 한쪽만 쳐도 PERFECT 와 피해가 나와 "모두 1회성 입력으로 성공"했다.
   * 이제 world.completedNotes(탭 노트 · 끝까지 유지한 롱노트 · 두 레인을 다 친 점프)만 보상한다
   */
  const applyRaidReward = useCallback((lane: NoteLane, judge: string) => {
    const session = sessionRef.current;
    if (!session) return;
    const world = session.world;
    const perfect = judge.includes("PERFECT") || judge.startsWith("HOLD");
    // 판정별 모션 (계획안 D): PERFECT → 피격 프레임 · GREAT/GOOD → 가드 · 스킬 레인 → 경직
    setEnemyAction(lane === 3 ? "stagger" : perfect ? "hit" : "guard");
    window.setTimeout(() => setEnemyAction("idle"), lane === 3 ? 620 : 390);

    setInstrumentLayers((current) => {
      const next = [...current] as [number, number, number, number];
      next[lane] = Math.min(4, next[lane] + 1);
      return next;
    });
    const bm = beatModsRef.current;
    const gain = Math.max(1, Math.round((perfect ? 5 : judge.includes("GREAT") ? 3 : 2) * bm.dropChargeMul));
    dropChargeRef.current = Math.min(100, dropChargeRef.current + gain);
    const buff = lane === 0 ? raidBuffRef.current.kick : lane === 3 ? raidBuffRef.current.drop : raidBuffRef.current.allies;
    // 출격 강화(레인·콤보 배수) · 약점 레인 ×2.5 (2026-10-08)
    const weakHit = weakLaneRef.current !== null && weakLaneRef.current === lane;
    let damage = Math.round(([14, 7, 6, 25][lane] + buff * 7 + Math.floor(world.combo * .8 * bm.comboMul)) * bm.laneMul[lane] * (weakHit ? bm.weakMul : 1));
    if (weakHit) {
      world.zoomPulse = Math.max(world.zoomPulse, .5);
      world.shakeMs = Math.max(world.shakeMs, 120);
      if (bm.weakScoreBonus > 0) world.score += bm.weakScoreBonus * world.scoreMultiplier;
    }
    haptic("tap");
    const now = performance.now();
    if (lastRaidTapRef.current.lane >= 0 && lastRaidTapRef.current.lane !== lane && now - lastRaidTapRef.current.at <= 120) {
      damage += 24;
      dropChargeRef.current = Math.min(100, dropChargeRef.current + 3);
      world.zoomPulse = Math.max(world.zoomPulse, .38);
    }
    lastRaidTapRef.current = { lane, at: now };
    setDropCharge(dropChargeRef.current);
    const materialDrop = (perfect && Math.random() < .16) || (world.combo > 0 && world.combo % 12 === 0);
    if (materialDrop) {
      materialGainRef.current += lane === 3 ? 2 : 1;
      setMaterialGain(materialGainRef.current);
    }
    beatEnemyHpRef.current = Math.max(0, beatEnemyHpRef.current - damage);
    setBeatEnemyHp(beatEnemyHpRef.current);
    pushBeatFloat(damage, lane, weakHit);
    // 몬스터 토벌 성공 시 곡을 조기 종료하지 않고 다음 웨이브 몬스터를 소환해 곡 끝까지 연주를 이어 간다
    if (beatEnemyHpRef.current === 0) {
      waveCountRef.current += 1;
      setWaveCount(waveCountRef.current);
      world.score += 180 * world.scoreMultiplier;
      materialGainRef.current += 1;
      setMaterialGain(materialGainRef.current);
      const nextMax = Math.round(beatEnemyMaxHpRef.current * 1.35);
      beatEnemyMaxHpRef.current = nextMax;
      beatEnemyHpRef.current = nextMax;
      setBeatEnemyMaxHp(nextMax);
      setBeatEnemyHp(nextMax);
    }
  }, [pushBeatFloat]);

  /** 쌓인 완성 노트를 모두 보상한다 — 탭 직후 · 롱노트 릴리즈 직후 · 매 프레임(꼬리를 지나 자동 성공한 롱노트) */
  const drainRaidRewards = useCallback(() => {
    const session = sessionRef.current;
    if (!session) return;
    const done = session.world.completedNotes.splice(0);
    for (const n of done) applyRaidReward(n.lane, n.judge);
  }, [applyRaidReward]);

  useEffect(() => { drainRaidRewardsRef.current = drainRaidRewards; }, [drainRaidRewards]);

  const playRaidLane = useCallback((lane: NoteLane) => {
    const session = sessionRef.current;
    if (!session) return;
    const result = performBeatLane(session, lane);
    if (result === "held") return;
    const action = lane === 0 ? "attack" : lane === 1 ? "guard" : lane === 2 ? "dodge" : "skill";
    setPartyAction(action);
    // 노트 없는 탭은 파티 동작만 — 피해·게이지·적 반격 없음 (연타 이득도, 벌점도 없다)
    // 롱노트 머리·점프 한쪽은 아직 완성이 아니다 — 보상은 완성될 때(drainRaidRewards)
    drainRaidRewards();
  }, [drainRaidRewards]);

  const stopLaneHold = useCallback((lane?: NoteLane) => {
    const lanes: NoteLane[] = lane === undefined ? [0,1,2,3] : [lane];
    lanes.forEach((target) => {
      const timer = laneHoldTimersRef.current[target];
      if (timer === undefined) return;
      delete laneHoldTimersRef.current[target];
      // 롱노트 릴리즈 판정 — 꼬리 근처면 보너스, 일찍 떼면 MISS (실제로 누르고 있어야 유효)
      const session = sessionRef.current;
      if (session) {
        const r = performBeatRelease(session, target);
        if (r === "release-good" && typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(12);
        if (r === "release-early") {
          // 일찍 뗀 롱노트 — 적이 반격한다 (보상 없음)
          setEnemyAction("skill");
          window.setTimeout(() => setEnemyAction("idle"), 420);
        }
        drainRaidRewards();
      }
    });
  }, [drainRaidRewards]);

  // 키 다운 1회 = 탭 1회. 누르고 있는 동안은 롱노트 유지만 한다 (예전의 스텝마다 반복 발사는 홀드 규칙과 충돌하고 연타 이득을 줬다)
  const startLaneHold = useCallback((lane: NoteLane) => {
    if (laneHoldTimersRef.current[lane] !== undefined) return;
    laneHoldTimersRef.current[lane] = 1;
    playRaidLane(lane);
  }, [playRaidLane]);

  const activateFever = useCallback(() => {
    const session = sessionRef.current;
    if (!session || session.world.scoreMultiplier !== 1) return;
    const charge = dropChargeRef.current;
    const multiplier: 1 | 2 | 3 | 5 = charge >= 100 ? 5 : charge >= 65 ? 3 : charge >= 35 ? 2 : 1;
    if (multiplier === 1) return;
    const durationMs = (multiplier === 5 ? 6_000 : multiplier === 3 ? 7_000 : 8_000) + beatModsRef.current.feverExtraMs;
    session.world.scoreMultiplier = multiplier;
    session.world.feverMs = durationMs;
    dropChargeRef.current = 0;
    setDropCharge(0);
    setFeverMultiplier(multiplier);
    setFeverRemainSec(Math.ceil(durationMs / 1000));
    dropCountRef.current += 1;
    setDropFlash((value) => value + 1);
    setPartyAction("skill");
    setEnemyAction("stagger");
    window.setTimeout(() => setEnemyAction("idle"), 900);
    session.world.zoomPulse = 1;
    session.world.beatPulse = 1;
    session.world.shakeMs = 220;
    session.box.playSound("firebeat", 1);
  }, []);

  const syncUi = useCallback((next: BeatUi) => {
    uiRef.current = next;
    setUi(next);
  }, []);

  // 연주 중 돌아가기 (2026-10-26, 사용자: "비트 원정에 게임 중 돌아가기 UI 추가") — 예전엔 안드로이드 뒤로 가기 두 번 말고는 곡이 끝날 때까지 나갈 길이 없었다.
  // 누르면 곡(오디오 시계 · 반주)을 멈추고 묻는다: 계속 · 곡 목록으로 · 사냥터로. 스태미나는 이미 썼으니 그대로다
  // 모바일 (2026-10-26 점검): 앱을 내렸다 오면 멈춤 카드를 띄운 채 기다린다 — 예전엔 돌아오자마자 곡이 다시 흘렀고, 카드가 떠 있어도 반주가 카드 뒤에서 다시 울렸다.
  // 안드로이드 뒤로 가기도 이 카드를 연다(App.tsx) — quitAskRef 는 그 둘이 읽는 지금 값
  const [quitAsk, setQuitAskState] = useState(false);
  const quitAskRef = useRef(false);
  const setQuitAsk = (v: boolean) => { quitAskRef.current = v; setQuitAskState(v); };
  // AudioContext 가 없는 엔진(카카오톡 인앱 등 · 사운드 끔)은 곡 시계가 프레임 시간이라 루프가 quitAskRef 를 보고 멈춘다
  const pauseForQuit = () => {
    const session = sessionRef.current;
    if (!session) return;
    session.backingAudio?.pause();
    if (session.ctx) void session.ctx.suspend();
    setQuitAsk(true);
  };
  const resumeFromQuit = () => {
    const session = sessionRef.current;
    setQuitAsk(false);
    if (!session) return;
    lastTsRef.current = 0;
    if (session.ctx) void session.ctx.resume().then(() => session.backingAudio?.play()).catch(() => {});
    else void session.backingAudio?.play().catch(() => {});
  };
  const quitRun = (to: "menu" | "hunt") => {
    setQuitAsk(false);
    if (sessionRef.current) {
      disposeBeatSession(sessionRef.current);
      sessionRef.current = null;
    }
    pendingClearRef.current = false;
    syncUi("menu");
    if (to === "hunt") onBack();
  };

  useEffect(() => {
    void (async () => {
      const [u, legacy, r, prog] = await Promise.all([
        loadBeatUnlock(userHash),
        loadBeatCosmetics(userHash),
        loadBeatRpg(userHash),
        loadCharacterProgress(userHash),
      ]);
      setUnlocked(u);
      // 커스텀 소유는 진행도 저장으로 옮겼다 (2026-10-06) — 옛 비트 전용 저장의 것을 한 번 합친다
      const c = mergeBeatCosmetics(prog.beatCosmetics, legacy);
      if (JSON.stringify(c) !== JSON.stringify(prog.beatCosmetics)) {
        await updateCharacterProgress(userHash, (current) => ({ ...current, beatCosmetics: mergeBeatCosmetics(current.beatCosmetics, legacy) }));
      }
      cosmeticsRef.current = c;
      setGems(prog.redGems);
      setRpg(r);
      rpgRef.current = r;
      await saveBeatRpg(userHash, r);
    })();
  }, [userHash]);

  const fit = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = appWidth();   // PC 웹이면 폰 폭 기둥 (ui/webFrame)
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

    const onKeyDown = (e: KeyboardEvent) => {
      if (uiRef.current !== "playing" || !sessionRef.current) return;
      if (e.repeat) return;
      const lane = KEY_LANE[e.code];
      if (lane === undefined) return;
      startLaneHold(lane);
      e.preventDefault();
    };

    // Tap position picks one of the four instrument lanes.
    const onPointerDown = (e: PointerEvent) => {
      if (uiRef.current !== "playing" || !sessionRef.current) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      canvas.setPointerCapture(e.pointerId);
      const rect = canvas.getBoundingClientRect();
      const ratio = rect.width > 0 ? (e.clientX - rect.left) / rect.width : 0.5;
      const lane: NoteLane = ratio < 0.25 ? 0 : ratio < 0.5 ? 1 : ratio < 0.75 ? 2 : 3;
      pointerLaneRef.current.set(e.pointerId, lane);
      startLaneHold(lane);
      e.preventDefault();
    };
    // 뗀 손가락이 맡고 있던 레인만 놓는다 — 다른 손가락의 홀드는 계속 유지된다
    const onPointerUp = (e: PointerEvent) => {
      const lane = pointerLaneRef.current.get(e.pointerId);
      if (lane === undefined) return;
      pointerLaneRef.current.delete(e.pointerId);
      stopLaneHold(lane);
    };

    // Hidden tabs stop requestAnimationFrame while the AudioContext keeps
    // ticking, so freeze the audio clock too and re-sync the frame delta.
    // 웹 visibilitychange + Capacitor pause/resume (ui/appLifecycle) — 앱에서 백그라운드를 놓치면 오디오 시계가 어긋난다
    const onVisibility = (hidden: boolean) => {
      const session = sessionRef.current;
      if (!session) return;
      if (hidden) {
        session.backingAudio?.pause();
        if (session.ctx) void session.ctx.suspend();
        if (uiRef.current === "playing") setQuitAsk(true);
      } else {
        if (quitAskRef.current) return;   // 멈춤 카드에서 계속을 누를 때까지 그대로
        lastTsRef.current = 0;
        if (session.ctx) void session.ctx.resume().then(() => session.backingAudio?.play()).catch(() => {});
        else void session.backingAudio?.play().catch(() => {});
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const lane = KEY_LANE[e.code];
      if (lane === undefined) return;
      stopLaneHold(lane);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    canvas.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    const offVisibility = subscribeAppVisibility(onVisibility);

    const watchFrames = frameMonitor();
    const loop = (ts: number) => {
      const ctx = canvas.getContext("2d");
      const session = sessionRef.current;
      if (ctx) {
        if (!lastTsRef.current) lastTsRef.current = ts;
        // 저사양 모드 — 연주 중 첫 몇 초가 느리면 캔버스 흐림 그림자를 끈다 (ui/perfMode)
        if (uiRef.current === "playing" && watchFrames(ts - lastTsRef.current)) setLowFx(true);
        applyLowFx(ctx);
        const dtSec = Math.min((ts - lastTsRef.current) / 1000, 0.05);
        lastTsRef.current = ts;

        if (session && uiRef.current === "playing" && !quitAskRef.current) {
          const event = updateBeatWorld(session, dtSec, true);
          // 롱노트를 끝까지 누른 채 꼬리를 지나면 자동 성공
          settleHoldIfPassed(session);
          drainRaidRewardsRef.current();
          const w = session.world;
          // 박자 카운터 (계획안 D) — 비트마다 적이 맥동한다. 스텝/4 = 1비트 (subdivision은 마디당 스텝)
          const beatNo = Math.floor(w.beatPosition / Math.max(1, w.subdivision / 4));
          if (beatNo !== beatNoRef.current) {
            beatNoRef.current = beatNo;
            setBeatTick(beatNo);
          }
          setScore(w.score);
          setCombo(w.combo);
          setHp(w.hp);
          setMaxHp(w.maxHp);
          setRemainSec(Math.ceil(Math.max(0, w.durationMs - w.elapsedMs) / 1000));
          setStageNo(w.stageIndex + 1);
          setLessonTitle(w.lessonTitle);
          setFeverMultiplier(w.scoreMultiplier);
          setFeverRemainSec(Math.ceil(w.feverMs / 1000));
          // 장 대장 약점 레인 — 8초 주기 앞 4초, 창마다 레인이 바뀐다
          const wl = weakLaneAt(w.elapsedMs, w.stageIndex, session.track.id);
          if (wl !== weakLaneRef.current) { weakLaneRef.current = wl; setWeakLane(wl); }
          const upgradeRound = Math.min(3, Math.floor((w.elapsedMs / Math.max(1, w.durationMs)) * 4));
          if (upgradeRound > upgradeRoundRef.current) {
            upgradeRoundRef.current = upgradeRound;
            const kind = (["kick", "allies", "drop"] as const)[upgradeRound - 1];
            if (kind) raidBuffRef.current = { ...raidBuffRef.current, [kind]: raidBuffRef.current[kind] + 1 };
          }
          if (event.type === "hit") {
            haptic("hit");
          }
          if (event.type === "dead") {
            haptic("hit");
            setLastScore(w.score);
            commitRecord(session, false);
            syncUi("gameover");
          }
          if (event.type === "clear" && !pendingClearRef.current) {
            pendingClearRef.current = true;
            commitRecord(session, true);
            beatEnemyHpRef.current = 0;
            setBeatEnemyHp(0);
            const track = session.track;
            const slot = activeSlotRef.current;
            const baseClearGold = Math.round(
              computeClearReward(
                track.reward + (session.isSpar ? 20 : 0),
                w.hp,
                w.maxHp,
                w.elapsedMs,
                w.durationMs,
              ) * trackRewardMult(track) + Math.min(60, w.maxCombo * 2) + dropCountRef.current * 12,
            );
            const stageBonus = beatStageBonusGold(charProgRef.current?.titanBestStage ?? 1, track.difficulty);
            const reward = Math.max(1, Math.round((baseClearGold + stageBonus) * beatModsRef.current.coinMul));
            setCoinGain(reward);
            setLastScore(w.score);
            const perfectRatio = beatRunAccuracy(w);
            void (async () => {
              const nextCoins = await saveCoins(userHash, coinsRef.current + reward);
              coinsRef.current = nextCoins;
              onCoinsRef.current(nextCoins);
              const unlockTo = Math.min(stageCount() - 1, w.stageIndex + 1);
              setUnlocked((prev) => Math.max(prev, unlockTo));
              await saveBeatUnlock(userHash, unlockTo);
              if (rpgRef.current) {
                const grown = applyLessonClear(rpgRef.current, track, {
                  perfectRatio,
                  isSpar: session.isSpar || slot?.kind === "spar",
                  difficulty: track.difficulty,
                });
                rpgRef.current = grown;
                setRpg(grown);
                await saveBeatRpg(userHash, grown);
                // 오늘의 첫 수련 클리어 2배 (LIVEOPS §2.4)
                const beatToday = new Date().toLocaleDateString("sv-SE");
                const progressNow = await updateCharacterProgress(userHash, (c) => c);
                const beatFirst = progressNow.firstClearDates.beat !== beatToday;
                if (beatFirst) {
                  await updateCharacterProgress(userHash, (current) => ({
                    ...current,
                    firstClearDates: { ...current.firstClearDates, beat: beatToday },
                  }));
                }
                // 난도별 첫 클리어 아이템 (2026-10-28, beat/tickets.ts BEAT_FIRST_CLEAR) — 곡 × 난도마다 처음 한 번
                {
                  let got: BeatClearReward | null = null;
                  const diff = track.difficulty;
                  const after = await updateCharacterProgress(userHash, (current) => { const r = claimBeatFirstClear(current, track.id, diff); got = r.reward; return r.next; });
                  setCharProg(after);
                  setFirstReward(got ? { diff: BEAT_DIFF_LABEL[diff], reward: got } : null);
                }
                const rewardId = `beat:${track.id}:${Date.now()}`;
                await grantCharacterReward(userHash, rewardId, {
                  exp: PROGRESSION_BALANCE.beat.clearExp * (beatFirst ? 2 : 1),
                  sharedCoins: reward * (beatFirst ? 2 : 1),
                  lastContent: "beat",
                });
                const fragmentGain = Math.max(5, Math.round(8 * trackRewardMult(track) + perfectRatio * 14 + (w.maxCombo >= 20 ? 5 : 0) + Math.min(15, dropCountRef.current * 3)));
                const chapterShoulder = shoulderForTrack(w.stageIndex);
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
                    // 비트 sp 는 "지금까지 번 총량" · skillPoints 는 "쓰고 남은 잔액" — max 로 합치면 사냥터에서 쓴 SP 가 클리어마다 되살아났다(2026-11-11).
                    // 레거시 이전(progression/storage)과 같은 규칙: 아직 안 더한 증가분만 더하고 더한 양을 적는다
                    skillPoints: current.skillPoints + Math.max(0, grown.sp - current.beatSpMigrated),
                    beatSpMigrated: Math.max(current.beatSpMigrated, grown.sp),
                    shoulderShards: current.shoulderShards + (firstBossClear && !alreadyOwned ? 0 : fragmentGain),
                    enhancementMaterials: current.enhancementMaterials + materialGainRef.current,
                    ownedShoulders: craftedNow ? [...current.ownedShoulders, chapterShoulder] : current.ownedShoulders,
                    claimedRewards: firstBossClear ? [...current.claimedRewards, clearKey] : current.claimedRewards,
                    lastContent: "beat",
                  };
                });
                const shoulderName = SHOULDER_BLUEPRINTS.find((item) => item.id === chapterShoulder)?.name;
                setShoulderReward(craftedNow ? `${shoulderName} 최초 클리어 확정 획득!` : isChapterBoss && updated.ownedShoulders.includes(chapterShoulder) ? `${shoulderName} 보유 · 견갑 조각 +${fragmentGain}` : `공명 견갑 조각 +${fragmentGain} · 보유 ${updated.shoulderShards}`);
                const primarySkill = PATTERN_SKILLS[track.patternId][0] ?? "kick";
                const slotId = SLOT_BY_BEAT_SKILL[primarySkill];
                const masteryLv = grown.skills[primarySkill];
                const slotLv = slotLevelFromMastery(masteryLv);
                const toNextSlot = masteryToNextSlotLevel(masteryLv);
                setRpgGain(
                  `${SKILL_LABEL[primarySkill]} 숙련 Lv.${masteryLv} → 사냥터 [${SLOT_LABEL[slotId] ?? slotId}] 슬롯 Lv.${slotLv}${toNextSlot !== null ? ` (다음 숙련 +${toNextSlot})` : " (MAX)"} · 장착하면 방치 효율 +${(IDLE.ratePerSlotLevel * 100).toFixed(1)}%p/Lv · SP +${session.isSpar ? 3 : 2} (남은 ${updated.skillPoints})`,
                );
              }
            })();
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
      window.removeEventListener("keyup", onKeyUp);
      canvas.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      stopLaneHold();
      pointerLaneRef.current.clear();
      offVisibility();
      if (sessionRef.current) {
        disposeBeatSession(sessionRef.current);
        sessionRef.current = null;
      }
    };
  // onCoins 는 App 이 렌더마다 새로 만드는 함수다 — 의존성에 두면 App 이 한 번 다시 그려질 때(토스트 등) 이 effect 가 정리되며
  // 연주 중인 곡 세션을 버렸다(화면은 연주 중인데 노트가 사라짐, 2026-10-06 에뮬레이터 실기). ref 로 읽는다. shoulderBlueprint 는 쓰지 않는 의존성이었다
  }, [playRaidLane, startLaneHold, stopLaneHold, syncUi, userHash]);

  /** 실패 완화 (RETENTION G): 같은 곡 즉시 재도전은 곡당 하루 1회 스태미나 무료 */
  const freeRetryKey = (trackId: string) => `dodgebullets:beat:freeRetry:${new Date().toLocaleDateString("sv-SE")}:${trackId}`;
  const freeRetryAvailable = (trackId: string) => { try { return !localStorage.getItem(freeRetryKey(trackId)); } catch { return false; } };

  const startSlot = async (slot: PracticeSlot, opts?: { freeRetry?: boolean }) => {
    // 고른 곡 · 오디오를 누른 순간에 먼저 만든다(2026-10-28) — 아래 시도권 · 스태미나 저장(await) 뒤에 만들면 iOS 가 곡을 막았다
    const primed = (() => {
      if (!soundEnabled || !slot.track) return null;
      let audio: HTMLAudioElement | null = null;
      let ctx: AudioContext | null = null;
      try {
        audio = new Audio(assetUrl(`audio/${slot.track.audioFile}`));
        audio.preload = "auto";
        audio.setAttribute("playsinline", "true");
        audio.volume = 0;
        // 깨우기만 하고 멈춘다 — 단, 첫 play() 는 불러오기가 끝나야 풀려서 연주가 이미 이 오디오로 시작한 뒤에 올 수 있다.
        // 그때 멈추면 고른 곡이 안 나왔다(2026-10-29 WebKit 아이폰 검사: 곡 · 파일은 맞는데 paused). 연주가 가져간(claimed) 오디오는 두고 간다
        void audio.play().then(() => { if (audio && audio.dataset.claimed !== "1") audio.pause(); }).catch(() => {});
      } catch { audio = null; }
      try {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        ctx = AC ? new AC() : null;
        if (ctx && ctx.state === "suspended") void ctx.resume().catch(() => {});
      } catch { ctx = null; }
      return { audio, ctx };
    })();
    const dropPrimed = () => { try { primed?.audio?.pause(); } catch { /* */ } void primed?.ctx?.close().catch(() => {}); };
    runStartedAtRef.current = Date.now();
    setResultRecord(null);
    trackEvent("beat_expedition_start", { track: slot.track.id, difficulty: variantOf(slot.track), stage: slot.stageIndex + 1 });
    if (!slot.track || !rpgRef.current) { dropPrimed(); return; }
    const useFree = !!opts?.freeRetry && freeRetryAvailable(slot.track.id);
    // 시도권 (2026-10-28) — 한 판에 1장(무료분 먼저). 같은 곡 즉시 재도전(하루 1회)은 시도권 없이
    if (!useFree) {
      let ok = false;
      const after = await updateCharacterProgress(userHash, (current) => { const n = spendBeatTicket(current); ok = !!n; return n ?? current; });
      setCharProg(after);
      if (!ok) { dropPrimed(); setHubMsg(`오늘 시도권을 다 썼어요 · 내일 ${BEAT_DAILY_TICKETS}장 다시 · 사냥터 상점 '특별'에서 살 수 있어요`); return; }
    }
    if (useFree) { try { localStorage.setItem(freeRetryKey(slot.track.id), "1"); } catch { /* 저장 불가 */ } }
    const spent = useFree ? rpgRef.current : spendStamina(rpgRef.current, slot.staminaCost);
    if (!spent) {
      dropPrimed();
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
    // 출격 강화 — 고른 카드(없으면 오늘 첫 장)가 이 곡에만 듣는다
    const perkId = beatPerkChoice[slot.track.id] ?? beatPerkOffer(slot.track.id, new Date().toLocaleDateString("sv-SE"), beatBossStage(slot.stageIndex))[0];
    beatModsRef.current = beatModsOf(perkId);
    weakLaneRef.current = null;
    setWeakLane(null);
    setBeatFloats([]);
    setShoulderBlueprint(shoulderForTrack(slot.stageIndex));

    const canvas = canvasRef.current;
    const width = appWidth();   // PC 웹이면 폰 폭 기둥 (ui/webFrame)
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
      // 난이도 변형: 재생 BPM 고정, 노트 밀도·판정·HP만 바뀐다
      { bpmMultiplier: 1, difficulty: variantOf(track) },
      primed ?? undefined,
    );
    applyBeatInsets(session.world, insets);
    const bm = beatModsRef.current;
    if (bm.extraHp > 0) {
      session.world.hp += bm.extraHp;
      session.world.maxHp += bm.extraHp;
    }
    if (bm.healBonus > 0) session.world.healGauge += bm.healBonus;
    session.judgeWindowBonusSec = bm.judgeWindowBonusSec;
    session.scoreMul = bm.scoreMul;
    session.feverScoreMul = bm.feverScoreMul;
    session.comboShieldLeft = bm.comboShield;
    // 기기 싱크 보정 적용 — 판정 위치를 설정한 오프셋만큼 되돌린다
    const syncMs = loadBeatCalibrationMs();
    setCalibrationMs(syncMs);
    session.calibrationSec = (Number.isFinite(syncMs) ? syncMs : 0) / 1000;
    sessionRef.current = session;
    // 개발 훅 — e2e(scripts/verify-anim.mjs)가 채보 타이밍에 맞춰 키를 누르기 위해 세션을 노출한다. 배포 빌드에는 없다.
    if (import.meta.env.DEV) { const w = window as unknown as { __beatSession?: BeatSession; __beatLaneOf?: typeof laneOfSound }; w.__beatSession = session; w.__beatLaneOf = laneOfSound; }
    setLessonTitle(slot.title);
    setStageNo(slot.stageIndex + 1);
    setBeatAreaStage(slot.stageIndex + 1);   // 무대 = 이 곡의 사냥터 지역
    setScore(0);
    setCombo(0);
    setHp(session.world.hp);
    setMaxHp(session.world.maxHp);
    setRemainSec(Math.ceil(session.world.durationMs / 1000));
    setCoinGain(0);
    setRpgGain("");
    setShoulderReward("");
    setLastRunStats(null);
    setWaveCount(0);
    waveCountRef.current = 0;
    const enemyMax = 110 + slot.stageIndex * 28;
    beatEnemyMaxHpRef.current = enemyMax;
    beatEnemyHpRef.current = enemyMax;
    setBeatEnemyHp(enemyMax);
    setBeatEnemyMaxHp(enemyMax);
    setPartyAction("idle");
    setEnemyAction("idle");
    setMaterialGain(0);
    materialGainRef.current = 0;
    setDropCharge(0);
    dropChargeRef.current = 0;
    dropCountRef.current = 0;
    setInstrumentLayers([0, 0, 0, 0]);
    setDropFlash(0);
    setFeverMultiplier(1);
    setFeverRemainSec(0);
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
  const pickedId = pickedTrack ?? (slots.find((x) => x.stageIndex === Math.min(unlocked, totalStages - 1)) ?? slots[0])?.track.id;
  return (
    <div className="beat-layer">
      <canvas ref={canvasRef} className={`game-canvas ${ui === "playing" ? "beat-battle-canvas" : ""}`} />
      {ui === "playing" && quitAsk && (
        <div className="beat-quit-modal" role="dialog" aria-modal="true" aria-label="연주 멈춤">
          <div className="beat-quit-card">
            <b>연주를 멈췄어요</b>
            <p>나가면 이번 곡 기록과 보상은 남지 않아요</p>
            <button type="button" className="cta" onClick={resumeFromQuit}>계속 연주하기</button>
            <button type="button" className="cta cta-ghost" onClick={() => quitRun("menu")}>곡 목록으로</button>
            <button type="button" className="cta cta-ghost" onClick={() => quitRun("hunt")}>사냥터로 돌아가기</button>
          </div>
        </div>
      )}

      {ui === "menu" && rpg && (
        <div className="game-overlay">
          <div className="overlay-content overlay-wide beat-menu-panel">
            <p className="brand beat-kicker">사냥터 수련장</p>
            <h1 className="title beat-title">비트 수련</h1>
            <p className="subtitle beat-sub-short">곡을 골라 방향 노트로 몬스터를 토벌 · 30초~3분</p>
            <WalletBar testGems={qaGemsEnabled()} items={[{ kind: "gold", amount: coins }, { kind: "gem", amount: gems }]} />
            {hubMsg && <p className="shop-toast">{hubMsg}</p>}
            {Object.keys(rpg.records).length === 0 && !guideDismissed && (
              <div className="beat-first-guide" role="note">
                <div>
                  <b>첫 수련 안내</b>
                  <p>노트가 아래 판정선에 닿을 때 4방향 패드를 누르세요. 클리어하면 숙련도와 SP가 올라 사냥터 스킬 슬롯이 열리고, 장착하면 방치 효율이 오릅니다.</p>
                </div>
                <button type="button" onClick={() => setGuideDismissed(true)} aria-label="안내 닫기">확인</button>
              </div>
            )}
            {/* 시도권 (2026-10-28) — 오늘 무료 n/5 + 산 시도권 */}
            {charProg && (() => { const t = beatTicketsLeft(charProg); return (
              <div className="beat-ticket-bar" aria-label={`시도권 ${t.total}장`}>
                <b>오늘 시도권</b>
                <span className="beat-ticket-dots">{Array.from({ length: BEAT_DAILY_TICKETS }, (_, i) => <i key={i} className={i < t.free ? "on" : ""} />)}</span>
                <small>{t.free}/{BEAT_DAILY_TICKETS}{t.bought > 0 ? ` · 산 시도권 ${t.bought}` : ""} · 매일 다시 · 상점 '특별'에서 구매</small>
              </div>
            ); })()}
            {/* 고른 곡 카드 하나 (2026-11-09) — 칩 격자 위. 칩을 누르면 이 카드가 그 곡으로 바뀌고 화면에 들어온다 */}
            <div className="schedule-list is-picked" ref={pickedCardRef}>
              {slots.filter((slot) => slot.track.id === pickedId).map((slot) => {
                const done = rpg.clearedToday.includes(slot.track.id);
                const recommended = slot.stageIndex === Math.min(unlocked, totalStages - 1);
                // 곡 카드는 button 이 아니라 div(role=button) — 안에 난도 · 출격 강화 칩 button 이 있어 button 안 button(HTML 규칙 위반,
                // React 경고)이었다(2026-11-06 탐색 에이전트가 찾음). 카드 아무 데나 누르면 시작 · Enter/Space 도 그대로
                return (
                  <div
                    key={slot.track.id}
                    role="button"
                    tabIndex={0}
                    data-track={slot.track.id}
                    className={`schedule-card ${recommended ? "today" : ""} ${
                      done ? "done" : ""
                    }`}
                    onClick={() => void startSlot(slot)}
                    onKeyDown={(e) => {
                      if (e.target !== e.currentTarget || (e.key !== "Enter" && e.key !== " ")) return;
                      e.preventDefault();
                      void startSlot(slot);
                    }}
                  >
                    {/* 곡 커버 — 곡명 모티프로 생성한 이미지 (scripts/make-beat-covers.mjs) */}
                    <span className={`beat-track-cover cover-${slot.stageIndex % 6} has-image`} aria-hidden="true"><img className="schedule-cover" src={assetUrl(`beat/covers/${slot.track.id}.png`)} alt="" /></span>
                    {/* 카드 단순화 (2026-11-09, 사용자: "ui 너무 난해함 간단 명료 정리") — 8줄(Lv · 난도 3 · 강화 3 · 곡명 · 설명 · 보상 · 난도별 보상 3 · 기록) → 5줄:
                        곡명 · 정보 한 줄 · 난도 선택판 · 고른 난도의 보상 한 줄 · 출격 강화(눌러서 바꿈) + 시작. 곡 설명은 title 로 */}
                    <span className="schedule-copy" title={slot.track.desc}>
                      <span className="schedule-head">
                        <span className="schedule-title">{slot.title}</span>
                        {done ? <em className="schedule-tag is-done">오늘 완료</em> : recommended ? <em className="schedule-tag">추천</em> : null}
                      </span>
                      {(() => { const b = bestRecord(rpg, slot.track.id, variantOf(slot.track)); return <span className="schedule-day">Lv.{slot.track.level} · {slot.track.bpm} BPM{b ? ` · 최고 ${b.score.toLocaleString()}점` : ""}</span>; })()}
                      <span className="schedule-variants" role="group" aria-label="난도" onClick={(e) => e.stopPropagation()}>
                        {(["easy", "medium", "hard"] as const).map((d) => {
                          const g = gradesFor(rpg, slot.track.id)[d];
                          const locked = d === "hard" && !hardUnlocked(rpg, slot.track);
                          const on = variantOf(slot.track) === d;
                          return (
                            <button key={d} type="button" className={`variant-chip ${on ? "on" : ""} ${locked ? "locked" : ""}`} disabled={locked} aria-pressed={on} title={locked ? "보통 A 이상이면 열립니다" : undefined}
                              onClick={(e) => { e.stopPropagation(); setVariants((v) => ({ ...v, [slot.track.id]: d })); }}>
                              {locked ? "🔒 " : ""}{BEAT_DIFF_LABEL[d]}{g ? <em className={`grade grade-${g}`}>{g}</em> : null}
                            </button>
                          );
                        })}
                      </span>
                      {(() => { const d = variantOf(slot.track); const got = !!charProg && beatFirstClaimed(charProg, slot.track.id, d); const stBonus = beatStageBonusGold(charProg?.titanBestStage ?? 1, d); const estGold = Math.round(slot.track.reward * trackRewardMult({ difficulty: d })) + stBonus; return (
                        <span className="schedule-foot">{got ? <>보상 <b>+{formatGold(estGold)} 골드</b>{stBonus > 0 ? <small> (사냥터 연동)</small> : null} · 견갑 조각</> : <>첫 클리어 <b>{beatRewardText(BEAT_FIRST_CLEAR[d])}</b> · +{formatGold(estGold)} 골드</>}</span>
                      ); })()}
                      <span className="schedule-actions">
                        {/* 출격 강화 1택 (2026-10-08) — 곡 · 날짜로 정해진 3장. 칩 셋 대신 하나를 보이고 누르면 다음 것으로 바뀐다 */}
                        <span className="schedule-perks" onClick={(e) => e.stopPropagation()}>
                          {(() => { const offer = beatPerkOffer(slot.track.id, new Date().toLocaleDateString("sv-SE"), beatBossStage(slot.stageIndex)); const chosen = beatPerkChoice[slot.track.id] ?? offer[0]; const def = BEAT_PERK_BY_ID[chosen]; return (
                            <button type="button" className={`perk-chip on icon-${def.icon}`} title={`${def.desc} — 누르면 다른 강화(${offer.length}개 중)`} aria-label={`출격 강화 ${def.label} · 바꾸기`}
                              onClick={(e) => { e.stopPropagation(); setBeatPerkChoice((v) => ({ ...v, [slot.track.id]: offer[(offer.indexOf(chosen) + 1) % offer.length] })); }}>{def.label}<i aria-hidden="true">↻</i></button>
                          ); })()}
                        </span>
                        <button type="button" className="schedule-play" onClick={(e) => { e.stopPropagation(); void startSlot(slot); }}>▶ 시작</button>
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
            {/* 곡 전부 한눈에 (2026-10-28, 사용자: "시작 UI 에 곡 종류가 모두 나오고") — 난도 칸은 첫 클리어(✓). 같은 날 "선택한 음악으로 게임진행" — 누르면 그 곡으로 바로 시작 → 2026-11-09 누르면 위 카드에서 고르고 ▶ 시작 */}
            <div className="beat-song-grid" aria-label={`곡 ${slots.length}개`}>
              {slots.map((slot) => (
                <button key={slot.track.id} type="button" className={`beat-song-chip ${slot.track.id === pickedId ? "on" : ""}`} data-track={slot.track.id} aria-pressed={slot.track.id === pickedId} onClick={() => { setPickedTrack(slot.track.id); requestAnimationFrame(() => pickedCardRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" })); }} title={`${slot.title} — 위 카드에서 난도 · 출격 강화를 고르고 시작`}>
                  <img src={assetUrl(`beat/covers/${slot.track.id}.png`)} alt="" aria-hidden="true" />
                  <b>{slot.title}</b>
                  <small>Lv.{slot.track.level} · {slot.track.bpm}BPM</small>
                  <span className="beat-song-clears">{(["easy", "medium", "hard"] as const).map((d) => <em key={d} className={charProg && beatFirstClaimed(charProg, slot.track.id, d) ? "done" : ""} title={`${BEAT_DIFF_LABEL[d]} 첫 클리어`}>{charProg && beatFirstClaimed(charProg, slot.track.id, d) ? "✓" : ""}</em>)}</span>
                </button>
              ))}
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
                이어서 수련하기
              </button>
              <button type="button" className="cta cta-ghost" onClick={onBack}>
                사냥터로 돌아가기
              </button>
            </div>
            {/* 곡 목록을 위로 (2026-10-27, 사용자: "비트 디펜스 커스텀 삭제 · 곡 목록 잘 보이게") — 커스텀 상점은 뺐고(사냥터 상점 '외형'에 같은 상품) 랭킹 · 노트 안내는 아래로 */}
            {/* 주간 랭킹 (계획안 §7 · P1) — 고정 목표 점수 라이벌 + 숙련 메달 */}
            {(() => {
              const rk = weeklyRanking(rpg, userHash);
              const medals = beatMasteryMedals(rpg);
              return (
                <div className="beat-rank-panel">
                  <b>수련 목표 점수 <small>S등급 {medals.s} · A등급 {medals.a} · 등급 받은 곡 {medals.total}</small></b>
                  {rk.rows.slice(0, 5).map((row) => (
                    <span key={row.rank} className={`rank-${row.rank} ${row.me ? "me" : ""}`}>
                      <em>{row.rank}위</em>
                      <i className={`rank-avatar ${row.me ? "is-me" : ""}`} style={{ ...(row.me ? { backgroundImage: `url(${heroPortrait()})`, backgroundSize: "cover", backgroundPosition: "center" } : { backgroundImage: `url(${shadowPortrait(row.name)})` }) }} aria-hidden="true" />
                      {row.name}<strong>{row.score.toLocaleString()}</strong>
                    </span>
                  ))}
                  {rk.myRank > 5 && <span className="me"><em>{rk.myRank}위</em><i className="rank-avatar is-me" style={{ backgroundImage: `url(${heroPortrait()})`, backgroundSize: "cover", backgroundPosition: "center" }} aria-hidden="true" />나<strong>{rk.myScore.toLocaleString()}</strong></span>}
                  <small className="beat-rank-next">{rk.myScore === 0 ? "한 곡을 수련하면 내 최고 기록이 오릅니다 · 이 기기 기록 기준" : rk.nextTarget ? `다음 목표까지 ${(rk.nextTarget - rk.myScore).toLocaleString()}점 · 이 기기 기록 기준` : "모든 목표를 넘었어요 · 라이벌은 매주 바뀝니다"}</small>
                </div>
              );
            })()}
            {/* 노트 종류 안내 — 손 게임 기준 (펌프의 발판 노트를 4레인 손 입력으로) */}
            <p className="beat-note-legend"><b>탭</b> 한 번 · <b>홀드</b> 꼬리까지 누르기 · <b>점프</b> 두 레인 동시 · <b>홀드 점프</b> 두 레인 동시 홀드 · <b>롤</b> 두 레인 교대 연타</p>
            {/* 박자 보정 (2026-11-11) — 기기마다 소리가 늦게 들리는 만큼. 설정 성격이라 메뉴 맨 아래에 */}
            <div className="beat-sync-bar" role="group" aria-label="박자 보정">
              <span>박자 보정 <b>{calibrationMs > 0 ? `+${calibrationMs}` : calibrationMs}ms</b> <small>{calibrationMs === 0 ? "늦으면 + · 이르면 −" : calibrationMs > 0 ? "늦게 들리는 기기" : "일찍 들리는 기기"}</small></span>
              <span className="beat-sync-btns">
                <button type="button" onClick={() => adjustCalibration(calibrationMs - 10)} aria-label="10ms 당기기">−10</button>
                <button type="button" onClick={() => adjustCalibration(0)}>0</button>
                <button type="button" onClick={() => adjustCalibration(calibrationMs + 10)} aria-label="10ms 늦추기">+10</button>
              </span>
            </div>
          </div>
        </div>
      )}

      {ui === "playing" && (
        <>
          <div key={dropFlash} className={`beat-command-party action-${partyAction} enemy-${enemyAction} ${dropFlash > 0 ? "drop-burst" : ""} ${feverMultiplier > 1 ? `fever-x${feverMultiplier}` : ""}`} aria-live="polite">
            <div className="beat-enemy-hp"><i style={{width:`${beatEnemyHp / beatEnemyMaxHp * 100}%`}}/><strong>{waveCount > 0 ? `토벌 ×${waveCount} · ` : ""}{beatEnemyHp / beatEnemyMaxHp > .66 ? "접근" : beatEnemyHp / beatEnemyMaxHp > .3 ? "교전" : "DROP 결전"} · 몬스터 {beatEnemyHp}/{beatEnemyMaxHp}</strong></div>
            {/* 피해 숫자 (2026-10-08) — 노트마다 몬스터 위로. 약점 레인은 크게 */}
            <span className="beat-floats" aria-hidden="true">{beatFloats.map((fl) => <em key={fl.id} className={`beat-float lane-${fl.lane} ${fl.weak ? "weak" : ""}`}>{fl.weak ? "약점 " : ""}-{fl.text}</em>)}</span>
            <div className="beat-command-track"><span className={`beat-party-character facing-${partyAction === "attack" || partyAction === "skill" ? "attack" : "idle"}`}><EquippedCharacter worn={charProg?.equippedGear} mode={partyAction === "attack" || partyAction === "skill" ? "attack" : "idle"} frame={combo % heroFrames(partyAction === "attack" || partyAction === "skill" ? "attack" : "idle")} shoulder={shoulderBlueprint} /></span><span className="beat-party-allies"><AllyArt id="mia" attacking pulse={partyAction === "attack" || partyAction === "skill" || feverMultiplier > 1 ? score + dropFlash : 0}/><AllyArt id="leon" attacking pulse={partyAction === "attack" || partyAction === "skill" || feverMultiplier > 1 ? score + dropFlash + 1 : 0}/></span>{(() => { const mKey = beatMonsterAt(stageNo, waveCount); const act = enemyAction === "hit" || enemyAction === "stagger" ? "hit" : enemyAction === "skill" ? "attack" : "idle"; return <span key={beatTick} className="beat-monster-wrap beat-pulse" data-beat={beatTick}>{hasMonsterAnim(mKey) ? <i key={act} className={`beat-monster-sheet ${monsterFacesRight(mKey) ? "face-flip" : ""}`} style={monsterAnimStyle(mKey, act)} role="img" aria-label="레이드 몬스터" data-art={mKey} data-act={act} /> : <img className="beat-monster-thumb" src={assetUrl(bestiaryThumb(mKey))} alt="레이드 몬스터" data-art={mKey} />}</span>; })()}{materialGain > 0 && <b className="beat-material-drop">강화석 +{materialGain}</b>}</div>
            {/* FEVER 가 바(패널 안)와 버튼(화면 오른쪽) 두 곳에서 같은 값을 보여 줬다 — 버튼 하나로 합치고
                충전량은 버튼 배경이 채운다. 자리도 패널 안으로 올렸다: 판정선과 패드 사이,
                손이 오가는 띠에 떠 있었다 (2026-09-21 실측 캡처) */}
            <button
              type="button"
              className={`beat-fever-trigger ${dropCharge >= 35 && feverMultiplier === 1 ? "ready" : ""}`}
              disabled={dropCharge < 35 || feverMultiplier > 1}
              onClick={activateFever}
              style={{ "--fever-fill": `${feverMultiplier > 1 ? Math.min(100, feverRemainSec / (feverMultiplier === 5 ? 6 : feverMultiplier === 3 ? 7 : 8) * 100) : dropCharge}%` } as CSSProperties}
            >
              <b>{feverMultiplier > 1 ? `피버 ×${feverMultiplier}` : dropCharge >= 100 ? "피버 ×5" : dropCharge >= 65 ? "피버 ×3" : dropCharge >= 35 ? "피버 ×2" : "피버"}</b>
              <small>{feverMultiplier > 1 ? `${feverRemainSec}s` : dropCharge >= 35 ? `${dropCharge}% · 누르세요` : `${dropCharge}% · 정확한 노트로 충전`}</small>
            </button>
            {/* 악기 이름만 — 역할(공격·방어·회피·스킬)은 아래 패드가 말한다. 전에는 양쪽이 같은 말을 했다 */}
            <div className="beat-layer-mixer">{["KICK","SNARE","HAT","BASS"].map((label,index)=><span key={label} className={instrumentLayers[index] > 0 ? "on" : ""}><b>{label}</b><i>{"●".repeat(instrumentLayers[index])}{"○".repeat(4-instrumentLayers[index])}</i></span>)}</div>
          </div>
          <div className="hud beat-hud" style={dockStyle}>
            <button type="button" className="beat-quit-btn" onClick={pauseForQuit} aria-label="연주 멈추고 돌아가기">❚❚</button>
            <div className="hud-left">
              {/* 체력은 단계 알약에 (2026-11-11) — 두 번째 알약(곡 이름 · 강화 · 체력)은 파티 판에 반쯤 가려 체력이 안 보였다. 곡 · 강화는 메뉴 카드가 말한다 */}
              <span className="hud-score beat-track-name">
                {stageNo}/{totalStages} · {remainSec}s · <b className="beat-hud-hp" aria-label={`체력 ${hp}/${maxHp}`}>♥{hp}/{maxHp}</b>
              </span>
              {/* '공명 제련 · <견갑>' 줄은 파티 패널에 가려 반쯤 잘렸다. 시작할 때 정해지는 값이고
                  받는 양은 클리어 화면(shoulderReward)이 말하므로 플레이 중에는 뺀다 (2026-09-21) */}
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
                className={`action-btn beat-pad direction-${direction.id} ${weakLane === direction.lane ? "weak" : ""}`}
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!sessionRef.current) return;
                  // 떼는 것은 window 의 pointerup/pointercancel 이 pointerId 로 처리한다 (패드 밖에서 떼도 놓이게)
                  pointerLaneRef.current.set(e.pointerId, direction.lane);
                  startLaneHold(direction.lane);
                }}
              >
                <span>{direction.symbol}</span>
                {weakLane === direction.lane && <i className="pad-weak" aria-hidden="true">약점</i>}
                {/* 악기 이름은 위 믹서가 말한다 — 패드는 역할만. 키보드 키는 마우스 기기에서만 보인다 */}
                <small>{["공격", "방어", "회피", "스킬"][direction.lane]}<em className="pad-key">{direction.key}</em></small>
              </button>
            ))}
          </div>
        </>
      )}

      {ui === "clear" && (
        <div className="game-overlay">
          <div className="overlay-content">
            <p className="brand">비트 수련 완료</p>
            <h1 className="title">{lessonTitle}</h1>
            <p className="score-line">
              +{formatGold(coinGain)} 골드
              {lastRunStats && lastRunStats.stageBonusGold > 0 ? ` (사냥터 연동 +${formatGold(lastRunStats.stageBonusGold)})` : ""}
              {adDouble === "done" ? " · 광고 ×2 적용" : ""}
            </p>
            {lastRunStats && (
              <div className="beat-judge-summary" aria-label="판정 요약">
                <span className={`beat-grade-pill grade-${lastRunStats.grade}`}>{lastRunStats.grade}</span>
                <span className="beat-acc-text">정확도 <b>{lastRunStats.accuracyPct.toFixed(1)}%</b>{lastRunStats.wavesCleared > 0 ? ` · 토벌 ${lastRunStats.wavesCleared}` : ""}</span>
                <span className="beat-judge-counts">
                  <em>PERFECT {lastRunStats.perfect}</em>
                  <em>GREAT {lastRunStats.great}</em>
                  <em>GOOD {lastRunStats.good}</em>
                  <em className="is-miss">MISS {lastRunStats.miss}</em>
                </span>
              </div>
            )}
            {firstReward && <p className="beat-first-reward">{firstReward.diff} 첫 클리어 보상 — {beatRewardText(firstReward.reward)}</p>}
            {(adDouble === "ad" || adDouble === "free" || adDouble === "busy") && coinGain > 0 && (
              <button type="button" className="cta idle-claim-ad" disabled={adDouble === "busy"} onClick={() => void doubleBeatReward()}>
                {adDouble === "busy" ? "광고 재생 중…" : adDouble === "free" ? "광고 제거 보유 · 골드 ×2" : "광고 보고 골드 ×2"}
                <small>+{formatGold(coinGain)} 골드 추가 · 오늘 남은 횟수 포함</small>
              </button>
            )}
            {resultRecord && (
              <p className={`beat-record-line ${resultRecord.newScore || resultRecord.newCombo ? "is-new" : ""}`}>
                {resultRecord.newScore ? "신기록! " : ""}점수 {lastScore.toLocaleString()} / 최고 {resultRecord.bestScore.toLocaleString()} · 콤보 {resultRecord.combo}{resultRecord.newCombo ? " (최고 갱신)" : ` / 최고 ${resultRecord.bestCombo}`}
              </p>
            )}
            {rpgGain && <p className="beat-hunt-bridge">{rpgGain}</p>}
            {shoulderReward && <p className="shoulder-reward">{shoulderReward}</p>}
            <p className="subtitle">보유 {formatGold(coins)} 골드</p>
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
                다음 곡 수련하기
              </button>
            )}
            <button type="button" className="cta cta-ghost" onClick={() => syncUi("menu")}>
              비트 수련 목록
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
            <p className="brand">수련 중단</p>
            <h1 className="title">비트 아웃</h1>
            <p className="score-line">점수 {lastScore.toLocaleString()}</p>
            {lastRunStats && (
              <div className="beat-judge-summary" aria-label="판정 요약">
                <span className={`beat-grade-pill grade-${lastRunStats.grade}`}>{lastRunStats.grade}</span>
                <span className="beat-acc-text">정확도 <b>{lastRunStats.accuracyPct.toFixed(1)}%</b></span>
                <span className="beat-judge-counts">
                  <em>PERFECT {lastRunStats.perfect}</em>
                  <em>GREAT {lastRunStats.great}</em>
                  <em>GOOD {lastRunStats.good}</em>
                  <em className="is-miss">MISS {lastRunStats.miss}</em>
                </span>
              </div>
            )}
            {resultRecord && (
              <p className={`beat-record-line ${resultRecord.newScore ? "is-new" : ""}`}>
                {resultRecord.newScore ? "신기록! " : ""}최고 {resultRecord.bestScore.toLocaleString()}점 · 콤보 {resultRecord.combo}{resultRecord.newCombo ? " (최고 갱신)" : ` / 최고 ${resultRecord.bestCombo}`}
              </p>
            )}
            <p className="subtitle">{lessonTitle}</p>
            <button
              type="button"
              className="cta"
              onClick={() => {
                const slot = activeSlotRef.current ?? slots[stageNo - 1] ?? slots[0];
                void startSlot(slot, { freeRetry: true });
              }}
            >
              {activeSlotRef.current?.track && freeRetryAvailable(activeSlotRef.current.track.id) ? "무료 재도전 (시도권 0)" : "다시 도전"}
            </button>
            <button type="button" className="cta cta-ghost" onClick={() => syncUi("menu")}>
              비트 수련 목록
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
