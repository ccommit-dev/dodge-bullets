export type EquipmentAnchor = { x: number; y: number; rotation: number; scale: number };
export type EquipmentFrameAnchors = {
  hand: EquipmentAnchor;
  shoulderLeft: EquipmentAnchor;
  shoulderRight: EquipmentAnchor;
  /** 투구 (2026-10-12, 사용자: "투구·무기·갑옷을 애니메이션 리소스에 반영") — 머리 중심 */
  head: EquipmentAnchor;
  /** 가슴 갑옷 — 몸통 중심 */
  chest: EquipmentAnchor;
  /** 방패 — 뒷손(등 쪽 어깨 아래). 2026-10-12 */
  offHand: EquipmentAnchor;
  /** 신발 — 발 사이 바닥 */
  feet: EquipmentAnchor;
};

/** 파츠 티어 (1~3: 나무 · 철 · 금) — 그림은 public/titans/gear/<part>-<tier>.png (카피 5차 아이콘에서 오려 둠) */
export type GearTier = 0 | 1 | 2 | 3;
/** 투구 티어 — 견갑 강화 단계(armorLevel)로: +1 나무 · +5 철 · +10 금 */
export function helmetTierOf(armorLevel: number): GearTier { return armorLevel >= 10 ? 3 : armorLevel >= 5 ? 2 : armorLevel >= 1 ? 1 : 0; }
/** 가슴 갑옷 티어 — 장착 견갑 종류로: 정찰 나무 · 그림자/오우거 철 · 용린 금 */
export function chestTierOf(shoulder: string | null | undefined): GearTier { return !shoulder ? 0 : shoulder === "scout" ? 1 : shoulder === "dragon" ? 3 : 2; }
/** 무기 파츠 티어 — 대장간 검 강화: 1~4 나무 · 5~9 철 · 10+ 금 */
export function weaponTierOf(weaponLevel: number): GearTier { return weaponLevel >= 10 ? 3 : weaponLevel >= 5 ? 2 : weaponLevel >= 1 ? 1 : 0; }
export const GEAR_URL = (part: "helmet" | "armor" | "weapon" | "shield" | "gloves" | "boots" | "bow" | "staff", tier: GearTier) => `titans/gear/${part}-${tier}.png`;
/** 방패 티어 — 성문 방어 최고 스테이지: 5 나무 · 15 철 · 30 금 */
export function shieldTierOf(dodgeBestStage: number): GearTier { return dodgeBestStage >= 30 ? 3 : dodgeBestStage >= 15 ? 2 : dodgeBestStage >= 5 ? 1 : 0; }
/** 장갑 티어 — 무기 숙련(사냥터 훈련): 5 나무 · 15 철 · 30 금 */
export function glovesTierOf(weaponMastery: number): GearTier { return weaponMastery >= 30 ? 3 : weaponMastery >= 15 ? 2 : weaponMastery >= 5 ? 1 : 0; }
/** 신발 티어 — 끝없는 성벽 최고 층: 10 나무 · 30 철 · 60 금 */
export function bootsTierOf(towerBestFloor: number): GearTier { return towerBestFloor >= 60 ? 3 : towerBestFloor >= 30 ? 2 : towerBestFloor >= 10 ? 1 : 0; }

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
// 2026-10-12 밤: 가슴 파츠는 7차 실제 원화(여백 없는 정사각)라 SVG 임시본보다 크게 보여 y 70→73 · scale .62→.52 (얼굴 아래선 55% 와 안 겹치게)
export const IDLE_EQUIPMENT_ANCHORS: EquipmentFrameAnchors[] = [
  { hand: { x: 78, y: 68, rotation: 20, scale: .32 }, shoulderLeft: { x: 36, y: 57, rotation: -6, scale: .55 }, shoulderRight: { x: 64, y: 56, rotation: 10, scale: .58 }, head: { x: 48, y: 40, rotation: -4, scale: .62 }, chest: { x: 50, y: 73, rotation: 0, scale: .52 }, offHand: { x: 30, y: 72, rotation: 0, scale: .42 }, feet: { x: 50, y: 95, rotation: 0, scale: .5 } },
  { hand: { x: 78, y: 68, rotation: 20, scale: .32 }, shoulderLeft: { x: 36, y: 57, rotation: -6, scale: .55 }, shoulderRight: { x: 64, y: 56, rotation: 10, scale: .58 }, head: { x: 48, y: 40, rotation: -4, scale: .62 }, chest: { x: 50, y: 73, rotation: 0, scale: .52 }, offHand: { x: 30, y: 72, rotation: 0, scale: .42 }, feet: { x: 50, y: 95, rotation: 0, scale: .5 } },
  { hand: { x: 78, y: 68, rotation: 20, scale: .32 }, shoulderLeft: { x: 36, y: 57, rotation: -6, scale: .55 }, shoulderRight: { x: 64, y: 56, rotation: 10, scale: .58 }, head: { x: 48, y: 40, rotation: -4, scale: .62 }, chest: { x: 50, y: 73, rotation: 0, scale: .52 }, offHand: { x: 30, y: 72, rotation: 0, scale: .42 }, feet: { x: 50, y: 95, rotation: 0, scale: .5 } },
  { hand: { x: 78, y: 68, rotation: 20, scale: .32 }, shoulderLeft: { x: 36, y: 57, rotation: -6, scale: .55 }, shoulderRight: { x: 64, y: 56, rotation: 10, scale: .58 }, head: { x: 48, y: 40, rotation: -4, scale: .62 }, chest: { x: 50, y: 73, rotation: 0, scale: .52 }, offHand: { x: 30, y: 72, rotation: 0, scale: .42 }, feet: { x: 50, y: 95, rotation: 0, scale: .5 } },
];

/**
 * 공격 시트의 프레임 0·2는 원본이 왼쪽을 보고 있어 이미지에서 좌우 반전했다
 * (모든 프레임이 몬스터 쪽인 오른쪽을 보도록). 그 두 프레임의 앵커도 함께
 * 미러링된 값이다: x → 100-x, rotation → -rotation, 좌·우 견갑 스왑.
 */
// 2026-10-12: 공격 시트는 대기 한 장을 기울인 파생(place-beaver deriveAttackFrames) — 2026-10-13 돌진 −4°·−10°·+14°(1.08배)·+4°, bbox 기준 배치(derive-frame) — 변환은 hero-attack-transform.json
// 2026-10-13: 기울기만 더하면 1~2% 어긋났다 — 파생 변환(배율 sc → 중심 회전 → contain·south)을 그대로 적용해 계산한 값(scripts/compute-attack-anchors.mjs, 대기 앵커를 바꾸면 다시 돌린다)
export const ATTACK_EQUIPMENT_ANCHORS: EquipmentFrameAnchors[] = [
  { hand: { x: 78.6, y: 66.2, rotation: 16, scale: 0.32 }, shoulderLeft: { x: 35.6, y: 57.2, rotation: -10, scale: 0.55 }, shoulderRight: { x: 63.4, y: 54.9, rotation: 6, scale: 0.58 }, head: { x: 45.8, y: 39.7, rotation: -8, scale: 0.62 }, chest: { x: 51.2, y: 72.5, rotation: -4, scale: 0.52 }, offHand: { x: 31.1, y: 72.5, rotation: -4, scale: 0.42 }, feet: { x: 53.4, y: 94.4, rotation: -4, scale: 0.5 } },
  { hand: { x: 79.8, y: 62.9, rotation: 10, scale: 0.33 }, shoulderLeft: { x: 34.8, y: 57, rotation: -16, scale: 0.56 }, shoulderRight: { x: 62.7, y: 52.6, rotation: 0, scale: 0.59 }, head: { x: 42.5, y: 38.4, rotation: -14, scale: 0.63 }, chest: { x: 53, y: 71.3, rotation: -10, scale: 0.53 }, offHand: { x: 32.7, y: 72.7, rotation: -10, scale: 0.43 }, feet: { x: 58.7, y: 93.4, rotation: -10, scale: 0.51 } },
  { hand: { x: 71.3, y: 70.6, rotation: 34, scale: 0.33 }, shoulderLeft: { x: 33.7, y: 52.9, rotation: 8, scale: 0.56 }, shoulderRight: { x: 61.7, y: 56.7, rotation: 24, scale: 0.59 }, head: { x: 51.6, y: 38.5, rotation: 10, scale: 0.63 }, chest: { x: 41.9, y: 70.8, rotation: 14, scale: 0.53 }, offHand: { x: 22.5, y: 66.4, rotation: 14, scale: 0.43 }, feet: { x: 34.1, y: 92.1, rotation: 14, scale: 0.51 } },
  { hand: { x: 77.7, y: 68.7, rotation: 24, scale: 0.32 }, shoulderLeft: { x: 36.5, y: 55.5, rotation: -2, scale: 0.56 }, shoulderRight: { x: 64.8, y: 55.9, rotation: 14, scale: 0.59 }, head: { x: 50.3, y: 39, rotation: 0, scale: 0.63 }, chest: { x: 49, y: 72.3, rotation: 4, scale: 0.53 }, offHand: { x: 28.9, y: 70.4, rotation: 4, scale: 0.42 }, feet: { x: 46.7, y: 94.5, rotation: 4, scale: 0.51 } },
];
