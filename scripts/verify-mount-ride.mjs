/**
 * 탈것 자세 (2026-11-05, 사용자: "탈것을 탈 때 탄 애니메이션도 같이 공격 방어 이동 자세를 취하게")
 *   node scripts/verify-mount-ride.mjs [캡처 폴더]   (vite dev 서버 5173 필요)
 * 탈것이 달리기 · 공격 · 방어 줄을 실제로 돈다 · 주인공이 안장을 따라 움직인다 · 방어 시트를 쓴다 · 안 타면 방어 시트를 받지 않는다.
 */
import { launchBrowser } from "./launch-browser.mjs";
const OUT = process.argv[2], BASE = "http://localhost:5173", H = "mock-local-dev", now = Date.now();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = []; const ok = (n, c, d = "") => results.push([c ? "PASS" : "FAIL", n, d]);
const browser = await launchBrowser({ args: ["--no-sandbox", "--disable-gpu"] });
const page = await browser.newPage();
const errors = []; page.on("pageerror", (e) => errors.push(String(e.message).slice(0, 200)));
const missing = []; page.on("response", (r) => { if (r.status() === 404 && /titans\//.test(r.url())) missing.push(r.url().slice(-48)); });
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const seed = async (extra = {}) => {
  const party = ["mia", "leon"], heroes = { mia: 6, leon: 6 };
  const progress = { version: 5, onboardingStep: 4, level: 40, redGems: 500, titanBestStage: 40, pioneeredArea: 5, idleClaimedAt: now, updatedAt: now, partyIds: party, partyCap: 4, sessionCount: 9, ...extra };
  const titans = { stage: 3, bestStage: 40, gold: 500000, heroes, party, lastActiveAt: now };
  await page.goto(`${BASE}/favicon.png`, { waitUntil: "domcontentloaded" });
  await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); location.href = "/"; }, {
    [`dodgebullets:progression:v1:${H}`]: JSON.stringify(progress), [`dodgebullets:titans:${H}`]: JSON.stringify(titans), "dodge-bullets:soundEnabled": "0", "dodgebullets:qa-gems": "0", "dodgebullets:test-phase": "0",
    [`dodgebullets:attendance:v1:${H}`]: JSON.stringify({ lastClaimDate: new Date().toLocaleDateString("sv-SE"), totalDays: 3, consecutiveDays: 3 }),
  }).catch(() => {});
  await page.waitForNavigation({ waitUntil: "networkidle0" }).catch(() => {});
  await sleep(300);
  for (let i = 0; i < 3; i += 1) { await page.evaluate(() => { document.querySelector(".rebalance-modal")?.click(); document.querySelector(".idle-claim")?.click(); }); await sleep(200); }
};
const clipField = () => page.evaluate(() => { const f = document.querySelector(".titans-field").getBoundingClientRect(); return { x: f.left, y: f.top + f.height * 0.3, width: f.width, height: f.height * 0.62 }; });

for (const mount of ["boar", "drake"]) {
  await seed({ mounts: { [mount]: 1 }, activeMount: mount });
  const seen = {}; const riderTf = new Set(), cells = new Set(), modes = new Set(); const shots = new Set(); let overField = 0;
  const t0 = Date.now();
  while (Date.now() - t0 < 70000) {
    const s = await page.evaluate(() => {
      const m = document.querySelector(".hero-mount"), r = document.querySelector(".ride-rider"), c = document.querySelector(".titans-hero .equipped-character"), f = document.querySelector(".titans-field");
      if (!m || !r || !c || !f) return null;
      const on = c.querySelector(".equipment-base.is-on"), fr = f.getBoundingClientRect(), mr = m.getBoundingClientRect();
      return { act: m.dataset.action, pos: getComputedStyle(m.querySelector("i")).backgroundPosition, tf: r.style.transform, mode: [...c.classList].find((x) => x.startsWith("mode-")), sheet: /hero-ride-(idle|walk|attack|guard)/.exec(on?.style.backgroundImage ?? "")?.[1], over: Math.max(0, fr.left - mr.left, mr.right - fr.right) };
    });
    if (s) {
      seen[s.act] = (seen[s.act] ?? 0) + 1; cells.add(`${s.act} ${s.pos}`); riderTf.add(`${s.act} ${s.tf}`); modes.add(`${s.act}:${s.mode}:${s.sheet}`);
      if (s.act !== "walk") overField = Math.max(overField, s.over);
      if (OUT && !shots.has(s.act) && (seen[s.act] ?? 0) >= (s.act === "idle" ? 4 : 2)) { shots.add(s.act); await page.screenshot({ path: `${OUT}/${mount}-${s.act}.png`, clip: await clipField() }); }
    }
    if (seen.guard >= 2 && seen.attack >= 4 && seen.walk >= 10 && seen.idle >= 2) break;
    await sleep(45);
  }
  const cellsOf = (a) => [...cells].filter((c) => c.startsWith(`${a} `)).length;
  ok(`${mount}: 네 동작을 다 돈다(대기 · 달리기 · 공격 · 방어)`, ["idle", "walk", "attack", "guard"].every((a) => seen[a] > 0), JSON.stringify(seen));
  ok(`${mount}: 달리기 · 공격 줄은 여러 칸을 넘긴다`, cellsOf("walk") >= 3 && cellsOf("attack") >= 2, `달리기 ${cellsOf("walk")} · 공격 ${cellsOf("attack")} · 방어 ${cellsOf("guard")}`);
  ok(`${mount}: 주인공이 안장을 따라 움직인다`, new Set([...riderTf].map((t) => t.split(" ").slice(1).join(" "))).size >= 4, `${riderTf.size}가지`);
  ok(`${mount}: 동작마다 앉은 자세 시트가 맞다`, [...modes].every((m) => { const [a, mo, sh] = m.split(":"); return mo === `mode-${a}` && sh === a; }), [...modes].join(" "));
  ok(`${mount}: 멈춘 자세에서 탈것이 전장 밖으로 안 나간다`, overField <= 2, `${overField}px`);
}

await seed();
await sleep(1500);
const plain = await page.evaluate(() => ({ mount: !!document.querySelector(".hero-mount"), rider: !!document.querySelector(".ride-rider"), guard: document.querySelectorAll(".titans-hero .sheet-guard").length, modes: document.querySelectorAll(".titans-hero .equipment-base").length }));
ok("안 타면 맨 그대로: 탈것 · 방어 시트 없음", !plain.mount && !plain.rider && plain.guard === 0 && plain.modes === 3, JSON.stringify(plain));

ok("페이지 오류 없음", errors.length === 0, errors.join(" | "));
ok("빠진 그림 없음", missing.length === 0, missing.slice(0, 4).join(" | "));
await browser.close();
for (const [s, n, d] of results) console.log(`${s} ${n}${d ? ` — ${d}` : ""}`);
const fail = results.filter((r) => r[0] === "FAIL").length;
console.log(fail ? `${fail} FAIL` : "ALL PASS");
process.exit(fail ? 1 : 0);
