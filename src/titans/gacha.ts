/**
 * 동료 소환(확률형) 엔진 — 순수 함수. RNG를 주입받아 테스트 가능하다.
 *
 * 설계 (과금 점검 후 재설계):
 * - 풀 = 현재 스테이지 이하로 해금된 동료(기본) + 픽업 2명(개척 상한 안의 다음 동료).
 *   상점 전용 동료(SHOP_ALLY_GEM_COST)는 풀에서 제외 — 확정 구매가 뽑기에 열위가 되지 않게.
 * - 등급 확률은 뽑기 레벨(누적 뽑기 수, titans/summonLevel.ts)이 정한다 — 2026-10-27 6등급(N · R · SR · SSR · UR · LR) ·
 *   Lv1 전설 2% 로 희박하게 시작해 Lv10 전설 13.5% · 신화 4.2% · 초월 0.8%. 풀에 없는 등급의 확률은 있는 등급에 비례 재분배.
 * - 픽업은 같은 등급 안에서 가중치 2배.
 * - 천장: 전설 이상 없이 60회 → 61회째 전설 이상 확정(픽업 우선). 전설 이상을 뽑으면 카운터 리셋.
 * - 초월 천장 (2026-10-27): 초월 없이 200회 → 200회째 초월 확정. 초반 지역(초월 없는 풀)에서 뽑은 것도 센다 —
 *   다 차면 199 에서 멈춰 기다리다가 초월이 있는 풀의 첫 소환에서 확정(초반에 많이 뽑아도 천장이 버려지지 않게).
 * - 10연: 900보석(10% 할인) + 영웅(SR) 이상 1명 보장.
 * - 중복: 등급별 조각 N 5 / R 10 / SR 20 / SSR 40 / UR 60 / LR 80 — 성급 곡선(★1→2 = 20)과 맞춘다.
 * - 확률 공시: rateTable()이 동료별 확률을 %로 돌려준다 (게임산업법 공시 화면용).
 */
import { HEROES, HUNTING_AREAS, type TitanHeroId } from "./model";
import { ALLY_RARITY, ALLY_ROLE, SHOP_ALLY_GEM_COST, type AllyRarity } from "./allies";
import { TIERS, TIER_RANK, tierRates } from "./summonLevel";

/** 전설(SSR) 이상 — 천장 · 첫 10연 보장 */
const isTop = (r: AllyRarity) => TIER_RANK[r] >= TIER_RANK.SSR;

export const GACHA = {
  singleCost: 100,
  tenCost: 900,
  pityLimit: 60,
  /** 초월(LR) 천장 — 초반 지역에서도 세고, 확정은 초월이 있는 풀에서 */
  lrPityLimit: 200,
  pickupWeight: 2,
  pickupCount: 2,
  /** 풀 최소 인원 — 모자라면 다음 해금 순으로 보충 (2026-10-13) */
  minPool: 5,
  dupeShards: { N: 5, R: 10, SR: 20, SSR: 40, UR: 60, LR: 80 } as Record<AllyRarity, number>,
} as const;

export type GachaEntry = { id: TitanHeroId; rarity: AllyRarity; rate: number; pickup: boolean };
export type GachaPool = { entries: GachaEntry[]; pickups: TitanHeroId[]; bandRate: Record<AllyRarity, number>; /** 픽업 회전까지 남은 일수 (K: 2주 회전) */ rotationDaysLeft: number; /** 회전 대상 후보 수 — 2 이하면 회전 없음 */ rotationPool: number };

/** 픽업 회전 주기 (K) — 진행도가 멈춰도 2주마다 다른 동료가 픽업된다 */
export const PICKUP_ROTATION_DAYS = 14;
const ROTATION_EPOCH = Date.UTC(2026, 0, 5); // 2026-01-05 (월) 기준
export function pickupRotationIndex(now: number = Date.now()): number {
  return Math.floor((now - ROTATION_EPOCH) / (PICKUP_ROTATION_DAYS * 86400000));
}
export function pickupRotationDaysLeft(now: number = Date.now()): number {
  const period = PICKUP_ROTATION_DAYS * 86400000;
  const elapsed = (now - ROTATION_EPOCH) % period;
  return Math.max(1, Math.ceil((period - elapsed) / 86400000));
}
export type PullResult = { id: TitanHeroId; rarity: AllyRarity; pickup: boolean; duplicate: boolean; shards: number; pityBefore: number; /** 첫 10연 전설 — 지역과 관계없이 출전 */ fieldPass?: boolean };

/** 첫 10연에 풀에 전설이 없을 때 줄 전설 — 스테이지로 가장 먼저 열리는 전설 (상점 전용 제외) */
export const FIRST_TEN_SSR: TitanHeroId | null = [...HEROES].filter((h) => ALLY_RARITY[h.id] === "SSR" && h.unlockStage < 9999).sort((a, b) => a.unlockStage - b.unlockStage)[0]?.id ?? null;

/** 개척한 지역까지의 최대 스테이지 — progression/idle.stageCeilingFor와 같은 규칙 (순환 import 회피) */
function ceilingOf(pioneeredArea: number): number {
  const index = Math.max(1, Math.min(HUNTING_AREAS.length, Math.floor(pioneeredArea))) - 1;
  return HUNTING_AREAS[index].stageTo;
}

const RARITIES: readonly AllyRarity[] = TIERS;

/** summonLv — 뽑기 레벨(1~10). 등급 확률을 정한다 · 풀(누가 나오나)은 여전히 지역 안 */
export function gachaPool(stage: number, pioneeredArea: number, now: number = Date.now(), summonLv = 1): GachaPool {
  const ceiling = ceilingOf(pioneeredArea);
  const eligible = HEROES.filter((h) => SHOP_ALLY_GEM_COST[h.id] === undefined && h.unlockStage < 9999);
  const base = eligible.filter((h) => h.unlockStage <= stage);
  // 픽업 후보 = 아직 못 만난 개척 상한 안의 동료. 후보가 3명 이상이면 2주마다 창을 옮겨 2명씩 회전한다 (K)
  const candidates = eligible.filter((h) => h.unlockStage > stage && h.unlockStage <= ceiling).sort((a, b) => a.unlockStage - b.unlockStage);
  const offset = candidates.length > GACHA.pickupCount ? pickupRotationIndex(now) % candidates.length : 0;
  const pickups = Array.from({ length: Math.min(GACHA.pickupCount, candidates.length) }, (_, i) => candidates[(offset + i) % candidates.length].id);
  const rotationDaysLeft = pickupRotationDaysLeft(now);
  const rotationPool = candidates.length;
  const members = [...base.map((h) => h.id), ...pickups];
  // 최소 풀 (2026-10-13, 사용자: "동료 뽑기에 하나의 클래스만 나오는 현상"): 1지역(스테이지 1~5)은 해금 동료가 미아·레온 둘뿐이라
  // R 근접·원거리만 나오고 10연 SR 보장도 SR 이 없어 무효였다 → 개척 상한 밖이라도 다음 해금 순으로 채워 최소 5명(역할·등급이 섞이게)
  for (const h of eligible.sort((a, b) => a.unlockStage - b.unlockStage)) {
    if (members.length >= GACHA.minPool) break;
    if (!members.includes(h.id)) members.push(h.id);
  }
  // 역할 3종 이상 (2026-10-27 동료 60명 — 1지역 동료가 늘어 최소 5명이 근접 · 원거리로만 찰 수 있다): 빠진 역할의 가장 이른 동료를 하나씩
  for (const role of ["tank", "healer", "melee", "ranged"] as const) {
    if (new Set(members.map((id) => ALLY_ROLE[id])).size >= 3) break;
    if (members.some((id) => ALLY_ROLE[id] === role)) continue;
    const add = eligible.find((h) => ALLY_ROLE[h.id] === role && !members.includes(h.id));
    if (add) members.push(add.id);
  }
  // 등급별 확률 — 비어 있는 등급은 존재하는 등급에 비례 재분배
  const present = RARITIES.filter((r) => members.some((id) => ALLY_RARITY[id] === r));
  const levelRate = tierRates(summonLv);
  const presentSum = present.reduce((s, r) => s + levelRate[r], 0);
  const bandRate = { N: 0, R: 0, SR: 0, SSR: 0, UR: 0, LR: 0 } as Record<AllyRarity, number>;
  for (const r of present) bandRate[r] = levelRate[r] / presentSum;
  const entries: GachaEntry[] = [];
  for (const r of present) {
    const ids = members.filter((id) => ALLY_RARITY[id] === r);
    const weightOf = (id: TitanHeroId) => (pickups.includes(id) ? GACHA.pickupWeight : 1);
    const total = ids.reduce((s, id) => s + weightOf(id), 0);
    for (const id of ids) entries.push({ id, rarity: r, rate: (bandRate[r] * weightOf(id)) / total, pickup: pickups.includes(id) });
  }
  return { entries, pickups, bandRate, rotationDaysLeft, rotationPool };
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
  /** 초월 천장 카운터 — 초월 없이 누적된 뽑기 수 */
  lrPity = 0,
): { result: PullResult; pity: number; lrPity: number } {
  const ssr = pool.entries.filter((e) => isTop(e.rarity));
  const srPlus = pool.entries.filter((e) => TIER_RANK[e.rarity] >= TIER_RANK.SR);
  let candidates = pool.entries;
  // 천장 (2026-10-15 버그 수정: "천장 초기화 안 되고 계속 남아 있다" — 80/60) — 풀에 전설이 없으면(초반 지역) 보장이 영영 안 터져
  // 카운터가 60을 넘어 계속 올랐다. 이제 천장에 닿으면 그 풀의 최고 등급을 보장하고 카운터를 0으로 되돌린다
  const atPity = pity >= GACHA.pityLimit - 1;
  // 전설 이상이 없는 풀이면 그 풀의 가장 높은 등급
  const topRank = Math.max(...pool.entries.map((e) => TIER_RANK[e.rarity]));
  const lr = pool.entries.filter((e) => e.rarity === "LR");
  const atLrPity = lr.length > 0 && lrPity >= GACHA.lrPityLimit - 1;
  if (atLrPity) candidates = lr;
  else if (atPity) candidates = ssr.length > 0 ? ssr : pool.entries.filter((e) => TIER_RANK[e.rarity] === topRank);
  else if (guaranteeMin === "SSR" && ssr.length > 0) candidates = ssr;
  else if (guaranteeMin === "SR" && srPlus.length > 0) candidates = srPlus;
  const picked = weightedPick(candidates, rng);
  const duplicate = owned[picked.id] > 0;
  const nextPity = isTop(picked.rarity) || atPity ? 0 : Math.min(GACHA.pityLimit - 1, pity + 1);
  const nextLr = picked.rarity === "LR" ? 0 : Math.min(GACHA.lrPityLimit - 1, lrPity + 1);
  return {
    result: { id: picked.id, rarity: picked.rarity, pickup: picked.pickup, duplicate, shards: duplicate ? GACHA.dupeShards[picked.rarity] : 0, pityBefore: pity },
    pity: nextPity,
    lrPity: nextLr,
  };
}

/** 10연 — SR 이상 1명 보장. 이미 보유한 동료는 뽑힌 순서대로 중복 처리된다. */
export function pullTen(
  pool: GachaPool,
  owned: Record<TitanHeroId, number>,
  pity: number,
  rng: () => number = Math.random,
  /** 첫 10연 (2026-10-22 아처 키우기 5번 "바로 10연차로 4성 경험") — 전설 1명 확정 */
  firstTen = false,
  /** 풀에 전설이 없을 때(초반 지역) 대신 줄 전설 — 이 동료는 출전 허가(field-pass)를 같이 받는다 */
  fallbackSsr: TitanHeroId | null = null,
  lrPity = 0,
): { results: PullResult[]; pity: number; lrPity: number } {
  const heroes = { ...owned };
  const results: PullResult[] = [];
  let p = pity;
  let lp = lrPity;
  const poolHasSsr = pool.entries.some((e) => isTop(e.rarity));
  for (let i = 0; i < 10; i += 1) {
    const needSsr = i === 9 && firstTen && !results.some((r) => isTop(r.rarity));
    if (needSsr && !poolHasSsr && fallbackSsr) {
      const duplicate = (heroes[fallbackSsr] ?? 0) > 0;
      results.push({ id: fallbackSsr, rarity: "SSR", pickup: false, duplicate, shards: duplicate ? GACHA.dupeShards.SSR : 0, pityBefore: p, fieldPass: true });
      p = 0;
      if (!duplicate) heroes[fallbackSsr] = 1;
      continue;
    }
    const last = i === 9 && !results.some((r) => TIER_RANK[r.rarity] >= TIER_RANK.SR);
    const { result, pity: np, lrPity: nl } = pullOnce(pool, heroes, p, rng, needSsr ? "SSR" : last ? "SR" : null, lp);
    results.push(result);
    p = np;
    lp = nl;
    if (!result.duplicate) heroes[result.id] = 1;
  }
  return { results, pity: p, lrPity: lp };
}

/** 확률 공시 — 동료별 확률(%)과 등급 합계 */
/** 초월 동료가 처음 열리는 층 — 초월 천장 안내용 */
export const FIRST_LR_STAGE: number = Math.min(...HEROES.filter((h) => ALLY_RARITY[h.id] === "LR" && h.unlockStage < 9999).map((h) => h.unlockStage));

export function rateTable(pool: GachaPool): { id: TitanHeroId; rarity: AllyRarity; pickup: boolean; percent: string }[] {
  return [...pool.entries]
    .sort((a, b) => (a.rarity === b.rarity ? b.rate - a.rate : RARITIES.indexOf(b.rarity) - RARITIES.indexOf(a.rarity)))
    .map((e) => ({ id: e.id, rarity: e.rarity, pickup: e.pickup, percent: (e.rate * 100).toFixed(2) }));
}
