/**
 * 변형 동료 10명 개별 PNG 생성 — 원화가 올 때까지의 임시 아트.
 *
 * 사용자 개편 이후 동료는 단일 프레임 로스터 시트(ally-roster-weaponless-v2.png)를 쓰고,
 * 변형 10명은 STANDALONE_ALLY에 등록된 파일이 없으면 원본과 완전히 같은 모습으로 나온다.
 * 이 스크립트는 원본 프레임을 tint(휘도 보존)로 파생해 public/titans/generated/allies/<id>.png 로 만든다.
 * 실제 원화가 도착하면 같은 파일명으로 덮어쓰기만 하면 된다 (SpriteArt.tsx STANDALONE_ALLY 참조).
 *
 *   node scripts/make-variant-standalone.mjs
 */
import sharp from "sharp";

const SHEET = "public/titans/generated/ally-roster-weaponless-v2.png";
const FRAMES = 6;
const FRAME_OF = { mia: 0, leon: 1, sera: 2, garen: 3, ari: 4, nox: 5 };
// 이웃 프레임 장식이 삐져나오는 프레임의 좌측 절단 비율 (make-alt-allies.mjs에서 확인)
const INSET_L = { sera: 0.155, leon: 0.07 };

const VARIANTS = [
  ["pyro", "mia", [255, 122, 72], 0.96, 1.25],
  ["marina", "sera", [96, 196, 232], 1.05, 1.1],
  ["terra", "garen", [156, 204, 112], 0.94, 1.1],
  ["zephyr", "leon", [144, 232, 184], 1.06, 1.1],
  ["bronn", "garen", [255, 140, 64], 0.84, 1.25],
  ["iris", "sera", [156, 204, 255], 1.1, 1.05],
  ["cain", "nox", [255, 228, 120], 1.06, 1.15],
  ["sylph", "sera", [172, 255, 204], 1.06, 1.1],
  ["orion", "leon", [172, 184, 255], 1.0, 1.1],
  ["ember", "ari", [255, 96, 140], 1.0, 1.2],
  // 루나·볼트 개별 PNG(클립아트풍) 교체 — 아틀라스 행과 같은 팔레트
  ["luna", "garen", [236, 228, 205], 1.12, 0.85],
  ["volt", "leon", [255, 232, 96], 1.06, 1.3],
];

const meta = await sharp(SHEET).metadata();
const frameW = Math.floor(meta.width / FRAMES);

async function frame(base) {
  const insetL = INSET_L[base] ?? 0;
  const left = Math.round(FRAME_OF[base] * frameW + frameW * insetL);
  const width = Math.round(frameW * (1 - insetL));
  const cut = await sharp(SHEET).extract({ left, top: 0, width, height: meta.height }).png().toBuffer();
  return sharp(cut).extend({ left: Math.round(frameW * insetL), background: { r: 0, g: 0, b: 0, alpha: 0 } });
}

import { existsSync as _ex } from "node:fs";
for (const [id, base, rgb, brightness, saturation] of VARIANTS) {
  if (_ex(`public/titans/generated/allies/authored/${id}-row.png`)) { console.log(`skip ${id} (authored 원화 — place-art.mjs 가 ${id}.png 를 직접 놓는다)`); continue; }
  await (await frame(base))
    .tint({ r: rgb[0], g: rgb[1], b: rgb[2] })
    .modulate({ brightness, saturation })
    .png()
    .toFile(`public/titans/generated/allies/${id}.png`);
  console.log(`generated ${id}.png <- ${base}`);
}
