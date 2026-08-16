import type { StageDef } from "./types";

const platforms = [
  { x: 0.12, y: 0.72, w: 0.2, h: 0.025 },
  { x: 0.42, y: 0.58, w: 0.18, h: 0.025 },
  { x: 0.7, y: 0.7, w: 0.2, h: 0.025 },
];

/** 60-second expeditions: learn → pressure → choice window → escape climax. */
export const STAGES: StageDef[] = [
  {
    id: 1,
    name: "외곽 초소",
    durationMs: 60_000,
    baseReward: 230,
    speedMul: 1,
    spawnMul: 1,
    intro: "경고선을 보고 60초 동안 보급품을 회수하세요",
    platforms: [],
    patterns: [
      { kind: "rain", atMs: 0, durationMs: 15_000, spawnMs: 680, speed: 275 },
      { kind: "aimed", atMs: 15_000, durationMs: 15_000, spawnMs: 620, speed: 350 },
      { kind: "cross", atMs: 30_000, durationMs: 14_000, spawnMs: 330, speed: 365 },
      { kind: "rest", atMs: 44_000, durationMs: 3_000 },
      { kind: "fan", atMs: 47_000, durationMs: 13_000, spawnMs: 820, speed: 390 },
    ],
  },
  {
    id: 2,
    name: "붉은 협곡",
    durationMs: 60_000,
    baseReward: 360,
    speedMul: 1.08,
    spawnMul: 1.14,
    intro: "조준 사격과 반사 화살이 퇴로를 압박합니다",
    platforms,
    patterns: [
      { kind: "side", atMs: 0, durationMs: 12_000, spawnMs: 430, speed: 330 },
      { kind: "aimed", atMs: 12_000, durationMs: 14_000, spawnMs: 590, speed: 365 },
      { kind: "ricochet", atMs: 26_000, durationMs: 18_000, spawnMs: 700, speed: 350 },
      { kind: "rest", atMs: 44_000, durationMs: 3_000 },
      { kind: "cross", atMs: 47_000, durationMs: 13_000, spawnMs: 270, speed: 390 },
    ],
  },
  {
    id: 3,
    name: "왕실 사격장",
    durationMs: 60_000,
    baseReward: 520,
    speedMul: 1.16,
    spawnMul: 1.22,
    intro: "부채꼴과 폭발 화살을 연속으로 돌파하세요",
    platforms,
    patterns: [
      { kind: "fan", atMs: 0, durationMs: 14_000, spawnMs: 930, speed: 365 },
      { kind: "sweep", atMs: 14_000, durationMs: 13_000, spawnMs: 390, speed: 390 },
      { kind: "explosive", atMs: 27_000, durationMs: 17_000, spawnMs: 820, speed: 380 },
      { kind: "rest", atMs: 44_000, durationMs: 3_000 },
      { kind: "burst", atMs: 47_000, durationMs: 13_000, spawnMs: 145, speed: 420 },
    ],
  },
  {
    id: 4,
    name: "검은 성문",
    durationMs: 60_000,
    baseReward: 760,
    speedMul: 1.24,
    spawnMul: 1.3,
    intro: "모든 정예 패턴을 뚫고 성문에서 탈출하세요",
    platforms,
    patterns: [
      { kind: "aimed", atMs: 0, durationMs: 11_000, spawnMs: 500, speed: 390 },
      { kind: "ricochet", atMs: 11_000, durationMs: 11_000, spawnMs: 580, speed: 390 },
      { kind: "fan", atMs: 22_000, durationMs: 11_000, spawnMs: 760, speed: 410 },
      { kind: "explosive", atMs: 33_000, durationMs: 11_000, spawnMs: 650, speed: 420 },
      { kind: "rest", atMs: 44_000, durationMs: 3_000 },
      { kind: "burst", atMs: 47_000, durationMs: 13_000, spawnMs: 105, speed: 455 },
    ],
  },
];

export function getStage(index: number): StageDef {
  return STAGES[Math.min(Math.max(0, index), STAGES.length - 1)];
}

export function isLastStage(index: number): boolean {
  return index >= STAGES.length - 1;
}
