/**
 * 온라인 판 띄우기 (2026-11-20) — 게임과 따로 뜨는 React 루트. main.tsx 가 서버 주소가 있을 때만 지연 로딩한다(없으면 이 파일 · CSS 를 받지도 않는다).
 */
import { createRoot } from "react-dom/client";
import { createOnline } from "./client";
import { OnlineDock } from "./OnlineDock";
import "./online.css";

export function mountOnline(base: string): void {
  if (document.getElementById("online-root")) return;
  const host = document.createElement("div");
  host.id = "online-root";
  document.body.appendChild(host);
  const online = createOnline(base);
  createRoot(host).render(<OnlineDock online={online} />);
}
