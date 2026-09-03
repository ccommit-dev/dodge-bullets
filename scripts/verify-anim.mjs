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

// ── C. 스킬 컷인 + 버프 이펙트 레이어 ──
await seed({ version: 5, onboardingStep: 4, level: 30, redGems: 500, sharedCoins: 100000, pioneeredArea: 2, titanBestStage: 6, dodgeBestStage: 2, idleClaimedAt: now, updatedAt: now, partyIds: ["mia", "leon"], partyCap: 4, sessionCount: 9, beatSkills: { kick: 5, hat: 5, snare: 5, fire: 5, throat: 5 } },
  { stage: 6, bestStage: 6, gold: 100000, heroes: { mia: 9, leon: 6 }, skillInventory: { learned: ["emberCut", "crit", "thunderLink", "warcry"], levels: { emberCut: 1, crit: 1, thunderLink: 1, warcry: 1 }, equipped: { starter: "emberCut", linkA: "crit", linkB: "thunderLink", finisher: "warcry" }, skillCores: 0 }, lastActiveAt: now });
await sleep(1500);
const cast = async (name) => { await page.evaluate((n) => { [...document.querySelectorAll(".titans-skill-dock .titans-skill")].find((b) => (b.textContent ?? "").includes(n) || (b.getAttribute("title") ?? "").includes(n) || (b.getAttribute("aria-label") ?? "").includes(n))?.click(); }, name); await sleep(150); };
await cast("잔불");
const c1 = await page.evaluate(() => ({ cutin: document.querySelector(".skill-cutin")?.className ?? "", burn: !!document.querySelector(".titans-monster.st-burning .st-burn"), name: document.querySelector(".cutin-name")?.textContent }));
ok("C 시동기 컷인(검 궤적) + 화상 불꽃 레이어", /cutin-starter/.test(c1.cutin) && /element-fire/.test(c1.cutin) && c1.burn, JSON.stringify(c1));
await cast("질풍");
const c2 = await page.evaluate(() => ({ cutin: document.querySelector(".skill-cutin")?.className ?? "", aura: !!document.querySelector(".titans-hero.hero-crit-aura") }));
ok("C 연계 컷인(마법진) + 영웅 치명 오라", /cutin-linkA/.test(c2.cutin) && c2.aura, JSON.stringify(c2));
await cast("뇌광");
const c3 = await page.evaluate(() => ({ inspired: !!document.querySelector(".titans-allies.party-inspired"), ring: getComputedStyle(document.querySelector(".titans-allies.party-inspired .titan-ally-art") ?? document.body, "::after").content }));
ok("C 고무 버프 → 동료 발밑 금색 링", c3.inspired && c3.ring !== "none", JSON.stringify(c3));
await cast("별빛");
const c4 = await page.evaluate(() => ({ cutin: document.querySelector(".skill-cutin")?.className ?? "", flash: !!document.querySelector(".cutin-flash") }));
ok("C 마무리 컷인(플래시)", /cutin-finisher/.test(c4.cutin) && c4.flash, JSON.stringify(c4));

// ── D. 비트 적: 박자 맥동 + 판정별 모션 ──
await page.evaluate(() => localStorage.setItem("dodgebullets:beat:calibrationMs", "0"));
await clickText(".titans-bottom-nav button", "콘텐츠");
await sleep(400);
await clickText(".nav-popup-grid button", "비트 수련");
await sleep(1500);
await page.evaluate(() => document.querySelector(".schedule-card")?.click());
await sleep(2500);
const beatsSeen = new Set();
const actionsSeen = new Set();
let hitFrameSeen = false;
// 개발 훅(window.__beatSession)으로 다음 노트의 레인·도착 시각을 읽어 정확히 누른다 — 무작위 연타는 MISS로 HP가 바닥나 판정을 못 본다
const KEY_OF = ["KeyA", "KeyS", "KeyW", "KeyD"];
const judges = [];
for (let i = 0; i < 14; i += 1) {
  // 페이지 안에서 오디오 시계를 rAF로 기다렸다가 키 이벤트를 직접 디스패치한다 (puppeteer 왕복 지연 회피)
  const res = await page.evaluate((keys) => new Promise((resolve) => {
    const s = window.__beatSession; if (!s) return resolve(null);
    const w = s.world; const from = Math.ceil(w.beatPosition + 0.4);
    let idx = -1; for (let j = from; j < Math.min(s.chart.length, from + 24); j += 1) { const st = s.chart[j]; if (st?.spike && !st.holdTail) { idx = j; break; } }
    if (idx < 0) return resolve(null);
    const lane = window.__beatLaneOf ? window.__beatLaneOf(s.chart[idx].sound) : s.chart[idx].lane; const code = keys[lane] ?? "KeyA";
    const target = idx + s.calibrationSec / w.stepSec;
    const start = performance.now();
    const tick = () => {
      if (w.beatPosition >= target - 0.02 || performance.now() - start > 4000) {
        window.dispatchEvent(new KeyboardEvent("keydown", { code, key: code.slice(-1).toLowerCase(), bubbles: true }));
        setTimeout(() => window.dispatchEvent(new KeyboardEvent("keyup", { code, key: code.slice(-1).toLowerCase(), bubbles: true })), 40);
        setTimeout(() => resolve({ lane, judge: w.judgeText }), 20);
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }), KEY_OF);
  if (!res) break;
  judges.push(res.judge);
  for (let k = 0; k < 4; k += 1) {
    await sleep(30);
    const s = await page.evaluate(() => ({ beat: document.querySelector(".beat-monster-wrap")?.getAttribute("data-beat"), action: [...(document.querySelector(".beat-command-party")?.classList ?? [])].find((c) => c.startsWith("enemy-")), hit: (() => { const el = document.querySelector(".beat-monster-hit"); return !!el && getComputedStyle(el).opacity === "1"; })() }));
    if (s.beat) beatsSeen.add(s.beat);
    if (s.action) actionsSeen.add(s.action);
    if (s.hit) hitFrameSeen = true;
  }
}
ok("D 비트 적이 박자마다 맥동한다(박자 번호 3개 이상 관찰)", beatsSeen.size >= 3, `beats=${beatsSeen.size}`);
ok("D 판정별 모션 2종 이상(피격/가드/경직/반격) + 피격 프레임 표시", actionsSeen.size >= 2 && hitFrameSeen, `${[...actionsSeen].join(",")} hit=${hitFrameSeen} judges=${judges.join("|")}`);

// ── E. 뽑기 사전 연출: 소환진(등급 예고 색) → 카드 공개 ──
await seed({ version: 5, onboardingStep: 4, level: 30, redGems: 3000, sharedCoins: 100000, pioneeredArea: 3, titanBestStage: 12, dodgeBestStage: 3, idleClaimedAt: now, updatedAt: now, partyIds: ["mia", "leon"], partyCap: 4, sessionCount: 9 },
  { stage: 12, bestStage: 12, gold: 100000, heroes: { mia: 9, leon: 6 }, skillInventory: { learned: ["strike"], levels: { strike: 1 }, equipped: { starter: "strike" }, skillCores: 0 }, lastActiveAt: now });
await clickText(".titans-bottom-nav button", "동료");
await sleep(600);
await clickText(".hub-sheet-switch button", "동료 뽑기");
await sleep(500);
await page.evaluate(() => document.querySelector(".gacha-page-actions button:nth-child(2)")?.click());
await sleep(250);
const e1 = await page.evaluate(() => ({ circle: !!document.querySelector(".gacha-summon-circle"), tier: [...(document.querySelector(".gacha-summoning")?.classList ?? [])].find((c) => c.startsWith("tier-")), reveal: !!document.querySelector(".gacha-card") }));
ok("E 소환 직후 소환진이 뜨고 카드는 아직 없다", e1.circle && !!e1.tier && !e1.reveal, JSON.stringify(e1));
await sleep(1300);
const e2 = await page.evaluate(() => ({ circle: !!document.querySelector(".gacha-summon-circle"), cards: document.querySelectorAll(".gacha-card").length }));
ok("E 1.2초 뒤 소환진이 사라지고 카드 10장 공개", !e2.circle && e2.cards === 10, JSON.stringify(e2));
// 등급 예고 정합: 결과 최고 등급이 SSR이면 소환진은 반드시 금색 (페이크는 상향만)
const hadSsr = await page.evaluate(() => !!document.querySelector(".gacha-card.rarity-ssr"));
ok("E 예고 색 규칙: 결과에 SSR이 있으면 예고는 금색이어야 함 (상향 페이크만 허용)", !hadSsr || e1.tier === "tier-ssr", `ssr=${hadSsr} tease=${e1.tier}`);

ok("런타임 에러 0건", errors.length === 0, errors.join(" | "));
await browser.close();
for (const [s, n, d] of results) console.log(s, n, d ? "— " + d : "");
const fails = results.filter((x) => x[0] === "FAIL").length;
console.log(fails === 0 ? "\nALL PASS" : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
