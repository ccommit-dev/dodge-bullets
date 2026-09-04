/**
 * 에셋 용량 정리 (아트 점검 4순위) — 화질 손실을 표시 크기 기준으로 억제하면서 배포 용량을 줄인다.
 *
 *   1. 지역 보스·황금 몬스터 "clean" 원본(1254²·1536×1024)을 긴 변 512로 축소 — 전장 표시 112px(3x DPR 336px)에 충분
 *   2. 150KB 이상 PNG를 팔레트(256색, libimagequant quality 90) PNG로 재인코딩 — 아틀라스 2MB → 250KB 수준
 *      (그라데이션 손실은 86px 표시에서 보이지 않는다. 원본은 git 이력에 있다)
 *   3. UI 콘텐츠 아이콘 스프라이트(1774×887, 표시 38px)를 절반으로 축소
 *
 * 생성 스크립트(make-*.mjs)를 다시 돌린 뒤에는 이 스크립트도 다시 돌린다 — 생성물은 비팔레트 PNG다.
 *
 *   node scripts/optimize-assets.mjs
 */
import sharp from "sharp";
import { readdirSync, statSync, renameSync, unlinkSync } from "node:fs";
import { join } from "node:path";

const PUBLIC = "public";
const MIN_KB = 150;
const BOSS_MAX = 512;

const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]));
const kb = (f) => Math.round(statSync(f).size / 1024);

let before = 0;
let after = 0;

// 1. 보스 원본 축소 (hit/defeat 파생은 make-monster-states.mjs가 이 원본에서 다시 만든다)
for (const f of walk(join(PUBLIC, "titans/generated/monsters")).filter((f) => /-clean\.png$/.test(f))) {
  const m = await sharp(f).metadata();
  if (Math.max(m.width, m.height) <= BOSS_MAX) continue;
  const b = kb(f);
  const tmp = f + ".tmp";
  await sharp(f).resize({ width: BOSS_MAX, height: BOSS_MAX, fit: "inside" }).png({ compressionLevel: 9 }).toFile(tmp);
  renameSync(tmp, f);
  console.log(`boss ${f.split(/[\\/]/).pop()} ${m.width}x${m.height} → ≤${BOSS_MAX} (${b}KB → ${kb(f)}KB)`);
}

// 3. UI 스프라이트 축소 (표시 38px, 셀 443px → 221px: 3x DPR에도 2배 여유)
{
  const f = join(PUBLIC, "ui/content-icons/content-sprite-v1.png");
  const m = await sharp(f).metadata();
  if (m.width > 1000) {
    const b = kb(f);
    const tmp = f + ".tmp";
    await sharp(f).resize({ width: Math.round(m.width / 2) }).png({ compressionLevel: 9 }).toFile(tmp);
    renameSync(tmp, f);
    console.log(`ui sprite ${m.width} → ${Math.round(m.width / 2)} (${b}KB → ${kb(f)}KB)`);
  }
}

// 2. 팔레트 재인코딩 — 크기가 줄 때만 교체
for (const f of walk(PUBLIC).filter((f) => /\.png$/i.test(f) && kb(f) >= MIN_KB)) {
  const b = kb(f);
  before += b;
  const tmp = f + ".tmp";
  await sharp(f).png({ compressionLevel: 9, palette: true, quality: 90, effort: 7 }).toFile(tmp);
  if (kb(tmp) < b) {
    unlinkSync(f);
    renameSync(tmp, f);
  } else {
    unlinkSync(tmp);
  }
  after += kb(f);
  console.log(`png ${f.replace(/\\/g, "/").replace(/^public\//, "")} ${b}KB → ${kb(f)}KB`);
}
console.log(`\n≥${MIN_KB}KB PNG 합계: ${Math.round(before / 1024)}MB → ${Math.round(after / 1024)}MB`);
