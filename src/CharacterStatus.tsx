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
} from "./progression/model";
import { CharacterAvatar } from "./ui/CharacterAvatar";

type CharacterStatusProps = {
  insets: SafeInsets;
  userHash: string;
  coins: number;
  highScore: number;
  progress: CharacterProgress;
  refreshKey: number;
  onOpenContent: (content: "dodge" | "beat" | "forge" | "titans") => void;
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
  onBack,
}: CharacterStatusProps) {
  const [beat, setBeat] = useState<BeatRpgProgress | null>(null);
  const [forge, setForge] = useState<ForgeSave>(() => defaultForgeSave());
  const [titans, setTitans] = useState<TitansSave>(() => defaultTitansSave());

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
      tapDamage(titans.swordLevel) +
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
        <CharacterAvatar weaponLevel={progress.equippedWeaponLevel} size={82} />
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

      <section className="equipment-strip" aria-label="장착 장비">
        <div><small>무기</small><strong>+{progress.equippedWeaponLevel} {tierAt(Math.min(15, progress.equippedWeaponLevel)).name}</strong></div>
        <div><small>방어구</small><strong>원정대 경갑</strong></div>
        <div><small>재료</small><strong>{progress.enhancementMaterials}개</strong></div>
      </section>

      <button type="button" className="character-goal" onClick={() => onOpenContent(recommendation.content)}>
        <span>다음 성장 목표</span>
        <strong>{recommendation.title}</strong>
        <b>바로가기 ›</b>
      </button>

      <div className="character-content-grid">
        <button type="button" className="status-card status-skill" onClick={() => onOpenContent("beat")}>
          <span className="status-icon">◈</span>
          <span className="status-copy">
            <small>스킬 수련</small>
            <strong>비트 숙련도 {summary.mastery}</strong>
            <em>{skills.map((skill) => `${skill.label} ${skill.level}`).join(" · ")}</em>
          </span>
          <span className="status-enter">수련하기 ›</span>
        </button>

        <button type="button" className="status-card status-wealth" onClick={() => onOpenContent("dodge")}>
          <span className="status-icon">◆</span>
          <span className="status-copy">
            <small>재화 원정</small>
            <strong>코인 {Math.max(coins, progress.sharedCoins).toLocaleString()}</strong>
            <em>재료 {progress.enhancementMaterials} · 최고 점수 {Math.max(highScore, progress.dodgeBestScore).toLocaleString()}</em>
          </span>
          <span className="status-enter">원정하기 ›</span>
        </button>

        <button type="button" className="status-card status-hunt" onClick={() => onOpenContent("titans")}>
          <span className="status-icon">▲</span>
          <span className="status-copy">
            <small>레벨 · 사냥터</small>
            <strong>최고 사냥터 {titans.bestStage}</strong>
            <em>현재 Stage {titans.stage} · 동료 {summary.allies}/{HEROES.length}</em>
          </span>
          <span className="status-enter">사냥하기 ›</span>
        </button>

        <button type="button" className="status-card status-item" onClick={() => onOpenContent("forge")}>
          <span className="status-icon">✦</span>
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
