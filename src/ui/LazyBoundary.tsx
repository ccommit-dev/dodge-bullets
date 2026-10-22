import { Component, type ReactNode } from "react";

/**
 * 따로 불러오는 화면(마이페이지 · 비트 · 대장간 · 이벤트) 의 오류 울타리 (2026-10-22, 사용자 오류 로그:
 * 아이폰 카카오톡에서 "TypeError: Importing a module script failed." ×3).
 * 쪽(chunk) 을 못 불러오면 chunkReload 가 한 번 새로고침하지만, 30초 안에 또 실패하면 오류가 React 까지 올라와
 * 앱 전체가 빈 화면이 됐다. 이제 그 화면 자리에만 "다시 시도 · 사냥터로" 판을 띄운다.
 */
type Props = { children: ReactNode; onBack: () => void; label?: string };
type State = { failed: boolean };

export class LazyBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="lazy-failed" role="alert">
        <b>{this.props.label ?? "화면"}을 불러오지 못했어요</b>
        <small>인터넷이 잠깐 끊겼거나 새 버전이 올라왔어요. 다시 시도하면 대부분 바로 열립니다.</small>
        <div>
          <button type="button" className="lazy-retry" onClick={() => window.location.reload()}>다시 시도</button>
          <button type="button" className="lazy-back" onClick={() => { this.setState({ failed: false }); this.props.onBack(); }}>사냥터로</button>
        </div>
      </div>
    );
  }
}
