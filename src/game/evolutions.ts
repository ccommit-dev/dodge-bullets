/**
 * 댐 방어전 스킬 진화 수치 (2026-11-11, 탕탕에이스 비교표 1번) — 기본 사격 · 불 · 얼음에만 있던 판 중 진화를 나머지 8종에도 두 갈래씩.
 * 카드는 game/perks.ts(evo*), 작동은 game/skillShots.ts 가 이 표를 읽는다. 장점마다 대가가 있어 무조건 상위 호환이 없게 —
 * scripts/dodge-evolutions.mjs 가 같은 시드로 빌드만 바꿔 클리어 · 요격을 견준다.
 */
import type { GameWorld } from "./types";
import type { ExpeditionSkillId } from "./skills";

export const EVO = {
  /** 해일: 크고 느리게 · 한 마리 더 꿴다 · 재사용 +25% / 물 분열: 세 갈래 · 한 줄기 70% */
  water: { tideSpeed: 0.7, tideRadius: 1.6, tidePierce: 1, tideCooldown: 1.25, splitSpread: 0.2, splitDamage: 0.7 },
  /** 지진: 직격 85% + 주변(반경 2배) 35% / 연발 바위: 둘 · 각 90% · 조금 작게 */
  earth: { quakeDirect: 0.85, quakeRadius: 2.0, quakeSplash: 0.35, barrageSpread: 0.14, barrageDamage: 0.9, barrageRadius: 0.85 },
  /** 연쇄: 두 마리 더 · 62% / 낙뢰: 둘(대장 · 조준 화살 먼저) 2.2배 · 재사용 +15% */
  bolt: { chainExtra: 2, chainDamage: 0.62, smiteTargets: 2, smiteDamage: 2.2, smiteCooldown: 1.15 },
  /** 회오리: 느리게(62%) · 크게(1.4배) · 오래(1.5배) / 돌풍: 빠르게(1.45배) · 멀리(1.3배) · 좁게(80%) */
  wind: { cycloneSpeed: 0.62, cycloneRadius: 1.4, cycloneLife: 1.5, galeSpeed: 1.45, galeRadius: 0.8, galeRange: 1.3 },
  /** 독 안개: 직격 60% · 주변 52px 중독 / 맹독: 독 1.55배 · 75% 시간 */
  poison: { cloudDirect: 0.6, cloudRadius: 52, venomDps: 1.55, venomTime: 0.75 },
  /** 성역: 가장 아래 셋 · 각 48% · 수리 1.25배 / 심판: 한 마리 1.7배 · 재사용 +20% · 수리 절반 */
  holy: { sanctumTargets: 3, sanctumDamage: 0.48, sanctumRepair: 1.25, judgmentDamage: 1.7, judgmentCooldown: 1.2, judgmentRepair: 0.5 },
  /** 그림자 분신: 칼 둘 더 · 각 85% / 암살: 칼 하나에 (원래 수 × 60%) · 재사용 +20% — 단단한 한 마리를 끊는다 */
  shadow: { swarmExtra: 2, swarmDamage: 0.85, assassinPerBlade: 0.6, assassinPierce: 0, assassinCooldown: 1.2 },
  /** 유성우: 셋이 서로 다른 무리에 · 반경 60% · 각 50% / 거대 운석: 반경 1.4배 · 1.15배 · 재사용 +40% */
  meteor: { showerCount: 3, showerRadius: 0.6, showerDamage: 0.5, titanRadius: 1.4, titanDamage: 1.15, titanCooldown: 1.4 },
} as const;

/** 진화가 붙이는 재사용 대가 — 없으면 1 */
export function evoCooldownMul(world: GameWorld, id: ExpeditionSkillId): number {
  const e = world.runMods.evolutions;
  if (id === "water" && e.water === "tide") return EVO.water.tideCooldown;
  if (id === "bolt" && e.bolt === "smite") return EVO.bolt.smiteCooldown;
  if (id === "holy" && e.holy === "judgment") return EVO.holy.judgmentCooldown;
  if (id === "meteor" && e.meteor === "titan") return EVO.meteor.titanCooldown;
  if (id === "shadow" && e.shadow === "assassin") return EVO.shadow.assassinCooldown;
  return 1;
}
