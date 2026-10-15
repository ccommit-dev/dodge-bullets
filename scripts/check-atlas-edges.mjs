/**
 * 아틀라스·몬스터 그림의 "끝부분 잘림" 검사 (2026-10-15, 사용자: "리소스 애니메이션 끝부분 … 부족").
 *   node scripts/check-atlas-edges.mjs
 * 동료 아틀라스(행 × 4칸: 대기·이동·공격·피격)는 칸마다, 몬스터 그림(대기·피격·처치)은 한 장마다 가장자리 2px 띠에 불투명 픽셀이 있으면
 * 칸 경계에서 그림이 잘린 것이다(무기 끝·꼬리·귀). 칸 안쪽 여백이 4px 미만인 것도 경고.
 */
import sharp from "sharp";
import { readdirSync, existsSync } from "node:fs";

const ALLY = [
  ["public/titans/generated/allies/ally-animation-atlas-v1.png", 4, 6],
  ["public/titans/generated/allies/ally-variant-atlas-v1.png", 4, 12],
  ["public/titans/generated/allies/ally-skin-atlas-v1.png", 4, 13],
  ["public/titans/generated/allies/ally-special-animation-atlas-v1.png", 4, 4],
];
const STATES = ["idle", "run", "attack", "hit"];
const results = [];
async function cellEdges(file, cols, rows) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const cw = info.width / cols, ch = info.height / rows;
  for (let r = 0; r < rows; r += 1) for (let c = 0; c < cols; c += 1) {
    const x0 = Math.round(c * cw), y0 = Math.round(r * ch), x1 = Math.round((c + 1) * cw) - 1, y1 = Math.round((r + 1) * ch) - 1;
    let touch = 0, any = 0;
    for (let y = y0; y <= y1; y += 1) for (let x = x0; x <= x1; x += 1) {
      const a = data[(y * info.width + x) * 4 + 3]; if (a <= 40) continue; any += 1;
      if (x - x0 < 2 || x1 - x < 2 || y - y0 < 2) touch += 1;   // 아래(발 바닥)는 닿아도 된다
    }
    if (any > 50 && touch > 6) results.push({ file: file.split("/").pop(), row: r, state: STATES[c] ?? c, touch });
  }
}
for (const [f, cols, rows] of ALLY) if (existsSync(f)) await cellEdges(f, cols, rows);
const MON = "public/titans/generated/monsters";
for (const f of readdirSync(MON).filter((x) => x.endsWith(".png"))) await cellEdges(`${MON}/${f}`, 1, 1);
const byFile = new Map(); for (const r of results) { const k = r.file; byFile.set(k, (byFile.get(k) ?? 0) + 1); }
for (const r of results.slice(0, 60)) console.log("EDGE", r.file, "row", r.row, r.state, "px", r.touch);
console.log("\n" + [...byFile].map(([k, v]) => `${k}: ${v}`).join("\n"));
console.log(results.length ? `\n${results.length} 칸 잘림` : "\n잘림 0");
process.exit(results.length ? 1 : 0);
