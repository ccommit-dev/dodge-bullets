/**
 * 칭호 엠블럼 조립 (2026-11-20) — art-gen/blender/title_emblems.py 결과(512² 투명)를 여백 6% 로 맞춰 128² 로 줄여 public/titans/titles/ 에 둔다.
 *   node scripts/assemble-titles.mjs
 */
import sharp from "sharp";
import { mkdirSync, readdirSync } from "node:fs";
import { sticker } from "./lib/sticker.mjs";

const SRC = process.env.TITLE_SRC ?? "art-gen/out/b3d-titles", DST = process.env.TITLE_DST ?? "public/titans/titles", W = 128, PAD = 0.06;
mkdirSync(DST, { recursive: true });
for (const f of readdirSync(SRC).filter((x) => x.endsWith(".png"))) {
  const trimmed = await sharp(`${SRC}/${f}`).trim({ threshold: 1 }).png().toBuffer();
  const fit = await sharp(trimmed).resize(Math.round(W * (1 - 2 * PAD)), Math.round(W * (1 - 2 * PAD)), { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  const img = await sharp({ create: { width: W, height: W, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite([{ input: fit, gravity: "center" }]).png().toBuffer();
  await sharp(await sticker(img, { width: 4 })).png({ palette: true, quality: 92, compressionLevel: 9 }).toFile(`${DST}/${f}`);   // 스티커 외곽선(lib/sticker) — 128² 라 4px
  console.log("title", f);
}
