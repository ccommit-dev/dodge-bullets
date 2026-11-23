/**
 * 아래 내비 · 콘텐츠 아이콘 2판 (2026-11-23, 사용자: "외에 아쉬운점 리소스 마저 수정")
 *   blender -b -P art-gen/blender/relic_icons.py -- nav   (ART_STYLE=toon · 유물 3판과 같은 셀 설정, RELIC_OUT 으로 따로)
 *   NAV_SRC=<렌더 폴더> node scripts/assemble-nav-icons.mjs [--out=폴더]
 * public/ui/content-icons/content-sprite-v1.png — 4×2 칸(App.css .content-icon-* 위치 그대로):
 *   윗줄 사냥터 · 성문 방어 · 비트 · 대장간 / 아랫줄 내 정보 · 출석 · 모험(event) · 설정
 * 낱장 nav-ally · nav-shop · nav-settings(128²). 비버가 든 칸은 게임 셀 원화에서 잘라 쓴다 — 예전 아이콘의 비버 얼굴이 정을 붙였다:
 *   내 정보 = 주인공 초상(hero-portrait), 동료 = 미아 · 레온 대기 첫 칸 둘. 모두 스티커 외곽선(lib/sticker).
 */
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { sticker } from "./lib/sticker.mjs";

const SRC = process.env.NAV_SRC ?? "art-gen/out/b3d-relics";
const DST = process.argv.find((a) => a.startsWith("--out="))?.slice(6) ?? "public/ui/content-icons";
mkdirSync(DST, { recursive: true });
const EMPTY = { r: 0, g: 0, b: 0, alpha: 0 };
const fitSquare = async (buf, W, pad = 0.06) => {
  const trimmed = await sharp(buf).trim({ threshold: 1 }).png().toBuffer();
  const inner = Math.round(W * (1 - 2 * pad));
  const fit = await sharp(trimmed).resize(inner, inner, { fit: "contain", background: EMPTY }).png().toBuffer();
  return sharp({ create: { width: W, height: W, channels: 4, background: EMPTY } }).composite([{ input: fit, gravity: "center" }]).png().toBuffer();
};
const icon = async (buf, W, width) => sticker(await fitSquare(buf, W), { width });
const render = (n) => `${SRC}/nav-${n}.png`;
// 대기 시트 첫 칸(8×4 칸) — extract 와 trim 은 한 파이프에 두지 않는다
const allyCell = async (id) => {
  const f = `public/titans/anim/allies/${id}.webp`, m = await sharp(f).metadata();
  const cell = await sharp(f).extract({ left: 0, top: 0, width: Math.floor(m.width / 8), height: Math.floor(m.height / 4) }).png().toBuffer();
  return sharp(cell).trim({ threshold: 1 }).png().toBuffer();
};
const portrait = await sharp("public/titans/anim/hero/hero-portrait.webp").png().toBuffer();
// 동료 = 전신 둘을 반쯤 겹쳐(뒤 레온은 조금 작게) — 나란히 · 상반신이면 2:1 로 넓어 칸에서 반 크기로 줄었다
const [a, b] = [await allyCell("mia"), await allyCell("leon")];
const H = 300;
const ra = await sharp(a).resize({ height: H }).png().toBuffer(), rb = await sharp(b).resize({ height: Math.round(H * 0.9) }).png().toBuffer();
const [ma, mb] = [await sharp(ra).metadata(), await sharp(rb).metadata()];
const pairW = Math.round(ma.width * 0.5 + mb.width);
const pair = await sharp({ create: { width: pairW, height: H, channels: 4, background: EMPTY } })
  .composite([{ input: rb, left: pairW - mb.width, top: H - mb.height }, { input: ra, left: 0, top: 0 }]).png().toBuffer();

// 스프라이트 4×2 (칸 222px — 표시 30~46px, 3배 화면에도 여유)
const C = 222;
const cells = [render("hunt"), render("dodge"), render("beat"), render("forge"), portrait, render("attendance"), render("event"), render("settings")];
const comp = [];
for (let i = 0; i < cells.length; i += 1) comp.push({ input: await icon(cells[i], C, 7), left: (i % 4) * C, top: Math.floor(i / 4) * C });
await sharp({ create: { width: C * 4, height: C * 2, channels: 4, background: EMPTY } }).composite(comp).png({ palette: true, quality: 92, compressionLevel: 9 }).toFile(`${DST}/content-sprite-v1.png`);
console.log("sprite", `${DST}/content-sprite-v1.png`);
for (const [name, src] of [["nav-ally", pair], ["nav-shop", render("shop")], ["nav-settings", render("settings")]]) {
  await sharp(await icon(src, 128, 4)).png({ palette: true, quality: 92, compressionLevel: 9 }).toFile(`${DST}/${name}.png`);
  console.log(name);
}
