// 사냥터 움직임 — 몬스터 쓰러짐 · 무기별 주인공 한 방 · 다가가 싸우기 (2026-10-28, 사용자: "몬스터 죽는 애니메이션이 없어짐" ·
//   "검 · 창은 몬스터 가까이서 때리고 활은 멀리서 화살 · 지팡이는 마법" · "근거리면 가까이 가서 서로 공격 · 원거리도 특정 거리까지 · 다음 스테이지면 다시 처음부터 다가가게")
//   node scripts/verify-hunt-motion.mjs   (vite 5173) · 캡처 art-gen/out/hunt-motion-*.png
import { launchBrowser } from "./launch-browser.mjs";
const BASE = "http://localhost:5173", H = "mock-local-dev", now = Date.now();
const browser = await launchBrowser({ args: ["--no-sandbox"] }); const page = await browser.newPage(); const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = []; page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
await page.goto(BASE, { waitUntil: "networkidle0" });
let fails = 0; const ok = (n, c, d = "") => { console.log(`${c ? "PASS" : "FAIL"} ${n}${d ? " — " + d : ""}`); if (!c) fails += 1; };
const seed = async (wk, party, stage = 12, lv = 1) => {
  const prog = { version: 5, level: 20, idleClaimedAt: now, updatedAt: now, onboardingStep: 4, sessionCount: 9, partyIds: party, partyCap: 4, claimedRewards: ["dodge-tutorial"], pioneeredArea: 3, discoverySeeded: true, equippedWeaponKind: wk, expeditionWeaponForge: { bow: 4, staff: 4, spear: 4 } };
  await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); }, { [`dodgebullets:progression:v1:${H}`]: JSON.stringify(prog), [`dodgebullets:titans:${H}`]: JSON.stringify({ gold: 0, stage, bestStage: stage, heroes: Object.fromEntries(party.map((id) => [id, lv])), lastActiveAt: now }), [`dodgebullets:attendance:v1:${H}`]: JSON.stringify({ lastClaimDate: new Date().toLocaleDateString("sv-SE"), totalDays: 3, consecutiveDays: 3 }) });
  await page.reload({ waitUntil: "networkidle0" }); await sleep(1200);
  await page.evaluate(() => { for (let k = 0; k < 5; k += 1) { const c = document.querySelector(".idle-claim"); if (c) { c.click(); continue; } const x = [...document.querySelectorAll("button")].filter((y) => !y.closest(".titans-bottom-nav")).find((y) => /^(닫기|확인|나중에)$/.test(y.textContent.trim())); if (x) x.click(); } });
};
const settled = async () => { for (let i = 0; i < 120; i += 1) { if (await page.evaluate(() => { const f = document.querySelector(".titans-field"); return !!f?.classList.contains("phase-combat") && !f.querySelector(".is-approaching"); })) return true; await sleep(100); } return false; };
const boxes = () => page.evaluate(() => {
  const f = document.querySelector(".titans-field"), fr = f.getBoundingClientRect();
  const b = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { l: r.left - fr.left, r: r.right - fr.left, w: r.width }; };
  const m = document.querySelector(".titans-monster"), ml = Number(getComputedStyle(f).getPropertyValue("--monster-ml")) || 0.22;
  const mb = b(m);
  return { cls: f.className, hero: b(document.querySelector(".titans-hero")), mon: mb, monEdge: mb ? mb.l + mb.w * ml : 0, melee: [...document.querySelectorAll(".titan-ally-art.combat-melee[data-party-slot]")].map(b), ranged: [...document.querySelectorAll(".titan-ally-art.combat-ranged[data-party-slot]")].map(b) };
});
const tap = () => page.evaluate(() => { const f = document.querySelector(".titans-field"); const r = f.getBoundingClientRect(); f.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: r.x + r.width * 0.6, clientY: r.y + r.height * 0.6, button: 0 })); });
const seen = async (sel, ms = 6000) => { const t0 = Date.now(); let i = 0; while (Date.now() - t0 < ms) { if (i++ % 20 === 0) await tap(); if (await page.evaluate((s) => !!document.querySelector(s), sel)) return true; await sleep(15); } return false; };

// ── 1. 쓰러짐 — 맞을 때 번쩍임(hit-a/b !important)이 덮지 않고, 쓰러지는 동안 사라진다 ──
await seed("sword", ["mia", "leon"], 12, 30);
await settled();
const death = { name: "", minOp: 1, phases: new Set() };
for (let i = 0; i < 1500; i += 1) {
  const s = await page.evaluate(() => { const f = document.querySelector(".titans-field"); const m = document.querySelector(".titans-monster"); const ph = (f?.className.match(/phase-([\w-]+)/) ?? [])[1]; const cs = m ? getComputedStyle(m) : null; return { ph, name: cs?.animationName ?? "", op: cs ? +cs.opacity : 1 }; });
  if (/monster-death|stage-clear/.test(s.ph)) { death.phases.add(s.ph); if (s.ph === "monster-death" && !death.name) death.name = s.name; death.minOp = Math.min(death.minOp, s.op); }
  if (death.phases.size && s.ph === "stage-enter") break;
  await sleep(12);
}
ok("쓰러짐: 쓰러짐 단계의 몬스터 애니메이션 = hunt-monster-fall (맞을 때 번쩍임이 덮지 않는다)", death.name === "hunt-monster-fall", death.name || "(쓰러짐 못 봄)");
ok("쓰러짐: 다음 몬스터 전에 흐려져 사라진다(불투명도 < 0.5)", death.minOp < 0.5, `최소 ${death.minOp.toFixed(2)} · ${[...death.phases].join("/")}`);

// ── 2. 검 주인공 — 몬스터 보이는 몸에 붙어 선다 · 근접 동료도 가까이 · 원거리는 앞으로 ──
await seed("sword", ["mia", "garen", "leon", "sera"]);
await settled(); await sleep(300);
let b = await boxes();
await page.screenshot({ path: "art-gen/out/hunt-motion-sword.png" });
ok("검: 전장 hero-melee", /hero-melee/.test(b.cls), b.cls.match(/hero-\w+/)?.[0]);
ok("검: 주인공 상자 오른쪽이 몬스터 보이는 몸 가장자리에 닿는다(±24px)", !!b.hero && Math.abs(b.hero.r - b.monEdge) <= 24, `주인공 오른쪽 ${b.hero?.r.toFixed(0)} · 몬스터 가장자리 ${b.monEdge.toFixed(0)}`);
ok("검: 근접 동료 모두 몬스터 가장자리에서 60px 안", b.melee.length >= 1 && b.melee.every((x) => b.monEdge - x.r <= 60), b.melee.map((x) => (b.monEdge - x.r).toFixed(0)).join(","));
ok("검: 원거리 동료가 전장 왼쪽 끝(20px)에 붙어 있지 않다 — 앞으로 나온다", b.ranged.length >= 1 && b.ranged.every((x) => x.l >= 20), b.ranged.map((x) => x.l.toFixed(0)).join(","));
ok("검: 주인공 한 방 = 붙어서 베기(.titans-fx-slash.el-hero)", await seen(".titans-fx-slash.el-hero"));
// 다음 몬스터 — 다시 처음부터 걸어 들어온다
let reEnter = false;
for (let i = 0; i < 600; i += 1) { if (await page.evaluate(() => document.querySelector(".titans-field")?.classList.contains("phase-stage-enter"))) { reEnter = true; break; } await sleep(20); }
const walking = reEnter && await (async () => { for (let i = 0; i < 60; i += 1) { if (await page.evaluate(() => !!document.querySelector(".titans-field.party-entering .titans-hero.is-approaching"))) return true; await sleep(30); } return false; })();
ok("다음 몬스터: 퇴장 → 등장 뒤 원정대가 다시 걸어 들어온다(party-entering · is-approaching)", reEnter && walking);

// ── 3. 창 — 찌르기 ──
await seed("spear", ["mia"]);
await settled();
b = await boxes();
ok("창: 몬스터에 붙어 선다(hero-melee · ±24px)", /hero-melee/.test(b.cls) && !!b.hero && Math.abs(b.hero.r - b.monEdge) <= 24, `${b.hero?.r.toFixed(0)} / ${b.monEdge.toFixed(0)}`);
ok("창: 주인공 한 방 = 앞으로 찌르는 빛줄기(.titans-fx-thrust)", await seen(".titans-fx-thrust"));

// ── 4. 활 — 떨어져서 화살 ──
await seed("bow", ["mia"]);
await settled();
b = await boxes();
ok("활: 전장 hero-ranged · 주인공이 몬스터에서 40px 넘게 떨어져 선다", /hero-ranged/.test(b.cls) && !!b.hero && b.monEdge - b.hero.r > 40, `${(b.monEdge - (b.hero?.r ?? 0)).toFixed(0)}px`);
ok("활: 주인공 화살이 날아간다(.skill-shot.el-arrow)", await seen(".skill-shot.el-arrow"));
await page.screenshot({ path: "art-gen/out/hunt-motion-bow.png" });

// ── 5. 지팡이 — 마법탄 ──
await seed("staff", ["mia"]);
await settled();
ok("지팡이: 마법탄이 날아간다(.skill-shot.el-arcane)", await seen(".skill-shot.el-arcane"));
await page.screenshot({ path: "art-gen/out/hunt-motion-staff.png" });

ok("페이지 오류 없음", errors.length === 0, errors.join(" | "));
console.log(fails ? `\n${fails} FAIL` : "\nALL PASS");
await browser.close();
process.exit(fails ? 1 : 0);
