/**
 * 주인공 승급전 (2026-11-11, 슬레이어 키우기 비교표 사냥터 2번) — 사냥터 최고 층이 등급 문턱에 닿으면 수호자와 한 판.
 * 이기면 등급이 오르고 이름표가 바뀌며 주인공 공격(탭 · 스킬 · 자동 공격)이 영구로 오른다. 환생해도 남는다(CharacterProgress.heroRank).
 *
 * 보너스는 주인공에게만 — 동료 · 펫 · 방치 산출은 그대로라 밸런스 흔들림이 작다(최대 +50%, 85층).
 * 수호자 체력 = 문턱 바로 아래 층 대장의 1.1배 · 시간 = 대장 시간 그대로: 그 층 대장을 잡은 화력이면 조금만 더 키워 넘는다.
 * 얼굴은 지난 지역의 대장 — 새 그림 없이 "그 지역의 수문장"으로 읽힌다.
 */
import { HUNTING_AREAS, monsterHp, type HuntingAreaDef } from "./model";
import { HUNT_BOSSES } from "./bestiary";

export type HeroRankDef = {
  rank: number;
  title: string;
  /** 사냥터 최고 층이 여기 닿으면 도전 */
  unlockStage: number;
  /** 주인공 공격 보너스(누적 아님 — 그 등급의 값) */
  atkBonus: number;
  /** 첫 돌파 보석 */
  gems: number;
  color: string;
  /** 이름표 글자색 — 어두운 알약 위라 밝은 색 */
  markColor: string;
  guardianArt: string;
  guardianName: string;
};

export const HERO_RANKS: readonly HeroRankDef[] = [
  { rank: 0, title: "수습 모험가", unlockStage: 1, atkBonus: 0, gems: 0, color: "#8a7a66", markColor: "#e7dccb", guardianArt: "", guardianName: "" },
  { rank: 1, title: "청동 파수꾼", unlockStage: 8, atkBonus: 0.06, gems: 30, color: "#b45309", markColor: "#fdba74", guardianArt: "thorn-boar-king", guardianName: "청동 수문장" },
  { rank: 2, title: "백은 기사", unlockStage: 16, atkBonus: 0.12, gems: 40, color: "#64748b", markColor: "#e2e8f0", guardianArt: "ancient-treant", guardianName: "백은 수호목" },
  { rank: 3, title: "황금 선봉장", unlockStage: 26, atkBonus: 0.2, gems: 50, color: "#b8860b", markColor: "#fde047", guardianArt: "ruin-sentinel", guardianName: "황금 파수 기사" },
  { rank: 4, title: "미스릴 집행관", unlockStage: 40, atkBonus: 0.28, gems: 60, color: "#0369a1", markColor: "#7dd3fc", guardianArt: "magma-golem", guardianName: "미스릴 거신" },
  { rank: 5, title: "오리할콘 용사", unlockStage: 60, atkBonus: 0.38, gems: 80, color: "#c2410c", markColor: "#fb923c", guardianArt: "fire-demon", guardianName: "오리할콘 마신" },
  { rank: 6, title: "오로라이트 전설", unlockStage: 85, atkBonus: 0.5, gems: 100, color: "#7e22ce", markColor: "#d8b4fe", guardianArt: "bone-dragon", guardianName: "오로라이트 고룡" },
];

export const HERO_RANK_MAX = HERO_RANKS.length - 1;
export const GUARDIAN_HP_RATE = 1.1;

export function normalizeHeroRank(value: unknown): number {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) ? Math.max(0, Math.min(HERO_RANK_MAX, n)) : 0;
}

export function heroRankDef(rank: number): HeroRankDef {
  return HERO_RANKS[normalizeHeroRank(rank)];
}

export function nextHeroRank(rank: number): HeroRankDef | null {
  const cur = normalizeHeroRank(rank);
  return cur < HERO_RANK_MAX ? HERO_RANKS[cur + 1] : null;
}

/** 다음 등급에 도전할 수 있는가 — 최고 층이 문턱에 닿았는가 */
export function canChallengeRank(rank: number, bestStage: number): boolean {
  const next = nextHeroRank(rank);
  return !!next && Math.floor(bestStage) >= next.unlockStage;
}

/** 주인공 공격 배수 — 탭 · 스킬 · 자동 공격에 곱한다 */
export function heroRankAtkMul(rank: number): number {
  return 1 + heroRankDef(rank).atkBonus;
}

export function guardianHp(targetRank: number): number {
  const def = heroRankDef(targetRank);
  return Math.max(20, Math.floor(monsterHp(Math.max(1, def.unlockStage - 1), true) * GUARDIAN_HP_RATE));
}

/** 수호자 얼굴 — 그 그림이 대장으로 나오는 지역과 층(그림 · 공격 방식을 고를 때만 쓴다) */
export function guardianFace(targetRank: number): { area: HuntingAreaDef; stage: number; art: string; name: string } {
  const def = heroRankDef(Math.max(1, targetRank));
  for (const area of HUNTING_AREAS) {
    const idx = (HUNT_BOSSES[area.id] ?? []).findIndex((m) => m.art === def.guardianArt);
    if (idx >= 0) return { area, stage: area.stageFrom + idx, art: def.guardianArt, name: def.guardianName };
  }
  const area = HUNTING_AREAS[HUNTING_AREAS.length - 1];
  return { area, stage: area.stageFrom, art: (HUNT_BOSSES[area.id] ?? [])[0]?.art ?? "", name: def.guardianName };
}
