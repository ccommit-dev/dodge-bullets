import type { GameWorld } from "./types";

/**
 * 방어막 = 유일한 생명 (2026-10-02, 사용자: "HP 아이콘이 너무 많음 — 방어막 기준으로만"). 별점·보상·견갑 드롭이 예전 "남은 HP"를 보던 자리는
 * 이제 방어막을 얼마나 지켰는가를 본다. 0~1
 */
export function barrierRatio(world: Pick<GameWorld, "barrierHp" | "barrierMaxHp">): number {
  return world.barrierMaxHp > 0 ? Math.max(0, Math.min(1, world.barrierHp / world.barrierMaxHp)) : 0;
}

/** 별점 — ★ 클리어 · ★★ 방어막 50% 이상 지킴 · ★★★ 방어막 90% 이상 + 콤보 10 */
export function starsForClear(world: Pick<GameWorld, "barrierHp" | "barrierMaxHp" | "maxCombo">): number {
  const r = barrierRatio(world);
  if (r >= 0.9 && world.maxCombo >= 10) return 3;
  return r >= 0.5 ? 2 : 1;
}
