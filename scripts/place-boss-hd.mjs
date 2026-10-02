/**
 * 고해상도 보스 원화 배치 (2026-10-02) — art-gen/upscale_boss.py 가 만든 1024px 후보를 public 몬스터 폴더로 옮긴다.
 *
 * img2img 는 흰 배경 위에서 그려서 실루엣 바로 안쪽에 흰 번짐(밝은 테두리)이 생긴다. 알파를 EDGE px 깎은 안쪽만
 * 새 그림을 쓰고, 그 바깥 띠는 원본을 1024 로 키운 색을 쓴다(알파는 원본 그대로 — 실루엣·여백표 불변).
 *
 *   node scripts/place-boss-hd.mjs moss-golem-clean=20261003 wolf-king-clean=20261002 flame-wyvern-clean=20261003 abyss-titan=20261004
 *   (2026-10-02 에 고른 시드 — 눈빛·얼굴이 원본에 가장 가까운 것)
 * 그 뒤: node scripts/make-monster-states.mjs <이름 ...>   (피격·처치 프레임 다시 파생)
 * 끝으로: node scripts/place-boss-hd.mjs --compress <이름 ...> (기본·피격·처치 3장을 256색 팔레트 PNG 로 — 16.3MB → 4.2MB, 눈으로 구분 안 됨)
 */
import sharp from "sharp";
import { writeFileSync } from "node:fs";

const DIR = "public/titans/generated/monsters";
const EDGE = 4;

async function place(name, seed) {
  const src = `${DIR}/${name}.png`;
  // 가장자리 색·알파의 기준은 512px 원본이다 — 이미 바꾼 1024 파일에 다시 돌리면 번짐 보정이 새 그림 기준이 된다
  const w0 = (await sharp(src).metadata()).width;
  if (w0 !== 512) throw new Error(`${src} 는 ${w0}px — 512 원본에만 돌린다 (git checkout 으로 되돌린 뒤 다시)`);
  const big =await sharp(src).resize(1024, 1024, { kernel: "lanczos3" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const hd = await sharp(`art-gen/out/boss-hd/${name}-s${seed}.png`).ensureAlpha().raw().toBuffer();
  const W = big.info.width, H = big.info.height, o = big.data;
  // 알파 침식(EDGE px) — 상자 최소 필터를 가로·세로로
  const a = new Uint8Array(W * H); for (let i = 0; i < W * H; i += 1) a[i] = o[i * 4 + 3];
  const erode = (inp, horiz) => {
    const out = new Uint8Array(W * H);
    for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) {
      let m = 255;
      for (let d = -EDGE; d <= EDGE && m > 0; d += 1) {
        const xx = horiz ? x + d : x, yy = horiz ? y : y + d;
        m = xx < 0 || yy < 0 || xx >= W || yy >= H ? 0 : Math.min(m, inp[yy * W + xx]);
      }
      out[y * W + x] = m;
    }
    return out;
  };
  const inner = erode(erode(a, true), false);
  const res = Buffer.alloc(W * H * 4);
  for (let i = 0; i < W * H; i += 1) {
    const k = inner[i] / 255;   // 1 = 새 그림, 0 = 원본 색
    for (let c = 0; c < 3; c += 1) res[i * 4 + c] = Math.round(hd[i * 4 + c] * k + o[i * 4 + c] * (1 - k));
    res[i * 4 + 3] = o[i * 4 + 3];
  }
  await sharp(res, { raw: { width: W, height: H, channels: 4 } }).png({ compressionLevel: 9 }).toFile(src);
  console.log("placed", src, `← s${seed}`);
}

async function compress(name) {
  for (const suf of ["", "-hit", "-defeat"]) {
    const f = `${DIR}/${name}${suf}.png`;
    const out = await sharp(f).png({ palette: true, quality: 92, colours: 256, dither: 0.8, effort: 10, compressionLevel: 9 }).toBuffer();
    writeFileSync(f, out);
    console.log("compressed", f, `${(out.length / 1e6).toFixed(2)}MB`);
  }
}

const args = process.argv.slice(2);
if (args.length === 0) { console.error("사용: node scripts/place-boss-hd.mjs <이름>=<시드> ... | --compress <이름> ..."); process.exit(1); }
if (args[0] === "--compress") for (const name of args.slice(1)) await compress(name);
else for (const arg of args) { const [name, seed] = arg.split("="); await place(name, seed); }
