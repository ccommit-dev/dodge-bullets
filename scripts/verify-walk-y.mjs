/** 사냥터 대열 위치 · 걷기 검사 — node scripts/verify-walk-y.mjs (vite 5173)
 * 사용자 지시 이력:
 *  2026-10-19 "동료 stage마다 걸어오는 건 되는데 y값이 일정 — 랜덤값"
 *  2026-10-20 "몬스터 y 고정 — 넓게" → "땅은 그대로 두고 더 넓게 분산"(두 무리 깊이: 왼쪽 주인공 · 원거리 −16~6%(AUTO · 배속을 스킬 줄로 옮긴 뒤) / 오른쪽 몬스터 · 근접 0~12%)
 *  2026-10-20 "걷는 속도도 항상 같지 않게" · "공격할 때마다 움직이는데 — stage 가 갱신되고 첫 공격 전에만 움직이게"
 * A. 스테이지 시작(새로고침 = 그 스테이지 웨이브 1)마다: 두 무리 깊이 · 주인공 · 몬스터 · 동료 높이가 달라지고, 걷는 시간이 다르다
 * B. 같은 스테이지 안 다음 몬스터들: 주인공 · 동료는 제자리(걸어 들어가지 않는다) · 몬스터만 오른쪽에서 걸어 들어온다 · 몬스터가 교전 중 어슬렁대지 않는다
 * C. 발이 풀밭 선 아래 · 두 무리가 같이 위쪽에 몰리지 않는다. 겹침 · 전장 밖은 verify-formation · verify-play-art 가 본다 */
import { launchBrowser } from "./launch-browser.mjs";
const BASE = "http://localhost:5173", H = "mock-local-dev";
const browser = await launchBrowser({ args: ["--no-sandbox"] }); const page = await browser.newPage(); const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errors = []; page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
await page.goto(BASE, { waitUntil: "networkidle0" });
let fails = 0; const ok = (n, c, i = "") => { console.log(`${c ? "PASS" : "FAIL"} ${n}${i ? " — " + i : ""}`); if (!c) fails += 1; };

const seed = async () => {
  const now = Date.now();
  const progress = { version: 5, level: 40, dodgeBestStage: 3, idleClaimedAt: now, updatedAt: now, onboardingStep: 4, partyIds: ["mia", "leon", "garen", "luna"], partyCap: 4, claimedRewards: ["dodge-tutorial"], pioneeredArea: 99 };
  const titans = { gold: 40000, stage: 12, bestStage: 12, heroes: { mia: 20, leon: 20, garen: 20, luna: 20 }, lastActiveAt: now };
  await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); }, { [`dodgebullets:progression:v1:${H}`]: JSON.stringify(progress), [`dodgebullets:titans:${H}`]: JSON.stringify(titans), "dodge-bullets:soundEnabled": "0", "dodgebullets:test-phase": "0" });
  await page.reload({ waitUntil: "networkidle0" }); await sleep(1500);
  await page.evaluate(() => { for (let k = 0; k < 4; k += 1) { const c = document.querySelector(".idle-claim"); if (c) { c.click(); continue; } const b = [...document.querySelectorAll("button")].filter((x) => /^(닫기|확인|나중에)$/.test(x.textContent.trim()))[0]; if (b) b.click(); } });
};
const snap = () => page.evaluate(() => {
  const fe = document.querySelector(".titans-field"); if (!fe) return null;
  const f = fe.getBoundingClientRect(), fs = getComputedStyle(fe);
  const b = (e) => e ? Math.round(f.bottom - e.getBoundingClientRect().bottom) : null;
  const m = document.querySelector(".titans-monster"), h = document.querySelector(".titans-hero");
  const allies = [...document.querySelectorAll(".titans-allies .titan-ally-art[data-party-slot]")];
  return {
    l: parseFloat(fs.getPropertyValue("--lane-l")), r: parseFloat(fs.getPropertyValue("--lane-r")), dur: fs.getPropertyValue("--encounter-duration").trim(),
    ground: Math.round(f.height * (1 - parseFloat(fs.getPropertyValue("--ground-top") || "44") / 100)),
    hero: b(h), heroX: h ? Math.round(h.getBoundingClientRect().left) : null, mon: b(m), monX: m ? Math.round(m.getBoundingClientRect().left) : null,
    allies: allies.map((a) => ({ id: a.className.match(/ ally-(\w+)/)?.[1], y: b(a), x: Math.round(a.getBoundingClientRect().left), app: a.classList.contains("is-approaching") })),
    // 몬스터 자리 = 계산된 bottom + 인라인 translate y (상자 크기는 피격 회전 · 쓰러짐 모션에 따라 출렁여 자리 판정에 안 쓴다)
    monPos: m ? Math.round(parseFloat(getComputedStyle(m).bottom) - (parseFloat((getComputedStyle(m).translate || "0px 0px").split(" ")[1] ?? "0") || 0)) : null,
    combat: fe.classList.contains("phase-combat"), boss: fe.classList.contains("boss"),
    heroApp: h?.classList.contains("is-approaching") ?? false, monApp: m?.classList.contains("is-approaching") ?? false, hp: document.querySelector(".titans-stagebar, .titans-field")?.textContent?.match(/(\d+)\s*\/\s*10/)?.[1] ?? null,
  };
});

// ── A. 스테이지 시작 5번 ──
const starts = [];
for (let k = 0; k < 5; k += 1) {
  await seed();
  let s = null;
  for (let i = 0; i < 40; i += 1) { s = await snap(); if (s && !s.heroApp && s.allies.length && s.allies.every((a) => !a.app)) break; await sleep(150); }
  await sleep(400); s = await snap();
  starts.push(s);
  console.log(`시작 ${k}: 깊이 ${s.l}/${s.r} · ${s.dur} · 주 ${s.hero} · 몬 ${s.mon} · 동료 ${s.allies.map((a) => a.y).join(",")}`);
}
const span = (vals) => { const v = vals.filter((x) => Number.isFinite(x)); return v.length ? Math.max(...v) - Math.min(...v) : 0; };
ok("스테이지 시작마다 주인공 높이가 달라진다 — 20px 이상", span(starts.map((s) => s.hero)) >= 20, `${span(starts.map((s) => s.hero))}px`);
ok("스테이지 시작마다 몬스터 높이가 달라진다 — 20px 이상", span(starts.map((s) => s.mon)) >= 20, `${span(starts.map((s) => s.mon))}px`);
const gaps = starts.map((s) => s.hero - s.mon);
ok("두 무리가 따로 — 주인공 · 몬스터 높이 차가 스테이지마다 20px 이상 달라진다", span(gaps) >= 20, gaps.join(","));
ok("동료마다 스테이지 사이 높이가 8px 이상 달라진다", starts[0].allies.every((a0) => span(starts.map((s) => s.allies.find((a) => a.id === a0.id)?.y)) >= 8), starts[0].allies.map((a0) => `${a0.id} ${span(starts.map((s) => s.allies.find((a) => a.id === a0.id)?.y))}px`).join(" · "));
ok("걷는 시간이 스테이지마다 다르다 — 3가지 이상", new Set(starts.map((s) => s.dur)).size >= 3, starts.map((s) => s.dur).join(","));
ok("깊이 범위 — 왼쪽 −16~6% · 오른쪽 0~12% · 둘이 같이 위쪽(왼쪽 > 0 · 오른쪽 > 6)에 몰리지 않는다", starts.every((s) => s.l >= -16 && s.l <= 6 && s.r >= 0 && s.r <= 12 && !(s.l > 0 && s.r > 6)), starts.map((s) => `${s.l}/${s.r}`).join(" "));
ok("같은 스테이지에서도 앞줄 동료끼리 높이가 갈린다(한 줄로 서지 않는다)", starts.filter((s) => span(s.allies.filter((a) => a.id !== "garen").map((a) => a.y)) >= 4).length >= 3, starts.map((s) => span(s.allies.filter((a) => a.id !== "garen").map((a) => a.y))).join(","));

// ── B. 같은 스테이지 안: 다음 몬스터들 ──
const base = starts[starts.length - 1];
const rows = [];
for (let i = 0; i < 110; i += 1) { rows.push(await snap()); await sleep(110); }   // 약 12초 — 몬스터 여러 마리
// 스테이지를 깨고 나가는 연출(party-run-out)은 빼고 교전 단계만 — 다음 스테이지로 넘어가면 깊이가 바뀌어 걸러진다
const sameStage = rows.filter((s) => s && s.combat && s.l === base.l && s.r === base.r);
const monArrivals = sameStage.filter((s, i) => i > 0 && s.monApp && !sameStage[i - 1].monApp).length;
ok("같은 스테이지에서 다음 몬스터가 걸어 들어왔다(1마리 이상)", monArrivals >= 1, `등장 ${monArrivals} · 표본 ${sameStage.length}`);
ok("다음 몬스터 때 주인공 · 동료는 걸어 들어가지 않는다(is-approaching 없음)", sameStage.every((s) => !s.heroApp && s.allies.every((a) => !a.app)), "");
const heroYs = sameStage.map((s) => s.hero), heroXs = sameStage.map((s) => s.heroX);
ok("다음 몬스터 때 주인공 자리 그대로 — 높이 · 가로 3px 이내", span(heroYs) <= 3 && span(heroXs) <= 3, `높이 ${span(heroYs)} · 가로 ${span(heroXs)}`);
// 대장(웨이브 10)은 몸이 커서 근접 동료가 그 몸 가장자리로 한 번 옮겨 선다 — 일반 몬스터끼리 · 대장 동안을 따로 잰다
const groupMove = (rowsG, id) => Math.max(span(rowsG.map((s) => s.allies.find((a) => a.id === id)?.y)), span(rowsG.map((s) => s.allies.find((a) => a.id === id)?.x)));
const allyMove = base.allies.map((a0) => Math.max(groupMove(sameStage.filter((s) => !s.boss), a0.id), groupMove(sameStage.filter((s) => s.boss), a0.id)));
ok("다음 몬스터 때 동료 자리 그대로 — 높이 · 가로 3px 이내", allyMove.every((d) => d <= 3), base.allies.map((a, i) => `${a.id} ${allyMove[i]}`).join(" · "));
const fighting = sameStage.filter((s) => !s.monApp);
ok("교전 중 몬스터가 어슬렁대지 않는다 — 자리(bottom − translate) 1px 이내(첫 공격 뒤엔 제자리)", span(fighting.map((s) => s.monPos)) <= 1, `${span(fighting.map((s) => s.monPos))}px`);

// ── C. 풀밭 선 ──
const all = [...starts, ...sameStage];
const topFeet = Math.max(...all.flatMap((s) => s.allies.map((a) => a.y)));
ok("동료 발이 풀밭 선 아래 — 가장 높은 발 ≤ 땅 높이 − 4px", topFeet <= base.ground - 4, `발 ${topFeet} · 땅 ${base.ground}`);
ok("페이지 오류 없음", errors.length === 0, errors.slice(0, 2).join(" / "));
console.log(fails ? `${fails} FAIL` : "ALL PASS");
await browser.close();
process.exit(fails ? 1 : 0);
