/**
 * 비버 키우기 릴스(유도 광고 플레이어블) 그림 준비 (2026-10-23) — 게임 실제 리소스를 작은 webp data URI 로.
 *   node scripts/reels/prep-art.mjs   → art-gen/out/reels/art.json  { sprites: { key: { src, w, h } } }
 * 캐릭터는 동작 칸들을 한 상자(합집합)로 잘라 발이 칸마다 흔들리지 않게 한다. 키 = <id>:<동작>:<칸>
 */
import sharp from "sharp";
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";

const OUT = "art-gen/out/reels";
mkdirSync(OUT, { recursive: true });
const B3D = "art-gen/out/b3d2";
const sprites = {};

async function bbox(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let x0 = info.width, x1 = -1, y0 = info.height, y1 = -1;
  for (let y = 0; y < info.height; y += 2) for (let x = 0; x < info.width; x += 2) if (data[(y * info.width + x) * 4 + 3] > 20) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return { x0, x1: x1 + 2, y0, y1: y1 + 2, W: info.width, H: info.height };
}
const uri = async (buf) => "data:image/webp;base64," + (await sharp(buf).webp({ quality: 78, alphaQuality: 90 }).toBuffer()).toString("base64");

/** 캐릭터 — actions: { idle: [0..], attack: [...] }, height: 결과 높이(px) */
async function character(id, actions, height, flip = false) {
  const files = [];
  for (const [a, idx] of Object.entries(actions)) for (const i of idx) files.push([a, i, `${B3D}/${id}/${a}_${i}.png`]);
  const boxes = await Promise.all(files.map(([, , f]) => bbox(f)));
  const u = boxes.reduce((m, b) => ({ x0: Math.min(m.x0, b.x0), x1: Math.max(m.x1, b.x1), y0: Math.min(m.y0, b.y0), y1: Math.max(m.y1, b.y1) }), { x0: 1e9, x1: -1, y0: 1e9, y1: -1 });
  const cw = u.x1 - u.x0, ch = u.y1 - u.y0;
  const w = Math.round((cw / ch) * height);
  for (const [a, i, f] of files) {
    let img = sharp(f).extract({ left: u.x0, top: u.y0, width: cw, height: ch }).resize(w, height);
    if (flip) img = img.flop();
    sprites[`${id}:${a}:${i}`] = { src: await uri(await img.png().toBuffer()), w, h: height };
  }
}
async function flat(key, file, height, opts = {}) {
  let img = sharp(file);
  if (opts.trim !== false) img = img.trim({ threshold: 1 });
  const buf = await img.png().toBuffer();
  const m = await sharp(buf).metadata();
  const w = Math.round((m.width / m.height) * height);
  let r = sharp(buf).resize(w, height);
  if (opts.tint) r = r.tint(opts.tint);
  sprites[key] = { src: await uri(await r.png().toBuffer()), w, h: height };
}

const I6 = [0, 1, 2, 3, 4, 5], A8 = [0, 1, 2, 3, 4, 5, 6, 7], H4 = [0, 1, 2, 3];
await character("hero", { idle: I6, attack: A8, walk: I6 }, 150);
for (const id of ["mia", "leon", "sera", "garen"]) await character(id, { idle: [0, 2, 4], attack: [0, 2, 4, 6], walk: [0, 2, 4] }, 120);
await character("ari", { idle: [0, 2, 4], attack: [0, 2, 4, 6] }, 130);
for (const id of ["slime", "goblin"]) await character(id, { idle: H4, attack: H4, hit: [0, 1] }, 130);
for (const id of ["armored-ogre", "dragon"]) await character(id, { idle: H4, attack: H4, hit: [0, 1] }, 200);
for (let l = 0; l < 16; l += 1) await flat(`drum:${l}`, `public/forge/swords/s${String(l).padStart(2, "0")}.png`, 150);
await flat("acorn", "public/ui/attendance/gold.png", 64);
await flat("gem", "public/ui/attendance/gem.png", 48);
await flat("chest", "public/ui/attendance/event-chest.png", 90);
await flat("stone", "public/ui/attendance/enhance-stone.png", 48);
for (const g of ["helmet-3", "armor-3", "boots-3", "shoulder-dragon", "bow-3", "staff-3"]) await flat(`gear:${g}`, `public/titans/gear/${g}.png`, 90);
for (const b of ["meadow", "forest", "volcano", "ruins"]) {
  const f = existsSync(`public/titans/backgrounds/${b}-sm.webp`) ? `public/titans/backgrounds/${b}-sm.webp` : `public/titans/backgrounds/${b}.webp`;
  const buf = await sharp(f).resize({ width: 720, height: 400, fit: "cover", position: "top" }).png().toBuffer();
  sprites[`bg:${b}`] = { src: "data:image/webp;base64," + (await sharp(buf).webp({ quality: 70 }).toBuffer()).toString("base64"), w: 720, h: 400 };
}
await flat("logo", "docs/assets/app-logo.png", 128, { trim: false });
const json = JSON.stringify({ sprites });
writeFileSync(`${OUT}/art.json`, json);
console.log("sprites", Object.keys(sprites).length, "bytes", json.length);
void readdirSync;
