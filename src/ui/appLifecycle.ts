/**
 * 앱 백그라운드 전환 (2026-10-02) — 웹은 visibilitychange 하나로 충분하지만, Capacitor(안드로이드)는 액티비티가
 * 멈출 때 document 에 "pause"/"resume" 이벤트를 따로 쏜다 (MockCordovaWebViewImpl.handlePause). WebView.onPause 가
 * visibilitychange 도 대개 일으키지만 기기·WebView 버전마다 보장이 없어, 둘 다 듣고 **상태가 바뀔 때만** 한 번 부른다.
 * 그래야 BGM 시작·AudioContext resume 이 두 번 돌지 않는다.
 */
export function subscribeAppVisibility(onChange: (hidden: boolean) => void): () => void {
  if (typeof document === "undefined") return () => undefined;
  let last = document.visibilityState === "hidden";
  const emit = (hidden: boolean) => {
    if (hidden === last) return;
    last = hidden;
    onChange(hidden);
  };
  const onVis = () => emit(document.visibilityState === "hidden");
  const onPause = () => emit(true);
  const onResume = () => emit(document.visibilityState === "hidden");
  document.addEventListener("visibilitychange", onVis);
  document.addEventListener("pause", onPause);
  document.addEventListener("resume", onResume);
  return () => {
    document.removeEventListener("visibilitychange", onVis);
    document.removeEventListener("pause", onPause);
    document.removeEventListener("resume", onResume);
  };
}
