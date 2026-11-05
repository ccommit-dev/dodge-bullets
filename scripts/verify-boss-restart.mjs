/**
 * 보스 도전 (2026-11-05, 사용자: "해당 라운드만 종료되고 다시 시작되게 · 동료나 캐릭터도 맨 왼쪽에서 다시 오게")
 *   node scripts/verify-boss-restart.mjs [캡처 폴더]   (vite dev 서버 5173 필요)
 * 누르면 일반 몬스터 라운드가 끝나고 대열이 뛰어나갔다가 왼쪽 끝에서 들어온다 · 대장이 나온다 · 들어오는 동안 제한 시간이 안 흐른다 · 이어서 싸운다.
 */
import { launchBrowser } from "./launch-browser.mjs";
const OUT = process.argv[2], BASE = "http://localhost:5173", H = "mock-local-dev", now = Date.now();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const waitClick = async () => { for (let i = 0; i < 200; i += 1) { if (await page.evaluate(() => { const f = document.querySelector(".titans-field"), b = document.querySelector(".titans-boss-challenge"); if (!b || !f?.className.includes("phase-combat")) return false; b.click(); return true; })) return; await sleep(30); } };
const results = []; const ok = (n, c, d = "") => results.push([c ? "PASS" : "FAIL", n, d]);
const browser = await launchBrowser({ args: ["--no-sandbox", "--disable-gpu"] });
const page = await browser.newPage();
const errors = []; page.on("pageerror", (e) => errors.push(String(e.message).slice(0, 200)));
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
for (const mounted of [false, true]) {
  const party = ["mia", "leon"];
  await page.goto(`${BASE}/favicon.png`, { waitUntil: "domcontentloaded" });
  await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); location.href = "/"; }, {
    [`dodgebullets:progression:v1:${H}`]: JSON.stringify({ version: 5, onboardingStep: 4, level: 40, redGems: 500, titanBestStage: 40, pioneeredArea: 5, idleClaimedAt: now, updatedAt: now, partyIds: party, partyCap: 4, sessionCount: 9, ...(mounted ? { mounts: { wolf: 1 }, activeMount: "wolf" } : {}) }),
    [`dodgebullets:titans:${H}`]: JSON.stringify({ stage: 2, bestStage: 2, gold: 500000, heroes: { mia: 60, leon: 60 }, party, lastActiveAt: now }), "dodge-bullets:soundEnabled": "0",
    [`dodgebullets:attendance:v1:${H}`]: JSON.stringify({ lastClaimDate: new Date().toLocaleDateString("sv-SE"), totalDays: 3, consecutiveDays: 3 }),
  }).catch(() => {});
  await page.waitForNavigation({ waitUntil: "networkidle0" }).catch(() => {});
  await sleep(800);
  for (let i = 0; i < 3; i += 1) { await page.evaluate(() => { document.querySelector(".rebalance-modal")?.click(); document.querySelector(".idle-claim")?.click(); }); await sleep(200); }
  const tag = mounted ? "탈것" : "맨몸";
  let shown = false; for (let i = 0; i < 300 && !shown; i += 1) { shown = await page.evaluate(() => !!document.querySelector(".titans-boss-challenge") && document.querySelector(".titans-field")?.className.includes("phase-combat")); if (!shown) await sleep(200); }
  ok(`${tag}: 일반 라운드를 마치면 보스 도전 단추`, shown);
  // 일반 몬스터가 쓰러지는 칸에는 단추가 잠깐 없다 — 전투 중일 때 바로 누른다
  await waitClick();
  const look = () => page.evaluate(() => { const f = document.querySelector(".titans-field"), fr = f.getBoundingClientRect(), h = document.querySelector(".titans-hero .equipped-character")?.getBoundingClientRect(), a = document.querySelector(".titans-allies .ally-body")?.getBoundingClientRect(); return { phase: [...f.classList].find((c) => c.startsWith("phase-")), hero: h ? Math.round(h.left - fr.left) : null, ally: a ? Math.round(a.left - fr.left) : null, entering: f.classList.contains("party-entering"), boss: !!document.querySelector(".titans-boss-challenge"), timer: document.querySelector(".titans-boss-timer, .boss-timer")?.textContent ?? "", stage: !!document.querySelector(".titans-boss-timer") }; });
  const log = []; const t0 = Date.now();
  while (Date.now() - t0 < 5000) { log.push({ t: Date.now() - t0, ...(await look()) }); await sleep(60); }
  const phases = [...new Set(log.map((l) => l.phase))];
  ok(`${tag}: 라운드 끝 → 뛰어나감 → 들어옴 → 전투 순서`, phases.slice(0, 3).join() === "phase-stage-exit,phase-stage-enter,phase-combat", phases.join());
  ok(`${tag}: 단추는 바로 사라진다`, log.every((l) => !l.boss));
  const enter = log.filter((l) => l.phase === "phase-stage-enter"), hx = enter.map((l) => l.hero).filter((v) => v !== null), ax = enter.map((l) => l.ally).filter((v) => v !== null);
  ok(`${tag}: 주인공 · 동료가 왼쪽 밖에서 들어온다`, hx.length > 1 && Math.min(...hx) < -40 && ax.length > 1 && Math.min(...ax) < -40, `주인공 ${Math.min(...hx)} · 동료 ${Math.min(...ax)}`);
  const endL = log[log.length - 1];
  ok(`${tag}: 들어오는 동안 대장이 나온다`, enter.some((l) => l.stage), JSON.stringify(enter[0]));
  const inCombat = log.find((l) => l.phase === "phase-combat");
  ok(`${tag}: 들어와 이어서 싸운다`, !!inCombat && inCombat.hero > Math.min(...hx) + 40, JSON.stringify(endL));
  if (OUT) await page.screenshot({ path: `${OUT}/boss-${tag}.png` });
}
ok("페이지 오류 없음", errors.length === 0, errors.join(" | "));
await browser.close();
for (const [s, n, d] of results) console.log(`${s} ${n}${d ? ` — ${d}` : ""}`);
const fail = results.filter((r) => r[0] === "FAIL").length;
console.log(fail ? `${fail} FAIL` : "ALL PASS");
process.exit(fail ? 1 : 0);
