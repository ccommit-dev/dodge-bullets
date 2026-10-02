/**
 * 성문 방어 일주일 시뮬 — 50 스테이지 · 한 판 = 한 스테이지 (2026-10-02).
 *   node scripts/dodge-week-sim.mjs [--runs 6] [--days 7] [--seeds 3] [--json]
 *
 * 새 계정이 하루 몇 판씩 일주일을 돌면 어디까지 가고, 무엇이 남는가:
 *   1) 이탈 지점 — 강화를 하나도 못 하는 날이 있는가
 *   2) 첫날 — 몇 스테이지를 깨는가 (첫 플레이가 벽이 아닌가)
 *   3) 일주일 — 어느 장까지 가는가, 50 스테이지가 다 끝나 버리지 않는가, 해금된 무기를 배웠는가
 *
 * 판은 늘 '다음 스테이지'에 도전한다(깨면 다음으로, 지면 같은 스테이지 다시). 보상은 실제 표에서:
 * 골드(스테이지 baseReward) · 인장(2~3) · 쓴 무기의 조각(shardDrops) · 강화석(dodgeClearReward 근사).
 * 사냥터 방치 골드는 원정보다 훨씬 크므로 하루치 근사(HUNT_GOLD × 일)를 더한다 — 대장간 강화가 골드로 막히는지는 따로 본다.
 */
import { simulateStage, api } from "./dodge-sim.mjs";

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? Number(process.argv[i + 1]) : d; };
const isMain = !!process.argv[1] && process.argv[1].endsWith("dodge-week-sim.mjs");
const RUNS = isMain ? arg("--runs", 6) : 6, DAYS = isMain ? arg("--days", 7) : 7, SEEDS = isMain ? arg("--seeds", 3) : 3;
const { SK, CH, stages } = api;
const WEAPON_IDS = SK.SKILL_WEAPON_IDS;
/** 하루 성장 — 계정 레벨(사냥터)·검 */
const growth = (day) => ({ level: 8 + day * 4, sword: 3 + Math.floor(day * 1.2) });
/** 사냥터 방치·처치 골드 하루치 근사 */
const HUNT_GOLD = 20000;

function freshAccount() {
  return {
    skills: { ...SK.emptySkillLevels(), fire: 1 },
    shards: SK.emptyShards(),
    seals: 0, gold: 0, stones: 0, best: 0, stars: {},
    loadout: ["fire"], forge: { bow: 0, staff: 0 },
    chipLevels: CH.emptyChipLevels(), equipped: [null, null, null], weapon: "bow",
  };
}

/** 정비 — 사람처럼: 해금된 무기를 배우고, 조각이 남는 무기를 올리고, 대장간 활·지팡이, 장착은 레벨 높은 넷, 칩 */
function upgrade(acc, level, log) {
  let did = 0;
  for (let guard = 0; guard < 60; guard += 1) {
    let best = null;
    for (const id of [...WEAPON_IDS, "ultimate"]) {
      const def = SK.SKILL_BY_ID[id];
      const lv = acc.skills[id];
      if (lv >= SK.SKILL_MAX_LEVEL || !SK.skillUnlocked(def, level, lv)) continue;
      const cost = SK.skillCost(def, lv + 1);
      if (acc.shards[id] < cost.shards || acc.gold < cost.gold || acc.seals < (cost.seals ?? 0)) continue;
      const slack = lv === 0 ? 1e6 : acc.shards[id] - cost.shards;
      if (!best || slack > best.slack) best = { id, cost, slack };
    }
    if (!best) break;
    acc.shards[best.id] -= best.cost.shards; acc.gold -= best.cost.gold; acc.seals -= best.cost.seals ?? 0; acc.skills[best.id] += 1; did += 1;
    log.push(`${SK.SKILL_BY_ID[best.id].weapon} Lv${acc.skills[best.id]}`);
  }
  // 대장간 — 활·지팡이를 번갈아, 골드·강화석 되는 만큼
  for (let guard = 0; guard < 40; guard += 1) {
    const kind = acc.forge.bow <= acc.forge.staff ? "bow" : "staff";
    if (acc.forge[kind] >= SK.WEAPON_FORGE_MAX) break;
    const c = SK.weaponForgeCost(acc.forge[kind] + 1);
    if (acc.gold < c.gold || acc.stones < c.stones) break;
    acc.gold -= c.gold; acc.stones -= c.stones; acc.forge[kind] += 1; did += 1;
    log.push(`${kind === "bow" ? "장궁" : "지팡이"} +${acc.forge[kind]}`);
  }
  // 장착 — 배운 무기 중 레벨 높은 넷 (같으면 늦게 열린 것)
  acc.loadout = WEAPON_IDS.filter((id) => acc.skills[id] > 0)
    .sort((a, b) => acc.skills[b] - acc.skills[a] || WEAPON_IDS.indexOf(b) - WEAPON_IDS.indexOf(a)).slice(0, SK.LOADOUT_MAX);
  const slots = CH.chipSlotsOpen(acc.best + 1);
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
  for (let day = 1; day <= dayCount; day += 1) {
    const g = growth(day);
    acc.gold += HUNT_GOLD * day;
    const runs = [];
    for (let r = 0; r < runsPerDay; r += 1) {
      const stage = Math.min(stages.STAGES.length - 1, acc.best);
      const profile = { level: g.level, sword: g.sword, bestStage: acc.best + 1, skills: acc.skills, loadout: acc.loadout, forge: acc.forge, chipLevels: acc.chipLevels, equipped: acc.equipped, weapon: acc.weapon };
      const res = simulateStage(stage, seedBase + day * 101 + r * 7, { profile });
      const used = Object.fromEntries(res.runSkills.map((k) => [k, true]));
      const drop = SK.shardDrops(used, stage, res.clear, res.ultCount);
      for (const [k, v] of Object.entries(drop)) acc.shards[k] += v;
      if (res.clear) {
        acc.gold += stages.STAGES[stage].baseReward + 30;
        acc.seals += 2 + (res.barrierMinRatio >= 0.9 ? 2 : 0);
        acc.stones += 7 + stage * 2 + 5;
        acc.stars[stage] = 1;
        if (acc.best === stage) acc.best = Math.min(stages.STAGES.length, stage + 1);
      } else {
        acc.stones += 2;
      }
      runs.push({ stage, clear: res.clear });
    }
    const log = [];
    const did = upgrade(acc, g.level, log);
    days.push({
      day, runs, cleared: runs.filter((x) => x.clear).length, upgrades: did, log, best: acc.best,
      skills: { ...acc.skills }, forge: { ...acc.forge }, loadout: [...acc.loadout], seals: acc.seals, gold: acc.gold, level: g.level,
    });
  }
  return { days };
}

/** verify-content 가 쓰는 요약 — 시드별 한 줄 */
export function weekSummary(seeds = SEEDS) {
  const weeks = Array.from({ length: seeds }, (_, i) => simulateWeek(5000 + i * 977));
  return weeks.map((w) => {
    const last = w.days[w.days.length - 1];
    const unlockedByDay7 = WEAPON_IDS.filter((id) => last.level >= SK.SKILL_BY_ID[id].unlockLevel);
    return {
      firstDayClears: w.days[0].cleared,
      stallDays: w.days.filter((d) => d.upgrades === 0).map((d) => d.day),
      bestDay7: last.best,
      chapter2By: (w.days.find((d) => d.best >= 11) ?? { day: 99 }).day,
      learnedDay7: WEAPON_IDS.filter((id) => last.skills[id] > 0).length,
      unlockedDay7: unlockedByDay7.length,
      loadoutDay7: last.loadout.length,
      forgeDay7: last.forge.bow + last.forge.staff,
      maxedDay7: WEAPON_IDS.filter((id) => last.skills[id] >= SK.SKILL_MAX_LEVEL).length,
    };
  });
}

if (isMain) {
  const weeks = Array.from({ length: SEEDS }, (_, i) => simulateWeek(5000 + i * 977));
  if (process.argv.includes("--json")) { console.log(JSON.stringify(weeks)); process.exit(0); }
  console.log(`일주일 시뮬 — 하루 ${RUNS}판 · 시드 ${SEEDS}개\n`);
  console.log("| 일 | 계정 Lv | 최고 스테이지(시드별) | 그날 클리어 | 강화 횟수 | 장착 | 대장간 활/지팡이 |");
  console.log("|---|---|---|---|---|---|---|");
  for (let d = 0; d < DAYS; d += 1) {
    const rows = weeks.map((w) => w.days[d]);
    console.log(`| ${d + 1} | ${rows[0].level} | ${rows.map((r) => r.best).join(" / ")} | ${rows.map((r) => r.cleared).join(" / ")} | ${rows.map((r) => r.upgrades).join(" / ")} | ${rows[0].loadout.join(",")} | ${rows.map((r) => `${r.forge.bow}/${r.forge.staff}`).join(" ")} |`);
  }
  console.log("\n시드 0 의 강화 일지:");
  for (const d of weeks[0].days) console.log(`  ${d.day}일: ${d.log.join(", ") || "(없음)"}`);
  console.log("\n요약:", JSON.stringify(weekSummary()));
}
