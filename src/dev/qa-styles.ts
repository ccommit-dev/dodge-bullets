/**
 * QA 패널 스타일 — 런타임 주입.
 *
 * idle.css에 두면 CSS는 DEV 플래그로 트리셰이킹되지 않아 프로덕션 번들에
 * 그대로 남는다(측정: 9개 규칙). 문자열로 들고 있다가 패널이 마운트될 때만
 * <style>로 붙여 프로덕션 흔적을 0으로 만든다.
 */
export const QA_STYLES = String.raw`
/* ─────────────────────────────  개발 전용 QA 패널 (?qa=1)  ───────────────────────────── */

.qa-panel {
  position: fixed;
  right: 8px;
  bottom: 8px;
  z-index: 120;
  width: min(260px, calc(100vw - 16px));
  border: 1px solid rgba(94, 234, 212, 0.4);
  border-radius: 12px;
  background: rgba(6, 12, 22, 0.95);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.6);
  font-size: 11px;
}
.qa-panel.collapsed { width: auto; }
.qa-toggle {
  width: 100%;
  padding: 8px 10px;
  border: none;
  border-radius: 12px;
  background: transparent;
  color: #5eead4;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-align: left;
  cursor: pointer;
}
.qa-body {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 0 9px 10px;
}
.qa-note { margin: 0 0 2px; color: #64748b; font-size: 10px; line-height: 1.45; }
.qa-group {
  margin-top: 4px;
  color: #94a3b8;
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.08em;
}
.qa-row { display: flex; flex-wrap: wrap; gap: 4px; }
.qa-row button {
  flex: 1 1 auto;
  min-height: 30px;
  padding: 6px 8px;
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.9);
  color: #cbd5f5;
  font-size: 10.5px;
  cursor: pointer;
}
.qa-row button:hover { border-color: #5eead4; color: #5eead4; }
.qa-area-pick { align-items: center; }
.qa-area-pick span { color: #64748b; font-size: 10px; }
.qa-area-pick button { flex: 0 0 26px; min-height: 26px; padding: 0; }
.qa-area-pick button.on { background: rgba(94, 234, 212, 0.18); color: #5eead4; }
.qa-danger { border-color: rgba(251, 113, 133, 0.45) !important; color: #fda4af !important; }

/*
 * 프리뷰는 게임 자체 오버레이(z-index 60~80) 위에 올린다.
 * '.exit-modal'이 position:absolute라 컨테이닝 블록이 필요하다 — relative + 높이 0으로
 * 두면 모달이 화면 밖 0px 박스에 붙는다. 뷰포트 전체를 덮는 fixed로 잡아야 한다.
 */
.qa-preview {
  position: fixed;
  inset: 0;
  z-index: 110;
  pointer-events: none;
}
.qa-preview > * {
  pointer-events: auto;
}
`;
