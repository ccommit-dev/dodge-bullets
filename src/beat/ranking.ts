import { weekKey } from "../events/shadowArena";
import { bestScoreOverall, type BeatRpgProgress } from "./rpg";

/**
 * 비트 주간 랭킹 (계획안 §7) — P1 은 로컬 기록 + 시드 Mock 상위권. 서버 랭킹은 P3.
 * Mock 점수는 내 최고 점수를 기준으로 배치해 "조금 더 하면 오른다"가 보이게 한다. 주가 바뀌면 이름·점수가 바뀐다.
 */
export type RankRow = { rank: number; name: string; score: number; me: boolean };

/** 마지막 단어가 그림자 원화 직업(shadowArena.PORTRAIT)과 맞아 아바타가 서로 다르다 */
const NAMES = ["별빛 검객", "리듬 추적자", "고요한 고행자", "박자 수문장", "새벽 방랑자", "드롭 집행자", "레인 관측자", "강철 대장장이"];
const MULTS = [1.85, 1.5, 1.28, 1.12, 0.92, 0.74];

function hash(s: string): number { let h = 2166136261; for (let i = 0; i < s.length; i += 1) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed: number): () => number { let x = seed || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; }

export function weeklyRanking(progress: Pick<BeatRpgProgress, "records">, userHash: string, week = weekKey()): { rows: RankRow[]; myRank: number; myScore: number; nextTarget: number | null } {
  const myScore = bestScoreOverall(progress);
  const base = Math.max(myScore, 4000);
  const r = rng(hash(week + ":" + userHash));
  const used = new Set<number>();
  const rivals = MULTS.map((m) => {
    let ni = Math.floor(r() * NAMES.length); while (used.has(ni)) ni = (ni + 1) % NAMES.length; used.add(ni);
    return { name: NAMES[ni], score: Math.round((base * m * (0.96 + r() * 0.08)) / 10) * 10, me: false };
  });
  const all = [...rivals, { name: "나", score: myScore, me: true }].sort((a, b) => b.score - a.score);
  const rows = all.map((x, i) => ({ ...x, rank: i + 1 }));
  const mine = rows.find((x) => x.me)!;
  const above = rows.filter((x) => !x.me && x.score > myScore).sort((a, b) => a.score - b.score)[0];
  return { rows, myRank: mine.rank, myScore, nextTarget: above ? above.score : null };
}
