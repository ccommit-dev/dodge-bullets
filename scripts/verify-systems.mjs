/**
 * 뽑기·스킬·동료 곡선·역할 효과·과금 정합 단언 하니스 (과금 점검 5종).
 *   node scripts/verify-systems.mjs
 */
import { build } from "esbuild";
import { mkdtempSync, writeFileSync, rmSync , existsSync } from "node:fs";
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

// ── 1b. K: 무과금 보석 경로 · 픽업 2주 회전 ──
{
  const weeklyMod = await (async () => {
    const d = mkdtempSync(join(tmpdir(), "sysk-"));
    const e = join(d, "entry.ts");
    writeFileSync(e, `export * as weekly from "${root}/src/events/weekly";\nexport * as routine from "${root}/src/progression/routine";\nexport * as journal from "${root}/src/progression/journal";`);
    const o = join(d, "bundle.mjs");
    await build({ entryPoints: [e], bundle: true, format: "esm", outfile: o, platform: "node", define: { "import.meta.env.BASE_URL": '"/"', "import.meta.env.DEV": "false", "import.meta.env.PROD": "true" } });
    const m = await import(pathToFileURL(o).href);
    rmSync(d, { recursive: true, force: true });
    return m;
  })();
  const weekGems = weeklyMod.routine.ROUTINE_REWARD_GEMS * 7 + events.MISSION_ALL_DONE_GEMS * 7 + Math.min(weeklyMod.weekly.weeklyGemTotal("2026-36"), weeklyMod.weekly.weeklyGemTotal("2026-37"));
  ok("K 무과금 주간 보석 ≥ 290 (루틴 15×7 + 토벌 완주 10×7 + 주간 도전 120)", weekGems >= 290, `${weekGems}`);
  ok("K 주간 도전 3종 전부 보석", ["2026-36", "2026-37"].every((w) => weeklyMod.weekly.weeklyChallenges(w).every((c) => c.reward.kind === "gems")));
  ok("K 원정 일지 전 항목 보석화", weeklyMod.journal.JOURNAL_ENTRIES.every((e) => e.reward.kind === "gems"), weeklyMod.journal.JOURNAL_ENTRIES.map((e) => e.reward.kind).join());
  // 회전: stage 5 · 지역 5 → 후보 15명(6~48) → 14일 뒤 픽업이 바뀐다
  const t0 = Date.UTC(2026, 8, 3);
  const a = gacha.gachaPool(5, 5, t0);
  const b = gacha.gachaPool(5, 5, t0 + 14 * 86400000);
  ok("K 픽업 2주 회전: 후보 3명 이상이면 14일 뒤 픽업이 바뀐다", a.rotationPool >= 3 && a.pickups.join() !== b.pickups.join() && a.pickups.length === 2, `${a.pickups.join()} → ${b.pickups.join()} (${a.rotationDaysLeft}일 남음)`);
  ok("K 후보 2명 이하면 회전 없음 (stage12/지역3 → terra 고정)", gacha.gachaPool(12, 3, t0).pickups.join() === gacha.gachaPool(12, 3, t0 + 14 * 86400000).pickups.join());
  ok("K 회전해도 풀 확률 합 1 · 픽업 가중 유지", Math.abs(b.entries.reduce((s, e) => s + e.rate, 0) - 1) < 1e-9 && b.entries.filter((e) => e.pickup).length === 2);
}

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
  // 루나·볼트는 아트 점검 1순위로 로스터 화풍 변형 행으로 이동 — 특수(정사각) 아틀라스에는 미아 다크·세라 라이트만 남는다
  ok("특수 2명(미아 다크·세라 라이트): 특수 아틀라스 4상태 (정사각 셀 → wide 아님)", ["mia_dark", "sera_light"].every((id) => distinct(frames(id)) && art.allyFrameStyle(id, 0).width === undefined));
  ok("루나·볼트 4상태 프레임이 서로 다르고 가로 셀(로스터 화풍)", ["luna", "volt"].every((id) => distinct(frames(id)) && art.allyFrameStyle(id, 0).width === "150%"));
  ok("스킨 2종: 스킨 아틀라스 4상태", distinct(frames("garen", "garen-magma")) && /skin-atlas/.test(art.allyFrameStyle("leon", 2, "leon-frost").backgroundImage));
  ok("가로 셀 아틀라스는 폭 150%·좌측 −25%로 비율 보정", art.allyFrameStyle("mia", 0).width === "150%" && art.allyFrameStyle("pyro", 0).left === "-25%");
  ok("무기 앵커: 기본 8종 × 4상태, 공격(2)은 대기(0)와 다른 각도", Object.values(art.WEAPON_STATE_ANCHOR).every((t) => [0, 1, 2, 3].every((s) => t[s]) && t[2].rot !== t[0].rot) && art.weaponAnchorStyle("pyro", 2)["--weapon-drot"] === art.weaponAnchorStyle("mia", 2)["--weapon-drot"]);
}

// ── 4c. G 시즌 패스 ──
{
  const sm = await (async () => {
    const d = mkdtempSync(join(tmpdir(), "sysg-"));
    const e = join(d, "entry.ts");
    writeFileSync(e, `export * from "${root}/src/economy/seasonPass";`);
    const o = join(d, "bundle.mjs");
    await build({ entryPoints: [e], bundle: true, format: "esm", outfile: o, platform: "node", define: { "import.meta.env.BASE_URL": '"/"', "import.meta.env.DEV": "false", "import.meta.env.PROD": "true" } });
    const m = await import(pathToFileURL(o).href);
    rmSync(d, { recursive: true, force: true });
    return m;
  })();
  const t0 = sm.SEASON_EPOCH + 3 * 86400000;
  ok("G 시즌 28일 · 30단 · 유료 보석 600 · 무료 보석 150", sm.SEASON.days === 28 && sm.SEASON.tiers === 30 && sm.paidGemTotal(0) === 600 && sm.freeGemTotal() === 150, `paid=${sm.paidGemTotal(0)} free=${sm.freeGemTotal()}`);
  ok("G 시즌 번호·잔여일: 에폭+3일 → 시즌0, D-25", sm.seasonIndex(t0) === 0 && sm.seasonDaysLeft(t0) === 25 && sm.seasonIndex(t0 + 28 * 86400000) === 1);
  let p = { ...base, partyIds: ["mia"] };
  p = sm.addSeasonXp(p, sm.SEASON.xp.routine * 26, t0); // 520 XP → 5단
  ok("G 경험치 → 단계 (520 XP = 5단)", sm.seasonTier(p.seasonPass.xp) === 5 && p.seasonPass.season === 0);
  ok("G 무료 수령 가능 단계: 1(강화석)·3(조각)·5(보석25) — 2·4는 빈 칸", sm.claimableTiers(p, "free", t0).join() === "1,3,5" && sm.claimableTiers(p, "paid", t0).length === 0);
  const c5 = sm.claimSeasonTier(p, "free", 5, t0);
  ok("G 5단 무료 수령 → 보석 +25 · 재수령 불가", c5.applied && c5.progress.redGems === base.redGems + 25 && !sm.claimSeasonTier(c5.progress, "free", 5, t0).applied);
  const paidP = { ...c5.progress, seasonPass: { ...c5.progress.seasonPass, paid: true } };
  ok("G 유료 트랙 활성 시 1~5단 유료 보상 수령 가능 (3단 코어 반환)", sm.claimableTiers(paidP, "paid", t0).length === 5 && sm.claimSeasonTier(paidP, "paid", 3, t0).cores === 1);
  const rolled = sm.addSeasonXp(paidP, 10, t0 + 29 * 86400000);
  ok("G 시즌 전환 시 xp·수령·유료 초기화 (미수령 소멸)", rolled.seasonPass.season === 1 && rolled.seasonPass.xp === 10 && !rolled.seasonPass.paid && rolled.seasonPass.claimedFree.length === 0);
  ok("G 유료 15단 시즌 스킨 · 25단 무기 이펙트", sm.paidReward(15, 0).kind === "allySkin" && sm.paidReward(25, 0).kind === "weaponFx");
}

// ── 4d. L 보상형 광고 ──
{
  const ads = await (async () => {
    const d = mkdtempSync(join(tmpdir(), "sysl-"));
    const e = join(d, "entry.ts");
    writeFileSync(e, `export * from "${root}/src/ads/rewarded";`);
    const o = join(d, "bundle.mjs");
    await build({ entryPoints: [e], bundle: true, format: "esm", outfile: o, platform: "node", define: { "import.meta.env.BASE_URL": '"/"', "import.meta.env.DEV": "false", "import.meta.env.PROD": "true" } });
    const m = await import(pathToFileURL(o).href);
    rmSync(d, { recursive: true, force: true });
    return m;
  })();
  const today = "2026-09-03";
  ok("L 미연동: 자리 숨김(none) · 광고 제거 보유면 free · 연동이면 ad", ads.rewardedAvailability(base, "idleDouble", today, false) === "none" && ads.rewardedAvailability({ ...base, adFree: true }, "idleDouble", today, false) === "free" && ads.rewardedAvailability(base, "idleDouble", today, true) === "ad");
  let p = base;
  for (let i = 0; i < 3; i += 1) p = ads.consumeAdReward(p, "idleDouble", today);
  ok("L 정산 2배 1일 3회 한도 후 none · 다음 날 리셋", ads.rewardedAvailability(p, "idleDouble", today, true) === "none" && ads.rewardedAvailability(p, "idleDouble", "2026-09-04", true) === "ad");
  ok("L 가속 4h는 1일 1회", ads.AD_LIMITS.booster4h === 1 && ads.rewardedAvailability(ads.consumeAdReward(base, "booster4h", today), "booster4h", today, true) === "none");
  ok("L 광고 제거 상품 노출(₩3,900)", product.STORE_PRODUCTS.find((x) => x.id === "remove-ads")?.visible === true);
}

// ── 4e. I 영웅 외형 ──
{
  const cos = await (async () => {
    const d = mkdtempSync(join(tmpdir(), "sysi-"));
    const e = join(d, "entry.ts");
    writeFileSync(e, `export * from "${root}/src/economy/cosmetics";\nexport * as anim from "${root}/src/titans/anim";`);
    const o = join(d, "bundle.mjs");
    await build({ entryPoints: [e], bundle: true, format: "esm", outfile: o, platform: "node", define: { "import.meta.env.BASE_URL": '"/"', "import.meta.env.DEV": "false", "import.meta.env.PROD": "true" } });
    const m = await import(pathToFileURL(o).href);
    rmSync(d, { recursive: true, force: true });
    return m;
  })();
  ok("I 무기 이펙트 3종 판매(300) + 시즌 1종 비매품 · 테마 3종(400) · 코스튬 2종", Object.values(cos.WEAPON_FX).filter((f) => f.gemCost === 300).length === 3 && cos.WEAPON_FX["fx-season"].gemCost === null && Object.values(cos.THEMES).every((t) => t.gemCost === 400) && Object.keys(cos.COSTUMES).length === 2);
  ok("I 코스튬이 캐릭터 목록·라벨에 등록", cos.anim.CHARACTER_SKINS.includes("ember") && cos.anim.CHARACTER_SKINS.includes("frost") && !!cos.anim.CHARACTER_LABEL.frost);
  ok("아트5 코스튬 2종이 CSS 필터가 아닌 실제 시트(skins/hero-idle-<id>.png)로 해석되고 파일이 존재", ["ember", "frost"].every((id) => cos.anim.sheetFor(id, "idle").includes("skins/hero-idle-" + id) && cos.anim.sheetFor(id, "attack").includes("skins/hero-attack-" + id) && existsSync(join(root, "public/titans/character/skins", "hero-idle-" + id + ".png"))));
  ok("I 코스튬 상품 char-ember/char-frost 카탈로그·Play id", ["char-ember", "char-frost"].every((id) => product.STORE_PRODUCTS.some((p) => p.id === id && p.visible)));
  ok("I 진행도 정규화: 미보유 이펙트/테마 장착은 해제", (() => { const n = prog.normalizeCharacterProgress({ ...base, ownedWeaponFx: ["fx-crimson"], equippedWeaponFx: "fx-solar", ownedThemes: [], equippedTheme: "theme-void" }); return n.equippedWeaponFx === "" && n.equippedTheme === ""; })());
}

// ── 4f. J SSR 스킨 10종 + 픽업 할인 ──
{
  const sk = await (async () => {
    const d = mkdtempSync(join(tmpdir(), "sysj-"));
    const e = join(d, "entry.ts");
    writeFileSync(e, `export * from "${root}/src/titans/skins";
export * as allies from "${root}/src/titans/allies";
export * as art from "${root}/src/titans/SpriteArt";
export * as season from "${root}/src/economy/seasonPass";`);
    const o = join(d, "bundle.mjs");
    await build({ entryPoints: [e], bundle: true, format: "esm", outfile: o, platform: "node", jsx: "automatic", define: { "import.meta.env.BASE_URL": '"/"', "import.meta.env.DEV": "false", "import.meta.env.PROD": "true" } });
    const m = await import(pathToFileURL(o).href);
    rmSync(d, { recursive: true, force: true });
    return m;
  })();
  const ssr = Object.keys(sk.allies.ALLY_RARITY).filter((id) => sk.allies.ALLY_RARITY[id] === "SSR");
  const sale = Object.entries(sk.ALLY_SKINS).filter(([, d]) => d.gemCost !== null);
  ok("J SSR 10명 전원에게 판매 스킨(300) 1종 이상", ssr.length === 10 && ssr.every((id) => sale.some(([, d]) => d.ally === id && d.gemCost === 300)), `ssr=${ssr.length} sale=${sale.length}`);
  ok("J 시즌 한정 스킨 season-1/2 비매품 · 패스 15단 id와 일치", sk.ALLY_SKINS["season-1"]?.gemCost === null && sk.ALLY_SKINS["season-2"]?.gemCost === null && sk.season.paidReward(15, 0)?.id === "season-1");
  ok("J 픽업 할인: 픽업이면 240, 아니면 300, 비매품 null", sk.skinPrice("ari-blaze", ["ari"]) === 240 && sk.skinPrice("ari-blaze", ["nox"]) === 300 && sk.skinPrice("season-1", ["ari"]) === null);
  const halo = sk.art.allyFrameStyle("sera_light", 2, "sera_light-halo");
  const ari = sk.art.allyFrameStyle("ari", 2, "ari-blaze");
  ok("J 스킨 프레임: 세라 라이트 스킨은 정사각 특수 스킨 아틀라스 · 아리 스킨은 가로 스킨 아틀라스 13행", /skin-special-atlas/.test(String(halo.backgroundImage)) && halo.width === undefined && /ally-skin-atlas/.test(String(ari.backgroundImage)) && ari.backgroundSize === "400% 1300%");
  const lunaIdle = sk.art.allyFrameStyle("luna", 0);
  const voltIdle = sk.art.allyFrameStyle("volt", 0);
  ok("아트1 루나·볼트가 로스터 화풍 변형 아틀라스(가로 12행)에서 나온다 — 클립아트 특수 아틀라스 미사용", /ally-variant-atlas/.test(String(lunaIdle.backgroundImage)) && /ally-variant-atlas/.test(String(voltIdle.backgroundImage)) && lunaIdle.backgroundSize === "400% 1200%" && lunaIdle.width === "150%");
  ok("J 스킨 썸네일·아틀라스 파일 존재", ["skins/ari-blaze.png", "skins/luna-eclipse.png", "skins/season-1.png", "ally-skin-special-atlas-v1.png"].every((f) => existsSync(join(root, "public/titans/generated/allies", f))));
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
{ const sp = eventShop.pay.applyPurchase({ ...base, partyIds: ["mia"] }, "season-pass", "tx-s", Date.UTC(2026, 8, 10)); ok("G 시즌 패스 구매 → 현재 시즌 유료 트랙 활성", sp.applied && sp.progress.seasonPass.paid && sp.progress.seasonPass.season === 0); }
ok("L 광고 제거 구매 → adFree", eventShop.pay.applyPurchase(base, "remove-ads", "tx-a").progress.adFree === true);
{
  // H: 첫 구매 2배 · 트리거 패키지 1회 · 같은 영수증 중복 방지
  const p0 = { ...base, partyIds: ["mia"], rebirthCount: 1, wallAreas: ["forest"], pioneeredArea: 2 };
  const r1 = eventShop.pay.applyPurchase(p0, "gems-450", "tx1", 0);
  const r2 = eventShop.pay.applyPurchase(r1.progress, "gems-450", "tx2", 0);
  ok("H 보석팩 첫 구매 2배(450→900) · 두 번째는 정가", r1.doubled && r1.progress.redGems === 900 && !r2.doubled && r2.progress.redGems === 1350, `${r1.progress.redGems}/${r2.progress.redGems}`);
  const dup = eventShop.pay.applyPurchase(r2.progress, "gems-450", "tx2", 0);
  ok("H 같은 transactionId 재적용 안 됨", !dup.applied && dup.progress.redGems === 1350);
  const w1 = eventShop.pay.applyPurchase(r2.progress, "pack-wall", "tx3", 0);
  const w2 = eventShop.pay.applyPurchase(w1.progress, "pack-wall", "tx4", 0);
  ok("H 벽 돌파 세트: 출전 1번 동료 조각 +30 · 가속 24h · 상품당 1회", w1.applied && w1.progress.allyShards.mia === 30 && w1.progress.idleBoostUntil === 24 * 3600000 && !w2.applied);
  ok("H 트리거 조건: 개척 2지역·벽 경험·환생 1회", product.packageTriggered("pioneer", p0) && product.packageTriggered("wall", p0) && product.packageTriggered("rebirth", p0) && !product.packageTriggered("rebirth", base));
  ok("H 트리거 패키지 3종 카탈로그·Play id 등록", ["pack-pioneer", "pack-wall", "pack-rebirth"].every((id) => product.STORE_PRODUCTS.some((p) => p.id === id && p.trigger) && eventShop.pay.PLAY_PRODUCT_IDS.includes(id)));
}
ok("진행도 정규화: weeklyEventBuys·forgeTicketsPending 보존", (() => { const n = prog.normalizeCharacterProgress({ ...base, weeklyEventBuys: { week: "2026-36", bought: { x: 2 } }, forgeTicketsPending: 3 }); return n.weeklyEventBuys.bought.x === 2 && n.forgeTicketsPending === 3; })());

for (const [s, n, d] of results) console.log(s, n, d ? "— " + d : "");
const fails = results.filter((r) => r[0] === "FAIL").length;
console.log(fails === 0 ? "\nALL PASS" : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
