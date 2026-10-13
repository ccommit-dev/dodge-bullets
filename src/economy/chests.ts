/**
 * 비버 상자 · 상자 포인트 루프 (2026-10-13, docs/FOCUS_CAPYGO P2 — 카피바라 Go! 보물상자: 상자를 열면 포인트 → 포인트로 다시 상자).
 *
 * 상자가 오는 곳: 끝없는 성벽 10층마다 1 · 균열 하루 3회 완료 1 · 10연 소환 1. 여는 곳: 모험 허브 상자 줄.
 * 상자 하나 = 조각·강화석·인장 중 하나(확률 공시 한 장) + 상자 포인트 10. 100포인트 → 상자 1.
 * 새 저장: chests · chestPoints · chestsOpened (CharacterProgress)
 */
import type { CharacterProgress } from "../progression/model";

export const CHEST_POINTS_PER_OPEN = 10;
export const CHEST_POINTS_FOR_CHEST = 100;
export type ChestDrop = { kind: "shards" | "materials" | "seals"; amount: number; label: string; percent: number };
/** 확률 공시 — 합 100 */
export const CHEST_TABLE: ChestDrop[] = [
  { kind: "materials", amount: 20, label: "강화석 20", percent: 45 },
  { kind: "seals", amount: 8, label: "인장 8", percent: 35 },
  { kind: "shards", amount: 3, label: "동료 조각 3 (보유 동료 무작위)", percent: 20 },
];

export type ChestSource = "tower10" | "rift3" | "pull10";
export const CHEST_SOURCE_LABEL: Record<ChestSource, string> = { tower10: "성벽 10층", rift3: "균열 3회 완료", pull10: "10연 소환" };

/** 상자 1개 지급 */
export function grantChest(p: CharacterProgress, n = 1): CharacterProgress {
  return { ...p, chests: Math.max(0, (p.chests ?? 0) + n) };
}

export function rollChest(rng: () => number = Math.random): ChestDrop {
  let roll = rng() * 100;
  for (const d of CHEST_TABLE) { roll -= d.percent; if (roll <= 0) return d; }
  return CHEST_TABLE[CHEST_TABLE.length - 1];
}

/** 상자 열기 — 보상·포인트·100점 환급. 상자가 없으면 그대로. 조각은 pickAlly 가 정한 동료에게 */
export function openChest(p: CharacterProgress, rng: () => number = Math.random, pickAlly?: () => string | null): { progress: CharacterProgress; drop: ChestDrop | null; bonusChest: boolean } {
  if ((p.chests ?? 0) <= 0) return { progress: p, drop: null, bonusChest: false };
  const drop = rollChest(rng);
  let points = (p.chestPoints ?? 0) + CHEST_POINTS_PER_OPEN;
  let chests = p.chests - 1;
  let bonusChest = false;
  if (points >= CHEST_POINTS_FOR_CHEST) { points -= CHEST_POINTS_FOR_CHEST; chests += 1; bonusChest = true; }
  let next: CharacterProgress = { ...p, chests, chestPoints: points, chestsOpened: (p.chestsOpened ?? 0) + 1 };
  if (drop.kind === "materials") next = { ...next, enhancementMaterials: next.enhancementMaterials + drop.amount };
  else if (drop.kind === "seals") next = { ...next, expeditionSeals: next.expeditionSeals + drop.amount };
  else {
    const ally = pickAlly?.() ?? null;
    if (ally) next = { ...next, allyShards: { ...next.allyShards, [ally]: ((next.allyShards as Record<string, number>)[ally] ?? 0) + drop.amount } as CharacterProgress["allyShards"] };
    else next = { ...next, enhancementMaterials: next.enhancementMaterials + 20 };   // 보유 동료가 없으면 강화석으로
  }
  return { progress: next, drop, bonusChest };
}
