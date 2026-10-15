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
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";

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

/**
 * 방향 맞추기 (2026-10-15, 사용자: "공격·피격 애니메이션이 오른쪽 방향을 바라보면서 자연스럽게") — 생성 프레임 중 왼쪽을 보는 것이 섞였다.
 * 프레임을 기준 대기(ally-facing.json 의 오른쪽 원화)와 그대로·좌우 반전 두 가지로 비교해(48×48 · 색+알파), 반전이 4% 넘게 더 닮으면 반전한다.
 */
async function sig(buf) { return (await sharp(buf).resize(48, 48, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } }).ensureAlpha().raw().toBuffer()); }
const dist = (a, b) => { let d = 0; for (let i = 0; i < a.length; i += 4) { const wa = a[i + 3] / 255, wb = b[i + 3] / 255; d += Math.abs(a[i] * wa - b[i] * wb) + Math.abs(a[i + 1] * wa - b[i + 1] * wb) + Math.abs(a[i + 2] * wa - b[i + 2] * wb) + Math.abs(a[i + 3] - b[i + 3]); } return d; };
const FLIPPED = [];
async function oriented(file, refBuf) {
  if (!refBuf) return file;
  const img = await trimmed(file);
  const ref = await sig(refBuf), same = await sig(img), mir = await sig(await sharp(img).flop().png().toBuffer());
  const ds = dist(ref, same), dm = dist(ref, mir);
  if (dm < ds * 0.96) { const out = file.replace(/.png$/, ".flop.png"); await sharp(file).flop().png().toFile(out); FLIPPED.push(file.split("/").pop()); return out; }
  return file;
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

/** 품질 문 (2026-10-15) — 오려내기가 실패해 배경 상자가 남았거나(네 모서리 불투명) 거의 빈 그림이면 버리고 가까운 프레임으로 대신한다 */
const SUBST = { "idle-0": "idle-1", "idle-1": "idle-0", "walk-0": "idle-0", "walk-1": "walk-0", "attack-0": "attack-2", "attack-1": "attack-2", "attack-3": "attack-2", "attack-2": "attack-1", "hit-0": "idle-0" };
async function frameStats(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const al = (x, y) => data[(y * info.width + x) * 4 + 3];
  const corners = [al(2, 2), al(info.width - 3, 2), al(2, info.height - 3), al(info.width - 3, info.height - 3)].filter((v) => v > 200).length;
  let opaque = 0, grey = 0, x0 = info.width, x1 = -1, y0 = info.height, y1 = -1;
  for (let y = 0; y < info.height; y += 2) for (let x = 0; x < info.width; x += 2) {
    const i = (y * info.width + x) * 4; if (data[i + 3] <= 40) continue; opaque += 1;
    const r = data[i], g = data[i + 1], bl = data[i + 2], mx = Math.max(r, g, bl), mn = Math.min(r, g, bl);
    const band = Math.round(Math.min(info.width, info.height) * 0.03);
    if (x < band || x >= info.width - band || y < band) grey += 1;   // 캔버스 위·옆 가장자리 띠에 닿은 불투명 = 남은 배경 조각(발은 아래라 뺀다)
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  const total = (info.width / 2) * (info.height / 2);
  return { corners, frac: opaque / total, greyFrac: grey / total, aspect: x1 > x0 ? (y1 - y0) / (x1 - x0) : 0 };
}
/** 품질 문 — 배경 상자·조각(모서리 불투명 · 밝은 무채색 6% 넘게) · 거의 빈 그림 · 같은 동료의 다른 프레임보다 1.4배 넘게 길쭉함(두 마리가 위아래로 겹침) */
async function resolveSet(names, path) {
  const stats = {};
  for (const n of names) { const file = path(n); if (existsSync(file)) stats[n] = await frameStats(file); }
  const aspects = Object.values(stats).map((t) => t.aspect).sort((p, q) => p - q);
  const med = aspects[Math.floor(aspects.length / 2)] || 1;
  const bad = (n) => { const t = stats[n]; return !t || t.corners >= 1 || t.greyFrac > 0.0012 || t.frac < 0.02 || t.frac > 0.7 || t.aspect > med * 1.16; };
  const out = [];
  for (const n of names) {
    let cur = n, hops = 0;
    while (bad(cur) && hops < 4) { cur = SUBST[cur] ?? "idle-0"; hops += 1; }
    if (cur !== n) console.log("  대신", n, "→", cur, JSON.stringify(stats[n] ? { c: stats[n].corners, g: +stats[n].greyFrac.toFixed(2), asp: +(stats[n].aspect / med).toFixed(2) } : {}));
    out.push(path(cur));
  }
  return out;
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
    if (MON_NAMES.slice(1).filter((n) => existsSync(`${OUT}/frame-${id}-${n}.png`)).length < 4 || !existsSync(idle0)) { console.log("skip monster", art, "(아직 생성 중)"); continue; }
    const set = await resolveSet(MON_NAMES, (n) => (n === "idle-0" ? idle0 : `${OUT}/frame-${id}-${n}.png`));
    if (!set.every(existsSync)) { console.log("skip monster", art, "(프레임 부족)"); continue; }
    await strip(set, MW, MH, 0.06, 0.99, 0.96, `public/titans/generated/monsters/frames/${art}.webp`);
    monsters.push(art); console.log("monster", art);
  } else {
    if (ALLY_NAMES.filter((n) => existsSync(`${OUT}/frame-${id}-${n}.png`)).length < 9) { console.log("skip ally", id, "(아직 생성 중)"); continue; }
    const set0 = await resolveSet(ALLY_NAMES, (n) => `${OUT}/frame-${id}-${n}.png`);
    const facing = JSON.parse(readFileSync("art-gen/ally-facing.json", "utf8"))[id];
    const refBuf = facing ? await trimmed(`${OUT}/${facing.src}`) : null;
    const set = []; for (const f of set0) set.push(await oriented(f, refBuf));
    if (!set.every(existsSync)) { console.log("skip ally", id, "(프레임 부족)", ALLY_NAMES.filter((n, i) => !existsSync(set[i])).join(",")); continue; }
    await strip(set, CW, CH, 0.05, 0.87, 0.6, `public/titans/generated/allies/frames/${id}.webp`);
    allies.push(id); console.log("ally", id);
  }
}
writeFileSync("src/titans/frameSets.ts", `/** 생성 프레임 띠가 있는 동료·몬스터 — scripts/build-ally-frames.mjs 가 쓴다 (손대지 말 것) */
export const ALLY_FRAME_SET: readonly string[] = ${JSON.stringify(allies.sort())};
export const MONSTER_FRAME_SET: readonly string[] = ${JSON.stringify(monsters.sort())};
`);
console.log("allies", allies.length, "monsters", monsters.length, "반전", FLIPPED.length, FLIPPED.join(" "));
