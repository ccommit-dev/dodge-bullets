/**
 * 유물 아이콘 2D 마무리 (2026-11-06, 사용자: "유물 아이콘을 더 강렬하고 갖고 싶게 · 특징에 맞게").
 * relic_icons.py 의 3D 림 라이트는 잉크 외곽선(뒤집힌 껍질)이 실루엣 가장자리를 덮어 보이지 않았다 — 그래서 조립 때 2D 로 더한다.
 *   ① 외곽선 바로 안쪽, 빛이 오는 오른쪽 위 가장자리에 계열색 테두리 빛(등급이 높을수록 넓고 세다)
 *   ② 영웅(SR) 이상은 가장 밝은 자리에 네 갈래 별빛 반짝임, 전설(SSR) 이상은 하나 더
 * 계열 · 등급은 src/titans/relics.ts 표에서 읽는다(그림과 효과 수치가 한 곳을 본다).
 *   import { popRelicIcon, relicTable } from "./relic-icon-pop.mjs"
 */
import { readFileSync } from "node:fs";
import sharp from "sharp";

const FAMILY_RGB = { fire: [255, 120, 40], frost: [120, 215, 255], gold: [255, 205, 70], wind: [80, 245, 200], earth: [150, 225, 90], star: [205, 150, 255], water: [70, 170, 255] };
const TIER_K = { N: 0.55, R: 0.75, SR: 0.9, SSR: 1.05, UR: 1.2, LR: 1.35 };

export function relicTable(root = ".") {
  const src = readFileSync(`${root}/src/titans/relics.ts`, "utf8");
  return Object.fromEntries([...src.matchAll(/def\("([a-z-]+)", "([a-z]+)", "([A-Z]+)"/g)].map((m) => [m[1], { family: m[2], tier: m[3] }]));
}

/** buf: RGBA PNG(정사각) → 마무리한 PNG 버퍼 */
export async function popRelicIcon(buf, family, tier) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, px = Buffer.from(data);
  const k = TIER_K[tier] ?? 0.8, col = FAMILY_RGB[family] ?? [255, 240, 220];
  const A = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : px[(y * W + x) * 4 + 3]);
  const lum = (i) => (0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]) / 255;
  const reach = Math.round((W / 256) * (9 + 9 * k));   // 외곽선 안쪽 경계에서 몇 px 까지
  const out = Buffer.from(px);
  // ① 테두리 빛 — 오른쪽 위(+x, −y) 방향으로 reach 안에 투명이 있으면 가장자리. 잉크(어두운 외곽선) 픽셀은 건드리지 않는다
  for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) {
    const i = (y * W + x) * 4;
    if (px[i + 3] < 200 || lum(i) < 0.22) continue;
    let d = 0;
    // 잉크 외곽선(어두움)이나 투명을 만나면 거기가 경계 — 외곽선이 두꺼워 투명까지 재면 띠가 몇 px 만 남았다
    for (let s = 1; s <= reach; s += 1) { const j = ((y - s) * W + (x + s)) * 4; if (A(x + s, y - s) < 40 || lum(j) < 0.22) { d = s; break; } }
    if (!d) continue;
    const t = Math.min(1, Math.pow(1 - (d - 1) / reach, 1.4) * 1.05 * k);   // 경계에 가까울수록 세다
    for (let c = 0; c < 3; c += 1) out[i + c] = Math.round(255 - (255 - out[i + c]) * (1 - (col[c] / 255) * t));   // screen 합성
  }
  // ② 별빛 — 밝은 점 찾기(외곽선 안쪽 · 위쪽 절반 가중)
  const glints = tier === "SR" ? 1 : ["SSR", "UR", "LR"].includes(tier) ? 2 : 0;
  const spots = [];
  if (glints) {
    const cand = [];
    for (let y = 2; y < H - 2; y += 2) for (let x = 2; x < W - 2; x += 2) {
      const i = (y * W + x) * 4; if (px[i + 3] < 250) continue;
      cand.push([lum(i) * (1.15 - 0.3 * (y / H)), x, y]);
    }
    cand.sort((a, b) => b[0] - a[0]);
    for (const [, x, y] of cand) { if (spots.every(([sx, sy]) => Math.hypot(sx - x, sy - y) > W * 0.28)) spots.push([x, y]); if (spots.length >= glints) break; }
  }
  const star = (cx, cy, r) => {
    for (let y = Math.max(0, cy - r); y < Math.min(H, cy + r + 1); y += 1) for (let x = Math.max(0, cx - r); x < Math.min(W, cx + r + 1); x += 1) {
      const dx = Math.abs(x - cx), dy = Math.abs(y - cy);
      // 네 갈래: 가로 · 세로로 가늘게 뻗고 가운데는 둥글게
      const arm = Math.max(Math.max(0, 1 - dx / r) * Math.max(0, 1 - dy / (r * 0.13)), Math.max(0, 1 - dy / r) * Math.max(0, 1 - dx / (r * 0.13)));
      const core = Math.max(0, 1 - Math.hypot(dx, dy) / (r * 0.28));
      const a = Math.min(1, Math.max(arm, core) * 1.1);
      if (a <= 0.01) continue;
      const i = (y * W + x) * 4;
      for (let c = 0; c < 3; c += 1) out[i + c] = Math.round(out[i + c] + (255 - out[i + c]) * a);
      out[i + 3] = Math.max(out[i + 3], Math.round(255 * a));
    }
  };
  spots.forEach(([x, y], n) => star(x, y, Math.round((W / 256) * (n === 0 ? 30 : 20) * (0.85 + 0.15 * k))));
  return sharp(out, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer();
}
