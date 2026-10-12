// 여러 PNG 를 한 장(격자, 파일명 라벨)으로 — 얼굴 방향·스타일을 한 번에 본다.  node contact.mjs out.png <png...>
import sharp from "sharp";
const [out, ...files] = process.argv.slice(2);
const cell = 256, cols = 4, labelH = 22;
const rows = Math.ceil(files.length / cols);
const comps = [];
for (const [i, f] of files.entries()) {
  const img = await sharp(f).resize(cell, cell - labelH, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } }).flatten({ background: "#ffffff" }).png().toBuffer();
  const name = f.split(/[\\/]/).pop().replace(/\.png$/, "").replace(/^(char-capy2-|monster-capy2-|heroidle-capy2-|backdrop-capy2-)/, "").slice(0, 34);
  const label = Buffer.from(`<svg width="${cell}" height="${labelH}"><rect width="100%" height="100%" fill="#222"/><text x="4" y="15" font-size="12" font-family="Arial" fill="#fff">${i}: ${name}</text></svg>`);
  const x = (i % cols) * cell, y = Math.floor(i / cols) * cell;
  comps.push({ input: img, left: x, top: y }, { input: label, left: x, top: y + cell - labelH });
}
await sharp({ create: { width: cols * cell, height: rows * cell, channels: 4, background: "#ffffff" } }).composite(comps).png().toFile(out);
console.log("wrote", out, files.length);
