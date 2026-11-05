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
// 댐 방어전(성문 방어) · 비트 수련 (2026-10-23 릴스 추가)
for (const n of [1, 3]) { const buf = await sharp(`public/dodge/bg/s${n}.webp`).resize({ width: 720, height: 1052 }).png().toBuffer(); sprites[`bg:dam${n}`] = { src: "data:image/webp;base64," + (await sharp(buf).webp({ quality: 70 }).toBuffer()).toString("base64"), w: 720, h: 1052 }; }
for (const a of ["basic", "fire", "ice", "bolt"]) await flat(`arrow:${a}`, `public/dodge/arrows/${a}.png`, 14);
for (const k of ["fire", "ice", "meteor", "bolt", "holy"]) await flat(`skill:${k}`, `public/dodge/skills/${k}.png`, 72);
{ const buf = await sharp("public/beat/bg/stage.webp").png().toBuffer(); sprites["bg:beat"] = { src: "data:image/webp;base64," + (await sharp(buf).webp({ quality: 72 }).toBuffer()).toString("base64"), w: 720, h: 492 }; }
await flat("cover:city", "public/beat/covers/black-city-beat.png", 96, { trim: false });
await flat("cover:arcade", "public/beat/covers/arcade-overdrive.png", 96, { trim: false });
await flat("gear:shoulder-dragon", "public/titans/gear/shoulder-dragon.png", 110);
// 탈것 · 유물 (2026-11-04) — 탈것은 몬스터 시트라 왼쪽을 본다, 오른쪽으로 뒤집는다
for (const id of ["mount-boar", "mount-deer", "mount-wolf", "mount-drake"]) await character(id, { idle: H4 }, 120, true);
for (const r of ["ember-ring", "flame-feather", "lava-heart"]) await flat(`relic:${r}`, `public/titans/relics/${r}.png`, 76);
// 펫 · 세트 파츠 · 탈것에 앉은 주인공 (2026-11-05)
// 게임의 늑대(kind wolf)는 그림자 늑대 그림이다(SpriteArt MONSTER_ART) — 같은 그림을 wolf 키로
await character("shadow-wolf-clean", { idle: H4, hit: [0, 1] }, 130);
for (const k of Object.keys(sprites)) if (k.startsWith("shadow-wolf-clean:")) { sprites[k.replace("shadow-wolf-clean:", "wolf:")] = sprites[k]; delete sprites[k]; }
for (const id of ["pet-slime", "pet-goblin", "pet-wolf", "pet-ogre", "pet-dragon"]) if (existsSync(`${B3D}/${id}/idle_0.png`)) await character(id, existsSync(`${B3D}/${id}/hit_0.png`) ? { idle: H4, hit: [0, 1] } : { idle: H4 }, 120);
for (const k of ["sword", "spear", "bow", "staff"]) for (const p of ["helmet", "armor", "gloves", "boots", "shoulder"]) await flat(`gear:set-${k}-${p}`, `public/titans/gear/set-${k}-${p}.png`, 72);
// 대장 — 게임의 지역별 대장 그림(SpriteArt BOSS_ASSET) · 심연의 성 배경
for (const id of ["moss-golem-clean", "moon-wolf-king-clean", "wolf-king-clean", "flame-wyvern-clean", "abyss-titan"]) await character(id, { idle: H4, attack: H4, hit: [0, 1] }, 200);
{ const buf = await sharp("public/titans/backgrounds/abyss-sm.webp").resize({ width: 720, height: 400, fit: "cover", position: "top" }).png().toBuffer(); sprites["bg:abyss"] = { src: "data:image/webp;base64," + (await sharp(buf).webp({ quality: 70 }).toBuffer()).toString("base64"), w: 720, h: 400 }; }
for (const id of ["toto", "kiki", "momo", "bobo"]) await character(id, { idle: [0, 2, 4] }, 120);   // 첫 10연에 나오는 N 등급 동료
for (const r of ["frost-horn", "lucky-coin", "reed-flute", "oak-shield", "moon-shell", "kingfisher-feather"]) if (existsSync(`public/titans/relics/${r}.png`)) await flat(`relic:${r}`, `public/titans/relics/${r}.png`, 76);
if (existsSync("public/beat/covers/plasma-gun.png")) await flat("cover:plasma-gun", "public/beat/covers/plasma-gun.png", 96, { trim: false });
await flat("gear:spear-3", existsSync("public/titans/gear/spear-3.png") ? "public/titans/gear/spear-3.png" : "public/titans/gear/spear-1.png", 90);
// 탈것에 앉은 주인공 — 게임과 같은 시트 · 같은 계산으로 합성한다 (ui-polish.css .has-mount · sprite-anim.css .ride-rider · titans/mountRide 안장 자리)
{
  const { MOUNT_RIDE } = await import(`data:text/javascript,${encodeURIComponent((await import("node:fs")).readFileSync("src/titans/mountRide.ts", "utf8").replace(/:\s*Record<[^=]*=/g, " =").replace(/:\s*Readonly[^=]*=/g, " ="))}`);
  const CELL = 480, W = CELL / 2, TOP = 80, ROW = { idle: 0, walk: 1, attack: 2 };
  const H = Math.round(2 * W * 0.857), HW = Math.round(W * 0.857);
  // 대기 칸 기준 왼쪽 위 — 탈것 상자 왼쪽 위가 (0,0)
  const baseX = 0.44 * W + 0.4795 * W * (1 - 0.857) - 0.009 * W, baseY = -0.11 * W + 0.87 * 2 * W * (1 - 0.857) - 0.169 * 2 * W;
  const pivot = [0.92 * W, 1.63 * W];
  const HERO = { idle: { sheet: "public/titans/anim/hero/hero-ride-idle.webp", cell: 377, frames: 6 }, walk: { sheet: "public/titans/anim/hero/hero-ride-walk.webp", cell: 377, frames: 6 }, attack: { sheet: "public/titans/anim/hero/hero-ride-attack.webp", cell: 470, frames: 8 } };
  const plan = { idle: [0, 1, 2, 3].map((i) => [Math.round((i * 6) / 4), i]), walk: [0, 1, 2, 3, 4, 5].map((i) => [i, i]), attack: [0, 1, 2, 3, 4, 5].map((i) => { const f = Math.ceil((i * 8) / 6); return [f, Math.min(5, Math.floor((f / 8) * 6))]; }) };
  for (const m of ["boar", "deer", "wolf", "drake"]) {
    const art = `mount-${m}`, mountSheet = `public/titans/anim/monsters/${art}.webp`;
    for (const action of ["idle", "walk", "attack"]) {
      const h = HERO[action];
      for (let n = 0; n < plan[action].length; n += 1) {
        const [hf, mf] = plan[action][n];
        const mount = await sharp(await sharp(mountSheet).extract({ left: mf * CELL, top: ROW[action] * CELL, width: CELL, height: CELL }).png().toBuffer()).flop().png().toBuffer();
        const wide = action === "attack" ? 1.25 : 1;
        const hw = Math.round(HW * wide);
        const heroImg = await sharp(await sharp(h.sheet).extract({ left: hf * h.cell, top: 0, width: h.cell, height: 754 }).png().toBuffer()).resize(hw, H).png().toBuffer();
        const [sx, sy, sr] = MOUNT_RIDE[art][action][mf] ?? [0, 0, 0];
        const deg = -sr, rad = (deg * Math.PI) / 180;
        const rotated = deg ? await sharp(heroImg).rotate(deg, { background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer() : heroImg;
        const rm = await sharp(rotated).metadata();
        const lx = baseX - (wide > 1 ? 0.125 * HW : 0), cx = lx + hw / 2, cy = baseY + H / 2;
        const px = cx - pivot[0], py = cy - pivot[1];
        const nx = pivot[0] + px * Math.cos(rad) - py * Math.sin(rad), ny = pivot[1] + px * Math.sin(rad) + py * Math.cos(rad);
        const left = Math.round(nx - rm.width / 2 - sx * 2 * W), top = Math.round(ny - rm.height / 2 + sy * 2 * W + TOP);
        const canvasH = TOP + Math.round(CELL * 0.955);
        const buf = await sharp({ create: { width: CELL, height: TOP + CELL, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite([{ input: mount, left: 0, top: TOP }, { input: rotated, left: Math.max(0, left), top: Math.max(0, top) }]).png().toBuffer();
        const out = await sharp(await sharp(buf).extract({ left: 0, top: 0, width: CELL, height: canvasH }).png().toBuffer()).resize({ height: 190 }).png().toBuffer();
        const meta = await sharp(out).metadata();
        sprites[`ride-${m}:${action}:${n}`] = { src: await uri(out), w: meta.width, h: meta.height };
      }
    }
  }
}
const json = JSON.stringify({ sprites });
writeFileSync(`${OUT}/art.json`, json);
console.log("sprites", Object.keys(sprites).length, "bytes", json.length);
void readdirSync;
