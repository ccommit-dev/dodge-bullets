// 탈것 (2026-11-03, 사용자: "탈것도 아이템으로 · 상점에서 팔고 · 강화 가능하게") — 상점에서 산다 · 보석이 준다 · 자동 장착 · 강화석으로 강화 · 효과 값 · 새로 고침 유지 · 전장에 보인다 · 옛 저장은 탈것 없음.
//   node scripts/verify-mounts.mjs [캡처폴더]  (vite 5173)
import { launchBrowser } from "./launch-browser.mjs";
const BASE = "http://localhost:5173", H = "mock-local-dev", now = Date.now(), OUT = process.argv[2];
const browser = await launchBrowser({ args: ["--no-sandbox"] }); const page = await browser.newPage(); const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = []; page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.goto(BASE, { waitUntil: "networkidle0" });
let fails = 0; const ok = (n, c, d = "") => { console.log(`${c ? "PASS" : "FAIL"} ${n}${d ? " — " + d : ""}`); if (!c) fails += 1; };
const today = new Date().toLocaleDateString("sv-SE");
// 옛 저장 — mounts 칸이 없다
const progress = { /* 첫 발견 보석(+20)이 구매 단언에 끼지 않게 — 몬스터는 다 본 것으로 */ discoverySeeded: false, version: 5, level: 25, redGems: 700, enhancementMaterials: 50, attendanceStreak: 5, idleClaimedAt: now, updatedAt: now, onboardingStep: 4, sessionCount: 9, partyIds: ["mia", "leon"], partyCap: 4, claimedRewards: ["dodge-tutorial", "welcome-gift", "surprise-gift"], pioneeredArea: 3, discoverySeeded: true, discovered: ["monster:slime"], gachaPulls: 30 };
await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); }, {
  [`dodgebullets:progression:v1:${H}`]: JSON.stringify(progress),
  [`dodgebullets:titans:${H}`]: JSON.stringify({ gold: 5e6, stage: 3, bestStage: 3, heroes: { mia: 5, leon: 5 }, lastActiveAt: now }),
  [`dodgebullets:attendance:v1:${H}`]: JSON.stringify({ lastClaimDate: today, totalDays: 3, consecutiveDays: 3 }),
  "dodgebullets:test-phase": "0", "dodgebullets:qa-gems": "0",
});
const reload = () => Promise.all([page.waitForNavigation({ waitUntil: "networkidle0" }).catch(() => {}), page.evaluate(() => { setTimeout(() => location.reload(), 0); })]);
const settle = () => page.evaluate(() => { for (let k = 0; k < 5; k += 1) { const c = document.querySelector(".idle-claim"); if (c) { c.click(); continue; } const b = [...document.querySelectorAll("button")].filter((x) => !x.closest(".titans-bottom-nav")).find((x) => /^(닫기|확인|나중에)$/.test(x.textContent.trim())); if (b) b.click(); } });
await reload(); await sleep(1200); await settle(); await sleep(400);
const prog = () => page.evaluate((h) => JSON.parse(localStorage.getItem(`dodgebullets:progression:v1:${h}`)), H);
const clickText = (sel, text) => page.evaluate(({ sel, text }) => { const el = [...document.querySelectorAll(sel)].find((b) => b.textContent.trim().includes(text)); el?.click(); return !!el; }, { sel, text });
ok("처음엔 전장에 탈것이 없다", !(await page.$(".hero-mount")));
const openShop = async () => { await clickText(".titans-bottom-nav button", "상점"); await sleep(300); await clickText(".hub-sheet-switch button", "꾸미기"); await sleep(300); await clickText(".shop-sub-tabs button", "탈것"); await sleep(500); };
await openShop();
ok("상점 꾸미기 → 탈것에 4종", (await page.$$(".mount-product")).length === 4);
const card = (id) => `.mount-product[data-mount="${id}"]`;
ok("비싼 탈것은 보석이 모자라면 못 산다(보석 700)", await page.$eval(`${card("wolf")} .mount-buy`, (b) => b.disabled));
if (OUT) await page.screenshot({ path: `${OUT}/mount-shop.png` });
const gems0 = (await prog()).redGems;
await page.evaluate((s) => document.querySelector(s)?.click(), `${card("boar")} .mount-buy`);
for (let k = 0; k < 30 && !((await prog()).mounts?.boar > 0); k += 1) await sleep(100);
let p = await prog();
ok("멧돼지 구매: 보석 -300 · Lv.1 · 자동 장착", p.redGems === gems0 - 300 && p.mounts.boar === 1 && p.activeMount === "boar", JSON.stringify({ gems: p.redGems, mounts: p.mounts, a: p.activeMount }));
await sleep(200);
ok("카드에 Lv · 타기/내리기 · 강화", /Lv\.1\/10/.test(await page.$eval(card("boar"), (c) => c.textContent)) && !!(await page.$(`${card("boar")} .mount-upgrade`)));
const stone0 = p.enhancementMaterials;
await page.evaluate((s) => document.querySelector(s)?.click(), `${card("boar")} .mount-upgrade`);
for (let k = 0; k < 30 && !((await prog()).mounts?.boar > 1); k += 1) await sleep(100);
p = await prog();
ok("강화: 강화석 -30 · Lv.2", p.mounts.boar === 2 && p.enhancementMaterials === stone0 - 30, JSON.stringify({ lv: p.mounts.boar, stone: p.enhancementMaterials }));
await sleep(200);
ok("강화석이 모자라면 못 누른다(20 < 60)", await page.$eval(`${card("boar")} .mount-upgrade`, (b) => b.disabled));
ok("효과 표기가 오른다: +2.4% · 다음 +2.8%", /\+2\.4%.*\+2\.8%/.test(await page.$eval(card("boar"), (c) => c.textContent)), await page.$eval(card("boar"), (c) => c.textContent));
await page.evaluate(() => document.querySelector(".hub-sheet-close")?.click()); await sleep(400);
const hero = await page.evaluate(() => { const m = document.querySelector(".hero-mount i"); const c = m ? getComputedStyle(m) : null; const e = document.querySelector(".titans-hero .equipped-character"); return { has: !!m, bg: c?.backgroundImage.slice(0, 80), flip: c?.transform, up: e ? getComputedStyle(e).translate : "", rect: m ? m.getBoundingClientRect().width : 0 }; });
ok("전장: 주인공 아래 탈것 시트 · 오른쪽을 보게 뒤집음 · 주인공은 위로", hero.has && /mount-boar/.test(hero.bg ?? "") && /matrix\(-1/.test(hero.flip ?? "") && hero.up !== "none" && hero.rect > 30, JSON.stringify(hero));
if (OUT) { await sleep(600); await page.screenshot({ path: `${OUT}/mount-field.png` }); }
await reload(); await sleep(1200); await settle(); await sleep(400);
p = await prog();
ok("새로 고침 뒤에도 Lv.2 · 장착", p.mounts.boar === 2 && p.activeMount === "boar" && !!(await page.$(".hero-mount")));
await openShop();
await page.evaluate((s) => document.querySelector(s)?.click(), `${card("boar")} .mount-equip`);
for (let k = 0; k < 30 && (await prog()).activeMount !== ""; k += 1) await sleep(100);
await sleep(200);
ok("내리기: 장착 해제 · 전장에서 사라짐 · 레벨은 남는다", (await prog()).activeMount === "" && !(await page.$(".hero-mount")) && (await prog()).mounts.boar === 2);
ok("페이지 오류 없음", errors.length === 0, errors.join(" | "));
await browser.close();
// 숫자 규칙
const { build } = await import("esbuild");
const out = await build({ entryPoints: ["src/titans/mounts.ts"], bundle: true, write: false, format: "esm", platform: "node" });
const url = "data:text/javascript;base64," + Buffer.from(out.outputFiles[0].text).toString("base64");
const M = await import(url);
ok("미보유 효과 0 · 최대 레벨에서 멈춤 · 비룡 Lv.10 = 골드 +14.2% · 방치 +13.4% · 강화비 등급별(멧돼지 30 · 비룡 70, 2026-11-09)", M.mountGoldBonus("boar", 0) === 0 && M.mountUpgradeCost(10) === null && M.mountUpgradeCost(0) === null && Math.abs(M.mountGoldBonus("drake", 99) - 0.142) < 1e-9 && Math.abs(M.mountIdleBonus("drake", 10) - 0.134) < 1e-9 && M.mountIdleBonus("boar", 5) === 0 && M.mountUpgradeCost(3) === 90 && M.mountUpgradeCost(3, "drake") === 210);
ok("장착 안 했으면 효과 0", M.activeMountGold({ boar: 5 }, "") === 0 && M.activeMountGold({ boar: 5 }, "boar") > 0 && M.activeMountGold({}, "boar") === 0);
console.log(fails ? `\n${fails} FAIL` : "\nALL PASS");
process.exit(fails ? 1 : 0);
