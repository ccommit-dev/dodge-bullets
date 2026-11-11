// 댐 방어전 동료 출격 (2026-11-11, game/supportAlly.ts) — 같은 시드로 데려간 판 / 안 데려간 판을 견준다.  node scripts/verify-support-ally.mjs
// 볼 것: ① 실제로 쏜다(판당 여러 발) ② 안 고르면 아무것도 안 바뀐다 ③ 장 대장 벽(8스테이지 덜 자란 계정 · 40 · 50 대장)은 그대로 막힌다 — 동료는 대장을 못 깎는다
//        ④ 덜 자란 계정의 웨이브는 돕는다(15스테이지 클리어가 줄지 않는다). 2026-11-11 실측: 15스테이지 0→4판 · 25 · 40 · 50 은 0→0
import { simulateStage, profileFor } from "./dodge-sim.mjs";
let fails = 0;
const ok = (name, cond, detail = "") => { console.log(`${cond ? "PASS" : "FAIL"} ${name}${detail ? " — " + detail : ""}`); if (!cond) fails += 1; };
const SEEDS = [7919, 15838, 23757, 31676, 39595];
// 8스테이지 덜 자란 계정(profileFor lag 8) — 다 자란 계정은 이미 다 깨서 도움이 안 보인다
const run = (stage, ally) => {
  const prof = profileFor(stage, 8);
  const rs = SEEDS.map((seed) => simulateStage(stage, seed + stage * 31, ally ? { supportAlly: ally, profile: prof } : { profile: prof }));
  return { clear: rs.filter((r) => r.clear).length, min: rs.reduce((s, r) => s + r.barrierMinRatio, 0) / rs.length, shots: rs.reduce((s, r) => s + (r.supportShots ?? 0), 0) / rs.length };
};
const STAGES = [14, 24, 39, 49];
const mid = { rarity: "SR", stars: 2, element: "fire" }, top = { rarity: "LR", stars: 5, element: "water" };
const rows = STAGES.map((s) => ({ s, none: run(s, null), mid: run(s, mid), top: run(s, top) }));
for (const r of rows) console.log(`  S${r.s + 1}: 쏜 수 SR ${r.mid.shots.toFixed(0)} · 클리어 ${r.none.clear}→${r.mid.clear}(SR)→${r.top.clear}(LR★5)/5 · 방어막 최저 ${(r.none.min * 100).toFixed(0)}→${(r.mid.min * 100).toFixed(0)}→${(r.top.min * 100).toFixed(0)}%`);
ok("데려가면 판마다 여러 발 쏜다", rows.every((r) => r.mid.shots >= 10), rows.map((r) => r.mid.shots.toFixed(0)).join(" "));
ok("안 데려가면 쏘지 않는다", rows.every((r) => r.none.shots === 0));
const wall = rows.filter((r) => r.s === 39 || r.s === 49);
ok("장 대장 벽(40 · 50)은 그대로 — SR★2 · LR★5 를 데려가도 클리어가 늘지 않는다", wall.every((r) => r.mid.clear <= r.none.clear && r.top.clear <= r.none.clear), wall.map((r) => `${r.none.clear}→${r.mid.clear}/${r.top.clear}`).join(" "));
const early = rows.find((r) => r.s === 14);
ok("덜 자란 계정의 웨이브는 돕는다(15스테이지 클리어 · 방어막이 줄지 않는다)", early.mid.clear >= early.none.clear && early.mid.min >= early.none.min, `${early.none.clear}→${early.mid.clear} · ${(early.none.min * 100).toFixed(0)}→${(early.mid.min * 100).toFixed(0)}%`);
console.log(fails ? `\n${fails}건 실패` : "\n모두 통과");
process.exit(fails ? 1 : 0);
