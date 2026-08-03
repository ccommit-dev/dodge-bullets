import type { StageDef } from "./types";

/**
 * Pace-first curve: short stages, almost no rest, early pressure.
 * Clear every ~12–18s → frequent reward loop.
 */
export const STAGES: StageDef[] = [
  {
    id: 1,
    name: "워밍업",
    durationMs: 14000,
    baseReward: 55,
    speedMul: 1,
    spawnMul: 1.05,
    intro: "바로 빗발 — 좌우로 피하세요",
    platforms: [],
    patterns: [
      { kind: "rain", atMs: 0, durationMs: 14000, spawnMs: 420, speed: 260 },
    ],
  },
  {
    id: 2,
    name: "횡풍",
    durationMs: 15000,
    baseReward: 75,
    speedMul: 1.1,
    spawnMul: 1.15,
    intro: "옆·위 교차 — 발판을 쓰세요",
    platforms: [{ x: 0.2, y: 0.72, w: 0.28, h: 0.025 }],
    patterns: [
      { kind: "side", atMs: 0, durationMs: 7000, spawnMs: 380, speed: 300 },
      { kind: "rain", atMs: 7000, durationMs: 8000, spawnMs: 360, speed: 290 },
    ],
  },
  {
    id: 3,
    name: "교차",
    durationMs: 16000,
    baseReward: 95,
    speedMul: 1.2,
    spawnMul: 1.25,
    intro: "위·옆 동시 — 이동속도 강화 추천",
    platforms: [
      { x: 0.12, y: 0.7, w: 0.22, h: 0.025 },
      { x: 0.66, y: 0.62, w: 0.22, h: 0.025 },
    ],
    patterns: [
      { kind: "cross", atMs: 0, durationMs: 10000, spawnMs: 300, speed: 320 },
      { kind: "burst", atMs: 10000, durationMs: 6000, spawnMs: 110, speed: 360 },
    ],
  },
  {
    id: 4,
    name: "바닥쓸기",
    durationMs: 16000,
    baseReward: 120,
    speedMul: 1.3,
    spawnMul: 1.3,
    intro: "낮은 화살 — 점프·대시!",
    platforms: [
      { x: 0.35, y: 0.58, w: 0.3, h: 0.025 },
      { x: 0.1, y: 0.75, w: 0.18, h: 0.025 },
      { x: 0.72, y: 0.75, w: 0.18, h: 0.025 },
    ],
    patterns: [
      { kind: "sweep", atMs: 0, durationMs: 7000, spawnMs: 340, speed: 340 },
      { kind: "rain", atMs: 7000, durationMs: 5000, spawnMs: 280, speed: 350 },
      { kind: "burst", atMs: 12000, durationMs: 4000, spawnMs: 95, speed: 390 },
    ],
  },
  {
    id: 5,
    name: "폭풍전야",
    durationMs: 17000,
    baseReward: 150,
    speedMul: 1.4,
    spawnMul: 1.4,
    intro: "짧은 숨 뒤 폭격 — 대시 필수",
    platforms: [
      { x: 0.15, y: 0.68, w: 0.2, h: 0.025 },
      { x: 0.45, y: 0.55, w: 0.2, h: 0.025 },
      { x: 0.7, y: 0.68, w: 0.2, h: 0.025 },
    ],
    patterns: [
      { kind: "rain", atMs: 0, durationMs: 5000, spawnMs: 260, speed: 370 },
      { kind: "rest", atMs: 5000, durationMs: 500 },
      { kind: "burst", atMs: 5500, durationMs: 5500, spawnMs: 85, speed: 410 },
      { kind: "cross", atMs: 11000, durationMs: 6000, spawnMs: 240, speed: 390 },
    ],
  },
  {
    id: 6,
    name: "결전",
    durationMs: 18000,
    baseReward: 200,
    speedMul: 1.55,
    spawnMul: 1.5,
    intro: "풀콤보 — 슬로우·생명이 빛납니다",
    platforms: [
      { x: 0.08, y: 0.72, w: 0.16, h: 0.025 },
      { x: 0.3, y: 0.58, w: 0.16, h: 0.025 },
      { x: 0.52, y: 0.46, w: 0.16, h: 0.025 },
      { x: 0.74, y: 0.6, w: 0.18, h: 0.025 },
    ],
    patterns: [
      { kind: "cross", atMs: 0, durationMs: 5000, spawnMs: 220, speed: 400 },
      { kind: "sweep", atMs: 5000, durationMs: 4500, spawnMs: 240, speed: 420 },
      { kind: "burst", atMs: 9500, durationMs: 4500, spawnMs: 75, speed: 450 },
      { kind: "rain", atMs: 14000, durationMs: 4000, spawnMs: 180, speed: 430 },
    ],
  },
];

export function getStage(index: number): StageDef {
  return STAGES[Math.min(Math.max(0, index), STAGES.length - 1)];
}

export function isLastStage(index: number): boolean {
  return index >= STAGES.length - 1;
}
