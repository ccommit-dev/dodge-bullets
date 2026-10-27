/**
 * 동료 뽑기 레벨 (2026-10-27, 사용자: "동료를 스테이지별이 아니라 동뽑 레벨이 있어서 레벨별 SSR 확률을 높이게 · SSR 도 초반에 희박하게").
 *
 * 누적 뽑기 수(CharacterProgress.gachaPulls)로 레벨 1~10. 등급 확률은 층이 아니라 이 레벨이 정한다.
 *   Lv1 전설(SSR) 2% · 신화 0.3% · 초월 0.02% — 처음엔 희박하고, 뽑을수록 오른다(Lv10 전설 13.5% · 신화 4% · 초월 1.3%).
 * 뽑기 풀(누가 나오나)은 여전히 개척 지역 안 — 지역에 없는 등급의 확률은 있는 등급에 비례해 나눈다(titans/gacha.ts).
 */
import type { Tier } from "./allyRoster";

export const TIERS: readonly Tier[] = ["N", "R", "SR", "SSR", "UR", "LR"];

/** 레벨 n 이 되는 누적 뽑기 수 (index 0 = Lv1) */
export const SUMMON_LEVEL_PULLS = [0, 10, 30, 60, 100, 150, 220, 300, 400, 520] as const;
export const SUMMON_MAX_LEVEL = SUMMON_LEVEL_PULLS.length;

/** 레벨별 등급 확률(%) — 각 줄 합 100 */
const RATE_PCT: readonly (readonly [number, number, number, number, number, number])[] = [
  [50, 35, 12.68, 2, 0.3, 0.02],
  [47, 36, 13.8, 2.7, 0.45, 0.05],
  [44, 36, 15.5, 3.6, 0.8, 0.1],
  [40, 37, 17, 4.8, 1, 0.2],
  [36, 37, 19, 6, 1.7, 0.3],
  [32, 37, 21, 7.4, 2.2, 0.4],
  [28, 37, 23, 8.8, 2.6, 0.6],
  [25, 36, 25, 10, 3.2, 0.8],
  [22, 35, 27, 11.6, 3.4, 1],
  [20, 33, 28, 13.5, 4.2, 1.3],
];

export function summonLevel(pulls: number): number {
  let lv = 1;
  for (let i = 0; i < SUMMON_LEVEL_PULLS.length; i += 1) if (pulls >= SUMMON_LEVEL_PULLS[i]) lv = i + 1;
  return lv;
}

/** 다음 레벨까지 — 최대 레벨이면 null */
export function summonLevelProgress(pulls: number): { level: number; from: number; to: number | null } {
  const level = summonLevel(pulls);
  return { level, from: SUMMON_LEVEL_PULLS[level - 1], to: level < SUMMON_MAX_LEVEL ? SUMMON_LEVEL_PULLS[level] : null };
}

/** 레벨의 등급 확률(0~1) */
export function tierRates(level: number): Record<Tier, number> {
  const row = RATE_PCT[Math.max(1, Math.min(SUMMON_MAX_LEVEL, Math.floor(level))) - 1];
  const sum = row.reduce((a, b) => a + b, 0);
  return Object.fromEntries(TIERS.map((t, i) => [t, row[i] / sum])) as Record<Tier, number>;
}

export const TIER_LABEL: Record<Tier, string> = { N: "일반", R: "희귀", SR: "영웅", SSR: "전설", UR: "신화", LR: "초월" };
export const TIER_COLOR: Record<Tier, string> = { N: "#cbd5e1", R: "#7dd3fc", SR: "#c4b5fd", SSR: "#fcd34d", UR: "#fb7185", LR: "#5eead4" };
/** 높은 등급일수록 큰 순서 — 정렬 · 비교용 */
export const TIER_RANK: Record<Tier, number> = { N: 0, R: 1, SR: 2, SSR: 3, UR: 4, LR: 5 };
