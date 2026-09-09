/**
 * 랭크 시험 그림자 상대 원화 배치 — art-gen/out/char-shadow-<id>-idle.png → public/titans/generated/shadow/<id>.png (높이 512, 트림).
 *   node scripts/place-shadows.mjs
 * 화면에서는 어두운 보라 톤(그림자)으로 표시된다 — events/shadowArena.ts shadowPortrait().
 */
import { existsSync, mkdirSync } from "node:fs";
import sharp from "sharp";

/** 가장 큰 알파 연결 성분만 남긴다 — 생성물에 떠 있는 작은 파편(무기 조각·먼지)을 지운다 */
async function largestComponent(buf) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, seen = new Uint8Array(W * H); let best = null; const stack = [];
  for (let st = 0; st < W * H; st += 1) { if (seen[st] || data[st * 4 + 3] <= 40) continue; const comp = []; stack.push(st); seen[st] = 1; while (stack.length) { const i = stack.pop(); comp.push(i); const x = i % W, y = (i - x) / W; for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const j = ny * W + nx; if (!seen[j] && data[j * 4 + 3] > 40) { seen[j] = 1; stack.push(j); } } } if (!best || comp.length > best.length) best = comp; }
  const keep = new Uint8Array(W * H); for (const i of best) keep[i] = 1;
  let x0 = W, y0 = H, x1 = 0, y1 = 0; for (const i of best) { const x = i % W, y = (i - x) / W; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) { const i = y * W + x; if (keep[i]) continue; if (x >= x0 - 8 && x <= x1 + 8 && y >= y0 - 8 && y <= y1 + 8) continue; data[i * 4 + 3] = 0; }
  return sharp(data, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer();
}
const IDS = ["swordsman", "tracker", "ascetic", "gatekeeper", "wanderer", "executor", "observer", "blacksmith"];
mkdirSync("public/titans/generated/shadow", { recursive: true });
let n = 0;
for (const id of IDS) {
  const src = `art-gen/out/char-shadow-${id}-idle.png`;
  if (!existsSync(src)) { console.log("skip", id); continue; }
  await sharp(await largestComponent(await sharp(src).png().toBuffer())).trim({ threshold: 12 }).resize({ height: 512, fit: "inside" }).png({ compressionLevel: 9, palette: true }).toFile(`public/titans/generated/shadow/${id}.png`);
  n += 1; console.log("placed", id);
}
console.log(`${n} shadows placed`);
