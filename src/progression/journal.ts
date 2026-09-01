/**
 * 원정 일지 (CRUMBLE_GAP §6) — 배틀패스의 "무료 트랙만" 변형.
 *
 * 시즌도 리셋도 없다. 누적 지표 10칸짜리 마일스톤 트랙이며 보상은 전부
 * 기존 재화다. "다음 칸까지 얼마 안 남았네"가 만드는 세션 연장 효과가 목적.
 */
import { PET_IDS } from "../titans/pets";
import { totalStars } from "./collection";
import type { CharacterProgress } from "./model";

export type JournalReward =
  | { kind: "gems"; amount: number }
  | { kind: "shards"; amount: number }
  | { kind: "materials"; amount: number }
  | { kind: "boost"; hours: number };

export type JournalEntry = {
  id: string;
  title: string;
  desc: string;
  reward: JournalReward;
  /** 현재 진행도 / 목표 */
  progressOf: (p: CharacterProgress) => { current: number; goal: number };
};

function killTotal(p: CharacterProgress): number {
  return Object.values(p.monsterKills).reduce((a, b) => a + b, 0);
}

export const JOURNAL_ENTRIES: JournalEntry[] = [
  {
    id: "kills-500",
    title: "첫 사냥꾼",
    desc: "몬스터 500마리 처치",
    reward: { kind: "gems", amount: 30 },
    progressOf: (p) => ({ current: killTotal(p), goal: 500 }),
  },
  {
    id: "forge-10",
    title: "달궈진 모루",
    desc: "대장간 강화 +10 달성",
    reward: { kind: "materials", amount: 40 },
    progressOf: (p) => ({ current: p.bestForgeLevel, goal: 10 }),
  },
  {
    id: "tower-30",
    title: "성벽 위의 바람",
    desc: "끝없는 성벽 30층 등반",
    reward: { kind: "gems", amount: 50 },
    progressOf: (p) => ({ current: p.towerBestFloor, goal: 30 }),
  },
  {
    id: "stars-3",
    title: "빛나는 견장",
    desc: "동료 성급 합 ★3",
    reward: { kind: "shards", amount: 15 },
    progressOf: (p) => ({ current: totalStars(p), goal: 3 }),
  },
  {
    id: "kills-2000",
    title: "사냥터의 지배자",
    desc: "몬스터 2,000마리 처치",
    reward: { kind: "boost", hours: 8 },
    progressOf: (p) => ({ current: killTotal(p), goal: 2000 }),
  },
  {
    id: "pet-1",
    title: "도감의 아이",
    desc: "펫 1마리 부화",
    reward: { kind: "gems", amount: 50 },
    progressOf: (p) => ({
      current: PET_IDS.filter((id) => (p.pets[id] ?? 0) > 0).length,
      goal: 1,
    }),
  },
  {
    id: "pioneer-4",
    title: "개척자의 길",
    desc: "사냥터 4지역 개척",
    reward: { kind: "shards", amount: 25 },
    progressOf: (p) => ({ current: p.pioneeredArea, goal: 4 }),
  },
  {
    id: "forge-15",
    title: "전설의 대장장이",
    desc: "대장간 강화 +15 달성",
    reward: { kind: "gems", amount: 80 },
    progressOf: (p) => ({ current: p.bestForgeLevel, goal: 15 }),
  },
  {
    id: "rebirth-1",
    title: "다시 태어난 자",
    desc: "환생 1회",
    reward: { kind: "boost", hours: 12 },
    progressOf: (p) => ({ current: p.rebirthCount, goal: 1 }),
  },
  {
    id: "tower-100",
    title: "끝없는 등반가",
    desc: "끝없는 성벽 100층 등반",
    reward: { kind: "gems", amount: 120 },
    progressOf: (p) => ({ current: p.towerBestFloor, goal: 100 }),
  },
];

export function journalRewardLabel(reward: JournalReward): string {
  switch (reward.kind) {
    case "gems":
      return `보석 ${reward.amount}`;
    case "shards":
      return `무작위 동료 조각 ${reward.amount}`;
    case "materials":
      return `강화석 ${reward.amount}`;
    case "boost":
      return `방치 2배 가속 ${reward.hours}시간`;
  }
}
