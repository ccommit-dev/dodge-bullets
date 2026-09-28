import type { GameWorld } from "./types";

/**
 * 런 중 성장 선택 — 런 레벨이 오를 때마다 카드 세 장 중 하나를 고른다.
 * 런이 끝나면 사라지는 일시 강화라 상점 강화(영구)와 겹치지 않는다.
 * 적용은 world.stats / player / runMods 에 직접.
 *
 * 참고 게임(황야의 무법자: 타워 디펜스)의 핵심 루프를 옮긴 부분이다 (2026-09-28):
 *
 *   1. **등급** — 카드는 일반 / 레어 / 에픽으로 나뉘고, **스테이지가 깊어질수록 상위 등급이
 *      잘 나온다**. 1스테이지에서 에픽을 보면 사건이고, 4스테이지에서는 빌드를 에픽으로
 *      굳히는 판이 된다. 등급이 없으면 레벨업이 그냥 "+12% 셋 중 하나"라 집중이 안 된다.
 *   2. **스킬 진화** — "같은 스킬도 어떤 카드를 쌓느냐에 따라 전혀 다르게 진화한다".
 *   3. **콤보** — "얼음으로 느려진 대상에 추가 피해" 처럼 두 스킬이 맞물릴 때만 뜨는 카드.
 *
 * 가이드가 경고한 함정("런 중에 거의 보이지 않는 스킬에 투자하면 운에 기대는 셈")은
 * **가진 스킬의 카드만 후보에 넣어** 피한다. 스킬이 하나도 없으면 후보가 예전 일반 다섯 장
 * 그대로라 기존 난이도 기준선이 흔들리지 않는다.
 */

export type PerkRarity = "common" | "rare" | "epic";

export const RARITY_LABEL: Record<PerkRarity, string> = { common: "일반", rare: "레어", epic: "에픽" };

export type PerkId =
  | "gauge" | "speed" | "heal" | "slash" | "dash"
  | "volleyExtra" | "boltPierce" | "flameWide" | "chainExtra" | "frostDeep"
  | "volleyStorm" | "overdrive" | "chillHunt" | "chillBurst";

export type PerkDef = {
  id: PerkId;
  rarity: PerkRarity;
  label: string;
  desc: string;
  /** 콤보 카드는 두 스킬이 맞물릴 때만 뜬다 — 화면에서 따로 표시한다 */
  combo?: boolean;
  available: (w: GameWorld) => boolean;
  apply: (w: GameWorld) => void;
};

/** 그 스킬을 실제로 들고 있는가 (영구 레벨 1 이상) */
const has = (w: GameWorld, id: keyof GameWorld["skillLevels"]) => (w.skillLevels?.[id] ?? 0) > 0;

export const PERKS: PerkDef[] = [
  // ── 일반 — 무엇을 들고 있든 고를 수 있다
  { id: "gauge", rarity: "common", label: "일섬 게이지 +35", desc: "일섬이 빨리 찬다", available: () => true, apply: (w) => { w.slashGauge = Math.min(99, w.slashGauge + 35); } },
  { id: "speed", rarity: "common", label: "이동 속도 +12%", desc: "이번 런 동안", available: () => true, apply: (w) => { w.stats.moveSpeed *= 1.12; } },
  { id: "heal", rarity: "common", label: "HP 회복 +1", desc: "가득 차 있으면 최대 HP +1", available: () => true, apply: (w) => { if (w.player.hp >= w.player.maxHp) w.player.maxHp += 1; w.player.hp = Math.min(w.player.maxHp, w.player.hp + 1); } },
  { id: "slash", rarity: "common", label: "검격 강화 +1", desc: "베기 점수·파편 약화", available: () => true, apply: (w) => { w.stats.slashLevel += 1; } },
  { id: "dash", rarity: "common", label: "회피 쿨타임 -15%", desc: "대시가 열려 있을 때", available: (w) => w.stats.dashUnlocked, apply: (w) => { w.stats.dashCooldownMs *= 0.85; } },
  { id: "volleyExtra", rarity: "common", label: "연속 사격 +1발", desc: "한 번에 한 발 더 날린다", available: (w) => has(w, "volley"), apply: (w) => { w.runMods.volleyExtra += 1; } },
  { id: "chainExtra", rarity: "common", label: "사슬 분기 +1", desc: "번개가 한 갈래 더 뻗는다", available: (w) => has(w, "chain"), apply: (w) => { w.runMods.chainExtra += 1; } },

  // ── 레어 — 스킬이 눈에 띄게 달라진다
  { id: "boltPierce", rarity: "rare", label: "관통 볼트", desc: "볼트 한 발이 화살 하나를 더 꿰고 나간다", available: (w) => has(w, "volley"), apply: (w) => { w.runMods.boltPierce += 1; } },
  { id: "flameWide", rarity: "rare", label: "확산 화염", desc: "화염탄 폭발 반경 +35%", available: (w) => has(w, "flame"), apply: (w) => { w.runMods.flameRadiusMul *= 1.35; } },
  { id: "frostDeep", rarity: "rare", label: "심층 빙결", desc: "빙결 파동이 더 깊게 얼린다", available: (w) => has(w, "frost"), apply: (w) => { w.runMods.frostSlowBonus += 0.1; } },

  // ── 에픽 — 빌드의 방향이 바뀐다. 콤보는 두 스킬이 맞물릴 때만.
  {
    id: "volleyStorm", rarity: "epic", label: "탄막 폭풍", desc: "연속 사격 +2발 · 모든 볼트가 하나씩 더 꿴다",
    available: (w) => has(w, "volley"),
    apply: (w) => { w.runMods.volleyExtra += 2; w.runMods.boltPierce += 1; },
  },
  {
    id: "overdrive", rarity: "epic", label: "과부하", desc: "장착한 모든 원거리 스킬의 재사용 −20%",
    available: (w) => Object.values(w.skillLevels ?? {}).some((v) => v > 0),
    apply: (w) => { w.runMods.cooldownMul *= 0.8; },
  },
  {
    id: "chillHunt", rarity: "epic", label: "서리 사냥", desc: "얼어붙은 화살을 부수면 일섬 게이지를 더 받는다", combo: true,
    available: (w) => has(w, "frost") && has(w, "volley") && !w.runMods.chillHunt,
    apply: (w) => { w.runMods.chillHunt = true; },
  },
  {
    id: "chillBurst", rarity: "epic", label: "열충격", desc: "얼어붙은 화살을 함께 터뜨리면 화염 폭발이 넓어진다", combo: true,
    available: (w) => has(w, "frost") && has(w, "flame") && !w.runMods.chillBurst,
    apply: (w) => { w.runMods.chillBurst = true; },
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
  const odds = rarityOdds(stageIndex);
  const out: PerkDef[] = [];
  const order: PerkRarity[] = ["epic", "rare", "common"];

  let guard = 0;
  while (out.length < Math.min(count, pool.length) && guard < 128) {
    guard += 1;
    const want = rollRarity(odds, rng());
    // 원하는 등급부터 아래로 내려가며 남은 카드를 찾는다
    let taken: PerkDef | undefined;
    for (const tier of order.slice(order.indexOf(want))) {
      const tierPool = pool.filter((p) => p.rarity === tier && !out.includes(p));
      if (!tierPool.length) continue;
      taken = tierPool[Math.floor(rng() * tierPool.length) % tierPool.length];
      break;
    }
    // 아래로도 없으면 위로 올려본다 (일반이 먼저 동나는 경우)
    if (!taken) {
      const rest = pool.filter((p) => !out.includes(p));
      if (!rest.length) break;
      taken = rest[Math.floor(rng() * rest.length) % rest.length];
    }
    out.push(taken);
  }
  return out;
}

export function applyPerk(world: GameWorld, id: PerkId): boolean {
  const perk = PERKS.find((p) => p.id === id);
  if (!perk || !perk.available(world)) return false;
  perk.apply(world);
  return true;
}
