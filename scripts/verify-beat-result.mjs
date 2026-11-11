/**
 * 비트 수련 결과 화면 · SP (2026-11-11)   node scripts/verify-beat-result.mjs [캡처 폴더]   (vite dev 서버 5173 필요)
 * 곡을 시작하고 길이를 줄여 바로 클리어시킨다(DEV 훅 __beatSession). 결과: 등급 · 정확도 · 판정 분포 · 골드(만 · 억) · 사냥터 연결 문구.
 * SP: 사냥터에서 쓴 SP 가 클리어로 되살아나지 않는다 — 잔액 0 · 누적 40 이면 클리어 뒤 잔액 = 0 + 이번에 번 만큼.
 * 작은 폰(360×640 · 375×553)에서 결과 단추가 화면 안.
 */
import { launchBrowser } from "./launch-browser.mjs";
const OUT = process.argv[2], BASE = "http://localhost:5173", H = "mock-local-dev";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = []; const ok = (n, c, d = "") => results.push([c ? "PASS" : "FAIL", n, d]);
const browser = await launchBrowser({ args: ["--no-sandbox", "--disable-gpu", "--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage();
const errors = []; page.on("pageerror", (e) => errors.push(String(e.message).slice(0, 200)));
const today = new Date().toLocaleDateString("sv-SE");
const waitFor = async (fn, ms = 8000, step = 100) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = await fn(); if (v) return v; await sleep(step); } return null; };

async function run(w, h, tag) {
  const now = Date.now();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.goto(`${BASE}/favicon.png`, { waitUntil: "domcontentloaded" });
  await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); location.href = "/"; }, {
    [`dodgebullets:progression:v1:${H}`]: JSON.stringify({ version: 5, unitRev: 1, onboardingStep: 4, level: 30, redGems: 50, sharedCoins: 1000, skillPoints: 0, beatSpMigrated: 40, titanBestStage: 40, pioneeredArea: 5, idleClaimedAt: now, updatedAt: now, partyIds: ["mia", "leon"], partyCap: 4, sessionCount: 9, beatSkills: { kick: 5, hat: 5, snare: 5, fire: 5, throat: 5 }, claimedRewards: ["dodge-tutorial", "welcome-gift", "surprise-gift"], routineClaimedDate: today }),
    [`dodgebullets:titans:${H}`]: JSON.stringify({ stage: 40, bestStage: 40, gold: 1000, heroes: { mia: 30, leon: 30 }, lastActiveAt: now, urgent: { day: today, issued: { login: now - 60000 }, done: ["login"], bossKills: 0 } }),
    [`dodgebullets:beatRpg:${H}`]: JSON.stringify({ sp: 40, skills: { kick: 5, hat: 5, snare: 5, fire: 5, throat: 5 }, records: {}, grades: {} }),
    [`dodgebullets:attendance:v1:${H}`]: JSON.stringify({ lastClaimDate: today, totalDays: 3, consecutiveDays: 3 }),
    "dodge-bullets:soundEnabled": "0", "dodgebullets:test-phase": "0", "dodgebullets:beat:calibrationMs": "0",
  }).catch(() => {});
  await page.waitForNavigation({ waitUntil: "networkidle0" }).catch(() => {});
  await sleep(1200);
  for (let i = 0; i < 3; i += 1) { await page.evaluate(() => { document.querySelector(".rebalance-modal")?.click(); document.querySelector(".idle-claim")?.click(); }); await sleep(200); }
  await page.evaluate(() => [...document.querySelectorAll(".titans-bottom-nav button")].find((b) => /모험/.test(b.textContent))?.click());
  await sleep(500);
  await page.evaluate(() => [...document.querySelectorAll(".nav-popup-grid button, .hub-card")].find((b) => /비트 수련/.test(b.textContent))?.click());
  await sleep(1600);
  await page.evaluate(() => document.querySelector(".schedule-card")?.click());
  await waitFor(() => page.evaluate(() => !!window.__beatSession), 8000);
  await sleep(1500);
  // 곡을 짧게 — 다음 틱에 클리어
  await page.evaluate(() => { const s = window.__beatSession; if (s) s.world.durationMs = Math.max(1, s.world.elapsedMs); });
  const res = await waitFor(() => page.evaluate(() => {
    const sum = document.querySelector(".beat-judge-summary"); if (!sum) return null;
    const btns = [...document.querySelectorAll("button")].filter((b) => /이어서 수련|목록|돌아가기/.test(b.textContent ?? ""));
    const last = btns[btns.length - 1]?.getBoundingClientRect();
    return { grade: document.querySelector(".beat-grade-pill")?.textContent, acc: document.querySelector(".beat-acc-text")?.textContent, counts: document.querySelector(".beat-judge-counts")?.textContent, bridge: document.querySelector(".beat-hunt-bridge")?.textContent ?? "", gold: [...document.querySelectorAll("p, div, span, strong, b")].map((e) => e.textContent ?? "").find((t) => /골드/.test(t) && /\+/.test(t)) ?? "", btnBottom: last ? Math.round(last.bottom) : null, vh: innerHeight, scrollH: document.scrollingElement.scrollHeight };
  }), 12000, 200);
  await sleep(1500);
  if (OUT) await page.screenshot({ path: `${OUT}/beat-result-${tag}.png`, fullPage: false });
  const prog = await page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? "{}"), `dodgebullets:progression:v1:${H}`);
  return { res, prog };
}

const a = await run(390, 844, "390");
ok("결과: 등급 · 정확도 · 판정 분포", !!a.res && /[SABC]/.test(a.res.grade ?? "") && /정확도/.test(a.res.acc ?? "") && /PERFECT/.test(a.res.counts ?? "") && /MISS/.test(a.res.counts ?? ""), JSON.stringify(a.res));
ok("결과: 사냥터 연결 문구(남은 SP · 슬롯 이름)", /숙련 Lv\.\d+ → 사냥터 \[(시동기|연계 A|연계 B|마무리|패시브)\]/.test(a.res?.bridge ?? "") && /남은 \d+/.test(a.res?.bridge ?? ""), a.res?.bridge);
ok("SP: 쓴 SP 가 되살아나지 않는다 — 잔액 0 + 이번 판(2~3)", a.prog.skillPoints >= 2 && a.prog.skillPoints <= 3 && a.prog.beatSpMigrated >= 42, `잔액 ${a.prog.skillPoints} · 누적 기록 ${a.prog.beatSpMigrated}`);
for (const [w, h] of [[360, 640], [375, 553]]) {
  const r = await run(w, h, `${w}`);
  ok(`${w}×${h}: 결과가 뜬다`, !!r.res, JSON.stringify(r.res));
}
ok("페이지 오류 없음", errors.length === 0, errors.join(" | "));
await browser.close();
let fails = 0;
for (const [s, n, d] of results) { console.log(`${s} ${n}${d && s === "FAIL" ? " — " + d : ""}`); if (s === "FAIL") fails += 1; }
console.log(fails ? `\n${fails} FAIL` : "\nALL PASS");
process.exit(fails ? 1 : 0);
