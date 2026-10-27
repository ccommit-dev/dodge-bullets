/**
 * 대장의 반격 (2026-10-27, 사용자: "몬스터나 보스들이 너무 공격을 안 해 — 스테이지 난이도별 실제 난도도 조절 · 공격 데미지 · 애니메이션").
 *
 * 대장전마다 원정대 체력이 가득 차서 시작하고, 대장이 덤빌 때마다 깎인다. 0 이 되면 제한시간이 끝난 것과 같은 "대장 도전 실패".
 * 원정대가 버티는 시간 = 난도 계수 s × 페이스 × 제한시간. 페이스 = 지금까지 깎은 대장 체력 비율 ÷ 흐른 시간 비율(1 이면 딱 제한시간에 잡는 속도).
 * → 대장은 T/페이스 에 쓰러지고 원정대는 s·페이스·T 에 쓰러지니 페이스² > 1/s 여야 이긴다.
 *   s = 1 이면 지금과 같은 난도(제한시간이 먼저 걸린다), s = 0.8 이면 DPS 가 약 12% 더 있어야 한다.
 * 페이스는 실제로 깎는 속도라 탭 · 스킬 · 버프가 다 들어간다. 일반 몬스터의 공격은 피해 숫자만(방치 사냥이 멈추지 않게 원정대를 쓰러뜨리지 않는다).
 */

/** 스테이지 난도 계수 — 10층까지 1(초반 · 온보딩은 예전 그대로), 60층에서 0.8 까지 서서히 */
export function bossPressureScale(stage: number): number {
  const t = Math.max(0, Math.min(1, (stage - 10) / 50));
  return 1 - 0.2 * t;
}

/** 역할 보정 — 탱커 한 명당 +0.05, 힐러 한 명당 +0.04 (각 2명까지). 버티는 시간이 그만큼 길다 */
export function bossPressureWithRoles(stage: number, tanks: number, healers: number): number {
  return bossPressureScale(stage) + 0.05 * Math.min(2, Math.max(0, tanks)) + 0.04 * Math.min(2, Math.max(0, healers));
}

/** 지금 페이스 — 깎은 비율 ÷ 흐른 비율. 시작 직후(흐른 시간 5% 미만)엔 1 로 본다 */
export function bossPace(hpLeftFrac: number, timeElapsedFrac: number): number {
  if (timeElapsedFrac < 0.05) return 1;
  const dealt = Math.max(0, Math.min(1, 1 - hpLeftFrac));
  return Math.max(0.2, Math.min(5, dealt / timeElapsedFrac));
}

/** 대장 한 번의 공격이 깎는 원정대 체력 비율 — 공격 간격(초) ÷ 버티는 시간 */
export function bossHitFraction(stage: number, tanks: number, healers: number, pace: number, bossTimeSec: number, gapSec: number): number {
  const survive = bossPressureWithRoles(stage, tanks, healers) * Math.max(0.2, pace) * Math.max(1, bossTimeSec);
  return Math.max(0, Math.min(1, gapSec / Math.max(0.5, survive)));
}

/** 피해 숫자 크기 — 원정대 체력을 수치로 보여 줄 때의 최대치(스테이지마다 커진다 · 표시용) */
export function partyMaxHpLabel(stage: number): number {
  return Math.round(1000 * Math.pow(1.12, Math.max(0, stage - 1)));
}

/** 공격 간격 — 예전(보스 1.8초 · 일반 2.3초 × 기질)보다 자주. 기질 pace 는 그대로 곱한다 */
export const BOSS_ATTACK_GAP_MS = 1100;
export const MOB_ATTACK_GAP_MS = 1500;
