export type EquipmentAnchor = { x: number; y: number; rotation: number; scale: number };
export type EquipmentFrameAnchors = {
  hand: EquipmentAnchor;
  shoulderLeft: EquipmentAnchor;
  shoulderRight: EquipmentAnchor;
};

/** 망토 앵커 — 두 어깨의 중점에서 등 뒤로. 프레임마다 어깨가 움직이므로 어깨 앵커에서 파생한다 (x/y %, rotation deg, scale) */
export function capeAnchor(frame: EquipmentFrameAnchors, mode: "idle" | "attack"): EquipmentAnchor {
  const x = (frame.shoulderLeft.x + frame.shoulderRight.x) / 2;
  const y = (frame.shoulderLeft.y + frame.shoulderRight.y) / 2;
  const lean = frame.shoulderRight.x - frame.shoulderLeft.x; // 어깨 폭 — 좁을수록 몸이 옆을 본다
  return { x: x - (mode === "attack" ? 8 : 4), y: y + 4, rotation: mode === "attack" ? -10 : -3, scale: 0.72 + Math.min(0.2, lean / 120) };
}

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
