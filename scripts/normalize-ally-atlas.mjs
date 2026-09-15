/**
 * 동료 아틀라스 프레임 정규화 — 4프레임(대기·이동·공격·피격)이 같은 바닥에 같은 키로 서게 맞춘다.
 *
 * 원화를 포즈마다 따로 생성한 탓에 프레임끼리 인물 크기·발 높이·좌우 위치가 제각각이었다 (2026-09-15 실측):
 *   · 발 높이 최대 26px 차이 → 공격·피격 때 캐릭터가 공중에 뜬다
 *   · 가로 중심 최대 60px 차이 → 프레임이 바뀔 때 옆으로 순간이동한다 (그것도 적 반대쪽으로)
 *   · 이동 프레임 키가 대기 대비 0.87~1.16 → 걸을 때 캐릭터가 커졌다 작아졌다 한다
 *
 * 규칙 (프레임 0 = 대기 = 기준, 건드리지 않는다):
 *   1) 발 높이: 전 프레임을 프레임 0 에 맞춘다. 피격(3)만 LIFT_HIT 만큼 살짝 띄운다.
 *   2) 가로 중심: 이동(1)은 대기와 같게, 공격(2)은 적 쪽(오른쪽)으로 +LUNGE, 피격(3)은 −RECOIL.
 *   3) 키: 이동(1)만 대기와 같은 키로 맞춘다 (서 있는 자세끼리는 같아야 한다). 공격·피격은 포즈 높이를 존중한다.
 *
 * 사용: node scripts/normalize-ally-atlas.mjs [--dry]
 */
import sharp from "sharp";
import { readdirSync } from "node:fs";

const DIR = "public/titans/generated/allies";
const CELL_H = 239;
const COLS = 4;
const ALPHA = 24;
/** 피격 프레임을 띄우는 양(px, 239 셀 기준) — 완전히 붙이면 타격감이 죽고, 지금처럼 26px 뜨면 공중부양이다 */
const LIFT_HIT = 5;
/** 공격은 적(오른쪽)으로 내딛고, 피격은 뒤로 밀린다 */
const LUNGE_ATTACK = 10;
const RECOIL_HIT = 10;

function bbox(data, info, left, right, top, bottom) {
  let minx = Infinity, maxx = -1, miny = Infinity, maxy = -1;
  for (let y = top; y < bottom; y += 1) {
    for (let x = left; x < right; x += 1) {
      if (data[(y * info.width + x) * 4 + 3] > ALPHA) {
        if (x < minx) minx = x;
        if (x > maxx) maxx = x;
        if (y < miny) miny = y;
        if (y > maxy) maxy = y;
      }
    }
  }
  return maxx < 0 ? null : { minx, maxx, miny, maxy, w: maxx - minx + 1, h: maxy - miny + 1, cx: (minx + maxx) / 2 };
}

const dry = process.argv.includes("--dry");
const files = readdirSync(DIR).filter((f) => /^ally-(animation|variant|skin)-atlas-v1\.png$/.test(f));
let changed = 0;

for (const file of files) {
  const p = `${DIR}/${file}`;
  const meta = await sharp(p).metadata();
  const cw = meta.width / COLS;
  const rows = Math.round(meta.height / CELL_H);
  if (Math.abs(rows * CELL_H - meta.height) > 1) { console.log(`${file}: 셀 높이 ${CELL_H} 배수가 아님 (${meta.height}) — 건너뜀`); continue; }
  const { data, info } = await sharp(p).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
  const patches = [];
  for (let r = 0; r < rows; r += 1) {
    const top = r * CELL_H, bot = (r + 1) * CELL_H;
    const cells = [];
    for (let c = 0; c < COLS; c += 1) cells.push(bbox(data, info, Math.floor(c * cw), Math.floor((c + 1) * cw), top, bot));
    if (cells.some((b) => !b)) { console.log(`${file} row ${r}: 빈 프레임 — 건너뜀`); continue; }
    const ref = cells[0];
    for (let c = 1; c < COLS; c += 1) {
      const L = Math.floor(c * cw), Rr = Math.floor((c + 1) * cw), cellW = Rr - L;
      const b = cells[c];
      // 1) 이동 프레임만 대기와 같은 키로
      const scale = c === 1 ? ref.h / b.h : 1;
      const newW = Math.max(1, Math.round(b.w * scale));
      const newH = Math.max(1, Math.round(b.h * scale));
      // 2) 목표 위치
      const targetBottom = ref.maxy - (c === 3 ? LIFT_HIT : 0);
      // 기준(프레임 0)의 중심은 0번 칸 기준이라 칸 안 좌표로 그대로 쓴다 — 현재 칸의 left 를 빼면 안 된다
      const targetCx = ref.cx + (c === 2 ? LUNGE_ATTACK : c === 3 ? -RECOIL_HIT : 0);
      let destLeft = Math.round(targetCx - newW / 2);
      let destTop = Math.round((targetBottom - top) - newH + 1);
      // 셀 안에 들어오게 clamp
      destLeft = Math.max(0, Math.min(cellW - newW, destLeft));
      destTop = Math.max(0, Math.min(CELL_H - newH, destTop));
      const dx = destLeft - (b.minx - L), dy = destTop - (b.miny - top);
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1 && Math.abs(scale - 1) < 0.01) continue;
      const fig = await sharp(p).extract({ left: b.minx, top: b.miny, width: b.w, height: b.h }).toBuffer();
      const scaled = scale === 1 ? fig : await sharp(fig).resize(newW, newH, { fit: "fill" }).toBuffer();
      // 셀을 비우고 인물만 새 위치에 얹는다
      const blank = await sharp({ create: { width: cellW, height: CELL_H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
        .composite([{ input: scaled, left: destLeft, top: destTop }]).png().toBuffer();
      patches.push({ input: blank, left: L, top });
      changed += 1;
      console.log(`${file} row ${r} frame ${c}: dx ${dx > 0 ? "+" : ""}${dx} dy ${dy > 0 ? "+" : ""}${dy} scale ${scale.toFixed(3)}`);
    }
  }
  if (!patches.length) { console.log(`${file}: 변경 없음`); continue; }
  if (dry) continue;
  // 바뀐 칸은 통째로 대체한다 — dest-out 으로 그 칸을 지우고(원래 인물이 남으면 잔상이 된다) 새 칸을 얹는다
  const erase = [];
  for (const q of patches) {
    const w = await sharp(q.input).metadata();
    erase.push({ input: await sharp({ create: { width: w.width, height: w.height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } } }).png().toBuffer(), left: q.left, top: q.top, blend: "dest-out" });
  }
  const erased = await sharp(p).ensureAlpha().composite(erase).png().toBuffer();
  const out = await sharp(erased).composite(patches.map((q) => ({ input: q.input, left: q.left, top: q.top }))).png().toBuffer();
  await sharp(out).toFile(p);
  console.log(`${file}: ${patches.length}칸 정규화`);
}
console.log(dry ? `\n(dry) ${changed}칸이 바뀔 예정` : `\n${changed}칸 정규화 완료`);
