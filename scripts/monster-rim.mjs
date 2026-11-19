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
    // 원본이 없으면 멈춘다 — public 시트는 2026-11-19 부터 이미 테두리빛이 구워져 있어 그걸 원본으로 삼으면 두 번 굽는다(art-gen/out 은 저장소에 없다 — 새로 받은 곳 · worktree).
    // 원본은 assemble-anim2 가 남긴다. 처음 한 번(테두리빛 없는 시트)만 FIRST_RUN=1 로 public 을 원본으로 옮긴다
    if (!existsSync(`${bak}/${f}`)) {
      if (process.env.FIRST_RUN !== "1") throw new Error(`원본 없음: ${bak}/${f} — node scripts/assemble-anim2.mjs ${id} 를 먼저 돌려 원본을 남기세요`);
      copyFileSync(`${dir}/${f}`, `${bak}/${f}`);
    }
    const png = await addMonsterRim(`${bak}/${f}`, cell);
    await sharp(png).webp({ quality: 88, alphaQuality: 92, effort: 5 }).toFile(`${dir}/${f}`);
    console.log(tag, id);
  }
}
