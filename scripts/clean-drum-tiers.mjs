/**
 * 북 강화 단계 원화 정리 (2026-10-15, 사용자: "그 외에 리소스 어색한 거 다시 찾아줘") — public/forge/swords/s<nn>.png
 *   node scripts/clean-drum-tiers.mjs && node scripts/place-drum-art.mjs
 * 1) 오려내기 잔재: 불투명 몸통(알파>160)에서 3px 넘게 떨어진 반투명 안개를 지운다(s02 는 반투명이 불투명의 74%였다).
 *    몸통과 떨어진 작은 회색 덩어리(채도 낮음 · 몸통의 3% 미만)도 지운다 — 별·리본처럼 색 있는 조각은 남긴다.
 * 2) s00 오른쪽 아래 하늘색 덩어리(색상 184° · 채도 1)를 몸통 띠의 파랑(약 202° · 채도 0.88)으로 맞춰 띠에서 늘어진 리본으로 읽히게 한다.
 * 원본은 art-gen/out/drum-tier-backup/ 에 한 번만 복사해 두고, 다시 돌리면 그 원본에서 다시 만든다.
 */
import sharp from "sharp";
import { copyFileSync, existsSync, mkdirSync } from "node:fs";

const DIR = "public/forge/swords", BAK = "art-gen/out/drum-tier-backup";
mkdirSync(BAK, { recursive: true });

const hsl = (r, g, b) => { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn; if (!d) return [0, 0, l]; const s = d / (1 - Math.abs(2 * l - 1)); let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; if (h < 0) h += 360; return [h, Math.min(1, s), l]; };
const rgb = (h, s, l) => { const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2; const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]; return [(r + m) * 255, (g + m) * 255, (b + m) * 255].map((v) => Math.round(Math.max(0, Math.min(255, v)))); };

for (let t = 0; t < 16; t += 1) {
  if (t === 2) continue;   // 2단계는 새로 그렸다 — scripts/place-drum-art.mjs (이 스크립트 뒤에 돌린다)
  const name = `s${String(t).padStart(2, "0")}.png`;
  if (!existsSync(`${BAK}/${name}`)) copyFileSync(`${DIR}/${name}`, `${BAK}/${name}`);
  const { data, info } = await sharp(`${BAK}/${name}`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, N = W * H;
  const solid = new Uint8Array(N);
  for (let p = 0; p < N; p += 1) solid[p] = data[p * 4 + 3] > 160 ? 1 : 0;
  // 몸통 조각들 — 가장 큰 것 기준으로 작고 회색인 떨어진 조각은 버린다
  const comp = new Int32Array(N).fill(-1), sizes = [], sats = [];
  for (let p = 0; p < N; p += 1) {
    if (!solid[p] || comp[p] >= 0) continue;
    const id = sizes.length; let n = 0, sat = 0; const st = [p]; comp[p] = id;
    while (st.length) { const q = st.pop(); n += 1; sat += hsl(data[q * 4], data[q * 4 + 1], data[q * 4 + 2])[1]; const x = q % W, y = (q / W) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const r = ny * W + nx; if (solid[r] && comp[r] < 0) { comp[r] = id; st.push(r); } } }
    sizes.push(n); sats.push(sat / n);
  }
  const big = Math.max(...sizes);
  let dropped = 0;
  for (let p = 0; p < N; p += 1) if (comp[p] >= 0 && sizes[comp[p]] < big * 0.03 && sats[comp[p]] < 0.3) { solid[p] = 0; data[p * 4 + 3] = 0; dropped += 1; }
  // 몸통에서 3px 넘게 떨어진 반투명은 안개
  const near = new Uint8Array(N); const R = 3;
  for (let p = 0; p < N; p += 1) if (solid[p]) { const x = p % W, y = (p / W) | 0; for (let dy = -R; dy <= R; dy += 1) for (let dx = -R; dx <= R; dx += 1) { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < W && ny < H) near[ny * W + nx] = 1; } }
  let haze = 0;
  for (let p = 0; p < N; p += 1) if (!near[p] && data[p * 4 + 3] > 0) { data[p * 4 + 3] = 0; haze += 1; }
  // s00 하늘색 덩어리 → 띠 파랑
  let recolored = 0;
  if (t === 0) for (let y = Math.round(H * 0.68); y < H; y += 1) for (let x = Math.round(W * 0.6); x < W; x += 1) {
    const i = (y * W + x) * 4; if (data[i + 3] < 20) continue;
    const [h, s, l] = hsl(data[i], data[i + 1], data[i + 2]);
    if (h > 172 && h < 196 && s > 0.6) { const [r, g, b] = rgb(202, 0.88, Math.min(0.5, l * 0.9)); data[i] = r; data[i + 1] = g; data[i + 2] = b; recolored += 1; }
  }
  await sharp(data, { raw: { width: W, height: H, channels: 4 } }).png().toFile(`${DIR}/${name}`);
  console.log(name, "drop", dropped, "haze", haze, recolored ? `recolor ${recolored}` : "");
}
