/**
 * 등급 표시 · 입는 파츠 · 세트 강화 (2026-11-04, 사용자: "동료나 스킬 유물 등등이 등급별 차이점을 모르겠어 ui icon 부터 실제 동작 스킬 이펙트도 훨씬 화려하게")
 *   node scripts/verify-tier-visuals.mjs [캡처 폴더]   (vite dev 서버 5173 필요)
 * 등급 이름표(한글) · 틀이 등급마다 다르다 · 전장 발밑 · 시전 폭발이 몬스터 자리에서 등급만큼 크다 · 전장은 제자리 ·
 * 낀 파츠가 몸을 따라간다 · 세트 강화 · 훈련 카드는 고른 슬롯 것만.
 */
import { existsSync } from "node:fs";
import { launchBrowser } from "./launch-browser.mjs";
const OUT = process.argv[2], BASE = "http://localhost:5173", H = "mock-local-dev", now = Date.now();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = []; const ok = (n, c, d = "") => results.push([c ? "PASS" : "FAIL", n, d]);
const KINDS = ["sword", "spear", "bow", "staff"], LAYERS = ["helmet", "armor", "shoulder", "gloveL", "gloveR", "bootL", "bootR"];
ok("입는 그림 28장", KINDS.every((k) => LAYERS.every((l) => existsSync(`public/titans/anim/hero-gear/${k}-${l}.webp`))));
ok("시전 폭발 띠 5장", ["r", "sr", "ssr", "ur", "lr"].every((t) => existsSync(`public/titans/fx/tier-${t}.webp`)));
const browser = await launchBrowser({ args: ["--no-sandbox", "--disable-gpu"] });
const page = await browser.newPage();
const errors = []; page.on("pageerror", (e) => errors.push(String(e.message).slice(0, 200)));
const missing = []; page.on("response", (r) => { if (r.status() === 404 && /titans\//.test(r.url())) missing.push(r.url().slice(-48)); });
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.goto(BASE, { waitUntil: "networkidle0" });
const data = await page.evaluate(async () => { const a = await import("/src/titans/allies.ts"); const s = await import("/src/titans/skills.ts"); const r = await import("/src/titans/relics.ts"); const t = await import("/src/titans/model.ts"); return { rar: a.ALLY_RARITY, skill: s.SKILL_TIER, relics: r.RELICS.map((x) => [x.id, x.tier]), skills: t.SKILLS.map((x) => [x.id, x.slot, x.name]) }; });
const pick = (t) => Object.keys(data.rar).find((id) => data.rar[id] === t);
const TIERS = ["N", "R", "SR", "SSR", "UR", "LR"];
const seed = async (extra = {}, titansExtra = {}) => {
  const party = ["SR", "SSR", "UR", "LR"].map(pick).filter(Boolean);
  const heroes = Object.fromEntries(TIERS.map(pick).filter(Boolean).map((id) => [id, 12]));
  const progress = { version: 5, onboardingStep: 4, level: 40, redGems: 500, sharedCoins: 500000, enhancementMaterials: 50, titanBestStage: 40, pioneeredArea: 5, idleClaimedAt: now, updatedAt: now, partyIds: party, partyCap: 4, sessionCount: 9, allyBalanceVersion: 99, ...extra };
  const titans = { stage: 12, bestStage: 40, gold: 500000, heroes, party, lastActiveAt: now, ...titansExtra };
  await page.goto(`${BASE}/favicon.png`, { waitUntil: "domcontentloaded" });
  await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); location.href = "/"; }, {
    [`dodgebullets:progression:v1:${H}`]: JSON.stringify(progress), [`dodgebullets:titans:${H}`]: JSON.stringify(titans), "dodge-bullets:soundEnabled": "0", "dodgebullets:qa-gems": "0", "dodgebullets:test-phase": "0",
    [`dodgebullets:attendance:v1:${H}`]: JSON.stringify({ lastClaimDate: new Date().toLocaleDateString("sv-SE"), totalDays: 3, consecutiveDays: 3 }),
  }).catch(() => {});
  await page.waitForNavigation({ waitUntil: "networkidle0" }).catch(() => {});
  await sleep(1500);
  for (let i = 0; i < 3; i += 1) { await page.evaluate(() => { document.querySelector(".rebalance-modal")?.click(); document.querySelector(".idle-claim")?.click(); }); await sleep(250); }
};
const clickText = (sel, t) => page.evaluate(({ sel, t }) => { const b = [...document.querySelectorAll(sel)].find((x) => x.textContent.trim().includes(t)); b?.click(); return !!b; }, { sel, t });
const saved = async () => JSON.parse(await page.evaluate((h) => localStorage.getItem(`dodgebullets:progression:v1:${h}`), H));
const waitCombat = async () => { for (let i = 0; i < 60; i += 1) { if (await page.evaluate(() => document.querySelector(".titans-field")?.className.includes("phase-combat") && !!document.querySelector(".titans-monster .titan-monster-art"))) return true; await sleep(200); } return false; };

// ── 이름표 · 틀 ──
await seed({ relics: Object.fromEntries(data.relics.map(([id]) => [id, 7])) });
await clickText(".titans-bottom-nav button", "동료"); await sleep(900);
const ally = await page.evaluate(() => [...document.querySelectorAll(".ally-roster-grid .ally-card")].map((c) => {
  const tier = [...c.classList].find((k) => k.startsWith("rarity-")), art = c.querySelector(".titan-ally-art"), tag = c.querySelector(".rarity-tag"), st = getComputedStyle(art), r = tag?.getBoundingClientRect();
  return { tier, label: tag?.textContent, tagShown: !!r && r.width > 0, border: st.borderTopColor + st.borderTopWidth, radius: st.borderTopLeftRadius, fs: tag ? parseFloat(getComputedStyle(tag).fontSize) : 0, over: c.scrollWidth - c.clientWidth };
}));
const LABEL = { "rarity-n": "일반", "rarity-r": "희귀", "rarity-sr": "영웅", "rarity-ssr": "전설", "rarity-ur": "신화", "rarity-lr": "초월" };
ok("동료 카드: 접혀도 한글 등급 이름 · 13px 이상", ally.length >= 4 && ally.every((a) => a.label === LABEL[a.tier] && a.tagShown && a.fs >= 13), JSON.stringify(ally.map((a) => [a.tier, a.label, a.fs])));
ok("동료 카드: 등급마다 틀이 다르다", new Set(ally.map((a) => a.border + a.radius)).size === new Set(ally.map((a) => a.tier)).size, [...new Set(ally.map((a) => a.border))].join(" "));
ok("동료 카드: 넘침 없음", ally.every((a) => a.over <= 0), JSON.stringify(ally.map((a) => a.over)));
if (OUT) await page.screenshot({ path: `${OUT}/ally.png` });
await page.evaluate(() => document.querySelector(".hub-sheet-close, .hub-sheet-head button")?.click()); await sleep(400);

await clickText(".titans-growth-tabs button", "유물"); await sleep(800);
const relic = await page.evaluate(() => [...document.querySelectorAll(".relic-row")].slice(0, 80).map((r) => ({ tier: r.dataset.tier, chip: r.querySelector(".tier-chip")?.textContent, ink: getComputedStyle(r.querySelector(".quest-main > strong")).color })));
const T2 = { N: "일반", R: "희귀", SR: "영웅", SSR: "전설", UR: "신화", LR: "초월" };
ok("유물 줄: 한글 등급 이름", relic.length > 10 && relic.every((r) => r.chip === T2[r.tier]), `${relic.length}줄 · 등급 ${[...new Set(relic.map((r) => r.tier))].join(",")}`);
const lrHalo = await page.evaluate(() => { const lr = document.querySelector('.relic-row[data-tier="LR"] .quest-icon'); const n = document.querySelector('.relic-row[data-tier="N"] .quest-icon, .relic-row[data-tier="R"] .quest-icon'); return { lr: lr ? getComputedStyle(lr, "::before").animationName : "", low: n ? getComputedStyle(n, "::before").opacity : "" }; });
ok("초월 유물만 도는 무지개 고리", lrHalo.lr === "tier-halo-spin" && lrHalo.low === "0", JSON.stringify(lrHalo));
if (OUT) { await page.evaluate(() => document.querySelector('.relic-row[data-tier="LR"], .relic-row')?.scrollIntoView({ block: "start" })); await sleep(250); await page.screenshot({ path: `${OUT}/relic.png` }); }

// ── 전장 발밑 · 시전 폭발 ──
const learned = data.skills.filter(([, slot]) => slot !== "passive");
const byTier = (t) => learned.find(([id]) => data.skill[id] === t);
await seed();
await waitCombat(); await sleep(1500);
const aura = await page.evaluate(() => [...document.querySelectorAll(".titans-allies .titan-ally-art[data-rarity]")].map((a) => { const i = a.querySelector(".ally-tier-aura"); return { t: a.dataset.rarity, shown: !!i && getComputedStyle(i).display !== "none" && i.getBoundingClientRect().width > 0, anim: i ? getComputedStyle(i, "::before").animationName : "" }; }));
ok("전장: 영웅 이상 발밑 빛 · 초월은 도는 고리", aura.length >= 3 && aura.every((a) => a.shown) && aura.some((a) => a.t === "LR" && a.anim === "tier-aura-spin"), JSON.stringify(aura));
if (OUT) await page.screenshot({ path: `${OUT}/field.png` });
const widths = {};
for (const t of ["R", "SR", "SSR", "UR", "LR"]) {
  const sk = byTier(t);
  if (!sk) continue;
  // 그 스킬만 끼고 전투 아래 단추를 실제로 누른다 — 폭발 자리는 시전 순간 몬스터 가운데라, 걸어 들어오는 중이면 재는 동안 몇 px 어긋난다(문턱 24px)
  await seed({}, { skillInventory: { learned: [sk[0]], levels: { [sk[0]]: 1 }, equipped: { [sk[1]]: sk[0] }, skillCores: 0 } });
  await waitCombat(); await sleep(900);
  const before = await page.evaluate(() => { const r = document.querySelector(".titans-field").getBoundingClientRect(); return [r.left, r.top, r.width]; });
  const clicked = await page.evaluate((id) => { const b = document.querySelector(`.titans-skill-dock .skill-icon-${id}`)?.closest("button"); b?.click(); return !!b; }, sk[0]);
  await sleep(130);
  const fx = await page.evaluate(() => {
    const i = document.querySelector(".titans-field > .skill-tier-fx"), f = document.querySelector(".titans-field"), fr = f.getBoundingClientRect();
    if (!i) return null;
    const b = i.querySelector(".tier-burst"), br = b.getBoundingClientRect(), mon = document.querySelector(".titans-monster .titan-monster-art")?.getBoundingClientRect();
    return { tier: i.dataset.tier, w: br.width, cx: br.left + br.width / 2 - fr.left, cy: br.top + br.height / 2 - fr.top, monX: mon ? mon.left + mon.width / 2 - fr.left : null, bg: getComputedStyle(b, "::before").backgroundImage, cutin: i.querySelector(".tier-cutin strong")?.textContent ?? "", chip: i.querySelector(".tier-cutin .tier-chip")?.textContent ?? "", bgShake: getComputedStyle(document.querySelector(".titans-background")).animationName, field: [fr.left, fr.top, fr.width] };
  });
  if (fx) widths[t] = fx.w;
  const wantCut = ["SSR", "UR", "LR"].includes(t);
  ok(`시전 ${t}(${sk[2]}): 폭발 그림 · 몬스터 자리 · 이름 띠`, clicked && fx && fx.tier === t && new RegExp(`tier-${t.toLowerCase()}\\.webp`).test(fx.bg) && (fx.monX === null || Math.abs(fx.cx - fx.monX) < 24) && (wantCut ? fx.cutin === sk[2] && fx.chip === T2[t] : !fx.cutin), JSON.stringify(fx && { w: Math.round(fx.w), cx: Math.round(fx.cx), mon: fx.monX && Math.round(fx.monX), cut: fx.cutin }));
  ok(`시전 ${t}: 전장은 제자리${["UR", "LR"].includes(t) ? " · 배경만 흔들림" : ""}`, fx && fx.field.every((v, k) => Math.abs(v - before[k]) <= 2) && (["UR", "LR"].includes(t) ? fx.bgShake === "tier-bg-shake" : true), JSON.stringify(fx && { shake: fx.bgShake }));
  if (OUT && fx) { await sleep(200); await page.screenshot({ path: `${OUT}/cast-${t}.png` }); }
  await sleep(1500);
}
const ws = ["R", "SR", "SSR", "UR", "LR"].map((t) => widths[t]).filter(Boolean);
ok("폭발은 등급이 오를수록 크다", ws.length >= 4 && ws.every((w, i) => i === 0 || w > ws[i - 1]), ws.map(Math.round).join(" < "));

// ── 입는 파츠 ──
for (const k of KINDS) {
  const eq = { helmet: `${k}-helmet`, armor: `${k}-armor`, gloves: `${k}-gloves`, boots: `${k}-boots`, shoulder: `${k}-shoulder` };
  await seed({ ownedGear: Object.values(eq), equippedGear: eq, equippedWeaponKind: k });
  await waitCombat(); await sleep(500);
  const tops = [], feet = [], seenModes = new Set(); let loaded = true, count = 0, boxOver = 0;
  for (let i = 0; i < 40; i += 1) {
    const s = await page.evaluate(() => {
      const c = document.querySelector(".titans-field .titans-hero .equipped-character"); if (!c) return null;
      const w = [...c.querySelectorAll(".equipment-wear")];
      const of = (n) => c.querySelector(`.wear-${n}`)?.style.transform ?? "";
      return { mode: [...c.classList].find((x) => x.startsWith("mode-")), n: w.length, loaded: w.every((x) => x.complete && x.naturalWidth > 0), helmet: of("helmet"), bootL: of("bootL"), z: getComputedStyle(w[0] ?? c).zIndex };
    });
    if (s) { seenModes.add(s.mode); count = s.n; loaded = loaded && s.loaded; tops.push(s.helmet); feet.push(s.bootL); }
    await sleep(70);
  }
  void boxOver;
  ok(`${k}: 일곱 층 다 그린다 · 그림 로드`, count === 7 && loaded, `층 ${count}`);
  ok(`${k}: 칸마다 몸을 따라 움직인다`, new Set(tops).size >= 3 && new Set(feet).size >= 2, `머리 ${new Set(tops).size}가지 · 발 ${new Set(feet).size}가지 · ${[...seenModes].join(",")}`);
  if (OUT) { await page.evaluate(() => document.querySelector(".titans-field")?.scrollIntoView({ block: "start" })); await page.screenshot({ path: `${OUT}/worn-${k}.png` }); }
}
await seed();
await waitCombat();
ok("안 끼면 맨몸(주인공 그림은 그대로)", await page.evaluate(() => document.querySelectorAll(".titans-hero .equipment-wear").length === 0));

// ── 세트 강화 · 훈련 카드 ──
const fxv = await page.evaluate(async () => {
  const m = await import("/src/equipment/gearSets.ts"), s = (k, lv) => { const e = Object.fromEntries(m.GEAR_SET_SLOTS.map((x) => [x, `${k}-${x}`])); return m.gearSetEffects(e, k, Object.fromEntries(Object.values(e).map((id) => [id, lv]))); };
  return { base: s("sword", 0).tapMul, max: s("sword", 10).tapMul, over: s("sword", 99).tapMul, spear: s("spear", 10).bossMul, cost9: m.gearSetEnhanceCost(9)?.materials, cost10: m.gearSetEnhanceCost(10) };
});
ok("강화 값: 검 +0 1.175 · +10 1.30 · +10 상한 · 창 +10 1.48 · +10 뒤 비용 없음", Math.abs(fxv.base - 1.175) < 1e-9 && Math.abs(fxv.max - 1.3) < 1e-9 && fxv.over === fxv.max && Math.abs(fxv.spear - 1.48) < 1e-9 && fxv.cost10 === null, JSON.stringify(fxv));
await seed({ ownedGear: ["sword-helmet"], equippedGear: { helmet: "sword-helmet" } });
await clickText(".titans-growth-tabs button", "장비 성장"); await sleep(600);
const vis = () => page.evaluate(() => [...document.querySelectorAll(".equipment-training-card")].map((c) => ({ shown: c.getBoundingClientRect().height > 0, part: c.dataset.gearPart ?? "" })));
let cards = await vis();
ok("훈련 카드: 여섯 개 중 고른 슬롯 하나만 보인다", cards.length === 6 && cards.filter((c) => c.shown).length === 1 && cards[0].shown, JSON.stringify(cards.map((c) => c.shown)));
await page.evaluate(() => document.querySelector('.equip-slot[data-equip-slot="helmet"]').click()); await sleep(400);
cards = await vis();
ok("투구 슬롯 → 투구 훈련 카드", cards.filter((c) => c.shown).length === 1 && cards.find((c) => c.shown)?.part === "helmet", JSON.stringify(cards.find((c) => c.shown)));
const beforeEnh = await saved();
const row = await page.evaluate(() => { const r = document.querySelector('.gear-set-enhance[data-gear-enhance="sword-helmet"]'); return r ? { text: r.textContent, disabled: r.querySelector("button").disabled, h: r.querySelector("button").getBoundingClientRect().height, over: r.scrollWidth - r.clientWidth } : null; });
ok("낀 파츠 강화 줄이 보인다 · 44px 단추 · 넘침 없음", row && !row.disabled && /\+0/.test(row.text) && row.h >= 44 && row.over <= 0, JSON.stringify(row));
if (OUT) { await page.evaluate(() => document.querySelector(".equip-window")?.scrollIntoView({ block: "start" })); await sleep(250); await page.screenshot({ path: `${OUT}/enhance.png` }); }
await page.evaluate(() => document.querySelector(".gear-set-enhance button").click()); await sleep(500);
let afterEnh = await saved();
ok("강화: +1 · 코인 800 · 강화석 1", afterEnh.gearSetLevels?.["sword-helmet"] === 1 && beforeEnh.sharedCoins - afterEnh.sharedCoins === 800 && beforeEnh.enhancementMaterials - afterEnh.enhancementMaterials === 1, JSON.stringify({ lv: afterEnh.gearSetLevels, c: beforeEnh.sharedCoins - afterEnh.sharedCoins, m: beforeEnh.enhancementMaterials - afterEnh.enhancementMaterials }));
await page.goto(BASE, { waitUntil: "networkidle0" }); await sleep(800);
afterEnh = await saved();
ok("다시 들어와도 +1", afterEnh.gearSetLevels?.["sword-helmet"] === 1);
ok("옛 저장: 세트 강화 없음 = 빈 값", await page.evaluate(async () => { const m = await import("/src/equipment/gearSets.ts"); return Object.keys(m.normalizeGearSetLevels(undefined, [])).length === 0 && Object.keys(m.normalizeGearSetLevels({ "sword-helmet": 5 }, [])).length === 0 && m.normalizeGearSetLevels({ "sword-helmet": 99 }, ["sword-helmet"])["sword-helmet"] === 10; }));

// ── 장비 등급 ──
const tiers = await page.evaluate(async () => { const m = await import("/src/equipment/equipTier.ts"); return { w: [0, 3, 6, 9, 12, 14].map(m.weaponEquipTier), p: [0, 2, 4, 6, 8, 10].map(m.partEquipTier), s: [0, 2, 3, 6, 9].map(m.setEquipTier), sh: ["normal", "rare", "epic", "legendary"].map(m.shoulderEquipTier) }; });
// 2026-11-09 구간을 고르게(무기 3·3·3·3·2·2 · 부위 2·2·2·2·2·1 · 세트 3·3·3·2) — 각 등급의 첫 단계로 잰다
ok("장비 등급 값: 키운 만큼 일반 → 초월 · 세트는 영웅부터 · 견갑은 종류로", tiers.w.join() === "N,R,SR,SSR,UR,LR" && tiers.p.join() === "N,R,SR,SSR,UR,LR" && tiers.s.join() === "SR,SR,SSR,UR,LR" && tiers.sh.join() === "N,R,SR,SSR", JSON.stringify(tiers));
await seed({ ownedGear: ["sword-helmet", "spear-helmet", "bow-armor"], equippedGear: { helmet: "sword-helmet" }, gearSetLevels: { "sword-helmet": 10, "spear-helmet": 4 }, gearEnhance: { helmet: 0, armor: 7, gloves: 4, boots: 2 }, ownedShoulders: ["scout", "dragon"], equippedShoulder: "dragon", equippedWeaponLevel: 5 });
await clickText(".titans-growth-tabs button", "장비 성장"); await sleep(600);
const eqLook = () => page.evaluate(() => { const one = (e) => { const st = getComputedStyle(e), a = getComputedStyle(e, "::after"), small = e.querySelector("small"); return { key: e.dataset.equipSlot ?? e.dataset.item, tier: e.dataset.tier, border: st.borderTopColor + st.borderTopWidth, chip: a.content, chipFs: parseFloat(a.fontSize), bg: st.backgroundImage.slice(0, 18), inRow: small ? small.getBoundingClientRect().bottom <= e.getBoundingClientRect().bottom + 1 : true }; }; return { slots: [...document.querySelectorAll(".equip-slot[data-tier]")].map(one), bag: [...document.querySelectorAll(".equip-bag .equip-item[data-tier]")].map(one), noTier: [...document.querySelectorAll(".equip-bag .equip-item:not([data-tier])")].length }; });
let eq = await eqLook();
const slotOf = (k) => eq.slots.find((s) => s.key === k);
ok("장비창 칸: 키운 값대로 등급 · 한글 이름표 13px", slotOf("helmet")?.tier === "LR" && slotOf("armor")?.tier === "SSR" && slotOf("gloves")?.tier === "SR" && slotOf("boots")?.tier === "R" && slotOf("shoulder")?.tier === "SSR" && slotOf("helmet")?.chip === '"초월"' && slotOf("armor")?.chip === '"전설"' && eq.slots.every((s) => s.chipFs >= 13), JSON.stringify(eq.slots.map((s) => [s.key, s.tier, s.chip])));
ok("장비창 칸: 등급마다 테두리가 다르다", new Set(eq.slots.map((s) => s.border)).size >= 3, [...new Set(eq.slots.map((s) => s.border))].join(" "));
ok("가방: 모든 장비에 등급", eq.bag.length >= 4 && eq.noTier === 0, JSON.stringify(eq.bag.map((b) => [b.key, b.tier])));
if (OUT) { await page.evaluate(() => document.querySelector(".equip-window")?.scrollIntoView({ block: "start" })); await sleep(250); await page.screenshot({ path: `${OUT}/equip-tiers.png` }); }
await page.evaluate(() => document.querySelector('.equip-slot[data-equip-slot="helmet"]').click()); await sleep(350);
eq = await eqLook();
const helmetBag = eq.bag.map((b) => [b.key, b.tier]);
ok("투구 가방: 세트 강화 단계대로(+10 초월 · +4 전설)", helmetBag.some(([k, t]) => k === "sword-helmet" && t === "LR") && helmetBag.some(([k, t]) => k === "spear-helmet" && t === "SSR"), JSON.stringify(helmetBag));
if (OUT) await page.screenshot({ path: `${OUT}/equip-bag.png` });
const trainLook = await page.evaluate(() => { const c = [...document.querySelectorAll(".equipment-training-card")].find((x) => x.getBoundingClientRect().height > 0), ic = c.querySelector(".training-item-icon"); return { tier: c.dataset.tier, label: getComputedStyle(c.querySelector("strong"), "::before").content, border: getComputedStyle(ic).borderTopColor, text: c.querySelector("strong").textContent }; });
ok("훈련 카드: 등급 이름 · 틀 (제목 글자는 그대로)", trainLook.tier === "N" && trainLook.label === '"일반"' && /^투구/.test(trainLook.text), JSON.stringify(trainLook));
await clickText(".titans-bottom-nav button", "상점"); await sleep(500); await clickText(".hub-sheet-switch button", "꾸미기"); await sleep(300); await clickText(".shop-sub-tabs button", "장비"); await sleep(300); await clickText(".gear-filter button", "전체"); await sleep(300);
for (let i = 0; i < 40 && (await page.evaluate(() => document.querySelectorAll(".gear-item-row").length)) < 20; i += 1) await sleep(150);   // 전체 실행 부하에서 줄이 늦게 그려졌다
const shopRow = await page.evaluate(() => [...document.querySelectorAll(".gear-item-row")].map((r) => [r.dataset.tier, r.querySelector(".tier-chip")?.textContent, r.scrollWidth - r.clientWidth]));
ok("상점: 파츠마다 등급 이름 · 안 키운 것은 영웅 · 넘침 없음", shopRow.length === 20 && shopRow.every(([t, c, o]) => c === T2[t] && o <= 0) && shopRow.filter(([t]) => t === "SR").length === 18, JSON.stringify({ rows: shopRow.length, sr: shopRow.filter(([t]) => t === "SR").length, bad: shopRow.filter(([t, c, o]) => c !== T2[t] || o > 0).slice(0, 3), tiers: [...new Set(shopRow.map(([t]) => t))] }));
if (OUT) await page.screenshot({ path: `${OUT}/equip-shop.png` });

await page.evaluate(() => document.querySelector(".hub-sheet-close, .hub-sheet-head button")?.click()); await sleep(300);
await seed({ ownedGear: ["bow-helmet"], equippedGear: { helmet: "bow-helmet" } });
await page.evaluate(() => document.querySelector(".mypage-label")?.closest("button")?.click()); await sleep(1200);
const myWear = await page.evaluate(() => [...document.querySelectorAll(".character-page .equipment-wear, .equipment-wear")].map((w) => w.dataset.wear));
ok("다른 화면 주인공도 입는다(1벌 이상 보인다)", myWear.includes("bow-helmet"), JSON.stringify(myWear));

ok("페이지 오류 없음", errors.length === 0, errors.join(" | "));
ok("빠진 그림 없음", missing.length === 0, missing.slice(0, 4).join(" | "));
await browser.close();
for (const [s, n, d] of results) console.log(`${s} ${n}${d ? ` — ${d}` : ""}`);
const fail = results.filter((r) => r[0] === "FAIL").length;
console.log(fail ? `${fail} FAIL` : "ALL PASS");
process.exit(fail ? 1 : 0);
