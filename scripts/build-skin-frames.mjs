/**
 * 동료 스킨 3D 프레임 (2026-10-15, 사용자: "상점 동료 탭 스킨 초상이 3D 동료보다 납작하고 색만 바꾼 느낌 — 어색한 거 모두 다시 재생성").
 * 예전 스킨은 기본 아틀라스 행에 색만 입힌 4칸이었다. 지금은 동료의 3D 프레임 띠 9칸(frames/<ally>.webp)을 칸마다
 * 옷 색을 먼저 입히고(outfit-recolor) → gen.py restyle-batch 로 스킨 테마(용암 갑옷·설원 두건 …)를 3D 로 다시 렌더한다.
 *   node scripts/build-skin-frames.mjs split      — art-gen/out/skin-src-<skin>-<i>.png(정사각 패딩) + art-gen/skin-jobs.json
 *   (GPU) art-gen/.venv/Scripts/python art-gen/gen.py restyle-batch art-gen/skin-jobs.json   (art-gen/queue9.sh)
 *   node scripts/build-skin-frames.mjs jobs2 [id…] — 2차: 1~8칸을 그 스킨의 0칸 결과를 IP 참조(0.5)로 다시 → 칸마다 디자인이 튀지 않게.
 *      id 를 주면 그 스킨은 0칸부터 다시(0칸 → 1~8칸 순서라 같은 일괄 안에서 0칸이 먼저 생긴다)  → art-gen/skin-jobs2.json
 *   node scripts/build-skin-frames.mjs assemble   — frames/<skin>.webp(9칸) · art-gen/skin-rows/<skin>-row.png(아틀라스 4칸) · src/titans/skinFrameSets.ts
 *   node scripts/make-variant-atlas.mjs            — 스킨 아틀라스·상점 썸네일을 그 행에서 다시 뜬다
 * 칸마다 원래 동료 그림 상자(높이·바닥·가운데)에 맞춰 앉혀 대형·겹침 검사가 그대로 맞는다.
 */
import sharp from "sharp";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { outfitRecolor } from "./outfit-recolor.mjs";

const OUT = "art-gen/out", FR = "public/titans/generated/allies/frames", AUTH = "art-gen/skin-rows";   // 빌드 입력만 — 배포 폴더(public/…/authored)는 동료 행 전용(verify-systems: 행마다 동료 개별 PNG 동반)
const CW = 470, CH = 358, N = 9, SEED = 20264800;
// 판매·장착 중인 스킨 10종 (은퇴 동료 세라 라이트·아이리스·카인·실프 스킨은 뺀다 — skins.ts ALLY_SKINS)
// id, 동료, 옷 색(make-variant-atlas SKINS 와 같은 값), 밝기, 채도, 테마 프롬프트(핵심을 앞에 — 77토큰에서 잘린다)
const SKINS = [
  ["garen-magma", "garen", [210, 70, 30], 0.8, 1.2, "cute chibi beaver knight in glowing lava armor, black volcanic rock plates with bright orange magma cracks, fiery red helmet, sword"],
  ["leon-frost", "leon", [158, 210, 255], 1.08, 1.05, "cute chibi beaver archer in a snowy white fur-lined hood and icy blue frost cloak, frosted spear, snowflakes"],
  ["ari-blaze", "ari", [255, 176, 64], 1.02, 1.3, "cute chibi beaver dragon knight in golden flame armor, gold and orange fiery hood, blazing spear with flames"],
  ["nox-abyss", "nox", [120, 96, 200], 0.86, 1.2, "cute chibi beaver assassin in a deep abyss purple hooded cloak with glowing violet runes, dark blade, shadow wisps"],
  ["luna-eclipse", "luna", [120, 110, 190], 0.88, 1.2, "cute chibi beaver paladin in dark indigo eclipse armor with a silver crescent moon emblem, eclipse shield"],
  ["bronn-iron", "bronn", [190, 200, 214], 0.95, 0.7, "cute chibi beaver knight in heavy dark iron plate armor with steel rivets, gunmetal grey, iron sword"],
  ["orion-nova", "orion", [140, 240, 255], 1.14, 1.2, "cute chibi beaver star mage in a white and cyan celestial robe with glowing starburst patterns, star sparkles"],
  ["ember-ruby", "ember", [255, 60, 90], 0.98, 1.4, "cute chibi beaver bard in a crimson ruby phoenix dress with red feathers and ruby gems, ruby guitar"],
  ["season-1", "ari", [200, 150, 255], 1.06, 1.25, "cute chibi beaver dragon knight in amethyst crystal armor, purple hood with glowing violet crystals, crystal spear"],
  ["season-2", "nox", [255, 220, 120], 1.04, 1.2, "cute chibi beaver assassin in a shiny gold hooded cloak with black trim, golden blade, gold sparkles"],
];
const REFS3D = [`${OUT}/char-r3d-mia-idle-s20263502.png`, `${OUT}/char-r3d-garen-idle-s20263501.png`];
const mode = process.argv[2];

async function bbox(buf) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let x0 = info.width, x1 = -1, y0 = info.height, y1 = -1, n = 0;
  for (let y = 0; y < info.height; y += 1) for (let x = 0; x < info.width; x += 1) if (data[(y * info.width + x) * 4 + 3] > 40) { n += 1; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  const corners = [[2, 2], [info.width - 3, 2], [2, info.height - 3], [info.width - 3, info.height - 3]].filter(([x, y]) => data[(y * info.width + x) * 4 + 3] > 200).length;
  return { x0, y0, w: x1 - x0 + 1, h: y1 - y0 + 1, frac: n / (info.width * info.height), corners, empty: x1 < 0 };
}
const baseCell = (ally, i) => sharp(`${FR}/${ally}.webp`).extract({ left: i * CW, top: 0, width: CW, height: CH }).png().toBuffer();

if (mode === "split") {
  const jobs = [];
  for (const [id, ally, rgb, b, sat, prompt] of SKINS) {
    for (let i = 0; i < N; i += 1) {
      const rec = await outfitRecolor(await baseCell(ally, i), rgb, b, sat);
      writeFileSync(`${OUT}/skin-rec-${id}-${i}.png`, rec);
      // 정사각 패딩(1024 정사각으로 늘어나 납작해지지 않게)
      await sharp({ create: { width: CW, height: CW, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite([{ input: rec, left: 0, top: Math.round((CW - CH) / 2) }]).png().toFile(`${OUT}/skin-src-${id}-${i}.png`);
      jobs.push({ file: `${OUT}/skin-src-${id}-${i}.png`, out: `skin-r3d-${id}-${i}`, prompt: `${prompt}, same pose, facing right`, strength: 0.55, seed: SEED, ip: 0.3, refs: REFS3D });
    }
    console.log("split", id);
  }
  writeFileSync("art-gen/skin-jobs.json", JSON.stringify(jobs, null, 1));
  console.log("jobs", jobs.length);
} else if (mode === "jobs2") {
  const redo = new Set(process.argv.slice(3));
  const jobs = [];
  for (const [id, ally, rgb, b, sat, prompt] of SKINS) {
    const p = `${prompt}, same pose, facing right`;
    const square = async (i) => {
      const rec = await outfitRecolor(await baseCell(ally, i), rgb, b, sat);
      const file = `${OUT}/skin-src2-${id}-${i}.png`;
      await sharp({ create: { width: CW, height: CW, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite([{ input: rec, left: 0, top: Math.round((CW - CH) / 2) }]).png().toFile(file);
      return file;
    };
    if (redo.has(id)) jobs.push({ file: await square(0), out: `skin-r3d2-${id}-0`, prompt: p, strength: 0.6, seed: SEED, ip: 0.3, refs: REFS3D });
    const ref0 = redo.has(id) ? `${OUT}/skin-r3d2-${id}-0-s${SEED}.png` : `${OUT}/skin-r3d-${id}-0-s${SEED}.png`;
    for (let i = 1; i < N; i += 1) {
      const file = redo.has(id) ? await square(i) : `${OUT}/skin-src-${id}-${i}.png`;
      jobs.push({ file, out: `skin-r3d2-${id}-${i}`, prompt: p, strength: redo.has(id) ? 0.6 : 0.55, seed: SEED, ip: 0.5, refs: [ref0] });
    }
  }
  writeFileSync("art-gen/skin-jobs2.json", JSON.stringify(jobs, null, 1));
  console.log("jobs2", jobs.length, "redo", [...redo].join(","));
} else if (mode === "assemble") {
  mkdirSync(AUTH, { recursive: true });
  const done = [];
  for (const [id, ally] of SKINS) {
    const comps = [], used = [];
    for (let i = 0; i < N; i += 1) {
      const ob = await bbox(await baseCell(ally, i));
      const gen2 = `${OUT}/skin-r3d2-${id}-${i}-s${SEED}.png`;
      const gen = existsSync(gen2) ? gen2 : `${OUT}/skin-r3d-${id}-${i}-s${SEED}.png`;   // 2차(0칸 참조)가 있으면 그것
      let src = existsSync(gen) ? gen : null;
      if (src) {
        const gb = await bbox(src);
        const ratio = (gb.h / gb.w) / (ob.h / ob.w);
        if (gb.empty || gb.corners > 0 || gb.frac < 0.03 || ratio > 1.3 || ratio < 0.7) { console.log("  대신(색만)", id, i, JSON.stringify({ c: gb.corners, f: +gb.frac.toFixed(3), r: +ratio.toFixed(2) })); src = null; }
      }
      const file = src ?? `${OUT}/skin-rec-${id}-${i}.png`;
      used.push(src ? "3d" : "rec");
      const sb = await bbox(file);
      const cut = await sharp(file).extract({ left: sb.x0, top: sb.y0, width: sb.w, height: sb.h }).png().toBuffer();
      // 원래 동료 그림 상자 높이·바닥·가운데에 맞춘다 (가로가 칸을 넘으면 칸 폭에 맞춰 줄인다)
      let rh = ob.h, rw = Math.round(sb.w * (ob.h / sb.h));
      if (rw > CW - 4) { rw = CW - 4; rh = Math.round(sb.h * (rw / sb.w)); }
      const fitted = await sharp(cut).resize(rw, rh).png().toBuffer();
      const left = Math.max(0, Math.min(CW - rw, Math.round(ob.x0 + ob.w / 2 - rw / 2)));
      comps.push({ input: fitted, left: i * CW + left, top: ob.y0 + ob.h - rh });
    }
    const strip = await sharp({ create: { width: CW * N, height: CH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite(comps).png().toBuffer();
    await sharp(strip).webp({ quality: 88, alphaQuality: 92 }).toFile(`${FR}/${id}.webp`);
    // 아틀라스 4칸 = 상태 0 대기 · 1 예비(공격0) · 2 타격(공격2) · 3 피격 — SpriteArt allyFrameFor 순서
    const pick = [0, 4, 6, 8];
    const row = [];
    for (const [k, i] of pick.entries()) row.push({ input: await sharp(strip).extract({ left: i * CW, top: 0, width: CW, height: CH }).png().toBuffer(), left: k * CW, top: 0 });
    await sharp(await sharp({ create: { width: CW * 4, height: CH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite(row).png().toBuffer()).resize(1254, 239, { fit: "fill" }).png().toFile(`${AUTH}/${id}-row.png`);
    done.push(id);
    console.log("skin", id, used.join(" "));
  }
  writeFileSync("src/titans/skinFrameSets.ts", `/** 3D 프레임 띠가 있는 동료 스킨 — scripts/build-skin-frames.mjs 가 쓴다 (손대지 말 것) */\nexport const SKIN_FRAME_SET: readonly string[] = ${JSON.stringify(done.sort())};\n`);
  console.log("skins", done.length);
} else {
  console.log("usage: node scripts/build-skin-frames.mjs split|assemble");
}
