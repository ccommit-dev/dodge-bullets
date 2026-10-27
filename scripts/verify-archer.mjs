// 아처 키우기 차용 — 도토리 합성 · 대장 사다리 · 첫 발견 (2026-10-22) 순수 로직 검사.  node scripts/verify-archer.mjs
import { build } from "esbuild";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd().replace(/\\/g, "/");
const dir = mkdtempSync(join(tmpdir(), "archer-"));
const entry = join(dir, "entry.ts");
writeFileSync(entry, [
  `export * as acorns from "${root}/src/titans/acorns";`,
  `export * as ladder from "${root}/src/titans/bossLadder";`,
  `export * as disc from "${root}/src/titans/discovery";`,
  `export * as model from "${root}/src/titans/model";`,
  `export * as prog from "${root}/src/progression/model";`,
  `export * as coins from "${root}/src/titans/eventCoins";`,
  `export * as shop from "${root}/src/economy/eventShop";`,
  `export * as gacha from "${root}/src/titans/gacha";`,
  `export * as allies from "${root}/src/titans/allies";`,
  `export * as trial from "${root}/src/titans/trialAlly";`,
  `export * as idle from "${root}/src/progression/idle";`,
].join("\n"));
const out = join(dir, "bundle.mjs");
await build({ entryPoints: [entry], bundle: true, format: "esm", platform: "node", outfile: out, logLevel: "error", define: { "import.meta.env.BASE_URL": '"/"', "import.meta.env.DEV": "false", "import.meta.env.VITE_QA_BUILD": "undefined", "import.meta.env.VITE_TOSS_AD_GROUP_ID": "undefined", "import.meta.env.PROD": "true" } });
const { acorns: A, ladder: L, disc: D, model: M, prog: P, coins: C, shop: S, gacha: G, allies: AL, trial: T, idle: I } = await import(pathToFileURL(out).href);
rmSync(dir, { recursive: true, force: true });

let fails = 0;
const ok = (name, cond, detail = "") => { console.log(`${cond ? "PASS" : "FAIL"} ${name}${detail ? " — " + detail : ""}`); if (!cond) fails += 1; };

// ── 1. 도토리 ──
let s = A.emptyAcorns();
ok("빈 도토리 판: 12칸 비어 있음", s.grid.length === 12 && A.freeSlots(s) === 12);
s = A.tickAcorns(s, A.ACORN_MAKE_SEC * 3 + 1);
ok("6초마다 하나 — 19초면 3개 · 남은 1초", s.grid.filter((l) => l === 1).length === 3 && Math.abs(s.acc - 1) < 1e-9, JSON.stringify(s.grid.slice(0, 4)));
const m = A.mergeAcorns(s, 0, 1);
ok("같은 단계 둘을 합치면 한 단계 위 · 앞 칸은 빈다 · 새 최고", !!m && m.state.grid[1] === 2 && m.state.grid[0] === 0 && m.made === 2 && m.isNewBest);
ok("다른 단계 · 같은 칸 · 빈 칸은 합쳐지지 않는다", A.mergeAcorns(m.state, 1, 2) === null && A.mergeAcorns(s, 0, 0) === null && A.mergeAcorns(m.state, 0, 2) === null);
let full = A.emptyAcorns(); full = A.tickAcorns(full, 1000);
ok("칸이 가득 차면 더 만들지 않고 쌓인 시간도 한 개 분량에서 멈춘다", A.freeSlots(full) === 0 && full.acc <= A.ACORN_MAKE_SEC);
const e = A.equipAcorn(m.state, 1, "mia");
ok("끼우기: 동료에게 Lv2 · 칸은 비거나 예전 것으로", e && e.allyAmmo.mia === 2 && e.grid[1] === 0);
const e2 = A.equipAcorn({ ...e, grid: e.grid.map((l, i) => (i === 5 ? 4 : l)) }, 5, "mia");
ok("맞바꿈: 더 높은 도토리를 끼우면 예전 도토리가 그 칸으로", e2.allyAmmo.mia === 4 && e2.grid[5] === 2);
const muls = [1, 3, 5, 8, 12].map((l) => A.acornMul(l));
ok("배율이 단계마다 눈에 띄게 뛴다 (Lv1 ×1.10 · Lv5 ×1.90 · Lv12 ×4.84)", Math.abs(muls[0] - 1.1) < 1e-9 && Math.abs(muls[2] - 1.9) < 1e-9 && Math.abs(muls[4] - 4.84) < 1e-9 && muls.every((v, i) => i === 0 || v > muls[i - 1]), muls.map((v) => v.toFixed(2)).join(" "));
ok("끼운 것 없음 = ×1", A.acornMul(0) === 1 && A.acornMul(undefined) === 1);
const norm = A.normalizeAcorns({ grid: [3, 99, -1, "x"], allyAmmo: { mia: 7, leon: 0 }, acc: 99 });
ok("정규화: 단계 0~12 · 빈 동료 제거 · acc 상한 · 최고 단계 계산", norm.grid[0] === 3 && norm.grid[1] === 12 && norm.grid[2] === 0 && norm.allyAmmo.mia === 7 && !("leon" in norm.allyAmmo) && norm.acc === A.ACORN_MAKE_SEC && norm.best === 12);
ok("사냥 저장에 도토리 · 번개 기본값", M.defaultTitansSave().acorns.grid.length === 12 && M.defaultTitansSave().lightningLevel === 0 && M.normalizeTitansSave({}).acorns.best === 0);

// ── 3. 대장 사다리 ──
let lad = L.emptyLadder();
const seq = [];
for (let st = 1; st <= 8; st += 1) { const r = L.climbLadder(lad, st); seq.push(r.perk); lad = r.ladder; }
ok("처음 깬 대장마다 특성이 차례로 오른다 (동료 → 탭 → 골드 → 공속)", seq.join(",") === "ally,tap,gold,speed,ally,tap,gold,speed", seq.join(","));
ok("이미 깬 높이(환생 뒤 다시)는 오르지 않는다", L.climbLadder(lad, 5).perk === null && L.climbLadder(lad, 8).perk === null);
const fx = L.ladderEffects(lad);
ok("효과 배율: 동료 ×1.06 · 탭 ×1.10 · 골드 ×1.06 · 공속 ×1.04", Math.abs(fx.allyMul - 1.06) < 1e-9 && Math.abs(fx.tapMul - 1.1) < 1e-9 && Math.abs(fx.goldMul - 1.06) < 1e-9 && Math.abs(fx.speedMul - 1.04) < 1e-9);
let capped = { top: 0, ranks: { ally: L.LADDER_CAP, tap: L.LADDER_CAP, gold: 0, speed: 0 } };
ok("최대 칸에 닿은 특성은 건너뛴다", L.perkForStage(capped, 1) === "gold");
ok("보상 문구에 전후가 있다", /0% → 3%/.test(L.perkLabel(L.emptyLadder(), "ally")), L.perkLabel(L.emptyLadder(), "ally"));
ok("캐릭터 진행 기본값 · 정규화에 사다리 · 발견", P.emptyCharacterProgress().bossLadder.top === 0 && Array.isArray(P.emptyCharacterProgress().discovered) && P.normalizeCharacterProgress({ bossLadder: { top: 9, ranks: { ally: 3 } } }).bossLadder.ranks.ally === 3);

// ── 4. 첫 발견 ──
ok("발견 보상: 몬스터 20 · 동료 50 · 도토리 Lv1 0 · Lv5 50 · 상한 150", D.discoveryGems("monster", "goblin") === 20 && D.discoveryGems("ally", "mia") === 50 && D.discoveryGems("acorn", 1) === 0 && D.discoveryGems("acorn", 5) === 50 && D.discoveryGems("acorn", 99) === 150);
ok("발견 키 · 정규화(중복 제거 · 문자열만)", D.discoveryKey("acorn", 3) === "acorn:3" && D.normalizeDiscovered(["a", "a", 3, "b"]).join() === "a,b");

// ── 2. 번개 ──
ok("번개: 0단계는 번개 없음 · 1단계 ×4.5 · 탭 +12%/단계 · 값은 단계마다 오른다", M.lightningBoltMul(0) === 0 && M.lightningBoltMul(1) === 4.5 && Math.abs(M.lightningTapMul(5) - 1.6) < 1e-9 && M.lightningCost(0) === 150 && M.lightningCost(10) > M.lightningCost(9) && M.LIGHTNING_EVERY === 10);
// ── 5. 환영 선물 ──
ok("환영 선물 보석으로 동료 10연차(900)를 한 번 뽑을 수 있다", M.WELCOME_GIFT_GEMS >= 900);
// ── 7. 환생 ──
ok("환생 출발 골드: 최고 스테이지에 비례(30 → 수천 · 60 → 십만대) · 결정 식", M.rebirthStartGold(30) > 5000 && M.rebirthStartGold(30) < 7000 && M.rebirthStartGold(60) > M.rebirthStartGold(30) * 20 && M.rebirthCrystals(36) === 18 && M.rebirthCrystals(0) === 3, `${M.rebirthStartGold(30)} · ${M.rebirthStartGold(60)}`);
// ── 8. 이벤트 코인 ──
ok("코인 드롭: 일반 3% 1~3개 · 대장 35% 3~5개", C.rollCoinDrop(0.029, 0, false) === 1 && C.rollCoinDrop(0.029, 0.99, false) === 3 && C.rollCoinDrop(0.031, 0, false) === 0 && C.rollCoinDrop(0.34, 0.5, true) === 4 && C.rollCoinDrop(0.36, 0, true) === 0);
let n = 0, got = 0; for (let i = 0; i < 20000; i += 1) { const c = C.rollCoinDrop(Math.random(), Math.random(), false); if (c > 0) { n += 1; got += c; } }
ok("코인 드롭 빈도: 2만 마리에 약 600번(±150) · 평균 2개", n > 450 && n < 750 && Math.abs(got / n - 2) < 0.2, `${n}번 · 평균 ${(got / n).toFixed(2)}`);
const coinProducts = S.eventProductsFor("event-shop").filter((p) => p.coinCost);
ok("이벤트 상점에 코인 교환 칸 3개 · 보석 값 0", coinProducts.length === 3 && coinProducts.every((p) => p.gemCost === 0 && p.weeklyLimit > 0));
ok("캐릭터 진행에 이벤트 코인(기본 0 · 정규화)", P.emptyCharacterProgress().eventCoins === 0 && P.normalizeCharacterProgress({ eventCoins: 42 }).eventCoins === 42 && P.normalizeCharacterProgress({ eventCoins: -5 }).eventCoins === 0);

// ── 5'. 첫 10연 최고 등급 확정 · 깜짝 선물 ──
const pool = G.gachaPool(40, 6);
// 2026-10-27 6등급 — 첫 10연 보장은 "전설 이상"(전설 · 신화 · 초월)
const isTop = (r) => r === "SSR" || r === "UR" || r === "LR";
const top = "전설 이상";
let firstOk = 0, plainMiss = 0;
for (let i = 0; i < 300; i += 1) {
  if (G.pullTen(pool, {}, 0, Math.random, true).results.some((r) => isTop(r.rarity))) firstOk += 1;
  if (!G.pullTen(pool, {}, 0, Math.random, false).results.some((r) => isTop(r.rarity))) plainMiss += 1;
}
ok(`첫 10연은 늘 최고 등급(${top}) 1명 이상 · 보통 10연은 아닐 때가 있다`, firstOk === 300 && plainMiss > 0, `확정 ${firstOk}/300 · 보통 빗나감 ${plainMiss}`);
const early = G.gachaPool(2, 1);
let earlyOk = 0;
for (let i = 0; i < 200; i += 1) { const r = G.pullTen(early, {}, 0, Math.random, true, G.FIRST_TEN_SSR).results; if (r.some((x) => x.rarity === "SSR" && x.fieldPass === true && x.id === G.FIRST_TEN_SSR)) earlyOk += 1; }
ok("초반 풀(전설 없음)에서도 첫 10연은 전설(가장 먼저 열리는 전설) + 출전 허가", !early.entries.some((e) => isTop(e.rarity)) && earlyOk === 200 && !!G.FIRST_TEN_SSR, `${G.FIRST_TEN_SSR} · ${earlyOk}/200`);
ok("출전 허가: field-pass 가 있으면 지역 잠금을 넘는다(없으면 잠김)", AL.canFieldAlly("ari", 16, 15, ["field-pass:ari"]) === true && AL.canFieldAlly("ari", 16, 15, []) === false && AL.canFieldAlly("ari", 16, 15) === false);
// ── 체험 출전 · 방치 (2026-10-23) ──
const ari = M.HEROES.find((h) => h.id === "ari");
// 2026-10-27 동료 60명 — "그 지역 최강"은 새 동료가 될 수 있어 고정 숫자(가렌 120) 대신 그 지역 최강(bestUnlockedBaseDps)으로
{ const best15 = T.bestUnlockedBaseDps(15), best5 = T.bestUnlockedBaseDps(5);
  ok("체험 출전: 지역3(상한 15)에선 아리 ×(체험 배수×그 지역 최강/620) · 지역이 열리면 ×1 · 열린 동료는 늘 ×1", Math.abs(T.trialDpsMul(ari, 15) - Math.min(1, (T.TRIAL_BEST_MUL * best15) / ari.baseDps)) < 1e-9 && T.trialDpsMul(ari, 16) === 1 && T.trialDpsMul(M.HEROES.find((h) => h.id === "leon"), 15) === 1, `${T.trialDpsMul(ari, 15).toFixed(3)} · 최강 ${best15}`);
  ok("체험 아리는 그 지역 최강의 2배를 넘지 않는다", ari.baseDps * T.trialDpsMul(ari, 5) <= 2 * best5 + 1e-9 && ari.baseDps * T.trialDpsMul(ari, 15) <= 2 * best15 + 1e-9, `상한5 최강 ${best5} · 상한15 최강 ${best15}`); }
const idleBase = P.normalizeCharacterProgress({ titanBestStage: 10, pioneeredArea: 3, partyIds: ["mia", "leon"], level: 10 });
const y1 = I.computeIdleYield(idleBase, 8, {}, 4 * 3600, 1e12);
const y2 = I.computeIdleYield({ ...idleBase, partyIds: ["mia", "leon", "ari"], claimedRewards: ["field-pass:ari"] }, 8, {}, 4 * 3600, 1e12);
ok("방치 보상은 동료 DPS 를 쓰지 않는다 — 아리가 편성에 있어도 골드 · 경험 · 강화석 같음(스테이지 · 배율로만)", y1.gold === y2.gold && y1.exp === y2.exp && y1.materials === y2.materials, `${y1.gold} / ${y2.gold}`);
// ── 방치 보상과 지역 잠금 (2026-10-23) — 편성 시너지는 실제로 출전하는 동료만 센다(잠금 · 출전 허가를 그대로) ──
ok("출전 편성: 지역3(상한 15)에서 잠긴 녹스(24) · 허가 없는 아리(16)는 빠지고, 허가 있는 아리는 들어간다", AL.fieldedParty(["mia", "leon", "ari", "nox"], 15, []).join() === "mia,leon" && AL.fieldedParty(["mia", "leon", "ari", "nox"], 15, ["field-pass:ari"]).join() === "mia,leon,ari");
const ssrBase = P.normalizeCharacterProgress({ titanBestStage: 10, pioneeredArea: 3, partyIds: ["ari", "nox"], level: 10 });
const lockedY = I.computeIdleYield(ssrBase, 8, {}, 16 * 3600, 1e12);
const passY = I.computeIdleYield({ ...ssrBase, claimedRewards: ["field-pass:ari", "field-pass:nox"] }, 8, {}, 16 * 3600, 1e12);
ok("방치 조각 드랍: 잠긴 전설 둘은 '전설의 공명'(조각 2배)을 켜지 않는다 · 둘 다 출전 허가면 켠다", lockedY.allyShardDrops * 2 === passY.allyShardDrops && lockedY.allyShardDrops > 0, `${lockedY.allyShardDrops} / ${passY.allyShardDrops}`);
const roleBase = P.normalizeCharacterProgress({ titanBestStage: 10, pioneeredArea: 3, partyIds: ["mia", "leon", "garen"], level: 10 });
ok("방치 효율: 3역할 '균형 편성' +1%p 는 출전하는 셋일 때만 — 가렌(10)은 지역3에서 출전 · 지역1(상한 5)이면 잠겨 빠진다", I.idleRate(roleBase, {}) > I.idleRate({ ...roleBase, pioneeredArea: 1 }, {}), `${I.idleRate(roleBase, {}).toFixed(3)} / ${I.idleRate({ ...roleBase, pioneeredArea: 1 }, {}).toFixed(3)}`);
ok("환영 1000 + 깜짝 500", M.WELCOME_GIFT_GEMS === 1000 && M.SURPRISE_GIFT_GEMS === 500);
ok("캐릭터 진행에 자동 환생(기본 꺼짐)", P.emptyCharacterProgress().autoRebirth === false && P.normalizeCharacterProgress({ autoRebirth: true }).autoRebirth === true);

console.log(fails ? `${fails} FAIL` : "ALL PASS");
process.exit(fails ? 1 : 0);
