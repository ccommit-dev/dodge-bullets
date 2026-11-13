/**
 * 댐 방어전 낙석 조립 (2026-11-13) — art-gen/out/b3d-rocks/<장>-<모양>.png(Blender, art-gen/blender/rocks.py) 를
 * 투명 여백을 잘라 정사각 칸 가운데에 앉혀 public/dodge/rocks/<장>-<모양>.webp 로.
 *   node scripts/assemble-rocks.mjs
 * 바위 칸 256² · 조각(bit) 칸 96². 그릴 때 그림의 긴 변 = 그 종류 몸 크기(draw.ts monsterSize) — 잘라 낸 뒤라 모양마다 꽉 찬다.
 * sharp 는 trim 과 extract 를 한 파이프에 두지 않는다(sharp-derive-frames-pitfalls 메모) — trim 결과를 버퍼로 받고 다시 연다.
 */
import sharp from "sharp";
import { mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";

const SRC = "art-gen/out/b3d-rocks", OUT = "public/dodge/rocks";
mkdirSync(OUT, { recursive: true });
const files = readdirSync(SRC).filter((f) => /^\d-[a-z0-9]+\.png$/.test(f)).sort();
if (!files.length) { console.error("렌더가 없다 — bash art-gen/_run-rocks.sh 먼저"); process.exit(1); }
for (const f of files) {
  const bit = /-bit\d/.test(f);
  const box = bit ? 96 : 256, pad = bit ? 4 : 8;
  const trimmed = await sharp(join(SRC, f)).trim({ threshold: 1 }).png().toBuffer();
  const fitted = await sharp(trimmed).resize(box - pad * 2, box - pad * 2, { fit: "inside" }).png().toBuffer();
  const meta = await sharp(fitted).metadata();
  await sharp({ create: { width: box, height: box, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: fitted, left: Math.round((box - meta.width) / 2), top: Math.round((box - meta.height) / 2) }])
    .webp({ quality: 88, alphaQuality: 100 })
    .toFile(join(OUT, f.replace(/\.png$/, ".webp")));
}
console.log(`${files.length}장 → ${OUT}`);
