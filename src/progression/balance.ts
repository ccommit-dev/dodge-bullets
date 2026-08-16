export const PROGRESSION_BALANCE = {
  dodge: {
    clearExpBase: 42,
    materialBase: 7,
    maxSkillBonus: 0.08,
  },
  beat: {
    clearExp: 18,
  },
  forge: {
    successExp: 12,
  },
  titans: {
    bossExpBase: 36,
  },
} as const;

export function dodgeClearReward(stageIndex: number, maxCombo: number) {
  const stage = Math.max(0, Math.floor(stageIndex));
  return {
    exp: PROGRESSION_BALANCE.dodge.clearExpBase + stage * 12,
    materials:
      PROGRESSION_BALANCE.dodge.materialBase + stage * 2 + Math.min(8, Math.floor(maxCombo / 5)),
  };
}
