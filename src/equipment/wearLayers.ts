/** 입는 파츠 그림 층 (art-gen/blender/hero_gear.py) — 그림 = 대기 0칸 자세의 칸 전체. 칸마다 뼈 앵커가 대기 0칸에서 움직인 만큼 옮긴다.
 * [그림 이름, 세트 부위, 따라갈 앵커] · 아래부터 위로 그린다 */
import type { EquippedGear } from "./gearSets";
import type { EquipmentFrameAnchors } from "./anchors";

export const WEAR_LAYERS: ReadonlyArray<[string, keyof EquippedGear, keyof EquipmentFrameAnchors]> = [
  ["bootR", "boots", "footR"], ["bootL", "boots", "footL"], ["armor", "armor", "chest"], ["gloveR", "gloves", "offHand"],
  ["shoulder", "shoulder", "chest"], ["helmet", "helmet", "head"], ["gloveL", "gloves", "hand"],
];
