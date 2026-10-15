/**
 * 장비 파츠 그림 배치 (2026-10-15, 사용자: "장비 성장 아이템 아이콘·배경을 무기 숙련처럼 다시 만들고 통일 · 캐릭터에 장착").
 *   node scripts/place-gear.mjs            — art-gen/gear-picks.json {part: {src, cropBottom?}} 대로
 * 한 장(3D 장난감 렌더, 512)에서 나무·철·금 티어를 색 입히기로 파생해 public/titans/gear/<part>-<tier>.png (512) 에 둔다.
 * 그림 안 물건 크기(불투명 bbox 의 긴 변 / 캔버스)를 예전 파츠 그림과 같게 맞춰, 주인공 앵커(anchors.ts)의 scale 이 그대로 맞는다.
 * cropBottom: 받침대(나무 원판)가 함께 그려진 경우 아래쪽을 그 비율만큼 자른다.
 */
import sharp from "sharp";
import { readFileSync, existsSync, copyFileSync, mkdirSync } from "node:fs";

const PICKS = JSON.parse(readFileSync("art-gen/gear-picks.json", "utf8"));
const OUT = "public/titans/gear";
const SIZE = 512;
const TINT = { 1: { r: 196, g: 140, b: 82 }, 2: { r: 150, g: 172, b: 196 }, 3: { r: 242, g: 194, b: 50 } };   // 나무 · 철 · 금
mkdirSync("art-gen/out/gear-backup", { recursive: true });

async function bbox(buf) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let x0 = info.width, x1 = -1, y0 = info.height, y1 = -1;
  for (let y = 0; y < info.height; y += 1) for (let x = 0; x < info.width; x += 1) if (data[(y * info.width + x) * 4 + 3] > 24) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return { x0, y0, x1, y1, w: info.width, h: info.height };
}

for (const [part, pick] of Object.entries(PICKS)) {
  if (part.startsWith("_")) continue;
  const src = `art-gen/out/${pick.src}`;
  if (!existsSync(src)) { console.log("skip", part, "(원본 없음)", src); continue; }
  // 예전 그림의 물건 크기 비율 (없으면 0.78)
  let ratio = 0.78;
  const old = `${OUT}/${part}-1.png`;
  if (existsSync(old)) { const b = await bbox(readFileSync(old)); if (b.x1 > 0) ratio = Math.max(b.x1 - b.x0 + 1, b.y1 - b.y0 + 1) / Math.max(b.w, b.h); }
  let img = sharp(src).ensureAlpha();
  const meta = await img.metadata();
  if (pick.cropBottom) img = sharp(await img.extract({ left: 0, top: 0, width: meta.width, height: Math.round(meta.height * (1 - pick.cropBottom)) }).png().toBuffer());
  // 바닥 그림자 지우기 — 아래 40% 에서 밝고(>195) 색이 거의 없는(채도 < .14) 픽셀은 그림자/받침 반사다. 색을 입히면 얼룩이 됐다
  {
    const { data, info } = await img.clone().raw().toBuffer({ resolveWithObject: true });
    const top = Math.round(info.height * 0.6);
    for (let y = top; y < info.height; y += 1) for (let x = 0; x < info.width; x += 1) {
      const i = (y * info.width + x) * 4; const r = data[i], g = data[i + 1], bl = data[i + 2];
      const mx = Math.max(r, g, bl), mn = Math.min(r, g, bl); const sat = mx === 0 ? 0 : (mx - mn) / mx;
      if (mx > 195 && sat < 0.14) data[i + 3] = 0;
      else if (mx > 170 && sat < 0.08) data[i + 3] = Math.min(data[i + 3], 60);
    }
    img = sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png();
  }
  const b = await bbox(await img.png().toBuffer());
  const cut = await sharp(await img.png().toBuffer()).extract({ left: b.x0, top: b.y0, width: b.x1 - b.x0 + 1, height: b.y1 - b.y0 + 1 }).png().toBuffer();
  const target = Math.round(SIZE * ratio);
  const fitted = await sharp(cut).resize(target, target, { fit: "inside" }).png().toBuffer();
  const fm = await sharp(fitted).metadata();
  const base = await sharp({ create: { width: SIZE, height: SIZE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: fitted, left: Math.round((SIZE - fm.width) / 2), top: Math.round((SIZE - fm.height) / 2) }]).png().toBuffer();
  for (const tier of [1, 2, 3]) {
    const dest = `${OUT}/${part}-${tier}.png`;
    if (existsSync(dest)) copyFileSync(dest, `art-gen/out/gear-backup/${part}-${tier}.png`);
    // 티어 색: 밝기는 원화 그대로, 색만 입힌다(금은 채도를 조금 올려 반짝)
    let t = sharp(base).tint(TINT[tier]);
    if (tier === 3) t = t.modulate({ saturation: 1.25, brightness: 1.05 });
    await t.png({ palette: true, quality: 92, colours: 256, effort: 10 }).toFile(dest);
  }
  console.log("gear", part, pick.src, "ratio", ratio.toFixed(2));
}
