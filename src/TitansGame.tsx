import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { SafeInsets } from "./game/toss";
import {
  ATTACK_CLIP_MS,
  IDLE_FRAME_MS,
  SPRITE_FRAME_COUNT,
  preloadTitanSheets,
} from "./titans/anim";
import {
  BOSS_TIME_SEC,
  HEROES,
  MOBS_PER_STAGE,
  SKILLS,
  bulkUpgradeQuote,
  defaultTitansSave,
  formatGold,
  heroDps,
  heroUpgradeCost,
  killGold,
  monsterHp,
  monsterKind,
  monsterLabel,
  playerIdleDps,
  huntingArea,
  stageClearBonus,
  equipmentTrainingCost,
  tapDamage,
  totalHeroDps,
  type TitanHeroId,
  type TitanMonsterKind,
  type TitanSkillId,
  type TitanSkillSlot,
  type TitansSave,
} from "./titans/model";
import { AllyArt, MonsterArt } from "./titans/SpriteArt";
import { ALLY_SKINS } from "./titans/skins";
import { GEM_PACK, TITLES, WEAPON_SKINS, goldPackAmount } from "./economy/gemCatalog";
import { loadTitansSave, saveTitansSave } from "./titans/storage";
import { PROGRESSION_BALANCE } from "./progression/balance";
import { grantCharacterReward, loadCharacterProgress, updateCharacterProgress } from "./progression/storage";
import { emptyCharacterProgress, type CharacterProgress, type ShoulderId } from "./progression/model";
import {
  BEAT_SKILL_BY_SLOT,
  IDLE,
  activeSlotLevelSum,
  computeIdleYield,
  idleBottleneck,
  idleCapHours,
  idleRate,
  masteryToNextSlotLevel,
  nextAreaName,
  slotLevels,
  stageCeilingFor,
  type IdleBottleneck,
  type IdleYield,
} from "./progression/idle";
import { SKILL_LABEL } from "./beat/rpg";
import { IdleReturnModal } from "./IdleReturnModal";
import { AreaGateModal } from "./AreaGateModal";
import { sfxGateBlocked, sfxSlotUnlock } from "./ui/sfx";
import {
  ALLY_IDS,
  ALLY_ELEMENT,
  ALLY_RARITY,
  ALLY_ROLE,
  EXPEDITION_HOURS,
  EXPEDITION_MAX,
  RARITY_COLOR,
  ELEMENT_LABEL,
  ROLE_LABEL,
  SHOP_ALLY_GEM_COST,
  STAR_CAP,
  effectiveStars,
  expeditionReward,
  partySlotCount,
  partySynergies,
  shardCostToNext,
  starMultiplier,
  randomOwnedAlly,
} from "./titans/allies";
import { PET_DEFS, activePetEffect, pendingHatches } from "./titans/pets";
import { assetUrl } from "./asset";
import { NOTIFY_ID, cancelLocalNotification, scheduleLocalNotification } from "./game/native";
import { emptyEventSave, loadEventSave, updateEventSave, type EventSave } from "./events/eventSave";
import { ROUTINE_REWARD_GEMS, routineItems, routineRewardAvailable, type RoutineItem } from "./progression/routine";
import { recommendNext, type RecommendAction, type WallInfo } from "./progression/recommend";
import {
  LOCK_HINT,
  UNLOCK_BANNER,
  contentUnlocked,
  onboardingTargetStep,
  type OnboardContent,
} from "./progression/onboarding";
import { EquippedCharacter } from "./ui/EquippedCharacter";
import { ContentIcon } from "./ui/ContentIcon";
import { CurrencyIcon } from "./ui/CurrencyIcon";
import { SkillIcon } from "./ui/SkillIcon";
import { ShoulderIcon } from "./ui/ShoulderIcon";
import { SHOULDER_DEFINITIONS } from "./equipment/shoulders";
import { SHARD_PACK_AMOUNT, SHARD_PACK_WEEKLY_LIMIT, STORE_PRODUCTS } from "./economy/productCatalog";
import { weekKey as currentWeekKey } from "./events/shadowArena";
import { SwordArt } from "./forge/swords";
import { tierAt } from "./forge/model";

type TitansGameProps = {
  insets: SafeInsets;
  userHash: string;
  forgedWeaponLevel?: number;
  onOpenContent: (content: "dodge" | "beat" | "forge" | "profile") => void;
  /** 이벤트 센터를 특정 탭으로 연다 (추천 배너·루틴 보드) */
  onOpenEvents?: (tab: "daily" | "rift" | "weekly" | "journal") => void;
};

type ShopTab = "sword" | "heroes" | "skills" | "premium";
type PremiumCategory = "currency" | "package" | "ally" | "title" | "weapon";

/** 피해 출처 — 숫자 색·아이콘을 분리해 "누가 때렸는지" 읽히게 한다 (첫 플레이 점검표 #2) */
type FloatSource = "tap" | "hero" | "ally" | "skill";

type FloatText = {
  id: number;
  x: number;
  y: number;
  text: string;
  crit: boolean;
  source: FloatSource;
  hue?: number;
};

type FxBurst = {
  id: number;
  kind: "slash" | "hit" | "ally" | "strike" | "crit" | "clone" | "warcry";
  x: number;
  y: number;
  hue?: number;
};

type BuffState = {
  critUntil: number;
  cloneUntil: number;
  warcryUntil: number;
};

type CooldownMap = Record<TitanSkillId, number>;
type BattlePhase = "combat" | "monster-death" | "boss-ready" | "stage-clear" | "stage-exit" | "stage-enter";

function emptyCds(): CooldownMap {
  return Object.fromEntries(SKILLS.map((skill) => [skill.id, 0])) as CooldownMap;
}

function shoulderTrainingMaterials(level: number): { expedition: number; beat: number } {
  if (level < 5) return { expedition: 0, beat: 0 };
  if (level < 15) return { expedition: 1 + Math.floor((level - 5) / 3), beat: 0 };
  return { expedition: 4 + Math.floor((level - 15) / 4), beat: 1 + Math.floor((level - 15) / 5) };
}

/** 스킬별 평균 DPS 보정(%) — 업타임(지속/쿨) × 효과의 근사치. 프리셋 미리보기용 */
const SKILL_PREVIEW_PCT: Partial<Record<TitanSkillId, number>> = {
  strike: 9,
  crit: 13,
  clone: 33,
  warcry: 45,
  steel: 6,
};

const SKILL_PRESETS: { id: string; name: string; desc: string; ids: TitanSkillId[] }[] = [
  { id: "burst", name: "공격형", desc: "일격·함성·치명 — 보스 순간 화력", ids: ["strike", "warcry", "crit", "steel"] },
  { id: "sustain", name: "지속형", desc: "분신·치명·강철 — 사냥 지속 화력", ids: ["clone", "crit", "steel", "strike"] },
  { id: "balance", name: "균형", desc: "학습한 스킬 전부 장착", ids: ["strike", "crit", "clone", "warcry", "steel"] },
];

export function TitansGame({ insets, userHash, forgedWeaponLevel = 0, onOpenContent, onOpenEvents }: TitansGameProps) {
  const [save, setSave] = useState<TitansSave>(() => defaultTitansSave());
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<ShopTab>("sword");
  const [premiumCategory, setPremiumCategory] = useState<PremiumCategory>("currency");
  const [wave, setWave] = useState(1);
  const [boss, setBoss] = useState(false);
  const [chesterson, setChesterson] = useState(false);
  const [hp, setHp] = useState(10);
  const [maxHp, setMaxHp] = useState(10);
  const [bossLeft, setBossLeft] = useState(BOSS_TIME_SEC);
  const [bossReady, setBossReady] = useState(false);
  const [monsterHit, setMonsterHit] = useState(0);
  const [impact, setImpact] = useState<"normal" | "critical" | null>(null);
  const [floats, setFloats] = useState<FloatText[]>([]);
  const [fx, setFx] = useState<FxBurst[]>([]);
  const [toast, setToast] = useState("");
  const [cds, setCds] = useState<CooldownMap>(() => emptyCds());
  const [buffs, setBuffs] = useState<BuffState>({
    critUntil: 0,
    cloneUntil: 0,
    warcryUntil: 0,
  });
  const [animMode, setAnimMode] = useState<"idle" | "attack">("idle");
  const [frameIdx, setFrameIdx] = useState(0);
  const [skillVisual, setSkillVisual] = useState<TitanSkillId | null>(null);
  const [allyPulse, setAllyPulse] = useState<Record<string, number>>({});
  const [allyHitPulse, setAllyHitPulse] = useState(0);
  const [equippedShoulder, setEquippedShoulder] = useState<ShoulderId | null>(null);
  const [skillPoints, setSkillPoints] = useState(0);
  const [redGems, setRedGems] = useState(0);
  const [claimingProduct, setClaimingProduct] = useState<string | null>(null);
  const [character, setCharacter] = useState<CharacterProgress>(() => emptyCharacterProgress());
  const skillTypeCapacity = Math.min(10, Math.max(1, Math.ceil(character.level / 10)));
  const [idleReport, setIdleReport] = useState<{
    result: IdleYield;
    stage: number;
    bottleneck: IdleBottleneck;
  } | null>(null);
  const [gateNotice, setGateNotice] = useState(false);
  const [shardPackTarget, setShardPackTarget] = useState<TitanHeroId>("mia");
  const [battlePhase, setBattlePhase] = useState<BattlePhase>("combat");
  /** QoL — 일괄 레벨업 수량 (0 = MAX) */
  const [buyAmount, setBuyAmount] = useState<1 | 10 | 0>(1);
  /** 온보딩(§8) 개방 연출 — 방금 열린 단계 번호 */
  const [unlockBanner, setUnlockBanner] = useState<number | null>(null);
  /** 동료 탭 역할 필터 (점검표 #4) */
  const [allyFilter, setAllyFilter] = useState<"all" | "melee" | "ranged" | "tank" | "healer">("all");
  /** 이벤트 저장(균열·토벌령·주간) — 루틴 보드·추천 엔진이 읽는다 */
  const [events, setEvents] = useState<EventSave>(() => emptyEventSave());
  /** 벽 미터 — 마지막 보스 실패의 정량 정보 (RETENTION D) */
  const [wallInfo, setWallInfo] = useState<WallInfo | null>(null);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const onboardHintShownRef = useRef(false);
  const [monsterAction, setMonsterAction] = useState<"idle" | "prepare" | "attack">("idle");
  const [formationEngaged, setFormationEngaged] = useState(false);
  const [formationReady, setFormationReady] = useState(false);
  const [encounterMotion, setEncounterMotion] = useState({ heroLeft: 32, monsterRight: 38, durationMs: 1250 });

  const saveRef = useRef(save);
  const characterRef = useRef(character);
  const waveRef = useRef(wave);
  const bossRef = useRef(boss);
  const chestRef = useRef(chesterson);
  const hpRef = useRef(hp);
  const bossLeftRef = useRef(bossLeft);
  const buffsRef = useRef(buffs);
  const cdsRef = useRef(cds);
  const floatId = useRef(0);
  const fxId = useRef(0);
  const fieldRef = useRef<HTMLDivElement>(null);
  const toastTimer = useRef<number | null>(null);
  const allyAttackAcc = useRef<Record<TitanHeroId, number>>(Object.fromEntries(ALLY_IDS.map((id, index) => [id, (index * .17) % 1])) as Record<TitanHeroId, number>);
  const autoAttackAcc = useRef(0);
  const attackUntil = useRef(0);
  const animResetRef = useRef(false);
  const animModeRef = useRef<"idle" | "attack">("idle");
  const battlePhaseRef = useRef<BattlePhase>("combat");
  const battleTimers = useRef<number[]>([]);
  const pendingStageRef = useRef<number | null>(null);
  const formationReadyRef = useRef(false);
  const bossFailStreakRef = useRef(0);
  const killCountsRef = useRef<Partial<Record<TitanMonsterKind, number>>>({});
  /** castSkill은 렌더마다 재생성 — 전투 인터벌(의존성 없음)에서 최신본을 쓰기 위한 ref */
  const castSkillRef = useRef<(id: TitanSkillId) => void>(() => {});
  /**
   * 저사양 판정 (점검표 #12) — 코어 4개 이하 또는 메모리 3GB 이하면 이펙트·숫자
   * 동시 개수를 줄이고 대기 호흡 애니메이션을 끈다. 동료는 이미 출전 인원만 렌더한다.
   */
  const lowFxRef = useRef<boolean>(
    (navigator.hardwareConcurrency ?? 8) <= 4 ||
      ((navigator as unknown as { deviceMemory?: number }).deviceMemory ?? 8) <= 3,
  );

  useEffect(() => {
    saveRef.current = save;
  }, [save]);
  useEffect(() => {
    characterRef.current = character;
  }, [character]);
  useEffect(() => {
    waveRef.current = wave;
  }, [wave]);
  useEffect(() => {
    bossRef.current = boss;
  }, [boss]);
  useEffect(() => {
    chestRef.current = chesterson;
  }, [chesterson]);
  useEffect(() => {
    hpRef.current = hp;
  }, [hp]);
  useEffect(() => {
    bossLeftRef.current = bossLeft;
  }, [bossLeft]);
  useEffect(() => {
    buffsRef.current = buffs;
  }, [buffs]);
  useEffect(() => {
    cdsRef.current = cds;
  }, [cds]);
  useEffect(() => {
    animModeRef.current = animMode;
  }, [animMode]);
  useEffect(() => {
    battlePhaseRef.current = battlePhase;
  }, [battlePhase]);

  const later = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    battleTimers.current.push(id);
  }, []);

  /** 방치 캡이 차는 시각에 로컬 푸시 예약 — 정산할 때마다 갱신 (네이티브에서만 동작) */
  const scheduleIdleCapNotify = useCallback((progress: CharacterProgress) => {
    const at = new Date(Date.now() + idleCapHours(progress) * 3600 * 1000);
    void scheduleLocalNotification(
      NOTIFY_ID.idleCap,
      "방치 보상이 가득 찼어요",
      "사냥터 보상이 캡에 닿았습니다. 지금 정산하면 손해가 없어요!",
      at,
    );
  }, []);

  // 보스 제한시간 — 방진 시너지(§2)와 아기 늑대 펫(§1)이 연장한다.
  // spawn이 의존성 없는 콜백이라 ref로 전달한다.
  const bossTimeSec = useMemo(
    () =>
      BOSS_TIME_SEC +
      partySynergies(character.partyIds).effects.bossTimeBonus +
      activePetEffect(character.pets, character.activePet, "bossTime"),
    [character.partyIds, character.pets, character.activePet],
  );
  const bossTimeRef = useRef(bossTimeSec);
  useEffect(() => {
    bossTimeRef.current = bossTimeSec;
  }, [bossTimeSec]);

  const spawn = useCallback((stage: number, nextWave: number, asBoss: boolean) => {
    const isChest = !asBoss && Math.random() < 0.04;
    const mhp = monsterHp(stage, asBoss) * (isChest ? 1.6 : 1);
    setWave(nextWave);
    setBoss(asBoss);
    setChesterson(isChest);
    setHp(mhp);
    setMaxHp(mhp);
    setBossLeft(bossTimeRef.current);
    waveRef.current = nextWave;
    bossRef.current = asBoss;
    chestRef.current = isChest;
    hpRef.current = mhp;
    bossLeftRef.current = bossTimeRef.current;
    formationReadyRef.current = false;
    setFormationReady(false);
    setFormationEngaged(false);
    const rolledKind = monsterKind(stage, asBoss, isChest);
    const speedBase = rolledKind === "wolf" ? 820 : rolledKind === "slime" ? 1180 : rolledKind === "ogre" ? 1550 : rolledKind === "dragon" ? 1080 : asBoss ? 1500 : 1250;
    const durationMs = Math.round(speedBase * (.88 + Math.random() * .24));
    setEncounterMotion({
      heroLeft: 29 + Math.random() * 7,
      monsterRight: (rolledKind === "dragon" ? 25 : 35) + Math.random() * 8,
      durationMs,
    });
    window.requestAnimationFrame(() => setFormationEngaged(true));
    const approachMs = durationMs + 120;
    const formationTimer = window.setTimeout(() => {
      formationReadyRef.current = true;
      setFormationReady(true);
    }, approachMs);
    battleTimers.current.push(formationTimer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    preloadTitanSheets();
    void Promise.all([loadTitansSave(userHash), loadCharacterProgress(userHash)]).then(([rawLoaded, rawProgress]) => {
      if (cancelled) return;
      const loaded = rawLoaded;
      let progress = rawProgress;

      // 도감(§7) 보유 동기화 — effectiveStars의 암묵 ★1을 저장값에도 반영해야
      // progress만 보는 도감 전투력·성급 마일스톤이 보유 동료를 셀 수 있다.
      const starsFix = ALLY_IDS.filter((id) => loaded.heroes[id] > 0 && (progress.allyStars[id] ?? 0) <= 0);
      // 편성(§2) 소급 — 편성 도입 전 세이브는 전원이 출전 중이었다. 보유 수만큼(최대 6)
      // 슬롯 하한을 보장하고, DPS 상위 순으로 자동 편성해 전력 손실 없이 넘어온다.
      const owned = HEROES.filter((h) => loaded.heroes[h.id] > 0);
      const needsParty = progress.partyIds.length === 0 && owned.length > 0;
      if (starsFix.length > 0 || needsParty) {
        const cap = needsParty ? Math.min(6, Math.max(progress.partyCap, owned.length)) : progress.partyCap;
        const autoParty = needsParty
          ? [...owned]
              .sort(
                (a, b) =>
                  heroDps(b, loaded.heroes[b.id]) * starMultiplier(effectiveStars(progress.allyStars[b.id], loaded.heroes[b.id])) -
                  heroDps(a, loaded.heroes[a.id]) * starMultiplier(effectiveStars(progress.allyStars[a.id], loaded.heroes[a.id])),
              )
              .slice(0, partySlotCount(progress.towerBestFloor, cap))
              .map((h) => h.id)
          : progress.partyIds;
        const stars = { ...progress.allyStars };
        starsFix.forEach((id) => {
          stars[id] = 1;
        });
        progress = { ...progress, allyStars: stars, partyIds: autoParty, partyCap: cap };
        void updateCharacterProgress(userHash, (current) => {
          const merged = { ...current.allyStars };
          starsFix.forEach((id) => {
            merged[id] = Math.max(1, merged[id] ?? 0);
          });
          return {
            ...current,
            allyStars: merged,
            partyIds: current.partyIds.length === 0 ? autoParty : current.partyIds,
            partyCap: Math.max(current.partyCap, cap),
          };
        });
      }

      // 개척하지 않은 지역으로는 진입할 수 없다 — 저장값이 앞서 있으면 경계로 되돌린다.
      const ceiling = stageCeilingFor(progress.pioneeredArea);
      const stage = Math.min(loaded.stage, ceiling);
      const since = progress.idleClaimedAt || loaded.lastActiveAt;
      const awaySeconds = Math.max(0, (Date.now() - since) / 1000);
      const result = computeIdleYield(progress, stage, loaded.skillInventory.equipped, awaySeconds);

      // P1 따라잡기 — 방치가 진행시킨 스테이지(endStage)에서 재개한다
      const resumeStage = Math.max(stage, result.endStage);
      setSave({ ...loaded, stage: resumeStage, lastActiveAt: Date.now() });
      setCharacter(progress);
      setEquippedShoulder(progress.equippedShoulder);
      setSkillPoints(progress.skillPoints);
      setRedGems(progress.redGems);

      // 1분 미만 이탈은 정산 화면을 띄우지 않는다 (탭 전환마다 모달이 뜨면 피로하다).
      if (result.seconds >= 60 && result.gold > 0) {
        setIdleReport({
          result,
          stage,
          bottleneck: idleBottleneck(progress, result, resumeStage, progress.pioneeredArea),
        });
      } else {
        void updateCharacterProgress(userHash, (current) => ({ ...current, idleClaimedAt: Date.now() }));
      }

      spawn(resumeStage, 1, false);
      setReady(true);
      scheduleIdleCapNotify(progress);
      // 세션 카운트(종료 예고 카드는 첫 3세션) + 이벤트 저장 로드
      void updateCharacterProgress(userHash, (current) => ({ ...current, sessionCount: current.sessionCount + 1 })).then(setCharacter);
      void loadEventSave(userHash).then(setEvents);
    });
    return () => {
      cancelled = true;
      if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
      battleTimers.current.forEach(window.clearTimeout);
      battleTimers.current = [];
    };
  }, [userHash, spawn, scheduleIdleCapNotify]);

  useEffect(() => {
    if (!ready) return;
    void saveTitansSave(userHash, { ...save, lastActiveAt: Date.now() });
  }, [ready, save, userHash]);

  /** 방치 보상 확정 — 골드는 사냥터 저장에, EXP·강화석은 공유 진행도에 들어간다. */
  const claimIdle = useCallback(
    (then?: () => void) => {
      const report = idleReport;
      if (!report) return;
      setIdleReport(null);
      // 방치 골드는 공유 지갑(대장간 소비처)으로 간다.
      // 사냥터 자체 골드(save.gold)는 액티브 전투 보상으로 남겨 방치가 플레이를 대체하지 않게 한다.
      void updateCharacterProgress(userHash, (current) => {
        // 조각 드랍 (4h당 1개) — 보유 동료 중 무작위 배분
        const shards = { ...current.allyShards };
        for (let i = 0; i < report.result.allyShardDrops; i += 1) {
          const target = randomOwnedAlly(saveRef.current.heroes);
          shards[target] = (shards[target] ?? 0) + 1;
        }
        return {
          ...current,
          sharedCoins: current.sharedCoins + report.result.gold,
          exp: current.exp + report.result.exp,
          enhancementMaterials: current.enhancementMaterials + report.result.materials,
          allyShards: shards,
          idleClaimedAt: Date.now(),
          // 온보딩 마지막 단계(§8) — 첫 방치 정산이 이벤트·상점을 연다
          onboardingStep: current.onboardingStep === 3 ? 4 : current.onboardingStep,
          // 복귀 워밍업 (RETENTION C): 2h+ 이탈 후 정산 = 5분 골드 ×2, 하루 3회
          ...(() => {
            const today = new Date().toLocaleDateString("sv-SE");
            const day = current.warmupDay.date === today ? current.warmupDay : { date: today, count: 0 };
            if (report.result.seconds + report.result.wastedSeconds < 2 * 3600 || day.count >= 3) return {};
            return { warmupUntil: Date.now() + 5 * 60 * 1000, warmupDay: { date: today, count: day.count + 1 } };
          })(),
        };
      }).then((next) => {
        const finishedOnboarding = characterRef.current.onboardingStep === 3 && next.onboardingStep === 4;
        setCharacter(next);
        setSkillPoints(next.skillPoints);
        scheduleIdleCapNotify(next);
        if (finishedOnboarding) {
          sfxSlotUnlock();
          setUnlockBanner(4);
          window.setTimeout(() => setUnlockBanner(null), 3200);
        }
        then?.();
      });
    },
    [idleReport, userHash, scheduleIdleCapNotify],
  );

  // Idle / attack sprite playback
  useEffect(() => {
    if (!ready) return;
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      acc += dt;
      // 공격 시작 시 누적치를 비운다 — idle에서 남은 최대 150ms가 그대로 이월되면
      // 와인드업(0번) 프레임이 간헐적으로 즉시 넘어가 펀치가 뚝 끊겨 보인다.
      if (animResetRef.current) {
        animResetRef.current = false;
        acc = 0;
      }
      const attacking = animModeRef.current === "attack" && now < attackUntil.current;
      if (!attacking && animModeRef.current === "attack") {
        animModeRef.current = "idle";
        setAnimMode("idle");
        setFrameIdx(0);
        acc = 0;
      }
      const step = attacking ? ATTACK_CLIP_MS / SPRITE_FRAME_COUNT : IDLE_FRAME_MS;
      if (acc >= step) {
        const steps = Math.floor(acc / step);
        acc -= steps * step;
        setFrameIdx((i) => (i + steps) % SPRITE_FRAME_COUNT);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [ready]);

  const flash = (msg: string) => {
    setToast(msg);
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), 1400);
  };

  const pushFx = (kind: FxBurst["kind"], x: number, y: number, hue?: number) => {
    const id = ++fxId.current;
    setFx((prev) => [...prev.slice(lowFxRef.current ? -8 : -22), { id, kind, x, y, hue }]);
    window.setTimeout(() => {
      setFx((prev) => prev.filter((f) => f.id !== id));
    }, kind === "slash" ? 320 : kind === "hit" || kind === "ally" ? 420 : 850);
  };

  const pushFloat = (
    dmg: number,
    crit: boolean,
    clientX?: number,
    clientY?: number,
    source: FloatSource = "hero",
    hue?: number,
  ) => {
    const rect = fieldRef.current?.getBoundingClientRect();
    const x = clientX && rect ? ((clientX - rect.left) / rect.width) * 100 : 58 + Math.random() * 16;
    const y = clientY && rect ? ((clientY - rect.top) / rect.height) * 100 : 30 + Math.random() * 16;
    const id = ++floatId.current;
    // 저사양 모드는 동시 숫자를 절반으로 — 숫자 폭주가 프레임을 먹는다
    setFloats((prev) => [...prev.slice(lowFxRef.current ? -8 : -18), { id, x, y, text: formatGold(dmg), crit, source, hue }]);
    window.setTimeout(() => {
      setFloats((prev) => prev.filter((f) => f.id !== id));
    }, 700);
  };

  const playAttackAnim = () => {
    attackUntil.current = performance.now() + ATTACK_CLIP_MS;
    animModeRef.current = "attack";
    animResetRef.current = true;
    setAnimMode("attack");
    setFrameIdx(0);
  };

  const applyDamage = useCallback(
    (
      raw: number,
      crit: boolean,
      opts?: { clientX?: number; clientY?: number; fromAlly?: TitanHeroId | "tap"; source?: FloatSource; hue?: number },
    ) => {
      if (raw <= 0 || battlePhaseRef.current !== "combat") return;
      const dealt = Math.floor(raw);
      pushFloat(dealt, crit, opts?.clientX, opts?.clientY, opts?.source ?? "hero", opts?.hue);
      setMonsterHit((n) => n + 1);
      setImpact(crit ? "critical" : "normal");
      // 클래스를 애니메이션(0.12s/0.16s)보다 먼저 떼면 반동이 중간에 끊겨 스냅된다.
      window.setTimeout(() => setImpact(null), crit ? 170 : 130);
      pushFx("hit", 72 + Math.random() * 10, 38 + Math.random() * 14);
      if (crit) pushFx("crit", 70, 40, 38);

      const next = hpRef.current - dealt;
      if (next > 0) {
        hpRef.current = next;
        setHp(next);
        return;
      }

      const s = saveRef.current;
      const wasBoss = bossRef.current;
      battlePhaseRef.current = "monster-death";
      setBattlePhase("monster-death");

      // 몬스터 도감 (LIVEOPS §2.3) — 종별 카운트는 배치로 모아 보스 클리어 때 플러시.
      // 킬마다 storage 쓰기를 하면 저장 부하가 크다.
      const killedKind = monsterKind(s.stage, wasBoss, chestRef.current);
      killCountsRef.current[killedKind] = (killCountsRef.current[killedKind] ?? 0) + 1;
      if (wasBoss) {
        bossFailStreakRef.current = 0;
        setWallInfo(null);
      }

      // 도감 마일스톤 보너스: 10/100/1,000 처치 → +2/4/8%
      const codexKills =
        (characterRef.current.monsterKills[killedKind] ?? 0) + (killCountsRef.current[killedKind] ?? 0);
      const codexMult = codexKills >= 1000 ? 1.08 : codexKills >= 100 ? 1.04 : codexKills >= 10 ? 1.02 : 1;

      // 오늘의 첫 보스 클리어 2배 (LIVEOPS §2.4)
      const today = new Date().toLocaleDateString("sv-SE");
      const firstClearToday = wasBoss && characterRef.current.firstClearDates.hunt !== today;

      // 아기 슬라임 펫(§1) — 사냥 골드 가산
      const petGold = 1 + activePetEffect(characterRef.current.pets, characterRef.current.activePet, "gold");
      const warmupMult = characterRef.current.warmupUntil > Date.now() ? 2 : 1;
      const goldGain = Math.floor(
        (killGold(s.stage, wasBoss, chestRef.current) + (wasBoss ? stageClearBonus(s.stage) : 0)) *
          codexMult *
          petGold *
          warmupMult *
          (firstClearToday ? 2 : 1),
      );
      if (firstClearToday) {
        flash("오늘의 첫 보스 클리어 · 보상 2배!");
        void updateCharacterProgress(userHash, (current) => ({
          ...current,
          firstClearDates: { ...current.firstClearDates, hunt: today },
        })).then(setCharacter);
      }
      if (wasBoss) {
        // 주간 도전(보스 처치) 카운트
        void updateEventSave(userHash, (e) => ({ ...e, weeklyBossKills: e.weeklyBossKills + 1 })).then(setEvents);
        // 도감 카운트 플러시 (보스 주기 = 자연스러운 배치 경계)
        const pending = killCountsRef.current;
        killCountsRef.current = {};
        void updateCharacterProgress(userHash, (current) => {
          const merged = { ...current.monsterKills };
          (Object.keys(pending) as TitanMonsterKind[]).forEach((k) => {
            merged[k] = (merged[k] ?? 0) + (pending[k] ?? 0);
          });
          // 펫 부화 (§1) — 도감 최종 마일스톤(1,000처치) 도달 시 아기 버전이 태어난다.
          // 플러시 경계에서만 판정하므로 킬마다 검사하는 비용이 없다.
          const hatched = pendingHatches(merged, current.pets);
          if (hatched.length === 0) return { ...current, monsterKills: merged };
          const pets = { ...current.pets };
          hatched.forEach((id) => {
            pets[id] = 1;
          });
          return {
            ...current,
            monsterKills: merged,
            pets,
            activePet: current.activePet || hatched[0],
          };
        }).then((next) => {
          const born = Object.keys(next.pets).filter(
            (id) => (next.pets[id as TitanMonsterKind] ?? 0) > 0 && (characterRef.current.pets[id as TitanMonsterKind] ?? 0) <= 0,
          ) as TitanMonsterKind[];
          setCharacter(next);
          if (born.length > 0) {
            flash(`${PET_DEFS[born[0]].name} 부화! 마이페이지에서 확인하세요`);
            // 필드 펫 자리(좌측)에서 황금 버스트 — 부화가 눈에 보이게
            pushFx("crit", 15, 50, 45);
            pushFx("warcry", 15, 50, 45);
          }
        });
      }

      // 지역 개척 게이트 — 미개척 지역으로는 넘어갈 수 없다. 화살 원정으로만 열린다.
      // 스테이지 증가보다 **먼저** 판정해야 한다. 나중에 보면 이미 상한을 넘긴 뒤라
      // 헤더는 다음 스테이지를 가리키는데 몬스터는 이전 스테이지가 나온다.
      const gateBlocked =
        wasBoss && s.stage >= stageCeilingFor(characterRef.current.pioneeredArea);
      const advancing = wasBoss && !gateBlocked;

      setSave((prev) => ({
        ...prev,
        gold: prev.gold + goldGain,
        skillInventory: wasBoss ? { ...prev.skillInventory, skillCores: prev.skillInventory.skillCores + 1 } : prev.skillInventory,
        totalKills: prev.totalKills + 1,
        bestStage: advancing ? Math.max(prev.bestStage, prev.stage + 1) : prev.bestStage,
        stage: advancing ? prev.stage + 1 : prev.stage,
      }));

      if (wasBoss) {
        setBossReady(false);
        const clearedStage = s.stage;
        // 보스 처치 보상은 막혀도 그대로 준다 — 잡은 건 잡은 것이다.
        void grantCharacterReward(userHash, `titans:${clearedStage}:${Date.now()}`, {
          exp: PROGRESSION_BALANCE.titans.bossExpBase + clearedStage * 8,
          lastContent: "titans",
        }).then(() =>
          updateCharacterProgress(userHash, (current) => ({
            ...current,
            // 막혔으면 최고 기록도 올리지 않는다 — 벽 앞에서 파밍한다고
            // titanBestStage가 상한 너머로 포화되면 프로필 표기가 어긋난다.
            titanBestStage: advancing
              ? Math.max(current.titanBestStage, clearedStage + 1)
              : current.titanBestStage,
            // 개척도(pioneeredArea)는 여기서 올리지 않는다 — 화살 원정만 지역을 연다.
            lastContent: "titans",
          })),
        );
        if (gateBlocked) {
          sfxGateBlocked();
          setGateNotice(true);
          flash(`${nextAreaName(characterRef.current.pioneeredArea) ?? "다음 지역"} 진입로가 막혀 있습니다`);
          later(() => {
            spawn(s.stage, 1, false);
            battlePhaseRef.current = "combat";
            setBattlePhase("combat");
          }, 700);
          return;
        }

        flash(`STAGE ${s.stage} CLEAR! +${formatGold(goldGain)}G`);
        // 첫 5분 대본(§8) — 첫 보스 클리어 직후 방치 개념을 1회 안내
        if (characterRef.current.onboardingStep < 4 && !onboardHintShownRef.current) {
          onboardHintShownRef.current = true;
          later(() => flash("잠깐 닫았다 와도 원정대가 계속 사냥합니다 — 방치 보상이 쌓여요"), 1700);
        }
        pendingStageRef.current = s.stage + 1;
        later(() => {
          battlePhaseRef.current = "stage-clear";
          setBattlePhase("stage-clear");
        }, 360);
        later(() => {
          battlePhaseRef.current = "stage-exit";
          setBattlePhase("stage-exit");
        }, 820);
        later(() => {
          spawn(s.stage + 1, 1, false);
          battlePhaseRef.current = "stage-enter";
          setBattlePhase("stage-enter");
        }, 1500);
        later(() => {
          battlePhaseRef.current = "combat";
          setBattlePhase("combat");
          pendingStageRef.current = null;
        }, 1980);
        return;
      }

      if (chestRef.current) flash(`황금 몬스터! +${formatGold(goldGain)}G`);
      if (waveRef.current >= MOBS_PER_STAGE) {
        if (bossReady) {
          later(() => {
            spawn(s.stage, MOBS_PER_STAGE, false);
            battlePhaseRef.current = "combat";
            setBattlePhase("combat");
          }, 360);
          return;
        }
        setBossReady(true);
        pendingStageRef.current = s.stage;
        flash("일반 스테이지 완료 · 보스 도전 가능!");
        later(() => {
          battlePhaseRef.current = "stage-clear";
          setBattlePhase("stage-clear");
        }, 300);
        later(() => {
          battlePhaseRef.current = "stage-exit";
          setBattlePhase("stage-exit");
        }, 680);
        later(() => {
          spawn(s.stage, MOBS_PER_STAGE, false);
          battlePhaseRef.current = "stage-enter";
          setBattlePhase("stage-enter");
        }, 1360);
        later(() => {
          battlePhaseRef.current = "combat";
          setBattlePhase("combat");
        }, 1840);
      } else {
        later(() => {
          pendingStageRef.current = s.stage;
          battlePhaseRef.current = "stage-clear";
          setBattlePhase("stage-clear");
        }, 220);
        later(() => {
          battlePhaseRef.current = "stage-exit";
          setBattlePhase("stage-exit");
        }, 540);
        later(() => {
          spawn(s.stage, waveRef.current + 1, false);
          battlePhaseRef.current = "stage-enter";
          setBattlePhase("stage-enter");
        }, 1_180);
        later(() => {
          pendingStageRef.current = null;
          battlePhaseRef.current = "combat";
          setBattlePhase("combat");
        }, 1_660);
      }
    },
    [bossReady, later, spawn, userHash],
  );

  const computeTapHit = useCallback(() => {
    const now = performance.now();
    const base = tapDamage(saveRef.current.equipmentTraining.weaponMastery + Math.floor(forgedWeaponLevel * 1.5));
    const clone = now < buffsRef.current.cloneUntil ? 2 : 1;
    const critChance = 0.08 + (now < buffsRef.current.critUntil ? 0.45 : 0);
    const crit = Math.random() < critChance;
    return { dmg: base * clone * (crit ? 3.2 : 1), crit };
  }, [forgedWeaponLevel]);

  const doTap = useCallback(
    (clientX?: number, clientY?: number) => {
      if (battlePhaseRef.current !== "combat" || !formationReadyRef.current) return;
      const { dmg, crit } = computeTapHit();
      playAttackAnim();
      pushFx("slash", 28 + Math.random() * 8, 42 + Math.random() * 10);
      setSave((prev) => ({ ...prev, totalTaps: prev.totalTaps + 1 }));
      applyDamage(dmg, crit, { clientX, clientY, fromAlly: "tap", source: "tap" });
    },
    [applyDamage, computeTapHit],
  );

  // Player/ally auto attacks + boss timer. Damage lands with each visible attack.
  useEffect(() => {
    if (!ready) return;
    let last = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      // 배속(QoL)은 공격·보스 타이머·쿨타임에 대칭 적용 — 보스 1초당 DPS가
      // 변하지 않아 벽 판정이 그대로다. 빨라지는 건 체감 진행 속도뿐이다.
      const dt = Math.min(0.25, (now - last) / 1000) * saveRef.current.battleSpeed;
      last = now;

      if (
        saveRef.current.autoSkill &&
        battlePhaseRef.current === "combat" &&
        formationReadyRef.current &&
        document.visibilityState !== "hidden"
      ) {
        for (const sk of SKILLS) {
          if (sk.slot === "passive" || cdsRef.current[sk.id] > 0) continue;
          if (!saveRef.current.skillInventory.learned.includes(sk.id)) continue;
          if (saveRef.current.skillInventory.equipped[sk.slot] !== sk.id) continue;
          castSkillRef.current(sk.id);
        }
      }

      const war = now < buffsRef.current.warcryUntil ? 2.5 : 1;
      if (battlePhaseRef.current === "combat" && formationReadyRef.current && document.visibilityState !== "hidden") {
        const autoInterval = Math.max(.48, 1.08 - Math.min(.6, saveRef.current.equipmentTraining.weaponMastery * .012));
        autoAttackAcc.current += dt;
        if (autoAttackAcc.current >= autoInterval) {
          autoAttackAcc.current %= autoInterval;
          attackUntil.current = performance.now() + ATTACK_CLIP_MS;
          animModeRef.current = "attack";
          animResetRef.current = true;
          setAnimMode("attack");
          setFrameIdx(0);
          pushFx("slash", 31, 45);
          applyDamage(playerIdleDps(saveRef.current.equipmentTraining.weaponMastery), false, { fromAlly: "tap", source: "hero" });
        }
      } else {
        autoAttackAcc.current = 0;
      }

      if (battlePhaseRef.current === "combat" && formationReadyRef.current && document.visibilityState !== "hidden") {
        // 보호구 강화(대장간)는 동료 지원 배율로 붙는다 — 견갑 훈련(사냥터 골드)과 별개 축
        const shoulderBoost = 1 + saveRef.current.equipmentTraining.shoulderMastery * .025 + (characterRef.current.shoulderEnhance ?? 0) * 0.02;
        // 편성(§2): 출전 슬롯에 오른 동료만 싸운다 · 엄호 사격 시너지가 DPS를 증폭한다
        const synergyDps = partySynergies(characterRef.current.partyIds).effects.dpsMult;
        for (const h of HEROES) {
          const level = saveRef.current.heroes[h.id];
          if (level <= 0 || !characterRef.current.partyIds.includes(h.id)) continue;
          allyAttackAcc.current[h.id] += dt;
          if (allyAttackAcc.current[h.id] < h.attackInterval) continue;
          allyAttackAcc.current[h.id] %= h.attackInterval;
          setAllyPulse((prev) => ({ ...prev, [h.id]: (prev[h.id] ?? 0) + 1 }));
          pushFx("ally", 40 + Math.random() * 18, 55 + Math.random() * 10, h.hue);
          applyDamage(heroDps(h, level) * starMultiplier(effectiveStars(characterRef.current.allyStars[h.id], level)) * h.attackInterval * war * shoulderBoost * synergyDps, false, { fromAlly: h.id, source: "ally", hue: h.hue });
        }
      }

      if (bossRef.current) {
        const left = bossLeftRef.current - dt;
        bossLeftRef.current = left;
        setBossLeft(Math.max(0, left));
        if (left <= 0) {
          flash("보스 실패 · 다시 도전!");
          // 벽 미터 (RETENTION D): 제한시간 동안 깎은 비율 — 추천 배너가 정량 게이지로 보여준다
          setWallInfo({ ratio: Math.max(0.02, Math.min(0.99, 1 - hpRef.current / Math.max(1, monsterHp(saveRef.current.stage, true)))), stage: saveRef.current.stage });
          setBossReady(true);
          spawn(saveRef.current.stage, MOBS_PER_STAGE, false);
          battlePhaseRef.current = "combat";
          setBattlePhase("combat");
          // DPS 벽 감지 (LIVEOPS §1.3) — 2연속 실패 = 이 지역의 벽.
          // 벽은 실패가 아니라 이정표다: 최초 도달 시 보석 보상 + 돌파 3택 배너,
          // 그리고 wallAreas 기록이 환생 조건(3지역)을 채운다.
          bossFailStreakRef.current += 1;
          if (bossFailStreakRef.current >= 2) {
            bossFailStreakRef.current = 0;
            const areaId = huntingArea(saveRef.current.stage).id;
            if (!characterRef.current.wallAreas.includes(areaId)) {
              void updateCharacterProgress(userHash, (current) =>
                current.wallAreas.includes(areaId)
                  ? current
                  : {
                      ...current,
                      wallAreas: [...current.wallAreas, areaId],
                      redGems: current.redGems + 30,
                    },
              ).then((next) => {
                setCharacter(next);
                setRedGems(next.redGems);
                flash(`${huntingArea(saveRef.current.stage).name}의 벽 도달 · 보석 +30`);
              });
            }
          }
        }
      }

      setCds((prev) => {
        let changed = false;
        const next = { ...prev };
        (Object.keys(next) as TitanSkillId[]).forEach((k) => {
          if (next[k] > 0) {
            next[k] = Math.max(0, next[k] - dt);
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }, 100);
    return () => window.clearInterval(id);
  }, [ready, applyDamage, spawn, userHash]);

  useEffect(() => {
    if (!ready || battlePhase !== "combat" || !formationReady) {
      setMonsterAction("idle");
      return;
    }
    let prepareTimer = 0;
    let recoverTimer = 0;
    const trigger = () => {
      setMonsterAction("prepare");
      // 타이밍 체인: 준비(0.32s 클립) → 타격(0.48s 클립) → 복귀.
      // 기존 220/620ms는 준비를 클립 69%에서, 타격을 완료 80ms 전에 잘라
      // 웅크리다 말고 돌진하다 마는 어색한 모션이 됐다. 클립 길이에 맞춘다.
      prepareTimer = window.setTimeout(() => setMonsterAction("attack"), boss ? 360 : 320);
      window.setTimeout(() => setAllyHitPulse((pulse) => pulse + 1), boss ? 430 : 390);
      recoverTimer = window.setTimeout(() => setMonsterAction("idle"), boss ? 900 : 860);
    };
    // 배속 시 공격 주기만 조인다 — 클립 내부 타이밍을 줄이면 모션이 뭉개진다
    const interval = window.setInterval(trigger, (boss ? 2100 : 2900) / save.battleSpeed);
    const first = window.setTimeout(trigger, (boss ? 900 : 1400) / save.battleSpeed);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(first);
      window.clearTimeout(prepareTimer);
      window.clearTimeout(recoverTimer);
    };
  }, [battlePhase, boss, formationReady, ready, save.battleSpeed]);

  useEffect(() => {
    if (!ready) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.code === "Space" || e.code.startsWith("Key") || e.code.startsWith("Digit")) {
        e.preventDefault();
        doTap();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ready, doTap]);

  const trainEquipment = async (slot: "weapon" | "shoulder") => {
    const key = slot === "weapon" ? "weaponMastery" : "shoulderMastery";
    const level = save.equipmentTraining[key];
    if (slot === "shoulder") {
      const maxCount = buyAmount === 0 ? 999 : buyAmount;
      let count = 0;
      let gold = 0;
      let expedition = 0;
      let beat = 0;
      while (count < maxCount) {
        const nextLevel = level + count;
        const nextGold = equipmentTrainingCost("shoulder", nextLevel);
        const materials = shoulderTrainingMaterials(nextLevel);
        if (gold + nextGold > save.gold || expedition + materials.expedition > character.enhancementMaterials || beat + materials.beat > character.shoulderShards) break;
        gold += nextGold;
        expedition += materials.expedition;
        beat += materials.beat;
        count += 1;
      }
      if (count === 0) return;
      const next = await updateCharacterProgress(userHash, (current) => ({
        ...current,
        enhancementMaterials: Math.max(0, current.enhancementMaterials - expedition),
        shoulderShards: Math.max(0, current.shoulderShards - beat),
      }));
      setCharacter(next);
      setSave((prev) => ({ ...prev, gold: prev.gold - gold, equipmentTraining: { ...prev.equipmentTraining, shoulderMastery: prev.equipmentTraining.shoulderMastery + count } }));
      flash(`견갑 숙련 Lv.${level + count}${count > 1 ? ` (+${count})` : ""}`);
      return;
    }
    const quote = bulkUpgradeQuote((l) => equipmentTrainingCost(slot, l), level, save.gold, buyAmount);
    if (quote.count === 0) return;
    setSave((prev) => ({
      ...prev,
      gold: prev.gold - quote.cost,
      equipmentTraining: { ...prev.equipmentTraining, [key]: prev.equipmentTraining[key] + quote.count },
    }));
    flash(`${slot === "weapon" ? "무기" : "견갑"} 숙련 Lv.${level + quote.count}${quote.count > 1 ? ` (+${quote.count})` : ""}`);
  };

  /** 이번 주 조각팩 구매 횟수 — 주간 제한(과금 상한 설계)의 판정 */
  const shardPackBoughtThisWeek = (id: TitanHeroId): number => {
    const week = currentWeekKey();
    if (character.weeklyShardPacks.week !== week) return 0;
    return character.weeklyShardPacks.bought[id] ?? 0;
  };

  const buyShardPack = async () => {
    const id = shardPackTarget;
    if (redGems < 120 || save.heroes[id] <= 0) return;
    const week = currentWeekKey();
    const next = await updateCharacterProgress(userHash, (current) => {
      const record = current.weeklyShardPacks.week === week ? current.weeklyShardPacks : { week, bought: {} };
      const bought = record.bought[id] ?? 0;
      if (bought >= SHARD_PACK_WEEKLY_LIMIT || current.redGems < 120) return current;
      return {
        ...current,
        redGems: current.redGems - 120,
        allyShards: { ...current.allyShards, [id]: (current.allyShards[id] ?? 0) + SHARD_PACK_AMOUNT },
        weeklyShardPacks: { week, bought: { ...record.bought, [id]: bought + 1 } },
      };
    });
    setCharacter(next);
    setRedGems(next.redGems);
    flash(`${HEROES.find((h) => h.id === id)?.name} 조각 +${SHARD_PACK_AMOUNT}`);
  };

  const buyIdleBooster = async () => {
    if (redGems < 80 || character.idleBoostUntil > Date.now()) return;
    const next = await updateCharacterProgress(userHash, (current) =>
      current.redGems < 80 || current.idleBoostUntil > Date.now()
        ? current
        : { ...current, redGems: current.redGems - 80, idleBoostUntil: Date.now() + 24 * 3600 * 1000 },
    );
    setCharacter(next);
    setRedGems(next.redGems);
    flash("방치 가속 24시간 시작 — 산출 2배");
  };

  /** 상점 전용 동료(luna·volt) — 보석으로 ★1 확정 해금. 성급은 조각 파밍으로만. */
  const buyShopAlly = async (id: TitanHeroId) => {
    const gemCost = SHOP_ALLY_GEM_COST[id];
    const def = HEROES.find((h) => h.id === id);
    if (!def || gemCost === undefined || save.heroes[id] > 0 || redGems < gemCost) return;
    const next = await updateCharacterProgress(userHash, (current) => {
      const slots = partySlotCount(current.towerBestFloor, current.partyCap);
      return {
        ...current,
        redGems: Math.max(0, current.redGems - gemCost),
        allyStars: { ...current.allyStars, [id]: Math.max(1, current.allyStars[id]) },
        partyIds:
          current.partyIds.includes(id) || current.partyIds.length >= slots
            ? current.partyIds
            : [...current.partyIds, id],
      };
    });
    setCharacter(next);
    setRedGems(next.redGems);
    setSave((prev) => ({ ...prev, heroes: { ...prev.heroes, [id]: 1 } }));
    setAllyPulse((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }));
    flash(`${def.name} 합류! (★1)`);
  };

  const summonAlly = async () => {
    if (redGems < 100) return;
    const roll = Math.random();
    const rarity = roll < .6 ? "R" : roll < .9 ? "SR" : "SSR";
    const pool = HEROES.filter((hero) => ALLY_RARITY[hero.id] === rarity);
    const id = pool[Math.floor(Math.random() * pool.length)].id;
    const owned = save.heroes[id] > 0;
    const next = await updateCharacterProgress(userHash, (current) => ({
      ...current,
      redGems: Math.max(0, current.redGems - 100),
      allyStars: owned ? current.allyStars : { ...current.allyStars, [id]: 1 },
      allyShards: owned ? { ...current.allyShards, [id]: current.allyShards[id] + 20 } : current.allyShards,
    }));
    setCharacter(next);
    setRedGems(next.redGems);
    if (!owned) setSave((current) => ({ ...current, heroes: { ...current.heroes, [id]: 1 } }));
    flash(`${HEROES.find((hero) => hero.id === id)?.name} ${owned ? "중복 · 조각 +20" : "합류!"}`);
  };

  /** 성급 승급 — 조각 소비, 환생에도 보존되는 영구 성장 */
  const starUpAlly = async (id: TitanHeroId) => {
    const lv = save.heroes[id];
    const stars = effectiveStars(character.allyStars[id], lv);
    const cost = shardCostToNext(id, stars);
    if (lv <= 0 || cost === null || character.allyShards[id] < cost) return;
    const next = await updateCharacterProgress(userHash, (current) => {
      const cur = effectiveStars(current.allyStars[id], lv);
      const need = shardCostToNext(id, cur);
      if (need === null || current.allyShards[id] < need) return current;
      return {
        ...current,
        allyShards: { ...current.allyShards, [id]: current.allyShards[id] - need },
        allyStars: { ...current.allyStars, [id]: cur + 1 },
      };
    });
    setCharacter(next);
    sfxSlotUnlock();
    flash(`${HEROES.find((h) => h.id === id)?.name} ★${effectiveStars(next.allyStars[id], lv)} 승급!`);
  };

  /** 출전/벤치 토글 (§2) — 슬롯이 차 있으면 추가 불가, 파견 중 동료는 출전 불가 */
  const toggleParty = async (id: TitanHeroId) => {
    const onExpedition = character.expeditions.some((e) => e.allyId === id);
    if (onExpedition) return;
    const slots = partySlotCount(character.towerBestFloor, character.partyCap);
    const inParty = character.partyIds.includes(id);
    if (!inParty && character.partyIds.length >= slots) {
      flash(`출전 슬롯이 가득 찼습니다 (${slots}자리)`);
      return;
    }
    const next = await updateCharacterProgress(userHash, (current) => ({
      ...current,
      partyIds: current.partyIds.includes(id)
        ? current.partyIds.filter((p) => p !== id)
        : [...current.partyIds, id].slice(0, slots),
    }));
    setCharacter(next);
  };

  /** 파견 (§3) — 벤치 동료를 4/8/12시간 보내 등급·성급 비례 보상을 받는다 */
  const sendExpedition = async (id: TitanHeroId, hours: 4 | 8 | 12) => {
    if (
      save.heroes[id] <= 0 ||
      character.partyIds.includes(id) ||
      character.expeditions.length >= EXPEDITION_MAX ||
      character.expeditions.some((e) => e.allyId === id)
    )
      return;
    const endsAt = Date.now() + hours * 3600 * 1000;
    const next = await updateCharacterProgress(userHash, (current) =>
      current.expeditions.length >= EXPEDITION_MAX || current.expeditions.some((e) => e.allyId === id)
        ? current
        : {
            ...current,
            expeditions: [...current.expeditions, { allyId: id, endsAt, hours }],
          },
    );
    setCharacter(next);
    const name = HEROES.find((h) => h.id === id)?.name ?? "동료";
    flash(`${name} ${hours}시간 파견 출발`);
    const slot = next.expeditions.findIndex((e) => e.allyId === id);
    if (slot >= 0) {
      void scheduleLocalNotification(
        NOTIFY_ID.expeditionBase + slot,
        "파견대 귀환",
        `${name} 파견대가 돌아왔습니다. 보상을 수령하세요!`,
        new Date(endsAt),
      );
    }
  };

  /** 완료된 파견 일괄 수령 — 보상 조각은 파견 간 동료 본인에게 쌓인다 */
  const claimExpeditions = async () => {
    const done = character.expeditions.filter((e) => e.endsAt <= Date.now());
    if (done.length === 0) return;
    const next = await updateCharacterProgress(userHash, (current) => {
      const finished = current.expeditions.filter((e) => e.endsAt <= Date.now());
      if (finished.length === 0) return current;
      const shards = { ...current.allyShards };
      let materials = 0;
      let gems = 0;
      finished.forEach((e) => {
        const stars = effectiveStars(current.allyStars[e.allyId], saveRef.current.heroes[e.allyId]);
        const reward = expeditionReward(e.allyId, stars, e.hours);
        shards[e.allyId] = (shards[e.allyId] ?? 0) + reward.shards;
        materials += reward.materials;
        gems += reward.gems;
      });
      return {
        ...current,
        allyShards: shards,
        enhancementMaterials: current.enhancementMaterials + materials,
        redGems: current.redGems + gems,
        expeditions: current.expeditions.filter((e) => e.endsAt > Date.now()),
      };
    });
    setCharacter(next);
    setRedGems(next.redGems);
    flash(`파견 ${done.length}건 귀환 — 조각·강화석 수령 완료`);
    // 알림 정리: 전부 취소 후 아직 진행 중인 파견만 다시 예약 (슬롯 재배치)
    void cancelLocalNotification([NOTIFY_ID.expeditionBase, NOTIFY_ID.expeditionBase + 1]).then(() => {
      next.expeditions.forEach((e, slot) => {
        const name = HEROES.find((h) => h.id === e.allyId)?.name ?? "동료";
        void scheduleLocalNotification(
          NOTIFY_ID.expeditionBase + slot,
          "파견대 귀환",
          `${name} 파견대가 돌아왔습니다. 보상을 수령하세요!`,
          new Date(e.endsAt),
        );
      });
    });
  };

  /** 동료 스킨 구매 — 확정 구매, 구매 즉시 자동 장착 */
  const buyAllySkin = async (skinId: string) => {
    const def = ALLY_SKINS[skinId];
    if (!def || character.ownedAllySkins.includes(skinId) || redGems < def.gemCost) return;
    const next = await updateCharacterProgress(userHash, (current) =>
      current.ownedAllySkins.includes(skinId) || current.redGems < def.gemCost
        ? current
        : {
            ...current,
            redGems: current.redGems - def.gemCost,
            ownedAllySkins: [...current.ownedAllySkins, skinId],
            equippedAllySkins: { ...current.equippedAllySkins, [def.ally]: skinId },
          },
    );
    setCharacter(next);
    setRedGems(next.redGems);
    setAllyPulse((prev) => ({ ...prev, [def.ally]: (prev[def.ally] ?? 0) + 1 }));
    flash(`${def.name} 스킨 장착!`);
  };

  /** 스킨 장착/해제 토글 */
  const toggleAllySkin = async (allyId: TitanHeroId, skinId: string) => {
    if (!character.ownedAllySkins.includes(skinId)) return;
    const next = await updateCharacterProgress(userHash, (current) => {
      const equipped = { ...current.equippedAllySkins };
      if (equipped[allyId] === skinId) delete equipped[allyId];
      else equipped[allyId] = skinId;
      return { ...current, equippedAllySkins: equipped };
    });
    setCharacter(next);
  };

  /** 무기 외형 구매 — 확정 구매, 즉시 장착 */
  const buyWeaponSkin = async (skinId: string) => {
    const def = WEAPON_SKINS[skinId];
    if (!def || character.ownedWeaponSkins.includes(skinId) || redGems < def.gemCost) return;
    const next = await updateCharacterProgress(userHash, (current) =>
      current.ownedWeaponSkins.includes(skinId) || current.redGems < def.gemCost
        ? current
        : {
            ...current,
            redGems: current.redGems - def.gemCost,
            ownedWeaponSkins: [...current.ownedWeaponSkins, skinId],
            equippedWeaponSkin: skinId,
          },
    );
    setCharacter(next);
    setRedGems(next.redGems);
    flash(`${def.name} 장착 — 칼날이 물들었다`);
  };

  const toggleWeaponSkin = async (skinId: string) => {
    if (!character.ownedWeaponSkins.includes(skinId)) return;
    const next = await updateCharacterProgress(userHash, (current) => ({
      ...current,
      equippedWeaponSkin: current.equippedWeaponSkin === skinId ? "" : skinId,
    }));
    setCharacter(next);
  };

  /** 칭호 구매 — 표시 칭호가 없으면 자동 장착 */
  const buyTitle = async (titleId: string) => {
    const def = TITLES[titleId];
    if (!def || character.ownedTitles.includes(titleId) || redGems < def.gemCost) return;
    const next = await updateCharacterProgress(userHash, (current) =>
      current.ownedTitles.includes(titleId) || current.redGems < def.gemCost
        ? current
        : {
            ...current,
            redGems: current.redGems - def.gemCost,
            ownedTitles: [...current.ownedTitles, titleId],
            activeTitle: current.activeTitle || titleId,
          },
    );
    setCharacter(next);
    setRedGems(next.redGems);
    flash(`칭호 「${def.name}」 획득 — 마이페이지에서 표시`);
  };

  /** 재화 팩 — 수량이 진행도 비례(goldPackAmount)라 어느 시점에도 유의미하다 */
  const buyGoldPack = async () => {
    if (redGems < GEM_PACK.goldPackCost) return;
    const amount = goldPackAmount(character);
    const next = await updateCharacterProgress(userHash, (current) =>
      current.redGems < GEM_PACK.goldPackCost
        ? current
        : { ...current, redGems: current.redGems - GEM_PACK.goldPackCost },
    );
    if (next.redGems === redGems) return;
    setCharacter(next);
    setRedGems(next.redGems);
    setSave((prev) => ({ ...prev, gold: prev.gold + amount }));
    flash(`황금 보급 상자 개봉 — +${formatGold(amount)}G`);
  };

  const buyMaterialPack = async () => {
    if (redGems < GEM_PACK.materialPackCost) return;
    const next = await updateCharacterProgress(userHash, (current) =>
      current.redGems < GEM_PACK.materialPackCost
        ? current
        : {
            ...current,
            redGems: current.redGems - GEM_PACK.materialPackCost,
            enhancementMaterials: current.enhancementMaterials + GEM_PACK.materialPackAmount,
          },
    );
    setCharacter(next);
    setRedGems(next.redGems);
    flash(`강화석 상자 개봉 — +${GEM_PACK.materialPackAmount}`);
  };

  const buyCorePack = async () => {
    if (redGems < GEM_PACK.corePackCost) return;
    const next = await updateCharacterProgress(userHash, (current) =>
      current.redGems < GEM_PACK.corePackCost
        ? current
        : { ...current, redGems: current.redGems - GEM_PACK.corePackCost },
    );
    if (next.redGems === redGems) return;
    setCharacter(next);
    setRedGems(next.redGems);
    setSave((prev) => ({
      ...prev,
      skillInventory: { ...prev.skillInventory, skillCores: prev.skillInventory.skillCores + GEM_PACK.corePackAmount },
    }));
    flash(`스킬 코어 상자 개봉 — +${GEM_PACK.corePackAmount}`);
  };

  /** 파견 즉시 완료권 — 가장 먼저 끝나는 진행 중 파견 1건을 바로 귀환시킨다 */
  const buyExpeditionFinish = async () => {
    const running = character.expeditions.filter((e) => e.endsAt > Date.now());
    if (running.length === 0 || redGems < GEM_PACK.expeditionFinishCost) return;
    const next = await updateCharacterProgress(userHash, (current) => {
      const active = [...current.expeditions].sort((a, b) => a.endsAt - b.endsAt).find((e) => e.endsAt > Date.now());
      if (!active || current.redGems < GEM_PACK.expeditionFinishCost) return current;
      return {
        ...current,
        redGems: current.redGems - GEM_PACK.expeditionFinishCost,
        expeditions: current.expeditions.map((e) => (e === active ? { ...e, endsAt: Date.now() } : e)),
      };
    });
    setCharacter(next);
    setRedGems(next.redGems);
    flash("파견대가 즉시 귀환했습니다 — 동료 탭에서 보상을 받으세요");
  };

  const buyHero = (id: TitanHeroId) => {
    const def = HEROES.find((h) => h.id === id);
    if (!def) return;
    if (save.stage < def.unlockStage) return;
    const lv = save.heroes[id];
    // 소환(0→1)은 항상 1레벨 — 일괄 수량은 레벨업에만 적용된다
    const quote =
      lv === 0
        ? { count: save.gold >= def.baseCost ? 1 : 0, cost: def.baseCost }
        : bulkUpgradeQuote((l) => heroUpgradeCost(def, l), lv, save.gold, buyAmount);
    if (quote.count === 0) return;
    setSave((prev) => ({
      ...prev,
      gold: prev.gold - quote.cost,
      heroes: { ...prev.heroes, [id]: prev.heroes[id] + quote.count },
    }));
    flash(lv === 0 ? `${def.name} 소환!` : `${def.name} Lv.${lv + quote.count}${quote.count > 1 ? ` (+${quote.count})` : ""}`);
    if (lv === 0) {
      setAllyPulse((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }));
      pushFx("ally", 36, 58, def.hue);
      // 첫 소환은 빈 슬롯에 자동 출전 — 소환했는데 안 싸우는 상황을 막는다.
      // 도감(§7) 보유 판정용 ★1 기록도 여기서 함께 남긴다.
      void updateCharacterProgress(userHash, (current) => {
        const slots = partySlotCount(current.towerBestFloor, current.partyCap);
        return {
          ...current,
          allyStars: { ...current.allyStars, [id]: Math.max(1, current.allyStars[id] ?? 0) },
          partyIds:
            current.partyIds.includes(id) || current.partyIds.length >= slots
              ? current.partyIds
              : [...current.partyIds, id],
        };
      }).then(setCharacter);
    }
  };

  const castSkill = (id: TitanSkillId) => {
    const def = SKILLS.find((s) => s.id === id);
    if (!def) return;
    if (!save.skillInventory.learned.includes(id) || save.skillInventory.equipped[def.slot] !== id || def.slot === "passive") return;
    if (cdsRef.current[id] > 0) return;
    const now = performance.now();
    setSkillVisual(id);
    window.setTimeout(() => setSkillVisual((active) => (active === id ? null : active)), 820);
    const visualKind: FxBurst["kind"] = def.slot === "starter" ? "strike" : def.slot === "finisher" ? "warcry" : def.element === "fire" ? "clone" : "crit";
    pushFx(visualKind, 56, 44, def.element === "fire" ? 18 : def.element === "wind" ? 185 : def.element === "earth" ? 75 : def.element === "light" ? 48 : 330);
    setCds((prev) => ({ ...prev, [id]: def.cooldownSec }));
    if (def.slot === "starter") {
      playAttackAnim();
      pushFx("slash", 30, 40);
      const { dmg } = computeTapHit();
      applyDamage(dmg * (id === "pierce" ? 52 : id === "emberCut" ? 46 : id === "frostEdge" ? 43 : 40), true, { source: "skill" });
      flash(`${def.name}!`);
      return;
    }
    if (def.slot === "finisher") {
      playAttackAnim();
      const { dmg } = computeTapHit();
      const execute = id === "voidFinish" && hpRef.current < monsterHp(saveRef.current.stage, bossRef.current) * .3 ? 110 : id === "meteor" ? 85 : 72;
      applyDamage(dmg * execute, true);
      pushFx("warcry", 58, 42, def.element === "fire" ? 18 : 210);
      flash(`${def.name}!`);
    } else if (def.element === "wind" || id === "bloodMoon") {
      setBuffs((b) => ({ ...b, critUntil: now + def.durationSec * 1000 }));
      flash(`${def.name} · 치명 연계!`);
    } else if (def.element === "fire" || id === "thunderLink") {
      setBuffs((b) => ({ ...b, cloneUntil: now + def.durationSec * 1000 }));
      flash(`${def.name} · 추가 타격!`);
    } else {
      setBuffs((b) => ({ ...b, warcryUntil: now + def.durationSec * 1000 }));
      flash(`${def.name} · 파티 강화!`);
    }
  };

  useEffect(() => {
    castSkillRef.current = castSkill;
  });

  // 이벤트 센터가 저장을 바꾸면 루틴 보드·추천이 즉시 따라온다 · 1초 틱은 워밍업 타이머용
  useEffect(() => {
    const refresh = () => void loadEventSave(userHash).then(setEvents);
    window.addEventListener("dodgebullets:events-changed", refresh);
    const tick = window.setInterval(() => setNowTick(Date.now()), 1000);
    return () => {
      window.removeEventListener("dodgebullets:events-changed", refresh);
      window.clearInterval(tick);
    };
  }, [userHash]);

  // 온보딩(§8) 자동 진행 — 조건(Stage 5 / 첫 개척 / Stage 10)을 채우면 다음 단계로.
  // 단계 4(이벤트·상점)는 조건이 아니라 "첫 방치 정산" 행위로만 오른다 (claimIdle 참조).
  useEffect(() => {
    if (!ready || character.onboardingStep >= 4) return;
    const target = onboardingTargetStep(character);
    if (target <= character.onboardingStep) return;
    void updateCharacterProgress(userHash, (current) => {
      const next = onboardingTargetStep(current);
      return next > current.onboardingStep ? { ...current, onboardingStep: next } : current;
    }).then((next) => {
      setCharacter(next);
      sfxSlotUnlock();
      setUnlockBanner(next.onboardingStep);
      window.setTimeout(() => setUnlockBanner(null), 3200);
    });
  }, [ready, character, userHash]);

  const learnSkill = async (id: TitanSkillId) => {
    const def = SKILLS.find((skill) => skill.id === id);
    if (!def || save.skillInventory.learned.includes(id)) return;
    const learnedInType = SKILLS.filter((skill) => skill.slot === def.slot && save.skillInventory.learned.includes(skill.id)).length;
    if (learnedInType >= skillTypeCapacity) { flash(`${def.slot} 보유 한도 ${skillTypeCapacity}개 · 캐릭터 레벨을 올리세요`); return; }
    if (save.skillInventory.skillCores < def.learnCoreCost || skillPoints < def.learnSpCost) { flash("스킬 포인트 또는 코어가 부족합니다"); return; }
    let paid = false;
    const progress = await updateCharacterProgress(userHash, (current) => {
      if (current.skillPoints < def.learnSpCost) return current;
      paid = true;
      return { ...current, skillPoints: current.skillPoints - def.learnSpCost, lastContent: "titans" };
    });
    if (!paid) return;
    setSkillPoints(progress.skillPoints);
    setSave((prev) => ({ ...prev, skillInventory: { ...prev.skillInventory, learned: [...prev.skillInventory.learned, id], levels: { ...prev.skillInventory.levels, [id]: 1 }, equipped: { ...prev.skillInventory.equipped, [def.slot]: id }, skillCores: prev.skillInventory.skillCores - def.learnCoreCost } }));
    flash(`${def.name} 학습 완료`);
  };

  const toggleSkill = (id: TitanSkillId) => {
    const def = SKILLS.find((skill) => skill.id === id);
    if (!def || !save.skillInventory.learned.includes(id)) return;
    // 슬롯은 연습실에서 해금한다 — 비트 숙련이 0레벨이면 장착할 수 없다.
    const equippedNow = save.skillInventory.equipped[def.slot] === id;
    if (!equippedNow && slotLevels(character)[def.slot] <= 0) {
      const beatSkill = BEAT_SKILL_BY_SLOT[def.slot];
      flash(`연습실에서 ${SKILL_LABEL[beatSkill]} 숙련 5를 먼저 올리세요`);
      return;
    }
    setSave((prev) => ({ ...prev, skillInventory: { ...prev.skillInventory, equipped: { ...prev.skillInventory.equipped, [def.slot]: prev.skillInventory.equipped[def.slot] === id ? undefined : id } } }));
  };

  const upgradeSkill = (id: TitanSkillId) => {
    const def = SKILLS.find((skill) => skill.id === id);
    const level = save.skillInventory.levels[id];
    const cost = Math.floor(240 * Math.pow(1.75, Math.max(0, level - 1)));
    if (!def || !save.skillInventory.learned.includes(id) || level >= def.maxLevel || save.gold < cost) return;
    setSave((prev) => ({
      ...prev,
      gold: prev.gold - cost,
      skillInventory: { ...prev.skillInventory, levels: { ...prev.skillInventory.levels, [id]: level + 1 } },
    }));
    flash(`${def.name} Lv.${level + 1}`);
  };

  const claimFreeProduct = async (productId: string) => {
    const claimKey = `free-store-v1:${productId}`;
    if (claimingProduct || characterRef.current.claimedRewards.includes(claimKey)) return;
    setClaimingProduct(productId);
    const grants: Record<string, { gems: number; gold: number; materials: number; cores: number; shoulder?: ShoulderId }> = {
      "gems-80": { gems: 80, gold: 0, materials: 0, cores: 0 },
      "gems-450": { gems: 450, gold: 0, materials: 0, cores: 0 },
      "gems-1200": { gems: 1200, gold: 0, materials: 0, cores: 0 },
      "adventurer-starter": { gems: 80, gold: 5000, materials: 10, cores: 0, shoulder: "scout" },
      "adventurer-mid": { gems: 250, gold: 50000, materials: 0, cores: 5, shoulder: "shadow" },
      "adventurer-advanced": { gems: 700, gold: 0, materials: 30, cores: 15, shoulder: "dragon" },
    };
    const grant = grants[productId];
    if (!grant) {
      setClaimingProduct(null);
      return;
    }
    try {
      const updated = await updateCharacterProgress(userHash, (current) => {
        if (current.claimedRewards.includes(claimKey)) return current;
        return {
          ...current,
          redGems: current.redGems + grant.gems,
          sharedCoins: current.sharedCoins + grant.gold,
          enhancementMaterials: current.enhancementMaterials + grant.materials,
          ownedShoulders: grant.shoulder
            ? [...new Set([...current.ownedShoulders, grant.shoulder])]
            : current.ownedShoulders,
          claimedRewards: [...current.claimedRewards, claimKey],
          lastContent: "titans",
        };
      });
      setCharacter(updated);
      characterRef.current = updated;
      setRedGems(updated.redGems);
      if (grant.gold > 0 || grant.cores > 0) {
        setSave((current) => ({
          ...current,
          gold: current.gold + grant.gold,
          skillInventory: {
            ...current.skillInventory,
            skillCores: current.skillInventory.skillCores + grant.cores,
          },
        }));
      }
      flash(`${STORE_PRODUCTS.find((product) => product.id === productId)?.name ?? "체험 상품"} 무료 수령 완료`);
    } finally {
      setClaimingProduct(null);
    }
  };

  const skipStageTransition = () => {
    const nextStage = pendingStageRef.current;
    if (nextStage === null) return;
    battleTimers.current.forEach(window.clearTimeout);
    battleTimers.current = [];
    pendingStageRef.current = null;
    spawn(nextStage, bossReady ? MOBS_PER_STAGE : 1, false);
    battlePhaseRef.current = "combat";
    setBattlePhase("combat");
  };

  const kind: TitanMonsterKind = monsterKind(save.stage, boss, chesterson);
  const area = huntingArea(save.stage);
  const monsterRanged = kind === "dragon" || (boss && (area.id === "volcano" || area.id === "abyss"));
  const label = monsterLabel(kind, chesterson, save.stage);
  // 편성(§2) — 출전 동료만 DPS·필드 렌더에 반영한다
  const partySlots = partySlotCount(character.towerBestFloor, character.partyCap);
  const synergy = useMemo(() => partySynergies(character.partyIds), [character.partyIds]);
  const partyHeroes = useMemo(() => {
    const filtered = { ...save.heroes };
    ALLY_IDS.forEach((id) => {
      if (!character.partyIds.includes(id)) filtered[id] = 0;
    });
    return filtered;
  }, [save.heroes, character.partyIds]);
  const dps =
    totalHeroDps(partyHeroes, (id) => starMultiplier(effectiveStars(character.allyStars[id], save.heroes[id]))) *
      synergy.effects.dpsMult +
    playerIdleDps(save.equipmentTraining.weaponMastery);
  const tap = tapDamage(save.equipmentTraining.weaponMastery + Math.floor(forgedWeaponLevel * 1.5));
  const now = performance.now();
  const allies = useMemo(
    () => HEROES.filter((h) => save.heroes[h.id] > 0 && character.partyIds.includes(h.id)),
    [save.heroes, character.partyIds],
  );
  const expeditionsDone = character.expeditions.filter((e) => e.endsAt <= Date.now()).length;

  // 다음 목표 3종 (점검표 #3): 동료 합류 · 스킬 학습 · 지역 개척 — 남은 거리를 항상 보여준다
  const nextGoals = useMemo(() => {
    const nextAlly = HEROES.filter((h) => h.unlockStage < 9999 && save.heroes[h.id] <= 0 && h.unlockStage > 0)
      .sort((a, b) => a.unlockStage - b.unlockStage)[0];
    const nextSkill = SKILLS.find((sk) => !save.skillInventory.learned.includes(sk.id));
    const ceiling = stageCeilingFor(character.pioneeredArea);
    const areaName = nextAreaName(character.pioneeredArea);
    const goals: { id: string; label: string; value: string; ratio: number; done: boolean; onClick: () => void }[] = [];
    if (nextAlly) {
      const reachable = save.stage >= nextAlly.unlockStage;
      goals.push({
        id: "ally",
        label: "다음 동료",
        value: reachable ? `${nextAlly.name} 소환 가능` : `${nextAlly.name} · STAGE ${nextAlly.unlockStage}`,
        ratio: reachable ? 1 : save.stage / nextAlly.unlockStage,
        done: reachable,
        onClick: () => setTab("heroes"),
      });
    }
    if (nextSkill) {
      const ok = skillPoints >= nextSkill.learnSpCost && save.skillInventory.skillCores >= nextSkill.learnCoreCost;
      goals.push({
        id: "skill",
        label: "다음 스킬",
        value: ok ? `${nextSkill.name} 학습 가능` : `${nextSkill.name} · SP ${skillPoints}/${nextSkill.learnSpCost}`,
        ratio: ok ? 1 : Math.min(skillPoints / nextSkill.learnSpCost, save.skillInventory.skillCores / Math.max(1, nextSkill.learnCoreCost)),
        done: ok,
        onClick: () => setTab("skills"),
      });
    }
    if (areaName) {
      goals.push({
        id: "area",
        label: "다음 지역",
        value: save.stage >= ceiling ? `${areaName} · 화살 원정 필요` : `${areaName} · STAGE ${ceiling}까지 ${ceiling - save.stage}`,
        ratio: Math.min(1, save.stage / ceiling),
        done: save.stage >= ceiling,
        onClick: () => (contentUnlocked(character.onboardingStep, "dodge") ? onOpenContent("dodge") : flash(LOCK_HINT.dodge)),
      });
    }
    return goals;
  }, [save.heroes, save.stage, save.skillInventory, character.pioneeredArea, character.onboardingStep, skillPoints, onOpenContent]);

  // ── 리텐션: 루틴 보드 · 추천 1개 · 워밍업 · 종료 예고 ──
  const routine = useMemo(() => routineItems(character, events, nowTick), [character, events, nowTick]);
  const routineReward = routineRewardAvailable(character, routine);
  const recommendation = useMemo(
    () => recommendNext(character, save, events, { wall: wallInfo, equipped: save.skillInventory.equipped, now: nowTick }),
    [character, save, events, wallInfo, nowTick],
  );
  const warmupLeft = Math.max(0, character.warmupUntil - nowTick);
  const idlePreview = useMemo(
    () => (character.sessionCount <= 3 ? computeIdleYield(character, save.stage, save.skillInventory.equipped, 8 * 3600) : null),
    [character, save.stage, save.skillInventory.equipped],
  );
  const runAction = (action: RecommendAction) => {
    if (action.kind === "content") onOpenContent(action.content);
    else if (action.kind === "tab") setTab(action.tab);
    else if (action.kind === "events") {
      if (onOpenEvents) onOpenEvents(action.tab);
      else flash("설정 → 모험가 이벤트에서 열 수 있습니다");
    }
  };
  const runRoutine = (item: RoutineItem) => {
    if (item.go.kind === "claim") {
      flash(item.done ? "오늘 정산을 이미 받았습니다" : "방치 보상은 접속 시 자동 정산 · 균열로 즉시 정산할 수 있어요");
      if (!item.done && onOpenEvents) onOpenEvents("rift");
      return;
    }
    if (item.go.kind === "content") runAction({ kind: "content", content: item.go.content });
    else if (item.go.kind === "events") runAction({ kind: "events", tab: item.go.tab });
    else runAction({ kind: "tab", tab: item.go.tab });
  };
  const claimRoutine = async () => {
    if (!routineReward) return;
    const today = new Date().toLocaleDateString("sv-SE");
    const next = await updateCharacterProgress(userHash, (current) =>
      current.routineClaimedDate === today ? current : { ...current, routineClaimedDate: today, redGems: current.redGems + ROUTINE_REWARD_GEMS },
    );
    setCharacter(next);
    setRedGems(next.redGems);
    flash(`오늘 루틴 완료 — 보석 +${ROUTINE_REWARD_GEMS}`);
  };

  const paidProductsUnlocked = character.attendanceStreak >= 3 || character.level >= 20;

  // 스킬 예상 DPS 보정 (점검표 #5) — 장착 액티브의 평균 업타임 가중치 합. 정확한 시뮬이
  // 아니라 "이 조합이 얼마나 강한가"의 상대 지표다.
  const skillDpsPreview = useMemo(
    () =>
      SKILLS.reduce((sum, sk) => {
        if (save.skillInventory.equipped[sk.slot] !== sk.id || !save.skillInventory.learned.includes(sk.id)) return sum;
        return sum + (SKILL_PREVIEW_PCT[sk.id] ?? 0) * (1 + (save.skillInventory.levels[sk.id] - 1) * 0.06);
      }, 0),
    [save.skillInventory],
  ).toFixed(0);

  const applyPreset = (ids: TitanSkillId[]) => {
    setSave((prev) => {
      const equipped: Partial<Record<TitanSkillSlot, TitanSkillId>> = {};
      SKILLS.forEach((sk) => {
        if (ids.includes(sk.id) && prev.skillInventory.learned.includes(sk.id)) {
          equipped[sk.slot] = sk.id;
        }
      });
      return { ...prev, skillInventory: { ...prev.skillInventory, equipped } };
    });
    flash("프리셋 적용 — 학습한 스킬만 장착됐습니다");
  };

  /** 추천 편성 (점검표 #4) — DPS 상위를 뽑되 원거리 2명을 보장해 엄호 사격 시너지를 켠다 */
  const recommendParty = async () => {
    const owned = HEROES.filter((h) => save.heroes[h.id] > 0 && !character.expeditions.some((e) => e.allyId === h.id));
    const slots = partySlotCount(character.towerBestFloor, character.partyCap);
    const dpsOf = (h: (typeof HEROES)[number]) =>
      heroDps(h, save.heroes[h.id]) * starMultiplier(effectiveStars(character.allyStars[h.id], save.heroes[h.id]));
    const sorted = [...owned].sort((a, b) => dpsOf(b) - dpsOf(a));
    const pick = sorted.slice(0, slots).map((h) => h.id);
    const rangedIn = pick.filter((id) => ALLY_ROLE[id] === "ranged").length;
    const rangedOut = sorted.filter((h) => ALLY_ROLE[h.id] === "ranged" && !pick.includes(h.id));
    for (let i = rangedIn; i < 2 && rangedOut.length > 0 && pick.length >= 2; i += 1) {
      const swapIdx = [...pick].reverse().findIndex((id) => ALLY_ROLE[id] !== "ranged");
      if (swapIdx < 0) break;
      pick.splice(pick.length - 1 - swapIdx, 1, rangedOut.shift()!.id);
    }
    const next = await updateCharacterProgress(userHash, (current) => ({ ...current, partyIds: pick }));
    setCharacter(next);
    flash(`추천 편성 적용 — ${pick.length}명 출전`);
  };

  // 첫 60초 코치 (점검표 #1) — 신규(step 0)에게 공격→소환→훈련 순으로 한 번에 하나만 보여준다
  const coach = useMemo(() => {
    if (character.onboardingStep > 0) return null;
    if (save.totalTaps < 3) return { id: "tap", text: "몬스터를 탭해서 공격해 보세요", target: "field" as const };
    if (save.heroes.mia <= 0) return { id: "summon", text: "동료 탭에서 스카우트 미아를 소환하세요", target: "heroes" as const };
    if (save.equipmentTraining.weaponMastery < 2) return { id: "train", text: "장비 성장에서 무기를 훈련하면 탭 공격력이 오릅니다", target: "sword" as const };
    return null;
  }, [character.onboardingStep, save.totalTaps, save.heroes.mia, save.equipmentTraining.weaponMastery]);

  const pad = {
    paddingTop: Math.max(12, insets.top),
    paddingRight: Math.max(12, insets.right),
    paddingBottom: Math.max(12, insets.bottom),
    paddingLeft: Math.max(12, insets.left),
  };

  if (!ready) {
    return (
      <div className="titans-layer titans-loading">
        <p>타이탄 전장 준비 중…</p>
      </div>
    );
  }

  return (
    <div className={`titans-layer ${lowFxRef.current ? "perf-low" : ""} ${recommendation ? "has-recommend" : ""}`} style={pad}>
      <header className="titans-header">
        <button type="button" className="titans-back" onClick={() => onOpenContent("profile")}>
          <span className="mypage-icon" aria-hidden="true" style={{ backgroundImage:`url(${assetUrl("titans/character/base/hero-idle.png")})` }} />
          <span className="mypage-label">마이페이지{character.activeTitle && TITLES[character.activeTitle] ? <small style={{ color:TITLES[character.activeTitle].color }}>「{TITLES[character.activeTitle].name}」</small> : <small>칭호 미설정</small>}</span>
        </button>
        <div className="titans-wallet">
          <span><CurrencyIcon kind="gold" /><strong>{formatGold(save.gold)}</strong></span>
          <span><CurrencyIcon kind="gem" /><strong>{formatGold(redGems)}</strong></span>
        </div>
      </header>

      <nav className="titans-content-tabs" aria-label="성장 콘텐츠">
        <button type="button" className="on"><ContentIcon name="hunt" />사냥터</button>
        {(
          [
            { id: "dodge", label: "화살 원정", icon: "dodge" },
            { id: "beat", label: "비트 수련", icon: "beat" },
            { id: "forge", label: "대장간", icon: "forge" },
          ] as const
        ).map((item) => {
          const locked = !contentUnlocked(character.onboardingStep, item.id as OnboardContent);
          return (
            <button
              key={item.id}
              type="button"
              className={locked ? "tab-locked" : ""}
              aria-disabled={locked}
              onClick={() => (locked ? flash(LOCK_HINT[item.id as OnboardContent]) : onOpenContent(item.id))}
            >
              {locked && <img className="tab-lock" src={assetUrl("ui/idle/lock.svg")} alt="" aria-hidden="true" />}
              <ContentIcon name={item.icon} />
              {item.label}
            </button>
          );
        })}
      </nav>

      {recommendation && (
        <button type="button" className={`recommend-banner tone-${recommendation.tone}`} onClick={() => runAction(recommendation.action)}>
          <span className="recommend-copy">
            <small>{recommendation.tone === "claim" ? "받을 것" : recommendation.tone === "free" ? "오늘 무료" : recommendation.tone === "wall" ? "DPS 벽" : "다음 성장"}</small>
            <b>{recommendation.title}</b>
            <em>{recommendation.desc}</em>
            {recommendation.meter !== undefined && (
              <i className="wall-meter" aria-label={`벽 ${Math.round(recommendation.meter * 100)}%`}><u style={{ width: `${recommendation.meter * 100}%` }} /></i>
            )}
          </span>
          <strong>{recommendation.cta} ›</strong>
        </button>
      )}

      <div className="routine-board" aria-label="오늘의 루틴">
        {routine.map((item) => (
          <button key={item.id} type="button" className={`routine-chip ${item.done ? "done" : ""}`} onClick={() => runRoutine(item)}>
            <b>{item.label}</b>
            <small>{item.detail}</small>
          </button>
        ))}
        <button type="button" className={`routine-reward ${routineReward ? "ready" : ""}`} disabled={!routineReward} onClick={() => void claimRoutine()}>
          {character.routineClaimedDate === new Date().toLocaleDateString("sv-SE") ? "완료" : `💎 ${ROUTINE_REWARD_GEMS}`}
        </button>
      </div>

      <div className="titans-stagebar">
        <div>
          <p className="titans-kicker">TAP TITANS · RPG</p>
          <h1>
            STAGE {save.stage}
            {boss ? " BOSS" : bossReady ? " · 10/10 · 반복 사냥" : ` · ${wave}/${MOBS_PER_STAGE}`}
          </h1>
          <small className="titans-area-name">{area.name} · STAGE {area.stageFrom}–{area.stageTo >= 9999 ? "∞" : area.stageTo}</small>
          {warmupLeft > 0 && (
            <span className="warmup-chip">워밍업 ×2 · {Math.floor(warmupLeft / 60000)}:{String(Math.floor((warmupLeft % 60000) / 1000)).padStart(2, "0")}</span>
          )}
          {idlePreview && !idleReport && (
            <span className="idle-preview-chip" title="지금 닫아도 원정대가 8시간 동안 사냥합니다">
              지금 닫아도 8시간 후 +{formatGold(idlePreview.gold)}G
            </span>
          )}
        </div>
        <div className="titans-best">
          최고
          <strong>{save.bestStage}</strong>
        </div>
      </div>

      <section
        ref={fieldRef}
        className={`titans-field phase-${battlePhase} ${boss ? "boss" : ""} ${chesterson ? "chest" : ""} ${impact ? `impact-${impact}` : ""}`}
        style={{
          "--area-sky": area.sky,
          "--area-ground": area.ground,
          "--area-accent": area.accent,
          "--area-background": `url(${area.background})`,
          "--hero-meet-left": `${encounterMotion.heroLeft}%`,
          "--monster-meet-right": `${encounterMotion.monsterRight}%`,
          "--encounter-duration": `${encounterMotion.durationMs}ms`,
        } as CSSProperties}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          if (battlePhase === "combat") doTap(e.clientX, e.clientY);
        }}
      >
        <div className="titans-background" aria-hidden="true" />
        <div className={`titans-hero ${formationEngaged ? "is-engaged" : ""} ${formationEngaged && !formationReady ? "is-approaching" : ""} ${animMode} ${skillVisual ? `skill-${skillVisual}` : ""}`}>
          <div className={`titans-hero-facing facing-${animMode}`}>
            <EquippedCharacter mode={animMode} frame={frameIdx} weaponLevel={forgedWeaponLevel} shoulder={equippedShoulder} character={character.activeCharacter} weaponSkin={character.equippedWeaponSkin} />
          </div>
        </div>

        <div className="titans-allies">
          {allies.map((h) => (
            <AllyArt
              key={h.id}
              id={h.id}
              skin={character.equippedAllySkins[h.id]}
              attacking
              pulse={allyPulse[h.id] ?? 0}
              hitPulse={allyHitPulse}
              engaged={formationEngaged}
              approaching={formationEngaged && !formationReady}
            />
          ))}
        </div>

        {character.activePet && (character.pets[character.activePet as TitanMonsterKind] ?? 0) > 0 && (
          <div className="titans-pet" title={PET_DEFS[character.activePet as TitanMonsterKind].name} aria-hidden="true">
            <MonsterArt kind={character.activePet as TitanMonsterKind} area={area} boss={false} golden={false} />
          </div>
        )}

        {/*
          피격 반동은 hit-a/hit-b를 번갈아 붙여 매 타격마다 CSS 애니메이션을 재시작한다.
          단일 "hit" 클래스를 monsterHit % 2로 토글하면 절반의 타격에는 클래스가 떨어져
          반동이 아예 재생되지 않는다 (같은 이름은 재적용해도 재시작하지 않으므로).
        */}
        <div className={`titans-monster kind-${kind} combat-${monsterRanged ? "ranged" : "melee"} ${formationEngaged ? "is-engaged" : ""} ${formationEngaged && !formationReady ? "is-approaching" : ""} action-${monsterAction} ${monsterHit > 0 ? (monsterHit % 2 ? "hit-a" : "hit-b") : ""} ${impact === "critical" ? "critical" : ""}`}>
          <MonsterArt kind={kind} area={area} boss={boss} golden={chesterson} />
          <strong>{label}</strong>
          {monsterAction === "prepare" && <i className="monster-telegraph" aria-hidden="true" />}
          {monsterAction === "attack" && <i className="monster-attack-fx" aria-hidden="true" />}
        </div>

        {(battlePhase === "stage-clear" || battlePhase === "stage-exit") && (
          <div className="titans-clear-banner">STAGE CLEAR</div>
        )}
        {(battlePhase === "stage-clear" || battlePhase === "stage-exit" || battlePhase === "stage-enter") && (
          <button type="button" className="titans-transition-skip" onPointerDown={(event) => event.stopPropagation()} onClick={skipStageTransition}>
            스킵
          </button>
        )}

        {fx.map((f) => (
          <span
            key={f.id}
            className={`titans-fx titans-fx-${f.kind}`}
            style={{
              left: `${f.x}%`,
              top: `${f.y}%`,
              ["--fx-hue" as string]: f.hue ?? 200,
            }}
          />
        ))}

        {floats.map((f) => (
          <span
            key={f.id}
            className={`titans-float src-${f.source} ${f.crit ? "crit" : ""}`}
            style={{ left: `${f.x}%`, top: `${f.y}%`, ...(f.hue !== undefined ? { "--float-hue": f.hue } : {}) } as CSSProperties}
          >
            <i aria-hidden="true">{f.source === "tap" ? "☝" : f.source === "ally" ? "◆" : f.source === "skill" ? "✦" : "⚔"}</i>
            {f.crit ? "CRIT " : ""}-{f.text}
          </span>
        ))}

        <div className="titans-hp">
          <div className="titans-hp-fill" style={{ width: `${(hp / Math.max(1, maxHp)) * 100}%` }} />
          <span>
            {formatGold(Math.max(0, hp))} / {formatGold(maxHp)}
          </span>
        </div>

        {boss && (
          <div className="titans-boss-timer">
            BOSS {bossLeft.toFixed(1)}s
            <i style={{ width: `${(bossLeft / bossTimeSec) * 100}%` }} />
          </div>
        )}

        {bossReady && !boss && battlePhase === "combat" && (
          <button
            type="button"
            className="titans-boss-challenge"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              setBossReady(false);
              setFormationEngaged(false);
              setFormationReady(false);
              spawn(save.stage, MOBS_PER_STAGE, true);
              battlePhaseRef.current = "stage-enter";
              setBattlePhase("stage-enter");
              later(() => {
                setFormationEngaged(true);
                battlePhaseRef.current = "combat";
                setBattlePhase("combat");
              }, 760);
            }}
          >
            보스 도전하기
          </button>
        )}

        {/* 스킬 독 — 전장 안 좌하단. 스킬은 전투 중 누르는 것이라 전장 밖(하단 카드 열)에
            있으면 시선이 오간다. 힌트 텍스트는 우하단으로 비켜난다 (사용자 지시). */}
        <div className="titans-skill-dock" onPointerDown={(e) => e.stopPropagation()}>
          <div className="battle-qol" role="group" aria-label="전투 편의">
            <button
              type="button"
              className={`qol-btn ${save.autoSkill ? "on" : ""}`}
              title="쿨타임 찬 스킬 자동 시전"
              onClick={() => setSave((prev) => ({ ...prev, autoSkill: !prev.autoSkill }))}
            >
              AUTO
            </button>
            <button
              type="button"
              className={`qol-btn ${save.battleSpeed === 2 ? "on" : ""}`}
              title="전투 배속"
              onClick={() => setSave((prev) => ({ ...prev, battleSpeed: prev.battleSpeed === 2 ? 1 : 2 }))}
            >
              ×2
            </button>
          </div>
          {/* 장착 스킬만 — 로스터가 20종이라 전부 그리면 독이 화면 밖으로 넘친다 (inspect-mobile.mjs) */}
          {SKILLS.filter((sk) => save.skillInventory.equipped[sk.slot] === sk.id && sk.slot !== "passive").map((sk) => {
            const learned = save.skillInventory.learned.includes(sk.id);
            const equipped = save.skillInventory.equipped[sk.slot] === sk.id;
            const cd = cds[sk.id];
            const ready = learned && equipped && cd <= 0 && sk.slot !== "passive";
            return (
              <button
                key={sk.id}
                type="button"
                className={`titans-skill ${ready ? "ready" : ""} ${skillVisual === sk.id ? "casting" : ""}`}
                disabled={!learned || !equipped || cd > 0 || sk.slot === "passive"}
                onClick={() => castSkill(sk.id)}
                title={`${sk.name} · ${sk.desc}`}
                aria-label={sk.name}
              >
                <SkillIcon id={sk.id} />
                <small>
                  {!learned ? "미학습" : !equipped ? "미장착" : sk.slot === "passive" ? "PASSIVE" : cd > 0 ? `${cd.toFixed(1)}s` : "READY"}
                </small>
                {learned && equipped && cd > 0 && sk.slot !== "passive" && (
                  <i className="skill-cd-ring" style={{ "--cd": cd / sk.cooldownSec } as CSSProperties} aria-hidden="true" />
                )}
              </button>
            );
          })}
        </div>
        <p className="titans-hint">
          탭 / 스페이스 · DPS {formatGold(dps)} · TAP {formatGold(tap)}
        </p>
      </section>

      <div className="titans-buffs">
        {now < buffs.critUntil && <span>치명</span>}
        {now < buffs.cloneUntil && <span>분신</span>}
        {now < buffs.warcryUntil && <span>함성</span>}
      </div>

      {/* 다음 목표 스트립 (점검표 #3) — "다음 해금까지 얼마"를 HUD에 고정 */}
      <div className="titans-goals" aria-label="다음 성장 목표">
        {nextGoals.map((g) => (
          <button key={g.id} type="button" className={`goal-chip ${g.done ? "done" : ""}`} onClick={g.onClick}>
            <small>{g.label}</small>
            <b>{g.value}</b>
            <i><em style={{ width: `${Math.min(100, g.ratio * 100)}%` }} /></i>
          </button>
        ))}
      </div>

      <div className="titans-tabs">
        <button type="button" className={tab === "sword" ? "on" : ""} onClick={() => setTab("sword")}> 
          장비 성장
        </button>
        <button type="button" className={tab === "heroes" ? "on" : ""} onClick={() => setTab("heroes")}>
          동료
        </button>
        <button type="button" className={tab === "skills" ? "on" : ""} onClick={() => setTab("skills")}>
          스킬
        </button>
        <button
          type="button"
          className={`${tab === "premium" ? "on" : ""} ${contentUnlocked(character.onboardingStep, "events") ? "" : "tab-locked"}`}
          onClick={() =>
            contentUnlocked(character.onboardingStep, "events") ? setTab("premium") : flash(LOCK_HINT.events)
          }
        >
          {!contentUnlocked(character.onboardingStep, "events") && (
            <img className="tab-lock" src={assetUrl("ui/idle/lock.svg")} alt="" aria-hidden="true" />
          )}
          상점
        </button>
      </div>

      <section className="titans-shop">
        {(tab === "sword" || tab === "heroes") && (
          <div className="bulk-toggle" role="group" aria-label="일괄 레벨업 수량">
            <span>일괄 레벨업</span>
            {([1, 10, 0] as const).map((n) => (
              <button
                key={n}
                type="button"
                className={buyAmount === n ? "on" : ""}
                onClick={() => setBuyAmount(n)}
              >
                {n === 0 ? "MAX" : `×${n}`}
              </button>
            ))}
          </div>
        )}
        {tab === "sword" && (
          <>
            <article className="titans-card equipment-training-card">
              <div className="training-item-icon weapon"><SwordArt level={Math.min(15, forgedWeaponLevel)} hue={tierAt(Math.min(15, forgedWeaponLevel)).hue} name="장착 대검" /></div>
              <div><strong>무기 숙련 · Lv.{save.equipmentTraining.weaponMastery}</strong><p>기본 공격력·자동 공격 속도·치명타 성장 · 다음 {formatGold(equipmentTrainingCost("weapon", save.equipmentTraining.weaponMastery))}G</p></div>
              <button type="button" disabled={save.gold < equipmentTrainingCost("weapon", save.equipmentTraining.weaponMastery)} onClick={() => trainEquipment("weapon")}>훈련</button>
            </article>
            <article className="titans-card equipment-training-card">
              <ShoulderIcon id={equippedShoulder} />
              <div><strong>{equippedShoulder ? SHOULDER_DEFINITIONS[equippedShoulder].name : "견갑 미장착"} · 숙련 Lv.{save.equipmentTraining.shoulderMastery}</strong><p>{equippedShoulder ? SHOULDER_DEFINITIONS[equippedShoulder].effect : "기본 견갑"} · 다음 {formatGold(equipmentTrainingCost("shoulder", save.equipmentTraining.shoulderMastery))}G{shoulderTrainingMaterials(save.equipmentTraining.shoulderMastery).expedition > 0 ? ` · 원정 강화석 ${shoulderTrainingMaterials(save.equipmentTraining.shoulderMastery).expedition}` : ""}{shoulderTrainingMaterials(save.equipmentTraining.shoulderMastery).beat > 0 ? ` · 비트 견갑 조각 ${shoulderTrainingMaterials(save.equipmentTraining.shoulderMastery).beat}` : ""}</p></div>
              <button type="button" disabled={save.gold < equipmentTrainingCost("shoulder", save.equipmentTraining.shoulderMastery) || character.enhancementMaterials < shoulderTrainingMaterials(save.equipmentTraining.shoulderMastery).expedition || character.shoulderShards < shoulderTrainingMaterials(save.equipmentTraining.shoulderMastery).beat} onClick={() => void trainEquipment("shoulder")}>훈련</button>
            </article>
            <button type="button" className="forge-jump-button" onClick={() => onOpenContent("forge")}><ContentIcon name="forge" /> 장비 제작·강화는 대장간에서</button>
          </>
        )}

        {tab === "heroes" && (
          <article className="titans-card party-panel">
            <div className="party-panel-head">
              <strong>
                원정대 편성 {character.partyIds.length}/{partySlots}
              </strong>
              <small>
                {partySlots < 6
                  ? `성벽 ${character.towerBestFloor < 50 ? 50 : 100}층 등반 시 슬롯 +1`
                  : "슬롯 최대"}
              </small>
            </div>
            <div className="party-synergies">
              {synergy.list.map((s) => (
                <span key={s.id} className={`synergy-chip ${s.active ? "on" : ""}`} title={s.desc}>
                  {s.name}
                </span>
              ))}
            </div>
            <div className="party-tools">
              <div className="role-filter" role="group" aria-label="역할 필터">
                {(["all", "melee", "ranged", "tank", "healer"] as const).map((role) => (
                  <button key={role} type="button" className={allyFilter === role ? "on" : ""} onClick={() => setAllyFilter(role)}>
                    {role === "all" ? "전체" : ROLE_LABEL[role]}
                  </button>
                ))}
              </div>
              <button type="button" className="recommend-party" onClick={() => void recommendParty()}>
                추천 편성
              </button>
            </div>
            <button type="button" className="expedition-claim" disabled={redGems < 100} onClick={() => void summonAlly()}>
              동료 소환 · 붉은 보석 100 <small>R 60% · SR 30% · SSR 10% · 중복 조각 +20</small>
            </button>
            {expeditionsDone > 0 && (
              <button type="button" className="expedition-claim" onClick={() => void claimExpeditions()}>
                <img src={assetUrl("ui/idle/expedition.svg")} alt="" aria-hidden="true" />
                파견 {expeditionsDone}건 귀환 — 보상 받기
              </button>
            )}
            {expeditionsDone === 0 && character.expeditions.length > 0 && (
              <p className="expedition-progress">
                <img src={assetUrl("ui/idle/expedition.svg")} alt="" aria-hidden="true" />
                파견 {character.expeditions.length}팀 진행 중
              </p>
            )}
          </article>
        )}
        {tab === "heroes" && <div className="ally-roster-grid" aria-label={`동료 도감 ${HEROES.length}명`}>
          <header className="ally-roster-summary"><strong>동료 도감 {HEROES.length}명</strong><small>근딜·원딜·탱커·힐러와 불·물·흙·바람 조합으로 편성하세요.</small></header>
          {HEROES.filter((h) => allyFilter === "all" || ALLY_ROLE[h.id] === allyFilter).map((h) => {
            const lv = save.heroes[h.id];
            const gemCost = SHOP_ALLY_GEM_COST[h.id];
            const shopOnly = gemCost !== undefined;
            const locked = shopOnly ? lv === 0 : save.stage < h.unlockStage;
            const cost = heroUpgradeCost(h, lv);
            const rarity = ALLY_RARITY[h.id];
            const stars = effectiveStars(character.allyStars[h.id], lv);
            const shards = character.allyShards[h.id];
            const nextCost = shardCostToNext(h.id, Math.max(1, stars));
            const cap = STAR_CAP[rarity];
            const mult = starMultiplier(Math.max(1, stars));
            const inParty = character.partyIds.includes(h.id);
            const expedition = character.expeditions.find((e) => e.allyId === h.id);
            const expeditionLeft = expedition ? Math.max(0, expedition.endsAt - Date.now()) : 0;
            const skinEntry = Object.entries(ALLY_SKINS).find(
              ([skinId, def]) => def.ally === h.id && character.ownedAllySkins.includes(skinId),
            );
            return (
              <article key={h.id} className={`titans-card ally-card rarity-${rarity.toLowerCase()} ${inParty ? "in-party" : ""} ${expedition ? "on-expedition" : ""}`}>
                <AllyArt id={h.id} skin={character.equippedAllySkins[h.id]} />
                <div>
                  <strong>
                    <em className="rarity-tag" style={{ color: RARITY_COLOR[rarity] }}>{rarity}</em>
                    <em className="role-tag">{ROLE_LABEL[ALLY_ROLE[h.id]]}</em>
                    <em className={`role-tag element-${ALLY_ELEMENT[h.id]}`}>{ELEMENT_LABEL[ALLY_ELEMENT[h.id]]}</em>
                    {h.name} {lv > 0 ? `· Lv.${lv}` : ""}
                  </strong>
                  {lv > 0 && (
                    <span className="ally-stars" aria-label={`성급 ${stars}/${cap}`}>
                      {Array.from({ length: cap }, (_, i) => (
                        <i key={i} className={i < stars ? "on" : ""}>★</i>
                      ))}
                      {mult > 1 && <b>×{mult}</b>}
                    </span>
                  )}
                  <p>
                    {shopOnly && lv === 0
                      ? `보석 상점 전용 동료 · ${h.attackType}`
                      : locked
                        ? `STAGE ${h.unlockStage} 해금 · ${h.attackType}`
                        : `${h.attackType} · ${h.attackInterval.toFixed(2)}초 · DPS ${formatGold(heroDps(h, lv || 1) * mult)}`}
                  </p>
                  <small className="ally-feature">{h.feature}</small>
                  {lv > 0 && (
                    <small className="ally-shards">
                      조각 {shards}
                      {nextCost !== null ? ` / ${nextCost} · ★${Math.max(1, stars) + 1} 승급` : " · 최대 성급"}
                    </small>
                  )}
                  {lv > 0 && skinEntry && (
                    <button
                      type="button"
                      className={`ally-skin-chip ${character.equippedAllySkins[h.id] === skinEntry[0] ? "on" : ""}`}
                      onClick={() => void toggleAllySkin(h.id, skinEntry[0])}
                    >
                      {skinEntry[1].name.split(" ")[0]} 스킨 {character.equippedAllySkins[h.id] === skinEntry[0] ? "장착 중" : "장착"}
                    </button>
                  )}
                </div>
                <div className="ally-card-actions">
                  {shopOnly && lv === 0 ? (
                    <button type="button" disabled={redGems < (gemCost ?? 0)} onClick={() => void buyShopAlly(h.id)}>
                      💎 {gemCost}
                    </button>
                  ) : (
                    <button type="button" disabled={locked || save.gold < cost} onClick={() => buyHero(h.id)}>
                      {lv === 0 ? "소환" : "레벨업"}
                    </button>
                  )}
                  {lv > 0 && nextCost !== null && (
                    <button
                      type="button"
                      className="ally-star-up"
                      disabled={shards < nextCost}
                      onClick={() => void starUpAlly(h.id)}
                    >
                      ★ 승급
                    </button>
                  )}
                  {lv > 0 && !expedition && (
                    <button
                      type="button"
                      className={`ally-party-toggle ${inParty ? "benched-action" : ""}`}
                      onClick={() => void toggleParty(h.id)}
                    >
                      {inParty ? "벤치로" : "출전"}
                    </button>
                  )}
                  {lv > 0 && expedition && (
                    <span className="ally-expedition-status">
                      파견 중 · {Math.ceil(expeditionLeft / 60000)}분 남음
                    </span>
                  )}
                  {lv > 0 && !inParty && !expedition && character.expeditions.length < EXPEDITION_MAX && (
                    <span className="ally-expedition-send">
                      {EXPEDITION_HOURS.map((hours) => (
                        <button key={hours} type="button" onClick={() => void sendExpedition(h.id, hours)}>
                          {hours}h
                        </button>
                      ))}
                    </span>
                  )}
                </div>
              </article>
            );
          })}</div>}

        {tab === "skills" && (
          <article className="titans-card skill-preset-card">
            <div className="party-panel-head">
              <strong>스킬 프리셋</strong>
              <small>학습한 스킬만 장착됩니다 · 예상 DPS 보정 +{skillDpsPreview}%</small>
            </div>
            <div className="preset-row">
              {SKILL_PRESETS.map((preset) => (
                <button key={preset.id} type="button" onClick={() => applyPreset(preset.ids)} title={preset.desc}>
                  <b>{preset.name}</b>
                  <small>{preset.desc}</small>
                </button>
              ))}
            </div>
          </article>
        )}
        {tab === "skills" &&
          SKILLS.map((sk) => {
            const learned = save.skillInventory.learned.includes(sk.id);
            const equipped = save.skillInventory.equipped[sk.slot] === sk.id;
            const level = save.skillInventory.levels[sk.id];
            const learnedInType = SKILLS.filter((skill) => skill.slot === sk.slot && save.skillInventory.learned.includes(skill.id)).length;
            const upgradeCost = Math.floor(240 * Math.pow(1.75, Math.max(0, level - 1)));
            const beatSkill = BEAT_SKILL_BY_SLOT[sk.slot];
            const mastery = character.beatSkills[beatSkill];
            const slotLevel = slotLevels(character)[sk.slot];
            const toNext = masteryToNextSlotLevel(mastery);
            return <article key={sk.id} className={`titans-card skill-learn-card ${equipped ? "equipped" : ""} ${slotLevel <= 0 ? "slot-locked" : ""}`}>
              <SkillIcon id={sk.id} />
              <div>
                <strong>{sk.name} · {sk.slot} · {sk.element}</strong>
                <p>{sk.desc} · Lv.{save.skillInventory.levels[sk.id]}/{sk.maxLevel}</p>
                <small className={`slot-link ${slotLevel <= 0 ? "locked" : ""}`}>
                  <em>{SKILL_LABEL[beatSkill]}</em> 숙련 {mastery} · 슬롯 {slotLevel > 0 ? `Lv.${slotLevel}` : "잠김"}
                  {toNext !== null && ` · 다음까지 ${toNext}`}
                  {slotLevel > 0 && ` · 방치 효율 +${(slotLevel * IDLE.ratePerSlotLevel * 100).toFixed(1)}%p`}
                </small>
                {!learned && <small>학습 비용 SP {sk.learnSpCost} · 코어 {sk.learnCoreCost} · {sk.slot} {learnedInType}/{skillTypeCapacity}</small>}
              </div>
              <div className="skill-card-actions">
                <button type="button" disabled={!learned && (learnedInType >= skillTypeCapacity || skillPoints < sk.learnSpCost || save.skillInventory.skillCores < sk.learnCoreCost)} onClick={() => learned ? toggleSkill(sk.id) : void learnSkill(sk.id)}>
                  {learned ? equipped ? "해제" : "장착" : "학습"}
                </button>
                {learned && <button type="button" className="skill-level-button" disabled={level >= sk.maxLevel || save.gold < upgradeCost} onClick={() => upgradeSkill(sk.id)}>{level >= sk.maxLevel ? "MAX" : `${formatGold(upgradeCost)}G 강화`}</button>}
              </div>
            </article>
          })}
        {tab === "skills" && (
          <p className="skill-wallet">
            SP {skillPoints} · 스킬 코어 {save.skillInventory.skillCores} · 종류별 보유 한도 {skillTypeCapacity}/10
            <br />레벨 10마다 종류별 한도 +1 · 시동기 → 연계 A → 연계 B → 마무리 → 패시브
            <br />
            <b>
              활성 슬롯 합 {activeSlotLevelSum(character, save.skillInventory.equipped)} · 방치 효율{" "}
              {(idleRate(character, save.skillInventory.equipped) * 100).toFixed(1)}% / {IDLE.rateCap * 100}%
            </b>
          </p>
        )}
        {tab === "premium" && (
          <>
            <nav className="premium-category-tabs" aria-label="상점 카테고리">
              {([['currency','재화'],['package','패키지'],['ally','동료'],['title','칭호'],['weapon','무기']] as const).map(([id,label])=><button key={id} type="button" className={premiumCategory===id?'on':''} onClick={()=>setPremiumCategory(id)}>{label}</button>)}
            </nav>
            {/* 보석 소비형 상품 (LIVEOPS §3.3) — 확정 구매, 확률 없음 */}
            {premiumCategory === "ally" && <article className="titans-card premium-product-card gem-product">
              <CurrencyIcon kind="gem" />
              <div>
                <strong>성급 조각 선택팩 <em>주 {SHARD_PACK_WEEKLY_LIMIT}회/동료</em></strong>
                <p>원하는 동료의 조각 ×{SHARD_PACK_AMOUNT} · 확정 지급</p>
                <select
                  className="shard-pack-select"
                  value={shardPackTarget}
                  onChange={(e) => setShardPackTarget(e.target.value as TitanHeroId)}
                  aria-label="조각 받을 동료"
                >
                  {HEROES.filter((h) => save.heroes[h.id] > 0).map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} · 이번 주 {shardPackBoughtThisWeek(h.id)}/{SHARD_PACK_WEEKLY_LIMIT}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                disabled={redGems < 120 || shardPackBoughtThisWeek(shardPackTarget) >= SHARD_PACK_WEEKLY_LIMIT || save.heroes[shardPackTarget] <= 0}
                onClick={() => void buyShardPack()}
              >
                💎 120
              </button>
            </article>}
            {/* 무기 외형 — 강화 티어 실루엣은 유지, 칼날 색·오라만 커스텀 */}
            {premiumCategory === "weapon" && Object.entries(WEAPON_SKINS).map(([skinId, def]) => {
              const owned = character.ownedWeaponSkins.includes(skinId);
              const equipped = character.equippedWeaponSkin === skinId;
              return (
                <article key={skinId} className="titans-card premium-product-card gem-product blade-product">
                  <span className="blade-thumb" style={{ "--blade-aura": def.aura } as CSSProperties} aria-hidden="true">
                    <i className="premium-weapon-thumb" style={{ backgroundImage:`url(${assetUrl("titans/equipment/weapons/premium-weapon-sheet.png")})`, backgroundPosition:`${def.spriteIndex / 2 * 100}% center` }} />
                  </span>
                  <div>
                    <strong>{def.name} <em>무기 외형</em></strong>
                    <p>{def.desc}</p>
                  </div>
                  <button
                    type="button"
                    disabled={!owned && redGems < def.gemCost}
                    onClick={() => void (owned ? toggleWeaponSkin(skinId) : buyWeaponSkin(skinId))}
                  >
                    {owned ? (equipped ? "해제" : "장착") : `💎 ${def.gemCost}`}
                  </button>
                </article>
              );
            })}
            {/* 칭호 — 프로필 과시 축. 표시 변경은 마이페이지에서 */}
            {premiumCategory === "title" && Object.entries(TITLES).map(([titleId, def]) => {
              const owned = character.ownedTitles.includes(titleId);
              return (
                <article key={titleId} className="titans-card premium-product-card gem-product title-product">
                  <span className="title-thumb" style={{ color: def.color }} aria-hidden="true">✦</span>
                  <div>
                    <strong style={{ color: def.color }}>{def.name} <em>칭호</em></strong>
                    <p>{def.desc}</p>
                  </div>
                  <button type="button" disabled={owned || redGems < def.gemCost} onClick={() => void buyTitle(titleId)}>
                    {owned ? "보유 중" : `💎 ${def.gemCost}`}
                  </button>
                </article>
              );
            })}
            {/* 재화 팩 — 수량이 진행도 비례라 후반에도 유의미하다 */}
            {premiumCategory === "currency" && <><article className="titans-card premium-product-card gem-product">
              <CurrencyIcon kind="gold" />
              <div>
                <strong>황금 보급 상자</strong>
                <p>사냥터 골드 +{formatGold(goldPackAmount(character))} · 최고 스테이지 비례</p>
              </div>
              <button type="button" disabled={redGems < GEM_PACK.goldPackCost} onClick={() => void buyGoldPack()}>
                💎 {GEM_PACK.goldPackCost}
              </button>
            </article>
            <article className="titans-card premium-product-card gem-product">
              <CurrencyIcon kind="gem" />
              <div>
                <strong>강화석 상자</strong>
                <p>강화석 +{GEM_PACK.materialPackAmount} · 대장간·펫 간식 재료</p>
              </div>
              <button type="button" disabled={redGems < GEM_PACK.materialPackCost} onClick={() => void buyMaterialPack()}>
                💎 {GEM_PACK.materialPackCost}
              </button>
            </article>
            <article className="titans-card premium-product-card gem-product">
              <CurrencyIcon kind="gem" />
              <div>
                <strong>스킬 코어 상자</strong>
                <p>스킬 코어 +{GEM_PACK.corePackAmount} · 새 스킬 학습 재료</p>
              </div>
              <button type="button" disabled={redGems < GEM_PACK.corePackCost} onClick={() => void buyCorePack()}>
                💎 {GEM_PACK.corePackCost}
              </button>
            </article>
            <article className="titans-card premium-product-card gem-product">
              <img className="pack-icon" src={assetUrl("ui/idle/expedition.svg")} alt="" aria-hidden="true" />
              <div>
                <strong>파견 즉시 완료권</strong>
                <p>
                  진행 중 파견 1건 즉시 귀환
                  {character.expeditions.filter((e) => e.endsAt > Date.now()).length === 0 && " · 진행 중인 파견 없음"}
                </p>
              </div>
              <button
                type="button"
                disabled={
                  redGems < GEM_PACK.expeditionFinishCost ||
                  character.expeditions.filter((e) => e.endsAt > Date.now()).length === 0
                }
                onClick={() => void buyExpeditionFinish()}
              >
                💎 {GEM_PACK.expeditionFinishCost}
              </button>
            </article></>}
            {/* 동료 스킨(코스튬) — 외형 전용 확정 구매. 얼터너티브(별도 동료)와 다른 축 */}
            {premiumCategory === "ally" && Object.entries(ALLY_SKINS).map(([skinId, skinDef]) => {
              const owned = character.ownedAllySkins.includes(skinId);
              return (
                <article key={skinId} className="titans-card premium-product-card gem-product skin-product">
                  <span className="skin-thumb" style={{ backgroundImage: `url(${skinDef.url})` }} aria-hidden="true" />
                  <div>
                    <strong>{skinDef.name} <em>코스튬</em></strong>
                    <p>{skinDef.desc} · 동료 탭에서 장착/해제</p>
                  </div>
                  <button
                    type="button"
                    disabled={owned || redGems < skinDef.gemCost}
                    onClick={() => void buyAllySkin(skinId)}
                  >
                    {owned ? "보유 중" : `💎 ${skinDef.gemCost}`}
                  </button>
                </article>
              );
            })}
            {premiumCategory === "currency" && <article className="titans-card premium-product-card gem-product">
              <CurrencyIcon kind="gem" />
              <div>
                <strong>방치 가속권 24h {character.idleBoostUntil > Date.now() && <em>적용 중</em>}</strong>
                <p>24시간 동안 방치 산출 2배 · 중첩 불가</p>
              </div>
              <button
                type="button"
                disabled={redGems < 80 || character.idleBoostUntil > Date.now()}
                onClick={() => void buyIdleBooster()}
              >
                💎 80
              </button>
            </article>}
          </>
        )}
        {/* 결제 준비 (점검표 #14): 강한 유료 패키지는 D3 잔존(출석 3일) 또는 Lv.20 전에는 숨긴다 */}
        {tab === "premium" && premiumCategory === "package" && !paidProductsUnlocked && (
          <p className="paid-gate-note">모험가 세트·캐릭터·월정액 상품은 출석 3일차(또는 Lv.20)부터 열립니다 — 먼저 성장 구조를 충분히 경험해 보세요.</p>
        )}
        {tab === "premium" && premiumCategory === "package" && STORE_PRODUCTS.filter((product) => product.visible).filter((product) => paidProductsUnlocked || product.id.startsWith("gems")).map((product) => {
          const claimed = character.claimedRewards.includes(`free-store-v1:${product.id}`);
          // 실결제 전용 상품(캐릭터·월정액)은 무료 체험 지급 대상이 아니다 — Play Billing 연동 후 판매
          const paidOnly = product.id.startsWith("char-") || product.id === "patron-30d";
          return <article key={product.id} className="titans-card premium-product-card">
          <CurrencyIcon kind={product.id.startsWith("gems") ? "gem" : "gold"} />
          <div><strong>{product.name} {product.badge && <em>{product.badge}</em>}</strong><p>{product.description}</p><small>{product.contents.join(" · ")}</small></div>
          {paidOnly ? (
            <button type="button" disabled title="스토어 결제 연동 후 판매됩니다">{product.displayPrice}</button>
          ) : (
            <button type="button" disabled={claimed || claimingProduct !== null} onClick={() => void claimFreeProduct(product.id)}>{claimed ? "수령 완료" : claimingProduct === product.id ? "지급 중…" : "무료 1회"}</button>
          )}
        </article>})}
      </section>

      {toast && <div className="titans-toast">{toast}</div>}

      {coach && (
        <button
          type="button"
          className={`coach-bubble coach-${coach.target}`}
          onClick={() => {
            if (coach.target === "heroes") setTab("heroes");
            if (coach.target === "sword") setTab("sword");
          }}
        >
          <span className="coach-hand" aria-hidden="true">☝</span>
          {coach.text}
        </button>
      )}

      {idleReport && (
        <IdleReturnModal
          result={idleReport.result}
          stage={idleReport.stage}
          bottleneck={idleReport.bottleneck}
          onClaim={() => claimIdle()}
          onGoContent={(content) => claimIdle(() => onOpenContent(content))}
        />
      )}

      {unlockBanner !== null && UNLOCK_BANNER[unlockBanner] && (
        <div className="content-unlock-banner" role="status">
          <span className="unlock-rays" aria-hidden="true" />
          <img src={assetUrl("ui/idle/unlock-crest.svg")} alt="" aria-hidden="true" />
          <b>{UNLOCK_BANNER[unlockBanner].title}</b>
          <small>{UNLOCK_BANNER[unlockBanner].desc}</small>
        </div>
      )}

      {gateNotice && (
        <AreaGateModal
          pioneeredArea={character.pioneeredArea}
          onGoDodge={() => {
            setGateNotice(false);
            onOpenContent("dodge");
          }}
          onDismiss={() => setGateNotice(false)}
        />
      )}
    </div>
  );
}
