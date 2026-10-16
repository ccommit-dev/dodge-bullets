/**
 * Blender 3D 렌더 조립 (2026-10-16, 사용자: "주인공·동료·몬스터·보스 공격 애니메이션 다시 제대로 · 파츠별 무기 어색하지 않게 — mascot-3d-film 써서").
 *   node scripts/assemble-b3d.mjs [id…]   (입력: art-gen/out/b3d/<id>/f<i>.png + meta.json — art-gen/blender/render_roster.py)
 * 렌더는 리그(뼈대) 자세라 팔·무기·턱·날개가 진짜로 움직인다. 여기서는 게임 칸 규격에 맞춰 앉히기만 한다:
 *   동료·스킨  frames/<id>.webp 9칸 470×358 · 발 87% · 가운데 · 아틀라스 행(대기·예비·휘두름·피격) · 개별 PNG
 *   몬스터     monsters/frames/<art>.webp 5칸 512² · 발 97%
 *   주인공     character/base/hero-idle.png 4칸 443×887 · hero-attack.png 4칸 553×887 · 발 (0.4795·443, 0.999·887)
 *              + src/equipment/heroAnchors.ts (파츠 뼈를 카메라로 투영한 값 — 투구·갑옷·장갑·신발·방패·견갑·무기가 칸마다 몸을 따라간다)
 * 배율은 캐릭터마다 하나(칸마다 바꾸지 않는다 — 크기 팝 없음). 비버(주인공·동료·스킨)는 몸 크기가 모두 같게 같은 배율을 쓰고,
 * 칸 밖으로 나가는 캐릭터만 그 캐릭터 전체를 줄인다. 2배 렌더(1024)를 줄여 가장자리를 매끈하게.
 */
import sharp from "sharp";
import { existsSync, readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";

const SRC = "art-gen/out/b3d";
const T = (w, h) => ({ create: { width: Math.round(w), height: Math.round(h), channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } });
const roster = readFileSync("art-gen/blender/roster.py", "utf8");
const keysOf = (name) => { const a = roster.indexOf(`${name} = {`); let d = 0, i = roster.indexOf("{", a); const st = i; for (; i < roster.length; i += 1) { if (roster[i] === "{") d += 1; else if (roster[i] === "}") { d -= 1; if (!d) break; } } return [...roster.slice(st, i).matchAll(/^    '([a-z0-9_-]+)':/gm)].map((m) => m[1]); };
const ALLIES = keysOf("ALLIES"), SKINS = keysOf("SKINS"), MONSTERS = keysOf("MONSTERS");

async function bbox(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let x0 = info.width, x1 = -1, y0 = info.height, y1 = -1;
  for (let y = 0; y < info.height; y += 1) for (let x = 0; x < info.width; x += 1) if (data[(y * info.width + x) * 4 + 3] > 24) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return { x0, x1: x1 + 1, y0, y1: y1 + 1 };
}
async function load(id) {
  const dir = `${SRC}/${id}`;
  if (!existsSync(`${dir}/meta.json`)) return null;
  const meta = JSON.parse(readFileSync(`${dir}/meta.json`, "utf8"));
  const frames = [];
  for (let i = 0; i < meta.frames.length; i += 1) frames.push({ file: `${dir}/f${i}.png`, ...meta.frames[i], box: await bbox(`${dir}/f${i}.png`) });
  return { id, res: meta.res, frames };
}
/** 칸 하나: 렌더를 k 배로 줄여 발(pivot)을 (px, py) 에 둔다 */
/** 피격 칸 — 흰·붉은 번쩍임(맞은 것이 읽히게) */
async function hitTint(buf) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) if (data[i + 3]) { data[i] += (255 - data[i]) * 0.35; data[i + 1] += (230 - data[i + 1]) * 0.14; data[i + 2] += (230 - data[i + 2]) * 0.14; }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}
async function cellOps(f, k, cellX, cw, ch, px, py) {
  const R = Math.round;
  const w = R(1024 * k);
  let buf = await sharp(f.file).resize(w, w, { kernel: "lanczos3" }).png().toBuffer();
  if (f.hit) buf = await hitTint(buf);
  const ox = R(px - f.pivot[0] * k), oy = R(py - f.pivot[1] * k);
  const left = Math.max(0, -ox), top = Math.max(0, -oy), right = Math.min(w, cw - ox), bottom = Math.min(w, ch - oy);
  if (right <= left || bottom <= top) return [];
  return [{ input: await sharp(buf).extract({ left, top, width: right - left, height: bottom - top }).png().toBuffer(), left: cellX + ox + left, top: oy + top }];
}
/** 모든 칸이 [m, cw−m]×[m, ch] 안에 들도록 배율 k 를 줄인다 (피벗 고정) */
function fitScale(frames, k, cw, ch, px, py, m, floor = true) {
  for (const f of frames) {
    const up = f.pivot[1] - f.box.y0, left = f.pivot[0] - f.box.x0, right = f.box.x1 - f.pivot[0], down = f.box.y1 - f.pivot[1];
    if (up > 0) k = Math.min(k, (py - m) / up);
    if (left > 0) k = Math.min(k, (px - m) / left);
    if (right > 0) k = Math.min(k, (cw - m - px) / right);
    if (floor && down > 0 && ch - 1 - py > 3) k = Math.min(k, (ch - 1 - py) / down);   // 발이 칸 바닥에 붙는 시트(주인공)는 아래를 재지 않는다
  }
  return k;
}
async function strip(frames, k, cw, ch, px, py, fmt, dest) {
  const ops = [];
  for (const [i, f] of frames.entries()) ops.push(...(await cellOps(f, k, i * cw, cw, ch, px, py)));
  const buf = await sharp(T(cw * frames.length, ch)).composite(ops).png().toBuffer();
  if (dest) await (fmt === "webp" ? sharp(buf).webp({ quality: 90, alphaQuality: 95 }) : sharp(buf).png()).toFile(dest);
  return buf;
}

const only = process.argv.slice(2);
const want = (id) => !only.length || only.includes(id);

// ── 비버(주인공·동료·스킨) 공통 배율 — 1024 렌더에서 1 캐릭터 단위 = 1024/2.3 px. 동료 칸에서 몸(머리 꼭대기 z≈0.95)이 칸 높이의 65.5% — 마법사 모자·든 무기까지 칸에 들게 ──
const UNIT = 1024 / 2.3;
const CW = 470, CH = 358, FEET = 0.87;
const K_ALLY = (CH * 0.655) / (0.95 * UNIT);
const done = { allies: [], skins: [], monsters: [] };
for (const id of [...ALLIES, ...SKINS]) {
  if (!want(id)) continue;
  const c = await load(id); if (!c) { console.log("skip", id); continue; }
  c.frames[8].hit = true;
  const k = fitScale(c.frames, K_ALLY, CW, CH, CW / 2, CH * FEET, 4);
  await strip(c.frames, k, CW, CH, CW / 2, CH * FEET, "webp", `public/titans/generated/allies/frames/${id}.webp`);
  // 아틀라스 행(4칸: 대기 · 예비 · 휘두름 · 피격) — make-variant-atlas(스킨) · 아래 patchAtlases(동료)
  const row = await strip([0, 4, 5, 8].map((i) => c.frames[i]), k, CW, CH, CW / 2, CH * FEET, null, null);
  const rowPng = await sharp(row).resize(1254, 239, { fit: "fill" }).png().toBuffer();
  if (SKINS.includes(id)) { mkdirSync("art-gen/skin-rows", { recursive: true }); await sharp(rowPng).toFile(`art-gen/skin-rows/${id}-row.png`); done.skins.push(id); }
  else {
    await sharp(rowPng).toFile(`${SRC}/${id}/row.png`);
    const one = `public/titans/generated/allies/${id}.png`;
    if (existsSync(one)) await sharp(await sharp(row).extract({ left: 0, top: 0, width: CW, height: CH }).png().toBuffer()).trim().png().toFile(one);
    done.allies.push(id);
  }
  console.log("ally", id, "k", k.toFixed(3), k < K_ALLY - 1e-6 ? "(줄임)" : "");
}

// 동료 아틀라스(기본 6 · 변형 12) 행 덮기
const BASE_ROW = { mia: 0, leon: 1, sera: 2, garen: 3, ari: 4, nox: 5 };
const VARIANT_ROW = { pyro: 0, marina: 1, terra: 2, zephyr: 3, bronn: 4, iris: 5, cain: 6, sylph: 7, orion: 8, ember: 9, luna: 10, volt: 11 };
for (const [file, rows] of [["ally-animation-atlas-v1.png", BASE_ROW], ["ally-variant-atlas-v1.png", VARIANT_ROW]]) {
  const path = `public/titans/generated/allies/${file}`, ops = [];
  for (const id of done.allies) if (rows[id] !== undefined) ops.push({ input: readFileSync(`${SRC}/${id}/row.png`), left: 0, top: rows[id] * 239 });
  if (!ops.length) continue;
  const solid = await sharp({ create: { width: 1254, height: 239, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } } }).png().toBuffer();
  const cleared = await sharp(path).composite(ops.map((o) => ({ input: solid, left: 0, top: o.top, blend: "dest-out" }))).png().toBuffer();
  await sharp(cleared).composite(ops).png().toFile(path + ".tmp.png");
  writeFileSync(path, readFileSync(path + ".tmp.png"));
  (await import("node:fs")).unlinkSync(path + ".tmp.png");
  console.log("atlas", file, ops.length);
}

// ── 몬스터 — 5칸 512² · 발 97% · 대기 높이가 칸의 76% ──
const MW = 512, MFEET = 0.955;   // 발 바닥(피벗 아래 발 두께)이 칸 바닥에 닿게 — 아래 여백은 재지 않는다
for (const id of MONSTERS) {
  if (!want(id)) continue;
  const c = await load(id); if (!c) { console.log("skip", id); continue; }
  c.frames[4].hit = true;
  const f0 = c.frames[0].box, up0 = c.frames[0].pivot[1] - f0.y0;
  const k = fitScale(c.frames, (MW * 0.76) / up0, MW, MW, MW / 2, MW * MFEET, 5, false);
  await strip(c.frames, k, MW, MW, MW / 2, MW * MFEET, "webp", `public/titans/generated/monsters/frames/${id}.webp`);
  done.monsters.push(id);
  console.log("monster", id, "k", k.toFixed(3));
}

// ── 주인공 — 대기·공격 시트 + 파츠 앵커 ──
if (want("hero")) {
  const c = await load("hero");
  if (c) {
    const FW = 443, FH = 887, AW = 553, PX = 0.4795 * FW, PY = 0.999 * FH;
    const idle = c.frames.slice(0, 4), atk = c.frames.slice(4, 8);
    // 대기 인물(왕관 꼭대기~발)이 칸 높이의 69% (FIG_IDLE · verify-systems)
    const up0 = idle[0].pivot[1] - idle[0].box.y0;
    let k = (FH * 0.69) / up0;
    k = Math.min(fitScale(idle, k, FW, FH, PX, PY, 3), fitScale(atk, k, AW, FH, PX + (AW - FW) / 2, PY, 3));
    await strip(idle, k, FW, FH, PX, PY, "png", "public/titans/character/base/hero-idle.png");
    await strip(atk, k, AW, FH, PX + (AW - FW) / 2, PY, "png", "public/titans/character/base/hero-attack.png");
    // 앵커 — 렌더 px → 칸 px → 상자 %. 회전·크기의 기준값(대기 0칸)은 지금 파츠 그림 크기에 맞춘 값을 유지하고, 칸마다 바뀐 각도만 더한다
    const BASE = { hand: [20, 0.32], shoulderLeft: [-6, 0.55], shoulderRight: [10, 0.58], head: [-4, 0.62], chest: [0, 0.52], offHand: [0, 0.42], feet: [0, 0.5] };
    const r1 = (v) => Math.round(v * 10) / 10;
    const anchors = (frames, extraX) => frames.map((f) => Object.fromEntries(Object.entries(BASE).map(([name, [rot0, sc]]) => {
      const p = f.parts[name], p0 = idle[0].parts[name];
      const x = PX + extraX + (p.x - f.pivot[0]) * k - extraX, y = PY + (p.y - f.pivot[1]) * k;
      return [name, { x: r1((x / FW) * 100), y: r1((y / FH) * 100), rotation: r1(rot0 + (p.rot - p0.rot)), scale: sc }];
    })));
    const fmt = (f) => "  { " + Object.entries(f).map(([n, a]) => `${n}: { x: ${a.x}, y: ${a.y}, rotation: ${a.rotation}, scale: ${a.scale} }`).join(", ") + " },";
    // 성문 방어(캔버스) 인물 상자와 파츠 자리 — 대기 0칸에서 잰다
    const b = idle[0].box, bx0 = (PX + (b.x0 - idle[0].pivot[0]) * k), bx1 = (PX + (b.x1 - idle[0].pivot[0]) * k), by0 = (PY + (b.y0 - idle[0].pivot[1]) * k);
    const fig = { x0: r1((bx0 / FW) * 100), x1: r1((bx1 / FW) * 100), y0: r1((by0 / FH) * 100), y1: 99.9 };
    const ia = anchors(idle, 0)[0];
    const uv = (a) => [Math.round((((a.x / 100) * FW - bx0) / (bx1 - bx0)) * 1000) / 1000, Math.round((((a.y / 100) * FH - by0) / (PY - by0)) * 1000) / 1000];
    const spots = [["boots", ...uv(ia.feet), 0.312], ["shield", ...uv(ia.offHand), 0.21], ["armor", ...uv(ia.chest), 0.346], ["gloves", ...uv(ia.hand), 0.167], ["helmet", ...uv(ia.head), 0.49]];
    writeFileSync("src/equipment/heroAnchors.ts", `/** 주인공 파츠 앵커 — scripts/assemble-b3d.mjs 가 쓴다 (손대지 말 것).
 * 2026-10-16: Blender 3D 리그(art-gen/blender) 의 머리·몸·손·발 뼈를 칸마다 카메라로 투영한 값(상자 %). 무기는 손 뼈를 따라 휘두르고,
 * 투구·갑옷·장갑·신발·방패·견갑도 같은 뼈를 따라간다. 회전은 대기 0칸 대비 뼈가 돈 만큼 더한다 */
import type { EquipmentFrameAnchors } from "./anchors";

export const HERO_IDLE_ANCHORS: EquipmentFrameAnchors[] = [
${anchors(idle, 0).map(fmt).join("\n")}
];
export const HERO_ATTACK_ANCHORS: EquipmentFrameAnchors[] = [
${anchors(atk, 0).map(fmt).join("\n")}
];
/** 성문 방어 — 대기 시트 인물 상자(칸 %) */
export const HERO_FIG = ${JSON.stringify(fig)};
/** 성문 방어 파츠 자리 — 인물 상자 기준 [파츠, u, v, 크기(키 대비)] */
export const HERO_GEAR_SPOTS = ${JSON.stringify(spots)} as const;
`);
    console.log("hero k", k.toFixed(3), "fig", JSON.stringify(fig));
  }
}

// frameSets — 띠가 있는 것
if (done.allies.length || done.monsters.length) {
  const cur = readFileSync("src/titans/frameSets.ts", "utf8");
  const keep = (name) => JSON.parse((cur.match(new RegExp(`${name}[^=]*=\\s*(\\[[^\\]]*\\])`)) ?? [, "[]"])[1]);
  writeFileSync("src/titans/frameSets.ts", `/** 프레임 띠가 있는 동료·몬스터 — scripts/assemble-b3d.mjs(Blender 3D 리그 렌더) 가 쓴다 (손대지 말 것) */
export const ALLY_FRAME_SET: readonly string[] = ${JSON.stringify([...new Set([...keep("ALLY_FRAME_SET"), ...done.allies])].sort())};
export const MONSTER_FRAME_SET: readonly string[] = ${JSON.stringify([...new Set([...keep("MONSTER_FRAME_SET"), ...done.monsters])].sort())};
`);
}
console.log("done", JSON.stringify({ allies: done.allies.length, skins: done.skins.length, monsters: done.monsters.length }));
