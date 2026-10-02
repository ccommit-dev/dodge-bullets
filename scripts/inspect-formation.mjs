/**
 * 사냥터 교전 대형 — 접근 구간에서 동료가 몬스터를 앞지르는지 시간순으로 잰다 (2026-10-01).
 *   node scripts/inspect-formation.mjs [outDir]   (vite dev 5173 필요)
 * 몬스터는 오른쪽에서 들어오고 근접 동료는 왼쪽(주인공 옆)에서 출발한다 — 접근 중에 동료의 몸 중심이
 * 몬스터의 몸 중심보다 오른쪽에 있으면 "앞질러 간" 것이다. 교전 정렬(formationReady) 뒤의 오른쪽 측면 슬롯은 설계다.
 */
import { launchBrowser } from "./launch-browser.mjs";
import { mkdirSync } from "node:fs";
const OUT = process.argv[2] ?? ""; if (OUT) mkdirSync(OUT, { recursive: true });
const BASE = "http://localhost:5173", H = "mock-local-dev";
const browser = await launchBrowser({ args: ["--no-sandbox", "--disable-gpu"] });
const page = await browser.newPage();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.goto(BASE, { waitUntil: "networkidle0" });
await page.evaluate((h) => {
  localStorage.clear();
  localStorage.setItem(`dodgebullets:progression:v1:${h}`, JSON.stringify({ equippedWeaponLevel: 10, onboardingStep: 99, tutorialDone: true, idleClaimedAt: Date.now(), pioneeredArea: 5, activeCharacter: "default", partyIds: ["mia", "garen", "ari", "nox", "pyro", "bronn"], partyCap: 6 }));
  localStorage.setItem(`dodgebullets:titans:${h}`, JSON.stringify({ stage: 22, heroes: { mia: 5, garen: 5, ari: 5, nox: 5, pyro: 5, bronn: 5 }, party: ["mia", "garen", "ari", "nox", "pyro", "bronn"], lastActiveAt: Date.now() }));
  localStorage.setItem("dodge-bullets:soundEnabled", "0");
}, H);
await page.goto(BASE, { waitUntil: "networkidle0" });
await sleep(2500);
await page.evaluate(() => { for (let k = 0; k < 4; k += 1) { const c = document.querySelector(".idle-claim"); if (c) { c.click(); continue; } const b = [...document.querySelectorAll("button")].filter((x) => !x.closest(".battle-alert-stack, .titans-bottom-nav, .hub-sheet, .nav-popup-grid")).find((x) => /출석|수령|확인|닫기|시작/.test(x.textContent)); if (!b) break; b.click(); } });
await sleep(800);

const sample = () => page.evaluate(() => {
  const core = (el, k) => { const b = el.getBoundingClientRect(); return { cx: b.x + b.width / 2, left: b.x + b.width * (1 - k) / 2, right: b.x + b.width - b.width * (1 - k) / 2 }; };
  const monster = document.querySelector(".titan-monster-art");
  const m = monster ? core(monster, 0.7) : null;
  const allies = [...document.querySelectorAll(".titans-allies .titan-ally-art")].map((e) => {
    const body = e.querySelector(".ally-body") || e;
    return { id: (e.className.match(/ ally-([a-z_]+)/) || [])[1], melee: e.classList.contains("combat-melee"), approaching: e.classList.contains("is-approaching"), faceLeft: e.classList.contains("face-left"), ...core(body, 0.45) };
  });
  return { phase: document.querySelector(".titans-field")?.className.match(/phase-([a-z-]+)/)?.[1], monster: m, allies };
});

// 새 교전이 시작될 때까지 몬스터를 두드려 잡는다
let series = [];
let encounters = 0;
for (let t = 0; t < 120 && encounters < 3; t += 1) {
  const s = await sample();
  if (s.allies.some((a) => a.approaching)) {
    // 접근 구간 — 80ms 간격으로 끝까지 기록
    const run = [];
    for (let k = 0; k < 40; k += 1) {
      const x = await sample();
      run.push(x);
      if (OUT && k === 6) await page.screenshot({ path: `${OUT}/approach-${encounters}-mid.png` });
      if (!x.allies.some((a) => a.approaching)) break;
      await sleep(80);
    }
    if (OUT) await page.screenshot({ path: `${OUT}/approach-${encounters}-ready.png` });
    series.push(run); encounters += 1;
    continue;
  }
  await page.evaluate(() => document.querySelector(".titan-monster-art")?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
  await sleep(300);
}
await browser.close();

let worst = 0, worstAt = "";
for (const [ei, run] of series.entries()) {
  for (const [k, s] of run.entries()) {
    if (!s.monster) continue;
    for (const a of s.allies) {
      if (!a.melee || !a.approaching) continue;
      const over = a.cx - s.monster.cx;
      if (over > worst) { worst = over; worstAt = `교전${ei} 표본${k} ${a.id} 동료중심 ${a.cx.toFixed(0)} vs 몬스터중심 ${s.monster.cx.toFixed(0)}`; }
    }
  }
}
console.log(`접근 구간 표본 ${series.reduce((n, r) => n + r.length, 0)}개 · 동료가 몬스터 중심보다 오른쪽으로 나간 최대 ${worst.toFixed(0)}px ${worstAt}`);
const ready = series.map((r) => r[r.length - 1]).filter((s) => s?.monster);
for (const s of ready) console.log("정렬 뒤:", s.allies.map((a) => `${a.id}${a.faceLeft ? "(우측)" : ""} ${a.cx.toFixed(0)}`).join(" · "), "| 몬스터", s.monster.cx.toFixed(0));
process.exit(worst > 0 ? 1 : 0);
