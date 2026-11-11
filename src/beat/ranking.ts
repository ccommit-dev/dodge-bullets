import { weekKey } from "../events/shadowArena";
import { bestScoreOverall, type BeatRpgProgress } from "./rpg";

/**
 * 비트 수련 목표 점수판 — 예전엔 라이벌 점수가 내 최고점에 비례해(×0.74~1.85) 1위가 불가능했다. 이제 고정 목표 사다리(이름은 주마다 바뀐다).
 * 목표는 실측 점수에 맞췄다(2026-11-11 시뮬: 완벽 6.4천~5만 · 숙련 5.3천~3.6만 · 초보 4.3천~2.1만) — 1위 4만은 긴 곡을 거의 완벽하게 쳐야 닿는다.
 * 내 점수는 역대 최고 기록이다(서버 랭킹 아님) — 화면에도 '목표 점수'로 적는다.
 */
export type RankRow = { rank: number; name: string; score: number; me: boolean };

/** 마지막 단어가 그림자 원화 직업(shadowArena.PORTRAIT)과 맞아 아바타가 서로 다르다 */
const NAMES = ["별빛 검객", "리듬 추적자", "고요한 고행자", "박자 수문장", "새벽 방랑자", "드롭 집행자", "레인 관측자", "강철 대장장이"];
const TIER_TARGETS = [40000, 31000, 23000, 16000, 10000, 6000];

function hash(s: string): number { let h = 2166136261; for (let i = 0; i < s.length; i += 1) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed: number): () => number { let x = seed || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; }

export function weeklyRanking(progress: Pick<BeatRpgProgress, "records">, userHash: string, week = weekKey()): { rows: RankRow[]; myRank: number; myScore: number; nextTarget: number | null } {
  const myScore = bestScoreOverall(progress);
  const r = rng(hash(week + ":" + userHash));
  const used = new Set<number>();
  const rivals = TIER_TARGETS.map((target) => {
    let ni = Math.floor(r() * NAMES.length); while (used.has(ni)) ni = (ni + 1) % NAMES.length; used.add(ni);
    return { name: NAMES[ni], score: Math.round((target * (0.96 + r() * 0.08)) / 10) * 10, me: false };
  });
  const all = [...rivals, { name: "나", score: myScore, me: true }].sort((a, b) => (b.score - a.score) || (a.me ? -1 : b.me ? 1 : 0));
  const rows = all.map((x, i) => ({ ...x, rank: i + 1 }));
  const mine = rows.find((x) => x.me)!;
  const above = rows.filter((x) => !x.me && x.score > myScore).sort((a, b) => a.score - b.score)[0];
  return { rows, myRank: mine.rank, myScore, nextTarget: above ? above.score : null };
}

/** 전 곡 마스터리 메달 요약 — 정직한 개인 성장 지표 */
export function beatMasteryMedals(progress: Pick<BeatRpgProgress, "grades">): { s: number; a: number; b: number; total: number } {
  const vals = Object.values(progress.grades ?? {});
  return {
    s: vals.filter((g) => g === "S").length,
    a: vals.filter((g) => g === "A").length,
    b: vals.filter((g) => g === "B").length,
    total: vals.length,
  };
}
