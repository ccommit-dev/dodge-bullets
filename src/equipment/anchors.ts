import { HERO_ATTACK_ANCHORS, HERO_IDLE_ANCHORS, HERO_WALK_ANCHORS, HERO_WEAPON_ATTACK_ANCHORS } from "./heroAnchors";

/** behind — 그 칸에서는 무기를 몸 뒤에 그린다(애니메이션 2판 주인공 예비 칸: 먼 손이 머리 뒤라 앞에 그리면 얼굴을 덮었다) */
export type EquipmentAnchor = { x: number; y: number; rotation: number; scale: number; behind?: boolean };
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
 * 주인공 파츠 앵커 (2026-10-16, 사용자: "파츠별 장착이 무기·투구만 적용된 것처럼 보인다 — 모든 애니메이션에 어색하지 않게").
 * 대기·공격 시트를 3D 대기 한 장의 변형으로 만들고(scripts/derive-anim-hero.mjs), 같은 변환을 앵커에 적용한 표를 heroAnchors.ts 에 쓴다 →
 * 파츠가 칸마다 몸을 정확히 따라간다. 앵커는 상자 % (공격 칸은 CSS 가 125% 로 넓혀 같은 좌표계). 예전 손 맞춤 표·보정 여백(unify.css)은 걷었다.
 */
export const IDLE_EQUIPMENT_ANCHORS: EquipmentFrameAnchors[] = HERO_IDLE_ANCHORS;
export const ATTACK_EQUIPMENT_ANCHORS: EquipmentFrameAnchors[] = HERO_ATTACK_ANCHORS;
/** 무기별 공격 시트의 손 앵커 (2026-10-27) — 창 · 활 · 지팡이는 몸 동작이 달라 손 자리도 다르다. 없으면 검(기본) 표 */
export function attackAnchorsFor(kind: string | undefined): EquipmentFrameAnchors[] {
  return (kind === "spear" || kind === "bow" || kind === "staff" ? HERO_WEAPON_ATTACK_ANCHORS[kind] : undefined) ?? HERO_ATTACK_ANCHORS;
}
/** 걷기 칸(애니메이션 2판, 2026-10-19) — 걸어 들어올 때 무기가 걷는 손을 따라간다 */
export const WALK_EQUIPMENT_ANCHORS: EquipmentFrameAnchors[] = HERO_WALK_ANCHORS;
