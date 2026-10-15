/**
 * 오려낸 원화의 알파 안개 지우기 (2026-10-15, 사용자: "대장간 보호구 무대 견갑이 어색" — 견갑 시트 칸 전체에 알파 1~24 바탕이 깔려
 * 무대의 drop-shadow(24px 주황)가 그것을 옅은 사각 판으로 키웠고, 둘레에 잎·회색 조각 잔상이 떠 있었다).
 *   node scripts/clean-alpha-haze.mjs <png> [칸 수=1]
 * 칸마다: 알파 ≤ 24 → 0 · 불투명 몸통(알파 > 160)에서 3px 넘게 떨어진 반투명 → 0 · 몸통과 떨어진 작고(가장 큰 것의 3% 미만) 채도 낮은 조각 → 0.
 * 원본은 art-gen/out/alpha-backup/<파일명> 에 한 번만 복사하고, 다시 돌리면 그 원본에서 다시 만든다(clean-drum-tiers.mjs 와 같은 규칙).
 */
import sharp from "sharp";
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { basename } from "node:path";

const file = process.argv[2], cells = Number(process.argv[3] ?? 1);
if (!file) { console.log("usage: node scripts/clean-alpha-haze.mjs <png> [cells]"); process.exit(1); }
const BAK = "art-gen/out/alpha-backup"; mkdirSync(BAK, { recursive: true });
const bak = `${BAK}/${basename(file)}`;
if (!existsSync(bak)) copyFileSync(file, bak);
const { data, info } = await sharp(bak).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height, cw = Math.floor(W / cells);
const sat = (i) => { const mx = Math.max(data[i], data[i + 1], data[i + 2]), mn = Math.min(data[i], data[i + 1], data[i + 2]); return mx ? (mx - mn) / mx : 0; };
let faint = 0, haze = 0, dropped = 0;
for (let c = 0; c < cells; c += 1) {
  const x0 = c * cw, x1 = c === cells - 1 ? W : x0 + cw;
  const idx = (x, y) => y * W + x;
  for (let y = 0; y < H; y += 1) for (let x = x0; x < x1; x += 1) { const i = idx(x, y) * 4; if (data[i + 3] > 0 && data[i + 3] <= 24) { data[i + 3] = 0; faint += 1; } }
  const solid = new Uint8Array(W * H);
  for (let y = 0; y < H; y += 1) for (let x = x0; x < x1; x += 1) solid[idx(x, y)] = data[idx(x, y) * 4 + 3] > 160 ? 1 : 0;
  const comp = new Int32Array(W * H).fill(-1), sizes = [], sats = [];
  for (let y = 0; y < H; y += 1) for (let x = x0; x < x1; x += 1) {
    const p = idx(x, y); if (!solid[p] || comp[p] >= 0) continue;
    const id = sizes.length; let n = 0, s = 0; const st = [p]; comp[p] = id;
    while (st.length) { const q = st.pop(); n += 1; s += sat(q * 4); const qx = q % W, qy = (q / W) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = qx + dx, ny = qy + dy; if (nx < x0 || ny < 0 || nx >= x1 || ny >= H) continue; const r = idx(nx, ny); if (solid[r] && comp[r] < 0) { comp[r] = id; st.push(r); } } }
    sizes.push(n); sats.push(s / n);
  }
  const big = Math.max(0, ...sizes);
  for (let y = 0; y < H; y += 1) for (let x = x0; x < x1; x += 1) { const p = idx(x, y); if (comp[p] >= 0 && sizes[comp[p]] < big * 0.03 && sats[comp[p]] < 0.3) { solid[p] = 0; data[p * 4 + 3] = 0; dropped += 1; } }
  const near = new Uint8Array(W * H), R = 3;
  for (let y = 0; y < H; y += 1) for (let x = x0; x < x1; x += 1) if (solid[idx(x, y)]) for (let dy = -R; dy <= R; dy += 1) for (let dx = -R; dx <= R; dx += 1) { const nx = x + dx, ny = y + dy; if (nx >= x0 && ny >= 0 && nx < x1 && ny < H) near[idx(nx, ny)] = 1; }
  for (let y = 0; y < H; y += 1) for (let x = x0; x < x1; x += 1) { const p = idx(x, y); if (!near[p] && data[p * 4 + 3] > 0) { data[p * 4 + 3] = 0; haze += 1; } }
}
await sharp(data, { raw: { width: W, height: H, channels: 4 } }).png().toFile(file);
console.log(basename(file), "faint", faint, "haze", haze, "drop", dropped);
