/**
 * 강화 검 후보 선별 — art-gen/out/prop-cand-<tier>-<seed>.png 중 "검 한 자루"인 것을 고른다.
 *   node scripts/pick-sword-candidates.mjs           (판정만)
 *   node scripts/pick-sword-candidates.mjs --apply   (합격한 후보를 prop-<tier>.png 로 채택 → place-props.mjs 로 배치)
 * 판정: 알파 연결 성분(면적 ≥ 최대 성분의 4%) 이 1개이면 단일 무기. 두 자루가 겹쳐 붙은 경우는 잡지 못하므로 시트로 눈검사도 한다.
 */
import { copyFileSync, readdirSync } from "node:fs";
import sharp from "sharp";

const apply = process.argv.includes("--apply");
async function components(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, seen = new Uint8Array(W * H), sizes = [];
  const stack = [];
  for (let s = 0; s < W * H; s += 1) {
    if (seen[s] || data[s * 4 + 3] <= 40) continue;
    let n = 0; stack.push(s); seen[s] = 1;
    while (stack.length) {
      const i = stack.pop(); n += 1; const x = i % W, y = (i - x) / W;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const j = ny * W + nx; if (!seen[j] && data[j * 4 + 3] > 40) { seen[j] = 1; stack.push(j); } }
    }
    sizes.push(n);
  }
  sizes.sort((a, b) => b - a);
  return sizes.filter((n) => n >= sizes[0] * 0.04).length;
}
const byTier = {};
for (const f of readdirSync("art-gen/out").filter((f) => /^prop-cand-s\d\d-\d+\.png$/.test(f))) {
  const [, tier, seed] = f.match(/^prop-cand-(s\d\d)-(\d+)\.png$/);
  const n = await components(`art-gen/out/${f}`);
  (byTier[tier] ??= []).push({ f, seed, n });
  console.log(f, "components", n);
}
for (const [tier, list] of Object.entries(byTier)) {
  const ok = list.filter((c) => c.n === 1);
  console.log(tier, ok.length ? `단일 후보: ${ok.map((c) => c.seed).join(", ")}` : "단일 후보 없음");
  if (apply && ok.length) { copyFileSync(`art-gen/out/${ok[0].f}`, `art-gen/out/prop-${tier}.png`); console.log("채택", tier, "←", ok[0].seed); }
}
