/**
 * PC 웹 세로 기둥 (2026-10-20, 사용자: "모바일은 해상도가 잘맞는데 웹에서 UI나 위치가 어색해 — 웹에서도 잘 동작하게, 모바일에선 동일").
 * 마우스가 있는 넓은 화면(PC 브라우저)이면 <html class="web-frame"> 을 달아 앱을 폰 폭(WEB_FRAME_W) 기둥으로 가운데 세운다.
 * 예전엔 화면 폭을 그대로 써 패널은 720px 로 늘어나고 캔버스(성문 방어 · 비트)는 1440px 로 퍼져 캐릭터 · 글자가 작게 흩어졌다.
 * - CSS: index.css 의 .web-frame 규칙(기둥 · 바깥 배경) + vite.config 의 webFrameCss(폭 @media 를 기둥 폭 기준으로 옮기고 vw 를 기둥 폭으로)
 * - JS: 화면 폭이 필요한 곳(캔버스 크기 등)은 window.innerWidth 대신 appWidth()
 * 터치 기기(폰 · 태블릿 · 앱)는 조건이 안 맞아 예전과 똑같다.
 */
export const WEB_FRAME_W = 460;
export const WEB_FRAME_QUERY = "(hover: hover) and (pointer: fine) and (min-width: 560px)";

export function isWebFrame(): boolean {
  return typeof document !== "undefined" && document.documentElement.classList.contains("web-frame");
}

/** 앱이 쓰는 화면 폭 — PC 기둥이면 기둥 폭, 아니면 창 폭 */
export function appWidth(): number {
  if (typeof window === "undefined") return WEB_FRAME_W;
  return isWebFrame() ? Math.min(window.innerWidth, WEB_FRAME_W) : window.innerWidth;
}

/** 렌더 전에 한 번 — 창 크기가 바뀌어 조건이 바뀌면 클래스를 다시 달고 resize 를 한 번 더 보내 캔버스가 다시 맞춘다 */
export function installWebFrame(): void {
  if (typeof window === "undefined" || !window.matchMedia) return;
  const mq = window.matchMedia(WEB_FRAME_QUERY);
  const apply = () => {
    const was = isWebFrame();
    document.documentElement.classList.toggle("web-frame", mq.matches);
    if (was !== mq.matches) window.dispatchEvent(new Event("resize"));
  };
  apply();
  mq.addEventListener?.("change", apply);
}
