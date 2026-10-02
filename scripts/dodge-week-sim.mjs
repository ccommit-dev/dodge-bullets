/**
 * 성문 방어 일주일 시뮬 (2026-10-01) — 새 계정이 하루 몇 판씩 일주일을 돌면 성장·해금·벽이 어떻게 오는가.
 *   node scripts/dodge-week-sim.mjs [--runs 3] [--days 7] [--seeds 4] [--json]
 *
 * 질문은 셋이다:
 *   1) 이탈 지점 — 어느 날 **강화를 하나도 못 하는가**(조각·골드가 모자라 정비 화면이 비는 날), 어느 날 S4 벽에 막혀만 있는가.
 *   2) 일주일 분량 — 7일째에 무엇이 남아 있는가(만렙·해금·칩 슬롯·성벽). 3일 만에 다 올리면 남은 나흘이 비고, 7일에 아무것도 못 열면 벽만 남는다.
 *   3) 첫 플레이 — 1일차 첫 판이 어디까지 가는가, 습득 카드가 뜨는가.
 *
 * 봇·판정·보상은 전부 실제 소스(dodge-sim 번들)다. 하루에 쌓이는 골드는 사냥터 방치가 더 크므로 골드는 원정 보상만 세되 **골드 벽은 따로 표시**한다.
 */
import { simulateRun, api } from "./dodge-sim.mjs";

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? Number(process.argv[i + 1]) : d; };
const isMain = !!process.argv[1] && process.argv[1].endsWith("dodge-week-sim.mjs");
const RUNS = isMain ? arg("--runs", 3) : 3, DAYS = isMain ? arg("--days", 7) : 7, SEEDS = isMain ? arg("--seeds", 4) : 3;
const { SK, CH, stages } = api;
const SKILL_IDS = ["fire", "water", "ice", "earth", "bolt", "ultimate"];

/** 하루 성장(사냥터 레벨·검) — 30일 밸런스 시뮬의 초반 구간을 날짜로 */
const growth = (day) => ({ level: 8 + day * 4, sword: 3 + Math.floor(day * 1.2) });

function freshAccount() {
  return {
    skills: { fire: 1, water: 0, ice: 0, earth: 0, bolt: 0, ultimate: 0 },
    shards: { fire: 0, water: 0, ice: 0, earth: 0, bolt: 0, ultimate: 0 },
    seals: 0, gold: 0, bestStage: 0, chipLevels: CH.emptyChipLevels(), equipped: [null, null, null], weapon: "bow", basic: 0,
  };
}

/** 정비 — 사람처럼: 조각이 가장 많이 남는 스킬부터, 골드 되는 만큼. 칩은 인장이 모이면 조준 → 활력 → 연사 */
function upgrade(acc, log) {
  let did = 0;
  for (let guard = 0; guard < 40; guard += 1) {
    let best = null;
    for (const id of SKILL_IDS) {
      const def = SK.SKILL_BY_ID[id];
      const lv = acc.skills[id];
      if (lv >= SK.SKILL_MAX_LEVEL || !SK.skillUnlocked(def, acc.bestStage)) continue;
      const cost = SK.skillCost(def, lv + 1);
      if (acc.shards[id] < cost.shards || acc.gold < cost.gold || acc.seals < (cost.seals ?? 0)) continue;
      const slack = lv === 0 ? 1e6 : acc.shards[id] - cost.shards;   // 배울 수 있으면 먼저 배운다
      if (!best || slack > best.slack) best = { id, cost, slack };
    }
    if (!best) break;
    acc.shards[best.id] -= best.cost.shards; acc.gold -= best.cost.gold; acc.seals -= best.cost.seals ?? 0; acc.skills[best.id] += 1; did += 1;
    log.push(`${SK.SKILL_BY_ID[best.id].name} Lv${acc.skills[best.id]}`);
  }
  // 기본 사격 — 골드가 남으면 한 단계 (속성 화살보다 뒤, 2026-10-02)
  if (acc.basic < SK.BASIC_LEVEL_MAX && acc.gold >= SK.basicShotCost(acc.basic + 1)) { acc.gold -= SK.basicShotCost(acc.basic + 1); acc.basic += 1; did += 1; log.push(`기본 사격 Lv${acc.basic}`); }
  const slots = CH.chipSlotsOpen(acc.bestStage);
  for (const id of ["focus", "vitality", "barrage"]) {
    const lv = acc.chipLevels[id];
    if (lv >= CH.CHIP_MAX_LEVEL) continue;
    const cost = CH.chipCost(lv + 1);
    if (acc.seals < cost) continue;
    acc.seals -= cost; acc.chipLevels[id] += 1; did += 1; log.push(`${CH.CHIP_BY_ID[id].name} Lv${acc.chipLevels[id]}`);
    if (!acc.equipped.includes(id)) { const free = acc.equipped.findIndex((x, i) => x === null && i < slots); if (free >= 0) acc.equipped[free] = id; }
  }
  return did;
}

export function simulateWeek(seedBase, runsPerDay = RUNS, dayCount = DAYS) {
  const acc = freshAccount();
  const days = [];
  let golds = 0;
  for (let day = 1; day <= dayCount; day += 1) {
    const g = growth(day);
    const runs = [];
    const runCount = day === 1 ? runsPerDay + 1 : runsPerDay;
    for (let r = 0; r < runCount; r += 1) {
      const tier = { level: g.level, sword: g.sword, bestStage: Math.max(1, acc.bestStage), skills: acc.skills, chipLevels: acc.chipLevels, equipped: acc.equipped, weapon: acc.weapon, basic: acc.basic };
      const res = simulateRun(seedBase + day * 101 + r * 7, tier);
      // 보상 — 깬 스테이지마다 조각·인장·골드, 실패한 스테이지는 조각 1
      const acquired = Object.fromEntries(res.acquired.map((k) => [k, true]));
      for (let i = 0; i < res.reached; i += 1) {
        const drop = SK.shardDrops(acquired, i, true, Math.min(res.ults, i + 1));
        for (const [k, v] of Object.entries(drop)) acc.shards[k] += v;
        acc.seals += 2 + (i >= 1 ? 1 : 0);                                   // 체력 가득(2) + 상자(1) 안팎
        acc.gold += stages.STAGES[i].baseReward + 30; golds += stages.STAGES[i].baseReward + 30;
      }
      if (res.reached < 4) {
        const drop = SK.shardDrops(acquired, res.reached, false, 0);
        for (const [k, v] of Object.entries(drop)) acc.shards[k] += v;
      }
      acc.bestStage = Math.max(acc.bestStage, res.reached);
      runs.push(res);
    }
    const log = [];
    const did = upgrade(acc, log);
    days.push({
      day, reached: runs.map((r) => r.reached), s4: runs.filter((r) => r.reached >= 4).length, runs: runCount,
      upgrades: did, log, skills: { ...acc.skills }, shards: { ...acc.shards }, seals: acc.seals, gold: acc.gold, bestStage: acc.bestStage,
      chipSlots: CH.chipSlotsOpen(acc.bestStage), chips: { ...acc.chipLevels },
    });
  }
  return { days, golds };
}

/** verify-content 가 쓰는 요약 — 시드별 주간 결과를 한 줄로 */
export function weekSummary(seeds = SEEDS) {
  const weeks = Array.from({ length: seeds }, (_, i) => simulateWeek(5000 + i * 977));
  return weeks.map((w) => ({
    firstRun: w.days[0].reached[0],
    stallDays: w.days.filter((d) => d.upgrades === 0).map((d) => d.day),
    allLearnedBy: (w.days.find((d) => SKILL_IDS.every((k) => d.skills[k] >= 1)) ?? { day: 99 }).day,
    s4By: (w.days.find((d) => d.bestStage >= 4) ?? { day: 99 }).day,
    s4Day7: w.days[w.days.length - 1].s4,
    maxedDay7: SKILL_IDS.filter((k) => w.days[w.days.length - 1].skills[k] >= SK.SKILL_MAX_LEVEL).length,
    totalDay7: SKILL_IDS.reduce((s, k) => s + w.days[w.days.length - 1].skills[k], 0),
  }));
}

if (!isMain) { /* import 전용 */ } else {
const weeks = Array.from({ length: SEEDS }, (_, i) => simulateWeek(5000 + i * 977));
if (process.argv.includes("--json")) { console.log(JSON.stringify(weeks)); process.exit(0); }

const avg = (f) => weeks.reduce((s, w) => s + f(w), 0) / weeks.length;
console.log(`일주일 시뮬 — 하루 ${RUNS}판(1일차 ${RUNS + 1}판) · 시드 ${SEEDS}개\n`);
console.log("| 일 | 도달(판별) | S4 클리어 | 강화 횟수 | 누적 스킬 레벨 | 최고 | 칩 슬롯 | 인장 잔액 | 골드 잔액 |");
console.log("|---|---|---|---|---|---|---|---|---|");
for (let d = 0; d < DAYS; d += 1) {
  const rows = weeks.map((w) => w.days[d]);
  const total = (r) => Object.values(r.skills).reduce((a, b) => a + b, 0);
  console.log(`| ${d + 1} | ${rows[0].reached.join("/")} … | ${avg((w) => w.days[d].s4).toFixed(1)}/${rows[0].runs} | ${avg((w) => w.days[d].upgrades).toFixed(1)} | ${avg((w) => total(w.days[d])).toFixed(1)} | S${avg((w) => w.days[d].bestStage).toFixed(1)} | ${avg((w) => w.days[d].chipSlots).toFixed(1)} | ${avg((w) => w.days[d].seals).toFixed(0)} | ${avg((w) => w.days[d].gold).toFixed(0)} |`);
}
console.log("\n시드 0 의 강화 일지:");
for (const d of weeks[0].days) console.log(`  ${d.day}일: ${d.log.join(", ") || "(없음)"}`);
const first = weeks.map((w) => w.days[0].reached[0]);
console.log(`\n첫 판 도달: ${first.join(", ")} (스테이지 수)`);
const stalls = weeks.map((w) => w.days.filter((d) => d.upgrades === 0).map((d) => d.day));
console.log(`강화 0 인 날(이탈 위험): ${stalls.map((s) => s.length ? s.join(",") : "없음").join(" | ")}`);
const maxed = weeks.map((w) => SKILL_IDS.filter((k) => w.days[DAYS - 1].skills[k] >= SK.SKILL_MAX_LEVEL).length);
console.log(`7일째 만렙 스킬 수: ${maxed.join(", ")} / 6`);
}
