/**
 * 뽑기·스킬·동료 곡선·역할 효과·과금 정합 단언 하니스 (과금 점검 5종).
 *   node scripts/verify-systems.mjs
 */
import { build } from "esbuild";
import { mkdtempSync, readFileSync, writeFileSync, rmSync , existsSync } from "node:fs";
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
  `export * as shadow from "${root}/src/events/shadowArena";`,
  `export * as beatRpg from "${root}/src/beat/rpg";`,
  `export * as stages from "${root}/src/game/stages";`,
  `export * as analytics from "${root}/src/analytics/events";`,
  `export * as bossPatterns from "${root}/src/game/bossPatterns";`,
  `export * as perks from "${root}/src/game/perks";`,
  `export * as ranking from "${root}/src/beat/ranking";`,
  `export * as ads from "${root}/src/ads/rewarded";`,
  `export * as dodgeWorld from "${root}/src/game/world";`,
  `export * as spriteArt from "${root}/src/titans/SpriteArt";`,
  `export * as dodgeSkills from "${root}/src/game/skills";`,
  `export * as dodgeShop from "${root}/src/game/shop";`,
  `export * as dodgeShots from "${root}/src/game/skillShots";`,
  `export * as dodgeChips from "${root}/src/game/chips";`,
  `export * as dodgeOps from "${root}/src/game/expeditionOps";`,
].join("\n"));
const out = join(dir, "bundle.mjs");
await build({ entryPoints: [entry], bundle: true, format: "esm", outfile: out, platform: "node", define: { "import.meta.env.BASE_URL": '"/"', "import.meta.env.DEV": "false", "import.meta.env.PROD": "true" } });
const { model, allies, gacha, skills, idle, prog, events, gem, product, shadow, beatRpg, stages, analytics, bossPatterns, perks, ranking, ads, dodgeSkills, dodgeShop, dodgeShots, dodgeChips, dodgeOps } = await import(pathToFileURL(out).href);
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
  // 동료 애니메이션 상태기 — 공격 3박(예비 1 → 타격 2 → 복귀 0) · 걷기 2프레임 교대(1↔0) · 피격 우선
  const f = (v) => art.allyFrameFor({ flinching: false, attackPhase: "none", approaching: false, walkTick: 0, ...v });
  ok("동료 공격 3박: 예비=이동 프레임 · 타격=공격 프레임 · 복귀=대기 프레임", f({ attackPhase: "windup" }) === 1 && f({ attackPhase: "strike" }) === 2 && f({ attackPhase: "recover" }) === 0);
  ok("동료 걷기: 틱마다 이동↔대기 프레임 교대 (한 프레임 흔들기 아님)", f({ approaching: true, walkTick: 0 }) === 1 && f({ approaching: true, walkTick: 1 }) === 0 && f({ approaching: true, walkTick: 2 }) === 1);
  ok("동료 피격이 공격·걷기보다 우선 · 공격 타이밍 90/240/150 · 걷기 140ms", f({ flinching: true, attackPhase: "strike", approaching: true }) === 3 && art.ALLY_ATTACK_TIMING.windupMs === 90 && art.ALLY_ATTACK_TIMING.strikeMs === 240 && art.ALLY_ATTACK_TIMING.recoverMs === 150 && art.ALLY_WALK_FRAME_MS === 140);
  ok("루나·볼트 4상태 프레임이 서로 다르고 가로 셀 150%(셀 비율 유지)", ["luna", "volt"].every((id) => distinct(frames(id)) && art.allyFrameStyle(id, 0).width === "150%"));
  ok("스킨 2종: 스킨 아틀라스 4상태", distinct(frames("garen", "garen-magma")) && /skin-atlas/.test(art.allyFrameStyle("leon", 2, "leon-frost").backgroundImage));
  ok("가로 셀 아틀라스는 폭 150%·높이 114.35%·좌측 −25% — 셀(313.5×239) 비율 그대로 (가로 눌림 없음)", art.allyFrameStyle("mia", 0).width === "150%" && art.allyFrameStyle("mia", 0).height === "114.35%" && art.allyFrameStyle("pyro", 0).left === "-25%");
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
  ok("G 무료 수령 가능 단계 1~5 전부 (빈 칸 없음: 2=가속 1h · 4=강화석 20)", sm.claimableTiers(p, "free", t0).join() === "1,2,3,4,5" && sm.claimableTiers(p, "paid", t0).length === 0 && sm.freeReward(2).kind === "boost" && sm.freeReward(4).kind === "materials");
  ok("G 무료 트랙 30단 모두 실보상 (\"—\" 없음)", Array.from({ length: 30 }, (_, i) => sm.rewardLabel(sm.freeReward(i + 1))).every((l) => l !== "—"));
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
  // 생성 원화(art-gen): authored 행이 있는 동료는 변형 아틀라스가 tint 대신 그 행을 쓴다 — 파일·매니페스트 존재로 검증
  {
    const authoredDir = join(root, "public/titans/generated/allies/authored");
    const authored = existsSync(authoredDir) ? (await import("node:fs")).readdirSync(authoredDir).filter((f) => f.endsWith("-row.png")) : [];
    ok("아트gen 생성 원화 행(authored/*-row.png) 8명 이상 배치 · 개별 PNG 동반", authored.length >= 8 && authored.every((f) => existsSync(join(root, "public/titans/generated/allies", f.replace("-row.png", ".png")))), authored.map((f) => f.replace("-row.png", "")).join());
    // 보스 피격·처치는 img2img 결과가 포즈로 읽히지 않아 절차적 파생을 유지 — authored 매니페스트가 없어야 make-monster-states 가 전부 파생한다
    ok("아트gen 보스는 절차적 파생 유지(monsters/authored.json 없음)", !existsSync(join(root, "public/titans/generated/monsters/authored.json")));
    const cAuth = join(root, "public/titans/character/skins/authored.json");
    ok("아트gen 코스튬 원화 매니페스트 2종", existsSync(cAuth) && JSON.parse((await import("node:fs")).readFileSync(cAuth, "utf8")).length === 2);
  }
  ok("J 스킨 썸네일·아틀라스 파일 존재", ["skins/ari-blaze.png", "skins/luna-eclipse.png", "skins/season-1.png", "ally-skin-special-atlas-v1.png"].every((f) => existsSync(join(root, "public/titans/generated/allies", f))));
}

// ── 4g. 순간 제안 (결제 타이밍, retention-2) ──
{
  const mo = await (async () => {
    const d = mkdtempSync(join(tmpdir(), "sysmo-"));
    const e = join(d, "entry.ts");
    writeFileSync(e, `export * from "${root}/src/economy/momentOffers";
export * as pay from "${root}/src/payments/store";`);
    const o = join(d, "bundle.mjs");
    await build({ entryPoints: [e], bundle: true, format: "esm", outfile: o, platform: "node", define: { "import.meta.env.BASE_URL": '"/"', "import.meta.env.DEV": "false", "import.meta.env.PROD": "true" } });
    const m = await import(pathToFileURL(o).href);
    rmSync(d, { recursive: true, force: true });
    return m;
  })();
  const t0 = 1_800_000_000_000;
  const p0 = prog.normalizeCharacterProgress({ ...base, redGems: 0, attendanceStreak: 3 }); // 유료 게이트 통과
  const p1 = mo.openMomentOffer(p0, "wall", t0);
  ok("순간 제안 열기: pack-wall 15분 창 · 보너스 30", p1.momentOffers["pack-wall"]?.kind === "wall" && p1.momentOffers["pack-wall"].until === t0 + 15 * 60000 && mo.momentBonusGems(p1, "pack-wall", t0 + 1000) === 30);
  ok("순간 제안 중복 열기 무시 · 만료 후 0", mo.openMomentOffer(p1, "wall", t0 + 1000) === p1 && mo.momentBonusGems(p1, "pack-wall", t0 + 16 * 60000) === 0 && mo.activeMomentOffers(p1, t0 + 16 * 60000).length === 0);
  const bought = mo.pay.applyPurchase(p1, "pack-wall", "tx-1", t0 + 5000);
  ok("창 안 구매 → 보석 100 + 보너스 30 · 제안 제거", bought.applied && bought.bonus === 30 && bought.progress.redGems === 130 && !bought.progress.momentOffers["pack-wall"]);
  ok("구매한 트리거 팩은 다시 열리지 않음", mo.openMomentOffer(bought.progress, "wall", t0 + 6000) === bought.progress);
  const late = mo.pay.applyPurchase(p1, "pack-wall", "tx-2", t0 + 20 * 60000);
  ok("창 밖 구매 → 보너스 0 (정가 구성)", late.applied && late.bonus === 0 && late.progress.redGems === 100);
  ok("유료 게이트 전(출석<3·Lv<20)엔 제안이 열리지 않음", mo.openMomentOffer(prog.normalizeCharacterProgress({ ...base, attendanceStreak: 1, level: 5 }), "wall", t0) === prog.normalizeCharacterProgress({ ...base, attendanceStreak: 1, level: 5 }) || Object.keys(mo.openMomentOffer(prog.normalizeCharacterProgress({ ...base, attendanceStreak: 1, level: 5 }), "wall", t0).momentOffers).length === 0);
  // retention-3 정산 모달 후원 미리보기: 9h 복귀·캡 8h(버림 1h) → 추가 1h 골드, 후원 중이거나 8h 미만이면 null
  const pv = mo.patronPreview({ patronUntil: 0, attendanceStreak: 3, level: 5 }, 9 * 3600, 3600, 80000, 8 * 3600, t0);
  ok("후원 미리보기: 캡 +2h × 시급(10K) = 20,000 골드", pv && pv.extraGold === 20000 && pv.extraHours === 2, JSON.stringify(pv));
  ok("후원 미리보기 제외: 후원 중 · 8h 미만 · 게이트 전", mo.patronPreview({ patronUntil: t0 + 1, attendanceStreak: 3, level: 5 }, 9 * 3600, 3600, 80000, 8 * 3600, t0) === null && mo.patronPreview({ patronUntil: 0, attendanceStreak: 3, level: 5 }, 7 * 3600, 0, 1, 1, t0) === null && mo.patronPreview({ patronUntil: 0, attendanceStreak: 1, level: 5 }, 9 * 3600, 3600, 1, 1, t0) === null);
  // retention-4: 개척·환생 제안 — 30분 창, 트리거 팩 구매 후 재개방 없음
  const pio = mo.openMomentOffer(p0, "pioneer", t0);
  ok("개척 축하 제안: pack-pioneer 30분 창 · 보너스 30", pio.momentOffers["pack-pioneer"]?.kind === "pioneer" && pio.momentOffers["pack-pioneer"].until === t0 + 30 * 60000 && pio.momentOffers["pack-pioneer"].bonusGems === 30);
  const reb = mo.openMomentOffer(p0, "rebirth", t0);
  ok("환생 축하 제안: pack-rebirth 30분 창 · 보너스 60 · 구매 시 보석 400+60·코어 10", reb.momentOffers["pack-rebirth"]?.bonusGems === 60 && (() => { const r = mo.pay.applyPurchase(reb, "pack-rebirth", "tx-r", t0 + 1000); return r.applied && r.bonus === 60 && r.progress.redGems === 460 && r.cores === 10; })());
  // retention-5: 픽업 D-2 제안 — 창은 회전 종료 시각과 정의 창(2일) 중 이른 쪽, 첫 구매 2배 + 보너스 150
  const pk = mo.openMomentOffer(p0, "pickup", t0, t0 + 36 * 3600000);
  ok("픽업 제안: gems-1200 창 = 회전 종료(36h) · 보너스 150", pk.momentOffers["gems-1200"]?.kind === "pickup" && pk.momentOffers["gems-1200"].until === t0 + 36 * 3600000 && pk.momentOffers["gems-1200"].bonusGems === 150);
  ok("픽업 제안 구매(첫 구매) → 1200×2 + 150 = 2550", (() => { const r = mo.pay.applyPurchase(pk, "gems-1200", "tx-p", t0 + 1000); return r.applied && r.doubled && r.bonus === 150 && r.progress.redGems === 2550; })());
  // retention-6: 주간 마감 알림 시각 — 일요일 20:00 로컬, 지났으면 null
  const nat = await (async () => { const d = mkdtempSync(join(tmpdir(), "sysnat-")); const e = join(d, "entry.ts"); writeFileSync(e, `export * from "${root}/src/game/native";`); const o = join(d, "bundle.mjs"); await build({ entryPoints: [e], bundle: true, format: "esm", outfile: o, platform: "node", define: { "import.meta.env.BASE_URL": '"/"', "import.meta.env.DEV": "false", "import.meta.env.PROD": "true" } }); const m = await import(pathToFileURL(o).href); rmSync(d, { recursive: true, force: true }); return m; })();
  const wed = new Date(2026, 8, 2, 10, 0, 0); // 수요일 10시
  const dl = nat.weeklyDeadlineAt(wed);
  ok("주간 마감 알림: 수요일 → 같은 주 일요일 20:00", dl && dl.getDay() === 0 && dl.getHours() === 20 && dl.getDate() === 6);
  ok("주간 마감 알림: 일요일 21시 → null(지남)", nat.weeklyDeadlineAt(new Date(2026, 8, 6, 21, 0, 0)) === null);
  ok("5종 제안 상품이 모두 카탈로그에 존재", Object.values(mo.MOMENT_OFFERS).every((d) => product.STORE_PRODUCTS.some((p) => p.id === d.productId)));
  ok("남은 시간 표기", mo.momentTimeLeft(t0 + 90_000, t0) === "1:30" && /일/.test(mo.momentTimeLeft(t0 + 2 * 86400000, t0)));
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

// ── 콘텐츠 역할 분리 P0 (docs/CONTENT_ROLES_PLAN.md) ──
{
  // 비트 기록: 곡×난이도 최고 점수/콤보/정확도 — 신기록 판정, 정규화가 기록을 보존
  const base = beatRpg.emptyBeatRpg();
  const r1 = beatRpg.applyBeatRecord(base, "pixel-rush", "hard", { score: 1200, maxCombo: 30, accuracy: 0.8, cleared: true });
  const r2 = beatRpg.applyBeatRecord(r1.progress, "pixel-rush", "hard", { score: 900, maxCombo: 45, accuracy: 0.6, cleared: false });
  ok("비트 기록: 첫 판은 점수·콤보 모두 신기록, 두 번째 판은 콤보만 신기록이고 최고 점수는 유지된다", r1.newScore && r1.newCombo && !r2.newScore && r2.newCombo && r2.progress.records["pixel-rush:hard"].score === 1200 && r2.progress.records["pixel-rush:hard"].combo === 45 && r2.progress.records["pixel-rush:hard"].plays === 2 && r2.progress.records["pixel-rush:hard"].cleared === 1, JSON.stringify(r2.progress.records));
  ok("비트 기록: 난이도가 다르면 다른 기록이고, 전체 최고점수는 가장 큰 값", beatRpg.bestRecord(r2.progress, "pixel-rush", "easy") === null && beatRpg.bestScoreOverall(r2.progress) === 1200);
  const norm = beatRpg.normalizeBeatRpg(JSON.parse(JSON.stringify(r2.progress)));
  ok("비트 기록: 저장→정규화를 거쳐도 기록이 유지되고, 깨진 값은 0으로 방어된다", norm.records["pixel-rush:hard"].score === 1200 && beatRpg.normalizeBeatRpg({ records: { "x:easy": { score: "bad", combo: -3, accuracy: 7 } } }).records["x:easy"].accuracy === 1);
  // 화살 원정 Wave: 패턴 구간 = 웨이브
  const st = stages.STAGES[0];
  ok("화살 원정 Wave: 1스테이지 4패턴 → 0ms WAVE 1/4 · 마지막 패턴 시각 WAVE 4/4", stages.waveAt(st, 0).index === 1 && stages.waveAt(st, 0).count === 4 && stages.waveAt(st, st.patterns[3].atMs).index === 4);
  // 분석 이벤트 링버퍼 (localStorage 스텁)
  {
    const store = new Map();
    globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v), removeItem: (k) => store.delete(k) };
    analytics.clearEvents();
    for (let i = 0; i < 205; i += 1) analytics.track("arrow_expedition_start", { stage: i });
    const list = analytics.readEvents();
    ok("분석 이벤트: 최근 200건만 유지하고 가장 오래된 것부터 버린다", list.length === 200 && list[0].data.stage === 5 && list[199].data.stage === 204 && JSON.parse(store.get("dodgebullets:analytics")).length === 200);
    delete globalThis.localStorage;
  }
}

// ── 화살 원정 런 XP · 몬스터 보이는 여백 (2026-09-14) ──
{
  const w = { runXp: 0, runLevel: 1, levelUps: 0, tempo: 1 };
  const worldMod = await import(pathToFileURL(out).href).then((m) => m.dodgeWorld);
  for (let i = 0; i < 13; i += 1) worldMod.gainRunXp(w, 1);
  ok("런 XP: 13 XP 로 레벨 2(필요 13) · 레벨업 1 · tempo 1.045", w.runLevel === 2 && w.levelUps === 1 && Math.abs(w.tempo - 1.045) < 1e-9 && w.runXp === 0, JSON.stringify(w));
  for (let i = 0; i < 400; i += 1) worldMod.gainRunXp(w, 1);
  ok("런 XP: tempo 는 1.25 에서 멈춘다 (레벨이 아무리 올라도)", w.tempo === 1.25 && w.runLevel >= 6);
  const sp = await import(pathToFileURL(out).href).then((m) => m.spriteArt);
  ok("몬스터 보이는 여백: 새끼 용 좌 23%·우 32%, 모르는 원화는 15/15", JSON.stringify(sp.monsterVisibleMargin("/titans/generated/monsters/dragon-hit.png")) === "[0.23,0.32]" && JSON.stringify(sp.monsterVisibleMargin("x/unknown.png")) === "[0.15,0.15]");
}

// ── 콘텐츠 역할 분리 P1 ──
{
  // 보스 패턴: 티어별 고정, 서로 다른 구성, 성벽(5+)은 E
  const ids = [1, 2, 3, 4, 5, 9].map((t) => bossPatterns.bossPatternFor(t).id).join("");
  ok("보스 패턴: 1~4스테이지 A·B·C·D, 성벽은 E 로 고정 (학습 가능한 보스)", ids === "ABCDEE" && new Set(bossPatterns.BOSS_PATTERNS.map((p) => p.kinds.join("+") + p.count + p.spreadDeg)).size === 5, ids);
  ok("보스 패턴: 파편 수·종류 수가 일치하거나 순환하고, 예고는 500ms 이상", bossPatterns.BOSS_PATTERNS.every((p) => p.count >= 1 && p.kinds.length >= 1 && p.warningMs >= 500));
  // 성장 선택: 3택 무작위(결정적 rng) · 적용 효과 · 대시 미해금이면 dash 제외
  const w = { rangedWeapon: "bow", runSkills: {}, skillTimers: {}, slashGauge: 10, stats: { moveSpeed: 100, slashLevel: 0, dashUnlocked: false, dashCooldownMs: 1000 }, player: { hp: 3, maxHp: 3 }, skillLevels: dodgeSkills.emptySkillLevels(), runMods: dodgeShots.emptyRunMods() };
  let k = 0; const det = () => ((k += 0.37) % 1);
  const picked = perks.pickPerks(w, det);
  ok("성장 선택: 3개가 서로 다르고 활 계열 밖(이동·회피·검격) 카드는 없다", picked.length === 3 && new Set(picked.map((p) => p.id)).size === 3 && !picked.some((p) => ["dash", "speed", "slash"].includes(p.id)), picked.map((p) => p.id).join(","));
  perks.applyPerk(w, "heal"); perks.applyPerk(w, "shotExtra"); perks.applyPerk(w, "gauge");
  ok("성장 선택 적용: HP 가득이면 최대 HP +1, 기본 사격 +1발, 게이지 +35 (99 상한)", w.player.maxHp === 4 && w.player.hp === 4 && w.runMods.shotExtra === 1 && w.slashGauge === 45 && perks.applyPerk(w, "dash") === false);
  // 주간 랭킹: 내 기록이 정렬에 들어가고 같은 주·같은 유저면 재현, 기록 0이면 최하위
  const rpg0 = beatRpg.emptyBeatRpg();
  const r0 = ranking.weeklyRanking(rpg0, "u1", "2026-37");
  const rpg1 = beatRpg.applyBeatRecord(rpg0, "pixel-rush", "hard", { score: 9000, maxCombo: 50, accuracy: 0.9, cleared: true }).progress;
  const r1 = ranking.weeklyRanking(rpg1, "u1", "2026-37"), r1b = ranking.weeklyRanking(rpg1, "u1", "2026-37");
  ok("주간 랭킹: 기록 0이면 7위(최하위)·다음 목표 있음, 9000점이면 순위가 오르고 같은 시드는 재현된다", r0.myRank === 7 && r0.nextTarget !== null && r1.myRank < 7 && JSON.stringify(r1.rows) === JSON.stringify(r1b.rows) && r1.rows.every((x, i) => i === 0 || r1.rows[i - 1].score >= x.score), `r0 ${r0.myRank} r1 ${r1.myRank}`);
  // 광고 자리: dodgeDouble/beatDouble 한도 3, 미연동이면 none, 광고 제거면 free
  const p = { adRewards: { date: "", idleDouble: 0, booster4h: 0, bossRetry: 0, dodgeDouble: 0, beatDouble: 0 }, adFree: false };
  ok("광고 자리: dodgeDouble·beatDouble 하루 3회, 미연동이면 none, 광고 제거 보유면 free, 한도 소진이면 none", ads.AD_LIMITS.dodgeDouble === 3 && ads.AD_LIMITS.beatDouble === 3 && ads.rewardedAvailability(p, "dodgeDouble", "2026-09-10", false) === "none" && ads.rewardedAvailability({ ...p, adFree: true }, "beatDouble", "2026-09-10", false) === "free" && ads.rewardedAvailability({ ...p, adRewards: { ...p.adRewards, date: "2026-09-10", beatDouble: 3 } }, "beatDouble", "2026-09-10", true) === "none" && ads.rewardedAvailability(p, "beatDouble", "2026-09-10", true) === "ad");
  ok("진행도 정규화: adRewards 에 새 자리(dodgeDouble·beatDouble)가 기본 0으로 들어간다", prog.emptyCharacterProgress().adRewards.dodgeDouble === 0 && prog.emptyCharacterProgress().adRewards.beatDouble === 0);
}

// ── 랭크 시험 상대: 직업 명사 8종 → 서로 다른 그림자 원화 8장이 실제로 있다 ──
{
  const { existsSync } = await import("node:fs");
  const nouns = ["검객", "추적자", "고행자", "수문장", "방랑자", "집행자", "관측자", "대장장이"];
  const files = nouns.map((n) => shadow.shadowPortrait("잊힌 " + n).replace(/^[/]/, ""));
  ok("그림자 상대 직업 8종이 서로 다른 원화 파일에 대응한다", new Set(files).size === 8, files.map((f) => f.split("/").pop()).join(" "));
  ok("그림자 원화 8장이 public/ 에 존재한다", files.every((f) => existsSync(join(root, "public", f))));
  ok("모르는 명사는 검객 원화로 안전하게 떨어진다", /swordsman[.]png$/.test(shadow.shadowPortrait("잊힌 무언가")));
}

// ── 강화 검 원화 16장: 투명 여백이 트림돼 있다 (폭 기준 contain 축소로 '실'이 되지 않게) ──
{
  const sharp = (await import("sharp")).default;
  const bad = [];
  for (let i = 0; i < 16; i += 1) {
    const p = join(root, "public/forge/swords", "s" + String(i).padStart(2, "0") + ".png");
    const { data, info } = await sharp(p).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
    let minx = Infinity, maxx = -1;
    for (let y = 0; y < info.height; y += 1) for (let x = 0; x < info.width; x += 1) if (data[(y * info.width + x) * 4 + 3] > 24) { if (x < minx) minx = x; if (x > maxx) maxx = x; }
    const fill = (maxx - minx + 1) / info.width;
    if (fill < 0.7 || info.width > info.height) bad.push(`s${i}:${info.width}x${info.height} ${(fill * 100).toFixed(0)}%`);
  }
  ok("검 원화 16장 모두 세로형이고 검이 폭의 70% 이상을 채운다 (scripts/trim-sword-art.mjs)", bad.length === 0, bad.join(" "));
}

// ── 화살 원정 영구 스킬 — 원거리 요격 (2026-09-28) ──
{
  const S = dodgeSkills;
  const lv0 = S.emptySkillLevels();

  // 1) 미습득이면 아무 일도 없어야 한다 — 기존 봇 시뮬 게이트가 레벨 0 에서 돈다
  ok("스킬 6종 전부 0레벨로 시작", Object.values(lv0).every((v) => v === 0) && Object.keys(lv0).length === 6);
  const base = dodgeShop.statsFromLevels({ moveSpeed: 0, jumpPower: 0, dash: 1, slowField: 0, extraLife: 0 });
  ok("스킬 0레벨은 스탯을 바꾸지 않는다", JSON.stringify(S.applySkillLevels(base, lv0)) === JSON.stringify(base));
  ok("일섬 0레벨은 게이지 배수 1", S.gaugeGainMul(lv0) === 1);

  // 2) 마일스톤(짝수 레벨)에서만 값이 움직인다 — 표와 수치가 어긋나면 화면이 거짓말을 한다
  const movers = {
    fire: (lv) => [S.fireCooldown(lv), S.fireRadius(lv), S.firePower(lv)],
    water: (lv) => [S.waterCooldown(lv), S.waterPierce(lv)],
    ice: (lv) => [S.iceCooldown(lv), S.iceRadius(lv), S.iceSlow(lv)],
    earth: (lv) => [S.earthCooldown(lv), S.earthPower(lv), S.earthRadius(lv)],
    bolt: (lv) => [S.boltCooldown(lv), S.boltTargets(lv)],
    ultimate: (lv) => [S.ultSwingMul(lv), S.ultGaugeMul(lv)],
  };
  const mismatch = [];
  for (const def of S.EXPEDITION_SKILLS) {
    const f = movers[def.id];
    const milestoneLevels = new Set(def.milestones.map((m) => m.level));
    for (let lv = 1; lv <= S.SKILL_MAX_LEVEL; lv += 1) {
      const moved = JSON.stringify(f(lv)) !== JSON.stringify(f(lv - 1));
      if (moved !== milestoneLevels.has(lv)) mismatch.push(`${def.id} Lv${lv} ${moved ? "값만 변함" : "표만 있음"}`);
    }
  }
  ok("마일스톤 표와 실제 수치가 같은 레벨에서 움직인다", mismatch.length === 0, mismatch.slice(0, 4).join(", "));

  // 3) 성장 방향 — 레벨이 오르면 쿨타임은 내리고 위력은 오른다 (강화가 약화가 되면 안 된다)
  const worse = [];
  for (const [id, f] of Object.entries({ fire: S.fireCooldown, water: S.waterCooldown, ice: S.iceCooldown, earth: S.earthCooldown, bolt: S.boltCooldown })) {
    for (let lv = 1; lv < S.SKILL_MAX_LEVEL; lv += 1) if (f(lv + 1) > f(lv)) worse.push(`${id} Lv${lv + 1}`);
  }
  for (const [id, f] of Object.entries({ fire: S.fireRadius, water: S.waterPierce, ice: S.iceRadius, earth: S.earthPower, bolt: S.boltTargets, ult: S.ultSwingMul })) {
    for (let lv = 1; lv < S.SKILL_MAX_LEVEL; lv += 1) if (f(lv + 1) < f(lv)) worse.push(`${id} Lv${lv + 1}`);
  }
  ok("레벨이 오를 때 쿨타임은 내려가고 위력은 올라간다", worse.length === 0, worse.slice(0, 4).join(", "));

  // 4) 무기 상성 — 계열이 맞으면 쿨타임이 줄고, 안 맞거나 미장착이면 그대로
  ok("장궁은 물리 계열만, 지팡이는 마법 계열만 줄인다",
    S.weaponCooldownMul("bow", "physical") === 0.88 && S.weaponCooldownMul("bow", "magic") === 1
    && S.weaponCooldownMul("staff", "magic") === 0.88 && S.weaponCooldownMul("none", "physical") === 1);
  ok("물·흙은 물리 · 불·얼음·번개는 마법",
    S.SKILL_BY_ID.water.family === "physical" && S.SKILL_BY_ID.earth.family === "physical"
    && S.SKILL_BY_ID.fire.family === "magic" && S.SKILL_BY_ID.ice.family === "magic" && S.SKILL_BY_ID.bolt.family === "magic");
  // 상성표 — 다섯 화살이 서로 다른 적 화살 종류를 하나씩 맡는다. 겹치면 표가 무의미하다
  ok("속성 화살 5종의 상성이 서로 다른 적 화살 종류를 가리킨다",
    new Set(["fire", "water", "ice", "earth", "bolt"].map((id) => S.SKILL_BY_ID[id].strongVs)).size === 5
    && S.SKILL_BY_ID.ultimate.strongVs === null,
    ["fire", "water", "ice", "earth", "bolt"].map((id) => id + "→" + S.SKILL_BY_ID[id].strongVs).join(" "));
  ok("흙화살만 기본 위력 2 — 보스를 크게 깎는 자리", S.earthPower(1) === 2 && S.firePower(1) === 1 && S.waterPower(1) === 1 && S.icePower(1) === 1 && S.boltPower(1) === 1);
  // 저장 마이그레이션 — 예전 키의 레벨을 잃지 않는다
  ok("예전 저장(연속 사격·관통·화염탄·빙결·번개)이 새 키로 옮겨진다",
    JSON.stringify(S.migrateSkillLevels({ volley: 3, pierce: 2, flame: 5, frost: 4, chain: 1, ultimate: 2 }))
    === JSON.stringify({ fire: 5, water: 2, ice: 4, bolt: 1, earth: 0, ultimate: 2 }));
  ok("새 키 저장은 그대로 지나간다", S.migrateSkillLevels({ fire: 2, earth: 1 }).earth === 1);

  // 5) 일섬만 스탯에 닿는다 (베기 창) — 나머지는 자동 발사라 스탯에 얹을 것이 없다
  const ult6 = S.applySkillLevels(base, { ...lv0, ultimate: 6 });
  ok("일섬 Lv6 에서 베기 창 +16%", Math.abs(ult6.slowDurationMs - base.slowDurationMs * 1.16) < 1e-6);
  ok("일섬 Lv4 에서 게이지 획득 +12%", Math.abs(S.gaugeGainMul({ ...lv0, ultimate: 4 }) - 1.12) < 1e-9);

  // 6) 비용·해금
  const c1 = S.skillCost(S.SKILL_BY_ID.fire, 1), c5 = S.skillCost(S.SKILL_BY_ID.fire, 5);
  ok("스킬 비용이 레벨마다 오른다", c5.gold > c1.gold * 4 && c5.shards > c1.shards * 2, `lv1 ${c1.gold}G/${c1.shards}조각 → lv5 ${c5.gold}G/${c5.shards}조각`);
  ok("해금은 원정 스테이지 — 불화살·일섬은 처음부터, 번개화살은 3스테이지",
    S.skillUnlocked(S.SKILL_BY_ID.fire, 1) && S.skillUnlocked(S.SKILL_BY_ID.ultimate, 1)
    && !S.skillUnlocked(S.SKILL_BY_ID.bolt, 2) && S.skillUnlocked(S.SKILL_BY_ID.bolt, 3));

  // 7) 무기 교체 — 진행도에 저장된다. 맨손은 없다(활만 쓰는 콘텐츠, 2026-10-01): 예전 저장의 "none" 도 장궁으로
  ok("새 진행도는 장궁을 끼고 시작한다", prog.emptyCharacterProgress().expeditionWeapon === "bow");
  ok("예전 저장의 맨손(none)과 모르는 무기는 장궁으로, 지팡이는 그대로", (() => {
    const none = prog.normalizeCharacterProgress({ ...base, expeditionWeapon: "none" });
    const junk = prog.normalizeCharacterProgress({ ...base, expeditionWeapon: "railgun" });
    const staff = prog.normalizeCharacterProgress({ ...base, expeditionWeapon: "staff" });
    return none.expeditionWeapon === "bow" && junk.expeditionWeapon === "bow" && staff.expeditionWeapon === "staff";
  })());

  // 8) 출격 적재 — 스탯만 싣고 스킬 레벨을 빠뜨리면 화면은 Lv.10 인데 전투는 조용하다.
  //    App.tsx 의 모든 적재 호출부가 loadLoadout 을 지나는지 소스로 못 박는다.
  const appSrc = readFileSync(join(root, "src/App.tsx"), "utf8");
  const bypass = appSrc.split("\n").filter((l) => /applyStats\(world/.test(l) && !/applyStats\(world, stats\);/.test(l));
  ok("월드 적재는 loadLoadout 한 곳만 — 스탯만 싣는 우회 경로가 없다", bypass.length === 0, bypass.slice(0, 2).map((l) => l.trim()).join(" / "));
  // 9) 런 강화 카드 — 스킬 진화·콤보. 참고 게임의 핵심 루프를 옮긴 부분이다.
  //    함정도 같이 옮기지 않으려고, 들고 있지 않은 스킬의 카드는 후보에 넣지 않는다.
  {
    const w = (levels, weapon = "bow", acquired = true) => ({
      rangedWeapon: weapon,
      runSkills: acquired ? Object.fromEntries(Object.keys(levels).map((id) => [id, true])) : {},
      skillTimers: {},
      skillLevels: { ...S.emptySkillLevels(), ...levels },
      runMods: dodgeShots.emptyRunMods(),
      stats: { dashUnlocked: true },
      player: { hp: 1, maxHp: 1 },
      slashGauge: 0,
    });
    const ids = (world) => perks.PERKS.filter((p) => p.available(world)).map((p) => p.id);

    const bare = ids(w({}, "none"));
    ok("맨손(무기 없음)이면 게이지·HP 두 장뿐 — 활 계열 카드는 무기가 있어야 뜬다 (기준선)",
      bare.length === 2 && bare.includes("gauge") && bare.includes("heal"), bare.join());
    ok("이동 속도·회피·검격 카드는 사라졌다 (활 계열로 통일)",
      !perks.PERKS.some((p) => ["speed", "dash", "slash"].includes(p.id)));

    const armedOnly = ids(w({}));
    ok("무기만 있으면 기본 사격 카드가 붙는다 (속성 화살 카드는 안 뜬다)",
      armedOnly.includes("shotExtra") && armedOnly.includes("quickdraw") && armedOnly.includes("shotPierce")
      && !armedOnly.includes("fireWide") && !armedOnly.includes("boltExtra"), armedOnly.join());

    ok("콤보는 두 조건이 다 있을 때만 — 얼음만으로는 서리 사냥이 안 뜬다",
      !ids(w({ ice: 1 }, "none")).includes("chillHunt")
      && ids(w({ ice: 1 })).includes("chillHunt")
      && ids(w({ ice: 1, fire: 1 })).includes("chillBurst"));

    const taken = w({ ice: 1 });
    perks.applyPerk(taken, "chillHunt");
    ok("이미 고른 콤보는 다시 뜨지 않는다", taken.runMods.chillHunt === true && !ids(taken).includes("chillHunt"));

    const grow = w({ fire: 1, bolt: 1, ice: 1, water: 1, earth: 1 });
    perks.applyPerk(grow, "shotExtra"); perks.applyPerk(grow, "shotPierce");
    perks.applyPerk(grow, "fireWide"); perks.applyPerk(grow, "boltExtra"); perks.applyPerk(grow, "iceDeep");
    perks.applyPerk(grow, "waterMore"); perks.applyPerk(grow, "earthHeavy");
    ok("카드가 runMods 에만 쌓인다 (영구 스킬 레벨은 그대로)",
      grow.runMods.shotExtra === 1 && grow.runMods.shotPierce === 1
      && Math.abs(grow.runMods.fireRadiusMul - 1.35) < 1e-9 && grow.runMods.boltExtra === 1
      && Math.abs(grow.runMods.iceSlowBonus - 0.1) < 1e-9
      && grow.runMods.waterPierceExtra === 1 && grow.runMods.earthPowerBonus === 1
      && grow.skillLevels.fire === 1,
      JSON.stringify(grow.runMods));

    // 3택은 후보가 3장 미만이어도 멈춰야 한다 (rng 가 상수여도)
    const three = perks.pickPerks(w({ ice: 1 }), () => 0.5);
    ok("레벨업 3택은 겹치지 않는 카드 3장을 돌려준다", three.length === 3 && new Set(three.map((p) => p.id)).size === 3,
      three.map((p) => p.id).join());

    // ── 등급 — 스테이지가 깊을수록 상위 등급이 잘 나온다 (사용자 지시 2026-09-28)
    const odds = [0, 1, 2, 3].map((i) => perks.rarityOdds(i));
    ok("등급 확률: 각 스테이지에서 합이 1", odds.every((o) => Math.abs(o.common + o.rare + o.epic - 1) < 1e-9));
    ok("등급 확률: 스테이지가 깊을수록 에픽·레어가 오르고 일반이 내려간다",
      odds.every((o, i) => i === 0 || (o.epic > odds[i - 1].epic && o.rare > odds[i - 1].rare && o.common < odds[i - 1].common)),
      odds.map((o) => Math.round(o.epic * 100) + "%").join(" → "));
    ok("1스테이지 에픽은 드물고(≤5%) 4스테이지는 볼 만하다(≥15%)",
      odds[0].epic <= 0.05 && odds[3].epic >= 0.15, `${Math.round(odds[0].epic * 100)}% / ${Math.round(odds[3].epic * 100)}%`);

    ok("카드마다 등급이 붙어 있다", perks.PERKS.every((p) => ["common", "rare", "epic"].includes(p.rarity)));
    ok("콤보는 전부 에픽", perks.PERKS.filter((p) => p.combo).every((p) => p.rarity === "epic")
      && perks.PERKS.some((p) => p.combo));

    // 등급 굴림이 실제로 뽑히는 등급을 바꾼다 — rng 0 이면 항상 에픽, 0.99 면 항상 일반
    const full = w({ fire: 1, ice: 1, bolt: 1, water: 1, earth: 1 });
    const allEpic = perks.pickPerks(full, () => 0, 3, 3);
    const allCommon = perks.pickPerks(full, () => 0.99, 3, 0);
    ok("rng 가 낮으면 에픽부터, 높으면 일반부터 뽑힌다",
      allEpic.every((p) => p.rarity === "epic") && allCommon.every((p) => p.rarity === "common"),
      allEpic.map((p) => p.rarity).join() + " / " + allCommon.map((p) => p.rarity).join());

    // 그 등급이 동나면 아래로 내려온다 — 에픽 후보가 없는 로드아웃에서 rng 0
    const thin = perks.pickPerks(w({}, "none"), () => 0, 3, 3);
    ok("에픽 후보가 없으면 아래 등급으로 내려오고, 후보가 2장뿐이면 2장에서 멈춘다 (맨손)",
      thin.length === 2 && thin.every((p) => p.rarity === "common"), thin.map((p) => p.id).join());

    // 같은 rng 면 같은 결과 (시뮬 재현)
    const seq = () => { let k = 0; return () => ((k += 0.37) % 1); };
    ok("같은 rng 면 같은 3택이 나온다 (재현 가능)",
      JSON.stringify(perks.pickPerks(full, seq(), 3, 2).map((p) => p.id))
      === JSON.stringify(perks.pickPerks(full, seq(), 3, 2).map((p) => p.id)));

    // 에픽 두 장은 실제로 세다
    const epic = w({});
    perks.applyPerk(epic, "arrowStorm");
    ok("[화살 폭풍] 에픽: 기본 사격 +2발 · 관통 +1", epic.runMods.shotExtra === 2 && epic.runMods.shotPierce === 1);
    const od = w({});
    perks.applyPerk(od, "overdrive");
    ok("[과부하] 에픽: 모든 스킬 재사용 ×0.8", Math.abs(od.runMods.cooldownMul - 0.8) < 1e-9);

    // ── 진화 — 스킬의 작동 방식을 바꾸고, 한 스킬당 하나만
    const evoIds = perks.PERKS.filter((p) => p.evolution).map((p) => p.id);
    ok("진화 카드 6종이 전부 에픽", evoIds.length === 6 && perks.PERKS.filter((p) => p.evolution).every((p) => p.rarity === "epic"), evoIds.join());

    const ev = w({ fire: 1, ice: 1 });
    ok("진화 전에는 세 스킬의 분기가 모두 열려 있다",
      ["evoBeam", "evoSeeker", "evoCluster", "evoPyre", "evoShatter", "evoLingering"].every((id) => ids(ev).includes(id)));
    perks.applyPerk(ev, "evoBeam");
    ok("한 스킬은 하나만 진화한다 — 광선을 고르면 유도는 닫히고 다른 스킬 분기는 열려 있다",
      ev.runMods.evolutions.basic === "beam"
      && !ids(ev).includes("evoBeam") && !ids(ev).includes("evoSeeker")
      && ids(ev).includes("evoPyre") && ids(ev).includes("evoShatter"), JSON.stringify(ev.runMods.evolutions));
    perks.applyPerk(ev, "evoSeeker");
    ok("이미 진화한 스킬은 다시 진화하지 않는다 (덮어쓰기 없음)", ev.runMods.evolutions.basic === "beam");

    // ── needs 목록이 available() 과 어긋나면 강화 화면이 거짓말을 한다.
    //    available() 이 진실이고 needs 는 그것을 밖에서 읽으려고 적어 둔 목록이다.
    {
      const all = ["fire", "water", "ice", "earth", "bolt", "ultimate"];
      const drift = [];
      for (const p of perks.PERKS) {
        if (!p.needs) {
          // needs 가 없는 카드는 스킬에 매이면 안 된다 — 아무 스킬 없이도 뜨거나(일반),
          // 스킬 전부 보유 상태에서만 뜨는 [과부하] 처럼 needs 를 안 쓰는 것이어야 한다
          continue;
        }
        // 필요한 스킬을 하나씩 빼 보면 반드시 후보에서 빠져야 한다
        for (const miss of p.needs) {
          const levels = {};
          for (const id of p.needs) if (id !== miss && id !== "basic") levels[id] = 1;
          const weapon = miss === "basic" || !p.needs.includes("basic") ? "none" : "bow";
          if (p.available(w(levels, weapon))) drift.push(p.id + " (" + miss + " 없이도 뜸)");
        }
        // 필요한 것을 모두 갖추면 떠야 한다
        const full = {};
        for (const id of p.needs) if (id !== "basic") full[id] = 1;
        if (!p.available(w(full, p.needs.includes("basic") ? "bow" : "none"))) drift.push(p.id + " (전부 들어도 안 뜸)");
      }
      ok("카드의 needs 목록과 실제 available() 조건이 일치한다", drift.length === 0, drift.slice(0, 3).join(", "));

      // 스킬마다 강화 화면이 보여 줄 카드가 실제로 있다 (일섬·관통은 카드 없음이 정상)
      const shown = all.map((id) => [id, perks.perksUnlockedBy(id).length]);
      ok("얼음화살을 올리면 런 중 카드 6장이 열린다 (심층·원소 전환·서리 사냥·열충격·파쇄·지속)",
        perks.perksUnlockedBy("ice").filter((p) => !p.learns).map((p) => p.id).sort().join() === "chillBurst,chillHunt,convertIce,evoLingering,evoShatter,iceDeep",
        perks.perksUnlockedBy("ice").map((p) => p.id).join());
      ok("무기만으로 열리는 카드가 8장 — 스킬 없는 계정도 카드가 뜬다 (콤보·원소 전환은 제외)",
        perks.perksForBasicOnly().map((p) => p.id).sort().join() === "arrowStorm,damageUp,evoBeam,evoSeeker,overdrive,quickdraw,shotExtra,shotPierce", perks.perksForBasicOnly().map((p) => p.id).join());
      // 가이드가 이름으로 든 카드 다섯 — 피해량 증가 · 공격 속도 · 연쇄 · 범위 폭발 · 원소 전환
      ok("가이드가 든 카드 다섯 종류가 모두 있다", ["damageUp", "quickdraw", "boltExtra", "fireWide", "convertFire"].every((id) => perks.PERKS.some((p) => p.id === id)));
      {
        const cw = w({ fire: 1 });
        perks.applyPerk(cw, "damageUp"); perks.applyPerk(cw, "convertFire");
        ok("[강궁] 피해 ×1.15 · [원소 전환] 은 이번 런에 하나만", Math.abs(cw.runMods.damageMul - 1.15) < 1e-9 && cw.runMods.convert === "fire" && !ids(cw).some((id) => id.startsWith("convert")), JSON.stringify({ mul: cw.runMods.damageMul, convert: cw.runMods.convert }));
        ok("[원소 전환] 은 습득한 속성으로만 뜬다", !ids(w({ ice: 1 }, "bow", false)).includes("convertIce") && ids(w({ ice: 1 })).includes("convertIce"));
      }
      ok("스킬마다 런 중 열리는 카드가 있다 (습득·원소 전환 포함) — 불 6 · 물 3 · 얼음 7 · 흙 3 · 번개 3",
        JSON.stringify(shown) === JSON.stringify([["fire",6],["water",3],["ice",7],["earth",3],["bolt",3],["ultimate",0]]),
        JSON.stringify(shown));
    }

    // ── 카드는 런 단위 — 스테이지 경계에서 지워지면 "이번 런 동안"이 거짓말이 된다
    {
      const wm = await import(pathToFileURL(out).href).then((m) => m.dodgeWorld);
      const world = wm.createWorld(390, 700, 1);
      world.rangedWeapon = "bow"; world.skillLevels = { ...world.skillLevels, fire: 3 };
      wm.resetRun(world, 0);
      perks.applyPerk(world, "shotExtra");
      perks.applyPerk(world, "learnFire");
      const speedAfterCard = world.stats.moveSpeed;
      wm.beginStage(world, 1);      // 다음 스테이지로 넘어간다 (런은 이어진다)
      ok("스테이지가 넘어가도 카드가 유지된다",
        world.runMods.shotExtra === 1 && world.runSkills.fire === true,
        JSON.stringify({ shotExtra: world.runMods.shotExtra }));
      ok("스탯 배수 칸은 남아 있다 (HP 카드가 쓴다)", speedAfterCard > 0 && world.runMods.moveSpeedMul === 1);
      wm.resetRun(world, 0);        // 새 런
      ok("새 런에서는 카드가 비워진다",
        world.runMods.shotExtra === 0 && world.runMods.moveSpeedMul === 1 && !world.runMods.evolutions.basic && !world.runSkills.fire);
    }
  }

  // ── 원정 칩 — 가이드의 영구 성장 2순위 "랜덤에 좌우되지 않는 패시브" (2026-09-28)
  {
    const C = dodgeChips;
    const S2 = dodgeSkills;
    const zero = C.emptyChipLevels();
    const neutral = JSON.stringify(C.emptyChipMods());

    ok("칩 6종이 0레벨로 시작", Object.keys(zero).length === 6 && Object.values(zero).every((v) => v === 0));
    ok("아무것도 안 끼우면 완전히 중립 — 기존 난이도 기준선이 그대로",
      JSON.stringify(C.chipModsOf(zero, [null, null, null], 3)) === neutral);
    ok("0레벨 칩은 끼워도 아무 일도 없다",
      JSON.stringify(C.chipModsOf(zero, ["focus", "rime", "edge"], 3)) === neutral);

    const lv5 = { ...zero, focus: 5, barrage: 5, ember: 5, rime: 5, vitality: 5, edge: 5 };
    const three = C.chipModsOf(lv5, ["focus", "barrage", "vitality"], 3);
    ok("끼운 칩만 효과가 난다 (안 끼운 서리·잔열·예기는 중립)",
      Math.abs(three.cooldownMul - 0.85) < 1e-9 && three.volleyExtra === 2 && three.extraLives === 2
      && three.flameRadiusMul === 1 && three.chillMsMul === 1 && three.gaugeMul === 1,
      JSON.stringify(three));

    ok("열리지 않은 슬롯의 칩은 세지 않는다",
      C.chipModsOf(lv5, ["focus", "barrage", "vitality"], 1).volleyExtra === 0
      && Math.abs(C.chipModsOf(lv5, ["focus", "barrage", "vitality"], 1).cooldownMul - 0.85) < 1e-9);
    ok("같은 칩을 두 칸에 끼워도 한 번만 센다",
      C.chipModsOf(lv5, ["barrage", "barrage", null], 3).volleyExtra === 2);

    ok("슬롯은 원정 기록으로 열린다 — 1·2·4스테이지",
      C.chipSlotsOpen(0) === 0 && C.chipSlotsOpen(1) === 1 && C.chipSlotsOpen(2) === 2
      && C.chipSlotsOpen(3) === 2 && C.chipSlotsOpen(4) === 3);

    const worse = [];
    for (let lv = 1; lv < C.CHIP_MAX_LEVEL; lv += 1) {
      if (C.chipCooldown(lv + 1) > C.chipCooldown(lv)) worse.push("focus");
      if (C.chipVolley(lv + 1) < C.chipVolley(lv)) worse.push("barrage");
      if (C.chipFlame(lv + 1) < C.chipFlame(lv)) worse.push("ember");
      if (C.chipChill(lv + 1) < C.chipChill(lv)) worse.push("rime");
      if (C.chipLives(lv + 1) < C.chipLives(lv)) worse.push("vitality");
      if (C.chipGauge(lv + 1) < C.chipGauge(lv)) worse.push("edge");
    }
    ok("칩은 레벨이 오를 때 나빠지지 않는다", worse.length === 0, worse.join());
    ok("칩 비용이 레벨마다 오르고, 첫 단계는 스킬 1레벨과 같아 선택이 생긴다",
      C.chipCost(5) > C.chipCost(1) * 3 && C.chipCost(1) === S2.skillCost(S2.SKILL_BY_ID.fire, 1).shards,
      "lv1 " + C.chipCost(1) + "인 → lv5 " + C.chipCost(5) + "인");

    // 설명 문구가 실제 수치와 같은가 — 화면이 거짓말하면 투자 판단이 망가진다
    ok("칩 설명이 실제 수치를 말한다",
      C.CHIP_BY_ID.focus.desc(5).includes("15%") && C.CHIP_BY_ID.ember.desc(5).includes("30%")
      && C.CHIP_BY_ID.rime.desc(5).includes("100%") && C.CHIP_BY_ID.edge.desc(5).includes("25%"),
      C.CHIP_BY_ID.focus.desc(5) + " / " + C.CHIP_BY_ID.ember.desc(5));

    const n = prog.normalizeCharacterProgress({ ...base, expeditionChips: { focus: 99 }, equippedChips: ["focus", "nope", null] });
    ok("진행도 정규화: 칩 레벨은 상한, 모르는 칩 id 는 빈 칸",
      n.expeditionChips.focus === C.CHIP_MAX_LEVEL && n.equippedChips[0] === "focus" && n.equippedChips[1] === null
      && n.equippedChips.length === C.CHIP_SLOTS, JSON.stringify(n.equippedChips));
  }


  // ── 원정 보급창 · 일일 임무 (2026-09-28)
  {
    const O = dodgeOps;
    const DAY = 24 * 60 * 60 * 1000;
    const t0 = new Date(2026, 8, 28, 10, 0, 0).getTime();

    // 보급 — 다음 런 한 번에만 듣는 소모품
    const stock = O.emptySupplyStock();
    ok("보급 3종이 0개로 시작", Object.keys(stock).length === 3 && Object.values(stock).every((v) => v === 0));
    ok("보급 가격이 칩 한 단계보다 비싸다 — 한 판을 확실히 바꾸는 값",
      O.SUPPLIES.every((s) => s.seals > dodgeChips.chipCost(1)),
      O.SUPPLIES.map((s) => s.name + " " + s.seals).join(" · "));

    // [선발 보급] 이 켜지면 3택이 전부 레어 이상이어야 한다
    const w2 = {
      rangedWeapon: "bow", runSkills: { ice: true, fire: true }, skillTimers: {}, skillLevels: { ...dodgeSkills.emptySkillLevels(), ice: 1, fire: 1 },
      runMods: dodgeShots.emptyRunMods(),
      stats: { dashUnlocked: true }, player: { hp: 1, maxHp: 1 }, slashGauge: 0, stageIndex: 0,
    };
    let seq = 0; const det = () => ((seq += 0.41) % 1);
    const plain = perks.pickPerks({ ...w2, draftBoost: false }, det, 3, 0);
    seq = 0;
    const boosted = perks.pickPerks({ ...w2, draftBoost: true }, det, 3, 0);
    ok("[선발 보급] 이 켜지면 3택이 전부 레어 이상",
      boosted.every((p) => p.rarity !== "common") && plain.some((p) => p.rarity === "common"),
      boosted.map((p) => p.rarity).join() + " / " + plain.map((p) => p.rarity).join());

    // 일일 — 날짜가 바뀌면 초기화
    const d0 = O.emptyDaily(t0);
    const run = { skillKills: 25, epicPicks: 1, clears: 1 };
    const d1 = O.addDailyProgress(d0, run, t0);
    const d2 = O.addDailyProgress(d1, run, t0);
    ok("일일 진행도가 런마다 쌓인다", d2.counts.intercept === 50 && d2.counts.epic === 2 && d2.counts.clear === 2,
      JSON.stringify(d2.counts));
    ok("날짜가 바뀌면 진행도와 수령 기록이 비워진다",
      O.rolledDaily({ ...d2, claimed: ["clear"] }, t0 + DAY).counts.intercept === 0
      && O.rolledDaily({ ...d2, claimed: ["clear"] }, t0 + DAY).claimed.length === 0);
    ok("같은 날이면 그대로", O.rolledDaily(d2, t0 + 3600_000).counts.intercept === 50);

    ok("목표를 채워야 수령할 수 있고, 한 번 받으면 다시 못 받는다",
      !O.dailyClaimable(d1, "intercept")            // 25/40
      && O.dailyClaimable(d2, "intercept")          // 50/40
      && O.dailyClaimable(d2, "clear")              // 2/2
      && !O.dailyClaimable({ ...d2, claimed: ["clear"] }, "clear"));

    // ── 보급창 정정 (2026-09-28 /goal 검토)
    // [예비 화살통] — 출격 시점엔 쿨타임이 이미 0 이라 "재사용 완료"는 빈말이었다.
    // 이제 30초 동안 재사용 ×0.7 이고, 시간이 다하면 원래대로 돌아와야 한다.
    {
      const wm = await import(pathToFileURL(out).href).then((m) => m.dodgeWorld);
      const world = wm.createWorld(390, 700, 1);
      world.rangedWeapon = "bow"; world.skillLevels = { ...world.skillLevels, fire: 3 };
      wm.resetRun(world, 0);
      world.runSkills.fire = true;
      // 표적이 없으면 쏘지 않는다(쿨타임을 태우지 않는다) — 화살 하나를 사정권에 둔다
      const tgt = world.arrows[0]; tgt.active = true; tgt.warningMs = 0; tgt.reflected = false; tgt.x = world.player.x; tgt.y = 40; tgt.hitRadius = 6; tgt.boss = false; tgt.kind = "normal";
      ok("새 런은 화살통 효과가 꺼진 채 시작한다 (재사용 배수 1)", world.primedMs === 0);
      // 출격 직후 쿨타임은 이미 0 — 예전 설명("재사용 완료")이 빈말이었다는 근거
      ok("출격 시점의 스킬 쿨타임은 이미 전부 0", Object.values(world.skillTimers).every((t) => t === 0));
      world.primedMs = O.PRIMED_MS;
      dodgeShots.updateSkillShots(world, 0.016);         // 첫 발이 나가며 쿨타임이 잡힌다
      const primedCd = world.skillTimers.fire;
      world.primedMs = 0; world.skillTimers.fire = 0;
      dodgeShots.updateSkillShots(world, 0.016);
      const normalCd = world.skillTimers.fire;
      ok("[예비 화살통] 이 켜진 동안 재사용이 ×0.7, 꺼지면 원래대로",
        primedCd > 0 && Math.abs(primedCd / normalCd - O.PRIMED_COOLDOWN_MUL) < 1e-6, primedCd.toFixed(2) + " / " + normalCd.toFixed(2));
      world.primedMs = 1000;
      dodgeShots.updateSkillShots(world, 0.5); dodgeShots.updateSkillShots(world, 0.6);
      ok("화살통 효과는 시간이 다하면 0 으로 내려온다", world.primedMs === 0);

      // epicPicks 는 클리어마다 일일 임무에 더한다 — 런 단위로 두면 스테이지마다 중복 집계된다
      world.epicPicks = 2;
      wm.beginStage(world, 1);
      ok("에픽 카드 집계는 스테이지 경계에서 비워진다 (중복 집계 방지)", world.epicPicks === 0);
      ok("이름이 활·지팡이 원정의 물건이다 (탄창·보험 계약 없음)",
        !O.SUPPLIES.some((sp) => /탄창|보험/.test(sp.name)) && O.SUPPLIES.map((sp) => sp.name).join() === "정예 선발,예비 화살통,수호 부적",
        O.SUPPLIES.map((sp) => sp.name).join(" · "));
    }
    // 사망·귀환에서도 일일 진행도를 센다 — 40개 요격하고 죽으면 0 이던 것 (소스 단언)
    {
      const app = readFileSync(join(root, "src/App.tsx"), "utf8");
      const credits = (app.match(/dailyProgress: \{ skillKills: world\.skillKills/g) ?? []).length;
      ok("일일 진행도를 클리어·사망·귀환 세 경로 모두에서 더한다", credits === 3, credits + "곳");
    }

    // 진행도 정규화
    const stale = prog.normalizeCharacterProgress({
      ...base,
      expeditionSupplies: { draft: 99, primed: 1, nope: 4 },
      expeditionDaily: { day: "2020-01-01", counts: { intercept: 999, epic: 9, clear: 9 }, claimed: ["clear", "bogus"] },
    });
    ok("진행도 정규화: 보급은 아는 id 3개만·수량 상한, 어제 일일 기록은 새 하루로",
      stale.expeditionSupplies.draft === O.SUPPLY_MAX && stale.expeditionSupplies.primed === 1
      && Object.keys(stale.expeditionSupplies).length === 3
      && stale.expeditionDaily.day === O.dayKey() && stale.expeditionDaily.counts.intercept === 0
      && stale.expeditionDaily.claimed.length === 0,
      JSON.stringify({ sup: stale.expeditionSupplies, day: stale.expeditionDaily.day }));
  }


  // ── 원정 주인공 시트 기하 (2026-09-28) — 검격 시트가 대기와 다른 규격이면 베는 순간 인물 크기가 튄다
  //    (예전 시트: 인물 높이 71% vs 대기 97% → 검격 때 26% 작아졌다). 프레임 높이와 인물 높이 비를 대기에 맞춘다.
  // ── 활만 쓴다 (2026-10-01) — 검격·일섬·반사·파쇄는 일제 사격·화살비·되쏘기·격추가 됐다.
  //    판정(arrows.ts)은 그대로이고 뜻·연출·모델 동작만 바뀌었으므로, 남은 것은 "검이 화면에 안 나온다"를 못 박는 일이다
  {
    const strip = (t) => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
    const files = ["src/App.tsx", "src/game/draw.ts", "src/game/player.ts", "src/game/skills.ts", "src/game/perks.ts", "src/game/chips.ts",
      "src/game/expeditionOps.ts", "src/game/stages.ts", "src/game/bossPatterns.ts", "src/game/shop.ts", "src/game/SkillPanel.tsx"];
    const hits = [];
    for (const f of files) {
      const t = strip(readFileSync(join(root, f), "utf8"));
      for (const word of ["검격", "일섬", "반사!", "\"파쇄\"", "베기 창", "검술", "hero-attack-sheet"]) if (t.includes(word)) hits.push(f + ": " + word);
    }
    ok("화살 원정 문구·그리기에 검이 없다 (검격·일섬·반사·파쇄·검 시트)", hits.length === 0, hits.slice(0, 5).join(" | "));
    ok("검 시트 파일을 지웠다 — 쓰지 않는 자산을 게임 자산으로 오판하지 않게", !existsSync(join(root, "public/titans/generated/hero-attack-sheet.png")));
    ok("화살비·일제 사격·되쏘기·격추가 화면 문구에 있다", (() => {
      const d = readFileSync(join(root, "src/game/draw.ts"), "utf8"), app = readFileSync(join(root, "src/App.tsx"), "utf8");
      return d.includes("\"되쏘기!\"") && d.includes("\"격추\"") && d.includes("화살비 준비") && app.includes("일제 사격 Lv.");
    })());
    // 무기는 늘 들고 있다 — 장착 중인 무기를 다시 눌러도 맨손이 되지 않는다 (핸들러 소스)
    const app = readFileSync(join(root, "src/App.tsx"), "utf8");
    ok("장착 중인 무기를 다시 눌러도 맨손이 되지 않는다", !app.includes("p.expeditionWeapon === id ? \"none\" : id") && app.includes("if (id === \"none\") return p;"));
    // 일제 사격 연출 — 검 호(arc) 대신 화살 부채꼴. 판정 폭(SWING_ARC)을 그대로 쓴다
    const draw = readFileSync(join(root, "src/game/draw.ts"), "utf8");
    ok("일제 사격 연출이 판정 호(SWING_ARC)와 같은 폭으로 화살 부채꼴을 그린다", draw.includes("SWING_ARC * (i + 0.5)) / 5") && !draw.includes("밝은 칼빛 호"));
    // 모델 — 검 시트를 안 쓰고 대기 시트 하나 위에 무기를 올린다. 시위 당김(drawPhase)이 활·지팡이 둘 다에 걸린다
    const player = readFileSync(join(root, "src/game/player.ts"), "utf8");
    ok("주인공은 시트 하나(대기) 위에 무기를 올려 그린다 — 무기를 바꿔도 모델이 바뀌지 않는다",
      !player.includes("getExpeditionAttackHero") && player.includes("drawPhase") && player.includes("world.rangedWeapon === \"staff\" ? -0.55 : -0.12"));
  }

  // ── 상성이 체감된다 (2026-09-29 재검토) — 표에만 있던 상성이 보스가 아니면 아무 효과가 없었다.
  //    상성 명중은 게이지 +6 · 보급 +1 을 더 주고 "상성!" 을 띄운다. 흙화살 ↔ 튕김 화살로 잰다.
  {
    const wm = await import(pathToFileURL(out).href).then((m) => m.dodgeWorld);
    const world = wm.createWorld(390, 700, 1);
    // 맨손으로 — 활을 끼면 기본 사격이 0프레임에 먼저 나가 표적을 가로챈다 (첫 시도에서 그렇게 FAIL 했다)
    world.rangedWeapon = "none"; world.skillLevels = { ...world.skillLevels, earth: 1 };
    wm.resetRun(world, 0);
    world.runSkills.earth = true;
    const place = (kind) => { const a = world.arrows[0]; a.active = true; a.warningMs = 0; a.reflected = false; a.boss = false; a.kind = kind; a.x = world.player.x; a.y = world.player.y - 14 - 30; a.vx = 0; a.vy = 0; a.hitRadius = 8; a.chilledMs = 0; };
    const shoot = () => { world.skillTimers.earth = 0; world.slashGauge = 0; world.supplies = 0; world.affinityPop = null; for (let i = 0; i < 40 && world.arrows[0].active; i += 1) dodgeShots.updateSkillShots(world, 1 / 60); return { gauge: world.slashGauge, supplies: world.supplies, pop: world.affinityPop?.element ?? null, dead: !world.arrows[0].active }; };
    place("normal"); const plain = shoot();
    place("ricochet"); const strong = shoot();
    ok("흙화살이 일반 화살을 떨군다 (게이지 +3 · 보급 +1)", plain.dead && plain.gauge === 3 && plain.supplies === 1 && plain.pop === null, JSON.stringify(plain));
    ok("상성(튕김) 명중은 게이지 +9 · 보급 +2 · 「상성!」 표시", strong.dead && strong.gauge === 9 && strong.supplies === 2 && strong.pop === "earth", JSON.stringify(strong));
  }

  // ── 참고 게임 체계 그대로 (2026-09-29 감사): 스킬별 조각 · 런 중 습득 · 수집 보너스
  {
    const S3 = dodgeSkills;
    const mk = (levels, acquired = {}) => ({
      rangedWeapon: "bow", runSkills: { ...acquired }, skillTimers: {}, stageIndex: 0, draftBoost: false,
      skillLevels: { ...S3.emptySkillLevels(), ...levels },
      runMods: dodgeShots.emptyRunMods(), stats: { dashUnlocked: true }, player: { hp: 1, maxHp: 1 }, slashGauge: 0,
    });
    const avail = (world) => perks.PERKS.filter((p) => p.available(world)).map((p) => p.id);

    // 1) 런 중 습득 — 영구 레벨이 있는 스킬만 습득 카드가 뜨고, 습득 전에는 강화 카드가 안 뜬다
    const fresh = mk({ fire: 1, ice: 2 });
    ok("영구 레벨이 있는 스킬만 습득 카드가 뜬다 (레벨 0 인 물·흙·번개는 안 뜬다)",
      avail(fresh).includes("learnFire") && avail(fresh).includes("learnIce")
      && !avail(fresh).includes("learnWater") && !avail(fresh).includes("learnEarth") && !avail(fresh).includes("learnBolt"));
    ok("습득 전에는 그 스킬의 강화·진화 카드가 안 뜬다",
      !avail(fresh).includes("fireWide") && !avail(fresh).includes("evoPyre") && !avail(fresh).includes("chillBurst"));
    perks.applyPerk(fresh, "learnFire");
    ok("습득하면 그 스킬이 이번 런에 켜지고 강화 카드가 열린다 (습득 카드는 사라진다)",
      fresh.runSkills.fire === true && avail(fresh).includes("fireWide") && !avail(fresh).includes("learnFire"));

    // 2) 첫 3택은 습득 카드를 보장한다 — 빌드가 시작되지 않는 판을 막는다
    const first = perks.pickPerks(mk({ fire: 1 }), () => 0.99, 3, 0);
    ok("아무것도 습득하지 않았으면 첫 자리는 습득 카드", !!first[0]?.learns && new Set(first.map((p) => p.id)).size === first.length, first.map((p) => p.id).join());
    const later = perks.pickPerks(mk({ fire: 1 }, { fire: true }), () => 0.99, 3, 0);
    ok("이미 습득한 뒤에는 자리를 강제하지 않는다", !later[0]?.learns, later.map((p) => p.id).join());

    // 3) 습득한 것만 실제로 나간다
    {
      const wm = await import(pathToFileURL(out).href).then((m) => m.dodgeWorld);
      const world = wm.createWorld(390, 700, 1);
      world.rangedWeapon = "none"; world.skillLevels = { ...world.skillLevels, fire: 3 };
      wm.resetRun(world, 0);
      const t = world.arrows[0]; t.active = true; t.warningMs = 0; t.reflected = false; t.boss = false; t.kind = "normal"; t.x = world.player.x; t.y = 60; t.vx = 0; t.vy = 0; t.hitRadius = 8;
      dodgeShots.updateSkillShots(world, 1 / 60);
      const before = world.skillShots.filter((x) => x.active).length;
      world.runSkills.fire = true;
      dodgeShots.updateSkillShots(world, 1 / 60);
      const after = world.skillShots.filter((x) => x.active && x.element === "fire").length;
      ok("보유만 하고 습득하지 않은 스킬은 쏘지 않는다 — 습득하면 그때부터 나간다", before === 0 && after === 1, before + " → " + after);
    }

    // 4) 스킬별 조각 — 그 판에 습득해 쓴 스킬의 조각이 나온다
    const drop = S3.shardDrops({ fire: true, ice: true }, 2, true, 1);
    ok("클리어하면 습득한 스킬마다 조각 2 + 스테이지, 안 쓴 스킬은 0",
      drop.fire === 4 && drop.ice === 4 && drop.water === undefined && drop.ultimate === 2, JSON.stringify(drop));
    const failDrop = S3.shardDrops({ fire: true }, 3, false, 0);
    ok("실패해도 쓴 스킬은 조각 1", failDrop.fire === 1 && failDrop.ultimate === undefined, JSON.stringify(failDrop));
    ok("강화 비용은 골드 + 그 스킬의 조각", (() => { const c = S3.skillCost(S3.SKILL_BY_ID.ice, 1); return c.gold > 0 && c.shards === 4 && !("seals" in c); })());

    // 5) 수집 보너스 — 배너의 숫자가 실제 효과
    ok("수집 보너스: 누적 레벨 하나당 재사용 −0.3%, 최대 −18%",
      S3.collectionCooldownMul(S3.emptySkillLevels()) === 1
      && Math.abs(S3.collectionCooldownMul({ ...S3.emptySkillLevels(), fire: 10 }) - 0.97) < 1e-9
      && Math.abs(S3.collectionCooldownMul({ fire: 10, water: 10, ice: 10, earth: 10, bolt: 10, ultimate: 10 }) - 0.82) < 1e-9);
    ok("배너 숫자 = 실제 배수", S3.skillSummary({ ...S3.emptySkillLevels(), fire: 10, ice: 10 }).bonusPct === 6);
    {
      const wm = await import(pathToFileURL(out).href).then((m) => m.dodgeWorld);
      const world = wm.createWorld(390, 700, 1);
      world.rangedWeapon = "bow"; wm.resetRun(world, 0);
      const plain = dodgeShots.basicCooldown(world);
      world.collectionMul = 0.9;
      ok("수집 보너스가 기본 사격 재사용에 실제로 걸린다", Math.abs(dodgeShots.basicCooldown(world) / plain - 0.9) < 1e-9);
    }

    // 6) 저장 — 새 진행도는 불화살 Lv1, 조각 없던 저장은 스킬마다 6개
    const fresh0 = prog.emptyCharacterProgress();
    ok("새 진행도는 불화살 Lv1 로 시작한다 (첫 3택에 습득 카드가 뜬다)", fresh0.expeditionSkills.fire === 1 && fresh0.expeditionShards.fire === 0);
    const old = prog.normalizeCharacterProgress({ ...base, expeditionSeals: 40, expeditionSkills: { flame: 3 } });
    ok("조각이 없던 저장은 스킬마다 6개로 시작하고 인장·레벨은 그대로",
      old.expeditionShards.fire === 6 && old.expeditionShards.ultimate === 6 && old.expeditionSeals === 40 && old.expeditionSkills.fire === 3,
      JSON.stringify(old.expeditionShards));
    const kept = prog.normalizeCharacterProgress({ ...base, expeditionShards: { fire: 11 } });
    ok("조각이 있는 저장은 그대로 (없는 키는 0)", kept.expeditionShards.fire === 11 && kept.expeditionShards.ice === 0);
  }

  // ── 감사 패스 (2026-09-29) — 사 놓고 안 듣던 칩 · 매 프레임 다시 터지던 장판 · 독과 실제가 다르던 재사용
  {
    const wm = await import(pathToFileURL(out).href).then((m) => m.dodgeWorld);
    const mk = (mut) => {
      const world = wm.createWorld(390, 700, 1);
      world.rangedWeapon = "none"; world.skillLevels = { ...world.skillLevels, fire: 1 };
      wm.resetRun(world, 3);                       // S4 — 화살 체력 3.6, 불화살 Lv1(1.6)로는 한 번에 안 부서진다
      world.runSkills.fire = true;
      for (const x of world.arrows) x.active = false;
      mut?.(world);
      return world;
    };
    const put = (world, i, x, y) => { const t = world.arrows[i]; t.active = true; t.warningMs = 0; t.reflected = false; t.boss = false; t.kind = "normal"; t.x = x; t.y = y; t.vx = 0; t.vy = 0; t.hitRadius = 8; t.hp = 0; t.maxHp = 0; t.chilledMs = 0; return t; };
    // 1) 화염 장판 — 폭발은 한 번, 그 뒤는 틱 피해
    {
      const world = mk((w) => { w.runMods.evolutions.fire = "pyre"; });
      const t = put(world, 0, world.player.x, world.player.y - 120);
      let frames = 0;
      while (world.sfx.boom === 0 && frames < 120) { dodgeShots.updateSkillShots(world, 1 / 60); frames += 1; }
      const hpAfterBoom = t.hp;
      world.sfx.hit = 0;
      const sparksBefore = world.sparks.filter((p) => p.active).length;
      for (let i = 0; i < 12; i += 1) dodgeShots.updateSkillShots(world, 1 / 60);
      const zone = world.skillShots.find((x) => x.active && x.element === "fire" && x.vx === 0 && x.vy === 0);
      ok("화염 장판: 폭발은 한 번뿐이다 (닿아 있는 화살마다 매 프레임 다시 터지지 않는다)", world.sfx.boom === 1 && !!zone, "boom " + world.sfx.boom);
      const tick = hpAfterBoom - t.hp;
      ok("화염 장판: 머무는 동안은 초당 피해 ×3 으로 나눠 태운다", t.active && Math.abs(tick - 1.6 * 3 * (12 / 60)) < 0.01, "12프레임에 " + tick.toFixed(3));
      ok("화염 장판: 틱 피해는 조용하다 — 명중음·파편을 매 프레임 내지 않는다", world.sfx.hit === 0 && world.sparks.filter((p) => p.active).length <= sparksBefore, "hit " + world.sfx.hit);
    }
    // 2) 잔열 칩 — 끼우면 폭발 반경이 실제로 넓어진다
    {
      const run = (mul) => {
        const world = mk((w) => { w.chips = { ...w.chips, flameRadiusMul: mul }; });
        put(world, 0, world.player.x, world.player.y - 120);
        const far = put(world, 1, world.player.x + 56, world.player.y - 120);   // 기본 반경 48 밖 · 48×1.3=62.4 안
        for (let i = 0; i < 120 && world.sfx.boom === 0; i += 1) dodgeShots.updateSkillShots(world, 1 / 60);
        return far.maxHp > 0;   // 맞았으면 체력이 채워져 있다
      };
      const plain = run(1), chip = run(dodgeChips.chipFlame(5));
      ok("잔열 칩: 장착하면 불화살 폭발 반경이 실제로 넓어진다 (Lv5 +30%)", !plain && chip, plain + " → " + chip);
    }
    // 3) 재사용 — 쏘는 쪽과 독이 같은 값을 읽는다
    {
      const world = mk((w) => { w.chips = { ...w.chips, cooldownMul: 0.9 }; w.collectionMul = 0.95; w.runMods.cooldownMul = 0.8; });
      put(world, 0, world.player.x, world.player.y - 300);
      dodgeShots.updateSkillShots(world, 1 / 60);
      const want = dodgeShots.skillCooldown(world, "fire");
      ok("속성 화살 재사용: 실제 타이머 = skillCooldown (칩 · 수집 · 카드 포함)",
        Math.abs(world.skillTimers.fire - want) < 1e-9 && Math.abs(want - 5.5 * 0.9 * 0.95 * 0.8) < 1e-9, world.skillTimers.fire + " / " + want);
      const app = readFileSync(join(root, "src/App.tsx"), "utf8");
      ok("독의 게이지는 skillCooldown 을 읽는다 (따로 계산하지 않는다)", app.includes("full = skillCooldown(world, d.id") && !app.includes("effectiveCooldown"));
    }
    // 4) 기본 무기와 칩 설명
    ok("장궁은 처음부터 열려 있다 — 새 계정이 끼고 있는 무기가 '잠김'으로 보이지 않는다",
      dodgeSkills.WEAPON_BY_ID.bow.unlockStage === 0 && prog.emptyCharacterProgress().expeditionWeapon === "bow" && dodgeSkills.weaponUnlocked(dodgeSkills.WEAPON_BY_ID.bow, 0));
    ok("칩 설명에 '+0' 이 없다 — 효과가 아직 없는 레벨은 언제 오르는지를 말한다",
      dodgeChips.CHIPS.every((c) => [1, 2, 3, 4, 5].every((lv) => !(c.desc(lv) + " ").includes("+0 "))),
      dodgeChips.CHIPS.map((c) => c.desc(1)).filter((d) => (d + " ").includes("+0 ")).join(" | "));
  }

  // ── 손맛 연출 (2026-09-29) — 판정과 무관하지만, "맞았다"는 신호가 실제로 나가는지는 단언으로 남긴다
  {
    const wm = await import(pathToFileURL(out).href).then((m) => m.dodgeWorld);
    const mkWorld = (skill) => {
      const world = wm.createWorld(390, 700, 1);
      world.rangedWeapon = "none"; world.skillLevels = { ...world.skillLevels, [skill]: 3 };
      wm.resetRun(world, 0);
      world.runSkills[skill] = true;
      return world;
    };
    const put = (world, i, kind, dx, dy) => { const a = world.arrows[i]; a.active = true; a.warningMs = 0; a.reflected = false; a.boss = false; a.kind = kind; a.x = world.player.x + dx; a.y = world.player.y - 14 + dy; a.vx = 0; a.vy = 300; a.hitRadius = 8; a.chilledMs = 0; a.angle = Math.PI / 2; a.length = 34; return a; };
    const run = (world, frames) => { for (let i = 0; i < frames; i += 1) dodgeShots.updateSkillShots(world, 1 / 60); };

    // 연출 난수는 Math.random 을 건드리지 않는다 — 시뮬의 시드 수열이 연출 때문에 움직이면 안 된다
    const realRandom = Math.random; let calls = 0; Math.random = () => { calls += 1; return 0.5; };
    const fw = mkWorld("fire");
    put(fw, 0, "normal", 0, -40); put(fw, 1, "normal", 12, -48);
    // 터지는 그 프레임에 센다 — 파편은 0.26~0.52초면 사라져 나중에 세면 절반이 없다
    let atBoom = 0;
    for (let i = 0; i < 30; i += 1) { dodgeShots.updateSkillShots(fw, 1 / 60); if (fw.sfx.boom === 1 && atBoom === 0) atBoom = fw.sparks.filter((p) => p.active).length; }
    Math.random = realRandom;
    ok("연출(파편·궤적)은 Math.random 을 쓰지 않는다 — 봇 시뮬 수열이 안 움직인다", calls === 0, calls + "회 호출");

    ok("불화살이 터지면 파편이 튀고 화면이 흔들리고 폭발음이 센다",
      atBoom >= 18 && fw.sfx.boom === 1 && fw.sfx.shot >= 1,
      JSON.stringify({ sparksAtBoom: atBoom, sfx: fw.sfx }));
    ok("두 발을 연달아 떨구면 연속 요격이 2 로 쌓인다", fw.streak === 2 && fw.streakMs > 0, "streak " + fw.streak);
    run(fw, 100);
    ok("1.5초 동안 못 이으면 연속 요격이 끊긴다", fw.streak === 0 && fw.streakMs === 0);
    ok("흔들림은 잦아들어 0 으로 돌아온다", fw.shakeMs === 0 && fw.shakeAmp === 0);

    // 얼음 — 맞은 화살은 부서지고 주변은 얼어붙은 표식이 남는다(그려질 대상)
    const iw = mkWorld("ice");
    put(iw, 0, "normal", 0, -40); const near = put(iw, 1, "normal", 30, -50);
    near.vy = 300;
    run(iw, 20);
    ok("얼음화살 주변의 화살은 얼어붙은 표식이 남는다 (서리 연출 대상)", near.active && near.chilledMs > 0 && iw.sfx.freeze === 1, "chilledMs " + Math.round(near.chilledMs));

    // 습득 — 주인공을 감싸는 빛과 소리
    const lw = wm.createWorld(390, 700, 1);
    lw.rangedWeapon = "bow"; lw.skillLevels = { ...lw.skillLevels, water: 2 };
    wm.resetRun(lw, 0);
    perks.applyPerk(lw, "learnWater");
    ok("스킬을 습득하면 그 속성의 빛과 습득음이 난다", lw.heroAura?.element === "water" && lw.sfx.learn === 1);
    wm.beginStage(lw, 1);
    ok("스테이지가 넘어가면 연출은 비워지지만 습득은 남는다", lw.heroAura === null && lw.sparks.every((p) => !p.active) && lw.runSkills.water === true);
  }


  ok("loadLoadout 이 스킬 레벨과 장착 무기를 함께 싣는다",
    /world\.skillLevels = \{ \.\.\.p\.expeditionSkills \}/.test(appSrc) && /world\.rangedWeapon = p\.expeditionWeapon/.test(appSrc));
}

for (const [s, n, d] of results) console.log(s, n, d ? "— " + d : "");
const fails = results.filter((r) => r[0] === "FAIL").length;
console.log(fails === 0 ? "\nALL PASS" : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
