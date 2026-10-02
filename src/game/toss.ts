export type SafeInsets = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export type UserKeyResult = {
  hash: string;
  source: "sdk" | "mock";
};

import { isNativePlatform } from "./native";

const MOCK_HASH = "mock-local-dev";

/**
 * 토스 브리지 호출 보호 (2026-10-02) — Capacitor APK 에서는 토스 네이티브 브리지가 없어 getAnonymousKey ·
 * setDeviceOrientation · Storage.getItem 의 Promise 가 **실패도 완료도 하지 않았다**. 웹에서는 브리지 부재가 바로
 * 예외로 끝나 mock/localStorage 로 넘어갔지만, WebView 에서는 catch 가 영원히 안 돌아 "준비 중…" 에 멈췄다(실기기).
 *   · 네이티브(Capacitor)면 토스 SDK 를 아예 부르지 않는다 — 키는 mock, 저장은 Preferences, 방향은 매니페스트(portrait)
 *   · 그래도 부르는 경우엔 타임아웃을 둔다 — 응답이 없으면 fallback 으로 흐른다
 */
const BRIDGE_TIMEOUT_MS = 2_500;
export function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise<T>((resolve) => {
    const timer = window.setTimeout(() => resolve(fallback), ms);
    p.then((v) => { window.clearTimeout(timer); resolve(v); }, () => { window.clearTimeout(timer); resolve(fallback); });
  });
}
/** 네이티브 앱(안드로이드/iOS) — 토스 브리지를 건너뛴다 */
function skipTossBridge(): boolean {
  try { return isNativePlatform(); } catch { return false; }
}

function readCssSafeInsets(): SafeInsets {
  const probe = document.createElement("div");
  probe.style.cssText = [
    "position:fixed",
    "visibility:hidden",
    "pointer-events:none",
    "padding-top:env(safe-area-inset-top)",
    "padding-right:env(safe-area-inset-right)",
    "padding-bottom:env(safe-area-inset-bottom)",
    "padding-left:env(safe-area-inset-left)",
  ].join(";");
  document.body.appendChild(probe);
  const style = getComputedStyle(probe);
  const insets = {
    top: Number.parseFloat(style.paddingTop) || 0,
    right: Number.parseFloat(style.paddingRight) || 0,
    bottom: Number.parseFloat(style.paddingBottom) || 0,
    left: Number.parseFloat(style.paddingLeft) || 0,
  };
  document.body.removeChild(probe);
  return insets;
}

export function normalizeInsets(raw: Partial<SafeInsets> | null | undefined): SafeInsets {
  const css = readCssSafeInsets();
  return {
    top: Math.max(12, Number(raw?.top) || css.top || 0),
    right: Math.max(8, Number(raw?.right) || css.right || 0),
    bottom: Math.max(12, Number(raw?.bottom) || css.bottom || 0),
    left: Math.max(8, Number(raw?.left) || css.left || 0),
  };
}

/** 샌드박스/웹/토스앱 공통 — 실패 시 mock */
export async function resolveUserKey(): Promise<UserKeyResult> {
  if (skipTossBridge()) return { hash: MOCK_HASH, source: "mock" };
  try {
    const bridge = await import("@apps-in-toss/web-framework");

    // SDK 2.x 권장: getAnonymousKey
    if (typeof bridge.getAnonymousKey === "function") {
      const result = await withTimeout(bridge.getAnonymousKey(), BRIDGE_TIMEOUT_MS, null);
      if (result && typeof result === "object" && result.type === "HASH" && result.hash) {
        return { hash: result.hash, source: "sdk" };
      }
    }

    // 문서/구버전 호환: getUserKeyForGame
    if (typeof bridge.getUserKeyForGame === "function") {
      const result = await withTimeout(bridge.getUserKeyForGame(), BRIDGE_TIMEOUT_MS, null);
      if (result && typeof result === "object" && result.type === "HASH" && result.hash) {
        return { hash: result.hash, source: "sdk" };
      }
    }
  } catch {
    // 로컬 Vite / bridge 미존재
  }

  return { hash: MOCK_HASH, source: "mock" };
}

export async function readSafeInsets(): Promise<SafeInsets> {
  if (skipTossBridge()) return normalizeInsets(null);   // WebView 는 CSS env(safe-area-inset-*) 로 충분하다
  try {
    const { SafeAreaInsets } = await import("@apps-in-toss/web-framework");
    if (SafeAreaInsets?.get) {
      return normalizeInsets(SafeAreaInsets.get());
    }
  } catch {
    // ignore
  }
  return normalizeInsets(null);
}

export async function subscribeSafeInsets(
  onChange: (insets: SafeInsets) => void,
): Promise<() => void> {
  if (skipTossBridge()) return () => undefined;
  try {
    const { SafeAreaInsets } = await import("@apps-in-toss/web-framework");
    if (SafeAreaInsets?.subscribe) {
      return SafeAreaInsets.subscribe({
        onEvent: (insets) => onChange(normalizeInsets(insets)),
      });
    }
  } catch {
    // ignore
  }
  return () => undefined;
}

/** 출시 가이드: 세로 고정 + OS 뒤로가기 제스처 차단 */
export async function lockScreenForGame(): Promise<void> {
  if (skipTossBridge()) return;   // 안드로이드는 AndroidManifest 의 screenOrientation="portrait"
  try {
    const { setDeviceOrientation, setIosSwipeGestureEnabled } = await import(
      "@apps-in-toss/web-framework"
    );
    await withTimeout(Promise.all([
      setDeviceOrientation({ type: "portrait" }),
      setIosSwipeGestureEnabled({ isEnabled: false }),
    ]), BRIDGE_TIMEOUT_MS, null);
  } catch {
    // 로컬 웹에서는 무시
  }
}

export async function closeMiniApp(): Promise<void> {
  if (skipTossBridge()) return;   // 네이티브 종료는 native.exitAppNative 가 먼저 처리한다
  try {
    const { closeView } = await import("@apps-in-toss/web-framework");
    await closeView();
  } catch {
    console.info("[toss] closeView unavailable in local web");
  }
}

/**
 * Capacitor Preferences 로더 (1회 캐시).
 *
 * 네이티브(Android/iOS)에서는 WebView localStorage가 OS에 의해 삭제될 수 있어
 * (특히 iOS 저장공간 부족 시) 네이티브 키-값 저장소로 대체한다.
 * 웹·앱인토스에서는 null을 돌려 기존 경로를 그대로 탄다.
 */
type PreferencesLike = {
  get: (opts: { key: string }) => Promise<{ value: string | null }>;
  set: (opts: { key: string; value: string }) => Promise<void>;
};
let prefsPromise: Promise<PreferencesLike | null> | null = null;
function nativePrefs(): Promise<PreferencesLike | null> {
  if (!prefsPromise) {
    prefsPromise = (async () => {
      try {
        const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
        if (!cap?.isNativePlatform?.()) return null;
        const { Preferences } = await import("@capacitor/preferences");
        // 플러그인 프록시를 async 함수에서 그대로 돌려주면 Promise 가 .then 을 찾아 부르고, 프록시는 그것을
        // 네이티브 메서드 "Preferences.then()" 호출로 보내 거부한다 → nativePrefs 가 통째로 실패해 부팅이 멈췄다 (2026-10-02 실측).
        // thenable 이 아닌 평범한 객체로 감싼다
        return { get: (o) => Preferences.get(o), set: (o) => Preferences.set(o) };
      } catch {
        return null;
      }
    })();
  }
  return prefsPromise;
}

/**
 * 저장 우선순위: 앱인토스 Storage → Capacitor Preferences(네이티브) → localStorage(웹).
 * 세 환경 모두 이 두 함수만 지나므로 여기가 유일한 분기 지점이다.
 */
export async function storageGet(key: string): Promise<string | null> {
  return (await storageRead(key)).value;
}

/**
 * 읽기 + 그 값을 믿어도 되는가 (2026-10-02 리뷰). 토스 Storage 가 **응답하지 않으면**(타임아웃) 진짜 값을 모르는 채 로컬 사본을 돌려준다 —
 * reliable=false. 그 값으로 덮어쓰거나("새 유저"로 착각해 빈 진행도 저장) 지급 확인을 하면 안 된다.
 * 브리지 자체가 없어 바로 실패하는 웹은 정상 폴백이라 reliable=true.
 */
export async function storageRead(key: string): Promise<{ value: string | null; reliable: boolean }> {
  let reliable = true;
  if (!skipTossBridge()) {
    try {
      const { Storage } = await import("@apps-in-toss/web-framework");
      if (Storage?.getItem) {
        const TIMEOUT = { timeout: true } as const;
        // 응답이 없으면(브리지 없는 WebView) localStorage 로 — 영원히 기다리던 것이 부팅을 막았다
        const v = await withTimeout<{ x: string | null } | null | typeof TIMEOUT>(Storage.getItem(key).then((x) => ({ x }), () => null), BRIDGE_TIMEOUT_MS * 2, TIMEOUT);
        if (v === TIMEOUT) reliable = false;
        else if (v && "x" in v) return { value: v.x, reliable: true };
      }
    } catch {
      // fall through
    }
  }
  return { value: await storageGetLocal(key), reliable };
}

async function storageGetLocal(key: string): Promise<string | null> {
  const prefs = await nativePrefs().catch(() => null);
  if (prefs) {
    try {
      const { value } = await prefs.get({ key });
      if (value !== null) return value;
      // 1회 마이그레이션 — Preferences 도입 전 네이티브 빌드가 localStorage에
      // 남긴 데이터를 옮겨 온다. 이후 읽기는 Preferences에서 바로 적중한다.
      const legacy = localStorage.getItem(key);
      if (legacy !== null) await prefs.set({ key, value: legacy });
      return legacy;
    } catch {
      // fall through
    }
  }
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export async function storageSet(key: string, value: string): Promise<void> {
  if (!skipTossBridge()) {
    try {
      const { Storage } = await import("@apps-in-toss/web-framework");
      if (Storage?.setItem) {
        const done = await withTimeout(Storage.setItem(key, value).then(() => true), BRIDGE_TIMEOUT_MS * 2, false);
        if (done) return;
      }
    } catch {
      // fall through
    }
  }
  const prefs = await nativePrefs().catch(() => null);
  if (prefs) {
    try {
      await prefs.set({ key, value });
      return;
    } catch {
      // fall through
    }
  }
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}
