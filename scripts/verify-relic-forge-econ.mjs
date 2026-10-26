// 유물 뽑기 가격 · 대장간 파괴 확률 곡선 — 숫자로 잰다 (2026-10-26, 사용자: "임의로 정한 값 → 어색하지 않게 마저 수정").
//   node scripts/verify-relic-forge-econ.mjs [--print]
// 무과금 보석 수입은 balance-sim ASSUMPTIONS 와 같은 값(매일 25 + 주간 270 → 하루 약 38.6).
// 유물: 균등 뽑기로 첫 세트(같은 계열 3개 ★1)까지 · 9종 ★1 · 전부 ★5 까지 보석과 무과금 일수.
// 강화: 예전(확정 강화) 대비 +최대까지 기대 골드 · 강화석 배수와 "한 번이라도 파괴" 확률 — 방지권 없음 / 매일 방지권을 쓰는 경우.
import { build } from "esbuild";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd().replace(/\\/g, "/");
const dir = mkdtempSync(join(tmpdir(), "relicforge-"));
const entry = join(dir, "entry.ts");
writeFileSync(entry, [
  `export * as relics from "${root}/src/titans/relics";`,
  `export * as forge from "${root}/src/forge/model";`,
  `export * as parts from "${root}/src/equipment/parts";`,
  `export * as skills from "${root}/src/game/skills";`,
  `export * as gacha from "${root}/src/titans/gacha";`,
].join("\n"));
const out = join(dir, "bundle.mjs");
await build({ entryPoints: [entry], bundle: true, format: "esm", platform: "node", outfile: out, logLevel: "error", define: { "import.meta.env.BASE_URL": '"/"', "import.meta.env.DEV": "false", "import.meta.env.VITE_QA_BUILD": '"false"' } });
const { relics: R, forge: F, parts: P, skills: S, gacha: G } = await import(pathToFileURL(out).href);
rmSync(dir, { recursive: true, force: true });

const PRINT = process.argv.includes("--print");
let fails = 0;
const ok = (n, c, d = "") => { console.log(`${c ? "PASS" : "FAIL"} ${n}${d ? " — " + d : ""}`); if (!c) fails += 1; };
// 고정 시드 — 결과가 실행마다 같다
let seed = 20261026;
const rng = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2 ** 32; };
const GEMS_PER_DAY = 25 + (120 + 150) / 7;
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const pct = (a, q) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; };

// ── 유물 뽑기 ──
const RUNS = 4000;
const firstSet = [], allOne = [];
for (let k = 0; k < RUNS; k++) {
  let st = {}, n = 0, set = 0, one = 0;
  while (!(set && one) && n < 500) {
    st = R.drawRelicShards(st, 1, rng).state; n += 1;
    if (!set && ["fire", "frost", "gold"].some((f) => R.setActive(st, f))) set = n;
    if (!one && R.RELICS.every((r) => R.relicStars(st, r.id) >= 1)) one = n;
  }
  firstSet.push(set); allOne.push(one);
}
const tenUnit = R.RELIC_DRAW.tenCost / 10;
const days = (draws) => (draws * tenUnit) / GEMS_PER_DAY;
const all5 = R.RELICS.length * R.RELIC_SHARDS_PER_STAR * R.RELIC_MAX_STAR;
const relicRow = { firstSetDraws: mean(firstSet).toFixed(1), firstSetDays: days(mean(firstSet)).toFixed(1), allOneDraws: mean(allOne).toFixed(1), allOneDays: days(mean(allOne)).toFixed(1), all5Draws: all5, all5Days: days(all5).toFixed(0), tenUnit, allySingle: G.GACHA.singleCost };
if (PRINT) console.log("relic", JSON.stringify(relicRow));
// 기준: 동료 1회(100)보다 싸고(조각 하나는 ★ 의 1/3), 무과금 첫 세트 2~4주 · 9종 ★1 1~3달 · 전부 ★5 는 3달 이상(긴 소비처 — 대장 재처치 드랍은 따로 더 준다)
ok("유물 한 조각은 동료 1회보다 싸다", R.RELIC_DRAW.singleCost < G.GACHA.singleCost && R.RELIC_DRAW.tenCost === R.RELIC_DRAW.singleCost * 9, `조각 ${R.RELIC_DRAW.singleCost} · 10회 ${R.RELIC_DRAW.tenCost} · 동료 ${G.GACHA.singleCost}`);
ok("무과금 첫 세트 14~28일", days(mean(firstSet)) >= 14 && days(mean(firstSet)) <= 28, `${relicRow.firstSetDraws}회 · ${relicRow.firstSetDays}일`);
ok("무과금 9종 ★1 30~90일", days(mean(allOne)) >= 30 && days(mean(allOne)) <= 90, `${relicRow.allOneDraws}회 · ${relicRow.allOneDays}일`);
ok("전부 ★5 는 90일 이상(긴 소비처)", days(all5) >= 90, `${all5}회 · ${relicRow.all5Days}일`);

// ── 강화 위험 ──
// 정책: 될 때까지 누른다. tickets = 처음 가진 방지권(파괴를 한 번씩 막는다)
function climb(max, costOf, tickets) {
  let lv = 0, gold = 0, stones = 0, destroys = 0, t = tickets, tries = 0;
  while (lv < max && tries < 5000) {
    tries += 1;
    const c = costOf(lv); gold += c.gold; stones += c.stones;
    const o = F.rollEnhance(F.enhanceRisk(lv, max), rng);
    if (o === "success") lv += 1;
    else if (o === "destroy") { if (t > 0) t -= 1; else { stones -= lv; destroys += 1; lv = 0; } }
  }
  return { gold, stones, destroys, tries };
}
const flat = (max, costOf) => { let gold = 0, stones = 0; for (let lv = 0; lv < max; lv++) { const c = costOf(lv); gold += c.gold; stones += c.stones; } return { gold, stones }; };
const gearCost = (lv) => { const c = P.gearEnhanceCost(lv); return { gold: c.coins, stones: c.materials }; };
const bowCost = (lv) => { const c = S.weaponForgeCost(lv + 1); return { gold: c.gold, stones: c.stones }; };
const rows = {};
for (const [name, max, costOf] of [["장비 +10", P.GEAR_ENHANCE_MAX, gearCost], ["원정 무기 +20", S.WEAPON_FORGE_MAX, bowCost]]) {
  const base = flat(max, costOf);
  for (const tickets of [0, 3]) {
    const runs = Array.from({ length: 3000 }, () => climb(max, costOf, tickets));
    rows[`${name} 방지권${tickets}`] = { goldX: (mean(runs.map((r) => r.gold)) / base.gold).toFixed(2), goldP90X: (pct(runs.map((r) => r.gold), 0.9) / base.gold).toFixed(2), stonesX: (mean(runs.map((r) => r.stones)) / base.stones).toFixed(2), anyDestroy: (runs.filter((r) => r.destroys > 0).length / runs.length).toFixed(2), tries: mean(runs.map((r) => r.tries)).toFixed(0) };
  }
}
if (PRINT) console.log("forge", JSON.stringify(rows, null, 1));
// 기준: 끝까지 올리는 기대 비용은 예전의 2~3.5배(파괴가 실제로 아프되 끝없이 늘지 않게) · 운 나쁜 10% 도 6배 안 · 방지권 3장이면 기대 비용 2.5배 안
for (const name of ["장비 +10", "원정 무기 +20"]) {
  const a = rows[`${name} 방지권0`], b = rows[`${name} 방지권3`];
  ok(`${name}: 방지권 없이 기대 골드 ×2~3.5 · 하위 10% ×6 안`, a.goldX >= 2 && a.goldX <= 3.5 && a.goldP90X <= 6, `×${a.goldX} (P90 ×${a.goldP90X}) · 강화석 ×${a.stonesX} · 한 번이라도 파괴 ${Math.round(a.anyDestroy * 100)}%`);
  ok(`${name}: 방지권 3장이면 기대 골드 ×2.5 안`, b.goldX <= 2.5, `×${b.goldX} · 파괴 ${Math.round(b.anyDestroy * 100)}%`);
}
// 보호구 (+15): 예전 = 실패하면 1단계 하락 · 지금 = 그중 enhanceRisk(lv,15).destroy 만큼 +0. 성공은 ForgeGame armorChance 와 같은 식
const armorChance = (lv) => Math.max(0.38, 0.94 - lv * 0.045);
const armorCost = (lv) => Math.floor(500 * Math.pow(1.72, lv));
function armorClimb(withDestroy) { let lv = 0, gold = 0, d = 0; for (let n = 0; n < 20000 && lv < 15; n++) { gold += armorCost(lv); const r = rng(); if (r < armorChance(lv)) lv += 1; else if (withDestroy && (r - armorChance(lv)) / (1 - armorChance(lv)) < F.enhanceRisk(lv, 15).destroy) { lv = 0; d += 1; } else lv = Math.max(0, lv - 1); } return { gold, d }; }
const armOld = Array.from({ length: 3000 }, () => armorClimb(false)), armNew = Array.from({ length: 3000 }, () => armorClimb(true));
const armX = mean(armNew.map((r) => r.gold)) / mean(armOld.map((r) => r.gold));
if (PRINT) console.log("armor", JSON.stringify({ oldGold: Math.round(mean(armOld.map((r) => r.gold))), newGold: Math.round(mean(armNew.map((r) => r.gold))), x: armX.toFixed(2), anyDestroy: (armNew.filter((r) => r.d > 0).length / armNew.length).toFixed(2) }));
ok("보호구 +15: 파괴가 더해져도 기대 골드는 예전 하락 규칙의 ×2 안", armX <= 2, `×${armX.toFixed(2)}`);
// 곡선 모양: 낮은 단계(30% 미만)는 파괴 없음 · 성공은 단계가 오를수록 줄어든다 · 끝 단계 파괴 ≤ 25%
const curveOk = [10, 15, 20].every((max) => { let prev = 2; for (let lv = 0; lv < max; lv++) { const r = F.enhanceRisk(lv, max); if (r.success > prev + 1e-9 || r.destroy > 0.25 || (lv / max < 0.3 && r.destroy > 0)) return false; prev = r.success; } return true; });
ok("곡선: 낮은 단계 파괴 0 · 성공은 단계마다 줄어듦 · 파괴 25% 이하 · 긴 사다리일수록 상한이 낮다", curveOk && F.enhanceRisk(19, 20).destroy < F.enhanceRisk(14, 15).destroy && F.enhanceRisk(14, 15).destroy < F.enhanceRisk(9, 10).destroy);
console.log(fails ? `${fails} FAIL` : "ALL PASS");
process.exit(fails ? 1 : 0);
