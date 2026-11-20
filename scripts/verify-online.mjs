/**
 * 온라인(접속자 · 채팅 · 랭킹) 검사 (2026-11-20) — 로컬 서버(cd server && npm run dev → 127.0.0.1:8787)와 개발 서버(5173)로.
 *   node scripts/verify-online.mjs
 * 로컬 서버가 없으면 건너뛴다(SKIP · 종료 0) — verify-all 목록에는 넣지 않았다.
 * 사람 둘(브라우저 문맥 둘)이 각자 사냥터 기록을 심고 붙는다:
 *   접속자 2명 · 둘의 사냥터 기록이 랭킹에 · A 의 채팅이 B 에 글자 그대로(HTML 로 안 바뀜) · 채팅 입력 키가 게임(window)으로 0건 ·
 *   탭을 눌러도 사냥터 탭 수(totalTaps)가 안 오름 · 탭이 지갑 줄 · 아래 메뉴 · 전장 알림 칩과 안 겹침(390×844 · 360×640 · PC 기둥) ·
 *   판 글자 13px 이상 · 페이지 오류 0
 */
import { launchBrowser } from "./launch-browser.mjs";
const BASE = "http://localhost:5173", SERVER = "http://127.0.0.1:8787", H = "mock-local-dev";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
try { const r = await fetch(`${SERVER}/healthz`); if (!r.ok) throw new Error(String(r.status)); }
catch { console.log("SKIP 로컬 온라인 서버가 없다 — cd server && npm run dev 뒤 다시"); process.exit(0); }

const results = []; const ok = (n, c, d = "") => results.push([c ? "PASS" : "FAIL", n, d]);
const errors = [];
const browser = await launchBrowser({ args: ["--no-sandbox"] });
const now = Date.now();
async function person(nick, best, vp) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage(); page.on("pageerror", (e) => errors.push(`${nick} ${String(e).slice(0, 140)}`));
  await page.setViewport(vp);
  const progress = { version: 5, unitRev: 3, onboardingStep: 4, level: 20, redGems: 10, sharedCoins: 500, titanBestStage: best, pioneeredArea: 3, idleClaimedAt: now, updatedAt: now,
    partyIds: ["mia", "garen"], partyCap: 4, sessionCount: 9, claimedRewards: ["dodge-tutorial", "welcome-gift"] };
  const titans = { stage: best, bestStage: best, gold: 5000, heroes: { mia: 10, garen: 10 }, lastActiveAt: now, totalTaps: 50 };
  await page.goto(`${BASE}/favicon.png`, { waitUntil: "domcontentloaded" });
  await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); }, {
    [`dodgebullets:progression:v1:${H}`]: JSON.stringify(progress), [`dodgebullets:titans:${H}`]: JSON.stringify(titans), "dodge-bullets:soundEnabled": "0", "dodgebullets:test-phase": "0",
    "dodgebullets:inapp-fs-hint": "1", "dodgebullets:online-url": SERVER, "dodgebullets:online-name": nick,
    [`dodgebullets:attendance:v1:${H}`]: JSON.stringify({ lastClaimDate: new Date().toLocaleDateString("sv-SE"), totalDays: 3, consecutiveDays: 3 }) });
  await page.goto(BASE, { waitUntil: "networkidle0" }); await sleep(2500);
  await page.evaluate(() => { for (let k = 0; k < 4; k += 1) { const c = document.querySelector(".idle-claim"); if (c) { c.click(); continue; } const b = [...document.querySelectorAll("button")].filter((x) => !x.closest(".dbo-root")).find((x) => /^(닫기|확인|나중에)$/.test(x.textContent.trim())); b?.click(); } });
  await sleep(1200);
  return { ctx, page };
}
const PHONE = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
const a = await person("앨리스", 23, PHONE), b = await person("밥", 31, PHONE);
await sleep(5500);   // 첫 기록 보고(4초 주기) · 접속자 방송(1.5초)

// 겹침 — 탭 상자 vs 지갑 줄 · 아래 메뉴 · 전장 알림 칩
const overlap = (page) => page.evaluate(() => {
  const r = (e) => e.getBoundingClientRect();
  const tab = document.querySelector(".dbo-tab"); if (!tab) return { tab: null };
  const t = r(tab), hits = [];
  for (const sel of [".titans-header", ".titans-wallet", ".titans-bottom-nav", ".titans-growth-tabs", ".battle-alert-stack", ".inbox-btn", ".idle-status-strip", ".titans-stagebar", ".hud-score"]) {
    for (const e of document.querySelectorAll(sel)) { const o = r(e); if (!o.width || !o.height) continue; const x = Math.min(t.right, o.right) - Math.max(t.left, o.left), y = Math.min(t.bottom, o.bottom) - Math.max(t.top, o.top); if (x > 2 && y > 2) hits.push(sel); }
  }
  return { tab: { x: Math.round(t.left), y: Math.round(t.top), w: Math.round(t.width), h: Math.round(t.height) }, hits, vw: innerWidth };
});
const o1 = await overlap(a.page);
ok("390×844 탭이 보이고 지갑 · 아래 메뉴 · 전장 칩과 안 겹친다", !!o1.tab && o1.hits.length === 0, JSON.stringify(o1));
const count = await a.page.evaluate(() => Number(document.querySelector(".dbo-tab b")?.textContent || 0));
ok("접속자 2명이 탭에 보인다", count >= 2, String(count));

// 탭을 눌러도 사냥터 탭 수가 안 오른다
const taps0 = await a.page.evaluate((h) => JSON.parse(localStorage.getItem(`dodgebullets:titans:${h}`) || "{}").totalTaps ?? 0, H);
await a.page.click(".dbo-tab"); await sleep(1600);
const taps1 = await a.page.evaluate((h) => JSON.parse(localStorage.getItem(`dodgebullets:titans:${h}`) || "{}").totalTaps ?? 0, H);
ok("탭을 눌러도 사냥터 탭 수(totalTaps)가 그대로", taps1 === taps0, `${taps0}→${taps1}`);

// 랭킹 — 둘의 사냥터 기록
const rows = await a.page.evaluate(() => [...document.querySelectorAll(".dbo-board")].map((bd) => `${bd.querySelector("h3")?.textContent}: ${[...bd.querySelectorAll("li")].map((li) => li.textContent).join(" / ")}`));
ok("랭킹에 둘의 사냥터 기록(31층 · 23층)", rows.some((r) => r.includes("밥") && r.includes("31층")) && rows.some((r) => r.includes("앨리스") && r.includes("23층")), rows.join(" | "));

// 채팅 — A 가 보낸 글이 B 에 글자 그대로 · 입력 키가 게임으로 안 샌다
await a.page.evaluate(() => [...document.querySelectorAll(".dbo-tabs button")].find((x) => x.textContent === "채팅")?.click()); await sleep(300);
await a.page.evaluate(() => { window.__leak = 0; const f = () => { window.__leak += 1; }; window.addEventListener("keydown", f); window.addEventListener("keyup", f); document.addEventListener("keydown", f); });
await a.page.focus(".dbo-chat-form input");
await a.page.keyboard.type("안녕 <b>굵게</b>"); await a.page.keyboard.press("ArrowLeft"); await a.page.keyboard.press("Space"); await a.page.keyboard.press("Enter");
await sleep(1200);
const leaked = await a.page.evaluate(() => window.__leak);
ok("채팅 입력 키가 게임(window · document)으로 0건", leaked === 0, String(leaked));
await b.page.click(".dbo-tab"); await sleep(400);
await b.page.evaluate(() => [...document.querySelectorAll(".dbo-tabs button")].find((x) => x.textContent === "채팅")?.click()); await sleep(400);
const seen = await b.page.evaluate(() => { const li = [...document.querySelectorAll(".dbo-chat li")].pop(); return { text: li?.textContent ?? "", bold: !!li?.querySelector("span b") }; });
ok("A 의 채팅이 B 에 글자 그대로(HTML 로 안 바뀜)", seen.text.includes("앨리스") && seen.text.includes("<b>굵게</b") && !seen.bold, JSON.stringify(seen));

// 판 글자 크기 — 보이는 글자 모두 13px 이상
const tiny = await b.page.evaluate(() => { const out = []; const w = document.createTreeWalker(document.querySelector(".dbo-root"), NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) { if (!n.textContent.trim()) continue; const e = n.parentElement; if (!e.getClientRects().length || e.closest("[aria-hidden=true]")) continue; const fs = parseFloat(getComputedStyle(e).fontSize); if (fs < 13) out.push(`${e.tagName}:${fs}:${n.textContent.trim().slice(0, 10)}`); } return out; });
ok("판 글자 13px 이상", tiny.length === 0, tiny.slice(0, 5).join(" | "));
await b.page.screenshot({ path: "art-gen/out/online-chat.png" });

// 360×640 · PC(1280×800, 460px 기둥)
for (const [tag, vp] of [["360×640", { width: 360, height: 640, deviceScaleFactor: 2, isMobile: true, hasTouch: true }], ["PC 1280×800", { width: 1280, height: 800, deviceScaleFactor: 1 }]]) {
  const p = await person(`검사${tag.length}`, 5, vp);
  await sleep(1500);
  const o = await overlap(p.page);
  const inCol = await p.page.evaluate(() => { const t = document.querySelector(".dbo-tab").getBoundingClientRect(); const col = document.documentElement.classList.contains("web-frame") ? { l: (innerWidth - 460) / 2, r: (innerWidth + 460) / 2 } : { l: 0, r: innerWidth }; return t.left >= col.l - 1 && t.right <= col.r + 1; });
  ok(`${tag} 탭이 게임 화면 안 · 지갑 · 아래 메뉴 · 칩과 안 겹친다`, !!o.tab && o.hits.length === 0 && inCol, JSON.stringify(o));
  await p.page.screenshot({ path: `art-gen/out/online-${tag.replace(/[^0-9a-zA-Z]/g, "")}.png` });
  await p.ctx.close();
}
ok("페이지 오류 없음", errors.length === 0, errors.slice(0, 3).join(" / "));
await a.ctx.close(); await b.ctx.close();
for (const [s, n, d] of results) console.log(s, n, d ? "— " + d : "");
const fails = results.filter((r) => r[0] === "FAIL").length;
console.log(fails ? `\n${fails} FAIL` : "\nALL PASS");
await browser.close();
process.exit(fails ? 1 : 0);
