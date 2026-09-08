export type EquipmentAnchor = { x: number; y: number; rotation: number; scale: number };
export type EquipmentFrameAnchors = {
  hand: EquipmentAnchor;
  shoulderLeft: EquipmentAnchor;
  shoulderRight: EquipmentAnchor;
};

/**
 * 대기 시트(2026-09-08 교체): 오른쪽을 보는 3/4 자세 4프레임 동일 — 앞손(뷰어 오른쪽)에 검, 어깨는 뒤(52%)·앞(79%).
 * 좌표는 scripts/make-hero-idle-sheet.mjs 가 찍는 프레임 % 와 격자 확인(art-gen/out/idle-grid.png)으로 잡았다.
 */
export const IDLE_EQUIPMENT_ANCHORS: EquipmentFrameAnchors[] = [
  { hand: { x: 86, y: 50, rotation: 25, scale: .38 }, shoulderLeft: { x: 52, y: 25, rotation: -6, scale: .68 }, shoulderRight: { x: 79, y: 24, rotation: 10, scale: .72 } },
  { hand: { x: 86, y: 50, rotation: 25, scale: .38 }, shoulderLeft: { x: 52, y: 25, rotation: -6, scale: .68 }, shoulderRight: { x: 79, y: 24, rotation: 10, scale: .72 } },
  { hand: { x: 86, y: 50, rotation: 25, scale: .38 }, shoulderLeft: { x: 52, y: 25, rotation: -6, scale: .68 }, shoulderRight: { x: 79, y: 24, rotation: 10, scale: .72 } },
  { hand: { x: 86, y: 50, rotation: 25, scale: .38 }, shoulderLeft: { x: 52, y: 25, rotation: -6, scale: .68 }, shoulderRight: { x: 79, y: 24, rotation: 10, scale: .72 } },
];

/**
 * 공격 시트의 프레임 0·2는 원본이 왼쪽을 보고 있어 이미지에서 좌우 반전했다
 * (모든 프레임이 몬스터 쪽인 오른쪽을 보도록). 그 두 프레임의 앵커도 함께
 * 미러링된 값이다: x → 100-x, rotation → -rotation, 좌·우 견갑 스왑.
 */
export const ATTACK_EQUIPMENT_ANCHORS: EquipmentFrameAnchors[] = [
  { hand: { x: 70, y: 34, rotation: 35, scale: .46 }, shoulderLeft: { x: 39, y: 28, rotation: -12, scale: .78 }, shoulderRight: { x: 69, y: 25, rotation: 18, scale: .78 } },
  { hand: { x: 46, y: 21, rotation: 8, scale: .46 }, shoulderLeft: { x: 40, y: 25, rotation: -12, scale: .78 }, shoulderRight: { x: 66, y: 29, rotation: 20, scale: .78 } },
  { hand: { x: 30, y: 52, rotation: -78, scale: .46 }, shoulderLeft: { x: 33, y: 31, rotation: -18, scale: .78 }, shoulderRight: { x: 58, y: 28, rotation: 8, scale: .78 } },
  { hand: { x: 85, y: 31, rotation: 104, scale: .46 }, shoulderLeft: { x: 43, y: 28, rotation: -4, scale: .78 }, shoulderRight: { x: 69, y: 29, rotation: 16, scale: .78 } },
];
