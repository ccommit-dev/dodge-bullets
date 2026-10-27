// 사냥터 퀘스트 탭 — 실제 화면 검사 (2026-10-26).  node scripts/verify-quests-play.mjs   (vite 5173) · 캡처 art-gen/out/quests-*.png
import { launchBrowser } from "./launch-browser.mjs";
const BASE = "http://localhost:5173", H = "mock-local-dev", now = Date.now();
const browser = await launchBrowser({ args: ["--no-sandbox"] }); const page = await browser.newPage(); const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = []; page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
await page.goto(BASE, { waitUntil: "networkidle0" });
let fails = 0; const ok = (n, c, d = "") => { console.log(`${c ? "PASS" : "FAIL"} ${n}${d ? " — " + d : ""}`); if (!c) fails += 1; };
const tit = () => page.evaluate((H) => JSON.parse(localStorage.getItem(`dodgebullets:titans:${H}`) ?? "{}"), H);
const progress = { version: 5, level: 10, redGems: 100, idleClaimedAt: now, updatedAt: now, onboardingStep: 4, sessionCount: 9, partyIds: ["mia", "leon"], partyCap: 4, claimedRewards: ["dodge-tutorial"], pioneeredArea: 3, discoverySeeded: true, discovered: ["monster:slime", "monster:goblin", "monster:bat", "ally:mia", "ally:leon"] };
const seed = async (titans) => {
  await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); }, { [`dodgebullets:progression:v1:${H}`]: JSON.stringify(progress), [`dodgebullets:titans:${H}`]: JSON.stringify(titans), [`dodgebullets:attendance:v1:${H}`]: JSON.stringify({ lastClaimDate: new Date().toLocaleDateString("sv-SE"), totalDays: 3, consecutiveDays: 3 }) });
  await page.reload({ waitUntil: "networkidle0" }); await sleep(1200);
  await page.evaluate(() => { for (let k = 0; k < 5; k += 1) { const c = document.querySelector(".idle-claim"); if (c) { c.click(); continue; } const b = [...document.querySelectorAll("button")].filter((x) => !x.closest(".titans-bottom-nav")).find((x) => /^(닫기|확인|나중에)$/.test(x.textContent.trim())); if (b) b.click(); } });
  await sleep(400);
};
const openQuest = async () => { await page.evaluate(() => [...document.querySelectorAll(".titans-growth-tabs button")].find((b) => b.textContent.includes("퀘스트"))?.click()); for (let i = 0; i < 20 && !(await page.$(".quest-panel")); i += 1) await sleep(150); await sleep(300); };

// ── 1. 새 사냥터 — 첫 줄만 돈다 ──
await seed({ gold: 0, stage: 1, bestStage: 1, totalKills: 0, heroes: { mia: 1, leon: 1 }, lastActiveAt: now });
await openQuest();
const r0 = await page.evaluate(() => ({ rows: [...document.querySelectorAll(".quest-row")].map((r) => ({ cls: r.className, text: r.textContent })), head: document.querySelector(".quest-head")?.textContent }));
ok("퀘스트 탭: 8줄 · 첫 줄 '1. 나뭇가지 줍기' Lv.1 · 나머지 잠김", r0.rows.length === 8 && /1. 나뭇가지 줍기/.test(r0.rows[0].text) && /Lv.1/.test(r0.rows[0].text) && r0.rows.slice(1).every((r) => /is-locked/.test(r.cls)), r0.rows[0]?.text);
ok("층 잠금 없음 — 둘째 줄 단추는 '열기 · 값'(1층에서도)", /열기/.test(r0.rows[1].text) && !/도달 시 열림/.test(r0.rows[1].text), r0.rows[1].text);
const w1 = await page.evaluate(() => document.querySelector(".quest-row .quest-bar > i")?.style.width);
await sleep(900);
const w2 = await page.evaluate(() => document.querySelector(".quest-row .quest-bar > i")?.style.width);
ok("막대가 차 오른다", parseFloat(w2) > parseFloat(w1) || parseFloat(w1) > 60, `${w1} → ${w2}`);
const g0 = (await tit()).gold ?? 0;
for (let i = 0; i < 20 && ((await tit()).gold ?? 0) <= g0; i += 1) await sleep(250);
const paid = await page.evaluate(() => !!document.querySelector(".quest-row.paid"));
ok("3초 안에 보상 → 골드 증가 · 막대 번쩍(.paid)", paid && ((await tit()).gold ?? 0) > g0, `${g0} → ${(await tit()).gold}`);

// ── 2. 3층 · 골드 넉넉 — 골드로만 열기 · Lv25 · 10분 보너스 ──
await seed({ gold: 5_000_000, stage: 3, bestStage: 3, totalKills: 30, heroes: { mia: 10, leon: 10 }, lastActiveAt: now });
await openQuest();
const buy = (i) => page.evaluate((i) => document.querySelectorAll(".quest-row")[i].querySelector(".quest-buy").click(), i);
for (let k = 0; k < 30; k += 1) { await buy(0); await sleep(50); }
let t = await tit();
ok("첫 줄은 Lv.25 에서 멈춘다 · 단추 MAX", t.quests.levels[0] === 25 && /MAX/.test(await page.evaluate(() => document.querySelectorAll(".quest-row")[0].querySelector(".quest-buy").textContent)), `Lv ${t.quests.levels[0]}`);
for (const i of [1, 2, 3]) { await buy(i); await sleep(250); }
t = await tit();
ok("3층에서도 골드로 2 · 3 · 4번째 줄을 연다", t.quests.levels[1] === 1 && t.quests.levels[2] === 1 && t.quests.levels[3] === 1, JSON.stringify(t.quests.levels));
const bonusText = await page.evaluate(() => document.querySelector(".quest-bonus")?.textContent ?? "");
const goldB = (await tit()).gold;
await page.evaluate(() => document.querySelector(".quest-bonus")?.click()); await sleep(500);
t = await tit();
ok("10분 보너스 단추 → 골드 + (초당 × 100) · 받은 때 저장", /10분 보너스/.test(bonusText) && bonusText.includes("+") && t.gold > goldB && t.quests.bonusAt > now, `${bonusText} · ${goldB} → ${t.gold}`);
{ const bs = await page.evaluate(() => { const b = document.querySelector(".quest-bonus"); return { cls: b.className, text: b.textContent }; }); ok("받은 뒤 단추는 남은 시간(09:5x)으로 · 흐리게", /is-off/.test(bs.cls) && /(10:00|09:[0-9][0-9])/.test(bs.text), JSON.stringify(bs)); }
const gold2 = (await tit()).gold;
await page.evaluate(() => document.querySelector(".quest-bonus")?.click()); await sleep(400);
ok("10분 안에 다시 누르면 안 준다", (await tit()).gold - gold2 < 100000 && (await tit()).quests.bonusAt === t.quests.bonusAt);
ok("Lv.25 첫 줄에 ×4 · 머리에 초당 골드", await page.evaluate(() => /×4/.test(document.querySelectorAll(".quest-row")[0].textContent) && /초당/.test(document.querySelector(".quest-head").textContent)));
const lay = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, over: [...document.querySelectorAll(".quest-row, .quest-bar, .quest-buy, .quest-main > strong, .quest-bonus, .quest-head")].filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => e.className + ":" + e.textContent.slice(0, 16)), small: [...document.querySelectorAll(".quest-panel *")].filter((e) => e.childElementCount === 0 && e.textContent.trim() && parseFloat(getComputedStyle(e).fontSize) < 13).map((e) => e.textContent.slice(0, 12)), imgs: [...document.querySelectorAll(".quest-panel img")].filter((i) => !i.naturalWidth).length }));
ok("390px 넘침 없음 · 13px 미만 글자 없음 · 아이콘 다 뜸", lay.sw <= 390 && lay.over.length === 0 && lay.small.length === 0 && lay.imgs === 0, JSON.stringify(lay));
await page.evaluate(() => document.querySelector(".quest-panel")?.scrollIntoView({ block: "start" })); await sleep(300);
await page.screenshot({ path: "art-gen/out/quests-panel.png" });
// ── 3. 사냥터 유물 탭 — 퀘스트 줄 모양 (2026-10-27, "유물 탭에 퀘스트 UI 처럼") ──
await page.evaluate((H) => { const k = `dodgebullets:progression:v1:${H}`; const p = JSON.parse(localStorage.getItem(k)); p.relics = { "ember-ring": 3, "flame-feather": 4, "lava-heart": 15, "frost-horn": 1 }; localStorage.setItem(k, JSON.stringify(p)); }, H);
await page.reload({ waitUntil: "networkidle0" }); await sleep(1200);
await page.evaluate(() => [...document.querySelectorAll(".titans-growth-tabs button")].find((b) => b.textContent.includes("유물"))?.click()); await sleep(600);
const rel = await page.evaluate(() => ({
  rows: [...document.querySelectorAll(".relic-tab-panel .quest-row")].map((r) => r.textContent),
  imgMax: Math.max(...[...document.querySelectorAll(".relic-tab-panel img")].map((i) => Math.max(i.getBoundingClientRect().width, i.getBoundingClientRect().height))),
  setOn: !!document.querySelector(".relic-tab-family.fam-fire.set-on"),
  over: [...document.querySelectorAll(".relic-tab-panel .quest-row, .relic-tab-panel .quest-bar, .relic-tab-panel .quest-buy, .relic-tab-panel .quest-icon > b, .relic-tab-draw")].filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => e.className + ":" + e.textContent.slice(0, 18)),
  small: [...document.querySelectorAll(".relic-tab-panel *")].filter((e) => e.childElementCount === 0 && e.textContent.trim() && parseFloat(getComputedStyle(e).fontSize) < 13).map((e) => e.textContent.slice(0, 12)),
  sw: document.documentElement.scrollWidth,
}));
ok("유물 탭: 9줄 · 아이콘이 칸 크기(60px 이하) · 불 세트 켜짐", rel.rows.length === 9 && rel.imgMax <= 60 && rel.setOn, `${rel.rows.length}줄 · 아이콘 ${rel.imgMax}px`);
ok("용암 심장 ★5 MAX · 서리 뿔피리 조각 1/3", rel.rows.some((t) => /용암 심장/.test(t) && /MAX/.test(t) && /완성/.test(t)) && rel.rows.some((t) => /서리 뿔피리/.test(t) && t.includes("1/3")), rel.rows.slice(2, 4).join(" | "));
ok("유물 탭 390px 넘침 없음 · 13px 미만 없음", rel.sw <= 390 && rel.over.length === 0 && rel.small.length === 0, JSON.stringify({ over: rel.over, small: rel.small }));
await page.evaluate(() => document.querySelector(".relic-tab-panel")?.scrollIntoView({ block: "start" })); await sleep(300);
await page.screenshot({ path: "art-gen/out/relic-tab.png" });
await page.evaluate(() => document.querySelector(".relic-tab-draw")?.click()); await sleep(600);
ok("유물 뽑기 단추 → 상점 유물 칸", await page.evaluate(() => !!document.querySelector(".relic-draw-page")));
ok("성장 탭에 '퀘스트' 점(살 수 있음 표시) 동작", await page.evaluate(() => !!document.querySelector(".titans-growth-tabs button")));
ok("페이지 오류 없음", errors.length === 0, errors.join(" | "));
await browser.close();
console.log(fails ? `\n${fails} FAIL` : "\nALL PASS");
process.exit(fails ? 1 : 0);
