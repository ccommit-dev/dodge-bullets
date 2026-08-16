import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { SafeInsets } from "./game/toss";
import {
  defaultForgeSave,
  effectiveChance,
  effectiveSell,
  formatGold,
  protectionCost,
  shardSwordCost,
  tierAt,
  type ForgeSave,
} from "./forge/model";
import { loadForgeSave, saveForgeSave } from "./forge/storage";
import { SwordArt } from "./forge/swords";
import { PROGRESSION_BALANCE } from "./progression/balance";
import { grantCharacterReward, loadCharacterProgress, updateCharacterProgress } from "./progression/storage";
import { EquippedCharacter } from "./ui/EquippedCharacter";
import type { ShoulderId } from "./progression/model";

/** Original delays were ~650/720ms; 3× faster ≈ 217/240. */
const FORGE_MS = 220;
const RESULT_MS = 240;

type ForgeGameProps = {
  insets: SafeInsets;
  userHash: string;
  onBack: () => void;
};

type ForgeView = "title" | "forge" | "exchange" | "armor";
type ForgePhase = "idle" | "forging" | "success" | "failure" | "sold";

export function ForgeGame({ insets, userHash, onBack }: ForgeGameProps) {
  const [save, setSave] = useState<ForgeSave>(() => defaultForgeSave());
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<ForgeView>("title");
  const [phase, setPhase] = useState<ForgePhase>("idle");
  const [toast, setToast] = useState("");
  const [materials, setMaterials] = useState(0);
  const [ownedShoulders, setOwnedShoulders] = useState<ShoulderId[]>([]);
  const [equippedShoulder, setEquippedShoulder] = useState<ShoulderId | null>(null);
  const timerRef = useRef<number | null>(null);
  const toastRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([loadForgeSave(userHash), loadCharacterProgress(userHash)]).then(([loaded, character]) => {
      if (cancelled) return;
      setSave(loaded);
      setMaterials(character.enhancementMaterials);
      setOwnedShoulders(character.ownedShoulders);
      setEquippedShoulder(character.equippedShoulder);
      setPhase(loaded.pendingFailure ? "failure" : "idle");
      setView(loaded.pendingFailure || loaded.level > 0 || loaded.totalAttempts > 0 ? "forge" : "title");
      setReady(true);
    });
    return () => {
      cancelled = true;
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      if (toastRef.current !== null) window.clearTimeout(toastRef.current);
    };
  }, [userHash]);

  useEffect(() => {
    if (!ready) return;
    void saveForgeSave(userHash, save);
  }, [ready, save, userHash]);

  const tier = tierAt(save.level);
  const chance = effectiveChance(tier, save.mode);
  const boostedChance = Math.min(1, chance + (materials > 0 ? 0.08 : 0));
  const sell = effectiveSell(tier, save.mode);
  const ticketNeed = protectionCost(save.level);
  const maxed = save.level >= 15;
  const canEnhance = !maxed && save.gold >= tier.cost && phase === "idle";
  const ticketPrice = 25_000 + save.tickets * 10_000;
  const swordCraftCost = shardSwordCost(3);
  const swordStyle = useMemo(
    () =>
      ({
        "--sword-hue": String(tier.hue),
        "--sword-power": String(Math.min(1, save.level / 12)),
      }) as CSSProperties,
    [save.level, tier.hue],
  );

  const flashToast = (message: string) => {
    setToast(message);
    if (toastRef.current !== null) window.clearTimeout(toastRef.current);
    toastRef.current = window.setTimeout(() => setToast(""), 1500);
  };

  const startMode = (mode: ForgeSave["mode"]) => {
    setSave((prev) => ({ ...prev, mode }));
    setView("forge");
    setPhase(save.pendingFailure ? "failure" : "idle");
  };

  const enhance = () => {
    if (!canEnhance) return;
    const success = Math.random() < boostedChance;
    if (materials > 0) {
      setMaterials((value) => Math.max(0, value - 1));
      void updateCharacterProgress(userHash, (current) => ({
        ...current,
        enhancementMaterials: Math.max(0, current.enhancementMaterials - 1),
        lastContent: "forge",
      }));
    }
    setPhase("forging");
    setSave((prev) => ({
      ...prev,
      gold: prev.gold - tier.cost,
      totalAttempts: prev.totalAttempts + 1,
    }));
    timerRef.current = window.setTimeout(() => {
      if (success) {
        setSave((prev) => {
          const nextLevel = Math.min(15, prev.level + 1);
          void grantCharacterReward(userHash, `forge:${prev.totalAttempts}:${Date.now()}`, {
            exp: PROGRESSION_BALANCE.forge.successExp + nextLevel * 2,
            lastContent: "forge",
          }).then(() =>
            updateCharacterProgress(userHash, (current) => ({
              ...current,
              equippedWeaponLevel: Math.max(current.equippedWeaponLevel, nextLevel),
              bestForgeLevel: Math.max(current.bestForgeLevel, nextLevel),
              lastContent: "forge",
            })),
          );
          return {
            ...prev,
            level: nextLevel,
            bestLevel: Math.max(prev.bestLevel, nextLevel),
            pendingFailure: false,
          };
        });
        setPhase("success");
        timerRef.current = window.setTimeout(() => setPhase("idle"), RESULT_MS);
      } else {
        setSave((prev) => ({ ...prev, pendingFailure: true }));
        setPhase("failure");
      }
    }, FORGE_MS);
  };

  const useProtection = () => {
    if (save.tickets < ticketNeed) return;
    setSave((prev) => ({
      ...prev,
      tickets: prev.tickets - ticketNeed,
      pendingFailure: false,
    }));
    setPhase("idle");
    flashToast("방지권으로 검을 복구했습니다");
  };

  const collectShards = () => {
    const gain = tier.shards * (save.mode === "rush" ? 2 : 1);
    setSave((prev) => ({
      ...prev,
      level: 0,
      shards: prev.shards + gain,
      pendingFailure: false,
    }));
    setPhase("idle");
    void updateCharacterProgress(userHash, (current) => ({
      ...current,
      enhancementMaterials: current.enhancementMaterials + gain,
      lastContent: "forge",
    }));
    flashToast(`검 조각 +${gain}`);
  };

  const sellSword = () => {
    if (save.level <= 0 || phase !== "idle") return;
    setSave((prev) => ({ ...prev, gold: prev.gold + sell, level: 0 }));
    setPhase("sold");
    flashToast(`판매 완료 +${formatGold(sell)}G`);
    timerRef.current = window.setTimeout(() => setPhase("idle"), RESULT_MS);
  };

  const buyTicket = () => {
    if (save.gold < ticketPrice) return;
    setSave((prev) => ({ ...prev, gold: prev.gold - ticketPrice, tickets: prev.tickets + 1 }));
    flashToast("방지권 +1");
  };

  const exchangeTicket = () => {
    if (save.shards < 25) return;
    setSave((prev) => ({ ...prev, shards: prev.shards - 25, tickets: prev.tickets + 1 }));
    flashToast("조각을 방지권으로 교환했습니다");
  };

  const craftSword = () => {
    if (save.shards < swordCraftCost || phase !== "idle") return;
    setSave((prev) => ({
      ...prev,
      shards: prev.shards - swordCraftCost,
      level: Math.max(prev.level, 3),
      bestLevel: Math.max(prev.bestLevel, 3),
      pendingFailure: false,
    }));
    setPhase("idle");
    setView("forge");
    flashToast("+3 강철 장검 조합 완료");
  };

  const resetSave = () => {
    if (!window.confirm("현재 모드 세이브를 초기화할까요?")) return;
    const next = { ...defaultForgeSave(), mode: save.mode };
    setSave(next);
    setPhase("idle");
    setView("title");
    flashToast("세이브가 초기화되었습니다");
  };

  const forgeStyle = {
    paddingTop: Math.max(16, insets.top),
    paddingRight: Math.max(16, insets.right),
    paddingBottom: Math.max(16, insets.bottom),
    paddingLeft: Math.max(16, insets.left),
  };

  const returnToHub = async () => {
    await saveForgeSave(userHash, save);
    await updateCharacterProgress(userHash, (current) => ({
      ...current,
      equippedWeaponLevel: Math.max(current.equippedWeaponLevel, save.level),
      bestForgeLevel: Math.max(current.bestForgeLevel, save.bestLevel),
      enhancementMaterials: Math.max(current.enhancementMaterials, materials),
      equippedShoulder,
      lastContent: "forge",
    }));
    onBack();
  };

  const shoulderMeta: Array<{ id: ShoulderId; name: string; effect: string }> = [
    { id: "scout", name: "정찰 견갑", effect: "이동속도 +3%" },
    { id: "shadow", name: "그림자 견갑", effect: "대시 쿨타임 -5%" },
    { id: "ogre", name: "오우거 철갑", effect: "추가 체력 +1" },
    { id: "dragon", name: "화염 용린 견갑", effect: "피격 무적시간 +10%" },
  ];

  const equipShoulder = (id: ShoulderId | null) => {
    if (id && !ownedShoulders.includes(id)) return;
    setEquippedShoulder(id);
    void updateCharacterProgress(userHash, (current) => ({ ...current, equippedShoulder: id, lastContent: "forge" }));
    flashToast(id ? "견갑을 장착했습니다" : "견갑을 해제했습니다");
  };

  if (!ready) {
    return (
      <div className="forge-layer forge-loading">
        <p>대장간 불을 피우는 중…</p>
      </div>
    );
  }

  return (
    <div className="forge-layer" style={forgeStyle}>
      <header className="forge-header">
        <button type="button" className="forge-back" onClick={() => void returnToHub()}>
          ← 타이탄 사냥터
        </button>
        <div className="forge-wallet">
          <span>GOLD</span>
          <strong>{formatGold(save.gold)}</strong>
        </div>
      </header>

      {view === "title" ? (
        <main className="forge-title-screen">
          <p className="forge-kicker">THIRD GAME · BLACKSMITH</p>
          <EquippedCharacter mode="idle" frame={0} weaponLevel={save.level} shoulder={equippedShoulder} className="forge-character-preview" />
          <h1>검 강화하기</h1>
          <p className="forge-title-desc">
            강화 · 실패 시 방지권 · 조각 줍기 · 조합소
          </p>
          <div className="forge-mode-pick">
            <button type="button" onClick={() => startMode("steady")}>
              <strong>이지모드</strong>
              <span>기본 성공률 · 안정적으로 키우기</span>
            </button>
            <button type="button" className="risk" onClick={() => startMode("rush")}>
              <strong>하드모드</strong>
              <span>성공률 ↓ · 판매가·조각 보상 ↑</span>
            </button>
          </div>
          <p className="forge-note">최고 기록 +{save.bestLevel} · 방지권 {save.tickets} · 조각 {save.shards}</p>
          {(save.level > 0 || save.totalAttempts > 0) && (
            <button type="button" className="forge-sell" onClick={() => setView("forge")}>
              이어하기 (+{save.level} {tier.name})
            </button>
          )}
        </main>
      ) : (
        <main className="forge-shell">
          <section className="forge-title-row">
            <div>
              <p className="forge-kicker">
                {save.mode === "rush" ? "HARD MODE" : "EASY MODE"}
              </p>
              <h1>검 강화하기</h1>
            </div>
            <div className="forge-best">
              최고 기록
              <strong>+{save.bestLevel}</strong>
            </div>
          </section>

          <div className="forge-tabs" role="tablist">
            <button
              type="button"
              className={view === "forge" ? "on" : ""}
              onClick={() => setView("forge")}
            >
              대장간
            </button>
            <button
              type="button"
              className={view === "exchange" ? "on" : ""}
              onClick={() => setView("exchange")}
            >
              조합소
            </button>
            <button type="button" className={view === "armor" ? "on" : ""} onClick={() => setView("armor")}>보호구</button>
          </div>

          {view === "forge" ? (
            <>
              <section className={`forge-stage forge-phase-${phase}`} style={swordStyle}>
                <div className="forge-embers" aria-hidden="true">
                  {Array.from({ length: 12 }, (_, i) => (
                    <i
                      key={i}
                      style={
                        {
                          "--ember-i": i,
                          left: `${(i * 37) % 100}%`,
                        } as CSSProperties
                      }
                    />
                  ))}
                </div>
                <div className="sword-aura" />
                <SwordArt level={save.level} hue={tier.hue} name={tier.name} />
                <div className="forge-sword-name">
                  <span>+{save.level}</span>
                  <strong>{tier.name}</strong>
                </div>
                {phase === "forging" && <div className="forge-impact">강화 중…</div>}
                {phase === "success" && <div className="forge-impact success">SUCCESS!</div>}
                {phase === "sold" && <div className="forge-impact sold">SOLD</div>}
              </section>

              <section className="forge-panel">
                <div className="forge-stats forge-stats-4">
                  <div>
                    <span>강화 비용</span>
                    <strong>{maxed ? "MAX" : `${formatGold(tier.cost)}G`}</strong>
                  </div>
                  <div>
                    <span>성공 확률</span>
                    <strong>{maxed ? "—" : `${Math.round(boostedChance * 1000) / 10}%`}</strong>
                  </div>
                  <div>
                    <span>판매 가격</span>
                    <strong>{formatGold(sell)}G</strong>
                  </div>
                  <div>
                    <span>방지권</span>
                    <strong>{save.tickets}장</strong>
                  </div>
                </div>

                <p className="forge-note">
                  원정 재료 {materials}개 {materials > 0 ? "· 이번 강화 성공률 +8%" : "· 화살 원정에서 획득"}
                </p>

                <button
                  type="button"
                  className="forge-button"
                  disabled={!canEnhance}
                  onClick={enhance}
                >
                  {maxed ? "최고 단계 달성" : phase === "forging" ? "두드리는 중…" : "강화하기"}
                </button>
                <button
                  type="button"
                  className="forge-sell"
                  disabled={save.level === 0 || phase !== "idle"}
                  onClick={sellSword}
                >
                  현재 검 판매 · {formatGold(sell)}G
                </button>
                <button type="button" className="forge-sell" onClick={() => setView("title")}>
                  모드 선택으로
                </button>
              </section>
            </>
          ) : view === "exchange" ? (
            <section className="forge-exchange">
              <div className="forge-inventory">
                <div>
                  <span>방지권</span>
                  <strong>{save.tickets}장</strong>
                </div>
                <div>
                  <span>검 조각</span>
                  <strong>{save.shards}개</strong>
                </div>
                <div>
                  <span>총 강화</span>
                  <strong>{save.totalAttempts}회</strong>
                </div>
              </div>
              <article className="forge-shop-card">
                <div>
                  <strong>강화 방지권</strong>
                  <p>실패 시 단계에 따라 1~5장 소모해 검을 살립니다.</p>
                </div>
                <button type="button" disabled={save.gold < ticketPrice} onClick={buyTicket}>
                  {formatGold(ticketPrice)}G
                </button>
              </article>
              <article className="forge-shop-card">
                <div>
                  <strong>조각 → 방지권</strong>
                  <p>검 조각 25개를 방지권 1장으로 교환합니다.</p>
                </div>
                <button type="button" disabled={save.shards < 25} onClick={exchangeTicket}>
                  조합하기
                </button>
              </article>
              <article className="forge-shop-card">
                <div>
                  <strong>조각 → 검</strong>
                  <p>조각 {swordCraftCost}개로 +3 강철 장검을 만듭니다.</p>
                </div>
                <button
                  type="button"
                  disabled={save.shards < swordCraftCost || phase !== "idle"}
                  onClick={craftSword}
                >
                  검 조합
                </button>
              </article>
              <button type="button" className="forge-sell" onClick={resetSave}>
                세이브 초기화
              </button>
              <p className="forge-note">
                실패 후 「줍기」로 조각을 모으세요. 하드모드는 조각·판매가가 더 높습니다.
              </p>
            </section>
          ) : (
            <section className="forge-panel armor-panel">
              <h2>원정 견갑</h2>
              <p>화살 원정 최초 클리어 또는 드롭으로 획득합니다.</p>
              <button type="button" className="forge-sell" onClick={() => equipShoulder(null)}>보호구 해제</button>
              {shoulderMeta.map((item) => {
                const owned = ownedShoulders.includes(item.id);
                const equipped = equippedShoulder === item.id;
                return <article key={item.id} className="titans-card">
                  <i className={`armor-preview armor-${item.id}`} />
                  <div><strong>{item.name}</strong><p>{item.effect} · {owned ? "보유" : "미획득"}</p></div>
                  <button type="button" disabled={!owned || equipped} onClick={() => equipShoulder(item.id)}>{equipped ? "장착 중" : "장착"}</button>
                </article>;
              })}
            </section>
          )}
        </main>
      )}

      {phase === "failure" && (
        <div className="forge-failure" role="dialog" aria-modal="true">
          <div className="forge-failure-card">
            <p>ENHANCE FAILED</p>
            <h2>검이 부서졌습니다</h2>
            <span>
              +{save.level} {tier.name}
            </span>
            <button
              type="button"
              className="forge-rescue"
              disabled={save.tickets < ticketNeed}
              onClick={useProtection}
            >
              방지권 {ticketNeed}장으로 복구
              <small>보유 {save.tickets}장</small>
            </button>
            <button type="button" className="forge-scrap" onClick={collectShards}>
              조각 {tier.shards * (save.mode === "rush" ? 2 : 1)}개 줍기
              <small>검은 +0으로 돌아갑니다</small>
            </button>
          </div>
        </div>
      )}

      {toast && <div className="forge-toast">{toast}</div>}
    </div>
  );
}
