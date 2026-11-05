// 출시 빌드 측정 (2026-11-02) — dev 는 jsxDEV 가 60~70% 를 먹어 믿을 수 없다. node scripts/_probe-render3.mjs [cpu=4] [sec=8]  (PROBE_BASE=http://localhost:5174, vite preview)
// 프레임 간격 · 긴 작업 · 메뉴 탭 → 그림 지연 · 시간 내역(스크립트 · 스타일 · 레이아웃)
import { launchBrowser } from "./launch-browser.mjs";
const BASE = process.env.PROBE_BASE ?? "http://localhost:5174", now = Date.now();
const CPU = Number(process.argv[2] ?? 4), SEC = Number(process.argv[3] ?? 8);
const browser = await launchBrowser({ args: ["--no-sandbox"] }); const page = await browser.newPage(); const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.goto(BASE, { waitUntil: "networkidle0" }); await sleep(800);
const H = await page.evaluate(() => { const k = Object.keys(localStorage).find((x) => x.startsWith("dodgebullets:progression:v1:")); return k ? k.split(":").pop() : "mock-local-dev"; });
const today = new Date().toLocaleDateString("sv-SE");
await Promise.all([page.waitForNavigation({ waitUntil: "networkidle0" }).catch(() => {}), page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); setTimeout(() => location.reload(), 0); }, {
  [`dodgebullets:progression:v1:${H}`]: JSON.stringify({ version: 5, level: 30, redGems: 5000, attendanceStreak: 5, idleClaimedAt: now, updatedAt: now, onboardingStep: 4, sessionCount: 9, partyIds: ["mia", "leon", "sera", "garen"], partyCap: 4, claimedRewards: ["dodge-tutorial", "welcome-gift", "surprise-gift"], pioneeredArea: 3, discoverySeeded: true, discovered: ["monster:slime"] }),
  [`dodgebullets:titans:${H}`]: JSON.stringify({ gold: 1e8, stage: 40, bestStage: 40, autoSkill: true, heroes: { mia: 30, leon: 30, sera: 25, garen: 25 }, lastActiveAt: now }),
  [`dodgebullets:attendance:v1:${H}`]: JSON.stringify({ lastClaimDate: today, totalDays: 3, consecutiveDays: 3 }), "dodge-bullets:soundEnabled": "0", "dodgebullets:test-phase": "0",
})]);
await sleep(1500);
await page.evaluate(() => { for (let k = 0; k < 5; k += 1) { const c = document.querySelector(".idle-claim"); if (c) { c.click(); continue; } const b = [...document.querySelectorAll("button")].filter((x) => !x.closest(".titans-bottom-nav")).find((x) => /^(닫기|확인|나중에)$/.test(x.textContent.trim())); if (b) b.click(); } });
await sleep(1500);
const cdp = await page.createCDPSession(); await cdp.send("Emulation.setCPUThrottlingRate", { rate: CPU }); await cdp.send("Performance.enable"); await cdp.send("Profiler.enable"); await cdp.send("Profiler.setSamplingInterval", { interval: 2000 });
const metrics = async () => Object.fromEntries((await cdp.send("Performance.getMetrics")).metrics.map((m) => [m.name, m.value]));
const out = {};
const measure = async (label, action) => {
  await page.evaluate(() => { window.__m = { frames: [], long: 0, longMs: 0, t0: performance.now(), stop: false }; let last = performance.now(); const tick = (t) => { window.__m.frames.push(t - last); last = t; if (!window.__m.stop) requestAnimationFrame(tick); }; requestAnimationFrame(tick); window.__po?.disconnect(); window.__po = new PerformanceObserver((l) => { for (const e of l.getEntries()) { window.__m.long += 1; window.__m.longMs += e.duration; } }); try { window.__po.observe({ entryTypes: ["longtask"] }); } catch {} });
  const a = await metrics(); if (action) await action(); await sleep(SEC * 1000); const b = await metrics();
  const r = await page.evaluate(() => { const m = window.__m; m.stop = true; const f = [...m.frames].sort((x, y) => x - y); const sec = (performance.now() - m.t0) / 1000; return { fps: +(m.frames.length / sec).toFixed(1), p50: +f[Math.floor(f.length * 0.5)].toFixed(1), p95: +f[Math.floor(f.length * 0.95)].toFixed(1), worst: +f[f.length - 1].toFixed(0), over50: f.filter((x) => x > 50).length, long: m.long, longMs: Math.round(m.longMs) }; });
  const d = (k) => +(((b[k] - a[k]) / SEC) * 100).toFixed(0);
  Object.assign(r, { script: d("ScriptDuration"), style: d("RecalcStyleDuration"), layout: d("LayoutDuration"), task: d("TaskDuration") });
  console.log(label.padEnd(14), JSON.stringify(r)); out[label] = r;
};
await measure("사냥터");
await page.evaluate(() => [...document.querySelectorAll(".titans-bottom-nav button")].find((b) => b.textContent.includes("상점"))?.click()); await sleep(1500);
await page.evaluate(() => [...document.querySelectorAll(".shop-sub-tabs button")].find((b) => b.textContent.trim() === "패키지")?.click()); await sleep(800);
await measure("상점 서랍");
await measure("서랍 스크롤", async () => { page.evaluate(async () => { const el = document.querySelector(".hub-sheet"); const scr = [el, ...el.querySelectorAll("*")].find((e) => e.scrollHeight > e.clientHeight + 40 && /auto|scroll/.test(getComputedStyle(e).overflowY)); if (!scr) return; const t0 = performance.now(); while (!window.__m.stop) { scr.scrollTop = (Math.sin((performance.now() - t0) / 500) + 1) * 300; await new Promise((r) => requestAnimationFrame(r)); } }); });
const lat = await page.evaluate(async () => { const o = []; for (const n of ["재화", "유물", "스킬", "동료", "패키지", "재화", "유물", "패키지"]) { const b = [...document.querySelectorAll(".shop-sub-tabs button")].find((x) => x.textContent.trim() === n); if (!b) continue; const t = performance.now(); b.click(); await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); o.push(Math.round(performance.now() - t)); await new Promise((r) => setTimeout(r, 300)); } return o; });
console.log("탭 → 그림(ms)", lat.join(","), "· 중앙값", [...lat].sort((a, b) => a - b)[Math.floor(lat.length / 2)]);
// CPU 프로파일 — 상점 서랍 6초
await cdp.send("Profiler.start"); await sleep(6000); const { profile } = await cdp.send("Profiler.stop");
const dt = profile.timeDeltas; const self = new Map(); const byId = new Map(profile.nodes.map((n) => [n.id, n])); profile.samples.forEach((id, i) => { const n = byId.get(id); const k = n.callFrame.functionName || "(anon)"; self.set(k, (self.get(k) ?? 0) + (dt[i] ?? 0)); });
const total = [...self.values()].reduce((x, y) => x + y, 0);
console.log([...self.entries()].sort((x, y) => y[1] - x[1]).slice(0, 10).map(([k, v]) => `${((v / total) * 100).toFixed(1)}% ${k}`).join(" | "));
await browser.close();
