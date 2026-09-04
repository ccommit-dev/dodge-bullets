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

/**
 * 보급소 삭제 후 파생 스탯 — 구매 대신 캐릭터 성장이 기동·검격 레벨을 끌어올린다.
 *   경량 장화·바람 망토: 캐릭터 레벨 / 그림자 부츠(대시): 원정 첫 클리어부터
 *   반격 검술: 장착 검 강화(+3마다 1) — 대장간이 원정 전투력이 되는 연결
 *   수호 부적: 레벨 15마다 1 (최대 3)
 */
export function derivedShopLevels(progress: {
  level: number;
  equippedWeaponLevel: number;
  dodgeBestStage: number;
}): ShopLevels {
  return {
    moveSpeed: Math.min(SHOP_MAX.moveSpeed, Math.floor(progress.level / 8)),
    jumpPower: Math.min(SHOP_MAX.jumpPower, Math.floor(progress.level / 10)),
    dash: Math.min(SHOP_MAX.dash, progress.dodgeBestStage >= 2 ? 1 + Math.floor(progress.level / 20) : 0),
    slowField: Math.min(SHOP_MAX.slowField, Math.floor(progress.equippedWeaponLevel / 3)),
    extraLife: Math.min(SHOP_MAX.extraLife, Math.floor(progress.level / 15)),
  };
}

/** 저장된 구매 레벨과 파생 레벨의 항목별 최대 — 보급소에서 산 것을 잃지 않는다 */
export function mergeShopLevels(saved: ShopLevels, derived: ShopLevels): ShopLevels {
  const out = { ...saved };
  (Object.keys(out) as ShopUpgradeId[]).forEach((id) => {
    out[id] = Math.min(SHOP_MAX[id], Math.max(saved[id], derived[id]));
  });
  return out;
}

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
    // 검객 규칙: 스윙 순간에만 베므로 쿨다운을 짧게 — 리듬이 빨라야 한다 (docs/CONTENT_BEAT_DODGE_PLAN.md §2)
    slowCooldownMs: Math.max(600, 1150 - s * 90),
    slashLevel: s,
    extraLives: life,
    // Slight hitbox shrink with extraLife investments beyond lives
    hitboxScale: Math.max(0.82, 1 - life * 0.04),
  };
}
