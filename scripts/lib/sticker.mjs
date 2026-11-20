/**
 * 스티커 마무리 (2026-11-20, 사용자: "두 번째 첨부랑 비슷하게" — 이벤트 보상판 아이콘 그림결. 원칙만 따른다, 모습은 베끼지 않는다).
 * - 실루엣 둘레를 따라 고른 굵기의 짙은 남색 외곽선(알파를 넓혀 깐다 — 3D 외곽선은 면마다 굵기가 달라 가늘게 보였다)
 * - 채도 · 대비를 올려 평면 색을 또렷하게
 *   sticker(buf, { width: 6, color: [29, 24, 51], sat: 1.25 }) → png 버퍼(같은 크기, 외곽선만큼 안쪽으로 줄여 넣는다)
 */
import sharp from "sharp";

export async function sticker(buf, { width = 6, color = [29, 24, 51], sat = 1.25, bright = 1.04 } = {}) {
  const meta = await sharp(buf).metadata();
  const W = meta.width, H = meta.height;
  // 외곽선이 칸 밖으로 안 나가게 그림을 외곽선 굵기만큼 줄여 가운데에
  const inner = await sharp(buf).resize(W - 2 * width, H - 2 * width).png().toBuffer();
  const vivid = await sharp(inner).modulate({ saturation: sat, brightness: bright }).linear(1.08, -8).png().toBuffer();
  const placed = await sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite([{ input: vivid, left: width, top: width }]).png().toBuffer();
  // 알파를 넓힌다 — 흐린 뒤 문턱(원형에 가까운 확장)
  const { data, info } = await sharp(placed).ensureAlpha().extractChannel(3).blur(Math.max(0.6, width * 0.55)).raw().toBuffer({ resolveWithObject: true });
  const ch = info.channels;
  const out = Buffer.alloc(W * H * 4);
  for (let i = 0; i < W * H; i += 1) {
    const a = data[i * ch];
    const v = a > 6 ? 255 : Math.round((a / 6) * 255);
    out[i * 4] = color[0]; out[i * 4 + 1] = color[1]; out[i * 4 + 2] = color[2]; out[i * 4 + 3] = v;
  }
  const ring = await sharp(out, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer();
  return sharp(ring).composite([{ input: placed }]).png().toBuffer();
}
