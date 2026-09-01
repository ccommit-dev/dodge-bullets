/**
 * 온보딩 순차 개방 (CRUMBLE_GAP §8) — 크럼블의 실패("초반 다수 콘텐츠 동시 개방
 * → 복잡성")에서 배운다. 신규 유저는 사냥터 하나로 시작해 서사 순서대로 연다.
 *
 *   0 사냥터만 → 1 화살 원정(Stage 5 벽) → 2 대장간(첫 개척 = 골드 소비처)
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
  forge: "화살 원정으로 첫 지역을 개척하면 대장간이 열립니다",
  beat: "사냥터 Stage 10에 도달하면 연습실이 열립니다",
  events: "첫 방치 보상을 정산하면 이벤트와 보석 상점이 열립니다",
};

/** 개방 연출 배너 문구 (step → 방금 열린 콘텐츠) */
export const UNLOCK_BANNER: Record<number, { title: string; desc: string }> = {
  1: { title: "화살 원정 개방", desc: "개척로가 열렸습니다 — 원정을 클리어하면 새 사냥터가 열립니다" },
  2: { title: "대장간 개방", desc: "쌓인 골드로 검을 벼리세요 — 강화가 방치 배율(M)을 올립니다" },
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
