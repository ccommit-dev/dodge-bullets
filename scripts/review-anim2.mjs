/**
 * 애니메이션 2판 검수 시트 (2026-10-19) — node scripts/review-anim2.mjs <kind:ally|monster|hero> <id> [out.png]
 * 조립된 시트에서 동작마다 칸을 나란히 + 맨 끝에 어니언 스킨(모든 칸을 옅게 겹친 것: 앞 칸일수록 옅다)을 그린다.
 * 어니언에서 머리·무기 끝이 매끈한 호를 그리는지, 끝자세에서 간격이 좁고 휘두름에서 넓은지, 앞뒤로 튀는 칸이 없는지 본다.
 */
import sharp from "sharp";
import { readFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const [kind, id, outArg] = process.argv.slice(2);
const L = JSON.parse(readFileSync("art-gen/anim-layout.json", "utf8"));
const out = outArg ?? `art-gen/out/review/${kind}-${id}.png`;
mkdirSync(dirname(out), { recursive: true });
const BG = { r: 239, g: 227, b: 200, alpha: 1 };
const rows = [];
if (kind === "hero") {
  for (const [mode, s] of Object.entries(L.hero.sheets)) {
    const src = `public/titans/anim/hero/hero-${mode}.webp`;
    const cells = [];
    for (let i = 0; i < s.frames; i += 1) cells.push(await sharp(src).extract({ left: i * s.width, top: 0, width: s.width, height: L.hero.cellHeight }).png().toBuffer());
    rows.push({ name: mode, cells, w: s.width, h: L.hero.cellHeight });
  }
} else {
  const spec = L[kind];
  const [cw, ch] = spec.cell;
  const src = kind === "ally" ? `public/titans/anim/allies/${id}.webp` : `public/titans/anim/monsters/${id}.webp`;
  for (const [name, a] of Object.entries(spec.actions)) {
    const cells = [];
    for (let i = 0; i < a.frames; i += 1) cells.push(await sharp(src).extract({ left: i * cw, top: a.row * ch, width: cw, height: ch }).png().toBuffer());
    rows.push({ name, cells, w: cw, h: ch });
  }
}
const scale = kind === "hero" ? 0.42 : 0.7;
const pad = 6;
const maxCells = Math.max(...rows.map((r) => r.cells.length)) + 1;
const W = Math.round(Math.max(...rows.map((r) => r.w)) * scale) * maxCells + pad * (maxCells + 1);
const rowH = rows.map((r) => Math.round(r.h * scale) + pad);
const H = rowH.reduce((a, b) => a + b, pad);
const comp = [];
let y = pad;
for (const [ri, r] of rows.entries()) {
  const cw = Math.round(r.w * scale), ch = Math.round(r.h * scale);
  for (const [i, c] of r.cells.entries()) comp.push({ input: await sharp(c).resize(cw, ch).png().toBuffer(), left: pad + i * (cw + pad), top: y });
  // 어니언 — 앞 칸일수록 옅게(0.18 → 0.9)
  const layers = [];
  for (const [i, c] of r.cells.entries()) {
    const a = 0.18 + (0.72 * i) / Math.max(1, r.cells.length - 1);
    const { data, info } = await sharp(c).resize(cw, ch).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    for (let p = 3; p < data.length; p += 4) data[p] = Math.round(data[p] * a);
    layers.push({ input: await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer(), left: 0, top: 0 });
  }
  const onion = await sharp({ create: { width: cw, height: ch, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite(layers).png().toBuffer();
  comp.push({ input: onion, left: pad + r.cells.length * (cw + pad), top: y });
  y += rowH[ri];
}
await sharp({ create: { width: W, height: H, channels: 4, background: BG } }).composite(comp).png().toFile(out);
console.log(out, W, H);
