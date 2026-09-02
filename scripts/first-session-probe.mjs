/**
 * 첫 세션 5분 곡선 프로브 (RETENTION_DESIGN E) — 신규 유저가 탭+미아만으로
 * Stage 5(화살 원정 개방)까지 몇 초 걸리는지 실제 소스 함수로 측정한다.
 *
 *   node scripts/first-session-probe.mjs
 *
 * 가정: 탭 2.5회/초, 골드는 가장 싼 항목(무기 훈련·동료 레벨업)에 즉시 지출.
 * 목표: 300초 이내 Stage 5 도달. 넘으면 초반 보스 HP·제한시간을 재조정한다.
 */
import { build } from "esbuild";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd().replace(/\\/g, "/");
const dir = mkdtempSync(join(tmpdir(), "probe-"));
const entry = join(dir, "entry.ts");
writeFileSync(entry, `export * from "${root}/src/titans/model";\nexport * from "${root}/src/titans/allies";`);
const out = join(dir, "bundle.mjs");
await build({ entryPoints: [entry], bundle: true, format: "esm", outfile: out, platform: "node", define: { "import.meta.env.BASE_URL": '"/"', "import.meta.env.DEV": "false", "import.meta.env.PROD": "true" } });
const t = await import(pathToFileURL(out).href);
rmSync(dir, { recursive: true, force: true });

const TAPS_PER_SEC = 2.5;
const TARGET_STAGE = 5;
const LIMIT_SEC = 300;

function probe() {
  const state = { stage: 1, gold: 0, weaponMastery: 1, heroes: { mia: 0, leon: 0 } };
  let time = 0;
  const log = [];
  const dpsNow = () => {
    let dps = t.playerIdleDps(state.weaponMastery) + t.tapDamage(state.weaponMastery) * TAPS_PER_SEC;
    for (const h of t.HEROES) if (state.heroes[h.id] > 0) dps += t.heroDps(h, state.heroes[h.id]);
    return dps;
  };
  const spend = () => {
    for (let guard = 0; guard < 60; guard += 1) {
      const options = [{ cost: t.equipmentTrainingCost("weapon", state.weaponMastery), buy: () => { state.weaponMastery += 1; } }];
      for (const h of t.HEROES) {
        if (h.unlockStage > state.stage || h.unlockStage >= 9999) continue;
        const lvl = state.heroes[h.id] ?? 0;
        options.push({ cost: t.heroUpgradeCost(h, lvl), buy: () => { state.heroes[h.id] = lvl + 1; } });
      }
      options.sort((a, b) => a.cost - b.cost);
      if (!options[0] || options[0].cost > state.gold) return;
      state.gold -= options[0].cost;
      options[0].buy();
    }
  };
  while (state.stage < TARGET_STAGE && time < 1800) {
    const dps = dpsNow();
    const mobSec = (t.monsterHp(state.stage, false) / dps) * t.MOBS_PER_STAGE;
    const bossSec = t.monsterHp(state.stage, true) / dps;
    const bossOk = bossSec <= t.BOSS_TIME_SEC;
    time += mobSec + (bossOk ? bossSec : t.BOSS_TIME_SEC);
    state.gold += t.MOBS_PER_STAGE * t.killGold(state.stage, false, false);
    if (bossOk) {
      state.gold += t.killGold(state.stage, true, false) + t.stageClearBonus(state.stage);
      log.push(`Stage ${state.stage} 클리어 @ ${Math.round(time)}s (dps ${dps.toFixed(1)}, boss ${bossSec.toFixed(1)}s)`);
      state.stage += 1;
    } else {
      log.push(`Stage ${state.stage} 보스 실패 @ ${Math.round(time)}s (boss ${bossSec.toFixed(1)}s > ${t.BOSS_TIME_SEC}s)`);
    }
    spend();
  }
  return { time, log, reached: state.stage >= TARGET_STAGE };
}

const r = probe();
r.log.forEach((l) => console.log(l));
console.log(`\n첫 세션: Stage ${TARGET_STAGE} 도달 ${r.reached ? Math.round(r.time) + "초" : "실패"} · 목표 ${LIMIT_SEC}초 → ${r.reached && r.time <= LIMIT_SEC ? "OK" : "튜닝 필요"}`);
process.exit(r.reached && r.time <= LIMIT_SEC ? 0 : 1);
