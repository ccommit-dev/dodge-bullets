// 성문 방어 스윕 — 손잡이를 바꿔 가며 50 스테이지 체크포인트 곡선(기대 성장 vs 8 스테이지 덜 자란 계정)을 찍는다 (2026-10-02)
//   node scripts/sweep-barrier.mjs '{"hpMul":4}' '{"hpMul":4.5,"bossOrbDmg":10}' [...]
//   키: hpMul(skills.TUNING_HP.mul) · hpGrowth(stages.STAGE_CURVE.hpGrowth) · 나머지는 arrows.TUNING 필드
import { checkpointCurve, api } from "./dodge-sim.mjs";
const { AR, SK, stages } = api;
const base = { ...AR.TUNING };
const baseHp = SK.TUNING_HP.mul, baseGrowth = stages.STAGE_CURVE.hpGrowth;
const configs = process.argv.slice(2).map((s) => JSON.parse(s));
if (configs.length === 0) configs.push({});
for (const c of configs) {
  const { hpMul, hpGrowth, ...tuning } = c;
  Object.assign(AR.TUNING, base, tuning);
  SK.TUNING_HP.mul = hpMul ?? baseHp;
  stages.STAGE_CURVE.hpGrowth = hpGrowth ?? baseGrowth;
  for (let i = 0; i < stages.STAGES.length; i += 1) stages.STAGES[i] = stages.buildStage(i);
  const t0 = Date.now();
  const rows = checkpointCurve(Number(process.env.SEEDS ?? 5), 8);
  const under = rows.filter((r) => r.under !== null);
  console.log(JSON.stringify(c), "|", rows.map((r) => `${r.stage + 1}:${r.expected}${r.under === null ? "" : "/" + r.under}`).join(" "),
    `| 덜 자람 ${Math.round(under.reduce((s, r) => s + r.under, 0) / (under.length * 5) * 100)}% | 풀 가득 ${rows.filter((r) => r.pool).map((r) => r.stage + 1).join(",") || "없음"} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
}
