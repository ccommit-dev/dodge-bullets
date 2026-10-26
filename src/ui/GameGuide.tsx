import { assetUrl } from "../asset";

/**
 * 첫 접속 게임 가이드 (2026-10-26, 사용자: "맨 처음 어떤 게임인지 가이드가 필요할 듯 — 맨 처음 접속 시에만 어떻게 진행하는지 가이드 alert").
 * 정말 처음 온 사람(첫 세션 · 온보딩 진행 중)에게만 뜬다 — 이미 해 본 사람은 업데이트 뒤에도 뜨지 않고 조용히 "본 것"으로 남긴다(isNewPlayer).
 * 한 번 닫으면 다시 뜨지 않는다(GUIDE_KEY). 설정 메뉴 "게임 가이드"로 언제든 다시 연다.
 */
export const GUIDE_KEY = "dodgebullets:guide-seen:v1";

export function guideSeen(): boolean {
  try { return localStorage.getItem(GUIDE_KEY) === "1"; } catch { return true; }
}

/** 첫 접속 — 사냥터 세션이 1번 이하이고 온보딩(첫 5분 대본)을 아직 끝내지 않았다 */
export function isNewPlayer(progress: { sessionCount: number; onboardingStep: number }): boolean {
  return progress.sessionCount <= 1 && progress.onboardingStep < 4;
}

export function markGuideSeen(): void {
  try { localStorage.setItem(GUIDE_KEY, "1"); } catch { /* 저장 불가 환경 — 이번 세션만 닫힌다 */ }
}

const STEPS: { icon: string; title: string; text: string }[] = [
  { icon: "ui/content-icons/ui-pointer.png", title: "자동 사냥", text: "원정대가 알아서 싸워요 · 화면을 누르면 추가 피해" },
  { icon: "ui/attendance/gold.png", title: "골드로 성장", text: "장비 성장 · 퀘스트 · 스킬 · 유물을 올려요" },
  { icon: "ui/idle/tower.png", title: "대장 잡고 다음 층", text: "10마리 뒤 대장 도전 · 막히면 성장하고 다시" },
  { icon: "ui/idle/expedition.png", title: "모험 · 방치", text: "성문 방어 · 비트 · 대장간 · 꺼 둬도 보상이 쌓여요" },
];

export function GameGuide({ onClose }: { onClose: () => void }) {
  return (
    <div className="game-guide-modal" role="dialog" aria-modal="true" aria-label="게임 가이드">
      <div className="game-guide-card">
        <small className="game-guide-kicker">처음 오셨나요?</small>
        <b className="game-guide-title">비버 키우기 진행법</b>
        <ol className="game-guide-steps">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <span className="game-guide-num">{i + 1}</span>
              <img src={assetUrl(s.icon)} alt="" aria-hidden="true" onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = "hidden"; }} />
              <span className="game-guide-text"><strong>{s.title}</strong><small>{s.text}</small></span>
            </li>
          ))}
        </ol>
        <button type="button" className="cta game-guide-start" onClick={() => { markGuideSeen(); onClose(); }}>시작하기</button>
      </div>
    </div>
  );
}
