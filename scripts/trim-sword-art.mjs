/**
 * 강화 검 원화(public/forge/swords/s00~s15.png) 투명 여백 트림.
 * art-gen prop 출력은 256 높이에 폭 560~740 캔버스라 검 자체는 폭의 8~20%뿐이었다.
 * <img>는 object-fit:contain 이라 폭 기준으로 축소돼 손 안에서 5~7px(실처럼)로 그려졌다 — 폭을 검의 경계 상자 + 여백 8px 로 잘라 높이 기준으로 맞춘다.
 * 이미 트림된 파일(검이 폭의 70% 이상)은 건너뛴다.
 */
import sharp from "sharp";
import { readdirSync } from "node:fs";
const DIR = "public/forge/swords", PAD = 8;
for (const f of readdirSync(DIR).filter((x) => /^s\d\d\.png$/.test(x)).sort()) {
  const p = `${DIR}/${f}`;
  const { data, info } = await sharp(p).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
  let minx = Infinity, maxx = -1;
  for (let y = 0; y < info.height; y += 1) for (let x = 0; x < info.width; x += 1) if (data[(y * info.width + x) * 4 + 3] > 24) { if (x < minx) minx = x; if (x > maxx) maxx = x; }
  const bw = maxx - minx + 1;
  if (bw / info.width >= 0.7) { console.log(f, "skip (already trimmed)", `${info.width}x${info.height}`); continue; }
  const left = Math.max(0, minx - PAD), width = Math.min(info.width - left, bw + PAD * 2);
  const buf = await sharp(p).extract({ left, top: 0, width, height: info.height }).png().toBuffer();
  await sharp(buf).toFile(p);
  console.log(f, `${info.width}x${info.height} → ${width}x${info.height}`);
}
