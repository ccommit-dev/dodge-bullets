/**
 * 비트 곡 전개 실측 (2026-11-11, 비트 아쉬운 점 3번 "곡 하이라이트가 아닌 고정 비율 채보") — 오디오 음량 곡선에서 구간 경계를 뽑는다.
 *   node scripts/beat-sections.mjs           (ffmpeg 필요 · 없으면 건너뜀) — 표를 찍고 src/beat/tracks.ts TRACK_SECTION_PROFILES 가 실측과 0.06 안인지 본다(어긋나면 종료 코드 1, verify-all)
 *   node scripts/beat-sections.mjs --json    표 끝에 실측값 JSON — 곡을 바꾸면 이걸로 표를 다시 채운다
 *
 * 채보가 덮는 구간(오프셋 ~ 마디 수 × 240/BPM 초)을 마디 단위 RMS 로 재고 3마디 이동 평균을 낸 뒤:
 *  1차 하이라이트 = 곡에서 가장 큰 28% 창(첫 12% 제외) · 인트로 끝 = 처음으로 최고의 50% 에 닿는 마디(최소 10% · 하이라이트 6% 전까지)
 *  브레이크 끝 = 마지막 하이라이트가 1차와 합쳐 약 50% 가 되게 — 하이라이트 양은 예전 설계 그대로, 자리만 곡을 따른다
 */
import { build } from "esbuild";
import { mkdtempSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";

try { execFileSync("ffmpeg", ["-version"], { stdio: "ignore" }); } catch { console.log("ffmpeg 없음 — 건너뜀"); process.exit(0); }
const root = process.cwd().replace(/\\/g, "/");
const dir = mkdtempSync(join(tmpdir(), "beatsec-"));
const entry = join(dir, "entry.ts");
writeFileSync(entry, `export * as T from "${root}/src/beat/tracks";`);
const out = join(dir, "bundle.mjs");
await build({ entryPoints: [entry], bundle: true, format: "esm", platform: "node", outfile: out, logLevel: "error", loader: { ".png": "empty", ".webp": "empty", ".css": "empty", ".mp3": "empty", ".m4a": "empty" }, define: { "import.meta.env.BASE_URL": '"/"', "import.meta.env.DEV": "false", "import.meta.env.PROD": "true" } });
const { T } = await import(pathToFileURL(out).href);
rmSync(dir, { recursive: true, force: true });

const SR = 8000;
const pcm = (file) => { const buf = execFileSync("ffmpeg", ["-v", "error", "-i", file, "-ac", "1", "-ar", String(SR), "-f", "f32le", "-"], { maxBuffer: 1 << 28 }); return new Float32Array(buf.buffer, buf.byteOffset, buf.length / 4); };
const r2 = (x) => Math.round(x * 100) / 100;

export function sectionsFromEnergy(e) {
  // 하이라이트 양은 설계대로(1차 하이라이트 28% + 마지막 하이라이트 → 합 약 50%) 두고 **자리**만 곡을 따른다 —
  // 음량 문턱으로 자르면 고르게 큰 곡(마스터링)은 곡의 80% 가 하이라이트가 되어 난도가 튀었다(2026-11-11 실측)
  const n = e.length;
  const sm = e.map((_, i) => { let s = 0, c = 0; for (let k = Math.max(0, i - 1); k <= Math.min(n - 1, i + 1); k += 1) { s += e[k]; c += 1; } return s / c; });
  const max = Math.max(...sm);
  const W = Math.max(3, Math.round(n * 0.28));
  // 가장 큰 W 마디 창 — 첫 12% (인트로 자리)는 건너뛴다
  let ds = Math.round(n * 0.12), best = -1;
  for (let i = Math.round(n * 0.12); i + W <= n; i += 1) { let m = 0; for (let k = i; k < i + W; k += 1) m += sm[k]; if (m > best) { best = m; ds = i; } }
  const de = ds + W;
  let intro = sm.findIndex((v) => v >= 0.5 * max);
  // 인트로는 최소 10% — 곡이 곧바로 커도 시작은 성기게(레벨 1~2 곡 초당 노트 상한, beat-chart-report)
  intro = Math.max(Math.round(n * 0.1), Math.min(intro < 0 ? Math.round(n * 0.12) : intro, ds - Math.round(n * 0.06)));
  const f = (i) => i / n;
  const dropLen = f(de) - f(ds);
  let be = Math.max(f(de) + 0.06, 1 - Math.max(0, 0.5 - dropLen));
  let p = [f(intro), f(ds), f(de), be];
  for (let k = 1; k < 4; k += 1) p[k] = Math.max(p[k], p[k - 1] + 0.04);
  return p.map((x) => r2(Math.min(1, x)));
}

const rows = [];
for (const t of T.BEAT_TRACKS) {
  const file = `public/audio/${t.audioFile}`;
  if (!existsSync(file)) { rows.push({ id: t.id, err: "오디오 없음" }); continue; }
  const s = pcm(file);
  const barSec = (240 / t.bpm);
  const off = (t.audioOffsetMs ?? 0) / 1000;
  const e = [];
  for (let b = 0; b < t.bars; b += 1) {
    const a = Math.floor((off + b * barSec) * SR), z = Math.min(s.length, Math.floor((off + (b + 1) * barSec) * SR));
    let sum = 0; for (let i = a; i < z; i += 1) sum += s[i] * s[i];
    e.push(z > a ? Math.sqrt(sum / (z - a)) : 0);
  }
  const prof = sectionsFromEnergy(e);
  rows.push({ id: t.id, bars: t.bars, now: T.TRACK_SECTION_PROFILES[t.id], measured: prof, covered: Math.min(1, s.length / SR / (off + t.bars * barSec)) });
}
let bad = 0;
for (const r of rows) {
  if (r.err) { console.log(`${r.id.padEnd(20)} ${r.err}`); continue; }
  const diff = r.measured && r.now ? Math.max(...r.measured.map((v, i) => Math.abs(v - r.now[i]))) : 1;
  if (diff > 0.06) bad += 1;
  console.log(`${r.id.padEnd(20)} ${String(r.bars).padStart(3)}마디 · 오디오 ${(r.covered * 100).toFixed(0)}% · 지금 ${JSON.stringify(r.now)} · 실측 ${JSON.stringify(r.measured)}${diff > 0.06 ? "  ← 다름" : ""}`);
}
if (process.argv.includes("--json")) console.log(JSON.stringify(Object.fromEntries(rows.filter((r) => r.measured).map((r) => [r.id, r.measured]))));
if (!process.argv.includes("--json")) { console.log(bad ? `\n${bad}곡이 실측과 0.06 넘게 다르다` : "\n모두 통과"); process.exit(bad ? 1 : 0); }
