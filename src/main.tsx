import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { installErrorLog } from "./game/errlog";
import { installTapHaptics } from "./ui/haptics";
import { installUiSfx } from "./ui/sfx";
import { installWebFrame } from "./ui/webFrame";
import { applyArtStyleClass } from "./ui/artStyle";

// 렌더보다 먼저 — 부팅 중 오류도 잡히도록
installErrorLog();
// 버튼 손맛 — 모든 버튼의 pointerdown 에 짧은 진동 (안드로이드)
installTapHaptics();
installUiSfx();
// PC 웹이면 폰 폭 기둥으로 — 첫 렌더 전에 클래스를 달아야 캔버스 · 레이아웃이 처음부터 맞는다
installWebFrame();

applyArtStyleClass();   // 그림체(셀 · 도트) — 첫 그리기 전에 html.art-pixel (ui/artStyle)
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
