/**
 * 해금 계단 화면 (2026-11-13, 정리 목표 3 · 4) — 실제 해금 규칙(test-phase=0 · qa-mode=0)으로   node scripts/verify-ladder-ui.mjs [캡처 폴더]
 * (vite dev 서버 필요 · BASE 로 바꿀 수 있다)
 *  2층: 동료 · 모험 · 상점 · 스킬 · 유물이 잠겨 흐리다 · 눌러도 그 탭으로 안 가고 "STAGE n 에서 열림" · 퀘스트는 열림 ·
 *       다음 목표 한 줄 = 다음 계단(STAGE 3 · 동료) · 환생 단추 없음 · 우편함에 승급전 · 핫타임 · 긴급 의뢰 없음
 *  5층: 모험이 열리고 성문 방어 카드는 열림 · 비트는 'STAGE 10' 잠금 · 카드마다 '얻는 것' · 맨 위 중심 루프 한 줄
 *  16층: 상점이 열린다
 */
import { launchBrowser } from "./launch-browser.mjs";
const OUT = process.argv[2], BASE = process.env.BASE ?? "http://localhost:5173", H = "mock-local-dev";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = []; const ok = (n, c, d = "") => results.push([c ? "PASS" : "FAIL", n, d]);
const browser = await launchBrowser({ args: ["--no-sandbox", "--disable-gpu"] });
const page = await browser.newPage();
const errors = []; page.on("pageerror", (e) => errors.push(String(e.message).slice(0, 200)));
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const today = new Date().toLocaleDateString("sv-SE");

async function boot(stage) {
  const now = Date.now();
  await page.goto(`${BASE}/favicon.png`, { waitUntil: "domcontentloaded" });
  await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); location.href = "/"; }, {
    "dodgebullets:test-phase": "0", "dodgebullets:qa-mode": "0", "dodge-bullets:soundEnabled": "0",
    [`dodgebullets:progression:v1:${H}`]: JSON.stringify({ version: 5, unitRev: 1, onboardingStep: 4, level: 5, titanBestStage: stage, dodgeBestStage: 0, pioneeredArea: 1, idleClaimedAt: now, updatedAt: now, partyIds: [], partyCap: 4, sessionCount: 3, ladderSeen: 99, claimedRewards: ["dodge-tutorial"] }),
    [`dodgebullets:titans:${H}`]: JSON.stringify({ gold: 100, stage, bestStage: stage, heroes: {}, lastActiveAt: now }),
    [`dodgebullets:attendance:v1:${H}`]: JSON.stringify({ lastClaimDate: today, totalDays: 1, consecutiveDays: 1 }),
  }).catch(() => {});
  await page.waitForNavigation({ waitUntil: "networkidle0" }).catch(() => {});
  await sleep(2200);
  for (let k = 0; k < 4; k += 1) { await page.evaluate(() => { const c = document.querySelector(".idle-claim"); if (c) { c.click(); return; } const b = [...document.querySelectorAll("button")].find((x) => /^(닫기|확인|나중에|받기)$/.test(x.textContent.trim())); b?.click(); }); await sleep(300); }
}
const nav = () => page.evaluate(() => Object.fromEntries([...document.querySelectorAll(".titans-bottom-nav button")].map((b) => [b.textContent.trim().replace(/\s+/g, ""), b.classList.contains("tab-locked")])));
const tabs = () => page.evaluate(() => Object.fromEntries([...document.querySelectorAll(".titans-growth-tabs button:not(.growth-drawer-close)")].map((b) => [b.textContent.trim().replace(/\s+/g, "").replace(/[0-9]/g, ""), b.classList.contains("tab-locked")])));
const clickNav = (label) => page.evaluate((l) => [...document.querySelectorAll(".titans-bottom-nav button")].find((b) => b.textContent.includes(l))?.click(), label);

// ── 2층 ──
await boot(2);
const n2 = await nav(), t2 = await tabs();
ok("2층: 모험 · 동료 · 상점 잠김 · 사냥터 · 설정 열림", n2["모험"] && n2["동료"] && n2["상점"] && !n2["사냥터"] && !n2["설정"], JSON.stringify(n2));
ok("2층: 성장 탭 퀘스트 열림 · 스킬 · 유물 잠김", t2["퀘스트"] === false && t2["스킬"] && t2["유물"] && t2["장비성장"] === false, JSON.stringify(t2));
await clickNav("동료"); await sleep(300);
const leak = await page.evaluate(() => ({ toast: document.querySelector(".titans-toast")?.textContent ?? "", heroesOn: [...document.querySelectorAll(".titans-bottom-nav button")].find((b) => b.textContent.includes("동료"))?.classList.contains("on") }));
ok("2층: 동료를 눌러도 안 간다 · 'STAGE 3' 안내", !leak.heroesOn && /STAGE 3/.test(leak.toast), JSON.stringify(leak));
await clickNav("상점"); await sleep(300);
const leak2 = await page.evaluate(() => ({ toast: document.querySelector(".titans-toast")?.textContent ?? "", shop: !![...document.querySelectorAll(".titans-bottom-nav button")].find((b) => b.textContent.includes("상점"))?.classList.contains("on") }));   // 상점 단추가 켜졌는가(.titans-shop 은 사냥터 탭에도 있는 공통 판)
ok("2층: 상점도 안 열린다 · 'STAGE 16' 안내", !leak2.shop && /STAGE 16/.test(leak2.toast), JSON.stringify(leak2));
const g2 = await page.evaluate(() => ({ goal: [...document.querySelectorAll(".battle-alert-stack > .battle-alert")].map((b) => b.textContent.replace(/\s+/g, " ").trim()), rebirth: !!document.querySelector(".header-rebirth"), inbox: (window.__huntState?.()?.inbox ?? []).map((i) => i.key) }));
ok("2층: 다음 목표 한 줄 = 다음 계단(STAGE 3 · 동료)", g2.goal.length === 1 && /STAGE 3/.test(g2.goal[0]) && /동료/.test(g2.goal[0]), JSON.stringify(g2.goal));
ok("2층: 환생 단추 없음 · 우편함에 승급전 · 핫타임 · 긴급 의뢰 없음", !g2.rebirth && !g2.inbox.some((k) => /promo|hottime|urgent/.test(k)), JSON.stringify(g2));
if (OUT) await page.screenshot({ path: `${OUT}/ladder-s2.png` });

// ── 5층 ──
await boot(5);
const n5 = await nav();
ok("5층: 모험 열림 · 동료 열림 · 상점 잠김", !n5["모험"] && !n5["동료"] && n5["상점"], JSON.stringify(n5));
await clickNav("모험"); await sleep(700);
const hub = await page.evaluate(() => ({ core: document.querySelector(".hub-core-line")?.textContent ?? "", cards: [...document.querySelectorAll(".hub-card")].map((c) => ({ id: c.dataset.card, locked: c.classList.contains("tab-locked"), gives: c.dataset.gives ?? "", line: c.querySelector(".hub-remaining")?.textContent ?? "" })) }));
const card = (id) => hub.cards.find((c) => c.id === id);
ok("5층 모험: 맨 위 중심 루프 한 줄", /사냥터/.test(hub.core), hub.core);
const routine = await page.evaluate(() => [...document.querySelectorAll(".hub-routine > button")].map((b) => ({ t: b.textContent.trim().slice(0, 8), locked: b.classList.contains("tab-locked"), op: getComputedStyle(b).opacity })));
ok("5층 모험: 일일 퀘스트 · 시즌 패스는 이벤트 계단(16층) 전이라 흐리게 잠김", routine.length >= 2 && routine.every((r) => r.locked && Number(r.op) < 0.8), JSON.stringify(routine));
ok("5층 모험: 성문 방어 열림 · 비트는 STAGE 10 잠금", card("dodge") && !card("dodge").locked && card("beat")?.locked && /STAGE 10/.test(card("beat").line), JSON.stringify(hub.cards));
ok("5층 모험: 카드마다 얻는 것(data-gives — 글은 11-05 결정대로 두 줄)", hub.cards.length === 6 && hub.cards.every((c) => c.gives.length > 2), JSON.stringify(hub.cards.map((c) => c.gives)));
if (OUT) await page.screenshot({ path: `${OUT}/ladder-s5-hub.png` });

// ── 16층 ──
await boot(16);
const n16 = await nav();
ok("16층: 상점 열림", n16["상점"] === false, JSON.stringify(n16));
if (OUT) await page.screenshot({ path: `${OUT}/ladder-s16.png` });

ok("페이지 오류 없음", errors.length === 0, errors.join(" | "));
await browser.close();
let fails = 0;
for (const [st, n, d] of results) { console.log(`${st} ${n}${d && st === "FAIL" ? " — " + d : ""}`); if (st === "FAIL") fails += 1; }
console.log(fails ? `\n${fails} FAIL` : "\nALL PASS");
process.exit(fails ? 1 : 0);
