/**
 * 승급전 전단 (2026-11-11) — 긴급 의뢰 전단과 같은 판(urgent.css). 다음 등급 · 수호자 · 보상 · 등급 사다리 세 줄.
 */
import { assetUrl } from "../asset";
import { bestiaryThumb } from "./bestiary";
import { formatGold } from "./model";
import { HERO_RANKS, heroRankDef, type HeroRankDef } from "./promotion";
import "./urgent.css";

export function PromotionPoster({
  rank, next, guardianArt, hp, timeSec, canStart, onStart, onClose,
}: {
  /** 지금 등급 */
  rank: number;
  next: HeroRankDef;
  guardianArt: string;
  hp: number;
  timeSec: number;
  canStart: boolean;
  onStart: () => void;
  onClose: () => void;
}) {
  const cur = heroRankDef(rank);
  const rows = HERO_RANKS.filter((d) => d.rank >= Math.max(1, rank) && d.rank <= next.rank + 1).slice(0, 3);
  return (
    <div className="urgent-backdrop" role="presentation" onPointerDown={(event) => event.stopPropagation()} onClick={onClose}>
      <div className="urgent-poster promo-poster" role="dialog" aria-modal="true" aria-label="승급전" data-promo="poster" onClick={(event) => event.stopPropagation()}>
        <small className="urgent-kicker">승급전 · 등급 {next.rank}/{HERO_RANKS.length - 1}</small>
        <h2 className="promo-title" style={{ color: next.color }}>{next.title}</h2>
        <div className="urgent-portrait"><img src={assetUrl(bestiaryThumb(guardianArt))} alt="" /></div>
        <strong className="urgent-name">{next.guardianName}</strong>
        <p className="urgent-rule">체력 <b>{formatGold(hp)}</b> · <b>{timeSec}초</b> 안에 처치</p>
        <div className="urgent-reward promo-reward" aria-label="보상">
          <span><b data-promo="atk">주인공 공격 +{Math.round(next.atkBonus * 100)}%</b></span>
          <span><img src={assetUrl("ui/rewards/gem.png")} alt="붉은 보석" /><b data-promo="gems">{next.gems}</b></span>
        </div>
        <p className="urgent-deadline">지금 <b className="promo-now" style={{ color: cur.color }}>{cur.title}</b>{cur.atkBonus > 0 ? ` · 공격 +${Math.round(cur.atkBonus * 100)}%` : ""} · 져도 잃는 것은 없어요</p>
        <ul className="urgent-today" aria-label="등급">
          {rows.map((d) => (
            <li key={d.rank} className={d.rank <= rank ? "is-done" : d.rank === next.rank ? "is-open" : "is-none"}>
              <span>{d.title}</span>
              <em>{d.rank <= rank ? "달성" : d.rank === next.rank ? "도전 가능" : `${d.unlockStage}층`}</em>
            </li>
          ))}
        </ul>
        <div className="urgent-actions">
          <button type="button" className="urgent-later" onClick={onClose}>나중에</button>
          <button type="button" className="urgent-go" data-promo="go" disabled={!canStart} onClick={onStart}>{canStart ? "도전" : "잠시만요"}</button>
        </div>
      </div>
    </div>
  );
}
