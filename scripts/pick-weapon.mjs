/**
 * 원거리 무기 후보 고르기 (2026-09-28).
 *
 *   node scripts/pick-weapon.mjs            → 후보 점수표만 출력
 *   node scripts/pick-weapon.mjs --place [--bow <file> --staff <file>]
 *                                           → 고른 후보를 public/dodge/weapons/{bow,staff}.png 로 세로 정렬해 배치
 *
 * 점수는 순위를 좁혀 줄 뿐 마지막 한 장은 눈으로 고른다 — 이미 세로로 선 후보를 고르면
 * 회전 리샘플링이 없어 선이 깨끗하다.
 *
 * prop 명령은 "single ... alone" 을 써도 무기를 **두 자루** 그려 놓는 일이 잦다. 두 자루가 서로
 * 닿아 있어 연결 성분으로도, 사각형 크롭으로도 떼어낼 수 없다 — 그래서 시드를 여러 개 돌리고
 * 여기서 한 자루짜리를 고른다.
 *
 * 판별: 알파 픽셀의 주성분(PCA) 비. 한 자루는 가늘고 길어 λ1/λ2 가 크고, 두 자루가 겹치면
 * 뭉툭해져 비가 작다. 같이 주축 각도도 나오므로 그대로 회전해 **세로로** 세운다
 * (주인공 손에 겹쳐 그리려면 대각선이 아니라 세로여야 한다).
 */
import { readdirSync } from "node:fs";
import sharp from "sharp";

const PLACE = process.argv.includes("--place");
const SRC = "art-gen/out";
const OUT_H = 200;

async function analyze(file) {
  const { data, info } = await sharp(`${SRC}/${file}`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  const pts = [];
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) if (data[(y * W + x) * 4 + 3] > 40) pts.push(x, y);
  }
  const n = pts.length / 2;
  if (n < 500) return null;
  let mx = 0, my = 0;
  for (let i = 0; i < n; i += 1) { mx += pts[i * 2]; my += pts[i * 2 + 1]; }
  mx /= n; my /= n;
  let sxx = 0, syy = 0, sxy = 0;
  for (let i = 0; i < n; i += 1) {
    const dx = pts[i * 2] - mx, dy = pts[i * 2 + 1] - my;
    sxx += dx * dx; syy += dy * dy; sxy += dx * dy;
  }
  sxx /= n; syy /= n; sxy /= n;
  const tr = sxx + syy, det = sxx * syy - sxy * sxy;
  const disc = Math.sqrt(Math.max(0, tr * tr / 4 - det));
  const l1 = tr / 2 + disc, l2 = Math.max(1e-6, tr / 2 - disc);
  // 주축 각도 (x축 기준). 이 각을 세로로 돌리면 무기가 선다.
  const angle = Math.atan2(l1 - sxx, sxy) * 180 / Math.PI;
  return { file, ratio: l1 / l2, angle, fill: n / (W * H) };
}

const files = readdirSync(SRC).filter((f) => /^prop-w-cand-/.test(f));
const rows = (await Promise.all(files.map(analyze))).filter(Boolean);
rows.sort((a, b) => b.ratio - a.ratio);
for (const r of rows) {
  console.log(`${r.ratio.toFixed(2)}  ${r.angle.toFixed(0).padStart(5)}°  fill ${(r.fill * 100).toFixed(1)}%  ${r.file}`);
}

if (!PLACE) process.exit(0);

/** 주축을 세로로 세우고, 여백을 잘라 높이 OUT_H 로 맞춰 배치한다 */
async function place(file, angle, dest) {
  const rot = 90 - angle;   // 주축을 수직(90°)으로
  const buf = await sharp(`${SRC}/${file}`)
    .rotate(rot, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .trim({ threshold: 10 })
    .resize({ height: OUT_H, fit: "inside" })
    .png()
    .toBuffer();
  await sharp(buf).toFile(dest);
  const m = await sharp(dest).metadata();
  console.log(`placed ${dest} ← ${file} (rot ${rot.toFixed(0)}°, ${m.width}×${m.height})`);
}

const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const best = (prefix) => rows.find((r) => r.file.includes(prefix));
const pick = (k, prefix) => { const f = arg(k); return f ? rows.find((r) => r.file === f) : best(prefix); };
const bow = pick("--bow", "bow"), staff = pick("--staff", "staff");
if (!bow || !staff) throw new Error("후보 없음 — art-gen/batch-dodge-weapons.sh 를 먼저 돌리세요");
await place(bow.file, bow.angle, "public/dodge/weapons/bow.png");
await place(staff.file, staff.angle, "public/dodge/weapons/staff.png");
