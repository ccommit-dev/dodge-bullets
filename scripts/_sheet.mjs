import sharp from "sharp";
import { existsSync } from "node:fs";
const id = process.argv[2]; const W = 260, H = 400;
const files = ["idle", "run", "attack", "hit"].map((s) => `art-gen/out/char-${id}-${s}.png`).filter(existsSync);
const cells = [];
for (const [i, f] of files.entries()) {
  const buf = await sharp(f).ensureAlpha().trim({ threshold: 8 }).resize({ width: W - 20, height: H - 20, fit: "inside" }).png().toBuffer();
  const m = await sharp(buf).metadata();
  cells.push({ input: buf, left: i * W + Math.round((W - m.width) / 2), top: H - m.height - 10 });
}
await sharp({ create: { width: W * 4, height: H, channels: 4, background: { r: 34, g: 38, b: 48, alpha: 1 } } }).composite(cells).png().toFile(`art-gen/out/sheet-${id}.png`);
console.log("sheet", id, files.length);
