/**
 * 핫타임 보급 화면 (2026-11-11, events/hotTime.ts)   node scripts/verify-hottime-ui.mjs [캡처 폴더]   (vite dev 서버 5173 필요)
 * 시계를 12시 반 · 15시로 옮겨 본다(Date 를 어긋나게). 열려 있으면 전장 알림 → 토벌령 카드 → 받기 → 보석 +5 · 다시 못 받음. 닫혀 있으면 "19시에 열림".
 */
import { launchBrowser } from "./launch-browser.mjs";
const OUT = process.argv[2], BASE = "http://localhost:5173", H = "mock-local-dev";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = []; const ok = (n, c, d = "") => results.push([c ? "PASS" : "FAIL", n, d]);
const browser = await launchBrowser({ args: ["--no-sandbox", "--disable-gpu"] });
const errors = [];

async function open(hour, minute, { w = 390, h = 844 } = {}) {
  const page = await browser.newPage();
  page.on("pageerror", (e) => errors.push(String(e.message).slice(0, 200)));
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  // 오늘 이 시각으로 — Date 만 어긋나게 한다(타이머는 그대로 흐른다)
  await page.evaluateOnNewDocument((hh, mm) => {
    const real = Date, t = new real(); t.setHours(hh, mm, 0, 0); const delta = t.getTime() - real.now();
    class Shifted extends real { constructor(...a) { if (a.length === 0) super(real.now() + delta); else super(...a); } static now() { return real.now() + delta; } }
    // eslint-disable-next-line no-global-assign
    window.Date = Shifted;
  }, hour, minute);
  await page.goto(`${BASE}/favicon.png`, { waitUntil: "domcontentloaded" });
  const today = await page.evaluate(() => new Date().toLocaleDateString("sv-SE"));
  const now = await page.evaluate(() => Date.now());
  const party = ["mia", "leon"];
  await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); location.href = "/"; }, {
    [`dodgebullets:progression:v1:${H}`]: JSON.stringify({ version: 5, unitRev: 1, onboardingStep: 4, level: 40, redGems: 100, enhancementMaterials: 10, eventCoins: 0, titanBestStage: 3, pioneeredArea: 5, idleClaimedAt: now, updatedAt: now, partyIds: party, partyCap: 4, sessionCount: 9, claimedRewards: ["dodge-tutorial", "welcome-gift", "surprise-gift"], discoverySeeded: true, routineClaimedDate: today }),
    [`dodgebullets:titans:${H}`]: JSON.stringify({ stage: 3, bestStage: 3, gold: 1000, heroes: { mia: 30, leon: 30 }, party, lastActiveAt: now }),
    [`dodgebullets:attendance:v1:${H}`]: JSON.stringify({ lastClaimDate: today, totalDays: 3, consecutiveDays: 3 }),
    "dodge-bullets:soundEnabled": "0", "dodgebullets:test-phase": "0",
  }).catch(() => {});
  await page.waitForNavigation({ waitUntil: "networkidle0" }).catch(() => {});
  await sleep(900);
  for (let i = 0; i < 3; i += 1) { await page.evaluate(() => { document.querySelector(".rebalance-modal")?.click(); document.querySelector(".idle-claim")?.click(); }); await sleep(200); }
  return page;
}
const prog = (page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? "{}"), `dodgebullets:progression:v1:${H}`);
const card = (page) => page.evaluate(() => {
  const c = document.querySelector(".hottime-card"); if (!c) return null;
  const b = c.getBoundingClientRect(), btn = c.querySelector("button");
  const fonts = [...c.querySelectorAll("*")].filter((el) => el.children.length === 0 && el.textContent.trim()).map((el) => parseFloat(getComputedStyle(el).fontSize));
  return { state: c.dataset.hottime, title: c.querySelector("b")?.textContent, sub: c.querySelector(":scope > div > span")?.textContent, btn: btn?.textContent, disabled: !!btn?.disabled, inView: b.left >= 0 && b.right <= innerWidth, h: Math.round(b.height), minFont: Math.min(...fonts), live: c.classList.contains("is-live") };
});
const openDaily = async (page) => {
  await page.evaluate(() => { const a = document.querySelector(".hottime-alert"); if (a) a.click(); });
  await sleep(600);
  if (!(await page.$(".hottime-card"))) {
    // 알림이 다른 알림 뒤에 있으면 — 모험 허브의 균열 카드로 이벤트 센터를 열고 토벌령 탭으로
    await page.evaluate(() => [...document.querySelectorAll(".titans-bottom-nav button")].find((x) => /모험/.test(x.textContent ?? ""))?.click());
    await sleep(500);
    await page.evaluate(() => document.querySelector('.hub-card[data-card="rift"]')?.click());
    await sleep(800);
    await page.evaluate(() => [...document.querySelectorAll(".event-tabs button")].find((x) => /토벌/.test(x.textContent ?? ""))?.click());
    await sleep(400);
  }
};

// ── 12:30 — 점심 보급 열림 ──
{
  const page = await open(12, 30);
  const alert = await page.evaluate(() => { const a = document.querySelector(".hottime-alert"); return a ? a.textContent : null; });
  ok("12:30 전장 알림 줄에 핫타임(다른 알림이 없을 때)", alert === null || /핫타임/.test(alert), String(alert));
  await openDaily(page);
  const c = await card(page);
  ok("토벌령 맨 위 핫타임 카드 · 열림", c?.state === "live" && c.live && /점심 보급/.test(c.title ?? "") && c.btn === "받기" && !c.disabled, JSON.stringify(c));
  ok("남은 시간 표시 (90분)", /12~14시 · 90분 남음/.test(c?.sub ?? ""), String(c?.sub));
  ok("카드가 화면 안 · 글자 11px 이상", !!c?.inView && c.minFont >= 11, JSON.stringify(c));
  if (OUT) await page.screenshot({ path: `${OUT}/hottime-live.png` });
  const before = await prog(page);
  await page.evaluate(() => { const b = document.querySelector(".hottime-card button"); b?.click(); b?.click(); b?.click(); });   // 연타
  await sleep(1200);
  const after = await prog(page), c2 = await card(page);
  ok("받기 — 보석 +5 · 강화석 +4 · 이벤트 코인 +3 (연타해도 한 번)", after.redGems - before.redGems === 5 && after.enhancementMaterials - before.enhancementMaterials === 4 && after.eventCoins - before.eventCoins === 3, `${after.redGems - before.redGems} · ${after.enhancementMaterials - before.enhancementMaterials} · ${after.eventCoins - before.eventCoins}`);
  ok("받은 뒤 완료 · 비활성", c2?.state === "done" && c2.btn === "완료" && c2.disabled, JSON.stringify(c2));
  ok("받은 알림 문구", await page.evaluate(() => /점심 보급 받음/.test(document.querySelector(".event-list .shop-toast")?.textContent ?? "")));
  if (OUT) await page.screenshot({ path: `${OUT}/hottime-done.png` });
  await page.reload({ waitUntil: "networkidle0" }); await sleep(900);
  ok("다시 들어와도 알림이 없다", !(await page.$(".hottime-alert")));
  await page.close();
}

// ── 15:00 — 닫힘 ──
{
  const page = await open(15, 0, { w: 360, h: 640 });
  ok("15:00 전장 알림 없음", !(await page.$(".hottime-alert")));
  await openDaily(page);
  const c = await card(page);
  ok("카드: 19시에 열림 · 단추 비활성", c?.state === "wait" && /19시에 열림/.test(c.sub ?? "") && c.btn === "19시" && c.disabled, JSON.stringify(c));
  ok("360px 화면 안", !!c?.inView, JSON.stringify(c));
  if (OUT) await page.screenshot({ path: `${OUT}/hottime-wait-360.png` });
  await page.close();
}

ok("페이지 오류 없음", errors.length === 0, errors.join(" | "));
await browser.close();
let fails = 0;
for (const [s, n, d] of results) { console.log(`${s} ${n}${d && s === "FAIL" ? " — " + d : ""}`); if (s === "FAIL") fails += 1; }
console.log(fails ? `\n${fails} FAIL` : "\nALL PASS");
process.exit(fails ? 1 : 0);
