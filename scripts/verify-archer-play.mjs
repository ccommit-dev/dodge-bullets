// 아처 키우기 차용 — 실제 화면 검사 (2026-10-22): 첫 발견 팝업 · 대장 사다리 · 강화 전후 수치. 도토리는 2026-10-26 퀘스트로 바뀜.
//   node scripts/verify-archer-play.mjs   (vite 5173)
import { launchBrowser } from "./launch-browser.mjs";
const BASE = "http://localhost:5173", H = "mock-local-dev", now = Date.now();
const browser = await launchBrowser({ args: ["--no-sandbox"] }); const page = await browser.newPage(); const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = []; page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
await page.goto(BASE, { waitUntil: "networkidle0" });
const grid = [2, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0];
const progress = { version: 5, level: 10, redGems: 100, idleClaimedAt: now, updatedAt: now, onboardingStep: 4, sessionCount: 9, partyIds: ["mia", "leon"], partyCap: 4, claimedRewards: ["dodge-tutorial"], pioneeredArea: 3, discoverySeeded: true, discovered: [], bossLadder: { top: 0, ranks: { ally: 0, tap: 0, gold: 0, speed: 0 } } };
const titans = { gold: 100000, stage: 1, bestStage: 1, heroes: { mia: 40, leon: 40 }, lastActiveAt: now, acorns: { grid, allyAmmo: {}, best: 2, acc: 0 } };
await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); }, { [`dodgebullets:progression:v1:${H}`]: JSON.stringify(progress), [`dodgebullets:titans:${H}`]: JSON.stringify(titans), [`dodgebullets:attendance:v1:${H}`]: JSON.stringify({ lastClaimDate: new Date().toLocaleDateString("sv-SE"), totalDays: 3, consecutiveDays: 3 }), "dodge-bullets:soundEnabled": "0", "dodgebullets:test-phase": "0" });
await page.reload({ waitUntil: "networkidle0" }); await sleep(1500);
await page.evaluate(() => { for (let k = 0; k < 5; k += 1) { const c = document.querySelector(".idle-claim"); if (c) { c.click(); continue; } const b = [...document.querySelectorAll("button")].filter((x) => !x.closest(".titans-bottom-nav")).find((x) => /^(닫기|확인|나중에)$/.test(x.textContent.trim())); if (b) b.click(); } });
let fails = 0; const ok = (n, c, d = "") => { console.log(`${c ? "PASS" : "FAIL"} ${n}${d ? " — " + d : ""}`); if (!c) fails += 1; };
const prog = () => page.evaluate((H) => JSON.parse(localStorage.getItem(`dodgebullets:progression:v1:${H}`) ?? "{}"), H);
const tit = () => page.evaluate((H) => JSON.parse(localStorage.getItem(`dodgebullets:titans:${H}`) ?? "{}"), H);
const pops = []; await page.exposeFunction("__pop", (t) => pops.push(t));
await page.evaluate(() => new MutationObserver((ms) => { for (const m of ms) for (const n of m.addedNodes) if (n instanceof Element && n.matches(".reward-pop")) window.__pop(n.textContent); }).observe(document.body, { childList: true, subtree: true }));

// 첫 발견 — 몬스터 첫 처치
for (let i = 0; i < 40 && !((await prog()).discovered ?? []).some((k) => k.startsWith("monster:")); i += 1) await sleep(250);
// 첫 처치는 관찰자를 붙이기 전에 일어날 수 있어 저장으로 확인한다(팝업 문구는 도토리 · 사다리에서 본다)
const p0 = await prog();
ok("몬스터 첫 처치 → 발견 기록 + 보석 +20", (p0.discovered ?? []).some((k) => k.startsWith("monster:")) && p0.redGems >= 120, `${JSON.stringify(p0.discovered)} · 보석 ${p0.redGems}`);

// 도토리 콘텐츠는 뺐다 (2026-10-26 사용자: "도토리 콘텐츠 삭제 · 오늘도 환생 자동 돈 버는 시스템으로") — 퀘스트가 그 자리를 잇고, 같은 날 2×2(퀘스트 왼쪽 아래 · 유물 4번째)
const growthTabs = await page.evaluate(() => [...document.querySelectorAll(".titans-growth-tabs button")].map((b) => b.textContent.trim()).filter((t) => t && t !== "▾"));
ok("성장 탭: 도토리 없음 · 2×2 장비 성장 · 스킬 / 퀘스트 · 유물 (2026-10-26)", !growthTabs.some((t) => /도토리/.test(t)) && /^퀘스트/.test(growthTabs[2] ?? "") && /^유물/.test(growthTabs[3] ?? ""), growthTabs.join(" | "));
await page.evaluate(() => [...document.querySelectorAll(".titans-growth-tabs button")].find((b) => /^퀘스트/.test(b.textContent.trim()))?.click()); await sleep(500);
ok("퀘스트 탭 → 퀘스트 판 · 도토리 판 없음", !!(await page.$(".quest-panel")) && !(await page.$(".acorn-panel")));
const goldQ0 = (await tit()).gold;
await sleep(4000);
ok("사냥 중 퀘스트가 저절로 골드를 준다(4초)", (await tit()).gold > goldQ0 || (await page.evaluate(() => !!document.querySelector(".quest-bar"))), `골드 ${goldQ0} → ${(await tit()).gold}`);

// 대장 사다리 — 10마리 잡고 보스 도전 단추에 영구 보상 표시 → 처치
for (let i = 0; i < 120 && !(await page.$(".titans-boss-challenge")); i += 1) await sleep(250);
const hint = await page.evaluate(() => document.querySelector(".titans-boss-challenge .boss-ladder-hint")?.textContent ?? "");
ok("보스 도전 단추에 '처치 시 동료 피해 영구 +'", /동료 피해 영구/.test(hint), hint);
await page.evaluate(() => document.querySelector(".titans-boss-challenge")?.click());
for (let i = 0; i < 160 && !pops.some((t) => /대장 사다리/.test(t)); i += 1) await sleep(250);
await sleep(800);
const p4 = await prog();
ok("대장 처치 → '대장 사다리 Lv.1 · 동료 피해 영구 상승' 팝업 · 저장 top 1 · ally 1", pops.some((t) => /대장 사다리 Lv\.1/.test(t) && /0% → 3%/.test(t)) && p4.bossLadder?.top === 1 && p4.bossLadder?.ranks?.ally === 1, `${pops.filter((t) => /사다리/.test(t)).join(" | ")} · ${JSON.stringify(p4.bossLadder)}`);

// 강화 전후 수치 — 무기 숙련 카드
await page.evaluate(() => [...document.querySelectorAll(".titans-growth-tabs button")].find((b) => b.textContent.includes("장비"))?.click()); await sleep(500);
const wcard = await page.evaluate(() => document.querySelector(".equipment-training-card p")?.textContent ?? "");
ok("무기 숙련 카드에 '탭 피해 a → b'", /탭 피해 [\d.,KMB]+ → [\d.,KMB]+/.test(wcard), wcard);
ok("페이지 오류 없음", errors.length === 0, errors.slice(0, 2).join(" / "));
console.log(fails ? `${fails} FAIL` : "ALL PASS");
await browser.close(); process.exit(fails ? 1 : 0);
