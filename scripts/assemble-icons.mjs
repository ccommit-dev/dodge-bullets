/**
 * 스킬 아이콘 · 성문 방어 화살 배치 (2026-10-16 2차) — art-gen/blender/icons.py 렌더(art-gen/out/b3d-icons/<set>/) →
 *   hunt   → public/ui/skills/titans/<id>.png 128² (사냥터 스킬 20 — 아이콘이자 명중 팝)
 *   dodge  → public/dodge/skills/<id>.png 128² (성문 방어 스킬 12 — 정령·패널 아이콘)
 *   arrows → public/dodge/arrows/<el>.png 160×38 (수평, 촉이 오른쪽 — draw.ts arrowImg)
 *   node scripts/assemble-icons.mjs
 */
import sharp from "sharp";
import { existsSync, readdirSync } from "node:fs";

const SRC = "art-gen/out/b3d-icons";
const MAP = { hunt: ["public/ui/skills/titans", 128, 128], dodge: ["public/dodge/skills", 128, 128], arrows: ["public/dodge/arrows", 160, 38] };
for (const [set, [dest, w, h]] of Object.entries(MAP)) {
  if (!existsSync(`${SRC}/${set}`)) continue;
  for (const f of readdirSync(`${SRC}/${set}`).filter((x) => x.endsWith(".png"))) {
    await sharp(`${SRC}/${set}/${f}`).resize(w, h, { kernel: "lanczos3" }).png().toFile(`${dest}/${f}`);
  }
  console.log(set, readdirSync(`${SRC}/${set}`).length);
}
