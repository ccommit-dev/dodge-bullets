// 음량 슬라이더 (2026-11-03, 사용자 5단계) — 배경 음악 · 효과음이 따로 줄고, 다시 켜도 남고, 사운드를 끄면 숨는다. 소리는 들을 수 없으니 게인 값으로 본다.
//   node scripts/verify-volume.mjs   (vite 5173 · DEV 훅 window.__bgm · window.__sfxLevel)
import { launchBrowser } from "./launch-browser.mjs";
const BASE = "http://localhost:5173", H = "mock-local-dev", now = Date.now();
const browser = await launchBrowser({ args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"] }); const page = await browser.newPage(); const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = []; page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
await page.goto(BASE, { waitUntil: "networkidle0" });
let fails = 0; const ok = (n, c, d = "") => { console.log(`${c ? "PASS" : "FAIL"} ${n}${d ? " — " + d : ""}`); if (!c) fails += 1; };
const today = new Date().toLocaleDateString("sv-SE");
const progress = { version: 5, level: 25, redGems: 500, attendanceStreak: 5, idleClaimedAt: now, updatedAt: now, onboardingStep: 4, sessionCount: 9, partyIds: ["mia", "leon"], partyCap: 4, claimedRewards: ["dodge-tutorial", "welcome-gift", "surprise-gift"], pioneeredArea: 3, discoverySeeded: true, discovered: ["monster:slime", "ally:mia", "ally:leon"], gachaPulls: 30 };
const seed = {
  [`dodgebullets:progression:v1:${H}`]: JSON.stringify(progress),
  [`dodgebullets:titans:${H}`]: JSON.stringify({ gold: 5e6, stage: 3, bestStage: 3, heroes: { mia: 5, leon: 5 }, lastActiveAt: now }),
  [`dodgebullets:attendance:v1:${H}`]: JSON.stringify({ lastClaimDate: today, totalDays: 3, consecutiveDays: 3 }),
  "dodge-bullets:soundEnabled": "1", "dodgebullets:test-phase": "0",
};
const reload = () => Promise.all([page.waitForNavigation({ waitUntil: "networkidle0" }).catch(() => {}), page.evaluate(() => { setTimeout(() => location.reload(), 0); })]);
await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); }, seed);
await reload(); await sleep(1000);
const settle = () => page.evaluate(() => { for (let k = 0; k < 5; k += 1) { const c = document.querySelector(".idle-claim"); if (c) { c.click(); continue; } const b = [...document.querySelectorAll("button")].filter((x) => !x.closest(".titans-bottom-nav")).find((x) => /^(닫기|확인|나중에)$/.test(x.textContent.trim())); if (b) b.click(); } });
await page.mouse.click(200, 300); await sleep(300); await settle(); await sleep(400);
const openMenu = async () => { await page.evaluate(() => { if (!document.querySelector(".settings-menu")) document.querySelector(".settings-toggle")?.click(); }); await sleep(250); };
const setRange = (sel, value) => page.evaluate(({ sel, value }) => { const el = document.querySelector(sel); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set; set.call(el, String(value)); el.dispatchEvent(new Event("input", { bubbles: true })); }, { sel, value });
const near = (a, b) => typeof a === "number" && Math.abs(a - b) < 0.015;
await openMenu();
ok("설정 메뉴에 슬라이더 2개", await page.$$eval(".volume-row input[type=range]", (l) => l.length) === 2);
const box = await page.evaluate(() => { const r = document.querySelector(".volume-bgm input").getBoundingClientRect(); const row = getComputedStyle(document.querySelector(".volume-row")); const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return { x: r.x, y: r.y, w: r.width, h: r.height, font: parseFloat(row.fontSize), onTop: hit?.tagName, right: r.right, vw: innerWidth }; });
ok("글자 13px 이상 · 화면 안 · 잡기 쉬운 높이", box.font >= 13 && box.right <= box.vw && box.h >= 24 && box.w >= 90, JSON.stringify(box));
ok("슬라이더가 덮여 있지 않다", box.onTop === "INPUT", String(box.onTop));
// 기본값 = 지금까지의 크기
const bgm0 = await page.evaluate(() => window.__bgm?.().level);
ok("처음엔 100 — 음악 크기가 예전 그대로(0.32)", near(bgm0, 0.32), String(bgm0));
// 음악만 줄인다
await setRange(".volume-bgm input", 50); await sleep(400);
const bgm1 = await page.evaluate(() => window.__bgm?.().level);
ok("음악 50 → 게인 0.16", near(bgm1, 0.16), String(bgm1));
// 효과음 소리를 한 번 내서 효과음 컨텍스트를 만든 뒤
await page.evaluate(() => document.querySelector(".settings-toggle")?.click()); await sleep(100); await openMenu();
const sfx0 = await page.evaluate(() => window.__sfxLevel?.());
ok("효과음은 그대로 0.9", near(sfx0, 0.9), String(sfx0));
await setRange(".volume-sfx input", 25); await sleep(150);
const sfx1 = await page.evaluate(() => window.__sfxLevel?.()), bgm2 = await page.evaluate(() => window.__bgm?.().level);
ok("효과음 25 → 게인 0.225", near(sfx1, 0.225), String(sfx1));
ok("효과음을 줄여도 음악은 그대로", near(bgm2, 0.16), String(bgm2));
// 실제 터치로 움직인다 (el 값 대입이 아니라) — 왼쪽 끝 가까이 = 음악 작게
const b = await page.evaluate(() => { const r = document.querySelector(".volume-bgm input").getBoundingClientRect(); return { x: r.x, y: r.y + r.height / 2, w: r.width }; });
await page.touchscreen.tap(b.x + b.w * 0.8, b.y); await sleep(350);
const tapped = await page.$eval(".volume-bgm input", (el) => Number(el.value));
ok("손가락으로 눌러도 움직인다", tapped >= 65 && tapped <= 95, String(tapped));
await setRange(".volume-bgm input", 0); await sleep(350);
const bgm3 = await page.evaluate(() => ({ level: window.__bgm?.().level, playing: window.__bgm?.().playing }));
ok("음악 0 → 소리 0", near(bgm3.level, 0), JSON.stringify(bgm3));
await setRange(".volume-bgm input", 50); await sleep(350);
// 다시 켜도 남는다
await reload(); await sleep(1000); await page.mouse.click(200, 300); await sleep(500); await settle(); await sleep(300); await openMenu();
const kept = await page.evaluate(() => ({ bgm: document.querySelector(".volume-bgm input")?.value, sfx: document.querySelector(".volume-sfx input")?.value, level: window.__bgm?.().level, sfxLevel: window.__sfxLevel?.() }));
ok("새로 고침 뒤에도 값이 남는다", kept.bgm === "50" && kept.sfx === "25", JSON.stringify(kept));
ok("새로 고침 뒤 음악도 줄인 크기로 시작", near(kept.level, 0.16), String(kept.level));
// 사운드 끄면 숨긴다
await page.evaluate(() => [...document.querySelectorAll(".settings-menu button")].find((x) => x.textContent.includes("사운드"))?.click()); await sleep(300);
ok("사운드를 끄면 슬라이더가 숨는다", !(await page.$(".volume-row")));
ok("페이지 오류 없음", errors.length === 0, errors.join(" | "));
await browser.close();
console.log(fails ? `\n${fails} FAIL` : "\nALL PASS");
process.exit(fails ? 1 : 0);
