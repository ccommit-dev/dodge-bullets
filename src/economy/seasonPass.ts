/**
 * 시즌 패스 (계획안 G) — 4주 시즌 · 무료 30단 + 유료 트랙(₩7,900).
 *
 * 경험치는 새 콘텐츠가 아니라 이미 있는 루틴·토벌령·주간 도전·균열 완료에서 나온다.
 * 순수 함수만 둔다 — 저장은 호출자(updateCharacterProgress)가 한다.
 * 시즌이 바뀌면 xp·수령 기록이 초기화된다. 미수령 보상은 소멸(UI가 D-3부터 경고).
 */
import type { CharacterProgress } from "../progression/model";

export const SEASON = {
  days: 28,
  tiers: 30,
  xpPerTier: 100,
  /** 경험치 출처 */
  xp: { routine: 20, missionsAll: 20, weeklyChallenge: 50, rift: 5 },
  paidPriceLabel: "₩7,900",
  productId: "season-pass",
} as const;

/** 시즌 1 시작 — 2026-09-07 (월) */
export const SEASON_EPOCH = Date.UTC(2026, 8, 7);

export function seasonIndex(now: number = Date.now()): number {
  return Math.max(0, Math.floor((now - SEASON_EPOCH) / (SEASON.days * 86400000)));
}
export function seasonDaysLeft(now: number = Date.now()): number {
  const period = SEASON.days * 86400000;
  const elapsed = ((now - SEASON_EPOCH) % period + period) % period;
  return Math.max(1, Math.ceil((period - elapsed) / 86400000));
}
export function seasonTier(xp: number): number {
  return Math.min(SEASON.tiers, Math.floor(xp / SEASON.xpPerTier));
}

export type SeasonReward =
  | { kind: "gems"; amount: number }
  | { kind: "materials"; amount: number }
  | { kind: "shards"; amount: number }
  | { kind: "cores"; amount: number }
  | { kind: "boost"; hours: number }
  | { kind: "allySkin"; id: string }
  | { kind: "weaponFx"; id: string };

/** 무료 트랙 30단 — 보석 150 + 재료. 5단마다 보석 25 */
export function freeReward(tier: number): SeasonReward {
  if (tier % 5 === 0) return { kind: "gems", amount: 25 };
  if (tier % 5 === 3) return { kind: "shards", amount: 4 };
  if (tier % 5 === 1) return { kind: "materials", amount: 12 };
  return { kind: "gems", amount: 0 };
}
/** 유료 트랙 — 보석 600 · 조각 선택권 3(10단·20단·30단 = 조각 10씩) · 시즌 한정 스킨(15단) · 무기 이펙트(25단) */
export function paidReward(tier: number, season: number): SeasonReward {
  if (tier === 15) return { kind: "allySkin", id: `season-${season + 1}` };
  if (tier === 25) return { kind: "weaponFx", id: "fx-season" };
  if (tier === 10 || tier === 20 || tier === 30) return { kind: "shards", amount: 10 };
  if (tier % 3 === 0) return { kind: "cores", amount: 1 };
  // 보석 단 17개 × 35 + 1단 40 = 600
  return { kind: "gems", amount: tier === 1 ? 40 : 35 };
}
export function rewardLabel(r: SeasonReward): string {
  switch (r.kind) {
    case "gems": return r.amount > 0 ? `보석 ${r.amount}` : "—";
    case "materials": return `강화석 ${r.amount}`;
    case "shards": return `출전 동료 조각 ${r.amount}`;
    case "cores": return `스킬 코어 ${r.amount}`;
    case "boost": return `방치 가속 ${r.hours}h`;
    case "allySkin": return "시즌 한정 동료 스킨";
    case "weaponFx": return "시즌 무기 이펙트";
  }
}
/** 유료 트랙 보석 총액 (문서·하니스용) */
export function paidGemTotal(season = 0): number {
  let s = 0;
  for (let t = 1; t <= SEASON.tiers; t += 1) { const r = paidReward(t, season); if (r.kind === "gems") s += r.amount; }
  return s;
}
export function freeGemTotal(): number {
  let s = 0;
  for (let t = 1; t <= SEASON.tiers; t += 1) { const r = freeReward(t); if (r.kind === "gems") s += r.amount; }
  return s;
}

/** 시즌 전환 — 다른 시즌 기록은 버린다 */
export function normalizeSeason(current: CharacterProgress, now: number = Date.now()): CharacterProgress["seasonPass"] {
  const season = seasonIndex(now);
  const sp = current.seasonPass;
  return sp.season === season ? sp : { season, xp: 0, paid: false, claimedFree: [], claimedPaid: [] };
}

export function addSeasonXp(current: CharacterProgress, amount: number, now: number = Date.now()): CharacterProgress {
  const sp = normalizeSeason(current, now);
  return { ...current, seasonPass: { ...sp, xp: Math.min(SEASON.tiers * SEASON.xpPerTier, sp.xp + amount) } };
}

/** 수령 가능한 단계 목록 */
export function claimableTiers(current: CharacterProgress, track: "free" | "paid", now: number = Date.now()): number[] {
  const sp = normalizeSeason(current, now);
  if (track === "paid" && !sp.paid) return [];
  const reached = seasonTier(sp.xp);
  const claimed = track === "free" ? sp.claimedFree : sp.claimedPaid;
  const out: number[] = [];
  for (let t = 1; t <= reached; t += 1) {
    const r = track === "free" ? freeReward(t) : paidReward(t, sp.season);
    if (!claimed.includes(t) && !(r.kind === "gems" && r.amount === 0)) out.push(t);
  }
  return out;
}

/** 단계 수령 적용 — cores는 사냥터 저장에 있으므로 반환해 호출자가 더한다 */
export function claimSeasonTier(current: CharacterProgress, track: "free" | "paid", tier: number, now: number = Date.now()): { progress: CharacterProgress; cores: number; applied: boolean; reward: SeasonReward | null } {
  const sp = normalizeSeason(current, now);
  if (!claimableTiers({ ...current, seasonPass: sp }, track, now).includes(tier)) return { progress: current, cores: 0, applied: false, reward: null };
  const reward = track === "free" ? freeReward(tier) : paidReward(tier, sp.season);
  const target = current.partyIds[0];
  const next: CharacterProgress = {
    ...current,
    seasonPass: track === "free" ? { ...sp, claimedFree: [...sp.claimedFree, tier] } : { ...sp, claimedPaid: [...sp.claimedPaid, tier] },
    redGems: current.redGems + (reward.kind === "gems" ? reward.amount : 0),
    enhancementMaterials: current.enhancementMaterials + (reward.kind === "materials" ? reward.amount : 0),
    allyShards: reward.kind === "shards" && target ? { ...current.allyShards, [target]: (current.allyShards[target] ?? 0) + reward.amount } : current.allyShards,
    idleBoostUntil: reward.kind === "boost" ? Math.max(now, current.idleBoostUntil) + reward.hours * 3600000 : current.idleBoostUntil,
    ownedAllySkins: reward.kind === "allySkin" ? [...new Set([...current.ownedAllySkins, reward.id])] : current.ownedAllySkins,
    ownedWeaponFx: reward.kind === "weaponFx" ? [...new Set([...current.ownedWeaponFx, reward.id])] : current.ownedWeaponFx,
  };
  return { progress: next, cores: reward.kind === "cores" ? reward.amount : 0, applied: true, reward };
}
