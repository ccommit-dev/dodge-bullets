/**
 * 릴스에서 가져온 순간들 (2026-11-05, 사용자: 광고 릴스에서 "차용할 만한 게 있으면 콘텐츠에 차용")
 *   node scripts/verify-reel-moments.mjs [캡처 폴더]   (vite dev 서버 5173 필요)
 * 황금 몬스터 시간 막대 · 연타 수 · 처치 글자 · 도망(라운드 수는 그대로), 무기 기술 칸, 환생 뒤 신기록.
 */
import { launchBrowser } from "./launch-browser.mjs";
const OUT = process.argv[2], BASE = "http://localhost:5173", H = "mock-local-dev", now = Date.now();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = []; const ok = (n, c, d = "") => results.push([c ? "PASS" : "FAIL", n, d]);
const browser = await launchBrowser({ args: ["--no-sandbox", "--disable-gpu"] });
const page = await browser.newPage();
const errors = []; page.on("pageerror", (e) => errors.push(String(e.message).slice(0, 200)));
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
let hooked = false;
const seed = async ({ progress = {}, titans = {}, golden = false } = {}) => {
  await page.goto(`${BASE}/favicon.png`, { waitUntil: "domcontentloaded" });
  await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); }, {
    [`dodgebullets:progression:v1:${H}`]: JSON.stringify({ version: 5, onboardingStep: 4, level: 40, redGems: 500, titanBestStage: 40, pioneeredArea: 5, idleClaimedAt: now, updatedAt: now, partyIds: ["mia"], partyCap: 4, sessionCount: 9, ...progress }),
    [`dodgebullets:titans:${H}`]: JSON.stringify({ stage: 3, bestStage: 40, gold: 1000, heroes: { mia: 1 }, party: ["mia"], lastActiveAt: now, ...titans }), "dodge-bullets:soundEnabled": "0",
    [`dodgebullets:attendance:v1:${H}`]: JSON.stringify({ lastClaimDate: new Date().toLocaleDateString("sv-SE"), totalDays: 3, consecutiveDays: 3 }),
  });
  // 새 문서마다 도는 스크립트라 다음 판까지 남는다 — 저장 값으로 그 판만 켠다
  if (golden) await page.evaluate(() => localStorage.setItem("__reel-golden", "1"));
  if (!hooked) { hooked = true; await page.evaluateOnNewDocument(() => { try { window.__huntForceGolden = localStorage.getItem("__reel-golden") === "1"; } catch { /* favicon */ } }); }
  await page.goto(BASE, { waitUntil: "networkidle0" });
  await sleep(800);
  for (let i = 0; i < 3; i += 1) { await page.evaluate(() => { document.querySelector(".rebalance-modal")?.click(); document.querySelector(".idle-claim")?.click(); }); await sleep(200); }
};
const waitFor = async (fn, ms = 15000, arg) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = await page.evaluate(fn, arg); if (v) return v; await sleep(70); } return null; };
const monsterTap = async () => { const p = await page.evaluate(() => { const r = document.querySelector(".titans-monster")?.getBoundingClientRect(); return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null; }); if (p) await page.touchscreen.tap(p.x, p.y); };

// 도망 — 못 잡는 층, 탭 없이
await seed({ golden: true, titans: { stage: 30, bestStage: 40, heroes: { mia: 1 } } });
const bar = await waitFor(() => { const e = document.querySelector(".golden-rush"); return e ? { text: e.querySelector("b")?.textContent, anim: getComputedStyle(e.querySelector(".golden-rush-bar i")).animationName, dur: getComputedStyle(e.querySelector(".golden-rush-bar i")).animationDuration } : null; });
ok("황금 몬스터: 시간 막대 · 안내 글자", bar && /황금/.test(bar.text) && bar.anim === "golden-rush-left" && bar.dur === "7s", JSON.stringify(bar));
if (OUT) await page.screenshot({ path: `${OUT}/golden.png` });
await page.evaluate(() => { window.__huntForceGolden = false; });
const wave0 = await page.evaluate(() => document.querySelector(".titans-field")?.textContent.match(/(\d+)\/10/)?.[1]);
const gold0 = await page.evaluate((h) => JSON.parse(localStorage.getItem(`dodgebullets:titans:${h}`)).gold, H);
const fled = await waitFor(() => !document.querySelector(".golden-rush"), 9000);
await sleep(300);
const after = await page.evaluate(() => ({ wave: document.querySelector(".titans-field")?.textContent.match(/(\d+)\/10/)?.[1], rush: !!document.querySelector(".golden-rush"), toast: document.body.textContent.includes("도망쳤다") }));
ok("7초 넘기면 도망 · 라운드 수 그대로 · 안내", fled && after.wave === wave0 && after.toast, JSON.stringify({ wave0, ...after, gold0 }));

// 연타 · 처치
await seed({ golden: true, titans: { stage: 3, bestStage: 40, heroes: { mia: 1 } } });
await waitFor(() => !!document.querySelector(".golden-rush"));
await page.evaluate(() => { window.__huntForceGolden = false; });
let hits = 0, stamp = null;
for (let i = 0; i < 60 && !stamp; i += 1) { await monsterTap(); await sleep(45); const s = await page.evaluate(() => ({ hits: Number(document.querySelector(".golden-rush")?.dataset.hits ?? 0), stamp: document.querySelector(".hunt-stamp.tone-gold")?.textContent ?? null })); hits = Math.max(hits, s.hits); stamp = s.stamp; }
ok("탭하면 연타 수가 오른다", hits >= 1, `${hits}연타`);
ok("잡으면 골드 ×10! 글자", !!stamp && /골드 ×10!/.test(stamp), String(stamp));
if (OUT) await page.screenshot({ path: `${OUT}/golden-kill.png` });
await waitFor(() => !document.querySelector(".golden-rush"), 3000);

// 무기 기술 칸 — 검 6탭
await seed({ titans: { stage: 30, bestStage: 40 } });
await waitFor(() => document.querySelector(".titans-field")?.className.includes("phase-combat") && !!document.querySelector(".titans-monster"));
await sleep(1500);
ok("처음엔 기술 칸이 없다", await page.evaluate(() => !document.querySelector(".tech-gauge")));
const lefts = [];
for (let i = 0; i < 6; i += 1) { await monsterTap(); await sleep(120); lefts.push(await page.evaluate(() => { const g = document.querySelector(".tech-gauge"); return g ? { left: Number(g.dataset.left), ready: g.classList.contains("is-ready"), on: g.querySelectorAll("i.on").length } : null; })); if (OUT && i === 4) await page.screenshot({ path: `${OUT}/tech.png` }); }
ok("탭마다 칸이 차고 마지막에 빛난다 · 기술 뒤 비워진다", lefts[0]?.left === 5 && lefts[4]?.left === 1 && lefts[4]?.ready && lefts[4]?.on === 5 && lefts[5] === null, JSON.stringify(lefts));
const gaugeBox = await page.evaluate(() => { const r = () => [...document.querySelectorAll(".titans-field button")].filter((b) => /AUTO|×2/.test(b.textContent)).map((b) => b.getBoundingClientRect()); return r().map((b) => Math.round(b.top)); });
void gaugeBox;

// 신기록
await seed({ progress: { rebirthCount: 1, titanBestStage: 5 }, titans: { stage: 5, bestStage: 5, heroes: { mia: 300 } } });
await waitFor(() => !!window.__huntStartBoss && document.querySelector(".titans-field")?.className.includes("phase-combat"));
await sleep(1500);
await page.evaluate(() => window.__huntStartBoss());
const rec = await waitFor(() => document.querySelector(".hunt-stamp.tone-record")?.textContent ?? null, 25000);
if (!rec) console.log("상태", await page.evaluate(() => ({ stage: document.querySelector(".titans-field")?.textContent.slice(0, 60), timer: document.querySelector(".titans-boss-timer")?.textContent })));
ok("환생 뒤 예전 기록을 넘으면 신기록!", !!rec && /신기록!/.test(rec) && /6층/.test(rec), String(rec));
if (OUT) await page.screenshot({ path: `${OUT}/record.png` });
await seed({ progress: { rebirthCount: 0, titanBestStage: 5 }, titans: { stage: 5, bestStage: 5, heroes: { mia: 300 } } });
await waitFor(() => !!window.__huntStartBoss && document.querySelector(".titans-field")?.className.includes("phase-combat"));
await sleep(1500);
await page.evaluate(() => { window.__sawRecord = false; new MutationObserver(() => { if (document.querySelector(".hunt-stamp.tone-record")) window.__sawRecord = true; }).observe(document.body, { childList: true, subtree: true }); window.__huntStartBoss(); });
await sleep(4000);
ok("첫 판은 층마다 알리지 않는다", await page.evaluate(() => !window.__sawRecord));

ok("페이지 오류 없음", errors.length === 0, errors.join(" | "));
await browser.close();
for (const [s, n, d] of results) console.log(`${s} ${n}${d ? ` — ${d}` : ""}`);
const fail = results.filter((r) => r[0] === "FAIL").length;
console.log(fail ? `${fail} FAIL` : "ALL PASS");
process.exit(fail ? 1 : 0);
