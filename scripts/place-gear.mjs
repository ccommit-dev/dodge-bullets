/**
 * 장비 파츠 그림 배치 (2026-10-15, 사용자: "장비 성장 아이템 아이콘·배경을 무기 숙련처럼 다시 만들고 통일 · 캐릭터에 장착").
 *   node scripts/place-gear.mjs            — art-gen/gear-picks.json {part: {src, cropBottom?}} 대로
 * 2026-10-15 개정(사용자: "만들어진 파츠가 어색 · 북과 어울리게(화풍)"): 단색 색 입히기를 버리고 티어마다 따로 그린 그림을 쓴다.
 *   gear-picks.json {part: {"1": src, "2": src, "3": src}} — 북 원화를 화풍 참조로 그린 prop-g2-<part>-<tier>-s<seed>.png
 * (예전: 한 장(3D 장난감 렌더, 512)에서 나무·철·금 티어를 색 입히기로 파생해) public/titans/gear/<part>-<tier>.png (512) 에 둔다.
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

const ONLY = process.argv[2];   // node scripts/place-gear.mjs shoulder — 그 파츠만 다시 놓는다
for (const [part, picksByTier] of Object.entries(PICKS)) {
  if (part.startsWith("_") || (ONLY && part !== ONLY)) continue;
  // 키는 티어(1·2·3) 또는 종류 이름 — 견갑은 등급이 종류에 붙어 shoulder-<scout|shadow|ogre|dragon>.png (2026-10-16)
  const keys = picksByTier.src ? [1, 2, 3] : Object.keys(picksByTier).filter((k) => !k.startsWith("_"));
  for (const tier of keys) {
  const pick = typeof picksByTier[String(tier)] === "string" ? { src: picksByTier[String(tier)] } : (picksByTier[String(tier)] ?? picksByTier);
  const src = `art-gen/out/${pick.src}`;
  if (!existsSync(src)) { console.log("skip", part, "(원본 없음)", src); continue; }
  // 예전 그림의 물건 크기 비율 (없으면 0.78)
  const ratio = part === "bow" || part === "staff" ? 0.86 : 0.96;   // 티어마다 같은 비율 — 주인공 앵커·CSS 크기가 그대로 맞는다
  let img = sharp(src).ensureAlpha();
  if (pick.rotate) img = sharp(await img.rotate(pick.rotate, { background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer()).ensureAlpha();
  // 남은 배경(회색 바탕·바닥) — 가장자리에서 이어진 밝은 무채색을 투명으로 (2026-10-15)
  {
    const { data, info } = await img.clone().raw().toBuffer({ resolveWithObject: true });
    const W = info.width, Hh = info.height, seen = new Uint8Array(W * Hh), stack = [];
    const bgLike = (p) => { const i = p * 4; if (data[i + 3] < 30) return true; const r = data[i], g = data[i + 1], b = data[i + 2]; const mx = Math.max(r, g, b), mn = Math.min(r, g, b); return (mx > 150 && (mx - mn) < 22) || (mx > 140 && (mx - mn) < 48 && b >= r - 4 && b >= g - 10); };   // 밝은 무채색 + 옅은 푸른 회색 그림자
    for (let x = 0; x < W; x += 1) { stack.push(x, (Hh - 1) * W + x); } for (let y = 0; y < Hh; y += 1) { stack.push(y * W, y * W + W - 1); }
    while (stack.length) { const p = stack.pop(); if (seen[p] || !bgLike(p)) continue; seen[p] = 1; data[p * 4 + 3] = 0; const x = p % W, y = (p / W) | 0; if (x > 0) stack.push(p - 1); if (x < W - 1) stack.push(p + 1); if (y > 0) stack.push(p - W); if (y < Hh - 1) stack.push(p + W); }
    img = sharp(data, { raw: { width: W, height: Hh, channels: 4 } }).png();
  }
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
    const dest = `${OUT}/${part}-${tier}.png`;
    await sharp(base).png({ palette: true, quality: 92, colours: 256, effort: 10 }).toFile(dest);
    console.log("gear", part, tier, pick.src);
  }
}
