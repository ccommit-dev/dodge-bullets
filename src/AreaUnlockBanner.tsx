import { useEffect, useState } from "react";
import { assetUrl } from "./asset";
import type { HuntingAreaDef } from "./titans/model";

type Props = {
  area: HuntingAreaDef;
  onDone: () => void;
};

/**
 * 지역 개척 성공 연출 — 성문이 갈라지며 새 사냥터 배경이 드러난다.
 * 화살 원정이 사냥터에 영향을 준다는 사실을 유저가 눈으로 확인하는 유일한 순간이라
 * 토스트가 아니라 전체 화면 연출로 처리한다.
 */
export function AreaUnlockBanner({ area, onDone }: Props) {
  const [phase, setPhase] = useState<"open" | "reveal" | "out">("open");

  useEffect(() => {
    const toReveal = window.setTimeout(() => setPhase("reveal"), 620);
    const toOut = window.setTimeout(() => setPhase("out"), 2900);
    const done = window.setTimeout(onDone, 3400);
    return () => {
      window.clearTimeout(toReveal);
      window.clearTimeout(toOut);
      window.clearTimeout(done);
    };
  }, [onDone]);

  return (
    <div className={`area-unlock phase-${phase}`} role="status" aria-live="polite">
      <div
        className="area-unlock-bg"
        style={{ backgroundImage: `url(${area.background})` }}
        aria-hidden="true"
      />
      <div className="area-unlock-scrim" style={{ background: `linear-gradient(180deg, ${area.sky}cc, ${area.ground}ee)` }} aria-hidden="true" />
      <span className="area-gate-half left" aria-hidden="true" />
      <span className="area-gate-half right" aria-hidden="true" />
      <div className="area-unlock-copy">
        <p className="brand">AREA PIONEERED</p>
        <h2 style={{ color: area.accent }}>{area.name}</h2>
        <p className="area-unlock-range">
          STAGE {area.stageFrom} – {area.stageTo >= 9999 ? "∞" : area.stageTo}
        </p>
        <p className="area-unlock-mult">획득 배율 ×{area.rewardMultiplier}</p>
        <div className="area-unlock-boss">
          <img src={assetUrl("ui/attendance/event-chest.png")} alt="" aria-hidden="true" />
          <span>보스 · {area.bossName}</span>
        </div>
      </div>
    </div>
  );
}
