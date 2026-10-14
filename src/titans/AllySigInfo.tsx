/**
 * 동료 시그니처·능력치 한 덩어리 (2026-10-14, 사용자: "캐릭터 및 동료별 특징을 잘 모르겠어") —
 * 도감 카드·뽑기 설명 패널이 같은 표기를 쓴다: ✦ 기술 이름 · 리듬 · 설명 + 공속/한방 막대.
 */
import type { CSSProperties } from "react";
import type { TitanHeroDef } from "./model";
import { allySignature, allyStatBars, signatureRhythm } from "./allySignature";

export function AllySigInfo({ hero, compact = false }: { hero: TitanHeroDef; compact?: boolean }) {
  const sig = allySignature(hero.id);
  const bars = allyStatBars(hero.attackInterval, sig);
  return (
    <span className={`ally-sig fx-${sig.fx}${compact ? " compact" : ""}`} style={{ "--sig-hue": hero.hue } as CSSProperties} data-sig={sig.move}>
      <b className="ally-sig-name"><i aria-hidden="true" />{sig.move}</b>
      <small className="ally-sig-rhythm">{signatureRhythm(sig)}{compact ? "" : ` — ${sig.desc}`}</small>
      {!compact && (
        <span className="ally-sig-bars" aria-label={`공속 ${bars.speed}/5 · 한방 ${bars.burst}/5`}>
          <span><em>공속</em>{[1, 2, 3, 4, 5].map((n) => <i key={n} className={n <= bars.speed ? "on" : ""} />)}</span>
          <span><em>한방</em>{[1, 2, 3, 4, 5].map((n) => <i key={n} className={n <= bars.burst ? "on" : ""} />)}</span>
        </span>
      )}
    </span>
  );
}
