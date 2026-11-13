/**
 * 해금 계단 (2026-11-13, 사용자 목표 "해금 계단 늘리기 — 한 번에 새 시스템 하나만") — **사냥터가 중심 루프**다.
 * 사냥터 최고 층(CharacterProgress.titanBestStage — 환생해도 줄지 않는다)이 오를 때마다 시스템이 **하나씩** 열린다.
 * 모든 진입점(아래 메뉴 · 성장 탭 · 모험 카드 · 이벤트 · 알림)이 이 표 하나를 읽는다 — 표에 없는 진입점은 새어 나간다(verify-ladder 가 잰다).
 * 각 칸의 gives 는 "사냥터에 무엇을 더해 주나" — 모험 카드 · 열림 안내 · 다음 목표 한 줄이 같은 문구를 쓴다(중심 루프 연결, 목표 1번).
 * 테스트 모드(qaUnlockOpen)는 전부 연다. 저장값은 바꾸지 않는다 — 읽을 때만 판정한다.
 * 예전 온보딩(onboarding.ts 의 4단계: 성문 방어 · 대장간 · 비트 · 이벤트)은 그대로 두고 이 계단과 **둘 다** 만족해야 열린다(대장간은 첫 지역 개척이 여전히 필요).
 */
import { qaUnlockOpen } from "./qaUnlock";

export type LadderId =
  | "quest" | "allies" | "skills" | "dodge" | "urgent" | "promotion" | "beat" | "forge"
  | "relic" | "events" | "rift" | "tower" | "expedition";

export type LadderStep = {
  id: LadderId;
  /** 사냥터 최고 층이 이 값 이상이면 열린다 */
  stage: number;
  /** 화면에 쓰는 이름 */
  name: string;
  /** 사냥터에 더해 주는 것 — "얻는 것: …" */
  gives: string;
};

/** 위에서 아래로 한 칸씩 — 같은 층에 둘이 열리지 않는다(verify-ladder) */
export const LADDER: readonly LadderStep[] = [
  { id: "quest", stage: 2, name: "퀘스트", gives: "시간마다 골드" },
  { id: "allies", stage: 3, name: "동료", gives: "함께 싸우는 동료 · 사냥 속도" },
  { id: "skills", stage: 4, name: "스킬", gives: "사냥터 스킬 · 대장 처치" },
  { id: "dodge", stage: 5, name: "성문 방어", gives: "강화석 · 새 지역(사냥터 층 상한)" },
  { id: "urgent", stage: 7, name: "긴급 의뢰", gives: "현상범 처치 골드 · 강화석" },
  { id: "promotion", stage: 8, name: "승급전", gives: "주인공 공격력 영구 상승" },
  { id: "beat", stage: 10, name: "비트 수련", gives: "SP(스킬 포인트) · 골드" },
  { id: "forge", stage: 12, name: "대장간", gives: "무기 강화(사냥터 공격력)" },
  { id: "relic", stage: 14, name: "유물", gives: "사냥터 능력치 영구 상승" },
  { id: "events", stage: 16, name: "이벤트 · 상점", gives: "일일 보상 · 보석" },
  { id: "rift", stage: 18, name: "균열", gives: "방치 보상 즉시 정산" },
  { id: "tower", stage: 22, name: "끝없는 성벽", gives: "동료 조각 · 방치 배율" },
  { id: "expedition", stage: 25, name: "파견", gives: "자는 동안 강화석 · 조각" },
];

const BY_ID = new Map(LADDER.map((s) => [s.id, s]));

export function ladderStep(id: LadderId): LadderStep {
  return BY_ID.get(id) as LadderStep;
}

/** 열렸나 — 테스트 모드는 전부 열림 */
export function ladderOpen(id: LadderId, huntBest: number): boolean {
  return qaUnlockOpen() || huntBest >= ladderStep(id).stage;
}

/** 지금 열린 칸 수(0~LADDER.length) — 테스트 모드와 무관한 실제 진행 */
export function ladderCount(huntBest: number): number {
  return LADDER.filter((s) => huntBest >= s.stage).length;
}

/** 다음에 열릴 칸 — 다 열렸으면 null */
export function nextLadder(huntBest: number): LadderStep | null {
  return LADDER.find((s) => huntBest < s.stage) ?? null;
}

/** 잠긴 진입점을 눌렀을 때 — "무엇을 하면 열리는지" 한 줄 */
export function ladderLockHint(id: LadderId): string {
  const s = ladderStep(id);
  return `${s.name} — 사냥터 STAGE ${s.stage}에서 열림 · 얻는 것: ${s.gives}`;
}
