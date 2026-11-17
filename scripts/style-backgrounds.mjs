/**
 * 사냥터 배경을 캐릭터와 같은 그림결로 (2026-11-17, /goal ② "배경도 같은 선과 색 규칙으로" · ③ 도트)
 *   node scripts/style-backgrounds.mjs
 * 원본(art-gen/backgrounds-src/<이름>.webp — 처음 한 번 public 에서 옮겨 둔다)을
 *  ② 셀: 잔결 지우기(중앙값) → 색 단 줄이기(팔레트 COLORS 색 · 디더 없음 = 평면 색) → 색 경계에 잉크선(#3b2415) → public/titans/backgrounds/<이름>.webp
 *  ③ 도트: 셀 결과를 ¼ 로 줄여(면적 평균) 팔레트 PX_COLORS 색 → public/titans/backgrounds-px/<이름>.webp (게임이 pixelated 로 키운다)
 * 화면에서 한 발 뒤로 미는 채도 · 대비 낮춤은 CSS(ui/huntFocus.css)가 한다 — 그림은 색 규칙만.
 */
import sharp from "sharp";
import { existsSync, mkdirSync, readdirSync, copyFileSync } from "node:fs";

const PUB = "public/titans/backgrounds", PX_DIR = "public/titans/backgrounds-px", SRC = "art-gen/backgrounds-src";
const COLORS = 28, PX_COLORS = 24, PX_DOWN = 4, INK = [59, 36, 21];
mkdirSync(SRC, { recursive: true });
mkdirSync(PX_DIR, { recursive: true });

async function quantize(buf, colors) {
  // 팔레트 PNG 로 줄였다가 RGBA 로 되돌린다 — 디더 없음(평면 색)
  const png = await sharp(buf).png({ palette: true, colors, dither: 0, effort: 10 }).toBuffer();
  return sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
}

/** 색 경계에 잉크선 — 이웃과 밝기 차가 큰 화소만(두께 1px) */
function inkEdges({ data, info }) {
  const { width: w, height: h } = info, out = Buffer.from(data);
  const lum = new Float32Array(w * h);
  for (let i = 0; i < w * h; i += 1) lum[i] = 0.2126 * data[i * 4] + 0.7152 * data[i * 4 + 1] + 0.0722 * data[i * 4 + 2];
  for (let y = 1; y < h - 1; y += 1) for (let x = 1; x < w - 1; x += 1) {
    const i = y * w + x;
    const gx = lum[i + 1] - lum[i - 1], gy = lum[i + w] - lum[i - w];
    const g = Math.hypot(gx, gy);
    if (g > 48) {
      const a = Math.min(0.7, (g - 48) / 90);
      for (let c = 0; c < 3; c += 1) out[i * 4 + c] = Math.round(out[i * 4 + c] * (1 - a) + INK[c] * a);
    }
  }
  return out;
}

const names = readdirSync(PUB).filter((f) => f.endsWith(".webp"));
for (const f of names) {
  const src = `${SRC}/${f}`;
  if (!existsSync(src)) copyFileSync(`${PUB}/${f}`, src);   // 원본은 한 번만 옮긴다 — 다시 돌려도 원본에서 시작
  const meta = await sharp(src).metadata();
  const smooth = await sharp(src).median(5).png().toBuffer();
  const q = await quantize(smooth, COLORS);
  const inked = inkEdges(q);
  const cel = sharp(inked, { raw: { width: q.info.width, height: q.info.height, channels: 4 } });
  const celBuf = await cel.png().toBuffer();
  await sharp(celBuf).webp({ quality: 86, effort: 5 }).toFile(`${PUB}/${f}`);
  // 도트 — 셀을 ¼ 로 줄여 색을 더 줄인다
  const sw = Math.max(16, Math.round(meta.width / PX_DOWN)), sh = Math.max(16, Math.round(meta.height / PX_DOWN));
  const small = await sharp(celBuf).resize(sw, sh, { kernel: "cubic" }).png().toBuffer();
  const pq = await quantize(small, PX_COLORS);
  await sharp(pq.data, { raw: { width: pq.info.width, height: pq.info.height, channels: 4 } }).webp({ lossless: true, effort: 5 }).toFile(`${PX_DIR}/${f}`);
  console.log("bg", f, `${meta.width}×${meta.height}`, "→ 도트", `${sw}×${sh}`);
}
console.log("done", names.length);
