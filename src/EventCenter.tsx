import { useEffect, useMemo, useState } from "react";
import { combatPower, type CharacterProgress } from "./progression/model";
import { updateCharacterProgress } from "./progression/storage";
import { computeIdleYield, formatDuration, slotLevels, stageCeilingFor } from "./progression/idle";
import { resolveShadow, shadowOpponents, shadowPortrait, weekKey, type ShadowOpponent } from "./events/shadowArena";
import { formatGold, type TitanSkillId, type TitanSkillSlot } from "./titans/model";
import { loadTitansSave } from "./titans/storage";
import { randomOwnedAlly } from "./titans/allies";
import { riftEventFor, weekdayRift, weekdayRiftSchedule } from "./events/weekdayRift";
import { JOURNAL_ENTRIES, journalRewardLabel } from "./progression/journal";
import { assetUrl } from "./asset";
import { RewardChip, RewardIcon } from "./ui/RewardIcon";
import { AllyArt, MonsterArt } from "./titans/SpriteArt";
import { EquippedCharacter } from "./ui/EquippedCharacter";
import { huntingArea } from "./titans/model";
import { ContentIcon, type ContentIconName } from "./ui/ContentIcon";
import { sfxRiftClaim } from "./ui/sfx";

type EventTab = "daily" | "rift" | "weekly" | "journal" | "challenge" | "season";

import { MISSION_ALL_DONE_GEMS, RIFT_SECONDS, dailyMissionsDone, dateKey, loadEventSave, riftAttemptsFor, saveEventSave, type EventSave } from "./events/eventSave";
import { weeklyChallenges, weeklyRewardLabel } from "./events/weekly";
import { SEASON, addSeasonXp, claimSeasonTier, claimableTiers, freeReward, normalizeSeason, paidGemTotal, paidReward, rewardLabel, seasonDaysLeft, seasonTier } from "./economy/seasonPass";
import { getPaymentAdapter, grantPurchase, paymentsConfigured } from "./payments/store";
import { saveTitansSave } from "./titans/storage";

/**
 * 해금된 슬롯을 전부 장착한 것으로 간주한 맵.
 * 균열은 오프라인이 아니라 즉시 정산이므로 "지금 낼 수 있는 최대 효율"로 계산한다.
 */
function unlockedEquipMap(progress: CharacterProgress): Partial<Record<TitanSkillSlot, TitanSkillId>> {
  const levels = slotLevels(progress);
  const map: Partial<Record<TitanSkillSlot, TitanSkillId>> = {};
  const skillBySlot: Record<TitanSkillSlot, TitanSkillId> = {
    starter: "strike",
    linkA: "crit",
    linkB: "clone",
    finisher: "warcry",
    passive: "steel",
  };
  (Object.keys(levels) as TitanSkillSlot[]).forEach((slot) => {
    if (levels[slot] > 0) map[slot] = skillBySlot[slot];
  });
  return map;
}

export function EventCenter({
  userHash,
  progress,
  open,
  onClose,
  onUpdated,
  initialTab,
}: {
  userHash: string;
  progress: CharacterProgress;
  open: boolean;
  onClose: () => void;
  onUpdated: (p: CharacterProgress) => void;
  /** 추천 배너·루틴 보드가 특정 탭으로 연다 */
  initialTab?: "daily" | "rift" | "weekly" | "journal" | "season";
}) {
  const [tab, setTab] = useState<EventTab>("daily");
  const [allTiers, setAllTiers] = useState(false);
  const [save, setSave] = useState<EventSave | null>(null);
  const [riftMessage, setRiftMessage] = useState("");
  const [shadowLog, setShadowLog] = useState<{ id: string; win: boolean; text: string } | null>(null);
  // 화면 전환 콘텐츠 — 균열 진입은 원정대가 균열 몬스터를 쓸어 담는 연출, 랭크 시험은 그림자와의 대결 연출
  const [riftRun, setRiftRun] = useState<{ name: string; gold: number; exp: number; materials: number; shards: number; mult: number } | null>(null);
  const [duel, setDuel] = useState<{ name: string; title: string; win: boolean; playerRoll: number; opponentRoll: number; bonus: number } | null>(null);

  useEffect(() => {
    void loadEventSave(userHash).then(setSave);
  }, [userHash, open]);

  useEffect(() => {
    if (open && initialTab) setTab(initialTab);
  }, [open, initialTab]);

  /**
   * 토벌령 — 4개 콘텐츠 축, "오늘 실제로 했는가"(firstClearDates)가 기준이다.
   * 예전 값(최고 스테이지·최고 강화 등 누적 최고치)은 한 번 넘기면 매일 자동 달성되는 목데이터였다.
   */
  const daily = useMemo(() => {
    const today = dateKey();
    const did = (k: keyof CharacterProgress["firstClearDates"]) => (progress.firstClearDates[k] === today ? 1 : 0);
    return [
      { id: "hunt", title: "오늘 보스 처치", desc: "사냥터 보스 1마리", axis: "S", icon: "hunt" as ContentIconName, value: did("hunt"), goal: 1 },
      { id: "pioneer", title: "오늘 화살 원정", desc: "원정 1회 완주", axis: "T", icon: "dodge" as ContentIconName, value: did("dodge"), goal: 1 },
      { id: "forge", title: "오늘 장비 강화", desc: "대장간 강화 1회 성공", axis: "M", icon: "forge" as ContentIconName, value: did("forge"), goal: 1 },
      { id: "beat", title: "오늘 비트 수련", desc: "1곡 클리어", axis: "R", icon: "beat" as ContentIconName, value: did("beat"), goal: 1 },
    ];
  }, [progress]);

  const opponents = useMemo(
    () => shadowOpponents(userHash, progress, save?.week ?? weekKey()),
    [userHash, progress, save?.week],
  );

  const riftYield = useMemo(
    () =>
      computeIdleYield(
        progress,
        // 개척 게이트를 우회하지 못하게 방치와 같은 상한을 적용한다.
        // 상한 없이 titanBestStage를 쓰면 미개척 지역의 지역 배율이 균열로 새어 나온다.
        Math.max(1, Math.min(progress.titanBestStage, stageCeilingFor(progress.pioneeredArea))),
        unlockedEquipMap(progress),
        RIFT_SECONDS,
      ),
    [progress],
  );

  if (!open || !save) return null;

  const persist = async (next: EventSave) => {
    const saved = await saveEventSave(userHash, next);
    setSave(saved);
    // 사냥터 허브(루틴 보드·추천)가 즉시 따라오도록
    window.dispatchEvent(new Event("dodgebullets:events-changed"));
  };

  const claimMission = async (id: string) => {
    const key = `daily:${dateKey()}:${id}`;
    if (save.claimed.includes(key)) return;
    const nextClaimed = { ...save, claimed: [...save.claimed, key] };
    // 주간 도전: 오늘 토벌령 4종을 모두 받은 날은 하루로 집계 (중복 방지)
    const completedToday = dailyMissionsDone(nextClaimed) && nextClaimed.lastMissionDay !== dateKey();
    const nextProgress = await updateCharacterProgress(userHash, (current) => ({
      ...current,
      sharedCoins: current.sharedCoins + 250,
      enhancementMaterials: current.enhancementMaterials + 2,
      // K: 4종 모두 수령한 날 보석 +10 — 무과금 보석 경로
      redGems: current.redGems + (completedToday ? MISSION_ALL_DONE_GEMS : 0),
    }));
    // G 시즌 경험치 — 토벌령 4종 완주
    if (completedToday) onUpdated(await updateCharacterProgress(userHash, (current) => addSeasonXp(current, SEASON.xp.missionsAll)));
    onUpdated(nextProgress);
    if (completedToday) setRiftMessage(`오늘의 토벌령 완주 · 보석 +${MISSION_ALL_DONE_GEMS}`);
    await persist(completedToday ? { ...nextClaimed, weeklyMissionDays: nextClaimed.weeklyMissionDays + 1, lastMissionDay: dateKey() } : nextClaimed);
  };

  const enterRift = async () => {
    if (save.riftAttempts >= riftAttemptsFor(progress.patronUntil)) return;
    sfxRiftClaim();
    // 요일 균열(CRUMBLE_GAP §5) — 요일마다 다른 축의 보상이 증폭된다
    // 기간 한정 이벤트(주말 2배 등)는 그 위에 곱으로 중첩된다
    const rift = weekdayRift();
    const event = riftEventFor();
    const eventMult = event?.mult ?? 1;
    const gold = Math.floor(riftYield.gold * rift.goldMult * eventMult);
    const materials = Math.floor(riftYield.materials * rift.matMult * eventMult);
    const shardCount = Math.round(rift.shards * eventMult);
    const titans = await loadTitansSave(userHash);
    const nextProgress = await updateCharacterProgress(userHash, (current) => {
      const shards = { ...current.allyShards };
      for (let i = 0; i < shardCount; i += 1) {
        const target = randomOwnedAlly(titans.heroes, Math.random, current.partyIds);
        shards[target] = (shards[target] ?? 0) + 1;
      }
      return {
        ...current,
        sharedCoins: current.sharedCoins + gold,
        exp: current.exp + riftYield.exp,
        enhancementMaterials: current.enhancementMaterials + materials,
        allyShards: shards,
      };
    });
    onUpdated(await updateCharacterProgress(userHash, (current) => addSeasonXp(current, SEASON.xp.rift)));
    void nextProgress;
    setRiftRun({ name: rift.name, gold, exp: riftYield.exp, materials, shards: shardCount, mult: eventMult });
    setRiftMessage(
      `공유 골드 +${formatGold(gold)} · EXP +${riftYield.exp.toLocaleString()} · 강화석 +${materials} · 동료 조각 +${shardCount}${event ? ` · ${event.name} ×${event.mult}` : ""}`,
    );
    await persist({ ...save, riftAttempts: save.riftAttempts + 1, weeklyRiftRuns: save.weeklyRiftRuns + 1 });
  };

  /** 주간 도전 수령 (RETENTION F) */
  const claimWeekly = async (id: string) => {
    const ch = weeklyChallenges(save.week).find((c) => c.id === id);
    if (!ch || save.weeklyClaimed.includes(id) || ch.progressOf(save) < ch.goal) return;
    const titans = await loadTitansSave(userHash);
    const nextProgress = await updateCharacterProgress(userHash, (p) => {
      const next = { ...p };
      if (ch.reward.kind === "gems") next.redGems = p.redGems + ch.reward.amount;
      if (ch.reward.kind === "shards") {
        const shards = { ...p.allyShards };
        for (let i = 0; i < ch.reward.amount; i += 1) {
          const target = randomOwnedAlly(titans.heroes, Math.random, p.partyIds);
          shards[target] = (shards[target] ?? 0) + 1;
        }
        next.allyShards = shards;
      }
      if (ch.reward.kind === "boost") next.idleBoostUntil = Math.max(p.idleBoostUntil, Date.now()) + ch.reward.hours * 3600 * 1000;
      return addSeasonXp(next, SEASON.xp.weeklyChallenge);
    });
    onUpdated(nextProgress);
    await persist({ ...save, weeklyClaimed: [...save.weeklyClaimed, id] });
  };

  /** 시즌 패스 (G) — 단계 수령 · 유료 트랙 구매 */
  const claimSeason = async (track: "free" | "paid", tier: number) => {
    let cores = 0;
    const next = await updateCharacterProgress(userHash, (current) => { const r = claimSeasonTier(current, track, tier); cores = r.cores; return r.progress; });
    if (cores > 0) { const t = await loadTitansSave(userHash); await saveTitansSave(userHash, { ...t, skillInventory: { ...t.skillInventory, skillCores: t.skillInventory.skillCores + cores } }); }
    onUpdated(next);
  };
  const buySeasonPass = async () => {
    if (paymentsConfigured()) {
      const result = await getPaymentAdapter().purchase(SEASON.productId);
      if (result.status !== "verified") return;
      onUpdated((await grantPurchase(userHash, SEASON.productId, result.transactionId)).progress);
      return;
    }
    if (import.meta.env.DEV) { onUpdated((await grantPurchase(userHash, SEASON.productId, `qa-${Date.now()}`)).progress); return; }
    setRiftMessage("스토어 결제 연동 전입니다 — Google Play 등록 후 구매할 수 있습니다");
  };

  const claimJournal = async (entryId: string) => {
    const entry = JOURNAL_ENTRIES.find((e) => e.id === entryId);
    if (!entry || progress.journalClaimed.includes(entryId)) return;
    const { current, goal } = entry.progressOf(progress);
    if (current < goal) return;
    const titans = await loadTitansSave(userHash);
    const nextProgress = await updateCharacterProgress(userHash, (p) => {
      if (p.journalClaimed.includes(entryId)) return p;
      const next = { ...p, journalClaimed: [...p.journalClaimed, entryId] };
      const reward = entry.reward;
      if (reward.kind === "gems") next.redGems = p.redGems + reward.amount;
      if (reward.kind === "materials") next.enhancementMaterials = p.enhancementMaterials + reward.amount;
      if (reward.kind === "shards") {
        const shards = { ...p.allyShards };
        for (let i = 0; i < reward.amount; i += 1) {
          const target = randomOwnedAlly(titans.heroes, Math.random, p.partyIds);
          shards[target] = (shards[target] ?? 0) + 1;
        }
        next.allyShards = shards;
      }
      if (reward.kind === "boost") {
        next.idleBoostUntil = Math.max(p.idleBoostUntil, Date.now()) + reward.hours * 3600 * 1000;
      }
      return next;
    });
    onUpdated(nextProgress);
  };

  const challengeShadow = async (opponent: ShadowOpponent) => {
    if (save.shadowCleared.includes(opponent.id)) return;
    const result = resolveShadow(progress, opponent);
    setDuel({ name: opponent.name, title: opponent.title, win: result.win, playerRoll: result.playerRoll, opponentRoll: result.opponentRoll, bonus: opponent.bonus });
    if (!result.win) {
      setShadowLog({
        id: opponent.id,
        win: false,
        text: `패배 · ${Math.floor(result.playerRoll).toLocaleString()} vs ${Math.floor(result.opponentRoll).toLocaleString()}`,
      });
      return;
    }
    // 승리 보상에 동료 조각 +3 (LIVEOPS §2.2)
    const titansForShards = await loadTitansSave(userHash);
    const nextProgress = await updateCharacterProgress(userHash, (current) => {
      const shards = { ...current.allyShards };
      for (let i = 0; i < 3; i += 1) {
        const target = randomOwnedAlly(titansForShards.heroes, Math.random, current.partyIds);
        shards[target] = (shards[target] ?? 0) + 1;
      }
      return {
        ...current,
        sharedCoins: current.sharedCoins + 2_000 * (1 + opponents.indexOf(opponent)),
        shoulderShards: current.shoulderShards + 10,
        allyShards: shards,
      };
    });
    onUpdated(nextProgress);
    setShadowLog({
      id: opponent.id,
      win: true,
      text: `승리 · ${Math.floor(result.playerRoll).toLocaleString()} vs ${Math.floor(result.opponentRoll).toLocaleString()}`,
    });
    await persist({
      ...save,
      shadowCleared: [...save.shadowCleared, opponent.id],
      shadowBonus: Number((save.shadowBonus + opponent.bonus).toFixed(2)),
    });
  };

  const power = combatPower(progress);

  return (
    <div className="exit-modal event-modal" role="dialog" aria-modal="true">
      <div className="exit-card event-card">
        <p className="brand">ADVENTURE EVENT</p>
        <h2 className="exit-title">모험가 이벤트</h2>
        <div className="event-tabs">
          {(["daily", "rift", "challenge", "weekly", "season", "journal"] as EventTab[]).map((id) => (
            <button key={id} className={tab === id ? "on" : ""} onClick={() => setTab(id)}>
              {id === "daily"
                ? "토벌령"
                : id === "rift"
                  ? "차원 균열"
                  : id === "weekly"
                    ? "랭크 시험"
                    : id === "season"
                      ? "시즌 패스"
                    : id === "challenge"
                      ? "주간 도전"
                      : "원정 일지"}
            </button>
          ))}
        </div>

        {tab === "daily" && (
          <div className="event-list">
            {daily.map((m) => {
              const key = `daily:${dateKey()}:${m.id}`;
              const done = m.value >= m.goal;
              return (
                <article key={m.id} className="mission-card">
                  <ContentIcon name={m.icon} className="mission-icon" />
                  <div>
                    <b>
                      <span className={`axis-chip axis-${m.axis}`}>{m.axis}</span>
                      {m.title}
                    </b>
                    <span>
                      {m.desc} · {Math.min(m.goal, m.value)} / {m.goal}
                    </span>
                    <i>
                      <em style={{ width: `${Math.min(100, (m.value / m.goal) * 100)}%` }} />
                    </i>
                    <small className="journal-reward reward-row"><RewardChip kind="gold" label="골드 250" /><RewardChip kind="materials" label="강화석 2" /></small>
                  </div>
                  <button disabled={!done || save.claimed.includes(key)} onClick={() => void claimMission(m.id)}>
                    {save.claimed.includes(key) ? "완료" : "받기"}
                  </button>
                </article>
              );
            })}
          </div>
        )}

        {tab === "rift" && (
          <section className="rift-event">
            <img className="rift-crest" src={assetUrl("ui/idle/rift.svg")} alt="" aria-hidden="true" />
            <h3>
              {weekdayRift().name} <small className="rift-day-desc">오늘은 {weekdayRift().desc}</small>
            </h3>
            {riftEventFor() && (
              <div className="rift-event-banner" role="status">
                <img src={assetUrl("ui/idle/weekend-rift.svg")} alt="" aria-hidden="true" />
                <div>
                  <b>{riftEventFor()!.name}</b>
                  <small>{riftEventFor()!.desc}</small>
                </div>
                <em>×{riftEventFor()!.mult}</em>
              </div>
            )}
            <p>
              균열 하나가 <b>방치 {formatDuration(RIFT_SECONDS)}</b>을 즉시 정산합니다.
              <br />
              현재 효율 {(riftYield.rate * 100).toFixed(0)}% · 배율 ×{riftYield.multiplier.toFixed(2)} 기준
            </p>
            <div className="rift-week" aria-label="요일 균열 일정">
              {weekdayRiftSchedule().map((slot) => (
                <span key={slot.day} className={slot.today ? "today" : ""} title={`${slot.rift.name} · ${slot.rift.desc}`}>
                  {slot.day}
                </span>
              ))}
            </div>
            <div className="rift-preview">
              <div>
                <span>공유 골드</span>
                <strong>{formatGold(Math.floor(riftYield.gold * weekdayRift().goldMult * (riftEventFor()?.mult ?? 1)))}</strong>
              </div>
              <div>
                <span>경험치</span>
                <strong>{riftYield.exp.toLocaleString()}</strong>
              </div>
              <div>
                <span>강화석</span>
                <strong>{Math.floor(riftYield.materials * weekdayRift().matMult * (riftEventFor()?.mult ?? 1))}</strong>
              </div>
              <div>
                <span>동료 조각</span>
                <strong>{Math.round(weekdayRift().shards * (riftEventFor()?.mult ?? 1))}</strong>
              </div>
            </div>
            {riftMessage && <p className="shop-toast">{riftMessage}</p>}
            <button
              className="cta"
              disabled={save.riftAttempts >= riftAttemptsFor(progress.patronUntil)}
              onClick={() => void enterRift()}
            >
              균열 진입 {save.riftAttempts}/{riftAttemptsFor(progress.patronUntil)}
            </button>
          </section>
        )}

        {tab === "weekly" && (
          <section className="weekly-event shadow-arena">
            <img className="shadow-crest" src={assetUrl("ui/idle/shadow-seal.svg")} alt="" aria-hidden="true" />
            <h3>주간 랭크 시험</h3>
            <p className="shadow-note">
              실제 유저와의 대전이 아닙니다. 주차마다 고정되는 <b>그림자 상대</b> 3인과 전투력을 겨룹니다.
            </p>
            <p className="shadow-power">
              내 전투력 <strong>{power.toLocaleString()}</strong> · 주간 보너스 +
              {save.shadowBonus.toFixed(2)}
            </p>
            <div className="shadow-list">
              {opponents.map((opponent) => {
                const cleared = save.shadowCleared.includes(opponent.id);
                const log = shadowLog?.id === opponent.id ? shadowLog : null;
                return (
                  <article key={opponent.id} className={cleared ? "cleared" : ""}>
                    <div className="shadow-figure" aria-hidden="true">
                      <img className="shadow-portrait" src={shadowPortrait(opponent.name)} alt="" />
                    </div>
                    <div className="shadow-info">
                      <small>{opponent.title}</small>
                      <b>{opponent.name}</b>
                      <span>
                        전투력 {opponent.power.toLocaleString()} · 승리 시 +{opponent.bonus.toFixed(2)}
                      </span>
                      {log && <em className={log.win ? "win" : "lose"}>{log.text}</em>}
                    </div>
                    <button disabled={cleared} onClick={() => void challengeShadow(opponent)}>
                      {cleared ? "돌파" : "도전"}
                    </button>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {tab === "challenge" && (
          <section className="journal-event weekly-challenge">
            <h3>주간 도전</h3>
            <p className="journal-note">이번 주({save.week}) 3가지 — 요일 균열과 함께 돌아갑니다. 월요일에 새 목표로 바뀝니다.</p>
            <div className="event-list journal-list">
              {weeklyChallenges(save.week).map((ch) => {
                const current = ch.progressOf(save);
                const done = current >= ch.goal;
                const claimed = save.weeklyClaimed.includes(ch.id);
                return (
                  <article key={ch.id} className={claimed ? "claimed" : ""}>
                    <div>
                      <b>{ch.title}</b>
                      <span>{Math.min(ch.goal, current)} / {ch.goal}</span>
                      <i><em style={{ width: `${Math.min(100, (current / ch.goal) * 100)}%` }} /></i>
                      <small className="journal-reward"><RewardChip kind={ch.reward.kind} label={weeklyRewardLabel(ch.reward)} /></small>
                    </div>
                    <button disabled={!done || claimed} onClick={() => void claimWeekly(ch.id)}>
                      {claimed ? "완료" : done ? "받기" : "진행중"}
                    </button>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {tab === "season" && (() => {
          const sp = normalizeSeason(progress);
          const tierNow = seasonTier(sp.xp);
          const daysLeft = seasonDaysLeft();
          const freeOpen = claimableTiers(progress, "free");
          const paidOpen = claimableTiers(progress, "paid");
          return (
            <section className="season-pass" aria-label="시즌 패스">
              <header className="season-head">
                <div>
                  <small>SEASON {sp.season + 1} · D-{daysLeft}{daysLeft <= 3 ? " · 미수령 보상은 시즌 종료 시 소멸" : ""}</small>
                  <b>{tierNow}/{SEASON.tiers}단</b>
                  <i className="season-xp"><em style={{ width: `${Math.min(100, ((sp.xp % SEASON.xpPerTier) / SEASON.xpPerTier) * 100)}%` }} /></i>
                  <span>다음 단까지 {SEASON.xpPerTier - (sp.xp % SEASON.xpPerTier)} XP · 루틴 {SEASON.xp.routine} · 토벌 완주 {SEASON.xp.missionsAll} · 주간 도전 {SEASON.xp.weeklyChallenge} · 균열 {SEASON.xp.rift}</span>
                </div>
                {sp.paid ? <span className="season-paid-badge">유료 트랙 활성</span> : (
                  <button type="button" className="cta season-buy" onClick={() => void buySeasonPass()}>유료 트랙 {SEASON.paidPriceLabel}<small>보석 {paidGemTotal(sp.season)} · 조각 선택 3 · 시즌 스킨 · 무기 이펙트</small><span className="season-perks"><RewardIcon kind="gems" size={18} /><RewardIcon kind="shards" size={18} /><RewardIcon kind="allySkin" size={18} /><RewardIcon kind="weaponFx" size={18} /></span></button>
                )}
              </header>
              {(freeOpen.length > 0 || paidOpen.length > 0) && (
                <button type="button" className="cta season-claim-all" onClick={() => void (async () => { for (const t of freeOpen) await claimSeason("free", t); for (const t of paidOpen) await claimSeason("paid", t); })()}>
                  수령 가능 {freeOpen.length + paidOpen.length}개 모두 받기
                </button>
              )}
              {/* 30줄을 늘어놓지 않는다 — 현재 단 앞뒤(−1~+4)와 수령 가능한 단만. 전체는 토글 */}
              {(() => {
                const openSet = new Set([...freeOpen, ...paidOpen]);
                const all = Array.from({ length: SEASON.tiers }, (_, i) => i + 1);
                const shown = allTiers ? all : all.filter((t) => openSet.has(t) || (t >= Math.max(1, tierNow - 1) && t <= Math.min(SEASON.tiers, tierNow + 4)));
                return (
                  <>
                    <ol className="season-tiers">
                      {shown.map((t, i) => {
                        const fr = freeReward(t); const pr = paidReward(t, sp.season);
                        const reached = t <= tierNow;
                        const gap = i > 0 && shown[i - 1] !== t - 1;
                        return (
                          <li key={t} data-tier={t} className={`season-tier ${reached ? "reached" : ""} ${t === tierNow + 1 ? "next" : ""} ${gap ? "after-gap" : ""}`}>
                            <b>{t}</b>
                            <button type="button" className={`season-cell free ${sp.claimedFree.includes(t) ? "claimed" : ""}`} disabled={!freeOpen.includes(t)} onClick={() => void claimSeason("free", t)}><RewardIcon kind={fr.kind} size={20} />{rewardLabel(fr)}{sp.claimedFree.includes(t) ? " ✓" : ""}</button>
                            <button type="button" className={`season-cell paid ${sp.claimedPaid.includes(t) ? "claimed" : ""} ${sp.paid ? "" : "locked"}`} disabled={!paidOpen.includes(t)} onClick={() => void claimSeason("paid", t)}><RewardIcon kind={pr.kind} size={20} />{rewardLabel(pr)}{sp.claimedPaid.includes(t) ? " ✓" : sp.paid ? "" : " 🔒"}</button>
                          </li>
                        );
                      })}
                    </ol>
                    <button type="button" className="season-expand" onClick={() => setAllTiers((v) => !v)}>{allTiers ? "접기" : `전체 ${SEASON.tiers}단 보기`}</button>
                  </>
                );
              })()}
            </section>
          );
        })()}
        {tab === "journal" && (
          <section className="journal-event">
            <img className="journal-crest" src={assetUrl("ui/idle/journal.svg")} alt="" aria-hidden="true" />
            <h3>원정 일지</h3>
            <p className="journal-note">
              시즌도 리셋도 없는 누적 기록입니다. 목표를 달성하면 언제든 받을 수 있습니다.
            </p>
            <div className="event-list journal-list">
              {JOURNAL_ENTRIES.map((entry) => {
                const { current, goal } = entry.progressOf(progress);
                const done = current >= goal;
                const claimed = progress.journalClaimed.includes(entry.id);
                return (
                  <article key={entry.id} className={claimed ? "claimed" : ""}>
                    <div>
                      <b>{entry.title}</b>
                      <span>
                        {entry.desc} · {Math.min(goal, current).toLocaleString()} / {goal.toLocaleString()}
                      </span>
                      <i>
                        <em style={{ width: `${Math.min(100, (current / goal) * 100)}%` }} />
                      </i>
                      <small className="journal-reward"><RewardChip kind={entry.reward.kind} label={journalRewardLabel(entry.reward)} /></small>
                    </div>
                    <button disabled={!done || claimed} onClick={() => void claimJournal(entry.id)}>
                      {claimed ? "완료" : done ? "받기" : "진행중"}
                    </button>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        <button className="cta cta-ghost" onClick={onClose}>
          닫기
        </button>
        {riftRun && <RiftRunOverlay run={riftRun} area={huntingArea(Math.max(1, progress.titanBestStage))} party={progress.partyIds.slice(0, 3)} onClose={() => setRiftRun(null)} />}
        {duel && <DuelOverlay duel={duel} progress={progress} onClose={() => setDuel(null)} />}
      </div>
    </div>
  );
}


/** 균열 진입 연출 — 원정대가 균열 몬스터 세 마리를 쓸어 담고 보상이 쏟아진다 (3초, 탭하면 건너뜀) */
function RiftRunOverlay({ run, area, party, onClose }: { run: { name: string; gold: number; exp: number; materials: number; shards: number; mult: number }; area: ReturnType<typeof huntingArea>; party: string[]; onClose: () => void }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 420);
    const done = window.setTimeout(onClose, 3400);
    return () => { window.clearInterval(id); window.clearTimeout(done); };
  }, [onClose]);
  const progressPct = Math.min(100, tick * 14);
  const kinds = area.normalKinds;
  return (
    <div className="rift-run" role="status" onClick={onClose} style={{ "--area-sky": area.sky, "--area-background": `url(${area.background})` } as React.CSSProperties}>
      <div className="rift-run-field">
        <div className="rift-run-party">
          {party.map((id, i) => <AllyArt key={id} id={id as never} attacking pulse={tick + i} partySlot={i} engaged />)}
        </div>
        <div className="rift-run-monsters">
          {kinds.slice(0, 3).map((kind, i) => (
            <span key={kind + i} className={`rift-run-monster ${tick > i * 2 + 1 ? "down" : ""}`}><MonsterArt kind={kind} area={area} boss={false} state={tick > i * 2 + 1 ? "defeat" : tick === i * 2 + 1 ? "hit" : "idle"} /></span>
          ))}
        </div>
        <b className="rift-run-title">{run.name} · 균열 정산 중</b>
        <i className="rift-run-bar"><em style={{ width: `${progressPct}%` }} /></i>
      </div>
      <div className={`rift-run-loot ${progressPct >= 100 ? "show" : ""}`}>
        <RewardChip kind="gold" label={`골드 +${formatGold(run.gold)}`} />
        <RewardChip kind="seasonXp" label={`EXP +${run.exp.toLocaleString()}`} />
        <RewardChip kind="materials" label={`강화석 +${run.materials}`} />
        <RewardChip kind="shards" label={`조각 +${run.shards}`} />
        {run.mult > 1 && <small>이벤트 ×{run.mult}</small>}
      </div>
    </div>
  );
}

/** 랭크 시험 연출 — 주인공과 그림자 상대의 전투력 게이지가 맞붙는다 (2.6초, 탭하면 건너뜀) */
function DuelOverlay({ duel, progress, onClose }: { duel: { name: string; title: string; win: boolean; playerRoll: number; opponentRoll: number; bonus: number }; progress: CharacterProgress; onClose: () => void }) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const t1 = window.setTimeout(() => setPhase(1), 200);
    const t2 = window.setTimeout(() => setPhase(2), 1500);
    const t3 = window.setTimeout(onClose, 3200);
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); window.clearTimeout(t3); };
  }, [onClose]);
  const top = Math.max(duel.playerRoll, duel.opponentRoll, 1);
  return (
    <div className={`duel-overlay phase-${phase} ${duel.win ? "win" : "lose"}`} role="status" onClick={onClose}>
      <div className="duel-side me">
        <EquippedCharacter mode={phase === 2 && duel.win ? "attack" : "idle"} frame={phase === 2 ? 3 : 0} weaponLevel={progress.equippedWeaponLevel} shoulder={progress.equippedShoulder} character={progress.activeCharacter} armorLevel={progress.armorLevel} />
        <b>나</b>
        <i className="duel-bar"><em style={{ width: phase >= 1 ? `${(duel.playerRoll / top) * 100}%` : "0%" }} /></i>
        <span>{Math.floor(duel.playerRoll).toLocaleString()}</span>
      </div>
      <b className="duel-vs">{phase === 2 ? (duel.win ? "승리" : "패배") : "VS"}</b>
      <div className="duel-side foe">
        <span className="shadow-figure big" aria-hidden="true"><img className="shadow-portrait" src={shadowPortrait(duel.name)} alt="" /></span>
        <b>{duel.name}</b>
        <i className="duel-bar foe"><em style={{ width: phase >= 1 ? `${(duel.opponentRoll / top) * 100}%` : "0%" }} /></i>
        <span>{Math.floor(duel.opponentRoll).toLocaleString()}</span>
      </div>
      {phase === 2 && <small className="duel-result">{duel.win ? `주간 보너스 +${duel.bonus.toFixed(2)} · 공유 코인·견갑 조각·동료 조각 획득` : "전투력을 올려 다시 도전하세요 — 장비 강화·동료 성급이 전투력을 올린다"}</small>}
    </div>
  );
}
