/**
 * 그림자 상대 털 보라 틴트 (2026-10-14 보완) — img2img recolor(strength 0.45)는 털색을 못 바꿨다(IP 없이도 원색이 남음).
 * 대신 픽셀 단위로: 갈색·황갈색·크림(색상 15~50°, 채도 ≥ .12, 밝기 .22~.92)만 어두운 보라(색상 268°)로 돌리고 밝기를 25% 내린다.
 * 외곽선(어두움)·보라 옷·회색/청록 무기는 그대로 — 자세·방향이 1px 도 안 바뀐다.
 *   node scripts/shadow-tint.mjs <id>=<seed> ...   → art-gen/out/shadow-<id>.png
 */
import sharp from "sharp";

const OUT = "art-gen/out";
const rgb2hsl = (r, g, b) => { r /= 255; g /= 255; b /= 255; const max = Math.max(r, g, b), min = Math.min(r, g, b); const l = (max + min) / 2; if (max === min) return [0, 0, l]; const d = max - min; const s = l > .5 ? d / (2 - max - min) : d / (max + min); let h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4; return [h * 60, s, l]; };
const hsl2rgb = (h, s, l) => { const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2; const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]; return [(r + m) * 255, (g + m) * 255, (b + m) * 255]; };
for (const kv of process.argv.slice(2)) {
  const [id, seed] = kv.split("=");
  const src = `${OUT}/char-capy10-${id}-idle-s${seed}.png`;
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let n = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 8) continue;
    const [h, s, l] = rgb2hsl(data[i], data[i + 1], data[i + 2]);
    if (h >= 15 && h <= 50 && s >= .12 && l >= .22 && l <= .92) {
      const [r, g, b] = hsl2rgb(268, Math.min(.75, s + .25), Math.max(.12, l * .75));
      data[i] = r; data[i + 1] = g; data[i + 2] = b; n += 1;
    }
  }
  await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toFile(`${OUT}/shadow-${id}.png`);
  console.log("tinted", id, seed, `${Math.round(n / (info.width * info.height) * 100)}% px`);
}
