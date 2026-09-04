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
  // 코스튬 2종(₩5,900) — CSS 필터 대신 실제 시트 (아트 점검 5순위)
  { id: "ember", hue: 342, saturation: 1.7, brightness: 0.96 },
  // frost: hue 회전은 피부를 청록으로 왜곡한다(변형 동료에서 확인된 교훈) — 저채도·밝게 + 알파 마스크한 한랭 multiply 캐스트
  { id: "frost", hue: 0, saturation: 0.5, brightness: 1.14, cast: [186, 220, 255], castMix: 0.55 },
];

import { existsSync, readFileSync } from "node:fs";
/** place-art.mjs costume 으로 생성 원화 시트를 넣은 코스튬은 파생하지 않는다 (skins/authored.json) */
const AUTHORED = existsSync("public/titans/character/skins/authored.json") ? JSON.parse(readFileSync("public/titans/character/skins/authored.json", "utf8")) : [];

for (const [src, base] of SHEETS) {
  for (const { id, hue, saturation, brightness, cast, castMix = 0 } of SKINS) {
    if (AUTHORED.includes(id)) { console.log("skip", id, "(authored 원화 시트)"); continue; }
    const out = `public/titans/character/skins/${base}-${id}.png`;
    if (!cast) {
      await sharp(src).modulate({ hue, saturation, brightness }).png().toFile(out);
    } else {
      // 알파가 있는 픽셀만 색 캐스트를 multiply로 섞는다 — 투명 배경은 그대로
      const { data, info } = await sharp(src).modulate({ hue, saturation, brightness }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      for (let i = 0; i < data.length; i += info.channels) {
        if (data[i + 3] === 0) continue;
        for (let c = 0; c < 3; c += 1) data[i + c] = Math.round(data[i + c] * (1 - castMix) + (data[i + c] * cast[c] / 255) * castMix);
      }
      await sharp(data, { raw: { width: info.width, height: info.height, channels: info.channels } }).png().toFile(out);
    }
    console.log("generated", out);
  }
}
