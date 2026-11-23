import type { CharacterProgress } from "./model";

/** art — 배지 그림(asset 경로, 2026-11-23 리소스 피드백 ⑤: 유니코드 기호 ⚔ ♛ ➶ ✦ … 를 작은 원에 넣어 다른 스티커 아이콘과 따로 놀았다). 이미 있는 스티커 그림을 뜻에 맞게 쓴다 */
export type BadgeDefinition = { id: string; icon: string; name: string; condition: string; art?: string };

export const BADGES: BadgeDefinition[] = [
  { id: "first-hunt", icon: "⚔", name: "첫 토벌", condition: "사냥터 Stage 2 달성", art: "titans/gear/icon/sword-2.png" },
  { id: "stage-10", icon: "♛", name: "지역 정복자", condition: "사냥터 Stage 10 달성", art: "titans/relics/beaver-crown.png" },
  { id: "first-expedition", icon: "➶", name: "화살 개척자", condition: "성문 방어 Stage 2 달성", art: "titans/gear/icon/bow-2.png" },
  { id: "dodge-master", icon: "✦", name: "천 번의 회피", condition: "성문 방어 1,000점", art: "ui/rewards/season-xp.png" },
  { id: "shoulder-collector", icon: "◈", name: "견갑 수집가", condition: "견갑 2종 획득", art: "titans/gear/shoulder-scout.png" },
  { id: "all-shoulders", icon: "❖", name: "리듬 지휘관", condition: "견갑 4종 획득", art: "titans/gear/shoulder-dragon.png" },
  { id: "forge-5", icon: "◆", name: "숙련 대장장이", condition: "대장간 최고 +5", art: "ui/rewards/forge-ticket.png" },
  { id: "rebirth-one", icon: "∞", name: "첫 계승", condition: "환생 1회", art: "titans/relics/tree-crystal.png" },
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
