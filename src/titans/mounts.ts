import { MOUNT_SEAT } from "./mountRide";

/**
 * 탈것 (2026-11-03, 사용자: "탈것도 아이템으로 만들어줘 상점에서도 팔고 강화도 가능하게") — 펫과 같은 길.
 * 상점 꾸미기 → 탈것에서 붉은 보석으로 사고, 1마리 장착, 강화석으로 강화. 효과는 사냥 골드뿐이라 전투 밸런스(성문 방어 · 대장 시간)를 건드리지 않는다.
 * 그림: art-gen/blender/roster.py mount-* (몬스터 시트 파이프라인) · 왼쪽을 보게 렌더해 CSS 로 뒤집는다.
 */
export type MountId = "boar" | "deer" | "wolf" | "drake";
export const MOUNT_MAX_LEVEL = 10;
export type MountDef = { id: MountId; name: string; art: string; gemPrice: number; base: number; perLevel: number };
export const MOUNT_DEFS: Record<MountId, MountDef> = {
  boar: { id: "boar", name: "도토리 멧돼지", art: "mount-boar", gemPrice: 300, base: 0.02, perLevel: 0.004 },
  deer: { id: "deer", name: "숲 사슴", art: "mount-deer", gemPrice: 600, base: 0.03, perLevel: 0.005 },
  wolf: { id: "wolf", name: "은빛 늑대", art: "mount-wolf", gemPrice: 1000, base: 0.04, perLevel: 0.006 },
  drake: { id: "drake", name: "불꽃 비룡", art: "mount-drake", gemPrice: 2000, base: 0.05, perLevel: 0.008 },
};
export const MOUNT_IDS: MountId[] = ["boar", "deer", "wolf", "drake"];
/** 앉는 자리 차이 (2026-11-09, 사용자 목록 R3 "다리 긴 사슴 · 짧은 멧돼지에 같은 높이로 앉는다") — 탈것 시트의 안장 자리(MOUNT_SEAT, 조립이 적는다)가
 *  예전 공통 자리([0.455, 0.635])에서 벗어난 만큼 주인공을 옮긴다. 값은 주인공 상자 비율 % — 탈것 상자(200% 정사각)에서 가로 ×200 · 세로 ×100 */
const SEAT_BASE = [0.455, 0.635] as const;
export function mountSeatShift(art: string): [number, number] {
  const s = MOUNT_SEAT[art];
  return s ? [(s[0] - SEAT_BASE[0]) * 200, (s[1] - SEAT_BASE[1]) * 100] : [0, 0];
}
/** 종 특징 (2026-11-09, 사용자: "탈것이 볼품없다 — 특징과 과금 느낌") — 상점 카드 칩. 그림(art-gen/blender/lib/mount.py)의 꾸밈과 같은 말 */
export const MOUNT_TRAITS: Record<MountId, readonly string[]> = {
  boar: ["엄니 돌진", "도토리 장식"],
  deer: ["빛나는 가지뿔", "꽃 목걸이"],
  wolf: ["서리 룬", "강철 투구"],
  drake: ["불꽃 날개", "루비 왕관"],
};
export const isMountId = (v: unknown): v is MountId => typeof v === "string" && (MOUNT_IDS as string[]).includes(v);

/** 사냥 골드 증가(0.02 = +2%) — 레벨 0 = 미보유 */
export function mountGoldBonus(id: MountId, level: number): number {
  if (level <= 0) return 0;
  const def = MOUNT_DEFS[id];
  return def.base + def.perLevel * (Math.min(MOUNT_MAX_LEVEL, level) - 1);
}
/** 장착한 탈것의 사냥 골드 증가 */
export function activeMountGold(mounts: Partial<Record<MountId, number>>, active: string): number {
  return isMountId(active) ? mountGoldBonus(active, mounts[active] ?? 0) : 0;
}
/** 다음 레벨 강화석 — 최대면 null */
export function mountUpgradeCost(level: number): number | null {
  return level <= 0 || level >= MOUNT_MAX_LEVEL ? null : level * 30;
}
