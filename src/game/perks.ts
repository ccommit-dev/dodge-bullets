import type { GameWorld } from "./types";

/**
 * 런 중 성장 선택 (계획안 §23) — 스테이지마다 마지막 웨이브 앞에서 한 번, 세 가지 중 하나를 고른다.
 * 런이 끝나면 사라지는 일시 강화라 상점 강화(영구)와 겹치지 않는다. 적용은 world.stats / player 에 직접.
 */
export type PerkId = "gauge" | "speed" | "heal" | "slash" | "dash";
export type PerkDef = { id: PerkId; label: string; desc: string; available: (w: GameWorld) => boolean; apply: (w: GameWorld) => void };

export const PERKS: PerkDef[] = [
  { id: "gauge", label: "참격 게이지 +35", desc: "일섬이 빨리 찬다", available: () => true, apply: (w) => { w.slashGauge = Math.min(99, w.slashGauge + 35); } },
  { id: "speed", label: "이동 속도 +12%", desc: "이번 런 동안", available: () => true, apply: (w) => { w.stats.moveSpeed *= 1.12; } },
  { id: "heal", label: "HP 회복 +1", desc: "가득 차 있으면 최대 HP +1", available: () => true, apply: (w) => { if (w.player.hp >= w.player.maxHp) w.player.maxHp += 1; w.player.hp = Math.min(w.player.maxHp, w.player.hp + 1); } },
  { id: "slash", label: "참격 강화 +1", desc: "베기 점수·파편 약화", available: () => true, apply: (w) => { w.stats.slashLevel += 1; } },
  { id: "dash", label: "회피 쿨타임 -15%", desc: "대시가 열려 있을 때", available: (w) => w.stats.dashUnlocked, apply: (w) => { w.stats.dashCooldownMs *= 0.85; } },
];

/** 적용 가능한 것 중 3개를 무작위로 (결정적 rng 를 넣으면 시뮬 재현 가능) */
export function pickPerks(world: GameWorld, rng: () => number = Math.random, count = 3): PerkDef[] {
  const pool = PERKS.filter((p) => p.available(world));
  const out: PerkDef[] = [];
  while (out.length < Math.min(count, pool.length)) {
    const i = Math.floor(rng() * pool.length);
    if (!out.includes(pool[i])) out.push(pool[i]);
  }
  return out;
}

export function applyPerk(world: GameWorld, id: PerkId): boolean {
  const perk = PERKS.find((p) => p.id === id);
  if (!perk || !perk.available(world)) return false;
  perk.apply(world);
  return true;
}
