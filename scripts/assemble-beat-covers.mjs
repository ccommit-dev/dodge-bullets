/**
 * 비트 수련 표지 조립 (2026-11-19, 리소스 피드백 ⑤) — art-gen/blender/beat_covers.py 결과를 public/beat/covers/<id>.png(256²)에.
 *   ART_STYLE=toon blender -b -P art-gen/blender/beat_covers.py -- <id>   (픽셀 곡 pixel-rush · playful-pixels 는 ART_STYLE=pixel)
 *   node scripts/assemble-beat-covers.mjs
 * 같은 파일명 · 크기라 코드(BeatGame beat/covers/<id>.png)는 그대로. 도트 곡은 최근접으로 키운다.
 */
import sharp from "sharp";
import { readdirSync } from "node:fs";
const SRC = "art-gen/out/beat-covers", DST = "public/beat/covers", PIXEL = new Set(["pixel-rush", "playful-pixels"]);
for (const f of readdirSync(SRC).filter((x) => x.endsWith(".png")).sort()) {
  const id = f.replace(/\.png$/, "");
  await sharp(`${SRC}/${f}`).removeAlpha().resize(256, 256, { kernel: PIXEL.has(id) ? "nearest" : "lanczos3" }).png({ compressionLevel: 9 }).toFile(`${DST}/${id}.png`);
  console.log("cover", id);
}
