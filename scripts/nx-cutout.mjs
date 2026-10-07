/**
 * 흰 배경 생성물 컷아웃 (2026-10-07) — pixcel-studio(NX Pixel, D:/aiContext/pixcel-studio) 의 `cutout()` 위치 기반 매트.
 * 모서리에서 연결된 배경만 플러드필로 표시하고(피사체 안의 밝은 하이라이트는 건드리지 않음), 테두리 띠는
 * F = (P − (1−a)·B) / a 로 오염을 제거한 소프트 알파 + 소프트 침식. rembg(isnet) 의 반투명 띠·배경 조각 대안.
 *
 *   node scripts/nx-cutout.mjs <in.png> <out.png> [strength=45] [band=6] [erode=1]
 * 출력: stats JSON 한 줄. gen.py 가 ARTGEN_CUT=nx 일 때 부른다.
 */
import sharp from "sharp";
import { cutout } from "file:///D:/aiContext/pixcel-studio/src/core/cutout.js";

const [src, dst, strengthArg, bandArg, erodeArg, toleranceArg] = process.argv.slice(2);
if (!src || !dst) { console.error("usage: nx-cutout.mjs <in.png> <out.png> [strength] [band] [erode]"); process.exit(2); }
const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const pix = { width: info.width, height: info.height, data: new Uint8ClampedArray(data.buffer, data.byteOffset, data.length) };
const opts = { key: "auto" };
if (strengthArg) opts.strength = Number(strengthArg);
if (bandArg) opts.band = Number(bandArg);
if (erodeArg) opts.erode = Number(erodeArg);
if (toleranceArg) opts.tolerance = Number(toleranceArg);
const { pix: out, stats } = cutout(pix, opts);
await sharp(Buffer.from(out.data.buffer, out.data.byteOffset, out.data.length), { raw: { width: out.width, height: out.height, channels: 4 } }).png().toFile(dst);
console.log(JSON.stringify(stats));
