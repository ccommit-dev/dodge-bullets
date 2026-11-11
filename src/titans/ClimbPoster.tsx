/**
 * 균열 계단 전단 (2026-11-11) — 긴급 의뢰 · 승급전 전단과 같은 판(urgent.css). 이번 단 · 대장 · 보상 · 오늘 남은 단.
 */
import { assetUrl } from "../asset";
import { bestiaryThumb } from "./bestiary";
import { formatGold } from "./model";
import { CLIMB_DAILY_CLEARS, climbRiftMult, type ClimbReward, type ClimbState } from "./riftClimb";
import "./urgent.css";

export function ClimbPoster({
  state, clearsToday, floorArt, floorName, stageEq, hp, timeSec, reward, canStart, onStart, onClose,
}: {
  state: ClimbState;
  clearsToday: number;
  floorArt: string;
  floorName: string;
  /** 사냥터 몇 층 대장과 같은가 */
  stageEq: number;
  hp: number;
  timeSec: number;
  reward: ClimbReward;
  canStart: boolean;
  onStart: () => void;
  onClose: () => void;
}) {
  const left = Math.max(0, CLIMB_DAILY_CLEARS - clearsToday);
  const bonusNow = Math.round((climbRiftMult(state) - 1) * 100);
  const bonusNext = Math.round((climbRiftMult({ ...state, floor: state.floor + 1 }) - 1) * 100);
  return (
    <div className="urgent-backdrop" role="presentation" onPointerDown={(event) => event.stopPropagation()} onClick={onClose}>
      <div className="urgent-poster promo-poster climb-poster" role="dialog" aria-modal="true" aria-label="균열 계단" data-climb="poster" onClick={(event) => event.stopPropagation()}>
        <small className="urgent-kicker">균열 계단 · 오늘 {clearsToday}/{CLIMB_DAILY_CLEARS}단</small>
        <h2 className="promo-title climb-title">제 {state.floor}단</h2>
        <div className="urgent-portrait"><img src={assetUrl(bestiaryThumb(floorArt))} alt="" /></div>
        <strong className="urgent-name">{floorName}</strong>
        <p className="urgent-rule">{stageEq}층 대장 · 체력 <b>{formatGold(hp)}</b> · <b>{timeSec}초</b></p>
        <div className="urgent-reward" aria-label="보상">
          <span><img src={assetUrl("ui/attendance/enhance-stone.png")} alt="강화석" /><b data-climb="stones">{reward.stones}</b></span>
          {reward.gems > 0 && <span><img src={assetUrl("ui/rewards/gem.png")} alt="붉은 보석" /><b data-climb="gems">{reward.gems}</b></span>}
          {reward.shards > 0 && <span><img src={assetUrl("ui/rewards/ally-shard.png")} alt="동료 조각" /><b data-climb="shards">{reward.shards}</b></span>}
        </div>
        <p className="urgent-deadline">균열 정산 <b className="climb-bonus">+{bonusNow}%</b>{bonusNext > bonusNow ? ` → +${bonusNext}%` : " (최대)"} · 져도 오늘 횟수는 그대로</p>
        <div className="urgent-actions">
          <button type="button" className="urgent-later" onClick={onClose}>나중에</button>
          <button type="button" className="urgent-go" data-climb="go" disabled={!canStart || left === 0} onClick={onStart}>{left === 0 ? "내일 다시" : canStart ? "도전" : "잠시만요"}</button>
        </div>
      </div>
    </div>
  );
}
