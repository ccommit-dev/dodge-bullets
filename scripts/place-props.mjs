/**
 * 무기 원화 배치 — art-gen/out/prop-<id>.png (512px 투명) →
 *   w-<ally>  → public/titans/equipment/weapons/ally/<ally>.png   (256px, 동료 장착 무기 — SpriteArt AllyWeapon, 좌하→우상 45°)
 *   s<nn>     → public/forge/swords/s<nn>.png                       (256px, 영웅 강화 검 — forge/swords SwordArt, 수직·칼끝 위)
 *   node scripts/place-props.mjs
 * 생성 구도가 들쭉날쭉하므로 (1) 알파 마스크 주축(PCA)으로 수직 정렬 → (2) 폭 프로파일로 손잡이 쪽 판정(가드·손잡이가 가장 넓다;
 * 지팡이는 반대로 보주가 머리) → 칼끝을 위로 → (3) 동료 무기는 45° 기울여 우상향.
 */
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import sharp from "sharp";

const OUT_ALLY = "public/titans/equipment/weapons/ally", OUT_SWORD = "public/forge/swords";
mkdirSync(OUT_ALLY, { recursive: true }); mkdirSync(OUT_SWORD, { recursive: true });
/** 가장 넓은 단면이 "머리"인 무기 (보주 지팡이) — 나머지는 넓은 쪽이 손잡이·가드 */
const HEAD_IS_WIDE = new Set(["w-sera", "w-ari"]); // 창은 술(tassel)이 촉 바로 아래 — 넓은 쪽이 머리
/** 대칭이라 방향 판정이 무의미한 무기 — 그대로 둔다 */
const NO_FLIP = new Set(["w-leon"]);

async function mask(buf) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height, at: (x, y) => data[(y * info.width + x) * 4 + 3] > 40 };
}
async function principalAxis(buf) {
  const m = await mask(buf);
  let n = 0, sx = 0, sy = 0;
  for (let y = 0; y < m.h; y += 1) for (let x = 0; x < m.w; x += 1) if (m.at(x, y)) { n += 1; sx += x; sy += y; }
  const cx = sx / n, cy = sy / n;
  let sxx = 0, syy = 0, sxy = 0;
  for (let y = 0; y < m.h; y += 1) for (let x = 0; x < m.w; x += 1) if (m.at(x, y)) { const dx = x - cx, dy = y - cy; sxx += dx * dx; syy += dy * dy; sxy += dx * dy; }
  return (0.5 * Math.atan2(2 * sxy, sxx - syy) * 180) / Math.PI;
}
/** 수직 정렬된 이미지에서 가장 넓은 행이 위쪽 절반에 있는가 */
async function wideRowIsUpper(buf) {
  const m = await mask(buf);
  let y0 = -1, y1 = -1, best = 0, yBest = 0;
  for (let y = 0; y < m.h; y += 1) {
    let c = 0; for (let x = 0; x < m.w; x += 1) if (m.at(x, y)) c += 1;
    if (c > 0) { if (y0 < 0) y0 = y; y1 = y; }
    if (c > best) { best = c; yBest = y; }
  }
  return yBest < (y0 + y1) / 2;
}
/** 여러 자루가 나온 생성물에서 가장 큰 연결 성분(알파)만 남긴다 — 쌍단검(mia)·활(줄이 분리됨)은 제외 */
const KEEP_ALL = new Set(["w-mia", "w-leon"]);
async function largestComponent(buf) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, seen = new Uint8Array(W * H);
  let best = null;
  const stack = [];
  for (let start = 0; start < W * H; start += 1) {
    if (seen[start] || data[start * 4 + 3] <= 40) continue;
    const comp = []; stack.push(start); seen[start] = 1;
    while (stack.length) {
      const i = stack.pop(); comp.push(i);
      const x = i % W, y = (i - x) / W;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const j = ny * W + nx; if (!seen[j] && data[j * 4 + 3] > 40) { seen[j] = 1; stack.push(j); }
      }
    }
    if (!best || comp.length > best.length) best = comp;
  }
  if (!best) return buf;
  const keep = new Uint8Array(W * H); for (const i of best) keep[i] = 1;
  // 가장 큰 성분에서 조금 떨어진 작은 조각(하이라이트·파편)은 살리고, 멀리 있는 두 번째 무기만 지운다 — 성분 bbox 를 12px 넓혀 그 안은 유지
  let x0 = W, y0 = H, x1 = 0, y1 = 0; for (const i of best) { const x = i % W, y = (i - x) / W; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) {
    const i = y * W + x; if (keep[i]) continue;
    if (x >= x0 - 12 && x <= x1 + 12 && y >= y0 - 12 && y <= y1 + 12) continue;
    data[i * 4 + 3] = 0;
  }
  return sharp(data, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer();
}
const rot = (buf, deg) => sharp(buf).rotate(deg, { background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();

const files = readdirSync("art-gen/out").filter((f) => /^prop-.+\.png$/.test(f));
let n = 0;
for (const f of files) {
  const id = f.replace(/^prop-/, "").replace(/\.png$/, "");
  const isAlly = id.startsWith("w-");
  const out = isAlly ? `${OUT_ALLY}/${id.slice(2)}.png` : `${OUT_SWORD}/${id}.png`;
  const src = `art-gen/out/${f}`;
  if (!existsSync(src)) continue;
  const raw0 = await sharp(src).png().toBuffer();
  const raw = KEEP_ALL.has(id) ? raw0 : await largestComponent(raw0);
  const axis = await principalAxis(raw);
  let r = -90 - axis; while (r > 90) r -= 180; while (r < -90) r += 180;
  let vertical = await rot(raw, r);
  let flipped = false;
  if (!NO_FLIP.has(id)) {
    const wideUp = await wideRowIsUpper(vertical);
    // 손잡이형: 넓은 쪽(가드)이 위면 뒤집는다 · 머리형(보주): 넓은 쪽이 아래면 뒤집는다
    if (HEAD_IS_WIDE.has(id) ? !wideUp : wideUp) { vertical = await rot(vertical, 180); flipped = true; }
  }
  const oriented = isAlly ? await rot(vertical, 45) : vertical;
  const trimmed = await sharp(oriented).trim({ threshold: 12 }).png().toBuffer();
  const m = await sharp(trimmed).metadata();
  const side = Math.max(m.width, m.height);
  await sharp(trimmed)
    .extend({ top: Math.floor((side - m.height) / 2), bottom: Math.ceil((side - m.height) / 2), left: Math.floor((side - m.width) / 2), right: Math.ceil((side - m.width) / 2), background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .resize(256, 256, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toFile(out);
  n += 1;
  console.log("placed", out, `axis ${axis.toFixed(0)}° → vertical ${r.toFixed(0)}°${flipped ? " flip" : ""}${isAlly ? " +45°" : ""}`);
}
console.log(`${n} props placed`);
