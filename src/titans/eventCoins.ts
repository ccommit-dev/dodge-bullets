/**
 * 이벤트 코인 드롭 (2026-10-22 아처 키우기 8번 "몬스터 랜덤 코인 → 이벤트 상점").
 * 일반 몬스터 3% · 1~3개, 대장 35% · 3~5개. 쓰는 곳은 이벤트 상점의 코인 교환 칸(주간 한도).
 * 난수는 밖에서 받아 시험할 수 있게 한다.
 */
export const COIN_DROP = { normal: 0.03, boss: 0.35 } as const;

export function rollCoinDrop(roll: number, amountRoll: number, isBoss: boolean): number {
  const chance = isBoss ? COIN_DROP.boss : COIN_DROP.normal;
  if (!(roll < chance)) return 0;
  const k = Math.min(2, Math.floor(Math.max(0, amountRoll) * 3));
  return (isBoss ? 3 : 1) + k;
}
