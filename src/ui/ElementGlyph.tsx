import type { AllyElement } from "../titans/allies";

/**
 * 속성 표식 (2026-11-18, 카드 격자) — 카드 판 구석의 작은 원 안 그림. 글자('바' · '흙')는 한 글자로 줄이면 뜻이 흐려졌다.
 * 색은 card-grid.css .ally-el-badge.el-* 가 칠한다(그림은 흰색 하나).
 */
const PATHS: Record<AllyElement, string> = {
  // 불꽃 — 아래가 둥글고 위가 뾰족한 불꽃 하나
  fire: "M12 2c1.5 3.6 5.5 5.6 5.5 10.6A5.5 5.5 0 0 1 6.5 12.6c0-2.3 1.2-3.9 2.4-5 .1 1.6.9 2.7 2 3.2C10.8 7.6 11 4.6 12 2z",
  // 물방울
  water: "M12 2.5c3 4.2 6 7.6 6 11.2a6 6 0 0 1-12 0c0-3.6 3-7 6-11.2z",
  // 흙 — 산 두 봉우리
  earth: "M2 20 9 7l4 6.5L15.5 10 22 20z",
  // 바람 — 소용돌이 두 줄
  wind: "M3 9h11.5a3 3 0 1 0-3-3h2a1 1 0 1 1 1 1H3zm0 4h15a3 3 0 1 1-3 3h2a1 1 0 1 0 1-1H3zm0 4h7v2H3z",
};

export function ElementGlyph({ el }: { el: AllyElement }) {
  return (
    <svg className="el-glyph" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
      <path d={PATHS[el]} fill="currentColor" />
    </svg>
  );
}
