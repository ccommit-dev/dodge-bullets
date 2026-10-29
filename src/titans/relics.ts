import { killGold } from "./model";
import type { Tier } from "./allyRoster";
/**
 * 유물 (2026-10-26, 사용자: "오늘도 환생 2" 차용 3번 — 대장 사다리를 반복형으로 넓힌다).
 *
 * - 대장을 처음 잡으면 지금처럼 사다리 특성(bossLadder.ts), 이미 잡아 본 높이의 대장을 다시 잡으면 RELIC_DROP_CHANCE 로 유물 조각 1개.
 *   환생 뒤 다시 오르는 길 · 벽 앞 파밍이 모두 "다시 잡기"라 조각이 쌓인다.
 * - 유물은 환생해도 남는다(CharacterProgress.relics — 환생이 비우지 않는다).
 * - 조각 RELIC_SHARDS_PER_STAR 개로 ★1, 그다음부터 같은 수마다 ★ 하나(최대 ★5).
 * - 원정 지도 갈림길 첫 보상에도 조각이 섞인다(game/stages.ts BranchReward.relicShards) — 성문 방어 ↔ 사냥터를 잇는다.
 *
 * 2판 (2026-10-28, 사용자: "유물도 개수를 늘려주고 등급을 동료처럼 메겨서 종류 30개이상 다시생성") — 36종.
 * - 계열 6(불 · 서리 · 황금 · 바람 · 대지 · 별빛) × 등급 6(동료와 같은 N 일반 · R 희귀 · SR 영웅 · SSR 전설 · UR 신화 · LR 초월).
 * - 옛 9종은 id · 효과 수치 그대로 R · SR · SSR 자리에 둔다(옛 저장의 ★ 이 그대로 산다). 새 27종은 등급 배율(N ×0.5 … LR ×2)로.
 * - 세트: 같은 계열 ★1 이상 3개면 세트, 6개 모두면 세트 효과 ×1.5.
 * - 상점 뽑기는 재화별 3종(골드 · 강화석 · 보석) — 비쌀수록 높은 등급 확률이 크다(RELIC_BANNER_RATES · 확률 공시).
 *
 * 4판 (2026-10-28, 사용자: "유물 개수도 20개더 늘려줘") — 56종 = 계열 7(물결 추가) × 8(일반 2 · 희귀 2 · 영웅 · 전설 · 신화 · 초월).
 * - 효과 종류별 합계 상한(RELIC_STAT_CAP) — 36종을 모두 ★5 로 모으면 탭 ×3.06 · 대장 시간 +53초(제한 30초)까지 올라 후반 대장 벽이 없어졌다.
 *   상한은 옛 9종 ★5 합(탭 +20% · 대장 시간 +13.5초)의 2 ~ 3배 안 — 많이 모을수록 세지지만 끝이 있다. 세트 효과는 상한 밖(작게).
 */

export type RelicFamily = "fire" | "frost" | "gold" | "wind" | "earth" | "star" | "water";
export const RELIC_FAMILIES: readonly RelicFamily[] = ["fire", "frost", "gold", "wind", "earth", "star", "water"];
export type RelicId =
  | "ember-spark" | "ember-ring" | "flame-feather" | "lava-heart" | "phoenix-plume" | "sun-core"
  | "frost-pebble" | "frost-horn" | "snow-crystal" | "ice-lantern" | "glacier-shield" | "winter-crown"
  | "copper-coin" | "lucky-coin" | "golden-acorn" | "beaver-crown" | "treasure-chest" | "king-scepter"
  | "wind-leaf" | "reed-flute" | "feather-fan" | "storm-bell" | "cloud-wing" | "tempest-eye"
  | "river-stone" | "oak-shield" | "mossy-totem" | "mountain-heart" | "ancient-root" | "world-seed"
  | "star-sand" | "moon-shell" | "comet-shard" | "star-compass" | "galaxy-pearl" | "aurora-orb"
  // 4판 (2026-10-28) +20
  | "cinder-chunk" | "flame-dagger" | "icicle" | "frost-cloak" | "silver-button" | "gold-map"
  | "dandelion" | "pinwheel" | "clay-doll" | "bronze-shovel" | "firefly-jar" | "star-arrow"
  | "clam-shell" | "water-drop" | "kingfisher-feather" | "reed-rod" | "coral-crown" | "tide-compass" | "mermaid-harp" | "sea-tear";

/** 유물 하나의 효과 종류 — 수치는 ★ 하나당 */
export type RelicStat = "tapMul" | "allyMul" | "bossMul" | "bossTimeSec" | "idleMul" | "goldMul" | "crystalMul";

export type RelicDef = { id: RelicId; family: RelicFamily; tier: Tier; name: string; stat: RelicStat; perStar: number; blurb: string };

/** 등급 배율 — SR(영웅)이 기준 */
export const RELIC_TIER_POWER: Record<Tier, number> = { N: 0.5, R: 0.75, SR: 1, SSR: 1.25, UR: 1.6, LR: 2 };
/** 효과 종류별 SR 기준 ★ 하나당 값 */
const STAT_BASE: Record<RelicStat, number> = { tapMul: 0.04, allyMul: 0.04, bossMul: 0.045, goldMul: 0.045, idleMul: 0.04, crystalMul: 0.04, bossTimeSec: 1.5 };
const BLURB: Record<RelicStat, string> = { tapMul: "탭 피해", allyMul: "동료 피해", bossMul: "대장 피해", goldMul: "처치 골드", idleMul: "방치 배율", crystalMul: "환생 결정", bossTimeSec: "대장 제한 시간" };
const r3 = (v: number) => Math.round(v * 1000) / 1000;
const def = (id: RelicId, family: RelicFamily, tier: Tier, name: string, stat: RelicStat, perStar?: number): RelicDef =>
  ({ id, family, tier, name, stat, perStar: perStar ?? r3(STAT_BASE[stat] * RELIC_TIER_POWER[tier]), blurb: BLURB[stat] });

export const RELICS: readonly RelicDef[] = [
  // 불 — 탭 · 동료 · 대장
  def("ember-spark", "fire", "N", "불씨 부싯돌", "tapMul"),
  def("ember-ring", "fire", "R", "불씨 반지", "tapMul", 0.04),
  def("flame-feather", "fire", "SR", "화염 깃털", "allyMul", 0.04),
  def("lava-heart", "fire", "SSR", "용암 심장", "bossMul", 0.05),
  def("phoenix-plume", "fire", "UR", "불사조 꽁지깃", "allyMul"),
  def("sun-core", "fire", "LR", "태양의 핵", "tapMul"),
  // 서리 — 대장 시간 · 방치 · 대장
  def("frost-pebble", "frost", "N", "서리 조약돌", "idleMul"),
  def("frost-horn", "frost", "R", "서리 뿔피리", "bossTimeSec", 1.5),
  def("snow-crystal", "frost", "SR", "눈꽃 결정", "idleMul", 0.04),
  def("ice-lantern", "frost", "SSR", "얼음 등불", "bossMul", 0.04),
  def("glacier-shield", "frost", "UR", "빙하 방패", "bossTimeSec"),
  def("winter-crown", "frost", "LR", "겨울 왕관", "bossMul"),
  // 황금 — 골드 · 환생 결정
  def("copper-coin", "gold", "N", "구리 동전", "goldMul"),
  def("lucky-coin", "gold", "R", "행운 동전", "goldMul", 0.04),
  def("golden-acorn", "gold", "SR", "황금 열매", "goldMul", 0.05),
  def("beaver-crown", "gold", "SSR", "비버 왕관", "crystalMul", 0.04),
  def("treasure-chest", "gold", "UR", "보물 상자", "goldMul"),
  def("king-scepter", "gold", "LR", "왕의 홀", "crystalMul"),
  // 바람 — 동료 · 탭 · 대장
  def("wind-leaf", "wind", "N", "바람 잎사귀", "allyMul"),
  def("reed-flute", "wind", "R", "갈대 피리", "allyMul"),
  def("feather-fan", "wind", "SR", "깃털 부채", "tapMul"),
  def("storm-bell", "wind", "SSR", "폭풍 종", "bossMul"),
  def("cloud-wing", "wind", "UR", "구름 날개", "allyMul"),
  def("tempest-eye", "wind", "LR", "폭풍의 눈", "bossTimeSec"),
  // 대지 — 방치 · 대장 시간 · 결정
  def("river-stone", "earth", "N", "강가 돌", "bossTimeSec"),
  def("oak-shield", "earth", "R", "참나무 방패", "idleMul"),
  def("mossy-totem", "earth", "SR", "이끼 토템", "idleMul"),
  def("mountain-heart", "earth", "SSR", "산의 심장", "bossMul"),
  def("ancient-root", "earth", "UR", "고대 뿌리", "idleMul"),
  def("world-seed", "earth", "LR", "세계수 씨앗", "crystalMul"),
  // 별빛 — 결정 · 골드 · 탭
  def("star-sand", "star", "N", "별 모래", "crystalMul"),
  def("moon-shell", "star", "R", "달 조개", "goldMul"),
  def("comet-shard", "star", "SR", "혜성 조각", "tapMul"),
  def("star-compass", "star", "SSR", "별 나침반", "crystalMul"),
  def("galaxy-pearl", "star", "UR", "은하 진주", "goldMul"),
  def("aurora-orb", "star", "LR", "오로라 구슬", "tapMul"),
  // 4판 (2026-10-28) — 계열마다 일반 · 희귀 하나씩 더
  def("cinder-chunk", "fire", "N", "숯 조각", "allyMul"),
  def("flame-dagger", "fire", "R", "불꽃 단검", "bossMul"),
  def("icicle", "frost", "N", "고드름", "bossTimeSec"),
  def("frost-cloak", "frost", "R", "서리 망토", "idleMul"),
  def("silver-button", "gold", "N", "은 단추", "goldMul"),
  def("gold-map", "gold", "R", "금박 지도", "crystalMul"),
  def("dandelion", "wind", "N", "민들레 씨앗", "tapMul"),
  def("pinwheel", "wind", "R", "바람개비", "allyMul"),
  def("clay-doll", "earth", "N", "점토 인형", "idleMul"),
  def("bronze-shovel", "earth", "R", "청동 삽", "bossMul"),
  def("firefly-jar", "star", "N", "반딧불 병", "crystalMul"),
  def("star-arrow", "star", "R", "별똥 화살", "tapMul"),
  // 물결 — 골드 · 방치 · 동료
  def("clam-shell", "water", "N", "조개 껍데기", "goldMul"),
  def("water-drop", "water", "N", "물방울 구슬", "idleMul"),
  def("kingfisher-feather", "water", "R", "물총새 깃", "allyMul"),
  def("reed-rod", "water", "R", "갈대 낚싯대", "goldMul"),
  def("coral-crown", "water", "SR", "산호 왕관", "bossMul"),
  def("tide-compass", "water", "SSR", "해류 나침반", "bossTimeSec"),
  def("mermaid-harp", "water", "UR", "인어 하프", "allyMul"),
  def("sea-tear", "water", "LR", "바다의 눈물", "idleMul"),
];

/** 효과 종류별 유물 합계 상한(★ 효과만 · 세트는 따로) — 2026-10-28 */
export const RELIC_STAT_CAP: Record<RelicStat, number> = { tapMul: 0.6, allyMul: 0.6, bossMul: 0.6, goldMul: 1, idleMul: 0.4, crystalMul: 0.5, bossTimeSec: 10 };

export const RELIC_FAMILY_LABEL: Record<RelicFamily, string> = { fire: "불", frost: "서리", gold: "황금", wind: "바람", earth: "대지", star: "별빛", water: "물결" };
/** 세트 효과 — 같은 계열 ★1 이상 3개 · 6개 모두면 ×1.5 */
export const RELIC_SET: Record<RelicFamily, { name: string; blurb: string }> = {
  fire: { name: "화상", blurb: "피해 20% 화상 추가" },
  frost: { name: "얼어붙은 대장", blurb: "대장 시간 +4초 · 피해 +10%" },
  gold: { name: "황금 손길", blurb: "골드 +25% · 조각 확률 +4%p" },
  wind: { name: "순풍", blurb: "동료 피해 +15%" },
  earth: { name: "대지의 품", blurb: "대장 시간 +2초 · 방치 +0.1" },
  star: { name: "별자리", blurb: "탭 피해 +15% · 환생 결정 +10%" },
  water: { name: "물살", blurb: "동료 피해 +10% · 골드 +10%" },
};
export const RELIC_SET_NEED = 3;
export const RELIC_SET_FULL_MUL = 1.5;
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

/** 계열에서 ★1 이상인 유물 수 */
export function familyOwned(state: RelicState, family: RelicFamily): number {
  return RELICS.filter((r) => r.family === family && relicStars(state, r.id) >= 1).length;
}

export function setActive(state: RelicState, family: RelicFamily): boolean {
  return familyOwned(state, family) >= RELIC_SET_NEED;
}

export function setFull(state: RelicState, family: RelicFamily): boolean {
  return familyOwned(state, family) >= RELICS.filter((r) => r.family === family).length;
}

/** 대장 재처치 · 갈림길 조각이 고르는 무게 — 낮은 등급이 잘 나온다(뽑기와 따로, 공시 대상 아님) */
export const RELIC_DROP_WEIGHT: Record<Tier, number> = { N: 4, R: 3, SR: 2, SSR: 1, UR: 0.4, LR: 0.15 };

/**
 * 조각 n 개를 나눠 준다. 반쯤 모은(조각 1~2) 유물이 있으면 그쪽부터(첫 ★ 까지 흩어지지 않게) — 없으면 아직 ★ 가 없는 유물 중
 * 등급 무게(RELIC_DROP_WEIGHT)로, 다 가진 뒤에는 다 오르지 않은 것 중에서. rng 는 시험에서 고정한다. 반환 got = 조각이 들어간 유물 차례.
 */
export function grantRelicShards(state: RelicState, n: number, rng: () => number = Math.random): { state: RelicState; got: RelicId[] } {
  const next: RelicState = { ...state };
  const got: RelicId[] = [];
  for (let i = 0; i < n; i++) {
    const open = RELICS.filter((r) => !relicMaxed(next, r.id));
    if (!open.length) break;
    const unowned = open.filter((r) => relicStars(next, r.id) < 1);
    const started = unowned.filter((r) => (next[r.id] ?? 0) > 0);
    const pool = started.length ? started : unowned.length ? unowned : open;
    const total = pool.reduce((a, r) => a + RELIC_DROP_WEIGHT[r.tier], 0);
    let roll = rng() * total;
    let pick = pool[pool.length - 1];
    for (const r of pool) { roll -= RELIC_DROP_WEIGHT[r.tier]; if (roll < 0) { pick = r; break; } }
    next[pick.id] = (next[pick.id] ?? 0) + 1;
    got.push(pick.id);
  }
  return { state: next, got };
}

export type RelicEffects = {
  tapMul: number; allyMul: number; bossMul: number; goldMul: number; idleMul: number; crystalMul: number;
  bossTimeSec: number; burnShare: number; dropBonus: number;
  sets: RelicFamily[];
  /** 6개 모두 모은 계열(세트 ×1.5) */
  fullSets: RelicFamily[];
};

export function relicEffects(state: RelicState): RelicEffects {
  const add: Record<RelicStat, number> = { tapMul: 0, allyMul: 0, bossMul: 0, bossTimeSec: 0, idleMul: 0, goldMul: 0, crystalMul: 0 };
  for (const r of RELICS) add[r.stat] += relicStars(state, r.id) * r.perStar;
  for (const k of Object.keys(add) as RelicStat[]) add[k] = Math.min(add[k], RELIC_STAT_CAP[k]);   // 종류별 합계 상한
  const sets = RELIC_FAMILIES.filter((f) => setActive(state, f));
  const fullSets = RELIC_FAMILIES.filter((f) => setFull(state, f));
  // 세트 세기: 켜지면 1 · 6개 모두면 ×1.5
  const k = (f: RelicFamily) => (fullSets.includes(f) ? RELIC_SET_FULL_MUL : sets.includes(f) ? 1 : 0);
  return {
    tapMul: (1 + add.tapMul) * (1 + 0.15 * k("star")),
    allyMul: (1 + add.allyMul) * (1 + 0.15 * k("wind")) * (1 + 0.1 * k("water")),
    bossMul: (1 + add.bossMul) * (1 + 0.1 * k("frost")),
    goldMul: (1 + add.goldMul) * (1 + 0.25 * k("gold")) * (1 + 0.1 * k("water")),
    idleMul: add.idleMul + 0.1 * k("earth"),
    crystalMul: (1 + add.crystalMul) * (1 + 0.1 * k("star")),
    bossTimeSec: add.bossTimeSec + 4 * k("frost") + 2 * k("earth"),
    burnShare: FIRE_SET_BURN_SHARE * k("fire"),
    dropBonus: 0.04 * k("gold"),
    sets,
    fullSets,
  };
}

export function relicDef(id: RelicId): RelicDef {
  return RELICS.find((r) => r.id === id)!;
}

/** 한 줄 효과 문구 — "탭 피해 +8%" · "대장 제한 시간 +3초" */
export function relicStatText(d: RelicDef, stars: number): string {
  const v = d.perStar * Math.max(1, stars);
  if (d.stat === "bossTimeSec") return `${d.blurb} +${(Math.round(v * 100) / 100).toString()}초`;
  if (d.stat === "idleMul") return `${d.blurb} +${v.toFixed(2)}`;
  return `${d.blurb} +${(Math.round(v * 1000) / 10).toString()}%`;
}

export function relicIconUrl(id: RelicId): string {
  return `titans/relics/${id}.png`;
}

/**
 * 상점 유물 뽑기 (2026-10-26 · 10-27 재화별 · 10-28 등급 6) — 한 번 = 조각 1개. 10회는 10% 싸다.
 * 재화마다 나오는 등급 확률이 다르다(RELIC_BANNER_RATES). 등급 안에서는 아직 다 모으지 않은 유물 중 균등.
 * 다 모은 등급은 빠지고 남은 등급끼리 비례로 나눈다. 모든 유물이 ★5 면 뽑을 수 없다.
 * 보석 값은 게임 안 숫자에 묶여 있다(scripts/verify-relic-forge-econ.mjs): ★ 하나(조각 3 = 180 보석)는 고르는 동료 첫 승급(240)보다 싸고 절반 이상.
 */
/** 2026-10-27 사용자 확정: 1회 60 유지(40 · 80 안과 견준 뒤 "지금처럼") */
export const RELIC_DRAW = { singleCost: 60, tenCost: 540 } as const;
export const RELIC_STONE_DRAW = { singleCost: 30, tenCost: 270 } as const;

export type RelicBanner = "gold" | "stone" | "gem";
export const RELIC_BANNERS: readonly RelicBanner[] = ["gold", "stone", "gem"];
export const RELIC_BANNER_LABEL: Record<RelicBanner, string> = { gold: "골드", stone: "강화석", gem: "보석" };
/** 재화별 등급 확률 — 합 1 (확률 공시) */
export const RELIC_BANNER_RATES: Record<RelicBanner, Partial<Record<Tier, number>>> = {
  gold: { N: 0.62, R: 0.3, SR: 0.08 },
  stone: { R: 0.45, SR: 0.35, SSR: 0.15, UR: 0.05 },
  gem: { SR: 0.4, SSR: 0.34, UR: 0.19, LR: 0.07 },
};

/** 뽑기 값 — 골드는 지금 층의 사냥 골드 5분치(처치 골드 × 초당 0.7 × 300초, 최소 100) */
export function relicBannerCost(banner: RelicBanner, stage: number): { single: number; ten: number } {
  if (banner === "gem") return { single: RELIC_DRAW.singleCost, ten: RELIC_DRAW.tenCost };
  if (banner === "stone") return { single: RELIC_STONE_DRAW.singleCost, ten: RELIC_STONE_DRAW.tenCost };
  const single = Math.max(100, Math.round(killGold(Math.max(1, stage), false, false) * 0.7 * 300));
  return { single, ten: single * 9 };
}

/** 지금 한 번 뽑을 때 각 유물이 나올 확률 — 다 모은 유물은 0 · 다 모은 등급은 남은 등급끼리 비례 */
export function relicDrawRates(state: RelicState, banner: RelicBanner): { id: RelicId; rate: number }[] {
  const tierRates = RELIC_BANNER_RATES[banner];
  const openOf = (t: Tier) => RELICS.filter((r) => r.tier === t && !relicMaxed(state, r.id));
  const live = (Object.keys(tierRates) as Tier[]).filter((t) => openOf(t).length > 0);
  const sum = live.reduce((a, t) => a + (tierRates[t] ?? 0), 0);
  return RELICS.map((r) => {
    if (!live.includes(r.tier) || relicMaxed(state, r.id) || sum <= 0) return { id: r.id, rate: 0 };
    return { id: r.id, rate: (tierRates[r.tier] ?? 0) / sum / openOf(r.tier).length };
  });
}

/** 등급별 지금 확률(공시 요약) */
export function relicBannerTierRates(state: RelicState, banner: RelicBanner): Partial<Record<Tier, number>> {
  const out: Partial<Record<Tier, number>> = {};
  for (const x of relicDrawRates(state, banner)) if (x.rate > 0) { const t = relicDef(x.id).tier; out[t] = (out[t] ?? 0) + x.rate; }
  return out;
}

export function drawRelicShards(state: RelicState, n: number, rng: () => number = Math.random, banner: RelicBanner = "gem"): { state: RelicState; got: RelicId[] } {
  let next: RelicState = { ...state };
  const got: RelicId[] = [];
  for (let i = 0; i < n; i++) {
    const rates = relicDrawRates(next, banner).filter((x) => x.rate > 0);
    if (!rates.length) break;
    let roll = rng();
    let pick = rates[rates.length - 1].id;
    for (const x of rates) { roll -= x.rate; if (roll < 0) { pick = x.id; break; } }
    next = { ...next, [pick]: (next[pick] ?? 0) + 1 };
    got.push(pick);
  }
  return { state: next, got };
}

/**
 * 중복 소진 (2026-10-28, 사용자: "동일한 유물이나 스킬이 있으면 소진하면서 레벨 높일 수 있게") — 뽑기 · 대장 다시 잡기 · 갈림길 조각은
 * 먼저 '남은 조각'(progression.relicSpare)에 쌓이고, 유물 탭에서 소진해야 ★ 에 들어간다. 옛 저장의 relics 는 이미 들어간 조각 그대로(★ 유지).
 * 뽑기 · 조각 고르기는 들어간 조각 + 남은 조각을 함께 본다 — 남은 조각으로 다 채울 수 있는 유물은 더 나오지 않는다.
 */
export function relicMerged(state: RelicState, spare: RelicState): RelicState {
  const out: RelicState = { ...state };
  for (const [id, n] of Object.entries(spare) as [RelicId, number][]) if (n > 0) out[id] = (out[id] ?? 0) + n;
  return out;
}

export function addRelicSpare(spare: RelicState, got: readonly RelicId[]): RelicState {
  const out: RelicState = { ...spare };
  for (const id of got) out[id] = (out[id] ?? 0) + 1;
  return out;
}

/** 지금 소진할 수 있는 남은 조각 수(★5 까지 남은 칸만) */
export function relicSpareUsable(state: RelicState, spare: RelicState, id: RelicId): number {
  return Math.max(0, Math.min(spare[id] ?? 0, RELIC_SHARDS_PER_STAR * RELIC_MAX_STAR - (state[id] ?? 0)));
}

/** 남은 조각을 소진해 ★ 에 넣는다 — 넣을 수 있는 만큼 모두. ★5 를 넘는 조각은 남은 조각에 그대로 둔다(버리지 않는다) */
export function consumeRelicSpare(state: RelicState, spare: RelicState, id: RelicId): { state: RelicState; spare: RelicState; used: number } {
  const used = relicSpareUsable(state, spare, id);
  if (used <= 0) return { state, spare, used: 0 };
  const left = (spare[id] ?? 0) - used;
  const nextSpare: RelicState = { ...spare };
  if (left > 0) nextSpare[id] = left; else delete nextSpare[id];
  return { state: { ...state, [id]: (state[id] ?? 0) + used }, spare: nextSpare, used };
}
