import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SafeInsets } from "./game/toss";
import {
  ATTACK_CLIP_MS,
  ATTACK_FRAMES,
  IDLE_FRAME_MS,
  IDLE_FRAMES,
  preloadFrames,
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
  stageClearBonus,
  swordUpgradeCost,
  tapDamage,
  totalHeroDps,
  type TitanHeroId,
  type TitanMonsterKind,
  type TitanSkillId,
  type TitansSave,
} from "./titans/model";
import { Stickman } from "./titans/Stickman";
import { loadTitansSave, saveTitansSave } from "./titans/storage";

type TitansGameProps = {
  insets: SafeInsets;
  userHash: string;
  onBack: () => void;
};

type ShopTab = "sword" | "heroes" | "skills";

type FloatText = {
  id: number;
  x: number;
  y: number;
  text: string;
  crit: boolean;
};

type FxBurst = {
  id: number;
  kind: "slash" | "hit" | "ally";
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

function emptyCds(): CooldownMap {
  return { strike: 0, crit: 0, clone: 0, warcry: 0 };
}

export function TitansGame({ insets, userHash, onBack }: TitansGameProps) {
  const [save, setSave] = useState<TitansSave>(() => defaultTitansSave());
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<ShopTab>("sword");
  const [wave, setWave] = useState(1);
  const [boss, setBoss] = useState(false);
  const [chesterson, setChesterson] = useState(false);
  const [hp, setHp] = useState(10);
  const [maxHp, setMaxHp] = useState(10);
  const [bossLeft, setBossLeft] = useState(BOSS_TIME_SEC);
  const [monsterHit, setMonsterHit] = useState(0);
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
  const [allyPulse, setAllyPulse] = useState<Record<string, number>>({});

  const saveRef = useRef(save);
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
  const dpsAcc = useRef(0);
  const attackUntil = useRef(0);
  const animModeRef = useRef<"idle" | "attack">("idle");

  useEffect(() => {
    saveRef.current = save;
  }, [save]);
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
    preloadFrames(IDLE_FRAMES);
    preloadFrames(ATTACK_FRAMES);
    void loadTitansSave(userHash).then((loaded) => {
      if (cancelled) return;
      setSave(loaded);
      spawn(loaded.stage, 1, false);
      setReady(true);
    });
    return () => {
      cancelled = true;
      if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    };
  }, [userHash, spawn]);

  useEffect(() => {
    if (!ready) return;
    void saveTitansSave(userHash, save);
  }, [ready, save, userHash]);

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
      const frames = attacking ? ATTACK_FRAMES : IDLE_FRAMES;
      const step = attacking ? ATTACK_CLIP_MS / ATTACK_FRAMES.length : IDLE_FRAME_MS;
      if (acc >= step) {
        const steps = Math.floor(acc / step);
        acc -= steps * step;
        setFrameIdx((i) => (i + steps) % frames.length);
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
    }, kind === "slash" ? 320 : 420);
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
      if (raw <= 0) return;
      const dealt = Math.floor(raw);
      pushFloat(dealt, crit, opts?.clientX, opts?.clientY);
      setMonsterHit((n) => n + 1);
      pushFx("hit", 72 + Math.random() * 10, 38 + Math.random() * 14);

      const next = hpRef.current - dealt;
      if (next > 0) {
        hpRef.current = next;
        setHp(next);
        return;
      }

      const s = saveRef.current;
      const wasBoss = bossRef.current;
      const goldGain =
        killGold(s.stage, wasBoss, chestRef.current) + (wasBoss ? stageClearBonus(s.stage) : 0);

      setSave((prev) => ({
        ...prev,
        gold: prev.gold + goldGain,
        totalKills: prev.totalKills + 1,
        bestStage: wasBoss ? Math.max(prev.bestStage, prev.stage + 1) : prev.bestStage,
        stage: wasBoss ? prev.stage + 1 : prev.stage,
      }));

      if (wasBoss) {
        flash(`보스 처치! +${formatGold(goldGain)}G · STAGE ${s.stage + 1}`);
        spawn(s.stage + 1, 1, false);
        return;
      }

      if (chestRef.current) flash(`황금 몬스터! +${formatGold(goldGain)}G`);
      if (waveRef.current >= MOBS_PER_STAGE) {
        spawn(s.stage, MOBS_PER_STAGE, true);
      } else {
        spawn(s.stage, waveRef.current + 1, false);
      }
    },
    [spawn],
  );

  const computeTapHit = () => {
    const now = performance.now();
    const base = tapDamage(saveRef.current.swordLevel);
    const clone = now < buffsRef.current.cloneUntil ? 2 : 1;
    const critChance = 0.08 + (now < buffsRef.current.critUntil ? 0.45 : 0);
    const crit = Math.random() < critChance;
    return { dmg: base * clone * (crit ? 3.2 : 1), crit };
  };

  const doTap = useCallback(
    (clientX?: number, clientY?: number) => {
      const { dmg, crit } = computeTapHit();
      playAttackAnim();
      pushFx("slash", 28 + Math.random() * 8, 42 + Math.random() * 10);
      setSave((prev) => ({ ...prev, totalTaps: prev.totalTaps + 1 }));
      applyDamage(dmg, crit, { clientX, clientY, fromAlly: "tap" });
    },
    [applyDamage],
  );

  // Hero auto DPS + boss timer + ally attack pulses
  useEffect(() => {
    if (!ready) return;
    let last = performance.now();
    let allyTick = 0;
    const id = window.setInterval(() => {
      const now = performance.now();
      const dt = Math.min(0.25, (now - last) / 1000);
      last = now;

      const war = now < buffsRef.current.warcryUntil ? 2.5 : 1;
      const dps = totalHeroDps(saveRef.current.heroes) * war;
      dpsAcc.current += dps * dt;
      if (dpsAcc.current >= 1) {
        const chunk = Math.floor(dpsAcc.current);
        dpsAcc.current -= chunk;
        applyDamage(chunk, false);
      }

      allyTick += dt;
      if (allyTick >= 0.55) {
        allyTick = 0;
        const hired = HEROES.filter((h) => saveRef.current.heroes[h.id] > 0);
        if (hired.length > 0) {
          const h = hired[Math.floor(Math.random() * hired.length)];
          setAllyPulse((prev) => ({ ...prev, [h.id]: (prev[h.id] ?? 0) + 1 }));
          pushFx("ally", 40 + Math.random() * 18, 55 + Math.random() * 10, h.hue);
        }
      }

      if (bossRef.current) {
        const left = bossLeftRef.current - dt;
        bossLeftRef.current = left;
        setBossLeft(Math.max(0, left));
        if (left <= 0) {
          flash("보스 실패 · 다시 도전!");
          spawn(saveRef.current.stage, 1, false);
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

  const buySword = () => {
    const cost = swordUpgradeCost(save.swordLevel);
    if (save.gold < cost) return;
    setSave((prev) => ({
      ...prev,
      gold: prev.gold - cost,
      swordLevel: prev.swordLevel + 1,
    }));
    flash(`검 Lv.${save.swordLevel + 1}`);
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
    if (save.swordLevel < def.unlockSword) return;
    if (cdsRef.current[id] > 0) return;
    const now = performance.now();
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

  const kind: TitanMonsterKind = monsterKind(save.stage, boss, chesterson);
  const label = monsterLabel(kind, chesterson);
  const dps = totalHeroDps(save.heroes);
  const tap = tapDamage(save.swordLevel);
  const now = performance.now();
  const frames = animMode === "attack" ? ATTACK_FRAMES : IDLE_FRAMES;
  const heroSrc = frames[frameIdx % frames.length] ?? IDLE_FRAMES[0];
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
        <button type="button" className="titans-back" onClick={onBack}>
          ← 게임 선택
        </button>
        <div className="titans-wallet">
          <span>GOLD</span>
          <strong>{formatGold(save.gold)}</strong>
        </div>
      </header>

      <div className="titans-stagebar">
        <div>
          <p className="titans-kicker">TAP TITANS · RPG</p>
          <h1>
            STAGE {save.stage}
            {boss ? " BOSS" : ` · ${wave}/${MOBS_PER_STAGE}`}
          </h1>
        </div>
        <div className="titans-best">
          최고
          <strong>{save.bestStage}</strong>
        </div>
      </div>

      <section
        ref={fieldRef}
        className={`titans-field ${boss ? "boss" : ""} ${chesterson ? "chest" : ""}`}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          doTap(e.clientX, e.clientY);
        }}
      >
        <div className={`titans-hero ${animMode}`}>
          <img src={heroSrc} alt="검의 주인" draggable={false} />
        </div>

        <div className="titans-allies">
          {allies.map((h, i) => (
            <Stickman
              key={`${h.id}-${allyPulse[h.id] ?? 0}`}
              hue={h.hue}
              name={h.name}
              attacking
              size={40 - Math.min(8, i)}
            />
          ))}
        </div>

        <div className={`titans-monster kind-${kind} ${monsterHit % 2 ? "hit" : ""}`}>
          <div className="titans-monster-body" />
          <strong>{label}</strong>
        </div>

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
            -{f.text}
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
          const locked = save.swordLevel < sk.unlockSword;
          const cd = cds[sk.id];
          return (
            <button
              key={sk.id}
              type="button"
              className="titans-skill"
              disabled={locked || cd > 0}
              onClick={() => castSkill(sk.id)}
              title={sk.desc}
            >
              <strong>{sk.name}</strong>
              <small>
                {locked ? `검 Lv.${sk.unlockSword}` : cd > 0 ? `${cd.toFixed(1)}s` : "READY"}
              </small>
            </button>
          );
        })}
      </div>

      <div className="titans-tabs">
        <button type="button" className={tab === "sword" ? "on" : ""} onClick={() => setTab("sword")}>
          검 업그레이드
        </button>
        <button type="button" className={tab === "heroes" ? "on" : ""} onClick={() => setTab("heroes")}>
          동료
        </button>
        <button type="button" className={tab === "skills" ? "on" : ""} onClick={() => setTab("skills")}>
          스킬
        </button>
      </div>

      <section className="titans-shop">
        {tab === "sword" && (
          <article className="titans-card">
            <div>
              <strong>검의 주인 · Lv.{save.swordLevel}</strong>
              <p>
                탭 데미지 {formatGold(tap)} · 다음 비용 {formatGold(swordUpgradeCost(save.swordLevel))}G
              </p>
            </div>
            <button
              type="button"
              disabled={save.gold < swordUpgradeCost(save.swordLevel)}
              onClick={buySword}
            >
              강화
            </button>
          </article>
        )}

        {tab === "heroes" &&
          HEROES.map((h) => {
            const lv = save.heroes[h.id];
            const locked = save.stage < h.unlockStage;
            const cost = heroUpgradeCost(h, lv);
            return (
              <article key={h.id} className="titans-card">
                <Stickman hue={h.hue} name={h.name} size={36} attacking={lv > 0} />
                <div>
                  <strong>
                    {h.name} {lv > 0 ? `· Lv.${lv}` : ""}
                  </strong>
                  <p>
                    {locked
                      ? `STAGE ${h.unlockStage} 해금 · ${h.role}`
                      : `DPS ${formatGold(heroDps(h, lv || 1))} · ${formatGold(cost)}G`}
                  </p>
                </div>
                <button type="button" disabled={locked || save.gold < cost} onClick={() => buyHero(h.id)}>
                  {lv === 0 ? "소환" : "레벨업"}
                </button>
              </article>
            );
          })}

        {tab === "skills" &&
          SKILLS.map((sk) => (
            <article key={sk.id} className="titans-card">
              <div>
                <strong>{sk.name}</strong>
                <p>
                  {sk.desc}
                  {save.swordLevel < sk.unlockSword ? ` · 검 Lv.${sk.unlockSword} 해금` : ""}
                </p>
              </div>
              <button
                type="button"
                disabled={save.swordLevel < sk.unlockSword || cds[sk.id] > 0}
                onClick={() => castSkill(sk.id)}
              >
                사용
              </button>
            </article>
          ))}
      </section>

      {toast && <div className="titans-toast">{toast}</div>}
    </div>
  );
}
