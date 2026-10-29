// 상점 스킬 뽑기 · 스킬 카드 소진 — 실제 화면 검사 (2026-10-28, 사용자: "스킬도 상점에서 돈으로 배울수 있게 동료, 유물처럼 이펙트 내용 모두 추가해주고
// 동일한 유물이나 스킬이 있으면 소진하면서 레벨 높일수 있게").  node scripts/verify-skill-shop.mjs   (vite 5173) · 캡처 art-gen/out/skill-shop*.png
import { launchBrowser } from "./launch-browser.mjs";
const BASE = "http://localhost:5173", H = "mock-local-dev", now = Date.now();
const browser = await launchBrowser({ args: ["--no-sandbox"] }); const page = await browser.newPage(); const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = []; page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
await page.goto(BASE, { waitUntil: "networkidle0" });
let fails = 0; const ok = (n, c, d = "") => { console.log(`${c ? "PASS" : "FAIL"} ${n}${d ? " — " + d : ""}`); if (!c) fails += 1; };
const tit = () => page.evaluate((H) => JSON.parse(localStorage.getItem(`dodgebullets:titans:${H}`) ?? "{}"), H);
const prog = () => page.evaluate((H) => JSON.parse(localStorage.getItem(`dodgebullets:progression:v1:${H}`) ?? "{}"), H);
const progress = { version: 5, level: 30, redGems: 2000, idleClaimedAt: now, updatedAt: now, onboardingStep: 4, sessionCount: 9, partyIds: ["mia", "leon"], partyCap: 4, claimedRewards: ["dodge-tutorial"], pioneeredArea: 3, discoverySeeded: true, discovered: ["monster:slime", "ally:mia", "ally:leon"] };
const titans = { gold: 5e7, stage: 12, bestStage: 12, totalKills: 300, heroes: { mia: 10, leon: 10 }, lastActiveAt: now,
  skillInventory: { learned: ["strike"], levels: { strike: 1 }, equipped: { starter: "strike" }, skillCores: 0, copies: { strike: 3 } } };
await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); }, { [`dodgebullets:progression:v1:${H}`]: JSON.stringify(progress), [`dodgebullets:titans:${H}`]: JSON.stringify(titans), [`dodgebullets:attendance:v1:${H}`]: JSON.stringify({ lastClaimDate: new Date().toLocaleDateString("sv-SE"), totalDays: 3, consecutiveDays: 3 }), "dodgebullets:test-phase": "0" });
await page.reload({ waitUntil: "networkidle0" }); await sleep(1200);
await page.evaluate(() => { for (let k = 0; k < 5; k += 1) { const c = document.querySelector(".idle-claim"); if (c) { c.click(); continue; } const b = [...document.querySelectorAll("button")].filter((x) => !x.closest(".titans-bottom-nav")).find((x) => /^(닫기|확인|나중에)$/.test(x.textContent.trim())); if (b) b.click(); } });
await sleep(400);
const sumCopies = (t) => Object.values(t.skillInventory?.copies ?? {}).reduce((a, v) => a + v, 0);

// ── 1. 상점 '스킬' 칸 — 패키지 줄 칸(골드 · 보석 머리줄 + 1회 · 10회) ──
await page.evaluate(() => [...document.querySelectorAll(".titans-bottom-nav button")].find((b) => b.textContent.includes("상점"))?.click()); await sleep(500);
await page.evaluate(() => [...document.querySelectorAll(".premium-category-tabs button")].find((b) => b.textContent.trim() === "스킬")?.click());
await page.waitForSelector(".skill-shop-list", { timeout: 4000 }).catch(() => null);
const shop = await page.evaluate(() => ({ heads: [...document.querySelectorAll(".skill-banner-head")].map((h) => h.dataset.banner + ":" + h.textContent), cards: [...document.querySelectorAll(".skill-draw-product")].map((c) => c.dataset.banner + c.dataset.count + ":" + c.textContent), icons: document.querySelectorAll(".skill-draw-product .skill-icon").length }));
ok("상점 '스킬' 칸: 골드(일반 ~ 영웅) · 보석(영웅 ~ 초월) 머리줄 · 재화마다 1회 · 10회 칸 · 칸 그림 = 스킬 아이콘 · 보석 80",
  shop.heads.length === 2 && /^gold:골드 스킬 ?일반 ~ 영웅/.test(shop.heads[0]) && /^gem:보석 스킬 ?영웅 ~ 초월/.test(shop.heads[1]) && shop.cards.length === 4 && shop.icons === 4 && /80/.test(shop.cards[2]) && /10회 뽑기/.test(shop.cards[1]),
  shop.heads.map((h) => h.slice(0, 26)).join(" | "));

// ── 2. 골드 10회 — 소환진 → 공개(카드 10장) · 골드가 줄고 카드 10장 ──
const t0 = await tit();
await page.evaluate(() => document.querySelector('.skill-draw-product[data-banner="gold"][data-count="10"] button')?.click());
const summon = await page.waitForSelector(".skill-summoning", { timeout: 2000 }).then(() => true).catch(() => false);
await page.waitForSelector(".skill-draw-reveal", { timeout: 4000 }).catch(() => null);
const reveal = await page.evaluate(() => ({ title: document.querySelector(".skill-draw-reveal .relic-draw-card > b")?.textContent ?? "", items: [...document.querySelectorAll(".skill-draw-item")].map((x) => x.dataset.skill + ":" + x.dataset.tier), fx: !!document.querySelector(".skill-draw-reveal .gacha-fx, .skill-draw-reveal [class*=fx]") }));
ok("골드 10회 → 소환진(.skill-summoning) → 공개 '스킬 카드 10장' · 일반 ~ 영웅만", summon && /스킬 카드 10장/.test(reveal.title) && reveal.items.length >= 1 && reveal.items.every((x) => /:(N|R|SR)$/.test(x)), JSON.stringify(reveal).slice(0, 200));
await page.screenshot({ path: "art-gen/out/skill-shop-reveal.png" });
await page.evaluate(() => document.querySelector(".skill-draw-reveal .cta")?.click()); await sleep(400);
let t1 = await tit(); for (let i = 0; i < 20 && sumCopies(t1) === sumCopies(t0); i += 1) { await sleep(150); t1 = await tit(); }
ok("골드가 줄고 스킬 카드 +10(사냥터 저장)", t1.gold < t0.gold && sumCopies(t1) - sumCopies(t0) === 10, `골드 ${t0.gold} → ${t1.gold} · 카드 ${sumCopies(t0)} → ${sumCopies(t1)}`);

// ── 3. 보석 1회 — 보석이 줄고(QA 빌드는 고정) 카드 +1 · 영웅 이상 ──
const p0 = await prog();
await page.evaluate(() => document.querySelector('.skill-draw-product[data-banner="gem"][data-count="1"] button')?.click());
await page.waitForSelector(".skill-draw-reveal", { timeout: 4000 }).catch(() => null);
const gemItems = await page.evaluate(() => [...document.querySelectorAll(".skill-draw-item")].map((x) => x.dataset.tier));
await page.evaluate(() => document.querySelector(".skill-draw-reveal .cta")?.click()); await sleep(400);
let t2 = await tit(); for (let i = 0; i < 20 && sumCopies(t2) === sumCopies(t1); i += 1) { await sleep(150); t2 = await tit(); }
const p1 = await prog();
ok("보석 1회 → 보석 −80(QA 빌드는 999,999 고정) · 카드 +1 · 영웅 이상", (p0.redGems - p1.redGems === 80 || p1.redGems >= 999000) && sumCopies(t2) - sumCopies(t1) === 1 && gemItems.length === 1 && /^(SR|SSR|UR|LR)$/.test(gemItems[0]), `보석 ${p0.redGems} → ${p1.redGems} · ${gemItems}`);

// ── 4. 확률 공시 — 보석 머리줄 '확률 정보' → 등급 4묶음 · 스킬별 % ──
await page.evaluate(() => document.querySelector('.skill-banner-head[data-banner="gem"] .relic-gacha-rates')?.click()); await sleep(300);
const rates = await page.evaluate(() => [...document.querySelectorAll(".skill-shop-list .relic-rates-group")].map((g) => g.querySelectorAll("li").length));
ok("확률 정보: 보석 4등급 묶음 · 스킬마다 한 줄", rates.length === 4 && rates.every((n) => n >= 1), JSON.stringify(rates));
const lay = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, small: [...document.querySelectorAll(".skill-shop-list *")].filter((e) => e.childElementCount === 0 && e.textContent.trim() && parseFloat(getComputedStyle(e).fontSize) < 13).map((e) => e.textContent.slice(0, 16)) }));
ok("스킬 상점 390px 넘침 없음 · 13px 미만 없음", lay.sw <= 390 && lay.small.length === 0, JSON.stringify(lay));
await page.evaluate(() => document.querySelector(".skill-shop-list")?.scrollIntoView({ block: "start" })); await sleep(300);
await page.screenshot({ path: "art-gen/out/skill-shop.png" });

// ── 5. 스킬 탭 — 배운 스킬(도토리 일격 Lv.1 · 카드 3+) 소진 → Lv 오름 · 안 배운 스킬은 '카드로 학습' ──
await page.evaluate(() => [...document.querySelectorAll(".titans-bottom-nav button")].find((b) => b.textContent.includes("사냥터"))?.click()); await sleep(500);
await page.evaluate(() => [...document.querySelectorAll(".titans-tabs button")].find((b) => b.textContent.includes("스킬"))?.click()); await sleep(600);
const tA = await tit();
const strikeCards = tA.skillInventory.copies?.strike ?? 0;
await page.evaluate(() => document.querySelector('.skill-card-consume[data-skill="strike"]')?.click());
let tB = await tA; for (let i = 0; i < 20 && (tB.skillInventory.levels.strike ?? 1) === 1; i += 1) { await sleep(150); tB = await tit(); }
ok("배운 스킬 카드 소진 → 도토리 일격 Lv.1 → 1 + 카드 수 · 카드 0", tB.skillInventory.levels.strike === 1 + strikeCards && !(tB.skillInventory.copies?.strike), `카드 ${strikeCards} · Lv.${tB.skillInventory.levels.strike}`);
const learnTarget = await page.evaluate(() => { const b = [...document.querySelectorAll(".skill-card-consume")].find((x) => /카드로 학습/.test(x.textContent) && !x.disabled); return b?.dataset.skill ?? null; });
if (learnTarget) {
  await page.evaluate((id) => document.querySelector(`.skill-card-consume[data-skill="${id}"]`)?.click(), learnTarget);
  let tC = tB; for (let i = 0; i < 20 && !tC.skillInventory.learned.includes(learnTarget); i += 1) { await sleep(150); tC = await tit(); }
  ok("안 배운 스킬 '카드로 학습' → 배움(Lv.1) · 카드 1장 줄어듦 · SP · 코어는 그대로", tC.skillInventory.learned.includes(learnTarget) && tC.skillInventory.levels[learnTarget] === 1 && (tC.skillInventory.copies?.[learnTarget] ?? 0) === (tB.skillInventory.copies?.[learnTarget] ?? 0) - 1 && tC.skillInventory.skillCores === tB.skillInventory.skillCores, `${learnTarget}`);
} else ok("안 배운 스킬 '카드로 학습' 단추가 있다(카드 11장 중 새 스킬)", false, "단추 없음");
const fx = await page.evaluate(() => !!document.querySelector(".skill-cutin, .skill-tier-fx, .equip-pop"));
ok("카드를 쓰면 장착 연출(컷인 · 등급 빛)이 한 번 나온다", fx);
await page.evaluate(() => document.querySelector(".skill-card-consume, .skill-card-count")?.scrollIntoView({ block: "center" })); await sleep(300);
await page.screenshot({ path: "art-gen/out/skill-shop-cards.png" });
ok("페이지 오류 없음", errors.length === 0, errors.join(" | "));
await browser.close();
console.log(fails ? `\n${fails} FAIL` : "\nALL PASS");
process.exit(fails ? 1 : 0);
