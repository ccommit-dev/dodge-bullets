/**
 * 몬스터 피격·처치 프레임 자동 파생 (계획안 B) — 원화 없이 원본 PNG에서 만든다.
 *
 *   <name>-hit.png     밝기 1.55 · 흰색 tint · 8° 기울임 · 흰 외곽선 (피격 순간)
 *   <name>-defeat.png  회색조 · 균열 마스크로 조각 분해 · 아래로 퍼짐 (붕괴)
 *
 * SpriteArt.MonsterArt가 state("idle"|"hit"|"defeat")에 따라 파일을 고른다.
 * 원화가 오면 같은 파일명으로 덮어쓴다.
 *
 *   node scripts/make-monster-states.mjs [이름 ...]
 */
import sharp from "sharp";
import { tiltFrame } from "./lib/derive-frame.mjs";
import { readdirSync } from "node:fs";

const DIR = "public/titans/generated/monsters";
import { existsSync, readFileSync } from "node:fs";
/** place-art.mjs boss 로 생성 원화를 넣은 몬스터는 파생하지 않는다 (authored.json) */
const AUTHORED = existsSync(`${DIR}/authored.json`) ? JSON.parse(readFileSync(`${DIR}/authored.json`, "utf8")) : [];
/** 인자로 이름을 주면 그것만 다시 만든다 (예: 보스 원화 고해상도화 뒤 4종만, 2026-10-02) */
const ONLY = process.argv.slice(2);
const SOURCES = readdirSync(DIR).filter((f) => /\.png$/.test(f) && !/-hit\.png$|-defeat\.png$|-attack\.png$/.test(f) && !AUTHORED.includes(f.replace(/\.png$/, "")))
  .filter((f) => ONLY.length === 0 || ONLY.includes(f.slice(0, -4)));

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

/** 회전으로 커진 캔버스를 원래 w×h 로 되돌린다 — contain 축소가 아니라 가운데·아래 기준 잘라내기(크기가 줄어 "공격할 때 작아짐"이 보였다, 2026-10-13) */
async function fitBack(buf, w, h) {
  const m = await sharp(buf).metadata();
  const padded = (m.width < w || m.height < h) ? await sharp(buf).extend({ left: Math.max(0, Math.ceil((w - m.width) / 2)), right: Math.max(0, Math.ceil((w - m.width) / 2)), top: Math.max(0, h - m.height), bottom: 0, background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer() : buf;
  const pm = await sharp(padded).metadata();
  return sharp(padded).extract({ left: Math.floor((pm.width - w) / 2), top: pm.height - h, width: w, height: h }).png().toBuffer();
}

for (const file of SOURCES) {
  const src = `${DIR}/${file}`;
  const base = file.replace(/\.png$/, "");
  const meta = await sharp(src).metadata();
  const w = meta.width ?? 512;
  const h = meta.height ?? 512;

  // hit: 픽셀 단위로 흰색 쪽으로 28% 보간 (알파 유지), 기울임 없음 — 45%+밝기 1.15+6° 는 흰 유령이 옆으로 튀어나온 것처럼 보였다 (2026-09-11 프레임 시트).
  // 예전 "블러 실루엣 외곽선" 방식은 raw 버퍼 해석이 어긋나 줄무늬 흰 구름이 몸 뒤에 깔렸다 (감사 시트에서 발견).
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    for (let c = 0; c < 3; c += 1) data[i + c] = Math.min(255, Math.round(data[i + c] * 0.72 + 255 * 0.28));
  }
  // 2026-10-13 (사용자: "몬스터 피격 애니메이션 어색"): 흰 보간만으로는 "맞았다"가 안 읽혔다 → 뒤(오른쪽)로 8° 젖히고 가로 .95 로 눌러(contain: 원화가 프레임을 꽉 채워 잘라내기는 머리·날개가 잘린다) 반동을 더한다 (왼쪽을 보는 원본 기준; 반전 몬스터는 CSS 가 통째로 뒤집어 방향이 맞다)
  const hitBuf = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
  // 2026-10-13 보완: contain 통째 축소 대신 bbox 기준(derive-frame.tiltFrame) — 넘칠 때만 그만큼 줄여 돌진·반동 때 몸 크기가 유지된다
  await sharp((await tiltFrame(hitBuf, { rot: 8, sx: 0.95 })).buffer).toFile(`${DIR}/${base}-hit.png`);
  // attack (2026-10-13): 앞(왼쪽)으로 8° 숙이고 가로 1.06 으로 늘린 돌진 — SpriteArt 가 action-attack 동안 -attack.png 를 쓴다
  await sharp((await tiltFrame(src, { rot: -10, sx: 1.08, sy: 0.98 })).buffer).toFile(`${DIR}/${base}-attack.png`);
  // 포즈 img2img 결과(gen.py states → art-gen/out/st-<name>-attack/hit.png)가 있으면 그것을 원본 크기 틀에 맞춰 덮어쓴다 (2026-10-13 보완)
  for (const st of ["attack", "hit"]) { const posed = `art-gen/out/st-${base}-${st}.png`; if (existsSync(posed)) { await sharp(posed).resize(w, h, { fit: "contain", position: "bottom", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(`${DIR}/${base}-${st}.png`); console.log(`${base}: posed ${st}`); } }

  // defeat: 회색조 + 균열 마스크(dest-out) + 살짝 납작
  const cracked = await sharp(src).grayscale().modulate({ brightness: 0.85 }).composite([{ input: crackSvg(w, h), blend: "dest-out" }]).png().toBuffer();
  await sharp(cracked)
    .resize(Math.round(w * 1.06), Math.round(h * 0.94), { fit: "fill" })
    .resize(w, h, { fit: "contain", position: "bottom", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(`${DIR}/${base}-defeat.png`);
  console.log(`${base}: hit + attack + defeat`);
}
console.log(`generated ${SOURCES.length * 3} frames → ${DIR}`);
