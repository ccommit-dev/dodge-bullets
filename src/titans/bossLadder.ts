/**
 * 대장 사다리 — 대장 처치의 영구 보상 (2026-10-22, 사용자 /goal "아처 키우기 3번 — 보스 사다리 + 영구 보상").
 * 처음 깨는 대장 스테이지마다 영구 특성이 한 칸씩 오른다(동료 피해 → 탭 피해 → 처치 골드 → 자동 공격 속도 순서로 돈다).
 * 캐릭터 진행(CharacterProgress.bossLadder)에 남아 환생해도 유지 — 환생 뒤에는 예전 최고 대장을 넘어서야 다시 오른다.
 * 대장 처치가 골드만 주던 것 → "다음 대장을 잡으면 무엇이 영구히 오르는지"가 보여 매번 잡을 이유가 생긴다.
 */
export type LadderPerk = "ally" | "tap" | "gold" | "speed";
export const LADDER_ORDER: LadderPerk[] = ["ally", "tap", "gold", "speed"];
/** 한 칸당 오름 · 특성별 최대 칸 */
export const LADDER_STEP: Record<LadderPerk, number> = { ally: 0.03, tap: 0.05, gold: 0.03, speed: 0.02 };
export const LADDER_CAP = 40;
export const LADDER_LABEL: Record<LadderPerk, string> = { ally: "동료 피해", tap: "탭 피해", gold: "처치 골드", speed: "자동 공격 속도" };

export type BossLadder = { top: number; ranks: Record<LadderPerk, number> };

export function emptyLadder(): BossLadder {
  return { top: 0, ranks: { ally: 0, tap: 0, gold: 0, speed: 0 } };
}

export function normalizeLadder(value: unknown): BossLadder {
  const v = (value && typeof value === "object" ? value : {}) as Partial<BossLadder>;
  const n = (x: unknown, max: number) => { const k = Math.floor(Number(x)); return Number.isFinite(k) ? Math.max(0, Math.min(max, k)) : 0; };
  const r = (v.ranks ?? {}) as Partial<Record<LadderPerk, number>>;
  return { top: n(v.top, 1_000_000), ranks: { ally: n(r.ally, LADDER_CAP), tap: n(r.tap, LADDER_CAP), gold: n(r.gold, LADDER_CAP), speed: n(r.speed, LADDER_CAP) } };
}

/** 대장 스테이지 stage 를 처음 깼을 때 오를 특성 — 이미 깬 높이면 null */
export function perkForStage(ladder: BossLadder, stage: number): LadderPerk | null {
  if (stage <= ladder.top) return null;
  // 다 찬 특성은 건너뛴다 — 넷 다 차면 null
  for (let k = 0; k < LADDER_ORDER.length; k += 1) {
    const perk = LADDER_ORDER[(ladder.top + k) % LADDER_ORDER.length];
    if (ladder.ranks[perk] < LADDER_CAP) return perk;
  }
  return null;
}

/** 대장 처치 반영 — 처음 깬 높이면 특성 한 칸 + top 갱신 */
export function climbLadder(ladder: BossLadder, stage: number): { ladder: BossLadder; perk: LadderPerk | null } {
  if (stage <= ladder.top) return { ladder, perk: null };
  const perk = perkForStage(ladder, stage);
  const ranks = perk ? { ...ladder.ranks, [perk]: ladder.ranks[perk] + 1 } : ladder.ranks;
  return { ladder: { top: stage, ranks }, perk };
}

/** 지금 효과 (배율) */
export function ladderEffects(l: BossLadder): { allyMul: number; tapMul: number; goldMul: number; speedMul: number } {
  return {
    allyMul: 1 + LADDER_STEP.ally * l.ranks.ally,
    tapMul: 1 + LADDER_STEP.tap * l.ranks.tap,
    goldMul: 1 + LADDER_STEP.gold * l.ranks.gold,
    speedMul: 1 + LADDER_STEP.speed * l.ranks.speed,
  };
}

/** 사다리 칸 수(합) */
export const ladderLevel = (l: BossLadder): number => l.ranks.ally + l.ranks.tap + l.ranks.gold + l.ranks.speed;

/** "+3% (영구) · 지금 +12% → +15%" 같은 보상 문구 */
export function perkLabel(l: BossLadder, perk: LadderPerk): string {
  const now = Math.round(LADDER_STEP[perk] * l.ranks[perk] * 100);
  const next = Math.round(LADDER_STEP[perk] * (l.ranks[perk] + 1) * 100);
  return `${LADDER_LABEL[perk]} +${Math.round(LADDER_STEP[perk] * 100)}% 영구 (${now}% → ${next}%)`;
}
