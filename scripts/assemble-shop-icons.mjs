/**
 * 상점 패키지 그림 (2026-11-23, 사용자: "리소스 관점에서 그외에 아쉬운 부분 전부") — 패키지 칸이 금화 · 보석 두 그림만 돌려 썼다.
 *   blender -b -P art-gen/blender/relic_icons.py -- pkg   (ART_STYLE=toon · 유물 3판과 같은 셀 설정, RELIC_OUT 으로 따로)
 *   PKG_SRC=<렌더 폴더> node scripts/assemble-shop-icons.mjs [--out=폴더]
 * pkg-<상품 id>.png → public/ui/shop/<상품 id>.png (128² · 스티커 외곽선 4px, lib/sticker)
 * 캐릭터 · 코스튬(char-*) 은 주인공 대기 시트 첫 칸(titans/anim/hero/hero-idle-<스킨>.webp)에서 몸을 잘라 같은 테로.
 */
import sharp from "sharp";
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { sticker } from "./lib/sticker.mjs";

const SRC = process.env.PKG_SRC ?? "art-gen/out/b3d-relics";
const DST = process.argv.find((a) => a.startsWith("--out="))?.slice(6) ?? "public/ui/shop";
const W = 128, PAD = 0.06;
mkdirSync(DST, { recursive: true });
const place = async (buf, name) => {
  const trimmed = await sharp(buf).trim({ threshold: 1 }).png().toBuffer();
  const fit = await sharp(trimmed).resize(Math.round(W * (1 - 2 * PAD)), Math.round(W * (1 - 2 * PAD)), { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  const img = await sharp({ create: { width: W, height: W, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite([{ input: fit, gravity: "center" }]).png().toBuffer();
  await sharp(await sticker(img, { width: 4 })).png({ palette: true, quality: 92, compressionLevel: 9 }).toFile(`${DST}/${name}.png`);
  console.log("shop", name);
};
for (const f of readdirSync(SRC).filter((x) => /^pkg-.*\.png$/.test(x))) await place(`${SRC}/${f}`, f.slice(4, -4));
// 캐릭터 · 코스튬 — 대기 시트 6칸(1:2) 첫 칸
for (const [id, skin] of [["char-obsidian", "obsidian"], ["char-dawn", "dawn"], ["char-ember", "ember"], ["char-frost", "frost"]]) {
  const sheet = `public/titans/anim/hero/hero-idle-${skin}.webp`;
  if (!existsSync(sheet)) { console.warn("없음", sheet); continue; }
  const meta = await sharp(sheet).metadata();
  const cw = Math.floor(meta.width / 6);
  const cell = await sharp(sheet).extract({ left: 0, top: 0, width: cw, height: meta.height }).png().toBuffer();   // extract 와 trim 은 한 파이프에 두지 않는다(sharp 함정)
  await place(cell, id);
}
