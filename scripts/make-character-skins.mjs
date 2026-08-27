/**
 * 플레이어블 캐릭터 스킨 시트 생성 (LIVEOPS §3.3).
 *
 * 원화가 4프레임 페인팅이라 신규 캐릭터를 그리는 대신, 기본 시트를 색상 변조해
 * 파생한다 — "색놀이 스킨"이지만 팔레트를 크게 틀어 정체성이 분명하게.
 *
 *   흑요석 검사(obsidian): 한랭 색조 + 저채도 + 어두운 톤 (hue -140°)
 *   새벽의 무희(dawn):     웜 핑크/골드 (hue +130°, 밝게)
 *
 *   node scripts/make-character-skins.mjs
 */
import sharp from "sharp";

const SHEETS = [
  ["public/titans/character/base/hero-idle.png", "hero-idle"],
  ["public/titans/character/base/hero-attack.png", "hero-attack"],
];

const SKINS = [
  { id: "obsidian", hue: 220, saturation: 0.55, brightness: 0.82 },
  { id: "dawn", hue: 130, saturation: 1.15, brightness: 1.08 },
];

for (const [src, base] of SHEETS) {
  for (const { id, hue, saturation, brightness } of SKINS) {
    const out = `public/titans/character/skins/${base}-${id}.png`;
    await sharp(src).modulate({ hue, saturation, brightness }).png().toFile(out);
    console.log("generated", out);
  }
}
