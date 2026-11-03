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
  drake: { id: "drake", name: "불꽃 뿔여우", art: "mount-drake", gemPrice: 2000, base: 0.05, perLevel: 0.008 },
};
export const MOUNT_IDS: MountId[] = ["boar", "deer", "wolf", "drake"];
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
