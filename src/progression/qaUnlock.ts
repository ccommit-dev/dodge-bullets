/**
 * 테스트 모드 해금 (2026-10-16, 사용자: "콘텐츠 해금, 스킬장착 해금은 테스트를 위해 모두 풀어줘, 단 테스트모드 해제시에는 해금이 다시 동작해야해").
 * 켜져 있으면 콘텐츠(성문 방어·대장간·연습실·이벤트·끝없는 성벽)와 스킬 장착 칸·원정 스킬/무기/칩 칸 잠금을 **읽을 때만** 연다.
 * 저장값(onboardingStep · towerOpen · 슬롯 레벨)은 건드리지 않으므로 끄는 즉시 원래 해금 규칙이 돌아온다.
 * 값은 App 이 progression/storage.qaUnlockAll() 로 정한다(QA 빌드만). import 없는 순수 모듈 — node 하니스에서는 늘 false 라 잠금을 그대로 본다.
 */
let open = false;
const listeners = new Set<() => void>();

export function qaUnlockOpen(): boolean {
  return open;
}

export function setQaUnlockOpen(next: boolean): void {
  if (open === next) return;
  open = next;
  listeners.forEach((l) => l());
}

/** React useSyncExternalStore 용 — 설정에서 끄고 켜면 사냥터 카드·스킬 칸이 다시 그려진다 */
export function subscribeQaUnlock(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
