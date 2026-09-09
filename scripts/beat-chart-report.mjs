/**
 * 비트 채보 플레이 가능성 리포트 — 곡 × 난이도별 초당 노트(NPS)·최소 간격·롱노트·드릴 수.
 *   node scripts/beat-chart-report.mjs [--json]
 * 귀로 확인하는 대신 손이 따라갈 수 있는지를 수치로 본다: 최소 간격 ≥ 85ms, 레벨 1~2 NPS 0.8~2.6, 레벨 9~10 NPS ≤ 5.4.
 * verify-content.mjs 가 같은 규칙을 게이트로 건다.
 */
import { build } from "esbuild";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd().replace(/\\/g, "/");
const dir = mkdtempSync(join(tmpdir(), "beatreport-"));
const entry = join(dir, "entry.ts");
writeFileSync(entry, `export * as tracks from "${root}/src/beat/tracks";`);
const out = join(dir, "bundle.mjs");
await build({ entryPoints: [entry], bundle: true, format: "esm", outfile: out, platform: "node", define: { "import.meta.env.BASE_URL": '"/"', "import.meta.env.DEV": "false", "import.meta.env.PROD": "true" } });
const { tracks } = await import(pathToFileURL(out).href);
rmSync(dir, { recursive: true, force: true });

export function chartStats(track, difficulty) {
  const t = { ...track, difficulty, subdivision: difficulty === "easy" ? 4 : difficulty === "medium" ? 8 : 16 };
  const chart = tracks.buildChart(t);
  const stepSec = tracks.stepDurationSec(t);
  const times = [];
  let holds = 0, drills = 0, run = 0, prev = null;
  for (let i = 0; i < chart.length; i += 1) {
    const st = chart[i];
    if (st.hold) holds += 1;
    if (st.spike) { times.push(i * stepSec); if (prev === i - 1 && st.sound === chart[i - 1].sound) { run += 1; if (run === 2) drills += 1; } else run = 0; prev = i; }
  }
  let minGap = Infinity;
  for (let i = 1; i < times.length; i += 1) minGap = Math.min(minGap, times[i] - times[i - 1]);
  const durationSec = chart.length * stepSec;
  return { id: track.id, difficulty, level: tracks.effectiveLevel(t), bpm: track.bpm, notes: times.length, nps: times.length / durationSec, minGapMs: Number.isFinite(minGap) ? minGap * 1000 : 0, holds, drills, stepMs: stepSec * 1000 };
}

export function playability(stat) {
  const issues = [];
  if (stat.notes > 1 && stat.minGapMs < 85) issues.push(`간격 ${stat.minGapMs.toFixed(0)}ms < 85`);
  if (stat.level <= 2 && (stat.nps < 0.8 || stat.nps > 2.6)) issues.push(`레벨 ${stat.level} NPS ${stat.nps.toFixed(2)} (0.8~2.6)`);
  if (stat.level >= 9 && stat.nps > 5.4) issues.push(`레벨 ${stat.level} NPS ${stat.nps.toFixed(2)} > 5.4`);
  if (stat.level >= 3 && stat.holds === 0) issues.push("레벨 3+ 롱노트 없음");
  return issues;
}

export function allStats() {
  const rows = [];
  for (const track of tracks.BEAT_TRACKS) for (const d of ["easy", "medium", "hard"]) rows.push(chartStats(track, d));
  return rows;
}

const isMain = !!process.argv[1] && process.argv[1].endsWith("beat-chart-report.mjs");
if (isMain) {
  const rows = allStats();
  if (process.argv.includes("--json")) console.log(JSON.stringify(rows));
  else {
    console.log("| 곡 | 변형 | Lv | BPM | 노트 | NPS | 최소 간격 | 롱노트 | 드릴 | 문제 |");
    console.log("|---|---|---|---|---|---|---|---|---|---|");
    for (const r of rows) console.log(`| ${r.id} | ${r.difficulty} | ${r.level} | ${r.bpm} | ${r.notes} | ${r.nps.toFixed(2)} | ${r.minGapMs.toFixed(0)}ms | ${r.holds} | ${r.drills} | ${playability(r).join(" · ")} |`);
  }
}
