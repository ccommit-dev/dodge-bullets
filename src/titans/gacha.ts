/**
 * 동료 소환(확률형) 엔진 — 순수 함수. RNG를 주입받아 테스트 가능하다.
 *
 * 설계 (과금 점검 후 재설계):
 * - 풀 = 현재 스테이지 이하로 해금된 동료(기본) + 픽업 2명(개척 상한 안의 다음 동료).
 *   상점 전용 동료(SHOP_ALLY_GEM_COST)는 풀에서 제외 — 확정 구매가 뽑기에 열위가 되지 않게.
 * - 등급 확률 R 60 / SR 30 / SSR 10. 풀에 없는 등급의 확률은 있는 등급에 비례 재분배.
 * - 픽업은 같은 등급 안에서 가중치 2배.
 * - 천장: SSR 없이 60회 → 61회째 SSR 확정(픽업 우선). SSR을 뽑으면 카운터 리셋.
 * - 10연: 900보석(10% 할인) + SR 이상 1명 보장.
 * - 중복: 등급별 조각 R 10 / SR 20 / SSR 40 — 성급 곡선(★1→2 = 20)과 맞춘다.
 * - 확률 공시: rateTable()이 동료별 확률을 %로 돌려준다 (게임산업법 공시 화면용).
 */
import { HEROES, HUNTING_AREAS, type TitanHeroId } from "./model";
import { ALLY_RARITY, SHOP_ALLY_GEM_COST, type AllyRarity } from "./allies";

export const GACHA = {
  singleCost: 100,
  tenCost: 900,
  pityLimit: 60,
  pickupWeight: 2,
  pickupCount: 2,
  rarityRate: { R: 0.6, SR: 0.3, SSR: 0.1 } as Record<AllyRarity, number>,
  dupeShards: { R: 10, SR: 20, SSR: 40 } as Record<AllyRarity, number>,
} as const;

export type GachaEntry = { id: TitanHeroId; rarity: AllyRarity; rate: number; pickup: boolean };
export type GachaPool = { entries: GachaEntry[]; pickups: TitanHeroId[]; bandRate: Record<AllyRarity, number> };
export type PullResult = { id: TitanHeroId; rarity: AllyRarity; pickup: boolean; duplicate: boolean; shards: number; pityBefore: number };

/** 개척한 지역까지의 최대 스테이지 — progression/idle.stageCeilingFor와 같은 규칙 (순환 import 회피) */
function ceilingOf(pioneeredArea: number): number {
  const index = Math.max(1, Math.min(HUNTING_AREAS.length, Math.floor(pioneeredArea))) - 1;
  return HUNTING_AREAS[index].stageTo;
}

const RARITIES: AllyRarity[] = ["R", "SR", "SSR"];

export function gachaPool(stage: number, pioneeredArea: number): GachaPool {
  const ceiling = ceilingOf(pioneeredArea);
  const eligible = HEROES.filter((h) => SHOP_ALLY_GEM_COST[h.id] === undefined && h.unlockStage < 9999);
  const base = eligible.filter((h) => h.unlockStage <= stage);
  const pickups = eligible
    .filter((h) => h.unlockStage > stage && h.unlockStage <= ceiling)
    .sort((a, b) => a.unlockStage - b.unlockStage)
    .slice(0, GACHA.pickupCount)
    .map((h) => h.id);
  const members = [...base.map((h) => h.id), ...pickups];
  // 등급별 확률 — 비어 있는 등급은 존재하는 등급에 비례 재분배
  const present = RARITIES.filter((r) => members.some((id) => ALLY_RARITY[id] === r));
  const presentSum = present.reduce((s, r) => s + GACHA.rarityRate[r], 0);
  const bandRate = { R: 0, SR: 0, SSR: 0 } as Record<AllyRarity, number>;
  for (const r of present) bandRate[r] = GACHA.rarityRate[r] / presentSum;
  const entries: GachaEntry[] = [];
  for (const r of present) {
    const ids = members.filter((id) => ALLY_RARITY[id] === r);
    const weightOf = (id: TitanHeroId) => (pickups.includes(id) ? GACHA.pickupWeight : 1);
    const total = ids.reduce((s, id) => s + weightOf(id), 0);
    for (const id of ids) entries.push({ id, rarity: r, rate: (bandRate[r] * weightOf(id)) / total, pickup: pickups.includes(id) });
  }
  return { entries, pickups, bandRate };
}

function weightedPick(entries: GachaEntry[], rng: () => number): GachaEntry {
  const total = entries.reduce((s, e) => s + e.rate, 0);
  let roll = rng() * total;
  for (const e of entries) {
    roll -= e.rate;
    if (roll <= 0) return e;
  }
  return entries[entries.length - 1];
}

/** 천장 적용 1회 뽑기 — 결과와 다음 천장 카운터 */
export function pullOnce(
  pool: GachaPool,
  owned: Record<TitanHeroId, number>,
  pity: number,
  rng: () => number = Math.random,
  guaranteeMin: AllyRarity | null = null,
): { result: PullResult; pity: number } {
  const ssr = pool.entries.filter((e) => e.rarity === "SSR");
  const srPlus = pool.entries.filter((e) => e.rarity !== "R");
  let candidates = pool.entries;
  if (pity >= GACHA.pityLimit - 1 && ssr.length > 0) candidates = ssr;
  else if (guaranteeMin === "SSR" && ssr.length > 0) candidates = ssr;
  else if (guaranteeMin === "SR" && srPlus.length > 0) candidates = srPlus;
  const picked = weightedPick(candidates, rng);
  const duplicate = owned[picked.id] > 0;
  const nextPity = picked.rarity === "SSR" ? 0 : pity + 1;
  return {
    result: { id: picked.id, rarity: picked.rarity, pickup: picked.pickup, duplicate, shards: duplicate ? GACHA.dupeShards[picked.rarity] : 0, pityBefore: pity },
    pity: nextPity,
  };
}

/** 10연 — SR 이상 1명 보장. 이미 보유한 동료는 뽑힌 순서대로 중복 처리된다. */
export function pullTen(
  pool: GachaPool,
  owned: Record<TitanHeroId, number>,
  pity: number,
  rng: () => number = Math.random,
): { results: PullResult[]; pity: number } {
  const heroes = { ...owned };
  const results: PullResult[] = [];
  let p = pity;
  for (let i = 0; i < 10; i += 1) {
    const last = i === 9 && !results.some((r) => r.rarity !== "R");
    const { result, pity: np } = pullOnce(pool, heroes, p, rng, last ? "SR" : null);
    results.push(result);
    p = np;
    if (!result.duplicate) heroes[result.id] = 1;
  }
  return { results, pity: p };
}

/** 확률 공시 — 동료별 확률(%)과 등급 합계 */
export function rateTable(pool: GachaPool): { id: TitanHeroId; rarity: AllyRarity; pickup: boolean; percent: string }[] {
  return [...pool.entries]
    .sort((a, b) => (a.rarity === b.rarity ? b.rate - a.rate : RARITIES.indexOf(b.rarity) - RARITIES.indexOf(a.rarity)))
    .map((e) => ({ id: e.id, rarity: e.rarity, pickup: e.pickup, percent: (e.rate * 100).toFixed(2) }));
}
