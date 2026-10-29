/**
 * 동료 대형 충돌 검사 (2026-10-14, 사용자: "스테이지 클리어마다 동료가 같은 자리로 걸어가고 동료끼리 충돌체크가 안 돼서 어색").
 *   node scripts/verify-formation.mjs [outDir]   (vite 5173, 폰 390×844)
 * verify-play-art 는 같은 줄끼리·교전 정지 순간만 쟀다(다른 줄 겹침은 "깊이"로 허용) — 사용자가 바로 그 겹침을 지적했다.
 * 여기선 파티 5종(혼합·근접만·후열만·힐러 많음·변형)을 ~12초씩 돌리며 **모든 단계**(교전·접근·스테이지 전환)에서
 * 동료 본체(.ally-body 가운데 45% 폭 · 위 12% 제외)끼리, 동료와 주인공 본체끼리 겹침을 줄과 상관없이 잰다.
 *   기준: 교전 정지 중 쌍별 겹침 중앙값 ≤ 12% · 최대 ≤ 25% / 걷는 중(접근·전환) 쌍별 중앙값 ≤ 20%
 *   교전 위치: 동료끼리 발 위치(가운데 x, 바닥 y)가 본체 폭 절반 이상 떨어진다(같은 자리 0)
 */
import { launchBrowser } from "./launch-browser.mjs";
import { mkdirSync } from "node:fs";

const OUT = process.argv[2] ?? "shots-formation"; mkdirSync(OUT, { recursive: true });
const BASE = "http://localhost:5173", H = "mock-local-dev";
const PARTIES = {
  mixed: ["mia", "garen", "luna", "leon"],
  melee: ["mia", "garen", "ari", "nox"],
  back: ["leon", "sera", "luna", "orion"],
  healers: ["luna", "marina", "sera", "volt"],
  variants: ["pyro", "bronn", "ember", "mia"],
  playart: ["luna", "bronn", "orion", "ember"],   // verify-play-art 와 같은 파티
};
const results = []; const ok = (n, c, d = "") => results.push([c ? "PASS" : "FAIL", n, d]);
const browser = await launchBrowser({ args: ["--no-sandbox", "--disable-gpu"] });
const page = await browser.newPage();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.goto(BASE, { waitUntil: "networkidle0" });

const rects = () => page.evaluate(() => {
  const core = (el, frac, topCut = 0.12) => { const b = el.getBoundingClientRect(); const w = b.width * frac; return { x: b.x + (b.width - w) / 2, y: b.y + b.height * topCut, w, h: b.height * (1 - topCut) }; };
  const field = document.querySelector(".titans-field");
  const allies = [...document.querySelectorAll(".titans-allies .titan-ally-art")].map((e) => { const body = e.querySelector(".ally-body") ?? e; return { id: (e.className.match(/ ally-([a-z_]+)/) || [])[1], approaching: e.classList.contains("is-approaching"), engaged: e.classList.contains("is-engaged"), ...core(body, 0.45) }; });
  const hero = document.querySelector(".titans-hero .equipment-base") ?? document.querySelector(".titans-hero");
  const phase = (field?.className.match(/phase-([a-z-]+)/) || [])[1] || "";
  return { phase, heroApproaching: !!document.querySelector(".titans-hero.is-approaching"), allies, hero: hero ? core(hero, 0.55) : null };
});
const inter = (a, b) => { const x = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)); const y = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)); return (x * y) / Math.min(a.w * a.h, b.w * b.h); };
const median = (arr) => { const s = [...arr].sort((a, b) => a - b); return s[Math.floor(s.length / 2)] ?? 0; };

for (const [name, party] of Object.entries(PARTIES)) {
  const now = Date.now();
  const progress = { version: 5, level: 40, sharedCoins: 9999, dodgeBestStage: 50, idleClaimedAt: now, updatedAt: now, onboardingStep: 4, partyIds: party, partyCap: 4, redGems: 50, claimedRewards: ["dodge-tutorial"], pioneeredArea: 99 };
  const titans = { gold: 1e9, stage: 40, bestStage: 40, heroes: Object.fromEntries(party.map((id) => [id, 60])), lastActiveAt: now };   // 해금 스테이지(오리온 30 등) 위 · 교전이 몇 초는 이어지게
  // 쓰기와 reload 를 한 evaluate 안에서 — 사이에 앞 시나리오의 사냥터가 옛 상태를 저장하면 동료가 안 떠 표본 0 이었다(2026-10-28 전체 검사). 편성이 다르면 다시
  const seedOnce = async () => { await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); location.reload(); }, { [`dodgebullets:progression:v1:${H}`]: JSON.stringify(progress), [`dodgebullets:titans:${H}`]: JSON.stringify(titans), "dodge-bullets:soundEnabled": "0", "dodgebullets:test-phase": "0" }); await page.waitForNavigation({ waitUntil: "networkidle0" }).catch(() => {}); await sleep(2200); };
  await seedOnce();
  for (let k = 0; k < 2 && JSON.stringify(JSON.parse(await page.evaluate((H) => localStorage.getItem(`dodgebullets:progression:v1:${H}`) ?? "{}", H)).partyIds) !== JSON.stringify(party); k += 1) await seedOnce();
  await page.evaluate(() => { for (let k = 0; k < 4; k += 1) { const c = document.querySelector(".idle-claim"); if (c) { c.click(); continue; } const b = [...document.querySelectorAll("button")].filter((x) => /^(닫기|확인|나중에)$/.test(x.textContent.trim()))[0]; if (b) b.click(); } });
  // 2026-10-20: 첫 시나리오가 불러온 직후 안내 창에 가려 동료 표본 0개로 가끔 끝났다 — 창을 다시 닫고 동료가 둘 이상 보일 때까지(최대 8초) 기다린다
  for (let w = 0; w < 75; w += 1) {   // 8 → 15초(2026-10-28 — 전체 검사 부하에서 [variants] 동료가 8초 안에 안 떠 표본 0)
    const s0 = await rects(); if (s0.allies.length >= 2) break;
    await page.evaluate(() => { const c = document.querySelector(".idle-claim"); if (c) c.click(); const b = [...document.querySelectorAll("button")].filter((x) => /^(닫기|확인|나중에)$/.test(x.textContent.trim()))[0]; if (b) b.click(); });
    await sleep(200);
  }
  const combat = new Map(), walking = new Map(), heroC = new Map(), feet = [];
  const push = (m, k, v) => { if (!m.has(k)) m.set(k, []); m.get(k).push(v); };
  let shots = 0, phases = new Set();
  for (let t = 0; t < 80; t += 1) {
    const s = await rects(); phases.add(s.phase);
    const moving = s.heroApproaching || s.allies.some((a) => a.approaching) || /stage-/.test(s.phase);
    const settled = s.phase === "combat" && !moving;
    for (let i = 0; i < s.allies.length; i += 1) for (let j = i + 1; j < s.allies.length; j += 1) push(settled ? combat : walking, `${s.allies[i].id}×${s.allies[j].id}`, inter(s.allies[i], s.allies[j]));
    if (settled && s.hero) for (const a of s.allies) push(heroC, `${a.id}×hero`, inter(a, s.hero));
    if (settled && feet.length < 6) feet.push(s.allies.map((a) => ({ id: a.id, cx: a.x + a.w / 2, by: a.y + a.h, w: a.w })));
    if ((settled && shots < 2 && t > 8) || (moving && shots < 3 && t > 20 && t % 7 === 0)) { const f = await page.$(".titans-field"); await (f ?? page).screenshot({ path: `${OUT}/${name}-${shots}-${settled ? "combat" : "walk"}.png` }); shots += 1; }
    await sleep(150);
  }
  const worst = (m, fn) => { let best = { v: 0, pair: "" }; for (const [k, arr] of m) { const v = fn(arr); if (v > best.v) best = { v, pair: k }; } return best; };
  const cMed = worst(combat, median), cMax = worst(combat, (a) => Math.max(...a)), wMed = worst(walking, median), hMed = worst(heroC, median);
  const sameSpot = feet.some((row) => row.some((a, i) => row.some((b, j) => j > i && Math.abs(a.cx - b.cx) < a.w * 0.5 && Math.abs(a.by - b.by) < 14)));
  ok(`[${name}] 교전 정지: 동료끼리 겹침 중앙값 ≤ 12% · 최대 ≤ 25% (줄 무관)`, combat.size > 0 && cMed.v <= 0.12 && cMax.v <= 0.25, `med ${cMed.pair} ${(cMed.v * 100).toFixed(0)}% · max ${cMax.pair} ${(cMax.v * 100).toFixed(0)}% · 표본 ${[...combat.values()][0]?.length ?? 0}`);
  ok(`[${name}] 걷는 중(접근·스테이지 전환): 동료끼리 겹침 중앙값 ≤ 20%`, walking.size > 0 && wMed.v <= 0.2, `${wMed.pair} ${(wMed.v * 100).toFixed(0)}% · 단계 ${[...phases].join("/")}`);
  ok(`[${name}] 교전 위치: 같은 자리에 선 동료 없음`, feet.length > 0 && !sameSpot, JSON.stringify(feet[0]?.map((a) => [a.id, Math.round(a.cx), Math.round(a.by)])));
  ok(`[${name}] 동료-주인공 겹침 중앙값 ≤ 20%`, hMed.v <= 0.2, `${hMed.pair} ${(hMed.v * 100).toFixed(0)}%`);
}
for (const [s, n, d] of results) console.log(s, n, d ? "— " + d : "");
const fails = results.filter((r) => r[0] === "FAIL").length;
console.log(fails ? `\n${fails} FAIL` : "\nALL PASS");
await browser.close();
process.exit(fails ? 1 : 0);
