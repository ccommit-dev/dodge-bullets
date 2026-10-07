import { useState } from "react";
import { assetUrl } from "../asset";
import { TOWER_DAILY_TICKETS, TOWER_TICKET_MAX, TOWER_TICKET_SEALS } from "./towerTickets";
import { perksForBasicOnly, perksUnlockedBy, RARITY_LABEL } from "./perks";
import { GATE_FUND_TIERS, GATE_FUND_TOTAL_GEMS, gateFundReadyGems, type GateFundState } from "../economy/gateFund";
import { chipCost, CHIPS, CHIP_BY_ID, CHIP_MAX_LEVEL, type ChipId, type ChipLevels } from "./chips";
import {
  DAILIES, dailyClaimable, dailyDone, SUPPLIES, SUPPLY_MAX,
  type DailyId, type DailyState, type SupplyId, type SupplyStock,
} from "./expeditionOps";
import {
  EXPEDITION_SKILLS,
  RANGED_WEAPONS,
  SKILL_BY_ID,
  SKILL_MAX_LEVEL,
  BASIC_SHOT_COOLDOWN, basicCooldownMul, basicDamageMul,
  LOADOUT_MAX,
  weaponForgeDamageMul,
  type SkillWeaponId,
  skillCost,
  skillSummary,
  skillUnlocked,
  type ExpeditionSkillDef,
  type ExpeditionSkillId,
  type ExpeditionSkillLevels,
  type RangedWeaponId,
  type SkillShards,
} from "./skills";

/**
 * 성문 방어 영구 스킬 화면 (2026-09-28).
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
  /** 스킬별 조각 — 그 스킬 강화에만 쓴다 (참고 게임의 126/225) */
  shards: SkillShards;
  /** 지금 장착한 원거리 무기 ("none" = 맨손) */
  weapon: RangedWeaponId;
  chipLevels: ChipLevels;
  equippedChips: Array<ChipId | null>;
  /** 열린 칩 슬롯 수 (원정 최고 스테이지로 늘어난다) */
  chipSlots: number;
  onUpgradeChip: (id: ChipId) => void;
  onEquipChip: (slot: number, id: ChipId | null) => void;
  /** 보급창 재고 — 다음 런 한 번에만 듣는 소모품 */
  supplies: SupplyStock;
  daily: DailyState;
  onBuySupply: (id: SupplyId) => void;
  /** 끝없는 성벽 등반권 — 보유 수 · 성벽이 열렸는가 · 인장으로 1장 사기 (2026-10-02) */
  towerTickets?: number;
  towerUnlocked?: boolean;
  onBuyTowerTicket?: () => void;
  onClaimDaily: (id: DailyId) => void;
  onEquipWeapon: (id: RangedWeaponId) => void;
  onUpgrade: (id: ExpeditionSkillId) => void;
  /**
   * 성문 보급소 (2026-10-02) — 결제 상품(원정 기금 · 수비 보급). 결제가 안 되는 환경이면 note 만 보인다.
   * 가격·판매 여부는 스토어 목록(payments/prices)에서, 값 비교 배수는 카탈로그 가격으로 계산해 넘긴다
   */
  shop?: {
    visible: boolean;
    unlocked: boolean;
    note: string;
    busy: string | null;
    price: (id: string) => string;
    onSale: (id: string) => boolean;
    onBuy: (id: string) => void;
    fund: GateFundState;
    stars: Record<string, number>;
    fundRatio: number | null;
    onClaimFund: (tierId: string) => void;
  };
  /** 기본 사격 강화 레벨 · 골드로 한 단계 올린다 (2026-10-02) */
  basicLevel: number;
  /** 계정 레벨 — 스킬 무기 해금 기준 (2026-10-02) */
  accountLevel?: number;
  /** 장착한 스킬 무기(최대 4) · 장착/해제 */
  loadout?: SkillWeaponId[];
  onToggleLoadout?: (id: SkillWeaponId) => void;
  /** 대장간 활·지팡이 단계 — 기본 사격·스킬 무기 피해 배수 표시 */
  forge?: { bow: number; staff: number };
};

/** 격자 순서 — 왼쪽 열은 물리(물·흙), 오른쪽 열은 마법(불·얼음·번개), 마지막에 궁극 */
/** 해금 레벨 순 — 무기 10종 + 화살비 */
const ORDER = ["fire", "water", "ice", "earth", "bolt", "wind", "poison", "holy", "shadow", "meteor", "ultimate"];

/** 아직 안 열린 슬롯에 표시할 해금 조건 */
const CHIP_SLOT_LABEL = ["", "2단계", "4단계"];

function canAfford(gold: number, have: number, seals: number, cost: { gold: number; shards: number; seals: number }): boolean {
  return gold >= cost.gold && have >= cost.shards && seals >= cost.seals;
}

export function SkillPanel({
  levels, gold, seals, dodgeBestStage, weapon, onEquipWeapon, onUpgrade, basicLevel, shop, accountLevel = 1, loadout = [], onToggleLoadout, forge = { bow: 0, staff: 0 },
  chipLevels, equippedChips, chipSlots, onUpgradeChip, onEquipChip,
  supplies, daily, onBuySupply, onClaimDaily, shards, towerTickets = 0, towerUnlocked = false, onBuyTowerTicket,
}: Props) {
  /** 화면이 길어져 둘로 나눈다 — 강화 / 보급·임무 */
  const [tab, setTab] = useState<"upgrade" | "supply">("upgrade");
  const [openId, setOpenId] = useState<ExpeditionSkillId | null>(null);
  /** 어느 슬롯에 끼울지 고르는 중 — null 이면 칩 목록만 본다 */
  const [pickSlot, setPickSlot] = useState<number | null>(null);
  const summary = skillSummary(levels);
  const open = openId ? SKILL_BY_ID[openId] : null;

  const iconOf = (def: ExpeditionSkillDef) => assetUrl(`dodge/skills/${def.icon}.png`);

  return (
    <div className="exp-skill-panel">
      <div className="exp-skill-banner">
        {/* 배너의 숫자는 실제로 걸리는 효과다 — 참고 게임의 "총 ○○ 증가 +N%" */}
        <b>수집 보너스 · 모든 화살 재사용</b>
        <strong>−{summary.bonusPct}%</strong>
        <small>누적 스킬 레벨 {summary.totalLevels} · 레벨 하나당 −0.3% (최대 −18%)</small>
      </div>

      <div className="exp-sub-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === "upgrade"}
          className={tab === "upgrade" ? "on" : ""} onClick={() => setTab("upgrade")}>강화</button>
        <button type="button" role="tab" aria-selected={tab === "supply"}
          className={tab === "supply" ? "on" : ""} onClick={() => setTab("supply")}>
          보급 · 임무
          {DAILIES.some((d) => dailyClaimable(daily, d.id)) && <i className="exp-sub-dot" aria-label="수령 가능" />}
        </button>
      </div>

      {tab === "supply" ? (
        <div className="exp-ops">
          {/* 성문 보급소 — 결제 상품. 무료 곡선은 그대로이고, 이건 "이미 하던 플레이에 얹히는 보석"과 "벽에서 빨리 넘기기"다 */}
          {shop && (
            <section className="exp-store">
              <b>성문 보급소 <small>결제 상품</small></b>
              {!shop.visible ? <p className="exp-store-note">{shop.note}</p>
                : !shop.unlocked ? <p className="exp-store-note">출석 3일차(또는 Lv.20)부터 열립니다 — 먼저 성문 방어를 충분히 즐겨 보세요.</p>
                : (<>
                  {shop.onSale("gate-fund") && (() => {
                    const ready = gateFundReadyGems({ gateFund: shop.fund, dodgeStars: shop.stars });
                    return (
                      <div className="exp-fund">
                        <header>
                          <img src={assetUrl("ui/idle/gate-fund.png")} alt="" aria-hidden="true" />
                          <span>
                            <b>성문 원정 기금 <i>영구</i></b>
                            <em>모두 달성 시 보석 {GATE_FUND_TOTAL_GEMS.toLocaleString()}{shop.fundRatio ? ` · 같은 금액 보석팩의 ×${shop.fundRatio.toFixed(1)}` : ""}</em>
                          </span>
                        </header>
                        <ul className="exp-fund-tiers">
                          {GATE_FUND_TIERS.map((t) => {
                            const done = t.done({ dodgeStars: shop.stars });
                            const got = shop.fund.claimed.includes(t.id);
                            return (
                              <li key={t.id} className={got ? "got" : done ? "ready" : ""}>
                                <span>{t.label}</span>
                                <b>보석 {t.gems}</b>
                                {shop.fund.paid
                                  ? <button type="button" disabled={!done || got} onClick={() => shop.onClaimFund(t.id)}>{got ? "받음" : done ? "받기" : "미달성"}</button>
                                  : <i>{done ? "달성" : "—"}</i>}
                              </li>
                            );
                          })}
                        </ul>
                        {!shop.fund.paid && (
                          <button type="button" className="exp-store-buy" disabled={shop.busy !== null} onClick={() => shop.onBuy("gate-fund")}>
                            {shop.busy === "gate-fund" ? "결제 중…" : `${shop.price("gate-fund")} 구매${ready > 0 ? ` · 바로 보석 ${ready}` : ""}`}
                          </button>
                        )}
                      </div>
                    );
                  })()}
                  {shop.onSale("gate-supply") && (
                    <div className="exp-store-row">
                      <img src={assetUrl("ui/idle/gate-supply.png")} alt="" aria-hidden="true" />
                      <span>
                        <b>성문 수비 보급</b>
                        <em>원정 인장 30 · 스킬 무기 조각 각 8 (11종) · 보석 40</em>
                      </span>
                      <button type="button" className="exp-store-buy" disabled={shop.busy !== null} onClick={() => shop.onBuy("gate-supply")}>
                        {shop.busy === "gate-supply" ? "결제 중…" : shop.price("gate-supply")}
                      </button>
                    </div>
                  )}
                </>)}
            </section>
          )}
          {/* 보급창 — 가이드: "영구 강화는 구매해야 효과가 있다. 완벽한 해금을 기다리며
              자원을 쌓아 두기만 하면 성장만 늦어진다." 인장을 지금 쓰는 자리 */}
          <section>
            <b>원정 보급창 <small>다음 출격에 자동으로 쓰입니다</small></b>
            <ul className="exp-supply-list">
              {SUPPLIES.map((sp) => {
                const have = supplies[sp.id] ?? 0;
                const full = have >= SUPPLY_MAX;
                return (
                  <li key={sp.id}>
                    <img src={assetUrl(`dodge/supplies/${sp.id}.png`)} alt="" aria-hidden="true" />
                    <span>
                      <b>{sp.name} {have > 0 && <i>×{have}</i>}</b>
                      <em>{sp.desc}</em>
                    </span>
                    <button type="button" disabled={full || seals < sp.seals} onClick={() => onBuySupply(sp.id)}>
                      {full ? "가득" : `인장 ${sp.seals}`}
                    </button>
                  </li>
                );
              })}
              {towerUnlocked && onBuyTowerTicket && (
                <li className="exp-tower-ticket">
                  <img src={assetUrl("ui/idle/tower.png")} alt="" aria-hidden="true" />
                  <span>
                    <b>성벽 등반권 <i>×{towerTickets}</i></b>
                    <em>끝없는 성벽을 한 번 더 오른다 · 매일 {TOWER_DAILY_TICKETS}장 무료</em>
                  </span>
                  <button type="button" disabled={towerTickets >= TOWER_TICKET_MAX || seals < TOWER_TICKET_SEALS} onClick={onBuyTowerTicket}>
                    {towerTickets >= TOWER_TICKET_MAX ? "가득" : `인장 ${TOWER_TICKET_SEALS}`}
                  </button>
                </li>
              )}
            </ul>
          </section>

          {/* 일일 임무 — "짧은 런을 여러 번" 이라는 가이드의 리듬에 이유를 붙인다.
              보상이 인장이라 스킬·칩·보급 전부로 되돌아간다 */}
          <section>
            <b>오늘의 임무 <small>매일 0시 초기화</small></b>
            <ul className="exp-daily-list">
              {DAILIES.map((d) => {
                const n = daily.counts[d.id] ?? 0;
                const done = dailyDone(daily, d.id);
                const claimed = daily.claimed.includes(d.id);
                return (
                  <li key={d.id} className={claimed ? "claimed" : done ? "done" : ""}>
                    <span>
                      <b>{d.name}</b>
                      <i className="exp-daily-bar">
                        <b style={{ width: `${Math.min(100, (n / d.goal) * 100)}%` }} />
                        <small>{Math.min(n, d.goal)}/{d.goal}</small>
                      </i>
                    </span>
                    <button type="button" disabled={!dailyClaimable(daily, d.id)} onClick={() => onClaimDaily(d.id)}>
                      {claimed ? "수령함" : `인장 +${d.seals}`}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      ) : (<>

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
                {/* 카드는 아이콘판 — 부착용 원화(${w.id}.png)는 가는 선이라 34px 에서 뭉개진다 (2026-09-28) */}
                <img src={assetUrl(`dodge/weapons/icon-${w.id}.png`)} alt="" aria-hidden="true" />
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

      {/* 원정 칩 — 가이드의 영구 성장 2순위. 랜덤에 좌우되지 않는 고정 패시브이고,
          스킬과 **같은 인장**을 쓰므로 "지금 무엇에 먼저 쓸까"라는 선택이 생긴다 (2026-09-28) */}
      <div className="exp-chip-row">
        <b>원정 칩 <small>슬롯 {chipSlots}/3</small></b>
        <div className="exp-chip-slots">
          {[0, 1, 2].map((i) => {
            const open = i < chipSlots;
            const id = open ? equippedChips[i] ?? null : null;
            return (
              <button
                key={i}
                type="button"
                className={`exp-chip-slot ${open ? "" : "locked"} ${pickSlot === i ? "picking" : ""}`}
                disabled={!open}
                onClick={() => setPickSlot(pickSlot === i ? null : i)}
              >
                {id
                  ? <img src={assetUrl(`dodge/chips/${id}.png`)} alt="" aria-hidden="true" />
                  : <span className="exp-chip-empty">{open ? "+" : `${CHIP_SLOT_LABEL[i]}`}</span>}
                {id && <em>{CHIP_BY_ID[id].name} Lv.{chipLevels[id] ?? 0}</em>}
              </button>
            );
          })}
        </div>
        <ul className="exp-chip-list">
          {CHIPS.map((c) => {
            const lv = chipLevels[c.id] ?? 0;
            const maxed = lv >= CHIP_MAX_LEVEL;
            const cost = chipCost(lv + 1);
            const slot = equippedChips.indexOf(c.id);
            const on = slot >= 0 && slot < chipSlots;
            return (
              <li key={c.id} className={on ? "on" : ""}>
                <img src={assetUrl(`dodge/chips/${c.id}.png`)} alt="" aria-hidden="true" />
                <span>
                  <b>{c.name} <i>Lv.{lv}</i></b>
                  <em>{lv > 0 ? c.desc(lv) : c.desc(1) + " (미보유)"}</em>
                </span>
                {pickSlot !== null
                  ? (
                    <button type="button" className="exp-chip-act" disabled={lv <= 0}
                      onClick={() => { onEquipChip(pickSlot, c.id); setPickSlot(null); }}>
                      {on ? "해제" : "장착"}
                    </button>
                  )
                  : (
                    <button type="button" className="exp-chip-act up" disabled={maxed || seals < cost}
                      onClick={() => onUpgradeChip(c.id)}>
                      {maxed ? "MAX" : `인장 ${cost}`}
                    </button>
                  )}
              </li>
            );
          })}
        </ul>
        {pickSlot !== null && <p className="exp-chip-hint">{pickSlot + 1}번 슬롯에 끼울 칩을 고르세요 — 슬롯을 다시 누르면 취소</p>}
      </div>

      {/* 기본 사격 — 무기만 있으면 항상 나간다. 스킬이 없어도 런 중 카드가 열린다는 것을 알려 준다 (2026-09-29) */}
      {weapon !== "none" && (
        <div className="exp-basic-row">
          {/* 기본 사격은 무기의 것 — 장착한 무기 아이콘으로 (활 문장 basic.png 는 지팡이를 끼면 거짓말이었다, 2026-10-01) */}
          <img src={assetUrl(`dodge/weapons/icon-${weapon}.png`)} alt="" aria-hidden="true" />
          <span>
            <b>{weapon === "staff" ? "마력탄" : "기본 사격"} · 대장간 활 +{basicLevel} <i>피해 ×{basicDamageMul(basicLevel).toFixed(2)} · {(BASIC_SHOT_COOLDOWN * basicCooldownMul(basicLevel)).toFixed(2)}초마다 1발 · 보스도 깎는다</i></b>
            <em>강화는 대장간 「원정 무기」 탭 — 활: 기본 사격·물리 무기 ×{weaponForgeDamageMul(forge.bow).toFixed(2)} · 지팡이: 마법 무기 ×{weaponForgeDamageMul(forge.staff).toFixed(2)} · 런 중 카드 {perksForBasicOnly().length}장</em>
          </span>
        </div>
      )}

      <p className="exp-learn-hint">스킬 무기는 <b>계정 레벨로 해금</b> → 인장으로 배우고 → <b>4칸에 장착</b>하면 그 판 처음부터 쏩니다. 쓴 무기의 조각이 돌아옵니다</p>

      {/* 장착 4칸 (2026-10-02, 아웃로 디펜스) — 칸을 누르면 해제, 카드의 [장착] 으로 끼운다 */}
      <div className="exp-loadout" aria-label="장착한 스킬 무기">
        {Array.from({ length: LOADOUT_MAX }, (_, i) => {
          const id = loadout[i];
          const def = id ? SKILL_BY_ID[id] : null;
          return (
            <button key={i} type="button" className={`exp-loadout-slot ${def ? "on" : ""}`} disabled={!def || !onToggleLoadout}
              onClick={() => id && onToggleLoadout?.(id)} aria-label={def ? `${def.weapon} 해제` : "빈 칸"}>
              {def ? <img src={iconOf(def)} alt="" aria-hidden="true" /> : <span>{i + 1}</span>}
              <em>{def ? `${def.weapon} Lv.${levels[def.id] ?? 0}` : "빈 칸"}</em>
            </button>
          );
        })}
      </div>

      {/* 갈래 — 기본 사격에서 물리(장궁)·마법(지팡이)로 갈라지고 일섬으로 모인다. 장착 무기의 갈래가 밝다 */}
      <div className="exp-tree" aria-hidden="true">
        <span className={`exp-tree-branch ${weapon === "bow" ? "on" : ""}`}>물리 화살 <i>장궁 상성</i></span>
        <span className="exp-tree-root">┬</span>
        <span className={`exp-tree-branch ${weapon === "staff" ? "on" : ""}`}>마법 화살 <i>지팡이 상성</i></span>
      </div>

      <div className="exp-skill-grid">
        {[...EXPEDITION_SKILLS].sort((a, b) => ORDER.indexOf(a.id) - ORDER.indexOf(b.id)).map((def) => {
          const lv = levels[def.id] ?? 0;
          const unlocked = skillUnlocked(def, accountLevel, lv);
          const equipped = def.id !== "ultimate" && loadout.includes(def.id as SkillWeaponId);
          const maxed = lv >= SKILL_MAX_LEVEL;
          const cost = skillCost(def, lv + 1);
          const have = shards[def.id] ?? 0;
          const ready = unlocked && !maxed && canAfford(gold, have, seals, cost);
          return (
            <button
              key={def.id}
              type="button"
              className={`exp-skill-card fam-${def.family} ${unlocked ? "" : "locked"} ${ready ? "ready" : ""} ${equipped ? "equipped" : ""} ${(weapon === "bow" && def.family === "physical") || (weapon === "staff" && def.family === "magic") ? "affine" : ""}`}
              disabled={!unlocked}
              onClick={() => setOpenId(def.id)}
            >
              <img className="exp-skill-icon" src={iconOf(def)} alt="" aria-hidden="true" />
              <span className="exp-skill-body">
                <b>{def.weapon}</b>
                {unlocked ? (
                  <>
                    <em>{maxed ? "MAX" : `Level ${lv}`}</em>
                    {/* 진행바는 **이 스킬의 조각** 보유량 / 다음 레벨 필요량 — 참고 화면의 126/225. Lv0 은 학습(인장) */}
                    <i className="exp-skill-bar">
                      <b style={{ width: `${maxed ? 100 : lv === 0 ? Math.min(100, (seals / Math.max(1, cost.seals)) * 100) : Math.min(100, (have / Math.max(1, cost.shards)) * 100)}%` }} />
                      <small>{maxed ? "최대 레벨" : lv === 0 ? `학습 · 인장 ${Math.min(seals, cost.seals)}/${cost.seals}` : `${have}/${cost.shards}`}</small>
                    </i>
                  </>
                ) : (
                  <em className="exp-skill-lock">계정 Lv.{def.unlockLevel} 해금</em>
                )}
              </span>
              {ready && <span className="exp-skill-badge" aria-label="강화 가능">!</span>}
              {equipped && <span className="exp-skill-equipped">장착</span>}
              {!unlocked && <img className="exp-skill-locked" src={assetUrl("ui/idle/lock.png")} alt="" aria-hidden="true" />}
            </button>
          );
        })}
      </div>

      </>)}

      {open && (() => {
        const lv = levels[open.id] ?? 0;
        const maxed = lv >= SKILL_MAX_LEVEL;
        const cost = skillCost(open, lv + 1);
        const have = shards[open.id] ?? 0;
        const afford = canAfford(gold, have, seals, cost);
        return (
          <div className="exp-skill-sheet" role="dialog" aria-label={`${open.name} 상세`}>
            <div className="exp-skill-sheet-inner">
              <header>
                <b>{open.weapon} (Lv.{lv})</b>
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
                        // "basic" 은 무기 조건 — SKILL_BY_ID 에 없다. 여기서 이름을 찾다 앱이 통째로 죽었다 (2026-09-29 실측)
                        const others = (c.needs ?? []).filter((n) => n !== open.id);
                        const missing = others.filter((n) => (n === "basic" ? weapon === "none" : (levels[n as ExpeditionSkillId] ?? 0) <= 0));
                        return (
                          <li key={c.id} className={missing.length ? "locked" : ""}>
                            <i className={`perk-rarity r-${c.rarity}`}>{RARITY_LABEL[c.rarity]}</i>
                            <span>{c.label}</span>
                            {missing.length > 0 && (
                              <em>{missing.map((n) => (n === "basic" ? "무기 장착" : SKILL_BY_ID[n as ExpeditionSkillId].name)).join("·")} 필요</em>
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
                  {/* 재화는 코인·그 스킬의 조각 — 코인은 전용 아이콘이 없어 글자로 쓴다 */}
                  <em>코인</em>
                  {maxed ? "—" : `${gold.toLocaleString()}/${cost.gold.toLocaleString()}`}
                </span>
                {lv === 0 ? (
                  // 학습 — 조각이 아니라 원정 인장. 조각은 이 스킬을 쓴 판에서 나오므로 배우기 전엔 없다
                  <span className={seals >= cost.seals ? "" : "short"}>
                    <em>원정 인장</em>
                    {`${seals}/${cost.seals}`}
                  </span>
                ) : (
                  <span className={have >= cost.shards ? "" : "short"}>
                    <img src={iconOf(open)} alt="" aria-hidden="true" />
                    <em>{open.name} 조각</em>
                    {maxed ? "—" : `${have}/${cost.shards}`}
                  </span>
                )}
              </div>
              {open.id !== "ultimate" && lv > 0 && onToggleLoadout && (() => {
                const on = loadout.includes(open.id as SkillWeaponId);
                const full = !on && loadout.length >= LOADOUT_MAX;
                return (
                  <button type="button" className={`exp-skill-equip ${on ? "on" : ""}`} disabled={full} onClick={() => onToggleLoadout(open.id as SkillWeaponId)}>
                    {on ? "장착 해제" : full ? `장착은 ${LOADOUT_MAX}개까지 — 먼저 하나를 해제` : "장착 (이번 판부터 쏜다)"}
                  </button>
                );
              })()}
              <button
                type="button"
                className={`exp-skill-upgrade ${afford && !maxed ? "on" : ""}`}
                disabled={maxed || !afford}
                onClick={() => onUpgrade(open.id)}
              >
                {maxed ? "최대 레벨" : afford ? (lv === 0 ? "학습" : "강화") : "재료 부족"}
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
