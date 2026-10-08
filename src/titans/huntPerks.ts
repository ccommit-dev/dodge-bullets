/**
 * 사냥터 "사냥 강화" 3택 (2026-10-08, Galactic Outlaw 루프 ①②: 30~60초마다 의사결정 → 빌드 변화).
 *
 * 보스를 잡을 때마다 선택권이 1장 쌓이고(최대 HUNT_PICK_CAP), 사냥터에서 3장 중 하나를 고른다.
 * 고른 효과는 **지역 안에서만** 쌓이고(huntMods), 새 지역에 들어가거나 환생하면 비워진다 — 지역 하나가 한 "런"이다.
 * 성문 방어의 perks.ts 와 같은 문법(등급·콤보·needs)이라 플레이어가 한 번 배우면 두 콘텐츠에서 같은 카드를 읽는다.
 */
import type { TitanSkillId } from "./model";

export type HuntPerkRarity = "common" | "rare" | "epic";
export const HUNT_RARITY_LABEL: Record<HuntPerkRarity, string> = { common: "일반", rare: "레어", epic: "에픽" };

/** 선택권은 쌓인다 — 방치 중 보스를 여럿 잡아도 돌아와서 3장까지만 고른다 */
export const HUNT_PICK_CAP = 3;

/** 런(지역) 안에서 쌓이는 효과 — TitansGame 의 피해·시간·쿨타임 식이 읽는다 */
export type HuntMods = {
  /** 탭·스킬 피해 배수 */
  tapMul: number;
  /** 동료 피해 배수 */
  allyMul: number;
  /** 보스 제한시간 가산(초) */
  bossTimeBonus: number;
  /** 스킬 재사용 배수 */
  cooldownMul: number;
  /** 화상 틱 배수 */
  burnMul: number;
  /** 빙결 지속 배수 */
  freezeMul: number;
  /** 치명 피해 추가 배수 */
  critDmgMul: number;
  /** 보스 약점 창 연장(ms) */
  weakWindowMs: number;
  /** 약점 명중 배수 가산(기본 ×1.6 에 더한다) */
  weakBonus: number;
  /** [콤보] 약점 사냥 — 약점 명중마다 보스 시간 +1초 */
  weakHunt: boolean;
  /** [콤보] 열충격 — 화상 중 빙결을 걸면 탭 피해 ×6 의 폭발 */
  thermalShock: boolean;
  /** [콤보] 연쇄 번개 — 치명 스킬 명중 뒤 30% 추가 타 */
  chainLightning: boolean;
  /** 고른 카드 기록 — 화면 칩·중복 방지 */
  picked: HuntPerkId[];
};

export function emptyHuntMods(): HuntMods {
  return { tapMul: 1, allyMul: 1, bossTimeBonus: 0, cooldownMul: 1, burnMul: 1, freezeMul: 1, critDmgMul: 1, weakWindowMs: 0, weakBonus: 0, weakHunt: false, thermalShock: false, chainLightning: false, picked: [] };
}

/** 저장에서 읽은 값을 손본다 — 옛 저장·깨진 값이면 빈 것 */
export function normalizeHuntMods(raw: unknown): HuntMods {
  const base = emptyHuntMods();
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Partial<Record<keyof HuntMods, unknown>>;
  const num = (k: keyof HuntMods, lo: number, hi: number) => { const v = r[k]; return typeof v === "number" && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : (base[k] as number); };
  return {
    tapMul: num("tapMul", 1, 4), allyMul: num("allyMul", 1, 4), bossTimeBonus: num("bossTimeBonus", 0, 30), cooldownMul: num("cooldownMul", 0.4, 1),
    burnMul: num("burnMul", 1, 4), freezeMul: num("freezeMul", 1, 3), critDmgMul: num("critDmgMul", 1, 3), weakWindowMs: num("weakWindowMs", 0, 8000), weakBonus: num("weakBonus", 0, 2),
    weakHunt: r.weakHunt === true, thermalShock: r.thermalShock === true, chainLightning: r.chainLightning === true,
    picked: Array.isArray(r.picked) ? (r.picked.filter((id) => typeof id === "string" && HUNT_PERK_BY_ID[id as HuntPerkId]) as HuntPerkId[]) : [],
  };
}

export type HuntPerkId =
  | "tapUp" | "allyUp" | "bossTime" | "quickCast"
  | "burnDeep" | "freezeLong" | "critEdge" | "weakWide" | "weakSharp"
  | "weakHunt" | "thermalShock" | "chainLightning" | "overdrive";

export type HuntPerkContext = { learned: TitanSkillId[]; equipped: TitanSkillId[] };

export type HuntPerkDef = {
  id: HuntPerkId;
  rarity: HuntPerkRarity;
  label: string;
  desc: string;
  /** 두 요소가 맞물릴 때만 — 카드에 콤보 배지 */
  combo?: boolean;
  /** 어떤 스킬이 있어야 뜨는가 (장착 기준) — 카드 설명의 "필요" 줄 */
  needs?: TitanSkillId[];
  available: (mods: HuntMods, ctx: HuntPerkContext) => boolean;
  apply: (mods: HuntMods) => void;
};

const hasAny = (ctx: HuntPerkContext, ids: TitanSkillId[]) => ids.some((id) => ctx.equipped.includes(id));
const BURN: TitanSkillId[] = ["emberCut", "dragonBreath"];
const FREEZE: TitanSkillId[] = ["frostEdge", "tidalBurst"];
const CRIT: TitanSkillId[] = ["crit", "waterStep", "focus"];

export const HUNT_PERKS: HuntPerkDef[] = [
  // ── 일반 — 숫자가 오른다. 몇 번이고 고를 수 있다
  { id: "tapUp", rarity: "common", label: "단단한 북채", desc: "탭·스킬 피해 +12%", available: () => true, apply: (m) => { m.tapMul *= 1.12; } },
  { id: "allyUp", rarity: "common", label: "합주 훈련", desc: "동료 피해 +10%", available: () => true, apply: (m) => { m.allyMul *= 1.1; } },
  { id: "bossTime", rarity: "common", label: "댐 보강", desc: "보스 제한시간 +3초", available: (m) => m.bossTimeBonus < 15, apply: (m) => { m.bossTimeBonus += 3; } },
  { id: "quickCast", rarity: "common", label: "빠른 박자", desc: "스킬 재사용 −8%", available: (m) => m.cooldownMul > 0.6, apply: (m) => { m.cooldownMul *= 0.92; } },
  // ── 레어 — 장착한 스킬이 눈에 띄게 달라진다
  { id: "burnDeep", rarity: "rare", needs: BURN, label: "장작 더 넣기", desc: "화상 틱 피해 +40%", available: (m, c) => hasAny(c, BURN) && m.burnMul < 3, apply: (m) => { m.burnMul *= 1.4; } },
  { id: "freezeLong", rarity: "rare", needs: FREEZE, label: "깊은 얼음", desc: "빙결 지속 +30% — 보스 시계가 더 오래 멈춘다", available: (m, c) => hasAny(c, FREEZE) && m.freezeMul < 2.2, apply: (m) => { m.freezeMul *= 1.3; } },
  { id: "critEdge", rarity: "rare", needs: CRIT, label: "날 선 앞니", desc: "치명 피해 +25%", available: (m, c) => hasAny(c, CRIT) && m.critDmgMul < 2.5, apply: (m) => { m.critDmgMul *= 1.25; } },
  { id: "weakWide", rarity: "rare", label: "약점 관찰", desc: "보스 약점 창 +2초", available: (m) => m.weakWindowMs < 6000, apply: (m) => { m.weakWindowMs += 2000; } },
  { id: "weakSharp", rarity: "rare", label: "약점 찌르기", desc: "약점 명중 피해 +40%p", available: (m) => m.weakBonus < 1.6, apply: (m) => { m.weakBonus += 0.4; } },
  // ── 에픽 — 빌드 방향이 바뀐다. 콤보는 두 요소가 맞물릴 때만
  { id: "overdrive", rarity: "epic", label: "북 폭주", desc: "스킬 재사용 −20% · 탭 피해 +20%", available: (m) => m.cooldownMul > 0.5, apply: (m) => { m.cooldownMul *= 0.8; m.tapMul *= 1.2; } },
  { id: "weakHunt", rarity: "epic", combo: true, label: "약점 사냥", desc: "약점을 맞힐 때마다 보스 제한시간 +1초", available: (m) => !m.weakHunt, apply: (m) => { m.weakHunt = true; } },
  { id: "thermalShock", rarity: "epic", combo: true, needs: [...BURN, ...FREEZE], label: "열충격", desc: "불타는 적을 얼리면 탭 피해 ×6 의 폭발", available: (m, c) => hasAny(c, BURN) && hasAny(c, FREEZE) && !m.thermalShock, apply: (m) => { m.thermalShock = true; } },
  { id: "chainLightning", rarity: "epic", combo: true, needs: CRIT, label: "연쇄 번개", desc: "치명 스킬 명중 뒤 30% 추가 타가 한 번 더", available: (m, c) => hasAny(c, CRIT) && !m.chainLightning, apply: (m) => { m.chainLightning = true; } },
];

export const HUNT_PERK_BY_ID: Record<HuntPerkId, HuntPerkDef> = Object.fromEntries(HUNT_PERKS.map((p) => [p.id, p])) as Record<HuntPerkId, HuntPerkDef>;

/** 지역(0~4)별 등급 확률 — 초원의 에픽은 사건, 심연은 빌드를 굳히는 판 */
export function huntRarityOdds(areaIndex: number): Record<HuntPerkRarity, number> {
  const a = Math.max(0, Math.min(4, areaIndex));
  const epic = 0.05 + a * 0.025;
  const rare = 0.25 + a * 0.04;
  return { common: Math.max(0, 1 - rare - epic), rare, epic };
}

/** 3장 뽑기 — 등급을 먼저 굴리고 그 등급의 가능한 카드 중 하나. 같은 카드는 한 번에 한 장 */
export function pickHuntPerks(mods: HuntMods, ctx: HuntPerkContext, rng: () => number = Math.random, areaIndex = 0, count = 3): HuntPerkDef[] {
  const odds = huntRarityOdds(areaIndex);
  const pool = HUNT_PERKS.filter((p) => p.available(mods, ctx));
  const out: HuntPerkDef[] = [];
  for (let i = 0; i < count && pool.length > out.length; i += 1) {
    const r = rng();
    const want: HuntPerkRarity = r < odds.epic ? "epic" : r < odds.epic + odds.rare ? "rare" : "common";
    const order: HuntPerkRarity[] = want === "epic" ? ["epic", "rare", "common"] : want === "rare" ? ["rare", "common", "epic"] : ["common", "rare", "epic"];
    let chosen: HuntPerkDef | null = null;
    for (const rar of order) {
      const cand = pool.filter((p) => p.rarity === rar && !out.includes(p));
      if (cand.length > 0) { chosen = cand[Math.floor(rng() * cand.length)]; break; }
    }
    if (!chosen) break;
    out.push(chosen);
  }
  return out;
}

export function applyHuntPerk(mods: HuntMods, id: HuntPerkId): HuntMods {
  const def = HUNT_PERK_BY_ID[id];
  if (!def) return mods;
  const next: HuntMods = { ...mods, picked: [...mods.picked, id] };
  def.apply(next);
  return next;
}

/** 화면 칩 — 고른 카드를 짧게 (같은 카드 ×n) */
export function huntModsChips(mods: HuntMods): Array<{ id: HuntPerkId; label: string; count: number; rarity: HuntPerkRarity }> {
  const counts = new Map<HuntPerkId, number>();
  for (const id of mods.picked) counts.set(id, (counts.get(id) ?? 0) + 1);
  return [...counts.entries()].map(([id, count]) => ({ id, label: HUNT_PERK_BY_ID[id].label, count, rarity: HUNT_PERK_BY_ID[id].rarity }));
}
