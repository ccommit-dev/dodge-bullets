/**
 * 햅틱 (2026-10-01) — 2D 모바일 게임의 손맛. 안드로이드 WebView·크롬은 navigator.vibrate 를 지원하고,
 * iOS 사파리·데스크톱은 조용히 무시한다. 소리와 별개로 항상 켜져 있다 (설정은 OS 진동 설정을 따른다).
 *   tap     버튼을 누를 때 (짧게)
 *   hit     피격·성문 피해
 *   heavy   방어막 붕괴·보스 격파
 *   success 클리어·보상
 *   fail    사망
 */
export type HapticKind = "tap" | "hit" | "heavy" | "success" | "fail";

const PATTERN: Record<HapticKind, number | number[]> = {
  tap: 8,
  hit: 28,
  heavy: [45, 30, 70],
  success: [18, 40, 18, 40, 36],
  fail: [60, 40, 60],
};

export function haptic(kind: HapticKind = "tap"): void {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  try { navigator.vibrate(PATTERN[kind]); } catch { /* 지원하지 않는 환경 */ }
}

let installed = false;
/** 모든 버튼의 pointerdown 에 짧은 진동 — 개별 핸들러에 넣지 않아도 앱 전체가 같은 손맛을 낸다. data-no-haptic 으로 뺀다 */
export function installTapHaptics(): void {
  if (installed || typeof document === "undefined") return;
  installed = true;
  document.addEventListener("pointerdown", (e) => {
    const target = e.target as HTMLElement | null;
    const button = target?.closest?.("button");
    if (!button || button.hasAttribute("disabled") || button.hasAttribute("data-no-haptic")) return;
    haptic("tap");
  }, { passive: true, capture: true });
}
