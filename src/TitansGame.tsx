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
  type TitansSave,
} from "./titans/model";
import { AllyArt, MonsterArt } from "./titans/SpriteArt";
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
  ALLY_RARITY,
  ALLY_ROLE,
  EXPEDITION_HOURS,
  EXPEDITION_MAX,
  RARITY_COLOR,
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
};

type ShopTab = "sword" | "heroes" | "skills" | "premium";

type FloatText = {
  id: number;
  x: number;
  y: number;
  text: string;
  crit: boolean;
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
  return { strike: 0, crit: 0, clone: 0, warcry: 0, steel: 0 };
}

export function TitansGame({ insets, userHash, forgedWeaponLevel = 0, onOpenContent }: TitansGameProps) {
  const [save, setSave] = useState<TitansSave>(() => defaultTitansSave());
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<ShopTab>("sword");
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
  const [equippedShoulder, setEquippedShoulder] = useState<ShoulderId | null>(null);
  const [skillPoints, setSkillPoints] = useState(0);
  const [redGems, setRedGems] = useState(0);
  const [claimingProduct, setClaimingProduct] = useState<string | null>(null);
  const [character, setCharacter] = useState<CharacterProgress>(() => emptyCharacterProgress());
  const [idleReport, setIdleReport] = useState<{
    result: IdleYield;
    stage: number;
    bottleneck: IdleBottleneck;
  } | null>(null);
  const [gateNotice, setGateNotice] = useState(false);
  const [wallBanner, setWallBanner] = useState(false);
  const [shardPackTarget, setShardPackTarget] = useState<TitanHeroId>("mia");
  const [battlePhase, setBattlePhase] = useState<BattlePhase>("combat");
  const [monsterAction, setMonsterAction] = useState<"idle" | "prepare" | "attack">("idle");
  const [formationEngaged, setFormationEngaged] = useState(false);
  const [formationReady, setFormationReady] = useState(false);

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
  const allyAttackAcc = useRef<Record<TitanHeroId, number>>({ mia: 0, leon: .18, sera: .36, garen: .54, ari: .72, nox: .9, luna: .3, volt: .6 });
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
    window.requestAnimationFrame(() => setFormationEngaged(true));
    const approachMs = asBoss ? 1450 : 1250;
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
    });
    return () => {
      cancelled = true;
      if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
      battleTimers.current.forEach(window.clearTimeout);
      battleTimers.current = [];
    };
  }, [userHash, spawn]);

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
        };
      }).then((next) => {
        setCharacter(next);
        setSkillPoints(next.skillPoints);
        then?.();
      });
    },
    [idleReport, userHash],
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
    setFx((prev) => [...prev.slice(-22), { id, kind, x, y, hue }]);
    window.setTimeout(() => {
      setFx((prev) => prev.filter((f) => f.id !== id));
    }, kind === "slash" ? 320 : kind === "hit" || kind === "ally" ? 420 : 850);
  };

  const pushFloat = (dmg: number, crit: boolean, clientX?: number, clientY?: number) => {
    const rect = fieldRef.current?.getBoundingClientRect();
    const x = clientX && rect ? ((clientX - rect.left) / rect.width) * 100 : 58 + Math.random() * 16;
    const y = clientY && rect ? ((clientY - rect.top) / rect.height) * 100 : 30 + Math.random() * 16;
    const id = ++floatId.current;
    setFloats((prev) => [...prev.slice(-18), { id, x, y, text: formatGold(dmg), crit }]);
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
      opts?: { clientX?: number; clientY?: number; fromAlly?: TitanHeroId | "tap" },
    ) => {
      if (raw <= 0 || battlePhaseRef.current !== "combat") return;
      const dealt = Math.floor(raw);
      pushFloat(dealt, crit, opts?.clientX, opts?.clientY);
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
      if (wasBoss) bossFailStreakRef.current = 0;

      // 도감 마일스톤 보너스: 10/100/1,000 처치 → +2/4/8%
      const codexKills =
        (characterRef.current.monsterKills[killedKind] ?? 0) + (killCountsRef.current[killedKind] ?? 0);
      const codexMult = codexKills >= 1000 ? 1.08 : codexKills >= 100 ? 1.04 : codexKills >= 10 ? 1.02 : 1;

      // 오늘의 첫 보스 클리어 2배 (LIVEOPS §2.4)
      const today = new Date().toLocaleDateString("sv-SE");
      const firstClearToday = wasBoss && characterRef.current.firstClearDates.hunt !== today;

      // 아기 슬라임 펫(§1) — 사냥 골드 가산
      const petGold = 1 + activePetEffect(characterRef.current.pets, characterRef.current.activePet, "gold");
      const goldGain = Math.floor(
        (killGold(s.stage, wasBoss, chestRef.current) + (wasBoss ? stageClearBonus(s.stage) : 0)) *
          codexMult *
          petGold *
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
          if (born.length > 0) flash(`${PET_DEFS[born[0]].name} 부화! 마이페이지에서 확인하세요`);
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
          spawn(s.stage, waveRef.current + 1, false);
          battlePhaseRef.current = "combat";
          setBattlePhase("combat");
        }, 360);
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
      applyDamage(dmg, crit, { clientX, clientY, fromAlly: "tap" });
    },
    [applyDamage, computeTapHit],
  );

  // Player/ally auto attacks + boss timer. Damage lands with each visible attack.
  useEffect(() => {
    if (!ready) return;
    let last = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      const dt = Math.min(0.25, (now - last) / 1000);
      last = now;

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
          applyDamage(playerIdleDps(saveRef.current.equipmentTraining.weaponMastery), false, { fromAlly: "tap" });
        }
      } else {
        autoAttackAcc.current = 0;
      }

      if (battlePhaseRef.current === "combat" && formationReadyRef.current && document.visibilityState !== "hidden") {
        const shoulderBoost = 1 + saveRef.current.equipmentTraining.shoulderMastery * .025;
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
          applyDamage(heroDps(h, level) * starMultiplier(effectiveStars(characterRef.current.allyStars[h.id], level)) * h.attackInterval * war * shoulderBoost * synergyDps, false, { fromAlly: h.id });
        }
      }

      if (bossRef.current) {
        const left = bossLeftRef.current - dt;
        bossLeftRef.current = left;
        setBossLeft(Math.max(0, left));
        if (left <= 0) {
          flash("보스 실패 · 다시 도전!");
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
            setWallBanner(true);
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
      recoverTimer = window.setTimeout(() => setMonsterAction("idle"), boss ? 900 : 860);
    };
    const interval = window.setInterval(trigger, boss ? 2100 : 2900);
    const first = window.setTimeout(trigger, boss ? 900 : 1400);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(first);
      window.clearTimeout(prepareTimer);
      window.clearTimeout(recoverTimer);
    };
  }, [battlePhase, boss, formationReady, ready]);

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

  const trainEquipment = (slot: "weapon" | "shoulder") => {
    const key = slot === "weapon" ? "weaponMastery" : "shoulderMastery";
    const level = save.equipmentTraining[key];
    const cost = equipmentTrainingCost(slot, level);
    if (save.gold < cost) return;
    setSave((prev) => ({
      ...prev,
      gold: prev.gold - cost,
      equipmentTraining: { ...prev.equipmentTraining, [key]: prev.equipmentTraining[key] + 1 },
    }));
    flash(`${slot === "weapon" ? "무기" : "견갑"} 숙련 Lv.${level + 1}`);
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
    const next = await updateCharacterProgress(userHash, (current) =>
      current.expeditions.length >= EXPEDITION_MAX || current.expeditions.some((e) => e.allyId === id)
        ? current
        : {
            ...current,
            expeditions: [...current.expeditions, { allyId: id, endsAt: Date.now() + hours * 3600 * 1000, hours }],
          },
    );
    setCharacter(next);
    flash(`${HEROES.find((h) => h.id === id)?.name} ${hours}시간 파견 출발`);
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
  };

  const buyHero = (id: TitanHeroId) => {
    const def = HEROES.find((h) => h.id === id);
    if (!def) return;
    if (save.stage < def.unlockStage) return;
    const lv = save.heroes[id];
    const cost = heroUpgradeCost(def, lv);
    if (save.gold < cost) return;
    setSave((prev) => ({
      ...prev,
      gold: prev.gold - cost,
      heroes: { ...prev.heroes, [id]: prev.heroes[id] + 1 },
    }));
    flash(lv === 0 ? `${def.name} 소환!` : `${def.name} Lv.${lv + 1}`);
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
    if (!save.skillInventory.learned.includes(id) || save.skillInventory.equipped[def.slot] !== id || id === "steel") return;
    if (cdsRef.current[id] > 0) return;
    const now = performance.now();
    setSkillVisual(id);
    window.setTimeout(() => setSkillVisual((active) => (active === id ? null : active)), 820);
    pushFx(id, 56, 44, id === "strike" ? 48 : id === "crit" ? 350 : id === "clone" ? 192 : 28);
    setCds((prev) => ({ ...prev, [id]: def.cooldownSec }));
    if (id === "strike") {
      playAttackAnim();
      pushFx("slash", 30, 40);
      const { dmg } = computeTapHit();
      applyDamage(dmg * 40, true);
      flash("천상의 일격!");
      return;
    }
    if (id === "crit") {
      setBuffs((b) => ({ ...b, critUntil: now + def.durationSec * 1000 }));
      flash("치명 폭풍!");
    } else if (id === "clone") {
      setBuffs((b) => ({ ...b, cloneUntil: now + def.durationSec * 1000 }));
      flash("그림자 분신!");
    } else if (id === "warcry") {
      setBuffs((b) => ({ ...b, warcryUntil: now + def.durationSec * 1000 }));
      flash("전장의 함성!");
    }
  };

  const learnSkill = async (id: TitanSkillId) => {
    const def = SKILLS.find((skill) => skill.id === id);
    if (!def || save.skillInventory.learned.includes(id)) return;
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
    <div className="titans-layer" style={pad}>
      <header className="titans-header">
        <button type="button" className="titans-back" onClick={() => onOpenContent("profile")}>
          <span className="mypage-icon" aria-hidden="true" /> 마이페이지
        </button>
        <div className="titans-wallet">
          <span><CurrencyIcon kind="gold" /><strong>{formatGold(save.gold)}</strong></span>
          <span><CurrencyIcon kind="gem" /><strong>{formatGold(redGems)}</strong></span>
        </div>
      </header>

      <nav className="titans-content-tabs" aria-label="성장 콘텐츠">
        <button type="button" className="on"><ContentIcon name="hunt" />사냥터</button>
        <button type="button" onClick={() => onOpenContent("dodge")}><ContentIcon name="dodge" />화살 원정</button>
        <button type="button" onClick={() => onOpenContent("beat")}><ContentIcon name="beat" />비트 수련</button>
        <button type="button" onClick={() => onOpenContent("forge")}><ContentIcon name="forge" />대장간</button>
      </nav>

      <div className="titans-stagebar">
        <div>
          <p className="titans-kicker">TAP TITANS · RPG</p>
          <h1>
            STAGE {save.stage}
            {boss ? " BOSS" : bossReady ? " · 10/10 · 반복 사냥" : ` · ${wave}/${MOBS_PER_STAGE}`}
          </h1>
          <small className="titans-area-name">{area.name} · STAGE {area.stageFrom}–{area.stageTo >= 9999 ? "∞" : area.stageTo}</small>
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
        } as CSSProperties}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          if (battlePhase === "combat") doTap(e.clientX, e.clientY);
        }}
      >
        <div className="titans-background" aria-hidden="true" />
        <div className={`titans-hero ${formationEngaged ? "is-engaged" : ""} ${formationEngaged && !formationReady ? "is-approaching" : ""} ${animMode} ${skillVisual ? `skill-${skillVisual}` : ""}`}>
          <div className={`titans-hero-facing facing-${animMode}`}>
            <EquippedCharacter mode={animMode} frame={frameIdx} weaponLevel={forgedWeaponLevel} shoulder={equippedShoulder} character={character.activeCharacter} />
          </div>
        </div>

        <div className="titans-allies">
          {allies.map((h) => (
            <AllyArt
              key={h.id}
              id={h.id}
              attacking
              pulse={allyPulse[h.id] ?? 0}
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
            className={`titans-float ${f.crit ? "crit" : ""}`}
            style={{ left: `${f.x}%`, top: `${f.y}%` }}
          >
            {f.crit ? "CRITICAL " : ""}-{f.text}
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
              spawn(save.stage, MOBS_PER_STAGE, true);
              battlePhaseRef.current = "combat";
              setBattlePhase("combat");
            }}
          >
            보스 도전하기
          </button>
        )}

        <p className="titans-hint">
          탭 / 스페이스 · DPS {formatGold(dps)} · TAP {formatGold(tap)}
        </p>
      </section>

      <div className="titans-buffs">
        {now < buffs.critUntil && <span>치명</span>}
        {now < buffs.cloneUntil && <span>분신</span>}
        {now < buffs.warcryUntil && <span>함성</span>}
      </div>

      <div className="titans-skills-row">
        {SKILLS.map((sk) => {
          const learned = save.skillInventory.learned.includes(sk.id);
          const equipped = save.skillInventory.equipped[sk.slot] === sk.id;
          const cd = cds[sk.id];
          return (
            <button
              key={sk.id}
              type="button"
              className="titans-skill"
              disabled={!learned || !equipped || cd > 0 || sk.slot === "passive"}
              onClick={() => castSkill(sk.id)}
              title={sk.desc}
            >
              <SkillIcon id={sk.id} />
              <strong>{sk.name}</strong>
              <small>
                {!learned ? "미학습" : !equipped ? "미장착" : sk.slot === "passive" ? "PASSIVE" : cd > 0 ? `${cd.toFixed(1)}s` : "READY"}
              </small>
            </button>
          );
        })}
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
        <button type="button" className={tab === "premium" ? "on" : ""} onClick={() => setTab("premium")}>
          보석 상점
        </button>
      </div>

      <section className="titans-shop">
        {tab === "sword" && (
          <>
            <article className="titans-card equipment-training-card">
              <div className="training-item-icon weapon"><SwordArt level={Math.min(15, forgedWeaponLevel)} hue={tierAt(Math.min(15, forgedWeaponLevel)).hue} name="장착 대검" /></div>
              <div><strong>무기 숙련 · Lv.{save.equipmentTraining.weaponMastery}</strong><p>기본 공격력·자동 공격 속도·치명타 성장 · 다음 {formatGold(equipmentTrainingCost("weapon", save.equipmentTraining.weaponMastery))}G</p></div>
              <button type="button" disabled={save.gold < equipmentTrainingCost("weapon", save.equipmentTraining.weaponMastery)} onClick={() => trainEquipment("weapon")}>훈련</button>
            </article>
            <article className="titans-card equipment-training-card">
              <ShoulderIcon id={equippedShoulder} equipped={Boolean(equippedShoulder)} />
              <div><strong>{equippedShoulder ? SHOULDER_DEFINITIONS[equippedShoulder].name : "견갑 미장착"} · 숙련 Lv.{save.equipmentTraining.shoulderMastery}</strong><p>{equippedShoulder ? SHOULDER_DEFINITIONS[equippedShoulder].effect : "비트 수련에서 견갑을 획득하세요"} · 다음 {formatGold(equipmentTrainingCost("shoulder", save.equipmentTraining.shoulderMastery))}G</p></div>
              <button type="button" disabled={save.gold < equipmentTrainingCost("shoulder", save.equipmentTraining.shoulderMastery)} onClick={() => trainEquipment("shoulder")}>훈련</button>
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
            {expeditionsDone > 0 && (
              <button type="button" className="expedition-claim" onClick={() => void claimExpeditions()}>
                파견 {expeditionsDone}건 귀환 — 보상 받기
              </button>
            )}
          </article>
        )}
        {tab === "heroes" &&
          HEROES.map((h) => {
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
            return (
              <article key={h.id} className={`titans-card ally-card rarity-${rarity.toLowerCase()} ${inParty ? "in-party" : ""} ${expedition ? "on-expedition" : ""}`}>
                <AllyArt id={h.id} />
                <div>
                  <strong>
                    <em className="rarity-tag" style={{ color: RARITY_COLOR[rarity] }}>{rarity}</em>
                    <em className="role-tag">{ROLE_LABEL[ALLY_ROLE[h.id]]}</em>
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
          })}

        {tab === "skills" &&
          SKILLS.map((sk) => {
            const learned = save.skillInventory.learned.includes(sk.id);
            const equipped = save.skillInventory.equipped[sk.slot] === sk.id;
            const level = save.skillInventory.levels[sk.id];
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
                {!learned && <small>학습 비용 SP {sk.learnSpCost} · 코어 {sk.learnCoreCost}</small>}
              </div>
              <div className="skill-card-actions">
                <button type="button" disabled={!learned && (skillPoints < sk.learnSpCost || save.skillInventory.skillCores < sk.learnCoreCost)} onClick={() => learned ? toggleSkill(sk.id) : void learnSkill(sk.id)}>
                  {learned ? equipped ? "해제" : "장착" : "학습"}
                </button>
                {learned && <button type="button" className="skill-level-button" disabled={level >= sk.maxLevel || save.gold < upgradeCost} onClick={() => upgradeSkill(sk.id)}>{level >= sk.maxLevel ? "MAX" : `${formatGold(upgradeCost)}G 강화`}</button>}
              </div>
            </article>
          })}
        {tab === "skills" && (
          <p className="skill-wallet">
            SP {skillPoints} · 스킬 코어 {save.skillInventory.skillCores} · 시동기 → 연계 A → 연계 B → 마무리 → 패시브
            <br />
            <b>
              활성 슬롯 합 {activeSlotLevelSum(character, save.skillInventory.equipped)} · 방치 효율{" "}
              {(idleRate(character, save.skillInventory.equipped) * 100).toFixed(1)}% / {IDLE.rateCap * 100}%
            </b>
          </p>
        )}
        {tab === "premium" && (
          <>
            {/* 보석 소비형 상품 (LIVEOPS §3.3) — 확정 구매, 확률 없음 */}
            <article className="titans-card premium-product-card gem-product">
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
            </article>
            <article className="titans-card premium-product-card gem-product">
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
            </article>
          </>
        )}
        {tab === "premium" && STORE_PRODUCTS.filter((product) => product.visible).map((product) => {
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

      {idleReport && (
        <IdleReturnModal
          result={idleReport.result}
          stage={idleReport.stage}
          bottleneck={idleReport.bottleneck}
          onClaim={() => claimIdle()}
          onGoContent={(content) => claimIdle(() => onOpenContent(content))}
        />
      )}

      {wallBanner && (
        <div className="wall-banner" role="status">
          <div className="wall-banner-head">
            <b>DPS 벽</b>
            <span>보스가 제한시간을 버텨냅니다 — 지금 뚫는 법 셋</span>
            <button type="button" aria-label="닫기" onClick={() => setWallBanner(false)}>✕</button>
          </div>
          <div className="wall-banner-actions">
            <button type="button" onClick={() => { setWallBanner(false); onOpenContent("forge"); }}>
              <b>무한 재련</b><small>배율 +0.02/회</small>
            </button>
            <button type="button" onClick={() => { setWallBanner(false); setTab("heroes"); }}>
              <b>동료 성급</b><small>DPS 최대 ×7</small>
            </button>
            <button type="button" onClick={() => { setWallBanner(false); onOpenContent("profile"); }}>
              <b>환생</b><small>벽 {character.wallAreas.length}/3 지역</small>
            </button>
          </div>
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
