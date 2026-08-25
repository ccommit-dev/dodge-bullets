import type { PlayerStats, ShopLevels, ShopUpgradeId } from "./types";

export const SHOP_MAX: Record<ShopUpgradeId, number> = {
  moveSpeed: 5,
  jumpPower: 5,
  dash: 5,
  slowField: 5,
  extraLife: 3,
};

export const SHOP_META: Record<
  ShopUpgradeId,
  { name: string; category: "이동 훈련" | "생존 장비"; desc: string; baseCost: number; costStep: number }
> = {
  moveSpeed: {
    name: "경량 장화",
    category: "이동 훈련",
    desc: "원정지에서 좌우 이동 속도가 증가해요",
    baseCost: 40,
    costStep: 35,
  },
  jumpPower: {
    name: "바람 망토",
    category: "이동 훈련",
    desc: "공중 제어력과 점프 높이가 증가해요",
    baseCost: 45,
    costStep: 40,
  },
  dash: {
    name: "그림자 부츠",
    category: "이동 훈련",
    desc: "Shift / 대시 버튼으로 짧은 무적 횡이동",
    baseCost: 60,
    costStep: 45,
  },
  slowField: {
    name: "반격 검술",
    category: "생존 장비",
    desc: "검격 범위·재사용 속도·분열 화살 약화율·불규칙 궤도가 단계별 강화",
    baseCost: 90,
    costStep: 60,
  },
  extraLife: {
    name: "수호 부적",
    category: "생존 장비",
    desc: "치명적인 피격을 견디는 추가 하트",
    baseCost: 120,
    costStep: 100,
  },
};

export function emptyShopLevels(): ShopLevels {
  return {
    moveSpeed: 0,
    jumpPower: 0,
    dash: 0,
    slowField: 0,
    extraLife: 0,
  };
}

export function upgradeCost(id: ShopUpgradeId, currentLevel: number): number {
  const meta = SHOP_META[id];
  return meta.baseCost + meta.costStep * currentLevel;
}

/** Balance curve used by stages (Prompt F). */
export function statsFromLevels(levels: ShopLevels): PlayerStats {
  const ms = levels.moveSpeed;
  const jp = levels.jumpPower;
  const d = levels.dash;
  const s = levels.slowField;
  const life = levels.extraLife;

  return {
    moveSpeed: 400 + ms * 60,
    jumpPower: 560 + jp * 55,
    dashUnlocked: d > 0,
    dashSpeed: 920 + d * 100,
    dashDurationMs: 120 + d * 22,
    dashCooldownMs: Math.max(550, 1400 - d * 150),
    dashIFramesMs: 100 + d * 25,
    slowUnlocked: true,
    slowRadius: 82 + s * 18,
    slowFactor: Math.max(0.35, 0.72 - s * 0.06),
    slowDurationMs: 700 + s * 180,
    // Counter slash is the expedition's main action. Keep the same upgrade
    // curve while halving its former 3.5s cooldown.
    slowCooldownMs: Math.max(900, 1750 - s * 150),
    slashLevel: s,
    extraLives: life,
    // Slight hitbox shrink with extraLife investments beyond lives
    hitboxScale: Math.max(0.82, 1 - life * 0.04),
  };
}
