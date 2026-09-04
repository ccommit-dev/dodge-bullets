/**
 * 생성 원화 배치 — art-gen/out/ 의 컷아웃을 기존 교체 경로에 같은 파일명으로 꽂는다.
 *
 *   node scripts/place-art.mjs char <id>        char-<id>-{idle,run,attack,hit}.png → allies/authored/<id>-row.png (4열 가로 셀 행)
 *                                               + allies/<id>.png (개별 썸네일 362×724). 그 뒤 make-variant-atlas.mjs 가 authored 행을 우선 사용
 *   node scripts/place-art.mjs hero             hero-{idle,attack}-{0..3}.png → character/base/hero-idle.png · hero-attack.png (프레임 크기 유지)
 *   node scripts/place-art.mjs costume <id>     costume-<id>-{idle,attack}-{0..3}.png → character/skins/hero-<mode>-<id>.png
 *   node scripts/place-art.mjs boss <stem>      boss-<stem>-{hit,defeat}.png → monsters/<stem>-hit.png · -defeat.png + authored.json 등록
 *   node scripts/place-art.mjs cover <id>       cover-<id>.png → beat/covers/<id>.png (256²)
 *
 * 셀 배치 규칙(기본 아틀라스와 동일): 알파 바운딩 박스를 잘라 셀 높이의 96%로 맞추고 가로 중앙·바닥 정렬.
 */
import sharp from "sharp";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const OUT = "art-gen/out";
const ALLIES = "public/titans/generated/allies";
const CELL_W = 313, CELL_H = 209;
const [cmd, id] = process.argv.slice(2);

async function trimmed(file) {
  return sharp(await sharp(file).ensureAlpha().trim({ threshold: 8 }).png().toBuffer());
}

/** 컷아웃을 w×h 셀에 맞춘다 — 높이 fill%, 가로 중앙, 바닥 정렬 */
async function fitCell(file, w, h, fill = 0.96) {
  const t = await trimmed(file);
  const m = await t.metadata();
  const targetH = Math.round(h * fill);
  const scale = targetH / m.height;
  let tw = Math.round(m.width * scale), th = targetH;
  if (tw > w * 0.9) { tw = Math.round(w * 0.9); th = Math.round(m.height * (tw / m.width)); }
  const body = await t.resize(tw, th).png().toBuffer();
  return sharp({ create: { width: w, height: h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: body, left: Math.round((w - tw) / 2), top: h - th }]).png().toBuffer();
}

async function placeChar() {
  mkdirSync(`${ALLIES}/authored`, { recursive: true });
  const cells = [];
  for (const [i, s] of ["idle", "run", "attack", "hit"].entries()) {
    cells.push({ input: await fitCell(`${OUT}/char-${id}-${s}.png`, CELL_W, CELL_H), left: i * CELL_W, top: 0 });
  }
  const row = `${ALLIES}/authored/${id}-row.png`;
  await sharp({ create: { width: 1254, height: CELL_H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite(cells).png().toFile(row);
  await sharp(await fitCell(`${OUT}/char-${id}-idle.png`, 362, 724, 0.98)).toFile(`${ALLIES}/${id}.png`);
  console.log("placed", row, `+ ${ALLIES}/${id}.png`);
}

async function placeHero() {
  for (const [mode, file] of [["idle", "public/titans/character/base/hero-idle.png"], ["attack", "public/titans/character/base/hero-attack.png"]]) {
    const m = await sharp(file).metadata();
    const fw = Math.floor(m.width / 4);
    const cells = [];
    for (let i = 0; i < 4; i += 1) cells.push({ input: await fitCell(`${OUT}/hero-${mode}-${i}.png`, fw, m.height, 0.97), left: i * fw, top: 0 });
    await sharp({ create: { width: fw * 4, height: m.height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite(cells).png().toFile(file + ".tmp");
    (await import("node:fs")).renameSync(file + ".tmp", file);
    console.log("placed", file);
  }
}

async function placeCostume() {
  for (const mode of ["idle", "attack"]) {
    const base = `public/titans/character/base/hero-${mode}.png`;
    const m = await sharp(base).metadata();
    const fw = Math.floor(m.width / 4);
    const cells = [];
    for (let i = 0; i < 4; i += 1) cells.push({ input: await fitCell(`${OUT}/costume-${id}-${mode}-${i}.png`, fw, m.height, 0.97), left: i * fw, top: 0 });
    const out = `public/titans/character/skins/hero-${mode}-${id}.png`;
    await sharp({ create: { width: fw * 4, height: m.height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite(cells).png().toFile(out);
    console.log("placed", out);
  }
  const manifest = "public/titans/character/skins/authored.json";
  const list = existsSync(manifest) ? JSON.parse(readFileSync(manifest, "utf8")) : [];
  if (!list.includes(id)) list.push(id);
  writeFileSync(manifest, JSON.stringify(list, null, 2) + "\n");
  console.log("authored.json 등록 —", id, "(make-character-skins 가 건너뜀)");
}

async function placeBoss() {
  const dir = "public/titans/generated/monsters";
  const src = `${dir}/${id}.png`;
  const m = await sharp(src).metadata();
  for (const s of ["hit", "defeat"]) {
    const t = await trimmed(`${OUT}/boss-${id}-${s}.png`);
    await t.resize({ width: m.width, height: m.height, fit: "inside" }).extend({ background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .resize(m.width, m.height, { fit: "contain", position: s === "defeat" ? "bottom" : "centre", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png().toFile(`${dir}/${id}-${s}.png`);
  }
  const manifest = `${dir}/authored.json`;
  const list = existsSync(manifest) ? JSON.parse(readFileSync(manifest, "utf8")) : [];
  if (!list.includes(id)) list.push(id);
  writeFileSync(manifest, JSON.stringify(list, null, 2) + "\n");
  console.log("placed", `${dir}/${id}-hit.png`, `${dir}/${id}-defeat.png`, "(authored.json 등록 — make-monster-states 가 건너뜀)");
}

async function placeCover() {
  await sharp(`${OUT}/cover-${id}.png`).resize(256, 256).png().toFile(`public/beat/covers/${id}.png`);
  console.log("placed", `public/beat/covers/${id}.png`);
}

const fns = { char: placeChar, hero: placeHero, costume: placeCostume, boss: placeBoss, cover: placeCover };
if (!fns[cmd]) { console.error("usage: place-art.mjs char|hero|costume|boss|cover [id]"); process.exit(1); }
await fns[cmd]();
