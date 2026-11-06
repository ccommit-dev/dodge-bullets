/**
 * 유물 · 결정 강화 트리 아이콘 조립 (2026-10-26) — art-gen/blender/relic_icons.py 결과를 256² 로 줄여 public/titans/relics/ 에 둔다.
 *   node scripts/assemble-relics.mjs [relics | <이름>…]   (인자 없으면 전부)
 *   art-gen/out/b3d-relics/<이름>.png → public/titans/relics/<이름>.png  (유물 · 조각 · tree-<줄> · 재화)
 *   art-gen/out/b3d-relics/quest-<id>.png → public/titans/quests/<id>.png (사냥터 퀘스트, 2026-10-26)
 * 유물(src/titans/relics.ts 표에 있는 이름)은 2D 마무리(scripts/relic-icon-pop.mjs — 계열색 테두리 빛 · 등급 별빛)를 더한다 (2026-11-06)
 */
import sharp from "sharp";
import { mkdirSync, readdirSync } from "node:fs";
import { popRelicIcon, relicTable } from "./relic-icon-pop.mjs";

const SRC = "art-gen/out/b3d-relics";
const DST = "public/titans/relics";
const W = 256, PAD = 0.06;
const RELIC = relicTable(".");
const args = process.argv.slice(2);
const want = args.length === 0 ? null : new Set(args.flatMap((a) => (a === "relics" ? Object.keys(RELIC) : [a])));
mkdirSync(DST, { recursive: true });
mkdirSync("public/titans/quests", { recursive: true });
let n = 0, popped = 0;
for (const f of readdirSync(SRC).filter((x) => x.endsWith(".png")).sort()) {
  const name = f.replace(/\.png$/, "");
  if (want && !want.has(name)) continue;
  const trimmed = await sharp(`${SRC}/${f}`).trim({ threshold: 1 }).png().toBuffer();
  const fit = await sharp(trimmed).resize(Math.round(W * (1 - 2 * PAD)), Math.round(W * (1 - 2 * PAD)), { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  let img = await sharp({ create: { width: W, height: W, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite([{ input: fit, gravity: "center" }]).png().toBuffer();
  if (RELIC[name]) { img = await popRelicIcon(img, RELIC[name].family, RELIC[name].tier); popped += 1; }
  await sharp(img).png({ palette: true, quality: 92, compressionLevel: 9 }).toFile(f.startsWith("quest-") ? `public/titans/quests/${f.slice(6)}` : `${DST}/${f}`);
  n += 1;
}
console.log("placed", n, "(유물 마무리", popped + ")", "→", DST);
