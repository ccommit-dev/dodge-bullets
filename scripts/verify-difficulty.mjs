// 난이도 감사(2026-10-27) 수정 — 순수 로직 검사.  node scripts/verify-difficulty.mjs
// ② 옛 활 · 지팡이 주력 계정의 무기 이전 · ③ 6등급 버그 · 체험 출전 상한 · ④ 심연 골드 곡선 · ⑤ 무기 · 동료 곡선 · 뽑기 레벨 · 초월 천장
import { build } from "esbuild";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd().replace(/\\/g, "/");
const dir = mkdtempSync(join(tmpdir(), "difficulty-"));
const entry = join(dir, "entry.ts");
writeFileSync(entry, [
  `export * as prog from "${root}/src/progression/model";`,
  `export * as allies from "${root}/src/titans/allies";`,
  `export * as trial from "${root}/src/titans/trialAlly";`,
  `export * as model from "${root}/src/titans/model";`,
  `export * as roster from "${root}/src/titans/allyRoster";`,
  `export * as gacha from "${root}/src/titans/gacha";`,
  `export * as summon from "${root}/src/titans/summonLevel";`,
  `export * as weapons from "${root}/src/titans/weapons";`,
].join("\n"));
const out = join(dir, "bundle.mjs");
await build({ entryPoints: [entry], bundle: true, format: "esm", platform: "node", outfile: out, logLevel: "error", define: { "import.meta.env.BASE_URL": '"/"', "import.meta.env.DEV": "false", "import.meta.env.VITE_QA_BUILD": '"false"' } });
const { prog: P, allies: AL, trial: TR, model: M, roster: RO, gacha: G, summon: S, weapons: W } = await import(pathToFileURL(out).href);
rmSync(dir, { recursive: true, force: true });
let fails = 0;
const ok = (n, c, d = "") => { console.log(`${c ? "PASS" : "FAIL"} ${n}${d ? " — " + d : ""}`); if (!c) fails += 1; };

// ② 무기 이전
const base = P.emptyCharacterProgress();
const norm = (o) => P.normalizeCharacterProgress({ ...base, claimedRewards: [], ...o });
ok("② 옛 활 주력(활 +16 · 북 +3) → 활", norm({ expeditionWeapon: "bow", expeditionWeaponForge: { bow: 16, staff: 0, spear: 0 }, equippedWeaponLevel: 3, equippedWeaponKind: "sword" }).equippedWeaponKind === "bow");
ok("② 옛 지팡이 주력(지팡이 +12 · 북 +2) → 지팡이", norm({ expeditionWeapon: "staff", expeditionWeaponForge: { bow: 0, staff: 12, spear: 0 }, equippedWeaponLevel: 2 }).equippedWeaponKind === "staff");
ok("② 북이 더 높으면(북 +12 ≈ 16 · 활 +10) 검 그대로", norm({ expeditionWeapon: "bow", expeditionWeaponForge: { bow: 10, staff: 0, spear: 0 }, equippedWeaponLevel: 12 }).equippedWeaponKind === "sword");
ok("② 옛 정비 기본 사격(expeditionBasic 8 → 활 16)도 센다", norm({ expeditionWeapon: "bow", expeditionWeaponForge: { bow: 0, staff: 0, spear: 0 }, expeditionBasic: 8, equippedWeaponLevel: 4 }).equippedWeaponKind === "bow");
ok("② 직접 고른 무기는 건드리지 않는다(창)", norm({ expeditionWeapon: "bow", expeditionWeaponForge: { bow: 20, staff: 0, spear: 0 }, equippedWeaponLevel: 0, equippedWeaponKind: "spear" }).equippedWeaponKind === "spear");
const once = norm({ expeditionWeapon: "bow", expeditionWeaponForge: { bow: 16, staff: 0, spear: 0 }, equippedWeaponLevel: 3 });
ok("② 이전 표시가 남는다", once.claimedRewards.includes(P.WEAPON_KIND_MIGRATED));
const back = P.normalizeCharacterProgress({ ...once, equippedWeaponKind: "sword" });
ok("② 한 번만 — 이전 뒤 검으로 바꾸면 다시 활로 돌리지 않는다", back.equippedWeaponKind === "sword");
ok("② 새 계정은 검", P.normalizeCharacterProgress(null).equippedWeaponKind === "sword");

// ③ 6등급 버그 · 체험 출전 상한
const ids = Object.keys(AL.ALLY_RARITY);
const byTier = (t) => ids.filter((id) => AL.ALLY_RARITY[id] === t);
const highs = [...byTier("UR"), ...byTier("LR")].slice(0, 2);
ok("③ 전설의 공명: 신화 · 초월 2명도 켜진다", highs.length === 2 && AL.partySynergies(highs).list.find((x) => x.id === "legend")?.active === true, highs.join(","));
ok("③ 체험 기준 층 = min(지역 상한, max(5, 최고 층))", TR.trialCeiling(15, 11) === 11 && TR.trialCeiling(15, 3) === 5 && TR.trialCeiling(15, 40) === 15);
ok("③ 체험 배수 1.5", TR.TRIAL_BEST_MUL === 1.5);
// 지역 상한 15 · 최고 층 11 에서 15층 동료(아직 못 닿은 층)는 체험 세기 — 11층까지 열린 최강의 1.5배를 넘지 않는다
const above = M.HEROES.filter((h) => h.unlockStage > 11 && h.unlockStage <= 15 && h.baseDps > 0);
const cap = TR.TRIAL_BEST_MUL * TR.bestUnlockedBaseDps(11);
const worst = Math.max(...above.map((h) => h.baseDps * TR.trialDpsMul(h, TR.trialCeiling(15, 11))));
ok("③ 지역 안 · 아직 못 닿은 층의 동료는 최고 층 최강의 1.5배까지만", above.length > 0 && worst <= cap + 1e-6, `최대 ${Math.round(worst)} ≤ ${Math.round(cap)} (${above.length}명)`);

// ④ 심연 골드 곡선 — 24층 뒤 층당 골드가 체력(×1.38)을 예전(×1.26)보다 가까이 따라간다
ok("④ 심연 보정: 24층까지 1 · 25층 ×1.03 · 40층 ×1.03^16", M.abyssGoldBoost(24) === 1 && Math.abs(M.abyssGoldBoost(25) - 1.03) < 1e-9 && Math.abs(M.abyssGoldBoost(40) - Math.pow(1.03, 16)) < 1e-9);
const step = M.killGold(41, false, false) / M.killGold(40, false, false);
ok("④ 심연 층당 처치 골드 ≈ ×1.30 (예전 ×1.26)", step > 1.28 && step < 1.32, step.toFixed(3));
ok("④ 24층 전 골드는 그대로", M.killGold(20, false, false) === Math.max(1, Math.floor(5 * Math.pow(1.26, 19) * M.huntingArea(20).rewardMultiplier)));

// ⑤ 무기 — 창은 대장 특화 · 활은 탭 1.0 + 자동 공격 속도
ok("⑤ 무기: 창 탭 ×1.12 · 대장 ×1.25 · 활 탭 ×1.15 · 활 자동 ×1.25 · 활 기술 4탭 ×2.2", W.WEAPON_EFFECTS.spear.tapMul === 1.12 && W.WEAPON_EFFECTS.spear.bossMul === 1.25 && W.WEAPON_EFFECTS.bow.tapMul === 1.15 && W.WEAPON_EFFECTS.bow.autoSpeedMul === 1.25 && W.WEAPON_TECH.bow.every === 4 && W.WEAPON_TECH.bow.mul === 2.2);
// ⑤ 동료 곡선
const H = (id) => M.HEROES.find((h) => h.id === id);
ok("⑤ 마리나 ×2 (190 · 5300) · 오리온 ×0.4 (30000 · 460000) — 골드 효율 그대로", H("marina").baseDps === 190 && H("marina").baseCost === 5300 && H("orion").baseDps === 30000 && H("orion").baseCost === 460000 && H("orion").unlockStage === 30);
ok("⑤ 앤빌 35층 (34~37층 빈칸 메움)", H("anvil").unlockStage === 35);
const news = RO.NEW_ALLIES.map((d) => ({ d, h: H(d.id) }));
const effOf = (h) => h.baseDps / h.baseCost;
ok("⑤ 새 동료: 같은 층 동료끼리 골드 효율이 같다(반올림 흔들림 없음)", news.every(({ d, h }) => news.filter((o) => o.d.stage === d.stage).every((o) => Math.abs(effOf(o.h) / effOf(h) - 1) < 1e-9)));
const storm = news.find((x) => x.d.id === "storm").h;   // SR 10층 — 예전엔 10층 곡선(120), 이제 8층 곡선
ok("⑤ 새 동료 힘 = 두 층 아래 곡선 (영웅 스톰 10층 < 120 · > 50)", storm.baseDps < 120 && storm.baseDps > 50, String(Math.round(storm.baseDps)));
// ⑤ 뽑기 레벨 · 초월 천장
ok("⑤ 뽑기 레벨 문턱 절반 (Lv10 = 260회)", S.SUMMON_LEVEL_PULLS[9] === 260 && S.summonLevel(259) === 9 && S.summonLevel(260) === 10);
const lrRates = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((lv) => S.tierRates(lv).LR);
ok("⑤ 초월 확률 Lv10 0.8% · 레벨 따라 단조 증가", Math.abs(lrRates[9] - 0.008) < 1e-9 && lrRates.every((r, i) => i === 0 || r > lrRates[i - 1]), lrRates.map((r) => (r * 100).toFixed(2)).join(" "));
ok("⑤ 레벨마다 확률 합 100%", [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].every((lv) => Math.abs(Object.values(S.tierRates(lv)).reduce((a, b) => a + b, 0) - 1) < 1e-9));
const owned = Object.fromEntries(M.HEROES.map((h) => [h.id, 0]));
const lrPool = G.gachaPool(60, 99, Date.now(), 10);
const noLrPool = G.gachaPool(1, 1, Date.now(), 1);
// 2026-10-28 (사용자: "스테이지별 해금 삭제") — 풀은 층과 무관하게 같은 동료(초월 포함). 초반 풀에도 초월이 있다
ok("⑤ 시험 풀: 1층 · 60층 풀 모두 초월이 있다(같은 동료)", lrPool.entries.some((e) => e.rarity === "LR") && noLrPool.entries.some((e) => e.rarity === "LR") && lrPool.entries.length === noLrPool.entries.length);
const atLr = G.pullOnce(lrPool, owned, 0, () => 0.999, null, G.GACHA.lrPityLimit - 1);
ok("⑤ 초월 천장: 199회 누적이면 200회째 초월 확정 · 카운터 0", atLr.result.rarity === "LR" && atLr.lrPity === 0, JSON.stringify({ r: atLr.result.rarity, lp: atLr.lrPity }));
const miss = G.pullOnce(lrPool, owned, 0, () => 0, null, 10);
ok("⑤ 초월이 아니면 +1", miss.result.rarity !== "LR" && miss.lrPity === 11);
const early = G.pullOnce(noLrPool, owned, 0, () => 0.5, null, 10);
ok("⑤ 초반 지역(1층 풀)도 센다", early.result.rarity !== "LR" ? early.lrPity === 11 : early.lrPity === 0);
const full = G.pullOnce(noLrPool, owned, 0, () => 0.5, null, G.GACHA.lrPityLimit - 1);
ok("⑤ 1층 풀에서도 가득 차면(199) 바로 초월 확정 · 0 으로 — 예전엔 초월 있는 지역까지 기다렸다", full.result.rarity === "LR" && full.lrPity === 0);
const carry = G.pullOnce(lrPool, owned, 0, () => 0, null, full.lrPity);
ok("⑤ 확정 뒤 카운터는 처음부터(다음 소환 +1)", carry.result.rarity !== "LR" && carry.lrPity === 1);
ok("⑤ 초월 처음 열리는 층 = 23(셀레스)", G.FIRST_LR_STAGE === 23, String(G.FIRST_LR_STAGE));
let lpSim = 0, got = 0;
for (let i = 0; i < 20; i += 1) { const t = G.pullTen(lrPool, owned, 0, () => 0, false, null, lpSim); lpSim = t.lrPity; got += t.results.filter((r) => r.rarity === "LR").length; }
ok("⑤ 운이 없어도(초월을 안 뽑는 난수) 10연 20번 = 200회째에 초월 정확히 1명", got === 1 && lpSim === 0, `200회 중 초월 ${got}번`);
ok("⑤ 옛 저장(초월 천장 없음)은 0 으로", P.normalizeCharacterProgress({ ...base }).gachaLrPity === 0 && P.normalizeCharacterProgress({ ...base, gachaLrPity: 9999 }).gachaLrPity === 199);

// ⑥ 아쉬운 점 — 값이 내려간 동료는 다시 레벨을 맞춘다(한 번만). 판 4 (2026-10-28 사용자 확정 "예전 힘 이상 + 골드 유지"):
//   예전 힘 이상이 되는 가장 낮은 레벨(한 단계 ×1.125 안) · 판 1 환급 골드는 그대로 · 판 2 는 그대로 · 판 3(가장 가깝게 · 골드 회수) 저장은 올리고 돌려준다
{
  const pw = (base, lv) => M.heroDps({ baseDps: base }, lv);
  const NEW = M.HEROES.filter((h) => M.PRE_REBALANCE_BASE_DPS[h.id] !== undefined && M.PRE_REBALANCE_BASE_COST[h.id] > h.baseCost);
  const ratios = (id) => [10, 20, 30, 40].map((L) => { const h = H(id); const r = M.relevelAlly(M.PRE_REBALANCE_BASE_COST[id], h.baseCost, L, M.PRE_REBALANCE_BASE_DPS[id], h.baseDps); return pw(h.baseDps, r.level) / pw(M.PRE_REBALANCE_BASE_DPS[id], L); });
  // 힘 기준 레벨만(쓴 골드로 오를 레벨이 더 높으면 그쪽을 주므로 이득은 더 크다 — 같은 값으로 골드 길을 끈다)
  const floor = (id) => [10, 20, 30, 40].map((L) => { const h = H(id); const r = M.relevelAlly(h.baseCost, h.baseCost, L, M.PRE_REBALANCE_BASE_DPS[id], h.baseDps); return pw(h.baseDps, r.level) / pw(M.PRE_REBALANCE_BASE_DPS[id], L); });
  const all = NEW.flatMap((h) => ratios(h.id));
  const floors = NEW.flatMap((h) => floor(h.id));
  const others = NEW.filter((h) => h.id !== "orion").flatMap((h) => floor(h.id));
  const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  ok("⑥ 다시 맞춘 레벨은 예전 힘 이상 — 아무도 약해지지 않는다(쓴 골드 길이 더 높으면 그쪽)", all.every((r) => r >= 1), `${NEW.length}명 × Lv.10·20·30·40 최소 ×${Math.min(...all).toFixed(3)} 최대 ×${Math.max(...all).toFixed(3)}`);
  // 대표 저장(예전 판의 같은 6건) — 힘 기준 레벨의 이득. 마일스톤(Lv.25 ×2 · Lv.50 ×2.5)을 건너는 레벨은 한 단계 넘게 커질 수 있다(더 유리)
  const CASES = [["orion", 30], ["orion", 10], ["storm", 15], ["celes", 20], ["anvil", 25], ["leviathan", 12]].map(([id, L]) => { const h = H(id); const r = M.relevelAlly(M.PRE_REBALANCE_BASE_COST[id], h.baseCost, L, M.PRE_REBALANCE_BASE_DPS[id], h.baseDps); return { id, L, to: r.level, ratio: pw(h.baseDps, r.level) / pw(M.PRE_REBALANCE_BASE_DPS[id], L) }; });
  ok("⑥ 힘 기준 레벨은 예전 힘 이상(대표 6건)", CASES.every((c) => c.ratio >= 1) && floors.every((r) => r >= 1), CASES.map((c) => `${c.id} ${c.L}→${c.to} ×${c.ratio.toFixed(2)}`).join(" · "));
  { const o = CASES.filter((c) => c.id === "orion"), nw = CASES.filter((c) => c.id !== "orion");
    ok("⑥ 대표 저장의 이득: 오리온 ×1.03 · 새 동료 ×1.05~1.11 (조금 세진다 · 넓게 보면 마일스톤 건너는 레벨은 더 크다)", o.every((c) => Math.abs(c.ratio - 1.03) < 0.01) && nw.every((c) => c.ratio >= 1.05 && c.ratio < 1.115), `오리온 ${o.map((c) => c.ratio.toFixed(3)).join("·")} · 새 동료 ${nw.map((c) => c.ratio.toFixed(3)).join("·")} · Lv.10~40 평균 오리온 ×${avg(floor("orion")).toFixed(2)} 새 동료 ×${avg(others).toFixed(2)}`); }
  const raw = { heroes: { orion: 30, marina: 20, storm: 15, mia: 40 }, gold: 1000, stage: 30, bestStage: 30 };
  const once = M.normalizeTitansSave(raw);
  const geO = M.relevelAlly(M.PRE_REBALANCE_BASE_COST.orion, H("orion").baseCost, 30, M.PRE_REBALANCE_BASE_DPS.orion, H("orion").baseDps).level;
  const geS = M.relevelAlly(M.PRE_REBALANCE_BASE_COST.storm, H("storm").baseCost, 15, M.PRE_REBALANCE_BASE_DPS.storm, H("storm").baseDps).level;
  ok("⑥ 옛 저장: 오리온 · 스톰은 예전 힘 이상 레벨 · 마리나 · 미아 그대로 · 골드는 줄지 않는다 · 안내",
    once.heroes.orion === geO && once.heroes.storm === geS && geO > 30 && geS > 15 && once.heroes.marina === 20 && once.heroes.mia === 40 && once.gold >= 1000 && once.rebalanceNotice?.changes.length === 2 && once.allyRebalance === M.ALLY_REBALANCE_VERSION,
    JSON.stringify({ orion: once.heroes.orion, storm: once.heroes.storm, gold: once.gold }));
  const twice = M.normalizeTitansSave({ ...once, rebalanceNotice: null });
  ok("⑥ 한 번만 — 다시 불러와도 레벨 · 골드가 그대로", twice.heroes.orion === once.heroes.orion && twice.heroes.storm === once.heroes.storm && twice.gold === once.gold && twice.rebalanceNotice === null);
  // 판 1 저장(골드 기준 · 남은 골드 환급) — 오리온 30 은 35 · 스톰 15 는 18
  const refundOrion = M.relevelAlly(1_150_000, H("orion").baseCost, 30, 0, 0, false).gold;
  const v1 = M.normalizeTitansSave({ heroes: { orion: 35, storm: 18 }, gold: refundOrion + 500, allyRebalance: 1 });
  ok("⑥ 판 1 저장(오리온 35 · 스톰 18)은 힘 기준까지 · 그때 받은 골드는 그대로 가진다", v1.heroes.orion === geO && v1.heroes.storm === geS && v1.gold === refundOrion + 500 && !(v1.rebalanceNotice?.gold < 0) && v1.allyRebalance === M.ALLY_REBALANCE_VERSION, JSON.stringify({ o: v1.heroes.orion, s: v1.heroes.storm, g: v1.gold, n: v1.rebalanceNotice?.gold }));
  const v1poor = M.normalizeTitansSave({ heroes: { orion: 35 }, gold: 10, allyRebalance: 1 });
  ok("⑥ 골드를 이미 썼어도 거두지 않는다", v1poor.gold === 10 && v1poor.heroes.orion === geO, JSON.stringify({ g: v1poor.gold }));
  const v2 = M.normalizeTitansSave({ heroes: { orion: geO, storm: 22 }, gold: 7, allyRebalance: 2 });
  ok("⑥ 판 2 로 이미 올린 저장(스톰 22)은 레벨을 깎지 않는다", v2.heroes.storm === 22 && v2.heroes.orion === geO && v2.gold === 7 && !v2.rebalanceNotice && v2.allyRebalance === M.ALLY_REBALANCE_VERSION);
  // 판 3 저장 — 예전 힘에 '가장 가까운' 레벨(약해진 동료가 있다) · 판 1 출신은 골드를 거뒀다 → 예전 힘 이상으로 올리고 그 골드를 돌려준다
  const closeO = M.relevelAlly(M.PRE_REBALANCE_BASE_COST.orion, H("orion").baseCost, 30, M.PRE_REBALANCE_BASE_DPS.orion, H("orion").baseDps, true, true).level;
  const closeC = M.relevelAlly(M.PRE_REBALANCE_BASE_COST.celes, H("celes").baseCost, 20, M.PRE_REBALANCE_BASE_DPS.celes, H("celes").baseDps, true, true).level;
  const geC = M.relevelAlly(M.PRE_REBALANCE_BASE_COST.celes, H("celes").baseCost, 20, M.PRE_REBALANCE_BASE_DPS.celes, H("celes").baseDps).level;
  const v3 = M.normalizeTitansSave({ heroes: { orion: closeO, celes: closeC }, gold: 0, allyRebalance: 3 });
  const v3o = pw(H("orion").baseDps, v3.heroes.orion) / pw(M.PRE_REBALANCE_BASE_DPS.orion, 30), v3c = pw(H("celes").baseDps, v3.heroes.celes) / pw(M.PRE_REBALANCE_BASE_DPS.celes, 20);
  ok("⑥ 판 3 저장(셀레스 ×0.94 처럼 약해진 동료)은 예전 힘 이상으로 다시 올린다", closeC < geC && v3.heroes.celes >= geC && v3o >= 1 && v3c >= 1 && v3.allyRebalance === M.ALLY_REBALANCE_VERSION, JSON.stringify({ orion: `${closeO}→${v3.heroes.orion} ×${v3o.toFixed(2)}`, celes: `${closeC}→${v3.heroes.celes} ×${v3c.toFixed(2)}` }));
  const v1to3 = M.normalizeTitansSave({ heroes: { orion: closeO }, gold: 0, allyRebalance: 3 });
  ok("⑥ 판 3 이 거뒀을 수 있는 판 1 환급 골드는 돌려준다", v1to3.gold > 0 && v1to3.rebalanceNotice?.gold === v1to3.gold, JSON.stringify({ g: v1to3.gold, refundOrion }));
  ok("⑥ 새 계정 · 환생 저장은 다시 계산하지 않는다", M.defaultTitansSave().allyRebalance === M.ALLY_REBALANCE_VERSION && M.normalizeTitansSave({ ...M.defaultTitansSave(), heroes: { orion: 30 } }).heroes.orion === 30);
  const lv1 = M.normalizeTitansSave({ heroes: { orion: 1 }, gold: 0 });
  ok("⑥ Lv.1(뽑기로 받은 것)은 건드리지 않는다", lv1.heroes.orion === 1 && lv1.gold === 0 && !lv1.rebalanceNotice);
}

console.log(fails ? `${fails} FAIL` : "ALL PASS");
process.exit(fails ? 1 : 0);
