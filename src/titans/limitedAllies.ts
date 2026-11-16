/**
 * 월간 한정 동료 (2026-11-16, 사용자: "달마다 한정 동료 한 명과 그 동료 전용 장비 하나 — 이번 달에만 얻는다 · 새 재화 없이 뽑기와 이벤트로 ·
 * 힘은 성장 곡선 안 · 위로 세지기보다 쓰임새가 다른 동료(대장 전용 · 방치 전용)").
 *
 * - 창(start ~ end, KST)이 열린 동안만 뽑기 풀에 들어가고 같은 등급 안에서 픽업 가중(×2)을 받는다. 2주 픽업 회전(gacha candidates)과는
 *   따로 붙는다 — 회전 후보에 넣으면 회전 위치가 바뀌어 지금 픽업이 모두에게 바뀐다.
 * - 창이 닫혀도 이미 얻은 동료는 그대로 쓴다(로스터 · 도감에 남는다). 다시 얻는 길만 닫힌다.
 * - 전용 장비는 이벤트 상점(이벤트 코인)에서 창이 열린 동안 한 번 산다(economy/eventShop).
 * - 힘: 기본 값은 allyRoster 곡선 그대로(같은 층 · 같은 등급과 같다). 쓰임새는 대장 전용 — 대장에게 ×BOSS, 일반 몬스터에게 ×MOB.
 *   BOSS 는 한 층 위 같은 등급 곡선(층당 ×1.23)보다 작게 둬 '곡선 안'을 지킨다(verify-systems 단언) · 사냥 속도는 balance-sim 이 이 배율로 잰다.
 * - 새 달 추가: 아래 표에 한 줄 + allyRoster NEW_ALLIES 한 줄 + art-gen/blender/roster_ext.py 한 줄 + 전용 장비(gearSets LIMITED_GEAR) 한 줄.
 */
import type { TitanHeroId } from "./model";

export type LimitedGearId = "autumn-gloves";

export type LimitedAllyWindow = {
  /** 동료 id — allyRoster NEW_ALLIES 에 있다 */
  id: TitanHeroId;
  /** 그 동료 전용 장비 */
  gear: LimitedGearId;
  /** 창 — KST(+09:00) ISO. start 이상 end 미만 */
  start: string;
  end: string;
  /** 배너 제목 */
  title: string;
  /** 대장 · 일반 몬스터 배율 (대장 전용) */
  bossMul: number;
  mobMul: number;
};

export const LIMITED_ALLIES: readonly LimitedAllyWindow[] = [
  // 첫 한정 — 11-16 부터 30일. 다음 달은 12-16 부터 한 줄 더
  { id: "autumn" as TitanHeroId, gear: "autumn-gloves", start: "2026-11-16T00:00:00+09:00", end: "2026-12-16T00:00:00+09:00", title: "11월 한정 · 단풍 사냥꾼", bossMul: 1.2, mobMul: 0.82 },
];

const ms = (iso: string) => Date.parse(iso);

export function isLimitedAlly(id: TitanHeroId): boolean {
  return LIMITED_ALLIES.some((w) => w.id === id);
}
export function limitedWindowOf(id: TitanHeroId): LimitedAllyWindow | null {
  return LIMITED_ALLIES.find((w) => w.id === id) ?? null;
}
/** 지금 열린 한정 창 — 없으면 null */
export function activeLimited(now: number = Date.now()): LimitedAllyWindow | null {
  return LIMITED_ALLIES.find((w) => now >= ms(w.start) && now < ms(w.end)) ?? null;
}
/** 창이 닫힐 때까지 남은 일수(올림, 최소 1) */
export function limitedDaysLeft(w: LimitedAllyWindow, now: number = Date.now()): number {
  return Math.max(1, Math.ceil((ms(w.end) - now) / 86400000));
}
/** 뽑기에 나올 수 있나 — 한정이 아니면 늘, 한정이면 창 안에서만 */
export function limitedInPool(id: TitanHeroId, now: number = Date.now()): boolean {
  const w = limitedWindowOf(id);
  return !w || (now >= ms(w.start) && now < ms(w.end));
}
/** 전투 배율 — 한정(대장 전용) 동료의 한 타. 다른 동료는 1 */
export function limitedAllyHitMul(id: TitanHeroId, boss: boolean): number {
  const w = limitedWindowOf(id);
  return w ? (boss ? w.bossMul : w.mobMul) : 1;
}
/** 전용 장비 효과 — 그 동료가 출전 중일 때 대장 피해 (창 세트 한 부위 +4% 와 같은 크기 · 장갑 칸을 쓰는 대신) */
export const LIMITED_GEAR_BOSS_BONUS = 0.04;
export function limitedGearBossMul(equippedGloves: string | undefined, party: readonly TitanHeroId[]): number {
  const w = LIMITED_ALLIES.find((x) => x.gear === equippedGloves);
  return w && party.includes(w.id) ? 1 + LIMITED_GEAR_BOSS_BONUS : 1;
}
