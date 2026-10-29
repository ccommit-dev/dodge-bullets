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
  `export * as allies from "${root}/src/titans/allies";`,
  `export * as catalog from "${root}/src/economy/productCatalog";`,
].join("\n"));
const out = join(dir, "bundle.mjs");
await build({ entryPoints: [entry], bundle: true, format: "esm", platform: "node", outfile: out, logLevel: "error", define: { "import.meta.env.BASE_URL": '"/"', "import.meta.env.DEV": "false", "import.meta.env.VITE_QA_BUILD": '"false"' } });
const { relics: R, forge: F, parts: P, skills: S, gacha: G, allies: A, catalog: CAT } = await import(pathToFileURL(out).href);
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

// ── 유물 뽑기 ── (2026-10-27 45ce776 부터 등급별: 일반 = 사냥 골드 · 레어 = 강화석 · 유니크 = 보석 60/540 — 계열마다 등급 하나씩)
const RUNS = 4000;
const tenUnit = R.RELIC_DRAW.tenCost / 10;
const days = (draws) => (draws * tenUnit) / GEMS_PER_DAY;
// 재화별 뽑기(2026-10-28 6등급) — 확률 합 1 · 공시한 등급만 · (빈 저장에서) 등급 안 균등 · 다 모은 등급은 남은 등급끼리 비례
const tierOf = (id) => R.RELICS.find((r) => r.id === id).tier;
const bannerOk = R.RELIC_BANNERS.every((b) => {
  const rates = R.relicDrawRates({}, b).filter((x) => x.rate > 0);
  const sum = rates.reduce((a, x) => a + x.rate, 0);
  const tiers = Object.keys(R.RELIC_BANNER_RATES[b]);
  const sameInTier = tiers.every((t) => { const rs = rates.filter((x) => tierOf(x.id) === t).map((x) => x.rate); return rs.length === R.RELICS.filter((r) => r.tier === t).length && rs.every((v) => Math.abs(v - rs[0]) < 1e-12); });
  return Math.abs(sum - 1) < 1e-9 && rates.every((x) => tiers.includes(tierOf(x.id))) && sameInTier;
});
let leak = false; { let st = {}; for (let i = 0; i < 300; i++) { const d = R.drawRelicShards(st, 1, rng, "gem"); if (d.got.some((id) => ["N", "R"].includes(tierOf(id)))) leak = true; st = d.state; } }
let leakGold = false; { let st = {}; for (let i = 0; i < 300; i++) { const d = R.drawRelicShards(st, 1, rng, "gold"); if (d.got.some((id) => ["SSR", "UR", "LR"].includes(tierOf(id)))) leakGold = true; st = d.state; } }
ok("유물 뽑기 3종: 확률 합 1 · 공시한 등급만 · 등급 안 균등 · 보석에서 일반 · 희귀 없음 · 골드에서 전설 이상 없음", bannerOk && !leak && !leakGold);
{
  // ★1 전 유물 가중(2026-10-29) — 같은 등급 안에서 조각 1 ~ 2개인 유물만 ×RELIC_IN_PROGRESS_WEIGHT(★1 뒤 · 빈 유물은 보통), 등급 확률 합은 그대로
  const lrIds = R.RELICS.filter((r) => r.tier === "LR").map((r) => r.id);
  const st = { [lrIds[0]]: 1, [lrIds[1]]: 3, [lrIds[3]]: 4 };   // 0번: ★1 전 · 1번: ★1 딱 · 3번: ★1 뒤 모으는 중(가중 없음 — 고루 갖추기가 늦어지지 않게)
  const rs = R.relicDrawRates(st, "gem");
  const rate = (id) => rs.find((x) => x.id === id).rate;
  const lrSum = lrIds.reduce((a, id) => a + rate(id), 0);
  const tierSame = Math.abs(lrSum - R.RELIC_BANNER_RATES.gem.LR) < 1e-12 && Math.abs(rs.reduce((a, x) => a + x.rate, 0) - 1) < 1e-9;
  ok(`★1 전 유물 가중 ×${R.RELIC_IN_PROGRESS_WEIGHT}: 같은 등급 다른 유물보다 그만큼 잘 나오고 ★1 뒤 유물은 보통 · 등급 확률 합 그대로`, Math.abs(rate(lrIds[0]) / rate(lrIds[2]) - R.RELIC_IN_PROGRESS_WEIGHT) < 1e-9 && Math.abs(rate(lrIds[1]) - rate(lrIds[2])) < 1e-12 && Math.abs(rate(lrIds[3]) - rate(lrIds[2])) < 1e-12 && tierSame, `${rate(lrIds[0]).toFixed(4)} / ${rate(lrIds[2]).toFixed(4)} · LR 합 ${lrSum.toFixed(4)}`);
}
{
  // 초월(LR)을 다 모으면 보석 뽑기의 남은 등급끼리 비례
  const allLr = Object.fromEntries(R.RELICS.filter((r) => r.tier === "LR").map((r) => [r.id, 15]));
  const t = R.relicBannerTierRates(allLr, "gem");
  ok("다 모은 등급(초월)은 빠지고 남은 등급끼리 비례(영웅 40 · 전설 34 · 신화 19 → 합 1)", !t.LR && Math.abs((t.SR ?? 0) + (t.SSR ?? 0) + (t.UR ?? 0) - 1) < 1e-9 && Math.abs((t.SR ?? 0) / (t.SSR ?? 1) - 40 / 34) < 1e-9, JSON.stringify(t));
}
// 기준은 게임 안 숫자 — 상점 "성급 조각 선택팩"(원하는 동료 조각 10개 = 120 보석)으로 동료 첫 승급(★1→★2 조각 20) = 240 보석.
// 유니크 ★ 하나(조각 3개)는 무엇이 나올지 못 고르니 이보다 싸야 하고, 같은 보석 소비처로서 너무 싸지 않게 그 절반 이상.
const pack = CAT.GEM_PRODUCTS.find((x) => x.id === "shard-pack");
const allyStarGems = (pack.gemCost / 10) * A.STAR_SHARD_COST[1];
const relicStarGems = R.relicBannerCost("gem", 1).single * R.RELIC_SHARDS_PER_STAR;
ok("유니크 ★ 하나(보석)는 고르는 동료 첫 승급(조각팩)보다 싸고 그 절반 이상", relicStarGems < allyStarGems && relicStarGems >= allyStarGems / 2, `유니크 ★ ${relicStarGems} · 동료 ★2 ${allyStarGems} 보석`);
ok("유니크 한 번은 동료 1회보다 싸다 · 10회는 9회 값", R.RELIC_DRAW.singleCost < G.GACHA.singleCost && R.RELIC_DRAW.tenCost === R.RELIC_DRAW.singleCost * 9, `유니크 ${R.RELIC_DRAW.singleCost} · 10회 ${R.RELIC_DRAW.tenCost} · 동료 ${G.GACHA.singleCost}`);
// 참고(단언 아님): 보석만으로 유니크 3종 ★1 · 유니크 3종 ★5 — 무과금 하루 약 38.6 보석
const uniqueOne = [];
// 참고(단언 아님, 2026-10-28 6등급): 보석 뽑기로 첫 초월 ★1 까지 · 전설 6종 ★1 까지
for (let k = 0; k < RUNS; k++) { let st = {}, n = 0; while (n < 2000 && !R.RELICS.some((r) => r.tier === "LR" && R.relicStars(st, r.id) >= 1)) { st = R.drawRelicShards(st, 1, rng, "gem").state; n += 1; } uniqueOne.push(n); }
const ssrAll = []; for (let k = 0; k < 400; k++) { let st = {}, n = 0; while (n < 3000 && !R.RELICS.filter((r) => r.tier === "SSR").every((r) => R.relicStars(st, r.id) >= 1)) { st = R.drawRelicShards(st, 1, rng, "gem").state; n += 1; } ssrAll.push(n); }
const relicRow = { firstLrDraws: mean(uniqueOne).toFixed(1), firstLrDays: days(mean(uniqueOne)).toFixed(1), ssrAllOneDraws: mean(ssrAll).toFixed(0), ssrAllOneDays: days(mean(ssrAll)).toFixed(0), goldAtStage30: R.relicBannerCost("gold", 30).single, stone: R.relicBannerCost("stone", 1).single };
console.log("참고 — 보석 뽑기로 첫 초월 ★1 약", relicRow.firstLrDays, "일 · 전설 6종 ★1 약", relicRow.ssrAllOneDays, "일 (무과금 하루 약 38.6 보석)");
if (PRINT) console.log("relic", JSON.stringify(relicRow));

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
// 기준은 게임 안 두 위험 강화에서 온다 — 대장간 북(실패 = 파괴 +0, FORGE_TIERS) 과 보호구(실패 = 1단계 하락, ForgeGame armorChance 와 같은 식).
// 사용자 요청 "무기처럼 파괴" → 북의 앞 구간(+5까지)만큼은 아프고, 이미 있는 보호구 규칙보다는 순해야 한다(장비 · 원정 무기는 사냥 · 성문 방어 진행에 바로 걸린다).
const drumTo = (target) => { const flatD = F.FORGE_TIERS.slice(0, target).reduce((a, t) => a + t.cost, 0); const xs = []; for (let k = 0; k < 2000; k++) { let lv = 0, g = 0, n = 0; while (lv < target && n < 1e6) { n += 1; g += F.FORGE_TIERS[lv].cost; if (rng() < F.FORGE_TIERS[lv].chance) lv += 1; else lv = 0; } xs.push(g / flatD); } return mean(xs); };
const drum5 = drumTo(5);
const armChance = (lv) => Math.max(0.38, 0.94 - lv * 0.045), armCost = (lv) => Math.floor(500 * Math.pow(1.72, lv));
const armFlat = Array.from({ length: 15 }, (_, l) => armCost(l)).reduce((a, b) => a + b, 0);
const armOldRuns = Array.from({ length: 3000 }, () => { let lv = 0, g = 0; while (lv < 15) { g += armCost(lv); if (rng() < armChance(lv)) lv += 1; else lv = Math.max(0, lv - 1); } return g / armFlat; });
const armorRuleX = mean(armOldRuns), armorRuleP90 = pct(armOldRuns, 0.9);
if (PRINT) console.log("anchors", JSON.stringify({ drumTo5: drum5.toFixed(2), armorRuleX: armorRuleX.toFixed(2), armorRuleP90: armorRuleP90.toFixed(2) }));
for (const name of ["장비 +10", "원정 무기 +20"]) {
  const a = rows[`${name} 방지권0`], b = rows[`${name} 방지권3`];
  ok(`${name}: 기대 골드가 북 +5 (×${drum5.toFixed(1)}) 이상 · 보호구 하락 규칙 (×${armorRuleX.toFixed(1)}) 이하 · 하위 10% 도 보호구(×${armorRuleP90.toFixed(1)}) 이하`, a.goldX >= drum5 && a.goldX <= armorRuleX && a.goldP90X <= armorRuleP90, `×${a.goldX} (P90 ×${a.goldP90X}) · 강화석 ×${a.stonesX} · 한 번이라도 파괴 ${Math.round(a.anyDestroy * 100)}%`);
  ok(`${name}: 방지권을 쓰면 확실히 덜 아프다(3장 → 기대 골드가 없을 때보다 낮음)`, Number(b.goldX) < Number(a.goldX) && b.anyDestroy < a.anyDestroy, `×${b.goldX} · 파괴 ${Math.round(b.anyDestroy * 100)}%`);
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
