import { assetUrl } from "../asset";

export const IDLE_SHEET = assetUrl("titans/character/base/hero-idle.png");
export const ATTACK_SHEET = assetUrl("titans/character/base/hero-attack.png");

/** 구매 캐릭터 스킨 — 기본 시트의 팔레트 파생 (scripts/make-character-skins.mjs) */
export const CHARACTER_SKINS = ["default", "obsidian", "dawn"] as const;
export type CharacterSkinId = (typeof CHARACTER_SKINS)[number];

export const CHARACTER_LABEL: Record<CharacterSkinId, string> = {
  default: "기본 모험가",
  obsidian: "흑요석 검사",
  dawn: "새벽의 무희",
};

export function sheetFor(character: string, mode: "idle" | "attack"): string {
  if (character === "obsidian" || character === "dawn") {
    return assetUrl(`titans/character/skins/hero-${mode}-${character}.png`);
  }
  return mode === "attack" ? ATTACK_SHEET : IDLE_SHEET;
}
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
