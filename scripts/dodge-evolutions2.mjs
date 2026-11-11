/**
 * 스킬 진화 8종 × 2갈래 (2026-11-11, game/evolutions.ts) — 같은 시드로 진화만 바꿔 클리어 · 피격 · 스킬 요격을 견준다.
 *
 *   node scripts/dodge-evolutions2.mjs            (스킬마다 진화 없음 / 갈래 A / 갈래 B, 스테이지 3 · 10 · 20)
 *
 * 볼 것: ① 갈래가 실제로 다른 결과를 낸다 ② 한 갈래가 모든 스테이지 · 모든 지표에서 이기지 않는다(무조건 상위 호환 없음)
 *        ③ 진화가 진화 없음보다 크게(클리어 +4 이상) 앞서지 않는다 — 카드 한 장이 판을 뒤집으면 밸런스가 흔들린다
 */
import { simulateStage } from "./dodge-sim.mjs";

const SEEDS = [11, 22, 33, 44, 55, 66, 77, 88, 99, 1010, 1111, 1212];
const STAGES = [3, 10, 20];
const EVOS = {
  water: ["tide", "split"], earth: ["quake", "barrage"], bolt: ["chain", "smite"], wind: ["cyclone", "gale"],
  poison: ["cloud", "venom"], holy: ["sanctum", "judgment"], shadow: ["swarm", "assassin"], meteor: ["shower", "titan"],
};
const LABEL = { tide: "해일", split: "물 분열", quake: "지진", barrage: "연발 바위", chain: "연쇄 번개", smite: "낙뢰", cyclone: "회오리", gale: "돌풍", cloud: "독 안개", venom: "맹독", sanctum: "성역", judgment: "심판", swarm: "그림자 분신", assassin: "암살", shower: "유성우", titan: "거대 운석" };

let dominated = 0, tooStrong = 0, same = 0;
for (const [skill, [a, b]] of Object.entries(EVOS)) {
  const skills = { [skill]: 5, fire: 2, ice: 2, ultimate: 4 };
  console.log(`\n── ${skill}`);
  const res = {};
  for (const evo of [null, a, b]) {
    res[evo ?? "none"] = STAGES.map((st) => {
      let clear = 0, hits = 0, kills = 0;
      for (const seed of SEEDS) {
        const r = simulateStage(st - 1, seed, { skills, weapon: "bow", mods: evo ? { evolutions: { [skill]: evo } } : {}, acquireAll: true });
        if (r.clear) clear += 1;
        hits += r.hits;
        kills += r.skillKills ?? 0;
      }
      return { clear, hits: hits / SEEDS.length, kills: kills / SEEDS.length };
    });
    const row = res[evo ?? "none"].map((x, i) => `S${STAGES[i]} ${String(x.clear).padStart(2)}/${SEEDS.length} 피격 ${x.hits.toFixed(1).padStart(4)} 요격 ${x.kills.toFixed(1).padStart(5)}`).join("   ");
    console.log(`  ${(evo ? LABEL[evo] : "진화 없음").padEnd(7)} ${row}`);
  }
  const A = res[a], B = res[b], N = res.none;
  const beats = (x, y) => x.every((r, i) => r.clear >= y[i].clear && r.kills >= y[i].kills && r.hits <= y[i].hits) && x.some((r, i) => r.clear > y[i].clear || r.kills > y[i].kills + 0.5);
  if (beats(A, B) || beats(B, A)) { dominated += 1; console.log(`  ⚠ 한 갈래가 모든 스테이지에서 앞선다`); }
  if ([A, B].some((x) => x.some((r, i) => r.clear - N[i].clear >= 4))) { tooStrong += 1; console.log(`  ⚠ 진화가 진화 없음보다 클리어 +4 이상`); }
  if (A.every((r, i) => r.clear === B[i].clear && Math.abs(r.kills - B[i].kills) < 0.5)) { same += 1; console.log(`  ⚠ 두 갈래 결과가 같다`); }
}
console.log(`\n요약: 무조건 상위 ${dominated} · 너무 셈 ${tooStrong} · 결과 같음 ${same} (8종 중)`);
