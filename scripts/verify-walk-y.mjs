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
 * D. 동료 발이 풀밭 선 아래 · 캐릭터 몸이 UI(AUTO · 배속 · 스킬 · 알림 칩)와 겹치지 않는다
 * F. 걸어 들어오기(2026-10-20 "몬스터도 오른쪽 끝에서부터 · 캐릭터도 방향이 정해지면 자연스럽게 — 지금은 y로 각각 움직임"): 화면에 보이는 동안 발 높이가 안 바뀐다(가로로만) · 몬스터는 전장 오른쪽 밖에서 시작
 * E. 이펙트가 캐릭터 몸 근처(2026-10-20 사용자 "이펙트 위치가 이상해") — 타격 · 피해 숫자는 몬스터, 베기는 주인공, 동료 공격은 동료 */
import { launchBrowser } from "./launch-browser.mjs";
const BASE = "http://localhost:5173", H = "mock-local-dev";
const browser = await launchBrowser({ args: ["--no-sandbox"] }); const page = await browser.newPage(); const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = []; page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
let fails = 0; const ok = (n, c, i = "") => { console.log(`${c ? "PASS" : "FAIL"} ${n}${i ? " — " + i : ""}`); if (!c) fails += 1; };
const span = (vals) => { const v = vals.filter((x) => Number.isFinite(x)); return v.length ? Math.max(...v) - Math.min(...v) : 0; };

const SCREENS = [
  { name: "390×844", w: 390, h: 844, lanes: { lMin: -16, lMax: 6, rMin: -7, rMax: 9 }, minHero: 15, minMon: 10 },
  { name: "360×640", w: 360, h: 640, lanes: { lMin: -9, lMax: 3, rMin: 0, rMax: 7 }, minHero: 10, minMon: 8 },   // 낮은 전장은 깊이 범위가 좁다
];
for (const scr of SCREENS) {
  console.log(`── ${scr.name}`);
  await page.setViewport({ width: scr.w, height: scr.h, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.goto(BASE, { waitUntil: "networkidle0" });
  const now = Date.now();
  const progress = { version: 5, level: 40, dodgeBestStage: 3, idleClaimedAt: now, updatedAt: now, onboardingStep: 4, partyIds: ["mia", "leon", "garen", "luna"], partyCap: 4, claimedRewards: ["dodge-tutorial"], pioneeredArea: 99, equippedWeaponLevel: 5 };   // 무기가 있어야 주인공이 자동 공격(베기 이펙트)
  const titans = { gold: 40000, stage: 12, bestStage: 12, heroes: { mia: 6, leon: 6, garen: 6, luna: 6 }, lastActiveAt: now };   // 동료가 너무 세면 1초 안에 쓰러뜨려 주인공 자동 공격(약 1.08초)이 안 나간다
  await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); location.reload(); }, { [`dodgebullets:progression:v1:${H}`]: JSON.stringify(progress), [`dodgebullets:titans:${H}`]: JSON.stringify(titans), "dodge-bullets:soundEnabled": "0", "dodgebullets:test-phase": "0" });
  await page.waitForNavigation({ waitUntil: "networkidle0" }).catch(() => {}); await sleep(1500);
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
    return { heroMelee: fe.classList.contains("hero-melee"),
      key: fs.getPropertyValue("--lane-l") + "/" + fs.getPropertyValue("--lane-r") + "/" + fs.getPropertyValue("--encounter-duration"),
      l: parseFloat(fs.getPropertyValue("--lane-l")), r: parseFloat(fs.getPropertyValue("--lane-r")), dur: fs.getPropertyValue("--encounter-duration").trim(),
      fieldH: Math.round(f.height), ground: Math.round(f.height * (1 - parseFloat(fs.getPropertyValue("--ground-top") || "44") / 100)), uiTop: qol.length ? Math.max(...qol) : 0,
      combat: fe.classList.contains("phase-combat"), boss: fe.classList.contains("boss"),
      hero: c(document.querySelector(".titans-hero")), heroApp: !!document.querySelector(".titans-hero.is-approaching"),
      mon: c(document.querySelector(".titans-monster .titan-monster-art")), monPlace: c(document.querySelector(".titans-monster .monster-temper")), monFeet: m ? Math.round(f.bottom - R(m).bottom) : null, monApp: !!m?.classList.contains("is-approaching"), monDead: !!document.querySelector(".titan-monster-art.frame-defeat"),
      hitNow: !!m?.className.match(/\bhit-[ab]\b/), monFilter: m ? getComputedStyle(m).filter : "none", sumBumps: [...document.querySelectorAll(".titans-float.sum")].map((e) => Number(e.dataset.bump ?? 0)), atkNow: !!m?.className.match(/action-(attack|prepare)/) || !!document.querySelector(".ally-swing.is-attacking"),
      allies: [...document.querySelectorAll(".titans-allies .titan-ally-art[data-party-slot]")].map((a) => ({ id: a.className.match(/ ally-(\w+)/)?.[1], app: a.classList.contains("is-approaching"), body: c(a.querySelector(".ally-swing") ?? a), feet: Math.round(f.bottom - a.getBoundingClientRect().bottom) })),
      hits,
      fx: (() => {
        const box = (e) => { if (!e) return null; const r = R(e); return { l: r.left, r: r.right, t: r.top, b: r.bottom }; };
        const near = (pt, b, pad) => !!b && pt.x >= b.l - pad && pt.x <= b.r + pad && pt.y >= b.t - pad && pt.y <= b.b + pad;
        const mon = box(document.querySelector(".titans-monster .titan-monster-art")), hero = box(document.querySelector(".titans-hero .titans-hero-facing"));
        const allyBoxes = [...document.querySelectorAll(".titans-allies .titan-ally-art[data-party-slot] .ally-body")].map(box);
        // 원거리 · 힐러 탄(.shot-proj)은 0×0 출발점 상자 — 동료 몸에서 떠나는지(ally) 잰다 (2026-10-21)
        return [...document.querySelectorAll(".titans-field .titans-fx, .titans-field .titans-float, .titans-field .skill-shot.shot-proj")].map((e) => {
          const r = R(e), pt = { x: r.left + r.width / 2, y: r.top + r.height / 2 }, c = e.className.toString();
          const kind = /fx-hit|fx-spark|fx-burst|fx-debris|fx-crit|fx-sig-(arrow|bolt|slash)/.test(c) ? "hit" : /fx-slash/.test(c) ? "slash" : /fx-ally|fx-sig|shot-proj/.test(c) ? "ally" : /titans-float/.test(c) && !/src-tap/.test(c) ? "float" : null;
          if (!kind) return null;
          const okNear = kind === "hit" ? near(pt, mon, /fx-debris/.test(c) ? 30 : 12) : kind === "float" ? near(pt, mon, 50) : kind === "slash" ? near(pt, hero, 40) : allyBoxes.some((b) => near(pt, b, 30));
          return { kind, ok: okNear, at: [Math.round(pt.x - f.left), Math.round(pt.y - f.top)], cls: c };
        }).filter(Boolean);
      })(),
    };
  });
  // ── F: 화면 갱신마다 재는 걷기 (10초 — 원거리 탄이 꽂힐 때 피해라 처치가 조금 늦어 8초엔 등장이 한 번뿐일 때가 있었다) ──
  const walk = await page.evaluate(() => new Promise((res) => {
    const fe = document.querySelector(".titans-field"); const out = { yJumps: [], monStarts: [] }; const prev = {}; let monPrevIn = true; const t0 = performance.now();
    const tick = () => {
      const f = fe.getBoundingClientRect();
      const els = [["hero", document.querySelector(".titans-hero")], ...[...document.querySelectorAll(".titans-allies .titan-ally-art[data-party-slot]")].map((a) => [a.className.match(/ ally-([a-z_]+)/)?.[1], a])];
      for (const [id, e] of els) {
        if (!e) continue; const r = e.getBoundingClientRect(); const visible = r.right > f.left + 4 && r.left < f.right - 4; const y = Math.round(f.bottom - r.bottom);
        if (prev[id]?.visible && visible && Math.abs(prev[id].y - y) > 2) out.yJumps.push(`${id} ${prev[id].y}→${y}`);
        prev[id] = { y, visible };
      }
      const m = document.querySelector(".titans-monster"); const engaged = !!m?.classList.contains("is-engaged");
      if (m && engaged && !monPrevIn) out.monStarts.push(Math.round(m.getBoundingClientRect().left - f.right));
      monPrevIn = engaged;
      if (performance.now() - t0 < 10000) requestAnimationFrame(tick); else res(out);
    };
    tick();
  }));
  ok(`[${scr.name}] 걸어 들어올 때 보이는 캐릭터 발 높이가 안 바뀐다(가로로만 걷는다)`, walk.yJumps.length === 0, walk.yJumps.slice(0, 3).join(" · "));
  ok(`[${scr.name}] 몬스터는 전장 오른쪽 밖에서 걸어 들어온다(등장 순간 왼쪽 끝 > 전장 오른쪽)`, walk.monStarts.length >= 2 && walk.monStarts.every((d) => d >= 0), walk.monStarts.join(","));

  // 히트스톱(치명 · 스킬 · 특수기) — 전장 data-hitstop 이 붙는 횟수 · 0.06초 뒤 떨어지는지 (2026-10-21)
  await page.evaluate(() => { const fe = document.querySelector(".titans-field"); window.__hs = { on: 0, maxMs: 0, t: 0 }; new MutationObserver(() => { const pn = performance.now(); if (fe.dataset.hitstop) { window.__hs.on += 1; window.__hs.t = pn; } else if (window.__hs.t) window.__hs.maxMs = Math.max(window.__hs.maxMs, Math.round(pn - window.__hs.t)); }).observe(fe, { attributes: true, attributeFilter: ["data-hitstop"] }); });
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
  const L = scr.lanes, midL = L.lMin + (L.lMax - L.lMin) * 0.45, midR = L.rMin + (L.rMax - L.rMin) * 0.45;

  // ── A ──
  ok(`[${scr.name}] 몬스터 만남이 4번 이상 잡혔다`, full.length >= 4, `${full.length}`);
  // 2026-10-28: 근접 무기(검 · 창 — 기본 검) 주인공은 몬스터 무리 깊이(--lane-r)에 서서 몬스터에 붙어 친다(hunt-motion.css) — 같은 깊이 범위를 쓰는 몬스터 기준(minMon)으로 본다
  const heroMin = rows.some((x) => x.heroMelee) ? scr.minMon : scr.minHero;
  ok(`[${scr.name}] 몬스터마다 주인공 높이가 달라진다 — ${heroMin}px 이상`, span(full.map((e) => e.hero)) >= heroMin, `${span(full.map((e) => e.hero))}px`);
  ok(`[${scr.name}] 몬스터마다 몬스터 높이가 달라진다 — ${scr.minMon}px 이상`, span(full.map((e) => e.mon)) >= scr.minMon, `${span(full.map((e) => e.mon))}px`);
  ok(`[${scr.name}] 걷는 시간이 만남마다 다르다 — 3가지 이상`, new Set(full.map((e) => e.dur)).size >= 3, full.map((e) => e.dur).join(","));
  ok(`[${scr.name}] 깊이 범위 — 왼쪽 ${L.lMin}~${L.lMax}% · 오른쪽 ${L.rMin}~${L.rMax}% · 둘이 같이 아래쪽 45% 밖에 서지 않는다`, encs.every((e) => e.l >= L.lMin && e.l <= L.lMax && e.r >= L.rMin && e.r <= L.rMax && !(e.l > midL && e.r > midR)), encs.map((e) => `${e.l}/${e.r}`).join(" "));
  // ── B: 아래 땅 ──
  ok(`[${scr.name}] 아래 땅이 비지 않는다 — 만남마다 가장 낮은 발이 AUTO 위끝 + 70px 안`, full.every((e) => e.lowest !== null && e.lowest <= uiTop + 70), full.map((e) => e.lowest).join(",") + ` (기준 ${uiTop + 70})`);
  // ── C: 교전 중 제자리 ──
  const moves = []; let atkSamples = 0;
  for (const e of full.filter((x) => settledOf(x).length >= 6)) {
    // 마지막 두 표본은 뺀다 — 쓰러지는 첫 칸(처치 모션)이 frame-defeat 클래스보다 한 박자 먼저 그려질 때가 있다
    // 처음 세 표본(≈0.33초)도 뺀다 — 도착 순간 겹침 정리(--sep-dx, TitansGame)를 한 번 끝까지 풀어 0.32초 전환으로 옮긴 뒤 굳힌다
    const st = settledOf(e).slice(3, -2); atkSamples += st.filter((s) => s.atkNow || s.hitNow).length;
    const d = (get) => Math.max(span(st.map((s) => get(s)?.cx)), span(st.map((s) => get(s)?.cy)));
    // 몬스터 자리는 찌그러짐(.monster-squash, 발 붙인 scale) 바깥 상자로 — 맞을 때 키가 눌려 그림 가운데가 내려가는 건 자리 이동이 아니다 (2026-10-21)
    moves.push([d((s) => s.hero), d((s) => s.monPlace ?? s.mon), Math.max(...st[0].allies.map((a0) => d((s) => s.allies.find((x) => x.id === a0.id)?.body)))]);
  }
  ok(`[${scr.name}] 교전 중 공격 · 피격 표본이 있다`, atkSamples >= 5, `${atkSamples}`);
  ok(`[${scr.name}] 교전 중 주인공 · 동료(보이는 몸) · 몬스터가 제자리 — 가운데 2px 이내`, moves.every((m) => m.every((v) => v <= 2)), moves.map((m) => `주${m[0]}·몬${m[1]}·동${m[2]}`).join(" "));
  // ── D ──
  const topFeet = Math.max(...rows.flatMap((s) => s.allies.map((a) => a.feet)));
  ok(`[${scr.name}] 동료 발이 풀밭 선 아래 — 가장 높은 발 ≤ 땅 높이 − 4px`, topFeet <= (rows[0]?.ground ?? 0) - 4, `발 ${topFeet} · 땅 ${rows[0]?.ground}`);
  const uiHits = [...new Set(full.flatMap((e) => settledOf(e).flatMap((s) => s.hits)))];
  // ── E: 이펙트 자리 ── (교전 중 표본만 — 걷는 중 · 쓰러지는 중엔 몸이 움직인다)
  const fxAll = full.flatMap((e) => settledOf(e).flatMap((s) => s.fx));
  for (const k of ["hit", "slash", "ally", "float"]) {
    const list = fxAll.filter((f) => f.kind === k), bad = list.filter((f) => !f.ok);
    const where = { hit: "몬스터 몸(±12px)", slash: "주인공 몸(±40px)", ally: "동료 몸(±30px)", float: "몬스터 위(±50px)" }[k];
    ok(`[${scr.name}] 이펙트 ${k} 가 ${where} 에 — 표본 3개 이상 · 벗어난 것 5% 이하`, list.length >= 3 && bad.length <= list.length * 0.05, `${list.length}개 중 ${bad.length}개 벗어남 ${bad.slice(0, 2).map((b) => b.at.join(",")).join(" ")}`);
  }
  // ── G: 타격 표현 (2026-10-21) — 흰 조준선 대신 속성 색 · 몬스터는 대부분 제 색 · 평타 숫자는 합쳐진다 ──
  const els = new Set(fxAll.filter((f) => /fx-spark/.test(f.cls ?? "")).map((f) => f.cls.match(/\bel-(\w+)/)?.[1]).filter(Boolean));
  ok(`[${scr.name}] 타격 그림이 때린 쪽 속성 색 — 2가지 이상 · 예전 흰 조준선(.titans-fx-hit) 없음`, els.size >= 2 && !fxAll.some((f) => /titans-fx-hit\b/.test(f.cls ?? "")), [...els].join(","));
  ok(`[${scr.name}] 원거리 · 힐러 탄이 날아간다(.shot-proj 표본 2개 이상)`, fxAll.filter((f) => /shot-proj/.test(f.cls ?? "")).length >= 2, `${fxAll.filter((f) => /shot-proj/.test(f.cls ?? "")).length}개`);
  const combatRows = full.flatMap((e) => settledOf(e));
  // 번쩍임 끝 칸이 남은 brightness(1) saturate(1) 은 제 색과 같다 — 밝기 1.05 넘는 표본만 센다
  const lit = combatRows.filter((s) => Number(s.monFilter?.match(/brightness\(([\d.]+)\)/)?.[1] ?? 1) > 1.05).length;
  ok(`[${scr.name}] 몬스터가 대부분 제 색 — 밝기 필터가 걸린 표본 35% 이하`, combatRows.length > 0 && lit <= combatRows.length * 0.35, `${lit}/${combatRows.length}`);
  const hs = await page.evaluate(() => window.__hs);
  ok(`[${scr.name}] 히트스톱이 걸리고 0.15초 안에 풀린다`, hs.on >= 2 && hs.maxMs > 0 && hs.maxMs <= 150, JSON.stringify(hs));
  ok(`[${scr.name}] 평타 피해 숫자가 하나로 합쳐진다(합산 숫자에 더해진 표본)`, rows.some((s) => s.sumBumps.some((b) => b >= 1)) && rows.every((s) => s.sumBumps.length <= 2), `최대 동시 ${Math.max(0, ...rows.map((s) => s.sumBumps.length))}`);
  ok(`[${scr.name}] 교전 중 주인공 · 동료 몸이 AUTO · 배속 · 스킬 · 알림 칩과 겹치지 않는다(4px 넘게)`, uiHits.length === 0, uiHits.slice(0, 4).join(" · "));
}
ok("페이지 오류 없음", errors.length === 0, errors.slice(0, 2).join(" / "));
console.log(fails ? `${fails} FAIL` : "ALL PASS");
await browser.close();
process.exit(fails ? 1 : 0);
