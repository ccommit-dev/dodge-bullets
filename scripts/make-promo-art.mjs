/**
 * 홍보 페이지 그림 조립 (2026-10-23, 사용자: "홍보 페이지 우선 — 마지막 비버 키우기 리소스 스샷으로 모두 수정").
 *   node scripts/shoot-promo.mjs art-gen/out/promo   (휴대폰 화면 캡처)
 *   node scripts/make-promo-art.mjs                  → docs/assets/gameplay-{current,arrow,beat,forge}.png (1910×1074) · hero-arcade-v2.png (1915×821)
 * 같은 파일명이라 docs/index.html · styles.css 는 그대로. 휴대폰 캡처를 둥근 테두리에 넣고, 둘레에 로우 폴리 비버 · 몬스터 렌더(art-gen/out/b3d2)를 크게 앉힌다.
 */
import sharp from "sharp";
import { existsSync } from "node:fs";

const SHOT = "art-gen/out/promo";
const B3D = "art-gen/out/b3d2";
const GEAR = "art-gen/out/b3d-gear";

const bg = (w, h, a, b, glow) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>
    <radialGradient id="r" cx="${glow[0]}" cy="${glow[1]}" r="0.55"><stop offset="0" stop-color="#ffd27a" stop-opacity=".55"/><stop offset="1" stop-color="#ffd27a" stop-opacity="0"/></radialGradient>
    <pattern id="d" width="42" height="42" patternUnits="userSpaceOnUse"><circle cx="21" cy="21" r="2.2" fill="#fff" fill-opacity=".07"/></pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#g)"/><rect width="100%" height="100%" fill="url(#d)"/><rect width="100%" height="100%" fill="url(#r)"/>
  <ellipse cx="${w / 2}" cy="${h * 1.02}" rx="${w * 0.62}" ry="${h * 0.16}" fill="#000" fill-opacity=".28"/>
</svg>`);

/** 휴대폰 — 둥근 화면 + 검은 테 + 그림자 */
async function phone(file, height) {
  const meta = await sharp(file).metadata();
  const H = height, W = Math.round((meta.width / meta.height) * H);
  const R = Math.round(W * 0.09), bez = Math.round(W * 0.035);
  const screen = await sharp(file).resize(W, H).composite([{ input: Buffer.from(`<svg width="${W}" height="${H}"><rect width="${W}" height="${H}" rx="${R}" ry="${R}"/></svg>`), blend: "dest-in" }]).png().toBuffer();
  const FW = W + bez * 2, FH = H + bez * 2;
  const frame = Buffer.from(`<svg width="${FW}" height="${FH}"><rect width="${FW}" height="${FH}" rx="${R + bez}" ry="${R + bez}" fill="#1b120b"/><rect x="2" y="2" width="${FW - 4}" height="${FH - 4}" rx="${R + bez - 2}" fill="none" stroke="#6b4a2f" stroke-width="3"/></svg>`);
  const body = await sharp({ create: { width: FW, height: FH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite([{ input: frame }, { input: screen, left: bez, top: bez }]).png().toBuffer();
  return withShadow(body, 26, 0.55);
}

/** 그림자 — 알파를 흐려 아래 깔기 */
async function withShadow(buf, blur, alpha, dy = 18) {
  const m = await sharp(buf).metadata();
  const pad = blur * 2;
  // 모양 그대로의 그림자 — 원본 알파를 그대로 쓰고 색만 짙은 갈색, 알파는 alpha 배
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) { data[i] = 20; data[i + 1] = 10; data[i + 2] = 4; data[i + 3] = Math.round(data[i + 3] * alpha); }
  const shadowImg = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
  const out = await sharp({ create: { width: m.width + pad * 2, height: m.height + pad * 2, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: await sharp(shadowImg).extend({ top: pad, bottom: pad, left: pad, right: pad, background: { r: 0, g: 0, b: 0, alpha: 0 } }).blur(blur).toBuffer(), top: dy, left: 0 }, { input: buf, left: pad, top: pad }])
    .png().toBuffer();
  return { buf: out, pad };
}

/** 캐릭터 렌더 — 투명 테두리를 잘라 높이에 맞춘다(flip: 좌우 반전) */
async function figure(file, height, flip = false) {
  let img = sharp(file).trim({ threshold: 1 });
  if (flip) img = img.flop();
  const buf = await img.resize({ height }).png().toBuffer();
  return withShadow(buf, 14, 0.35, 10);
}

const frame = (id, action, i) => {
  const f = `${B3D}/${id}/${action}_${i}.png`;
  if (!existsSync(f)) throw new Error("없음 " + f);
  return f;
};

/** 놓기 — (cx, 발 y) 기준 */
async function place(list, item, cx, footY) {
  const m = await sharp(item.buf).metadata();
  list.push({ input: item.buf, left: Math.round(cx - m.width / 2), top: Math.round(footY - m.height + item.pad) });
}

async function scene(out, W, H, colors, glow, build) {
  const layers = [];
  await build(layers);
  await sharp(bg(W, H, colors[0], colors[1], glow)).composite(layers).png({ compressionLevel: 9 }).toFile(out);
  console.log("wrote", out);
}

// 1 · 사냥터 (메인 · og:image)
await scene("docs/assets/gameplay-current.png", 1910, 1074, ["#3a2414", "#7a4a26"], [0.62, 0.42], async (L) => {
  const p = await phone(`${SHOT}/hunt.png`, 900);
  await place(L, p, 1060, 1074 - 22);
  await place(L, await figure(frame("sera", "attack", 4), 300), 170, 1000);
  await place(L, await figure(frame("mia", "attack", 4), 330), 400, 1020);
  await place(L, await figure(frame("hero", "attack", 4), 420), 660, 1040);
  await place(L, await figure(frame("goblin-warlord", "attack", 2), 460), 1610, 1020);
});
// 2 · 성문 방어(화살 원정)
await scene("docs/assets/gameplay-arrow.png", 1910, 1074, ["#14283a", "#3a5a7a"], [0.4, 0.4], async (L) => {
  await place(L, await figure(frame("dragon", "attack", 2), 520), 1600, 1010);
  const p = await phone(`${SHOT}/defense.png`, 900);
  await place(L, p, 860, 1074 - 22);
  await place(L, await figure(frame("leon", "attack", 4), 400), 380, 1030);
  await place(L, await figure(frame("garen", "idle", 0), 360), 170, 1050);
});
// 3 · 비트 수련
await scene("docs/assets/gameplay-beat.png", 1910, 1074, ["#2a1440", "#5a2a7a"], [0.5, 0.35], async (L) => {
  await place(L, await figure(frame("sera", "idle", 0), 300), 190, 1040);
  await place(L, await figure(frame("season-1", "attack", 4), 330), 520, 1030);
  const p = await phone(`${SHOT}/beat.png`, 900);
  await place(L, p, 960, 1074 - 22);
  await place(L, await figure(frame("magma-imp", "attack", 2), 400), 1480, 1010);
  await place(L, await figure(frame("marina", "attack", 4), 290), 1760, 1050);
});
// 4 · 대장간 — 휴대폰 + 북 단계(0 · 5 · 10 · 15) + 파츠
await scene("docs/assets/gameplay-forge.png", 1910, 1074, ["#3a1a0a", "#8a3a1a"], [0.5, 0.45], async (L) => {
  const p = await phone(`${SHOT}/forge.png`, 900);
  await place(L, p, 960, 1074 - 22);
  const drums = [["drum-00", 260, 330, 560], ["drum-05", 280, 260, 960], ["drum-10", 300, 1640, 560], ["drum-15", 330, 1640, 1000]];
  for (const [n, h, x, y] of drums) await place(L, await figure(`${GEAR}/${n}.png`, h), x, y);
  for (const [n, h, x, y] of [["helmet-3", 180, 560, 330], ["shoulder-dragon", 170, 1360, 330], ["armor-2", 170, 560, 760], ["boots-3", 150, 1370, 760]]) await place(L, await figure(`${GEAR}/${n}.png`, h), x, y);
});
// 5 · 첫 화면 배경(투명도 .24 로 깔린다) — 비버 원정대 대 몬스터
await scene("docs/assets/hero-arcade-v2.png", 1915, 821, ["#1a120c", "#5a3418"], [0.5, 0.5], async (L) => {
  const row = [["marina", 300, 120], ["sera", 320, 330], ["garen", 330, 540], ["mia", 330, 750], ["hero", 380, 960]];
  for (const [id, h, x] of row) await place(L, await figure(frame(id, id === "hero" ? "attack" : "attack", 4), h), x, 790);
  for (const [id, h, x] of [["goblin", 300, 1250], ["ogre", 380, 1480], ["dragon", 420, 1730]]) await place(L, await figure(frame(id, "attack", 2), h), x, 790);
});
// 6 · 파비콘 · 앱 로고(600²) — 로우 폴리 주인공(art-gen/out/lookdev-cute/hero-lowpoly.png, BEAVER_STYLE=lowpoly lookdev_cute.py hero)
{
  const r = await sharp("art-gen/out/lookdev-cute/hero-lowpoly.png").trim({ threshold: 1 }).resize({ height: 640 }).png().toBuffer({ resolveWithObject: true });
  const top = 70;
  const fig = await sharp(r.data).extract({ left: 0, top: 0, width: Math.min(r.info.width, 600), height: 600 - top }).png().toBuffer();
  const back = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600"><defs><radialGradient id="r" cx=".5" cy=".38" r=".75"><stop offset="0" stop-color="#ffe08a"/><stop offset=".55" stop-color="#f2a23a"/><stop offset="1" stop-color="#a8561c"/></radialGradient></defs><rect width="600" height="600" fill="url(#r)"/></svg>`);
  const body = await sharp(back).composite([{ input: fig, left: Math.max(0, Math.round(300 - r.info.width * 0.42)), top }]).png().toBuffer();
  const masked = await sharp(body).composite([{ input: Buffer.from(`<svg width="600" height="600"><rect width="600" height="600" rx="132"/></svg>`), blend: "dest-in" }]).png().toBuffer();
  await sharp(masked).composite([{ input: Buffer.from(`<svg width="600" height="600"><rect x="7" y="7" width="586" height="586" rx="126" fill="none" stroke="#3b2415" stroke-width="14"/></svg>`) }]).png().toFile("docs/assets/app-logo.png");
  console.log("wrote docs/assets/app-logo.png");
}
console.log("done");
