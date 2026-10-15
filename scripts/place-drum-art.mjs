/**
 * 북 원화 배치 (2026-10-15, 원화 감사 — "그 외에 리소스 어색한 거 다시 찾아줘") — 큐 8(art-gen/queue8.sh) 결과 중 고른 시드를 게임 자리에 앉힌다.
 *   node scripts/place-drum-art.mjs
 *   s02  → public/forge/swords/s02.png  (북 강화 2단계 — 예전 그림은 반투명 북 두 개였다. 256 상자 안에 꽉 맞춤)
 *   스킨 → public/titans/equipment/weapons/premium-weapon-sheet.png (1536×1024, 512 칸 3개 — 진홍·빙하·황금 북.
 *          예전 시트는 칸마다 물건이 여러 개·가장자리 잘림·회색 안개였다. CSS 는 background-size 300% 100% 그대로)
 */
import sharp from "sharp";
import { copyFileSync, existsSync, mkdirSync } from "node:fs";

const OUT = "art-gen/out", BAK = "art-gen/out/drum-tier-backup";
mkdirSync(BAK, { recursive: true });
const PICK = { t2: "prop-drum-t2-s20264701.png", skins: ["prop-drum-crimson-s20264711.png", "prop-drum-glacier-s20264720.png", "prop-drum-solar-s20264731.png"] };

async function trimmed(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let x0 = info.width, x1 = -1, y0 = info.height, y1 = -1;
  for (let y = 0; y < info.height; y += 1) for (let x = 0; x < info.width; x += 1) if (data[(y * info.width + x) * 4 + 3] > 30) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return sharp(file).extract({ left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 }).png().toBuffer();
}

// 강화 2단계 — 다른 단계처럼 256 상자 안에 맞추고 남는 쪽은 잘라 낸 크기 그대로(SwordArt 가 contain 으로 그린다)
await sharp(await trimmed(`${OUT}/${PICK.t2}`)).resize(256, 256, { fit: "inside" }).png().toFile("public/forge/swords/s02.png");
console.log("s02 ←", PICK.t2);

// 상점 외형 시트
const SHEET = "public/titans/equipment/weapons/premium-weapon-sheet.png";
if (!existsSync(`${BAK}/premium-weapon-sheet.png`)) copyFileSync(SHEET, `${BAK}/premium-weapon-sheet.png`);
const comps = [];
for (const [i, f] of PICK.skins.entries()) {
  const fitted = await sharp(await trimmed(`${OUT}/${f}`)).resize(440, 480, { fit: "inside" }).png().toBuffer();
  const m = await sharp(fitted).metadata();
  comps.push({ input: fitted, left: i * 512 + Math.round((512 - m.width) / 2), top: Math.round((1024 - m.height) / 2) });
  console.log("skin", i, "←", f, m.width, m.height);
}
await sharp({ create: { width: 1536, height: 1024, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite(comps).png().toFile(SHEET);
console.log("wrote", SHEET);
