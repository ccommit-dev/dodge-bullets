/**
 * 긴급 의뢰 화면 조각 (2026-11-11) — 전장 왼쪽의 수배 딱지와, 누르면 뜨는 수배 전단.
 * 알림 알약 줄(battle-alert-stack)에 넣지 않는다 — 그 줄은 맨 앞 하나만 보여서 15분 동안 다른 알림을 가린다.
 */
import { assetUrl } from "../asset";
import { CurrencyIcon } from "../ui/CurrencyIcon";
import { bestiaryThumb, type MonsterArtDef } from "./bestiary";
import { formatGold } from "./model";
import { URGENT_BOSS_KILLS, URGENT_KINDS, URGENT_LABEL, formatUrgentLeft, urgentSlot, type UrgentKind, type UrgentReward, type UrgentState } from "./urgent";
import "./urgent.css";

export function UrgentBadge({ face, leftMs, onOpen }: { face: MonsterArtDef; leftMs: number; onOpen: () => void }) {
  return (
    <button
      type="button"
      className={`urgent-badge ${leftMs < 60_000 ? "is-last" : ""}`}
      data-urgent="badge"
      aria-label={`긴급 의뢰 · 현상범 ${face.name} · 마감까지 ${formatUrgentLeft(leftMs)}`}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => { event.stopPropagation(); onOpen(); }}
    >
      <img src={assetUrl(bestiaryThumb(face.art))} alt="" aria-hidden="true" />
      <small>{formatUrgentLeft(leftMs)}</small>
    </button>
  );
}

export function UrgentPoster({
  kind, face, stage, timeSec, reward, leftMs, state, now, day, canStart, onStart, onClose,
}: {
  kind: UrgentKind;
  face: MonsterArtDef;
  stage: number;
  timeSec: number;
  /** 골드는 영구 배수를 곱한 값 — 받는 그대로 보여 준다 */
  reward: UrgentReward;
  leftMs: number;
  state: UrgentState;
  now: number;
  day: string;
  canStart: boolean;
  onStart: () => void;
  onClose: () => void;
}) {
  return (
    <div className="urgent-backdrop" role="presentation" onPointerDown={(event) => event.stopPropagation()} onClick={onClose}>
      <div className="urgent-poster" role="dialog" aria-modal="true" aria-label="긴급 의뢰" data-urgent="poster" onClick={(event) => event.stopPropagation()}>
        <small className="urgent-kicker">긴급 의뢰 · {URGENT_LABEL[kind]}</small>
        <h2>현상범</h2>
        <div className="urgent-portrait"><img src={assetUrl(bestiaryThumb(face.art))} alt="" /></div>
        <strong className="urgent-name">{face.name}</strong>
        <p className="urgent-rule">STAGE {stage} 수준 · <b>{timeSec}초</b> 안에 처치</p>
        <div className="urgent-reward" aria-label="보상">
          <span><CurrencyIcon kind="gold" /><b data-urgent="gold">{formatGold(reward.gold)}</b></span>
          <span><img src={assetUrl("ui/attendance/enhance-stone.png")} alt="강화석" /><b data-urgent="stones">{reward.stones}</b></span>
          <span><i className="coin-mark" role="img" aria-label="이벤트 코인" /><b data-urgent="coins">{reward.coins}</b></span>
        </div>
        <p className="urgent-deadline">마감까지 <b data-urgent="left">{formatUrgentLeft(leftMs)}</b> · 놓쳐도 잃는 것은 없어요</p>
        <ul className="urgent-today" aria-label="오늘의 의뢰">
          {URGENT_KINDS.map((k) => {
            const slot = urgentSlot(state, k, now, day);
            const note = slot === "done" ? "완료" : slot === "open" ? "도전 가능" : slot === "missed" ? "놓침" : k === "boss" ? `${Math.min(state.day === day ? state.bossKills : 0, URGENT_BOSS_KILLS)}/${URGENT_BOSS_KILLS}` : "아직";
            return <li key={k} className={`is-${slot}`}><span>{URGENT_LABEL[k]}</span><em>{note}</em></li>;
          })}
        </ul>
        <div className="urgent-actions">
          <button type="button" className="urgent-later" onClick={onClose}>나중에</button>
          <button type="button" className="urgent-go" data-urgent="go" disabled={!canStart} onClick={onStart}>{canStart ? "도전" : "잠시만요"}</button>
        </div>
      </div>
    </div>
  );
}
