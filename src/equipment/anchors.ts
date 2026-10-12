export type EquipmentAnchor = { x: number; y: number; rotation: number; scale: number };
export type EquipmentFrameAnchors = {
  hand: EquipmentAnchor;
  shoulderLeft: EquipmentAnchor;
  shoulderRight: EquipmentAnchor;
  /** 투구 (2026-10-12, 사용자: "투구·무기·갑옷을 애니메이션 리소스에 반영") — 머리 중심 */
  head: EquipmentAnchor;
  /** 가슴 갑옷 — 몸통 중심 */
  chest: EquipmentAnchor;
};

/** 파츠 티어 (1~3: 나무 · 철 · 금) — 그림은 public/titans/gear/<part>-<tier>.png (카피 5차 아이콘에서 오려 둠) */
export type GearTier = 0 | 1 | 2 | 3;
/** 투구 티어 — 견갑 강화 단계(armorLevel)로: +1 나무 · +5 철 · +10 금 */
export function helmetTierOf(armorLevel: number): GearTier { return armorLevel >= 10 ? 3 : armorLevel >= 5 ? 2 : armorLevel >= 1 ? 1 : 0; }
/** 가슴 갑옷 티어 — 장착 견갑 종류로: 정찰 나무 · 그림자/오우거 철 · 용린 금 */
export function chestTierOf(shoulder: string | null | undefined): GearTier { return !shoulder ? 0 : shoulder === "scout" ? 1 : shoulder === "dragon" ? 3 : 2; }
/** 무기 파츠 티어 — 대장간 검 강화: 1~4 나무 · 5~9 철 · 10+ 금 */
export function weaponTierOf(weaponLevel: number): GearTier { return weaponLevel >= 10 ? 3 : weaponLevel >= 5 ? 2 : weaponLevel >= 1 ? 1 : 0; }
export const GEAR_URL = (part: "helmet" | "armor" | "weapon", tier: GearTier) => `titans/gear/${part}-${tier}.png`;

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
// 2026-10-12 납작 주인공(heroidle-capy2-20272001 반전): 인물이 프레임 y 31~100% · x 3~93%. 머리 중심 (48, 44) · 앞손 (78, 68) · 어깨 y 56
export const IDLE_EQUIPMENT_ANCHORS: EquipmentFrameAnchors[] = [
  { hand: { x: 78, y: 68, rotation: 20, scale: .32 }, shoulderLeft: { x: 36, y: 57, rotation: -6, scale: .55 }, shoulderRight: { x: 64, y: 56, rotation: 10, scale: .58 }, head: { x: 48, y: 40, rotation: -4, scale: .62 }, chest: { x: 50, y: 70, rotation: 0, scale: .62 } },
  { hand: { x: 78, y: 68, rotation: 20, scale: .32 }, shoulderLeft: { x: 36, y: 57, rotation: -6, scale: .55 }, shoulderRight: { x: 64, y: 56, rotation: 10, scale: .58 }, head: { x: 48, y: 40, rotation: -4, scale: .62 }, chest: { x: 50, y: 70, rotation: 0, scale: .62 } },
  { hand: { x: 78, y: 68, rotation: 20, scale: .32 }, shoulderLeft: { x: 36, y: 57, rotation: -6, scale: .55 }, shoulderRight: { x: 64, y: 56, rotation: 10, scale: .58 }, head: { x: 48, y: 40, rotation: -4, scale: .62 }, chest: { x: 50, y: 70, rotation: 0, scale: .62 } },
  { hand: { x: 78, y: 68, rotation: 20, scale: .32 }, shoulderLeft: { x: 36, y: 57, rotation: -6, scale: .55 }, shoulderRight: { x: 64, y: 56, rotation: 10, scale: .58 }, head: { x: 48, y: 40, rotation: -4, scale: .62 }, chest: { x: 50, y: 70, rotation: 0, scale: .62 } },
];

/**
 * 공격 시트의 프레임 0·2는 원본이 왼쪽을 보고 있어 이미지에서 좌우 반전했다
 * (모든 프레임이 몬스터 쪽인 오른쪽을 보도록). 그 두 프레임의 앵커도 함께
 * 미러링된 값이다: x → 100-x, rotation → -rotation, 좌·우 견갑 스왑.
 */
// 2026-10-12: 공격 시트는 대기 한 장을 −3°·−8°·+10°·+3° 기울인 파생(place-beaver deriveAttackFrames) — 같은 앵커에 기울기만 더한다
export const ATTACK_EQUIPMENT_ANCHORS: EquipmentFrameAnchors[] = [
  { hand: { x: 77, y: 67, rotation: 10, scale: .32 }, shoulderLeft: { x: 36, y: 57, rotation: -9, scale: .55 }, shoulderRight: { x: 64, y: 56, rotation: 7, scale: .58 }, head: { x: 48, y: 40, rotation: -7, scale: .62 }, chest: { x: 50, y: 70, rotation: -3, scale: .62 } },
  { hand: { x: 76, y: 66, rotation: 0, scale: .32 }, shoulderLeft: { x: 36, y: 57, rotation: -14, scale: .55 }, shoulderRight: { x: 64, y: 56, rotation: 2, scale: .58 }, head: { x: 47, y: 40, rotation: -12, scale: .62 }, chest: { x: 50, y: 70, rotation: -8, scale: .62 } },
  { hand: { x: 80, y: 70, rotation: 48, scale: .34 }, shoulderLeft: { x: 37, y: 58, rotation: 4, scale: .55 }, shoulderRight: { x: 65, y: 57, rotation: 20, scale: .58 }, head: { x: 50, y: 41, rotation: 6, scale: .62 }, chest: { x: 51, y: 71, rotation: 10, scale: .62 } },
  { hand: { x: 78, y: 68, rotation: 26, scale: .32 }, shoulderLeft: { x: 36, y: 57, rotation: -3, scale: .55 }, shoulderRight: { x: 64, y: 56, rotation: 13, scale: .58 }, head: { x: 48, y: 40, rotation: -1, scale: .62 }, chest: { x: 50, y: 70, rotation: 3, scale: .62 } },
];
