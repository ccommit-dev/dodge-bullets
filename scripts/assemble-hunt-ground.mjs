/**
 * 사냥터 바닥 조립 (2026-11-19, 리소스 피드백 ② "사냥터 바닥이 단색이다")
 *   ART_STYLE=toon blender -b -P art-gen/blender/hunt_ground.py -- all   → art-gen/out/b3d-ground/<지역>.png
 *   node scripts/assemble-hunt-ground.mjs
 * → public/titans/backgrounds/ground-<지역>.webp (셀) · public/titans/backgrounds-px/ground-<지역>.webp (도트: ¼ 로 줄여 색 24 — style-backgrounds 와 같은 규칙)
 * 위 가장자리 평균색을 찍는다 — CSS(.titans-ground::before) 의 이음선 녹임 색(--ground-edge)으로 쓴다.
 */
import sharp from "sharp";
import { mkdirSync } from "node:fs";
const SRC = "art-gen/out/b3d-ground", PUB = "public/titans/backgrounds", PX = "public/titans/backgrounds-px";
const AREAS = ["meadow", "forest", "ruins", "volcano", "abyss"], PX_DOWN = 4, PX_COLORS = 24;
mkdirSync(PX, { recursive: true });
const hex = (r, g, b) => "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
for (const a of AREAS) {
  const src = `${SRC}/${a}.png`;
  const meta = await sharp(src).metadata();
  const rgb = await sharp(src).removeAlpha().png().toBuffer();
  await sharp(rgb).webp({ quality: 84, effort: 6 }).toFile(`${PUB}/ground-${a}.webp`);
  // 도트 — ¼ 로 줄여 팔레트 색(디더 없음)
  const sw = Math.round(meta.width / PX_DOWN), sh = Math.round(meta.height / PX_DOWN);
  const small = await sharp(rgb).resize(sw, sh, { kernel: "cubic" }).png({ palette: true, colors: PX_COLORS, dither: 0, effort: 10 }).toBuffer();
  await sharp(small).webp({ lossless: true, effort: 5 }).toFile(`${PX}/ground-${a}.webp`);
  // 위 가장자리 평균색(위 3%) — stats() 는 파이프라인을 무시하고 원본을 재니 잘라 낸 버퍼로 잰다
  const topBuf = await sharp(rgb).extract({ left: 0, top: 0, width: meta.width, height: Math.round(meta.height * 0.03) }).png().toBuffer();
  const [r, g, b] = (await sharp(topBuf).stats()).channels.map((c) => c.mean);
  console.log(a, `${meta.width}×${meta.height}`, "→ 도트", `${sw}×${sh}`, "가장자리", hex(r, g, b));
}
