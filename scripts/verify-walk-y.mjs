/** 사냥터 대열 위치 · 걷기 검사 — node scripts/verify-walk-y.mjs (vite 5173)
 * 사용자 지시 이력:
 *  2026-10-19 "동료 stage마다 걸어오는 건 되는데 y값이 일정 — 랜덤값"
 *  2026-10-20 "몬스터 y 고정 — 넓게" → "땅은 그대로 두고 더 넓게 분산"(두 무리 깊이: 왼쪽 주인공 · 원거리 / 오른쪽 몬스터 · 근접)
 *  2026-10-20 "걷는 속도도 항상 같지 않게" · "공격할 때마다 움직이는데 — stage 가 갱신되고 첫 공격 전에만 움직이게"
 *             (사용자의 "stage" = 몬스터 한 마리 — STAGE CLEAR 마다. 확인함)
 * 두 화면에서 돈다 — 넓은 전장(390×844, 전장 490px: 알림 칩 오른쪽 위 · 깊이 왼쪽 −16~6 · 오른쪽 −7~9)
 *                   낮은 전장(360×640, 전장 380px: 칩 예전 자리 · 깊이 왼쪽 −9~3 · 오른쪽 0~7 · 대열 세로 간격 0.65배) — TitansGame lanePair
 * A. 몬스터마다(만남): 깊이 · 주인공 · 몬스터 높이 · 걷는 시간이 달라진다 · 깊이 범위 · 두 무리가 같이 위쪽에 몰리지 않는다
 * B. 아래 땅: 만남마다 가장 낮은 캐릭터 발이 아래 UI(AUTO · 배속 위끝) 근처까지 내려온다 — 아래 땅이 비지 않는다
 * C. 교전 중(걸어 들어온 뒤 ~ 몬스터가 쓰러지기 전): 공격 · 피격이 있어도 주인공 · 동료(보이는 몸) · 몬스터 그림이 제자리(가운데 2px 이내)
 * D. 동료 발이 풀밭 선 아래 · 캐릭터 몸이 UI(AUTO · 배속 · 스킬 · 알림 칩)와 겹치지 않는다 */
import { launchBrowser } from "./launch-browser.mjs";
const BASE = "http://localhost:5173", H = "mock-local-dev";
const browser = await launchBrowser({ args: ["--no-sandbox"] }); const page = await browser.newPage(); const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = []; page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
let fails = 0; const ok = (n, c, i = "") => { console.log(`${c ? "PASS" : "FAIL"} ${n}${i ? " — " + i : ""}`); if (!c) fails += 1; };
const span = (vals) => { const v = vals.filter((x) => Number.isFinite(x)); return v.length ? Math.max(...v) - Math.min(...v) : 0; };

const SCREENS = [
  { name: "390×844", w: 390, h: 844, lanes: { lMin: -16, lMax: 6, rMin: -7, rMax: 9 } },
  { name: "360×640", w: 360, h: 640, lanes: { lMin: -9, lMax: 3, rMin: 0, rMax: 7 } },
];
for (const scr of SCREENS) {
  console.log(`── ${scr.name}`);
  await page.setViewport({ width: scr.w, height: scr.h, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.goto(BASE, { waitUntil: "networkidle0" });
  const now = Date.now();
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
    const R = (e) => e.getBoundingClientRect();
    const ui = [...document.querySelectorAll(".titans-field .qol-btn, .titans-skill-dock .titans-skill, .titans-field .battle-alert")].filter((e) => R(e).width > 0).map((e) => ({ n: e.className.toString().split(" ")[0], r: R(e) }));
    const hits = [];
    for (const e of [document.querySelector(".titans-hero"), ...document.querySelectorAll(".titans-allies .titan-ally-art[data-party-slot]")].filter(Boolean)) {
      const r = R(e); const body = { left: r.left + r.width * 0.25, right: r.right - r.width * 0.25, top: r.top + r.height * 0.15, bottom: r.bottom };
      for (const u of ui) { const ox = Math.min(body.right, u.r.right) - Math.max(body.left, u.r.left), oy = Math.min(body.bottom, u.r.bottom) - Math.max(body.top, u.r.top); if (ox > 4 && oy > 4) hits.push(`${e.className.toString().match(/ally-\w+|titans-hero/)?.[0]}×${u.n} ${Math.round(ox)}x${Math.round(oy)}`); }
    }
    const qol = [...document.querySelectorAll(".titans-field .qol-btn")].map((e) => Math.round(f.bottom - R(e).top));
    return {
      key: fs.getPropertyValue("--lane-l") + "/" + fs.getPropertyValue("--lane-r") + "/" + fs.getPropertyValue("--encounter-duration"),
      l: parseFloat(fs.getPropertyValue("--lane-l")), r: parseFloat(fs.getPropertyValue("--lane-r")), dur: fs.getPropertyValue("--encounter-duration").trim(),
      fieldH: Math.round(f.height), ground: Math.round(f.height * (1 - parseFloat(fs.getPropertyValue("--ground-top") || "44") / 100)), uiTop: qol.length ? Math.max(...qol) : 0,
      combat: fe.classList.contains("phase-combat"), boss: fe.classList.contains("boss"),
      hero: c(document.querySelector(".titans-hero")), heroApp: !!document.querySelector(".titans-hero.is-approaching"),
      mon: c(document.querySelector(".titans-monster .titan-monster-art")), monFeet: m ? Math.round(f.bottom - R(m).bottom) : null, monApp: !!m?.classList.contains("is-approaching"), monDead: !!document.querySelector(".titan-monster-art.frame-defeat"),
      hitNow: !!m?.className.match(/\bhit-[ab]\b/), atkNow: !!m?.className.match(/action-(attack|prepare)/) || !!document.querySelector(".ally-swing.is-attacking"),
      allies: [...document.querySelectorAll(".titans-allies .titan-ally-art[data-party-slot]")].map((a) => ({ id: a.className.match(/ ally-(\w+)/)?.[1], app: a.classList.contains("is-approaching"), body: c(a.querySelector(".ally-swing") ?? a), feet: Math.round(f.bottom - a.getBoundingClientRect().bottom) })),
      hits,
    };
  });
  const rows = [];
  for (let i = 0; i < 200; i += 1) { const s = await snap(); if (s) rows.push(s); await sleep(110); }   // 약 22초 — 몬스터 여러 마리

  const encs = [];
  for (const s of rows) { const last = encs[encs.length - 1]; if (!last || last.key !== s.key) encs.push({ key: s.key, l: s.l, r: s.r, dur: s.dur, rows: [] }); encs[encs.length - 1].rows.push(s); }
  const settledOf = (e) => e.rows.filter((s) => s.combat && !s.boss && !s.heroApp && !s.monApp && !s.monDead && s.allies.every((a) => !a.app));
  for (const e of encs) {
    const st = settledOf(e), last = st[st.length - 1];
    e.hero = last?.hero?.bottom ?? null; e.mon = last?.mon?.bottom ?? null;
    e.lowest = last ? Math.min(last.hero?.bottom ?? 1e9, last.monFeet ?? 1e9, ...last.allies.map((a) => a.feet)) : null;
  }
  const full = encs.filter((e) => settledOf(e).length >= 4);
  const uiTop = rows.find((s) => s.uiTop)?.uiTop ?? 0, fieldH = rows[0]?.fieldH ?? 0;
  console.log(`전장 ${fieldH}px · AUTO 위끝 ${uiTop}px · 만남`, full.map((e) => `${e.l}/${e.r} ${e.dur} 주${e.hero} 몬${e.mon} 최저발${e.lowest}`).join(" | "));
  const L = scr.lanes, midL = (L.lMin + L.lMax) / 2, midR = (L.rMin + L.rMax) / 2;

  // ── A ──
  ok(`[${scr.name}] 몬스터 만남이 4번 이상 잡혔다`, full.length >= 4, `${full.length}`);
  ok(`[${scr.name}] 몬스터마다 주인공 높이가 달라진다 — 15px 이상`, span(full.map((e) => e.hero)) >= 15, `${span(full.map((e) => e.hero))}px`);
  ok(`[${scr.name}] 몬스터마다 몬스터 높이가 달라진다 — 10px 이상`, span(full.map((e) => e.mon)) >= 10, `${span(full.map((e) => e.mon))}px`);
  ok(`[${scr.name}] 걷는 시간이 만남마다 다르다 — 3가지 이상`, new Set(full.map((e) => e.dur)).size >= 3, full.map((e) => e.dur).join(","));
  ok(`[${scr.name}] 깊이 범위 — 왼쪽 ${L.lMin}~${L.lMax}% · 오른쪽 ${L.rMin}~${L.rMax}% · 둘이 같이 위쪽 절반에 몰리지 않는다`, encs.every((e) => e.l >= L.lMin && e.l <= L.lMax && e.r >= L.rMin && e.r <= L.rMax && !(e.l > midL && e.r > midR)), encs.map((e) => `${e.l}/${e.r}`).join(" "));
  // ── B: 아래 땅 ──
  ok(`[${scr.name}] 아래 땅이 비지 않는다 — 만남마다 가장 낮은 발이 AUTO 위끝 + 60px 안`, full.every((e) => e.lowest !== null && e.lowest <= uiTop + 60), full.map((e) => e.lowest).join(",") + ` (기준 ${uiTop + 60})`);
  // ── C: 교전 중 제자리 ──
  const moves = []; let atkSamples = 0;
  for (const e of full) {
    // 마지막 두 표본은 뺀다 — 쓰러지는 첫 칸(처치 모션)이 frame-defeat 클래스보다 한 박자 먼저 그려질 때가 있다
    const st = settledOf(e).slice(0, -2); atkSamples += st.filter((s) => s.atkNow || s.hitNow).length;
    const d = (get) => Math.max(span(st.map((s) => get(s)?.cx)), span(st.map((s) => get(s)?.cy)));
    moves.push([d((s) => s.hero), d((s) => s.mon), Math.max(...st[0].allies.map((a0) => d((s) => s.allies.find((x) => x.id === a0.id)?.body)))]);
  }
  ok(`[${scr.name}] 교전 중 공격 · 피격 표본이 있다`, atkSamples >= 5, `${atkSamples}`);
  ok(`[${scr.name}] 교전 중 주인공 · 동료(보이는 몸) · 몬스터가 제자리 — 가운데 2px 이내`, moves.every((m) => m.every((v) => v <= 2)), moves.map((m) => `주${m[0]}·몬${m[1]}·동${m[2]}`).join(" "));
  // ── D ──
  const topFeet = Math.max(...rows.flatMap((s) => s.allies.map((a) => a.feet)));
  ok(`[${scr.name}] 동료 발이 풀밭 선 아래 — 가장 높은 발 ≤ 땅 높이 − 4px`, topFeet <= (rows[0]?.ground ?? 0) - 4, `발 ${topFeet} · 땅 ${rows[0]?.ground}`);
  const uiHits = [...new Set(full.flatMap((e) => settledOf(e).flatMap((s) => s.hits)))];
  ok(`[${scr.name}] 교전 중 주인공 · 동료 몸이 AUTO · 배속 · 스킬 · 알림 칩과 겹치지 않는다(4px 넘게)`, uiHits.length === 0, uiHits.slice(0, 4).join(" · "));
}
ok("페이지 오류 없음", errors.length === 0, errors.slice(0, 2).join(" / "));
console.log(fails ? `${fails} FAIL` : "ALL PASS");
await browser.close();
process.exit(fails ? 1 : 0);
