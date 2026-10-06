/**
 * 구매 추천 (2026-10-06, 사용자: "돈 모이면 뭐 살지 추천 해주면 좋겠어 자동으로 추천 기능 추가").
 *
 * 지금 가진 재화(사냥터 골드 · 공용 골드 · 붉은 보석 · 강화석 · 인장 · 스킬 조각)로 **지금 살 수 있는 것**을 실제 비용 함수로 계산해
 * 효과가 큰 순서로 고른다. 살 수 있는 것이 없으면 가장 가까운 목표("N 더 모으면")를 하나 돌려준다.
 * 원칙: 실결제(₩) 상품은 추천하지 않는다 — 결제 접점은 정해진 자리(순간 제안·상점)에만 둔다. 외형(능력치 없음)도 추천하지 않는다.
 * 순수 함수 — 저장을 바꾸지 않는다. 허브 '구매 추천' 알림과 상점 시트가 같은 결과를 쓴다.
 */
import type { CharacterProgress } from "../progression/model";
import { EXPEDITION_SKILLS, SKILL_MAX_LEVEL, WEAPON_FORGE_MAX, skillCost, skillUnlocked, weaponForgeCost, type ExpeditionSkillId } from "../game/skills";
import { TOWER_TICKET_SEALS } from "../game/towerTickets";
import { GACHA } from "../titans/gacha";
import { HEROES, equipmentTrainingCost, heroUpgradeCost, type TitanHeroId, type TitansSave } from "../titans/model";
import { GEM_PACK } from "./gemCatalog";

export type AdviceCurrency = "huntGold" | "gold" | "gems" | "stones" | "seals" | "shards";

export type AdviceAction =
  | { kind: "content"; content: "dodge" | "forge" }
  | { kind: "tab"; tab: "heroes" | "sword" | "premium" | "gacha" | "event-shop2" };

export type PurchaseAdvice = {
  id: string;
  title: string;
  /** 왜 이것인가 — 한 줄 */
  reason: string;
  /** 표시용 비용 */
  cost: Array<{ currency: AdviceCurrency; amount: number }>;
  currency: AdviceCurrency;
  /** 클수록 먼저 */
  priority: number;
  affordable: boolean;
  /** 못 살 때 모인 비율 0~1 */
  ratio: number;
  action: AdviceAction;
};

export type AdviceWallet = {
  huntGold: number;
  gold: number;
  gems: number;
  stones: number;
  seals: number;
};

export const CURRENCY_LABEL: Record<AdviceCurrency, string> = { huntGold: "사냥터 골드", gold: "골드", gems: "보석", stones: "강화석", seals: "인장", shards: "조각" };

function walletOf(progress: CharacterProgress, save: Pick<TitansSave, "gold">): AdviceWallet {
  return { huntGold: save.gold, gold: progress.sharedCoins, gems: progress.redGems, stones: progress.enhancementMaterials, seals: progress.expeditionSeals };
}

/** 비용 목록이 지갑으로 되는가, 안 되면 가장 모자란 재화의 모인 비율 */
function check(cost: PurchaseAdvice["cost"], w: AdviceWallet, shardsHave = 0): { affordable: boolean; ratio: number } {
  let ratio = 1;
  for (const c of cost) {
    if (c.amount <= 0) continue;
    const have = c.currency === "shards" ? shardsHave : w[c.currency as keyof AdviceWallet];
    ratio = Math.min(ratio, have / c.amount);
  }
  return { affordable: ratio >= 1, ratio: Math.max(0, Math.min(1, ratio)) };
}

export function purchaseAdvice(progress: CharacterProgress, save: Pick<TitansSave, "gold" | "heroes" | "equipmentTraining">, now = Date.now()): PurchaseAdvice[] {
  const w = walletOf(progress, save);
  const out: PurchaseAdvice[] = [];
  const push = (a: Omit<PurchaseAdvice, "affordable" | "ratio">, shardsHave = 0) => out.push({ ...a, ...check(a.cost, w, shardsHave) });

  // ── 성문 방어: 새 스킬 무기 배우기(인장) · 장착 무기 강화(골드 + 그 무기 조각) ──
  const levels = progress.expeditionSkills;
  for (const def of EXPEDITION_SKILLS) {
    const lv = levels[def.id as ExpeditionSkillId] ?? 0;
    if (lv >= SKILL_MAX_LEVEL || !skillUnlocked(def, progress.level, lv)) continue;
    const c = skillCost(def, lv + 1);
    if (lv === 0) {
      push({ id: `learn:${def.id}`, title: `${def.weapon} 배우기`, reason: "새 스킬 무기 — 장착 칸에 넣으면 다음 판부터 함께 쏜다", currency: "seals", priority: 92,
        cost: [{ currency: "seals", amount: c.seals }, { currency: "gold", amount: c.gold }], action: { kind: "content", content: "dodge" } });
    } else if (progress.expeditionLoadout.includes(def.id as never)) {
      push({ id: `skill:${def.id}`, title: `${def.weapon} Lv.${lv} → ${lv + 1}`, reason: "장착 중인 무기 — 성문 방어 피해가 바로 오른다", currency: "gold", priority: 84 - lv,
        cost: [{ currency: "gold", amount: c.gold }, { currency: "shards", amount: c.shards }], action: { kind: "content", content: "dodge" } }, progress.expeditionShards[def.id as ExpeditionSkillId] ?? 0);
    }
  }
  // ── 대장간 원정 무기 — 낮은 쪽 먼저 ──
  const forge = progress.expeditionWeaponForge;
  for (const fam of ["bow", "staff"] as const) {
    const lv = forge[fam];
    if (lv >= WEAPON_FORGE_MAX) continue;
    const c = weaponForgeCost(lv);
    const lower = forge[fam] <= forge[fam === "bow" ? "staff" : "bow"];
    push({ id: `forge:${fam}`, title: `${fam === "bow" ? "원정 장궁" : "수정 지팡이"} +${lv} → +${lv + 1}`, reason: fam === "bow" ? "기본 사격 + 물리 무기 다섯 — 피해 +8% · 재사용 −1.5%" : "마법 무기 다섯 — 피해 +8% · 재사용 −1.5%",
      currency: "gold", priority: 80 + (lower ? 2 : 0) - lv * 0.5, cost: [{ currency: "gold", amount: c.gold }, { currency: "stones", amount: c.stones }], action: { kind: "content", content: "forge" } });
  }
  // ── 사냥터: 편성 동료 레벨업 · 무기 숙련 (사냥터 골드) ──
  const party = progress.partyIds.filter((id) => (save.heroes[id as TitanHeroId] ?? 0) > 0);
  const cheapest = party.map((id) => { const def = HEROES.find((h) => h.id === id); return def ? { def, lv: save.heroes[id as TitanHeroId], cost: heroUpgradeCost(def, save.heroes[id as TitanHeroId]) } : null; })
    .filter((x): x is NonNullable<typeof x> => !!x).sort((a, b) => a.cost - b.cost)[0];
  if (cheapest) {
    push({ id: `hero:${cheapest.def.id}`, title: `${cheapest.def.name} Lv.${cheapest.lv} → ${cheapest.lv + 1}`, reason: "편성 동료 중 가장 싸게 오르는 동료 — 사냥 속도가 오른다", currency: "huntGold", priority: 70,
      cost: [{ currency: "huntGold", amount: cheapest.cost }], action: { kind: "tab", tab: "heroes" } });
  }
  const mastery = save.equipmentTraining?.weaponMastery ?? 0;
  push({ id: "train:weapon", title: `무기 숙련 Lv.${mastery} → ${mastery + 1}`, reason: "기본 공격력·자동 공격 속도·치명타", currency: "huntGold", priority: 66,
    cost: [{ currency: "huntGold", amount: equipmentTrainingCost("weapon", mastery) }], action: { kind: "tab", tab: "sword" } });

  // ── 붉은 보석 — 능력치로 바로 바뀌는 것만 ──
  if (progress.towerOpen && progress.towerTickets <= 0) {
    push({ id: "gems:tower", title: "끝없는 성벽 등반권 1장", reason: `오늘 등반권을 다 썼다 — 보석 30 또는 인장 ${TOWER_TICKET_SEALS}`, currency: "gems", priority: 64,
      cost: [{ currency: "gems", amount: 30 }], action: { kind: "tab", tab: "event-shop2" } });
  }
  const nextForgeStones = weaponForgeCost(Math.min(forge.bow, forge.staff)).stones;
  if (progress.enhancementMaterials < nextForgeStones) {
    push({ id: "gems:stones", title: `강화석 상자 (+${GEM_PACK.materialPackAmount})`, reason: `대장간 다음 강화에 강화석 ${nextForgeStones - progress.enhancementMaterials}개가 모자란다`, currency: "gems", priority: 62,
      cost: [{ currency: "gems", amount: GEM_PACK.materialPackCost }], action: { kind: "tab", tab: "premium" } });
  }
  if (progress.idleBoostUntil <= now) {
    push({ id: "gems:idle", title: "방치 가속권 24h", reason: "자는 동안 방치 산출 2배 — 오래 비울 때 가장 이득", currency: "gems", priority: 54,
      cost: [{ currency: "gems", amount: 80 }], action: { kind: "tab", tab: "premium" } });
  }
  push({ id: "gems:gacha10", title: "동료 10연 뽑기", reason: "SR 이상 1명 보장 · 중복은 승급 조각", currency: "gems", priority: 48,
    cost: [{ currency: "gems", amount: GACHA.tenCost }], action: { kind: "tab", tab: "gacha" } });

  return out.sort((a, b) => Number(b.affordable) - Number(a.affordable) || b.priority - a.priority || b.ratio - a.ratio);
}

/** 지금 살 수 있는 것 상위 n개 */
export function topAffordable(list: PurchaseAdvice[], n = 3): PurchaseAdvice[] {
  return list.filter((a) => a.affordable).slice(0, n);
}

/** 살 수 있는 것이 없을 때 — 가장 가까운 목표 하나 */
export function closestGoal(list: PurchaseAdvice[]): PurchaseAdvice | null {
  const rest = list.filter((a) => !a.affordable && a.ratio > 0);
  return rest.sort((a, b) => b.ratio - a.ratio || b.priority - a.priority)[0] ?? null;
}

/** 모자란 양 — "골드 1,200 더" */
export function shortfallLabel(a: PurchaseAdvice, progress: CharacterProgress, save: Pick<TitansSave, "gold">): string {
  const w = walletOf(progress, save);
  const parts: string[] = [];
  for (const c of a.cost) {
    const have = c.currency === "shards" ? 0 : w[c.currency as keyof AdviceWallet];
    if (c.currency !== "shards" && have < c.amount) parts.push(`${CURRENCY_LABEL[c.currency]} ${(c.amount - have).toLocaleString()}`);
  }
  return parts.length ? `${parts.join(" · ")} 더` : "";
}
