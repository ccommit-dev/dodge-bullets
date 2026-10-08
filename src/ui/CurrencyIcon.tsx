import { assetUrl } from "../asset";

/**
 * 재화 아이콘 (2026-10-08, 사용자: "보석·재화·UI 통일감이 없다") — 예전엔 인라인 SVG(납작한 노란 원 · 붉은 육각)라
 * 상단 지갑·상점·출석의 생성 아이콘(황금 도토리 · 루비 하트)과 다른 그림이었다. 같은 생성 아이콘 파일을 쓴다.
 */
export function CurrencyIcon({ kind, className = "" }: { kind: "gold" | "gem"; className?: string }) {
  return kind === "gold" ? (
    <img className={`currency-icon ${className}`} src={assetUrl("ui/attendance/gold.png")} alt="골드" />
  ) : (
    <img className={`currency-icon ${className}`} src={assetUrl("ui/attendance/gem.png")} alt="붉은 보석" />
  );
}

/**
 * 가격 앞 보석 표시 (2026-10-06, 사용자: "아직도 상단 ui에 하늘색 보석은 안보이네") — 가격은 하늘색 💎 이모지였고
 * 상단 지갑은 붉은 보석이라 다른 재화로 보였다. 같은 재화(붉은 보석)이므로 같은 아이콘으로.
 */
export function GemMark() {
  return <CurrencyIcon kind="gem" className="gem-mark" />;
}
