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

ok("런타임 에러 0건", errors.length === 0, errors.join(" | "));
await browser.close();
for (const [s, n, d] of results) console.log(s, n, d ? "— " + d : "");
const fails = results.filter((x) => x[0] === "FAIL").length;
console.log(fails === 0 ? "\nALL PASS" : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
