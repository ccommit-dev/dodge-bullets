/**
 * 사냥터 긴급 의뢰 화면 (2026-11-11, titans/urgent.ts · UrgentPoster.tsx)
 *   node scripts/verify-urgent-ui.mjs [캡처 폴더]   (vite dev 서버 5173 필요)
 * 오늘 첫 사냥이면 딱지가 붙는다 → 전단 → 도전 → 현상범(같은 지역의 다른 대장 · 짧은 시간) → 잡으면 보상 · 싸우던 처치 수로 돌아온다.
 * 지면 잃는 것 없이 다시 도전할 수 있다 · 마감이 지나면 딱지가 사라진다 · 5층 전에는 안 붙는다.
 */
import { launchBrowser } from "./launch-browser.mjs";
const OUT = process.argv[2], BASE = "http://localhost:5173", H = "mock-local-dev";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = []; const ok = (n, c, d = "") => results.push([c ? "PASS" : "FAIL", n, d]);
const browser = await launchBrowser({ args: ["--no-sandbox", "--disable-gpu"] });
const page = await browser.newPage();
const errors = []; page.on("pageerror", (e) => errors.push(String(e.message).slice(0, 200)));
const today = new Date().toLocaleDateString("sv-SE");

async function boot({ w = 390, h = 844, stage = 8, heroLv = 60, urgent, gold = 1000 }) {
  const now = Date.now(), party = ["mia", "leon"];
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.goto(`${BASE}/favicon.png`, { waitUntil: "domcontentloaded" });
  await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); location.href = "/"; }, {
    [`dodgebullets:progression:v1:${H}`]: JSON.stringify({ version: 5, unitRev: 1, onboardingStep: 4, level: 40, redGems: 500, enhancementMaterials: 10, eventCoins: 0, titanBestStage: stage, pioneeredArea: 5, idleClaimedAt: now, updatedAt: now, partyIds: party, partyCap: 4, sessionCount: 9, claimedRewards: ["dodge-tutorial", "welcome-gift", "surprise-gift"], discoverySeeded: true }),
    [`dodgebullets:titans:${H}`]: JSON.stringify({ stage, bestStage: stage, gold, heroes: { mia: heroLv, leon: heroLv }, party, lastActiveAt: now, ...(urgent ? { urgent } : {}) }),
    [`dodgebullets:attendance:v1:${H}`]: JSON.stringify({ lastClaimDate: today, totalDays: 3, consecutiveDays: 3 }),
    "dodge-bullets:soundEnabled": "0", "dodgebullets:test-phase": "0",
  }).catch(() => {});
  await page.waitForNavigation({ waitUntil: "networkidle0" }).catch(() => {});
  await sleep(900);
  for (let i = 0; i < 3; i += 1) { await page.evaluate(() => { document.querySelector(".rebalance-modal")?.click(); document.querySelector(".idle-claim")?.click(); }); await sleep(200); }
}
const titans = () => page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? "{}"), `dodgebullets:titans:${H}`);
const progress = () => page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? "{}"), `dodgebullets:progression:v1:${H}`);
const hunt = () => page.evaluate(() => window.__huntState?.());
const look = () => page.evaluate(() => {
  const q = (s) => document.querySelector(s);
  const badge = q(".urgent-badge"), field = q(".titans-field");
  const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return { x: Math.round(b.left), y: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height), r: Math.round(b.right), b: Math.round(b.bottom) }; };
  return {
    badge: r(badge), badgeText: badge?.textContent.trim() ?? null, badgeLast: !!badge?.classList.contains("is-last"),
    field: r(field), alert: r(q(".battle-alert-stack > .battle-alert")), stagebar: r(q(".titans-stagebar.in-field")), strip: r(q(".idle-status-strip")),
    poster: !!q(".urgent-poster"), h1: q(".titans-stagebar.in-field h1")?.textContent.replace(/\s+/g, " ").trim() ?? "",
    timer: q(".titans-boss-timer")?.textContent.trim() ?? null, banner: q(".titans-clear-banner")?.textContent.trim() ?? null,
    art: q(".titans-monster .monster-asset-current")?.dataset.src ?? "", fieldClass: field?.className ?? "",
    pop: q(".reward-pop")?.textContent ?? null, toast: q(".titans-toast")?.textContent ?? null, bossBtn: !!q(".titans-boss-challenge"),
  };
});
const waitFor = async (fn, ms = 8000, step = 100) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = await fn(); if (v) return v; await sleep(step); } return null; };
const shot = async (name) => { if (OUT) await page.screenshot({ path: `${OUT}/${name}.png` }); };
const clickBadge = () => page.evaluate(() => document.querySelector(".urgent-badge")?.click());
/** 전투 중일 때만 도전이 눌린다 — 몬스터가 쓰러지는 칸을 피해 기다렸다 누른다 */
const clickGo = () => waitFor(() => page.evaluate(() => { const b = document.querySelector(".urgent-go"); if (!b || b.disabled) return false; b.click(); return true; }), 6000, 40);

// ── 1. 오늘 첫 사냥 → 딱지 → 전단 ──
await boot({ stage: 8 });
const s1 = await waitFor(async () => { const l = await look(); return l.badge ? l : null; }, 5000);
ok("오늘 첫 사냥이면 딱지가 붙는다", !!s1, JSON.stringify(s1?.badgeText));
const sv1 = await titans();
ok("저장에 오늘 의뢰가 적힌다", sv1.urgent?.day === today && typeof sv1.urgent?.issued?.login === "number" && (sv1.urgent?.done ?? []).length === 0, JSON.stringify(sv1.urgent));
ok("딱지에는 남은 시간 (14분대)", /^1[45]:\d\d$/.test(s1?.badgeText ?? ""), String(s1?.badgeText));
ok("딱지는 전장 안 · 알림 줄 왼쪽 · 44px 이상 넓이", !!s1 && s1.badge.x >= s1.field.x && s1.badge.b <= s1.field.b && s1.badge.w >= 44 && (!s1.alert || s1.badge.r <= s1.alert.x), JSON.stringify({ badge: s1?.badge, alert: s1?.alert }));
ok("딱지가 위 줄(판 · 자동 사냥)을 덮지 않는다", !!s1 && (!s1.stagebar || s1.badge.y >= s1.stagebar.b - 1 || s1.badge.x >= s1.stagebar.r) && (!s1.strip || s1.badge.y >= s1.strip.b - 1 || s1.badge.r <= s1.strip.x || s1.badge.x >= s1.strip.r), JSON.stringify({ badge: s1?.badge, stagebar: s1?.stagebar, strip: s1?.strip }));
await shot("1-badge");
await clickBadge(); await sleep(250);
const poster = await page.evaluate(() => {
  const p = document.querySelector(".urgent-poster"); if (!p) return null;
  const b = p.getBoundingClientRect(), img = p.querySelector(".urgent-portrait img");
  const fonts = [...p.querySelectorAll("*")].filter((el) => el.children.length === 0 && el.textContent.trim()).map((el) => parseFloat(getComputedStyle(el).fontSize));
  return {
    name: p.querySelector(".urgent-name")?.textContent, rule: p.querySelector(".urgent-rule")?.textContent, gold: p.querySelector('[data-urgent="gold"]')?.textContent,
    stones: p.querySelector('[data-urgent="stones"]')?.textContent, coins: p.querySelector('[data-urgent="coins"]')?.textContent, left: p.querySelector('[data-urgent="left"]')?.textContent,
    rows: [...p.querySelectorAll(".urgent-today li")].map((li) => `${li.className}:${li.textContent}`), go: p.querySelector(".urgent-go")?.textContent,
    inView: b.left >= 0 && b.right <= innerWidth && b.top >= 0 && b.bottom <= innerHeight, minFont: Math.min(...fonts),
    imgOk: !!img && img.complete && img.naturalWidth > 0, imgSrc: img?.getAttribute("src") ?? "",
    stoneOk: (() => { const s = p.querySelector(".urgent-reward img"); return !!s && s.complete && s.naturalWidth > 0; })(),
  };
});
ok("딱지를 누르면 전단", !!poster, JSON.stringify(poster));
// 어느 얼굴인지(같은 지역의 다른 대장)는 노드 검사 verify-urgent 가 본다 — 여기서는 전단 · 전장이 같은 얼굴을 쓰는지
const faceArt = (poster?.imgSrc ?? "").split("/").pop().replace(".webp", "");
ok("전단에 현상범 이름 · 초상", !!poster?.name && faceArt.length > 2, `${poster?.name} · ${poster?.imgSrc}`);
ok("초상 · 강화석 그림이 뜬다", !!poster?.imgOk && !!poster?.stoneOk);
ok("규칙 한 줄: 지금 층 · 20초", /STAGE 8/.test(poster?.rule ?? "") && /20초/.test(poster?.rule ?? ""), String(poster?.rule));
ok("보상 셋: 골드 · 강화석 3 · 이벤트 코인 5", !!poster?.gold && poster?.stones === "3" && poster?.coins === "5", JSON.stringify([poster?.gold, poster?.stones, poster?.coins]));
ok("오늘의 의뢰 세 줄 — 첫 줄만 도전 가능", poster?.rows?.length === 3 && /is-open/.test(poster.rows[0]) && /is-none/.test(poster.rows[1]) && /is-none/.test(poster.rows[2]) && /0\/3/.test(poster.rows[2]), JSON.stringify(poster?.rows));
ok("전단이 화면 안 · 글자 11px 이상", !!poster?.inView && poster?.minFont >= 11, `${poster?.inView} · ${poster?.minFont}`);
await shot("2-poster");

// ── 2. 도전 → 현상범 → 처치 ──
const before = { t: await titans(), p: await progress(), wave: (await look()).h1 };
const went = await clickGo();
ok("도전을 누른다", !!went);
const fight = await waitFor(async () => { const h = await hunt(); return h?.urgent === "login" && h.phase === "combat" ? h : null; }, 6000, 40);
const mid = await look();
ok("현상범과 싸운다", !!fight && fight.boss === true, JSON.stringify(fight && { urgent: fight.urgent, boss: fight.boss, phase: fight.phase }));
ok("판 제목 · 제한 시간이 의뢰용", mid.h1 === "긴급 의뢰" && /^현상범 \d+\.\ds$/.test(mid.timer ?? "") && parseFloat((mid.timer ?? "").replace("현상범 ", "")) <= 20, `${mid.h1} · ${mid.timer}`);
ok("전장 그림도 전단의 그 얼굴", mid.art.includes(`/${faceArt}.png`) && /is-urgent/.test(mid.fieldClass), `${mid.art} · ${faceArt}`);
ok("싸우는 동안 딱지 · 전단 · 대장 단추는 없다", !mid.badge && !mid.poster && !mid.bossBtn);
// 걸어 들어온 뒤(대열이 자리 잡은 뒤) — 현상범이 대장 자리에 서고 전장 밖으로 잘리지 않는다
const stood = await waitFor(async () => { const h = await hunt(); return h?.urgent === "login" && h.formation ? h : null; }, 6000, 40);
await sleep(250);
const body = await page.evaluate(() => {
  const f = document.querySelector(".titans-field").getBoundingClientRect(), m = document.querySelector(".titans-monster .titan-monster-art");
  const b = m?.getBoundingClientRect();
  return b ? { l: Math.round(b.left - f.left), r: Math.round(f.right - b.right), w: Math.round(b.width), fw: Math.round(f.width) } : null;
});
ok("현상범이 자리에 서면 전장 안에 다 보인다", !!stood && !!body && body.l > 0 && body.r >= -2 && body.w >= 60, JSON.stringify(body));
await shot("3-fight");
const won = await waitFor(async () => { const h = await hunt(); return h && h.urgent === null && h.phase === "combat" ? h : null; }, 30000, 80);
ok("잡고 평소 사냥으로 돌아온다", !!won, JSON.stringify(won && { boss: won.boss, phase: won.phase }));
await sleep(400);
const after = { t: await titans(), p: await progress(), l: await look() };
ok("의뢰가 완료로 적힌다", (after.t.urgent?.done ?? []).join() === "login", JSON.stringify(after.t.urgent));
ok("강화석 +3 · 이벤트 코인 +5", after.p.enhancementMaterials - before.p.enhancementMaterials === 3 && after.p.eventCoins - before.p.eventCoins >= 5, `${after.p.enhancementMaterials - before.p.enhancementMaterials} · ${after.p.eventCoins - before.p.eventCoins}`);
ok("골드가 오른다 (지금 층 다섯 바퀴 이상)", after.t.gold - before.t.gold >= 1000, String(after.t.gold - before.t.gold));
ok("층 · 최고 층은 그대로", after.t.stage === before.t.stage && after.t.bestStage === before.t.bestStage, `${after.t.stage}/${after.t.bestStage}`);
ok("판 제목이 처치 수로 돌아온다", /^STAGE 8/.test(after.l.h1), after.l.h1);
ok("잡은 뒤에는 딱지가 없다", !after.l.badge);
await shot("4-won");

// ── 3. 지면 잃는 것 없이 다시 ──
await boot({ stage: 40, heroLv: 1, gold: 0 });
await waitFor(async () => (await look()).badge, 5000);
await clickBadge(); await sleep(200);
const before3 = { t: await titans(), p: await progress() };
await clickGo();
await waitFor(async () => (await hunt())?.urgent === "login", 6000, 40);
const lost = await waitFor(async () => { const h = await hunt(); return h && h.urgent === null ? await look() : null; }, 40000, 100);
ok("못 잡으면 평소 사냥으로 돌아온다", !!lost, JSON.stringify(lost && { h1: lost.h1, toast: lost.toast }));
ok("달아났다고 알린다", /현상범이 달아났다/.test(lost?.toast ?? ""), String(lost?.toast));
await sleep(300);
const after3 = { t: await titans(), p: await progress(), l: await look() };
ok("완료로 적히지 않고 딱지가 다시 뜬다", (after3.t.urgent?.done ?? []).length === 0 && !!after3.l.badge, JSON.stringify(after3.t.urgent));
ok("잃는 것 없음 · 대장 대기도 그대로", after3.t.gold >= before3.t.gold && after3.p.enhancementMaterials === before3.p.enhancementMaterials && after3.t.stage === before3.t.stage && !after3.l.bossBtn, `${after3.t.gold} · ${after3.l.h1}`);

// ── 4. 마감 직전 → 마감 ──
await boot({ stage: 8, urgent: { day: today, issued: { login: Date.now() - (15 * 60 - 9) * 1000 }, done: [], bossKills: 0 } });
const last = await waitFor(async () => { const l = await look(); return l.badge ? l : null; }, 4000);
ok("마감 1분 전이면 딱지 글자가 붉다", !!last?.badgeLast && /^0:0\d$/.test(last?.badgeText ?? ""), `${last?.badgeText} · ${last?.badgeLast}`);
await clickBadge(); await sleep(200);
ok("전단이 열린다", (await look()).poster);
const gone = await waitFor(async () => { const l = await look(); return !l.badge && !l.poster; }, 14000, 200);
ok("마감이 지나면 딱지 · 전단이 사라진다", !!gone);
const sv4 = await titans();
ok("놓친 의뢰는 다시 붙지 않는다", typeof sv4.urgent?.issued?.login === "number" && (sv4.urgent?.done ?? []).length === 0, JSON.stringify(sv4.urgent));

// ── 5. 5층 전에는 안 붙는다 ──
await boot({ stage: 3 });
await sleep(1500);
const early = await look();
ok("4층까지는 딱지가 없다", !early.badge && !(await titans()).urgent?.issued?.login, JSON.stringify((await titans()).urgent));

// ── 6. 작은 화면(낮은 전장) · 가로 ──
for (const [name, w, h] of [["작은 폰 360×640", 360, 640], ["아이폰 SE 375×553", 375, 553]]) {
  await boot({ w, h, stage: 8 });
  const l = await waitFor(async () => { const v = await look(); return v.badge ? v : null; }, 5000);
  ok(`${name}: 딱지가 전장 안 · 알림과 안 겹친다`, !!l && l.badge.x >= l.field.x && l.badge.b <= l.field.b && (!l.alert || l.badge.r <= l.alert.x || l.badge.b <= l.alert.y || l.badge.y >= l.alert.b), JSON.stringify({ badge: l?.badge, alert: l?.alert }));
  await shot(`5-${w}x${h}-badge`);
  await clickBadge(); await sleep(250);
  const fit = await page.evaluate(() => { const p = document.querySelector(".urgent-poster"); if (!p) return null; const b = p.getBoundingClientRect(), go = p.querySelector(".urgent-go").getBoundingClientRect(); return { inView: b.left >= 0 && b.right <= innerWidth && b.top >= 0 && b.bottom <= innerHeight, goIn: go.bottom <= innerHeight && go.top >= 0, scroll: p.scrollHeight > p.clientHeight + 1 }; });
  ok(`${name}: 전단 · 도전 단추가 화면 안(스크롤 없이)`, !!fit?.inView && !!fit?.goIn && !fit?.scroll, JSON.stringify(fit));
  await shot(`5-${w}x${h}-poster`);
}

ok("페이지 오류 없음", errors.length === 0, errors.join(" | "));
await browser.close();
let fails = 0;
for (const [s, n, d] of results) { console.log(`${s} ${n}${d && s === "FAIL" ? " — " + d : ""}`); if (s === "FAIL") fails += 1; }
console.log(fails ? `\n${fails} FAIL` : "\nALL PASS");
process.exit(fails ? 1 : 0);
