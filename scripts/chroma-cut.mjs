/**
 * 크로마 키 컷아웃 (2026-10-07) — pixcel-studio(NX Pixel, D:/aiContext/pixcel-studio) 엔진의 `removeChromaBackground` 로
 * 단색 마젠타/초록 배경 위에 생성한 그림을 알파로 바꾼다. rembg(isnet) 가 남기던 반투명 테두리·배경 조각 대신,
 * 키 거리로 분류하고 테두리는 소프트 언믹스(안티앨리어싱 픽셀을 디스필 RGB + 부분 알파로)한다.
 *
 *   node scripts/chroma-cut.mjs <in.png> <out.png> [magenta|green|auto]
 * 출력: {"key":..., "residue":키 잔여 비율, "subject":피사체 알파 비율} JSON 한 줄. gen.py 가 ARTGEN_CHROMA 일 때 부른다.
 */
import sharp from "sharp";
import { removeChromaBackground, CHROMA_KEYS, keyResidueFractionYcc } from "file:///D:/aiContext/pixcel-studio/src/core/chroma.js";
import { detectKeyFromBorder } from "file:///D:/aiContext/pixcel-studio/src/core/stripcheck.js";

const [src, dst, keyArg = "magenta"] = process.argv.slice(2);
if (!src || !dst) { console.error("usage: chroma-cut.mjs <in.png> <out.png> [magenta|green|auto]"); process.exit(2); }

const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const pix = { width: info.width, height: info.height, data: new Uint8ClampedArray(data.buffer, data.byteOffset, data.length) };

let key;
if (keyArg === "auto") {
  const det = detectKeyFromBorder(pix, null);
  key = det?.rgb ?? CHROMA_KEYS.magenta.rgb;
} else {
  key = (CHROMA_KEYS[keyArg] ?? CHROMA_KEYS.magenta).rgb;
}
// 테두리 링이 정말 키 색인지 — 아니면 모델이 배경 지시를 무시한 것. 조용히 넘기지 않고 알린다(No Silent Fallback)
const border = detectKeyFromBorder(pix, key, { acceptDistance: 60, minShare: 0.5 });
const out = removeChromaBackground(pix, key);
let subject = 0;
for (let i = 3; i < out.data.length; i += 4) if (out.data[i] >= 128) subject += 1;
const residue = keyResidueFractionYcc(out, key);
await sharp(Buffer.from(out.data.buffer, out.data.byteOffset, out.data.length), { raw: { width: out.width, height: out.height, channels: 4 } }).png().toFile(dst);
console.log(JSON.stringify({ key, borderIsKey: !!border, residue: Number(residue.toFixed(4)), subject: Number((subject / (out.width * out.height)).toFixed(4)) }));
