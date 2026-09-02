/**
 * 주간 도전 3종 (RETENTION_DESIGN F) — 요일 균열과 같은 주차 키로 회전하는 7일 리듬.
 * 카운터는 EventSave(weeklyRiftRuns · weeklyMissionDays · weeklyBossKills)가 든다.
 */
import type { EventSave } from "./eventSave";

export type WeeklyReward = { kind: "gems"; amount: number } | { kind: "shards"; amount: number } | { kind: "boost"; hours: number };

export type WeeklyChallenge = {
  id: string;
  title: string;
  goal: number;
  progressOf: (s: EventSave) => number;
  reward: WeeklyReward;
};

/** 주차 패리티로 두 세트가 번갈아 — 매주 같은 숫자가 아니게 */
export function weeklyChallenges(week: string): WeeklyChallenge[] {
  const parity = [...week].reduce((a, c) => a + c.charCodeAt(0), 0) % 2;
  return parity === 0
    ? [
        { id: "rift-5", title: "차원 균열 5회", goal: 5, progressOf: (s) => s.weeklyRiftRuns, reward: { kind: "shards", amount: 10 } },
        { id: "mission-3", title: "토벌령 3일 완주", goal: 3, progressOf: (s) => s.weeklyMissionDays, reward: { kind: "gems", amount: 30 } },
        { id: "boss-15", title: "보스 15마리 처치", goal: 15, progressOf: (s) => s.weeklyBossKills, reward: { kind: "boost", hours: 4 } },
      ]
    : [
        { id: "rift-8", title: "차원 균열 8회", goal: 8, progressOf: (s) => s.weeklyRiftRuns, reward: { kind: "boost", hours: 4 } },
        { id: "mission-5", title: "토벌령 5일 완주", goal: 5, progressOf: (s) => s.weeklyMissionDays, reward: { kind: "shards", amount: 12 } },
        { id: "boss-30", title: "보스 30마리 처치", goal: 30, progressOf: (s) => s.weeklyBossKills, reward: { kind: "gems", amount: 40 } },
      ];
}

export function weeklyRewardLabel(r: WeeklyReward): string {
  return r.kind === "gems" ? `보석 ${r.amount}` : r.kind === "shards" ? `무작위 동료 조각 ${r.amount}` : `방치 2배 가속 ${r.hours}시간`;
}
