/**
 * 동료·몬스터 애니메이션 프레임 띠 (2026-10-15, 사용자: "캐릭터처럼 애니메이션 … 공격·피격·대기·걷기가 부족한 몬스터·동료 재생성").
 *   node scripts/build-ally-frames.mjs
 * gen.py frames 가 만든 art-gen/out/frame-<id>-<name>.png (자기 대기 IP + 프레임별 자세) 를 한 줄 띠로 이어 붙인다.
 *   동료: public/titans/generated/allies/frames/<id>.webp — 9칸 [대기0, 대기1, 걷기0, 걷기1, 공격0(예비), 공격1, 공격2(타격), 공격3(따라가기), 피격]
 *         칸 비율·인물 크기·발 위치는 지금 아틀라스 칸(313.5×239, 인물 세로 4~87%, 가운데)과 같다 → 대형·겹침 검사가 그대로 맞는다.
 *   몬스터: public/titans/generated/monsters/frames/<art>.webp — 5칸 [대기0(=3D 원화), 대기1, 공격0(예비), 공격1(덤빔), 피격]
 * 한 프레임이라도 없으면 그 동료·몬스터는 띠를 만들지 않는다(게임은 예전 한 장 그림을 쓴다).
 * 끝에 src/titans/frameSets.ts 를 다시 써서 띠가 있는 id 를 게임에 알린다.
 */
import sharp from "sharp";
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";

const OUT = "art-gen/out";
const ALLY_NAMES = ["idle-0", "idle-1", "walk-0", "walk-1", "attack-0", "attack-1", "attack-2", "attack-3", "hit-0"];
const MON_NAMES = ["idle-0", "idle-1", "attack-0", "attack-1", "hit-0"];
const CW = 470, CH = 358;   // 아틀라스 칸 313.5×239 의 1.5배
const MW = 512, MH = 512;

async function trimmed(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let x0 = info.width, x1 = -1, y0 = info.height, y1 = -1;
  for (let y = 0; y < info.height; y += 1) for (let x = 0; x < info.width; x += 1) if (data[(y * info.width + x) * 4 + 3] > 30) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) throw new Error("빈 그림 " + file);
  return sharp(file).extract({ left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 }).png().toBuffer();
}

/** 칸에 앉힌다 — 인물 세로를 top..bottom 비율에, 가로는 maxW 비율 안, 가운데·바닥 맞춤 */
async function cell(file, w, h, top, bottom, maxW) {
  const img = await trimmed(file);
  const m = await sharp(img).metadata();
  const targetH = Math.round(h * (bottom - top));
  const scale = Math.min(targetH / m.height, (w * maxW) / m.width);
  const rw = Math.max(1, Math.round(m.width * scale)), rh = Math.max(1, Math.round(m.height * scale));
  const fitted = await sharp(img).resize(rw, rh).png().toBuffer();
  return { input: fitted, left: Math.round((w - rw) / 2), top: Math.round(h * bottom - rh) };
}

async function strip(files, w, h, top, bottom, maxW, dest) {
  const comps = [];
  for (const [i, f] of files.entries()) { const c = await cell(f, w, h, top, bottom, maxW); comps.push({ ...c, left: c.left + i * w }); }
  await sharp({ create: { width: w * files.length, height: h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite(comps).webp({ quality: 88, alphaQuality: 92 }).toFile(dest);
}

const files = readdirSync(OUT).filter((f) => f.startsWith("frame-") && f.endsWith(".png"));
const ids = [...new Set(files.map((f) => f.replace(/^frame-/, "").replace(/-(idle|walk|attack|hit)-\d\.png$/, "")))];
const allies = [], monsters = [];
mkdirSync("public/titans/generated/allies/frames", { recursive: true });
mkdirSync("public/titans/generated/monsters/frames", { recursive: true });
for (const id of ids) {
  if (id.startsWith("m-")) {
    const art = id.slice(2);
    const idle0 = `${OUT}/monster-r3d-${art}-s20263601.png`;
    const set = MON_NAMES.map((n) => (n === "idle-0" ? idle0 : `${OUT}/frame-${id}-${n}.png`));
    if (!set.every(existsSync)) { console.log("skip monster", art, "(프레임 부족)"); continue; }
    await strip(set, MW, MH, 0.06, 0.99, 0.96, `public/titans/generated/monsters/frames/${art}.webp`);
    monsters.push(art); console.log("monster", art);
  } else {
    const set = ALLY_NAMES.map((n) => `${OUT}/frame-${id}-${n}.png`);
    if (!set.every(existsSync)) { console.log("skip ally", id, "(프레임 부족)", ALLY_NAMES.filter((n, i) => !existsSync(set[i])).join(",")); continue; }
    await strip(set, CW, CH, 0.05, 0.87, 0.6, `public/titans/generated/allies/frames/${id}.webp`);
    allies.push(id); console.log("ally", id);
  }
}
writeFileSync("src/titans/frameSets.ts", `/** 생성 프레임 띠가 있는 동료·몬스터 — scripts/build-ally-frames.mjs 가 쓴다 (손대지 말 것) */
export const ALLY_FRAME_SET: readonly string[] = ${JSON.stringify(allies.sort())};
export const MONSTER_FRAME_SET: readonly string[] = ${JSON.stringify(monsters.sort())};
`);
console.log("allies", allies.length, "monsters", monsters.length);
