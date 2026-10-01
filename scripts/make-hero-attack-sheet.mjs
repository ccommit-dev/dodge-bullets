/**
 * 영웅 공격 시트 조립 — art-gen heroattack 4장 → public/titans/generated/hero-<id>-sheet.png (2026-09-28 · 10-01 무기별).
 *
 *   node scripts/make-hero-attack-sheet.mjs [id]      (기본 base: art-gen/out/heroattack-base-{0..3}.png)
 *
 * 예전 시트(2172×724)는 두 가지가 어긋났다:
 *   1) 대기 원화와 **다른 인물**(남색 머리·파란 망토) — 검을 휘두르는 320ms 동안 주인공이 바뀌어 보였다.
 *   2) 인물 높이가 프레임의 ~71% 라, 대기(857/887 = 97%)와 같은 drawHeight 로 그리면 **베는 순간 26% 작아졌다**.
 * 새 시트는 대기와 같은 프레임 높이(887)·바닥(885)을 쓰고, 인물은 **대기와 같은 배율**(857 ÷ 대기 원본 높이)로 줄인다.
 * 찌르는 자세는 웅크려 bbox 가 낮으므로 bbox 높이를 857 로 맞추면 웅크린 인물이 커진다 — 배율을 맞춰야 같은 사람이다.
 * 폭은 찌르는 자세가 넓어 780 으로.
 * player.ts 는 frameWidth = naturalWidth/4 로 자르므로 폭이 달라져도 코드는 그대로다.
 */
import { existsSync } from "node:fs";
import sharp from "sharp";

const id = process.argv[2] ?? "base";
const FRAME_W = 780, FRAME_H = 887, FRAMES = 4, FIGURE_H = 857, BASELINE = 885;
const IDLE_RAW = "art-gen/out/heroidle-base-20260918-pose.png";
// 무기별 시트 (2026-10-01): bow → hero-bow-sheet.png · staff → hero-staff-sheet.png. 검 시트(hero-attack-sheet)는 지웠다
const OUT = `public/titans/generated/hero-${id}-sheet.png`;

async function bbox(buf) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (let y = 0; y < info.height; y += 1) for (let x = 0; x < info.width; x += 1) {
    if (data[(y * info.width + x) * 4 + 3] > 30) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  return { x0, y0, x1, y1, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

const idleB = await bbox(await sharp(IDLE_RAW).png().toBuffer());
const SCALE = FIGURE_H / idleB.h;
console.log(`대기 원본 인물 높이 ${idleB.h} → 배율 ${SCALE.toFixed(3)}`);
const comps = [];
for (let i = 0; i < FRAMES; i += 1) {
  // --pick 1=s12,2=s21 : 그 프레임만 재추첨본(-태그)으로 바꿔 끼운다
  const picks = Object.fromEntries((process.argv.find((x) => x.startsWith("--pick="))?.slice(7) ?? "").split(",").filter(Boolean).map((kv) => kv.split("=")));
  const src = `art-gen/out/heroattack-${id}-${i}${picks[i] ? "-" + picks[i] : ""}.png`;
  if (!existsSync(src)) { console.error("없음:", src); process.exit(1); }
  const raw = await sharp(src).png().toBuffer();
  const b = await bbox(raw);
  const figure = await sharp(raw).extract({ left: b.x0, top: b.y0, width: b.w, height: b.h }).png().toBuffer();
  let scale = SCALE;
  if (b.w * scale > FRAME_W - 12) { console.warn(`frame ${i}: 폭 초과 — 배율을 줄인다`); scale = (FRAME_W - 12) / b.w; }
  // 활을 머리 위로 든 자세는 대기보다 키가 크다 — 바닥(885)에 발을 맞춘 채 프레임 안에 들어가게 줄인다
  if (b.h * scale > BASELINE - 2) { console.warn(`frame ${i}: 높이 초과 — 배율을 줄인다`); scale = (BASELINE - 2) / b.h; }
  const w = Math.round(b.w * scale), h = Math.round(b.h * scale);
  const frame = await sharp(figure).resize(w, h, { fit: "fill", kernel: "lanczos3" }).png().toBuffer();
  comps.push({ input: frame, left: i * FRAME_W + Math.round((FRAME_W - w) / 2), top: BASELINE - h });
  console.log(`frame ${i}: 원본 ${b.w}×${b.h} → ${w}×${h} (인물 높이 ${(h / FRAME_H * 100).toFixed(0)}%)`);
}
await sharp({ create: { width: FRAME_W * FRAMES, height: FRAME_H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite(comps).png().toFile(OUT);
console.log("wrote", OUT, `${FRAME_W * FRAMES}×${FRAME_H}`);
