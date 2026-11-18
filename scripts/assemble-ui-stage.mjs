/**
 * 메뉴 화면 무대 · 받침대 조립 (2026-11-18, /goal "이런 느낌의 ui랑 배경 리소스를 변경")
 *   ART_STYLE=toon blender -b -P art-gen/blender/ui_stage.py -- pedestal|lodge|vault
 *   node scripts/assemble-ui-stage.mjs
 * art-gen/out/b3d-ui/<이름>.png → public/ui/stage/<이름>.webp
 *  - pedestal: 투명 여백을 잘라 폭 240(받침대는 카드 · 무대에서 작게 쓴다)
 *  - lodge · vault: 폭 780(시트 폭 460 의 1.7배 — 고밀도 화면에서도 선이 뭉개지지 않게)
 */
import sharp from "sharp";
import { mkdirSync } from "node:fs";

const SRC = "art-gen/out/b3d-ui", OUT = "public/ui/stage";
mkdirSync(OUT, { recursive: true });
const ped = await sharp(`${SRC}/pedestal.png`).trim({ threshold: 1 }).resize({ width: 240 }).webp({ quality: 88, alphaQuality: 92, effort: 5 }).toFile(`${OUT}/pedestal.webp`);
console.log("pedestal", ped.width, ped.height, ped.size);
for (const name of ["lodge", "vault"]) {
  const r = await sharp(`${SRC}/${name}.png`).flatten({ background: "#6e4426" }).resize({ width: 780 }).webp({ quality: 82, effort: 5 }).toFile(`${OUT}/${name}.webp`);
  console.log(name, r.width, r.height, r.size);
}
