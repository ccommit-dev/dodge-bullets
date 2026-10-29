/**
 * PC 웹 세로 기둥 검사 (2026-10-20, 사용자: "웹에서 UI나 위치가 어색해 — 웹에서도 잘 동작하게, 모바일에선 동일") — node scripts/verify-web-frame.mjs
 * 데스크톱(마우스 · 넓은 창)이면 앱이 폰 폭 기둥(src/ui/webFrame.ts)에 들어가고, 시트 · 내비 · 성문 방어 캔버스가 기둥 밖으로 안 나간다.
 * 폰(390 · 터치)은 클래스가 안 붙고 예전 폭 그대로.
 */
import { launchBrowser } from "./launch-browser.mjs";
const BASE = "http://localhost:5173", H = "mock-local-dev", now = Date.now();
const results = [];
const ok = (name, cond, detail = "") => { results.push([cond ? "PASS" : "FAIL", name, detail]); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await launchBrowser({ args: ["--no-sandbox"] }); const page = await browser.newPage();
const errors = []; page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
await page.setViewport({ width: 1440, height: 900 });
await page.goto(BASE, { waitUntil: "networkidle0" });
const progress = { version: 5, level: 30, dodgeBestStage: 10, idleClaimedAt: now, updatedAt: now, onboardingStep: 4, partyIds: ["mia", "garen"], partyCap: 4, claimedRewards: ["dodge-tutorial"], pioneeredArea: 5 };
const titans = { gold: 900000, stage: 12, bestStage: 12, heroes: { mia: 10, garen: 8 }, lastActiveAt: now };
await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); location.reload(); }, { [`dodgebullets:progression:v1:${H}`]: JSON.stringify(progress), [`dodgebullets:titans:${H}`]: JSON.stringify(titans), "dodge-bullets:soundEnabled": "0", "dodgebullets:test-phase": "0", "dodgebullets:inapp-fs-hint": "1" });
const closeModal = () => page.evaluate(() => { for (let k = 0; k < 4; k += 1) { const c = document.querySelector(".idle-claim"); if (c) { c.click(); continue; } const b = [...document.querySelectorAll("button")].filter((x) => /^(닫기|확인|나중에)$/.test(x.textContent.trim()))[0]; if (b) b.click(); } });
const box = (sel) => page.evaluate((sel) => { const e = document.querySelector(sel); if (!e) return null; const r = e.getBoundingClientRect(); return { l: Math.round(r.left), r: Math.round(r.right), w: Math.round(r.width) }; }, sel);
const inside = (b, col) => !!b && b.l >= col.l - 1 && b.r <= col.r + 1;

// ── 데스크톱 1440×900 ──
await page.waitForNavigation({ waitUntil: "networkidle0" }).catch(() => {}); await sleep(2200); await closeModal(); await sleep(500);
const col = await box("#root");
ok("데스크톱: html.web-frame · 앱 기둥 460px 가운데", (await page.evaluate(() => document.documentElement.classList.contains("web-frame"))) && col.w === 460 && Math.abs(col.l - (1440 - 460) / 2) <= 1, JSON.stringify(col));
for (const sel of [".titans-header", ".titans-field", ".titans-bottom-nav"]) ok(`데스크톱: ${sel} 가 기둥 안`, inside(await box(sel), col), JSON.stringify(await box(sel)));
ok("데스크톱: 문서가 가로로 넘치지 않는다", await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "");
await page.evaluate(() => [...document.querySelectorAll(".titans-bottom-nav button")].find((b) => b.textContent.includes("상점"))?.click()); await sleep(1200);
const sheet = await box(".hub-sheet");
ok("데스크톱: 상점 시트가 기둥 안(예전엔 920px 로 넘었다)", inside(sheet, col), JSON.stringify(sheet));
await page.evaluate(() => document.querySelector(".hub-sheet-close")?.click()); await sleep(400);
// 성문 방어 한 판 — 캔버스가 기둥 폭
await page.evaluate(() => [...document.querySelectorAll(".titans-bottom-nav button")].find((b) => b.textContent.includes("모험"))?.click()); await sleep(800);
await page.evaluate(() => [...document.querySelectorAll(".nav-popup-grid button, .hub-card")].find((b) => b.textContent.includes("성문 방어"))?.click()); await sleep(2200);
await page.evaluate(() => document.querySelector(".cta, .stage-btn:not([disabled])")?.click()); await sleep(1500);
await page.evaluate(() => document.querySelector(".intro-start, .cta.intro-cta, .overlay-content .cta")?.click()); await sleep(2500);
const cv = await page.evaluate(() => { const c = document.querySelector("canvas"); const w = window.__dodgeWorld; const r = c?.getBoundingClientRect(); return c ? { l: Math.round(r.left), r: Math.round(r.right), w: Math.round(r.width), world: w ? Math.round(w.width) : null } : null; });
ok("데스크톱: 성문 방어 캔버스 · 월드 폭 = 기둥 폭(예전 1440)", !!cv && inside(cv, col) && cv.w === 460 && (cv.world === null || cv.world === 460), JSON.stringify(cv));

// ── 폰 390×844 (터치) — 예전 그대로 ──
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.reload({ waitUntil: "networkidle0" }); await sleep(2200); await closeModal(); await sleep(500);
const m = await page.evaluate(() => ({ cls: document.documentElement.classList.contains("web-frame"), root: Math.round(document.getElementById("root").getBoundingClientRect().width), vw: getComputedStyle(document.documentElement).getPropertyValue("--vw").trim() }));
ok("폰: web-frame 없음 · 앱 폭 = 화면 폭 · --vw 미설정(1vw 그대로)", !m.cls && m.root === 390 && m.vw === "", JSON.stringify(m));
const field = await box(".titans-field");
ok("폰: 사냥터 폭 366(예전 값)", field?.w === 366, JSON.stringify(field));
ok("페이지 오류 없음", errors.length === 0, errors.slice(0, 2).join(" / "));
for (const [s, n, d] of results) console.log(s, n, d ? "— " + d : "");
const fails = results.filter((r) => r[0] === "FAIL").length;
console.log(fails ? `${fails} FAIL` : "ALL PASS");
await browser.close();
process.exit(fails ? 1 : 0);
