// 월간 한정 동료 · 전용 장비 (2026-11-16, 사용자: "상위 동료 갖고 싶게 · 달마다 한정 동료 + 전용 장비 · 새 재화 없이 · 힘은 곡선 안") 순수 로직 검사.
//   node scripts/verify-limited-ally.mjs
// 창(start ~ end KST) · 뽑기 풀(창 안에서만 · 픽업 가중 · 2주 회전과 따로) · 곡선 안(대장 ≤ 한 층 위 같은 등급, 일반 < 같은 층) · 전용 장갑 효과 · 이벤트 상점 진열
import { build } from "esbuild";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd().replace(/\\/g, "/");
const dir = mkdtempSync(join(tmpdir(), "limited-"));
const entry = join(dir, "entry.ts");
writeFileSync(entry, [
  `export * as L from "${root}/src/titans/limitedAllies";`,
  `export * as gacha from "${root}/src/titans/gacha";`,
  `export * as model from "${root}/src/titans/model";`,
  `export * as roster from "${root}/src/titans/allyRoster";`,
  `export * as allies from "${root}/src/titans/allies";`,
  `export * as gear from "${root}/src/equipment/gearSets";`,
  `export * as shop from "${root}/src/economy/eventShop";`,
  `export * as prog from "${root}/src/progression/model";`,
  `export * as sig from "${root}/src/titans/allySignature";`,
].join("\n"));
const out = join(dir, "bundle.mjs");
await build({ entryPoints: [entry], bundle: true, format: "esm", platform: "node", outfile: out, logLevel: "error", define: { "import.meta.env.BASE_URL": '"/"', "import.meta.env.DEV": "false", "import.meta.env.VITE_QA_BUILD": "undefined", "import.meta.env.VITE_TOSS_AD_GROUP_ID": "undefined", "import.meta.env.PROD": "true" } });
const { L, gacha, model, roster, allies, gear, shop, prog, sig } = await import(pathToFileURL(out).href);
rmSync(dir, { recursive: true, force: true });

let fails = 0;
const ok = (name, cond, detail = "") => { console.log(`${cond ? "PASS" : "FAIL"} ${name}${detail ? " — " + detail : ""}`); if (!cond) fails += 1; };
const kst = (s) => Date.parse(`${s}+09:00`);
const IN = kst("2026-11-20T12:00:00"), BEFORE = kst("2026-11-15T23:59:00"), AFTER = kst("2026-12-16T00:00:00");
const w = L.LIMITED_ALLIES[0];

// ── 1. 창 ──
ok("한정 표 첫 줄 = 오텀 · 전용 장갑 · 30일 창(11-16 ~ 12-16 KST)", w.id === "autumn" && w.gear === "autumn-gloves" && (Date.parse(w.end) - Date.parse(w.start)) / 86400000 === 30, `${w.start} ~ ${w.end}`);
ok("창 안 · 밖 판정 (시작 포함 · 끝 제외)", L.activeLimited(IN)?.id === "autumn" && L.activeLimited(BEFORE) === null && L.activeLimited(AFTER) === null && L.activeLimited(kst("2026-11-16T00:00:00"))?.id === "autumn");
ok("남은 일수 — 11-20 정오면 26일", L.limitedDaysLeft(w, IN) === 26, String(L.limitedDaysLeft(w, IN)));

// ── 2. 로스터 · 곡선 안 ──
const def = roster.NEW_ALLIES.find((d) => d.id === "autumn");
const hero = model.HEROES.find((h) => h.id === "autumn");
ok("오텀은 로스터에 있다(창이 닫혀도 얻은 동료는 쓴다) · 신화 · 원딜 · 흙 · 16층", !!def && !!hero && def.tier === "UR" && allies.ALLY_RARITY.autumn === "UR" && allies.ALLY_ROLE.autumn === "ranged" && allies.ALLY_ELEMENT.autumn === "earth" && hero.unlockStage === 16);
ok("기본 힘 · 값 = 같은 층 신화 곡선 그대로(따로 올린 값 없음)", hero.baseDps === roster.newAllyBaseDps({ stage: 16, tier: "UR" }) && hero.baseCost === roster.newAllyBaseCost({ stage: 16, tier: "UR" }));
const up = roster.newAllyBaseDps({ stage: 17, tier: "UR" }) / roster.newAllyBaseDps({ stage: 16, tier: "UR" });
ok("대장 전용: 대장 배율 < 한 층 위 같은 등급 곡선 비 · 일반 몬스터 배율 < 1 (곡선 안)", w.bossMul < up && w.mobMul < 1 && L.limitedAllyHitMul("autumn", true) === w.bossMul && L.limitedAllyHitMul("autumn", false) === w.mobMul && L.limitedAllyHitMul("ari", true) === 1, `대장 ×${w.bossMul} < 층당 ×${up.toFixed(3)} · 일반 ×${w.mobMul}`);
ok("오텀 대장 힘 ≤ 17층 신화 곡선 · 일반 힘 < 16층 신화 곡선", hero.baseDps * w.bossMul <= roster.newAllyBaseDps({ stage: 17, tier: "UR" }) && hero.baseDps * w.mobMul < hero.baseDps, `${Math.round(hero.baseDps * w.bossMul)} ≤ ${Math.round(roster.newAllyBaseDps({ stage: 17, tier: "UR" }))}`);
ok("시그니처 이름 · 설명이 있다(낙엽 화살비)", sig.allySignature("autumn").move === "낙엽 화살비" && !!sig.allySignature("autumn").desc);

// ── 3. 뽑기 풀 ──
const pIn = gacha.gachaPool(30, 6, IN), pOut = gacha.gachaPool(30, 6, AFTER), pBefore = gacha.gachaPool(30, 6, BEFORE);
const eIn = pIn.entries.find((e) => e.id === "autumn");
ok("창 안: 풀에 있고 픽업 표시 · pool.limited = 오텀", !!eIn && eIn.pickup && pIn.limited === "autumn");
ok("창 밖(전 · 후): 풀에 없다 · limited = null", !pOut.entries.some((e) => e.id === "autumn") && !pBefore.entries.some((e) => e.id === "autumn") && pOut.limited === null);
ok("2주 회전 픽업 두 명은 따로 — 오텀이 회전에 끼지 않는다", pIn.pickups.length === 2 && !pIn.pickups.includes("autumn"), pIn.pickups.join());
const sameWindowRot = gacha.pickupRotationIndex(IN);
ok("회전 후보 수는 한정과 무관(창 안 · 밖 같은 수)", pIn.rotationPool === pOut.rotationPool, `${pIn.rotationPool} / ${pOut.rotationPool} · 회전 ${sameWindowRot}`);
const urIn = pIn.entries.filter((e) => e.rarity === "UR"), other = urIn.find((e) => e.id !== "autumn" && !e.pickup);
ok("같은 등급 안 픽업 가중 ×2 · 신화 등급 확률 합은 그대로", !!other && Math.abs(eIn.rate / other.rate - gacha.GACHA.pickupWeight) < 1e-9 && Math.abs(urIn.reduce((a, e) => a + e.rate, 0) - pIn.bandRate.UR) < 1e-9, `오텀 ${(eIn.rate * 100).toFixed(3)}% · 다른 신화 ${(other.rate * 100).toFixed(3)}%`);
ok("확률 공시 표(rateTable)에 오텀이 같은 값으로 · 합 1", (() => { const t = gacha.rateTable(pIn); const r = t.find((x) => x.id === "autumn"); return !!r && r.percent === (eIn.rate * 100).toFixed(2) && Math.abs(pIn.entries.reduce((a, e) => a + e.rate, 0) - 1) < 1e-9; })());
{
  // 천장 — 창 안 천장 확정은 오텀도 후보(전설 이상) · 창 밖엔 안 나온다
  let hit = false; for (let i = 0; i < 400 && !hit; i += 1) { const r = gacha.pullOnce(pIn, {}, gacha.GACHA.pityLimit - 1, Math.random); hit = r.result.id === "autumn"; }
  let leak = false; for (let i = 0; i < 400 && !leak; i += 1) { const r = gacha.pullOnce(pOut, {}, gacha.GACHA.pityLimit - 1, Math.random); leak = r.result.id === "autumn"; }
  ok("천장 확정: 창 안엔 오텀도 나온다 · 창 밖엔 안 나온다", hit && !leak);
}

// ── 4. 전용 장갑 ──
ok("장비 id · 칸 · 이름 · 효과 문구", gear.isGearItemId("autumn-gloves") && gear.gearItemSlot("autumn-gloves") === "gloves" && gear.gearItemName("autumn-gloves") === "단풍 사냥꾼 장갑" && /오텀 출전 중이면 대장 피해 \+4%/.test(gear.gearItemEffectText("autumn-gloves")));
ok("세트 보너스에는 안 든다 · 강화 효과 0", gear.matchedPieces({ gloves: "autumn-gloves" }, "spear") === 0 && gear.gearItemPieceBonus("autumn-gloves", 5) === 0);
ok("효과: 오텀 출전 중 + 장갑 = 대장 ×1.04 · 오텀 없으면 1 · 다른 장갑 1", L.limitedGearBossMul("autumn-gloves", ["autumn", "mia"]) === 1.04 && L.limitedGearBossMul("autumn-gloves", ["mia"]) === 1 && L.limitedGearBossMul("spear-gloves", ["autumn"]) === 1);
ok("전용 장갑 크기 = 창 세트 한 부위(+4%) — 장갑 칸을 쓰는 대신", L.LIMITED_GEAR_BOSS_BONUS === gear.GEAR_PIECE_BONUS.spear);
{
  const p = prog.normalizeCharacterProgress({ ...prog.emptyCharacterProgress(), ownedGear: ["autumn-gloves", "bow-helmet"], equippedGear: { gloves: "autumn-gloves", helmet: "bow-helmet" } });
  ok("저장 정규화: 가진 한정 장갑은 남고 낄 수 있다", p.ownedGear.includes("autumn-gloves") && p.equippedGear.gloves === "autumn-gloves");
  const q = prog.normalizeCharacterProgress({ ...prog.emptyCharacterProgress(), ownedGear: [], equippedGear: { gloves: "autumn-gloves" } });
  ok("안 가진 한정 장갑은 못 낀다", q.equippedGear.gloves === undefined);
}

// ── 5. 이벤트 상점 진열 (새 재화 없이 — 이벤트 코인) ──
{
  const fresh = prog.normalizeCharacterProgress(prog.emptyCharacterProgress());
  const owned = { ...fresh, ownedGear: ["autumn-gloves"] };
  const has = (p, now) => shop.eventProductsFor("event-shop", p, now).some((x) => x.id === "coin-limited-gear");
  const prod = shop.EVENT_PRODUCTS.find((x) => x.id === "coin-limited-gear");
  ok("창 안 · 안 가짐 → 진열 · 이벤트 코인 값 · 주 1회", has(fresh, IN) && prod.coinCost > 0 && prod.gemCost === 0 && prod.weeklyLimit === 1, `코인 ${prod.coinCost}`);
  ok("창 밖이거나 이미 가짐 → 숨김", !has(fresh, AFTER) && !has(fresh, BEFORE) && !has(owned, IN));
  ok("지급 = 그 창의 전용 장갑", prod.grant(fresh).gearItem === "autumn-gloves");
  ok("진행도 없이 부르면(옛 호출) 예전처럼 전부", shop.eventProductsFor("event-shop").some((x) => x.id === "coin-limited-gear"));
}

console.log(fails ? `\n${fails} FAIL` : "\nALL PASS");
process.exit(fails ? 1 : 0);
