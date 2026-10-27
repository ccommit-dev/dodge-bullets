import { assetUrl } from "../asset";
import { CurrencyIcon } from "../ui/CurrencyIcon";
import { formatGold } from "./model";
import { QUESTS, QUEST_BONUS_MUL, QUEST_MAX_LEVEL, milestoneMul, nextMilestone, questBlock, questBonusAmount, questBonusLeftMs, questCost, questGoldPerSec, questPay, type QuestState } from "./quests";

/**
 * 퀘스트 탭 (2026-10-26, 사용자: "오늘도 환생 2 처럼 시간 단위별로 돈을 계속 … 첨부 UI 처럼").
 * 줄 = [아이콘 · Lv] [번호 · 이름 / 보상이 든 막대 · 남은 시간] [강화: 늘어나는 보상 · 값]. 잠긴 줄은 흐리게 · "열기 값".
 * 2026-10-27 — 층 잠금 없이 골드로만 열고 최대 Lv 25 · 머리에 "10분 보너스(초당 × 100)" 단추.
 */
type Props = {
  state: QuestState;
  gold: number;
  /** 지금 주기에 흐른 초 — 화면용(250ms 마다) */
  prog: number[];
  /** 방금 보상이 들어온 줄 — 막대가 한 번 번쩍 */
  done?: number[];
  onBuy: (i: number) => void;
  /** 10분 보너스 받기 */
  onBonus: () => void;
};

const clock = (sec: number) => {
  const s = Math.max(0, Math.ceil(sec));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

export function QuestPanel({ state, gold, prog, done = [], onBuy, onBonus }: Props) {
  const perSec = questGoldPerSec(state);
  const bonusLeft = questBonusLeftMs(state, Date.now());
  const bonus = questBonusAmount(state);
  return (
    <div className="quest-panel">
      <header className="quest-head">
        <b>퀘스트</b>
        <span><CurrencyIcon kind="gold" /> 초당 {formatGold(Math.round(perSec))}</span>
        <button type="button" title={`10분마다 초당 퀘스트 골드 × ${QUEST_BONUS_MUL}`} className={`quest-bonus ${bonusLeft > 0 || bonus <= 0 ? "is-off" : ""}`} aria-disabled={bonusLeft > 0 || bonus <= 0} onClick={onBonus}>
          <b>{bonusLeft > 0 ? clock(bonusLeft / 1000) : "10분 보너스"}</b>
          <small><CurrencyIcon kind="gold" />+{formatGold(bonus)}</small>
        </button>
        <small>사냥 중 저절로 골드 · 골드로 열기 · Lv {nextMilestone(1)} · {QUEST_MAX_LEVEL} 에 보상 ×2 · 최대 Lv {QUEST_MAX_LEVEL}</small>
      </header>
      <ol className="quest-list">
        {QUESTS.map((q, i) => {
          const lv = state.levels[i];
          const locked = lv <= 0;
          const prevLocked = i > 0 && state.levels[i - 1] <= 0;
          const cost = questCost(i, lv);
          const block = questBlock(state, i, gold);
          const gain = questPay(i, lv + 1) - questPay(i, lv);
          const can = block === null;
          const label = block === "max" ? "MAX" : block === "prev" ? "앞 줄 먼저" : locked ? "열기" : `+${formatGold(gain)}`;
          const sub = block === "max" || block === "prev" ? null : <><CurrencyIcon kind="gold" />{formatGold(cost)}</>;
          const t = locked ? 0 : Math.min(1, (prog[i] ?? 0) / q.sec);
          const ms = nextMilestone(lv);
          // 앞 줄이 잠긴 줄은 이름만 — 하나씩 열린다
          return (
            <li key={q.id} className={`quest-row ${locked ? "is-locked" : ""} ${prevLocked ? "is-hidden" : ""} ${done.includes(i) ? "paid" : ""}`} data-quest={q.id}>
              <span className="quest-icon">
                <img src={assetUrl(`titans/quests/${q.id}.png`)} alt="" aria-hidden="true" />
                <b>Lv.{lv}</b>
              </span>
              <span className="quest-main">
                <strong>{i + 1}. {q.name}{milestoneMul(lv) > 1 && <i className="quest-mul">×{milestoneMul(lv)}</i>}</strong>
                <span className="quest-bar" aria-label={locked ? "잠김" : `${Math.round(t * 100)}%`}>
                  <i style={{ width: `${t * 100}%` }} />
                  <span className="quest-pay"><CurrencyIcon kind="gold" />{formatGold(locked ? questPay(i, 1) : questPay(i, lv))}</span>
                  <em>{clock(locked ? q.sec : q.sec - (prog[i] ?? 0))}</em>
                </span>
                {!locked && <small className="quest-next">{ms ? `Lv.${ms} 에 보상 ×2` : "최대 레벨 · 보상 ×4"}</small>}
              </span>
              <button type="button" className={`quest-buy ${locked ? "unlock" : ""} ${can ? "" : "is-off"} block-${block ?? "ok"}`} aria-disabled={!can} onClick={() => onBuy(i)}>
                {label}
                {sub && <small>{sub}</small>}
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
