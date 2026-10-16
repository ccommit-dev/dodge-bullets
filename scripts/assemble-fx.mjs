/**
 * 이펙트 스프라이트 띠 조립 (2026-10-16) — art-gen/out/b3d-fx/<name>/f0..5.png(Blender, art-gen/blender/fx.py) →
 *   public/titans/fx/<name>.webp  6칸 × 256² (가로 띠). 밝은 부분을 흐리게 한 빛 번짐(블룸)을 아래에 깔아 화면에서 빛나 보이게 한다.
 *   node scripts/assemble-fx.mjs
 * CSS(src/fx-sprites.css)는 띠를 transform: translateX 로 steps(6) 넘긴다 — background-position 애니메이션은 기기에서 FPS 를 깎았다.
 */
import sharp from "sharp";
import { existsSync, mkdirSync, readdirSync } from "node:fs";

const SRC = "art-gen/out/b3d-fx", OUT = "public/titans/fx", CELL = 256, N = 6;
mkdirSync(OUT, { recursive: true });
for (const name of readdirSync(SRC)) {
  const ops = [];
  for (let i = 0; i < N; i += 1) {
    const f = `${SRC}/${name}/f${i}.png`;
    if (!existsSync(f)) continue;
    const base = await sharp(f).resize(CELL, CELL, { kernel: "lanczos3" }).png().toBuffer();
    const bloom = await sharp(base).blur(9).modulate({ brightness: 1.25, saturation: 1.3 }).png().toBuffer();
    const cell = await sharp({ create: { width: CELL, height: CELL, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: bloom }, { input: bloom, blend: "screen" }, { input: base }]).png().toBuffer();
    ops.push({ input: cell, left: i * CELL, top: 0 });
  }
  await sharp({ create: { width: CELL * N, height: CELL, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite(ops).webp({ quality: 88, alphaQuality: 92 }).toFile(`${OUT}/${name}.webp`);
  console.log("fx", name);
}
