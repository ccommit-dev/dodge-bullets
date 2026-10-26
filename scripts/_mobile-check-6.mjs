// 모바일 점검 6항목 — 아이폰 사파리 엔진(WebKit)에서 진짜 터치(tap)로 (2026-10-26 사용자: "모바일 환경에서 위 내용 테스트")
//   PLAYWRIGHT_DIR=<playwright 설치 폴더> [ENGINE=chromium] node scripts/_mobile-check-6.mjs [outDir] [device]   (vite 5173) — 기본 WebKit(아이폰), ENGINE=chromium 은 안드로이드 크롬
// BGM(첫 터치 · 게인 · 화면별 곡 · 사운드 끔) · 견갑 강화 실패 깨짐 · 전환 스킵 뒤 스테이지 · 대장 처치 뒤 스테이지 · 파견 화면 · 성벽 출발 카드 · 비트 연주 중 멈춤(앱 내림 포함)
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const ENGINE = process.env.ENGINE === "chromium" ? "chromium" : "webkit";
const pw = ENGINE === "webkit" ? createRequire(join(process.env.PLAYWRIGHT_DIR ?? process.cwd(), "package.json"))("playwright") : null;
const OUT = process.argv[2]; if (OUT) mkdirSync(OUT, { recursive: true });
const ONLY = process.argv[3];
const BASE = "http://localhost:5173", H = "mock-local-dev";
const UA = ENGINE === "webkit" ? "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1" : "Mozilla/5.0 (Linux; Android 14; SM-S921N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36";
const DEVICES = (ENGINE === "webkit" ? [["iphone15", 390, 664], ["iphoneSE", 375, 553]] : [["galaxyS24", 360, 740], ["galaxyA", 412, 780]]).filter(([d]) => !ONLY || d === ONLY);
// 안드로이드 크롬 쪽은 저장소 표준 puppeteer(launchBrowser) — Playwright 와 쓰는 부분만 맞춘 얇은 껍데기
const { launchBrowser } = ENGINE === "chromium" ? await import("./launch-browser.mjs") : {};
const pp = ENGINE === "chromium" ? await launchBrowser({ args: ["--no-sandbox", "--autoplay-policy=user-gesture-required"] }) : null;
const browser = ENGINE === "webkit" ? await pw.webkit.launch() : {
  version: () => pp.version(),
  close: () => pp.close(),
  newContext: async ({ userAgent, viewport, deviceScaleFactor }) => {
    const page = await pp.newPage();
    await page.setUserAgent(userAgent);
    await page.setViewport({ ...viewport, deviceScaleFactor, isMobile: true, hasTouch: true });
    const goto = page.goto.bind(page), reload = page.reload.bind(page);
    page.goto = (u, o = {}) => goto(u, { ...o, waitUntil: o.waitUntil === "networkidle" ? "networkidle0" : o.waitUntil });
    page.reload = (o = {}) => reload({ ...o, waitUntil: o.waitUntil === "networkidle" ? "networkidle0" : o.waitUntil });
    return { newPage: async () => page, close: () => page.close() };
  },
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const ok = (name, cond, info = "") => { console.log(`${cond ? "PASS" : "FAIL"} ${name}${info ? " — " + info : ""}`); if (!cond) fails += 1; };
console.log("engine", ENGINE, browser.version());
const today = new Date().toLocaleDateString("sv-SE");

for (const [dev, w, h] of DEVICES) {
  const ctx = await browser.newContext({ userAgent: UA, viewport: { width: w, height: h }, deviceScaleFactor: ENGINE === "webkit" ? 3 : 2.625, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));
  await page.goto(BASE, { waitUntil: "networkidle" });
  const seed = async ({ progress = {}, titans = {}, forge = null, sound = "0", extra = {} } = {}) => {
    const now = Date.now();
    const p = { version: 5, level: 25, redGems: 100, idleClaimedAt: now, updatedAt: now, onboardingStep: 4, sessionCount: 9, partyIds: ["mia", "leon"], partyCap: 4, claimedRewards: ["dodge-tutorial", "welcome-gift", "surprise-gift"], pioneeredArea: 3, discoverySeeded: true, discovered: [], ...progress };
    const t = { gold: 1000, stage: 2, bestStage: 2, heroes: { mia: 20, leon: 20 }, lastActiveAt: now, ...titans };
    const s = { [`dodgebullets:progression:v1:${H}`]: JSON.stringify(p), [`dodgebullets:titans:${H}`]: JSON.stringify(t), [`dodgebullets:attendance:v1:${H}`]: JSON.stringify({ lastClaimDate: today, totalDays: 3, consecutiveDays: 3 }), "dodge-bullets:soundEnabled": sound, "dodgebullets:inapp-fs-hint": "1", ...extra };
    if (forge) s[`dodgebullets:forge:${H}`] = JSON.stringify(forge);
    await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); }, s);
    await page.reload({ waitUntil: "networkidle" }); await sleep(1500);
    await page.evaluate(() => { for (let k = 0; k < 5; k += 1) { const c = document.querySelector(".idle-claim"); if (c) { c.click(); continue; } const b = [...document.querySelectorAll("button")].filter((x) => !x.closest(".titans-bottom-nav")).find((x) => /^(닫기|확인|나중에)$/.test(x.textContent.trim())); if (b) b.click(); } });
    await sleep(400);
  };
  const covered = [];
  const tapEl = async (sel, text = "") => {
    const pt = await page.evaluate(({ sel, text }) => { const el = [...document.querySelectorAll(sel)].find((e) => e.textContent.includes(text) && e.getBoundingClientRect().width > 0); if (!el) return null; el.scrollIntoView({ block: "nearest" }); const r = el.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2; const top = document.elementFromPoint(x, y); return { x, y, ok: !!top && (top === el || el.contains(top)), top: top ? top.tagName + "." + String(top.className).slice(0, 50) : "none" }; }, { sel, text });
    if (!pt) return false;
    if (!pt.ok) covered.push(`${sel}${text ? "(" + text + ")" : ""} ← ${pt.top}`);
    await page.touchscreen.tap(Math.round(pt.x), Math.round(pt.y));
    return true;
  };
  const tapText = tapEl;
  const shot = async (name) => { if (OUT) await page.screenshot({ path: `${OUT}/${dev}-${name}.png` }); };
  const inView = (sel) => page.evaluate((sel) => { const el = document.querySelector(sel); if (!el) return null; const r = el.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right), vh: innerHeight, vw: innerWidth, scroll: el.scrollHeight > el.clientHeight + 2 }; }, sel);
  const noHScroll = () => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);

  // 1. BGM — 첫 터치에 사냥터 곡, 게인으로 0.32, 대장간에선 다른 곡, 사운드 끄면 멈춤
  await seed({ sound: "1" });
  const bgm = () => page.evaluate(() => window.__bgm?.());
  const hasAC = await page.evaluate(() => !!(window.AudioContext || window.webkitAudioContext));
  const b0 = await bgm();
  await page.touchscreen.tap(Math.round(w / 2), Math.round(h * 0.45)); await sleep(1800);
  const b1 = await bgm();
  ok(`${dev} BGM 터치 전엔 조용`, b0 && !b0.playing, JSON.stringify(b0));
  ok(`${dev} BGM 첫 터치 → 사냥터 곡 · 게인 0.32`, b1?.playing && /happy-strum/.test(b1.src ?? "") && b1.output === (hasAC ? "gain" : "element") && Math.abs(b1.level - 0.32) < 0.03, JSON.stringify(b1) + " · AudioContext " + hasAC);
  await tapText(".titans-bottom-nav button", "모험"); await sleep(500);
  await page.evaluate(() => document.querySelector('.hub-card[data-card="forge"]')?.click()); await sleep(2200);
  const b2 = await bgm();
  ok(`${dev} BGM 대장간 → 다른 곡`, b2?.playing && /playful-pixels/.test(b2.src ?? ""), JSON.stringify(b2));
  await page.evaluate(() => { localStorage.setItem("dodge-bullets:soundEnabled", "0"); window.dispatchEvent(new Event("dodge-sound-change")); }); await sleep(900);
  const b3 = await bgm();
  ok(`${dev} BGM 사운드 끄면 멈춤`, b3 && !b3.playing, JSON.stringify(b3));

  // 2. 견갑 강화 실패 — 방지권 없음: 깨짐(−1) · 있음: 금만
  for (const [tickets, tag] of [[0, "break"], [3, "protected"]]) {
    await seed({ progress: { level: 20, sharedCoins: 9000000, enhancementMaterials: 3000, shoulderShards: 200, ownedShoulders: ["scout"], equippedShoulder: "scout" }, forge: { gold: 0, goldMigrated: true, level: 3, bestLevel: 3, tickets, shards: 0, totalAttempts: 3, pendingFailure: false, reforgeAttempts: 0, armorLevel: 10, bestArmorLevel: 10, armorAttempts: 10 }, extra: { "dodgebullets:test-phase": "0" } });
    await tapText(".titans-bottom-nav button", "모험"); await sleep(500);
    await page.evaluate(() => document.querySelector('.hub-card[data-card="forge"]')?.click()); await sleep(2000);
    await tapText("button", "보호구"); await sleep(600);
    await page.evaluate(() => { Math.random = () => 0.999; });
    await tapText(".forge-button", "강화하기");
    await page.waitForSelector(".armor-shatter", { timeout: 3000 }).catch(() => {});
    await sleep(350);
    const f = await page.evaluate(() => ({ cls: document.querySelector(".armor-forge-stage")?.className ?? "", label: document.querySelector(".forge-impact.fail")?.textContent ?? "", shards: document.querySelectorAll(".armor-shard").length }));
    await shot(`armor-${tag}`);
    ok(`${dev} 강화 실패 ${tag === "break" ? "깨짐(−1)" : "방지권 금만"}`, tag === "break" ? /armor-break/.test(f.cls) && /−1/.test(f.label) && f.shards === 10 : /armor-crack/.test(f.cls) && f.label.length > 0, JSON.stringify(f));
  }

  // 3·4. 전환 스킵 · 대장 처치 → 다음 스테이지 (QA 빌드 기본 = 테스트 모드)
  for (const mode of ["skip", "boss"]) {
    const start = mode === "skip" ? 2 : 15;
    await seed({ progress: { partyIds: ["mia", "leon", "sera", "garen"] }, titans: { stage: start, bestStage: start, heroes: { mia: 60, leon: 60, sera: 60, garen: 60 } } });
    let skips = 0, reached = 0;
    for (let t = 0; t < 90; t += 1) {
      const r = await page.evaluate((H) => ({ save: JSON.parse(localStorage.getItem(`dodgebullets:titans:${H}`)).stage, boss: !!document.querySelector(".titans-boss-challenge"), skip: !!document.querySelector(".titans-transition-skip") }), H);
      reached = Math.max(reached, r.save);
      if (reached > start) break;
      if (r.boss) await tapEl(".titans-boss-challenge");
      if (r.skip) { await tapEl(".titans-transition-skip"); skips += 1; }
      await sleep(500);
    }
    ok(`${dev} ${mode === "skip" ? "전환 스킵(터치)" : "대장 처치"} 뒤 다음 스테이지`, reached > start && (mode !== "skip" || skips > 0), `S${start} → S${reached} · 스킵 ${skips}회`);
  }

  // 5. 파견 화면 · 성벽 출발 카드 — 화면 안에 들어오는가 · 가로 넘침 · 터치로 동작
  const now = Date.now();
  await seed({ progress: { towerOpen: true, towerTickets: 3, towerTicketDate: today, towerBestFloor: 12, dodgeBestStage: 12, expeditions: [{ allyId: "garen", endsAt: now - 1000, hours: 4 }] }, titans: { stage: 8, bestStage: 8, heroes: { mia: 20, leon: 20, sera: 15, garen: 12, ari: 5, pyro: 8 } } });
  await tapText(".titans-bottom-nav button", "모험"); await sleep(500);
  await tapEl('.hub-card[data-card="expedition"]'); await sleep(800);
  await shot("expedition");
  ok(`${dev} 파견 화면 · 가로 넘침 없음`, !!(await page.$(".expedition-panel")) && (await noHScroll()));
  const hoursBtn = await inView(".expedition-hours button");
  ok(`${dev} 파견 시간 단추 폭 안`, hoursBtn && hoursBtn.right <= hoursBtn.vw && hoursBtn.left >= 0, JSON.stringify(hoursBtn));
  await tapEl(".expedition-panel .expedition-claim"); await sleep(700);
  await tapEl('.expedition-ally[data-ally="sera"] .expedition-hours button', "4시간"); await sleep(700);
  const sent = await page.evaluate(() => [...document.querySelectorAll(".expedition-slot:not(.empty) b")].map((b) => b.textContent));
  ok(`${dev} 파견 수령 → 터치로 보내기`, sent.some((t) => /세라 · 4시간/.test(t)), sent.join(","));
  await tapEl(".hub-sheet-switch button", "모험"); await sleep(500);
  await tapEl('.hub-card[data-card="tower"]'); await sleep(2500);
  await shot("tower-brief");
  const card = await inView(".tower-brief-card");
  ok(`${dev} 성벽 출발 카드 화면 안(위·아래 잘림 없음)`, card && card.top >= 0 && card.bottom <= card.vh, JSON.stringify(card));
  const startBtn = await inView(".tower-brief-card .cta");
  ok(`${dev} 등반 시작 단추가 보인다`, startBtn && startBtn.bottom <= startBtn.vh, JSON.stringify(startBtn));
  await tapEl(".tower-brief-card .cta", "등반 시작"); await sleep(2500);
  ok(`${dev} 등반 시작 → 성벽 1층`, /성벽 1층|1F/.test(await page.evaluate(() => document.body.innerText.slice(0, 200))));

  // 6. 비트 연주 중 멈춤 — 단추 · 앱 내림(visibility) 뒤에도 멈춘 채 · 계속 · 사냥터로
  await seed();
  await tapText(".titans-bottom-nav button", "모험"); await sleep(500);
  await page.evaluate(() => document.querySelector('.hub-card[data-card="beat"]')?.click()); await sleep(2200);
  await tapText(".cta", "이어서 연습하기");
  for (let i = 0; i < 40 && !(await page.evaluate(() => document.querySelectorAll(".action-dock .beat-pad").length === 4)); i += 1) await sleep(400);
  await sleep(2500);
  const sec = () => page.evaluate(() => Number(document.querySelector(".beat-track-name")?.textContent.match(/(\d+)s/)?.[1] ?? -1));
  const btn = await inView(".beat-quit-btn");
  ok(`${dev} 비트 멈춤 단추 화면 안 · 44px 이상 누를 자리`, btn && btn.top >= 0 && btn.right <= btn.vw && btn.bottom - btn.top >= 38, JSON.stringify(btn));
  await tapEl(".beat-quit-btn"); await sleep(400);
  await shot("beat-quit");
  const s0 = await sec(); await sleep(2200); const s1 = await sec();
  ok(`${dev} 비트 멈춤 카드 · 시간 멈춤`, (await page.$$(".beat-quit-card .cta")).length === 3 && s0 === s1 && s0 > 0, `${s0} → ${s1}`);
  await tapEl(".beat-quit-card .cta", "계속 연주하기"); await sleep(1500);
  // 앱 내림 흉내 — visibilityState 를 hidden 으로 바꾸고 이벤트 → 돌아옴
  const setHidden = (hidden) => page.evaluate((hidden) => { Object.defineProperty(document, "visibilityState", { configurable: true, get: () => (hidden ? "hidden" : "visible") }); Object.defineProperty(document, "hidden", { configurable: true, get: () => hidden }); document.dispatchEvent(new Event("visibilitychange")); }, hidden);
  await setHidden(true); await sleep(600); await setHidden(false); await sleep(400);
  const s2 = await sec(); await sleep(2200); const s3 = await sec();
  ok(`${dev} 앱 내렸다 오면 멈춤 카드 · 시간 멈춘 채`, !!(await page.$(".beat-quit-modal")) && s2 === s3, `${s2} → ${s3}`);
  await tapEl(".beat-quit-card .cta", "계속 연주하기"); await sleep(2400);
  const s4 = await sec();
  ok(`${dev} 계속 → 다시 흐른다`, s4 < s3 && !(await page.$(".beat-quit-modal")), `${s3} → ${s4}`);
  await tapEl(".beat-quit-btn"); await sleep(300);
  await tapEl(".beat-quit-card .cta", "사냥터로"); await sleep(1500);
  ok(`${dev} 사냥터로 돌아가기`, !!(await page.$(".titans-field")) && !(await page.$(".beat-battle-canvas")));

  ok(`${dev} 손가락 탭이 다른 요소에 가로막히지 않음`, covered.length === 0, covered.slice(0, 4).join(" / "));
  ok(`${dev} 페이지 오류 없음`, errors.length === 0, errors.slice(0, 3).join(" / "));
  await ctx.close();
}
console.log(fails ? `${fails} FAIL` : "ALL PASS");
await browser.close();
process.exit(fails ? 1 : 0);
