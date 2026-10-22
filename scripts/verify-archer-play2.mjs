// 아처 키우기 차용 2차 — 실제 화면 검사 (2026-10-22): 번개 강화 줄 · 환영 선물 · 뽑기 중복 조각 진행 · 환생 미리 보기 · 이벤트 코인.
//   node scripts/verify-archer-play2.mjs   (vite 5173)
import { launchBrowser } from "./launch-browser.mjs";
const BASE = "http://localhost:5173", H = "mock-local-dev", now = Date.now();
const browser = await launchBrowser({ args: ["--no-sandbox"] }); const page = await browser.newPage(); const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = []; page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
await page.goto(BASE, { waitUntil: "networkidle0" });
let fails = 0; const ok = (n, c, d = "") => { console.log(`${c ? "PASS" : "FAIL"} ${n}${d ? " — " + d : ""}`); if (!c) fails += 1; };
const prog = () => page.evaluate((H) => JSON.parse(localStorage.getItem(`dodgebullets:progression:v1:${H}`) ?? "{}"), H);
const tit = () => page.evaluate((H) => JSON.parse(localStorage.getItem(`dodgebullets:titans:${H}`) ?? "{}"), H);
const clickText = (sel, text) => page.evaluate(({ sel, text }) => { const el = [...document.querySelectorAll(sel)].find((b) => b.textContent.trim().includes(text)); el?.click(); return !!el; }, { sel, text });
const baseProgress = (extra = {}) => ({ version: 5, level: 10, redGems: 100, idleClaimedAt: now, updatedAt: now, onboardingStep: 4, sessionCount: 9, partyIds: ["mia", "leon"], partyCap: 4, claimedRewards: ["dodge-tutorial"], pioneeredArea: 3, discoverySeeded: true, discovered: ["monster:slime", "monster:goblin", "monster:bat", "ally:mia", "ally:leon"], ...extra });
const seed = async (progress, titans) => {
  await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); }, { [`dodgebullets:progression:v1:${H}`]: JSON.stringify(progress), [`dodgebullets:titans:${H}`]: JSON.stringify(titans), [`dodgebullets:attendance:v1:${H}`]: JSON.stringify({ lastClaimDate: new Date().toLocaleDateString("sv-SE"), totalDays: 3, consecutiveDays: 3 }), "dodge-bullets:soundEnabled": "0", "dodgebullets:test-phase": "0" });
  await page.reload({ waitUntil: "networkidle0" }); await sleep(1200);
};
const closeModals = () => page.evaluate(() => { for (let k = 0; k < 5; k += 1) { const c = document.querySelector(".idle-claim"); if (c) { c.click(); continue; } const b = [...document.querySelectorAll("button")].filter((x) => !x.closest(".titans-bottom-nav")).find((x) => /^(닫기|확인|나중에)$/.test(x.textContent.trim())); if (b) b.click(); } });
// 팝업 관찰은 문서가 열릴 때부터(첫 몇 초 안의 팝업을 놓치지 않게)
const pops = []; await page.exposeFunction("__pop", (t) => pops.push(t));
await page.evaluateOnNewDocument(() => { document.addEventListener("DOMContentLoaded", () => new MutationObserver((ms) => { for (const m of ms) for (const n of m.addedNodes) if (n instanceof Element && n.matches(".reward-pop")) window.__pop(n.textContent); }).observe(document.body, { childList: true, subtree: true })); });
const watchPops = async () => {};

// ── 5. 환영 선물 — 정말 처음인 계정(세션 0 · 처치 0 · 1층) ──
await seed(baseProgress({ sessionCount: 0, redGems: 0, discovered: [] }), { gold: 0, stage: 1, bestStage: 1, totalKills: 0, heroes: { mia: 1, leon: 1 }, lastActiveAt: now });
await watchPops();
for (let i = 0; i < 24 && !pops.some((t) => /환영 선물/.test(t)); i += 1) await sleep(250);
let p = await prog();
ok("처음 계정 → '환영 선물 · 붉은 보석 +1,000' 팝업 · 보석 +1000 · 받음 기록", pops.some((t) => /환영 선물/.test(t) && /1,000/.test(t)) && p.redGems >= 1000 && (p.claimedRewards ?? []).includes("welcome-gift"), `${pops.find((t) => /환영/.test(t)) ?? "(팝업 없음)"} · 보석 ${p.redGems}`);
const gemsAfterGift = p.redGems;
await page.reload({ waitUntil: "networkidle0" }); await sleep(1800);
p = await prog();
ok("다시 들어와도 한 번만(보석이 1000 더 늘지 않는다)", p.redGems - gemsAfterGift < 1000, `${gemsAfterGift} → ${p.redGems}`);
// 옛 계정(세션 9)은 받지 않는다
await seed(baseProgress({ redGems: 50 }), { gold: 0, stage: 1, bestStage: 1, totalKills: 0, heroes: { mia: 1, leon: 1 }, lastActiveAt: now });
await sleep(1500);
p = await prog();
ok("옛 계정(세션 9)은 환영 선물 없음", !(p.claimedRewards ?? []).includes("welcome-gift") && p.redGems < 1000, `보석 ${p.redGems}`);

// ── 2. 번개 강화 줄 ──
await seed(baseProgress(), { gold: 100000, stage: 3, bestStage: 3, totalKills: 50, heroes: { mia: 5, leon: 5 }, lastActiveAt: now, lightningLevel: 0 });
await closeModals(); await sleep(400);
await page.evaluate(() => [...document.querySelectorAll(".titans-growth-tabs button")].find((b) => b.textContent.includes("장비"))?.click()); await sleep(500);
const lcard = await page.evaluate(() => document.querySelector(".lightning-card")?.textContent ?? "");
ok("장비 탭에 번개 카드 · '탭 피해 +0% → +12%' · '번개 ×0 → ×4.5'", /번개 · Lv\.0/.test(lcard) && /\+0% → \+12%/.test(lcard) && /×0 → ×4\.5/.test(lcard), lcard);
await page.evaluate(() => document.querySelector(".lightning-card button")?.click()); await sleep(500);
const toast = await page.evaluate(() => document.querySelector(".titans-toast")?.textContent ?? "");
const t1 = await tit();
ok("강화 → Lv.1 저장 · 토스트에 전후", t1.lightningLevel === 1 && /번개 Lv\.1/.test(toast) && /\+0% → \+12%/.test(toast), `Lv ${t1.lightningLevel} · 골드 ${t1.gold} · ${toast}`);
// 열 번째 탭마다 번개
await page.evaluate(() => { window.__bolts = 0; new MutationObserver((ms) => { for (const m of ms) for (const n of m.addedNodes) if (n instanceof Element && n.matches(".titans-fx-bolt")) window.__bolts += 1; }).observe(document.querySelector(".titans-field"), { childList: true, subtree: true }); });
// 그로스 서랍을 닫아 전장을 비운다
await page.evaluate(() => document.querySelector(".titans-growth-tabs button.on")?.click()); await sleep(300);
// 전투 중 탭만 센다 — 저장의 totalTaps 로 실제로 들어간 탭을 센다(키보드 Space = 탭)
const tapsBefore = (await tit()).totalTaps ?? 0;
let taps = 0;
for (let i = 0; i < 400 && taps < 25; i += 1) {
  await page.keyboard.press("Space");
  await sleep(90);
  if (i % 5 === 4) taps = ((await tit()).totalTaps ?? 0) - tapsBefore;
}
await sleep(800);
const bolts = await page.evaluate(() => window.__bolts);
ok("전투 중 탭 25번 → 번개가 2번 떨어진다(10번째마다)", bolts >= 2, `탭 ${taps} · 번개 ${bolts}`);

// ── 8. 이벤트 코인 — 드롭 · 지갑 · 교환 ──
await seed(baseProgress({ eventCoins: 0, enhancementMaterials: 0 }), { gold: 1000, stage: 2, bestStage: 2, totalKills: 30, heroes: { mia: 30, leon: 30 }, lastActiveAt: now });
await closeModals(); await sleep(300);
await page.evaluate(() => { window.__coins = 0; new MutationObserver((ms) => { for (const m of ms) for (const n of m.addedNodes) if (n instanceof Element && n.matches(".titans-fx-coin")) window.__coins += 1; }).observe(document.querySelector(".titans-field"), { childList: true, subtree: true }); window.__rand = Math.random; Math.random = () => 0.01; });
for (let i = 0; i < 40 && (await page.evaluate(() => window.__coins)) === 0; i += 1) await sleep(250);
await page.evaluate(() => { Math.random = window.__rand; });
await sleep(800);
p = await prog();
ok("몬스터가 코인을 떨어뜨린다 → 튀어 오르는 코인 + 저장", (await page.evaluate(() => window.__coins)) >= 1 && p.eventCoins >= 1, `코인 연출 ${await page.evaluate(() => window.__coins)} · 저장 ${p.eventCoins}`);
// 교환 — 코인을 넉넉히 넣고 이벤트 탭
await seed(baseProgress({ eventCoins: 100, enhancementMaterials: 0 }), { gold: 1000, stage: 2, bestStage: 2, totalKills: 30, heroes: { mia: 30, leon: 30 }, lastActiveAt: now });
await closeModals(); await sleep(300);
await clickText(".titans-bottom-nav button", "상점"); await sleep(500);
await clickText(".hub-sheet-switch button", "이벤트"); await sleep(500);
const shop = await page.evaluate(() => ({ wallet: document.querySelector('[data-wallet="coin"]')?.textContent ?? "", cards: [...document.querySelectorAll(".event-offer-card.coin-offer")].map((c) => c.textContent) }));
ok("이벤트 탭: 지갑에 코인 100 · 코인 교환 카드 3장", /100/.test(shop.wallet) && shop.cards.length === 3, `${shop.wallet} · ${shop.cards.length}장`);
await page.evaluate(() => [...document.querySelectorAll(".event-offer-card.coin-offer")].find((c) => c.textContent.includes("강화석"))?.querySelector("button")?.click()); await sleep(700);
p = await prog();
ok("코인 20 → 강화석 25", p.eventCoins === 80 && p.enhancementMaterials === 25, `코인 ${p.eventCoins} · 강화석 ${p.enhancementMaterials}`);

// ── 6. 뽑기 중복 → 다음 성급 조각 진행 ──
const allHeroes = Object.fromEntries(["mia", "leon", "sera", "garen", "ari", "nox", "pyro", "marina", "zephyr", "bronn", "iris", "cain", "sylph", "orion", "ember"].map((id) => [id, 10]));
await seed(baseProgress({ redGems: 2000, allyShards: {}, allyStars: {} }), { gold: 1000, stage: 2, bestStage: 2, totalKills: 30, heroes: allHeroes, lastActiveAt: now });
await closeModals(); await sleep(300);
await clickText(".titans-bottom-nav button", "동료"); await sleep(500);
await clickText(".hub-sheet-switch button", "동료 뽑기"); await sleep(500);
await page.evaluate(() => document.querySelector(".gacha-page-actions button:nth-child(2)")?.click());
await sleep(2400);
const dup = await page.evaluate(() => ({ cards: document.querySelectorAll(".gacha-card").length, dups: document.querySelectorAll(".gacha-card.dup").length, prog: [...document.querySelectorAll(".gacha-card .dup-progress")].map((e) => e.textContent), bars: [...document.querySelectorAll(".gacha-card .dup-bar > i")].map((e) => e.style.width) }));
ok("10연 중복 카드마다 '★2 a/b' 또는 '★2 승급!' + 막대", dup.dups > 0 && dup.prog.length === dup.dups && dup.prog.every((t) => /^\d+\/\d+$|★\d 승급|최대/.test(t)) && dup.bars.every((w) => /%$/.test(w)), `${dup.cards}장 · 중복 ${dup.dups} · ${dup.prog.slice(0, 3).join(" | ")}`);
// 카드를 누르면 설명 패널에 조각 진행 · 승급 배율 전후
await page.evaluate(() => document.querySelector(".gacha-card.dup")?.click()); await sleep(300);
const detail = await page.evaluate(() => document.querySelector(".gacha-detail")?.textContent ?? "");
ok("중복 카드 설명: '★2 조각 a/b · 피해 ×1 → ×1.6'", /★\d 조각 \d+\/\d+ · 피해 ×[\d.]+ → ×[\d.]+/.test(detail), detail.slice(-80));
await clickText(".gacha-close", "확인"); await sleep(300);

// ── 7. 환생 미리 보기 · 벽 지역 수 ──
await seed(baseProgress({ titanBestStage: 36, rebirthCount: 1, wallAreas: [], inheritanceCrystals: 10 }), { gold: 1000, stage: 2, bestStage: 36, totalKills: 300, heroes: { mia: 30, leon: 30 }, lastActiveAt: now });
await closeModals(); await sleep(300);
await page.evaluate(() => document.querySelector(".titans-back")?.click()); await sleep(1600);
const rb = await page.evaluate(() => ({ btn: document.querySelector(".rebirth-button")?.textContent ?? "", pre: document.querySelector(".rebirth-preview")?.textContent ?? "" }));
ok("환생 단추: 첫 환생 뒤엔 'DPS 벽 0/1 지역'(예전엔 /3 고정)", /DPS 벽 0\/1 지역/.test(rb.btn), rb.btn);
ok("환생 미리 보기: 결정 +18 · 방치 배율 전후 · 출발 골드", /결정 \+18/.test(rb.pre) && /→/.test(rb.pre) && /출발 골드/.test(rb.pre), rb.pre);

ok("페이지 오류 없음", errors.length === 0, errors.slice(0, 2).join(" / "));
console.log(fails ? `${fails} FAIL` : "ALL PASS");
await browser.close(); process.exit(fails ? 1 : 0);
