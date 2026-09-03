/**
 * 변형 동료 10명 + 스킨 2종 애니메이션 아틀라스 생성 (에셋 점검 후).
 *
 * 문제: 파이로·마리나·테라·제피르·브론·아이리스·카인·실프·오리온·엠버는 기본 아틀라스 행을
 * CSS hue-rotate로 돌려 썼다 — 피부가 녹색·보라로 왜곡되고 쌍끼리 같은 좌표에 겹쳤다.
 * 스킨(garen-magma·leon-frost)은 상점 썸네일 PNG만 있고 전투는 hue-rotate였다.
 *
 * 해법: 기본 아틀라스(4열×6행, 1254×1254)의 행을 잘라 tint(휘도 보존)로 파생한 전용 아틀라스를 만든다.
 *   ally-variant-atlas-v1.png  4열×10행 (1254×2090)  — VARIANTS 순서 = SpriteArt VARIANT_ROW
 *   ally-skin-atlas-v1.png     4열×2행  (1254×418)   — SKINS 순서 = SpriteArt SKIN_ROW
 * tint만 사용 — hue 회전은 피부를 왜곡한다 (make-alt-allies.mjs에서 두 번 확인된 교훈).
 *
 *   node scripts/make-variant-atlas.mjs
 */
import sharp from "sharp";

const BASE = "public/titans/generated/allies/ally-animation-atlas-v1.png";
const COLS = 4;
const ROWS = 6;
const BASE_ROW = { mia: 0, leon: 1, sera: 2, garen: 3, ari: 4, nox: 5 };

// id, 원본 행, tint RGB, brightness, saturation — 속성·컨셉별 팔레트
const VARIANTS = [
  ["pyro", "mia", [255, 122, 72], 0.96, 1.25],
  ["marina", "sera", [96, 196, 232], 1.05, 1.1],
  ["terra", "garen", [156, 204, 112], 0.94, 1.1],
  ["zephyr", "leon", [144, 232, 184], 1.06, 1.1],
  ["bronn", "garen", [255, 140, 64], 0.84, 1.25],
  ["iris", "sera", [156, 204, 255], 1.1, 1.05],
  ["cain", "nox", [255, 228, 120], 1.06, 1.15],
  ["sylph", "sera", [172, 255, 204], 1.06, 1.1],
  ["orion", "leon", [172, 184, 255], 1.0, 1.1],
  ["ember", "ari", [255, 96, 140], 1.0, 1.2],
];
// 스킨(가로 셀) — 원본은 기본 아틀라스 행 또는 변형 아틀라스 행(J: SSR 스킨 10종 + 시즌 한정 2종)
// 순서 = SpriteArt SKIN_ROW. 시즌 스킨(season-N)은 시즌 패스 유료 15단 보상 — 판매하지 않는다.
const VARIANT_ATLAS = "public/titans/generated/allies/ally-variant-atlas-v1.png";
const VARIANT_ROW = Object.fromEntries(VARIANTS.map(([id], i) => [id, i]));
const SKINS = [
  ["garen-magma", "garen", [255, 138, 76], 0.92, 1.15],
  ["leon-frost", "leon", [158, 210, 255], 1.08, 1.05],
  ["ari-blaze", "ari", [255, 176, 64], 1.02, 1.3],
  ["nox-abyss", "nox", [120, 96, 200], 0.86, 1.2],
  ["bronn-iron", "bronn", [190, 200, 214], 0.95, 0.7],
  ["iris-prism", "iris", [255, 190, 240], 1.12, 1.25],
  ["cain-ash", "cain", [150, 140, 150], 0.82, 0.6],
  ["sylph-dawn", "sylph", [255, 214, 160], 1.1, 1.1],
  ["orion-nova", "orion", [140, 240, 255], 1.14, 1.2],
  ["ember-ruby", "ember", [255, 60, 90], 0.98, 1.4],
  ["season-1", "ari", [200, 150, 255], 1.06, 1.25],
  ["season-2", "nox", [255, 220, 120], 1.04, 1.2],
];
// 스킨(정사각 셀) — 특수 아틀라스 행(루나·세라 라이트)
const SPECIAL_ATLAS = "public/titans/generated/allies/ally-special-animation-atlas-v1.png";
const SPECIAL_ROW = { luna: 0, volt: 1, mia_dark: 2, sera_light: 3 };
const SKINS_SPECIAL = [
  ["luna-eclipse", "luna", [120, 110, 190], 0.88, 1.2],
  ["sera_light-halo", "sera_light", [255, 240, 180], 1.12, 1.15],
];

const meta = await sharp(BASE).metadata();
const cellH = Math.floor(meta.height / ROWS);
const stripW = meta.width;

async function tintedRow(baseId, rgb, brightness, saturation) {
  // 기본 6명은 기본 아틀라스, 변형 10명은 변형 아틀라스(같은 셀 크기)에서 행을 가져온다
  const fromVariant = BASE_ROW[baseId] === undefined;
  const src = fromVariant ? VARIANT_ATLAS : BASE;
  const top = (fromVariant ? VARIANT_ROW[baseId] : BASE_ROW[baseId]) * cellH;
  const strip = await sharp(src).extract({ left: 0, top, width: stripW, height: cellH }).png().toBuffer();
  return sharp(strip).tint({ r: rgb[0], g: rgb[1], b: rgb[2] }).modulate({ brightness, saturation }).png().toBuffer();
}
async function tintedSpecialRow(baseId, rgb, brightness, saturation, cell) {
  const top = SPECIAL_ROW[baseId] * cell;
  const strip = await sharp(SPECIAL_ATLAS).extract({ left: 0, top, width: stripW, height: cell }).png().toBuffer();
  return sharp(strip).tint({ r: rgb[0], g: rgb[1], b: rgb[2] }).modulate({ brightness, saturation }).png().toBuffer();
}
/** 상점 썸네일 — 대기(0열) 셀을 잘라 skins/<id>.png 로 */
async function thumb(rowBuf, cell, id) {
  await sharp(rowBuf).extract({ left: 0, top: 0, width: Math.floor(stripW / COLS), height: cell }).png().toFile(`public/titans/generated/allies/skins/${id}.png`);
}

async function buildAtlas(list, outFile) {
  const rows = [];
  for (const [id, base, rgb, brightness, saturation] of list) {
    rows.push({ input: await tintedRow(base, rgb, brightness, saturation), left: 0, top: rows.length * cellH });
    console.log(`row ${rows.length - 1}: ${id} <- ${base}`);
  }
  await sharp({ create: { width: stripW, height: cellH * list.length, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(rows)
    .png()
    .toFile(outFile);
  console.log(`generated ${outFile} (${stripW}x${cellH * list.length}, ${COLS} cols x ${list.length} rows)`);
}

import { mkdirSync } from "node:fs";
mkdirSync("public/titans/generated/allies/skins", { recursive: true });
await buildAtlas(VARIANTS, "public/titans/generated/allies/ally-variant-atlas-v1.png");
await buildAtlas(SKINS, "public/titans/generated/allies/ally-skin-atlas-v1.png");
for (const [id, base, rgb, b, sat] of SKINS) await thumb(await tintedRow(base, rgb, b, sat), cellH, id);
{
  const sm = await sharp(SPECIAL_ATLAS).metadata();
  const cell = Math.floor(sm.height / 4);
  const rows = [];
  for (const [id, base, rgb, b, sat] of SKINS_SPECIAL) {
    const buf = await tintedSpecialRow(base, rgb, b, sat, cell);
    rows.push({ input: buf, left: 0, top: rows.length * cell });
    await thumb(buf, cell, id);
    console.log(`special row ${rows.length - 1}: ${id} <- ${base}`);
  }
  await sharp({ create: { width: stripW, height: cell * SKINS_SPECIAL.length, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite(rows).png().toFile("public/titans/generated/allies/ally-skin-special-atlas-v1.png");
  console.log(`generated ally-skin-special-atlas-v1.png (${stripW}x${cell * SKINS_SPECIAL.length})`);
}
