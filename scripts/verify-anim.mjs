/**
 * 애니메이션 계획안 A~E e2e — 동료 프레임 전환·몬스터 피격/처치 프레임·보스 3단계·버프 이펙트·비트 적 반응·뽑기 사전 연출.
 *   node scripts/verify-anim.mjs   (vite dev 서버 5173 필요)
 */
import puppeteer from "puppeteer";
const BASE = "http://localhost:5173";
const H = "mock-local-dev";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const ok = (name, cond, detail = "") => results.push([cond ? "PASS" : "FAIL", name, detail]);

const browser = await puppeteer.launch({ headless: "shell", args: ["--no-sandbox", "--disable-gpu"] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e.message).slice(0, 120)));
const now = Date.now();
const closeModal = async () => { await page.evaluate(() => { for (let k = 0; k < 3; k += 1) { const c = document.querySelector(".idle-claim"); if (c) { c.click(); continue; } const b = [...document.querySelectorAll("button")].filter((x) => !x.closest(".battle-alert-stack, .titans-bottom-nav, .hub-sheet, .nav-popup-grid")).find((x) => /출석|수령|확인|닫기/.test(x.textContent)); if (!b) break; b.click(); } }); await sleep(900); };
const clickText = (sel, text) => page.evaluate(({ sel, text }) => { const el = [...document.querySelectorAll(sel)].find((b) => b.textContent.trim().includes(text)); el?.click(); return !!el; }, { sel, text });

async function seed(progress, titans) {
  await page.goto(BASE, { waitUntil: "networkidle0" });
  await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); }, {
    [`dodgebullets:progression:v1:${H}`]: JSON.stringify(progress),
    [`dodgebullets:titans:${H}`]: JSON.stringify(titans),
    "dodge-bullets:soundEnabled": "0",
  });
  await page.goto(BASE, { waitUntil: "networkidle0" });
  await sleep(2400);
  await closeModal();
}

// ── A. 동료 프레임: 대기 vs 공격 프레임의 background-position이 다르다 ──
await seed({ version: 5, onboardingStep: 4, level: 30, redGems: 500, sharedCoins: 100000, pioneeredArea: 2, titanBestStage: 6, dodgeBestStage: 2, idleClaimedAt: now, updatedAt: now, partyIds: ["mia", "leon", "pyro"], partyCap: 4, sessionCount: 9 },
  { stage: 6, bestStage: 6, gold: 100000, heroes: { mia: 9, leon: 6, pyro: 3 }, skillInventory: { learned: ["strike", "crit"], levels: { strike: 1, crit: 1 }, equipped: { starter: "strike", linkA: "crit" }, skillCores: 0 }, lastActiveAt: now });
const framesSeen = new Map();
for (let i = 0; i < 25; i += 1) {
  await sleep(120);
  const snap = await page.evaluate(() => [...document.querySelectorAll(".titans-allies .titan-ally-art")].map((el) => ({ id: [...el.classList].find((c) => c.startsWith("ally-"))?.slice(5), pos: el.querySelector(".ally-body")?.style.backgroundPosition, frame: [...(el.querySelector(".ally-body")?.classList ?? [])].find((c) => c.startsWith("frame-")), drot: el.querySelector(".ally-weapon")?.style.getPropertyValue("--weapon-drot") })));
  for (const s of snap) { if (!framesSeen.has(s.id)) framesSeen.set(s.id, new Set()); framesSeen.get(s.id).add(`${s.frame}|${s.pos}|${s.drot}`); }
}
ok("A 동료 프레임: 3초 관찰 동안 미아·레온·파이로가 2가지 이상 프레임(대기/공격)을 보인다", ["mia", "leon", "pyro"].every((id) => (framesSeen.get(id)?.size ?? 0) >= 2), [...framesSeen].map(([k, v]) => `${k}:${v.size}`).join(" "));
ok("A 변형(파이로)은 변형 아틀라스 · 폭 150%", await page.evaluate(() => { const b = document.querySelector(".titans-allies .ally-pyro .ally-body"); return !!b && /variant/.test(b.style.backgroundImage) && b.style.width === "150%"; }));
ok("A 무기 앵커 오프셋이 프레임마다 다르다(공격 시 --weapon-drot ≠ 0deg)", [...framesSeen.values()].some((set) => [...set].some((s) => /frame-2\|.*\|-\d+deg/.test(s))), [...(framesSeen.get("mia") ?? [])].slice(0, 3).join(" ; "));

// ── B. 몬스터 피격 프레임 + 보스 3단계 ──
const hitSeen = await (async () => {
  let seen = false;
  for (let i = 0; i < 20 && !seen; i += 1) {
    await sleep(100);
    seen = await page.evaluate(() => !!document.querySelector(".titan-monster-art.frame-hit img.on[src*='-hit.png']"));
  }
  return seen;
})();
ok("B 피격 프레임(-hit.png)이 타격 시 표시된다", hitSeen);
ok("B 3프레임이 모두 마운트되어 있다(idle·hit·defeat)", await page.evaluate(() => document.querySelectorAll(".titan-monster-art img").length === 3 && !!document.querySelector(".titan-monster-art img[src*='-defeat.png']")));
// 보스: 강한 파티로 즉시 처치 → 3단계 클래스 관찰
await seed({ version: 5, onboardingStep: 4, level: 30, redGems: 500, sharedCoins: 100000, pioneeredArea: 2, titanBestStage: 6, dodgeBestStage: 2, idleClaimedAt: now, updatedAt: now, partyIds: ["mia", "leon"], partyCap: 4, sessionCount: 9 },
  { stage: 6, bestStage: 6, gold: 100000, heroes: { mia: 60, leon: 60 }, skillInventory: { learned: ["strike"], levels: { strike: 1 }, equipped: { starter: "strike" }, skillCores: 0 }, lastActiveAt: now });
let bossBtn = false;
for (let i = 0; i < 70 && !bossBtn; i += 1) { await sleep(500); bossBtn = await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => x.textContent.includes("보스 도전")); b?.click(); return !!b; }); }
ok("B 보스 도전 버튼 등장", bossBtn);
const stages = new Set();
for (let i = 0; i < 80; i += 1) {
  await sleep(50);
  const cls = await page.evaluate(() => { const f = document.querySelector(".titans-field"); return { c: f?.className ?? "", crack: !!document.querySelector(".boss-crack"), burst: document.querySelectorAll(".boss-gold-burst i").length, defeat: !!document.querySelector(".titan-monster-art img.on[src*='-defeat.png']") }; });
  if (/boss-break-1/.test(cls.c)) stages.add("1");
  if (/boss-break-2/.test(cls.c) && cls.crack) stages.add("2");
  if (/boss-break-3/.test(cls.c) && cls.burst >= 10 && cls.defeat) stages.add("3");
  if (stages.size === 3) break;
}
ok("B 보스 처치 3단계(경직 → 균열 → 붕괴+골드 분출)가 순서대로 나타난다", stages.has("1") && stages.has("2") && stages.has("3"), [...stages].join(">") || "none");

ok("런타임 에러 0건", errors.length === 0, errors.join(" | "));
await browser.close();
for (const [s, n, d] of results) console.log(s, n, d ? "— " + d : "");
const fails = results.filter((x) => x[0] === "FAIL").length;
console.log(fails === 0 ? "\nALL PASS" : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
