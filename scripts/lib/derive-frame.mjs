/**
 * 상태 프레임 파생 공통 (2026-10-13 보완): 배율·회전 뒤 캔버스가 커져도 "contain" 으로 통째로 줄이지 않고,
 * 불투명 bbox 가 원래 w×h 를 넘을 때만 그만큼만 줄여 가운데·아래로 놓는다 — 돌진 프레임이 10% 작아지던 것을 막는다.
 * 돌려주는 transform(k·ox·oy·W2·H2)은 compute-attack-anchors 가 앵커를 같은 변환으로 옮기는 데 쓴다.
 *   P3 = (ox + px·k, oy + py·k)  (px,py: 회전 캔버스 좌표)
 */
import sharp from "sharp";

const clear = { r: 0, g: 0, b: 0, alpha: 0 };

export async function alphaBbox(buf) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let x0 = info.width, y0 = info.height, x1 = -1, y1 = -1;
  for (let y = 0; y < info.height; y += 1) for (let x = 0; x < info.width; x += 1) {
    if (data[(y * info.width + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  return x1 < 0 ? null : { x0, y0, x1, y1, w: x1 - x0 + 1, h: y1 - y0 + 1, W: info.width, H: info.height };
}

/** src(PNG 경로/버퍼)를 sx·sy 배율 → rot(°, 시계) 회전 → bbox 기준으로 w×h 에 놓는다. bright·tint 는 선택 */
export async function tiltFrame(src, { rot = 0, sx = 1, sy = 1, bright = 1, tint = null } = {}) {
  const m = await sharp(src).metadata();
  const W = m.width, H = m.height;
  let img = sharp(src).resize(Math.round(W * sx), Math.round(H * sy), { fit: "fill" });
  if (bright !== 1) img = img.modulate({ brightness: bright });
  if (tint) img = img.tint(tint);
  const scaled = await img.png().toBuffer();
  const rotated = await sharp(scaled).rotate(rot, { background: clear }).png().toBuffer();
  const rm = await sharp(rotated).metadata();
  const W2 = rm.width, H2 = rm.height;
  const bb = (await alphaBbox(rotated)) ?? { x0: 0, y0: 0, w: W2, h: H2 };
  // 원래 틀 안의 여백(원본 bbox 아래 여백)은 유지 — 원본에서 발이 바닥에서 떨어져 있던 만큼 그대로
  const srcBb = (await alphaBbox(await sharp(src).png().toBuffer())) ?? { y1: H - 1, x0: 0, w: W };
  const bottomPad = H - 1 - srcBb.y1;
  const k = Math.min(1, W / bb.w, (H - bottomPad) / bb.h);
  // 가로는 원본 bbox 중심을 지키고, 세로는 bbox 아래를 원본 발 위치에 맞춘다
  const srcCx = srcBb.x0 + srcBb.w / 2;
  const ox = srcCx - (bb.x0 + bb.w / 2) * k;
  const oy = (H - bottomPad) - (bb.y0 + bb.h) * k;
  // 회전 캔버스가 틀보다 크면 composite 가 거부한다 — 틀에 들어오는 부분만 잘라 얹는다(bbox 가 틀 안에 들어오도록 k 를 잡았으니 잘리는 건 투명 여백뿐)
  const sw = Math.max(1, Math.round(W2 * k)), sh = Math.max(1, Math.round(H2 * k));
  const scaledRot = k === 1 ? rotated : await sharp(rotated).resize(sw, sh).png().toBuffer();
  const left = Math.max(0, Math.round(-ox)), top = Math.max(0, Math.round(-oy));
  const dstLeft = Math.max(0, Math.round(ox)), dstTop = Math.max(0, Math.round(oy));
  const cw = Math.max(1, Math.min(sw - left, W - dstLeft)), ch = Math.max(1, Math.min(sh - top, H - dstTop));
  const piece = await sharp(scaledRot).extract({ left, top, width: cw, height: ch }).png().toBuffer();
  const placed = await sharp({ create: { width: W, height: H, channels: 4, background: clear } })
    .composite([{ input: piece, left: dstLeft, top: dstTop }])
    .png().toBuffer();
  return { buffer: placed, transform: { k, ox: Math.round(ox), oy: Math.round(oy), W2, H2, W, H } };
}
