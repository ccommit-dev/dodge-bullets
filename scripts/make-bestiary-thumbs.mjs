// 도감 썸네일 (2026-11-03) — 전투 시트(titans/anim/monsters)의 대기 첫 칸에서 만든다. 옛 썸네일은 예전 원화라 새 그림결과 달랐다.
//   node scripts/make-bestiary-thumbs.mjs
import { readdirSync } from "node:fs";
import sharp from "sharp";
const SHEETS = "public/titans/anim/monsters/", OUT = "public/titans/generated/monsters/thumbs/", CELL = 384, SIZE = 128;
const names = readdirSync(OUT).filter((f) => f.endsWith(".webp"));
for (const f of names) {
  // extract · trim 은 한 파이프에서 하지 않는다(버퍼로 끊는다)
  const cell = await sharp(SHEETS + f).extract({ left: 0, top: 0, width: CELL, height: CELL }).png().toBuffer();
  const body = await sharp(cell).trim().png().toBuffer();
  await sharp(body).resize(SIZE - 8, SIZE - 8, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).extend({ top: 4, bottom: 4, left: 4, right: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }).webp({ quality: 82 }).toFile(OUT + f);
}
console.log(`thumbs ${names.length}`);
