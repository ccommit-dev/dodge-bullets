/**
 * 애니메이션 2판 조립 (2026-10-19, 사용자: "모든 캐릭터, 동료의 애니메이션이 아직도 어색 — 다시 만들어서 적용").
 *   node scripts/assemble-anim2.mjs [id…]   (입력: art-gen/out/b3d2/<id>/<동작>_<i>.png + meta.json — art-gen/blender/render_anim2.py)
 * art-gen/anim-layout.json(칸 크기·줄·칸 수·재생 시간)을 읽어 시트를 짠다 — 줄 = 동작, 칸 = 프레임:
 *   동료·스킨  public/titans/anim/allies/<id>.webp   (8칸 × 4줄: 대기 · 걷기 · 공격 · 피격)
 *   몬스터     public/titans/anim/monsters/<art>.webp (4칸 × 4줄: 대기 · 예비 · 덤빔 · 피격)
 *   주인공     public/titans/anim/hero/hero-{idle,walk,attack}.webp (한 줄씩) + src/equipment/heroAnchors.ts(손 뼈 투영 — 무기가 따라간다)
 * 그리고 게임이 읽는 src/titans/animLayout.ts(배치 + 시트가 있는 id) 를 쓴다.
 * 배율: 비버(동료·스킨)는 전원 같은 값 하나(칸을 넘는 자세가 있으면 그 값으로 전원), 몬스터·주인공은 각자 하나 — 칸마다 바꾸지 않는다(크기 팝 없음).
 * 피격 칸은 meta 의 tint(0~1)만큼 흰·붉게 물들인다.
 */
import sharp from "sharp";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { makeHeroPortrait } from "./make-hero-portrait.mjs";

const SRC = "art-gen/out/b3d2";
const LAYOUT = JSON.parse(readFileSync("art-gen/anim-layout.json", "utf8"));
const roster = readFileSync("art-gen/blender/roster.py", "utf8");
const keysOf = (name) => { const a = roster.indexOf(`${name} = {`); let d = 0, i = roster.indexOf("{", a); const st = i; for (; i < roster.length; i += 1) { if (roster[i] === "{") d += 1; else if (roster[i] === "}") { d -= 1; if (!d) break; } } return [...roster.slice(st, i).matchAll(/^    '([a-z0-9_-]+)':/gm)].map((m) => m[1]); };
// 동료 3배 (2026-10-27) — 새 40명은 roster_ext.py 의 NEW_ALLIES (roster.py 가 ALLIES.update 로 합친다)
const rosterExt = existsSync("art-gen/blender/roster_ext.py") ? readFileSync("art-gen/blender/roster_ext.py", "utf8") : "";
const NEW_ALLY_KEYS = [...rosterExt.matchAll(/^    '([a-z0-9_-]+)': dict\(/gm)].map((m) => m[1]);
const ALLIES = [...keysOf("ALLIES"), ...NEW_ALLY_KEYS], SKINS = keysOf("SKINS"), MONSTERS = keysOf("MONSTERS");
const blank = (w, h) => ({ create: { width: Math.round(w), height: Math.round(h), channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } });

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
  const actions = {};
  for (const [name, frames] of Object.entries(meta.actions)) {
    actions[name] = [];
    for (let i = 0; i < frames.length; i += 1) {
      const file = `${dir}/${name}_${i}.png`;
      if (!existsSync(file)) throw new Error(`없는 칸 ${file}`);
      actions[name].push({ file, ...frames[i], box: await bbox(file) });
    }
  }
  return { id, res: meta.res, actions };
}
const allFrames = (c) => Object.values(c.actions).flat();
/** 피격 번쩍임 — t 0~1 */
async function tint(buf, t) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) if (data[i + 3]) { data[i] += (255 - data[i]) * 0.35 * t; data[i + 1] += (230 - data[i + 1]) * 0.14 * t; data[i + 2] += (230 - data[i + 2]) * 0.14 * t; }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}
/** 칸 하나 — 렌더를 k 배로 줄여 발(pivot)을 칸 안 (px, py) 에. 칸 밖은 잘라낸다 */
async function cellOps(f, res, k, cellX, cellY, cw, ch, px, py) {
  const R = Math.round, w = R(res * k);
  let buf = await sharp(f.file).resize(w, w, { kernel: "lanczos3" }).png().toBuffer();
  if (f.tint > 0) buf = await tint(buf, f.tint);
  const ox = R(px - f.pivot[0] * k), oy = R(py - f.pivot[1] * k);
  const left = Math.max(0, -ox), top = Math.max(0, -oy), right = Math.min(w, cw - ox), bottom = Math.min(w, ch - oy);
  if (right <= left || bottom <= top) return [];
  return [{ input: await sharp(buf).extract({ left, top, width: right - left, height: bottom - top }).png().toBuffer(), left: cellX + ox + left, top: cellY + oy + top }];
}
/** 모든 칸이 [m, cw−m]×[m, ch] 안에 들도록 배율 k 를 줄인다 (발 고정) */
function fitScale(frames, k, cw, ch, px, py, m, floor = true) {
  for (const f of frames) {
    const up = f.pivot[1] - f.box.y0, left = f.pivot[0] - f.box.x0, right = f.box.x1 - f.pivot[0], down = f.box.y1 - f.pivot[1];
    if (up > 0) k = Math.min(k, (py - m) / up);
    if (left > 0) k = Math.min(k, (px - m) / left);
    if (right > 0) k = Math.min(k, (cw - m - px) / right);
    if (floor && down > 0 && ch - 1 - py > 3) k = Math.min(k, (ch - 1 - py) / down);
  }
  return k;
}
/** 줄 = 동작 · 칸 = 프레임 격자 */
async function grid(c, spec, k, dest) {
  const [cw, ch] = spec.cell, rows = Object.keys(spec.actions).length;
  const px = cw / 2, py = ch * spec.feet, ops = [];
  for (const [name, a] of Object.entries(spec.actions)) {
    const frames = c.actions[name];
    if (!frames || frames.length !== a.frames) throw new Error(`${c.id} ${name}: 칸 ${frames?.length} ≠ ${a.frames}`);
    for (const [i, f] of frames.entries()) ops.push(...(await cellOps(f, c.res, k, i * cw, a.row * ch, cw, ch, px, py)));
  }
  const buf = await sharp(blank(cw * spec.cols, ch * rows)).composite(ops).png().toBuffer();
  await sharp(buf).webp({ quality: 88, alphaQuality: 92, effort: 5 }).toFile(dest);
  return buf;
}

const only = process.argv.slice(2);
const want = (id) => !only.length || only.includes(id);
const done = { allies: [], monsters: [], hero: false, hd: {} };
/** 대장으로 나오는 종 — 성문 방어 장 대장(draw.ts BOSS_SPRITE) + 중간·비밀 대장(stages.ts art) */
const BOSS_ARTS = ["moss-golem-clean", "moon-wolf-king-clean", "wolf-king-clean", "flame-wyvern-clean", "abyss-titan", "ancient-treant", "bone-dragon", "fire-demon", "goblin-warlord", "magma-golem", "minotaur", "ruin-sentinel", "spider-queen", "thorn-boar-king", "void-lich"];
const UNIT = 1024 / 2.3;   // 렌더 1024px 에서 캐릭터 1단위

// ── 비버(동료·스킨) ── 몸(머리 꼭대기 z≈0.95)이 칸 높이의 65.5% — 1판과 같은 비율. 전원 같은 배율
{
  const A = LAYOUT.ally, [CW, CH] = A.cell;
  const K = (CH * 0.655) / (0.95 * UNIT);
  let kB = K;
  const beavers = {};
  for (const id of [...ALLIES, ...SKINS]) {
    const c = await load(id); if (!c) continue;
    beavers[id] = c;
    kB = Math.min(kB, fitScale(allFrames(c), K, CW, CH, CW / 2, CH * A.feet, 3));
  }
  if (Object.keys(beavers).length) console.log("beaver k", kB.toFixed(3), "(목표", K.toFixed(3) + ")");
  // 새 동료가 공유 배율을 깎으면 기존 동료까지 작아진다 — 기존만으로 잰 값과 견준다
  { let kOld = K; for (const [id, c] of Object.entries(beavers)) if (!NEW_ALLY_KEYS.includes(id)) kOld = Math.min(kOld, fitScale(allFrames(c), K, CW, CH, CW / 2, CH * A.feet, 3)); console.log("beaver k (기존만)", kOld.toFixed(3)); }
  mkdirSync("public/titans/anim/allies", { recursive: true });
  for (const [id, c] of Object.entries(beavers)) {
    if (!want(id)) continue;
    await grid(c, A, kB, `public/titans/anim/allies/${id}.webp`);
    done.allies.push(id);
    // 초상·스킨 썸네일·아틀라스 행도 새 렌더로 — 2판은 주 무기를 왼손(적 쪽)에 쥐어 1판 그림과 손이 다르다(파티 목록과 전투가 같은 그림이게)
    const cellOf = async (f) => sharp(blank(CW, CH)).composite(await cellOps(f, c.res, kB, 0, 0, CW, CH, CW / 2, CH * A.feet)).png().toBuffer();
    const idle0 = await cellOf(c.actions.idle[0]);
    const portrait = `public/titans/generated/allies/${id}.png`;
    if (existsSync(portrait) || NEW_ALLY_KEYS.includes(id)) await sharp(idle0).trim().png().toFile(portrait);
    const thumb = `public/titans/generated/allies/skins/${id}.png`;
    if (existsSync(thumb)) await sharp(idle0).resize(313, 239, { fit: "fill" }).png().toFile(thumb);
    const cells = [c.actions.idle[0], c.actions.attack[1], c.actions.attack[4], c.actions.hit[0]];
    const rowOps = [];
    for (const [i, f] of cells.entries()) rowOps.push(...(await cellOps(f, c.res, kB, i * CW, 0, CW, CH, CW / 2, CH * A.feet)));
    const rowPng = await sharp(await sharp(blank(CW * 4, CH)).composite(rowOps).png().toBuffer()).resize(1254, 239, { fit: "fill" }).png().toBuffer();
    if (SKINS.includes(id)) { mkdirSync("art-gen/skin-rows", { recursive: true }); await sharp(rowPng).toFile(`art-gen/skin-rows/${id}-row.png`); }
    else { mkdirSync(`${SRC}/${id}`, { recursive: true }); await sharp(rowPng).toFile(`${SRC}/${id}/row.png`); }
    console.log("ally", id);
  }
  // 동료 아틀라스(기본 6 · 변형 12) 행 덮기 — 1판(assemble-b3d)과 같은 자리
  const BASE_ROW = { mia: 0, leon: 1, sera: 2, garen: 3, ari: 4, nox: 5 };
  const VARIANT_ROW = { pyro: 0, marina: 1, terra: 2, zephyr: 3, bronn: 4, iris: 5, cain: 6, sylph: 7, orion: 8, ember: 9, luna: 10, volt: 11 };
  for (const [file, rowsOf] of [["ally-animation-atlas-v1.png", BASE_ROW], ["ally-variant-atlas-v1.png", VARIANT_ROW]]) {
    const path = `public/titans/generated/allies/${file}`, ops = [];
    for (const id of done.allies) if (rowsOf[id] !== undefined && existsSync(`${SRC}/${id}/row.png`)) ops.push({ input: readFileSync(`${SRC}/${id}/row.png`), left: 0, top: rowsOf[id] * 239 });
    if (!ops.length || !existsSync(path)) continue;
    const solid = await sharp({ create: { width: 1254, height: 239, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } } }).png().toBuffer();
    const cleared = await sharp(path).composite(ops.map((o) => ({ input: solid, left: 0, top: o.top, blend: "dest-out" }))).png().toBuffer();
    const merged = await sharp(cleared).composite(ops).png().toBuffer();
    writeFileSync(path, merged);
    console.log("atlas", file, ops.length);
  }
}

// ── 몬스터 ── 대기 높이(발~머리)가 칸의 76%
{
  const M = LAYOUT.monster, [MW, MH] = M.cell;
  mkdirSync("public/titans/anim/monsters", { recursive: true });
  for (const id of MONSTERS) {
    if (!want(id)) continue;
    const c = await load(id); if (!c) continue;
    const f0 = c.actions.idle[0], up0 = f0.pivot[1] - f0.box.y0;
    const k = fitScale(allFrames(c), (MH * 0.76) / up0, MW, MH, MW / 2, MH * M.feet, 4, false);
    await grid(c, M, k, `public/titans/anim/monsters/${id}.webp`);
    done.monsters.push(id);
    // 대장으로 나오는 종(성문 방어 장 대장·중간/비밀 대장)은 큰 칸(576²) 시트도 — 성문 방어 대장은 화면에 ~330px(실픽셀 ~1000) 로 그려 384 칸은 흐렸다.
    // 같은 렌더(1024)에서 배율만 키운다. 원래 원화(PNG)의 몸 높이 비율도 재 두어 게임이 화면 크기(밸런스 값)를 그대로 맞춘다
    if (BOSS_ARTS.includes(id)) {
      const HD = { ...M, cell: [576, 576] };
      mkdirSync("public/titans/anim/monsters-hd", { recursive: true });
      await grid(c, HD, k * (576 / MW), `public/titans/anim/monsters-hd/${id}.webp`);
      const png = `public/titans/generated/monsters/${id}.png`;
      if (existsSync(png)) { const b = await bbox(png); const m = await sharp(png).metadata(); done.hd[id] = Math.round(((b.y1 - b.y0) / m.height) * 1000) / 1000; }
      else done.hd[id] = 0.85;
    }
    console.log("monster", id, "k", k.toFixed(3));
  }
}

// ── 주인공 ── 시트 셋(대기·걷기·공격) + 손 뼈 앵커(무기만 든다 — 2026-10-19)
if (want("hero")) {
  const c = await load("hero");
  if (c) {
    const H = LAYOUT.hero, FH = H.cellHeight, FW = H.sheets.idle.width;
    const PX = H.feet[0] * FW, PY = H.feet[1] * FH;
    const idle = c.actions.idle;
    const up0 = idle[0].pivot[1] - idle[0].box.y0;
    let k = (FH * 0.69) / up0;   // 대기 인물(왕관 꼭대기~발)이 칸 높이의 69% (FIG_IDLE · verify-systems)
    for (const [mode, s] of Object.entries(H.sheets)) k = Math.min(k, fitScale(c.actions[mode], k, s.width, FH, PX + (s.width - FW) / 2, PY, 3));
    mkdirSync("public/titans/anim/hero", { recursive: true });
    const r1 = (v) => Math.round(v * 10) / 10;
    // 앵커 기준값(대기 0칸의 회전·크기)은 1판(assemble-b3d)과 같다 — 칸마다 뼈가 돈 만큼만 더한다
    const BASE = { hand: [20, 0.32], shoulderLeft: [-6, 0.55], shoulderRight: [10, 0.58], head: [-4, 0.62], chest: [0, 0.52], offHand: [0, 0.42], feet: [0, 0.5] };
    const anchorsOf = (frames, w) => frames.map((f) => Object.fromEntries(Object.entries(BASE).map(([name, [rot0, sc]]) => {
      const p = f.parts[name], p0 = idle[0].parts[name];
      const x = PX + (w - FW) / 2 + (p.x - f.pivot[0]) * k, y = PY + (p.y - f.pivot[1]) * k;
      return [name, { x: r1((x / w) * 100), y: r1((y / FH) * 100), rotation: r1(rot0 + (p.rot - p0.rot)), scale: sc, ...(name === "hand" && f.weaponBehind ? { behind: true } : {}) }];
    })));
    const out = {};
    for (const [mode, s] of Object.entries(H.sheets)) {
      const frames = c.actions[mode];
      if (frames.length !== s.frames) throw new Error(`hero ${mode}: ${frames.length} ≠ ${s.frames}`);
      const ops = [];
      for (const [i, f] of frames.entries()) ops.push(...(await cellOps(f, c.res, k, i * s.width, 0, s.width, FH, PX + (s.width - FW) / 2, PY)));
      const buf = await sharp(blank(s.width * s.frames, FH)).composite(ops).png().toBuffer();
      await sharp(buf).webp({ quality: 90, alphaQuality: 94, effort: 5 }).toFile(`public/titans/anim/hero/hero-${mode}.webp`);
      out[mode] = anchorsOf(frames, s.width);
    }
    const fmt = (f) => "  { " + Object.entries(f).map(([n, a]) => `${n}: { x: ${a.x}, y: ${a.y}, rotation: ${a.rotation}, scale: ${a.scale}${a.behind ? ", behind: true" : ""} }`).join(", ") + " },";
    const b = idle[0].box;
    const fig = { x0: r1(((PX + (b.x0 - idle[0].pivot[0]) * k) / FW) * 100), x1: r1(((PX + (b.x1 - idle[0].pivot[0]) * k) / FW) * 100), y0: r1(((PY + (b.y0 - idle[0].pivot[1]) * k) / FH) * 100), y1: 99.9 };
    writeFileSync("src/equipment/heroAnchors.ts", `/** 주인공 손·몸 앵커 — scripts/assemble-anim2.mjs 가 쓴다 (손대지 말 것).
 * 2026-10-19 애니메이션 2판: Blender 3D 리그(art-gen/blender/anim2.py)의 뼈를 칸마다 카메라로 투영한 값(칸 %). 주인공은 무기만 들어(사용자 지시)
 * 실제로 쓰는 건 hand(무기)뿐이지만, 형식(EquipmentFrameAnchors)을 맞추려 다른 뼈도 적는다. 회전은 대기 0칸 대비 뼈가 돈 만큼 더한다 */
import type { EquipmentFrameAnchors } from "./anchors";

export const HERO_IDLE_ANCHORS: EquipmentFrameAnchors[] = [
${out.idle.map(fmt).join("\n")}
];
export const HERO_WALK_ANCHORS: EquipmentFrameAnchors[] = [
${out.walk.map(fmt).join("\n")}
];
export const HERO_ATTACK_ANCHORS: EquipmentFrameAnchors[] = [
${out.attack.map(fmt).join("\n")}
];
/** 성문 방어 — 대기 시트 인물 상자(칸 %) */
export const HERO_FIG = ${JSON.stringify(fig)};
`);
    await makeHeroPortrait("public/titans/anim/hero/hero-idle.webp", H.sheets.idle.frames);   // 아이콘용 초상
    done.hero = true;
    console.log("hero k", k.toFixed(3), "fig", JSON.stringify(fig));
  }
}

// ── 게임이 읽는 배치 + 시트가 있는 id ──
{
  const path = "src/titans/animLayout.ts";
  const cur = existsSync(path) ? readFileSync(path, "utf8") : "";
  const keep = (name) => JSON.parse((cur.match(new RegExp(`${name}[^=]*=\\s*(\\[[^\\]]*\\])`)) ?? [, "[]"])[1]);
  const heroReady = done.hero || /HERO_ANIM_READY = true/.test(cur);
  const keepHd = () => { const m = cur.match(/MONSTER_HD[^=]*=\s*({[^}]*})/); return m ? JSON.parse(m[1]) : {}; };
  const strip = (o) => JSON.parse(JSON.stringify(o, (k, v) => (k === "_note" ? undefined : v)));
  writeFileSync(path, `/** 애니메이션 2판 배치 — scripts/assemble-anim2.mjs 가 art-gen/anim-layout.json 에서 쓴다 (손대지 말 것).
 * 시트는 줄 = 동작 · 칸 = 프레임. ms 는 한 바퀴(loop) 또는 한 번 재생 시간. 게임(SpriteArt · EquippedCharacter · player · sprite-anim.css)이 이 값으로 칸을 넘긴다 */
export type AnimAction = { row: number; frames: number; ms: number; loop: boolean };
export type HeroSheet = { width: number; frames: number; ms: number; loop: boolean };
export const ANIM_LAYOUT = ${JSON.stringify(strip(LAYOUT), null, 2)} as const;
export const ALLY_ANIM_SET: readonly string[] = ${JSON.stringify([...new Set([...keep("ALLY_ANIM_SET"), ...done.allies])].sort())};
export const MONSTER_ANIM_SET: readonly string[] = ${JSON.stringify([...new Set([...keep("MONSTER_ANIM_SET"), ...done.monsters])].sort())};
export const HERO_ANIM_READY = ${heroReady};
/** 큰 칸(576²) 대장 시트가 있는 종 → 원래 원화(PNG)에서 몸이 차지한 세로 비율(그 화면 크기를 지키려고) */
export const MONSTER_HD: Readonly<Record<string, number>> = ${JSON.stringify({ ...keepHd(), ...done.hd })};
`);
}
console.log("done", JSON.stringify({ allies: done.allies.length, monsters: done.monsters.length, hero: done.hero }));
