/**
 * 지금 있는 몬스터 시트에 테두리빛 굽기 (2026-11-19, 리소스 피드백 ③) — 한 번만. 원본은 art-gen/out/monster-sheets-orig 에 두고 늘 원본에서 만든다(두 번 돌려도 겹치지 않게).
 *   node scripts/monster-rim.mjs [id...]
 * 새로 조립하는 시트는 assemble-anim2 가 같은 함수(lib/monster-rim)로 굽는다.
 */
import sharp from "sharp";
import { existsSync, mkdirSync, readdirSync, copyFileSync } from "node:fs";
import { addMonsterRim, rimmedMonster } from "./lib/monster-rim.mjs";
const only = process.argv.slice(2);
const SETS = [["public/titans/anim/monsters", 384, "anim"], ["public/titans/anim/monsters-hd", 576, "hd"]];
for (const [dir, cell, tag] of SETS) {
  const bak = `art-gen/out/monster-sheets-orig/${tag}`;
  mkdirSync(bak, { recursive: true });
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".webp"))) {
    const id = f.replace(/\.webp$/, "");
    if (!rimmedMonster(id) || (only.length && !only.includes(id))) continue;
    if (!existsSync(`${bak}/${f}`)) copyFileSync(`${dir}/${f}`, `${bak}/${f}`);
    const png = await addMonsterRim(`${bak}/${f}`, cell);
    await sharp(png).webp({ quality: 88, alphaQuality: 92, effort: 5 }).toFile(`${dir}/${f}`);
    console.log(tag, id);
  }
}
