import { assetUrl } from "../asset";
import { HERO_ANIM, heroFrameMs, type HeroAnimMode } from "./spriteAnim";

export const IDLE_SHEET = assetUrl("titans/character/base/hero-idle.png");
export const ATTACK_SHEET = assetUrl("titans/character/base/hero-attack.png");

/** 구매 캐릭터 스킨 — 2판 시트는 Blender 동물 옷(2026-11-19, art-gen/blender/hero_skins.py · lib/suit_kit.py), 1판 PNG 는 옛 팔레트 파생(scripts/make-character-skins.mjs) */
export const CHARACTER_SKINS = ["default", "obsidian", "dawn", "ember", "frost", "fox"] as const;
export type CharacterSkinId = (typeof CHARACTER_SKINS)[number];

export const CHARACTER_LABEL: Record<CharacterSkinId, string> = {
  default: "기본 모험가",
  obsidian: "흑요석 검사",
  dawn: "새벽의 무희",
  // I 코스튬 — make-character-skins.mjs가 기본 시트에서 파생한 실제 시트 (skins/hero-*-<id>.png)
  ember: "붉은 잔영",
  frost: "서리 무희",
  // 3D 캐릭터(2026-11-25) — Sketchfab 모델(MartinDL "Cartoon Character", CC BY)을 비버 풍 처리해 렌더(art-gen/blender/lib/sf_rig.py · char@fox)
  fox: "여우 모험가",
};

/** 보석으로 사는 3D 캐릭터 (2026-11-25, 사용자: "주인공 캐릭터 상품 추가" → "보석으로 판매") — 실결제 상품(char-*)이 아니다. 외형 전용 · 패시브 없음.
 * 남의 리그라 손 앵커가 따로(equipment/charAnchors.ts) · 탈것 위 시트 없음(타지 않는다 — 탈것 효과는 그대로) · 입는 파츠는 그리지 않는다 */
export const CHARACTER_GEM_COST: Partial<Record<CharacterSkinId, number>> = { fox: 60 };
export const isModelCharacter = (character: string | undefined): boolean => character !== undefined && CHARACTER_GEM_COST[character as CharacterSkinId] !== undefined;
/** 주인공이 탈것 위에 앉아 보이는가 — 3D 캐릭터는 앉은 시트가 없어 걸어 다닌다 */
export const ridesVisually = (character: string | undefined, mounted: boolean): boolean => mounted && !isModelCharacter(character);

const isSkin = (character: string) => character === "obsidian" || character === "dawn" || character === "ember" || character === "frost" || isModelCharacter(character);
/** 주인공 시트 — 애니메이션 2판(2026-10-19)이면 대기 6 · 걷기 6 · 공격 8칸 webp(스킨은 make-character-skins --anim2 파생), 아니면 1판 4칸 PNG */
/** 무기별 공격 시트가 있는 무기 (2026-10-27, 사용자: "활·지팡이 동작 — 몸 전체가 활을 당기거나 지팡이를 드는 동작") — 창 찌르기 · 활 당기기 · 지팡이 들어 내뻗기.
 * art-gen/blender/anim2.py HERO_WEAPON_ATTACK → render_anim2 hero-<무기> → assemble-anim2 → hero-attack-<무기>[-스킨].webp. 검은 hero-attack */
export const HERO_WEAPON_SHEETS = ["spear", "bow", "staff"] as const;
export type HeroWeaponSheet = (typeof HERO_WEAPON_SHEETS)[number];
export const hasWeaponSheet = (kind: string | undefined): kind is HeroWeaponSheet => (HERO_WEAPON_SHEETS as readonly string[]).includes(kind ?? "");
export function sheetFor(character: string, mode: HeroAnimMode, weaponKind?: string): string {
  if (HERO_ANIM) return assetUrl(`titans/anim/hero/hero-${mode}${mode === "attack" && hasWeaponSheet(weaponKind) ? `-${weaponKind}` : ""}${isSkin(character) ? `-${character}` : ""}.webp`);
  const m = mode === "walk" ? "idle" : mode;
  if (isSkin(character)) return assetUrl(`titans/character/skins/hero-${m}-${character}.png`);
  return m === "attack" ? ATTACK_SHEET : IDLE_SHEET;
}
/** 탈것 위 주인공 시트 — 앉은 자세. 스킨은 같은 팔레트 파생 */
export function rideSheetFor(character: string, mode: HeroAnimMode, weaponKind?: string): string {
  return assetUrl(`titans/anim/hero/hero-ride-${mode}${mode === "attack" && hasWeaponSheet(weaponKind) ? `-${weaponKind}` : ""}${isSkin(character) ? `-${character}` : ""}.webp`);
}
/** 주인공 초상(머리~가슴 정사각, scripts/make-hero-portrait.mjs) — 마이페이지 · 스킬 연계 · 순위 아이콘. 1:2 칸 시트를 정사각에 늘리면 납작했다 (2026-10-19) */
export function heroPortrait(): string {
  return HERO_ANIM ? assetUrl("titans/anim/hero/hero-portrait.webp") : IDLE_SHEET;
}
export const SPRITE_FRAME_COUNT = 4;
/**
 * idle 시트의 4프레임은 자세가 아니라 AI 생성 특유의 미세한 그림 차이다.
 * 150ms로 돌리면 머리카락·얼굴 디테일이 잘게 떨려 보이는 "보일링" 현상이 난다.
 * 240ms면 호흡하는 미묘한 움직임으로 읽힌다.
 */
export const IDLE_FRAME_MS = 240;
/** 공격 한 번 길이 — 2판은 8칸 480ms(anim-layout.json) */
export const ATTACK_CLIP_MS = HERO_ANIM ? Math.round(heroFrameMs("attack") * 8) : 420;

/** 미리 받은 주인공 시트 — 참조를 쥐고 있어야 풀어 둔 그림이 바로 버려지지 않는다 (2026-10-19) */
const heldSheets: HTMLImageElement[] = [];
export function preloadTitanSheets(): void {
  if (heldSheets.length) return;
  for (const src of HERO_ANIM ? (["idle", "walk", "attack"] as const).map((m) => sheetFor("default", m)) : [IDLE_SHEET, ATTACK_SHEET]) {
    const img = new Image();
    img.decoding = "async";
    img.src = src;
    void img.decode?.().catch(() => {});
    heldSheets.push(img);
  }
}
