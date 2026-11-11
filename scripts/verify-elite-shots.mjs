// 댐 방어전 정예 사격 (2026-11-11, game/arrows.ts monsterShot*) — 같은 시드로 켜고 끈 판을 견준다.  node scripts/verify-elite-shots.mjs
// 볼 것: ① 2장(11스테이지)부터 실제로 쏜다 ② 자동 사격이 상당수를 떨어뜨린다(피할지 쏠지 고를 거리) ③ 클리어 · 방어막 최저가 크게 흔들리지 않는다
import { simulateStage, api } from "./dodge-sim.mjs";
const AR = api.AR;
let fails = 0;
const ok = (name, cond, detail = "") => { console.log(`${cond ? "PASS" : "FAIL"} ${name}${detail ? " — " + detail : ""}`); if (!cond) fails += 1; };
const SEEDS = [7919, 15838, 23757, 31676, 39595, 47514];
const run = (stage, on) => {
  const orig = AR.TUNING.monsterShotFromStage;
  if (!on) AR.TUNING.monsterShotFromStage = 999;
  const rs = SEEDS.map((seed) => simulateStage(stage, seed + stage * 31));
  AR.TUNING.monsterShotFromStage = orig;
  return { clear: rs.filter((r) => r.clear).length, min: rs.reduce((s, r) => s + r.barrierMinRatio, 0) / rs.length, shots: rs.reduce((s, r) => s + r.eliteShots, 0) / rs.length, hits: rs.reduce((s, r) => s + r.eliteHits, 0) / rs.length };
};
const early = run(8, true);
ok("1장(9스테이지)엔 쏘지 않는다", early.shots === 0, String(early.shots));
const rows = [10, 14, 19, 29, 39, 49].map((s) => ({ s, on: run(s, true), off: run(s, false) }));
for (const r of rows) console.log(`  S${r.s + 1}: 쏜 탄 ${r.on.shots.toFixed(1)} · 방어막에 맞음 ${r.on.hits.toFixed(1)} · 클리어 ${r.off.clear}→${r.on.clear}/6 · 방어막 최저 ${(r.off.min * 100).toFixed(0)}→${(r.on.min * 100).toFixed(0)}%`);
ok("2장부터 판마다 쏜다(평균 1발 이상, 11스테이지는 정예가 드물어 뺀다)", rows.slice(1).every((r) => r.on.shots >= 1), rows.map((r) => r.on.shots.toFixed(1)).join(" "));
const shot = rows.reduce((s, r) => s + r.on.shots, 0), hit = rows.reduce((s, r) => s + r.on.hits, 0);
ok("절반 이상은 맞기 전에 떨어진다", hit / Math.max(1, shot) <= 0.5, `${(100 * hit / Math.max(1, shot)).toFixed(0)}% 가 방어막에`);
ok("클리어는 1판 넘게 줄지 않는다", rows.every((r) => r.off.clear - r.on.clear <= 1), rows.map((r) => `${r.off.clear}→${r.on.clear}`).join(" "));
ok("방어막 최저는 15%p 넘게 내려가지 않는다", rows.every((r) => r.off.min - r.on.min <= 0.15), rows.map((r) => `${(100 * (r.off.min - r.on.min)).toFixed(0)}`).join(" "));
console.log(fails ? `\n${fails}건 실패` : "\n모두 통과");
process.exit(fails ? 1 : 0);
