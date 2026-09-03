/**
 * 몬스터 피격·처치 프레임 자동 파생 (계획안 B) — 원화 없이 원본 PNG에서 만든다.
 *
 *   <name>-hit.png     밝기 1.55 · 흰색 tint · 8° 기울임 · 흰 외곽선 (피격 순간)
 *   <name>-defeat.png  회색조 · 균열 마스크로 조각 분해 · 아래로 퍼짐 (붕괴)
 *
 * SpriteArt.MonsterArt가 state("idle"|"hit"|"defeat")에 따라 파일을 고른다.
 * 원화가 오면 같은 파일명으로 덮어쓴다.
 *
 *   node scripts/make-monster-states.mjs
 */
import sharp from "sharp";
import { readdirSync } from "node:fs";

const DIR = "public/titans/generated/monsters";
const SOURCES = readdirSync(DIR).filter((f) => /\.png$/.test(f) && !/-hit\.png$|-defeat\.png$/.test(f));

/** 균열 마스크 — 결정적 선 패턴(랜덤 아님, 재생성해도 같은 결과) */
function crackSvg(w, h) {
  const lines = [];
  const cx = w / 2;
  const cy = h * 0.55;
  for (let i = 0; i < 9; i += 1) {
    const ang = (i / 9) * Math.PI * 2 + 0.3;
    const len = Math.max(w, h) * (0.35 + (i % 3) * 0.12);
    const x2 = cx + Math.cos(ang) * len;
    const y2 = cy + Math.sin(ang) * len;
    const mx = cx + Math.cos(ang + 0.35) * len * 0.5;
    const my = cy + Math.sin(ang + 0.35) * len * 0.5;
    lines.push(`<path d="M${cx} ${cy} Q${mx} ${my} ${x2} ${y2}" stroke="#000" stroke-width="${Math.max(3, w * 0.018)}" fill="none" stroke-linecap="round"/>`);
  }
  // 아래쪽 조각 탈락 — 가로 띠 3개
  for (let j = 0; j < 3; j += 1) {
    const y = h * (0.62 + j * 0.12);
    lines.push(`<rect x="${w * (0.1 + j * 0.15)}" y="${y}" width="${w * 0.22}" height="${h * 0.035}" fill="#000" transform="rotate(${-6 + j * 5} ${w / 2} ${y})"/>`);
  }
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${lines.join("")}</svg>`);
}

for (const file of SOURCES) {
  const src = `${DIR}/${file}`;
  const base = file.replace(/\.png$/, "");
  const meta = await sharp(src).metadata();
  const w = meta.width ?? 512;
  const h = meta.height ?? 512;

  // hit: 밝게 + 흰 tint + 기울임 + 흰 외곽선(원본 알파를 확장한 흰 실루엣 아래 깔기)
  // raw()로 받아야 1채널 원시 버퍼다 — 기본 toBuffer는 PNG 인코딩이라 raw 래핑 시 크기 오류
  const silhouette = await sharp(src).ensureAlpha().extractChannel("alpha").raw().toBuffer();
  const outline = await sharp(silhouette, { raw: { width: w, height: h, channels: 1 } })
    .blur(3)
    .threshold(20)
    .toColourspace("b-w")
    .png()
    .toBuffer();
  const whiteOutline = await sharp({ create: { width: w, height: h, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } } })
    .composite([{ input: outline, blend: "dest-in" }])
    .png()
    .toBuffer();
  const lit = await sharp(src).modulate({ brightness: 1.7, saturation: 0.75 }).png().toBuffer();
  await sharp({ create: { width: w, height: h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: whiteOutline, blend: "over" }, { input: lit, blend: "over" }])
    .rotate(8, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .resize(w, h, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(`${DIR}/${base}-hit.png`);

  // defeat: 회색조 + 균열 마스크(dest-out) + 살짝 납작
  const cracked = await sharp(src).grayscale().modulate({ brightness: 0.85 }).composite([{ input: crackSvg(w, h), blend: "dest-out" }]).png().toBuffer();
  await sharp(cracked)
    .resize(Math.round(w * 1.06), Math.round(h * 0.94), { fit: "fill" })
    .resize(w, h, { fit: "contain", position: "bottom", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(`${DIR}/${base}-defeat.png`);
  console.log(`${base}: hit + defeat`);
}
console.log(`generated ${SOURCES.length * 2} frames → ${DIR}`);
