/**
 * 진화 분기가 실제로 다른 판을 만드는가 (2026-09-28).
 *
 *   node scripts/dodge-evolutions.mjs
 *
 * 카드가 스킬을 "더 세게" 만들기만 하면 매 런이 똑같다. 진화는 **작동 방식**을 바꾸므로
 * 요격 수·클리어율이 갈려야 한다. 같은 시드로 빌드만 바꿔 돌려 비교한다.
 * 무조건 상위 호환이 있으면(한 진화가 모든 스테이지에서 최고면) 고를 이유가 하나뿐이라
 * 그것도 여기서 드러난다.
 */
import { simulateStage } from "./dodge-sim.mjs";

const SEEDS = [11, 22, 33, 44, 55, 66, 77, 88, 99, 1010, 1111, 1212];
const SKILLS = { volley: 6, pierce: 4, flame: 4, frost: 4, chain: 2, ultimate: 4 };

const BUILDS = [
  ["진화 없음", {}],
  ["관통 광선", { evolutions: { volley: "beam" } }],
  ["유도 볼트", { evolutions: { volley: "seeker" } }],
  ["확산 폭발", { evolutions: { flame: "cluster" }, flameRadiusMul: 1.6 }],
  ["화염 장판", { evolutions: { flame: "pyre" } }],
  ["서리 파쇄", { evolutions: { frost: "shatter" } }],
  ["지속 서리", { evolutions: { frost: "lingering" } }],
];

const rows = [];
for (const stage of [1, 3]) {
  for (const [name, mods] of BUILDS) {
    let clear = 0, hits = 0, kills = 0;
    for (const seed of SEEDS) {
      const r = simulateStage(stage - 1, seed, { skills: SKILLS, weapon: "bow", mods });
      if (r.clear) clear += 1;
      hits += r.hits;
      kills += r.skillKills ?? 0;
    }
    rows.push({ stage, name, clear, hits: hits / SEEDS.length, kills: kills / SEEDS.length });
  }
}

console.log("stage  빌드         클리어      평균 피격   평균 스킬 요격");
for (const r of rows) {
  console.log(`  S${r.stage}  ${r.name.padEnd(10)} ${String(r.clear).padStart(2)}/${SEEDS.length}      ${r.hits.toFixed(2).padStart(5)}      ${r.kills.toFixed(1).padStart(6)}`);
}

// 진화마다 결과가 갈리는가 — 전부 같으면 분기가 이름만 다른 셈이다
for (const stage of [1, 3]) {
  const set = rows.filter((r) => r.stage === stage);
  const distinct = new Set(set.map((r) => `${r.clear}/${r.kills.toFixed(0)}`)).size;
  console.log(`\nS${stage}: 서로 다른 결과 ${distinct}/${set.length} 가지`);
}
