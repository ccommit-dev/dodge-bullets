import { assetUrl } from "../asset";

export const IDLE_SHEET = assetUrl("titans/character/base/hero-idle.png");
export const ATTACK_SHEET = assetUrl("titans/character/base/hero-attack.png");
export const SPRITE_FRAME_COUNT = 4;
/**
 * idle 시트의 4프레임은 자세가 아니라 AI 생성 특유의 미세한 그림 차이다.
 * 150ms로 돌리면 머리카락·얼굴 디테일이 잘게 떨려 보이는 "보일링" 현상이 난다.
 * 240ms면 호흡하는 미묘한 움직임으로 읽힌다.
 */
export const IDLE_FRAME_MS = 240;
export const ATTACK_CLIP_MS = 420;

export function preloadTitanSheets(): void {
  for (const src of [IDLE_SHEET, ATTACK_SHEET]) {
    const img = new Image();
    img.decoding = "async";
    img.src = src;
  }
}
