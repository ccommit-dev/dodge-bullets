import type { GameWorld } from "./types";

/**
 * 런 중 성장 선택 — 런 레벨이 오를 때마다 카드 세 장 중 하나를 고른다.
 * 런이 끝나면 사라지는 일시 강화라 상점 강화(영구)와 겹치지 않는다.
 * 적용은 world.stats / player / runMods 에 직접.
 *
 * 참고 게임(황야의 무법자: 타워 디펜스)의 핵심 루프를 옮긴 부분이다 (2026-09-28):
 *   1. **등급** — 일반 / 레어 / 에픽. **스테이지가 깊어질수록 상위 등급이 잘 나온다**.
 *   2. **스킬 진화** — "같은 스킬도 어떤 카드를 쌓느냐에 따라 전혀 다르게 진화한다".
 *   3. **콤보** — 두 스킬이 맞물릴 때만 뜨는 카드.
 *
 * 2026-09-29: 카드를 **전부 활 계열**로 바꿨다 — 이동 속도·회피 쿨타임·검격 강화 같은 카드는
 * "활을 쏘는 게임"이라는 주제에서 벗어나 있었다(사용자 지적). 남는 일반 카드는 기본 사격·
 * 일섬 게이지·HP 뿐이고 나머지는 속성 화살을 바꾼다.
 *
 * 가이드가 경고한 함정("보이지 않는 스킬에 투자하면 운에 기대는 셈")은 **가진 스킬의 카드만**
 * 후보에 넣어 피한다.
 */

export type PerkRarity = "common" | "rare" | "epic";

export const RARITY_LABEL: Record<PerkRarity, string> = { common: "일반", rare: "레어", epic: "에픽" };

export type PerkId =
  | "learnFire" | "learnWater" | "learnIce" | "learnEarth" | "learnBolt"
  | "gauge" | "heal" | "shotExtra" | "quickdraw" | "boltExtra"
  | "shotPierce" | "waterMore" | "fireWide" | "iceDeep" | "earthHeavy"
  | "arrowStorm" | "overdrive" | "chillHunt" | "chillBurst"
  | "evoBeam" | "evoSeeker" | "evoCluster" | "evoPyre" | "evoShatter" | "evoLingering";

export type PerkDef = {
  id: PerkId;
  rarity: PerkRarity;
  label: string;
  desc: string;
  /** 콤보 카드는 두 스킬이 맞물릴 때만 뜬다 — 화면에서 따로 표시한다 */
  combo?: boolean;
  /** 진화 카드 — 스킬의 작동 방식을 바꾼다. 한 스킬당 하나만 */
  evolution?: boolean;
  /**
   * 습득 카드 — 이번 런에서 그 속성 화살을 쓰기 시작한다 (참고 게임: 스킬은 런 중 카드로 얻는다).
   * 영구 레벨 1 이상(=해금·학습)인 스킬만 뜬다 — "보이지 않는 스킬에 투자하면 운에 기대는 셈"
   */
  learns?: Exclude<keyof GameWorld["skillLevels"], "ultimate">;
  /**
   * 이 카드가 후보에 들어오려면 필요한 스킬. available() 안의 조건을 **밖에서도 읽을 수 있게**
   * 적어 둔 것이다 — 강화 화면이 "이 스킬을 올리면 런 중에 뭐가 열리는지"를 보여주는 데 쓴다.
   * "basic" 은 기본 사격(무기만 있으면 됨). available() 이 진실이고 이건 그것의 목록판이다.
   */
  needs?: Array<keyof GameWorld["skillLevels"] | "basic">;
  available: (w: GameWorld) => boolean;
  apply: (w: GameWorld) => void;
};

/** 영구 레벨 1 이상 — 이 스킬의 습득 카드가 뜰 수 있다 */
const owned = (w: GameWorld, id: keyof GameWorld["skillLevels"]) => (w.skillLevels?.[id] ?? 0) > 0;
/** 이번 런에서 습득해 실제로 쏘고 있는가 — 강화·콤보·진화 카드는 이것을 본다 */
const has = (w: GameWorld, id: keyof GameWorld["skillLevels"]) => owned(w, id) && !!w.runSkills?.[id];
const learn = (id: Exclude<keyof GameWorld["skillLevels"], "ultimate">, name: string, desc: string): PerkDef => ({
  id: ("learn" + id[0].toUpperCase() + id.slice(1)) as PerkId,
  rarity: "common", label: `습득 · ${name}`, desc, learns: id,
  available: (w) => owned(w, id) && !w.runSkills?.[id],
  apply: (w) => {
    w.runSkills[id] = true; w.skillTimers[id] = 0;
    // 습득한 순간 — 주인공을 그 속성의 빛이 감싼다 (모의 월드에는 연출 칸이 없을 수 있다)
    if (w.sfx) { w.heroAura = { element: id, ms: 900 }; w.sfx.learn += 1; }
  },
});
/** 기본 사격이 나가는가 — 무기를 끼고 있으면 */
const armed = (w: GameWorld) => (w.rangedWeapon ?? "none") !== "none";

export const PERKS: PerkDef[] = [
  // ── 습득 — 이번 런에서 그 속성 화살을 쓰기 시작한다. 영구 레벨이 있어야 뜬다
  learn("fire", "불화살", "명중한 자리에서 터진다"),
  learn("water", "물화살", "멈추지 않고 꿰뚫는다"),
  learn("ice", "얼음화살", "명중한 주변을 얼린다"),
  learn("earth", "흙화살", "느리지만 보스를 크게 깎는다"),
  learn("bolt", "번개화살", "쏘는 순간 여럿을 잇는다"),

  // ── 일반 — 무기만 있으면 고를 수 있다
  { id: "gauge", rarity: "common", label: "일섬 게이지 +35", desc: "일섬이 빨리 찬다", available: () => true, apply: (w) => { w.slashGauge = Math.min(99, w.slashGauge + 35); } },
  { id: "heal", rarity: "common", label: "HP 회복 +1", desc: "가득 차 있으면 최대 HP +1", available: () => true, apply: (w) => { if (w.player.hp >= w.player.maxHp) { w.player.maxHp += 1; w.runMods.maxHpBonus += 1; } w.player.hp = Math.min(w.player.maxHp, w.player.hp + 1); } },
  { id: "shotExtra", rarity: "common", needs: ["basic"], label: "기본 사격 +1발", desc: "한 번에 한 발 더 쏜다", available: armed, apply: (w) => { w.runMods.shotExtra += 1; } },
  { id: "quickdraw", rarity: "common", needs: ["basic"], label: "속사", desc: "모든 화살 재사용 −10%", available: armed, apply: (w) => { w.runMods.cooldownMul *= 0.9; } },
  { id: "boltExtra", rarity: "common", needs: ["bolt"], label: "번개 분기 +1", desc: "번개화살이 한 갈래 더 뻗는다", available: (w) => has(w, "bolt"), apply: (w) => { w.runMods.boltExtra += 1; } },

  // ── 레어 — 화살이 눈에 띄게 달라진다
  { id: "shotPierce", rarity: "rare", needs: ["basic"], label: "관통 촉", desc: "기본 화살이 화살 하나를 더 꿰고 나간다", available: armed, apply: (w) => { w.runMods.shotPierce += 1; } },
  { id: "waterMore", rarity: "rare", needs: ["water"], label: "급류", desc: "물화살 관통 +1", available: (w) => has(w, "water"), apply: (w) => { w.runMods.waterPierceExtra += 1; } },
  { id: "fireWide", rarity: "rare", needs: ["fire"], label: "확산 화염", desc: "불화살 폭발 반경 +35%", available: (w) => has(w, "fire"), apply: (w) => { w.runMods.fireRadiusMul *= 1.35; } },
  { id: "iceDeep", rarity: "rare", needs: ["ice"], label: "심층 빙결", desc: "얼음화살이 더 깊게 얼린다", available: (w) => has(w, "ice"), apply: (w) => { w.runMods.iceSlowBonus += 0.1; } },
  { id: "earthHeavy", rarity: "rare", needs: ["earth"], label: "바위 촉", desc: "흙화살 위력 +1 (보스를 더 깎는다)", available: (w) => has(w, "earth"), apply: (w) => { w.runMods.earthPowerBonus += 1; } },

  // ── 에픽 — 빌드의 방향이 바뀐다. 콤보는 두 스킬이 맞물릴 때만.
  {
    id: "arrowStorm", rarity: "epic", needs: ["basic"], label: "화살 폭풍", desc: "기본 사격 +2발 · 모든 기본 화살이 하나씩 더 꿴다",
    available: armed,
    apply: (w) => { w.runMods.shotExtra += 2; w.runMods.shotPierce += 1; },
  },
  {
    id: "overdrive", rarity: "epic", needs: ["basic"], label: "과부하", desc: "모든 화살 재사용 −20%",
    available: armed,
    apply: (w) => { w.runMods.cooldownMul *= 0.8; },
  },
  {
    id: "chillHunt", rarity: "epic", needs: ["ice", "basic"], label: "서리 사냥", desc: "얼어붙은 화살을 부수면 일섬 게이지를 더 받는다", combo: true,
    available: (w) => has(w, "ice") && armed(w) && !w.runMods.chillHunt,
    apply: (w) => { w.runMods.chillHunt = true; },
  },
  {
    id: "chillBurst", rarity: "epic", needs: ["ice", "fire"], label: "열충격", desc: "얼어붙은 화살을 함께 터뜨리면 불화살 폭발이 넓어진다", combo: true,
    available: (w) => has(w, "ice") && has(w, "fire") && !w.runMods.chillBurst,
    apply: (w) => { w.runMods.chillBurst = true; },
  },

  // ── 진화 — 스킬의 **작동 방식**이 바뀐다. 한 스킬당 하나뿐이라 런마다 빌드가 갈린다.
  //    무조건 상위 호환이 되지 않게 장점에는 대가를 붙였다.
  {
    id: "evoBeam", rarity: "epic", needs: ["basic"], label: "진화 · 관통 광선", desc: "기본 화살이 멈추지 않고 화면 끝까지 꿴다 · 화살이 두꺼워진다", evolution: true,
    available: (w) => armed(w) && !w.runMods.evolutions.basic,
    apply: (w) => { w.runMods.evolutions.basic = "beam"; },
  },
  {
    id: "evoSeeker", rarity: "epic", needs: ["basic"], label: "진화 · 유도 화살", desc: "기본 화살이 표적을 쫓아간다 · 대신 느리다", evolution: true,
    available: (w) => armed(w) && !w.runMods.evolutions.basic,
    apply: (w) => { w.runMods.evolutions.basic = "seeker"; },
  },
  {
    id: "evoCluster", rarity: "epic", needs: ["fire"], label: "진화 · 확산 폭발", desc: "불화살 폭발 반경 +60%", evolution: true,
    available: (w) => has(w, "fire") && !w.runMods.evolutions.fire,
    apply: (w) => { w.runMods.evolutions.fire = "cluster"; w.runMods.fireRadiusMul *= 1.6; },
  },
  {
    id: "evoPyre", rarity: "epic", needs: ["fire"], label: "진화 · 화염 장판", desc: "불화살이 터진 자리에 머물며 계속 태운다 · 재사용 +25%", evolution: true,
    available: (w) => has(w, "fire") && !w.runMods.evolutions.fire,
    apply: (w) => { w.runMods.evolutions.fire = "pyre"; },
  },
  {
    id: "evoShatter", rarity: "epic", needs: ["ice"], label: "진화 · 서리 파쇄", desc: "빙결 반경 안쪽 절반은 얼리는 대신 그 자리에서 부순다", evolution: true,
    available: (w) => has(w, "ice") && !w.runMods.evolutions.ice,
    apply: (w) => { w.runMods.evolutions.ice = "shatter"; },
  },
  {
    id: "evoLingering", rarity: "epic", needs: ["ice"], label: "진화 · 지속 서리", desc: "빙결 반경이 넓어지고 3배 오래간다 (콤보가 잘 물린다)", evolution: true,
    available: (w) => has(w, "ice") && !w.runMods.evolutions.ice,
    apply: (w) => { w.runMods.evolutions.ice = "lingering"; },
  },
];

/**
 * 스테이지별 등급 확률 (0-based stageIndex). 깊이 들어갈수록 상위 등급이 잘 나온다 —
 * 1스테이지의 에픽은 사건이고, 4스테이지는 빌드를 굳히는 판이다.
 */
export function rarityOdds(stageIndex: number): Record<PerkRarity, number> {
  const s = Math.max(0, Math.min(3, stageIndex));
  const epic = 0.03 + 0.05 * s;        // 3 · 8 · 13 · 18%
  const rare = 0.20 + 0.05 * s;        // 20 · 25 · 30 · 35%
  return { common: 1 - epic - rare, rare, epic };
}

function rollRarity(odds: Record<PerkRarity, number>, r: number): PerkRarity {
  if (r < odds.epic) return "epic";
  if (r < odds.epic + odds.rare) return "rare";
  return "common";
}

/**
 * 카드 3장 — 자리마다 등급을 먼저 굴리고 그 등급에서 뽑는다.
 * 그 등급에 남은 카드가 없으면 한 단계씩 내려온다(에픽→레어→일반). 결정적 rng 를 넣으면 재현된다.
 */
export function pickPerks(world: GameWorld, rng: () => number = Math.random, count = 3, stageIndex = world.stageIndex ?? 0): PerkDef[] {
  const pool = PERKS.filter((p) => p.available(world));
  // [정예 선발] 소모품 — 이번 3택만 전부 레어 이상. 쓰고 나면 꺼진다 (game/expeditionOps.ts)
  const odds = world.draftBoost ? { common: 0, rare: 0.55, epic: 0.45 } : rarityOdds(stageIndex);
  const out: PerkDef[] = [];
  const order: PerkRarity[] = ["epic", "rare", "common"];
  // 아직 아무것도 습득하지 않았으면 첫 자리는 습득 카드 — 빌드가 시작되지 않는 판을 막는다
  const learnable = pool.filter((p) => p.learns);
  const acquiredAny = Object.values(world.runSkills ?? {}).some(Boolean);
  if (!acquiredAny && learnable.length && count > 0) out.push(learnable[Math.floor(rng() * learnable.length) % learnable.length]);

  let guard = 0;
  while (out.length < Math.min(count, pool.length) && guard < 128) {
    guard += 1;
    const want = rollRarity(odds, rng());
    let taken: PerkDef | undefined;
    for (const tier of order.slice(order.indexOf(want))) {
      const tierPool = pool.filter((p) => p.rarity === tier && !out.includes(p));
      if (!tierPool.length) continue;
      taken = tierPool[Math.floor(rng() * tierPool.length) % tierPool.length];
      break;
    }
    if (!taken) {
      const rest = pool.filter((p) => !out.includes(p));
      if (!rest.length) break;
      taken = rest[Math.floor(rng() * rest.length) % rest.length];
    }
    out.push(taken);
  }
  return out;
}

/** 이 스킬(또는 기본 사격)을 들면 런 중에 열리는 카드들 — 강화 화면이 투자 판단에 쓴다 */
export function perksUnlockedBy(skill: keyof GameWorld["skillLevels"] | "basic"): PerkDef[] {
  return PERKS.filter((p) => p.learns === skill || p.needs?.includes(skill));
}

export function applyPerk(world: GameWorld, id: PerkId): boolean {
  const perk = PERKS.find((p) => p.id === id);
  if (!perk || !perk.available(world)) return false;
  perk.apply(world);
  return true;
}
