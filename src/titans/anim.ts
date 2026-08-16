export const IDLE_SHEET = "/titans/generated/hero-idle-sheet.png";
export const ATTACK_SHEET = "/titans/generated/hero-attack-sheet.png";
export const SPRITE_FRAME_COUNT = 4;
export const IDLE_FRAME_MS = 150;
export const ATTACK_CLIP_MS = 420;

export function preloadTitanSheets(): void {
  for (const src of [IDLE_SHEET, ATTACK_SHEET]) {
    const img = new Image();
    img.decoding = "async";
    img.src = src;
  }
}
