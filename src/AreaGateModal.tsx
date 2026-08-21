import { assetUrl } from "./asset";
import { nextAreaName, requiredDodgeStage, stageCeilingFor } from "./progression/idle";
import { HUNTING_AREAS, huntingArea } from "./titans/model";

type Props = {
  /** 현재 개척도 (1~5) */
  pioneeredArea: number;
  onGoDodge: () => void;
  onDismiss: () => void;
};

/**
 * 지역 개척 게이트 차단 모달.
 *
 * 하드 게이트라 여기서 막히면 사냥터 진행이 멈춘다. 대신 30초짜리 원정으로
 * 바로 보내는 탈출구를 함께 둬서 벽에 갇힌 느낌이 되지 않게 한다.
 */
export function AreaGateModal({ pioneeredArea, onGoDodge, onDismiss }: Props) {
  const nextArea = huntingArea(stageCeilingFor(pioneeredArea) + 1);
  return (
    <div className="exit-modal gate-modal" role="dialog" aria-modal="true">
      <div className="exit-card gate-card">
        <div className="gate-doors" aria-hidden="true">
          <span className="gate-door left" />
          <span className="gate-door right" />
          <img className="gate-crest" src={assetUrl("ui/idle/gate-locked.svg")} alt="" />
          <span className="gate-seal">
            {pioneeredArea}/{HUNTING_AREAS.length}
          </span>
        </div>
        <p className="brand">AREA LOCKED</p>
        <h2 className="exit-title">{nextAreaName(pioneeredArea) ?? "미지의 영역"}</h2>
        <p className="gate-desc">
          정찰병이 길을 뚫어야 사냥터가 열립니다.
          <br />
          <b>화살 원정 Stage {requiredDodgeStage(pioneeredArea) ?? 4}</b> 클리어가 필요합니다.
        </p>
        <p className="gate-reward">개방 시 획득 배율 ×{nextArea.rewardMultiplier}</p>
        <button type="button" className="cta" onClick={onGoDodge}>
          화살 원정 출발 (30초)
        </button>
        <button type="button" className="cta cta-ghost" onClick={onDismiss}>
          여기서 더 사냥하기
        </button>
      </div>
    </div>
  );
}
