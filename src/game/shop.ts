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
  { name: string; desc: string; baseCost: number; costStep: number }
> = {
  moveSpeed: {
    name: "이동속도",
    desc: "좌우 이동이 더 빨라져요",
    baseCost: 40,
    costStep: 35,
  },
  jumpPower: {
    name: "점프력",
    desc: "더 높이 뛰어 화살을 피해요",
    baseCost: 45,
    costStep: 40,
  },
  dash: {
    name: "공중 대시",
    desc: "Shift / 대시 버튼 — 짧은 무적 횡이동",
    baseCost: 60,
    costStep: 45,
  },
  slowField: {
    name: "감속 자기장",
    desc: "E / 슬로우 버튼 — 근처 화살 감속",
    baseCost: 90,
    costStep: 60,
  },
  extraLife: {
    name: "여분 생명",
    desc: "피격 시 버틸 수 있는 추가 하트",
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
    slowUnlocked: s > 0,
    slowRadius: 70 + s * 18,
    slowFactor: Math.max(0.35, 0.72 - s * 0.06),
    slowDurationMs: 700 + s * 180,
    slowCooldownMs: Math.max(2200, 4500 - s * 350),
    extraLives: life,
    // Slight hitbox shrink with extraLife investments beyond lives
    hitboxScale: Math.max(0.82, 1 - life * 0.04),
  };
}
