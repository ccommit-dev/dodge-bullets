import { useEffect, useRef, useState } from "react";
import { assetUrl } from "./asset";
import { formatGold } from "./titans/model";
import { formatDuration, type IdleBottleneck, type IdleYield } from "./progression/idle";
import { CurrencyIcon } from "./ui/CurrencyIcon";
import { SkillIcon } from "./ui/SkillIcon";
import { relicDef, relicIconUrl, type RelicId } from "./titans/relics";
import { SKILLS, type TitanSkillId } from "./titans/model";
import { sfxIdleClaim } from "./ui/sfx";

type Props = {
  result: IdleYield;
  /** 희귀 드랍 (2026-10-29) — 유물 조각 · 스킬 카드. 같은 것은 한 칸에 ×n */
  drops?: { relics: RelicId[]; skills: TitanSkillId[] };
  stage: number;
  bottleneck: IdleBottleneck;
  onClaim: () => void;
  /** L 보상형 광고 2배 — undefined면 버튼을 그리지 않는다 */
  adOption?: "ad" | "free" | null;
  adBusy?: boolean;
  onClaimDouble?: () => void | Promise<void>;
  /** retention-3: 후원 계약 미리보기 (8h+ 복귀·미가입·유료 게이트 통과) — 이번 정산에 더 받았을 골드·시간 */
  patronOption?: { extraGold: number; extraHours: number; price: string; busy: boolean } | null;
  onBuyPatron?: () => void | Promise<void>;
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

export function IdleReturnModal({ result, drops, stage, onClaim, adOption = null, adBusy = false, onClaimDouble, patronOption = null, onBuyPatron }: Props) {
  const gold = useCountUp(result.gold, 950);
  const exp = useCountUp(result.exp, 950, 120);
  const materials = useCountUp(result.materials, 950, 240);
  const [claiming, setClaiming] = useState(false);
  const countOf = <T extends string>(ids: readonly T[]) => [...ids.reduce((m, id) => m.set(id, (m.get(id) ?? 0) + 1), new Map<T, number>())];
  const relicRows = countOf(drops?.relics ?? []);
  const skillRows = countOf(drops?.skills ?? []);

  useEffect(() => {
    sfxIdleClaim();
  }, []);


  const claim = () => {
    if (claiming) return;
    setClaiming(true);
    window.setTimeout(onClaim, 260);
  };

  // 완전 단순화 (2026-10-27, 사용자: "귀환 정산 UI 완전 단순화") — 제목 · 한 줄(시간 · 스테이지) · 받은 것 · 받기 단추만.
  // 예전의 빛 · 문장 · R/M/T 막대 · 병목 안내 · 대장간 바로가기 · "수령하고 ~로" 는 뺐다(병목 · 바로가기는 사냥터 추천 줄에 이미 있다).
  // 광고 2배 · 후원 미리보기는 상품이 있을 때만 한 줄씩 아래에
  return (
    <div className={`exit-modal idle-modal idle-simple ${claiming ? "is-claiming" : ""}`} role="dialog" aria-modal="true">
      <div className="exit-card idle-card">
        <h2 className="exit-title">귀환 정산</h2>
        <p className="idle-sub">
          {formatDuration(result.seconds)} 사냥{result.endStage > stage ? ` · Stage ${stage} → ${result.endStage}` : ` · Stage ${stage}`}
          {result.boosted && <em className="idle-boost-tag"> ×2</em>}
          {result.cappedOut && <em className="idle-cap-tag"> · 최대 {result.capHours}시간</em>}
        </p>
        <div className="idle-loot">
          <article><CurrencyIcon kind="gold" /><b>{formatGold(gold)}</b><span>골드</span></article>
          <article><img src={assetUrl("ui/idle/exp-orb.png")} alt="" aria-hidden="true" /><b>{exp.toLocaleString()}</b><span>경험치</span></article>
          {materials > 0 && <article><img src={assetUrl("ui/attendance/enhance-stone.png")} alt="" aria-hidden="true" /><b>{materials.toLocaleString()}</b><span>강화석</span></article>}
          {result.allyShardDrops > 0 && <article><img className="idle-shard-orb" src={assetUrl("ui/idle/star.png")} alt="" aria-hidden="true" /><b>{result.allyShardDrops}</b><span>동료 조각</span></article>}
          {relicRows.map(([id, n]) => <article key={`relic-${id}`} className="is-rare" data-drop={`relic-${id}`}><img src={assetUrl(relicIconUrl(id))} alt="" aria-hidden="true" /><b>×{n}</b><span>{relicDef(id).name} 조각</span></article>)}
          {skillRows.map(([id, n]) => <article key={`skill-${id}`} className="is-rare" data-drop={`skill-${id}`}><SkillIcon id={id} size={36} /><b>×{n}</b><span>{SKILLS.find((s) => s.id === id)?.name ?? id} 카드</span></article>)}
        </div>
        <button type="button" className="cta idle-claim" onClick={claim}>받기</button>
        {adOption && (
          <button type="button" className="cta cta-ghost idle-claim-ad" disabled={adBusy} onClick={() => void onClaimDouble?.()}>
            {adBusy ? "광고 재생 중…" : adOption === "free" ? "2배로 받기 (광고 제거 보유)" : "광고 보고 2배로 받기"}
          </button>
        )}
        {patronOption && (
          <div className="idle-patron-preview" data-extra-gold={patronOption.extraGold}>
            <b>후원 계약이면 +{patronOption.extraGold.toLocaleString()} 골드</b>
            <button type="button" className="patron-buy" disabled={patronOption.busy} onClick={() => void onBuyPatron?.()}>30일 <em>{patronOption.price}</em></button>
          </div>
        )}
      </div>
    </div>
  );
}
