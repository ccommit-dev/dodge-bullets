/**
 * 첫 발견 보상 (2026-10-22, 사용자 /goal "아처 키우기 4번 — 발견 보상: 새 화살을 처음 만들면 다이아 50").
 * 몬스터 첫 처치 · 동료 첫 합류 · 도토리 새 단계 · 대장 사다리 첫 칸 — 처음 한 번만 보석 몇 개와 팝업. 비용은 적고 "와" 순간이 잦아진다.
 * CharacterProgress.discovered 에 키를 남긴다(환생해도 유지 — 같은 것은 다시 주지 않는다).
 */
export type DiscoveryKind = "monster" | "ally" | "acorn";

export const discoveryKey = (kind: DiscoveryKind, id: string | number): string => `${kind}:${id}`;

/** 보상 보석 — 도토리는 단계가 높을수록 더 */
export function discoveryGems(kind: DiscoveryKind, id: string | number): number {
  if (kind === "monster") return 20;
  if (kind === "ally") return 50;
  const l = Math.max(1, Math.floor(Number(id)) || 1);
  return l <= 1 ? 0 : Math.min(150, 10 * l);
}

export function discoveryTitle(kind: DiscoveryKind): string {
  return kind === "monster" ? "새 몬스터 발견" : kind === "ally" ? "새 동료 합류" : "새 도토리 발견";
}

export function normalizeDiscovered(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((x): x is string => typeof x === "string" && x.length < 64))].slice(0, 500);
}
