import { formatGold } from "../titans/model";

/**
 * 전투력 표시 단위 (2026-11-18, 사용자 /goal "수치는 낮은게 핵심" → 고른 안 "전투력 표시만 줄인다").
 * 동료 DPS · 마이페이지 통합 전투력은 화면에서만 ÷100 해서 "전투력"으로 보인다 — 계산(피해 · 체력 · 비교)은 그대로다.
 * 통합 전투력 917,446 → 9,174 · 동료 DPS 160.9K → 1.6K · 처음 동료 DPS 16 → 0.16.
 */
export const POWER_UNIT = 100;

export function powerValue(raw: number): number {
  return Math.max(0, raw) / POWER_UNIT;
}

/** 화면 글 — 1 아래는 소수 둘째 · 10 아래는 첫째 · 1만 아래는 정수(천 단위 쉼표) · 그 위는 K/M */
export function formatPower(raw: number): string {
  const p = powerValue(raw);
  if (p <= 0) return "0";
  if (p < 1) return p.toFixed(2);
  if (p < 10) return p.toFixed(1);
  if (p < 10_000) return Math.round(p).toLocaleString();
  return formatGold(Math.round(p));
}
