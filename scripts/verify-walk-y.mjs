/** 사냥터 대열 위치 · 걷기 검사 — node scripts/verify-walk-y.mjs (vite 5173)
 * 사용자 지시 이력:
 *  2026-10-19 "동료 stage마다 걸어오는 건 되는데 y값이 일정 — 랜덤값"
 *  2026-10-20 "몬스터 y 고정 — 넓게" → "땅은 그대로 두고 더 넓게 분산"(두 무리 깊이: 왼쪽 주인공 · 원거리 / 오른쪽 몬스터 · 근접, 알림 칩은 오른쪽 위)
 *  2026-10-20 "걷는 속도도 항상 같지 않게" · "공격할 때마다 움직이는데 — stage 가 갱신되고 첫 공격 전에만 움직이게"
 *             (사용자의 "stage" = 몬스터 한 마리 — STAGE CLEAR 마다. 확인함)
 * A. 몬스터마다(만남): 두 무리 깊이 · 주인공 · 몬스터 높이 · 걷는 시간이 달라진다 · 깊이 범위 · 두 무리가 같이 위쪽에 몰리지 않는다
 * B. 교전 중(걸어 들어온 뒤 ~ 몬스터가 쓰러지기 전): 공격 · 피격이 있어도 주인공 · 동료(보이는 몸) · 몬스터 그림이 제자리(가운데 2px 이내)
 * C. 동료 발이 풀밭 선 아래. 겹침 · 전장 밖은 verify-formation · verify-play-art 가 본다 */
import { launchBrowser } from "./launch-browser.mjs";
const BASE = "http://localhost:5173", H = "mock-local-dev", now = Date.now();
const browser = await launchBrowser({ args: ["--no-sandbox"] }); const page = await browser.newPage(); const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errors = []; page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
await page.goto(BASE, { waitUntil: "networkidle0" });
let fails = 0; const ok = (n, c, i = "") => { console.log(`${c ? "PASS" : "FAIL"} ${n}${i ? " — " + i : ""}`); if (!c) fails += 1; };
const progress = { version: 5, level: 40, dodgeBestStage: 3, idleClaimedAt: now, updatedAt: now, onboardingStep: 4, partyIds: ["mia", "leon", "garen", "luna"], partyCap: 4, claimedRewards: ["dodge-tutorial"], pioneeredArea: 99 };
const titans = { gold: 40000, stage: 12, bestStage: 12, heroes: { mia: 20, leon: 20, garen: 20, luna: 20 }, lastActiveAt: now };
await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); }, { [`dodgebullets:progression:v1:${H}`]: JSON.stringify(progress), [`dodgebullets:titans:${H}`]: JSON.stringify(titans), "dodge-bullets:soundEnabled": "0", "dodgebullets:test-phase": "0" });
await page.reload({ waitUntil: "networkidle0" }); await sleep(1500);
await page.evaluate(() => { for (let k = 0; k < 4; k += 1) { const c = document.querySelector(".idle-claim"); if (c) { c.click(); continue; } const b = [...document.querySelectorAll("button")].filter((x) => /^(닫기|확인|나중에)$/.test(x.textContent.trim()))[0]; if (b) b.click(); } });

const snap = () => page.evaluate(() => {
  const fe = document.querySelector(".titans-field"); if (!fe) return null;
  const f = fe.getBoundingClientRect(), fs = getComputedStyle(fe);
  const c = (e) => { if (!e) return null; const r = e.getBoundingClientRect(); return { cx: Math.round(r.left + r.width / 2), cy: Math.round(r.top + r.height / 2), bottom: Math.round(f.bottom - r.bottom) }; };
  const m = document.querySelector(".titans-monster");
  return {
    key: fs.getPropertyValue("--lane-l") + "/" + fs.getPropertyValue("--lane-r") + "/" + fs.getPropertyValue("--encounter-duration"),
    l: parseFloat(fs.getPropertyValue("--lane-l")), r: parseFloat(fs.getPropertyValue("--lane-r")), dur: fs.getPropertyValue("--encounter-duration").trim(),
    ground: Math.round(f.height * (1 - parseFloat(fs.getPropertyValue("--ground-top") || "44") / 100)),
    combat: fe.classList.contains("phase-combat"), boss: fe.classList.contains("boss"),
    hero: c(document.querySelector(".titans-hero")), heroApp: !!document.querySelector(".titans-hero.is-approaching"),
    mon: c(document.querySelector(".titans-monster .titan-monster-art")), monApp: !!m?.classList.contains("is-approaching"), monDead: !!document.querySelector(".titan-monster-art.frame-defeat"),
    hitNow: !!m?.className.match(/\bhit-[ab]\b/), atkNow: !!m?.className.match(/action-(attack|prepare)/) || !!document.querySelector(".ally-swing.is-attacking"),
    allies: [...document.querySelectorAll(".titans-allies .titan-ally-art[data-party-slot]")].map((a) => ({ id: a.className.match(/ ally-(\w+)/)?.[1], app: a.classList.contains("is-approaching"), body: c(a.querySelector(".ally-swing") ?? a), feet: Math.round(f.bottom - a.getBoundingClientRect().bottom) })),
  };
});
const rows = [];
for (let i = 0; i < 200; i += 1) { const s = await snap(); if (s) rows.push(s); await sleep(110); }   // 약 22초 — 몬스터 여러 마리

// 만남(깊이 · 걷는 시간 키가 바뀔 때)마다 묶는다
const encs = [];
for (const s of rows) { const last = encs[encs.length - 1]; if (!last || last.key !== s.key) encs.push({ key: s.key, l: s.l, r: s.r, dur: s.dur, rows: [] }); encs[encs.length - 1].rows.push(s); }
// 교전 정지 구간: 다 걸어 들어온 뒤 · 몬스터가 쓰러지기 전 · 전투 단계 · 대장 아님
const settledOf = (e) => e.rows.filter((s) => s.combat && !s.boss && !s.heroApp && !s.monApp && !s.monDead && s.allies.every((a) => !a.app));
for (const e of encs) { const st = settledOf(e); e.hero = st[st.length - 1]?.hero?.bottom ?? null; e.mon = st[st.length - 1]?.mon?.bottom ?? null; }
const full = encs.filter((e) => settledOf(e).length >= 4);
console.log("만남", full.map((e) => `${e.l}/${e.r} ${e.dur} 주${e.hero} 몬${e.mon} 정지표본${settledOf(e).length}`).join(" | "));
const span = (vals) => { const v = vals.filter((x) => Number.isFinite(x)); return v.length ? Math.max(...v) - Math.min(...v) : 0; };

// ── A ──
ok("몬스터 만남이 4번 이상 잡혔다(교전 표본 4개 이상)", full.length >= 4, `${full.length}`);
ok("몬스터마다 주인공 높이가 달라진다 — 20px 이상", span(full.map((e) => e.hero)) >= 20, `${span(full.map((e) => e.hero))}px`);
ok("몬스터마다 몬스터 높이가 달라진다 — 20px 이상", span(full.map((e) => e.mon)) >= 20, `${span(full.map((e) => e.mon))}px`);
const gaps = full.map((e) => e.hero - e.mon);
ok("두 무리가 따로 — 주인공 · 몬스터 높이 차가 만남마다 20px 이상 달라진다", span(gaps) >= 20, gaps.join(","));
ok("걷는 시간이 만남마다 다르다 — 3가지 이상", new Set(full.map((e) => e.dur)).size >= 3, full.map((e) => e.dur).join(","));
ok("깊이 범위 — 왼쪽 −16~6% · 오른쪽 −7~9% · 둘이 같이 위쪽 절반(왼쪽 > −5 · 오른쪽 > 1)에 몰리지 않는다", encs.every((e) => e.l >= -16 && e.l <= 6 && e.r >= -7 && e.r <= 9 && !(e.l > -5 && e.r > 1)), encs.map((e) => `${e.l}/${e.r}`).join(" "));

// ── B: 교전 중 제자리 ──
const moves = [];
let atkSamples = 0;
for (const e of full) {
  // 마지막 두 표본은 뺀다 — 쓰러지는 첫 칸(처치 모션)이 frame-defeat 클래스보다 한 박자 먼저 그려질 때가 있다
  const st = settledOf(e).slice(0, -2); atkSamples += st.filter((s) => s.atkNow || s.hitNow).length;
  const d = (get) => Math.max(span(st.map((s) => get(s)?.cx)), span(st.map((s) => get(s)?.cy)));
  const h = d((s) => s.hero), m = d((s) => s.mon);
  const a = Math.max(...st[0].allies.map((a0) => d((s) => s.allies.find((x) => x.id === a0.id)?.body)));
  moves.push(`주${h}·몬${m}·동${a}`);
}
ok("교전 중 공격 · 피격 표본이 있다(제자리 검사가 실제 공격을 본다)", atkSamples >= 5, `${atkSamples}`);
ok("교전 중 주인공 · 동료(보이는 몸) · 몬스터가 제자리 — 가운데 2px 이내(공격 · 피격 때 돌진 · 밀림 없음)", moves.every((m) => m.split("·").every((v) => Number(v.replace(/\D/g, "")) <= 2)), moves.join(" "));

// ── C ──
const ground = rows[0]?.ground ?? 0;
const topFeet = Math.max(...rows.flatMap((s) => s.allies.map((a) => a.feet)));
ok("동료 발이 풀밭 선 아래 — 가장 높은 발 ≤ 땅 높이 − 4px", topFeet <= ground - 4, `발 ${topFeet} · 땅 ${ground}`);
ok("페이지 오류 없음", errors.length === 0, errors.slice(0, 2).join(" / "));
console.log(fails ? `${fails} FAIL` : "ALL PASS");
await browser.close();
process.exit(fails ? 1 : 0);
