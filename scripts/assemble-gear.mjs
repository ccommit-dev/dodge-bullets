/**
 * 장비 파츠 · 북 단계 그림 조립 (2026-10-23, 사용자: "무기 파츠 모델링 … BEAVER RAMPAGE 참고") — art-gen/blender/gear_icons.py 결과를
 * 기존 자리(같은 파일명 · 같은 캔버스 크기)에 앉힌다. 코드가 가리키는 경로는 그대로 — 그림만 바뀐다.
 *   node scripts/assemble-gear.mjs
 *   art-gen/out/b3d-gear/<이름>.png → public/titans/gear/<이름>.png   (weapon · bow · staff · shield · helmet · armor · gloves · boots ×3, 견갑 넷)
 *   art-gen/out/b3d-gear/sword-NN.png → public/forge/swords/sNN.png    (대장간 검 16단계 — 2026-10-27 북 → 검) · spear-N → public/titans/gear/spear-N.png
 */
import sharp from "sharp";
import { existsSync, readdirSync } from "node:fs";

const SRC = "art-gen/out/b3d-gear";
const PAD = 0.06;   // 둘레 여백 — 카드 아이콘 틀에 꽉 차되 외곽선이 잘리지 않게

async function place(src, dst) {
  const meta = existsSync(dst) ? await sharp(dst).metadata() : { width: 512, height: 512 };
  const W = meta.width, H = meta.height;
  const trimmed = await sharp(src).trim({ threshold: 1 }).png().toBuffer();
  const fit = await sharp(trimmed).resize(Math.round(W * (1 - 2 * PAD)), Math.round(H * (1 - 2 * PAD)), { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  await sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite([{ input: fit, gravity: "center" }]).png().toFile(dst);
  console.log("placed", dst, `${W}×${H}`);
}

let n = 0;
for (const f of readdirSync(SRC).filter((x) => x.endsWith(".png")).sort()) {
  const name = f.replace(/\.png$/, "");
  // 2026-10-27 무기 4종 — 대장간 단계 그림은 북(drum-NN) 대신 검(sword-NN). 예전 북 렌더는 건너뛴다 · 새 그림(spear-N)은 256² (다른 파츠와 같은 크기)
  if (/^drum-\d\d$/.test(name)) continue;
  const only = process.argv.slice(2);   // node scripts/assemble-gear.mjs spear sword — 이름 앞부분으로 골라 놓기
  if (only.length && !only.some((o) => name.startsWith(o))) continue;
  const m = name.match(/^sword-(\d\d)$/);
  const dst = m ? `public/forge/swords/s${m[1]}.png` : `public/titans/gear/${name}.png`;
  if (!existsSync(dst) && !m) await sharp({ create: { width: 256, height: 256, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).png().toFile(dst);
  await place(`${SRC}/${f}`, dst);
  n += 1;
}
console.log("done", n);
