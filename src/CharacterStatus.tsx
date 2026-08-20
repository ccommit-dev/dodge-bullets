import { useEffect, useMemo, useState } from "react";
import { loadBeatRpg } from "./game/storage";
import { skillTotal, SKILL_LABEL, type BeatRpgProgress, type SkillId } from "./beat/rpg";
import { loadForgeSave } from "./forge/storage";
import { defaultForgeSave, tierAt, type ForgeSave } from "./forge/model";
import { loadTitansSave } from "./titans/storage";
import {
  HEROES,
  defaultTitansSave,
  tapDamage,
  totalHeroDps,
  type TitansSave,
} from "./titans/model";
import type { SafeInsets } from "./game/toss";
import {
  combatPower,
  progressToNextLevel,
  totalSkillMastery,
  type CharacterProgress,
  type EvolutionPath,
} from "./progression/model";
import { updateCharacterProgress } from "./progression/storage";
import {
  IDLE,
  idleCapHours,
  idleMultiplier,
  idleRate,
  slotLevels,
  stageCeilingFor,
} from "./progression/idle";
import { HUNTING_AREAS } from "./titans/model";
import { BADGES, earnedBadgeIds } from "./progression/badges";
import { EquippedCharacter } from "./ui/EquippedCharacter";
import { ContentIcon } from "./ui/ContentIcon";

type CharacterStatusProps = {
  insets: SafeInsets;
  userHash: string;
  coins: number;
  highScore: number;
  progress: CharacterProgress;
  refreshKey: number;
  onOpenContent: (content: "dodge" | "beat" | "forge" | "titans") => void;
  onProgressChange: (progress: CharacterProgress) => void;
  onBack: () => void;
};

export function CharacterStatus({
  insets,
  userHash,
  coins,
  highScore,
  progress,
  refreshKey,
  onOpenContent,
  onProgressChange,
  onBack,
}: CharacterStatusProps) {
  const [beat, setBeat] = useState<BeatRpgProgress | null>(null);
  const [forge, setForge] = useState<ForgeSave>(() => defaultForgeSave());
  const [titans, setTitans] = useState<TitansSave>(() => defaultTitansSave());
  const [previewFrame, setPreviewFrame] = useState(0);
  const [growthMessage, setGrowthMessage] = useState("");

  useEffect(() => {
    const id = window.setInterval(() => setPreviewFrame((frame) => (frame + 1) % 4), 180);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([loadBeatRpg(userHash), loadForgeSave(userHash), loadTitansSave(userHash)]).then(
      ([nextBeat, nextForge, nextTitans]) => {
        if (cancelled) return;
        setBeat(nextBeat);
        setForge(nextForge);
        setTitans(nextTitans);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [refreshKey, userHash]);

  const summary = useMemo(() => {
    const mastery = Math.max(beat ? skillTotal(beat.skills) : 0, totalSkillMastery(progress));
    const allies = HEROES.filter((hero) => titans.heroes[hero.id] > 0).length;
    const power = Math.max(
      combatPower(progress),
      tapDamage(titans.equipmentTraining.weaponMastery) +
        Math.floor(totalHeroDps(titans.heroes)) +
        mastery * 3 +
        forge.bestLevel * 12,
    );
    return { mastery, allies, combatPower: power };
  }, [beat, forge.bestLevel, progress, titans]);

  const levelProgress = progressToNextLevel(progress);
  const recommendation =
    progress.enhancementMaterials < 8
      ? { title: "화살 원정에서 강화 재료 모으기", content: "dodge" as const }
      : progress.equippedWeaponLevel < Math.min(15, progress.level)
        ? { title: "대장간에서 장착 검 강화하기", content: "forge" as const }
        : summary.mastery < progress.level * 3
          ? { title: "비트 수련으로 스킬 숙련 올리기", content: "beat" as const }
          : { title: "타이탄 사냥터에서 레벨 올리기", content: "titans" as const };

  const skills = (Object.keys(SKILL_LABEL) as SkillId[]).map((id) => ({
    id,
    label: SKILL_LABEL[id],
    level: Math.max(beat?.skills[id] ?? 0, progress.beatSkills[id]),
  }));
  const earnedBadges = earnedBadgeIds(progress);
  const rebirthRequirement = 30 + progress.rebirthCount * 20;
  const canRebirth = progress.titanBestStage >= rebirthRequirement;

  const chooseEvolution = async (path: Exclude<EvolutionPath, "novice">) => {
    if (progress.rebirthCount < 1 || progress.evolutionPoints < 1) {
      setGrowthMessage("환생 후 얻은 진화 포인트가 필요합니다.");
      return;
    }
    const next = await updateCharacterProgress(userHash, (current) => ({
      ...current,
      evolutionPath: path,
      evolutionPoints: Math.max(0, current.evolutionPoints - 1),
    }));
    onProgressChange(next);
    setGrowthMessage("진화 계통이 적용되었습니다.");
  };

  const rebirth = async () => {
    if (!canRebirth) {
      setGrowthMessage(`사냥터 Stage ${rebirthRequirement}부터 환생할 수 있습니다.`);
      return;
    }
    const crystals = Math.max(3, Math.floor(Math.sqrt(progress.titanBestStage) * 3));
    const next = await updateCharacterProgress(userHash, (current) => ({
      ...current,
      rebirthCount: current.rebirthCount + 1,
      inheritanceCrystals: current.inheritanceCrystals + crystals,
      evolutionPoints: current.evolutionPoints + 1,
      claimedBadges: [...new Set([...current.claimedBadges, ...earnedBadgeIds(current), "rebirth-one"])],
    }));
    onProgressChange(next);
    setGrowthMessage(`계승 완료 · 계승 결정 +${crystals}, 진화 포인트 +1`);
  };

  return (
    <div
      className="character-page"
      style={{
        paddingTop: Math.max(72, insets.top + 64),
        paddingRight: Math.max(18, insets.right + 18),
        paddingBottom: Math.max(28, insets.bottom + 20),
        paddingLeft: Math.max(18, insets.left + 18),
      }}
    >
      <header className="character-header">
        <div>
          <p className="character-eyebrow">MY PAGE</p>
          <h1>마이페이지</h1>
          <p>네 콘텐츠의 성장이 하나의 캐릭터에 합산됩니다.</p>
        </div>
        <button type="button" className="character-back" onClick={onBack}>
          콘텐츠
        </button>
      </header>

      <section className="character-hero-card">
        <div className="character-equipment-preview">
          <div className="character-equipment-facing">
            <EquippedCharacter mode="idle" frame={previewFrame} weaponLevel={progress.equippedWeaponLevel} shoulder={progress.equippedShoulder} evolution={progress.evolutionPath} />
          </div>
        </div>
        <div className="character-identity">
          <span>Lv.{progress.level} · 통합 전투력</span>
          <strong>{summary.combatPower.toLocaleString()}</strong>
          <small>EXP {levelProgress.current}/{levelProgress.required}</small>
          <i className="character-exp"><b style={{ width: `${levelProgress.ratio * 100}%` }} /></i>
        </div>
        <div className="character-quick-stats">
          <span><b>{Math.max(coins, progress.sharedCoins).toLocaleString()}</b> 공용 코인</span>
          <span><b>{titans.gold.toLocaleString()}</b> 사냥 골드</span>
          <span><b>{Math.max(beat?.sp ?? 0, progress.skillPoints)}</b> 스킬 포인트</span>
        </div>
      </section>

      <section className="idle-panel">
        <div className="legacy-heading">
          <div>
            <small>IDLE FORMULA</small>
            <strong>방치 공식</strong>
          </div>
          <span>4개 콘텐츠가 변수 하나씩</span>
        </div>
        <p className="idle-panel-formula">
          초당 산출 = killGold(<b>S</b>) × <b>R</b> × <b>M</b> · 누적 상한 <b>T</b>
        </p>
        <div className="idle-panel-grid">
          <button type="button" className="idle-var var-S" onClick={() => onOpenContent("titans")}>
            <span className="idle-var-key">S</span>
            <b>Stage {titans.stage}</b>
            <small>사냥터 · 상한 {stageCeilingFor(progress.pioneeredArea)}</small>
            <em>
              {progress.pioneeredArea} / {HUNTING_AREAS.length} 지역 개척
            </em>
          </button>
          <button type="button" className="idle-var var-R" onClick={() => onOpenContent("beat")}>
            <span className="idle-var-key">R</span>
            <b>{(idleRate(progress, titans.skillInventory.equipped) * 100).toFixed(1)}%</b>
            <small>연습실 · 최대 {IDLE.rateCap * 100}%</small>
            <em>
              슬롯{" "}
              {(Object.values(slotLevels(progress)) as number[]).reduce((a, b) => a + b, 0)} / 15
            </em>
          </button>
          <button type="button" className="idle-var var-M" onClick={() => onOpenContent("forge")}>
            <span className="idle-var-key">M</span>
            <b>×{idleMultiplier(progress).toFixed(2)}</b>
            <small>대장간 · 최대 ×{IDLE.multCap}</small>
            <em>
              +{progress.bestForgeLevel} · 재련 {progress.reforgeRank} · 결정{" "}
              {progress.inheritanceCrystals}
            </em>
          </button>
          <button type="button" className="idle-var var-T" onClick={() => onOpenContent("dodge")}>
            <span className="idle-var-key">T</span>
            <b>{idleCapHours(progress)}시간</b>
            <small>화살 원정 · 최대 {IDLE.hoursCap}시간</small>
            <em>
              원정 {Math.min(4, progress.dodgeBestStage)}/4 · 성벽 {progress.towerBestFloor}층
            </em>
          </button>
        </div>
      </section>

      <section className="legacy-growth">
        <div className="legacy-heading"><div><small>COLLECTION</small><strong>모험 배지</strong></div><span>{earnedBadges.length}/{BADGES.length}</span></div>
        <div className="badge-grid">
          {BADGES.map((badge) => <div key={badge.id} className={`badge-chip ${earnedBadges.includes(badge.id) ? "earned" : "locked"}`} title={badge.condition}><b>{badge.icon}</b><span>{badge.name}<small>{badge.condition}</small></span></div>)}
        </div>
        <div className="legacy-heading"><div><small>REBIRTH · EVOLUTION</small><strong>계승과 진화</strong></div><span>결정 {progress.inheritanceCrystals} · 배율 +{(progress.inheritanceCrystals * IDLE.multPerCrystal).toFixed(2)}</span></div>
        <div className="evolution-tree">
          <button type="button" className={progress.evolutionPath === "swordmaster" ? "selected" : ""} onClick={() => void chooseEvolution("swordmaster")}><b>검성</b><small>치명타 · 방치 배율 +0.15</small></button>
          <button type="button" className={progress.evolutionPath === "guardian" ? "selected" : ""} onClick={() => void chooseEvolution("guardian")}><b>수호자</b><small>생존 · 방치 시간 +2h</small></button>
          <button type="button" className={progress.evolutionPath === "arcane" ? "selected" : ""} onClick={() => void chooseEvolution("arcane")}><b>공명술사</b><small>비트 · 방치 효율 +3%p</small></button>
        </div>
        <button type="button" className="rebirth-button" disabled={!canRebirth} onClick={() => void rebirth()}>환생 {progress.rebirthCount}회 · {canRebirth ? "계승 시작" : `Stage ${rebirthRequirement} 필요`}</button>
        {growthMessage && <p className="growth-message">{growthMessage}</p>}
      </section>

      <section className="equipment-strip" aria-label="장착 장비">
        <div><small>무기</small><strong>+{progress.equippedWeaponLevel} {tierAt(Math.min(15, progress.equippedWeaponLevel)).name}</strong></div>
        <div><small>견갑</small><strong>{progress.equippedShoulder ? ({ scout: "정찰 견갑", shadow: "그림자 견갑", ogre: "오우거 견갑", dragon: "용린 견갑" } as const)[progress.equippedShoulder] : "미장착"}</strong></div>
        <div><small>재료</small><strong>{progress.enhancementMaterials}개</strong></div>
      </section>

      <button type="button" className="character-goal" onClick={() => onOpenContent(recommendation.content)}>
        <span>다음 성장 목표</span>
        <strong>{recommendation.title}</strong>
        <b>바로가기 ›</b>
      </button>

      <div className="character-content-grid">
        <button type="button" className="status-card status-skill" onClick={() => onOpenContent("beat")}>
          <ContentIcon name="beat" className="status-icon" />
          <span className="status-copy">
            <small>스킬 수련</small>
            <strong>비트 숙련도 {summary.mastery}</strong>
            <em>{skills.map((skill) => `${skill.label} ${skill.level}`).join(" · ")}</em>
          </span>
          <span className="status-enter">수련하기 ›</span>
        </button>

        <button type="button" className="status-card status-wealth" onClick={() => onOpenContent("dodge")}>
          <ContentIcon name="dodge" className="status-icon" />
          <span className="status-copy">
            <small>재화 원정</small>
            <strong>코인 {Math.max(coins, progress.sharedCoins).toLocaleString()}</strong>
            <em>재료 {progress.enhancementMaterials} · 최고 점수 {Math.max(highScore, progress.dodgeBestScore).toLocaleString()}</em>
          </span>
          <span className="status-enter">원정하기 ›</span>
        </button>

        <button type="button" className="status-card status-hunt" onClick={() => onOpenContent("titans")}>
          <ContentIcon name="hunt" className="status-icon" />
          <span className="status-copy">
            <small>레벨 · 사냥터</small>
            <strong>최고 사냥터 {titans.bestStage}</strong>
            <em>현재 Stage {titans.stage} · 동료 {summary.allies}/{HEROES.length}</em>
          </span>
          <span className="status-enter">사냥하기 ›</span>
        </button>

        <button type="button" className="status-card status-item" onClick={() => onOpenContent("forge")}>
          <ContentIcon name="forge" className="status-icon" />
          <span className="status-copy">
            <small>아이템 · 강화</small>
            <strong>+{forge.level} {tierAt(forge.level).name}</strong>
            <em>최고 +{forge.bestLevel} · 조각 {forge.shards} · 방지권 {forge.tickets}</em>
          </span>
          <span className="status-enter">강화하기 ›</span>
        </button>
      </div>

      <p className="character-footnote">각 콘텐츠에서 얻은 기록은 캐릭터 상태에 자동 반영됩니다.</p>
    </div>
  );
}
