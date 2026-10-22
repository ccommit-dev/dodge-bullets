/**
 * 도토리 탄약 합성 (2026-10-22, 사용자 /goal "아처 키우기에서 가져올 재미 1번 — 화살 합성 반복").
 * 사냥 중 도토리가 저절로 하나씩 생기고(칸 12), 같은 단계 둘을 합치면 한 단계 위가 된다. 합친 도토리를 출전 동료에게 끼우면
 * 그 동료 피해가 단계만큼 뛴다 — 방치형이면서 손으로 계속 할 일(합치기 · 끼우기)이 생긴다. 대장간 강화(재료 · 확률)와 겹치지 않는다.
 * 순수 함수만 — 저장은 TitansSave.acorns (사냥터 저장, 환생하면 처음부터).
 */
import type { TitanHeroId } from "./model";

export const ACORN_SLOTS = 12;
export const ACORN_MAX_LEVEL = 12;
/** 도토리 하나 만드는 시간(초) — 전투 배속을 그대로 탄다 */
export const ACORN_MAKE_SEC = 6;

export type AcornState = {
  /** 칸마다 도토리 단계 — 0 = 빈 칸 */
  grid: number[];
  /** 동료에게 끼운 도토리 단계 */
  allyAmmo: Partial<Record<TitanHeroId, number>>;
  /** 지금까지 만든 가장 높은 단계 (첫 발견 보상 · 표시) */
  best: number;
  /** 다음 도토리까지 쌓인 초 */
  acc: number;
};

export function emptyAcorns(): AcornState {
  return { grid: Array.from({ length: ACORN_SLOTS }, () => 0), allyAmmo: {}, best: 0, acc: 0 };
}

const lvl = (v: unknown): number => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) ? Math.max(0, Math.min(ACORN_MAX_LEVEL, n)) : 0;
};

export function normalizeAcorns(value: unknown): AcornState {
  const v = (value && typeof value === "object" ? value : {}) as Partial<AcornState>;
  const grid = Array.from({ length: ACORN_SLOTS }, (_, i) => lvl(Array.isArray(v.grid) ? v.grid[i] : 0));
  const allyAmmo: Partial<Record<TitanHeroId, number>> = {};
  if (v.allyAmmo && typeof v.allyAmmo === "object") {
    for (const [id, l] of Object.entries(v.allyAmmo)) { const n = lvl(l); if (n > 0) allyAmmo[id as TitanHeroId] = n; }
  }
  const acc = Number(v.acc);
  return { grid, allyAmmo, best: Math.max(lvl(v.best), ...grid, ...Object.values(allyAmmo).map((n) => n ?? 0)), acc: Number.isFinite(acc) ? Math.max(0, Math.min(ACORN_MAKE_SEC, acc)) : 0 };
}

/**
 * 끼운 도토리 단계 → 동료 피해 배율. 단계마다 눈에 띄게 뛴다("기대에 못 미치는 숫자" 피하기):
 * Lv1 ×1.10 · Lv3 ×1.42 · Lv5 ×1.90 · Lv8 ×2.92 · Lv10 ×3.80 · Lv12 ×4.84
 */
export function acornMul(level: number | undefined): number {
  const l = lvl(level);
  return l <= 0 ? 1 : 1 + 0.08 * l + 0.02 * l * l;
}

/** 단계 이름 — 칸 위 · 끼울 때 · 첫 발견 팝업 */
export const ACORN_NAMES = ["", "풋도토리", "단단한 도토리", "윤기 도토리", "줄무늬 도토리", "구리 도토리", "은빛 도토리", "황금 도토리", "수정 도토리", "불꽃 도토리", "번개 도토리", "별빛 도토리", "전설 도토리"];
export const acornName = (level: number): string => ACORN_NAMES[lvl(level)] ?? `도토리 Lv.${level}`;

export const freeSlots = (s: AcornState): number => s.grid.filter((l) => l === 0).length;

/** 빈 칸 첫 자리에 도토리 하나 — 꽉 차면 그대로 */
export function addAcorn(s: AcornState, level = 1): AcornState {
  const i = s.grid.indexOf(0);
  if (i < 0) return s;
  const grid = s.grid.slice();
  grid[i] = lvl(level) || 1;
  return { ...s, grid, best: Math.max(s.best, grid[i]) };
}

/** 시간이 흐른 만큼 만든다 — 칸이 다 차면 쌓인 시간은 한 개 분량에서 멈춘다(넘친 시간은 버림) */
export function tickAcorns(s: AcornState, dtSec: number): AcornState {
  if (!(dtSec > 0)) return s;
  let next = s;
  let acc = s.acc + dtSec;
  while (acc >= ACORN_MAKE_SEC && freeSlots(next) > 0) { next = addAcorn(next, 1); acc -= ACORN_MAKE_SEC; }
  if (freeSlots(next) === 0) acc = Math.min(acc, ACORN_MAKE_SEC);
  return next === s && acc === s.acc ? s : { ...next, acc };
}

/** 칸 a 를 칸 b 로 합친다(같은 단계 · 다른 칸 · 최고 단계 미만) — b 가 한 단계 오르고 a 는 빈다. 안 되면 null */
export function mergeAcorns(s: AcornState, a: number, b: number): { state: AcornState; made: number; isNewBest: boolean } | null {
  if (a === b || a < 0 || b < 0 || a >= ACORN_SLOTS || b >= ACORN_SLOTS) return null;
  const la = s.grid[a], lb = s.grid[b];
  if (la <= 0 || la !== lb || la >= ACORN_MAX_LEVEL) return null;
  const grid = s.grid.slice();
  grid[a] = 0;
  grid[b] = la + 1;
  const isNewBest = la + 1 > s.best;
  return { state: { ...s, grid, best: Math.max(s.best, la + 1) }, made: la + 1, isNewBest };
}

/** 칸 i 와 같은 단계인 다른 칸 — 합칠 짝 표시 · 한 번 누르기 합치기 */
export function pairOf(s: AcornState, i: number): number {
  const l = s.grid[i];
  if (!(l > 0) || l >= ACORN_MAX_LEVEL) return -1;
  return s.grid.findIndex((x, j) => j !== i && x === l);
}

/** 칸 i 의 도토리를 동료에게 끼운다 — 그 동료가 끼고 있던 도토리는 그 칸으로 돌아온다(맞바꿈) */
export function equipAcorn(s: AcornState, i: number, ally: TitanHeroId): AcornState | null {
  const l = s.grid[i];
  if (!(l > 0)) return null;
  const prev = s.allyAmmo[ally] ?? 0;
  const grid = s.grid.slice();
  grid[i] = prev;
  return { ...s, grid, allyAmmo: { ...s.allyAmmo, [ally]: l } };
}
