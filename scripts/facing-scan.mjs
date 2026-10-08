/**
 * 생성 원화가 어느 쪽을 보는지 수치로 잰다 (2026-10-08, 사용자: "애니메이션 바라보는 방향 알맞게").
 * pixcel-studio(NX Pixel) 의 어두운 작은 덩어리(눈·코·입) 검출을 빌려, 머리 구간(불투명 bbox 위 38%)에서
 * 어두운 덩어리들의 가로 무게중심이 머리 폭 중앙에서 얼마나 치우쳤는지로 본다: +8% 이상 오른쪽 → 오른쪽 보기, −8% 이하 → 왼쪽 보기, 사이 → 정면.
 *   node scripts/facing-scan.mjs <png...>    → 파일마다 { facing, offset }
 */
import sharp from "sharp";
import { solidBbox, luma } from "file:///D:/aiContext/pixcel-studio/src/core/pixmap.js";
import { maskComponents } from "file:///D:/aiContext/pixcel-studio/src/core/segment.js";

export async function facingOf(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const pix = { width: info.width, height: info.height, data: new Uint8ClampedArray(data.buffer, data.byteOffset, data.length) };
  const box = solidBbox(pix);
  if (!box) return { file, facing: "none", offset: 0 };
  const [x0, y0, x1, y1] = box; const w = x1 - x0, h = y1 - y0;
  const hh = Math.max(4, Math.round(h * 0.38));   // 머리 구간
  // 머리 구간의 불투명 폭(열 범위) — 머리 중앙은 몸 bbox 중앙이 아니라 머리 자체의 중앙
  let hx0 = w, hx1 = 0; const lums = [];
  for (let j = 0; j < hh; j++) for (let i = 0; i < w; i++) { const p = ((y0 + j) * pix.width + (x0 + i)) * 4; if (pix.data[p + 3] >= 128) { if (i < hx0) hx0 = i; if (i > hx1) hx1 = i; lums.push([luma(pix.data[p], pix.data[p + 1], pix.data[p + 2]), j * w + i]); } }
  if (!lums.length) return { file, facing: "none", offset: 0 };
  const vals = lums.map((v) => v[0]).sort((a, b) => a - b);
  const thr = vals[0] + 0.18 * (vals[vals.length - 1] - vals[0]);
  const mask = new Uint8Array(w * hh);
  for (const [v, idx] of lums) if (v <= thr) mask[idx] = 1;
  const area = lums.length;
  const blobs = maskComponents(mask, w, hh, Math.max(4, Math.floor(0.0008 * area)), Math.floor(0.03 * area)).filter(([bx0, by0, bx1, by1]) => (bx1 - bx0) < 0.3 * w && (by1 - by0) < 0.3 * hh + 2);
  if (!blobs.length) return { file, facing: "front", offset: 0, blobs: 0 };
  let sx = 0, sa = 0;
  for (const [bx0, , bx1, , a] of blobs) { const mid = (bx0 + bx1) / 2; const ar = a ?? 1; sx += mid * ar; sa += ar; }
  const headMid = (hx0 + hx1) / 2, headW = Math.max(1, hx1 - hx0);
  const offset = (sx / sa - headMid) / headW;
  const facing = offset > 0.08 ? "right" : offset < -0.08 ? "left" : "front";
  return { file, facing, offset: +offset.toFixed(3), blobs: blobs.length };
}

if (process.argv[1] && /facing-scan\.mjs$/.test(process.argv[1])) {
  for (const f of process.argv.slice(2)) { const r = await facingOf(f); console.log(`${r.facing.padEnd(5)} ${String(r.offset).padStart(7)} ${r.blobs ?? 0}  ${f}`); }
}
