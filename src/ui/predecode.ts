/**
 * 그림 미리 풀기 (2026-11-19, 첨부 엔진 차용 ④) — 시트를 받자마자 decode() 를 걸어 둔다.
 * 그냥 두면 첫 drawImage 순간 메인 스레드에서 큰 시트(1536² 등)를 풀며 그 프레임이 끊긴다(첫 몬스터 · 첫 대장 등장).
 * decode() 는 다른 스레드에서 풀고, 실패(옛 웹뷰 · 404)는 무시한다 — 그리기 코드는 그대로 complete 를 본다.
 */
export function predecode(img: HTMLImageElement): HTMLImageElement {
  try { void img.decode?.().catch(() => undefined); } catch { /* decode 없는 옛 웹뷰 */ }
  return img;
}
