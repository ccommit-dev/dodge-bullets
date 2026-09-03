import { useEffect, useMemo, useRef, useState } from "react";
import { assetUrl } from "./asset";
import { formatGold } from "./titans/model";
import { IDLE, formatDuration, type IdleBottleneck, type IdleYield } from "./progression/idle";
import { CurrencyIcon } from "./ui/CurrencyIcon";
import { sfxIdleClaim } from "./ui/sfx";

type Props = {
  result: IdleYield;
  stage: number;
  bottleneck: IdleBottleneck;
  onClaim: () => void;
  /** L 보상형 광고 2배 — undefined면 버튼을 그리지 않는다 */
  adOption?: "ad" | "free" | null;
  adBusy?: boolean;
  onClaimDouble?: () => void | Promise<void>;
  onGoContent: (content: "dodge" | "beat" | "forge") => void;
};

/**
 * 0 → target 카운트업. ease-out으로 붙어서 마지막 자리가 또렷하게 멈춘다.
 *
 * 탭이 백그라운드면 rAF가 아예 돌지 않아 숫자가 0에 멈춘다 — 유저 입장에서는
 * 보상을 못 받은 것으로 보인다. 애니메이션 길이만큼 뒤에 최종값을 강제로 찍는
 * 폴백 타이머를 함께 걸어 어떤 경우에도 정확한 값이 남게 한다.
 */
function useCountUp(target: number, durationMs = 900, delayMs = 0): number {
  const [value, setValue] = useState(0);
  const rafRef = useRef(0);
  useEffect(() => {
    if (target <= 0) {
      setValue(0);
      return;
    }
    let start = 0;
    const step = (now: number) => {
      if (!start) start = now;
      const elapsed = now - start - delayMs;
      if (elapsed < 0) {
        rafRef.current = requestAnimationFrame(step);
        return;
      }
      const t = Math.min(1, elapsed / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.floor(target * eased));
      if (t < 1) rafRef.current = requestAnimationFrame(step);
      else setValue(target);
    };
    rafRef.current = requestAnimationFrame(step);
    const settle = window.setTimeout(() => setValue(target), delayMs + durationMs + 120);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.clearTimeout(settle);
    };
  }, [target, durationMs, delayMs]);
  return value;
}

const CONTENT_LABEL: Record<IdleBottleneck["content"], string> = {
  titans: "사냥터",
  dodge: "화살 원정",
  beat: "연습실",
  forge: "대장간",
};

export function IdleReturnModal({ result, stage, bottleneck, onClaim, onGoContent, adOption = null, adBusy = false, onClaimDouble }: Props) {
  const gold = useCountUp(result.gold, 950);
  const exp = useCountUp(result.exp, 950, 120);
  const materials = useCountUp(result.materials, 950, 240);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    sfxIdleClaim();
  }, []);

  const ratePct = Math.round(result.rate * 100);
  const rateFill = useMemo(
    () => `${Math.min(100, (result.rate / IDLE.rateCap) * 100)}%`,
    [result.rate],
  );
  const multFill = useMemo(
    () => `${Math.min(100, ((result.multiplier - 1) / (IDLE.multCap - 1)) * 100)}%`,
    [result.multiplier],
  );
  const capFill = useMemo(
    () => `${Math.min(100, (result.capHours / IDLE.hoursCap) * 100)}%`,
    [result.capHours],
  );

  const claim = () => {
    if (claiming) return;
    setClaiming(true);
    window.setTimeout(onClaim, 260);
  };

  return (
    <div className={`exit-modal idle-modal ${claiming ? "is-claiming" : ""}`} role="dialog" aria-modal="true">
      <div className="exit-card idle-card">
        <div className="idle-rays-clip" aria-hidden="true">
          <div className="idle-rays" />
        </div>
        <img className="idle-crest" src={assetUrl("ui/idle/idle-report.svg")} alt="" aria-hidden="true" />
        <p className="brand">IDLE REPORT</p>
        <h2 className="exit-title">귀환 정산</h2>
        <p className="idle-sub">
          {result.endStage > stage
            ? `Stage ${stage} → ${result.endStage} · ${formatDuration(result.seconds)} 동안 원정대가 전진했습니다`
            : `Stage ${stage} · ${formatDuration(result.seconds)} 동안 원정대가 사냥했습니다`}
          {result.boosted && <em className="idle-boost-tag"> ×2 부스트</em>}
        </p>

        {result.cappedOut && (
          <p className="idle-capped">
            <span>CAP</span> {result.capHours}시간에서 누적이 멈췄습니다 ·{" "}
            {formatDuration(result.wastedSeconds)} 손실
          </p>
        )}

        <div className="idle-loot">
          <article style={{ animationDelay: "0ms" }}>
            <CurrencyIcon kind="gold" />
            <b>{formatGold(gold)}</b>
            <span>공유 골드</span>
          </article>
          <article style={{ animationDelay: "90ms" }}>
            <img src={assetUrl("ui/idle/exp-orb.svg")} alt="" aria-hidden="true" />
            <b>{exp.toLocaleString()}</b>
            <span>경험치</span>
          </article>
          <article style={{ animationDelay: "180ms" }}>
            <img src={assetUrl("ui/attendance/enhance-stone.png")} alt="" />
            <b>{materials.toLocaleString()}</b>
            <span>강화석 · 대장간 성공률 +8%p</span>
          </article>
          {result.allyShardDrops > 0 && (
            <article style={{ animationDelay: "270ms" }}>
              <span className="idle-shard-orb" aria-hidden="true">★</span>
              <b>{result.allyShardDrops}</b>
              <span>동료 조각</span>
            </article>
          )}
        </div>

        {/* 보상 → 사용처 연결 (점검표 #10): 강화석이 생긴 순간 대장간으로 바로 보낸다 */}
        {result.materials > 0 && (
          <button type="button" className="idle-forge-cta" onClick={() => onGoContent("forge")}>
            <img src={assetUrl("ui/idle/anvil.svg")} alt="" aria-hidden="true" />
            <span>
              <b>강화석 {result.materials}개 — 대장간에서 바로 쓰기</b>
              <small>수령 후 대장간으로 이동 · 이번 강화 성공률 +8%p</small>
            </span>
            <em>›</em>
          </button>
        )}

        <div className="idle-factors">
          <div>
            <small>R · 효율</small>
            <i>
              <em style={{ width: rateFill }} />
            </i>
            <strong>{ratePct}%</strong>
          </div>
          <div>
            <small>M · 배율</small>
            <i>
              <em style={{ width: multFill }} />
            </i>
            <strong>×{result.multiplier.toFixed(2)}</strong>
          </div>
          <div>
            <small>T · 시간</small>
            <i>
              <em style={{ width: capFill }} />
            </i>
            <strong>{result.capHours}h</strong>
          </div>
        </div>

        <div className={`idle-bottleneck bottleneck-${bottleneck.variable}`}>
          <span className="idle-bottleneck-tag">{bottleneck.variable}</span>
          <div>
            <b>{bottleneck.title}</b>
            <small>{bottleneck.hint}</small>
          </div>
        </div>

        <button type="button" className="cta idle-claim" onClick={claim}>
          보상 수령
        </button>
        {/* L 보상형 광고: 정산 2배 — 미연동이면 자리 자체가 없다 */}
        {adOption && (
          <button type="button" className="cta idle-claim-ad" disabled={adBusy} onClick={() => void onClaimDouble?.()}>
            {adBusy ? "광고 재생 중…" : adOption === "free" ? "광고 제거 보유 · 2배로 받기" : "광고 보고 2배로 받기"}
            <small>{adOption === "free" ? "광고 없이 자동 적용" : "오늘 남은 횟수 포함 · 30초 광고"}</small>
          </button>
        )}
        {bottleneck.content !== "titans" && (
          <button
            type="button"
            className="cta cta-ghost"
            onClick={() => {
              setClaiming(true);
              window.setTimeout(() => onGoContent(bottleneck.content as "dodge" | "beat" | "forge"), 200);
            }}
          >
            수령하고 {CONTENT_LABEL[bottleneck.content]}(으)로
          </button>
        )}
      </div>
    </div>
  );
}
