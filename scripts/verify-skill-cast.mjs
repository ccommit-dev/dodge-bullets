/**
 * 사냥터 스킬 발동 검사 (2026-10-06, 사용자: "스킬이 현재 모험가 기준으로 발동되는지 구분이 안되") — dev 서버 5173.
 * 진짜 탭(page.touchscreen)으로 하단 스킬 버튼을 눌러:
 *   투사체가 영웅 가까이(40px)에서 출발해 몬스터 쪽으로 날아가고 · 명중이 몬스터에서 터지고 · 숫자가 몬스터 위에 스킬 이름과 뜨고 ·
 *   영웅 머리 위에 시전 이름표 · 버프 스킬은 영웅 위 강화 칸 · 동료 강화는 영웅 → 동료 연결선 · 화면 가운데 이름 컷인은 없다
 *   node scripts/verify-skill-cast.mjs [outDir]
 */
import { mkdirSync } from "node:fs";
import { launchBrowser } from "./launch-browser.mjs";
const OUT = process.argv[2] ?? "store/screens/skill-cast";
mkdirSync(OUT, { recursive: true });
const BASE = "http://localhost:5173", H = "mock-local-dev", now = Date.now();
const browser = await launchBrowser({ args: ["--no-sandbox", "--disable-gpu"] });
const page = await browser.newPage();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = []; page.on("pageerror", (e) => errors.push(String(e.stack ?? e).slice(0, 300)));
const results = [];
const ok = (name, cond, detail = "") => { results.push([cond ? "PASS" : "FAIL", name, detail]); };
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.goto(BASE, { waitUntil: "networkidle0" });
await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); }, {
  [`dodgebullets:progression:v1:${H}`]: JSON.stringify({ version: 5, onboardingStep: 4, level: 30, exp: 1000, redGems: 100, idleClaimedAt: now, updatedAt: now, partyIds: ["mia", "leon"], partyCap: 4, sessionCount: 1, pioneeredArea: 3 }),
  [`dodgebullets:titans:${H}`]: JSON.stringify({ stage: 12, bestStage: 12, gold: 500000, heroes: { mia: 12, leon: 8 },
    skillInventory: { learned: ["strike", "crit", "stoneGuard", "meteor"], levels: { strike: 3, crit: 1, stoneGuard: 1, meteor: 1 }, equipped: { starter: "strike", linkA: "stoneGuard", finisher: "meteor" }, skillCores: 10, autoCast: false }, lastActiveAt: now }),
  "dodge-bullets:soundEnabled": "0",
  [`dodgebullets:attendance:v1:${H}`]: JSON.stringify({ lastClaimDate: new Date().toLocaleDateString("sv-SE"), totalDays: 3, consecutiveDays: 3 }),
});
await page.goto(BASE, { waitUntil: "networkidle0" });
await sleep(2600);
await page.evaluate(() => { for (let k = 0; k < 4; k += 1) { const c = document.querySelector(".idle-claim"); if (c) c.click(); } });
// 교전이 붙을 때까지
for (let i = 0; i < 30; i += 1) { if (await page.evaluate(() => !!document.querySelector(".titans-hero.is-engaged:not(.is-approaching)"))) break; await sleep(300); }
await sleep(500);

const tapSkill = async (id) => {
  const c = await page.evaluate((id) => {
    const b = [...document.querySelectorAll(".titans-skill")].find((x) => x.querySelector(`.skill-icon-${id}`));
    if (!b || b.disabled) return null;
    const r = b.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2];
  }, id);
  if (!c) return false;
  await page.touchscreen.tap(c[0], c[1]);
  return true;
};
const geom = () => page.evaluate(() => {
  const f = document.querySelector(".titans-field").getBoundingClientRect();
  const h = (document.querySelector(".titans-hero .titans-hero-facing") ?? document.querySelector(".titans-hero")).getBoundingClientRect();
  const m = document.querySelector(".titans-monster").getBoundingClientRect();
  const shots = [...document.querySelectorAll(".skill-shot")].map((s) => {
    const cs = getComputedStyle(s);
    return { kind: [...s.classList].find((c) => c.startsWith("shot-")), el: [...s.classList].find((c) => c.startsWith("el-")), x: parseFloat(s.style.left), y: parseFloat(s.style.top), dx: parseFloat(cs.getPropertyValue("--dx")), dy: parseFloat(cs.getPropertyValue("--dy")), skill: s.dataset.skill };
  });
  return {
    hero: { x: h.left + h.width / 2 - f.left, y: h.top + h.height / 2 - f.top, w: h.width, h: h.height },
    mon: { x: m.left + m.width / 2 - f.left, y: m.top + m.height / 2 - f.top, w: m.width, h: m.height },
    shots,
    tag: document.querySelector(".titans-hero .hero-cast-tag")?.textContent ?? "",
    cutinName: !!document.querySelector(".skill-cutin .cutin-name"),
    floats: [...document.querySelectorAll(".titans-float.src-skill")].map((e) => { const r = e.getBoundingClientRect(); return { text: e.textContent, x: r.left + r.width / 2 - f.left, y: r.top + r.height / 2 - f.top }; }),
    tray: [...document.querySelectorAll(".hero-buff-tray .hero-buff")].length,
  };
});

// 나타나는 순간을 기록한다 — 명중(0.6초)·숫자(0.9초)는 스크린샷 사이에 사라진다
await page.evaluate(() => {
  window.__castLog = [];
  const f = () => document.querySelector(".titans-field").getBoundingClientRect();
  new MutationObserver((ms) => {
    for (const m of ms) for (const n of m.addedNodes) {
      if (!(n instanceof Element)) continue;
      const fr = f();
      if (n.matches(".skill-shot.shot-impact")) window.__castLog.push({ type: "impact", x: parseFloat(n.style.left), y: parseFloat(n.style.top), t: performance.now() });
      if (n.matches(".titans-float.src-skill")) { const r = n.getBoundingClientRect(); window.__castLog.push({ type: "float", text: n.textContent, x: r.left + r.width / 2 - fr.left, y: r.top + r.height / 2 - fr.top, t: performance.now() }); }
      if (n.matches(".skill-shot.shot-shot")) { const cs = getComputedStyle(n); window.__castLog.push({ type: "shot", x: parseFloat(n.style.left), y: parseFloat(n.style.top), dx: parseFloat(cs.getPropertyValue("--dx")), dy: parseFloat(cs.getPropertyValue("--dy")), t: performance.now() }); }
    }
  }).observe(document.querySelector(".titans-field"), { childList: true, subtree: true });
});
// ① 시동기(초승 검격) — 투사체
ok("시동기 버튼을 진짜 탭", await tapSkill("strike"));
await sleep(40);
await page.screenshot({ path: `${OUT}/cast-0ms.png` });
const g0 = await geom();
await sleep(110);
await page.screenshot({ path: `${OUT}/cast-150ms.png` });
await sleep(150);
await page.screenshot({ path: `${OUT}/cast-300ms.png` });
const g1 = await geom();
const shot = (await page.evaluate(() => window.__castLog)).find((e) => e.type === "shot");
const near = (a, b, d) => Math.hypot(a.x - b.x, a.y - b.y) <= d;
ok("투사체가 영웅 가까이(몸 반경 + 40px)에서 출발한다", !!shot && near(shot, g0.hero, Math.max(g0.hero.w, g0.hero.h) / 2 + 40), JSON.stringify({ shot, hero: g0.hero }));
ok("투사체 끝이 몬스터 몸 안", !!shot && near({ x: shot.x + shot.dx, y: shot.y + shot.dy }, g0.mon, Math.max(g0.mon.w, g0.mon.h) / 2), JSON.stringify({ end: shot && { x: shot.x + shot.dx, y: shot.y + shot.dy }, mon: g0.mon }));
ok("영웅 발밑 원소 오라", g0.shots.some((s) => s.kind === "shot-aura" && near(s, g0.hero, g0.hero.h)), JSON.stringify(g0.shots.map((s) => s.kind)));
ok("영웅 머리 위 시전 이름표(초승 검격) · 화면 가운데 이름 컷인은 없다", /초승 검격/.test(g0.tag) && !g0.cutinName, g0.tag);
const log = await page.evaluate(() => window.__castLog);
const shotT = log.find((e) => e.type === "shot")?.t ?? 0;
const impact = log.find((e) => e.type === "impact");
ok("명중은 몬스터에서 · 투사체가 날아간 뒤(0.2초 이상) 터진다", !!impact && near(impact, g1.mon, Math.max(g1.mon.w, g1.mon.h) / 2) && impact.t - shotT >= 180, JSON.stringify({ impact, dt: impact && Math.round(impact.t - shotT), mon: g1.mon }));
const fl = log.find((e) => e.type === "float" && /초승 검격/.test(e.text));
ok("피해 숫자가 몬스터 위에 스킬 이름과 함께", !!fl && near(fl, g1.mon, Math.max(g1.mon.w, g1.mon.h)), JSON.stringify(log.filter((e) => e.type === "float")));
await sleep(900);

// ② 동료 강화(대지 수호) — 영웅 → 동료 연결선 · 강화 칸
ok("연계 버튼(대지 수호) 진짜 탭", await tapSkill("stoneGuard"));
await sleep(200);
const g2 = await geom();
await page.screenshot({ path: `${OUT}/buff-link.png` });
const links = g2.shots.filter((s) => s.kind === "shot-link");
ok("동료 강화는 영웅에서 동료 수만큼 연결선", links.length === 2 && links.every((l) => near(l, g2.hero, Math.max(g2.hero.w, g2.hero.h) / 2 + 40)), JSON.stringify(links));
await sleep(400);
const g3 = await geom();
ok("걸린 강화는 영웅 머리 위 칸에 아이콘 + 남은 초", g3.tray >= 1, String(g3.tray));
await sleep(700);

// ③ 마무리(유성 낙하) — 큰 투사체
ok("마무리 버튼(유성 낙하) 진짜 탭", await tapSkill("meteor"));
await sleep(60);
const g4 = await geom();
await page.screenshot({ path: `${OUT}/finisher.png` });
ok("마무리는 큰 투사체", g4.shots.some((s) => s.kind === "shot-shot" && s.skill === "meteor"), JSON.stringify(g4.shots.map((s) => s.kind + "/" + s.skill)));
ok("페이지 오류 없음", errors.length === 0, errors.slice(0, 2).join(" | "));
for (const [st, n, d] of results) console.log(st, n, d ? "— " + d : "");
console.log(results.every((r) => r[0] === "PASS") ? "ALL PASS" : "SOME FAIL");
await browser.close();
process.exit(results.every((r) => r[0] === "PASS") ? 0 : 1);
