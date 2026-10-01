// 방어막 모델 스윕 — TUNING 표를 바꿔 가며 게이트 수치(S1·S2·S4 단독, 풀런 곡선)를 찍는다. CURVE=0 이면 단독 게이트만
//   node scripts/sweep-barrier.mjs '{"monsterSpeedMul":0.6,"basicCooldown":0.6}' [...]
import { simulateStage, runCurve, api } from "./dodge-sim.mjs";
const T = api.AR.TUNING;
const base = { ...T };
const configs = process.argv.slice(2).map((s) => JSON.parse(s));
if (configs.length === 0) configs.push({});
const gate = (stage) => { const runs = [1, 2, 3, 4, 5].map((seed) => simulateStage(stage, seed * 7919 + stage, { skills: { fire: 1 }, weapon: "bow" })); return { clear: runs.filter((r) => r.clear).length, hits: +(runs.reduce((s, r) => s + r.hits, 0) / 5).toFixed(1), breaks: +(runs.reduce((s, r) => s + r.barrierBreaks, 0) / 5).toFixed(1), min: Math.round(runs.reduce((s, r) => s + r.barrierMin, 0) / 5) }; };
for (const c of configs) {
  Object.assign(T, base, c);
  const t0 = Date.now();
  const s1 = gate(0), s2 = gate(1), s4 = gate(3);
  const line = (r) => `S1 ${r.clearS1} S2 ${r.clearS2} S3 ${r.clearS3} S4 ${r.clearS4}`;
  const curve = process.env.CURVE === "0" ? [] : runCurve(20);
  console.log(JSON.stringify(c), `| S1 ${s1.clear}/5 h${s1.hits} b${s1.breaks} m${s1.min} | S2 ${s2.clear}/5 h${s2.hits} b${s2.breaks} m${s2.min} | S4 ${s4.clear}/5 h${s4.hits} b${s4.breaks} m${s4.min} |`, curve.map((r) => `${r.tier}: ${line(r)}`).join(" | "), `(${((Date.now() - t0) / 1000).toFixed(0)}s)`);
}
