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
ok("퀘스트 탭: 8줄 · 첫 줄 '1. 나뭇가지 줍기' Lv.1 · 상한 Lv.5 · 나머지 잠김", r0.rows.length === 8 && /1\. 나뭇가지 줍기/.test(r0.rows[0].text) && /Lv\.1/.test(r0.rows[0].text) && /상한 Lv\.5/.test(r0.rows[0].text) && r0.rows.slice(1).every((r) => /is-locked/.test(r.cls)), r0.rows[0]?.text);
ok("잠긴 둘째 줄 단추 '5층 · 도달 시 열림'", /5층도달 시 열림/.test(r0.rows[1].text), r0.rows[1].text);
const w1 = await page.evaluate(() => document.querySelector(".quest-row .quest-bar > i")?.style.width);
await sleep(900);
const w2 = await page.evaluate(() => document.querySelector(".quest-row .quest-bar > i")?.style.width);
ok("막대가 차 오른다", parseFloat(w2) > parseFloat(w1) || parseFloat(w1) > 60, `${w1} → ${w2}`);
const g0 = (await tit()).gold ?? 0;
for (let i = 0; i < 20 && ((await tit()).gold ?? 0) <= g0; i += 1) await sleep(250);
const paid = await page.evaluate(() => !!document.querySelector(".quest-row.paid"));
ok("3초 안에 보상 → 골드 증가 · 막대 번쩍(.paid)", paid && ((await tit()).gold ?? 0) > g0, `${g0} → ${(await tit()).gold}`);

// ── 2. 12층 · 골드 넉넉 — 열기 · 강화 · 상한 ──
await seed({ gold: 50000, stage: 12, bestStage: 12, totalKills: 300, heroes: { mia: 30, leon: 30 }, lastActiveAt: now });
await openQuest();
const buy = (i) => page.evaluate((i) => document.querySelectorAll(".quest-row")[i].querySelector(".quest-buy").click(), i);
for (let k = 0; k < 30; k += 1) { await buy(0); await sleep(60); }
let t = await tit();
const cap0 = 5 + 2 * (12 - 1);
ok(`첫 줄은 상한(Lv.${cap0})까지만 오른다`, t.quests.levels[0] === cap0, `Lv ${t.quests.levels[0]}`);
ok("상한 단추 '상한 · N층에 +1'", /상한\d+층에 \+1/.test(await page.evaluate(() => document.querySelectorAll(".quest-row")[0].querySelector(".quest-buy").textContent)));
await buy(1); await sleep(300);
t = await tit();
ok("둘째 줄 열기(500) → Lv.1 · 셋째 줄(10층)도 열 수 있다", t.quests.levels[1] === 1 && /열기/.test(await page.evaluate(() => document.querySelectorAll(".quest-row")[2].querySelector(".quest-buy").textContent)));
await buy(2); await sleep(300);
await buy(3); await sleep(300);
t = await tit();
ok("넷째 줄(15층)은 12층에서 못 연다", t.quests.levels[2] === 1 && t.quests.levels[3] === 0 && /15층/.test(await page.evaluate(() => document.querySelectorAll(".quest-row")[3].textContent)));
ok("마일스톤 Lv.10 넘은 첫 줄에 ×2 · 머리에 초당 골드", await page.evaluate(() => /×4|×2/.test(document.querySelectorAll(".quest-row")[0].textContent) && /초당/.test(document.querySelector(".quest-head").textContent)));
const lay = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, over: [...document.querySelectorAll(".quest-row, .quest-bar, .quest-buy, .quest-main > strong")].filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => e.className + ":" + e.textContent.slice(0, 16)), small: [...document.querySelectorAll(".quest-panel *")].filter((e) => e.childElementCount === 0 && e.textContent.trim() && parseFloat(getComputedStyle(e).fontSize) < 13).map((e) => e.textContent.slice(0, 12)), imgs: [...document.querySelectorAll(".quest-panel img")].filter((i) => !i.naturalWidth).length }));
ok("390px 넘침 없음 · 13px 미만 글자 없음 · 아이콘 다 뜸", lay.sw <= 390 && lay.over.length === 0 && lay.small.length === 0 && lay.imgs === 0, JSON.stringify(lay));
await page.evaluate(() => document.querySelector(".quest-panel")?.scrollIntoView({ block: "start" })); await sleep(300);
await page.screenshot({ path: "art-gen/out/quests-panel.png" });
ok("성장 탭에 '퀘스트' 점(살 수 있음 표시) 동작", await page.evaluate(() => !!document.querySelector(".titans-growth-tabs button")));
ok("페이지 오류 없음", errors.length === 0, errors.join(" | "));
await browser.close();
console.log(fails ? `\n${fails} FAIL` : "\nALL PASS");
process.exit(fails ? 1 : 0);
