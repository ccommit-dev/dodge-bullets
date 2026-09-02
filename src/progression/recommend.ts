/**
 * 오늘의 추천 1개 (RETENTION_DESIGN B) — 흩어진 안내를 한 함수로.
 *
 * 우선순위: 수령 가능 > 오늘 남은 무료 > 벽(정량) > 성장 병목(R/M/T) > 장기.
 * 허브 최상단에 배너 1개·버튼 1개만 노출한다. 데이터 없음 — 전부 파생.
 */
import { IDLE, idleCapHours, idleMultiplier, idleRate, stageCeilingFor, nextAreaName } from "./idle";
import type { CharacterProgress } from "./model";
import { RIFT_ATTEMPTS, dailyMissionsDone, type EventSave } from "../events/eventSave";
import { JOURNAL_ENTRIES } from "./journal";
import { ALLY_IDS, effectiveStars, shardCostToNext } from "../titans/allies";
import { HEROES, heroUpgradeCost, heroDps, type TitanHeroId, type TitanSkillId, type TitanSkillSlot, type TitansSave } from "../titans/model";
import { starMultiplier } from "../titans/allies";

export type RecommendAction =
  | { kind: "content"; content: "dodge" | "beat" | "forge" }
  | { kind: "events"; tab: "rift" | "daily" | "journal" | "weekly" }
  | { kind: "tab"; tab: "heroes" | "skills" | "sword" }
  | { kind: "none" };

export type Recommendation = {
  id: string;
  /** 배너 톤 — 수령(초록) · 무료(파랑) · 벽(빨강) · 성장(노랑) */
  tone: "claim" | "free" | "wall" | "grow";
  title: string;
  desc: string;
  cta: string;
  action: RecommendAction;
  /** 벽 미터(0~1) — 벽 추천일 때만 */
  meter?: number;
};

export type WallInfo = {
  /** 제한시간 동안 깎은 보스 HP 비율 (0~1). 1이면 벽 아님 */
  ratio: number;
  stage: number;
};

/**
 * 벽을 가장 싸게 메우는 행동 1개 (RETENTION_DESIGN D).
 * 필요 DPS 배수 = 1/ratio. 보유 골드로 살 수 있는 동료 레벨업을 DPS 효율 순으로
 * 시뮬레이션해 목표에 닿으면 그것을, 못 닿으면 조각으로 승급 가능한 동료를, 둘 다 없으면 재련·성벽.
 */
export function cheapestWallFix(wall: WallInfo, progress: CharacterProgress, titans: TitansSave): { text: string; action: RecommendAction } {
  const need = Math.max(1, 1 / Math.max(0.05, wall.ratio));
  const party = progress.partyIds.filter((id) => titans.heroes[id] > 0);
  const dpsOf = (id: TitanHeroId, level: number) => {
    const def = HEROES.find((h) => h.id === id)!;
    return heroDps(def, level) * starMultiplier(effectiveStars(progress.allyStars[id], level));
  };
  const levels: Record<string, number> = {};
  party.forEach((id) => { levels[id] = titans.heroes[id]; });
  const base = party.reduce((s, id) => s + dpsOf(id, levels[id]), 0);
  if (base <= 0) return { text: "동료를 먼저 소환하세요", action: { kind: "tab", tab: "heroes" } };
  let gold = titans.gold;
  let total = base;
  let spent = 0;
  const bought: Record<string, number> = {};
  for (let i = 0; i < 400 && total < base * need; i += 1) {
    // 골드당 DPS 증가가 가장 큰 동료를 1레벨
    let best: TitanHeroId | null = null;
    let bestGain = 0;
    for (const id of party) {
      const def = HEROES.find((h) => h.id === id)!;
      const cost = heroUpgradeCost(def, levels[id]);
      if (cost > gold) continue;
      const gain = (dpsOf(id, levels[id] + 1) - dpsOf(id, levels[id])) / cost;
      if (gain > bestGain) { bestGain = gain; best = id; }
    }
    if (!best) break;
    const def = HEROES.find((h) => h.id === best)!;
    const cost = heroUpgradeCost(def, levels[best]);
    gold -= cost;
    spent += cost;
    total += dpsOf(best, levels[best] + 1) - dpsOf(best, levels[best]);
    levels[best] += 1;
    bought[best] = (bought[best] ?? 0) + 1;
  }
  if (total >= base * need) {
    const parts = Object.entries(bought).map(([id, n]) => `${HEROES.find((h) => h.id === id)?.name} +${n}`);
    return { text: `${parts.join(" · ")} (${Math.round(spent).toLocaleString()}G) → 벽 돌파 예상`, action: { kind: "tab", tab: "heroes" } };
  }
  const starUp = party.find((id) => {
    const stars = effectiveStars(progress.allyStars[id], titans.heroes[id]);
    const cost = shardCostToNext(id, stars);
    return cost !== null && (progress.allyShards[id] ?? 0) >= cost;
  });
  if (starUp) return { text: `${HEROES.find((h) => h.id === starUp)?.name} ★승급 가능 — 조각이 모였습니다`, action: { kind: "tab", tab: "heroes" } };
  if (progress.bestForgeLevel >= 15) return { text: "무한 재련으로 배율을 올리세요 (+0.02/회)", action: { kind: "content", content: "forge" } };
  return { text: `대장간 강화 +${progress.bestForgeLevel} → 배율을 올리고 다시`, action: { kind: "content", content: "forge" } };
}

export function recommendNext(
  progress: CharacterProgress,
  titans: TitansSave,
  events: EventSave,
  extra: { wall?: WallInfo | null; equipped: Partial<Record<TitanSkillSlot, TitanSkillId>>; now?: number },
): Recommendation | null {
  const now = extra.now ?? Date.now();
  // 1. 수령 가능
  const expeditionDone = progress.expeditions.filter((e) => e.endsAt <= now).length;
  if (expeditionDone > 0) {
    return { id: "expedition", tone: "claim", title: `파견 ${expeditionDone}건 귀환`, desc: "동료 조각·강화석이 도착했습니다", cta: "받기", action: { kind: "tab", tab: "heroes" } };
  }
  const journal = JOURNAL_ENTRIES.find((e) => { const p = e.progressOf(progress); return p.current >= p.goal && !progress.journalClaimed.includes(e.id); });
  if (journal) {
    return { id: `journal-${journal.id}`, tone: "claim", title: `원정 일지 「${journal.title}」 달성`, desc: journal.desc, cta: "보상 받기", action: { kind: "events", tab: "journal" } };
  }
  const starUp = ALLY_IDS.find((id) => {
    if (titans.heroes[id] <= 0) return false;
    const cost = shardCostToNext(id, effectiveStars(progress.allyStars[id], titans.heroes[id]));
    return cost !== null && (progress.allyShards[id] ?? 0) >= cost;
  });
  if (starUp) {
    return { id: `star-${starUp}`, tone: "claim", title: `${HEROES.find((h) => h.id === starUp)?.name} 승급 가능`, desc: "조각이 모였습니다 — DPS 배율이 오릅니다", cta: "승급", action: { kind: "tab", tab: "heroes" } };
  }
  // 2. 벽 (정량)
  if (extra.wall && extra.wall.ratio < 1) {
    const fix = cheapestWallFix(extra.wall, progress, titans);
    return { id: "wall", tone: "wall", title: `Stage ${extra.wall.stage} 벽 · ${Math.round(extra.wall.ratio * 100)}%`, desc: fix.text, cta: "가기", action: fix.action, meter: extra.wall.ratio };
  }
  // 3. 오늘 남은 무료
  if (progress.onboardingStep >= 4) {
    if (events.riftAttempts < RIFT_ATTEMPTS) {
      return { id: "rift", tone: "free", title: `차원 균열 ${RIFT_ATTEMPTS - events.riftAttempts}회 남음`, desc: "방치 2시간을 즉시 정산합니다", cta: "균열", action: { kind: "events", tab: "rift" } };
    }
    if (!dailyMissionsDone(events)) {
      return { id: "mission", tone: "free", title: "오늘의 토벌령 미수령", desc: "4개 콘텐츠 보상을 챙기세요", cta: "토벌령", action: { kind: "events", tab: "daily" } };
    }
  }
  // 4. 성장 병목 R/M/T
  const rate = idleRate(progress, extra.equipped);
  const mult = idleMultiplier(progress);
  const cap = idleCapHours(progress);
  const ceiling = stageCeilingFor(progress.pioneeredArea);
  if (titans.stage >= ceiling && nextAreaName(progress.pioneeredArea)) {
    return { id: "gate", tone: "grow", title: `${nextAreaName(progress.pioneeredArea)} 개척 필요`, desc: "화살 원정을 클리어하면 사냥터가 열립니다", cta: "원정", action: { kind: "content", content: "dodge" } };
  }
  if (progress.bestForgeLevel < 15 && mult < IDLE.multCap) {
    return { id: "forge", tone: "grow", title: `대장간 강화 +${progress.bestForgeLevel}`, desc: `방치 배율 ×${mult.toFixed(2)} — 강화 1단계당 +0.06`, cta: "대장간", action: { kind: "content", content: "forge" } };
  }
  if (rate < IDLE.rateCap) {
    return { id: "beat", tone: "grow", title: `방치 효율 ${(rate * 100).toFixed(0)}%`, desc: "비트 수련으로 스킬 슬롯을 해금하세요", cta: "연습실", action: { kind: "content", content: "beat" } };
  }
  if (cap < IDLE.hoursCap) {
    return { id: "dodge-cap", tone: "grow", title: `방치 시간 ${cap}h / ${IDLE.hoursCap}h`, desc: "화살 원정 스테이지를 클리어하면 +1시간", cta: "원정", action: { kind: "content", content: "dodge" } };
  }
  // 5. 장기
  return { id: "tower", tone: "grow", title: "끝없는 성벽 등반", desc: `최고 ${progress.towerBestFloor}층 · 100층당 배율 +0.05`, cta: "성벽", action: { kind: "content", content: "dodge" } };
}
