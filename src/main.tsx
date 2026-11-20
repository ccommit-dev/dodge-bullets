import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { installErrorLog } from "./game/errlog";
import { installTapHaptics } from "./ui/haptics";
import { installUiSfx } from "./ui/sfx";
import { installWebFrame } from "./ui/webFrame";
import { applyArtStyleClass } from "./ui/artStyle";
import { bootGuard } from "./ui/perfGovernor";
import { onlineUrl } from "./online/config";

// 렌더보다 먼저 — 부팅 중 오류도 잡히도록
installErrorLog();
// 버튼 손맛 — 모든 버튼의 pointerdown 에 짧은 진동 (안드로이드)
installTapHaptics();
installUiSfx();
// PC 웹이면 폰 폭 기둥으로 — 첫 렌더 전에 클래스를 달아야 캔버스 · 레이아웃이 처음부터 맞는다
installWebFrame();

applyArtStyleClass();   // 그림체(셀 · 도트) — 첫 그리기 전에 html.art-pixel (ui/artStyle)
bootGuard();   // 앞 실행이 켜자마자 죽었으면 이번엔 낮은 단계에서 시작 (ui/perfGovernor ③)
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
// 온라인(접속자 · 채팅 · 랭킹, src/online) — 서버 주소가 있을 때만 받아 띄운다(사이트 빌드만 · 개발은 localStorage 덮어쓰기). 없으면 받지도 않는다
const online = onlineUrl();
if (online) void import("./online/mount").then((m) => m.mountOnline(online)).catch(() => undefined);
