/**
 * 화살 원정 캔버스용 배경 축소본 — public/titans/backgrounds/<id>.webp (1536px) → <id>-sm.webp (720px, q72).
 *   node scripts/make-stage-backgrounds.mjs
 * draw.ts 는 -sm 만 쓴다. 원본은 사냥터 CSS 배경용.
 */
import sharp from "sharp";
for (const id of ["meadow", "forest", "ruins", "volcano", "abyss"]) {
  const src = `public/titans/backgrounds/${id}.webp`;
  await sharp(src).resize({ width: 720 }).webp({ quality: 72 }).toFile(`public/titans/backgrounds/${id}-sm.webp`);
  console.log("wrote", `${id}-sm.webp`);
}
