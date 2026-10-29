/**
 * 스킬 뽑기 · 중복 소진 (2026-10-28, 사용자: "스킬도 상점에서 돈으로 배울 수 있게 동료, 유물처럼 이펙트 내용 모두 추가해 주고
 * 동일한 유물이나 스킬이 있으면 소진하면서 레벨 높일 수 있게").
 *
 * - 상점 '스킬' 칸: 골드 뽑기(일반 ~ 영웅) · 보석 뽑기(영웅 ~ 초월). 등급 확률은 공시(합 1), 등급 안에서 균등.
 * - 뽑은 스킬은 '스킬 카드'(skillInventory.copies)로 쌓인다. 안 배운 스킬은 카드 1장으로 배운다(SP · 코어 없이, 칸 한도는 그대로),
 *   배운 스킬은 카드를 소진해 Lv 을 올린다(골드 강화와 별도). 이미 배운 레벨 + 카드로 최대 레벨을 채울 수 있는 스킬은 더 나오지 않는다.
 * - 카드 값 (2026-10-28, 사용자: "카드 1장 = 레벨 따라 줄어드는 Lv") — Lv 하나 올리는 데 드는 카드: Lv1~4 1장 · 5~9 2장 · 10~14 3장 · 15~19 5장.
 *   골드 강화는 Lv 마다 ×1.75 로 비싸지는데 카드 1장이 늘 Lv +1 이면 낮은 층에서 카드가 Lv19 기준 약 42배 쌌다.
 * - 실결제 상품 아님 — 골드 · 붉은 보석만.
 */
import { SKILLS, type TitanSkillId, type TitansSave } from "./model";
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

type Inv = Pick<TitansSave["skillInventory"], "learned" | "levels"> & { copies?: Partial<Record<TitanSkillId, number>> };

/** 골드 강화 1Lv 값(TitansGame.upgradeSkill 과 같은 식) */
export function skillGoldUpgradeCost(level: number): number {
  return Math.floor(240 * Math.pow(1.75, Math.max(0, level - 1)));
}
export const SKILL_GOLD_DRAW_MIN = 500;
/**
 * 뽑기 값 (2026-10-28 아쉬운 점 "카드 값은 층마다 · 골드 강화는 레벨마다 올라 층에 따라 유불리") — 골드 뽑기는 층이 아니라 스킬 레벨 기준.
 * 기준 Lv = 골드 뽑기 풀에서 배운 스킬 중 가장 높은 Lv(다른 스킬을 낮게 두어 값을 깎을 수 없게). 1회 값 = 골드 강화(기준 Lv) × 1/풀 크기 ÷ 그 Lv 의 카드 수 —
 * 보통 등급 스킬 하나를 카드로 Lv +1 하는 기대 값이 같은 Lv 골드 강화와 같다(일반은 싸고 영웅은 비싸다). 최소 500 골드. 보석 뽑기는 그대로.
 * stage 는 예전 호출과 맞추려 남긴다(값에 쓰지 않는다)
 */
export function skillBannerCost(banner: SkillBanner, stage: number, inv?: Inv): { single: number; ten: number } {
  void stage;
  if (banner === "gem") return { single: SKILL_GEM_DRAW.single, ten: SKILL_GEM_DRAW.ten };
  const poolTiers = Object.keys(SKILL_BANNER_RATES.gold);
  const pool = SKILLS.filter((s) => poolTiers.includes(SKILL_TIER[s.id]));
  const ref = Math.max(1, ...pool.filter((s) => inv?.learned.includes(s.id)).map((s) => inv?.levels[s.id] ?? 1));
  const single = Math.max(SKILL_GOLD_DRAW_MIN, Math.round(skillGoldUpgradeCost(ref) / pool.length / skillCardsPerLevel(ref)));
  return { single, ten: single * 9 };
}

/** 지금 Lv 에서 Lv +1 하는 데 드는 카드 수 */
export function skillCardsPerLevel(level: number): number {
  return level < 5 ? 1 : level < 10 ? 2 : level < 15 ? 3 : 5;
}
/** 지금 상태(안 배웠으면 학습 1장 포함)에서 최대 레벨까지 드는 카드 수 */
export function skillCardsToMax(inv: Inv, id: TitanSkillId): number {
  const def = SKILLS.find((s) => s.id === id);
  if (!def) return 0;
  const learned = inv.learned.includes(id);
  let need = learned ? 0 : 1;
  for (let l = learned ? inv.levels[id] ?? 1 : 1; l < def.maxLevel; l += 1) need += skillCardsPerLevel(l);
  return need;
}
/** 가진 카드로 최대 레벨을 채울 수 있으면 뽑기에서 빠진다 */
export function skillDrawMaxed(inv: Inv, id: TitanSkillId): boolean {
  const def = SKILLS.find((s) => s.id === id);
  return !def || (inv.copies?.[id] ?? 0) >= skillCardsToMax(inv, id);
}
/** 배운 스킬에 가진 카드를 모두 넣으면 — 쓰는 카드 수 · 오를 Lv (남는 카드는 다음 Lv 에 모자라면 그대로) */
export function skillCardPlan(inv: Inv, id: TitanSkillId): { used: number; toLevel: number; nextNeed: number } {
  const def = SKILLS.find((s) => s.id === id);
  const level = inv.levels[id] ?? 1;
  if (!def || !inv.learned.includes(id)) return { used: 0, toLevel: level, nextNeed: 1 };
  let have = inv.copies?.[id] ?? 0, l = level, used = 0;
  while (l < def.maxLevel && have >= skillCardsPerLevel(l)) { have -= skillCardsPerLevel(l); used += skillCardsPerLevel(l); l += 1; }
  return { used, toLevel: l, nextNeed: l < def.maxLevel ? skillCardsPerLevel(l) : 0 };
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
 * 카드 소진 — 안 배운 스킬이면 1장으로 배운다(learned · Lv.1), 배운 스킬이면 가진 카드로 오를 수 있는 만큼(skillCardPlan) Lv 로.
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
  const plan = skillCardPlan(inv, id);
  if (plan.used <= 0) return { inv, used: 0, learnedNow: false };
  setLeft(have - plan.used);
  return { inv: { ...inv, levels: { ...inv.levels, [id]: plan.toLevel }, copies }, used: plan.used, learnedNow: false };
}
