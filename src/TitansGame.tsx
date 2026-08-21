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
import { sfxGateBlocked } from "./ui/sfx";
import { EquippedCharacter } from "./ui/EquippedCharacter";
import { ContentIcon } from "./ui/ContentIcon";
import { CurrencyIcon } from "./ui/CurrencyIcon";
import { SkillIcon } from "./ui/SkillIcon";
import { ShoulderIcon } from "./ui/ShoulderIcon";
import { SHOULDER_DEFINITIONS } from "./equipment/shoulders";
import { STORE_PRODUCTS } from "./economy/productCatalog";
import { unconfiguredPaymentAdapter } from "./payments/adapter";
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
  const [character, setCharacter] = useState<CharacterProgress>(() => emptyCharacterProgress());
  const [idleReport, setIdleReport] = useState<{
    result: IdleYield;
    stage: number;
    bottleneck: IdleBottleneck;
  } | null>(null);
  const [gateNotice, setGateNotice] = useState(false);
  const [battlePhase, setBattlePhase] = useState<BattlePhase>("combat");
  const [monsterAction, setMonsterAction] = useState<"idle" | "prepare" | "attack">("idle");

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
  const allyAttackAcc = useRef<Record<TitanHeroId, number>>({ mia: 0, leon: .18, sera: .36, garen: .54, ari: .72, nox: .9 });
  const autoAttackAcc = useRef(0);
  const attackUntil = useRef(0);
  const animModeRef = useRef<"idle" | "attack">("idle");
  const battlePhaseRef = useRef<BattlePhase>("combat");
  const battleTimers = useRef<number[]>([]);
  const pendingStageRef = useRef<number | null>(null);

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

  const spawn = useCallback((stage: number, nextWave: number, asBoss: boolean) => {
    const isChest = !asBoss && Math.random() < 0.04;
    const mhp = monsterHp(stage, asBoss) * (isChest ? 1.6 : 1);
    setWave(nextWave);
    setBoss(asBoss);
    setChesterson(isChest);
    setHp(mhp);
    setMaxHp(mhp);
    setBossLeft(BOSS_TIME_SEC);
    waveRef.current = nextWave;
    bossRef.current = asBoss;
    chestRef.current = isChest;
    hpRef.current = mhp;
    bossLeftRef.current = BOSS_TIME_SEC;
  }, []);

  useEffect(() => {
    let cancelled = false;
    preloadTitanSheets();
    void Promise.all([loadTitansSave(userHash), loadCharacterProgress(userHash)]).then(([loaded, progress]) => {
      if (cancelled) return;
      // 개척하지 않은 지역으로는 진입할 수 없다 — 저장값이 앞서 있으면 경계로 되돌린다.
      const ceiling = stageCeilingFor(progress.pioneeredArea);
      const stage = Math.min(loaded.stage, ceiling);
      const since = progress.idleClaimedAt || loaded.lastActiveAt;
      const awaySeconds = Math.max(0, (Date.now() - since) / 1000);
      const result = computeIdleYield(progress, stage, loaded.skillInventory.equipped, awaySeconds);

      setSave({ ...loaded, stage, lastActiveAt: Date.now() });
      setCharacter(progress);
      setEquippedShoulder(progress.equippedShoulder);
      setSkillPoints(progress.skillPoints);
      setRedGems(progress.redGems);

      // 1분 미만 이탈은 정산 화면을 띄우지 않는다 (탭 전환마다 모달이 뜨면 피로하다).
      if (result.seconds >= 60 && result.gold > 0) {
        setIdleReport({
          result,
          stage,
          bottleneck: idleBottleneck(progress, result, stage, progress.pioneeredArea),
        });
      } else {
        void updateCharacterProgress(userHash, (current) => ({ ...current, idleClaimedAt: Date.now() }));
      }

      spawn(stage, 1, false);
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
      void updateCharacterProgress(userHash, (current) => ({
        ...current,
        sharedCoins: current.sharedCoins + report.result.gold,
        exp: current.exp + report.result.exp,
        enhancementMaterials: current.enhancementMaterials + report.result.materials,
        idleClaimedAt: Date.now(),
      })).then((next) => {
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
      window.setTimeout(() => setImpact(null), crit ? 150 : 90);
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
      const goldGain =
        killGold(s.stage, wasBoss, chestRef.current) + (wasBoss ? stageClearBonus(s.stage) : 0);

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
      if (battlePhaseRef.current !== "combat") return;
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
      if (battlePhaseRef.current === "combat" && document.visibilityState !== "hidden") {
        const autoInterval = Math.max(.48, 1.08 - Math.min(.6, saveRef.current.equipmentTraining.weaponMastery * .012));
        autoAttackAcc.current += dt;
        if (autoAttackAcc.current >= autoInterval) {
          autoAttackAcc.current %= autoInterval;
          attackUntil.current = performance.now() + ATTACK_CLIP_MS;
          animModeRef.current = "attack";
          setAnimMode("attack");
          setFrameIdx(0);
          pushFx("slash", 31, 45);
          applyDamage(playerIdleDps(saveRef.current.equipmentTraining.weaponMastery), false, { fromAlly: "tap" });
        }
      } else {
        autoAttackAcc.current = 0;
      }

      if (battlePhaseRef.current === "combat" && document.visibilityState !== "hidden") {
        const shoulderBoost = 1 + saveRef.current.equipmentTraining.shoulderMastery * .025;
        for (const h of HEROES) {
          const level = saveRef.current.heroes[h.id];
          if (level <= 0) continue;
          allyAttackAcc.current[h.id] += dt;
          if (allyAttackAcc.current[h.id] < h.attackInterval) continue;
          allyAttackAcc.current[h.id] %= h.attackInterval;
          setAllyPulse((prev) => ({ ...prev, [h.id]: (prev[h.id] ?? 0) + 1 }));
          pushFx("ally", 40 + Math.random() * 18, 55 + Math.random() * 10, h.hue);
          applyDamage(heroDps(h, level) * h.attackInterval * war * shoulderBoost, false, { fromAlly: h.id });
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
  }, [ready, applyDamage, spawn]);

  useEffect(() => {
    if (!ready || battlePhase !== "combat") {
      setMonsterAction("idle");
      return;
    }
    let prepareTimer = 0;
    let recoverTimer = 0;
    const trigger = () => {
      setMonsterAction("prepare");
      prepareTimer = window.setTimeout(() => setMonsterAction("attack"), boss ? 360 : 220);
      recoverTimer = window.setTimeout(() => setMonsterAction("idle"), boss ? 880 : 620);
    };
    const interval = window.setInterval(trigger, boss ? 2100 : 2900);
    const first = window.setTimeout(trigger, boss ? 900 : 1400);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(first);
      window.clearTimeout(prepareTimer);
      window.clearTimeout(recoverTimer);
    };
  }, [battlePhase, boss, ready]);

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

  const previewPurchase = async (productId: string) => {
    const result = await unconfiguredPaymentAdapter.purchase(productId);
    if (result.status === "not-configured") flash("결제 연동 준비 중 · 실제 결제는 발생하지 않습니다");
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
  const label = monsterLabel(kind, chesterson, save.stage);
  const dps = totalHeroDps(save.heroes) + playerIdleDps(save.equipmentTraining.weaponMastery);
  const tap = tapDamage(save.equipmentTraining.weaponMastery + Math.floor(forgedWeaponLevel * 1.5));
  const now = performance.now();
  const allies = useMemo(
    () => HEROES.filter((h) => save.heroes[h.id] > 0),
    [save.heroes],
  );

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
        <div className={`titans-hero ${animMode} ${skillVisual ? `skill-${skillVisual}` : ""}`}>
          <div className={`titans-hero-facing facing-${animMode}`}>
            <EquippedCharacter mode={animMode} frame={frameIdx} weaponLevel={forgedWeaponLevel} shoulder={equippedShoulder} />
          </div>
        </div>

        <div className="titans-allies">
          {allies.map((h) => (
            <AllyArt
              key={h.id}
              id={h.id}
              attacking
              pulse={allyPulse[h.id] ?? 0}
            />
          ))}
        </div>

        <div className={`titans-monster kind-${kind} action-${monsterAction} ${monsterHit % 2 ? "hit" : ""} ${impact === "critical" ? "critical" : ""}`}>
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
            <i style={{ width: `${(bossLeft / BOSS_TIME_SEC) * 100}%` }} />
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

        {tab === "heroes" &&
          HEROES.map((h) => {
            const lv = save.heroes[h.id];
            const locked = save.stage < h.unlockStage;
            const cost = heroUpgradeCost(h, lv);
            return (
              <article key={h.id} className="titans-card">
                <AllyArt id={h.id} />
                <div>
                  <strong>
                    {h.name} {lv > 0 ? `· Lv.${lv}` : ""}
                  </strong>
                  <p>
                    {locked
                      ? `STAGE ${h.unlockStage} 해금 · ${h.attackType}`
                      : `${h.attackType} · ${h.attackInterval.toFixed(2)}초 · DPS ${formatGold(heroDps(h, lv || 1))}`}
                  </p>
                  <small className="ally-feature">{h.feature}</small>
                </div>
                <button type="button" disabled={locked || save.gold < cost} onClick={() => buyHero(h.id)}>
                  {lv === 0 ? "소환" : "레벨업"}
                </button>
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
        {tab === "premium" && STORE_PRODUCTS.filter((product) => product.visible).map((product) => <article key={product.id} className="titans-card premium-product-card">
          <CurrencyIcon kind={product.id.startsWith("gems") ? "gem" : "gold"} />
          <div><strong>{product.name} {product.badge && <em>{product.badge}</em>}</strong><p>{product.description}</p><small>{product.contents.join(" · ")}</small></div>
          <button type="button" onClick={() => void previewPurchase(product.id)}>{product.displayPrice}</button>
        </article>)}
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
