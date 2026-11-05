// 렌더 · 프레임 측정 (2026-11-02 "부드러운 조작감") — CPU 를 늦춰(기본 ×6, 저사양 폰 근사) 사냥터 / 상점 서랍 / 서랍 스크롤에서 TitansGame 렌더 수 · 프레임 간격 · 긴 작업을 잰다.
//   node scripts/_probe-render.mjs [cpu=6] [sec=8]   (vite 5173 · DEV 카운터 window.__titansRenders)
import { launchBrowser } from "./launch-browser.mjs";
const BASE = "http://localhost:5173", H = "mock-local-dev", now = Date.now();
const CPU = Number(process.argv[2] ?? 6), SEC = Number(process.argv[3] ?? 8);
const browser = await launchBrowser({ args: ["--no-sandbox"] }); const page = await browser.newPage(); const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.goto(BASE, { waitUntil: "networkidle0" });
const today = new Date().toLocaleDateString("sv-SE");
await Promise.all([page.waitForNavigation({ waitUntil: "networkidle0" }).catch(() => {}), page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); setTimeout(() => location.reload(), 0); }, {
  [`dodgebullets:progression:v1:${H}`]: JSON.stringify({ version: 5, level: 30, redGems: 5000, attendanceStreak: 5, idleClaimedAt: now, updatedAt: now, onboardingStep: 4, sessionCount: 9, partyIds: ["mia", "leon", "sera", "garen"], partyCap: 4, claimedRewards: ["dodge-tutorial", "welcome-gift", "surprise-gift"], pioneeredArea: 3, discoverySeeded: true, discovered: ["monster:slime"] }),
  [`dodgebullets:titans:${H}`]: JSON.stringify({ gold: 1e8, stage: 40, bestStage: 40, autoSkill: true, heroes: { mia: 30, leon: 30, sera: 25, garen: 25 }, lastActiveAt: now }),
  [`dodgebullets:attendance:v1:${H}`]: JSON.stringify({ lastClaimDate: today, totalDays: 3, consecutiveDays: 3 }), "dodge-bullets:soundEnabled": "0", "dodgebullets:test-phase": "0",
})]);
await sleep(1500);
await page.evaluate(() => { for (let k = 0; k < 5; k += 1) { const c = document.querySelector(".idle-claim"); if (c) { c.click(); continue; } const b = [...document.querySelectorAll("button")].filter((x) => !x.closest(".titans-bottom-nav")).find((x) => /^(닫기|확인|나중에)$/.test(x.textContent.trim())); if (b) b.click(); } });
await sleep(1500);
const cdp = await page.createCDPSession(); await cdp.send("Emulation.setCPUThrottlingRate", { rate: CPU });
const measure = async (label, action) => {
  await page.evaluate(() => {
    window.__m = { frames: [], long: 0, longMs: 0, r0: window.__titansRenders ?? 0, t0: performance.now(), stop: false };
    let last = performance.now(); const tick = (t) => { window.__m.frames.push(t - last); last = t; if (!window.__m.stop) requestAnimationFrame(tick); }; requestAnimationFrame(tick);
    window.__po?.disconnect(); window.__po = new PerformanceObserver((l) => { for (const e of l.getEntries()) { window.__m.long += 1; window.__m.longMs += e.duration; } }); try { window.__po.observe({ entryTypes: ["longtask"] }); } catch {}
  });
  if (action) await action();
  await sleep(SEC * 1000);
  const r = await page.evaluate(() => { const m = window.__m; m.stop = true; const f = [...m.frames].sort((a, b) => a - b); const sec = (performance.now() - m.t0) / 1000; return { rendersPerSec: +(((window.__titansRenders ?? 0) - m.r0) / sec).toFixed(1), fps: +(m.frames.length / sec).toFixed(1), p50: +f[Math.floor(f.length * 0.5)].toFixed(1), p95: +f[Math.floor(f.length * 0.95)].toFixed(1), worst: +f[f.length - 1].toFixed(0), over50ms: f.filter((x) => x > 50).length, longTasks: m.long, longMs: Math.round(m.longMs) }; });
  console.log(label.padEnd(16), JSON.stringify(r));
  return r;
};
await measure("사냥터 전투");
await page.evaluate(() => [...document.querySelectorAll(".titans-bottom-nav button")].find((b) => b.textContent.includes("상점"))?.click()); await sleep(1500);
await page.evaluate(() => [...document.querySelectorAll(".shop-sub-tabs button")].find((b) => b.textContent.trim() === "패키지")?.click()); await sleep(800);
await measure("상점 서랍 열림");
await measure("상점 스크롤", async () => { page.evaluate(async () => { const el = document.querySelector(".hub-sheet"); const scr = [el, ...el.querySelectorAll("*")].find((e) => e.scrollHeight > e.clientHeight + 40 && /auto|scroll/.test(getComputedStyle(e).overflowY)); if (!scr) return; const t0 = performance.now(); while (!window.__m.stop) { scr.scrollTop = (Math.sin((performance.now() - t0) / 500) + 1) * 300; await new Promise((r) => requestAnimationFrame(r)); } }); });
// 메뉴 반응: 누른 뒤 다음 그림까지
const lat = await page.evaluate(async () => { const out = []; const names = ["재화", "유물", "스킬", "동료", "패키지", "재화", "유물", "패키지"]; for (const n of names) { const b = [...document.querySelectorAll(".shop-sub-tabs button")].find((x) => x.textContent.trim() === n); if (!b) continue; const t = performance.now(); b.click(); await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); out.push(Math.round(performance.now() - t)); await new Promise((r) => setTimeout(r, 300)); } return out; });
console.log("탭 전환 → 그림(ms)", lat.join(","), "· 중앙값", [...lat].sort((a, b) => a - b)[Math.floor(lat.length / 2)]);
await browser.close();
