/**
 * 영웅 대기 시트 조립 — 오른쪽을 보는 새 원화 1장(art-gen heroidle) → 기존 규격 4프레임 시트 (1772×887, 프레임 443×887).
 *
 *   node scripts/make-hero-idle-sheet.mjs [seed]     (기본 20260918, 포즈 유도본 heroidle-<id>-<seed>-pose.png)
 *
 * 4프레임은 같은 그림이다 — 예전 AI 4장의 미세 차이는 "보일링"으로 읽혔고, 호흡은 CSS(hero-breathe)가 맡는다.
 * 인물 높이는 예전 프레임(857/887)에 맞추고 발을 바닥에 붙인다. 기본 시트를 바꾸면 obsidian/dawn 팔레트 스킨은
 * make-character-skins.mjs 로 재파생한다 (ember/frost 는 authored — 여기서 같은 규격으로 조립).
 * 마지막에 원본 좌표 → 프레임 % 환산표를 찍는다 (equipment/anchors.ts 손 위치 조정용).
 */
import { existsSync } from "node:fs";
import sharp from "sharp";

const seed = process.argv[2] ?? "20260918";
const FRAME_W = 443, FRAME_H = 887, FRAMES = 4, FIGURE_H = 857, BASELINE = 885;
const JOBS = [
  ["base", `art-gen/out/heroidle-base-${seed}-pose.png`, "public/titans/character/base/hero-idle.png"],
  ["ember", `art-gen/out/heroidle-ember-${seed}-pose.png`, "public/titans/character/skins/hero-idle-ember.png"],
  ["frost", `art-gen/out/heroidle-frost-${seed}-pose.png`, "public/titans/character/skins/hero-idle-frost.png"],
];

async function bbox(buf) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (let y = 0; y < info.height; y += 1) for (let x = 0; x < info.width; x += 1) {
    if (data[(y * info.width + x) * 4 + 3] > 30) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  return { x0, y0, x1, y1, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

for (const [id, src, out] of JOBS) {
  if (!existsSync(src)) { console.log("skip", id, "(없음)", src); continue; }
  const raw = await sharp(src).png().toBuffer();
  const b = await bbox(raw);
  const figure = await sharp(raw).extract({ left: b.x0, top: b.y0, width: b.w, height: b.h }).png().toBuffer();
  let scale = FIGURE_H / b.h;
  if (b.w * scale > FRAME_W - 12) scale = (FRAME_W - 12) / b.w;
  const w = Math.round(b.w * scale), h = Math.round(b.h * scale);
  const frame = await sharp(figure).resize(w, h, { fit: "fill", kernel: "lanczos3" }).png().toBuffer();
  const offX = Math.round((FRAME_W - w) / 2), offY = BASELINE - h;
  const tiles = Array.from({ length: FRAMES }, (_, i) => ({ input: frame, left: i * FRAME_W + offX, top: offY }));
  await sharp({ create: { width: FRAME_W * FRAMES, height: FRAME_H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite(tiles).png({ compressionLevel: 9 }).toFile(out);
  console.log("wrote", out, `figure ${w}×${h} at (${offX},${offY})`);
  if (id === "base") {
    // 원본(832×1216) 좌표 → 프레임 % — anchors.ts 의 hand/shoulder 좌표를 맞출 때 쓴다
    const pct = (px, py) => `${(((px - b.x0) * scale + offX) / FRAME_W * 100).toFixed(1)}%, ${(((py - b.y0) * scale + offY) / FRAME_H * 100).toFixed(1)}%`;
    console.log("map raw→frame:", { bbox: b, scale: scale.toFixed(4), frontHand: pct(640, 640), backHand: pct(420, 650), frontShoulder: pct(600, 300), backShoulder: pct(415, 300) });
  }
}
