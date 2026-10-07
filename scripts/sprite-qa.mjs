/**
 * 생성 원화 QA · 시드 자동 선택 (2026-10-07) — pixcel-studio(NX Pixel) 의 연결 성분·QA 지표를 빌려
 * "한 마리인가 · 충분히 큰가 · 가장자리에 잘렸나 · 흐릿한가" 를 수치로 재서 후보 중 최선을 고른다.
 * 그동안 시드 2~3개를 시트로 눈으로 골랐다(정찰 비버 3마리 · 흐릿한 세라 같은 실패가 그래서 늦게 잡혔다).
 *
 *   node scripts/sprite-qa.mjs <png...> [--pick <dest.png>] [--json]
 * 점수(0~100): 최대 성분 비중 55 · 피사체 크기 25 · 가장자리 미접촉 10 · 불투명 비율(흐림 아님) 10. 60 미만이면 PASS 아님.
 */
import sharp from "sharp";
import { copyFileSync } from "node:fs";
import { connectedComponents, projectAlpha, smoothProfile, posePeaks } from "file:///D:/aiContext/pixcel-studio/src/core/segment.js";
import { edgeAlphaCount, alphaNonzeroCount } from "file:///D:/aiContext/pixcel-studio/src/core/qa.js";

const args = process.argv.slice(2);
const pickIdx = args.indexOf("--pick");
const pickDest = pickIdx >= 0 ? args[pickIdx + 1] : null;
const json = args.includes("--json");
const files = args.filter((a, i) => !a.startsWith("--") && !(pickIdx >= 0 && i === pickIdx + 1));
if (!files.length) { console.error("usage: sprite-qa.mjs <png...> [--pick dest] [--json]"); process.exit(2); }

export async function qaScore(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const pix = { width: info.width, height: info.height, data: new Uint8ClampedArray(data.buffer, data.byteOffset, data.length) };
  const total = pix.width * pix.height;
  const comps = connectedComponents(pix, 24).filter((c) => c.area >= total * 0.002).sort((a, b) => b.area - a.area);
  const nonzero = alphaNonzeroCount(pix);
  let solid = 0;
  for (let i = 3; i < pix.data.length; i += 4) if (pix.data[i] >= 128) solid += 1;
  const largest = comps[0]?.area ?? 0;
  const sum = comps.reduce((s, c) => s + c.area, 0) || 1;
  // 붙어 있는 여러 마리는 한 성분이라 성분 수로 못 잡는다(정찰 비버 3마리가 99점) — 세로 알파 투영의 봉우리 수(NX Pixel posePeaks)로 센다
  const profile = smoothProfile(projectAlpha(pix), Math.max(3, Math.round(pix.width * 0.02)));
  const bb = comps[0]?.bbox ?? [0, 0, pix.width, 0];
  // 가로로 늘어선 여러 마리는 세로 투영, 위아래로 겹친 여러 마리는 행 투영으로 — 둘 중 큰 봉우리 수
  const rowProfile = new Array(pix.height).fill(0);
  for (let y = 0; y < pix.height; y += 1) for (let x = 0; x < pix.width; x += 1) rowProfile[y] += pix.data[(y * pix.width + x) * 4 + 3];
  const rowSmooth = smoothProfile(rowProfile, Math.max(3, Math.round(pix.height * 0.02)));
  const peaks = comps.length ? Math.max(posePeaks(profile, bb[0], bb[2]).length, posePeaks(rowSmooth, bb[1], bb[3]).length) : 0;
  const share = (largest / sum) / Math.max(1, peaks);   // 1 = 한 덩어리 · 한 봉우리
  const size = largest / total;                      // 피사체 크기
  const edge = edgeAlphaCount(pix, 2) / Math.max(1, nonzero);   // 가장자리에 걸린 비율
  const opaque = nonzero ? solid / nonzero : 0;      // 흐릿(반투명)하면 낮다
  const raw = Math.round(55 * share + 25 * Math.min(1, size / 0.25) + 10 * (edge < 0.01 ? 1 : edge < 0.05 ? 0.5 : 0) + 10 * Math.min(1, opaque / 0.85));
  // 배경 상자가 남은 그림(흰/미색 판 위의 캐릭터)은 최대 성분이 bbox 를 거의 꽉 채운다 — 캐릭터 실루엣은 bbox 의 45~70%
  const bboxArea = comps.length ? (bb[2] - bb[0]) * (bb[3] - bb[1]) : 1;
  const boxiness = largest / Math.max(1, bboxArea);
  let score = opaque < 0.35 ? Math.min(raw, 40) : raw;   // 반투명 유령(세라 1차 0.03)은 무조건 탈락
  if (boxiness > 0.82) score = Math.min(score, 40);        // 배경 판 잔존(엠버·루나 3차)
  return { file, score, share: +share.toFixed(3), peaks, size: +size.toFixed(3), comps: comps.length, edge: +edge.toFixed(3), opaque: +opaque.toFixed(3), box: +boxiness.toFixed(2) };
}

const results = [];
for (const f of files) results.push(await qaScore(f));
results.sort((a, b) => b.score - a.score || b.size - a.size);   // 동점이면 큰 피사체
if (json) console.log(JSON.stringify(results));
else for (const r of results) console.log(`${String(r.score).padStart(3)} ${r.score >= 60 ? "PASS" : "FAIL"} share ${r.share} peaks ${r.peaks} size ${r.size} comps ${r.comps} edge ${r.edge} opaque ${r.opaque}  ${r.file}`);
if (pickDest) { copyFileSync(results[0].file, pickDest); console.log("picked", results[0].file, "→", pickDest); }
