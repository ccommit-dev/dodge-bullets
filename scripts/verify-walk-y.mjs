/** 동료 걸어 들어오는 높이 검사 (2026-10-19, 사용자: "동료 stage마다 걸어오는 건 되는데 y값이 일정해서 어색 — 랜덤값") — node scripts/verify-walk-y.mjs (vite 5173)
 * 몬스터가 새로 나올 때마다(만남) 동료가 새 높이로 비스듬히 걸어 들어가는지: 동료마다 만남 사이 도착 높이가 8px 이상 달라지고,
 * 같은 만남에서도 동료끼리 높이가 갈린다(한 줄로 서지 않는다). 겹침·전장 밖은 verify-formation · verify-play-art 가 본다 */
import { launchBrowser } from "./launch-browser.mjs";
const BASE = "http://localhost:5173", H = "mock-local-dev", now = Date.now();
const browser = await launchBrowser({ args: ["--no-sandbox"] }); const page = await browser.newPage(); const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.goto(BASE, { waitUntil: "networkidle0" });
const progress = { version: 5, level: 40, dodgeBestStage: 3, idleClaimedAt: now, updatedAt: now, onboardingStep: 4, partyIds: ["mia", "leon", "garen", "luna"], partyCap: 4, claimedRewards: ["dodge-tutorial"], pioneeredArea: 99 };
const titans = { gold: 40000, stage: 12, bestStage: 12, heroes: { mia: 20, leon: 20, garen: 20, luna: 20 }, lastActiveAt: now };
await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); }, { [`dodgebullets:progression:v1:${H}`]: JSON.stringify(progress), [`dodgebullets:titans:${H}`]: JSON.stringify(titans), "dodge-bullets:soundEnabled": "0", "dodgebullets:test-phase": "0" });
await page.reload({ waitUntil: "networkidle0" }); await sleep(2000);
await page.evaluate(() => { for (let k = 0; k < 4; k += 1) { const c = document.querySelector(".idle-claim"); if (c) { c.click(); continue; } const b = [...document.querySelectorAll("button")].filter((x) => /^(닫기|확인|나중에)$/.test(x.textContent.trim()))[0]; if (b) b.click(); } });
// 120ms 마다 동료 4명의 발 높이(필드 바닥 기준 px)와 접근 여부를 적는다
const rows = [], encs = [];
for (let i = 0; i < 160; i += 1) {
  rows.push(await page.evaluate(() => {
    const f = document.querySelector(".titans-field")?.getBoundingClientRect();
    // 2026-10-20: 몬스터 · 주인공 발 높이와 이번 만남 깊이(왼쪽 무리 --lane-l · 오른쪽 무리 --lane-r) · 걷는 시간도 같이 적는다(걷기 0.7~1.3배)
    const fs = getComputedStyle(document.querySelector(".titans-field"));
    const m = document.querySelector(".titans-monster")?.getBoundingClientRect(), h = document.querySelector(".titans-hero")?.getBoundingClientRect();
    window.__enc = { lane: fs.getPropertyValue("--lane-l").trim() + "/" + fs.getPropertyValue("--lane-r").trim(), l: parseFloat(fs.getPropertyValue("--lane-l")), r: parseFloat(fs.getPropertyValue("--lane-r")), dur: fs.getPropertyValue("--encounter-duration").trim(), mon: m ? Math.round(f.bottom - m.bottom) : null, ground: Math.round(f.height * (1 - parseFloat(fs.getPropertyValue("--ground-top") || "44") / 100)), hero: h ? Math.round(f.bottom - h.bottom) : null };
    return [...document.querySelectorAll(".titans-allies .titan-ally-art[data-party-slot]")].map((a) => { const r = a.getBoundingClientRect(); return { id: a.className.match(/ ally-(\w+)/)?.[1], app: a.classList.contains("is-approaching"), y: Math.round(f.bottom - r.bottom), x: Math.round(r.left) }; });
  }));
  encs.push(await page.evaluate(() => window.__enc));
  await sleep(120);
}
// 접근 구간마다: 시작 y · 끝 y (동료별)
const byAlly = {};
let prevApp = false, seg = -1;
for (const r of rows) {
  const app = r.some((a) => a.app);
  if (app && !prevApp) seg += 1;
  prevApp = app;
  for (const a of r) { const k = a.id; (byAlly[k] ??= {}); (byAlly[k][seg] ??= { start: a.y, end: a.y, app: false }); if (a.app) { byAlly[k][seg].app = true; } byAlly[k][seg].end = a.y; }
}
let fails = 0; const ok = (n, c, i = "") => { console.log(`${c ? "PASS" : "FAIL"} ${n}${i ? " — " + i : ""}`); if (!c) fails += 1; };
const ends = {};
for (const [id, segs] of Object.entries(byAlly)) { const list = Object.entries(segs).filter(([k]) => Number(k) >= 0).map(([, v]) => v); ends[id] = list.map((v) => v.end); console.log(id, list.map((v) => `${v.start}→${v.end}`).join("  ")); }
const ids = Object.keys(ends), n = Math.min(...ids.map((id) => ends[id].length));
ok("만남이 4번 이상 잡혔다", n >= 4, `만남 ${n}`);
ok("동료마다 만남 사이 도착 높이가 8px 이상 달라진다", ids.every((id) => Math.max(...ends[id]) - Math.min(...ends[id]) >= 8), ids.map((id) => `${id} ${Math.max(...ends[id]) - Math.min(...ends[id])}px`).join(" · "));
const spreadEnc = Array.from({ length: n }, (_, k) => { const ys = ids.filter((id) => id !== "garen").map((id) => ends[id][k]); return Math.max(...ys) - Math.min(...ys); });
ok("같은 만남에서도 앞줄 동료끼리 높이가 갈린다(한 줄로 서지 않는다)", spreadEnc.filter((d) => d >= 4).length >= Math.ceil(n / 2), spreadEnc.join(","));
// 만남마다(깊이 값이 바뀔 때) 깊이 · 걷는 시간 · 몬스터 · 주인공 발 높이(만남 끝 무렵 = 다음 값이 오기 직전)
const encList = []; for (const e of encs) { if (!e) continue; const last = encList[encList.length - 1]; if (!last || last.lane !== e.lane || last.dur !== e.dur) encList.push({ ...e }); else Object.assign(last, { mon: e.mon, hero: e.hero }); }
const span = (k) => { const v = encList.map((e) => e[k]).filter((x) => x !== null); return v.length ? Math.max(...v) - Math.min(...v) : 0; };
console.log("만남", encList.map((e) => `${e.lane} ${e.dur} 몬${e.mon} 주${e.hero}`).join(" | "));
ok("몬스터 발 높이가 만남마다 달라진다(예전엔 늘 같았다) — 20px 이상 차이", encList.length >= 3 && span("mon") >= 20, `${span("mon")}px`);
ok("주인공 높이도 만남마다 달라진다 — 20px 이상 차이", span("hero") >= 20, `${span("hero")}px`);
// 사용자 "더 넓게 분산" (2026-10-20): 두 무리가 따로 — 주인공과 몬스터 높이 차가 만남마다 달라지고, 두 무리가 함께 깊은 쪽(> 7.5%)에 몰리지 않는다
const gaps = encList.filter((e) => e.mon !== null && e.hero !== null).map((e) => e.hero - e.mon);
ok("주인공 · 몬스터 무리가 따로 움직인다 — 둘의 높이 차가 만남마다 20px 이상 달라진다", gaps.length >= 3 && Math.max(...gaps) - Math.min(...gaps) >= 20, gaps.join(","));
ok("두 무리가 같이 깊은 쪽에 몰리지 않는다 — 만남마다 한쪽은 7.5% 이하", encList.every((e) => !(e.l > 7.5 && e.r > 7.5)), encList.map((e) => e.lane).join(" "));
// 풀밭 선(--ground-top) 위 배경 그림에 발이 뜨지 않는다 — 깊은 무리 + 넓힌 개인 간격의 최악에서도
const ground = encs.find((e) => e?.ground)?.ground ?? 0;
const topFeet = Math.max(...rows.flat().map((a) => a.y));
ok("동료 발이 풀밭 선 아래 — 가장 높은 발 ≤ 땅 높이 − 4px", ground > 0 && topFeet <= ground - 4, `발 ${topFeet} · 땅 ${ground}`);
ok("걷는 시간이 만남마다 다르다 — 3가지 이상", new Set(encList.map((e) => e.dur)).size >= 3, [...new Set(encList.map((e) => e.dur))].join(","));
console.log(fails ? `${fails} FAIL` : "ALL PASS");
await browser.close();
process.exit(fails ? 1 : 0);
