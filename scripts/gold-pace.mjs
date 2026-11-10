// 골드 단위 낮추기(2026-11-10 · titans/model GOLD_CURVE)가 진행 속도를 얼마나 바꾸는지 — 바깥 성장 배수 X × 사냥 시간 T 격자에서 닿는 층을 옛 단위와 견준다.
//   node scripts/gold-pace.mjs                 지금 곡선
//   GC="incomeK=0.5,costK=0.5" node scripts/gold-pace.mjs     다른 값으로 (쉼표로 여러 키)
//   XS=1,100 TS=1200,7200 OVER=1.5 SOVER=2     격자 · 처치 사이 시간(초) · 층 넘어갈 때 더 드는 시간(초)
// 균형 시뮬(balance-sim)은 X = 1 · 하루 20분만 본다 — 별 · 유물 · 결정 트리로 힘이 X 배인 계정은 여기서 본다.
// 싼 것부터 사는 자동 강화 · 탭 4회/초 · 동료 4자리 · 처치마다 1.5초(TitansGame 의 처치 → 다음 등장 연출)로 단순화한 모델이다
import { build } from "esbuild";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd().replace(/\\/g, "/");
const dir = mkdtempSync(join(tmpdir(), "gold-pace-"));
const entry = join(dir, "entry.ts");
writeFileSync(entry, [`export * as titans from "${root}/src/titans/model";`, `export * as allies from "${root}/src/titans/allies";`, `export * as bossPressure from "${root}/src/titans/bossPressure";`].join("\n"));
const out = join(dir, "bundle.mjs");
await build({ entryPoints: [entry], bundle: true, format: "esm", platform: "node", outfile: out, logLevel: "error", define: { "import.meta.env.BASE_URL": '"/"', "import.meta.env.DEV": "false", "import.meta.env.PROD": "true" } });
const { titans, allies, bossPressure } = await import(pathToFileURL(out).href);
rmSync(dir, { recursive: true, force: true });

const TAPS = 4, PARTY = 4, OVER = Number(process.env.OVER ?? 1.5), SOVER = Number(process.env.SOVER ?? 2);
const XS = (process.env.XS ?? "1,3,10,30,100,1000,10000").split(",").map(Number);
const TS = (process.env.TS ?? "1200,3600,7200,18000,36000").split(",").map(Number);

function spend(state) {
  for (let guard = 0; guard < 6000; guard += 1) {
    let best = titans.equipmentTrainingCost("weapon", state.weaponMastery), who = null;
    for (const hero of titans.HEROES) { if (state.stage < hero.unlockStage) continue; const c = titans.heroUpgradeCost(hero, state.heroes[hero.id]); if (c < best) { best = c; who = hero.id; } }
    if (best > state.gold) return;
    state.gold -= best; if (who) state.heroes[who] += 1; else state.weaponMastery += 1;
  }
}
function dpsOf(state, X) {
  const party = titans.HEROES.map((h) => titans.heroDps(h, state.heroes[h.id] ?? 0) * allies.starMultiplier(allies.effectiveStars(0, state.heroes[h.id] ?? 0))).sort((a, b) => b - a).slice(0, PARTY).reduce((a, b) => a + b, 0);
  return X * (party + titans.playerIdleDps(state.weaponMastery) + titans.tapDamage(state.weaponMastery) * TAPS);
}
/** 환생 직후(1층 · 출발 골드)부터 T 초 사냥해 닿는 층 */
function run(X, T, startBest) {
  const state = { stage: 1, gold: titans.rebirthStartGold(startBest), weaponMastery: 1, heroes: Object.fromEntries(titans.HEROES.map((h) => [h.id, 0])) };
  spend(state);
  let t = T;
  while (t > 0) {
    const dps = dpsOf(state, X);
    const mobTime = (titans.monsterHp(state.stage, false) / dps + OVER) * titans.MOBS_PER_STAGE;
    const bossTime = titans.monsterHp(state.stage, true) / dps;
    if (bossTime > titans.BOSS_TIME_SEC * Math.sqrt(bossPressure.bossPressureScale(state.stage))) {   // 벽 — 1분씩 그 층을 돈다
      const chunk = Math.min(t, 60); t -= chunk;
      state.gold += (chunk / Math.max(0.5, mobTime)) * titans.MOBS_PER_STAGE * titans.killGold(state.stage, false, false);
      spend(state); continue;
    }
    const need = mobTime + bossTime + OVER + SOVER;
    if (need > t) break;
    t -= need;
    state.gold += titans.MOBS_PER_STAGE * titans.killGold(state.stage, false, false) + titans.killGold(state.stage, true, false) + titans.stageClearBonus(state.stage);
    spend(state); state.stage += 1;
  }
  return state.stage;
}

const set = (o) => Object.assign(titans.GOLD_CURVE, o);
const now = { ...titans.GOLD_CURVE };
for (const kv of (process.env.GC ?? "").split(",").filter(Boolean)) { const [k, v] = kv.split("="); now[k] = Number(v); }
set({ incomeK: 1, costK: 1 });
// 출발 골드: 그 X 로 10시간 사냥해 닿는 층에서 환생했다고 본다(옛 단위 기준 — 두 단위에 같은 층을 준다)
const best = Object.fromEntries(XS.map((X) => [X, run(X, 36000, 1)]));
const old = XS.map((X) => TS.map((T) => run(X, T, best[X])));
set(now);
const cur = XS.map((X) => TS.map((T) => run(X, T, best[X])));
const f = (v) => (v >= 1e12 ? (v / 1e12).toFixed(1) + "조" : v >= 1e8 ? (v / 1e8).toFixed(1) + "억" : v >= 1e4 ? (v / 1e4).toFixed(1) + "만" : String(Math.round(v)));
console.log(`곡선 ${JSON.stringify(now)} · 처치 사이 ${OVER}초`);
console.log(`처치 골드 ${[10, 20, 30, 40, 60, 80, 100].map((s) => `${s}층 ${f(titans.killGold(s, false, false))}(옛 ${f(titans.killGoldOldUnit(s, false, false))})`).join(" · ")}`);
console.log(`닿는 층 — 옛 → 새 (차이), 시간 ${TS.map((t) => (t >= 3600 ? t / 3600 + "시간" : t / 60 + "분")).join(" / ")}`);
let sum = 0, slow = 0, fast = 0;
XS.forEach((X, i) => {
  const cells = TS.map((_, j) => { const d = cur[i][j] - old[i][j], rel = d / old[i][j]; sum += Math.abs(rel); slow = Math.min(slow, rel); fast = Math.max(fast, rel); return `${old[i][j]}→${cur[i][j]}(${d > 0 ? "+" : ""}${d})`; });
  console.log(`  X${String(X).padEnd(6)} ${cells.join("  ")}`);
});
console.log(`어긋남 평균 ${(sum / (XS.length * TS.length) * 100).toFixed(1)}% · 가장 느림 ${(slow * 100).toFixed(0)}% · 가장 빠름 +${(fast * 100).toFixed(0)}%`);
