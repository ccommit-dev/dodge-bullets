/**
 * 애니메이션 2판 전체 검수 시트 (2026-10-19) — node scripts/review-anim2-all.mjs <ally|monster> <action> [out.png]
 * 조립된 시트에서 한 동작 줄을 캐릭터마다 한 줄씩 쌓는다(맨 끝은 어니언). 다 같이 놓고 튀는 캐릭터(무기 가림·칸 넘침·자세 이상)를 찾는다.
 */
import sharp from "sharp";
import { readFileSync, readdirSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const [kind = "ally", action = "attack", outArg] = process.argv.slice(2);
const L = JSON.parse(readFileSync("art-gen/anim-layout.json", "utf8"));
const spec = L[kind], a = spec.actions[action];
if (!a) throw new Error(`없는 동작 ${action}`);
const dir = kind === "ally" ? "public/titans/anim/allies" : "public/titans/anim/monsters";
const ids = readdirSync(dir).filter((f) => f.endsWith(".webp")).map((f) => f.replace(/\.webp$/, "")).sort();
const [cw, ch] = spec.cell, scale = kind === "ally" ? 0.42 : 0.3;
const tw = Math.round(cw * scale), th = Math.round(ch * scale), label = 120;
const out = outArg ?? `art-gen/out/review/all-${kind}-${action}.png`;
mkdirSync(dirname(out), { recursive: true });
const comp = [];
for (const [r, id] of ids.entries()) {
  const src = `${dir}/${id}.webp`;
  const cells = [];
  for (let i = 0; i < a.frames; i += 1) cells.push(await sharp(src).extract({ left: i * cw, top: a.row * ch, width: cw, height: ch }).resize(tw, th).png().toBuffer());
  cells.forEach((c, i) => comp.push({ input: c, left: label + i * tw, top: r * th }));
  const layers = [];
  for (const [i, c] of cells.entries()) {
    const al = 0.2 + (0.7 * i) / Math.max(1, cells.length - 1);
    const { data, info } = await sharp(c).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    for (let p = 3; p < data.length; p += 4) data[p] = Math.round(data[p] * al);
    layers.push({ input: await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer(), left: 0, top: 0 });
  }
  comp.push({ input: await sharp({ create: { width: tw, height: th, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite(layers).png().toBuffer(), left: label + a.frames * tw + 8, top: r * th });
  const svg = Buffer.from(`<svg width="${label}" height="${th}"><text x="6" y="${Math.round(th / 2)}" font-size="16" font-family="sans-serif" fill="#3b2415">${id}</text></svg>`);
  comp.push({ input: svg, left: 0, top: r * th });
}
await sharp({ create: { width: label + (a.frames + 1) * tw + 16, height: ids.length * th, channels: 4, background: { r: 239, g: 227, b: 200, alpha: 1 } } }).composite(comp).png().toFile(out);
console.log(out, ids.length);
