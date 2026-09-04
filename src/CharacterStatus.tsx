import { useEffect, useMemo, useState } from "react";
import { loadBeatRpg } from "./game/storage";
import { skillTotal, SKILL_LABEL, type BeatRpgProgress, type SkillId } from "./beat/rpg";
import { loadForgeSave } from "./forge/storage";
import { defaultForgeSave, tierAt, type ForgeSave } from "./forge/model";
import { loadTitansSave, rebirthResetTitans } from "./titans/storage";
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
} from "./progression/idle";
import { HUNTING_AREAS } from "./titans/model";
import { BADGES, earnedBadgeIds } from "./progression/badges";
import {
  PET_DEFS,
  PET_HATCH_KILLS,
  PET_IDS,
  petEffect,
  petFeedCost,
  type PetId,
} from "./titans/pets";
import { starMilestoneMultiplier, starMilestoneNext, totalStars } from "./progression/collection";
import { TITLES } from "./economy/gemCatalog";
import { renderShareCard, shareCard } from "./ui/shareCard";
import { sheetFor } from "./titans/anim";
import { MonsterArt } from "./titans/SpriteArt";
import { CHARACTER_LABEL, CHARACTER_SKINS } from "./titans/anim";
import { THEMES, WEAPON_FX } from "./economy/cosmetics";
import { openMomentOffer } from "./economy/momentOffers";
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
  /** I 외형: 장착 중인 무기 이펙트·전장 테마 이름 — 마이페이지 칩 + 공유 카드 서브라인 */
  const cosmeticLabels = [
    progress.equippedWeaponFx && WEAPON_FX[progress.equippedWeaponFx] ? `⚔ ${WEAPON_FX[progress.equippedWeaponFx].name}` : "",
    progress.equippedTheme && THEMES[progress.equippedTheme] ? `🌌 ${THEMES[progress.equippedTheme].name}` : "",
  ].filter(Boolean);
  const [rebirthConfirm, setRebirthConfirm] = useState(false);

  useEffect(() => {
    // idle 프레임은 AI 보일링이 있어 느리게 돌려야 떨림이 아닌 호흡으로 읽힌다 (anim.ts 참조)
    const id = window.setInterval(() => setPreviewFrame((frame) => (frame + 1) % 4), 240);
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
  // 환생 리워크 (LIVEOPS §1.4): 스테이지 숫자 대신 "벽에 부딪힌 지역 수"가 조건.
  // 벽 도달은 TitansGame이 wallAreas에 기록한다 — 유저 입장에선 "2개 지역에서 한계를
  // 본 뒤 다시 태어난다"는 서사가 Stage 30보다 명확하다.
  // 3 → 2: 밸런스 시뮬에서 15~30일이 Stage 29 정체였고 환생이 30일에야 1회 — 2개 지역이면 개척 완료(9일) 직후 열린다
  const REBIRTH_WALL_AREAS = 2;
  const canRebirth = progress.wallAreas.length >= REBIRTH_WALL_AREAS;

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

  /** 펫 장착/해제 (§1) — 액티브 패시브는 1마리만 */
  const equipPet = async (id: PetId) => {
    if ((progress.pets[id] ?? 0) <= 0) return;
    const next = await updateCharacterProgress(userHash, (current) => ({
      ...current,
      activePet: current.activePet === id ? "" : id,
    }));
    onProgressChange(next);
  };

  /** 간식 주기 — 강화석을 소비해 펫 레벨을 올린다 */
  const feedPet = async (id: PetId) => {
    const level = progress.pets[id] ?? 0;
    const cost = petFeedCost(level);
    if (level <= 0 || cost === null || progress.enhancementMaterials < cost) return;
    const next = await updateCharacterProgress(userHash, (current) => {
      const cur = current.pets[id] ?? 0;
      const need = petFeedCost(cur);
      if (cur <= 0 || need === null || current.enhancementMaterials < need) return current;
      return {
        ...current,
        enhancementMaterials: current.enhancementMaterials - need,
        pets: { ...current.pets, [id]: cur + 1 },
      };
    });
    onProgressChange(next);
    setGrowthMessage(`${PET_DEFS[id].name} Lv.${next.pets[id]} — ${PET_DEFS[id].desc} 강화`);
  };

  const rebirth = async () => {
    if (!canRebirth) {
      setGrowthMessage(`${REBIRTH_WALL_AREAS}개 지역에서 한계(DPS 벽)에 도달하면 환생할 수 있습니다. (현재 ${progress.wallAreas.length})`);
      return;
    }
    // 리셋이 생겼으므로 실수 방지 확인 단계
    if (!rebirthConfirm) {
      setRebirthConfirm(true);
      setGrowthMessage("환생하면 사냥터(스테이지·골드·동료 레벨)가 초기화됩니다. 성급·재련·개척·공유 재화는 보존됩니다. 한 번 더 누르면 진행합니다.");
      return;
    }
    setRebirthConfirm(false);
    const crystals = Math.max(3, Math.floor(Math.sqrt(progress.titanBestStage) * 3));
    await rebirthResetTitans(userHash);
    // retention-4: 환생 직후 축하 제안(환생 세트) — 같은 갱신에서 열어 lost update 방지
    const next = await updateCharacterProgress(userHash, (current) => openMomentOffer({
      ...current,
      rebirthCount: current.rebirthCount + 1,
      inheritanceCrystals: current.inheritanceCrystals + crystals,
      evolutionPoints: current.evolutionPoints + 1,
      // 벽 기록은 소모 — 다음 환생도 다시 2개 지역의 벽을 봐야 한다
      wallAreas: [],
      // 동료 레벨이 리셋되므로 편성·파견도 비운다 (partyCap 하한과 펫은 보존)
      partyIds: [],
      expeditions: [],
      // 복귀 버프: 24시간 방치 산출 2배 (P1 따라잡기와 함께 재등반을 가속)
      idleBoostUntil: Date.now() + 24 * 3600 * 1000,
      claimedBadges: [...new Set([...current.claimedBadges, ...earnedBadgeIds(current), "rebirth-one"])],
    }, "rebirth"));
    onProgressChange(next);
    setGrowthMessage(`계승 완료 · 결정 +${crystals} (배율 +${(crystals * 0.02).toFixed(2)}) · 진화 포인트 +1 · 24시간 방치 2배`);
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
          <button
            type="button"
            className="share-card-btn"
            onClick={() => {
              void renderShareCard({
                headline: "모험가 기록",
                subline: `Lv.${progress.level} · 사냥터 Stage ${progress.titanBestStage} · 원정 별 ${Object.values(progress.dodgeStars).reduce((a, b) => a + b, 0)}/12${cosmeticLabels.length ? ` · ${cosmeticLabels.join(" · ")}` : ""}`,
                power: summary.combatPower,
                titleName: progress.activeTitle ? TITLES[progress.activeTitle]?.name : undefined,
                titleColor: progress.activeTitle ? TITLES[progress.activeTitle]?.color : undefined,
                characterSheet: sheetFor(progress.activeCharacter, "idle"),
              }).then(async (blob) => {
                if (!blob) return;
                const result = await shareCard(blob);
                setGrowthMessage(result === "shared" ? "기록 카드를 공유했습니다" : result === "opened" ? "기록 카드를 새 탭에 열었습니다 — 길게 눌러 저장" : "공유를 지원하지 않는 환경입니다");
              });
            }}
          >
            기록 카드 공유
          </button>
        </div>
        <button type="button" className="character-back" onClick={onBack}>
          콘텐츠
        </button>
      </header>

      <section className="character-hero-card">
        <div className="character-equipment-preview">
          <div className="character-equipment-facing">
            <EquippedCharacter mode="idle" frame={previewFrame} weaponLevel={progress.equippedWeaponLevel} shoulder={progress.equippedShoulder} evolution={progress.evolutionPath} character={progress.activeCharacter} weaponSkin={progress.equippedWeaponSkin} />
          </div>
        </div>
        <div className="character-identity">
          {cosmeticLabels.length > 0 && (
            <div className="cosmetic-chips">{cosmeticLabels.map((label) => <span key={label}>{label}</span>)}</div>
          )}
          {progress.activeTitle && TITLES[progress.activeTitle] && (
            <em className="character-title" style={{ color: TITLES[progress.activeTitle].color }}>
              ✦ {TITLES[progress.activeTitle].name}
            </em>
          )}
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

      <section className="legacy-growth">
        <div className="legacy-heading"><div><small>CHARACTER</small><strong>플레이어블 캐릭터</strong></div><span>{1 + progress.ownedCharacters.length}종 보유</span></div>
        <div className="character-skin-row">
          {CHARACTER_SKINS.map((skin) => {
            const owned = skin === "default" || progress.ownedCharacters.includes(skin);
            const active = progress.activeCharacter === skin;
            return (
              <button
                key={skin}
                type="button"
                className={`character-skin-chip ${active ? "active" : ""} ${owned ? "" : "locked"}`}
                onClick={() => {
                  if (!owned) {
                    setGrowthMessage("보석 상점에서 구매할 수 있는 캐릭터입니다.");
                    return;
                  }
                  void updateCharacterProgress(userHash, (current) => ({ ...current, activeCharacter: skin })).then((next) => {
                    onProgressChange(next);
                    setGrowthMessage(`${CHARACTER_LABEL[skin]} 장착`);
                  });
                }}
              >
                <b>{CHARACTER_LABEL[skin]}</b>
                <small>
                  {skin === "obsidian" ? "방치 효율 +1%p" : skin === "dawn" ? "방치 캡 +30분" : "패시브 없음"}
                  {!owned && " · 미보유"}
                </small>
              </button>
            );
          })}
        </div>

        {progress.ownedTitles.length > 0 && (
          <>
            <div className="legacy-heading"><div><small>TITLE</small><strong>칭호</strong></div><span>{progress.ownedTitles.length}종 보유</span></div>
            <div className="title-row">
              {progress.ownedTitles
                .filter((id) => TITLES[id])
                .map((id) => {
                  const def = TITLES[id];
                  const active = progress.activeTitle === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      className={`title-chip ${active ? "active" : ""}`}
                      style={{ color: def.color }}
                      onClick={() => {
                        void updateCharacterProgress(userHash, (current) => ({
                          ...current,
                          activeTitle: current.activeTitle === id ? "" : id,
                        })).then((next) => {
                          onProgressChange(next);
                          setGrowthMessage(next.activeTitle === id ? `칭호 「${def.name}」 표시` : "칭호 표시 해제");
                        });
                      }}
                    >
                      ✦ {def.name}
                    </button>
                  );
                })}
            </div>
          </>
        )}

        <div className="legacy-heading"><div><small>CODEX</small><strong>몬스터 도감</strong></div><span>처치 마일스톤 → 골드 보너스</span></div>
        <div className="codex-grid">
          {(Object.keys(progress.monsterKills) as Array<keyof typeof progress.monsterKills>).map((kind) => {
            const kills = progress.monsterKills[kind];
            const bonus = kills >= 1000 ? 8 : kills >= 100 ? 4 : kills >= 10 ? 2 : 0;
            const nextAt = kills >= 1000 ? null : kills >= 100 ? 1000 : kills >= 10 ? 100 : 10;
            const label = { slime: "슬라임", goblin: "고블린", wolf: "늑대", ogre: "오우거", dragon: "용", boss: "보스" }[kind];
            return (
              <div key={kind} className={`codex-chip ${bonus > 0 ? "tiered" : ""}`}>
                <b>{label}</b>
                <span>{kills.toLocaleString()}마리</span>
                <small>{bonus > 0 ? `골드 +${bonus}%` : "10마리부터"}{nextAt !== null && ` · 다음 ${nextAt}`}</small>
              </div>
            );
          })}
        </div>

        <div className="legacy-heading">
          <div><small>PETS</small><strong>도감의 아이들</strong></div>
          <span>{PET_IDS.filter((id) => (progress.pets[id] ?? 0) > 0).length}/{PET_IDS.length} 부화</span>
        </div>
        <p className="pet-note">
          몬스터 {PET_HATCH_KILLS.toLocaleString()}마리 처치(도감 최종 단계)마다 아기 버전이 부화합니다.
          부화만으로 전투력 +30, 장착한 1마리의 패시브가 추가로 적용됩니다.
        </p>
        <div className="pet-grid">
          {PET_IDS.map((id) => {
            const def = PET_DEFS[id];
            const level = progress.pets[id] ?? 0;
            const hatched = level > 0;
            const kills = progress.monsterKills[id] ?? 0;
            const cost = petFeedCost(level);
            const value = petEffect(id, level);
            const effectLabel =
              def.unit === "%"
                ? `+${Math.round(value * 100)}%`
                : def.unit === "초"
                  ? `+${value.toFixed(1)}초`
                  : def.unit === "시간"
                    ? `+${value.toFixed(1)}h`
                    : `+${value.toFixed(2)}`;
            const active = progress.activePet === id;
            return (
              <div key={id} className={`pet-chip ${hatched ? "hatched" : "egg"} ${active ? "active" : ""}`}>
                <button
                  type="button"
                  className="pet-figure"
                  disabled={!hatched}
                  onClick={() => void equipPet(id)}
                  title={hatched ? (active ? "장착 해제" : "장착") : `${kills.toLocaleString()}/${PET_HATCH_KILLS.toLocaleString()} 처치`}
                >
                  <MonsterArt kind={id} area={HUNTING_AREAS[0]} boss={false} golden={false} />
                </button>
                <b>{hatched ? def.name : "???"}</b>
                {hatched ? (
                  <>
                    <span>Lv.{level} · {def.desc} {effectLabel}</span>
                    <small>{active ? "장착 중" : "탭하여 장착"}</small>
                    <button
                      type="button"
                      className="pet-feed"
                      disabled={cost === null || progress.enhancementMaterials < cost}
                      onClick={() => void feedPet(id)}
                    >
                      {cost === null ? "MAX" : `간식 (강화석 ${cost})`}
                    </button>
                  </>
                ) : (
                  <>
                    <span>{kills.toLocaleString()} / {PET_HATCH_KILLS.toLocaleString()} 처치</span>
                    <i className="pet-hatch-bar"><em style={{ width: `${Math.min(100, (kills / PET_HATCH_KILLS) * 100)}%` }} /></i>
                  </>
                )}
              </div>
            );
          })}
        </div>
        <p className="collection-summary">
          성급 도감 ★{totalStars(progress)} 합계 · 방치 배율 +{starMilestoneMultiplier(progress).toFixed(2)} 영구
          {starMilestoneNext(progress) !== null && ` · 다음 마일스톤 ★${starMilestoneNext(progress)}`}
        </p>

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
        <button type="button" className={`rebirth-button ${rebirthConfirm ? "confirming" : ""}`} disabled={!canRebirth} onClick={() => void rebirth()}>
          환생 {progress.rebirthCount}회 · {canRebirth ? (rebirthConfirm ? "정말 환생하기 (사냥터 초기화)" : "계승 시작") : `DPS 벽 ${progress.wallAreas.length}/3 지역`}
        </button>
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
