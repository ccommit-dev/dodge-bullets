/**
 * 보물 동굴 반복 보너스 화면 (2026-11-11, game/treasureRuns.ts)   node scripts/verify-treasure-ui.mjs [캡처 폴더]   (vite dev 서버 5173 필요)
 * 깬 보물 동굴 칩에 '골드 3/3' → 다시 깨면(대장 처치로 바로 클리어) 기본 보상 1.5배를 더 받고 '오늘 남은 2/3' → 칩 '골드 2/3'.
 * 오늘 다 쓰면 보너스 없이 '다 받았어요'.
 */
import { launchBrowser } from "./launch-browser.mjs";
const OUT = process.argv[2], BASE = "http://localhost:5173", H = "mock-local-dev";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = []; const ok = (n, c, d = "") => results.push([c ? "PASS" : "FAIL", n, d]);
const browser = await launchBrowser({ args: ["--no-sandbox", "--disable-gpu"] });
const page = await browser.newPage();
const errors = []; page.on("pageerror", (e) => errors.push(String(e.message).slice(0, 200)));
const today = new Date().toLocaleDateString("sv-SE");
const clickText = (sel, text) => page.evaluate(({ sel, text }) => { const el = [...document.querySelectorAll(sel)].find((b) => b.textContent.trim().includes(text)); el?.click(); return !!el; }, { sel, text });
const waitFor = async (fn, ms = 8000, step = 100) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = await fn(); if (v) return v; await sleep(step); } return null; };

async function boot(treasureRuns) {
  const now = Date.now();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.goto(`${BASE}/favicon.png`, { waitUntil: "domcontentloaded" });
  await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); location.href = "/"; }, {
    [`dodgebullets:progression:v1:${H}`]: JSON.stringify({ version: 5, unitRev: 1, onboardingStep: 4, level: 40, sharedCoins: 1000, dodgeBestStage: 5, dodgeStars: { 0: 3, 1: 3, 2: 3, 3: 3, 4: 3 }, dodgeBranches: { "1-T": 1 }, pioneeredArea: 5, titanBestStage: 9, idleClaimedAt: now, updatedAt: now, partyIds: ["mia"], partyCap: 4, sessionCount: 9, claimedRewards: ["dodge-tutorial", "dodge-branch:1-T"], ...(treasureRuns ? { treasureRuns } : {}) }),
    [`dodgebullets:titans:${H}`]: JSON.stringify({ gold: 40000, stage: 9, bestStage: 9, heroes: { mia: 8 }, lastActiveAt: now }),
    "dodge-bullets:soundEnabled": "0", "dodgebullets:qa-godmode": "1",
  }).catch(() => {});
  await page.waitForNavigation({ waitUntil: "networkidle0" }).catch(() => {});
  await sleep(2000);
  await page.evaluate(() => { for (let k = 0; k < 4; k += 1) { const c = document.querySelector(".idle-claim"); if (c) { c.click(); continue; } const b = [...document.querySelectorAll("button")].filter((x) => /^(닫기|확인|나중에)$/.test(x.textContent.trim()))[0]; if (b) b.click(); } });
  await sleep(500);
  await clickText(".titans-bottom-nav button", "모험"); await sleep(400);
  await clickText(".nav-popup-grid button", "성문 방어"); await sleep(1500);
  await clickText(".exp-menu-tabs button", "원정"); await sleep(600);
}
const chip = () => page.evaluate(() => { const n = document.querySelector('[data-branch="1-T"]'); return n ? { text: n.querySelector(".route-treasure-left")?.textContent ?? null, spent: !!n.querySelector(".route-treasure-left.spent"), fs: n.querySelector(".route-treasure-left") ? parseFloat(getComputedStyle(n.querySelector(".route-treasure-left")).fontSize) : 0 } : null; });
const prog = () => page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? "{}"), `dodgebullets:progression:v1:${H}`);
/** 보물 동굴을 시작해 대장을 바로 쓰러뜨려 클리어한다(QA 무적) */
async function clearCave() {
  await page.evaluate(() => document.querySelector('[data-branch="1-T"]')?.click());
  await sleep(1600);
  await page.evaluate(() => { const c = document.querySelector("canvas"); if (!c) return; const r = c.getBoundingClientRect(); c.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: r.x + r.width / 2, clientY: r.y + r.height * 0.8, pointerId: 1 })); });
  await sleep(800);
  await page.evaluate(() => { const w = window.__dodgeWorld; if (w) { w.bossSpawned = true; w.bossDefeated = true; } });
  return waitFor(() => page.evaluate(() => document.querySelector(".branch-note")?.textContent ?? null), 10000, 150);
}

await boot();
const c1 = await chip();
ok("깬 보물 동굴 칩: '골드 3/3' (13px 이상)", c1?.text === "골드 3/3" && !c1.spent && c1.fs >= 12, JSON.stringify(c1));
if (OUT) await page.screenshot({ path: `${OUT}/treasure-map.png` });
const before = await prog();
const note = await clearCave();
const after = await prog();
ok("다시 깨면 보너스 · 남은 2/3 안내", /보물 보너스 \+[\d,.만억]+골드 \(오늘 남은 2\/3\)/.test(note ?? ""), String(note));
ok("오늘 1번 쓴 것으로 적힌다", after.treasureRuns?.day === today && after.treasureRuns.count === 1, JSON.stringify(after.treasureRuns));
if (OUT) await page.screenshot({ path: `${OUT}/treasure-clear.png` });

await boot({ day: today, count: 3 });
const c3 = await chip();
ok("오늘 다 썼으면 칩 '골드 0/3' 흐리게", c3?.text === "골드 0/3" && c3.spent, JSON.stringify(c3));
const note3 = await clearCave();
ok("다 쓴 날은 보너스 없이 '다 받았어요'", /오늘 보물 보너스는 다 받았어요/.test(note3 ?? "") && !/보물 보너스 \+/.test(note3 ?? ""), String(note3));
ok("횟수는 3 그대로", (await prog()).treasureRuns?.count === 3);

ok("페이지 오류 없음", errors.length === 0, errors.join(" | "));
await browser.close();
let fails = 0;
for (const [s, n, d] of results) { console.log(`${s} ${n}${d && s === "FAIL" ? " — " + d : ""}`); if (s === "FAIL") fails += 1; }
console.log(fails ? `\n${fails} FAIL` : "\nALL PASS");
process.exit(fails ? 1 : 0);
