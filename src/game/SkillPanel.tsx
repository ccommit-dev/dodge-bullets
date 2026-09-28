import { useState } from "react";
import { assetUrl } from "../asset";
import { perksUnlockedBy, RARITY_LABEL } from "./perks";
import {
  EXPEDITION_SKILLS,
  RANGED_WEAPONS,
  SKILL_BY_ID,
  SKILL_MAX_LEVEL,
  skillCost,
  skillSummary,
  skillUnlocked,
  type ExpeditionSkillDef,
  type ExpeditionSkillId,
  type ExpeditionSkillLevels,
  type RangedWeaponId,
} from "./skills";

/**
 * 화살 원정 영구 스킬 화면 (2026-09-28).
 *
 * 참고 게임(Galactic Outlaw: Tower Defense)의 스킬 화면 구조를 따른다:
 *   · 2열 격자 — 아이콘 · 이름 · Level · 재화 진행바 · 강화 가능하면 "!" · 잠기면 해금 조건
 *   · 상세 시트 — 아이콘+설명 · 스탯 칸 · **마일스톤 목록(짝수 레벨)** · 비용 행 · 강화 버튼
 *   · 상단 배너 — 지금까지 올린 합산 효과
 */

type Props = {
  levels: ExpeditionSkillLevels;
  gold: number;
  seals: number;
  dodgeBestStage: number;
  /** 지금 장착한 원거리 무기 ("none" = 맨손) */
  weapon: RangedWeaponId;
  onEquipWeapon: (id: RangedWeaponId) => void;
  onUpgrade: (id: ExpeditionSkillId) => void;
};

function canAfford(gold: number, seals: number, cost: { gold: number; seals: number }): boolean {
  return gold >= cost.gold && seals >= cost.seals;
}

export function SkillPanel({ levels, gold, seals, dodgeBestStage, weapon, onEquipWeapon, onUpgrade }: Props) {
  const [openId, setOpenId] = useState<ExpeditionSkillId | null>(null);
  const summary = skillSummary(levels);
  const open = openId ? SKILL_BY_ID[openId] : null;

  const iconOf = (def: ExpeditionSkillDef) => assetUrl(`dodge/skills/${def.icon}.png`);

  return (
    <div className="exp-skill-panel">
      <div className="exp-skill-banner">
        <b>원정 총 전투력</b>
        <strong>+{summary.power}%</strong>
        <small>스킬을 강화해 원정 화력과 생존을 올리세요 · 누적 {summary.totalLevels}레벨</small>
      </div>

      {/* 무기 탈착 — 캐릭터는 그대로, 활/지팡이만 바꿔 끼운다 (사용자 지시 2026-09-28) */}
      <div className="exp-weapon-row">
        <b>원거리 무기</b>
        <div>
          {RANGED_WEAPONS.map((w) => {
            const unlocked = dodgeBestStage >= w.unlockStage;
            const on = weapon === w.id;
            return (
              <button
                key={w.id}
                type="button"
                className={`exp-weapon-card ${on ? "on" : ""} ${unlocked ? "" : "locked"}`}
                disabled={!unlocked}
                aria-pressed={on}
                onClick={() => onEquipWeapon(w.id)}
              >
                <img src={assetUrl(`dodge/weapons/${w.id}.png`)} alt="" aria-hidden="true" />
                <span>
                  <b>{w.name}</b>
                  <em>{unlocked ? w.desc : `${w.unlockStage}스테이지 클리어 시 해금`}</em>
                </span>
                <i>{on ? "장착 중" : unlocked ? "장착" : "잠김"}</i>
              </button>
            );
          })}
        </div>
      </div>

      <div className="exp-skill-grid">
        {EXPEDITION_SKILLS.map((def) => {
          const lv = levels[def.id] ?? 0;
          const unlocked = skillUnlocked(def, dodgeBestStage);
          const maxed = lv >= SKILL_MAX_LEVEL;
          const cost = skillCost(def, lv + 1);
          const ready = unlocked && !maxed && canAfford(gold, seals, cost);
          return (
            <button
              key={def.id}
              type="button"
              className={`exp-skill-card ${unlocked ? "" : "locked"} ${ready ? "ready" : ""}`}
              disabled={!unlocked}
              onClick={() => setOpenId(def.id)}
            >
              <img className="exp-skill-icon" src={iconOf(def)} alt="" aria-hidden="true" />
              <span className="exp-skill-body">
                <b>{def.name}</b>
                {unlocked ? (
                  <>
                    <em>{maxed ? "MAX" : `Level ${lv}`}</em>
                    {/* 진행바는 '다음 레벨 인장' 대비 보유량 — 참고 화면의 126/225 자리 */}
                    <i className="exp-skill-bar">
                      <b style={{ width: `${maxed ? 100 : Math.min(100, (seals / Math.max(1, cost.seals)) * 100)}%` }} />
                      <small>{maxed ? "최대 레벨" : `${seals}/${cost.seals}`}</small>
                    </i>
                  </>
                ) : (
                  <em className="exp-skill-lock">{def.unlockStage}스테이지 클리어 시 해금</em>
                )}
              </span>
              {ready && <span className="exp-skill-badge" aria-label="강화 가능">!</span>}
              {!unlocked && <img className="exp-skill-locked" src={assetUrl("ui/idle/lock.svg")} alt="" aria-hidden="true" />}
            </button>
          );
        })}
      </div>

      {open && (() => {
        const lv = levels[open.id] ?? 0;
        const maxed = lv >= SKILL_MAX_LEVEL;
        const cost = skillCost(open, lv + 1);
        const afford = canAfford(gold, seals, cost);
        return (
          <div className="exp-skill-sheet" role="dialog" aria-label={`${open.name} 상세`}>
            <div className="exp-skill-sheet-inner">
              <header>
                <b>{open.name} (Lv.{lv})</b>
                <button type="button" className="exp-skill-close" onClick={() => setOpenId(null)} aria-label="닫기">×</button>
              </header>
              <div className="exp-skill-head">
                <img src={iconOf(open)} alt="" aria-hidden="true" />
                <p>{open.desc}</p>
              </div>
              <div className="exp-skill-stats">
                {open.readout(lv).map((row) => (
                  <span key={row.label}>
                    <em>{row.label}</em>
                    <b>{row.value}{row.delta && <i>{row.delta}</i>}</b>
                  </span>
                ))}
              </div>
              <ul className="exp-skill-miles">
                {open.milestones.map((m) => {
                  const got = lv >= m.level;
                  return (
                    <li key={m.level} className={got ? "got" : "yet"}>
                      <b>Level {m.level}</b>
                      <span>{m.kind === "unlock" ? <em>{m.label}</em> : m.label}</span>
                    </li>
                  );
                })}
              </ul>
              {/* 런 중에 열리는 카드 — 가이드의 투자 조언("보이지 않는 스킬에 투자하면 운에 기대는 셈")을
                  화면에서 답해 준다. 어떤 카드가 열리는지 모르면 감으로 올리게 된다 */}
              {(() => {
                const cards = perksUnlockedBy(open.id as never);
                if (!cards.length) return null;
                return (
                  <div className="exp-skill-unlocks">
                    <b>런 중 열리는 카드</b>
                    <ul>
                      {cards.map((c) => {
                        const others = (c.needs ?? []).filter((n) => n !== open.id);
                        const missing = others.filter((n) => (levels[n as ExpeditionSkillId] ?? 0) <= 0);
                        return (
                          <li key={c.id} className={missing.length ? "locked" : ""}>
                            <i className={`perk-rarity r-${c.rarity}`}>{RARITY_LABEL[c.rarity]}</i>
                            <span>{c.label}</span>
                            {missing.length > 0 && (
                              <em>{missing.map((n) => SKILL_BY_ID[n as ExpeditionSkillId].name).join("·")} 필요</em>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })()}
              <div className="exp-skill-cost">
                <span className={gold >= cost.gold ? "" : "short"}>
                  {/* 재화는 코인·원정 인장 — 전용 아이콘이 없어 남의 재화 아이콘을 빌리면 거짓말이 된다 */}
                  <em>코인</em>
                  {maxed ? "—" : `${gold.toLocaleString()}/${cost.gold.toLocaleString()}`}
                </span>
                <span className={seals >= cost.seals ? "" : "short"}>
                  <em>원정 인장</em>
                  {maxed ? "—" : `${seals}/${cost.seals}`}
                </span>
              </div>
              <button
                type="button"
                className={`exp-skill-upgrade ${afford && !maxed ? "on" : ""}`}
                disabled={maxed || !afford}
                onClick={() => onUpgrade(open.id)}
              >
                {maxed ? "최대 레벨" : afford ? "강화" : "재료 부족"}
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
