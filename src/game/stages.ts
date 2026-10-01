import type { StageDef } from "./types";

const platforms = [
  { x: 0.04, y: 0.89, w: 0.28, h: 0.025 },
  { x: 0.35, y: 0.84, w: 0.28, h: 0.025 },
  { x: 0.66, y: 0.89, w: 0.3, h: 0.025 },
];

/** Short expeditions: immediate pressure → escalation → five-second escape climax.
 * 수치는 검객 봇 시뮬(scripts/dodge-sim.mjs)로 재조정 — 스윙 순간 앞쪽만 베는 규칙에서 1·2스테이지 5/5 클리어, 3·4 는 도전 구간. */
/** 웨이브 배너용 패턴 이름 (HUD "WAVE n · 조준 사격") */
export const PATTERN_LABEL: Record<string, string> = { rain: "슬라임 떼", aimed: "늑대 돌진", cross: "교차 습격", fan: "고블린 떼", side: "측면 기습", ricochet: "오우거 돌진", sweep: "휩쓸기", explosive: "비룡 습격", burst: "연속 습격" };

/** 스테이지의 패턴 구간 = 웨이브. 경과 시간으로 현재 웨이브(1부터)와 총 수를 돌려준다 (HUD "WAVE n/N", 보스는 별도) */
export function waveAt(stage: Pick<StageDef, "patterns">, elapsedMs: number): { index: number; count: number } {
  const count = stage.patterns.length;
  let index = 0;
  for (let i = 0; i < count; i += 1) if (elapsedMs >= stage.patterns[i].atMs) index = i + 1;
  return { index: Math.max(1, index), count };
}

export const STAGES: StageDef[] = [
  {
    id: 1,
    name: "외곽 초소 돌파",
    durationMs: 32_000,
    baseReward: 370,
    speedMul: 0.86,
    spawnMul: 0.78,
    intro: "활이 알아서 몬스터를 쏜다 — 방어막에 닿기 전에 떨구고, 새는 놈은 옆으로 피해라. 떨어진 결정이 대장간 강화석이 된다",
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
    name: "붉은 협곡 추격전",
    durationMs: 38_000,
    baseReward: 580,
    speedMul: 0.92,   // 0.94 → 0.92 (2026-10-01): 좌우 이동만 남은 뒤 S2 봇 피격 1.6 → 게이트 1.5 안으로
    spawnMul: 0.7,    // 0.9 → 0.7 (2026-10-01 방어막): 오우거 두드림에 S2 붕괴 2회(피격 2.0) → 1.0, 게이트 1.5 안으로
    intro: "그림자 늑대는 붉은 선이 사라지는 순간 돌진한다 — 결정을 모으며 기습대를 따돌려라",
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
    name: "왕실 사격장 탈환",
    durationMs: 44_000,
    baseReward: 850,
    speedMul: 1.02,
    spawnMul: 1.02,
    intro: "폭염 비룡은 결정 덩어리다 — 폭발 자리를 피하며 정예 보급 상자를 탈환하라",
    platforms,
    patterns: [
      { kind: "fan", atMs: 0, durationMs: 9_000, spawnMs: 720, speed: 380 },
      { kind: "sweep", atMs: 9_000, durationMs: 10_000, spawnMs: 330, speed: 430 },
      { kind: "explosive", atMs: 19_000, durationMs: 14_000, spawnMs: 650, speed: 430 },
      { kind: "burst", atMs: 33_000, durationMs: 5_000, spawnMs: 150, speed: 470 },
    ],
  },
  {
    id: 4,
    name: "검은 성문 탈출",
    durationMs: 60_000,
    baseReward: 1_220,
    speedMul: 1.1,
    spawnMul: 1.12,
    intro: "심연의 타이탄이 성문 위에 선다 — 끝까지 쓰러뜨리면 활시위(대장간 재료)를 얻는다",
    platforms,
    patterns: [
      { kind: "aimed", atMs: 0, durationMs: 9_000, spawnMs: 430, speed: 430 },
      { kind: "ricochet", atMs: 9_000, durationMs: 10_000, spawnMs: 500, speed: 435 },
      { kind: "fan", atMs: 19_000, durationMs: 10_000, spawnMs: 660, speed: 420 },
      { kind: "explosive", atMs: 29_000, durationMs: 11_000, spawnMs: 520, speed: 470 },
      { kind: "cross", atMs: 40_000, durationMs: 10_000, spawnMs: 250, speed: 470 },
      { kind: "burst", atMs: 50_000, durationMs: 10_000, spawnMs: 130, speed: 510 },
    ],
  },
];

/**
 * 끝없는 성벽 — 임플란트 타워 대응. 4스테이지를 전부 클리어하면 열린다.
 *
 * `stageIndex >= STAGES.length`를 성벽 층으로 해석해 `getStage`가 층을 즉석에서 만들어 낸다.
 * 월드·화살 로직은 전부 `getStage(world.stageIndex)`만 보므로 등반 모드가 기존 루프에 그대로 얹힌다.
 */
export const TOWER_START_INDEX = STAGES.length;

/** 층당 난이도 상승률. 1.04^25 ≈ 2.67배 — 25층이 한 사이클 느낌이 되도록 잡았다. */
const TOWER_STEP = 1.04;

export function isTowerIndex(index: number): boolean {
  return index >= TOWER_START_INDEX;
}

/** stageIndex → 성벽 층(1-based). 일반 스테이지면 0. */
export function towerFloorOf(index: number): number {
  return isTowerIndex(index) ? index - TOWER_START_INDEX + 1 : 0;
}

export function towerIndexOf(floor: number): number {
  return TOWER_START_INDEX + Math.max(1, Math.floor(floor)) - 1;
}

function towerStage(index: number): StageDef {
  const floor = towerFloorOf(index);
  const base = STAGES[STAGES.length - 1];
  const scale = Math.pow(TOWER_STEP, floor);
  return {
    id: 100 + floor,
    name: `끝없는 성벽 ${floor}층`,
    // 층당 30초 고정 — 짧은 사이클을 반복해 "한 층만 더"가 되게 한다.
    durationMs: 30_000,
    baseReward: Math.floor(base.baseReward * (0.55 + floor * 0.12)),
    speedMul: base.speedMul * scale,
    spawnMul: base.spawnMul * scale,
    intro: `${floor}층 · 30초 버티면 다음 층`,
    platforms: base.platforms,
    patterns: base.patterns,
  };
}

export function getStage(index: number): StageDef {
  if (isTowerIndex(index)) return towerStage(index);
  return STAGES[Math.max(0, index)];
}

/** 일반 원정의 마지막 스테이지인지. 성벽에는 마지막이 없다. */
export function isLastStage(index: number): boolean {
  return index === STAGES.length - 1;
}
