/**
 * 생성한 몬스터 원화를 게임 자산 자리에 앉힌다 — 인물을 가로 중앙에, 발은 바닥선 바로 위에 맞춘다.
 *
 * `.titan-monster-art img` 는 `object-fit: contain; object-position: center bottom` 이라
 * 원화의 하단 여백이 그대로 "공중에 뜬 만큼"이 된다. 정사각 캔버스에 발 여백 1% 로 맞춰 둔다.
 *
 * 사용: node scripts/place-monster.mjs <src.png> <대상이름(확장자 없이)> [--size 512] [--bottom 0.01]
 */
import sharp from "sharp";
import { existsSync } from "node:fs";

const [src, name] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
if (!src || !name) { console.error("사용: node scripts/place-monster.mjs <src.png> <이름>"); process.exit(1); }
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? Number(process.argv[i + 1]) : d; };
const SIZE = arg("size", 512);
const BOTTOM = arg("bottom", 0.01);
const DIR = "public/titans/generated/monsters";
if (!existsSync(src)) { console.error("없는 파일:", src); process.exit(1); }

const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
let minx = Infinity, maxx = -1, miny = Infinity, maxy = -1;
for (let y = 0; y < info.height; y += 1) for (let x = 0; x < info.width; x += 1) {
  if (data[(y * info.width + x) * 4 + 3] > 24) { if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y; }
}
if (maxx < 0) { console.error("빈 이미지"); process.exit(1); }
const fw = maxx - minx + 1, fh = maxy - miny + 1;
// 발 여백을 뺀 높이에 맞춰 축소 — 가로도 캔버스를 넘지 않게
const avail = Math.round(SIZE * (1 - BOTTOM));
const scale = Math.min(avail / fh, SIZE / fw, 1);
const w = Math.max(1, Math.round(fw * scale)), h = Math.max(1, Math.round(fh * scale));
const fig = await sharp(src).extract({ left: minx, top: miny, width: fw, height: fh }).resize(w, h).png().toBuffer();
const out = await sharp({ create: { width: SIZE, height: SIZE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([{ input: fig, left: Math.round((SIZE - w) / 2), top: SIZE - Math.round(SIZE * BOTTOM) - h }])
  .png().toBuffer();
await sharp(out).toFile(`${DIR}/${name}.png`);
const l = Math.round((SIZE - w) / 2), r = SIZE - l - w;
console.log(`${DIR}/${name}.png ← ${src}`);
console.log(`  ${SIZE}x${SIZE} · 인물 ${w}x${h} · 좌여백 ${(l / SIZE * 100).toFixed(1)}% · 우여백 ${(r / SIZE * 100).toFixed(1)}% · 하여백 ${(BOTTOM * 100).toFixed(1)}%`);
console.log(`  SpriteArt MONSTER_VISIBLE_MARGIN 에 ["${name}"]: [${(l / SIZE).toFixed(2)}, ${(r / SIZE).toFixed(2)}] 로 넣는다`);
