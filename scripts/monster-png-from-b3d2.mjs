#!/usr/bin/env node
/**
 * 몬스터 정지 그림(public/titans/generated/monsters/<art>.png · -hit · -defeat)을 2판 렌더(art-gen/out/b3d2/<art>/)로 바꾼다
 * (2026-11-17 몬스터 · 대장 그림결 2판). 전투는 애니메이션 시트를 쓰지만 도감 종류 칸 · 그림 못 받을 때의 대체 · 성문 방어 미리 받기가
 * 이 PNG 를 쓴다 — 옛 원화가 남으면 화면마다 그림결이 달랐다.
 *
 * 몸 높이 · 발 바닥선 · 가로 가운데는 **옛 PNG 의 보이는 상자에 맞춘다**. 성문 방어 대장 크기(MONSTER_HD 비율, 밸런스 값)와
 * 근접 자리 계산이 옛 PNG 의 몸 상자를 기준으로 잡혀 있어서다.
 *   node scripts/monster-png-from-b3d2.mjs [art …]   (없으면 b3d2 에 렌더가 있는 몬스터 전부)
 * 쓰는 칸: 대기 idle_0 → <art>.png, 피격 hit_0 → -hit.png(붉게 물들인 칸은 조립이 하던 대로 여기서도), 쓰러짐 = 피격 칸(전장과 같은 규칙)
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import sharp from "sharp";

const SRC = "art-gen/out/b3d2", DST = "public/titans/generated/monsters";
const only = process.argv.slice(2);
const ids = (only.length ? only : readdirSync(SRC)).filter((id) => existsSync(`${SRC}/${id}/idle_0.png`) && existsSync(`${DST}/${id}.png`) && !id.startsWith("pet-") && !id.startsWith("mount-"));

async function bbox(input) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let x0 = info.width, y0 = info.height, x1 = -1, y1 = -1;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    if (data[(y * info.width + x) * 4 + 3] > 24) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  return { x0, y0, x1, y1, w: info.width, h: info.height };
}

/** 피격 번쩍임 — assemble-anim2 와 같은 식(t 0~1) */
async function flash(buf, t) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) if (data[i + 3]) { data[i] += (255 - data[i]) * 0.35 * t; data[i + 1] += (230 - data[i + 1]) * 0.14 * t; data[i + 2] += (230 - data[i + 2]) * 0.14 * t; }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}

/** 렌더 칸을 옛 PNG 의 몸 상자 높이 · 바닥 · 가운데에 앉힌다 (폭이 캔버스를 넘으면 폭에 맞춰 줄인다) */
async function place(frame, old, tint) {
  const fb = await bbox(frame);
  const crop = await sharp(frame).extract({ left: fb.x0, top: fb.y0, width: fb.x1 - fb.x0 + 1, height: fb.y1 - fb.y0 + 1 }).png().toBuffer();
  const tgtH = old.y1 - old.y0 + 1;
  let k = tgtH / (fb.y1 - fb.y0 + 1);
  const cw = (fb.x1 - fb.x0 + 1) * k;
  if (cw > old.w * 0.98) k *= (old.w * 0.98) / cw;
  const w = Math.max(1, Math.round((fb.x1 - fb.x0 + 1) * k)), h = Math.max(1, Math.round((fb.y1 - fb.y0 + 1) * k));
  let buf = await sharp(crop).resize(w, h, { kernel: "lanczos3" }).png().toBuffer();
  if (tint > 0) buf = await flash(buf, tint);
  const img = sharp(buf);
  const cx = (old.x0 + old.x1) / 2;
  const left = Math.max(0, Math.min(old.w - w, Math.round(cx - w / 2)));
  const top = Math.max(0, Math.min(old.h - h, old.y1 + 1 - h));
  return sharp({ create: { width: old.w, height: old.h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: await img.png().toBuffer(), left, top }]).png().toBuffer();
}

for (const id of ids) {
  const old = await bbox(`${DST}/${id}.png`);
  const meta = JSON.parse(readFileSync(`${SRC}/${id}/meta.json`, "utf8"));
  const hitTint = meta.actions?.hit?.[0]?.tint ?? 0;
  const idle = await place(`${SRC}/${id}/idle_0.png`, old, 0);
  const hit = await place(`${SRC}/${id}/hit_0.png`, old, hitTint);
  await sharp(idle).toFile(`${DST}/${id}.png`);
  if (existsSync(`${DST}/${id}-hit.png`)) await sharp(hit).toFile(`${DST}/${id}-hit.png`);
  if (existsSync(`${DST}/${id}-defeat.png`)) await sharp(hit).toFile(`${DST}/${id}-defeat.png`);
  if (existsSync(`${DST}/${id}-attack.png`) && existsSync(`${SRC}/${id}/attack_1.png`)) await sharp(await place(`${SRC}/${id}/attack_1.png`, old, 0)).toFile(`${DST}/${id}-attack.png`);
  console.log("png", id, `${old.x1 - old.x0 + 1}×${old.y1 - old.y0 + 1}`);
}
console.log("done", ids.length);
