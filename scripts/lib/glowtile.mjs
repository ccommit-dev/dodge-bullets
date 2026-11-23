/**
 * 빛나는 정사각 아이콘 판 (2026-11-23, 사용자: "스킬 ui 나 퀘스트 ui 아이콘은 이런 풍으로" + 참고 그림 — 어두운 바탕 · 한 가지 색 강한 빛 ·
 * 방사 빛살 · 빛 소용돌이 · 물건 둘레 빛 · 반짝이. 원칙만 따르고 참고 그림의 물건 · 구도는 베끼지 않는다).
 *   glowTile(objPng, { hue, size, seed }) → png 버퍼(정사각, 둥근 모서리)
 * 층: 어두운 방사 바탕(속성색) → 빛살 → 소용돌이 호 둘 → 물건 그림자 빛(흐린 속성색 실루엣) → 물건 → 반짝이 → 가장자리 어둡게 → 얇은 테
 */
import sharp from "sharp";

const hsl = (h, s, l, a = 1) => `hsla(${h}, ${s}%, ${l}%, ${a})`;
function rng(seed) { let x = seed >>> 0 || 1; return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 10000) / 10000; }; }

export async function glowTile(objBuf, { hue = 45, sat = 90, size = 192, seed = 1, objScale = 0.74, radius = 0.09 } = {}) {
  const S = size, c = S / 2, R = rng(seed);
  // 1 · 바탕 — 가운데 밝은 속성색 → 가장자리 거의 검정
  const bg = `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}"><defs>
    <radialGradient id="g" cx="50%" cy="46%" r="72%"><stop offset="0" stop-color="${hsl(hue, sat, 62)}"/><stop offset=".28" stop-color="${hsl(hue, sat, 38)}"/><stop offset=".62" stop-color="${hsl(hue, sat * 0.8, 14)}"/><stop offset="1" stop-color="${hsl(hue, 40, 5)}"/></radialGradient></defs>
    <rect width="${S}" height="${S}" fill="url(#g)"/></svg>`;
  // 2 · 빛살 — 가운데서 퍼지는 가는 삼각형
  let rays = "";
  const n = 22;
  for (let i = 0; i < n; i += 1) {
    const a = (i / n) * Math.PI * 2 + R() * 0.12, w = 0.025 + R() * 0.05, L = S * (0.55 + R() * 0.25);
    const p = (ang, r) => `${(c + Math.cos(ang) * r).toFixed(1)},${(c * 0.92 + Math.sin(ang) * r).toFixed(1)}`;
    rays += `<polygon points="${p(a, 0)} ${p(a - w, L)} ${p(a + w, L)}" fill="${hsl(hue, sat, 78, 0.16 + R() * 0.14)}"/>`;
  }
  const raySvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}">${rays}</svg>`;
  // 3 · 소용돌이 — 물건 둘레를 감는 굵은 호 둘(흐리게) + 가는 밝은 호
  const arc = (r, a0, a1) => { const x0 = c + Math.cos(a0) * r, y0 = c + Math.sin(a0) * r * 0.62, x1 = c + Math.cos(a1) * r, y1 = c + Math.sin(a1) * r * 0.62; return `M${x0.toFixed(1)},${y0.toFixed(1)} A${r},${(r * 0.62).toFixed(1)} 0 0 1 ${x1.toFixed(1)},${y1.toFixed(1)}`; };
  const a0 = R() * Math.PI * 2;
  const swirlSoft = `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}"><g fill="none" stroke-linecap="round" transform="rotate(${(-25 + R() * 50).toFixed(0)} ${c} ${c})">
    <path d="${arc(S * 0.4, a0, a0 + 2.4)}" stroke="${hsl(hue, sat, 70, 0.55)}" stroke-width="${S * 0.07}"/>
    <path d="${arc(S * 0.3, a0 + 3.3, a0 + 5.4)}" stroke="${hsl(hue, sat, 74, 0.45)}" stroke-width="${S * 0.05}"/></g></svg>`;
  const swirlSharp = `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}"><g fill="none" stroke-linecap="round" transform="rotate(${(-25 + R() * 50).toFixed(0)} ${c} ${c})">
    <path d="${arc(S * 0.4, a0 + 0.2, a0 + 2.1)}" stroke="${hsl(hue, 100, 92, 0.85)}" stroke-width="${S * 0.012}"/>
    <path d="${arc(S * 0.3, a0 + 3.5, a0 + 5.1)}" stroke="${hsl(hue, 100, 92, 0.7)}" stroke-width="${S * 0.01}"/></g></svg>`;
  // 4 · 물건 — 칸의 objScale 로 가운데에(위로 살짝)
  const trimmed = await sharp(objBuf).trim({ threshold: 1 }).png().toBuffer();
  const os = Math.round(S * objScale);
  const obj = await sharp(trimmed).resize(os, os, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).modulate({ brightness: 1.06, saturation: 1.12 }).png().toBuffer();
  const ox = Math.round((S - os) / 2), oy = Math.round((S - os) / 2 - S * 0.02);
  // 물건 둘레 빛 — 실루엣을 속성색으로 칠해 크게 흐림
  const { data, info } = await sharp(obj).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const [gr, gg, gb] = hslToRgb(hue, sat, 72);
  const sil = Buffer.alloc(info.width * info.height * 4);
  for (let i = 0; i < info.width * info.height; i += 1) { sil[i * 4] = gr; sil[i * 4 + 1] = gg; sil[i * 4 + 2] = gb; sil[i * 4 + 3] = data[i * 4 + 3]; }
  const pad = Math.round(S * 0.12);
  const glow = await sharp(sil, { raw: { width: info.width, height: info.height, channels: 4 } }).extend({ top: pad, bottom: pad, left: pad, right: pad, background: { r: 0, g: 0, b: 0, alpha: 0 } }).blur(S * 0.045).png().toBuffer();
  const rim = await sharp(sil, { raw: { width: info.width, height: info.height, channels: 4 } }).extend({ top: 3, bottom: 3, left: 3, right: 3, background: { r: 0, g: 0, b: 0, alpha: 0 } }).blur(1.6).png().toBuffer();
  // 5 · 반짝이 — 네 갈래 별 몇 개 · 작은 점
  let spark = "";
  for (let i = 0; i < 7; i += 1) {
    const x = S * (0.12 + R() * 0.76), y = S * (0.1 + R() * 0.78), r = S * (0.018 + R() * 0.03);
    spark += `<path d="M${x},${y - r * 2} Q${x},${y} ${x + r * 2},${y} Q${x},${y} ${x},${y + r * 2} Q${x},${y} ${x - r * 2},${y} Q${x},${y} ${x},${y - r * 2}Z" fill="${hsl(hue, 100, 94, 0.85)}"/>`;
  }
  for (let i = 0; i < 18; i += 1) spark += `<circle cx="${(S * R()).toFixed(1)}" cy="${(S * R()).toFixed(1)}" r="${(S * (0.004 + R() * 0.008)).toFixed(1)}" fill="${hsl(hue, 100, 88, 0.7)}"/>`;
  const sparkSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}">${spark}</svg>`;
  // 6 · 가장자리 어둡게 + 얇은 테
  const vig = `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}"><defs><radialGradient id="v" cx="50%" cy="50%" r="72%"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".62"/></radialGradient></defs>
    <rect width="${S}" height="${S}" fill="url(#v)"/><rect x="1.5" y="1.5" width="${S - 3}" height="${S - 3}" rx="${S * radius}" fill="none" stroke="${hsl(hue, sat, 70, 0.55)}" stroke-width="2"/></svg>`;
  let img = await sharp(Buffer.from(bg)).composite([
    { input: await sharp(Buffer.from(raySvg)).blur(1.2).png().toBuffer() },
    { input: await sharp(Buffer.from(swirlSoft)).blur(S * 0.02).png().toBuffer() },
    { input: Buffer.from(swirlSharp) },
    { input: glow, left: ox - pad, top: oy - pad },
    { input: rim, left: ox - 3, top: oy - 3 },
    { input: obj, left: ox, top: oy },
    { input: Buffer.from(sparkSvg) },
    { input: Buffer.from(vig) },
  ]).png().toBuffer();
  // 둥근 모서리
  const mask = `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}"><rect width="${S}" height="${S}" rx="${S * radius}" fill="#fff"/></svg>`;
  img = await sharp(img).ensureAlpha().composite([{ input: Buffer.from(mask), blend: "dest-in" }]).png().toBuffer();
  return img;
}

function hslToRgb(h, s, l) {
  s /= 100; l /= 100;
  const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}
