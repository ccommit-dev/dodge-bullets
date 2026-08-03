import type { StageDef } from "./types";

/**
 * Level design curve (Prompt F):
 * 1 tutorial → 2–3 pattern learn → 4–5 pressure → 6 combo
 * Clear rewards roughly fund ~1 upgrade step early-mid.
 */
export const STAGES: StageDef[] = [
  {
    id: 1,
    name: "워밍업",
    durationMs: 22000,
    baseReward: 50,
    speedMul: 0.75,
    spawnMul: 0.7,
    intro: "느린 화살 빗발 — 좌우로만 피하세요",
    platforms: [],
    patterns: [
      { kind: "rest", atMs: 0, durationMs: 1500 },
      { kind: "rain", atMs: 1500, durationMs: 18000, spawnMs: 900, speed: 160 },
      { kind: "rest", atMs: 19500, durationMs: 2500 },
    ],
  },
  {
    id: 2,
    name: "횡풍",
    durationMs: 26000,
    baseReward: 70,
    speedMul: 0.9,
    spawnMul: 0.85,
    intro: "옆에서 날아오는 화살에 익숙해지세요",
    platforms: [{ x: 0.2, y: 0.72, w: 0.28, h: 0.025 }],
    patterns: [
      { kind: "side", atMs: 800, durationMs: 10000, spawnMs: 700, speed: 220 },
      { kind: "rain", atMs: 11000, durationMs: 10000, spawnMs: 750, speed: 200 },
      { kind: "rest", atMs: 21000, durationMs: 5000 },
    ],
  },
  {
    id: 3,
    name: "교차",
    durationMs: 28000,
    baseReward: 90,
    speedMul: 1,
    spawnMul: 1,
    intro: "위·옆이 동시에 — 이동속도 강화 추천",
    platforms: [
      { x: 0.12, y: 0.7, w: 0.22, h: 0.025 },
      { x: 0.66, y: 0.62, w: 0.22, h: 0.025 },
    ],
    patterns: [
      { kind: "cross", atMs: 500, durationMs: 22000, spawnMs: 620, speed: 240 },
      { kind: "rest", atMs: 22500, durationMs: 5500 },
    ],
  },
  {
    id: 4,
    name: "바닥쓸기",
    durationMs: 30000,
    baseReward: 110,
    speedMul: 1.1,
    spawnMul: 1.05,
    intro: "낮은 화살이 쓸고 지나갑니다 — 점프!",
    platforms: [
      { x: 0.35, y: 0.58, w: 0.3, h: 0.025 },
      { x: 0.1, y: 0.75, w: 0.18, h: 0.025 },
      { x: 0.72, y: 0.75, w: 0.18, h: 0.025 },
    ],
    patterns: [
      { kind: "sweep", atMs: 600, durationMs: 12000, spawnMs: 680, speed: 260 },
      { kind: "rain", atMs: 13000, durationMs: 10000, spawnMs: 520, speed: 280 },
      { kind: "rest", atMs: 23000, durationMs: 2000 },
      { kind: "burst", atMs: 25000, durationMs: 4000, spawnMs: 180, speed: 300 },
    ],
  },
  {
    id: 5,
    name: "폭풍전야",
    durationMs: 32000,
    baseReward: 140,
    speedMul: 1.2,
    spawnMul: 1.15,
    intro: "가짜 휴식 뒤 폭격 — 대시가 빛납니다",
    platforms: [
      { x: 0.15, y: 0.68, w: 0.2, h: 0.025 },
      { x: 0.45, y: 0.55, w: 0.2, h: 0.025 },
      { x: 0.7, y: 0.68, w: 0.2, h: 0.025 },
    ],
    patterns: [
      { kind: "rain", atMs: 400, durationMs: 8000, spawnMs: 480, speed: 300 },
      { kind: "rest", atMs: 8400, durationMs: 2800 },
      { kind: "burst", atMs: 11200, durationMs: 6000, spawnMs: 140, speed: 340 },
      { kind: "cross", atMs: 18000, durationMs: 10000, spawnMs: 420, speed: 320 },
      { kind: "rest", atMs: 28000, durationMs: 4000 },
    ],
  },
  {
    id: 6,
    name: "결전",
    durationMs: 36000,
    baseReward: 180,
    speedMul: 1.35,
    spawnMul: 1.25,
    intro: "모든 패턴 조합 — 슬로우·생명이 진가를 발휘",
    platforms: [
      { x: 0.08, y: 0.72, w: 0.16, h: 0.025 },
      { x: 0.3, y: 0.58, w: 0.16, h: 0.025 },
      { x: 0.52, y: 0.46, w: 0.16, h: 0.025 },
      { x: 0.74, y: 0.6, w: 0.18, h: 0.025 },
    ],
    patterns: [
      { kind: "cross", atMs: 300, durationMs: 9000, spawnMs: 380, speed: 340 },
      { kind: "sweep", atMs: 9500, durationMs: 8000, spawnMs: 400, speed: 360 },
      { kind: "rest", atMs: 17500, durationMs: 2000 },
      { kind: "burst", atMs: 19500, durationMs: 7000, spawnMs: 120, speed: 380 },
      { kind: "rain", atMs: 27000, durationMs: 7000, spawnMs: 300, speed: 360 },
      { kind: "rest", atMs: 34000, durationMs: 2000 },
    ],
  },
];

export function getStage(index: number): StageDef {
  return STAGES[Math.min(Math.max(0, index), STAGES.length - 1)];
}

export function isLastStage(index: number): boolean {
  return index >= STAGES.length - 1;
}
