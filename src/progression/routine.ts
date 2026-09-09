/**
 * 데일리 루틴 보드 (RETENTION_DESIGN A) — 허브 상단 5칸.
 *
 * 전부 기존 상태에서 파생한다: 새 저장 데이터는 "오늘 보상을 받았는가"(routineClaimedDate) 하나.
 * 칸을 탭하면 해당 화면으로 가므로 안내가 곧 내비게이션이다.
 */
import type { CharacterProgress } from "./model";
import { dailyMissionsDone, dateKey, riftAttemptsFor, type EventSave } from "../events/eventSave";

export type RoutineItem = {
  id: "claim" | "rift" | "mission" | "forge" | "expedition";
  label: string;
  detail: string;
  done: boolean;
  /** 탭 시 이동 — titans 탭 id 또는 콘텐츠 */
  go: { kind: "content"; content: "forge" } | { kind: "events"; tab: "rift" | "daily" } | { kind: "tab"; tab: "heroes" } | { kind: "claim" };
};

export const ROUTINE_REWARD_GEMS = 15;

/** 모험 메뉴 카드 한 줄 설명 — "균열·토벌·파견이 뭘 하는지 모르겠다"에 대한 답 */
export const ROUTINE_HELP: Record<RoutineItem["id"], string> = {
  claim: "방치로 쌓인 골드·경험치를 받는다",
  rift: "방치 2시간치 골드·EXP·강화석·조각을 즉시 정산 (하루 3회, 요일마다 보상 축이 다름)",
  mission: "오늘 보스·원정·강화·비트를 1회씩 → 골드·강화석, 4종 완주 시 보석 +10",
  forge: "대장간에서 검 강화 1회 성공 — 첫 성공은 경험치 2배",
  expedition: "동료를 보내 두면 시간이 지난 뒤 강화석·조각을 들고 돌아온다",
}; // K: 무과금 주 300 보석 경로 (10→15)

export function routineItems(progress: CharacterProgress, events: EventSave, now = Date.now()): RoutineItem[] {
  const today = dateKey();
  const claimedToday = new Date(progress.idleClaimedAt).toLocaleDateString("sv-SE") === today;
  const riftMax = riftAttemptsFor(progress.patronUntil, now);
  const riftLeft = Math.max(0, riftMax - events.riftAttempts);
  const missionsDone = dailyMissionsDone(events);
  const forgedToday = progress.firstClearDates.forge === today;
  const expeditionActive = progress.expeditions.some((e) => e.endsAt > now);
  return [
    { id: "claim", label: "정산", detail: claimedToday ? "오늘 수령" : "방치 보상 받기", done: claimedToday, go: { kind: "claim" } },
    { id: "rift", label: "균열", detail: riftLeft === 0 ? `${riftMax}/${riftMax} 완료` : `${riftMax - riftLeft}/${riftMax}`, done: riftLeft === 0, go: { kind: "events", tab: "rift" } },
    { id: "mission", label: "토벌", detail: missionsDone ? "모두 수령" : "미수령", done: missionsDone, go: { kind: "events", tab: "daily" } },
    { id: "forge", label: "강화", detail: forgedToday ? "오늘 성공" : "1회 성공", done: forgedToday, go: { kind: "content", content: "forge" } },
    { id: "expedition", label: "파견", detail: expeditionActive ? "진행 중" : "보내기", done: expeditionActive, go: { kind: "tab", tab: "heroes" } },
  ];
}

export function routineAllDone(items: RoutineItem[]): boolean {
  return items.every((i) => i.done);
}

export function routineRewardAvailable(progress: CharacterProgress, items: RoutineItem[]): boolean {
  return routineAllDone(items) && progress.routineClaimedDate !== dateKey();
}
