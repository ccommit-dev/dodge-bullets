import type { Arrow } from "./types";

/**
 * 보스 탄막 패턴 (계획안 §22) — 보스 화살을 벨 때 튀어나오는 파편의 구성을 티어별로 고정한다.
 * 이전에는 종류가 랜덤이라 학습할 수 없었다. 이제 1스테이지 보스는 늘 A, 2스테이지는 B … 성벽(5티어+)은 E 로,
 * 플레이어가 "이 보스는 이렇게 온다"를 외울 수 있다. 수치는 dodge-sim 봇 게이트(1·2스테이지 5/5, 4스테이지 1~4/5)를 지킨다.
 */
export type BossPattern = {
  id: "A" | "B" | "C" | "D" | "E";
  name: string;
  /** 준비 화면·HUD 안내 */
  hint: string;
  kinds: Arrow["kind"][];
  count: number;
  /** 파편 사이 각도(도). 0이면 한 줄 */
  spreadDeg: number;
  speedMul: number;
  warningMs: number;
};

export const BOSS_PATTERNS: BossPattern[] = [
  { id: "A", name: "직선 조준", hint: "한 발이 곧게 온다 — 옆으로 한 걸음, 정면이면 베기", kinds: ["normal"], count: 1, spreadDeg: 0, speedMul: 1, warningMs: 560 },
  { id: "B", name: "부채 탄막", hint: "두 발이 좌우로 갈라진다 — 사이로 들어가라", kinds: ["fan", "fan"], count: 2, spreadDeg: 28, speedMul: 0.88, warningMs: 640 },
  { id: "C", name: "추적탄", hint: "따라오는 화살 + 직선 한 발 — 추적탄은 정면에서 베어라", kinds: ["homing", "normal"], count: 2, spreadDeg: 16, speedMul: 1, warningMs: 540 },
  { id: "D", name: "도탄 벽", hint: "벽에 튕기는 두 발 — 발판 위로 올라가면 벽 각도가 빗나간다", kinds: ["ricochet", "ricochet"], count: 2, spreadDeg: 32, speedMul: 1.04, warningMs: 520 },
  { id: "E", name: "복합 탄막", hint: "추적 + 도탄 + 부채 — 예고 색을 보고 순서대로 처리", kinds: ["homing", "ricochet", "fan"], count: 3, spreadDeg: 24, speedMul: 1.06, warningMs: 500 },
];

/** 티어(스테이지 번호, 성벽은 5+) → 패턴. 표를 넘으면 마지막(E) */
export function bossPatternFor(tier: number): BossPattern {
  return BOSS_PATTERNS[Math.min(BOSS_PATTERNS.length - 1, Math.max(0, Math.floor(tier) - 1))];
}
