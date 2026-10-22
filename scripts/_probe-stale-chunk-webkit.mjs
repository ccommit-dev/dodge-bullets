// 지워진 쪽(chunk) — 사파리 엔진(WebKit, 아이폰 카카오톡 흉내)에서 (1) 첫 실패 = 한 번 새로고침 (2) 30초 안 재실패 = "다시 시도" 판(빈 화면 아님) (3) 풀면 열림 (2026-10-22)
//   PLAYWRIGHT_DIR=<playwright 폴더> node scripts/_probe-stale-chunk-webkit.mjs
import http from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join, extname } from "node:path";
import { createRequire } from "node:module";
const req = createRequire(join(process.env.PLAYWRIGHT_DIR ?? process.cwd(), "package.json"));
const { webkit } = req("playwright");
const ROOT = "docs/game", BASE = "/dodge-bullets/game/", PORT = 5192;
const TYPES = { ".js": "text/javascript", ".css": "text/css", ".html": "text/html", ".json": "application/json", ".webp": "image/webp", ".png": "image/png", ".svg": "image/svg+xml", ".mp3": "audio/mpeg", ".woff2": "font/woff2" };
let block = null;
const server = http.createServer((rq, res) => {
  const url = decodeURIComponent(rq.url.split("?")[0]);
  if (block && url.includes(block)) { res.writeHead(404); res.end("gone"); return; }
  let p = url.startsWith(BASE) ? url.slice(BASE.length) : url.slice(1);
  if (!p || p.endsWith("/")) p += "index.html";
  const f = join(ROOT, p);
  if (!existsSync(f)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "content-type": TYPES[extname(f)] ?? "application/octet-stream", "cache-control": "no-store" }); res.end(readFileSync(f));
}).listen(PORT);
const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1 KAKAOTALK/26.8.4 (INAPP)";
const browser = await webkit.launch();
const ctx = await browser.newContext({ userAgent: UA, viewport: { width: 390, height: 664 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await ctx.newPage(); const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = []; page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));
let navs = 0; page.on("framenavigated", (f) => { if (f === page.mainFrame()) navs += 1; });
const now = Date.now(), H = "mock-local-dev";
await page.goto(`http://localhost:${PORT}${BASE}`, { waitUntil: "networkidle" });
await page.evaluate((s) => { for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); }, { [`dodgebullets:progression:v1:${H}`]: JSON.stringify({ version: 5, level: 10, idleClaimedAt: now, updatedAt: now, onboardingStep: 4, partyIds: ["mia"], partyCap: 4, claimedRewards: ["dodge-tutorial"] }), [`dodgebullets:titans:${H}`]: JSON.stringify({ stage: 5, bestStage: 5, heroes: { mia: 3 }, lastActiveAt: now }), [`dodgebullets:attendance:v1:${H}`]: JSON.stringify({ lastClaimDate: new Date().toLocaleDateString("sv-SE"), totalDays: 3, consecutiveDays: 3 }), "dodgebullets:test-phase": "0" });
await page.reload({ waitUntil: "networkidle" }); await sleep(2000);
const closeModals = () => page.evaluate(() => { for (let k = 0; k < 5; k += 1) { const c = document.querySelector(".idle-claim"); if (c) { c.click(); continue; } const b = [...document.querySelectorAll("button")].filter((x) => !x.closest(".titans-bottom-nav")).find((x) => /^(닫기|확인|나중에)$/.test(x.textContent.trim())); if (b) b.click(); } });
await closeModals(); await sleep(500);
const st = () => page.evaluate(() => ({ mypage: !!document.querySelector(".character-page h1"), failedPanel: !!document.querySelector(".lazy-failed"), hunt: !!document.querySelector(".titans-field"), blank: document.body.innerText.trim().length < 5, log: JSON.parse(localStorage.getItem("dodgebullets:errorlog:v1") ?? "[]").length }));
let fails = 0; const ok = (n, c, d = "") => { console.log(`${c ? "PASS" : "FAIL"} ${n}${d ? " — " + d : ""}`); if (!c) fails += 1; };
block = "CharacterStatus-";
const navBefore = navs;
await page.evaluate(() => document.querySelector(".titans-back")?.click()); await sleep(4000);
let s1 = await st();
ok("(1) 첫 실패 — 한 번 새로고침하고 빈 화면이 아니다(사냥터)", navs > navBefore && s1.hunt && !s1.blank, JSON.stringify({ navs: navs - navBefore, ...s1 }));
await closeModals(); await sleep(400);
await page.evaluate(() => document.querySelector(".titans-back")?.click()); await sleep(3000);
let s2 = await st();
ok("(2) 30초 안 재실패 — 빈 화면 대신 '다시 시도' 판", s2.failedPanel && !s2.blank, JSON.stringify(s2));
block = null;
await page.evaluate(() => document.querySelector(".lazy-retry")?.click()); await sleep(3500); await closeModals(); await sleep(400);
await page.evaluate(() => document.querySelector(".titans-back")?.click()); await sleep(2500);
let s3 = await st();
ok("(3) 다시 시도 뒤 마이페이지가 열린다", s3.mypage, JSON.stringify(s3));
console.log("pageerror", errors.length, errors.slice(0, 3).join(" / "));
console.log(fails ? `${fails} FAIL` : "ALL PASS");
await browser.close(); server.close();
process.exit(fails ? 1 : 0);
