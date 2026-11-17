/**
 * 세트 파츠 룬 홈 (2026-11-17, 사용자: "아이템 부여나 강화 시에 보석을 넣는다거나 조금 더 재미 요소를")
 * - 새 재화 없음: 룬은 가방에 쌓이는 아이템이 아니라 홈에 새기는 효과다. 재료는 강화석(enhancementMaterials) · 은화.
 *   '보석'은 유료 재화 이름이라 쓰지 않는다.
 * - 강화가 의미: +3 · +6 · +9 에서 홈이 하나씩 열린다(최대 3).
 * - 고르는 맛: 홈을 열면(강화석) 후보 세 장 → 하나 고른다. 후보는 다시 뽑을 수 있다(강화석). 후보는 저장에 남아 껐다 켜도 같다.
 * - 운: 후보마다 등급(일반 70 · 희귀 25 · 영웅 5%) — 효과 ×1 · ×1.5 · ×2.
 * - 모으는 맛: 한 파츠 홈 셋이 같은 룬이면 '공명' — 그 파츠 룬 효과 ×1.5, 입은 파츠가 룬 색으로 빛난다.
 * - 힘은 상한 안(사냥 속도 고정 — 30일차 24~25층): 세기보다 쓰임새. 룬마다 합계 상한(RUNE_DEF.cap).
 */
import { GEAR_SET_ENHANCE_MAX, isGearItemId, isLimitedGear, type EquippedGear, type GearItemId, type GearSetLevels } from "./gearSets";

export type RuneId = "flame" | "gale" | "earth" | "gold";
export type RuneGrade = 0 | 1 | 2;
export type RuneCut = { rune: RuneId; grade: RuneGrade };
/** 파츠마다 홈 세 칸 — 빈 칸은 null */
export type GearRunes = Partial<Record<GearItemId, (RuneCut | null)[]>>;
/** 열어 둔 후보 — 고르기 전까지 저장에 남는다 */
export type RuneOffer = { id: GearItemId; socket: number; cands: RuneCut[]; rolls: number };

export const RUNE_IDS: readonly RuneId[] = ["flame", "gale", "earth", "gold"];
export const RUNE_DEF: Record<RuneId, { name: string; color: string; stat: string; base: number; cap: number; fmt: (v: number) => string }> = {
  flame: { name: "불꽃 룬", color: "#ff7a2a", stat: "탭 치명 확률", base: 0.01, cap: 0.06, fmt: (v) => `+${(v * 100).toFixed(v * 100 % 1 ? 1 : 0)}%p` },
  gale: { name: "바람 룬", color: "#3fd6a0", stat: "동료 공격 속도", base: 0.008, cap: 0.05, fmt: (v) => `+${(v * 100).toFixed(1)}%` },
  earth: { name: "대지 룬", color: "#c8954a", stat: "대장 제한시간", base: 0.3, cap: 2, fmt: (v) => `+${v.toFixed(1)}초` },
  gold: { name: "황금 룬", color: "#f2c232", stat: "사냥 골드", base: 0.015, cap: 0.1, fmt: (v) => `+${(v * 100).toFixed(1)}%` },
};
export const RUNE_GRADE_LABEL = ["일반", "희귀", "영웅"] as const;
export const RUNE_GRADE_MUL = [1, 1.5, 2] as const;
const GRADE_WEIGHTS = [70, 25, 5];
export const RUNE_RESONANCE_MUL = 1.5;
export const RUNE_SOCKETS_MAX = 3;
/** 홈을 열어 후보 세 장을 보는 값 · 후보 다시 뽑기 값 — 강화석(세트 강화 한 번이 1~4개) */
export const RUNE_OPEN_COST = { materials: 3, coins: 20 };
export const RUNE_REROLL_COST = { materials: 2, coins: 0 };

/** 강화 단계로 열린 홈 수 — +3 · +6 · +9 */
export function runeSocketCount(level: number): number {
  const lv = Math.max(0, Math.min(GEAR_SET_ENHANCE_MAX, Math.floor(level || 0)));
  return Math.min(RUNE_SOCKETS_MAX, Math.floor(lv / 3));
}
/** 다음 홈이 열리는 단계(없으면 null) */
export function nextRuneSocketAt(level: number): number | null {
  const n = runeSocketCount(level);
  return n >= RUNE_SOCKETS_MAX ? null : (n + 1) * 3;
}
export function canHoldRunes(id: GearItemId): boolean { return !isLimitedGear(id); }

/** 한 칸 효과 값 */
export function runeCutValue(cut: RuneCut, resonance = false): number {
  return RUNE_DEF[cut.rune].base * RUNE_GRADE_MUL[cut.grade] * (resonance ? RUNE_RESONANCE_MUL : 1);
}
/** 파츠의 공명 룬 — 홈 셋이 모두 같은 룬이면 그 룬, 아니면 null */
export function runeResonance(cuts: readonly (RuneCut | null)[] | undefined): RuneId | null {
  if (!cuts || cuts.length < RUNE_SOCKETS_MAX) return null;
  const first = cuts[0];
  if (!first) return null;
  return cuts.slice(0, RUNE_SOCKETS_MAX).every((c) => c && c.rune === first.rune) ? first.rune : null;
}

export type RuneEffects = { tapCritAdd: number; allySpeedMul: number; bossTimeAdd: number; goldMul: number; totals: Record<RuneId, number>; capped: Record<RuneId, boolean> };
/** 낀 파츠의 열린 홈만 센다 · 룬마다 합계 상한 */
export function gearRuneEffects(runes: GearRunes | undefined, equipped: EquippedGear | undefined, levels: GearSetLevels | undefined): RuneEffects {
  const raw: Record<RuneId, number> = { flame: 0, gale: 0, earth: 0, gold: 0 };
  for (const id of Object.values(equipped ?? {})) {
    if (!id || !canHoldRunes(id)) continue;
    const cuts = runes?.[id];
    if (!cuts) continue;
    const open = runeSocketCount(levels?.[id] ?? 0);
    const res = open >= RUNE_SOCKETS_MAX && runeResonance(cuts);
    cuts.slice(0, open).forEach((c) => { if (c) raw[c.rune] += runeCutValue(c, !!res); });
  }
  const totals = { ...raw }, capped = { flame: false, gale: false, earth: false, gold: false };
  for (const r of RUNE_IDS) if (totals[r] > RUNE_DEF[r].cap) { totals[r] = RUNE_DEF[r].cap; capped[r] = true; }
  return { tapCritAdd: totals.flame, allySpeedMul: 1 + totals.gale, bossTimeAdd: totals.earth, goldMul: 1 + totals.gold, totals, capped };
}
export function runeEffectsText(fx: RuneEffects): string {
  const parts = RUNE_IDS.filter((r) => fx.totals[r] > 0).map((r) => `${RUNE_DEF[r].stat} ${RUNE_DEF[r].fmt(fx.totals[r])}${fx.capped[r] ? "(최대)" : ""}`);
  return parts.length ? parts.join(" · ") : "";
}
export function runeCutText(cut: RuneCut, resonance = false): string {
  return `${RUNE_GRADE_LABEL[cut.grade]} ${RUNE_DEF[cut.rune].name} · ${RUNE_DEF[cut.rune].stat} ${RUNE_DEF[cut.rune].fmt(runeCutValue(cut, resonance))}`;
}

// 후보 — 파츠 · 홈 · 뽑은 횟수 · 사용자로 정해진다(다시 열어도 같은 후보 · 저장 되돌리기로 골라 뽑기 안 된다)
function hash(s: string): number { let h = 2166136261; for (let i = 0; i < s.length; i += 1) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
/** 후보 세 장 — 서로 다른 룬 셋(네 종류 중), 등급은 따로 굴린다 */
export function rollRuneOffer(id: GearItemId, socket: number, rolls: number, salt: string): RuneOffer {
  const r = rng(hash(`${salt}|${id}|${socket}|${rolls}`));
  const pool = [...RUNE_IDS];
  const cands: RuneCut[] = [];
  for (let k = 0; k < 3; k += 1) {
    const rune = pool.splice(Math.floor(r() * pool.length), 1)[0];
    const x = r() * 100;
    const grade: RuneGrade = x < GRADE_WEIGHTS[2] ? 2 : x < GRADE_WEIGHTS[2] + GRADE_WEIGHTS[1] ? 1 : 0;
    cands.push({ rune, grade });
  }
  return { id, socket, cands, rolls };
}

const isRune = (v: unknown): v is RuneId => typeof v === "string" && (RUNE_IDS as readonly string[]).includes(v);
const cutOf = (v: unknown): RuneCut | null => {
  if (!v || typeof v !== "object") return null;
  const o = v as { rune?: unknown; grade?: unknown };
  const g = Number(o.grade);
  return isRune(o.rune) && (g === 0 || g === 1 || g === 2) ? { rune: o.rune, grade: g as RuneGrade } : null;
};
/** 저장 정규화 — 가진 파츠 · 한정이 아닌 것 · 세 칸까지 */
export function normalizeGearRunes(raw: unknown, owned: readonly GearItemId[]): GearRunes {
  const out: GearRunes = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!isGearItemId(k) || !owned.includes(k) || !canHoldRunes(k) || !Array.isArray(v)) continue;
    const cuts = v.slice(0, RUNE_SOCKETS_MAX).map(cutOf);
    while (cuts.length < RUNE_SOCKETS_MAX) cuts.push(null);
    if (cuts.some(Boolean)) out[k] = cuts;
  }
  return out;
}
export function normalizeRuneOffer(raw: unknown, owned: readonly GearItemId[]): RuneOffer | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as { id?: unknown; socket?: unknown; cands?: unknown; rolls?: unknown };
  if (!isGearItemId(o.id) || !owned.includes(o.id) || !canHoldRunes(o.id)) return null;
  const socket = Number(o.socket), rolls = Number(o.rolls);
  if (!Number.isInteger(socket) || socket < 0 || socket >= RUNE_SOCKETS_MAX || !Array.isArray(o.cands)) return null;
  const cands = o.cands.map(cutOf).filter((c): c is RuneCut => !!c).slice(0, 3);
  return cands.length === 3 ? { id: o.id, socket, cands, rolls: Number.isInteger(rolls) && rolls >= 0 ? rolls : 0 } : null;
}
/** 고른 후보를 새긴 새 룬 표 */
export function engraveRune(runes: GearRunes, offer: RuneOffer, pick: number): GearRunes {
  const cut = offer.cands[pick];
  if (!cut) return runes;
  const cuts = [...(runes[offer.id] ?? [null, null, null])];
  while (cuts.length < RUNE_SOCKETS_MAX) cuts.push(null);
  cuts[offer.socket] = cut;
  return { ...runes, [offer.id]: cuts };
}
