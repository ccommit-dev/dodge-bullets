/**
 * 사냥터 스킬 칸 위치 (2026-11-04, 사용자: "스킬아이콘 캐릭터 가까이" · 그 전: "엄지에서 멀다") — 둘이 서로 반대라 기본은 주인공 곁, 설정에서 왼쪽으로.
 * 기기에만 저장한다(게임 진행과 무관한 손 편의).
 */
const KEY = "dodge-bullets:skillDockLeft";
export const SKILL_DOCK_EVENT = "dodge-skill-dock-pref";

export function skillDockLeft(): boolean {
  try { return localStorage.getItem(KEY) === "1"; } catch { return false; }
}

export function setSkillDockLeft(left: boolean): void {
  try { localStorage.setItem(KEY, left ? "1" : "0"); } catch { /* 저장이 막혀도 이번 실행에는 적용한다 */ }
  window.dispatchEvent(new CustomEvent(SKILL_DOCK_EVENT, { detail: left }));
}
