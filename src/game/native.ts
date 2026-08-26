/**
 * Capacitor 네이티브 브리지 — Android/iOS 컨테이너에서만 동작하는 훅.
 *
 * 앱인토스 SDK(`game/toss.ts`)와 같은 원칙으로 작성한다:
 * 동적 import + try/catch 가드라 웹·앱인토스 환경에서는 아무 일도 하지 않는다.
 */

export function isNativePlatform(): boolean {
  try {
    // Capacitor는 네이티브 WebView에 전역 객체를 주입한다. 웹에서는 undefined.
    const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
    return cap?.isNativePlatform?.() ?? false;
  } catch {
    return false;
  }
}

const REVIEW_ASKED_KEY = "dodgebullets:reviewAsked:v1";

/**
 * 인앱 리뷰 요청 — 감정 고점(첫 지역 개척, 첫 +15 강화)에서 1회만.
 *
 * - 스토어 API 특성상 호출해도 조용히 표시되지 않을 수 있다(쿼터). 그래서
 *   "요청 시도"를 기준으로 1회 플래그를 남긴다 — 반복 호출은 정책 위반 소지.
 * - 네이티브가 아니면 no-op. 실패는 전부 삼킨다 — 리뷰 유도 때문에
 *   게임 흐름이 끊기면 본말전도다.
 */
export async function requestReviewOnce(trigger: string): Promise<void> {
  if (!isNativePlatform()) return;
  try {
    if (localStorage.getItem(REVIEW_ASKED_KEY)) return;
    localStorage.setItem(REVIEW_ASKED_KEY, `${trigger}:${Date.now()}`);
    const { InAppReview } = await import("@capacitor-community/in-app-review");
    await InAppReview.requestReview();
  } catch {
    // ignore
  }
}

/**
 * 네이티브에서의 "게임 종료".
 *
 * - Android: `App.exitApp()`으로 실제 종료
 * - iOS: 프로그램적 종료는 심사 가이드라인 위반 소지가 있어 minimize로 대체
 *
 * 네이티브가 아니면 false를 반환해 호출부가 앱인토스 closeView 경로를 타게 한다.
 */
export async function exitAppNative(): Promise<boolean> {
  if (!isNativePlatform()) return false;
  try {
    const { App } = await import("@capacitor/app");
    const cap = (window as unknown as { Capacitor?: { getPlatform?: () => string } }).Capacitor;
    if (cap?.getPlatform?.() === "ios") await App.minimizeApp();
    else await App.exitApp();
    return true;
  } catch {
    return false;
  }
}

/**
 * Android 하드웨어 뒤로가기.
 *
 * 기본 동작은 WebView 히스토리 back → 없으면 앱 종료인데, 이 게임은 히스토리가
 * 없는 SPA라 뒤로가기 = 즉시 종료가 된다. 대신:
 * - 게임 콘텐츠 안이면 → 허브(사냥터)로 복귀
 * - 허브면 → 앱을 백그라운드로 (종료 대신 minimize — 방치 게임이므로)
 *
 * 반환값은 해제 함수. 네이티브가 아니면 no-op.
 */
export async function bindAndroidBackButton(handlers: {
  /** true를 반환하면 내부에서 소비(허브로 복귀 등), false면 앱 최소화 */
  onBack: () => boolean;
}): Promise<() => void> {
  if (!isNativePlatform()) return () => undefined;
  try {
    const { App } = await import("@capacitor/app");
    const sub = await App.addListener("backButton", () => {
      if (!handlers.onBack()) void App.minimizeApp();
    });
    return () => void sub.remove();
  } catch {
    return () => undefined;
  }
}
