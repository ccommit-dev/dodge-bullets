import type { StageDef } from "./types";

const platforms = [
  { x: 0.12, y: 0.72, w: 0.2, h: 0.025 },
  { x: 0.42, y: 0.58, w: 0.18, h: 0.025 },
  { x: 0.7, y: 0.7, w: 0.2, h: 0.025 },
];

/** Short expeditions: immediate pressure → escalation → five-second escape climax. */
export const STAGES: StageDef[] = [
  {
    id: 1,
    name: "외곽 초소",
    durationMs: 30_000,
    baseReward: 370,
    speedMul: 1,
    spawnMul: 1,
    intro: "30초 안에 화살 폭풍을 돌파하세요",
    platforms: [],
    patterns: [
      { kind: "rain", atMs: 0, durationMs: 8_000, spawnMs: 590, speed: 310 },
      { kind: "aimed", atMs: 8_000, durationMs: 10_000, spawnMs: 510, speed: 390 },
      { kind: "cross", atMs: 18_000, durationMs: 7_000, spawnMs: 300, speed: 410 },
      { kind: "fan", atMs: 25_000, durationMs: 5_000, spawnMs: 490, speed: 455 },
    ],
  },
  {
    id: 2,
    name: "붉은 협곡",
    durationMs: 34_000,
    baseReward: 580,
    speedMul: 1.08,
    spawnMul: 1.14,
    intro: "조준 사격과 반사 화살이 퇴로를 압박합니다",
    platforms,
    patterns: [
      { kind: "side", atMs: 0, durationMs: 8_000, spawnMs: 390, speed: 370 },
      { kind: "aimed", atMs: 8_000, durationMs: 9_000, spawnMs: 480, speed: 410 },
      { kind: "ricochet", atMs: 17_000, durationMs: 12_000, spawnMs: 540, speed: 410 },
      { kind: "cross", atMs: 29_000, durationMs: 5_000, spawnMs: 225, speed: 470 },
    ],
  },
  {
    id: 3,
    name: "왕실 사격장",
    durationMs: 38_000,
    baseReward: 850,
    speedMul: 1.16,
    spawnMul: 1.22,
    intro: "부채꼴과 폭발 화살을 연속으로 돌파하세요",
    platforms,
    patterns: [
      { kind: "fan", atMs: 0, durationMs: 9_000, spawnMs: 700, speed: 410 },
      { kind: "sweep", atMs: 9_000, durationMs: 10_000, spawnMs: 330, speed: 430 },
      { kind: "explosive", atMs: 19_000, durationMs: 14_000, spawnMs: 650, speed: 430 },
      { kind: "burst", atMs: 33_000, durationMs: 5_000, spawnMs: 120, speed: 495 },
    ],
  },
  {
    id: 4,
    name: "검은 성문",
    durationMs: 45_000,
    baseReward: 1_220,
    speedMul: 1.24,
    spawnMul: 1.3,
    intro: "모든 정예 패턴을 뚫고 성문에서 탈출하세요",
    platforms,
    patterns: [
      { kind: "aimed", atMs: 0, durationMs: 9_000, spawnMs: 430, speed: 430 },
      { kind: "ricochet", atMs: 9_000, durationMs: 10_000, spawnMs: 500, speed: 435 },
      { kind: "fan", atMs: 19_000, durationMs: 10_000, spawnMs: 620, speed: 455 },
      { kind: "explosive", atMs: 29_000, durationMs: 11_000, spawnMs: 520, speed: 470 },
      { kind: "burst", atMs: 40_000, durationMs: 5_000, spawnMs: 88, speed: 535 },
    ],
  },
];

export function getStage(index: number): StageDef {
  return STAGES[Math.min(Math.max(0, index), STAGES.length - 1)];
}

export function isLastStage(index: number): boolean {
  return index >= STAGES.length - 1;
}
