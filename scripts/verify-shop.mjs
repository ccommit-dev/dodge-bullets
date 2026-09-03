/**
 * 이벤트·특별 상점 실상품 · 뽑기 페이지 실정보 · 결제 미연동 안내 e2e.
 *   node scripts/verify-shop.mjs   (vite dev 서버 5173 필요)
 */
import puppeteer from "puppeteer";
const BASE = "http://localhost:5173";
const H = "mock-local-dev";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const ok = (name, cond, detail = "") => results.push([cond ? "PASS" : "FAIL", name, detail]);

const browser = await puppeteer.launch({ headless: "shell", args: ["--no-sandbox", "--disable-gpu"] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e.message).slice(0, 120)));
const now = Date.now();
const closeModal = async () => { await page.evaluate(() => { for (let k = 0; k < 3; k += 1) { const c = document.querySelector(".idle-claim"); if (c) { c.click(); continue; } const b = [...document.querySelectorAll("button")].filter((x) => !x.closest(".battle-alert-stack, .titans-bottom-nav, .hub-sheet, .nav-popup-grid")).find((x) => /출석|수령|확인|닫기/.test(x.textContent)); if (!b) break; b.click(); } }); await sleep(900); };
const clickText = (sel, text) => page.evaluate(({ sel, text }) => { const el = [...document.querySelectorAll(sel)].find((b) => b.textContent.trim().includes(text)); el?.click(); return !!el; }, { sel, text });
const prog = () => page.evaluate((h) => JSON.parse(localStorage.getItem(`dodgebullets:progression:v1:${h}`)), H);
const titans = () => page.evaluate((h) => JSON.parse(localStorage.getItem(`dodgebullets:titans:${h}`)), H);

await page.goto(BASE, { waitUntil: "networkidle0" });
await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); }, {
  [`dodgebullets:progression:v1:${H}`]: JSON.stringify({ version: 5, onboardingStep: 4, level: 30, exp: 90000, attendanceStreak: 5, redGems: 1000, sharedCoins: 100000, enhancementMaterials: 10, pioneeredArea: 3, titanBestStage: 12, dodgeBestStage: 3, idleClaimedAt: now, updatedAt: now, partyIds: ["mia", "leon"], partyCap: 4, sessionCount: 9, gachaPity: 24 }),
  [`dodgebullets:titans:${H}`]: JSON.stringify({ stage: 12, bestStage: 12, gold: 50000, heroes: { mia: 12, leon: 8 }, skillInventory: { learned: ["strike"], levels: { strike: 1 }, equipped: { starter: "strike" }, skillCores: 2 }, lastActiveAt: now }),
  "dodge-bullets:soundEnabled": "0",
});
await page.goto(BASE, { waitUntil: "networkidle0" });
await sleep(2400);
await closeModal();

// ── 뽑기 페이지 실정보 ──
await clickText(".titans-bottom-nav button", "동료");
await sleep(600);
await clickText(".hub-sheet-switch button", "동료 뽑기");
await sleep(600);
let r = await page.evaluate(() => ({ badge: document.querySelector(".gacha-rarity-badge")?.textContent, title: document.querySelector(".gacha-stage-hero h2")?.textContent, kicker: document.querySelector(".gacha-stage-hero small")?.textContent, level: document.querySelector(".gacha-level b")?.textContent, bar: document.querySelector(".gacha-level em")?.style.width }));
ok("뽑기 배지 = 픽업 최고 등급 (테라 SR)", /SR 픽업/.test(r.badge ?? ""), r.badge);
ok("뽑기 제목 = 픽업 동료 이름 · 지역 키커", /테라/.test(r.title ?? "") && /PICK UP/.test(r.kicker ?? ""), `${r.kicker} / ${r.title}`);
ok("천장 게이지 = gachaPity/60 (24 → 40%)", /24\/60/.test(r.level ?? "") && r.bar === "40%", `${r.level} ${r.bar}`);

// ── 이벤트 상점: 실상품 · 구매 · 주간 한도 ──
await clickText(".titans-bottom-nav button", "상점");
await sleep(600);
await clickText(".hub-sheet-switch button", "이벤트");
await sleep(500);
r = await page.evaluate(() => ({ cards: [...document.querySelectorAll(".event-offer-card")].map((c) => ({ name: c.querySelector("h2")?.textContent, price: c.querySelector("button")?.textContent, left: c.querySelector("small")?.textContent, summary: c.querySelector("p")?.textContent })) }));
ok("이벤트 상점 3종 · 보석 가격 · 주간 한도 표기", r.cards.length === 3 && r.cards.every((c) => /💎 \d+/.test(c.price ?? "") && /남음/.test(c.left ?? "")), JSON.stringify(r.cards.map((c) => c.price + "|" + c.left)));
ok("수량이 진행도 비례 문구(골드 K/M)", r.cards.some((c) => /골드 [\d.]+[KM]/.test(c.summary ?? "")), r.cards[0]?.summary);
const before = await prog();
const beforeT = await titans();
// 보스 토벌 보급품(💎90, 주 3회): 방지권 2 → forgeTicketsPending, 강화석 30, 골드
await page.evaluate(() => { [...document.querySelectorAll(".event-offer-card")].find((c) => /보스 토벌 보급품/.test(c.textContent))?.querySelector("button")?.click(); });
await sleep(700);
let p = await prog();
ok("보급품 구매: 보석 −90 · 강화석 +30 · 방지권 적립 2 · 골드 증가", before.redGems - p.redGems === 90 && p.enhancementMaterials - before.enhancementMaterials === 30 && p.forgeTicketsPending === 2 && p.sharedCoins > before.sharedCoins, `${before.redGems}→${p.redGems} mats ${p.enhancementMaterials} tickets ${p.forgeTicketsPending}`);
r = await page.evaluate(() => [...document.querySelectorAll(".event-offer-card")].find((c) => /보스 토벌 보급품/.test(c.textContent))?.querySelector("small")?.textContent);
ok("구매 후 주간 잔여 2/3", /2\/3/.test(r ?? ""), r);
// 비트 수련 지원팩(💎120): 견갑 조각 40 · 코어 4(사냥터 저장) · 보석 20 환급 → 순 −100
await page.evaluate(() => { [...document.querySelectorAll(".event-offer-card")].find((c) => /비트 수련 지원팩/.test(c.textContent))?.querySelector("button")?.click(); });
await sleep(700);
const p2 = await prog();
const t2 = await titans();
ok("지원팩 구매: 보석 순 −100 · 견갑 조각 +40 · 스킬 코어 +4", p.redGems - p2.redGems === 100 && p2.shoulderShards - p.shoulderShards === 40 && t2.skillInventory.skillCores - beforeT.skillInventory.skillCores === 4, `${p.redGems}→${p2.redGems} shards ${p2.shoulderShards} cores ${t2.skillInventory.skillCores}`);
// 특별 상점: 5일 출석 패키지 주 1회 → 두 번째는 한도 소진
await clickText(".hub-sheet-switch button", "특별");
await sleep(500);
await page.evaluate(() => { [...document.querySelectorAll(".event-offer-card")].find((c) => /5일 출석/.test(c.textContent))?.querySelector("button")?.click(); });
await sleep(700);
const p3 = await prog();
r = await page.evaluate(() => [...document.querySelectorAll(".event-offer-card")].find((c) => /5일 출석/.test(c.textContent))?.querySelector("button")?.textContent);
ok("출석 패키지: 보석 순 +20(40 지불·60 환급) · 방치 가속 24h · 주 1회 한도 소진 표기", p3.redGems - p2.redGems === 20 && p3.idleBoostUntil > Date.now() + 23 * 3600 * 1000 && /한도 소진/.test(r ?? ""), `${p2.redGems}→${p3.redGems} ${r}`);
// 조각 선택 상품: 대상 동료 선택 후 구매 → 해당 동료 조각
await page.evaluate(() => { const s = document.querySelector(".event-shard-target select"); if (s) { s.value = "leon"; s.dispatchEvent(new Event("change", { bubbles: true })); } });
await sleep(200);
await page.evaluate(() => { [...document.querySelectorAll(".event-offer-card")].find((c) => /그림자 원정대 러시/.test(c.textContent))?.querySelector("button")?.click(); });
await sleep(700);
const p4 = await prog();
ok("러시 구매: 선택한 동료(레온) 조각 +30", (p4.allyShards.leon ?? 0) - (p3.allyShards.leon ?? 0) === 30, `leon ${p3.allyShards.leon ?? 0}→${p4.allyShards.leon ?? 0}`);

// ── 대장간 진입 시 방지권 이관 ──
await clickText(".hub-sheet-close", "×");
await sleep(300);
await clickText(".titans-bottom-nav button", "콘텐츠");
await sleep(400);
await clickText(".nav-popup-grid button", "대장간");
await sleep(1800);
const p5 = await prog();
const forge = await page.evaluate((h) => JSON.parse(localStorage.getItem(`dodgebullets:forge:v4:${h}`) ?? localStorage.getItem(`dodgebullets:forge:${h}`) ?? "null"), H);
ok("대장간 진입 → 적립 방지권 2장 이관 (pending 0)", p5.forgeTicketsPending === 0 && (forge === null || forge.tickets >= 2), `pending=${p5.forgeTicketsPending} tickets=${forge?.tickets}`);

// ── 결제 미연동 안내 ──
await page.goto(BASE, { waitUntil: "networkidle0" });
await sleep(2200);
await closeModal();
await clickText(".titans-bottom-nav button", "상점");
await sleep(600);
await clickText(".premium-category-tabs button", "패키지");
await sleep(400);
await page.evaluate(() => { [...document.querySelectorAll(".premium-product-card")].find((c) => /캐릭터:/.test(c.textContent))?.querySelector("button")?.click(); });
await sleep(400);
r = await page.evaluate(() => document.querySelector(".titans-toast")?.textContent ?? "");
ok("결제 미연동: 캐릭터 상품 탭 → 안내 토스트 (지급 없음)", /결제 연동 전/.test(r), r);

// ── H. 트리거 패키지 노출 · 첫 구매 2배 배지 ──
await page.evaluate((h) => { const k = `dodgebullets:progression:v1:${h}`; const q = JSON.parse(localStorage.getItem(k)); q.rebirthCount = 1; q.wallAreas = ["forest"]; q.attendanceStreak = 5; localStorage.setItem(k, JSON.stringify(q)); }, H);
await page.goto(BASE, { waitUntil: "networkidle0" });
await sleep(2200);
await closeModal();
await clickText(".titans-bottom-nav button", "상점");
await sleep(600);
await clickText(".premium-category-tabs button", "패키지");
await sleep(400);
r = await page.evaluate(() => ({ names: [...document.querySelectorAll(".premium-product-card strong")].map((s) => s.textContent), badges: document.querySelectorAll(".first-double-badge").length }));
ok("H 트리거 패키지(벽 돌파·환생) 노출 · 개척(지역3)도 노출", r.names.some((n) => /벽 돌파/.test(n)) && r.names.some((n) => /환생 세트/.test(n)) && r.names.some((n) => /개척 축하/.test(n)), r.names.filter((n) => /세트/.test(n)).join("|"));
ok("H 보석팩 3종에 첫 구매 2배 배지", r.badges === 3, String(r.badges));

// ── G. 시즌 패스: 모험 팝업 진입 · 수령 · 유료 트랙 구매(QA) ──
await page.evaluate((h) => { const k = `dodgebullets:progression:v1:${h}`; const q = JSON.parse(localStorage.getItem(k)); q.seasonPass = { season: 0, xp: 520, paid: false, claimedFree: [], claimedPaid: [] }; q.partyIds = ["mia", "leon"]; localStorage.setItem(k, JSON.stringify(q)); }, H);
await page.goto(BASE, { waitUntil: "networkidle0" });
await sleep(2200);
await closeModal();
await clickText(".titans-bottom-nav button", "모험");
await sleep(400);
await clickText(".nav-popup-grid button", "시즌 패스");
await sleep(800);
r = await page.evaluate(() => ({ head: document.querySelector(".season-head b")?.textContent, tiers: document.querySelectorAll(".season-tier").length, freeOpen: [...document.querySelectorAll(".season-cell.free:not(:disabled)")].length, buy: !!document.querySelector(".season-buy") }));
ok("G 시즌 탭: 5/30단 · 30단 목록 · 무료 수령 3칸 · 유료 구매 버튼", /5\/30/.test(r.head ?? "") && r.tiers === 30 && r.freeOpen === 3 && r.buy, JSON.stringify(r));
const gBefore = await prog();
await page.evaluate(() => [...document.querySelectorAll(".season-tier")][4]?.querySelector(".season-cell.free")?.click());
await sleep(600);
let gp = await prog();
ok("G 5단 무료 수령 → 보석 +25 · 수령 기록", gp.redGems - gBefore.redGems === 25 && gp.seasonPass.claimedFree.includes(5), `${gBefore.redGems}→${gp.redGems}`);
const coresBefore = (await titans()).skillInventory.skillCores;
await page.evaluate(() => document.querySelector(".season-buy")?.click());
await sleep(800);
gp = await prog();
r = await page.evaluate(() => ({ badge: !!document.querySelector(".season-paid-badge"), paidOpen: [...document.querySelectorAll(".season-cell.paid:not(:disabled)")].length }));
ok("G 유료 트랙 구매(QA 경로) → 활성 배지 · 유료 5칸 수령 가능", gp.seasonPass.paid && r.badge && r.paidOpen === 5, JSON.stringify(r));
await page.evaluate(() => [...document.querySelectorAll(".season-tier")][2]?.querySelector(".season-cell.paid")?.click());
await sleep(800);
const coresAfter = (await titans()).skillInventory.skillCores;
ok("G 유료 3단 수령 → 스킬 코어 +1 (사냥터 저장)", coresAfter - coresBefore === 1, `${coresBefore}→${coresAfter}`);
await page.evaluate(() => document.querySelector(".season-claim-all")?.click());
await sleep(1200);
gp = await prog();
ok("G 모두 받기 → 남은 수령 가능 0", gp.seasonPass.claimedFree.length === 3 && gp.seasonPass.claimedPaid.length === 5, `free=${gp.seasonPass.claimedFree.join()} paid=${gp.seasonPass.claimedPaid.join()}`);

// ── L. 보상형 광고 자리(QA 스텁): 정산 2배 · 가속 4h · 미연동 시 숨김 ──
await page.goto(BASE, { waitUntil: "networkidle0" });
await page.evaluate((h) => { localStorage.setItem("dodgebullets:qa-ads", "1"); const k = `dodgebullets:progression:v1:${h}`; const q = JSON.parse(localStorage.getItem(k)); q.idleClaimedAt = Date.now() - 3 * 3600000; q.adRewards = { date: "", idleDouble: 0, booster4h: 0, bossRetry: 0 }; localStorage.setItem(k, JSON.stringify(q)); const tk = `dodgebullets:titans:${h}`; const t = JSON.parse(localStorage.getItem(tk)); t.lastActiveAt = Date.now() - 3 * 3600000; localStorage.setItem(tk, JSON.stringify(t)); }, H);
await page.goto(BASE, { waitUntil: "networkidle0" });
await sleep(2400);
r = await page.evaluate(() => ({ modal: !!document.querySelector(".idle-modal"), adBtn: document.querySelector(".idle-claim-ad")?.textContent ?? "" }));
ok("L 정산 모달에 '광고 보고 2배' 버튼 (QA 스텁 연동)", r.modal && /광고 보고 2배/.test(r.adBtn), r.adBtn);
const lBefore = await prog();
const reportGold = await page.evaluate(() => { const b = document.querySelector(".idle-loot article b"); return b ? b.textContent : ""; });
await page.evaluate(() => document.querySelector(".idle-claim-ad")?.click());
await sleep(1500);
let lp = await prog();
ok("L 광고 2배 수령 → 카운터 1 · 골드 증가", lp.adRewards.idleDouble === 1 && lp.sharedCoins > lBefore.sharedCoins, `idleDouble=${lp.adRewards.idleDouble} coins ${lBefore.sharedCoins}→${lp.sharedCoins} (report ${reportGold})`);
await closeModal();
await clickText(".titans-bottom-nav button", "상점");
await sleep(600);
await clickText(".premium-category-tabs button", "재화");
await sleep(400);
r = await page.evaluate(() => ({ card: !!document.querySelector(".ad-product"), btn: document.querySelector(".ad-product button")?.textContent }));
ok("L 재화 탭에 광고 가속 4h 카드", r.card && /광고/.test(r.btn ?? ""), JSON.stringify(r));
const boostBefore = lp.idleBoostUntil;
await page.evaluate(() => document.querySelector(".ad-product button")?.click());
await sleep(1200);
lp = await prog();
r = await page.evaluate(() => !!document.querySelector(".ad-product"));
ok("L 가속 시청 → +4h · 오늘 한도 소진으로 카드 사라짐", lp.idleBoostUntil >= Math.max(boostBefore, Date.now() - 2000) + 4 * 3600000 - 5000 && lp.adRewards.booster4h === 1 && !r, `boost=${lp.idleBoostUntil - Date.now()}ms`);
// 미연동(스텁 off) → 자리 숨김
await page.evaluate(() => localStorage.removeItem("dodgebullets:qa-ads"));
await page.goto(BASE, { waitUntil: "networkidle0" });
await sleep(2200);
await closeModal();
await clickText(".titans-bottom-nav button", "상점");
await sleep(600);
await clickText(".premium-category-tabs button", "재화");
await sleep(400);
ok("L 미연동이면 광고 카드 자체가 없다", await page.evaluate(() => !document.querySelector(".ad-product")));

// ── I. 영웅 외형: 무기 이펙트 · 전장 테마 (외형 탭, 보석) · 마이페이지 칩 ──
await page.evaluate((h) => { const k = `dodgebullets:progression:v1:${h}`; const q = JSON.parse(localStorage.getItem(k)); q.redGems = 1000; q.ownedWeaponFx = []; q.equippedWeaponFx = ""; q.ownedThemes = []; q.equippedTheme = ""; localStorage.setItem(k, JSON.stringify(q)); }, H);
await page.goto(BASE, { waitUntil: "networkidle0" });
await sleep(1500);
await closeModal();
await clickText(".titans-bottom-nav button", "상점");
await sleep(600);
await clickText(".premium-category-tabs button", "외형");
await sleep(400);
r = await page.evaluate(() => ({ fx: document.querySelectorAll(".fx-product").length, theme: document.querySelectorAll(".theme-product").length, seasonHidden: ![...document.querySelectorAll(".fx-product")].some((c) => /시즌 잔영/.test(c.textContent)) }));
ok("I 외형 탭에 무기 이펙트 3장 · 테마 3장 · 시즌 이펙트는 미보유 시 숨김", r.fx === 3 && r.theme === 3 && r.seasonHidden, JSON.stringify(r));
await page.evaluate(() => document.querySelector(".fx-product button")?.click());
await sleep(700);
await page.evaluate(() => document.querySelector(".theme-product button")?.click());
await sleep(700);
let ip = await prog();
ok("I 진홍 잔영 300 + 오로라 밤 400 구매 → 즉시 장착 · 보석 1000→300", ip.equippedWeaponFx === "fx-crimson" && ip.equippedTheme === "theme-aurora" && ip.redGems === 300, `gems=${ip.redGems} fx=${ip.equippedWeaponFx} theme=${ip.equippedTheme}`);
r = await page.evaluate(() => { const f = document.querySelector(".titans-field"); const cs = getComputedStyle(f); return { fx: f?.dataset.weaponFx, theme: f?.dataset.theme, sky: cs.getPropertyValue("--area-sky").trim(), trail: cs.getPropertyValue("--fx-trail").trim(), particles: !!document.querySelector(".theme-particles.theme-aurora"), btn: document.querySelector(".fx-product button")?.textContent }; });
ok("I 전장에 data-weapon-fx/theme · 하늘색 테마 오버라이드 · 오로라 파티클 · 버튼 해제", r.fx === "fx-crimson" && r.theme === "theme-aurora" && r.sky === "#0f172a" && r.trail === "#f87171" && r.particles && r.btn === "해제", JSON.stringify(r));
await page.evaluate(() => document.querySelector(".theme-product button")?.click());
await sleep(600);
ip = await prog();
r = await page.evaluate(() => ({ theme: document.querySelector(".titans-field")?.dataset.theme ?? null, btn: document.querySelector(".theme-product button")?.textContent }));
ok("I 테마 해제 → data-theme 제거 · 보유 유지 · 버튼 장착", ip.equippedTheme === "" && ip.ownedThemes.includes("theme-aurora") && r.theme === null && r.btn === "장착", JSON.stringify(r));
await page.evaluate(() => document.querySelector(".theme-product button")?.click());
await sleep(500);
await clickText("button", "설정");
await sleep(400);
await clickText('[role="menuitem"]', "마이페이지");
await sleep(1200);
r = await page.evaluate(() => [...document.querySelectorAll(".cosmetic-chips span")].map((x) => x.textContent));
ok("I 마이페이지 칩: 진홍 잔영 · 오로라 밤", r.length === 2 && /진홍 잔영/.test(r[0]) && /오로라 밤/.test(r[1]), r.join(" | "));
r = await page.evaluate(() => [...document.querySelectorAll(".character-skin-grid button, .character-skins button, button")].filter((b) => /붉은 잔영|서리 무희/.test(b.textContent)).length);
ok("I 코스튬 2종이 플레이어블 캐릭터 목록에 노출", r >= 2, `count=${r}`);

ok("런타임 에러 0건", errors.length === 0, errors.join(" | "));
await browser.close();
for (const [s, n, d] of results) console.log(s, n, d ? "— " + d : "");
const fails = results.filter((x) => x[0] === "FAIL").length;
console.log(fails === 0 ? "\nALL PASS" : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
