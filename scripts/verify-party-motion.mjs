/**
 * 거리 두고 싸우기 (2026-11-05, 사용자: "동료랑 펫이 너무 어색 — 몬스터/보스와 거리 유지하면서 랜덤하게 다가가서")
 *   node scripts/verify-party-motion.mjs [캡처 폴더]   (vite dev 서버 5173 필요)
 * 근접은 평소 떨어져 있다가 달려들어 몸에 닿고 물러난다 · 달려드는 거리와 머무는 시간이 매번 다르다 · 원거리는 제자리 근처 · 펫은 잰 거리로 뛴다.
 */
import { launchBrowser } from "./launch-browser.mjs";
const OUT = process.argv[2], BASE = "http://localhost:5173", H = "mock-local-dev", now = Date.now();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = []; const ok = (n, c, d = "") => results.push([c ? "PASS" : "FAIL", n, d]);
const browser = await launchBrowser({ args: ["--no-sandbox", "--disable-gpu"] });
const page = await browser.newPage();
const errors = []; page.on("pageerror", (e) => errors.push(String(e.message).slice(0, 200)));
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const seed = async (titans) => {
  const party = ["mia", "garen", "leon", "sera"];
  await page.goto(`${BASE}/favicon.png`, { waitUntil: "domcontentloaded" });
  await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); location.href = "/"; }, {
    [`dodgebullets:progression:v1:${H}`]: JSON.stringify({ version: 5, onboardingStep: 4, level: 40, redGems: 500, titanBestStage: 40, pioneeredArea: 5, idleClaimedAt: now, updatedAt: now, partyIds: party, partyCap: 4, sessionCount: 9, pets: { wolf: 2 }, activePet: "wolf" }),
    [`dodgebullets:titans:${H}`]: JSON.stringify({ stage: 30, bestStage: 40, gold: 1000, heroes: Object.fromEntries(party.map((p) => [p, 1])), party, lastActiveAt: now, ...titans }), "dodge-bullets:soundEnabled": "0",
    [`dodgebullets:attendance:v1:${H}`]: JSON.stringify({ lastClaimDate: new Date().toLocaleDateString("sv-SE"), totalDays: 3, consecutiveDays: 3 }),
  }).catch(() => {});
  await page.waitForNavigation({ waitUntil: "networkidle0" }).catch(() => {});
  await sleep(800);
  for (let i = 0; i < 3; i += 1) { await page.evaluate(() => { document.querySelector(".rebalance-modal")?.click(); document.querySelector(".idle-claim")?.click(); }); await sleep(200); }
};
for (const scene of ["일반 몬스터", "대장"]) {
  await seed({});
  for (let i = 0; i < 80; i += 1) { if (await page.evaluate(() => !!window.__huntStartBoss && document.querySelector(".titans-field")?.className.includes("phase-combat") && !document.querySelector(".titans-field")?.classList.contains("party-entering"))) break; await sleep(150); }
  if (scene === "대장") { await page.evaluate(() => window.__huntStartBoss()); await sleep(2600); }
  const log = {}; const pets = new Set(); let shot = false; const t0 = Date.now();
  while (Date.now() - t0 < 14000) {
    const rows = await page.evaluate(() => {
      const f = document.querySelector(".titans-field"); if (!f || !f.className.includes("phase-combat") || f.classList.contains("party-entering")) return null;
      const mon = f.querySelector(".titans-monster .titan-monster-art")?.getBoundingClientRect(); if (!mon || !mon.width) return null;
      const ml = parseFloat(getComputedStyle(f).getPropertyValue("--monster-ml")) || 0.22, edge = mon.left + mon.width * ml, fr = f.getBoundingClientRect();
      const pet = f.querySelector(".hero-pet");
      return { pet: pet?.dataset.petDx ?? "", allies: [...f.querySelectorAll(".titans-allies .titan-ally-art")].map((a) => { const b = a.querySelector(".ally-body").getBoundingClientRect(), w = a.querySelector(".ally-wander"); return { id: [...a.classList].find((c) => c.startsWith("ally-")), melee: a.classList.contains("combat-melee"), gap: Math.round(edge - (b.left + b.width * 0.72)), sortie: w.classList.contains("is-sortie"), tx: Math.round(parseFloat(w.style.translate) || 0), left: Math.round(b.left + b.width * .28 - fr.left), right: Math.round(b.right - fr.right) }; }) };
    });
    if (rows) {
      if (rows.pet) pets.add(rows.pet);
      for (const a of rows.allies) { const L = (log[a.id] ??= { melee: a.melee, restGap: [], hitGap: [], tx: new Set(), runs: 0, was: false, leftMin: 999, rightMax: -999 }); if (a.sortie) { L.hitGap.push(a.gap); L.tx.add(a.tx); if (!L.was) L.runs += 1; } else if (!a.sortie) L.restGap.push(a.gap); L.was = a.sortie; L.leftMin = Math.min(L.leftMin, a.left); L.rightMax = Math.max(L.rightMax, a.right); }
      if (OUT && !shot && rows.allies.some((a) => a.sortie && a.melee)) { shot = true; await page.screenshot({ path: `${OUT}/${scene}.png` }); }
    }
    await sleep(40);
  }
  const med = (v) => (v.length ? [...v].sort((a, b) => a - b)[v.length >> 1] : null);
  const melee = Object.entries(log).filter(([, L]) => L.melee), ranged = Object.entries(log).filter(([, L]) => !L.melee);
  const m = melee.map(([id, L]) => ({ id, rest: med(L.restGap), closest: L.hitGap.length ? Math.min(...L.hitGap) : null, runs: L.runs, kinds: L.tx.size }));
  ok(`${scene}: 근접은 평소 몬스터와 떨어져 선다(20px 넘게)`, melee.length >= 1 && m.every((x) => x.rest !== null && x.rest > 20), JSON.stringify(m));
  ok(`${scene}: 근접이 달려들어 몬스터 몸에 닿는다(12px 안)`, m.every((x) => x.closest !== null && x.closest <= 12), JSON.stringify(m.map((x) => x.closest)));
  ok(`${scene}: 달려들기를 되풀이하고 거리가 매번 다르다`, m.every((x) => x.runs >= 2 && x.kinds >= 2), JSON.stringify(m.map((x) => [x.runs, x.kinds])));
  ok(`${scene}: 원거리는 크게 움직이지 않는다(내딛어도 20px 안)`, ranged.every(([, L]) => [...L.tx].every((v) => v <= 20)), JSON.stringify(ranged.map(([id, L]) => [id, [...L.tx]])));
  ok(`${scene}: 전장 밖으로 안 나간다`, Object.values(log).every((L) => L.leftMin >= -6), JSON.stringify(Object.values(log).map((L) => L.leftMin)));
  ok(`${scene}: 펫이 잰 거리로 뛴다(값이 여러 가지)`, pets.size >= 2, [...pets].slice(0, 5).join(" "));
}
ok("페이지 오류 없음", errors.length === 0, errors.join(" | "));
await browser.close();
for (const [s, n, d] of results) console.log(`${s} ${n}${d ? ` — ${d}` : ""}`);
const fail = results.filter((r) => r[0] === "FAIL").length;
console.log(fail ? `${fail} FAIL` : "ALL PASS");
process.exit(fail ? 1 : 0);
