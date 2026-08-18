import type { CharacterProgress } from "./model";

export type BadgeDefinition = { id: string; icon: string; name: string; condition: string };

export const BADGES: BadgeDefinition[] = [
  { id: "first-hunt", icon: "⚔", name: "첫 토벌", condition: "사냥터 Stage 2 달성" },
  { id: "stage-10", icon: "♛", name: "지역 정복자", condition: "사냥터 Stage 10 달성" },
  { id: "first-expedition", icon: "➶", name: "화살 개척자", condition: "화살 원정 Stage 2 달성" },
  { id: "dodge-master", icon: "✦", name: "천 번의 회피", condition: "화살 원정 1,000점" },
  { id: "shoulder-collector", icon: "◈", name: "견갑 수집가", condition: "견갑 2종 획득" },
  { id: "all-shoulders", icon: "❖", name: "리듬 지휘관", condition: "견갑 4종 획득" },
  { id: "forge-5", icon: "◆", name: "숙련 대장장이", condition: "대장간 최고 +5" },
  { id: "rebirth-one", icon: "∞", name: "첫 계승", condition: "환생 1회" },
];

export function earnedBadgeIds(progress: CharacterProgress): string[] {
  return BADGES.filter((badge) => {
    if (badge.id === "first-hunt") return progress.titanBestStage >= 2;
    if (badge.id === "stage-10") return progress.titanBestStage >= 10;
    if (badge.id === "first-expedition") return progress.dodgeBestStage >= 2;
    if (badge.id === "dodge-master") return progress.dodgeBestScore >= 1000;
    if (badge.id === "shoulder-collector") return progress.ownedShoulders.length >= 2;
    if (badge.id === "all-shoulders") return progress.ownedShoulders.length >= 4;
    if (badge.id === "forge-5") return progress.bestForgeLevel >= 5;
    return progress.rebirthCount >= 1;
  }).map((badge) => badge.id);
}
