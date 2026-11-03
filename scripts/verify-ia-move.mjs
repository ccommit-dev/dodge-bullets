// 화면 정리 (2026-11-03, 사용자: "뽑기는 상점탭에만 일원화 · 도감은 마이페이지로 일원화 · 세트별 정렬 없애고 보유한것만 · 동료 상세 스킬 능력치 · 공격 모션").
// 뽑기가 상점 한 곳 · 모험에 상자 없음 · 동료 탭 = 보유 + 다음 1명 · 상세에서 공격 시트가 돈다 · 유물 탭 평평 · 도감 단추 → 마이페이지 유물 쪽 · 도감 4탭 보유 구분.
//   node scripts/verify-ia-move.mjs [캡처폴더]  (vite 5173)
import { launchBrowser } from "./launch-browser.mjs";
const BASE = "http://localhost:5173", H = "mock-local-dev", now = Date.now(), OUT = process.argv[2];
const browser = await launchBrowser({ args: ["--no-sandbox"] }); const page = await browser.newPage(); const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = []; page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.goto(BASE, { waitUntil: "networkidle0" });
let fails = 0; const ok = (n, c, d = "") => { console.log(`${c ? "PASS" : "FAIL"} ${n}${d ? " — " + d : ""}`); if (!c) fails += 1; };
const shot = async (name) => { if (OUT) await page.screenshot({ path: `${OUT}/${name}.png` }); };
const today = new Date().toLocaleDateString("sv-SE");
const progress = { version: 5, level: 25, redGems: 5000, attendanceStreak: 5, idleClaimedAt: now, updatedAt: now, onboardingStep: 4, sessionCount: 9, partyIds: ["mia", "leon"], partyCap: 4, claimedRewards: ["dodge-tutorial", "welcome-gift", "surprise-gift"], pioneeredArea: 3, discoverySeeded: true, discovered: ["monster:slime", "ally:mia", "ally:leon"], gachaPulls: 30, chests: 2, chestPoints: 30, allyStars: { mia: 2, leon: 1 }, relics: { "ember-ring": 3, "flame-feather": 4, "lava-heart": 15, "frost-horn": 1 }, seenMonsters: ["slime"] };
await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); }, {
  [`dodgebullets:progression:v1:${H}`]: JSON.stringify(progress),
  [`dodgebullets:titans:${H}`]: JSON.stringify({ gold: 5e7, stage: 3, bestStage: 3, heroes: { mia: 5, leon: 5 }, lastActiveAt: now }),
  [`dodgebullets:attendance:v1:${H}`]: JSON.stringify({ lastClaimDate: today, totalDays: 3, consecutiveDays: 3 }),
  "dodgebullets:test-phase": "0",
});
await Promise.all([page.waitForNavigation({ waitUntil: "networkidle0" }).catch(() => {}), page.evaluate(() => { setTimeout(() => location.reload(), 0); })]);
await sleep(1200);
await page.evaluate(() => { for (let k = 0; k < 5; k += 1) { const c = document.querySelector(".idle-claim"); if (c) { c.click(); continue; } const b = [...document.querySelectorAll("button")].filter((x) => !x.closest(".titans-bottom-nav")).find((x) => /^(닫기|확인|나중에)$/.test(x.textContent.trim())); if (b) b.click(); } });
await sleep(400);
const clickText = (sel, text) => page.evaluate(({ sel, text }) => { const el = [...document.querySelectorAll(sel)].find((b) => b.textContent.trim().includes(text)); el?.click(); return !!el; }, { sel, text });
const texts = (sel) => page.evaluate((s) => [...document.querySelectorAll(s)].map((b) => b.textContent.trim()), sel);
const overflow = () => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
const tiny = (root) => page.evaluate((r) => [...document.querySelectorAll(`${r} *`)].filter((e) => e.childElementCount === 0 && e.textContent.trim() && parseFloat(getComputedStyle(e).fontSize) < 13).map((e) => `${e.className}:${e.textContent.trim().slice(0, 12)}`).slice(0, 5), root);
// ── 모험: 상자 없음 ──
await clickText(".titans-bottom-nav button", "모험"); await sleep(500);
ok("모험 탭에 비버 상자 줄이 없다", !(await page.$(".hub-chests")));
// ── 상점: 점 · 상자 · 동료 뽑기 ──
ok("안 연 상자 → 상점 단추에 점", await page.evaluate(() => !![...document.querySelectorAll(".titans-bottom-nav button")].find((b) => b.textContent.includes("상점"))?.querySelector(".tab-dot")));
await clickText(".titans-bottom-nav button", "상점"); await sleep(400);
await clickText(".hub-sheet-switch button", "뽑기"); await sleep(300);
ok("상점 뽑기 아래 줄 = 유물 · 스킬 · 동료 · 상자", (await texts(".shop-sub-tabs button")).join() === "유물,스킬,동료,상자", (await texts(".shop-sub-tabs button")).join());
await clickText(".shop-sub-tabs button", "상자"); await sleep(300);
ok("상자 칸에 상자 2개 · 열기", /비버 상자 2개/.test((await texts(".shop-chest-page")).join()) && !!(await page.$(".hub-chest-open:not([disabled])")));
await shot("shop-chest");
await page.evaluate(() => document.querySelector(".hub-chest-open")?.click()); await sleep(500);
ok("상자를 열면 1개로 준다", /비버 상자 1개/.test((await texts(".shop-chest-page")).join()), (await texts(".hub-chests b")).join());
await clickText(".shop-sub-tabs button", "동료"); await sleep(400);
ok("상점 동료 칸에 뽑기 화면 · 뽑기 단추", !!(await page.$(".gacha-stage-page")) && !!(await page.$(".gacha-page-actions button")));
ok("보석 전용 동료는 상점 동료 칸에서 판다", (await page.$$(".shop-ally-product")).length >= 1);
await shot("shop-ally");
await page.evaluate(() => document.querySelector(".hub-sheet-close")?.click()); await sleep(300);
// ── 동료 탭 ──
await clickText(".titans-bottom-nav button", "동료"); await sleep(500);
ok("동료 머리에서 뽑기가 빠졌다", !(await texts(".hub-sheet-switch button")).some((t) => /뽑기/.test(t)), (await texts(".hub-sheet-switch button")).join());
const roster = await page.evaluate(() => [...document.querySelectorAll(".ally-card")].map((c) => c.dataset.ally));
ok("동료 목록 = 보유 2명 + 다음 소환 1명", roster.length === 3 && roster.includes("mia") && roster.includes("leon"), roster.join());
await shot("ally-party");
await clickText(".ally-card .ally-detail-open", "상세"); await sleep(600);
const detail = await page.evaluate(() => { const d = document.querySelector(".ally-detail"); const sheet = d?.querySelector("[style*='titans/anim/allies'], .ally-detail-art *"); const anim = [...(d?.querySelectorAll(".ally-detail-art *") ?? [])].map((e) => getComputedStyle(e)).find((c) => /titans\/anim\/allies/.test(c.backgroundImage)); return { id: d?.dataset.allyDetail, stats: [...(d?.querySelectorAll(".ally-detail-stats dt") ?? [])].map((x) => x.textContent), sig: !!d?.querySelector(".ally-sig"), sheet: !!sheet, bg: anim?.backgroundImage.slice(0, 80), name: anim?.animationName }; });
ok("카드 상세 → 그 동료의 상세(역할 · 속성 · DPS · 공격 간격 · 성급 · 승급 조각 · 스킬)", detail.stats.length === 6 && detail.sig && !!detail.id, JSON.stringify(detail));
ok("상세 위 칸에 공격 시트가 돈다", /titans\/anim\/allies/.test(detail.bg ?? "") && detail.name !== "none", `${detail.bg} · ${detail.name}`);
ok("상세 13px 미만 없음 · 넘침 없음", (await tiny(".ally-detail-page")).length === 0 && await overflow(), (await tiny(".ally-detail-page")).join());
await sleep(1000); await shot("ally-detail");
await page.evaluate(() => [...document.querySelectorAll(".ally-detail-pick button")].find((b) => !b.classList.contains("on"))?.click()); await sleep(400);
ok("위 줄에서 다른 동료를 고른다", (await page.$eval(".ally-detail", (d) => d.dataset.allyDetail)) !== detail.id);
await page.evaluate(() => document.querySelector(".hub-sheet-close")?.click()); await sleep(300);
// ── 유물 탭 ──
await page.evaluate(() => [...document.querySelectorAll(".titans-bottom-nav button")].find((b) => b.textContent.includes("사냥터"))?.click()); await sleep(300);
await clickText(".titans-growth-tabs button", "유물"); await sleep(500);
const rel = await page.evaluate(() => ({ families: document.querySelectorAll(".relic-tab-family").length, ids: [...document.querySelectorAll(".relic-tab-panel .quest-row")].map((r) => r.dataset.relic), tiers: [...document.querySelectorAll(".relic-tab-panel .quest-row")].map((r) => r.dataset.tier), chips: [...document.querySelectorAll(".relic-set-chip")].map((c) => c.textContent.trim()), draw: !!document.querySelector(".relic-tab-draw"), dex: !!document.querySelector(".relic-tab-dex") }));
ok("유물 탭: 세트 묶음 없음 · 보유만 한 줄 · 세트는 칩", rel.families === 0 && rel.ids.length === 3 && !rel.ids.includes("frost-horn") && rel.chips.length >= 1, JSON.stringify(rel));
ok("유물 탭: 뽑기 단추 대신 도감 단추", !rel.draw && rel.dex);
const order = ["N", "R", "SR", "SSR", "UR", "LR"]; const ranks = rel.tiers.map((t) => order.indexOf(t));
ok("유물 탭: 높은 등급부터", ranks.every((r, i) => i === 0 || ranks[i - 1] >= r), rel.tiers.join());
await shot("relic-tab");
// ── 도감 ──
await page.evaluate(() => document.querySelector(".relic-tab-dex")?.click()); await sleep(900);
ok("도감 단추 → 마이페이지 도감의 유물 쪽", await page.evaluate(() => [...document.querySelectorAll(".codex-tabs button")].find((b) => b.classList.contains("on"))?.textContent === "유물" && !!document.querySelector(".relic-codex")));
ok("마이페이지 위 칸에 펫이 따로 없다", (await texts(".mypage-tabs button")).join() === "캐릭터·칭호,도감,배지·진화", (await texts(".mypage-tabs button")).join());
ok("도감 4탭", (await texts(".codex-tabs button")).join() === "몬스터,동료,유물,펫");
const count = () => page.$eval(".codex-card-grid", (g) => Number(g.dataset.count));
const all = await count();
await clickText(".codex-own button", "보유"); await sleep(250); const own = await page.evaluate(() => [...document.querySelectorAll(".codex-own button")].find((b) => b.textContent === "보유")?.click()); void own; await sleep(250);
const ownN = await count();
await page.evaluate(() => [...document.querySelectorAll(".codex-own button")].find((b) => b.textContent === "미보유")?.click()); await sleep(250);
const noneN = await count();
ok("유물 도감: 보유 · 미보유 분리(합 = 전체)", ownN === 3 && ownN + noneN === all, `${ownN}+${noneN}=${all}`);
ok("미보유는 회색 카드", await page.evaluate(() => [...document.querySelectorAll(".codex-card")].every((c) => c.classList.contains("unowned"))));
await shot("codex-relic");
await page.evaluate(() => [...document.querySelectorAll(".codex-own button")].find((b) => b.textContent === "전체")?.click()); await sleep(200);
await clickText(".codex-tabs button", "동료"); await sleep(700);
ok("동료 도감: 쪽으로 나눈다(12장)", (await page.$$(".codex-card")).length === 12 && !!(await page.$(".codex-page-next")));
ok("도감 13px 미만 없음 · 넘침 없음", (await tiny(".codex-card-grid")).length === 0 && await overflow(), (await tiny(".codex-card-grid")).join());
await shot("codex-ally");
await clickText(".codex-tabs button", "펫"); await sleep(300);
ok("펫이 도감 안에", await page.evaluate(() => { const g = document.querySelector(".pet-grid"); return !!g && !g.closest(".hidden"); }));
await clickText(".codex-tabs button", "몬스터"); await sleep(300);
ok("몬스터 도감", await page.evaluate(() => { const g = document.querySelector(".bestiary-grid"); return !!g && !g.closest(".hidden"); }));
await shot("codex-monster");
ok("페이지 오류 없음", errors.length === 0, errors.join(" | "));
await browser.close();
console.log(fails ? `\n${fails} FAIL` : "\nALL PASS");
process.exit(fails ? 1 : 0);
