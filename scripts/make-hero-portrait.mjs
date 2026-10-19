// 주인공 초상(머리~가슴 정사각) — 대기 시트 0칸에서 잘라 public/titans/anim/hero/hero-portrait.webp 로 쓴다 (2026-10-19)
// 마이페이지 · 스킬 연계 · 순위 아이콘이 1:2 칸 시트를 정사각 상자에 늘려 그려 주인공이 옆으로 납작했다(옆 칸도 비쳤다).
// assemble-anim2 가 주인공 시트를 다시 쓸 때 함께 부른다. 단독 실행: node scripts/make-hero-portrait.mjs
import sharp from "sharp";
import { pathToFileURL } from "node:url";

export const HERO_PORTRAIT = "public/titans/anim/hero/hero-portrait.webp";

export async function makeHeroPortrait(sheet = "public/titans/anim/hero/hero-idle.webp", frames = 6, out = HERO_PORTRAIT) {
  const m = await sharp(sheet).metadata();
  const fw = Math.floor(m.width / frames);
  const cell = await sharp(sheet).extract({ left: 0, top: 0, width: fw, height: m.height }).png().toBuffer();
  const { data, info } = await sharp(cell).trim().png().toBuffer({ resolveWithObject: true });
  // 정사각 한 변 = 몸 너비의 1.05배 · 머리 꼭대기에서 4% 위부터 — 머리와 가슴이 들어온다
  const side = Math.round(info.width * 1.05);
  const padTop = Math.round(side * 0.04);
  // sharp 는 한 파이프에서 resize 를 composite 보다 먼저 한다 — 합친 뒤 따로 줄인다
  const square = await sharp({ create: { width: side, height: side, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: await sharp(data).extract({ left: 0, top: 0, width: info.width, height: Math.min(info.height, side - padTop) }).png().toBuffer(), left: Math.round((side - info.width) / 2), top: padTop }])
    .png().toBuffer();
  await sharp(square).resize(192, 192)
    .webp({ quality: 90, alphaQuality: 94 })
    .toFile(out);
  return out;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) console.log(await makeHeroPortrait());
