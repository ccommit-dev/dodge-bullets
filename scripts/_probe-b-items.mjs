// 2026-10-27 B 몫 확인 — ⑦ 몬스터 쓰러짐 같은 시트 · ⑧ 대장의 반격(원정대 체력 · 피해 · 쓰러지면 실패) · ⑨ 균열 주인공 크기 · ⑩ 주간 도전 공격 모션 + 스킵
// ⑪ 비트 메뉴(커스텀 없음 · 곡 목록 위) · ⑫ 파견 출정 팝업 · ⑬ 자동 강화 스위치 오른쪽 · ⑭ 귀환 정산 단순
//   node scripts/_probe-b-items.mjs [outDir]   (vite 5173)
import { launchBrowser } from "./launch-browser.mjs";
const OUT = process.argv[2]; const BASE = "http://localhost:5173", H = "mock-local-dev";
const browser = await launchBrowser({ args: ["--no-sandbox"] }); const page = await browser.newPage(); const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = []; page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.goto(BASE, { waitUntil: "networkidle0" });
let fails = 0; const ok = (n, c, d = "") => { console.log(`${c ? "PASS" : "FAIL"} ${n}${d ? " — " + d : ""}`); if (!c) fails += 1; };
const today = new Date().toLocaleDateString("sv-SE");
const seed = async ({ progress = {}, titans = {}, extra = {} } = {}) => {
  const now = Date.now();
  const p = { version: 5, level: 30, redGems: 1000, sharedCoins: 1_000_000, idleClaimedAt: now, updatedAt: now, onboardingStep: 4, sessionCount: 9, partyIds: ["mia", "leon"], partyCap: 4, claimedRewards: ["dodge-tutorial", "welcome-gift", "surprise-gift"], pioneeredArea: 5, discoverySeeded: true, discovered: [], titanBestStage: 30, ...progress };
  const t = { gold: 50000, stage: 8, bestStage: 8, heroes: { mia: 20, leon: 20 }, lastActiveAt: now, ...titans };
  const s = { [`dodgebullets:progression:v1:${H}`]: JSON.stringify(p), [`dodgebullets:titans:${H}`]: JSON.stringify(t), [`dodgebullets:attendance:v1:${H}`]: JSON.stringify({ lastClaimDate: today, totalDays: 3, consecutiveDays: 3 }), "dodge-bullets:soundEnabled": "0", "dodgebullets:test-phase": "0", "dodgebullets:guide-seen:v1": "1", ...extra };
  await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); }, s);
  await page.reload({ waitUntil: "networkidle0" }); await sleep(1300);
};
const close = () => page.evaluate(() => { for (let k = 0; k < 5; k += 1) { const c = document.querySelector(".idle-claim"); if (c) { c.click(); continue; } const b = [...document.querySelectorAll("button")].filter((x) => !x.closest(".titans-bottom-nav")).find((x) => /^(닫기|확인|나중에)$/.test(x.textContent.trim())); if (b) b.click(); } });
const clickText = (sel, re) => page.evaluate(({ sel, re }) => { const el = [...document.querySelectorAll(sel)].find((b) => new RegExp(re).test(b.textContent.trim())); el?.click(); return !!el; }, { sel, re });
const shot = (n) => OUT ? page.screenshot({ path: `${OUT}/b-${n}.png` }) : null;

// ⑭ 귀환 정산 — 9시간 전 마지막 접속
await seed({ titans: { lastActiveAt: Date.now() - 9 * 3600e3 }, progress: { idleClaimedAt: Date.now() - 9 * 3600e3 } });
await sleep(800);
const idle = await page.evaluate(() => ({ simple: !!document.querySelector(".idle-modal.idle-simple"), loot: document.querySelectorAll(".idle-loot article").length, clutter: document.querySelectorAll(".idle-factors, .idle-bottleneck, .idle-forge-cta, .idle-rays, .idle-crest").length, claim: document.querySelector(".idle-claim")?.textContent.trim(), h: Math.round(document.querySelector(".idle-card")?.getBoundingClientRect().height ?? 0) }));
await shot("idle");
ok("⑭ 귀환 정산 단순(받은 것 · 받기 · 막대/병목/바로가기 없음)", idle.simple && idle.loot >= 2 && idle.clutter === 0 && idle.claim === "받기", JSON.stringify(idle));
await close();

// ⑬ 자동 강화 스위치는 오른쪽
await clickText(".titans-growth-tabs button", "^장비 성장"); await sleep(400);
const tg = await page.evaluate(() => { const t = document.querySelector(".auto-train-toggle"); if (!t) return null; const r = t.getBoundingClientRect(), sw = t.querySelector(":scope > i").getBoundingClientRect(), tx = t.querySelector(":scope > b").getBoundingClientRect(); return { swRight: Math.round(r.right - sw.right), swLeftOfText: sw.left < tx.left }; });
ok("⑬ 자동 강화 스위치가 오른쪽 끝(글 오른쪽)", tg && !tg.swLeftOfText && tg.swRight < 30, JSON.stringify(tg));

// ⑦ 몬스터 쓰러짐 — 서랍을 닫은 사냥터에서 실제 처치를 여러 번 본다. 2판 시트 몬스터는 옛 처치 그림(-defeat.png)을 붙이지 않는다
await seed({ titans: { stage: 8, bestStage: 8, heroes: { mia: 20, leon: 20 } } });
await close();
await page.evaluate(() => { window.__defeat = []; const t0 = performance.now(); const f = () => { const a = document.querySelector(".titans-monster .titan-monster-art.frame-defeat"); if (a) window.__defeat.push({ anim2: a.classList.contains("anim2") || a.classList.contains("has-frames"), sameSheet: !a.querySelector("img[src*='-defeat.png']") && !!a.querySelector(".monster-frames") }); if (performance.now() - t0 < 8000) requestAnimationFrame(f); }; f(); });
await sleep(8200);
const defeatFrames = await page.evaluate(() => window.__defeat);
const sheetDefeats = defeatFrames.filter((x) => x.anim2);
ok("⑦ 쓰러지는 몬스터가 같은 시트(피격 칸) — 옛 처치 그림 없음", sheetDefeats.length >= 5 && sheetDefeats.every((x) => x.sameSheet), `쓰러짐 프레임 ${defeatFrames.length} · 시트 몬스터 ${sheetDefeats.length} · 같은 시트 ${sheetDefeats.filter((x) => x.sameSheet).length}`);

// ⑧ 대장의 반격 — 약한 원정대로 높은 층 대장 → 체력이 깎이고 0 이면 "원정대가 쓰러졌다"
await seed({ titans: { stage: 60, bestStage: 60, heroes: { mia: 3, leon: 3 } }, progress: { titanBestStage: 60, pioneeredArea: 5 } });
await close();
await page.evaluate((H) => { const t = JSON.parse(localStorage.getItem(`dodgebullets:titans:${H}`)); void t; }, H);
const toasts = []; await page.exposeFunction("__toast", (t) => toasts.push(t));
await page.evaluate(() => new MutationObserver((ms) => { for (const m of ms) for (const n of m.addedNodes) if (n instanceof Element && n.matches(".titans-toast")) window.__toast(n.textContent); }).observe(document.body, { childList: true, subtree: true }));
// 10마리 잡을 때까지 기다리지 않고 대장 도전 단추가 뜨면 누른다 — 약한 원정대라 일반 몬스터도 느리니 진행을 강제로 당긴다
await sleep(1500);
await page.evaluate(() => window.__huntStartBoss?.());   // DEV 훅 — 일반 몬스터 10마리를 건너뛰고 대장전
let bossSeen = false, hpDrops = [], floats = 0;
for (let i = 0; i < 200; i += 1) {
  const st = await page.evaluate(() => ({ btn: !!document.querySelector(".titans-boss-challenge"), hp: document.querySelector(".titans-party-hp em")?.style.width ?? null, fl: document.querySelectorAll(".party-dmg-float.boss").length }));
  if (st.hp !== null) { bossSeen = true; const v = parseFloat(st.hp); if (hpDrops[hpDrops.length - 1] !== v) hpDrops.push(v); }
  floats += st.fl;
  if (toasts.some((t) => /원정대가 쓰러졌다/.test(t))) break;
  await sleep(150);
}
await shot("boss-pressure");
ok("⑧ 대장전에 원정대 체력 막대 · 공격마다 줄어든다 · 피해 숫자", bossSeen && hpDrops.length >= 3 && hpDrops[hpDrops.length - 1] < hpDrops[0] && floats > 0, `hp ${hpDrops.slice(0, 8).map((v) => Math.round(v)).join("→")} · 숫자 ${floats}`);
ok("⑧ 약한 원정대는 원정대가 쓰러져 대장 도전 실패", toasts.some((t) => /원정대가 쓰러졌다/.test(t)), toasts.slice(-3).join(" | "));

// ⑫ 파견 출정 팝업
await seed({ titans: { heroes: { mia: 20, leon: 20, sera: 10 } } });
await close();
await clickText(".titans-bottom-nav button", "모험"); await sleep(500);
await page.evaluate(() => document.querySelector('.hub-card[data-card="expedition"]')?.click()); await sleep(700);
await page.evaluate(() => [...document.querySelectorAll('.expedition-ally[data-ally="sera"] .expedition-hours button')].find((b) => b.textContent.includes("4시간"))?.click());
await sleep(500);
const pop = await page.evaluate(() => ({ pop: !!document.querySelector(".expedition-send-pop"), text: document.querySelector(".expedition-send-card b")?.textContent, walker: !!document.querySelector(".expedition-send-walker .titan-ally-art") }));
await shot("expedition-pop");
await sleep(1500);
ok("⑫ 파견 출정 → 동료가 걸어 나가는 팝업 · 1.6초 뒤 닫힘", pop.pop && /파견 출발/.test(pop.text ?? "") && pop.walker && !(await page.$(".expedition-send-pop")), JSON.stringify(pop));

// ⑪ 비트 메뉴 — 커스텀 없음 · 곡 목록이 랭킹보다 위 · 첫 화면 안
await page.evaluate(() => document.querySelector(".hub-sheet-close")?.click()); await sleep(300);
await clickText(".titans-bottom-nav button", "모험"); await sleep(400);
await page.evaluate(() => document.querySelector('.hub-card[data-card="beat"]')?.click()); await sleep(2200);
const bm = await page.evaluate(() => { const list = document.querySelector(".schedule-list"), rank = document.querySelector(".beat-rank-panel"); return { custom: !!document.querySelector(".beat-custom"), listTop: Math.round(list?.getBoundingClientRect().top ?? -1), before: !!list && !!rank && (list.compareDocumentPosition(rank) & Node.DOCUMENT_POSITION_FOLLOWING) > 0, vh: innerHeight }; });
await shot("beat-menu");
ok("⑪ 비트 메뉴: 커스텀 상점 없음 · 곡 목록이 랭킹 위 · 첫 화면 안에서 시작", !bm.custom && bm.before && bm.listTop > 0 && bm.listTop < bm.vh * 0.6, JSON.stringify(bm));

// ⑩ 주간 도전 — 실제 공격 모션 · 스킵
await seed();
await close();
await clickText(".titans-bottom-nav button", "모험"); await sleep(400);
await page.evaluate(() => document.querySelector('.hub-card[data-card="rift"]')?.click()); await sleep(900);
await clickText(".event-tabs button", "주간 도전"); await sleep(500);
await page.evaluate(() => [...document.querySelectorAll(".shadow-list button")].find((b) => b.textContent.trim() === "도전")?.click());
let strikes = 0, hurts = 0;
for (let i = 0; i < 16; i += 1) { const s = await page.evaluate(() => ({ st: document.querySelectorAll(".duel-fighter.striking").length, hu: document.querySelectorAll(".duel-fighter.hurt").length, fl: document.querySelectorAll(".duel-float").length })); strikes += s.st; hurts += s.hu; await sleep(120); }
await shot("duel");
const skip = await page.$(".duel-skip");
if (skip) await page.evaluate(() => document.querySelector(".duel-skip")?.click());
await sleep(200);
const duelDone = await page.evaluate(() => ({ done: !!document.querySelector(".duel-fight.is-done"), vs: document.querySelector(".duel-vs")?.textContent }));
ok("⑩ 주간 도전: 실제로 번갈아 공격(덤빔 · 맞음)", strikes > 0 && hurts > 0, `strike ${strikes} · hurt ${hurts}`);
ok("⑩ 오른쪽 위 스킵 → 바로 결과(승리/패배)", !!skip && duelDone.done && /승리|패배/.test(duelDone.vs ?? ""), JSON.stringify(duelDone));
await page.evaluate(() => document.querySelector(".duel-overlay")?.click()); await sleep(400);

// ⑨ 균열 주인공 크기 — 동료 대비
await clickText(".event-tabs button", "차원 균열"); await sleep(400);
await page.evaluate(() => [...document.querySelectorAll(".cta")].find((b) => /균열 진입/.test(b.textContent))?.click());
await sleep(1600);
const rift = await page.evaluate(() => { const hero = document.querySelector(".rift-hero .equipped-character, .rift-hero"); const ally = document.querySelector(".rift-run-party .titan-ally-art"); const bb = (el) => { if (!el) return null; const imgs = [...el.querySelectorAll("img, canvas, i, span")].map((x) => x.getBoundingClientRect()).filter((r) => r.width > 4 && r.height > 4); const r = el.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), maxInnerH: Math.round(Math.max(0, ...imgs.map((x) => x.height))) }; }; return { hero: bb(hero), ally: bb(ally) }; });
await shot("rift");
console.log("⑨ rift sizes", JSON.stringify(rift));
ok("페이지 오류 없음", errors.length === 0, errors.slice(0, 3).join(" / "));
console.log(fails ? `${fails} FAIL` : "ALL PASS");
await browser.close(); process.exit(fails ? 1 : 0);
