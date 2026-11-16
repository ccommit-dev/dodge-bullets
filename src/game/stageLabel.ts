/**
 * 성문 방어 칸 표기 (2026-11-16 정리) — 같은 진행을 'S4' · 'Stage 4' · '1-4' 세 가지로 부르던 것을
 * 로비 목록(RouteMap)과 같은 '장-칸' 하나로. n 은 1-based 칸 번호(dodgeBestStage 와 같은 단위), 10칸 = 1장.
 */
export function chapterStageLabel(n: number): string {
  const k = Math.max(1, Math.floor(n));
  return `${Math.ceil(k / 10)}-${((k - 1) % 10) + 1}`;
}
