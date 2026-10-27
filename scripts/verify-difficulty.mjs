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
ok("⑤ 무기: 창 대장 ×1.35 · 활 탭 ×1.15 · 활 자동 ×1.25 · 활 기술 4탭 ×2.2", W.WEAPON_EFFECTS.spear.bossMul === 1.35 && W.WEAPON_EFFECTS.bow.tapMul === 1.15 && W.WEAPON_EFFECTS.bow.autoSpeedMul === 1.25 && W.WEAPON_TECH.bow.every === 4 && W.WEAPON_TECH.bow.mul === 2.2);
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
ok("⑤ 시험 풀: 60층 풀엔 초월이 있고 1층 풀엔 없다", lrPool.entries.some((e) => e.rarity === "LR") && !noLrPool.entries.some((e) => e.rarity === "LR"));
const atLr = G.pullOnce(lrPool, owned, 0, () => 0.999, null, G.GACHA.lrPityLimit - 1);
ok("⑤ 초월 천장: 199회 누적이면 200회째 초월 확정 · 카운터 0", atLr.result.rarity === "LR" && atLr.lrPity === 0, JSON.stringify({ r: atLr.result.rarity, lp: atLr.lrPity }));
const miss = G.pullOnce(lrPool, owned, 0, () => 0, null, 10);
ok("⑤ 초월이 아니면 +1", miss.result.rarity !== "LR" && miss.lrPity === 11);
const early = G.pullOnce(noLrPool, owned, 0, () => 0.5, null, 10);
ok("⑤ 초반 지역(초월 없는 풀)도 센다 — 초반에 많이 뽑아도 천장이 버려지지 않는다", early.lrPity === 11);
const full = G.pullOnce(noLrPool, owned, 0, () => 0.5, null, G.GACHA.lrPityLimit - 1);
ok("⑤ 초월 없는 풀에서 가득 차면 199 에서 기다린다(초월이 아닌 결과)", full.result.rarity !== "LR" && full.lrPity === G.GACHA.lrPityLimit - 1);
const carry = G.pullOnce(lrPool, owned, 0, () => 0, null, full.lrPity);
ok("⑤ 그 뒤 초월 있는 풀의 첫 소환 = 초월 확정", carry.result.rarity === "LR" && carry.lrPity === 0);
ok("⑤ 초월 처음 열리는 층 = 23(셀레스)", G.FIRST_LR_STAGE === 23, String(G.FIRST_LR_STAGE));
let lpSim = 0, got = 0;
for (let i = 0; i < 20; i += 1) { const t = G.pullTen(lrPool, owned, 0, () => 0, false, null, lpSim); lpSim = t.lrPity; got += t.results.filter((r) => r.rarity === "LR").length; }
ok("⑤ 운이 없어도(초월을 안 뽑는 난수) 10연 20번 = 200회째에 초월 정확히 1명", got === 1 && lpSim === 0, `200회 중 초월 ${got}번`);
ok("⑤ 옛 저장(초월 천장 없음)은 0 으로", P.normalizeCharacterProgress({ ...base }).gachaLrPity === 0 && P.normalizeCharacterProgress({ ...base, gachaLrPity: 9999 }).gachaLrPity === 199);

// ⑥ 아쉬운 점 — 값이 내려간 동료는 쓴 골드로 다시 레벨을 맞춘다(한 번만)
{
  const orion = H("orion");
  const pw = (base, lv) => base * Math.pow(1.125, lv - 1) * (lv >= 10 ? 1.5 : 1) * (lv >= 25 ? 2 : 1) * (lv >= 50 ? 2.5 : 1) * (lv >= 100 ? 3 : 1);
  const r = M.relevelAlly(1_150_000, orion.baseCost, 30);
  const ratio = pw(orion.baseDps, r.level) / pw(75_000, 30);
  ok("⑥ 오리온 Lv.30 → 쓴 골드로 다시 맞추면 예전 힘의 0.7 배 이상(0.4 배 아님)", r.level > 30 && ratio >= 0.7 && ratio < 1.05, `Lv.${r.level} · ×${ratio.toFixed(2)} · 남은 골드 ${r.gold}`);
  const raw = { heroes: { orion: 30, marina: 20, storm: 15, mia: 40 }, gold: 1000, stage: 30, bestStage: 30 };
  const once = M.normalizeTitansSave(raw);
  ok("⑥ 옛 저장: 오리온 · 새 동료(스톰)만 다시 계산 · 마리나 · 미아는 그대로 · 남은 골드 얹기 · 안내 남김",
    once.heroes.orion === r.level && once.heroes.storm > 15 && once.heroes.marina === 20 && once.heroes.mia === 40 && once.gold > 1000 && once.rebalanceNotice?.changes.length === 2 && once.allyRebalance === M.ALLY_REBALANCE_VERSION,
    JSON.stringify({ orion: once.heroes.orion, storm: once.heroes.storm, gold: once.gold, n: once.rebalanceNotice?.changes }));
  const twice = M.normalizeTitansSave({ ...once, rebalanceNotice: null });
  ok("⑥ 한 번만 — 다시 불러와도 레벨 · 골드가 그대로", twice.heroes.orion === once.heroes.orion && twice.heroes.storm === once.heroes.storm && twice.gold === once.gold && twice.rebalanceNotice === null);
  ok("⑥ 새 계정 · 환생 저장은 다시 계산하지 않는다", M.defaultTitansSave().allyRebalance === M.ALLY_REBALANCE_VERSION && M.normalizeTitansSave({ ...M.defaultTitansSave(), heroes: { orion: 30 } }).heroes.orion === 30);
  const lv1 = M.normalizeTitansSave({ heroes: { orion: 1 }, gold: 0 });
  ok("⑥ Lv.1(뽑기로 받은 것)은 건드리지 않는다", lv1.heroes.orion === 1 && lv1.gold === 0 && !lv1.rebalanceNotice);
}

console.log(fails ? `${fails} FAIL` : "ALL PASS");
process.exit(fails ? 1 : 0);
