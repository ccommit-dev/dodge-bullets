// 난이도 감사(2026-10-27) 수정 — 순수 로직 검사.  node scripts/verify-difficulty.mjs
// ② 옛 활 · 지팡이 주력 계정의 무기 이전 · ③ 6등급 버그 · 체험 출전 상한 · ④ 심연 골드 곡선
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
].join("\n"));
const out = join(dir, "bundle.mjs");
await build({ entryPoints: [entry], bundle: true, format: "esm", platform: "node", outfile: out, logLevel: "error", define: { "import.meta.env.BASE_URL": '"/"', "import.meta.env.DEV": "false", "import.meta.env.VITE_QA_BUILD": '"false"' } });
const { prog: P, allies: AL, trial: TR, model: M } = await import(pathToFileURL(out).href);
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

console.log(fails ? `${fails} FAIL` : "ALL PASS");
process.exit(fails ? 1 : 0);
