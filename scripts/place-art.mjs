/**
 * 생성 원화 배치 — art-gen/out/ 의 컷아웃을 기존 교체 경로에 같은 파일명으로 꽂는다.
 *
 *   node scripts/place-art.mjs char <id>        char-<id>-{idle,run,attack,hit}.png → allies/authored/<id>-row.png (4열 가로 셀 행)
 *                                               + allies/<id>.png (개별 썸네일 362×724). 그 뒤 make-variant-atlas.mjs 가 authored 행을 우선 사용
 *   node scripts/place-art.mjs hero             hero-{idle,attack}-{0..3}.png → character/base/hero-idle.png · hero-attack.png (프레임 크기 유지)
 *   node scripts/place-art.mjs costume <id>     costume-<id>-{idle,attack}-{0..3}.png → character/skins/hero-<mode>-<id>.png
 *   node scripts/place-art.mjs boss <stem>      boss-<stem>-{hit,defeat}.png → monsters/<stem>-hit.png · -defeat.png + authored.json 등록
 *   node scripts/place-art.mjs cover <id>       cover-<id>.png → beat/covers/<id>.png (256²)
 *
 * 배치 규칙 (플레이 검증 후 확정):
 *   - 본체만 남긴다: 알파 연결 성분 중 가장 큰 것(본체)과 그 bbox에 닿는 성분만 유지 — 떠 있는 방패·검 파편은 버린다.
 *     (파편이 bbox를 키워 상태마다 본체 크기가 튀던 원인)
 *   - 4상태를 같은 배율로 맞춘다: 셀 높이 96%를 가장 큰 상태에 맞추고 나머지는 같은 배율 → 상태 전환에 크기 팝 없음
 *   - 가로는 알파 무게중심을 셀 중앙에, 세로는 바닥 정렬 → 발 위치가 고정되어 전환 시 좌우 흔들림이 준다
 *   - 영웅·코스튬 idle 은 0번 프레임을 4칸에 복제 — 프레임마다 다른 그림이 240ms로 돌면 깜빡임(보일링)이 난다
 */
import sharp from "sharp";
import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from "node:fs";

const OUT = "art-gen/out";
const ALLIES = "public/titans/generated/allies";
const CELL_W = 313, CELL_H = 209;
const [cmd, id] = process.argv.slice(2);

/** 알파 연결 성분 필터 — 본체(최대 성분)와 그 bbox(여유 4%)에 닿는 성분만 남긴 RGBA 버퍼 */
async function bodyOnly(file) {
  const img = sharp(file).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, C = info.channels;
  // 4배 축소 마스크에서 성분 탐색 (1024² → 256²)
  const S = 4, w = Math.ceil(W / S), h = Math.ceil(H / S);
  const mask = new Uint8Array(w * h);
  for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) if (data[(y * W + x) * C + 3] > 24) mask[Math.floor(y / S) * w + Math.floor(x / S)] = 1;
  const label = new Int32Array(w * h).fill(-1);
  const comps = [];
  const stack = [];
  for (let i = 0; i < w * h; i += 1) {
    if (!mask[i] || label[i] >= 0) continue;
    const cid = comps.length;
    const comp = { area: 0, x0: w, y0: h, x1: 0, y1: 0 };
    stack.push(i); label[i] = cid;
    while (stack.length) {
      const p = stack.pop(); const px = p % w, py = (p - px) / w;
      comp.area += 1; if (px < comp.x0) comp.x0 = px; if (px > comp.x1) comp.x1 = px; if (py < comp.y0) comp.y0 = py; if (py > comp.y1) comp.y1 = py;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = px + dx, ny = py + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const q = ny * w + nx; if (mask[q] && label[q] < 0) { label[q] = cid; stack.push(q); }
      }
    }
    comps.push(comp);
  }
  if (comps.length === 0) return { data, info };
  const main = comps.reduce((a, b) => (b.area > a.area ? b : a));
  const pad = Math.round(Math.max(w, h) * 0.04);
  const keep = new Set(comps.map((c, i) => [c, i]).filter(([c, i]) => i === comps.indexOf(main) || (c.x1 >= main.x0 - pad && c.x0 <= main.x1 + pad && c.y1 >= main.y0 - pad && c.y0 <= main.y1 + pad && c.area >= main.area * 0.02)).map(([, i]) => i));
  let dropped = 0;
  for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) {
    const l = label[Math.floor(y / S) * w + Math.floor(x / S)];
    if (l >= 0 && !keep.has(l)) { data[(y * W + x) * C + 3] = 0; dropped += 1; }
  }
  return { data, info, dropped, comps: comps.length, kept: keep.size };
}

/** 본체만 남긴 트림 이미지 + 알파 무게중심 x(트림 기준, 0~1) */
async function bodyTrimmed(file) {
  const { data, info, dropped = 0, comps = 1, kept = 1 } = await bodyOnly(file);
  const buf = await sharp(data, { raw: { width: info.width, height: info.height, channels: info.channels } }).png().toBuffer();
  const t = sharp(await sharp(buf).trim({ threshold: 8 }).png().toBuffer());
  const m = await t.metadata();
  const { data: td } = await t.clone().ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let sx = 0, n = 0;
  for (let y = 0; y < m.height; y += 1) for (let x = 0; x < m.width; x += 1) { const a = td[(y * m.width + x) * 4 + 3]; if (a > 24) { sx += x; n += 1; } }
  return { img: t, w: m.width, h: m.height, cx: n ? sx / n / m.width : 0.5, dropped, comps, kept };
}

/** 트림된 본체를 w×h 셀에 배치 — 배율 scale, 무게중심을 셀 중앙에, 바닥 정렬 */
async function placeInCell(body, w, h, scale) {
  const tw = Math.max(1, Math.round(body.w * scale)), th = Math.max(1, Math.round(body.h * scale));
  const buf = await body.img.resize(tw, th).png().toBuffer();
  const left = Math.round(w / 2 - body.cx * tw);
  return sharp({ create: { width: w, height: h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: buf, left: Math.max(-tw + 1, Math.min(w - 1, left)), top: h - th }]).png().toBuffer();
}

/** 여러 상태를 같은 배율로: 가장 큰 상태가 셀 높이 fill 을 채우고, 폭 상한 90% */
function uniformScale(bodies, w, h, fill) {
  let scale = Infinity;
  for (const b of bodies) scale = Math.min(scale, (h * fill) / b.h, (w * 0.9) / b.w);
  return scale;
}

async function placeChar() {
  mkdirSync(`${ALLIES}/authored`, { recursive: true });
  const states = ["idle", "run", "attack", "hit"];
  const bodies = [];
  for (const s of states) bodies.push(await bodyTrimmed(`${OUT}/char-${id}-${s}.png`));
  // 균일 배율을 기준으로, 작게 나온 상태(이동 포즈가 15~20% 작게 생성됨)는 최대 15%까지만 키운다 —
  // 완전 균일이면 이동 상태가 쪼그라들고, 상태별 꽉 채우기면 부속물(방패·검)이 붙은 상태의 본체가 작아진다. 그 중간값
  const uniform = uniformScale(bodies, CELL_W, CELL_H, 0.96);
  const cells = [];
  for (const [i, b] of bodies.entries()) {
    const fit = Math.min((CELL_H * 0.96) / b.h, (CELL_W * 0.9) / b.w);
    cells.push({ input: await placeInCell(b, CELL_W, CELL_H, Math.min(fit, uniform * 1.15)), left: i * CELL_W, top: 0 });
  }
  const row = `${ALLIES}/authored/${id}-row.png`;
  await sharp({ create: { width: 1254, height: CELL_H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite(cells).png().toFile(row);
  const idle = bodies[0];
  await sharp(await placeInCell(idle, 362, 724, Math.min((724 * 0.98) / idle.h, (362 * 0.9) / idle.w))).toFile(`${ALLIES}/${id}.png`);
  console.log("placed", row, `+ ${ALLIES}/${id}.png`, "| 파편 제거:", bodies.map((b, i) => `${states[i]} ${b.comps}→${b.kept}`).join(", "));
}

/** 영웅/코스튬 시트 — idle 은 0번 프레임 복제, attack 은 4프레임 같은 배율 */
async function buildHeroSheet(prefix, mode, outFile) {
  const base = `public/titans/character/base/hero-${mode}.png`;
  const m = await sharp(base).metadata();
  const fw = Math.floor(m.width / 4);
  const files = mode === "idle" ? [0, 0, 0, 0] : [0, 1, 2, 3];
  const bodies = [];
  for (const i of files) bodies.push(await bodyTrimmed(`${OUT}/${prefix}-${mode}-${i}.png`));
  const scale = uniformScale(bodies, fw, m.height, 0.97);
  const cells = [];
  for (const [i, b] of bodies.entries()) cells.push({ input: await placeInCell(b, fw, m.height, scale), left: i * fw, top: 0 });
  await sharp({ create: { width: fw * 4, height: m.height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite(cells).png().toFile(outFile + ".tmp");
  renameSync(outFile + ".tmp", outFile);
  console.log("placed", outFile, mode === "idle" ? "(idle 0번 프레임 ×4)" : "");
}

async function placeHero() {
  for (const mode of ["idle", "attack"]) await buildHeroSheet("hero", mode, `public/titans/character/base/hero-${mode}.png`);
}

async function placeCostume() {
  for (const mode of ["idle", "attack"]) await buildHeroSheet(`costume-${id}`, mode, `public/titans/character/skins/hero-${mode}-${id}.png`);
  const manifest = "public/titans/character/skins/authored.json";
  const list = existsSync(manifest) ? JSON.parse(readFileSync(manifest, "utf8")) : [];
  if (!list.includes(id)) list.push(id);
  writeFileSync(manifest, JSON.stringify(list, null, 2) + "\n");
  console.log("authored.json 등록 —", id, "(make-character-skins 가 건너뜀)");
}

async function placeBoss() {
  const dir = "public/titans/generated/monsters";
  const src = `${dir}/${id}.png`;
  const m = await sharp(src).metadata();
  for (const s of ["hit", "defeat"]) {
    const t = (await bodyTrimmed(`${OUT}/boss-${id}-${s}.png`)).img;
    await t.resize({ width: m.width, height: m.height, fit: "inside" }).extend({ background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .resize(m.width, m.height, { fit: "contain", position: s === "defeat" ? "bottom" : "centre", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png().toFile(`${dir}/${id}-${s}.png`);
  }
  const manifest = `${dir}/authored.json`;
  const list = existsSync(manifest) ? JSON.parse(readFileSync(manifest, "utf8")) : [];
  if (!list.includes(id)) list.push(id);
  writeFileSync(manifest, JSON.stringify(list, null, 2) + "\n");
  console.log("placed", `${dir}/${id}-hit.png`, `${dir}/${id}-defeat.png`, "(authored.json 등록 — make-monster-states 가 건너뜀)");
}

async function placeCover() {
  await sharp(`${OUT}/cover-${id}.png`).resize(256, 256).png().toFile(`public/beat/covers/${id}.png`);
  console.log("placed", `public/beat/covers/${id}.png`);
}

const fns = { char: placeChar, hero: placeHero, costume: placeCostume, boss: placeBoss, cover: placeCover };
if (!fns[cmd]) { console.error("usage: place-art.mjs char|hero|costume|boss|cover [id]"); process.exit(1); }
await fns[cmd]();
