/**
 * 유물 · 결정 강화 트리 아이콘 조립 (2026-10-26) — art-gen/blender/relic_icons.py 결과를 256² 로 줄여 public/titans/relics/ 에 둔다.
 *   node scripts/assemble-relics.mjs
 *   art-gen/out/b3d-relics/<이름>.png → public/titans/relics/<이름>.png  (유물 9 · 조각 · tree-<줄> 7)
 *   art-gen/out/b3d-relics/quest-<id>.png → public/titans/quests/<id>.png (사냥터 퀘스트 8줄, 2026-10-26)
 */
import sharp from "sharp";
import { mkdirSync, readdirSync } from "node:fs";

const SRC = "art-gen/out/b3d-relics";
const DST = "public/titans/relics";
const W = 256, PAD = 0.06;
mkdirSync(DST, { recursive: true });
mkdirSync("public/titans/quests", { recursive: true });
let n = 0;
for (const f of readdirSync(SRC).filter((x) => x.endsWith(".png")).sort()) {
  const trimmed = await sharp(`${SRC}/${f}`).trim({ threshold: 1 }).png().toBuffer();
  const fit = await sharp(trimmed).resize(Math.round(W * (1 - 2 * PAD)), Math.round(W * (1 - 2 * PAD)), { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  await sharp({ create: { width: W, height: W, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite([{ input: fit, gravity: "center" }]).png({ palette: true, quality: 92, compressionLevel: 9 }).toFile(f.startsWith("quest-") ? `public/titans/quests/${f.slice(6)}` : `${DST}/${f}`);
  n += 1;
}
console.log("placed", n, "→", DST);
