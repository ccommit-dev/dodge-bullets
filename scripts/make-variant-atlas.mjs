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
const SKINS = [
  ["garen-magma", "garen", [255, 138, 76], 0.92, 1.15],
  ["leon-frost", "leon", [158, 210, 255], 1.08, 1.05],
];

const meta = await sharp(BASE).metadata();
const cellH = Math.floor(meta.height / ROWS);
const stripW = meta.width;

async function tintedRow(baseId, rgb, brightness, saturation) {
  const top = BASE_ROW[baseId] * cellH;
  const strip = await sharp(BASE).extract({ left: 0, top, width: stripW, height: cellH }).png().toBuffer();
  return sharp(strip).tint({ r: rgb[0], g: rgb[1], b: rgb[2] }).modulate({ brightness, saturation }).png().toBuffer();
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

await buildAtlas(VARIANTS, "public/titans/generated/allies/ally-variant-atlas-v1.png");
await buildAtlas(SKINS, "public/titans/generated/allies/ally-skin-atlas-v1.png");
