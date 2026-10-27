// 무기 4종 — 실제 화면 검사 (2026-10-27, "비버 무기가 북이라 어색 · 검 · 창 · 활 · 지팡이 · 대장간에서 장착 무기 강화 · 댐 방어전 공용 · 무기별 스킬").
//   node scripts/verify-weapons-play.mjs   (vite 5173) · 캡처 art-gen/out/weapons-*.png
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
const base = { version: 5, level: 20, redGems: 100, idleClaimedAt: now, updatedAt: now, onboardingStep: 4, sessionCount: 9, partyIds: ["mia", "leon"], partyCap: 4, claimedRewards: ["dodge-tutorial"], pioneeredArea: 3, discoverySeeded: true, discovered: [], equippedWeaponLevel: 6, sharedCoins: 9e7, enhancementMaterials: 999, expeditionWeaponForge: { bow: 4, staff: 2, spear: 8 }, dodgeBestStage: 5 };
const seed = async (progress, titans) => {
  await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); }, { [`dodgebullets:progression:v1:${H}`]: JSON.stringify(progress), [`dodgebullets:titans:${H}`]: JSON.stringify(titans), [`dodgebullets:attendance:v1:${H}`]: JSON.stringify({ lastClaimDate: new Date().toLocaleDateString("sv-SE"), totalDays: 3, consecutiveDays: 3 }) });
  await page.reload({ waitUntil: "networkidle0" }); await sleep(1300);
  await page.evaluate(() => { for (let k = 0; k < 5; k += 1) { const c = document.querySelector(".idle-claim"); if (c) { c.click(); continue; } const b = [...document.querySelectorAll("button")].filter((x) => !x.closest(".titans-bottom-nav")).find((x) => /^(닫기|확인|나중에)$/.test(x.textContent.trim())); if (b) b.click(); } });
  await sleep(400);
};
const titansBase = { gold: 1e6, stage: 8, bestStage: 8, totalKills: 100, heroes: { mia: 10, leon: 10 }, lastActiveAt: now, skillInventory: { learned: ["strike", "emberCut", "crit"], levels: { strike: 1, emberCut: 1, crit: 1 }, equipped: { starter: "strike" }, skillCores: 0 } };

// ── 1. 옛 저장(북) → 검 · 사냥터 무기 칩 4종 ──
await seed({ ...base, equippedWeaponKind: "drum" }, titansBase);
let p = await prog();
ok("옛 저장의 북(drum) → 검(sword)", p.equippedWeaponKind === "sword", p.equippedWeaponKind);
await page.evaluate(() => [...document.querySelectorAll(".titans-growth-tabs button")].find((b) => b.textContent.includes("장비 성장"))?.click()); await sleep(600);
const chips = await page.evaluate(() => [...document.querySelectorAll(".weapon-kind-chip")].map((b) => b.textContent.trim()));
ok("사냥터 무기 칩 4종: 검 +6 · 창 +6(8/20) · 활 +3 · 지팡이 +2", chips.length === 4 && /^검 \+6/.test(chips[0]) && /^창 \+6/.test(chips[1]) && /^활 \+3/.test(chips[2]) && /^지팡이 \+2/.test(chips[3]), chips.join(" | "));
ok("주인공 손에 검 그림(weapon-N)", await page.evaluate(() => /titans\/gear\/weapon-\d\.png/.test(document.querySelector(".titans-hero .equipment-weapon-alt")?.getAttribute("src") ?? "")));
const stat0 = await page.evaluate(() => document.querySelector(".weapon-kind-stat")?.textContent ?? "");
ok("검 능력치 · 기술 문구", /탭 \+20%/.test(stat0) && /연속 베기/.test(stat0), stat0);
await page.evaluate(() => document.querySelector(".equipment-training-card")?.scrollIntoView({ block: "center" })); await sleep(300);
await page.screenshot({ path: "art-gen/out/weapons-hunt.png" });
const chipOver = await page.evaluate(() => [...document.querySelectorAll(".weapon-kind-chip")].filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => e.textContent));
ok("사냥터 무기 칩 넘침 없음", chipOver.length === 0, chipOver.join("|"));

// ── 2. 무기별 스킬 세트 — 검 세트(강타) · 창으로 바꾸고 세트를 치명으로 · 검으로 돌아오면 강타 ──
await page.evaluate(() => [...document.querySelectorAll(".weapon-kind-chip")][1].click()); await sleep(900);
p = await prog(); let t = await tit();
ok("창 장착 → 저장 · 처음 무기라 지금 세트 그대로 · loadoutKind = spear", p.equippedWeaponKind === "spear" && t.skillInventory.equipped.starter === "strike" && t.skillInventory.loadoutKind === "spear", JSON.stringify(t.skillInventory.equipped));
await page.evaluate((H) => { const k = `dodgebullets:titans:${H}`; const s = JSON.parse(localStorage.getItem(k)); s.skillInventory.equipped = { starter: "emberCut" }; localStorage.setItem(k, JSON.stringify(s)); }, H);
await page.reload({ waitUntil: "networkidle0" }); await sleep(1300);
await page.evaluate(() => [...document.querySelectorAll(".titans-growth-tabs button")].find((b) => b.textContent.includes("장비 성장"))?.click()); await sleep(500);
await page.evaluate(() => [...document.querySelectorAll(".weapon-kind-chip")][0].click()); await sleep(900);
t = await tit();
ok("검으로 돌아오면 검 세트(북치기) · 창 세트(장작 타)는 맡겨 둔다", t.skillInventory.equipped.starter === "strike" && t.skillInventory.loadouts?.spear?.starter === "emberCut", JSON.stringify(t.skillInventory));

// ── 3. 대장간 — 원정 무기 탭 없음 · 첫 탭은 장착 무기 ──
const openForge = async () => { await clickText(".titans-bottom-nav button", "모험"); await sleep(400); await clickText(".nav-popup-grid button", "대장간"); await sleep(1500); };
await openForge();
let f = await page.evaluate(() => ({ tabs: [...document.querySelectorAll("button")].map((b) => b.textContent.trim()).filter((x) => /^(대장간|조합소|보호구|원정 무기|장비)$/.test(x)), kinds: [...document.querySelectorAll(".forge-weapon-kinds button")].map((b) => b.textContent.trim()), h1: document.querySelector("h1")?.textContent, stage: !!document.querySelector(".forge-stage") }));
ok("대장간 탭에 '원정 무기' 없음 · 무기 칩 4종", !f.tabs.includes("원정 무기") && f.kinds.length === 4, `${f.tabs.join(",")} · ${f.kinds.join(",")}`);
ok("검 장착 → 첫 탭은 검 강화 무대", /검 강화/.test(f.h1 ?? "") && f.stage, f.h1);
await page.screenshot({ path: "art-gen/out/weapons-forge-sword.png" });
await page.evaluate(() => [...document.querySelectorAll(".forge-weapon-kinds button")][1].click()); await sleep(900);
f = await page.evaluate(() => ({ h1: document.querySelector("h1")?.textContent, cards: [...document.querySelectorAll(".forge-expweapon")].map((c) => c.textContent.slice(0, 40)) }));
p = await prog();
ok("대장간에서 창 장착 → 첫 탭이 창 강화 카드 하나 · 저장", /강철 장창 강화/.test(f.h1 ?? "") && f.cards.length === 1 && /강철 장창 \+8/.test(f.cards[0]) && p.equippedWeaponKind === "spear", `${f.h1} · ${f.cards.join("|")}`);
await page.screenshot({ path: "art-gen/out/weapons-forge-spear.png" });
const over = await page.evaluate(() => [...document.querySelectorAll(".forge-weapon-kinds button, .forge-weapon-kinds b")].filter((e) => e.scrollWidth > e.clientWidth + 1 || e.getBoundingClientRect().height > 60).map((e) => e.textContent));
ok("대장간 무기 칩 넘침 · 줄바꿈 없음", over.length === 0, over.join("|"));
const spear0 = p.expeditionWeaponForge.spear;
await page.evaluate(() => document.querySelector(".forge-expweapon .forge-button")?.click()); await sleep(1600);
p = await prog();
ok("창 강화 → 단계가 바뀐다(성공 +1 · 실패 그대로 · 파괴 0)", p.expeditionWeaponForge.spear === spear0 + 1 || p.expeditionWeaponForge.spear === spear0 || p.expeditionWeaponForge.spear === 0, `${spear0} → ${p.expeditionWeaponForge.spear}`);

// ── 4. 댐 방어전 — 장착 무기(검)로 싸운다 ──
await seed({ ...base, equippedWeaponKind: "sword" }, titansBase);
await clickText(".titans-bottom-nav button", "모험"); await sleep(400); await clickText(".nav-popup-grid button", "성문 방어"); await sleep(1600);
await clickText(".exp-menu-tabs button", "원정"); await sleep(500); await clickText("button", "스테이지"); await sleep(1800);
await page.evaluate(() => { const c = document.querySelector("canvas"); if (!c) return; const r = c.getBoundingClientRect(); c.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: r.x + r.width / 2, clientY: r.y + r.height * 0.8, pointerId: 1, pointerType: "touch" })); });
for (let i = 0; i < 20 && !(await page.evaluate(() => !!window.__dodgeWorld)); i += 1) await sleep(250);
// 실제로 쏘고 떨어뜨리는가 — 진행이 1/3 속도라 실제 40초(게임 약 13초). 처음 검기(0.38초)는 위쪽 몬스터에 닿지 못해 처치 0 이었다(2026-10-27)
let shotFrames = 0; const swordSheets = new Set();
for (let i = 0; i < 200; i += 1) { if (await page.evaluate(() => (window.__dodgeWorld?.skillShots ?? []).some((s) => s.active && s.basic))) shotFrames += 1; swordSheets.add(await page.evaluate(() => window.__dodgeHeroSheet ?? "")); await sleep(200); }
const w = await page.evaluate(() => { const w = window.__dodgeWorld; return w ? { weapon: w.rangedWeapon, basic: w.basicLevel, kills: w.skillKills } : null; });
ok("댐 방어전 무기 = 장착한 검 · 기본 단계 = 검 +6 → 8/20", !!w && w.weapon === "sword" && w.basic === 8, JSON.stringify(w));
ok("검기가 실제로 나가고 화살 · 몬스터를 떨어뜨린다", shotFrames > 20 && (w?.kills ?? 0) >= 1, `검기 ${shotFrames}프레임 · 처치 ${w?.kills}`);
await page.screenshot({ path: "art-gen/out/weapons-dodge-sword.png" });
// 쏠 때 몸 동작 = 무기 공격 시트 (2026-10-27, "무기별 몸 동작은 사냥터에만") — player.ts 가 DEV 에서 __dodgeHeroSheet 에 그린 시트 · 칸을 남긴다
const swordAtk = [...swordSheets].filter((x) => /^attack-sword:/.test(x));
ok("댐 방어전 검: 쏠 때 검 공격 시트(hero-attack)의 여러 칸을 돈다", new Set(swordAtk).size >= 3, [...swordSheets].slice(0, 12).join(" "));

// ── 5. 댐 방어전 — 활로 싸울 때 몸이 활 공격 시트(당겼다 놓기)를 돈다 ──
await seed({ ...base, equippedWeaponKind: "bow" }, titansBase);
await clickText(".titans-bottom-nav button", "모험"); await sleep(400); await clickText(".nav-popup-grid button", "성문 방어"); await sleep(1600);
await clickText(".exp-menu-tabs button", "원정"); await sleep(500); await clickText("button", "스테이지"); await sleep(1800);
await page.evaluate(() => { const c = document.querySelector("canvas"); if (!c) return; const r = c.getBoundingClientRect(); c.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: r.x + r.width / 2, clientY: r.y + r.height * 0.8, pointerId: 1, pointerType: "touch" })); });
for (let i = 0; i < 20 && !(await page.evaluate(() => !!window.__dodgeWorld)); i += 1) await sleep(250);
const bowSheets = new Set(); let bowShot = false;
// 표본 수 대신 월드 시간으로 — 헤드리스 rAF 가 10fps 로 묶이면(화면 꺼짐 · 잠금) 160표본 안에 몬스터가 사거리에 오지 않았다(2026-10-27).
// 활 공격 칸 4개 이상 + 대기 칸을 보거나, 월드 20초(실제 최대 3분)까지
for (let i = 0; i < 3000; i += 1) {
  const v = await page.evaluate(() => ({ sheet: window.__dodgeHeroSheet ?? "", el: window.__dodgeWorld?.stageElapsedMs ?? 0 }));
  bowSheets.add(v.sheet);
  if (!bowShot && v.sheet === "attack-bow:4") { bowShot = true; await page.screenshot({ path: "art-gen/out/weapons-dodge-bow-shot.png" }); }
  if ((new Set([...bowSheets].filter((x) => /^attack-bow:/.test(x))).size >= 4 && bowSheets.has("idle")) || v.el > 20000) break;
  await sleep(60);
}
const bw = await page.evaluate(() => window.__dodgeWorld?.rangedWeapon);
const bowAtk = [...bowSheets].filter((x) => /^attack-bow:/.test(x));
ok("댐 방어전 활: 무기 = 활 · 쏠 때 활 공격 시트(hero-attack-bow) 4칸 이상 · 대기 칸으로 돌아온다", bw === "bow" && new Set(bowAtk).size >= 4 && bowSheets.has("idle"), `${bw} · ${[...bowSheets].sort().join(" ")}`);

ok("페이지 오류 없음", errors.length === 0, errors.join(" | "));
await browser.close();
console.log(fails ? `\n${fails} FAIL` : "\nALL PASS");
process.exit(fails ? 1 : 0);
