/**
 * 지워진 쪽(chunk) 자동 복구 (2026-10-21, 사용자: "마이페이지 동작을 안하네").
 * 페이지(GitHub Pages)는 배포마다 쪽 이름이 바뀌고 옛 쪽을 지운다(--emptyOutDir). 카카오톡 인앱 브라우저처럼 페이지를 오래 살려 두는 곳에서
 * 새 배포 뒤 마이페이지 · 비트 · 대장간 · 이벤트를 처음 열면 옛 index 가 지운 쪽을 불러 404 → 앱 전체가 빈 화면이 됐다(_probe-stale-chunk.mjs 재현).
 * 실패하면 한 번 새로고침해 새 index 를 받는다. 같은 쪽으로 30초 안에 또 실패하면 고리를 끊고 오류를 그대로 던진다.
 */
const KEY = "dodgebullets:chunk-reload-at";

function reloadOnce(): boolean {
  try {
    const last = Number(sessionStorage.getItem(KEY) ?? 0);
    if (Date.now() - last < 30_000) return false;
    sessionStorage.setItem(KEY, String(Date.now()));
  } catch { /* 저장소가 막혀 있으면 한 번만 시도 — 아래 reload 로 끝 */ }
  window.location.reload();
  return true;
}

/** lazy(() => withChunkReload(() => import("./X"))) — 실패하면 새로고침하는 동안 끝나지 않는 약속을 돌려 빈 화면 대신 로딩 화면(Suspense)을 둔다 */
export function withChunkReload<T>(load: () => Promise<T>): Promise<T> {
  return load().catch((error: unknown) => {
    if (typeof window !== "undefined" && reloadOnce()) return new Promise<T>(() => {});
    throw error;
  });
}

/** Vite 의 미리 불러오기(modulepreload) 실패도 같은 방식으로 */
export function installChunkReload(): void {
  if (typeof window === "undefined") return;
  window.addEventListener("vite:preloadError", (event) => {
    if (reloadOnce()) event.preventDefault();
  });
}
