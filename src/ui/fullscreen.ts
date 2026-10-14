/**
 * 전체 화면 · 인앱 브라우저 탈출 (2026-10-14, 사용자: "가로모드에 콘텐츠가 전체화면이 안 되어 있네 · 모바일에서 이질감 없게").
 *
 * 카카오톡·네이버·인스타그램 같은 인앱 브라우저(WebView)는 Fullscreen API 가 없어 위·아래 도구줄이 화면을 먹는다.
 *   - Fullscreen API(접두사 webkit 포함)가 되면 → 진짜 전체 화면
 *   - 인앱 브라우저면 → "브라우저로 열기": 카카오톡은 kakaotalk://web/openExternal, 안드로이드 그 밖은 크롬 intent
 *   - 그것도 안 되면(iOS 인앱) → 메뉴의 "다른 브라우저로 열기" 안내 문구
 * 토스 미니앱·네이티브 앱(Capacitor)은 이미 전체 화면이라 아무것도 하지 않는다.
 */
export type InAppKind = "kakao" | "naver" | "instagram" | "facebook" | "line" | "band" | "daum" | null;

export function inAppBrowser(ua: string = typeof navigator !== "undefined" ? navigator.userAgent : ""): InAppKind {
  if (/toss/i.test(ua)) return null;
  if (/KAKAOTALK/i.test(ua)) return "kakao";
  if (/NAVER\(inapp|NAVER\//i.test(ua)) return "naver";
  if (/Instagram/i.test(ua)) return "instagram";
  if (/FBAN|FBAV|FB_IAB/i.test(ua)) return "facebook";
  if (/\bLine\//i.test(ua)) return "line";
  if (/BAND\//i.test(ua)) return "band";
  if (/DaumApps/i.test(ua)) return "daum";
  return null;
}

export const IN_APP_LABEL: Record<Exclude<InAppKind, null>, string> = {
  kakao: "카카오톡", naver: "네이버", instagram: "인스타그램", facebook: "페이스북", line: "라인", band: "밴드", daum: "다음",
};

type FsDoc = Document & { webkitFullscreenEnabled?: boolean; webkitFullscreenElement?: Element | null; webkitExitFullscreen?: () => void };
type FsEl = HTMLElement & { webkitRequestFullscreen?: () => void };

export function isNativeApp(): boolean {
  return !!(typeof window !== "undefined" && (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.());
}

export function canFullscreen(): boolean {
  if (typeof document === "undefined") return false;
  const d = document as FsDoc;
  return !!(d.fullscreenEnabled || d.webkitFullscreenEnabled);
}

export function isFullscreen(): boolean {
  if (typeof document === "undefined") return false;
  const d = document as FsDoc;
  return !!(d.fullscreenElement || d.webkitFullscreenElement);
}

export async function toggleFullscreen(): Promise<boolean> {
  const d = document as FsDoc;
  const el = document.documentElement as FsEl;
  try {
    if (isFullscreen()) {
      if (d.exitFullscreen) await d.exitFullscreen(); else d.webkitExitFullscreen?.();
      return false;
    }
    if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: "hide" }); else el.webkitRequestFullscreen?.();
    // 가로로 돌린 채 들어왔으면 방향도 붙잡는다(지원하는 브라우저만)
    const o = (screen as Screen & { orientation?: { lock?: (o: string) => Promise<void>; type?: string } }).orientation;
    if (o?.lock && o.type?.startsWith("landscape")) await o.lock("landscape").catch(() => undefined);
    return true;
  } catch {
    return isFullscreen();
  }
}

/** 인앱 브라우저에서 외부 브라우저로 여는 주소 — 없으면 null (iOS 의 카카오 외 인앱) */
export function externalOpenUrl(kind: InAppKind, href: string, ua: string = typeof navigator !== "undefined" ? navigator.userAgent : ""): string | null {
  if (!kind) return null;
  if (kind === "kakao") return `kakaotalk://web/openExternal?url=${encodeURIComponent(href)}`;
  if (/Android/i.test(ua)) {
    const u = new URL(href);
    return `intent://${u.host}${u.pathname}${u.search}${u.hash}#Intent;scheme=${u.protocol.replace(":", "")};package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(href)};end`;
  }
  return null;
}

/** 지금 이 환경에서 설정 메뉴에 무엇을 보여 줄까 */
export type FullscreenMode = { kind: "toggle" } | { kind: "external"; app: string; url: string } | { kind: "guide"; app: string } | { kind: "none" };
export function fullscreenMode(href: string = typeof location !== "undefined" ? location.href : "", ua?: string): FullscreenMode {
  if (isNativeApp()) return { kind: "none" };
  const app = inAppBrowser(ua);
  if (app) {
    const url = externalOpenUrl(app, href, ua);
    return url ? { kind: "external", app: IN_APP_LABEL[app], url } : { kind: "guide", app: IN_APP_LABEL[app] };
  }
  return canFullscreen() ? { kind: "toggle" } : { kind: "none" };
}
