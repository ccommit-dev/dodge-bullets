/**
 * 무기 세트 파츠 (2026-11-04, 사용자: "나머지 부위 파츠 · 무기 속성에 맞는 파츠 모두 생성 · 상점에서 팔게 · 장비 성장 인벤토리에서 탈부착")
 *   node scripts/verify-gear-sets.mjs [캡처 폴더]   (vite dev 서버 5173 필요)
 * 그림 20장 · 효과(같은 무기만) · 상점 구매(낱개 · 세트 할인 · 보석 부족) · 끌어다 끼기 · 다시 눌러 해제 · 다시 들어와도 남는다 · 옛 저장.
 */
import { existsSync } from "node:fs";
import { launchBrowser } from "./launch-browser.mjs";
const OUT = process.argv[2], BASE = "http://localhost:5173", H = "mock-local-dev", now = Date.now();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = []; const ok = (n, c, d = "") => results.push([c ? "PASS" : "FAIL", n, d]);
const KINDS = ["sword", "spear", "bow", "staff"], SLOTS = ["helmet", "armor", "gloves", "boots", "shoulder"];
ok("그림 20장이 있다", KINDS.every((k) => SLOTS.every((s) => existsSync(`public/titans/gear/set-${k}-${s}.png`))));
const browser = await launchBrowser({ args: ["--no-sandbox", "--disable-gpu"] });
const page = await browser.newPage();
const errors = []; page.on("pageerror", (e) => errors.push(String(e.message).slice(0, 200)));
const missing = []; page.on("response", (r) => { if (r.status() === 404 && /gear/.test(r.url())) missing.push(r.url().slice(-40)); });
const seed = async (extra = {}, w = 390, h = 844) => {
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.goto(BASE, { waitUntil: "networkidle0" });
  const progress = { version: 5, onboardingStep: 4, level: 40, redGems: 2000, sharedCoins: 500000, enhancementMaterials: 2000, titanBestStage: 40, pioneeredArea: 5, idleClaimedAt: now, updatedAt: now, partyIds: ["mia"], partyCap: 4, sessionCount: 9, claimedRewards: ["dodge-tutorial", "welcome-gift"], equippedWeaponKind: "sword", ownedShoulders: ["scout"], equippedShoulder: "scout", ...extra };
  const titans = { stage: 12, bestStage: 40, gold: 2000000, heroes: { mia: 26 }, lastActiveAt: now };
  await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); location.reload(); }, {
    [`dodgebullets:progression:v1:${H}`]: JSON.stringify(progress), [`dodgebullets:titans:${H}`]: JSON.stringify(titans), "dodge-bullets:soundEnabled": "0", "dodgebullets:qa-gems": "0", "dodgebullets:test-phase": "0",
    [`dodgebullets:attendance:v1:${H}`]: JSON.stringify({ lastClaimDate: new Date().toLocaleDateString("sv-SE"), totalDays: 3, consecutiveDays: 3 }),
  }).catch(() => {});
  await page.waitForNavigation({ waitUntil: "networkidle0" }).catch(() => {});
  await sleep(1800);
  for (let k = 0; k < 3; k += 1) { await page.evaluate(() => { document.querySelector(".idle-claim")?.click(); }); await sleep(200); }
};
const clickText = (sel, t) => page.evaluate(({ sel, t }) => { const b = [...document.querySelectorAll(sel)].find((x) => x.textContent.trim().includes(t)); b?.click(); return !!b; }, { sel, t });
const saved = async () => JSON.parse(await page.evaluate((h) => localStorage.getItem(`dodgebullets:progression:v1:${h}`), H));
const openShop = async () => { await clickText(".titans-bottom-nav button", "상점"); await sleep(500); await clickText(".hub-sheet-switch button", "꾸미기"); await sleep(300); await clickText(".premium-category-tabs button", "장비"); await sleep(500); };
const openEquip = async () => { await page.evaluate(() => [...document.querySelectorAll(".titans-growth-tabs button")].find((b) => b.textContent.includes("장비 성장"))?.click()); await sleep(500); await page.evaluate(() => document.querySelector(".equip-window")?.scrollIntoView({ block: "start" })); await sleep(300); };
const center = (sel) => page.evaluate((sel) => { const e = document.querySelector(sel); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, sel);
const dragTo = async (fromSel, toSel) => { const a = await center(fromSel), to = await center(toSel); await page.touchscreen.touchStart(a.x, a.y); await sleep(40); for (let i = 1; i <= 8; i += 1) { await page.touchscreen.touchMove(a.x + ((to.x - a.x) * i) / 8, a.y + ((to.y - a.y) * i) / 8); await sleep(25); } await page.touchscreen.touchEnd(); await sleep(350); };

// ── 효과 계산 ──
await seed();
const fx = await page.evaluate(async () => {
  const m = await import("/src/equipment/gearSets.ts");
  const full = Object.fromEntries(m.GEAR_SET_SLOTS.map((s) => [s, `sword-${s}`]));
  return { one: m.gearSetEffects({ helmet: "sword-helmet" }, "sword").tapMul, other: m.gearSetEffects({ helmet: "sword-helmet" }, "bow"), full: m.gearSetEffects(full, "sword").tapMul, spear: m.gearSetEffects({ armor: "spear-armor" }, "spear").bossMul, sum: m.gearSetSummary(full, "sword"), ids: m.GEAR_ITEM_IDS.length, badSlot: m.normalizeEquippedGear({ helmet: "sword-armor", boots: "bow-boots" }, ["sword-armor"]), notOwned: m.normalizeEquippedGear({ boots: "bow-boots" }, []) };
});
ok("같은 무기만 효과 · 다섯 부위 보너스 · 아이템 20개", Math.abs(fx.one - 1.025) < 1e-9 && fx.other.tapMul === 1 && fx.other.autoSpeedMul === 1 && Math.abs(fx.full - 1.175) < 1e-9 && Math.abs(fx.spear - 1.04) < 1e-9 && fx.ids === 20, JSON.stringify(fx).slice(0, 220));
ok("저장 정규화: 다른 부위 · 안 가진 것은 못 낀다", Object.keys(fx.badSlot).length === 0 && Object.keys(fx.notOwned).length === 0);

// ── 상점 ──
await openShop();
const shop = await page.evaluate(() => ({ sets: [...document.querySelectorAll(".gear-set-card")].map((c) => c.dataset.gearSet), pieces: document.querySelectorAll(".gear-piece").length, buy: document.querySelector(".gear-set-buy")?.textContent, loaded: [...document.querySelectorAll(".gear-piece img")].filter((i) => !i.src.includes("gem")).every((i) => i.complete && i.naturalWidth > 0), over: document.documentElement.scrollWidth - innerWidth, tabs: [...document.querySelectorAll(".premium-category-tabs button")].map((b) => b.textContent.trim()).join(), clipped: [...document.querySelectorAll(".gear-piece span, .gear-piece small")].filter((e) => e.scrollWidth > e.parentElement.clientWidth + 1).length, tabRows: new Set([...document.querySelectorAll(".premium-category-tabs button")].map((b) => Math.round(b.getBoundingClientRect().top))).size }));
ok("상점 꾸미기 → 장비: 세트 4 · 부위 20 · 그림 로드 · 넘침 없음", shop.sets.join() === KINDS.join() && shop.pieces === 20 && shop.loaded && shop.over <= 0 && shop.clipped === 0 && shop.tabRows === 1, JSON.stringify(shop));
if (OUT) await page.screenshot({ path: `${OUT}/gear-shop.png` });
await page.evaluate(() => document.querySelector('.gear-piece[data-gear-item="sword-helmet"]').click()); await sleep(500);
let p = await saved();
ok("낱개 구매: 보석 -300 · 보유 · 빈 칸이면 바로 낀다", p.redGems === 1700 && p.ownedGear.includes("sword-helmet") && p.equippedGear.helmet === "sword-helmet", JSON.stringify({ g: p.redGems, o: p.ownedGear, e: p.equippedGear }));
ok("산 부위는 다시 못 산다", await page.evaluate(() => document.querySelector('.gear-piece[data-gear-item="sword-helmet"]').disabled));
await page.evaluate(() => document.querySelector('.gear-set-card[data-gear-set="sword"] .gear-set-buy').click()); await sleep(500);
p = await saved();
ok("남은 4개 구매 = 1200(낱개 값)", p.redGems === 500 && p.ownedGear.length === 5, JSON.stringify({ g: p.redGems, n: p.ownedGear.length }));
ok("보석이 모자라면 못 산다(500 < 1200 세트)", await page.evaluate(() => document.querySelector('.gear-set-card[data-gear-set="spear"] .gear-set-buy').disabled));
await seed({ redGems: 1200 });
await openShop();
await page.evaluate(() => document.querySelector('.gear-set-card[data-gear-set="bow"] .gear-set-buy').click()); await sleep(500);
p = await saved();
ok("세트 통째 = 1200 · 다섯 부위 다 낀다", p.redGems === 0 && p.ownedGear.filter((x) => x.startsWith("bow-")).length === 5 && Object.keys(p.equippedGear).length === 5, JSON.stringify({ g: p.redGems, e: p.equippedGear }));

// ── 장비창 탈부착 ──
await seed({ ownedGear: ["sword-helmet", "spear-helmet", "sword-boots"], equippedGear: {} });
await openEquip();
await page.evaluate(() => document.querySelector('.equip-slot[data-equip-slot="helmet"]').click()); await sleep(250);
const bag1 = await page.evaluate(() => ({ items: [...document.querySelectorAll(".equip-item")].map((e) => e.dataset.item), shop: !!document.querySelector(".equip-shop-link"), info: document.querySelector(".equip-info b")?.textContent }));
ok("투구 칸을 누르면 투구만 보이고 상점 칸이 있다", bag1.items.join() === "sword-helmet,spear-helmet" && bag1.shop && /기사 세트 0\/5/.test(bag1.info ?? ""), JSON.stringify(bag1));
await dragTo('.equip-item[data-item="sword-helmet"]', '.equip-slot[data-equip-slot="helmet"]');
p = await saved();
const slotA = await page.evaluate(() => ({ src: document.querySelector('.equip-slot[data-equip-slot="helmet"] img')?.src?.slice(-24), active: document.querySelector('.equip-slot[data-equip-slot="helmet"]').classList.contains("set-active"), info: document.querySelector(".equip-info b")?.textContent, e: [...document.querySelectorAll(".equip-item.on")].map((x) => x.dataset.item).join() }));
ok("끌어다 끼면 칸 그림이 바뀌고 ✓ · 세트 1/5", p.equippedGear.helmet === "sword-helmet" && /set-sword-helmet/.test(slotA.src ?? "") && slotA.active && /1\/5 · 탭 피해 \+2\.5%/.test(slotA.info ?? "") && slotA.e === "sword-helmet", JSON.stringify(slotA));
if (OUT) await page.screenshot({ path: `${OUT}/gear-equip.png` });
await dragTo('.equip-item[data-item="spear-helmet"]', '.equip-slot[data-equip-slot="boots"]');
ok("다른 부위 칸에는 안 낀다", (await saved()).equippedGear.helmet === "sword-helmet" && !(await saved()).equippedGear.boots);
await dragTo('.equip-item[data-item="spear-helmet"]', '.equip-slot[data-equip-slot="helmet"]');
ok("같은 칸에 놓으면 갈아 낀다", (await saved()).equippedGear.helmet === "spear-helmet");
const ac = await page.evaluate(() => document.querySelector('.equip-slot[data-equip-slot="helmet"]').classList.contains("set-active"));
ok("다른 무기 세트면 ✓ 없음(검을 든 채 창 투구)", ac === false);
const it = await center('.equip-item[data-item="spear-helmet"]');
await page.touchscreen.tap(it.x, it.y); await sleep(350);
ok("낀 것을 다시 누르면 벗는다", !(await saved()).equippedGear.helmet, JSON.stringify((await saved()).equippedGear));
await page.touchscreen.tap(it.x, it.y); await sleep(350);
await page.reload({ waitUntil: "networkidle0" }); await sleep(1800);
ok("다시 들어와도 남는다", (await saved()).equippedGear.helmet === "spear-helmet");

// ── 효과가 사냥에 실제로 들어간다 (창 투구 + 창) ──
const shopLink = await page.evaluate(() => { document.querySelector(".idle-claim")?.click(); return true; }); void shopLink;
await sleep(300);
await openEquip();
await page.evaluate(() => document.querySelector('.equip-slot[data-equip-slot="boots"]').click()); await sleep(200);
await page.evaluate(() => document.querySelector(".equip-shop-link")?.click()); await sleep(700);
const toShop = await page.evaluate(() => ({ cards: document.querySelectorAll(".gear-set-card").length }));
ok("가방의 상점 칸 → 상점 장비", toShop.cards === 4, JSON.stringify(toShop));

// ── 옛 저장 ──
await seed({});
const old = await saved();
ok("옛 저장은 빈 장비로 시작", Array.isArray(old.ownedGear) ? old.ownedGear.length === 0 : old.ownedGear === undefined);
for (const [w, h] of [[360, 640], [375, 553]]) {
  await seed({ redGems: 5000 }, w, h);
  await openShop();
  const m = await page.evaluate(() => ({ over: document.documentElement.scrollWidth - innerWidth, clipped: [...document.querySelectorAll(".gear-piece")].filter((e) => e.scrollWidth > e.clientWidth + 1).length, tabRows: new Set([...document.querySelectorAll(".premium-category-tabs button")].map((b) => Math.round(b.getBoundingClientRect().top))).size }));
  ok(`[${w}×${h}] 상점 넘침 · 잘림 없음 · 탭 한 줄`, m.over <= 0 && m.clipped === 0 && m.tabRows === 1, JSON.stringify(m));
}
ok("그림 404 · 페이지 오류 없음", missing.length === 0 && errors.length === 0, [...missing, ...errors].slice(0, 3).join(" | "));
await browser.close();
for (const [s, n, d] of results) console.log(`${s} ${n}${d ? ` — ${d}` : ""}`);
const fail = results.filter((r) => r[0] === "FAIL").length;
console.log(fail ? `${fail} FAIL` : "ALL PASS");
process.exit(fail ? 1 : 0);
