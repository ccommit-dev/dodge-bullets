/**
 * 뽑기·스킬·동료 곡선·역할 효과·과금 정합 단언 하니스 (과금 점검 5종).
 *   node scripts/verify-systems.mjs
 */
import { build } from "esbuild";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd().replace(/\\/g, "/");
const dir = mkdtempSync(join(tmpdir(), "sys-"));
const entry = join(dir, "entry.ts");
writeFileSync(entry, [
  `export * as model from "${root}/src/titans/model";`,
  `export * as allies from "${root}/src/titans/allies";`,
  `export * as gacha from "${root}/src/titans/gacha";`,
  `export * as skills from "${root}/src/titans/skills";`,
  `export * as idle from "${root}/src/progression/idle";`,
  `export * as prog from "${root}/src/progression/model";`,
  `export * as events from "${root}/src/events/eventSave";`,
  `export * as gem from "${root}/src/economy/gemCatalog";`,
  `export * as product from "${root}/src/economy/productCatalog";`,
].join("\n"));
const out = join(dir, "bundle.mjs");
await build({ entryPoints: [entry], bundle: true, format: "esm", outfile: out, platform: "node", define: { "import.meta.env.BASE_URL": '"/"', "import.meta.env.DEV": "false", "import.meta.env.PROD": "true" } });
const { model, allies, gacha, skills, idle, prog, events, gem, product } = await import(pathToFileURL(out).href);
rmSync(dir, { recursive: true, force: true });

const results = [];
const ok = (name, cond, detail = "") => results.push([cond ? "PASS" : "FAIL", name, detail]);
const seq = (vals) => { let i = 0; return () => vals[i++ % vals.length]; };

// ── 1. 뽑기 ──
const p1 = gacha.gachaPool(1, 1);
ok("풀 stage1: 기본 mia + 픽업 leon (sera는 지역1 상한 5 밖)", p1.entries.map((e) => e.id).sort().join() === "leon,mia" && p1.pickups.join() === "leon", JSON.stringify(p1.entries.map((e) => [e.id, e.rate.toFixed(3)])));
ok("풀 확률 합 = 1", Math.abs(p1.entries.reduce((s, e) => s + e.rate, 0) - 1) < 1e-9);
ok("픽업 가중 2배 (leon 2/3)", Math.abs(p1.entries.find((e) => e.id === "leon").rate - 2 / 3) < 1e-9);
const p12 = gacha.gachaPool(12, 3);
ok("풀 stage12/지역3: 상점 동료 제외", p12.entries.every((e) => allies.SHOP_ALLY_GEM_COST[e.id] === undefined));
ok("픽업 = 다음 2명 (terra 14, ari 16 — 지역3 상한 15라 ari 제외 → terra만)", p12.pickups.join() === "terra", p12.pickups.join());
const p20 = gacha.gachaPool(20, 4);
ok("stage20/지역4 픽업 2명 = bronn(22)·(23 이하 없음 → bronn만)", p20.pickups.join() === "bronn", p20.pickups.join());
const p30 = gacha.gachaPool(30, 5);
ok("등급 확률 R60/SR30/SSR10 (전 등급 존재 시)", Math.abs(p30.bandRate.R - 0.6) < 1e-9 && Math.abs(p30.bandRate.SSR - 0.1) < 1e-9, JSON.stringify(p30.bandRate));
ok("SSR 픽업 개별 확률 = R 개별 확률보다 낮음(공시 정합)", p30.entries.find((e) => e.rarity === "SSR").rate < p30.entries.find((e) => e.rarity === "R").rate);
const owned0 = allies.emptyAllyRecord();
// 천장: 59 누적 후 → SSR 확정
const pityPull = gacha.pullOnce(p30, owned0, 59, () => 0.0);
ok("천장 60회째 SSR 확정 · 카운터 0", pityPull.result.rarity === "SSR" && pityPull.pity === 0, JSON.stringify(pityPull.result));
const noPity = gacha.pullOnce(p30, owned0, 10, () => 0.0);
ok("천장 전엔 rng 0 → R (정렬상 첫 항목)", noPity.result.rarity === "R" && noPity.pity === 11);
// 10연 SR 보장: rng가 항상 R 구간(0.0)이면 마지막 1장이 SR 이상
const ten = gacha.pullTen(p30, owned0, 0, () => 0.0);
ok("10연 SR 이상 1명 보장", ten.results.some((r) => r.rarity !== "R") && ten.results.filter((r) => r.rarity !== "R").length === 1, ten.results.map((r) => r.rarity).join());
ok("10연 같은 동료 2회 → 두 번째는 중복 조각", ten.results.filter((r) => r.id === ten.results[0].id).slice(1).every((r) => r.duplicate && r.shards === gacha.GACHA.dupeShards[r.rarity]));
const ownedMia = { ...owned0, mia: 5 };
const dup = gacha.pullOnce(gacha.gachaPool(1, 1), ownedMia, 0, () => 0.0);
ok("보유 동료 중복 → 등급별 조각 (R 10)", dup.result.duplicate && dup.result.shards === 10, JSON.stringify(dup.result));
ok("확률 공시 표: 항목 수 = 풀 크기 · % 문자열", gacha.rateTable(p30).length === p30.entries.length && /^\d+\.\d{2}$/.test(gacha.rateTable(p30)[0].percent));
ok("10연 900 = 1회 100 × 10 × 0.9", gacha.GACHA.tenCost === 900 && gacha.GACHA.singleCost === 100);
// 몬테카를로: 10만 회 등급 분포가 공시와 ±1%p
let cnt = { R: 0, SR: 0, SSR: 0 };
for (let i = 0; i < 100000; i += 1) cnt[gacha.pullOnce(p30, owned0, 0).result.rarity] += 1;
ok("몬테카를로 10만회 등급 분포 ≈ 공시(±1%p)", Math.abs(cnt.R / 1e5 - 0.6) < 0.01 && Math.abs(cnt.SSR / 1e5 - 0.1) < 0.01, JSON.stringify(cnt));

// ── 2. 동료 곡선 · 역할 · 게이트 ──
const eff = (h) => h.baseDps / h.baseCost;
const byStage = model.HEROES.filter((h) => h.unlockStage < 9999).sort((a, b) => a.unlockStage - b.unlockStage);
let monotonic = true;
for (let i = 1; i < byStage.length; i += 1) if (eff(byStage[i]) < eff(byStage[i - 1]) * 0.999) monotonic = false;
ok("골드 효율(baseDps/baseCost)이 해금 스테이지 순으로 단조 증가", monotonic, byStage.map((h) => `${h.id}:${(eff(h) * 1000).toFixed(1)}`).join(" "));
ok("엠버 효율 > 미아 효율 ×2.5", eff(model.HEROES.find((h) => h.id === "ember")) > eff(model.HEROES.find((h) => h.id === "mia")) * 2.5);
ok("상점 동료(볼트 SR) 효율 > 무료 동시대(파이로) 효율", eff(model.HEROES.find((h) => h.id === "volt")) > eff(model.HEROES.find((h) => h.id === "pyro")));
const role = allies.partyRoleEffects(["garen", "terra", "bronn", "luna"]);
ok("역할 효과: 탱커 3 → 상한 2 → +10초 · 힐러 1 → 쿨 ×0.9", role.bossTimeBonus === 10 && Math.abs(role.cooldownMult - 0.9) < 1e-9, JSON.stringify(role));
ok("편성 게이트: ember(48)는 지역4 상한(23)에서 불가, 상점 동료 luna는 가능", !allies.canFieldAlly("ember", 48, 23) && allies.canFieldAlly("luna", 9999, 5) && allies.canFieldAlly("ari", 16, 23));
{
  // 조각 드랍 대상: 출전 동료 70% — 1만 회 표본에서 편성 2명이 65~75%를 받는다
  const heroes = { ...allies.emptyAllyRecord(), mia: 5, leon: 3, sera: 2, garen: 1 };
  let inParty = 0;
  for (let i = 0; i < 10000; i += 1) if (["mia", "leon"].includes(allies.randomOwnedAlly(heroes, Math.random, ["mia", "leon"]))) inParty += 1;
  // 무작위 30%의 절반(2/4)도 편성에 떨어지므로 기대값 = 0.7 + 0.3 × 0.5 = 0.85
  ok("조각 드랍: 출전 동료 우선 (기대 85% ± 3%p)", Math.abs(inParty / 10000 - 0.85) < 0.03, `${(inParty / 100).toFixed(1)}%`);
  ok("조각 드랍: 편성 없으면 보유 동료 무작위", ["mia", "leon", "sera", "garen"].includes(allies.randomOwnedAlly(heroes, Math.random, [])));
}

// ── 3. 스킬 ──
ok("SKILL_EFFECTS가 20종 전부 정의", model.SKILLS.every((s) => skills.SKILL_EFFECTS[s.id] !== undefined) && Object.keys(skills.SKILL_EFFECTS).length === 20);
ok("패시브 4종 값 > 0", ["steel", "focus", "guardianSoul", "elementalMastery"].every((id) => skills.passiveValue(id, 1) > 0));
ok("패시브 레벨 성장", skills.passiveValue("steel", 10) > skills.passiveValue("steel", 1));
const slotSets = ["starter", "linkA", "linkB", "finisher"].map((slot) => model.SKILLS.filter((s) => s.slot === slot).map((s) => JSON.stringify({ ...skills.SKILL_EFFECTS[s.id] })));
ok("슬롯 내 효과 중복 없음 (clone=dragonBreath 해소)", slotSets.every((set) => new Set(set).size === set.length));
ok("warcry = 타격 + 동료 고무 버프", skills.SKILL_EFFECTS.warcry.kind === "hit" && skills.SKILL_EFFECTS.warcry.buff === "war");
ok("레벨 배율 Lv20 = ×1.95", Math.abs(skills.skillLevelMult(20) - 1.95) < 1e-9);
const def = model.SKILLS.find((s) => s.id === "crit");
ok("배속 ×2에서 버프 실시간 절반 (업타임 불변)", Math.abs(skills.buffDurationMs(def, 1, 2) * 2 - skills.buffDurationMs(def, 1, 1)) < 1e-6);
ok("모든 스킬 프리뷰 % > 0 · 라벨 비어있지 않음", model.SKILLS.every((s) => skills.skillPreviewPct(s.id, 1) > 0 && skills.skillEffectLabel(s.id, 1).length > 3), model.SKILLS.map((s) => `${s.id}:${skills.skillPreviewPct(s.id, 1)}`).join(" "));
ok("자동 시전 순서: 연계 → 시동기 → 마무리", (() => { const o = skills.autoSkillOrder(); const slotOf = (id) => model.SKILLS.find((s) => s.id === id).slot; return slotOf(o[0]) === "linkA" && slotOf(o[o.length - 1]) === "finisher" && !o.includes("steel"); })());
ok("프리셋 3종이 5슬롯 전부 후보 보유", skills.SKILL_PRESETS.every((p) => skills.SLOT_ORDER.every((slot) => p.picks[slot].length === 4)));
const pt = skills.passiveTotals(["steel"], { passive: "steel" }, { steel: 5 });
ok("passiveTotals: 장착 패시브만 합산", pt.tapDmg > 0.2 && pt.critChance === 0);

// ── 4. 과금 정합 ──
const base = prog.emptyCharacterProgress();
ok("흑요석 검사 → 방치 효율 +1%p", Math.abs(idle.idleRate({ ...base, ownedCharacters: ["obsidian"] }, {}) - idle.idleRate(base, {}) - 0.01) < 1e-9);
ok("새벽의 무희 → 캡 +0.5h · 후원 계약 → +2h", Math.abs(idle.idleCapHours({ ...base, ownedCharacters: ["dawn"] }) - idle.idleCapHours(base) - 0.5) < 1e-9 && Math.abs(idle.idleCapHours({ ...base, patronUntil: Date.now() + 1e6 }) - idle.idleCapHours(base) - 2) < 1e-9);
ok("후원 계약 → 균열 4회", events.riftAttemptsFor(Date.now() + 1e6) === 4 && events.riftAttemptsFor(0) === 3);
ok("후원 15/일 = ₩12.2/보석 (1,200팩 ₩12.5와 근접)", product.PATRON.dailyGems === 15 && 5500 / (15 * 30) > 12);
ok("황금 보급 상자 ×3000 (가속권 대비 열위 해소)", gem.goldPackAmount({ ...base, titanBestStage: 10 }) === Math.floor(model.killGold(10, true, false) * 3000));
ok("진행도 정규화: gachaPity·patronUntil·beatSpMigrated 보존", (() => { const n = prog.normalizeCharacterProgress({ ...base, gachaPity: 12, patronUntil: 5, beatSpMigrated: 7 }); return n.gachaPity === 12 && n.patronUntil === 5 && n.beatSpMigrated === 7; })());

// ── 4b. 동료 4상태 아틀라스 (계획안 A) ──
const art = await (async () => {
  const d3 = mkdtempSync(join(tmpdir(), "sys3-"));
  const e3 = join(d3, "entry.ts");
  writeFileSync(e3, `export * from "${root}/src/titans/SpriteArt";`);
  const o3 = join(d3, "bundle.mjs");
  await build({ entryPoints: [e3], bundle: true, format: "esm", outfile: o3, platform: "node", jsx: "automatic", define: { "import.meta.env.BASE_URL": '"/"', "import.meta.env.DEV": "false", "import.meta.env.PROD": "true" }});
  const mod = await import(pathToFileURL(o3).href);
  rmSync(d3, { recursive: true, force: true });
  return mod;
})();
{
  const frames = (id, skin) => [0, 1, 2, 3].map((s) => art.allyFrameStyle(id, s, skin).backgroundPosition);
  const distinct = (arr) => new Set(arr).size === 4;
  ok("기본 6명: 4상태 프레임이 서로 다름 (아틀라스)", ["mia", "leon", "sera", "garen", "ari", "nox"].every((id) => distinct(frames(id))));
  ok("변형 10명: 변형 아틀라스 4상태", ["pyro", "marina", "terra", "zephyr", "bronn", "iris", "cain", "sylph", "orion", "ember"].every((id) => distinct(frames(id)) && /variant/.test(art.allyFrameStyle(id, 0).backgroundImage)));
  ok("특수 4명: 특수 아틀라스 4상태 (정사각 셀 → wide 아님)", ["luna", "volt", "mia_dark", "sera_light"].every((id) => distinct(frames(id)) && art.allyFrameStyle(id, 0).width === undefined));
  ok("스킨 2종: 스킨 아틀라스 4상태", distinct(frames("garen", "garen-magma")) && /skin-atlas/.test(art.allyFrameStyle("leon", 2, "leon-frost").backgroundImage));
  ok("가로 셀 아틀라스는 폭 150%·좌측 −25%로 비율 보정", art.allyFrameStyle("mia", 0).width === "150%" && art.allyFrameStyle("pyro", 0).left === "-25%");
  ok("무기 앵커: 기본 8종 × 4상태, 공격(2)은 대기(0)와 다른 각도", Object.values(art.WEAPON_STATE_ANCHOR).every((t) => [0, 1, 2, 3].every((s) => t[s]) && t[2].rot !== t[0].rot) && art.weaponAnchorStyle("pyro", 2)["--weapon-drot"] === art.weaponAnchorStyle("mia", 2)["--weapon-drot"]);
}

// ── 5. 이벤트 상점 · 결제 지급 ──
const eventShop = await (async () => {
  const d2 = mkdtempSync(join(tmpdir(), "sys2-"));
  const e2 = join(d2, "entry.ts");
  writeFileSync(e2, `export * as shop from "${root}/src/economy/eventShop";\nexport * as pay from "${root}/src/payments/store";`);
  const o2 = join(d2, "bundle.mjs");
  await build({ entryPoints: [e2], bundle: true, format: "esm", outfile: o2, platform: "node", define: { "import.meta.env.BASE_URL": '"/"', "import.meta.env.DEV": "false", "import.meta.env.PROD": "true" } });
  const mod = await import(pathToFileURL(o2).href);
  rmSync(d2, { recursive: true, force: true });
  return mod;
})();
ok("이벤트 상점 6종 · 탭별 3종 · 전부 보석 가격·주간 한도", eventShop.shop.EVENT_PRODUCTS.length === 6 && eventShop.shop.eventProductsFor("event-shop").length === 3 && eventShop.shop.EVENT_PRODUCTS.every((p) => p.gemCost > 0 && p.weeklyLimit >= 1));
ok("이벤트 상점 수량이 진행도 비례 (Stage 30 골드 > Stage 5)", eventShop.shop.EVENT_PRODUCTS[0].grant({ ...base, titanBestStage: 30 }).gold > eventShop.shop.EVENT_PRODUCTS[0].grant({ ...base, titanBestStage: 5 }).gold);
ok("주간 구매 카운트: 같은 주만 집계", eventShop.shop.eventBuysThisWeek({ ...base, weeklyEventBuys: { week: "2026-36", bought: { "ev-boss-supply": 2 } } }, "ev-boss-supply", "2026-36") === 2 && eventShop.shop.eventBuysThisWeek({ ...base, weeklyEventBuys: { week: "2026-35", bought: { "ev-boss-supply": 2 } } }, "ev-boss-supply", "2026-36") === 0);
ok("결제 지급표: 카탈로그 9종 전부 정의 · 후원 30일 · 캐릭터 소유", eventShop.pay.PLAY_PRODUCT_IDS.every((id) => eventShop.pay.purchaseGrant(id) !== null) && eventShop.pay.purchaseGrant("patron-30d").patronDays === 30 && eventShop.pay.purchaseGrant("char-dawn").character === "dawn");
ok("미연동 환경: 어댑터 not-configured", (await eventShop.pay.getPaymentAdapter().purchase("gems-80")).status === "not-configured");
ok("진행도 정규화: weeklyEventBuys·forgeTicketsPending 보존", (() => { const n = prog.normalizeCharacterProgress({ ...base, weeklyEventBuys: { week: "2026-36", bought: { x: 2 } }, forgeTicketsPending: 3 }); return n.weeklyEventBuys.bought.x === 2 && n.forgeTicketsPending === 3; })());

for (const [s, n, d] of results) console.log(s, n, d ? "— " + d : "");
const fails = results.filter((r) => r[0] === "FAIL").length;
console.log(fails === 0 ? "\nALL PASS" : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
