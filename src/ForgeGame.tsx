import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { assetUrl } from "./asset";
import type { SafeInsets } from "./game/toss";
import {
  FORGE_STARTER_COINS,
  defaultForgeSave,
  effectiveChance,
  effectiveSell,
  formatGold,
  protectionCost,
  reforgeChance,
  reforgeConsolationShards,
  reforgeCost,
  shardSwordCost,
  tierAt,
  type ForgeSave,
} from "./forge/model";
import { sfxReforge } from "./ui/sfx";
import { requestReviewOnce } from "./game/native";
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

const MATERIAL_GUIDE = [
  ["철광석", "검", "화살 원정 · 일반 화살 검격", "32%"],
  ["정제 철편", "검", "화살 원정 · 분열 화살 2단", "18%"],
  ["바람 깃", "검", "화살 원정 · 완벽 회피", "14%"],
  ["저격수 렌즈", "검", "화살 원정 · 붉은 조준선 반격", "9%"],
  ["폭발 촉매", "검", "화살 원정 · 폭발 화살 파괴", "8%"],
  ["왕실 강철", "검", "화살 원정 · 정예 상자", "5%"],
  ["보스 화살촉", "검", "화살 원정 · 보스 화살 절단", "100%"],
  ["공명 가루", "견갑", "비트 원정 · 곡 클리어", "70%"],
  ["박자 결정", "견갑", "비트 원정 · PERFECT", "16%/노트"],
  ["콤보 코어", "견갑", "비트 원정 · 30 COMBO", "35%"],
  ["피버 프리즘", "견갑", "비트 원정 · FEVER ×3 이상", "45%"],
  ["DROP 심장", "견갑", "비트 원정 · 보스곡 클리어", "100%"],
  ["별빛 현", "공용", "비트 원정 · FULL COMBO", "12%"],
  ["원정 인장", "공용", "화살 원정 · 노히트 탈출", "100%"],
] as const;

export function ForgeGame({ insets, userHash, onBack }: ForgeGameProps) {
  const [save, setSave] = useState<ForgeSave>(() => defaultForgeSave());
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<ForgeView>("title");
  const [phase, setPhase] = useState<ForgePhase>("idle");
  const [toast, setToast] = useState("");
  const [materials, setMaterials] = useState(0);
  /** 대장간 지갑 = 공유 골드. 방치 정산이 여기로 들어오고 강화가 여기서 빠진다. */
  const [coins, setCoins] = useState(0);
  const [reforgeRank, setReforgeRank] = useState(0);
  const [reforgePhase, setReforgePhase] = useState<"idle" | "rolling" | "hit" | "miss">("idle");
  const [ownedShoulders, setOwnedShoulders] = useState<ShoulderId[]>([]);
  const [equippedShoulder, setEquippedShoulder] = useState<ShoulderId | null>(null);
  const [shoulderShards, setShoulderShards] = useState(0);
  const timerRef = useRef<number | null>(null);
  const firstClearRef = useRef("");
  const toastRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([loadForgeSave(userHash), loadCharacterProgress(userHash)]).then(async ([loaded, character]) => {
      if (cancelled) return;
      let forge = loaded;
      let progress = character;

      // v4 → v5 지갑 통합. 구 대장간 골드를 공유 지갑으로 한 번만 옮긴다.
      // 한 번도 강화하지 않은 세이브는 구 기본값(1,000,000)을 들고 있을 뿐이므로
      // 이관 대신 개업 자금만 지급해 초반 인플레를 막는다.
      if (!forge.goldMigrated) {
        const carried = forge.totalAttempts > 0 ? forge.gold : FORGE_STARTER_COINS;
        progress = await updateCharacterProgress(userHash, (current) => ({
          ...current,
          sharedCoins: current.sharedCoins + carried,
        }));
        forge = await saveForgeSave(userHash, { ...forge, gold: 0, goldMigrated: true });
        if (carried > 0) flashToast(`대장간 지갑 통합 · 공유 골드 +${formatGold(carried)}`);
      }

      if (cancelled) return;
      setSave(forge);
      setCoins(progress.sharedCoins);
      setReforgeRank(progress.reforgeRank);
      setMaterials(progress.enhancementMaterials);
      firstClearRef.current = progress.firstClearDates.forge;
      setOwnedShoulders(progress.ownedShoulders);
      setEquippedShoulder(progress.equippedShoulder);
      setShoulderShards(progress.shoulderShards);
      setPhase(forge.pendingFailure ? "failure" : "idle");
      setView(forge.pendingFailure || forge.level > 0 || forge.totalAttempts > 0 ? "forge" : "title");
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
  const canEnhance = !maxed && coins >= tier.cost && phase === "idle";
  const ticketPrice = 25_000 + save.tickets * 10_000;
  const swordCraftCost = shardSwordCost(3);
  const armorCost = Math.floor(500 * Math.pow(1.72, save.armorLevel));
  const armorMaterialNeed = save.armorLevel < 5 ? 1 : 2 + Math.floor((save.armorLevel - 5) / 4);
  const armorBeatNeed = save.armorLevel < 5 ? 0 : 1 + Math.floor((save.armorLevel - 5) / 5);
  const armorChance = Math.max(.38, .94 - save.armorLevel * .045);
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

  /** 공유 골드 증감 — 화면 상태와 저장소를 함께 움직인다. */
  const changeCoins = (delta: number) => {
    setCoins((value) => Math.max(0, value + delta));
    void updateCharacterProgress(userHash, (current) => ({
      ...current,
      sharedCoins: Math.max(0, current.sharedCoins + delta),
      lastContent: "forge",
    }));
  };

  const startMode = (mode: ForgeSave["mode"]) => {
    setSave((prev) => ({ ...prev, mode }));
    setView("forge");
    setPhase(save.pendingFailure ? "failure" : "idle");
  };

  const enhance = () => {
    if (!canEnhance) return;
    const success = Math.random() < boostedChance;
    const spendMaterial = materials > 0;
    if (spendMaterial) setMaterials((value) => Math.max(0, value - 1));
    setCoins((value) => Math.max(0, value - tier.cost));
    setPhase("forging");
    // 재료 차감과 골드 차감을 한 번의 갱신으로 묶는다.
    // updateCharacterProgress는 load→modify→save라 두 번 나누면 인터리브 시
    // 한쪽이 유실돼 공짜 강화가 된다.
    void updateCharacterProgress(userHash, (current) => ({
      ...current,
      sharedCoins: Math.max(0, current.sharedCoins - tier.cost),
      enhancementMaterials: spendMaterial
        ? Math.max(0, current.enhancementMaterials - 1)
        : current.enhancementMaterials,
      lastContent: "forge",
    }));
    setSave((prev) => ({
      ...prev,
      totalAttempts: prev.totalAttempts + 1,
    }));
    timerRef.current = window.setTimeout(() => {
      if (success) {
        setSave((prev) => {
          const nextLevel = Math.min(15, prev.level + 1);
          // 첫 +15(초월자의 검) 달성 — 강화 루프의 정점, 리뷰 요청 적기
          if (nextLevel === 15 && prev.level === 14) void requestReviewOnce("first-plus15");
          // 오늘의 첫 강화 성공 2배 (LIVEOPS §2.4)
          const forgeToday = new Date().toLocaleDateString("sv-SE");
          const firstToday = firstClearRef.current !== forgeToday;
          if (firstToday) {
            firstClearRef.current = forgeToday;
            flashToast("오늘의 첫 강화 성공 · 경험치 2배!");
            void updateCharacterProgress(userHash, (current) => ({
              ...current,
              firstClearDates: { ...current.firstClearDates, forge: forgeToday },
            }));
          }
          void grantCharacterReward(userHash, `forge:${prev.totalAttempts}:${Date.now()}`, {
            exp: (PROGRESSION_BALANCE.forge.successExp + nextLevel * 2) * (firstToday ? 2 : 1),
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
    changeCoins(sell);
    setSave((prev) => ({ ...prev, level: 0 }));
    setPhase("sold");
    flashToast(`판매 완료 +${formatGold(sell)}G`);
    timerRef.current = window.setTimeout(() => setPhase("idle"), RESULT_MS);
  };

  const buyTicket = () => {
    if (coins < ticketPrice) return;
    changeCoins(-ticketPrice);
    setSave((prev) => ({ ...prev, tickets: prev.tickets + 1 }));
    flashToast("방지권 +1");
  };

  const exchangeTicket = () => {
    if (save.shards < 25) return;
    setSave((prev) => ({ ...prev, shards: prev.shards - 25, tickets: prev.tickets + 1 }));
    flashToast("조각을 방지권으로 교환했습니다");
  };

  const exchangeShoulderTicket = async () => {
    if (shoulderShards < 20) return;
    setShoulderShards((value) => value - 20);
    setSave((prev) => ({ ...prev, tickets: prev.tickets + 1 }));
    await updateCharacterProgress(userHash, (current) => ({ ...current, shoulderShards:Math.max(0,current.shoulderShards-20), lastContent:"forge" }));
    flashToast("견갑 조각을 공용 방지권으로 교환했습니다");
  };

  const craftShoulder = async () => {
    if (shoulderShards < 30) return;
    const next = shoulderMeta.find((item) => !ownedShoulders.includes(item.id));
    if (!next) { flashToast("모든 견갑을 보유하고 있습니다"); return; }
    setShoulderShards((value) => value - 30);
    setOwnedShoulders((value) => [...value, next.id]);
    setEquippedShoulder(next.id);
    await updateCharacterProgress(userHash, (current) => ({ ...current, shoulderShards:Math.max(0,current.shoulderShards-30), ownedShoulders:[...new Set([...current.ownedShoulders,next.id])], equippedShoulder:next.id, lastContent:"forge" }));
    flashToast(`${next.name} 조합·장착 완료`);
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

  /**
   * 무한 재련 — +15 도달 후 열리는 반복 루프.
   * 성공하면 재련 등급이 올라 방치 배율(M)에 영구히 붙고, 실패해도 조각을 돌려받는다.
   * 강화와 달리 검 등급이 내려가지 않아 "끝이 없는" 파밍 지점이 된다.
   */
  const reforge = () => {
    const cost = reforgeCost(reforgeRank);
    if (save.level < 15 || coins < cost || reforgePhase !== "idle") return;
    const success = Math.random() < reforgeChance(reforgeRank);
    changeCoins(-cost);
    setSave((prev) => ({ ...prev, reforgeAttempts: prev.reforgeAttempts + 1 }));
    setReforgePhase("rolling");
    timerRef.current = window.setTimeout(() => {
      sfxReforge(success);
      if (success) {
        const nextRank = reforgeRank + 1;
        setReforgeRank(nextRank);
        setReforgePhase("hit");
        void updateCharacterProgress(userHash, (current) => ({
          ...current,
          reforgeRank: Math.max(current.reforgeRank, nextRank),
          lastContent: "forge",
        }));
        flashToast(`재련 성공 · 등급 ${nextRank} · 방치 배율 +${(nextRank * 0.02).toFixed(2)}`);
      } else {
        const shards = reforgeConsolationShards(reforgeRank);
        setReforgePhase("miss");
        setSave((prev) => ({ ...prev, shards: prev.shards + shards }));
        setMaterials((value) => value + shards);
        void updateCharacterProgress(userHash, (current) => ({
          ...current,
          enhancementMaterials: current.enhancementMaterials + shards,
          lastContent: "forge",
        }));
        flashToast(`재련 실패 · 검 조각 +${shards}`);
      }
      timerRef.current = window.setTimeout(() => setReforgePhase("idle"), RESULT_MS * 2);
    }, FORGE_MS * 2);
  };

  const resetSave = () => {
    if (!window.confirm("현재 모드 세이브를 초기화할까요?")) return;
    // goldMigrated를 유지한다 — 초기화할 때마다 개업 자금 50,000이 다시 지급되면
    // 리셋 버튼이 무한 골드 수도꼭지가 된다.
    const next = { ...defaultForgeSave(), mode: save.mode, goldMigrated: save.goldMigrated };
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

  const enhanceArmor = async () => {
    if (!equippedShoulder || save.armorLevel >= 15 || coins < armorCost || materials < armorMaterialNeed || shoulderShards < armorBeatNeed || phase !== "idle") return;
    setCoins((value) => value - armorCost);
    setMaterials((value) => value - armorMaterialNeed);
    setShoulderShards((value) => value - armorBeatNeed);
    setPhase("forging");
    await updateCharacterProgress(userHash, (current) => ({ ...current, sharedCoins:Math.max(0,current.sharedCoins-armorCost), enhancementMaterials:Math.max(0,current.enhancementMaterials-armorMaterialNeed), shoulderShards:Math.max(0,current.shoulderShards-armorBeatNeed), lastContent:"forge" }));
    timerRef.current = window.setTimeout(() => {
      const success = Math.random() < armorChance;
      setSave((current) => ({ ...current, tickets:!success&&current.tickets>0?current.tickets-1:current.tickets, armorAttempts:current.armorAttempts+1, armorLevel:success?Math.min(15,current.armorLevel+1):!success&&current.tickets<=0?Math.max(0,current.armorLevel-1):current.armorLevel, bestArmorLevel:success?Math.max(current.bestArmorLevel,current.armorLevel+1):current.bestArmorLevel }));
      setPhase(success ? "success" : "idle");
      flashToast(success ? `보호구 강화 성공 +${save.armorLevel+1}` : save.tickets>0 ? "보호구 강화 실패 · 방지권으로 단계 보호" : "보호구 강화 실패 · 1단계 하락");
      timerRef.current = window.setTimeout(() => setPhase("idle"), RESULT_MS);
    }, FORGE_MS);
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
          <span>공유 GOLD</span>
          <strong>{formatGold(coins)}</strong>
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
                    {!maxed && <small>{materials > 0 ? "강화석 1개 자동 사용 · +8%p" : "방치 정산 강화석으로 +8%p"}</small>}
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

                {maxed && (
                  <section className={`reforge-panel reforge-${reforgePhase}`}>
                    <div className="reforge-heading">
                      <div className="reforge-title">
                        <img src={assetUrl("ui/idle/anvil.svg")} alt="" aria-hidden="true" />
                        <span>
                          <small>ENDLESS REFORGE</small>
                          <strong>무한 재련</strong>
                        </span>
                      </div>
                      <span className="reforge-rank">등급 {reforgeRank}</span>
                    </div>
                    <p className="reforge-desc">
                      검 등급은 내려가지 않습니다. 성공하면 방치 배율이 영구히 오릅니다.
                    </p>
                    <div className="reforge-stats">
                      <div>
                        <span>비용</span>
                        <strong>{formatGold(reforgeCost(reforgeRank))}G</strong>
                      </div>
                      <div>
                        <span>성공률</span>
                        <strong>{Math.round(reforgeChance(reforgeRank) * 1000) / 10}%</strong>
                      </div>
                      <div>
                        <span>현재 배율</span>
                        <strong>+{(reforgeRank * 0.02).toFixed(2)}</strong>
                      </div>
                    </div>
                    <div className="reforge-anvil" aria-hidden="true">
                      <span className="reforge-spark" />
                      <span className="reforge-spark" />
                      <span className="reforge-spark" />
                    </div>
                    <button
                      type="button"
                      className="forge-button reforge-button"
                      disabled={coins < reforgeCost(reforgeRank) || reforgePhase !== "idle"}
                      onClick={reforge}
                    >
                      {reforgePhase === "rolling"
                        ? "재련하는 중…"
                        : reforgePhase === "hit"
                          ? "재련 성공!"
                          : reforgePhase === "miss"
                            ? `실패 · 조각 +${reforgeConsolationShards(reforgeRank)}`
                            : "재련하기"}
                    </button>
                  </section>
                )}
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
                <button type="button" disabled={coins < ticketPrice} onClick={buyTicket}>
                  {formatGold(ticketPrice)}G
                </button>
              </article>
              <article className="forge-shop-card">
                <div><strong>견갑 조각 → 방지권</strong><p>공명 견갑 조각 20개를 검·보호구 공용 방지권 1장으로 교환합니다.</p></div>
                <button type="button" disabled={shoulderShards < 20} onClick={() => void exchangeShoulderTicket()}>교환하기</button>
              </article>
              <article className="forge-shop-card">
                <div><strong>견갑 조합</strong><p>공명 견갑 조각 30개로 미보유 견갑을 순서대로 제작하고 즉시 장착합니다.</p></div>
                <button type="button" disabled={shoulderShards < 30 || ownedShoulders.length >= shoulderMeta.length} onClick={() => void craftShoulder()}>견갑 조합</button>
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
              <article className="forge-shop-card">
                <div><strong>원정 강화석</strong><p>화살 원정의 검격 처치·재료 상자·노히트 탈출에서 획득합니다. 무기와 보호구 강화에 사용합니다.</p></div>
                <span>보유 {materials}</span>
              </article>
              <article className="forge-shop-card">
                <div><strong>공명 견갑 조각</strong><p>비트 원정의 곡 클리어·콤보·FEVER 보상으로 획득합니다. 보호구 +5부터 필수입니다.</p></div>
                <span>보유 {shoulderShards}</span>
              </article>
              <section className="forge-material-guide">
                <h3>강화 재료 도감 · 획득 확률</h3>
                <p>세부 재료는 획득 즉시 검용 강화석 또는 견갑 조각으로 정제되어 현재 보유량에 합산됩니다.</p>
                <div className="forge-material-grid">
                  {MATERIAL_GUIDE.map(([name, target, source, chance]) => <article key={name} className={`material-${target}`}>
                    <b>{name}</b><em>{target}</em><span>{source}</span><strong>{chance}</strong>
                  </article>)}
                </div>
              </section>
              <button type="button" className="forge-sell" onClick={resetSave}>
                세이브 초기화
              </button>
              <p className="forge-note">
                실패 후 「줍기」로 조각을 모으세요. 하드모드는 조각·판매가가 더 높습니다.
              </p>
            </section>
          ) : (
            <section className="forge-panel armor-panel">
              <h2>보호구 강화하기</h2>
              <section className={`forge-stage armor-forge-stage forge-phase-${phase}`}>
                <div className="forge-embers" aria-hidden="true">{Array.from({length:12},(_,i)=><i key={i} style={{"--ember-i":i,left:`${(i*37)%100}%`} as CSSProperties}/>)}</div>
                <div className="sword-aura" />
                <ShoulderIcon id={equippedShoulder} />
                <div className="forge-sword-name"><span>+{save.armorLevel}</span><strong>{equippedShoulder ? shoulderMeta.find((item)=>item.id===equippedShoulder)?.name : "견갑 미장착"}</strong></div>
                {phase === "forging" && <div className="forge-impact">강화 중…</div>}{phase === "success" && <div className="forge-impact success">SUCCESS!</div>}
              </section>
              <div className="forge-stats forge-stats-4"><div><span>강화 비용</span><strong>{formatGold(armorCost)}G</strong></div><div><span>성공 확률</span><strong>{Math.round(armorChance*100)}%</strong></div><div><span>보호구 단계</span><strong>+{save.armorLevel}</strong></div><div><span>공용 방지권</span><strong>{save.tickets}장</strong></div></div>
              <p>실패 시 방지권 1장 자동 사용 · 없으면 1단계 하락</p>
              <p className="forge-note">화살 원정 강화석 {armorMaterialNeed}개{armorBeatNeed > 0 ? ` + 비트 수련 견갑 조각 ${armorBeatNeed}개` : ""} · {formatGold(armorCost)}G</p>
              <button type="button" className="forge-button" disabled={!equippedShoulder || save.armorLevel >= 15 || coins < armorCost || materials < armorMaterialNeed || shoulderShards < armorBeatNeed || phase !== "idle"} onClick={() => void enhanceArmor()}>{save.armorLevel >= 15 ? "보호구 최고 단계" : "보호구 강화"}</button>
              <button type="button" className="forge-sell" onClick={() => equipShoulder(null)}>보호구 해제</button>
              {shoulderMeta.map((item) => {
                const owned = ownedShoulders.includes(item.id);
                const equipped = equippedShoulder === item.id;
                return <article key={item.id} className="titans-card">
                  <i className={`armor-preview armor-${item.id}`} style={{ backgroundImage:`url(${assetUrl("titans/equipment/shoulders/shoulder-tier-sheet.png")})` }} />
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
