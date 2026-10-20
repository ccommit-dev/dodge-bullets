/**
 * 화면 방향 (2026-10-07, 사용자: "모바일 세로모드를 지원기능 추가").
 * 예전엔 안드로이드 매니페스트가 세로로 고정이었고 설정에 선택이 없었다. 이제 매니페스트는 fullUser(기기 회전 따름)이고
 * 여기서 사용자 선택(자동 · 세로 고정 · 가로 고정)을 저장해 앱(@capacitor/screen-orientation)과 웹(screen.orientation.lock, 지원 브라우저만)에 건다.
 * 기본은 **자동**(2026-10-14, 사용자: "가로모드 · 모바일에서 이질감 없게") — 기기를 돌리면 가로 레이아웃(App.css @media landscape)이 받는다.
 * 토스 미니앱만 출시 가이드(세로 고정)에 따라 기본 세로 — game/toss.ts lockScreenForGame 과 같은 판단.
 */
export type OrientationPref = "auto" | "portrait" | "landscape";
const KEY = "dodgebullets:orientation";

/** 저장된 선택이 없을 때 — 토스 미니앱은 세로, 그 밖(안드로이드 앱·웹·카카오톡 인앱)은 자동 */
export function defaultOrientationPref(ua: string = typeof navigator !== "undefined" ? navigator.userAgent : ""): OrientationPref {
  return /toss/i.test(ua) ? "portrait" : "auto";
}

export function loadOrientationPref(): OrientationPref {
  try {
    const v = localStorage.getItem(KEY);
    return v === "auto" || v === "landscape" || v === "portrait" ? v : defaultOrientationPref();
  } catch { return defaultOrientationPref(); }
}

export function saveOrientationPref(p: OrientationPref): void {
  try { localStorage.setItem(KEY, p); } catch { /* 저장 불가 환경 */ }
}

export const ORIENTATION_LABEL: Record<OrientationPref, string> = { auto: "자동", portrait: "세로", landscape: "가로" };

/** 선택을 기기에 적용한다. 실패(미지원 브라우저·플러그인 없음)는 조용히 — CSS 레이아웃은 어느 쪽이든 받는다 */
export async function applyOrientation(p: OrientationPref): Promise<"native" | "web" | "none"> {
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean; isPluginAvailable?: (n: string) => boolean } }).Capacitor;
  if (cap?.isNativePlatform?.() && (!cap.isPluginAvailable || cap.isPluginAvailable("ScreenOrientation"))) {
    try {
      const { ScreenOrientation } = await import("@capacitor/screen-orientation");
      if (p === "auto") await ScreenOrientation.unlock();
      else await ScreenOrientation.lock({ orientation: p === "portrait" ? "portrait-primary" : "landscape-primary" });
      return "native";
    } catch { /* 플러그인 호출 실패 → 웹 경로 */ }
  }
  try {
    const so = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void>; unlock?: () => void };
    if (p === "auto") { so.unlock?.(); return "web"; }
    if (so.lock) { await so.lock(p === "portrait" ? "portrait-primary" : "landscape-primary"); return "web"; }
  } catch { /* 전체 화면이 아니면 브라우저가 거부한다 — 레이아웃만 따른다 */ }
  return "none";
}

/** 지금 가로인가 — 레이아웃·검사용 */
export function isLandscapeNow(): boolean {
  // PC 웹 기둥은 세로 화면처럼 쓴다 (ui/webFrame)
  return typeof window !== "undefined" && !document.documentElement.classList.contains("web-frame") && window.innerWidth > window.innerHeight;
}
