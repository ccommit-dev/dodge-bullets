/**
 * 결정 영구 강화 트리 (2026-10-26, 사용자: "오늘도 환생 2" 차용 1번 — 훈장 트리).
 *
 * 새 재화를 만들지 않는다 — 환생 결정(inheritanceCrystals, 누적 획득량)을 쓴다. 쓸 수 있는 결정 = 누적 − 트리에 쓴 합.
 * 마이페이지 계승 칸 다섯 줄 + 진화 포인트로 여는 특수 두 줄.
 *
 * - 방치 효율: 예전엔 결정 1개마다 방치 배율 +0.02 가 저절로 붙었다(IDLE.multPerCrystal). 그 배율을 이 줄로 옮겼다 —
 *   한 단계 = 결정 2개 = +0.04 로 같은 값. 옛 저장은 결정 전부를 이 줄에 넣은 상태로 옮긴다(normalizeCrystalTree, 배율 그대로).
 *   되돌리기는 공짜(결정 전부 반환, 연 열쇠는 그대로)라 옮긴 결정을 다른 줄로 다시 나눌 수 있다.
 * - 시작 스테이지: 환생하면 1층이 아니라 (1 + 단계)층부터. 건너뛴 층에서 벌었을 골드를 출발 골드에 얹어 바로 막히지 않게 한다.
 *   단, 직전 최고의 절반 · 지역 상한 −1 을 넘지 않는다. 자동 환생도 같은 performRebirth 를 쓰므로 같이 적용된다.
 */
import type { CharacterProgress } from "./model";
import { killGold, MOBS_PER_STAGE, stageClearBonus } from "../titans/model";
import { relicEffects, RELIC_DROP_CHANCE } from "../titans/relics";

export type TreeLine = "atk" | "gold" | "idle" | "start" | "crystal" | "boss" | "relic";
export type CrystalTree = Record<TreeLine, number> & { keys: TreeLine[] };

type LineDef = { id: TreeLine; name: string; max: number; cost: (lv: number) => number; label: string; short: (lv: number) => string; key?: number };

export const TREE_LINES: readonly LineDef[] = [
  { id: "atk", name: "공격력", max: 40, cost: (lv) => 3 + lv, label: "탭 · 동료 피해", short: (lv) => `+${lv * 5}%` },
  { id: "gold", name: "처치 골드", max: 40, cost: (lv) => 3 + lv, label: "처치 골드", short: (lv) => `+${lv * 5}%` },
  { id: "idle", name: "방치 효율", max: 60, cost: () => 2, label: "방치 배율", short: (lv) => `+${(lv * 0.04).toFixed(2)}` },
  { id: "start", name: "시작 스테이지", max: 30, cost: (lv) => 4 + lv * 2, label: "환생 뒤 시작", short: (lv) => `${1 + lv}층` },
  { id: "crystal", name: "환생 결정", max: 10, cost: (lv) => 6 + lv * 3, label: "환생 결정", short: (lv) => `+${lv * 10}%` },
  // 특수 줄 — 진화 포인트 하나로 연다(소모)
  { id: "boss", name: "대장 사냥꾼", max: 20, cost: (lv) => 5 + lv * 2, label: "대장 피해", short: (lv) => `+${lv * 8}%`, key: 1 },
  { id: "relic", name: "유물 탐지", max: 10, cost: (lv) => 6 + lv * 3, label: "유물 조각 확률", short: (lv) => `+${lv * 2}%p`, key: 1 },
];
/** "탭 · 동료 피해 +10%" */
export function lineText(id: TreeLine, lv: number): string {
  const d = lineDef(id);
  return `${d.label} ${d.short(lv)}`;
}
export const BASIC_LINES: TreeLine[] = ["atk", "gold", "idle", "start", "crystal"];
export const SPECIAL_LINES: TreeLine[] = ["boss", "relic"];

export function lineDef(id: TreeLine): LineDef {
  return TREE_LINES.find((l) => l.id === id)!;
}

export function emptyCrystalTree(): CrystalTree {
  return { atk: 0, gold: 0, idle: 0, start: 0, crystal: 0, boss: 0, relic: 0, keys: [] };
}

/** 줄 단계 lv 까지 쓴 결정 */
export function lineSpent(id: TreeLine, lv: number): number {
  const def = lineDef(id);
  let sum = 0;
  for (let i = 0; i < lv; i++) sum += def.cost(i);
  return sum;
}

export function treeSpent(tree: CrystalTree): number {
  return TREE_LINES.reduce((a, l) => a + lineSpent(l.id, tree[l.id]), 0);
}

export function freeCrystals(progress: Pick<CharacterProgress, "inheritanceCrystals" | "crystalTree">): number {
  return Math.max(0, progress.inheritanceCrystals - treeSpent(progress.crystalTree));
}

/** 저장 정리. raw 가 없으면(트리 이전 저장) 결정 전부를 방치 효율 줄에 넣어 예전 배율을 그대로 옮긴다 */
export function normalizeCrystalTree(raw: unknown, inheritanceCrystals: number): CrystalTree {
  const tree = emptyCrystalTree();
  if (!raw || typeof raw !== "object") {
    tree.idle = Math.min(lineDef("idle").max, Math.floor(Math.max(0, inheritanceCrystals) / 2));
    return tree;
  }
  const r = raw as Record<string, unknown>;
  for (const l of TREE_LINES) {
    const v = r[l.id];
    tree[l.id] = typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.min(l.max, Math.floor(v))) : 0;
  }
  tree.keys = Array.isArray(r.keys) ? [...new Set(r.keys.filter((k): k is TreeLine => SPECIAL_LINES.includes(k as TreeLine)))] : [];
  // 열쇠 없이 단계만 있으면 버린다 · 결정보다 많이 쓴 저장은 뒤 줄부터 깎는다
  for (const s of SPECIAL_LINES) if (!tree.keys.includes(s)) tree[s] = 0;
  for (const l of [...TREE_LINES].reverse()) while (tree[l.id] > 0 && treeSpent(tree) > inheritanceCrystals) tree[l.id] -= 1;
  return tree;
}

export type TreeAction = { ok: true; next: CharacterProgress } | { ok: false; reason: string };

export function canUnlockKey(progress: CharacterProgress, id: TreeLine): boolean {
  const def = lineDef(id);
  return !!def.key && !progress.crystalTree.keys.includes(id) && progress.evolutionPoints >= def.key;
}

/** 특수 줄 열기 — 진화 포인트를 쓴다 */
export function unlockKey(progress: CharacterProgress, id: TreeLine): TreeAction {
  const def = lineDef(id);
  if (!def.key) return { ok: false, reason: "열쇠가 필요 없는 줄입니다" };
  if (progress.crystalTree.keys.includes(id)) return { ok: false, reason: "이미 연 줄입니다" };
  if (progress.evolutionPoints < def.key) return { ok: false, reason: `진화 포인트 ${def.key}개가 필요합니다 — 환생하면 1개` };
  return { ok: true, next: { ...progress, evolutionPoints: progress.evolutionPoints - def.key, crystalTree: { ...progress.crystalTree, keys: [...progress.crystalTree.keys, id] } } };
}

export function upgradeLine(progress: CharacterProgress, id: TreeLine): TreeAction {
  const def = lineDef(id);
  const lv = progress.crystalTree[id];
  if (def.key && !progress.crystalTree.keys.includes(id)) return { ok: false, reason: "진화 포인트로 먼저 여세요" };
  if (lv >= def.max) return { ok: false, reason: "최대 단계입니다" };
  const cost = def.cost(lv);
  const free = freeCrystals(progress);
  if (free < cost) return { ok: false, reason: `결정 ${cost}개가 필요합니다 — 지금 ${free}개` };
  return { ok: true, next: { ...progress, crystalTree: { ...progress.crystalTree, [id]: lv + 1 } } };
}

/** 되돌리기 — 공짜. 결정은 전부 돌아오고 연 열쇠는 그대로 */
export function resetTree(progress: CharacterProgress): CharacterProgress {
  return { ...progress, crystalTree: { ...emptyCrystalTree(), keys: progress.crystalTree.keys } };
}

/** 방치 배율 가산 (idle.ts idleMultiplier) */
export function treeIdleMult(tree: CrystalTree): number {
  return tree.idle * 0.04;
}

/** 환생 결정 — 트리 줄 · 비버 왕관 유물 배율 */
export function boostedRebirthCrystals(base: number, progress: Pick<CharacterProgress, "crystalTree" | "relics">): number {
  return Math.floor(base * (1 + progress.crystalTree.crystal * 0.1) * relicEffects(progress.relics).crystalMul);
}

/** 환생 뒤 시작 층 — 직전 최고 절반 · 지역 상한 −1 을 넘지 않는다 */
export function rebirthStartStage(tree: CrystalTree, bestStage: number, ceiling: number): number {
  return Math.max(1, Math.min(1 + tree.start, Math.floor(bestStage / 2), ceiling - 1));
}

/** 건너뛴 층(1 … start−1)을 걸어 올랐다면 벌었을 골드 — 일반 처치 + 대장 + 클리어 보너스 (상자 제외) */
export function skippedStageGold(startStage: number): number {
  let sum = 0;
  for (let s = 1; s < startStage; s++) sum += killGold(s, false, false) * MOBS_PER_STAGE + killGold(s, true, false) + stageClearBonus(s);
  return Math.floor(sum);
}

export type PermanentEffects = {
  tapMul: number; allyMul: number; bossMul: number; goldMul: number;
  bossTimeSec: number; burnShare: number; relicChance: number;
};

/** 사냥터가 곱하는 영구 배율 — 결정 트리 × 유물 */
export function permanentEffects(progress: Pick<CharacterProgress, "crystalTree" | "relics">): PermanentEffects {
  const t = progress.crystalTree;
  const r = relicEffects(progress.relics);
  const atk = 1 + t.atk * 0.05;
  return {
    tapMul: atk * r.tapMul,
    allyMul: atk * r.allyMul,
    bossMul: (1 + t.boss * 0.08) * r.bossMul,
    goldMul: (1 + t.gold * 0.05) * r.goldMul,
    bossTimeSec: r.bossTimeSec,
    burnShare: r.burnShare,
    relicChance: RELIC_DROP_CHANCE + t.relic * 0.02 + r.dropBonus,
  };
}
