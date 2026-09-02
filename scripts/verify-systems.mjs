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

for (const [s, n, d] of results) console.log(s, n, d ? "— " + d : "");
const fails = results.filter((r) => r[0] === "FAIL").length;
console.log(fails === 0 ? "\nALL PASS" : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
