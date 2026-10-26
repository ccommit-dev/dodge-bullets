import { assetUrl } from "../asset";
import { CurrencyIcon } from "../ui/CurrencyIcon";
import { formatGold } from "./model";
import { QUESTS, milestoneMul, nextMilestone, questBlock, questCost, questGoldPerSec, questLevelCap, questPay, type QuestState } from "./quests";

/**
 * 퀘스트 탭 (2026-10-26, 사용자: "오늘도 환생 2 처럼 시간 단위별로 돈을 계속 … 첨부 UI 처럼").
 * 줄 = [아이콘 · Lv] [번호 · 이름 / 보상이 든 막대 · 남은 시간] [강화: 늘어나는 보상 · 값]. 잠긴 줄은 흐리게 · "열기 값".
 */
type Props = {
  state: QuestState;
  gold: number;
  /** 이번 환생 최고 층 — 줄이 열리는 층 · 레벨 상한 */
  bestStage: number;
  /** 지금 주기에 흐른 초 — 화면용(250ms 마다) */
  prog: number[];
  /** 방금 보상이 들어온 줄 — 막대가 한 번 번쩍 */
  done?: number[];
  onBuy: (i: number) => void;
};

const clock = (sec: number) => {
  const s = Math.max(0, Math.ceil(sec));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

export function QuestPanel({ state, gold, bestStage, prog, done = [], onBuy }: Props) {
  const perSec = questGoldPerSec(state);
  return (
    <div className="quest-panel">
      <header className="quest-head">
        <b>퀘스트</b>
        <span><CurrencyIcon kind="gold" /> 초당 {formatGold(Math.round(perSec))}</span>
        <small>사냥터가 보이는 동안 저절로 돈다 · 레벨 상한은 층이 오를수록 · Lv {nextMilestone(1)} · 25 · 50 마다 보상 ×2</small>
      </header>
      <ol className="quest-list">
        {QUESTS.map((q, i) => {
          const lv = state.levels[i];
          const locked = lv <= 0;
          const prevLocked = i > 0 && state.levels[i - 1] <= 0;
          const cost = questCost(i, lv);
          const block = questBlock(state, i, gold, bestStage);
          const cap = questLevelCap(i, bestStage);
          const gain = questPay(i, lv + 1) - questPay(i, lv);
          const can = block === null;
          const label = block === "max" ? "MAX" : block === "stage" ? `${q.stage}층` : block === "cap" ? "상한" : block === "prev" ? "앞 줄 먼저" : locked ? "열기" : `+${formatGold(gain)}`;
          const sub = block === "stage" ? "도달 시 열림" : block === "cap" ? `${q.stage + Math.ceil((lv + 1 - 5) / 2)}층에 +1` : block === "max" || block === "prev" ? null : <><CurrencyIcon kind="gold" />{formatGold(cost)}</>;
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
                {!locked && <small className="quest-next">{ms ? `Lv.${ms} 보상 ×2 · ` : ""}상한 Lv.{cap}</small>}
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
