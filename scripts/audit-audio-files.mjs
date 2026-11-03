/**
 * 음원 파일 음량 감사 (2026-11-03, 아쉬운 점 "소리는 귀로 확인 못 함") — ffmpeg ebur128 로 곡마다 LUFS · 트루 피크를 잰다
 *   node scripts/audit-audio-files.mjs [폴더=public/audio]      곡을 바꿀 때 사람이 돌리는 도구(ffmpeg 필요, verify-all 밖)
 * 귀로 잡는 "이 곡만 갑자기 크다 · 찌그러진다"를 숫자로 찾는다. 기준: 같은 묶음(폴더) 중앙값에서 ±4 LU 안 · 트루 피크 ≤ -0.3 dBTP
 */
import { spawnSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { join, relative, dirname } from "node:path";
const root = process.argv[2] ?? "public/audio";
const EXT = /\.(mp3|m4a|ogg|wav|aac)$/i;
const walk = (d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : EXT.test(n) ? [p] : []; });
const rows = [];
for (const f of walk(root)) {
  const r = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", f, "-filter_complex", "ebur128=peak=true", "-f", "null", "-"], { encoding: "utf8", maxBuffer: 64 << 20 });
  const tail = (r.stderr ?? "").split("Summary:").pop() ?? "";
  const lufs = Number(tail.match(/I:\s+(-?[\d.]+) LUFS/)?.[1]);
  const peak = Number(tail.match(/Peak:\s+(-?[\d.]+) dBFS/)?.[1]);
  rows.push({ f: relative(root, f).replace(/\\/g, "/"), dir: relative(root, dirname(f)).replace(/\\/g, "/") || ".", lufs, peak });
}
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s[s.length >> 1] ?? 0; };
let bad = 0;
for (const dir of [...new Set(rows.map((r) => r.dir))]) {
  const group = rows.filter((r) => r.dir === dir && Number.isFinite(r.lufs));
  const m = med(group.map((r) => r.lufs));
  console.log(`\n== ${dir} — ${group.length}개 · 중앙값 ${m.toFixed(1)} LUFS`);
  for (const r of group.sort((a, b) => b.lufs - a.lufs)) {
    const off = r.lufs - m, loud = Math.abs(off) > 4, clip = r.peak > -0.3;
    if (loud || clip) bad += 1;
    if (loud || clip || group.length <= 12) console.log(`  ${loud || clip ? "⚠" : " "} ${r.lufs.toFixed(1).padStart(6)} LUFS (${off >= 0 ? "+" : ""}${off.toFixed(1)}) · 피크 ${r.peak.toFixed(1).padStart(5)} dB  ${r.f}${loud ? " · 묶음에서 튐" : ""}${clip ? " · 깨질 수 있음" : ""}`);
  }
}
console.log(`\n총 ${rows.length}개 · 살펴볼 것 ${bad}개`);
