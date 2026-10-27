/**
 * 유물 (2026-10-26, 사용자: "오늘도 환생 2" 차용 3번 — 대장 사다리를 반복형으로 넓힌다).
 *
 * - 대장을 처음 잡으면 지금처럼 사다리 특성(bossLadder.ts), 이미 잡아 본 높이의 대장을 다시 잡으면 RELIC_DROP_CHANCE 로 유물 조각 1개.
 *   환생 뒤 다시 오르는 길 · 벽 앞 파밍이 모두 "다시 잡기"라 조각이 쌓인다.
 * - 유물은 환생해도 남는다(CharacterProgress.relics — 환생이 비우지 않는다).
 * - 조각 RELIC_SHARDS_PER_STAR 개로 ★1, 그다음부터 같은 수마다 ★ 하나(최대 ★5).
 * - 같은 계열 3개를 모두 가지면(★1 이상) 세트 효과 — 불: 화상 · 서리: 얼어붙은 대장 · 황금: 황금 손길.
 * - 원정 지도 갈림길 첫 보상에도 조각이 섞인다(game/stages.ts BranchReward.relicShards) — 성문 방어 ↔ 사냥터를 잇는다.
 */

export type RelicFamily = "fire" | "frost" | "gold";
export type RelicId =
  | "ember-ring" | "flame-feather" | "lava-heart"
  | "frost-horn" | "snow-crystal" | "ice-lantern"
  | "golden-acorn" | "lucky-coin" | "beaver-crown";

/** 유물 하나의 효과 종류 — 수치는 ★ 하나당 */
export type RelicStat = "tapMul" | "allyMul" | "bossMul" | "bossTimeSec" | "idleMul" | "goldMul" | "crystalMul";

export type RelicDef = { id: RelicId; family: RelicFamily; name: string; stat: RelicStat; perStar: number; blurb: string };

export const RELICS: readonly RelicDef[] = [
  { id: "ember-ring", family: "fire", name: "불씨 반지", stat: "tapMul", perStar: 0.04, blurb: "탭 피해" },
  { id: "flame-feather", family: "fire", name: "화염 깃털", stat: "allyMul", perStar: 0.04, blurb: "동료 피해" },
  { id: "lava-heart", family: "fire", name: "용암 심장", stat: "bossMul", perStar: 0.05, blurb: "대장 피해" },
  { id: "frost-horn", family: "frost", name: "서리 뿔피리", stat: "bossTimeSec", perStar: 1.5, blurb: "대장 제한 시간" },
  { id: "snow-crystal", family: "frost", name: "눈꽃 결정", stat: "idleMul", perStar: 0.04, blurb: "방치 배율" },
  { id: "ice-lantern", family: "frost", name: "얼음 등불", stat: "bossMul", perStar: 0.04, blurb: "대장 피해" },
  { id: "golden-acorn", family: "gold", name: "황금 열매", stat: "goldMul", perStar: 0.05, blurb: "처치 골드" },
  { id: "lucky-coin", family: "gold", name: "행운 동전", stat: "goldMul", perStar: 0.04, blurb: "처치 골드" },
  { id: "beaver-crown", family: "gold", name: "비버 왕관", stat: "crystalMul", perStar: 0.04, blurb: "환생 결정" },
];

export const RELIC_FAMILY_LABEL: Record<RelicFamily, string> = { fire: "불", frost: "서리", gold: "황금" };
/** 세트 효과 — 같은 계열 3개 모두 ★1 이상 */
export const RELIC_SET: Record<RelicFamily, { name: string; blurb: string }> = {
  fire: { name: "화상", blurb: "피해 20% 화상 추가" },
  frost: { name: "얼어붙은 대장", blurb: "대장 시간 +6초 · 피해 +10%" },
  gold: { name: "황금 손길", blurb: "골드 +25% · 조각 확률 +4%p" },
};
export const FIRE_SET_BURN_SHARE = 0.2;

/** 다시 잡은 대장이 조각을 떨어뜨릴 확률 */
export const RELIC_DROP_CHANCE = 0.12;
export const RELIC_SHARDS_PER_STAR = 3;
export const RELIC_MAX_STAR = 5;

/** 유물마다 모은 조각 수 (★ 는 조각에서 계산) */
export type RelicState = Partial<Record<RelicId, number>>;

const IDS = new Set<string>(RELICS.map((r) => r.id));

export function normalizeRelics(raw: unknown): RelicState {
  const out: RelicState = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!IDS.has(k) || typeof v !== "number" || !Number.isFinite(v)) continue;
    const n = Math.max(0, Math.min(RELIC_SHARDS_PER_STAR * RELIC_MAX_STAR, Math.floor(v)));
    if (n > 0) out[k as RelicId] = n;
  }
  return out;
}

export function relicStars(state: RelicState, id: RelicId): number {
  return Math.min(RELIC_MAX_STAR, Math.floor((state[id] ?? 0) / RELIC_SHARDS_PER_STAR));
}

export function relicMaxed(state: RelicState, id: RelicId): boolean {
  return (state[id] ?? 0) >= RELIC_SHARDS_PER_STAR * RELIC_MAX_STAR;
}

export function setActive(state: RelicState, family: RelicFamily): boolean {
  return RELICS.filter((r) => r.family === family).every((r) => relicStars(state, r.id) >= 1);
}

/**
 * 조각 n 개를 나눠 준다. 아직 ★ 가 없는 유물부터(같은 계열 세트를 먼저 맞추기 쉽게) — 다 가진 뒤에는 다 오르지 않은 것 중에서.
 * rng 는 시험에서 고정한다. 반환 got = 조각이 들어간 유물 차례.
 */
export function grantRelicShards(state: RelicState, n: number, rng: () => number = Math.random): { state: RelicState; got: RelicId[] } {
  const next: RelicState = { ...state };
  const got: RelicId[] = [];
  for (let i = 0; i < n; i++) {
    const open = RELICS.filter((r) => !relicMaxed(next, r.id));
    if (!open.length) break;
    const unowned = open.filter((r) => relicStars(next, r.id) < 1);
    // 반쯤 모은(조각 1~2) 유물이 있으면 그쪽을 먼저 — 첫 ★ 까지 조각이 흩어지지 않게
    const started = unowned.filter((r) => (next[r.id] ?? 0) > 0);
    const pool = started.length ? started : unowned.length ? unowned : open;
    const pick = pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))];
    next[pick.id] = (next[pick.id] ?? 0) + 1;
    got.push(pick.id);
  }
  return { state: next, got };
}

export type RelicEffects = {
  tapMul: number; allyMul: number; bossMul: number; goldMul: number; idleMul: number; crystalMul: number;
  bossTimeSec: number; burnShare: number; dropBonus: number;
  sets: RelicFamily[];
};

export function relicEffects(state: RelicState): RelicEffects {
  const add: Record<RelicStat, number> = { tapMul: 0, allyMul: 0, bossMul: 0, bossTimeSec: 0, idleMul: 0, goldMul: 0, crystalMul: 0 };
  for (const r of RELICS) add[r.stat] += relicStars(state, r.id) * r.perStar;
  const sets = (["fire", "frost", "gold"] as const).filter((f) => setActive(state, f));
  const frost = sets.includes("frost");
  const gold = sets.includes("gold");
  return {
    tapMul: 1 + add.tapMul,
    allyMul: 1 + add.allyMul,
    bossMul: (1 + add.bossMul) * (frost ? 1.1 : 1),
    goldMul: (1 + add.goldMul) * (gold ? 1.25 : 1),
    idleMul: add.idleMul,
    crystalMul: 1 + add.crystalMul,
    bossTimeSec: add.bossTimeSec + (frost ? 6 : 0),
    burnShare: sets.includes("fire") ? FIRE_SET_BURN_SHARE : 0,
    dropBonus: gold ? 0.04 : 0,
    sets,
  };
}

export function relicDef(id: RelicId): RelicDef {
  return RELICS.find((r) => r.id === id)!;
}

/** 한 줄 효과 문구 — "탭 피해 +8%" · "대장 제한 시간 +3초" */
export function relicStatText(def: RelicDef, stars: number): string {
  const v = def.perStar * Math.max(1, stars);
  if (def.stat === "bossTimeSec") return `${def.blurb} +${v.toFixed(1).replace(/\.0$/, "")}초`;
  if (def.stat === "idleMul") return `${def.blurb} +${v.toFixed(2)}`;
  return `${def.blurb} +${Math.round(v * 100)}%`;
}

export function relicIconUrl(id: RelicId): string {
  return `titans/relics/${id}.png`;
}

/**
 * 상점 유물 뽑기 (2026-10-26, 사용자: "유물은 상점에서 뽑을 수 있게 UI 및 시스템 추가").
 * 한 번 = 조각 1개. 아직 다 모으지 않은 유물 중 **균등 확률**(확률 공시 그대로 — grantRelicShards 의 "모으던 것부터" 몰아주기와 다르다).
 * 10회는 10% 싸다. 모든 유물이 ★5 면 뽑을 수 없다.
 * 가격 기준은 게임 안 숫자(scripts/verify-relic-forge-econ.mjs): 유물 ★ 하나(조각 3 = 180 보석)는 무엇이 나올지 못 고르니 상점 조각팩으로
 * 고르는 동료 첫 승급(조각 20 = 240 보석)보다 싸고 그 절반 이상. 참고로 무과금(하루 약 38.6 보석) 첫 세트 약 24일 ·
 * 9종 ★1 약 46일 · 전부 ★5 약 115일(대장 재처치 드랍은 따로).
 */
/** 2026-10-27 사용자 확정: 1회 60 유지(40 · 80 안과 견준 뒤 "지금처럼") */
export const RELIC_DRAW = { singleCost: 60, tenCost: 540 } as const;

/** 지금 한 번 뽑을 때 각 유물이 나올 확률 — 다 모은 유물은 0 */
export function relicDrawRates(state: RelicState): { id: RelicId; rate: number }[] {
  const open = RELICS.filter((r) => !relicMaxed(state, r.id));
  return RELICS.map((r) => ({ id: r.id, rate: open.some((o) => o.id === r.id) ? 1 / open.length : 0 }));
}

export function drawRelicShards(state: RelicState, n: number, rng: () => number = Math.random): { state: RelicState; got: RelicId[] } {
  const next: RelicState = { ...state };
  const got: RelicId[] = [];
  for (let i = 0; i < n; i++) {
    const open = RELICS.filter((r) => !relicMaxed(next, r.id));
    if (!open.length) break;
    const pick = open[Math.min(open.length - 1, Math.floor(rng() * open.length))];
    next[pick.id] = (next[pick.id] ?? 0) + 1;
    got.push(pick.id);
  }
  return { state: next, got };
}
