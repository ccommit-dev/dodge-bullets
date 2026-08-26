import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { installErrorLog } from "./game/errlog";

// 렌더보다 먼저 — 부팅 중 오류도 잡히도록
installErrorLog();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
