/**
 * 영웅 외형 라인 (계획안 I) — 무기 이펙트 · 전장 테마 · 코스튬.
 *
 * 전부 확정 구매(보석) 또는 ₩ 코스튬. 성능 무관.
 * 무기 이펙트는 검격 궤적·잔상 색(C의 이펙트 레이어 재사용), 테마는 전장 하늘·바닥·강조색과 파티클,
 * 코스튬은 기본 시트에서 파생한 실제 시트(make-character-skins.mjs).
 */
export type WeaponFxDef = { name: string; desc: string; hue: number; trail: string; gemCost: number | null };
export const WEAPON_FX: Record<string, WeaponFxDef> = {
  "fx-crimson": { name: "진홍 잔영", desc: "핏빛 검격 궤적과 붉은 잔상", hue: 350, trail: "#f87171", gemCost: 300 },
  "fx-glacier": { name: "빙하 잔영", desc: "서리가 남는 푸른 궤적", hue: 200, trail: "#7dd3fc", gemCost: 300 },
  "fx-solar": { name: "태양 잔영", desc: "황금빛 궤적과 불꽃 잔상", hue: 45, trail: "#fde047", gemCost: 300 },
  /** 시즌 패스 유료 25단 보상 — 판매하지 않는다 */
  "fx-season": { name: "시즌 잔영", desc: "시즌 한정 — 보라 번개 궤적", hue: 280, trail: "#c4b5fd", gemCost: null },
};

export type ThemeDef = { name: string; desc: string; sky: string; ground: string; accent: string; particles: "aurora" | "petal" | "void"; gemCost: number };
export const THEMES: Record<string, ThemeDef> = {
  "theme-aurora": { name: "오로라 밤", desc: "북극광이 흐르는 밤하늘", sky: "#0f172a", ground: "#0b3b3f", accent: "#5eead4", particles: "aurora", gemCost: 400 },
  "theme-sakura": { name: "벚꽃 길", desc: "꽃잎이 흩날리는 봄 전장", sky: "#3b1d3a", ground: "#4a2a2a", accent: "#f9a8d4", particles: "petal", gemCost: 400 },
  "theme-void": { name: "공허", desc: "별이 스러지는 심연의 정적", sky: "#020617", ground: "#0f0a1f", accent: "#a78bfa", particles: "void", gemCost: 400 },
};

/** 코스튬 (₩5,900) — 실제 시트는 scripts/make-character-skins.mjs가 파생(titans/character/skins/hero-*-<id>.png). char-<id> 상품으로 판매 */
export const COSTUMES: Record<string, { name: string; desc: string }> = {
  ember: { name: "붉은 잔영", desc: "잔불빛으로 물든 모험가" },
  frost: { name: "서리 무희", desc: "서릿발이 서린 푸른 모험가" },
};
