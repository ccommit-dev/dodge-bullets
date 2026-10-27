// 무기 외형(상점 3종) 그림 — 장착 무기 4종 × 3단계 그림에서 파란 · 청록 부분(자루 · 보석 · 시위대)만 외형 색으로 (2026-10-27,
// /goal "외형 색: 같은 색 이동을 모든 부분에 적용해서 금색 장식 부분은 외형에 따라 다른 색으로 바뀌어요").
// 예전엔 CSS hue-rotate 로 그림 전체를 돌려 금 장식 · 붉은 술까지 색이 바뀌었다. 이제 그림마다 몸통 색(가장 많은 색상 — 금 · 황갈 33~65° · 테두리 · 밝은 보석(명도 0.68 넘음) 빼고:
// 1단계 나무 갈색 · 2단계 파랑 · 3단계 빨강)을 찾아 그 ±16° 픽셀만 옮기고 금 장식 · 흰 날 · 보석 · 테두리는 그대로 둔다.
//   node art-gen/weapon-skin-tint.mjs  → public/titans/gear/skins/<skinId>/<weapon|spear|bow|staff>-<1..3>.png
import sharp from "sharp";
import { mkdirSync } from "node:fs";
// target: 옮길 색상(°) · sat: 채도 배율(낮은 채도 나무 결은 minSat 까지 올린다) · lit: 밝기 더하기(0~1) — 몸통 색과의 차이는 절반만 남겨 결을 살린다
const SKINS = {
  "blade-crimson": { target: 352, sat: 1.1, lit: 0, minSat: 0.6 },
  "blade-glacier": { target: 192, sat: 0.8, lit: 0.18, minSat: 0.45 },
  "blade-solar": { target: 46, sat: 1.15, lit: 0.06, minSat: 0.7 },
};
/** 금 · 황갈 장식 색상 범위 — 몸통 찾기에서도, 칠하기에서도 뺀다 (1단계 검 날밑이 36° 황갈이라 나무 몸통 29° 창에 걸려 같이 칠해졌다, 2026-10-27) */
const GOLD = [33, 65];
const rgb2hsl = (r, g, b) => { const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn; if (!d) return [0, 0, l]; const s = d / (1 - Math.abs(2 * l - 1)); let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return [(h * 60 + 360) % 360, s, l]; };
const hsl2rgb = (h, s, l) => { const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2; const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]; return [r + m, g + m, b + m]; };
for (const [skin, t] of Object.entries(SKINS)) {
  mkdirSync(`public/titans/gear/skins/${skin}`, { recursive: true });
  for (const kind of ["weapon", "spear", "bow", "staff"]) for (const tier of [1, 2, 3]) {
    const src = `public/titans/gear/${kind}-${tier}.png`;
    const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    // 몸통 색 찾기 — 2° 칸 히스토그램(채도 가중)
    const hist = new Float64Array(180);
    for (let i = 0; i < data.length; i += 4) { if (data[i + 3] < 128) continue; const [h, s, l] = rgb2hsl(data[i] / 255, data[i + 1] / 255, data[i + 2] / 255); if (s < 0.2 || l < 0.18 || l > 0.68 || (h >= GOLD[0] && h <= GOLD[1])) continue; hist[Math.floor(h / 2)] += s; }
    let peak = 0; for (let k = 0; k < 180; k += 1) { let w = 0; for (let d = -4; d <= 4; d += 1) w += hist[(k + d + 180) % 180]; let pw = 0; for (let d = -4; d <= 4; d += 1) pw += hist[(peak + d + 180) % 180]; if (w > pw) peak = k; }
    const body = peak * 2 + 1;
    let moved = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 8) continue;
      const [h, s, l] = rgb2hsl(data[i] / 255, data[i + 1] / 255, data[i + 2] / 255);
      const dh = ((h - body + 540) % 360) - 180;
      if (Math.abs(dh) > 16 || s < 0.12 || l < 0.12 || (h >= GOLD[0] && h <= GOLD[1])) continue;   // 금 · 황갈 장식은 몸통 색과 가까워도(1단계 나무 29° ↔ 손잡이 장식 36°) 옮기지 않는다
      const nh = (t.target + dh * 0.5 + 360) % 360;
      const [r, g, b] = hsl2rgb(nh, Math.min(1, Math.max(t.minSat ?? 0, s * t.sat)), Math.min(0.97, l + t.lit * (1 - l)));
      data[i] = Math.round(r * 255); data[i + 1] = Math.round(g * 255); data[i + 2] = Math.round(b * 255); moved += 1;
    }
    await sharp(data, { raw: info }).png().toFile(`public/titans/gear/skins/${skin}/${kind}-${tier}.png`);
    if (!moved) console.warn("색을 옮긴 픽셀이 없다:", skin, kind, tier);
    if (skin === "blade-crimson") console.log(`  ${kind}-${tier} 몸통 ${body}° · ${moved}px`);
  }
  console.log(skin);
}
