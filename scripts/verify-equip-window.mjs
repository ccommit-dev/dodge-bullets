/**
 * 장비창 — 끌어다 놓기 · 터치 (2026-11-04, 사용자: "탈부착 아이템 드래그 드랍처럼 조금 더 온라인 게임처럼")
 *   node scripts/verify-equip-window.mjs [캡처 폴더]   (vite dev 서버 5173 필요)
 * 진짜 터치(touchStart · touchMove · touchEnd)로: 맞는 칸에 놓으면 장착 · 빈 곳은 취소 · 틀린 칸은 거절 · 짧게 누르면 장착 · 견갑은 다시 누르면 해제.
 */
import { launchBrowser } from "./launch-browser.mjs";
// 저장 심기는 게임 없는 favicon 페이지에서 — 떠 있는 게임이 비동기로 옛 저장을 써 심은 값을 덮었다(전체 실행에서만 드물게: 골드 31 · 표본 0 · 창을 심었는데 검, 2026-11-04)
const OUT = process.argv[2], BASE = "http://localhost:5173", H = "mock-local-dev", now = Date.now();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = []; const ok = (n, c, d = "") => results.push([c ? "PASS" : "FAIL", n, d]);
const browser = await launchBrowser({ args: ["--no-sandbox", "--disable-gpu"] });
const page = await browser.newPage();
const errors = []; page.on("pageerror", (e) => errors.push(String(e.message).slice(0, 200)));
const seed = async (w, h) => {
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.goto(BASE, { waitUntil: "networkidle0" });
  const progress = { version: 5, onboardingStep: 4, level: 40, redGems: 5000, sharedCoins: 500000, enhancementMaterials: 2000, titanBestStage: 40, pioneeredArea: 5, idleClaimedAt: now, updatedAt: now, partyIds: ["mia"], partyCap: 4, sessionCount: 9, claimedRewards: ["dodge-tutorial", "welcome-gift"], equippedWeaponKind: "sword", ownedShoulders: ["scout", "dragon"], equippedShoulder: "scout", expeditionWeaponForge: { spear: 8, bow: 3, staff: 2 }, gearEnhance: { helmet: 4 } };
  const titans = { stage: 12, bestStage: 40, gold: 2000000, heroes: { mia: 26 }, lastActiveAt: now };
  await page.goto(`${BASE}/favicon.png`, { waitUntil: "domcontentloaded" }); await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); location.href = "/"; }, {
    [`dodgebullets:progression:v1:${H}`]: JSON.stringify(progress), [`dodgebullets:titans:${H}`]: JSON.stringify(titans), "dodge-bullets:soundEnabled": "0",
    [`dodgebullets:attendance:v1:${H}`]: JSON.stringify({ lastClaimDate: new Date().toLocaleDateString("sv-SE"), totalDays: 3, consecutiveDays: 3 }),
  }).catch(() => {});
  await page.waitForNavigation({ waitUntil: "networkidle0" }).catch(() => {});
  await sleep(2000);
  for (let k = 0; k < 3; k += 1) { await page.evaluate(() => { document.querySelector(".idle-claim")?.click(); }); await sleep(200); }
  await page.evaluate(() => [...document.querySelectorAll(".titans-growth-tabs button")].find((b) => b.textContent.includes("장비 성장"))?.click()); await sleep(500);
  await page.evaluate(() => { document.querySelector(".equip-window")?.scrollIntoView({ block: "start" }); }); await sleep(300);
};
const center = (sel) => page.evaluate((sel) => { const e = document.querySelector(sel); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, sel);
const saved = async () => { const p = JSON.parse(await page.evaluate((h) => localStorage.getItem(`dodgebullets:progression:v1:${h}`), H)); return { weapon: p.equippedWeaponKind, shoulder: p.equippedShoulder }; };
const dragTo = async (fromSel, to, snap) => {
  const a = await center(fromSel);
  await page.touchscreen.touchStart(a.x, a.y); await sleep(40);
  const steps = 8;
  for (let i = 1; i <= steps; i += 1) { await page.touchscreen.touchMove(a.x + ((to.x - a.x) * i) / steps, a.y + ((to.y - a.y) * i) / steps); await sleep(25); }
  const during = await page.evaluate(() => ({ ghost: !!document.querySelector(".equip-ghost"), lifted: !!document.querySelector(".equip-item.is-lifted"), canDrop: [...document.querySelectorAll(".equip-slot.can-drop")].map((e) => e.dataset.equipSlot), over: [...document.querySelectorAll(".equip-slot.drop-over")].map((e) => e.dataset.equipSlot), denied: [...document.querySelectorAll(".equip-slot.drop-denied")].map((e) => e.dataset.equipSlot) }));
  if (snap) await page.screenshot({ path: snap });
  await page.touchscreen.touchEnd(); await sleep(350);
  return during;
};

await seed(390, 844);
if (OUT) await page.screenshot({ path: `${OUT}/equip-window.png` });
const pickSlot = async (id) => { await page.evaluate((id) => document.querySelector(`.equip-slot[data-equip-slot="${id}"]`).click(), id); await sleep(200); };
const shape = await page.evaluate(() => ({ slots: [...document.querySelectorAll(".equip-slot")].map((e) => e.dataset.equipSlot), bag: [...document.querySelectorAll(".equip-item")].map((e) => e.textContent.trim()), e: [...document.querySelectorAll(".equip-item.on")].map((e) => e.dataset.item), hero: !!document.querySelector(".equip-hero .equipped-character"), over: (() => { const w = document.querySelector(".equip-window"); return w.scrollWidth - w.clientWidth; })(), clipped: [...document.querySelectorAll(".equip-item")].filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => e.dataset.item) }));
ok("슬롯 6칸 · 주인공 · 가방은 고른 칸 것만(처음 무기 4) · E 표시", shape.slots.length === 6 && shape.hero && shape.bag.length === 4 && shape.e.join() === "sword", JSON.stringify(shape).slice(0, 240));
ok("가방 글자 안 잘림 · 판 넘침 없음", shape.clipped.length === 0 && shape.over <= 0, JSON.stringify({ clipped: shape.clipped, over: shape.over }));
const scroll0 = await page.evaluate(() => document.querySelector(".titans-layer").scrollTop);
const wSlot = await center('.equip-slot[data-equip-slot="weapon"]');
let d = await dragTo('.equip-item[data-item="spear"]', wSlot, OUT && `${OUT}/equip-drag.png`);
ok("끄는 동안 고스트 · 원래 칸 흐림 · 무기 칸 강조", d.ghost && d.lifted && d.canDrop.join() === "weapon" && d.over.join() === "weapon", JSON.stringify(d));
ok("무기 칸에 놓으면 장착 · 고스트 사라짐", (await saved()).weapon === "spear" && !(await page.$(".equip-ghost")), JSON.stringify(await saved()));
ok("끄는 동안 페이지가 안 움직인다", Math.abs((await page.evaluate(() => document.querySelector(".titans-layer").scrollTop)) - scroll0) <= 1);
const empty = await center(".equip-info");
d = await dragTo('.equip-item[data-item="bow"]', empty);
ok("빈 곳에 놓으면 취소", (await saved()).weapon === "spear", JSON.stringify(await saved()));
d = await dragTo('.equip-item[data-item="bow"]', await center('.equip-slot[data-equip-slot="helmet"]'));
ok("틀린 칸은 빨갛게 · 거절", d.denied.join() === "helmet" && (await saved()).weapon === "spear", JSON.stringify(d));
const staff = await center('.equip-item[data-item="staff"]');
await page.touchscreen.tap(staff.x, staff.y); await sleep(350);
// 고정 0.35초는 저장 직전을 읽었다(2026-11-06 전체 검사 — 단언은 spear, 바로 뒤 상세는 staff). 무기가 바뀔 때까지(최대 4초)
for (let i = 0; i < 20 && (await saved()).weapon === "spear"; i += 1) await sleep(200);
ok("짧게 누르면 바로 장착", (await saved()).weapon === "staff", JSON.stringify(await saved()));
await pickSlot("shoulder");
// 칸을 고른 뒤 가방이 견갑으로 바뀔 때까지 · 놓은 뒤 저장이 바뀔 때까지(최대 4초) — 고정 0.2 · 0.35초는 단독 순서에서도 저장 전(scout)을 읽었다(2026-11-06)
await page.waitForSelector('.equip-item[data-item="dragon"]', { timeout: 4000 }).catch(() => {});
d = await dragTo('.equip-item[data-item="dragon"]', await center('.equip-slot[data-equip-slot="shoulder"]'));
for (let i = 0; i < 20 && (await saved()).shoulder === "scout"; i += 1) await sleep(200);
ok("견갑도 끌어다 낀다", (await saved()).shoulder === "dragon" && d.canDrop.join() === "shoulder", JSON.stringify(await saved()));
const dr = await center('.equip-item[data-item="dragon"]');
await page.touchscreen.tap(dr.x, dr.y); await sleep(350);
ok("낀 견갑을 다시 누르면 벗는다 · 칸이 빈다", (await saved()).shoulder === null && !!(await page.$('.equip-slot.slot-shoulder.is-empty')), JSON.stringify(await saved()));
await sleep(200);
await pickSlot("weapon");
const wStat = await page.evaluate(() => ({ slotIcon: document.querySelector('.equip-slot[data-equip-slot="weapon"] img')?.src?.slice(-24), stat: document.querySelector(".weapon-kind-stat")?.textContent ?? "", cards: document.querySelectorAll(".equipment-training-card").length, chips: document.querySelectorAll(".weapon-kind-chip").length }));
ok("무기 칸 그림 · 설명이 바뀌고 훈련 카드 6장 그대로", /staff/.test(wStat.slotIcon ?? "") && /지팡이|스킬/.test(wStat.stat) && wStat.cards === 6 && wStat.chips === 4, JSON.stringify(wStat).slice(0, 220));
for (const [w, h] of [[360, 640], [375, 553]]) {
  await seed(w, h);
  const m = await page.evaluate(() => { const win = document.querySelector(".equip-window").getBoundingClientRect(); const out = [...document.querySelectorAll(".equip-slot, .equip-item")].filter((e) => { const r = e.getBoundingClientRect(); return r.left < win.left - 1 || r.right > win.right + 1; }).map((e) => e.dataset.item || e.dataset.equipSlot); return { out, sw: document.documentElement.scrollWidth - innerWidth, clipped: [...document.querySelectorAll(".equip-item")].filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => e.dataset.item) }; });
  ok(`[${w}×${h}] 칸이 판 밖으로 안 나간다 · 글자 안 잘림`, m.out.length === 0 && m.sw <= 0 && m.clipped.length === 0, JSON.stringify(m));
}
ok("페이지 오류 없음", errors.length === 0, errors.join(" | "));
await browser.close();
for (const [s, n, d2] of results) console.log(`${s} ${n}${d2 ? ` — ${d2}` : ""}`);
const fail = results.filter((r) => r[0] === "FAIL").length;
console.log(fail ? `${fail} FAIL` : "ALL PASS");
process.exit(fail ? 1 : 0);
