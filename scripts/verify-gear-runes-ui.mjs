/**
 * 세트 파츠 룬 홈 — 실제 장비창 화면 검사 (2026-11-17)
 *   BASE=http://localhost:5173 node scripts/verify-gear-runes-ui.mjs   · 캡처: art-gen/out/gear-runes.png · gear-runes-res.png
 * 투구 +9 → 홈 3칸 · 갑옷 +2 → 잠김 안내 / 빈 홈 → 후보 세 장(강화석 −3) · 다시 들어와도 같은 후보 / 다시 뽑기(−2) / 고르면 새겨짐 ·
 * 다른 홈은 후보가 열린 동안 잠김 / 갑옷 +2 → +3 강화하면 '룬 홈 1칸' 알림 / 공명 → 입은 투구가 룬 색으로 빛남 · '공명' 글자 · 능력치 칩 '룬' / 390px 넘침 없음.
 */
import { launchBrowser } from "./launch-browser.mjs";
const BASE = process.env.BASE ?? "http://localhost:5173", H = "mock-local-dev", now = Date.now();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = []; const ok = (n, c, d = "") => results.push([c ? "PASS" : "FAIL", n, d]);
const browser = await launchBrowser({ args: ["--no-sandbox", "--disable-gpu"] });
const page = await browser.newPage();
const errors = []; page.on("pageerror", (e) => errors.push(String(e.message).slice(0, 200)));
await page.evaluateOnNewDocument(() => {
  window.__toasts = [];
  new MutationObserver(() => { const t = document.querySelector(".titans-toast")?.textContent ?? ""; if (t && !window.__toasts.includes(t)) window.__toasts.push(t); }).observe(document, { subtree: true, childList: true, characterData: true });
});
const PIECES = ["helmet", "armor", "gloves", "boots", "shoulder"];
const seed = async (extra = {}) => {
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const progress = {
    version: 5, onboardingStep: 4, level: 40, redGems: 2000, sharedCoins: 500000, enhancementMaterials: 50, titanBestStage: 40, pioneeredArea: 5, idleClaimedAt: now, updatedAt: now,
    partyIds: ["mia"], partyCap: 4, sessionCount: 9, claimedRewards: ["dodge-tutorial", "welcome-gift"], equippedWeaponKind: "sword", ownedShoulders: ["scout"], equippedShoulder: "scout",
    ownedGear: PIECES.map((s) => `sword-${s}`), equippedGear: Object.fromEntries(PIECES.map((s) => [s, `sword-${s}`])), gearSetLevels: { "sword-helmet": 9, "sword-armor": 2 }, ...extra,
  };
  const titans = { stage: 12, bestStage: 40, gold: 2000000, heroes: { mia: 26 }, lastActiveAt: now };
  const store = {
    [`dodgebullets:progression:v1:${H}`]: JSON.stringify(progress), [`dodgebullets:titans:${H}`]: JSON.stringify(titans),
    "dodge-bullets:soundEnabled": "0", "dodgebullets:qa-gems": "0", "dodgebullets:test-phase": "0",
    [`dodgebullets:attendance:v1:${H}`]: JSON.stringify({ lastClaimDate: new Date().toLocaleDateString("sv-SE"), totalDays: 3, consecutiveDays: 3 }),
  };
  await page.goto(`${BASE}/favicon.png`, { waitUntil: "domcontentloaded" });
  await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); location.href = "/"; }, store).catch(() => {});
  await page.waitForNavigation({ waitUntil: "networkidle0", timeout: 60000 }).catch(() => {});
  await sleep(1200);
  for (let k = 0; k < 3; k += 1) { await page.evaluate(() => { document.querySelector(".idle-claim")?.click(); }); await sleep(200); }
};
const saved = async () => JSON.parse(await page.evaluate((h) => localStorage.getItem(`dodgebullets:progression:v1:${h}`), H));
const openEquip = async (slot) => {
  await page.evaluate(() => [...document.querySelectorAll(".titans-growth-tabs button")].find((b) => b.textContent.includes("장비 성장"))?.click()); await sleep(500);
  await page.evaluate(() => document.querySelector(".equip-window")?.scrollIntoView({ block: "start" })); await sleep(300);
  await page.evaluate((slot) => document.querySelector(`.equip-slot[data-equip-slot="${slot}"]`)?.click(), slot); await sleep(300);
};
const runes = () => page.evaluate(() => {
  const g = document.querySelector(".gear-runes");
  return g ? { id: g.dataset.gearRunes, sockets: [...g.querySelectorAll(".rune-socket")].map((b) => ({ locked: b.classList.contains("is-locked"), dis: b.disabled, rune: (b.className.match(/rune-(flame|gale|earth|gold)/) ?? [])[1] ?? "", text: b.textContent.trim() })),
    cands: [...g.querySelectorAll(".rune-cand")].map((c) => c.textContent.trim()), hint: g.querySelector(".rune-sum small")?.textContent ?? "", res: g.querySelector(".rune-res")?.textContent ?? "" } : null;
});
// 저장이 바뀔 때까지(최대 3초)
const until = async (pred) => { for (let i = 0; i < 30; i += 1) { const v = await saved(); if (pred(v)) return v; await sleep(100); } return saved(); };

// ── 1) 투구 +9 → 홈 3칸 열림 · 갑옷 +2 → 잠김 ──
await seed();
await openEquip("armor");
const ar = await runes();
ok("갑옷 +2: 홈 세 칸 모두 잠김 · '+3 강화하면 열려요'", !!ar && ar.sockets.length === 3 && ar.sockets.every((s) => s.locked) && /\+3 강화하면 룬 홈이 열려요/.test(ar.hint), JSON.stringify(ar));
await openEquip("helmet");
const hr = await runes();
ok("투구 +9: 홈 세 칸 열림 · 빈 홈(＋)", !!hr && hr.id === "sword-helmet" && hr.sockets.every((s) => !s.locked && !s.dis && s.text === "＋"), JSON.stringify(hr?.sockets));

// ── 2) 빈 홈 → 후보 세 장 · 강화석 −3 · 은화 −20 ──
const before = await saved();
await page.evaluate(() => document.querySelector('.gear-runes .rune-socket[data-socket="0"]')?.click());
const afterOpen = await until((v) => !!v.runeOffer);
await sleep(300);
const op = await runes();
ok("빈 홈 → 후보 세 장(서로 다른 룬 · 등급 · 효과)", op.cands.length === 3 && new Set(afterOpen.runeOffer.cands.map((c) => c.rune)).size === 3 && op.cands.every((t) => /(일반|희귀|영웅)/.test(t) && /(치명|속도|제한시간|골드)/.test(t)), JSON.stringify(op.cands));
ok("여는 값: 강화석 −3 · 은화 −20", before.enhancementMaterials - afterOpen.enhancementMaterials === 3 && before.sharedCoins - afterOpen.sharedCoins === 20, `${before.enhancementMaterials}→${afterOpen.enhancementMaterials} · ${before.sharedCoins}→${afterOpen.sharedCoins}`);
ok("후보가 열린 동안 다른 홈은 잠김", op.sockets.every((s) => s.dis));
await page.screenshot({ path: "art-gen/out/gear-runes.png" });

// ── 3) 다시 들어와도 같은 후보 ──
await page.reload({ waitUntil: "networkidle0" }); await sleep(1000);
await openEquip("helmet");
const again = await runes();
ok("다시 들어와도 같은 후보", JSON.stringify(again.cands) === JSON.stringify(op.cands), JSON.stringify(again.cands));

// ── 4) 다시 뽑기 → 강화석 −2 · 후보 바뀜(횟수 +1) ──
const pre = await saved();
await page.evaluate(() => document.querySelector(".gear-runes .rune-reroll")?.click());
const rr = await until((v) => v.runeRolls === pre.runeRolls + 1);
ok("다시 뽑기: 강화석 −2 · 뽑은 횟수 +1 · 후보 바뀜", pre.enhancementMaterials - rr.enhancementMaterials === 2 && rr.runeRolls === pre.runeRolls + 1 && JSON.stringify(rr.runeOffer.cands) !== JSON.stringify(pre.runeOffer.cands), `${pre.enhancementMaterials}→${rr.enhancementMaterials}`);

// ── 5) 고르면 새겨짐 ──
await sleep(300);
await page.evaluate(() => document.querySelectorAll(".gear-runes .rune-cand")[1]?.click());
const picked = await until((v) => !v.runeOffer);
const want = rr.runeOffer.cands[1];
ok("고른 후보가 홈 0에 새겨짐 · 후보 닫힘", picked.gearRunes?.["sword-helmet"]?.[0]?.rune === want.rune && picked.gearRunes["sword-helmet"][0].grade === want.grade && !picked.runeOffer, JSON.stringify(picked.gearRunes));
await sleep(300);
const pr = await runes();
ok("새긴 홈에 룬 표지 · 다른 홈은 다시 열 수 있다", pr.sockets[0].rune === want.rune && !pr.sockets[1].dis && pr.cands.length === 0, JSON.stringify(pr.sockets));
ok("새김 알림", (await page.evaluate(() => window.__toasts)).some((t) => /을 새겼어요/.test(t)));

// ── 6) 갑옷 +2 → +3: 홈 열림 알림 ──
await openEquip("armor");
await page.evaluate(() => [...document.querySelectorAll(".gear-set-enhance button")].find((b) => b.textContent.includes("강화"))?.click());
await until((v) => v.gearSetLevels["sword-armor"] === 3);
await sleep(500);
ok("+3 강화 → '룬 홈 1칸이 열렸어요' 알림", (await page.evaluate(() => window.__toasts)).some((t) => /룬 홈 1칸이 열렸어요/.test(t)), JSON.stringify(await page.evaluate(() => window.__toasts)));
const ar3 = await runes();
ok("갑옷 +3: 홈 1칸 열림", ar3.sockets.filter((s) => !s.locked).length === 1, JSON.stringify(ar3.sockets));

// ── 7) 공명 — 투구 홈 셋 모두 황금 ──
await seed({ gearRunes: { "sword-helmet": [{ rune: "gold", grade: 1 }, { rune: "gold", grade: 0 }, { rune: "gold", grade: 2 }] } });
await openEquip("helmet");
const rs = await runes();
const wear = await page.evaluate(() => ({ field: document.querySelector('.titans-hero .equipment-wear[data-wear="sword-helmet"]')?.dataset.res ?? "", eq: document.querySelector('.equip-hero .equipment-wear[data-wear="sword-helmet"]')?.dataset.res ?? "",
  filter: (() => { const e = document.querySelector('.equip-hero .equipment-wear[data-wear="sword-helmet"]'); return e ? getComputedStyle(e).filter : ""; })(),
  chip: document.querySelector(".equip-info .gear-rune-total")?.textContent ?? "", chips: document.querySelectorAll(".equip-stat").length, over: document.documentElement.scrollWidth - window.innerWidth }));
ok("공명: '공명 · 황금 룬 ×1.5' 글자", /공명 · 황금 룬 ×1\.5/.test(rs.res), rs.res);
ok("공명: 입은 투구가 황금 빛(전장 · 장비창 모두 data-res=gold)", wear.field === "gold" && wear.eq === "gold" && /242, 194, 50/.test(wear.filter), JSON.stringify(wear));
ok("룬 합계 줄 — 사냥 골드 (1.5+2.25+3)×1.5 = 10.1% → 상한 +10%(최대)", /사냥 골드 \+10\.0%\(최대\)/.test(wear.chip), wear.chip);
ok("390px 가로 넘침 없음", wear.over <= 0, String(wear.over));
await page.evaluate(() => document.querySelector(".gear-runes")?.scrollIntoView({ block: "center" })); await sleep(300);
await page.screenshot({ path: "art-gen/out/gear-runes-res.png" });

ok("페이지 오류 없음", errors.length === 0, errors.join(" | "));
await browser.close();
for (const [s, n, d] of results) console.log(`${s} ${n}${d ? " — " + d : ""}`);
const fail = results.filter((r) => r[0] === "FAIL").length;
console.log(fail ? `\n${fail} FAIL` : "\nALL PASS");
process.exit(fail ? 1 : 0);
