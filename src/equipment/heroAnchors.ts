/** 주인공 파츠 앵커 — scripts/assemble-b3d.mjs 가 쓴다 (손대지 말 것).
 * 2026-10-16: Blender 3D 리그(art-gen/blender) 의 머리·몸·손·발 뼈를 칸마다 카메라로 투영한 값(상자 %). 무기는 손 뼈를 따라 휘두르고,
 * 투구·갑옷·장갑·신발·방패·견갑도 같은 뼈를 따라간다. 회전은 대기 0칸 대비 뼈가 돈 만큼 더한다 */
import type { EquipmentFrameAnchors } from "./anchors";

export const HERO_IDLE_ANCHORS: EquipmentFrameAnchors[] = [
  { hand: { x: 31.7, y: 91.4, rotation: 20, scale: 0.32 }, shoulderLeft: { x: 65.4, y: 79.7, rotation: -6, scale: 0.55 }, shoulderRight: { x: 35.3, y: 81, rotation: 10, scale: 0.58 }, head: { x: 49.2, y: 41.1, rotation: -4, scale: 0.62 }, chest: { x: 56.4, y: 89.5, rotation: 0, scale: 0.52 }, offHand: { x: 76.4, y: 89.4, rotation: 0, scale: 0.42 }, feet: { x: 51, y: 99.1, rotation: 0, scale: 0.5 } },
  { hand: { x: 31.5, y: 91.6, rotation: 22.2, scale: 0.32 }, shoulderLeft: { x: 65.7, y: 80.1, rotation: -6, scale: 0.55 }, shoulderRight: { x: 35.2, y: 81.5, rotation: 10, scale: 0.58 }, head: { x: 50.6, y: 41.9, rotation: -2.9, scale: 0.62 }, chest: { x: 56.6, y: 89.8, rotation: 0, scale: 0.52 }, offHand: { x: 76.7, y: 89.6, rotation: 1.4, scale: 0.42 }, feet: { x: 51, y: 99.1, rotation: 0, scale: 0.5 } },
  { hand: { x: 31.7, y: 90.9, rotation: 20, scale: 0.32 }, shoulderLeft: { x: 65.4, y: 79.2, rotation: -6, scale: 0.55 }, shoulderRight: { x: 35.3, y: 80.5, rotation: 10, scale: 0.58 }, head: { x: 49.2, y: 40.7, rotation: -4, scale: 0.62 }, chest: { x: 56.4, y: 89.1, rotation: 0, scale: 0.52 }, offHand: { x: 76.4, y: 89, rotation: 0, scale: 0.42 }, feet: { x: 51, y: 98.7, rotation: 0, scale: 0.5 } },
  { hand: { x: 31.8, y: 91.2, rotation: 18.1, scale: 0.32 }, shoulderLeft: { x: 65.3, y: 79.5, rotation: -6, scale: 0.55 }, shoulderRight: { x: 35.4, y: 80.8, rotation: 10, scale: 0.58 }, head: { x: 48.5, y: 40.8, rotation: -4.5, scale: 0.62 }, chest: { x: 56.4, y: 89.4, rotation: 0, scale: 0.52 }, offHand: { x: 76.2, y: 89.3, rotation: -0.1, scale: 0.42 }, feet: { x: 51, y: 99.1, rotation: 0, scale: 0.5 } },
];
export const HERO_ATTACK_ANCHORS: EquipmentFrameAnchors[] = [
  { hand: { x: 13.3, y: 84.2, rotation: -12.7, scale: 0.32 }, shoulderLeft: { x: 62.2, y: 78.9, rotation: -9.7, scale: 0.55 }, shoulderRight: { x: 34.5, y: 80.4, rotation: 6.3, scale: 0.58 }, head: { x: 38.9, y: 40.2, rotation: -10.1, scale: 0.62 }, chest: { x: 56.5, y: 88.4, rotation: -3.7, scale: 0.52 }, offHand: { x: 77.9, y: 85.6, rotation: -24.4, scale: 0.42 }, feet: { x: 51.5, y: 99.1, rotation: 0, scale: 0.5 } },
  { hand: { x: 12.2, y: 78.6, rotation: -42.7, scale: 0.32 }, shoulderLeft: { x: 59.4, y: 78.2, rotation: -12.7, scale: 0.55 }, shoulderRight: { x: 33.7, y: 79.8, rotation: 3.3, scale: 0.58 }, head: { x: 30.5, y: 40.1, rotation: -15, scale: 0.62 }, chest: { x: 56, y: 87.5, rotation: -6.7, scale: 0.52 }, offHand: { x: 76.7, y: 83.1, rotation: -35.4, scale: 0.42 }, feet: { x: 51.8, y: 99.1, rotation: 0, scale: 0.5 } },
  { hand: { x: 57.1, y: 88, rotation: 127.3, scale: 0.32 }, shoulderLeft: { x: 71.9, y: 81.7, rotation: 3.8, scale: 0.55 }, shoulderRight: { x: 49.4, y: 83.7, rotation: 19.8, scale: 0.58 }, head: { x: 80.1, y: 47, rotation: 13.3, scale: 0.62 }, chest: { x: 67.1, y: 92, rotation: 9.8, scale: 0.52 }, offHand: { x: 75.8, y: 91, rotation: 18.8, scale: 0.42 }, feet: { x: 56.1, y: 99.2, rotation: 0, scale: 0.5 } },
  { hand: { x: 45.6, y: 89.2, rotation: 75.1, scale: 0.32 }, shoulderLeft: { x: 67.7, y: 80.3, rotation: -2.5, scale: 0.55 }, shoulderRight: { x: 42, y: 82.1, rotation: 13.5, scale: 0.58 }, head: { x: 60.7, y: 42.9, rotation: 1.8, scale: 0.62 }, chest: { x: 61.8, y: 90.5, rotation: 3.5, scale: 0.52 }, offHand: { x: 76.5, y: 90.1, rotation: 1.8, scale: 0.42 }, feet: { x: 53.5, y: 99.2, rotation: 0, scale: 0.5 } },
];
/** 성문 방어 — 대기 시트 인물 상자(칸 %) */
export const HERO_FIG = {"x0":5,"x1":90.9,"y0":32.7,"y1":99.9};
/** 성문 방어 파츠 자리 — 인물 상자 기준 [파츠, u, v, 크기(키 대비)] */
export const HERO_GEAR_SPOTS = [["boots",0.536,0.988,0.312],["shield",0.831,0.844,0.21],["armor",0.598,0.845,0.346],["gloves",0.311,0.874,0.167],["helmet",0.515,0.125,0.49]] as const;
