/**
 * 온보딩 순차 개방 (CRUMBLE_GAP §8) — 크럼블의 실패("초반 다수 콘텐츠 동시 개방
 * → 복잡성")에서 배운다. 신규 유저는 사냥터 하나로 시작해 서사 순서대로 연다.
 *
 *   0 사냥터만 → 1 성문 방어(Stage 5 벽) → 2 대장간(첫 개척 = 골드 소비처)
 *   → 3 연습실(Stage 10 = 효율 R) → 4 전부 (첫 방치 정산 = 이벤트·보석 상점)
 *
 * 기존 유저는 마이그레이션(model.ts)에서 4로 소급 — 신규에게만 적용된다.
 * step은 단조 증가라 조건을 다시 잃어도 잠기지 않는다.
 */
import type { CharacterProgress } from "./model";

export type OnboardContent = "dodge" | "forge" | "beat" | "events";

export const CONTENT_UNLOCK_STEP: Record<OnboardContent, number> = {
  dodge: 1,
  forge: 2,
  beat: 3,
  events: 4,
};

export function contentUnlocked(step: number, content: OnboardContent): boolean {
  return step >= CONTENT_UNLOCK_STEP[content];
}

/** 잠긴 탭을 눌렀을 때의 안내 — "무엇을 하면 열리는지"가 핵심 */
export const LOCK_HINT: Record<OnboardContent, string> = {
  dodge: "사냥터 Stage 5에 도달하면 개척로가 열립니다",
  forge: "성문 방어로 첫 지역을 개척하면 대장간이 열립니다",
  beat: "사냥터 Stage 10에 도달하면 연습실이 열립니다",
  events: "첫 방치 보상을 정산하면 이벤트와 보석 상점이 열립니다",
};

/**
 * 잠금 조건과 진행도 (2026-10-14, 사용자: "모험 콘텐츠 언제 해금되는지 불친절") — 카드·말풍선·토스트가 모두 이 한 곳을 읽는다.
 * 순차 개방이라 앞 단계가 막혀 있으면 그 조건을 먼저 보여 준다(예: 비트는 Stage 10 이지만 대장간 개방이 먼저).
 */
export type UnlockInfo = { done: boolean; label: string; now: number; goal: number; unit: string; hint: string };
export function unlockInfo(content: OnboardContent | "tower", p: Pick<CharacterProgress, "onboardingStep" | "titanBestStage" | "pioneeredArea" | "towerOpen" | "dodgeBestStage">): UnlockInfo {
  if (content === "tower") {
    const goal = 10;
    return { done: p.towerOpen, label: `성문 방어 S${goal} 클리어`, now: Math.min(goal, p.dodgeBestStage), goal, unit: "S", hint: `성문 방어 1장 대장(S${goal})을 깨면 끝없는 성벽이 열립니다 · 지금 S${p.dodgeBestStage}` };
  }
  const step = p.onboardingStep;
  if (contentUnlocked(step, content)) return { done: true, label: "열림", now: 1, goal: 1, unit: "", hint: "" };
  // 이 콘텐츠의 최종 조건 — 앞 단계가 막혀 있으면 "먼저 …" 를 덧붙인다
  const NAME: Record<OnboardContent, string> = { dodge: "성문 방어", forge: "대장간", beat: "비트 수련", events: "균열·이벤트" };
  const FINAL: Record<OnboardContent, string> = { dodge: "사냥터 Stage 5", forge: "성문 방어로 첫 지역 개척", beat: "사냥터 Stage 10", events: "첫 방치 보상 정산" };
  const need = CONTENT_UNLOCK_STEP[content];
  const first = (lbl: string) => (step + 1 < need ? `먼저 ${lbl} → ${FINAL[content]}` : lbl);
  const tail = ` — ${NAME[content]}은(는) ${FINAL[content]} 때 열립니다`;
  // 막힌 첫 단계부터 안내
  if (step < 1) return { done: false, label: first("사냥터 Stage 5"), now: Math.min(5, p.titanBestStage), goal: 5, unit: "Stage", hint: `지금 사냥터 Stage ${p.titanBestStage} / 5${tail}` };
  if (step < 2) return { done: false, label: first("첫 지역 개척"), now: Math.min(10, p.dodgeBestStage), goal: 10, unit: "S", hint: `성문 방어 1장 대장(S10)을 깨면 첫 지역이 개척됩니다 · 지금 S${p.dodgeBestStage}${tail}` };
  if (step < 3) return { done: false, label: first("사냥터 Stage 10"), now: Math.min(10, p.titanBestStage), goal: 10, unit: "Stage", hint: `지금 사냥터 Stage ${p.titanBestStage} / 10${tail}` };
  return { done: false, label: "첫 방치 보상 정산", now: 0, goal: 1, unit: "", hint: `사냥터 방치 보상을 한 번 받으면 열립니다${tail}` };
}

/** 개방 연출 배너 문구 (step → 방금 열린 콘텐츠) */
export const UNLOCK_BANNER: Record<number, { title: string; desc: string }> = {
  1: { title: "성문 방어 개방", desc: "개척로가 열렸습니다 — 원정을 클리어하면 새 사냥터가 열립니다" },
  2: { title: "대장간 개방", desc: "쌓인 골드로 북을 벼리세요 — 강화가 방치 배율(M)을 올립니다" },
  3: { title: "연습실 개방", desc: "비트 수련이 방치 효율(R)을 올립니다" },
  4: { title: "모든 콘텐츠 개방", desc: "이벤트와 보석 상점이 열렸습니다 — 모험가의 하루가 완성됐습니다" },
};

/**
 * 진행도에서 도달 가능한 온보딩 단계 (1~3) — 4는 "첫 방치 정산" 행위로만 오른다.
 * 순서를 건너뛰지 않는다: Stage 10이어도 개척 전이면 2에서 멈춘다.
 */
export function onboardingTargetStep(progress: CharacterProgress): number {
  let target = progress.onboardingStep;
  if (target < 1 && progress.titanBestStage >= 5) target = 1;
  if (target === 1 && progress.pioneeredArea >= 2) target = 2;
  if (target === 2 && progress.titanBestStage >= 10) target = 3;
  return target;
}
