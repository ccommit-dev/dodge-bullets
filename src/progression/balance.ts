/** 경험치는 2026-11-10 단위 낮추기 2차(economy/units EXP_UNIT)로 예전의 1/10 — 필요 경험치도 1/10 이라 레벨 속도는 같다. 지급은 반올림해 정수로 준다 */
export const PROGRESSION_BALANCE = {
  dodge: {
    clearExpBase: 4.2,
    clearExpPerStage: 1.2,
    materialBase: 7,
    maxSkillBonus: 0.08,
  },
  beat: {
    clearExp: 2,
  },
  forge: {
    successExp: 1.2,
    successExpPerLevel: 0.2,
  },
  titans: {
    bossExpBase: 3.6,
    bossExpPerStage: 0.8,
  },
} as const;

export function dodgeClearReward(stageIndex: number, maxCombo: number) {
  const stage = Math.max(0, Math.floor(stageIndex));
  return {
    exp: Math.round(PROGRESSION_BALANCE.dodge.clearExpBase + stage * PROGRESSION_BALANCE.dodge.clearExpPerStage),
    materials:
      PROGRESSION_BALANCE.dodge.materialBase + stage * 2 + Math.min(8, Math.floor(maxCombo / 5)),
  };
}
