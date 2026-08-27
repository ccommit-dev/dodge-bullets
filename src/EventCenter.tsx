import { useEffect, useMemo, useState } from "react";
import { storageGet, storageSet } from "./game/toss";
import { combatPower, type CharacterProgress } from "./progression/model";
import { updateCharacterProgress } from "./progression/storage";
import { computeIdleYield, formatDuration, slotLevels, stageCeilingFor } from "./progression/idle";
import { resolveShadow, shadowOpponents, weekKey, type ShadowOpponent } from "./events/shadowArena";
import { formatGold, type TitanSkillId, type TitanSkillSlot } from "./titans/model";
import { loadTitansSave } from "./titans/storage";
import { randomOwnedAlly } from "./titans/allies";
import { assetUrl } from "./asset";
import { sfxRiftClaim } from "./ui/sfx";

type EventTab = "daily" | "rift" | "weekly";

type EventSave = {
  date: string;
  week: string;
  claimed: string[];
  riftAttempts: number;
  shadowCleared: string[];
  shadowBonus: number;
};

const dateKey = () => new Date().toLocaleDateString("sv-SE");

/** 일일 던전 1회 = 방치 2시간 즉시 정산. */
const RIFT_SECONDS = 2 * 3600;
const RIFT_ATTEMPTS = 3;

function emptySave(): EventSave {
  return {
    date: dateKey(),
    week: weekKey(),
    claimed: [],
    riftAttempts: 0,
    shadowCleared: [],
    shadowBonus: 0,
  };
}

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
}: {
  userHash: string;
  progress: CharacterProgress;
  open: boolean;
  onClose: () => void;
  onUpdated: (p: CharacterProgress) => void;
}) {
  const [tab, setTab] = useState<EventTab>("daily");
  const [save, setSave] = useState<EventSave | null>(null);
  const [riftMessage, setRiftMessage] = useState("");
  const [shadowLog, setShadowLog] = useState<{ id: string; win: boolean; text: string } | null>(null);

  useEffect(() => {
    void storageGet(`dodgebullets:events:v2:${userHash}`).then((raw) => {
      let value = emptySave();
      try {
        if (raw) value = { ...value, ...(JSON.parse(raw) as EventSave) };
      } catch {
        /* fallback */
      }
      if (value.date !== dateKey()) {
        value = {
          ...value,
          date: dateKey(),
          claimed: value.claimed.filter((id) => id.startsWith("weekly:")),
          riftAttempts: 0,
        };
      }
      if (value.week !== weekKey()) {
        value = {
          ...value,
          week: weekKey(),
          claimed: value.claimed.filter((id) => id.startsWith("daily:")),
          shadowCleared: [],
          shadowBonus: 0,
        };
      }
      setSave(value);
    });
  }, [userHash]);

  /** 일일 미션 — 4개 콘텐츠 축을 하나씩 담당한다. beat가 빠져 있던 것을 채웠다. */
  const daily = useMemo(
    () => [
      { id: "hunt", title: "사냥터 보스 진척", axis: "S", value: Math.max(0, progress.titanBestStage - 1), goal: 2 },
      { id: "pioneer", title: "화살 원정 개척", axis: "T", value: progress.dodgeBestStage, goal: 2 },
      { id: "forge", title: "장비 강화 기록", axis: "M", value: progress.bestForgeLevel, goal: 3 },
      {
        id: "beat",
        title: "비트 수련 숙련",
        axis: "R",
        value: Object.values(progress.beatSkills).reduce((a, b) => a + b, 0),
        goal: 5,
      },
    ],
    [progress],
  );

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
    setSave(next);
    await storageSet(`dodgebullets:events:v2:${userHash}`, JSON.stringify(next));
  };

  const claimMission = async (id: string) => {
    const key = `daily:${dateKey()}:${id}`;
    if (save.claimed.includes(key)) return;
    const nextProgress = await updateCharacterProgress(userHash, (current) => ({
      ...current,
      sharedCoins: current.sharedCoins + 250,
      enhancementMaterials: current.enhancementMaterials + 2,
    }));
    onUpdated(nextProgress);
    await persist({ ...save, claimed: [...save.claimed, key] });
  };

  const enterRift = async () => {
    if (save.riftAttempts >= RIFT_ATTEMPTS) return;
    sfxRiftClaim();
    // 균열 보상에 동료 조각 +2 (LIVEOPS §2.2) — 일일 던전에 수집 목적성 부여
    const titans = await loadTitansSave(userHash);
    const nextProgress = await updateCharacterProgress(userHash, (current) => {
      const shards = { ...current.allyShards };
      for (let i = 0; i < 2; i += 1) {
        const target = randomOwnedAlly(titans.heroes);
        shards[target] = (shards[target] ?? 0) + 1;
      }
      return {
        ...current,
        sharedCoins: current.sharedCoins + riftYield.gold,
        exp: current.exp + riftYield.exp,
        enhancementMaterials: current.enhancementMaterials + riftYield.materials,
        allyShards: shards,
      };
    });
    onUpdated(nextProgress);
    setRiftMessage(
      `공유 골드 +${formatGold(riftYield.gold)} · EXP +${riftYield.exp.toLocaleString()} · 강화석 +${riftYield.materials} · 동료 조각 +2`,
    );
    await persist({ ...save, riftAttempts: save.riftAttempts + 1 });
  };

  const challengeShadow = async (opponent: ShadowOpponent) => {
    if (save.shadowCleared.includes(opponent.id)) return;
    const result = resolveShadow(progress, opponent);
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
        const target = randomOwnedAlly(titansForShards.heroes);
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
          {(["daily", "rift", "weekly"] as EventTab[]).map((id) => (
            <button key={id} className={tab === id ? "on" : ""} onClick={() => setTab(id)}>
              {id === "daily" ? "오늘의 토벌령" : id === "rift" ? "차원 균열" : "주간 랭크 시험"}
            </button>
          ))}
        </div>

        {tab === "daily" && (
          <div className="event-list">
            {daily.map((m) => {
              const key = `daily:${dateKey()}:${m.id}`;
              const done = m.value >= m.goal;
              return (
                <article key={m.id}>
                  <div>
                    <b>
                      <span className={`axis-chip axis-${m.axis}`}>{m.axis}</span>
                      {m.title}
                    </b>
                    <span>
                      {Math.min(m.goal, m.value)} / {m.goal}
                    </span>
                    <i>
                      <em style={{ width: `${Math.min(100, (m.value / m.goal) * 100)}%` }} />
                    </i>
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
            <h3>심연의 균열</h3>
            <p>
              균열 하나가 <b>방치 {formatDuration(RIFT_SECONDS)}</b>을 즉시 정산합니다.
              <br />
              현재 효율 {(riftYield.rate * 100).toFixed(0)}% · 배율 ×{riftYield.multiplier.toFixed(2)} 기준
            </p>
            <div className="rift-preview">
              <div>
                <span>공유 골드</span>
                <strong>{formatGold(riftYield.gold)}</strong>
              </div>
              <div>
                <span>경험치</span>
                <strong>{riftYield.exp.toLocaleString()}</strong>
              </div>
              <div>
                <span>강화석</span>
                <strong>{riftYield.materials}</strong>
              </div>
            </div>
            {riftMessage && <p className="shop-toast">{riftMessage}</p>}
            <button
              className="cta"
              disabled={save.riftAttempts >= RIFT_ATTEMPTS}
              onClick={() => void enterRift()}
            >
              균열 진입 {save.riftAttempts}/{RIFT_ATTEMPTS}
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
                      <span className="shadow-body" />
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

        <button className="cta cta-ghost" onClick={onClose}>
          닫기
        </button>
      </div>
    </div>
  );
}
