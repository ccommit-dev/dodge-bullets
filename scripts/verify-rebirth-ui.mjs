/**
 * 벽 조건 풀이 · 머리줄 환생 단추 · 칭호 하나 · 스킬 칸 주인공 곁 (2026-11-03, 사용자: "벽조건은 뭔지 구체화 · 마이페이지 오른쪽 여백에 환생하기 버튼 · 오버시 조건 요약 · 스킬아이콘 캐릭터 가까이 · 칭호 중복 제거")
 *   node scripts/verify-rebirth-ui.mjs [캡처 폴더]   (vite dev 서버 5173 필요)
 */
import { launchBrowser } from "./launch-browser.mjs";
// 저장 심기는 게임 없는 favicon 페이지에서 — 떠 있는 게임이 비동기로 옛 저장을 써 심은 값을 덮었다(전체 실행에서만 드물게: 골드 31 · 표본 0 · 창을 심었는데 검, 2026-11-04)
const OUT = process.argv[2], BASE = "http://localhost:5173", H = "mock-local-dev", now = Date.now();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = []; const ok = (n, c, d = "") => results.push([c ? "PASS" : "FAIL", n, d]);
const browser = await launchBrowser({ args: ["--no-sandbox", "--disable-gpu"] });
const page = await browser.newPage();
const errors = []; page.on("pageerror", (e) => errors.push(String(e.message).slice(0, 200)));
const seed = async (w, h, extra = {}) => {
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.goto(BASE, { waitUntil: "networkidle0" });
  const progress = { version: 5, onboardingStep: 4, level: 40, redGems: 5000, sharedCoins: 500000, enhancementMaterials: 2000, titanBestStage: 40, pioneeredArea: 5, idleClaimedAt: now, updatedAt: now, partyIds: ["mia", "leon"], partyCap: 4, sessionCount: 9, claimedRewards: ["dodge-tutorial", "welcome-gift"], ...extra };
  const titans = { stage: 12, bestStage: 40, gold: 999999999, heroes: { mia: 26, leon: 13 }, skillInventory: { learned: ["strike", "crit"], levels: { strike: 3, crit: 1 }, equipped: { starter: "strike", linkA: "crit" }, skillCores: 30 }, lastActiveAt: now };
  await page.goto(`${BASE}/favicon.png`, { waitUntil: "domcontentloaded" }); await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); location.href = "/"; }, {
    [`dodgebullets:progression:v1:${H}`]: JSON.stringify(progress), [`dodgebullets:titans:${H}`]: JSON.stringify(titans), "dodge-bullets:soundEnabled": "0",
    [`dodgebullets:attendance:v1:${H}`]: JSON.stringify({ lastClaimDate: new Date().toLocaleDateString("sv-SE"), totalDays: 3, consecutiveDays: 3 }),
  }).catch(() => {});
  await page.waitForNavigation({ waitUntil: "networkidle0" }).catch(() => {});
  await sleep(2200);
  for (let k = 0; k < 3; k += 1) { await page.evaluate(() => { document.querySelector(".idle-claim")?.click(); }); await sleep(200); }
};
const header = () => page.evaluate(() => {
  const r = (s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, b: b.bottom }; };
  return { back: r(".titans-back"), btn: r(".header-rebirth-btn"), wallet: r(".titans-wallet"), vw: innerWidth, tipVisible: getComputedStyle(document.querySelector(".header-rebirth-tip")).visibility, tip: r(".header-rebirth-tip"), tipText: document.querySelector(".header-rebirth-tip")?.textContent ?? "" };
});

// ── 머리줄 여백: 폭마다 겹치지 않는다(큰 금액) ──
for (const [w, h] of [[360, 640], [375, 812], [390, 844], [430, 932]]) {
  await seed(w, h);
  const x = await header();
  ok(`[${w}] 환생 단추가 마이페이지와 지갑 사이 · 겹침 없음 · 화면 안`, x.btn && x.btn.l >= x.back.r - 0.5 && x.btn.r <= x.wallet.l + 0.5 && x.wallet.r <= x.vw + 0.5, JSON.stringify({ back: Math.round(x.back.r), btnL: Math.round(x.btn?.l), btnR: Math.round(x.btn?.r), wallet: Math.round(x.wallet.l), walletR: Math.round(x.wallet.r) }));
}

// ── 조건 요약: 누르면 열린다 · 화면 안 · 조건이 구체적 ──
await seed(390, 844);
let x = await header();
ok("요약은 처음엔 닫혀 있다", x.tipVisible === "hidden");
await page.evaluate(() => document.querySelector(".header-rebirth-btn").click()); await sleep(250);
x = await header();
ok("누르면 조건 요약이 열린다 · 화면 안", x.tipVisible === "visible" && x.tip.l >= 0 && x.tip.r <= x.vw, JSON.stringify(x.tip));
ok("요약은 짧게: 대장 2연패 · 지금 지역 · 받는 것 · 70자 안", /대장 2연패한 지역 2곳/.test(x.tipText) && /붉은 폐허 대장 2연패 → 1\/2/.test(x.tipText) && /결정 \+\d+/.test(x.tipText) && /0\/2/.test(x.tipText) && x.tipText.length <= 70, `${x.tipText.length}자 ${x.tipText}`);
if (OUT) await page.screenshot({ path: `${OUT}/rebirth-tip.png` });
await page.touchscreen.tap(195, 500); await sleep(250);
ok("바깥을 누르면 닫힌다", (await header()).tipVisible === "hidden");

// ── 조건을 채우면 두 번 눌러 환생 ──
await seed(390, 844, { wallAreas: ["meadow", "ruins"] });
await page.evaluate(() => document.querySelector(".header-rebirth-btn").click()); await sleep(250);
const go = () => page.evaluate(() => document.querySelector(".header-rebirth-go")?.textContent?.trim());
ok("조건을 채우면 단추가 환생하기", (await go()) === "환생하기", await go());
await page.evaluate(() => document.querySelector(".header-rebirth-go").click()); await sleep(200);
ok("첫 탭은 확인만(아직 환생 안 함)", /정말 환생하기/.test(await go()) && !JSON.parse(await page.evaluate((h) => localStorage.getItem(`dodgebullets:progression:v1:${h}`), H)).rebirthCount, await go());
if (OUT) await page.screenshot({ path: `${OUT}/rebirth-armed.png` });
await page.evaluate(() => document.querySelector(".header-rebirth-go").click()); await sleep(1800);
const after = JSON.parse(await page.evaluate((h) => localStorage.getItem(`dodgebullets:progression:v1:${h}`), H));
ok("두 번째 탭에 환생 · 벽 기록 소모", after.rebirthCount === 1 && (after.wallAreas ?? []).length === 0, `회 ${after.rebirthCount} · 벽 ${JSON.stringify(after.wallAreas)}`);

// ── 마이페이지 풀이 ──
await seed(390, 844, { wallAreas: ["meadow"] });
await page.evaluate(() => document.querySelector(".titans-back").click()); await sleep(1200);
const guide = await page.evaluate(() => { const g = document.querySelector(".rebirth-wall-guide"); return g && { text: g.textContent, done: [...g.querySelectorAll("li.done")].map((l) => l.textContent), here: [...g.querySelectorAll("li.here")].map((l) => l.textContent), btn: document.querySelector(".rebirth-button")?.textContent ?? "", auto: document.querySelector(".auto-rebirth-toggle small")?.textContent ?? "" }; });
ok("마이페이지: 기록한 지역 ✓ · 지금 지역 · 다음 할 일", guide && guide.done.join() === "✓ 새벽 초원" && /붉은 폐허 · 지금/.test(guide.here.join()) && /붉은 폐허\(Stage 12\)에서 대장에게 2번 연속 지면 벽 2\/2/.test(guide.text), JSON.stringify(guide)?.slice(0, 260));
ok("환생 · 자동 환생 문구에 대장 2연패", /대장 2연패/.test(guide?.btn ?? "") && /대장 2연패 지역 2곳/.test(guide?.auto ?? ""), `${guide?.btn} | ${guide?.auto}`);
if (OUT) { await page.evaluate(() => document.querySelector(".rebirth-wall-guide")?.scrollIntoView({ block: "center" })); await sleep(200); await page.screenshot({ path: `${OUT}/rebirth-guide.png` }); }

// ── 스킬 칸 · 칭호 ──
await seed(390, 844, { activeTitle: "title-titan", ownedTitles: ["title-titan"] });
const near = [];
for (let i = 0; i < 90 && near.length < 12; i += 1) {
  const s = await page.evaluate(() => {
    const field = document.querySelector(".titans-field"), hero = document.querySelector(".titans-hero"), skills = [...document.querySelectorAll(".titans-skill-dock .titans-skill")];
    if (!hero || !skills.length || !field.className.includes("phase-combat") || hero.classList.contains("is-approaching")) return null;
    const h = hero.getBoundingClientRect(), a = skills[0].getBoundingClientRect(), z = skills[skills.length - 1].getBoundingClientRect();
    return { dx: Math.round(Math.abs((a.left + z.right) / 2 - (h.left + h.right) / 2)), n: skills.length, qolOk: a.left >= document.querySelector(".battle-qol").getBoundingClientRect().right - 1 };
  });
  if (s) near.push(s);
  await sleep(150);
}
const settled = near.slice(-6);
ok("스킬 칸이 주인공 발밑 — 가운데 차이 12px 이내 · AUTO 와 안 겹침", settled.length >= 3 && settled.every((s) => s.dx <= 12 && s.qolOk), JSON.stringify(settled));
if (OUT) await page.screenshot({ path: `${OUT}/skill-near.png` });
// 시트가 열리면 환생 단추가 시트 위로 튀어나오지 않는다
await page.evaluate(() => [...document.querySelectorAll(".titans-bottom-nav button")].find((b) => b.textContent.includes("상점"))?.click()); await sleep(700);
const covered = await page.evaluate(() => { const b = document.querySelector(".header-rebirth-btn")?.getBoundingClientRect(); if (!b) return true; const top = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2); return !top?.closest(".header-rebirth"); });
ok("상점 시트가 열리면 환생 단추가 가려진다", covered);
await page.evaluate(() => [...document.querySelectorAll(".titans-bottom-nav button")].find((b) => b.textContent.includes("사냥터"))?.click()); await sleep(700);
// 설정: 스킬 칸 왼쪽 / 주인공 곁 — 고르면 바로 옮겨지고 다시 들어와도 남는다
const dockInfo = () => page.evaluate(() => { const d = document.querySelector(".titans-skill-dock"); return { pad: parseInt(d.style.paddingLeft || getComputedStyle(d).paddingLeft, 10), saved: localStorage.getItem("dodge-bullets:skillDockLeft") }; });
const before = await dockInfo();
const openMenu = async () => { await page.evaluate(() => { const b = document.querySelector(".settings-toggle"); if (b) b.click(); else [...document.querySelectorAll(".titans-bottom-nav button")].find((x) => x.textContent.includes("설정"))?.click(); }); await sleep(400); };
await openMenu();
const label1 = await page.evaluate(() => document.querySelector(".settings-skill-dock b")?.textContent);
await page.evaluate(() => document.querySelector(".settings-skill-dock")?.click()); await sleep(450);
const label2 = await page.evaluate(() => document.querySelector(".settings-skill-dock b")?.textContent);
const left = await dockInfo();
ok("설정에서 스킬 칸을 왼쪽으로 — 바로 옮겨진다 · 저장", label1 === "주인공 곁" && label2 === "왼쪽" && left.pad === 58 && left.saved === "1" && before.pad > 58, JSON.stringify({ label1, label2, before: before.pad, left }));
await page.evaluate(() => document.querySelector(".settings-skill-dock")?.click()); await sleep(450);
// 주인공이 걷는 중이면 다음 만남 자리 잡을 때 다시 잰다 — 몇 초 안에 돌아오면 된다
let backNear = false; for (let i = 0; i < 40 && !backNear; i += 1) { backNear = (await dockInfo()).pad > 58; if (!backNear) await sleep(200); }
ok("다시 누르면 주인공 곁", backNear, JSON.stringify(await dockInfo()));
await page.evaluate(() => localStorage.removeItem("dodge-bullets:skillDockLeft"));
// 새 동료 공유 카드 그림 — 낡은 로스터 시트로 빠지지 않는다
const cell = await page.evaluate(async () => { const m = await import("/src/titans/SpriteArt.tsx"); const c = m.allyIdleCell("toto"); const r = await fetch(c.src); return { ...c, status: r.status }; });
ok("새 동료 공유 카드 = 전투 시트 대기 칸", cell.src.includes("anim/allies/toto.webp") && cell.status === 200 && cell.cols === 8 && cell.rows === 4, JSON.stringify(cell));
ok("페이지 오류 없음", errors.length === 0, errors.join(" | "));

await browser.close();
for (const [s, n, d] of results) console.log(`${s} ${n}${d ? ` — ${d}` : ""}`);
const fail = results.filter((r) => r[0] === "FAIL").length;
console.log(fail ? `${fail} FAIL` : "ALL PASS");
process.exit(fail ? 1 : 0);
