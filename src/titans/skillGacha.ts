/**
 * 스킬 뽑기 · 중복 소진 (2026-10-28, 사용자: "스킬도 상점에서 돈으로 배울 수 있게 동료, 유물처럼 이펙트 내용 모두 추가해 주고
 * 동일한 유물이나 스킬이 있으면 소진하면서 레벨 높일 수 있게").
 *
 * - 상점 '스킬' 칸: 골드 뽑기(일반 ~ 영웅) · 보석 뽑기(영웅 ~ 초월). 등급 확률은 공시(합 1), 등급 안에서 균등.
 * - 뽑은 스킬은 '스킬 카드'(skillInventory.copies)로 쌓인다. 안 배운 스킬은 카드 1장으로 배운다(SP · 코어 없이, 칸 한도는 그대로),
 *   배운 스킬은 카드를 소진해 1장 = Lv +1(골드 강화와 별도). 이미 배운 레벨 + 카드로 최대 레벨을 채울 수 있는 스킬은 더 나오지 않는다.
 * - 실결제 상품 아님 — 골드 · 붉은 보석만.
 */
import { killGold, SKILLS, type TitanSkillId, type TitansSave } from "./model";
import { SKILL_TIER } from "./skills";
import type { Tier } from "./allyRoster";

export type SkillBanner = "gold" | "gem";
export const SKILL_BANNERS: readonly SkillBanner[] = ["gold", "gem"];
export const SKILL_BANNER_LABEL: Record<SkillBanner, string> = { gold: "골드", gem: "보석" };
/** 재화별 등급 확률 — 합 1 (확률 공시) */
export const SKILL_BANNER_RATES: Record<SkillBanner, Partial<Record<Tier, number>>> = {
  gold: { N: 0.55, R: 0.33, SR: 0.12 },
  gem: { SR: 0.42, SSR: 0.33, UR: 0.18, LR: 0.07 },
};
export const SKILL_GEM_DRAW = { single: 80, ten: 720 } as const;

/** 뽑기 값 — 골드는 지금 층의 사냥 골드 7분 30초치(유물 골드 뽑기의 1.5배, 최소 150) */
export function skillBannerCost(banner: SkillBanner, stage: number): { single: number; ten: number } {
  if (banner === "gem") return { single: SKILL_GEM_DRAW.single, ten: SKILL_GEM_DRAW.ten };
  const single = Math.max(150, Math.round(killGold(Math.max(1, stage), false, false) * 0.7 * 450));
  return { single, ten: single * 9 };
}

type Inv = Pick<TitansSave["skillInventory"], "learned" | "levels"> & { copies?: Partial<Record<TitanSkillId, number>> };

/** 배운 레벨 + 가진 카드 — 최대 레벨까지 채울 수 있으면 뽑기에서 빠진다 */
export function skillUnits(inv: Inv, id: TitanSkillId): number {
  return (inv.learned.includes(id) ? inv.levels[id] ?? 1 : 0) + (inv.copies?.[id] ?? 0);
}
export function skillDrawMaxed(inv: Inv, id: TitanSkillId): boolean {
  const def = SKILLS.find((s) => s.id === id);
  return !def || skillUnits(inv, id) >= def.maxLevel;
}

/** 지금 한 번 뽑을 때 각 스킬이 나올 확률 — 다 채운 스킬은 0 · 다 채운 등급은 남은 등급끼리 비례 */
export function skillDrawRates(inv: Inv, banner: SkillBanner): { id: TitanSkillId; rate: number }[] {
  const tierRates = SKILL_BANNER_RATES[banner];
  const openOf = (t: Tier) => SKILLS.filter((s) => SKILL_TIER[s.id] === t && !skillDrawMaxed(inv, s.id));
  const live = (Object.keys(tierRates) as Tier[]).filter((t) => openOf(t).length > 0);
  const sum = live.reduce((a, t) => a + (tierRates[t] ?? 0), 0);
  return SKILLS.map((s) => {
    const t = SKILL_TIER[s.id];
    if (!live.includes(t) || skillDrawMaxed(inv, s.id) || sum <= 0) return { id: s.id, rate: 0 };
    return { id: s.id, rate: (tierRates[t] ?? 0) / sum / openOf(t).length };
  });
}

/** 등급별 지금 확률(공시 요약) */
export function skillBannerTierRates(inv: Inv, banner: SkillBanner): Partial<Record<Tier, number>> {
  const out: Partial<Record<Tier, number>> = {};
  for (const x of skillDrawRates(inv, banner)) if (x.rate > 0) out[SKILL_TIER[x.id]] = (out[SKILL_TIER[x.id]] ?? 0) + x.rate;
  return out;
}

/** n 번 뽑아 카드로 쌓는다 — 한 번 뽑을 때마다 확률을 다시 본다(같은 10회 안에서도 다 채운 스킬은 빠진다) */
export function drawSkillCopies(inv: Inv, n: number, banner: SkillBanner, rng: () => number = Math.random): { copies: Partial<Record<TitanSkillId, number>>; got: TitanSkillId[] } {
  const copies: Partial<Record<TitanSkillId, number>> = { ...(inv.copies ?? {}) };
  const got: TitanSkillId[] = [];
  for (let i = 0; i < n; i++) {
    const rates = skillDrawRates({ ...inv, copies }, banner).filter((x) => x.rate > 0);
    if (!rates.length) break;
    let roll = rng();
    let pick = rates[rates.length - 1].id;
    for (const x of rates) { roll -= x.rate; if (roll < 0) { pick = x.id; break; } }
    copies[pick] = (copies[pick] ?? 0) + 1;
    got.push(pick);
  }
  return { copies, got };
}

/**
 * 카드 소진 — 안 배운 스킬이면 1장으로 배운다(learned · Lv.1), 배운 스킬이면 최대 레벨까지 남은 만큼 모두 Lv 로.
 * 칸 한도(배울 수 있는 수)는 부르는 쪽이 본다. 바뀐 것이 없으면 used 0
 */
export function consumeSkillCopies<T extends Inv>(inv: T, id: TitanSkillId): { inv: T; used: number; learnedNow: boolean } {
  const def = SKILLS.find((s) => s.id === id);
  const have = inv.copies?.[id] ?? 0;
  if (!def || have <= 0) return { inv, used: 0, learnedNow: false };
  const copies = { ...(inv.copies ?? {}) };
  const setLeft = (left: number) => { if (left > 0) copies[id] = left; else delete copies[id]; };
  if (!inv.learned.includes(id)) {
    setLeft(have - 1);
    return { inv: { ...inv, learned: [...inv.learned, id], levels: { ...inv.levels, [id]: 1 }, copies }, used: 1, learnedNow: true };
  }
  const level = inv.levels[id] ?? 1;
  const used = Math.max(0, Math.min(have, def.maxLevel - level));
  if (used <= 0) return { inv, used: 0, learnedNow: false };
  setLeft(have - used);
  return { inv: { ...inv, levels: { ...inv.levels, [id]: level + used }, copies }, used, learnedNow: false };
}
