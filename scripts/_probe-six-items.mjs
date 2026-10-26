// 2026-10-26 요청 6가지 확인 — 골드 금화 · 성장 탭 2×2(장비 성장 · 스킬 / 퀘스트 · 유물) · 상점 유물 뽑기 · 재화 아이콘 · 첫 접속 가이드 · 대장간 파괴 확률
//   node scripts/_probe-six-items.mjs [outDir]   (vite 5173)
import { launchBrowser } from "./launch-browser.mjs";
const OUT = process.argv[2]; const BASE = "http://localhost:5173", H = "mock-local-dev";
const browser = await launchBrowser({ args: ["--no-sandbox"] }); const page = await browser.newPage(); const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = []; page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.goto(BASE, { waitUntil: "networkidle0" });
let fails = 0; const ok = (n, c, d = "") => { console.log(`${c ? "PASS" : "FAIL"} ${n}${d ? " — " + d : ""}`); if (!c) fails += 1; };
const today = new Date().toLocaleDateString("sv-SE");
const seed = async ({ progress = {}, titans = {}, forge = null, extra = {} } = {}) => {
  const now = Date.now();
  const p = { version: 5, level: 30, redGems: 1000, sharedCoins: 10_000_000, enhancementMaterials: 500, idleClaimedAt: now, updatedAt: now, onboardingStep: 4, sessionCount: 9, partyIds: ["mia", "leon"], partyCap: 4, claimedRewards: ["dodge-tutorial", "welcome-gift", "surprise-gift"], pioneeredArea: 3, discoverySeeded: true, discovered: [], ...progress };
  const t = { gold: 50000, stage: 8, bestStage: 8, heroes: { mia: 20, leon: 20 }, lastActiveAt: now, ...titans };
  const s = { [`dodgebullets:progression:v1:${H}`]: JSON.stringify(p), [`dodgebullets:titans:${H}`]: JSON.stringify(t), [`dodgebullets:attendance:v1:${H}`]: JSON.stringify({ lastClaimDate: today, totalDays: 3, consecutiveDays: 3 }), "dodge-bullets:soundEnabled": "0", "dodgebullets:test-phase": "0", ...extra };
  if (forge) s[`dodgebullets:forge:${H}`] = JSON.stringify(forge);
  await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); }, s);
  await page.reload({ waitUntil: "networkidle0" }); await sleep(1300);
};
const close = () => page.evaluate(() => { for (let k = 0; k < 5; k += 1) { const c = document.querySelector(".idle-claim"); if (c) { c.click(); continue; } const b = [...document.querySelectorAll("button")].filter((x) => !x.closest(".titans-bottom-nav")).find((x) => /^(닫기|확인|나중에)$/.test(x.textContent.trim())); if (b) b.click(); } });
const clickText = (sel, re) => page.evaluate(({ sel, re }) => { const el = [...document.querySelectorAll(sel)].find((b) => new RegExp(re).test(b.textContent.trim())); el?.click(); return !!el; }, { sel, re });
const prog = () => page.evaluate((H) => JSON.parse(localStorage.getItem(`dodgebullets:progression:v1:${H}`)), H);

// 5. 첫 접속 가이드 — 처음 온 사람(첫 세션 · 온보딩 중)에게만 뜨고, 닫으면 다시 안 뜬다 · 기존 사용자는 안 뜨고 본 것으로 기록
await seed({ progress: { onboardingStep: 0, sessionCount: 0, level: 1, claimedRewards: [] }, titans: { stage: 1, bestStage: 1 } });
const g1 = await page.evaluate(() => ({ open: !!document.querySelector(".game-guide-modal"), steps: document.querySelectorAll(".game-guide-steps li").length, text: document.querySelector(".game-guide-card")?.innerText.replace(/s+/g, " ").slice(0, 120) }));
if (OUT) await page.screenshot({ path: `${OUT}/six-guide.png` });
ok("새 사용자 첫 접속 → 가이드 창 · 4단계", g1.open && g1.steps === 4, g1.text);
await clickText(".game-guide-card button", "^시작하기$"); await sleep(300);
const seen = await page.evaluate(() => localStorage.getItem("dodgebullets:guide-seen:v1"));
await page.reload({ waitUntil: "networkidle0" }); await sleep(1200);
ok("시작하기 → 닫힘 · 다시 열어도 안 뜸", seen === "1" && !(await page.$(".game-guide-modal")));
await seed();
const vet = await page.evaluate(() => ({ open: !!document.querySelector(".game-guide-modal"), seen: localStorage.getItem("dodgebullets:guide-seen:v1") }));
ok("기존 사용자(온보딩 끝 · 9세션) → 업데이트 뒤에도 안 뜸 · 본 것으로 기록", !vet.open && vet.seen === "1", JSON.stringify(vet));
await page.evaluate(() => document.querySelector(".settings-toggle, .titans-settings-btn, button[aria-label*='설정']")?.click()); await sleep(300);
const reopened = await clickText("[role=menuitem], button", "^게임 가이드"); await sleep(300);
ok("설정 메뉴 '게임 가이드'로 다시 열림", reopened && !!(await page.$(".game-guide-modal")));
await clickText(".game-guide-card button", "^시작하기$"); await sleep(200);

// 1 · 4. 재화 아이콘 — 골드는 금화 · 같은 파일을 모든 곳이 쓴다
await seed(); await close();
const icons = await page.evaluate(async () => { const out = {}; for (const f of ["gold", "gem", "enhance-stone"]) out[f] = await new Promise((res) => { const i = new Image(); i.onload = () => res(i.naturalWidth); i.onerror = () => res(0); i.src = `/ui/attendance/${f}.png?t=${Date.now()}`; }); out.walletGold = [...document.querySelectorAll("img.currency-icon")].filter((i) => /attendance\/gold\.png/.test(i.src)).length; return out; });
ok("재화 아이콘 3장(금화 · 루비 · 결정) 로드 · 지갑 골드가 같은 파일", icons.gold === 128 && icons.gem === 128 && icons["enhance-stone"] === 128 && icons.walletGold >= 1, JSON.stringify(icons));

// 2. 성장 탭 2×2 — 장비 성장 · 스킬 / 퀘스트 · 유물, 퀘스트는 왼쪽
const tabs = await page.evaluate(() => [...document.querySelectorAll(".titans-growth-tabs button")].filter((b) => !b.classList.contains("growth-drawer-close")).map((b) => { const r = b.getBoundingClientRect(); return { t: b.textContent.trim(), x: Math.round(r.left), y: Math.round(r.top) }; }));
const pos = Object.fromEntries(tabs.map((t) => [t.t.replace(/\s+/g, ""), t]));
ok("성장 탭 순서 장비 성장 · 스킬 · 퀘스트 · 유물", tabs.map((t) => t.t.replace(/[^가-힣 ]/g, "").trim()).join(",") === "장비 성장,스킬,퀘스트,유물", tabs.map((t) => t.t).join(","));
ok("퀘스트는 왼쪽 아래 · 유물은 오른쪽 아래", pos["퀘스트"] && pos["장비성장"] && Math.abs(pos["퀘스트"].x - pos["장비성장"].x) < 4 && pos["퀘스트"].y > pos["장비성장"].y && pos["유물"].x > pos["퀘스트"].x, JSON.stringify(tabs));
// 3. 유물 탭 → 판 · 상점 링크
await clickText(".titans-growth-tabs button", "^유물"); await sleep(500);
ok("유물 탭 → 유물 판 9칸", (await page.evaluate(() => document.querySelectorAll(".growth-relic-panel .relic-tile").length)) === 9);
if (OUT) await page.screenshot({ path: `${OUT}/six-relic-tab.png` });
await clickText(".relic-shop-link", "유물 뽑기"); await sleep(700);
ok("상점에서 유물 뽑기 → 상점 유물 분류", !!(await page.$(".relic-draw-page")) && (await page.evaluate(() => document.querySelector(".premium-category-tabs button.on")?.textContent.trim())) === "유물");
const p0 = await prog();
await clickText(".relic-draw-actions button", "^1회"); await sleep(700);
const p1 = await prog();
const r1 = await page.evaluate(() => document.querySelectorAll(".relic-draw-item").length);
ok("1회 뽑기 → 보석 −60 · 조각 +1 · 결과 창", p0.redGems - p1.redGems === 60 && Object.values(p1.relics ?? {}).reduce((a, b) => a + b, 0) === 1 && r1 === 1, `보석 ${p0.redGems}→${p1.redGems} · ${JSON.stringify(p1.relics)}`);
await clickText(".relic-draw-card button", "^확인$"); await sleep(300);
await clickText(".relic-draw-actions button", "^10회"); await sleep(700);
const p2 = await prog();
if (OUT) await page.screenshot({ path: `${OUT}/six-relic-draw.png` });
ok("10회 뽑기 → 보석 −540 · 조각 +10", p1.redGems - p2.redGems === 540 && Object.values(p2.relics ?? {}).reduce((a, b) => a + b, 0) === 11, `보석 ${p1.redGems}→${p2.redGems}`);
await clickText(".relic-draw-card button", "^확인$"); await sleep(300);
await clickText(".relic-rates-link", "확률"); await sleep(200);
const rates = await page.evaluate(() => [...document.querySelectorAll(".relic-rates li b")].map((b) => b.textContent));
ok("확률 공시 9줄 · 균등 11.1%", rates.length === 9 && rates.every((t) => t === "11.1%"), rates.join(" "));

// 6. 대장간 파괴 — 장비 +9 에서 0.40(성공 37.7% 밖 · 파괴 구간) → +0 · 강화석 9 환급 / 방지권 있으면 막음
const forgeBase = { gold: 0, goldMigrated: true, level: 3, bestLevel: 3, shards: 0, totalAttempts: 3, pendingFailure: false, reforgeAttempts: 0, armorLevel: 13, bestArmorLevel: 13, armorAttempts: 10 };
for (const tickets of [0, 2]) {
  await seed({ progress: { gearEnhance: { helmet: 9, armor: 0, gloves: 0, boots: 0 }, expeditionWeaponForge: { bow: 18, staff: 0 }, ownedShoulders: ["scout"], equippedShoulder: "scout", shoulderShards: 100 }, forge: { ...forgeBase, tickets } });
  await close();
  await clickText(".titans-bottom-nav button", "모험"); await sleep(500);
  await page.evaluate(() => document.querySelector('.hub-card[data-card="forge"]')?.click()); await sleep(1800);
  await clickText("button", "^장비$"); await sleep(500);
  const risk = await page.evaluate(() => document.querySelector('.gear-forge-row[data-gear-part="helmet"] .forge-risk')?.textContent);
  const mat0 = (await prog()).enhancementMaterials;
  await page.evaluate(() => { Math.random = () => 0.40; document.querySelector('.gear-forge-row[data-gear-part="helmet"] .forge-button')?.click(); }); await sleep(700);
  const pg = await prog();
  if (tickets === 0) {
    ok("장비 +9 확률 표시(성공 · 파괴)", /성공 \d+% · 실패 시 파괴 \d+%/.test(risk ?? ""), risk);
    ok("장비 파괴 → +0 · 강화석 환급", pg.gearEnhance.helmet === 0 && pg.enhancementMaterials > mat0 - 4, `투구 +${pg.gearEnhance.helmet} · 강화석 ${mat0}→${pg.enhancementMaterials}`);
    if (OUT) await page.screenshot({ path: `${OUT}/six-forge-gear-destroy.png` });
  } else {
    const t = await page.evaluate((H) => JSON.parse(localStorage.getItem(`dodgebullets:forge:${H}`) ?? "{}").tickets, H);
    ok("방지권 있으면 파괴를 막음(+9 유지 · 방지권 −1)", pg.gearEnhance.helmet === 9 && t === 1, `투구 +${pg.gearEnhance.helmet} · 방지권 ${t}`);
  }
  if (tickets === 0) {
    await clickText("button", "^원정 무기$"); await sleep(500);
    const wr = await page.evaluate(() => document.querySelector(".forge-expweapon.bow .forge-risk")?.textContent);
    await page.evaluate(() => { Math.random = () => 0.45; document.querySelector(".forge-expweapon.bow .forge-button")?.click(); }); await sleep(700);   // +18/20: 성공 약 42% 밖 · 파괴 구간(약 10%)
    const pw = await prog();
    ok("원정 장궁 +18 파괴 → +0", /파괴/.test(wr ?? "") && pw.expeditionWeaponForge.bow === 0, `${wr} · 장궁 +${pw.expeditionWeaponForge.bow}`);
    await clickText("button", "^보호구$"); await sleep(500);
    await page.evaluate(() => { Math.random = () => 0.40; });   // 성공 38% 밖 · 파괴 구간
    await page.evaluate(() => [...document.querySelectorAll(".forge-button")].find((b) => b.textContent.includes("강화하기"))?.click());
    await sleep(2600);
    const fsave = await page.evaluate((H) => JSON.parse(localStorage.getItem(`dodgebullets:forge:${H}`) ?? "{}"), H);
    ok("보호구 +13 파괴 → +0 · '파괴! +0'", fsave.armorLevel === 0, `보호구 +${fsave.armorLevel}`);
  }
}
ok("페이지 오류 없음", errors.length === 0, errors.slice(0, 3).join(" / "));
console.log(fails ? `${fails} FAIL` : "ALL PASS");
await browser.close(); process.exit(fails ? 1 : 0);
