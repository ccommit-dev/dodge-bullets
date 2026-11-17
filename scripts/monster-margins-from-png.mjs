#!/usr/bin/env node
/**
 * SpriteArt.tsx MONSTER_VISIBLE_MARGIN(몬스터 그림의 좌/우 투명 여백 비율)을 지금 PNG 로 다시 잰다
 * (2026-11-17 몬스터 · 대장 그림결 2판 — 옛 표는 2026-10-07 비버 테마 원화 실측이라 새 몸 폭과 달랐다).
 * 근접 동료 · 주인공이 몬스터의 '보이는' 몸 가장자리에 붙을 때 이 값을 쓴다. 표의 키 순서는 그대로 두고 값만 바꾼다.
 *   node scripts/monster-margins-from-png.mjs        (바꾼 값만 찍고 파일을 고친다)
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import sharp from "sharp";

const FILE = "src/titans/SpriteArt.tsx";
const src = readFileSync(FILE, "utf8");
const m = src.match(/const MONSTER_VISIBLE_MARGIN: Record<string, \[number, number\]> = \{([\s\S]*?)\n\};/);
if (!m) throw new Error("MONSTER_VISIBLE_MARGIN 표를 못 찾음");
const body = m[1];
const keys = [...body.matchAll(/(?:"([^"]+)"|([a-z][\w-]*)):\s*\[[\d.]+,\s*[\d.]+\]/g)].map((x) => x[1] ?? x[2]);

/** 사냥터 전장은 애니메이션 시트(대기 첫 칸, 384²)를 그린다 — 있으면 그 칸으로, 없으면 PNG 로 잰다 */
async function margins(path) {
  const sheet = path.replace("generated/monsters/", "anim/monsters/").replace(/.png$/, ".webp");
  const input = existsSync(sheet) ? await sharp(sheet).extract({ left: 0, top: 0, width: 384, height: 384 }).png().toBuffer() : path;
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let x0 = info.width, x1 = -1;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) if (data[(y * info.width + x) * 4 + 3] > 24) { if (x < x0) x0 = x; if (x > x1) x1 = x; }
  return [x0 / info.width, (info.width - 1 - x1) / info.width];
}

// 오른쪽을 보게 렌더한 종(FLIP_MONSTERS)은 화면에서 뒤집힌다 — 좌우를 바꿔 넣는다
const flip = new Set([...(src.match(/const FLIP_MONSTERS = new Set<string>\(\[([^\]]*)\]/)?.[1] ?? "").matchAll(/"([^"]+)"/g)].map((x) => x[1]));
let out = body;
for (const k of keys) {
  const png = `public/titans/generated/monsters/${k}.png`;
  if (!existsSync(png)) continue;
  let [l, r] = (await margins(png)).map((v) => Math.round(v * 100) / 100);
  if (flip.has(k)) [l, r] = [r, l];
  const re = new RegExp(`((?:"${k}"|\\b${k}):\\s*)\\[[\\d.]+,\\s*[\\d.]+\\]`);
  const before = out.match(re)?.[0];
  out = out.replace(re, `$1[${l.toFixed(2)}, ${r.toFixed(2)}]`);
  const after = out.match(re)?.[0];
  if (before !== after) console.log(k, before?.replace(/^.*?\[/, "["), "→", `[${l.toFixed(2)}, ${r.toFixed(2)}]`);
}
writeFileSync(FILE, src.replace(body, out));
console.log("margins", keys.length);
