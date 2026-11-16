/**
 * 상위 동료 갖고 싶게 (2026-11-16) — 실제 화면 검사. BASE=http://localhost:5173 node scripts/verify-ally-desire.mjs   · 캡처: art-gen/out/desire-*.png
 *   1. 사냥터: 초월 · 신화 · 전설 · 영웅 편성 → 등급별 몸집(scale) · 시그니처 큰 폭발(sig-ult) · 전설 이상 컷인(동료별 9초 · 전체 3초 간격 · 누르기 안 막음)
 *   2. 새 동료 소개 화면(DEV 훅 __allyShowcase) — 이름 · 등급 · 기술 · 누르면 다음 · 마지막에 닫힘
 *   3. 상점 뽑기: 월간 한정 배너(창 안에서만) · 이벤트 상점 전용 장갑(창 안 · 안 가졌을 때만)
 */
import { launchBrowser } from "./launch-browser.mjs";
const BASE = process.env.BASE ?? "http://localhost:5173", H = "mock-local-dev", now = Date.now();
const IN_WINDOW = now >= Date.parse("2026-11-16T00:00:00+09:00") && now < Date.parse("2026-12-16T00:00:00+09:00");   // titans/limitedAllies 첫 줄과 같은 창
const browser = await launchBrowser({ args: ["--no-sandbox"] });
const page = await browser.newPage();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = []; page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
await page.goto(BASE, { waitUntil: "networkidle0" });
let fails = 0; const ok = (n, c, d = "") => { console.log(`${c ? "PASS" : "FAIL"} ${n}${d ? " — " + d : ""}`); if (!c) fails += 1; };
const clickText = (sel, text) => page.evaluate(({ sel, text }) => { const el = [...document.querySelectorAll(sel)].find((b) => b.textContent.trim().includes(text)); el?.click(); return !!el; }, { sel, text });
const closeModals = () => page.evaluate(() => { for (let k = 0; k < 5; k += 1) { const c = document.querySelector(".idle-claim"); if (c) { c.click(); continue; } const b = [...document.querySelectorAll("button")].filter((x) => !x.closest(".titans-bottom-nav")).find((x) => /^(닫기|확인|나중에)$/.test(x.textContent.trim())); if (b) b.click(); } });
const PARTY = ["celes", "titan", "ari", "storm"];
const seed = async () => {
  await page.goto(`${BASE}/favicon.png`, { waitUntil: "domcontentloaded" });
  await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); location.href = "/"; }, {
    [`dodgebullets:progression:v1:${H}`]: JSON.stringify({ version: 5, level: 20, redGems: 500, eventCoins: 300, idleClaimedAt: now, updatedAt: now, onboardingStep: 4, sessionCount: 12, partyIds: PARTY, partyCap: 4, titanBestStage: 30, claimedRewards: ["dodge-tutorial"], pioneeredArea: 5, discoverySeeded: true, discovered: PARTY.map((id) => `ally:${id}`), ownedGear: [] }),
    [`dodgebullets:titans:${H}`]: JSON.stringify({ gold: 5000, stage: 18, bestStage: 30, totalKills: 900, heroes: { celes: 40, titan: 40, ari: 40, storm: 40, mia: 1 }, lastActiveAt: now }),
    [`dodgebullets:attendance:v1:${H}`]: JSON.stringify({ lastClaimDate: new Date().toLocaleDateString("sv-SE"), totalDays: 3, consecutiveDays: 3 }),
    "dodge-bullets:soundEnabled": "0",
  });
  await page.waitForNavigation({ waitUntil: "networkidle0" }).catch(() => {}); await sleep(1500);
};

// ── 1. 사냥터 ──
await seed();
await closeModals(); await sleep(400);
await page.evaluate(() => {
  window.__ultN = 0; window.__cutSeen = [];
  new MutationObserver((ms) => { for (const m of ms) for (const n of m.addedNodes) if (n instanceof Element) {
    if (n.matches?.(".titans-fx-burst.sig-ult")) window.__ultN += 1;
    if (n.matches?.(".ally-cutin")) window.__cutSeen.push({ t: performance.now(), id: n.dataset.ally, pe: getComputedStyle(n).pointerEvents });
  } }).observe(document.querySelector(".titans-field") ?? document.body, { childList: true, subtree: true });
});
const scale = await page.evaluate(() => Object.fromEntries(["celes", "titan", "ari", "storm"].map((id) => [id, getComputedStyle(document.querySelector(`.titans-allies .ally-${id} .ally-body`) ?? document.body).scale])));
ok("전장 몸집: 초월 1.2 · 신화 1.12 · 전설 1.05 · 영웅 그대로", scale.celes === "1.2" && scale.titan === "1.12" && scale.ari === "1.05" && (scale.storm === "none" || scale.storm === "1"), JSON.stringify(scale));
let shot = false;
for (let i = 0; i < 120; i += 1) {
  await page.keyboard.press("Space"); await sleep(200);
  if (!shot && (await page.$(".ally-cutin"))) { await sleep(180); await page.screenshot({ path: "art-gen/out/desire-cutin.png" }); shot = true; }
}
const seen = await page.evaluate(() => ({ ult: window.__ultN, cut: window.__cutSeen, log: window.__allyCutLog ?? [] }));
ok("시그니처 큰 폭발(sig-ult)이 뜬다", seen.ult >= 2, `${seen.ult}번`);
ok("전설 이상 컷인이 뜬다 · 영웅(스톰)은 컷인 없음 · 누르기를 막지 않는다", seen.cut.length >= 1 && seen.cut.every((c) => c.id !== "storm" && c.pe === "none"), JSON.stringify(seen.cut.map((c) => c.id)));
const gaps = seen.log.slice(1).map((c, i) => c.t - seen.log[i].t);
const perAlly = Object.values(seen.log.reduce((m, c) => ((m[c.id] ??= []).push(c.t), m), {})).flatMap((ts) => ts.slice(1).map((t, i) => t - ts[i]));
ok("컷인 간격: 아무 동료든 3초 이상 · 같은 동료 9초 이상(도배 없음)", gaps.every((g) => g >= 2990) && perAlly.every((g) => g >= 8990), `전체 ${gaps.map((g) => (g / 1000).toFixed(1)).join(",")} · 동료별 ${perAlly.map((g) => (g / 1000).toFixed(1)).join(",")}`);
ok("컷인 캡처(art-gen/out/desire-cutin.png)", shot);

// ── 2. 새 동료 소개 ──
await page.evaluate(() => window.__allyShowcase?.(["celes", "titan"])); await sleep(700);
const sc1 = await page.evaluate(() => ({ on: !!document.querySelector(".ally-showcase"), ally: document.querySelector(".ally-showcase")?.dataset.ally, tier: document.querySelector(".ally-showcase")?.dataset.tier, name: document.querySelector(".ally-showcase-name")?.textContent, move: document.querySelector(".ally-showcase-move b")?.textContent, skip: !!document.querySelector(".ally-showcase-skip"), next: document.querySelector(".ally-showcase-next")?.textContent }));
ok("소개 화면: 초월 셀레스 · 이름 · 기술 · '1명 더' · 모두 넘기기 단추", sc1.on && sc1.ally === "celes" && sc1.tier === "LR" && !!sc1.name && !!sc1.move && sc1.skip && /1명 더/.test(sc1.next ?? ""), JSON.stringify(sc1));
await page.screenshot({ path: "art-gen/out/desire-showcase.png" });
await page.evaluate(() => document.querySelector(".ally-showcase")?.click()); await sleep(500);
const sc2 = await page.evaluate(() => ({ ally: document.querySelector(".ally-showcase")?.dataset.ally, skip: !!document.querySelector(".ally-showcase-skip"), next: document.querySelector(".ally-showcase-next")?.textContent }));
ok("누르면 다음(타이탄) · 마지막엔 넘기기 단추 없음 · '눌러서 닫기'", sc2.ally === "titan" && !sc2.skip && /닫기/.test(sc2.next ?? ""), JSON.stringify(sc2));
await page.evaluate(() => document.querySelector(".ally-showcase")?.click()); await sleep(400);
ok("마지막을 누르면 닫힌다", await page.evaluate(() => !document.querySelector(".ally-showcase")));
const lay = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth }));
ok("390px 가로 넘침 없음", lay.sw <= 390, JSON.stringify(lay));

// ── 3. 월간 한정 — 뽑기 배너 · 이벤트 상점 ──
await clickText(".titans-bottom-nav button", "상점"); await sleep(400); await clickText(".hub-sheet-switch button", "뽑기"); await sleep(300); await clickText(".shop-sub-tabs button", "동료"); await sleep(700);
const banner = await page.evaluate(() => { const b = document.querySelector(".limited-banner"); return b ? { ally: b.dataset.limited, text: b.textContent, w: b.getBoundingClientRect().width, over: b.scrollWidth > b.clientWidth + 1 } : null; });
if (IN_WINDOW) {
  ok("창 안: 뽑기 맨 위 한정 배너 — 단풍 사냥꾼 오텀 · 남은 일수 · 대장 전용 · 확률", !!banner && banner.ally === "autumn" && /오텀/.test(banner.text) && /일 남음/.test(banner.text) && /대장 전용/.test(banner.text) && /확률 \d+\.\d\d%/.test(banner.text) && !banner.over, JSON.stringify(banner));
  await page.evaluate(() => document.querySelector(".limited-banner")?.scrollIntoView({ block: "center" })); await sleep(300);
  await page.screenshot({ path: "art-gen/out/desire-limited-banner.png" });
} else ok("창 밖: 한정 배너 없음", !banner);
await clickText(".hub-sheet-switch button", "이벤트"); await sleep(500);
const gearCard = await page.evaluate(() => [...document.querySelectorAll(".event-offer-card")].find((c) => /단풍 사냥꾼 장갑/.test(c.textContent))?.textContent ?? null);
ok(IN_WINDOW ? "창 안: 이벤트 상점에 전용 장갑(이벤트 코인)" : "창 밖: 전용 장갑 진열 없음", IN_WINDOW ? !!gearCard && /100/.test(gearCard) : !gearCard, gearCard ?? "(없음)");

ok("페이지 오류 없음", errors.length === 0, errors.join(" | "));
await browser.close();
console.log(fails ? `\n${fails} FAIL` : "\nALL PASS");
process.exit(fails ? 1 : 0);
