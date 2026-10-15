/**
 * 주인공 3D 화풍 (2026-10-15, 중단 훅: "주인공만 납작 그림이라 3D 동료·장비와 안 맞는다").
 *   node scripts/hero-3d-frames.mjs split     — 기본 시트(대기·공격 4칸)를 art-gen/out/hero-src-<mode>-<i>.png 로 나눈다(흰 바탕 · 원래 칸 크기)
 *   node scripts/hero-3d-frames.mjs assemble  — art-gen/out/hero-r3d-<mode>-<i>-s<seed>.png(gen.py restyle 결과)를 원래 칸의 그림 상자에 같은 크기·자리로 앉혀 시트를 다시 만든다
 * 그림 상자(불투명 bbox)를 칸마다 그대로 지켜 장비 앵커(anchors.ts — 칸 기준 %)가 그대로 맞는다. 예전 시트는 art-gen/out/hero-sheet-backup/ 에.
 */
import sharp from "sharp";
import { copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";

const SHEETS = { idle: "public/titans/character/base/hero-idle.png", attack: "public/titans/character/base/hero-attack.png" };
const OUT = "art-gen/out";
const mode = process.argv[2];

async function bbox(input) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let x0 = info.width, x1 = -1, y0 = info.height, y1 = -1;
  for (let y = 0; y < info.height; y += 1) for (let x = 0; x < info.width; x += 1) if (data[(y * info.width + x) * 4 + 3] > 30) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return { x0, y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

const backupDir = `${OUT}/hero-sheet-backup`;
mkdirSync(backupDir, { recursive: true });
for (const [m, file] of Object.entries(SHEETS)) {
  const orig = existsSync(`${backupDir}/hero-${m}.png`) ? `${backupDir}/hero-${m}.png` : file;
  if (!existsSync(`${backupDir}/hero-${m}.png`)) copyFileSync(file, `${backupDir}/hero-${m}.png`);
  const meta = await sharp(orig).metadata();
  const fw = Math.floor(meta.width / 4), fh = meta.height;
  if (mode === "split") {
    for (let i = 0; i < 4; i += 1) {
      await sharp(orig).extract({ left: i * fw, top: 0, width: fw, height: fh }).png().toFile(`${OUT}/hero-src-${m}-${i}.png`);
    }
    console.log("split", m, fw, fh);
  } else if (mode === "assemble") {
    const comps = [];
    for (let i = 0; i < 4; i += 1) {
      const cell = await sharp(orig).extract({ left: i * fw, top: 0, width: fw, height: fh }).png().toBuffer();
      const b = await bbox(cell);
      const cands = readdirSync(OUT).filter((f) => f.startsWith(`hero-r3d-${m}-${i}-s`) && f.endsWith(".png")).sort();
      if (!cands.length) throw new Error(`없음: hero-r3d-${m}-${i}`);
      const src = `${OUT}/${cands[0]}`;
      const sb = await bbox(src);
      const cut = await sharp(src).extract({ left: sb.x0, top: sb.y0, width: sb.w, height: sb.h }).png().toBuffer();
      // 원래 그림 상자 높이에 맞추고(발 위치 그대로), 가로는 가운데 정렬
      const scale = b.h / sb.h;
      const rw = Math.round(sb.w * scale), rh = b.h;
      const fitted = await sharp(cut).resize(rw, rh).png().toBuffer();
      const left = Math.round(b.x0 + b.w / 2 - rw / 2);
      comps.push({ input: fitted, left: i * fw + Math.max(0, Math.min(fw - rw, left)), top: b.y0 });
      console.log("frame", m, i, cands[0]);
    }
    await sharp({ create: { width: meta.width, height: meta.height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite(comps).png().toFile(file);
    console.log("assembled", file);
  }
}
