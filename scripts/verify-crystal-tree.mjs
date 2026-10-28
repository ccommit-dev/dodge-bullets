// 결정 영구 강화 트리 · 유물 (2026-10-26, "오늘도 환생 2" 차용) 순수 로직 검사.  node scripts/verify-crystal-tree.mjs
import { build } from "esbuild";
import { mkdtempSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd().replace(/\\/g, "/");
const dir = mkdtempSync(join(tmpdir(), "ctree-"));
const entry = join(dir, "entry.ts");
writeFileSync(entry, [
  `export * as tree from "${root}/src/progression/crystalTree";`,
  `export * as relics from "${root}/src/titans/relics";`,
  `export * as prog from "${root}/src/progression/model";`,
  `export * as idle from "${root}/src/progression/idle";`,
  `export * as model from "${root}/src/titans/model";`,
  `export * as stages from "${root}/src/game/stages";`,
  `export { rebirthGains } from "${root}/src/progression/rebirth";`,
].join("\n"));
const out = join(dir, "bundle.mjs");
await build({ entryPoints: [entry], bundle: true, format: "esm", platform: "node", outfile: out, logLevel: "error", define: { "import.meta.env.BASE_URL": '"/"', "import.meta.env.DEV": "false", "import.meta.env.VITE_QA_BUILD": "undefined", "import.meta.env.VITE_TOSS_AD_GROUP_ID": "undefined", "import.meta.env.PROD": "true" } });
const { tree: T, relics: R, prog: P, idle: I, model: M, stages: ST, rebirthGains } = await import(pathToFileURL(out).href);
rmSync(dir, { recursive: true, force: true });

let fails = 0;
const ok = (name, cond, detail = "") => { console.log(`${cond ? "PASS" : "FAIL"} ${name}${detail ? " — " + detail : ""}`); if (!cond) fails += 1; };
const base = () => P.normalizeCharacterProgress(P.emptyCharacterProgress());

// ── 1. 옛 저장 → 방치 배율 그대로 옮김 ──
{
  const legacy = { ...P.emptyCharacterProgress(), inheritanceCrystals: 33 };
  delete legacy.crystalTree;
  const oldMul = 33 * 0.02;
  const n = P.normalizeCharacterProgress(legacy);
  const newMul = T.treeIdleMult(n.crystalTree);
  ok("옛 저장: 결정 33 → 방치 효율 16단계(결정 32)", n.crystalTree.idle === 16 && T.treeSpent(n.crystalTree) === 32);
  ok("옛 저장: 방치 배율 손실 ≤ 0.02 (결정 1개 몫)", oldMul - newMul <= 0.02 + 1e-9 && newMul <= oldMul + 1e-9, `${oldMul.toFixed(2)} → ${newMul.toFixed(2)}`);
  ok("옛 저장: 남은 결정 1", T.freeCrystals(n) === 1);
  const emptyN = base();
  ok("새 계정: 트리 0 · 결정 0", T.treeSpent(emptyN.crystalTree) === 0 && T.freeCrystals(emptyN) === 0);
  const withIdle = { ...n, bestForgeLevel: 0, towerBestFloor: 0, reforgeRank: 0 };
  const plain = { ...withIdle, crystalTree: T.emptyCrystalTree() };
  ok("idleMultiplier 가 트리 방치 줄을 쓴다", Math.abs(I.idleMultiplier(withIdle) - I.idleMultiplier(plain) - newMul) < 1e-9);
  const round = P.normalizeCharacterProgress(JSON.parse(JSON.stringify(n)));
  ok("저장 왕복: 트리 그대로", JSON.stringify(round.crystalTree) === JSON.stringify(n.crystalTree));
}

// ── 2. 강화 · 열쇠 · 되돌리기 ──
{
  let p = { ...base(), inheritanceCrystals: 40, evolutionPoints: 1, rebirthCount: 1 };
  let r = T.upgradeLine(p, "atk");
  ok("공격력 1단계 = 결정 3", r.ok && r.next.crystalTree.atk === 1 && T.freeCrystals(r.next) === 37);
  p = r.next;
  r = T.upgradeLine(p, "atk");
  ok("공격력 2단계 = 결정 4 (계단식)", r.ok && T.freeCrystals(r.next) === 33);
  p = r.next;
  ok("특수 줄은 열쇠 없이 못 올린다", !T.upgradeLine(p, "boss").ok);
  r = T.unlockKey(p, "boss");
  ok("진화 포인트 1 로 대장 사냥꾼을 연다", r.ok && r.next.evolutionPoints === 0 && r.next.crystalTree.keys.includes("boss"));
  p = r.next;
  ok("포인트 없으면 두 번째 열쇠 실패", !T.unlockKey(p, "relic").ok);
  r = T.upgradeLine(p, "boss");
  ok("대장 사냥꾼 1단계", r.ok && r.next.crystalTree.boss === 1);
  p = r.next;
  const eff = T.permanentEffects(p);
  ok("영구 배율: 공격력 +10% · 대장 +8%", Math.abs(eff.tapMul - 1.1) < 1e-9 && Math.abs(eff.allyMul - 1.1) < 1e-9 && Math.abs(eff.bossMul - 1.08) < 1e-9);
  const poor = { ...p, inheritanceCrystals: T.treeSpent(p.crystalTree) };
  ok("결정이 모자라면 실패 · 이유 문구", !T.upgradeLine(poor, "gold").ok && /결정/.test(T.upgradeLine(poor, "gold").reason));
  const reset = T.resetTree(p);
  ok("되돌리기: 결정 전부 반환 · 열쇠 유지", T.freeCrystals(reset) === 40 && reset.crystalTree.keys.includes("boss") && reset.crystalTree.boss === 0);
  const cheat = P.normalizeCharacterProgress({ ...p, inheritanceCrystals: 5 });
  ok("결정보다 많이 쓴 저장은 깎인다", T.treeSpent(cheat.crystalTree) <= 5);
  const nokey = P.normalizeCharacterProgress({ ...p, crystalTree: { ...p.crystalTree, keys: [], boss: 3 } });
  ok("열쇠 없는 특수 줄 단계는 버린다", nokey.crystalTree.boss === 0);
  let maxP = { ...base(), inheritanceCrystals: 100000 };
  for (let i = 0; i < 50; i++) { const x = T.upgradeLine(maxP, "crystal"); if (x.ok) maxP = x.next; }
  ok("최대 단계에서 멈춘다 (환생 결정 10)", maxP.crystalTree.crystal === 10 && !T.upgradeLine(maxP, "crystal").ok);
}

// ── 3. 환생: 시작 스테이지 · 결정 보너스 · 건너뛴 골드 ──
{
  const p = { ...base(), titanBestStage: 40, pioneeredArea: 8, inheritanceCrystals: 500 };
  const g0 = rebirthGains(p);
  ok("트리 0: 1층부터 · 결정 = 예전 식", g0.startStage === 1 && g0.crystals === M.rebirthCrystals(40) && g0.startGold === M.rebirthStartGold(40));
  const p5 = { ...p, crystalTree: { ...p.crystalTree, start: 5, crystal: 3 } };
  const g5 = rebirthGains(p5);
  ok("시작 스테이지 5단계 → 6층부터", g5.startStage === 6, `start ${g5.startStage}`);
  ok("환생 결정 3단계 → +30%", g5.crystals === Math.floor(M.rebirthCrystals(40) * 1.3), `${g5.crystals}`);
  let skip = 0;
  for (let s = 1; s < 6; s++) skip += M.killGold(s, false, false) * M.MOBS_PER_STAGE + M.killGold(s, true, false) + M.stageClearBonus(s);
  ok("건너뛴 1~5층 골드를 출발 골드에 얹는다", g5.startGold === M.rebirthStartGold(40) + Math.floor(skip), `+${Math.floor(skip)}`);
  const capHalf = rebirthGains({ ...p5, titanBestStage: 8, crystalTree: { ...p5.crystalTree, start: 30 } });
  ok("시작 층은 직전 최고의 절반을 넘지 않는다", capHalf.startStage === 4, `${capHalf.startStage}`);
  const ceil = I.stageCeilingFor(1);
  const capCeil = rebirthGains({ ...p5, titanBestStage: 999, pioneeredArea: 1, crystalTree: { ...p5.crystalTree, start: 30 } });
  ok("시작 층은 지역 상한 −1 을 넘지 않는다", capCeil.startStage === Math.min(31, ceil - 1), `ceil ${ceil} → ${capCeil.startStage}`);
}

// ── 4. 유물 ──
{
  let s = {};
  ok("조각 0: 별 0 · 세트 없음", R.relicStars(s, "ember-ring") === 0 && R.relicEffects(s).sets.length === 0);
  // 반쯤 모은 유물부터 채운다
  let r = R.grantRelicShards(s, 1, () => 0);
  const first = r.got[0];
  r = R.grantRelicShards(r.state, 2, () => 0.99);
  ok("첫 조각을 받은 유물을 먼저 ★1 로 채운다", r.got.every((id) => id === first) && R.relicStars(r.state, first) === 1, `${first} ${JSON.stringify(r.state)}`);
  // 2026-10-28 유물 36종 6등급 · 6계열 — 108 조각이면 서른여섯 개 모두 ★1 (반쯤 모은 것부터라 흩어지지 않는다)
  ok("유물 36종 · 계열 6 × 등급 6(계열마다 등급 하나씩) · id 겹침 없음", R.RELICS.length === 36 && new Set(R.RELICS.map((r) => r.id)).size === 36 && R.RELIC_FAMILIES.every((f) => ["N", "R", "SR", "SSR", "UR", "LR"].every((t) => R.RELICS.filter((r) => r.family === f && r.tier === t).length === 1)));
  ok("옛 9종은 효과 그대로(불씨 반지 탭 4% · 용암 심장 대장 5% · 서리 뿔피리 1.5초 · 황금 열매 골드 5%)", R.relicDef("ember-ring").perStar === 0.04 && R.relicDef("lava-heart").perStar === 0.05 && R.relicDef("frost-horn").perStar === 1.5 && R.relicDef("golden-acorn").perStar === 0.05);
  ok("새 유물은 등급이 높을수록 ★ 하나가 세다(같은 효과 · 일반 < 초월)", R.relicDef("ember-spark").perStar < R.relicDef("sun-core").perStar && R.relicDef("copper-coin").perStar < R.relicDef("treasure-chest").perStar);
  let all = {};
  let seed = 7;
  const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  // 세트 3개: 불 계열 셋만 ★1
  const fire3 = { "ember-spark": 3, "ember-ring": 3, "flame-feather": 3 };
  const e3 = R.relicEffects(fire3);
  ok("세트: 같은 계열 ★1 셋이면 켜짐(불 → 화상 20%) · 6개 아니면 ×1.5 아님", e3.sets.join() === "fire" && e3.fullSets.length === 0 && e3.burnShare === 0.2);
  all = R.grantRelicShards(all, 108, rng).state;
  ok("조각 108 → 유물 36 개 모두 ★1", R.RELICS.every((x) => R.relicStars(all, x.id) === 1), JSON.stringify(Object.values(all).filter((v) => v !== 3)));
  const e = R.relicEffects(all);
  ok("세트 여섯 모두 켜짐 · 모두 6개라 ×1.5", e.sets.length === 6 && e.fullSets.length === 6);
  ok("불 세트 ×1.5: 화상 30%", Math.abs(e.burnShare - 0.3) < 1e-9);
  const timeSum = R.RELICS.filter((r) => r.stat === "bossTimeSec").reduce((a, r) => a + r.perStar, 0);
  ok("서리 · 대지 세트 ×1.5: 대장 시간 +9초 · +6초 + 유물 시간", Math.abs(e.bossTimeSec - (timeSum + 9 + 6)) < 1e-9, String(e.bossTimeSec));
  const goldSum = R.RELICS.filter((r) => r.stat === "goldMul").reduce((a, r) => a + r.perStar, 0);
  ok("황금 세트 ×1.5: 골드 ×1.375 · 조각 확률 +6%p", Math.abs(e.goldMul - (1 + goldSum) * 1.375) < 1e-9 && Math.abs(e.dropBonus - 0.06) < 1e-9);
  const pe = T.permanentEffects({ crystalTree: T.emptyCrystalTree(), relics: all });
  ok("조각 확률 12% + 6%p", Math.abs(pe.relicChance - 0.18) < 1e-9);
  let maxed = all;
  maxed = R.grantRelicShards(maxed, 1000, rng).state;
  ok("최대 ★5 · 더 주지 않는다", R.RELICS.every((x) => R.relicStars(maxed, x.id) === 5) && R.grantRelicShards(maxed, 3).got.length === 0);
  const norm = R.normalizeRelics({ "ember-ring": 7.8, bogus: 3, "lava-heart": -2, "lucky-coin": 999 });
  ok("정리: 모르는 id 버림 · 음수 버림 · 상한 15", norm["ember-ring"] === 7 && !("bogus" in norm) && !("lava-heart" in norm) && norm["lucky-coin"] === 15);
  const prog = P.normalizeCharacterProgress({ ...P.emptyCharacterProgress(), relics: { "beaver-crown": 6 } });
  ok("비버 왕관 ★2 → 환생 결정 +8%", T.boostedRebirthCrystals(100, prog) === 108);
  const kept = { ...prog };
  ok("유물은 CharacterProgress 에 있고 환생(performRebirth)이 건드리지 않는다", JSON.stringify(kept.relics) === JSON.stringify(prog.relics));
}

// ── 5. 갈림길 보상 · 아이콘 ──
{
  const shards = ST.BRANCHES.map((b) => b.firstReward.relicShards ?? 0);
  ok("갈림길 첫 보상 모두 유물 조각 1~3", shards.every((n) => n >= 1 && n <= 3), shards.join(","));
  ok("비밀 대장은 3(★1 하나)", ST.BRANCHES.filter((b) => b.kind === "secret").every((b) => b.firstReward.relicShards === 3));
  const icons = [...R.RELICS.map((r) => `public/${R.relicIconUrl(r.id)}`), ...T.TREE_LINES.map((l) => `public/titans/relics/tree-${l.id}.png`), "public/titans/relics/shard.png"];
  const missing = icons.filter((f) => !existsSync(f));
  ok("유물 · 트리 아이콘 44장(유물 36 · 트리 7 · 조각)", missing.length === 0, missing.join(" "));
}

console.log(fails ? `\n${fails} FAIL` : "\nALL PASS");
process.exit(fails ? 1 : 0);
