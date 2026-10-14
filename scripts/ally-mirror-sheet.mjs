// 동료 대기 원화 현재 vs 좌우 반전 판정 시트 (2026-10-14) — 꼬리 규칙으로 ally-facing.json 을 고를 때.  node scripts/ally-mirror-sheet.mjs out.png mia leon …
import sharp from "sharp";
const [out, ...ids] = process.argv.slice(2);
const cell = 300, lab = 24, cols = 4, comps = [];
for (const [i, id] of ids.entries()) for (const flop of [false, true]) {
  const k = i * 2 + (flop ? 1 : 0), x = (k % cols) * cell, y = Math.floor(k / cols) * cell;
  let p = sharp(`art-gen/out/char-${id}-idle.png`); if (flop) p = p.flop();
  comps.push({ input: await p.resize(cell, cell - lab, { fit: "contain", background: "#fff" }).flatten({ background: "#fff" }).png().toBuffer(), left: x, top: y });
  comps.push({ input: Buffer.from(`<svg width="${cell}" height="${lab}"><rect width="100%" height="100%" fill="${flop ? "#335" : "#222"}"/><text x="6" y="17" font-size="15" font-family="Arial" fill="#fff">${id} ${flop ? "MIRROR" : "current"}</text></svg>`), left: x, top: y + cell - lab });
}
const rows = Math.ceil(ids.length * 2 / cols);
await sharp({ create: { width: cols * cell, height: rows * cell, channels: 4, background: "#fff" } }).composite(comps).png().toFile(out);
