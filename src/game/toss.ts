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

const MOCK_HASH = "mock-local-dev";

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
  try {
    const bridge = await import("@apps-in-toss/web-framework");

    // SDK 2.x 권장: getAnonymousKey
    if (typeof bridge.getAnonymousKey === "function") {
      const result = await bridge.getAnonymousKey();
      if (result && typeof result === "object" && result.type === "HASH" && result.hash) {
        return { hash: result.hash, source: "sdk" };
      }
    }

    // 문서/구버전 호환: getUserKeyForGame
    if (typeof bridge.getUserKeyForGame === "function") {
      const result = await bridge.getUserKeyForGame();
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
  try {
    const { setDeviceOrientation, setIosSwipeGestureEnabled } = await import(
      "@apps-in-toss/web-framework"
    );
    await Promise.all([
      setDeviceOrientation({ type: "portrait" }),
      setIosSwipeGestureEnabled({ isEnabled: false }),
    ]);
  } catch {
    // 로컬 웹에서는 무시
  }
}

export async function closeMiniApp(): Promise<void> {
  try {
    const { closeView } = await import("@apps-in-toss/web-framework");
    await closeView();
  } catch {
    console.info("[toss] closeView unavailable in local web");
  }
}

export async function storageGet(key: string): Promise<string | null> {
  try {
    const { Storage } = await import("@apps-in-toss/web-framework");
    if (Storage?.getItem) {
      return await Storage.getItem(key);
    }
  } catch {
    // fall through
  }
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export async function storageSet(key: string, value: string): Promise<void> {
  try {
    const { Storage } = await import("@apps-in-toss/web-framework");
    if (Storage?.setItem) {
      await Storage.setItem(key, value);
      return;
    }
  } catch {
    // fall through
  }
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}
