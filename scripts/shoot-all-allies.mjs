/**
 * 동료 20명 실전 사냥터 캡처 (2026-10-14, 사용자: "동료 애니메이션이 아직 왼쪽 · 오른쪽 리소스로 모두").
 *   node scripts/shoot-all-allies.mjs <outDir>   (vite 5173, 폰 390×844)
 * 출전 가능한 동료(은퇴 7명 제외 13명)를 4명씩 파티로 전원 출전시켜(개척 끝 · Stage 50) 필드를 찍고, 동료 스프라이트에 좌우 반전(scaleX −1·face-left)이 없는지 잰다.
 * 마지막으로 힐러 4명 파티에서 스킬 쿨타임이 실제 시간보다 빨리 줄어드는지(빛 고리 −0.25초) 잰다.
 */
import { launchBrowser } from "./launch-browser.mjs";
import { mkdirSync } from "node:fs";

const OUT = process.argv[2] ?? "shots-all-allies"; mkdirSync(OUT, { recursive: true });
const BASE = "http://localhost:5173", H = "mock-local-dev";
// 은퇴(RETIRED_ALLY_IDS: cain·mia_dark·zephyr·iris·terra·sylph·sera_light)는 로스터·뽑기·편성에 없다 — 출전 가능한 13명만
const PARTIES = [
  ["mia", "leon", "sera", "garen"],
  ["ari", "nox", "luna", "volt"],
  ["pyro", "marina", "bronn", "orion"],
  ["ember", "mia", "garen", "luna"],
];
const ALL = [...new Set(PARTIES.flat())];
const results = []; const ok = (n, c, d = "") => results.push([c ? "PASS" : "FAIL", n, d]);
const browser = await launchBrowser({ args: ["--no-sandbox", "--disable-gpu"] });
const page = await browser.newPage();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = []; page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.goto(BASE, { waitUntil: "networkidle0" });

async function openWith(party, extraTitans = {}) {
  const now = Date.now();
  const progress = { version: 5, level: 60, sharedCoins: 9999, dodgeBestStage: 50, idleClaimedAt: now, updatedAt: now, onboardingStep: 4, partyIds: party, partyCap: 4, redGems: 50, claimedRewards: ["dodge-tutorial"], pioneeredArea: 99, towerOpen: true };
  const titans = { gold: 1e9, stage: 50, bestStage: 50, heroes: Object.fromEntries(ALL.map((id) => [id, 5])), lastActiveAt: now, skillInventory: { learned: ["strike"], levels: { strike: 1 }, equipped: { starter: "strike" }, skillCores: 0 }, ...extraTitans };
  await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); }, { [`dodgebullets:progression:v1:${H}`]: JSON.stringify(progress), [`dodgebullets:titans:${H}`]: JSON.stringify(titans), "dodge-bullets:soundEnabled": "0", "dodgebullets:test-phase": "0" });
  await page.reload({ waitUntil: "networkidle0" }); await sleep(2600);
  await page.evaluate(() => { for (let k = 0; k < 4; k += 1) { const c = document.querySelector(".idle-claim"); if (c) { c.click(); continue; } const b = [...document.querySelectorAll("button")].filter((x) => /^(닫기|확인|나중에)$/.test(x.textContent.trim()))[0]; if (b) b.click(); } });
  await sleep(1200);
}

const seen = new Set();
for (const [i, party] of PARTIES.entries()) {
  await openWith(party);
  const r = await page.evaluate(() => [...document.querySelectorAll(".titans-allies .titan-ally-art")].map((el) => {
    const id = [...el.classList].find((c) => c.startsWith("ally-"))?.slice(5);
    const chain = [el, el.querySelector(".ally-body")].filter(Boolean);
    const mirrored = chain.some((n) => { const t = getComputedStyle(n).transform; if (!t || t === "none") return false; const m = t.match(/matrix\(([^,]+)/); return m ? parseFloat(m[1]) < 0 : false; }) || el.className.includes("face-left");
    return { id, mirrored, bg: (el.querySelector(".ally-body")?.style.backgroundImage ?? "").replace(/.*\//, "").slice(0, 40) };
  }));
  for (const a of r) seen.add(a.id);
  const field = await page.$(".titans-field");
  await (field ?? page).screenshot({ path: `${OUT}/party-${i + 1}-${party.join("-")}.png` });
  ok(`파티 ${i + 1} (${party.join("·")}): 4명 모두 출전 · 좌우 반전 없음`, party.every((id) => r.some((a) => a.id === id)) && r.every((a) => !a.mirrored), JSON.stringify(r));
}
ok(`출전 가능한 동료 ${ALL.length}명 전원이 사냥터에 실제로 그려졌다`, ALL.every((id) => seen.has(id)), [...ALL].filter((id) => !seen.has(id)).join(",") || "all");

// 힐러 빛 고리 — 힐러 4명 파티는 쿨타임이 실제 시간보다 빨리 준다 (대조: 힐러 없는 파티)
async function cdDrop(party) {
  await openWith(party);
  const clicked = await page.evaluate(() => { const b = [...document.querySelectorAll(".titans-skill")].find((x) => x.getAttribute("aria-label") && !x.disabled); b?.click(); return b?.getAttribute("aria-label") ?? null; });
  await sleep(300);
  const read = () => page.evaluate(() => { const t = [...document.querySelectorAll(".titans-skill small")].map((x) => x.textContent).find((x) => /[0-9]+[.][0-9]s$/.test(x)); return t ? parseFloat(t) : null; });
  const c0 = await read(); const t0 = Date.now(); await sleep(6000); const c1 = await read();
  return { clicked, c0, c1, wall: (Date.now() - t0) / 1000, drop: c0 !== null && c1 !== null ? c0 - c1 : null };
}
const heal = await cdDrop(["luna", "marina", "sera", "mia"]);
const ctrl = await cdDrop(["leon", "nox", "ari", "mia"]);
ok("힐러 빛 고리: 힐러 파티는 쿨타임이 실제 시간보다 더 빨리 준다 · 힐러 없는 파티는 실제 시간만큼", heal.drop !== null && ctrl.drop !== null && heal.drop > heal.wall + 0.2 && Math.abs(ctrl.drop - ctrl.wall) < 0.6, JSON.stringify({ heal, ctrl }));
// 탱커 충격파 — 대장전 중 충격파가 나가면 그 뒤 0.2초 동안 대장 제한 시간이 줄지 않는다 (DEV 훅 __huntState·__huntSigLog).
// Stage 9 계정에서 '보스 도전'이 뜨면 누르고, 대장전 동안 40ms 마다 제한 시간을 읽는다 — 최대 100초
{
  await openWith(["garen", "bronn", "mia", "leon"], { stage: 9, bestStage: 9, heroes: Object.fromEntries(ALL.map((id) => [id, 2])) });
  await page.evaluate(() => { window.__huntSigLog = []; });
  const samples = []; const t0 = Date.now();
  while (Date.now() - t0 < 100000) {
    const st = await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => x.textContent.includes("보스 도전")); b?.click(); return window.__huntState?.() ?? null; });
    if (st?.boss) samples.push(st);
    const quakes = await page.evaluate(() => (window.__huntSigLog ?? []).filter((e) => e.fx === "quake" && e.boss).length);
    if (quakes >= 3) break;
    await sleep(st?.boss ? 30 : 400);
  }
  const log = await page.evaluate(() => window.__huntSigLog ?? []);
  const quakes = log.filter((e) => e.fx === "quake" && e.boss);
  // 각 충격파 뒤 20~170ms 안의 표본은 제한 시간이 그대로여야 한다
  const held = quakes.map((q) => { const w = samples.filter((p) => p.now > q.t + 20 && p.now < q.t + 170); return { id: q.id, n: w.length, spread: w.length ? Math.max(...w.map((p) => p.bossLeft)) - Math.min(...w.map((p) => p.bossLeft)) : null }; }).filter((h) => h.n >= 2);
  // 대조: 정지가 아닌 구간에선 줄어든다(같은 시간 폭에서 0.08초 이상)
  const free = samples.filter((p) => p.now > p.freezeUntil + 20);
  let moving = 0; for (let i = 1; i < free.length; i += 1) if (free[i].now - free[i - 1].now < 200 && free[i - 1].bossLeft - free[i].bossLeft > 0.02) moving += 1;
  ok("탱커 충격파: 대장전 중 충격파 뒤 0.2초 동안 대장 제한 시간이 멈춘다(정지 아닌 구간은 줄어든다)", held.length >= 1 && held.every((h) => h.spread !== null && h.spread < 0.005) && moving >= 3, JSON.stringify({ quakes: quakes.length, held, moving, samples: samples.length }));
  ok("힐러·탱커 부가 효과 로그: 힐러는 대장전이 아니어도, 탱커 정지는 대장전에서만", log.every((e) => e.fx !== "quake" || typeof e.boss === "boolean"), String(log.length));
}
ok("페이지 오류 없음", errors.length === 0, errors.join(" / "));
for (const [s, n, d] of results) console.log(s, n, d ? "— " + d : "");
const fails = results.filter((r) => r[0] === "FAIL").length;
console.log(fails ? `\n${fails} FAIL` : "\nALL PASS");
await browser.close();
process.exit(fails ? 1 : 0);
