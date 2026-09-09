/**
 * 동료 아틀라스 재패킹 — 행(동료)마다 인물의 발이 셀 아래 경계를 ~20px 넘어 다음 행 상단에 찍혔다
 * (동료 카드에서 머리 위에 남의 부츠가 보이고, 본인 발은 잘렸다). 셀 높이를 EXT 만큼 늘리고,
 * 경계 아래 확장 띠에서 "위 행의 바닥선과 연결된 픽셀"만 위 행으로 옮긴다 (아래 행 상단에서는 지운다).
 *   node scripts/repack-ally-atlas.mjs
 * 대상: ally-animation-atlas-v1 (4×6) · ally-variant-atlas-v1 (4×12) · ally-skin-atlas-v1 (4×13) — 셀 313.5×209 → 313.5×239.
 * 이미 재패킹된 아틀라스(높이가 239 배수)는 건너뛴다. SpriteArt WIDE_CELL 은 새 비율(131.2% × 114.35%)을 쓴다.
 */
import sharp from "sharp";

const EXT = 30, CELL_H = 209, COLS = 4;
const FILES = [["ally-animation-atlas-v1.png", 6], ["ally-variant-atlas-v1.png", 12], ["ally-skin-atlas-v1.png", 13]];
const DIR = "public/titans/generated/allies/";

for (const [file, rows] of FILES) {
  const src = DIR + file;
  const meta = await sharp(src).metadata();
  if (meta.height === rows * (CELL_H + EXT)) { console.log("skip (already repacked)", file); continue; }
  if (meta.height !== rows * CELL_H) { console.log("skip (unexpected height)", file, meta.height); continue; }
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, cw = W / COLS;
  const A = (x, y) => data[(y * W + x) * 4 + 3] > 40;
  const outH = rows * (CELL_H + EXT);
  const out = Buffer.alloc(W * outH * 4);
  // 1) 기본 복사: 행 r 의 [r*CELL_H, (r+1)*CELL_H) → 출력 [r*(CELL_H+EXT), …)
  for (let r = 0; r < rows; r += 1) for (let y = 0; y < CELL_H; y += 1) data.copy(out, ((r * (CELL_H + EXT) + y) * W) * 4, ((r * CELL_H + y) * W) * 4, ((r * CELL_H + y + 1) * W) * 4);
  // 2) 행 경계 아래 EXT 띠: 위 행 바닥선에서 연결된 픽셀 = 위 행의 발 → 위 행 확장 영역으로 옮기고 아래 행 상단에서 지운다 (열마다 독립)
  let moved = 0;
  for (let r = 0; r < rows - 1; r += 1) {
    const boundary = (r + 1) * CELL_H;
    for (let c = 0; c < COLS; c += 1) {
      const x0 = Math.round(c * cw), x1 = Math.round((c + 1) * cw);
      const seen = new Set(); const stack = [];
      for (let x = x0; x < x1; x += 1) if (A(x, boundary - 1) && A(x, boundary)) { const k = boundary * W + x; if (!seen.has(k)) { seen.add(k); stack.push(k); } }
      while (stack.length) {
        const k = stack.pop(); const y = Math.floor(k / W), x = k % W;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy;
          if (nx < x0 || nx >= x1 || ny < boundary || ny >= boundary + EXT || ny >= H) continue;
          const nk = ny * W + nx; if (seen.has(nk) || !A(nx, ny)) continue; seen.add(nk); stack.push(nk);
        }
      }
      for (const k of seen) {
        const y = Math.floor(k / W), x = k % W;
        const srcOff = k * 4;
        const dstY = r * (CELL_H + EXT) + CELL_H + (y - boundary); // 위 행 확장 영역
        data.copy(out, (dstY * W + x) * 4, srcOff, srcOff + 4);
        const clearY = (r + 1) * (CELL_H + EXT) + (y - boundary); // 아래 행 상단에서 제거
        out.fill(0, (clearY * W + x) * 4, (clearY * W + x) * 4 + 4);
        moved += 1;
      }
    }
  }
  await sharp(out, { raw: { width: W, height: outH, channels: 4 } }).png({ compressionLevel: 9 }).toFile(src);
  console.log("repacked", file, `${W}×${outH}`, "moved px", moved);
}
