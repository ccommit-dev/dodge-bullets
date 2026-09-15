/**
 * 애니메이션 잘림 검사 — 움직이는 요소가 overflow:hidden 조상 밖으로 나가는지 프레임 단위로 잰다.
 *
 * CSS 애니메이션은 정지 레이아웃만 보면 멀쩡해도, 키프레임 중간에 translate/scale 로 부모 밖으로
 * 나가면 그 순간만 잘린다 (공격 모션이 튀어나가는 순간 무기가 사라지는 식).
 *
 * 오탐을 걷어내는 두 가지 규칙:
 *  1) **레이아웃 박스는 안, 변환 박스만 밖** 인 것만 잘림으로 본다. 레이아웃 자체가 밖이면 스크롤·의도된 배치다.
 *  2) 의도적으로 화면 밖으로 나가는 연출(퇴장·등장)은 IGNORE_ANIM 으로 제외한다.
 *
 * 사용: node scripts/verify-anim-clip.mjs [--json]
 */
import puppeteer from "puppeteer";

const BASE = process.env.BASE_URL ?? "http://localhost:5173";
const H = "mock-local-dev";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const ok = (name, cond, detail = "") => results.push([cond ? "PASS" : "FAIL", name, detail]);

/** 화면 밖으로 나가는 게 연출인 것들 — 스테이지 전환 퇴장·등장, 화면을 가로지르는 배경 흐름 */
const IGNORE_ANIM = [
  "party-run-out", "party-run-in", "monster-enter-right", "boss-enter-right", "monster-defeat",
  "stage-parallax-in", "stage-parallax-out", "idle-sweep", "gacha-burst", "gacha-rays", "gacha-shine",
  "beat-fever-field", "rift-step-in", "wave-banner", "summon-sparks", "battle-alert-in", "float-up", "rift-float-up",
];

/** 애니메이션 중인 요소마다 (레이아웃 박스, 변환 박스, 클리핑 조상) 을 잰다 */
const PROBE = `(() => {
  const IGNORE = ${JSON.stringify(IGNORE_ANIM)};
  const clipAncestor = (el) => {
    let p = el.parentElement;
    while (p && p !== document.documentElement) {
      const cs = getComputedStyle(p);
      if (cs.overflow === "hidden" || cs.overflowX === "hidden" || cs.overflowY === "hidden") return p;
      p = p.parentElement;
    }
    return null;
  };
  /** 변환을 뺀 레이아웃 박스 — offsetParent 체인을 더해 뷰포트 좌표로 */
  const layoutBox = (el) => {
    let x = 0, y = 0, n = el;
    while (n && n.offsetParent) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; x -= n.scrollLeft; y -= n.scrollTop; }
    if (n) { x += n.offsetLeft ?? 0; y += n.offsetTop ?? 0; }
    const d = document.documentElement;
    return { left: x - (d.scrollLeft || 0), top: y - (d.scrollTop || 0), width: el.offsetWidth, height: el.offsetHeight };
  };
  /** 조상이 화면 밖으로 옮기는 연출(퇴장·등장) 중이면 자식의 잘림은 그 연출 탓이다 */
  const movedByAncestor = (el, clip) => {
    let p = el.parentElement;
    while (p && p !== clip.parentElement) {
      const a = getComputedStyle(p).animationName;
      if (a !== "none" && IGNORE.some((x) => a.includes(x))) return true;
      p = p.parentElement;
    }
    return false;
  };
  // 스테이지 전환(입장·퇴장) 중에는 전장 전체가 움직인다 — 측정 대상이 아니다
  const field = document.querySelector(".titans-field");
  const transitioning = !!field && /phase-stage-/.test(field.className);
  const out = [];
  for (const el of document.querySelectorAll("*")) {
    const cs = getComputedStyle(el);
    const anim = cs.animationName;
    if (anim === "none" || IGNORE.some((a) => anim.includes(a))) continue;
    if (cs.display === "none" || cs.visibility === "hidden" || Number(cs.opacity) === 0) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    const clip = clipAncestor(el);
    if (!clip) continue;
    if (transitioning && field.contains(el)) continue;
    if (movedByAncestor(el, clip)) continue;
    const c = clip.getBoundingClientRect();
    const lb = layoutBox(el);
    const lay = { left: lb.left, right: lb.left + lb.width, top: lb.top, bottom: lb.top + lb.height };
    // 레이아웃 자체가 이미 밖이면 스크롤·의도 배치다 — 변환이 만든 초과분만 본다
    const over = {
      left: Math.max(0, (c.left - r.left) - Math.max(0, c.left - lay.left)),
      right: Math.max(0, (r.right - c.right) - Math.max(0, lay.right - c.right)),
      top: Math.max(0, (c.top - r.top) - Math.max(0, c.top - lay.top)),
      bottom: Math.max(0, (r.bottom - c.bottom) - Math.max(0, lay.bottom - c.bottom)),
    };
    const entries = Object.entries(over).sort((a, b) => b[1] - a[1]);
    if (entries[0][1] < 1.5) continue;
    const name = (x) => (x.className && typeof x.className === "string" ? "." + x.className.trim().split(/\\s+/).slice(0, 2).join(".") : x.tagName.toLowerCase());
    out.push({ key: name(el), anim, clip: name(clip), over: Math.round(entries[0][1]), side: entries[0][0] });
  }
  return out;
})()`;

async function probeOver(page, ms = 3000, step = 60) {
  const worst = new Map();
  for (let t = 0; t < ms; t += step) {
    const rows = await page.evaluate(PROBE);
    for (const row of rows) {
      const k = `${row.key}|${row.anim}|${row.side}`;
      const prev = worst.get(k);
      if (!prev || row.over > prev.over) worst.set(k, row);
    }
    await sleep(step);
  }
  return [...worst.values()].sort((a, b) => b.over - a.over);
}

const browser = await puppeteer.launch({ headless: "shell", args: ["--no-sandbox", "--disable-gpu"] });
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
const clickText = (sel, re) => page.evaluate((sel, src) => { const b = [...document.querySelectorAll(sel)].find((x) => new RegExp(src).test(x.textContent)); if (b) b.click(); return !!b; }, sel, re);
const closeModals = () => page.evaluate(() => { for (let k = 0; k < 6; k += 1) { const c = document.querySelector(".idle-claim"); if (c) { c.click(); continue; } const b = [...document.querySelectorAll("button")].filter((x) => !x.closest(".battle-alert-stack, .titans-bottom-nav, .hub-sheet, .nav-popup-grid, .titans-tabs")).find((x) => /출석|수령|확인|닫기/.test(x.textContent)); if (!b) break; b.click(); } });

async function seed(stage) {
  await page.goto(BASE, { waitUntil: "networkidle0" });
  await page.evaluate((h, stage) => {
    localStorage.clear();
    localStorage.setItem(`dodgebullets:progression:v1:${h}`, JSON.stringify({ equippedWeaponLevel: 8, onboardingStep: 99, tutorialDone: true, idleClaimedAt: Date.now(), pioneeredArea: 5, partyIds: ["mia", "leon", "garen", "sera"], partyCap: 4, titanBestStage: 30, dodgeBestStage: 4, sessionCount: 9, redGems: 500, sharedCoins: 200000, enhancementMaterials: 300 }));
    localStorage.setItem(`dodgebullets:titans:${h}`, JSON.stringify({ stage, bestStage: 30, gold: 500000, heroes: { mia: 6, leon: 6, garen: 5, sera: 5, ari: 4 }, party: ["mia", "leon", "garen", "sera"], lastActiveAt: Date.now() }));
    localStorage.setItem(`dodgebullets:forge:${h}`, JSON.stringify({ level: 8, best: 8, coins: 999, armorLevel: 3 }));
    localStorage.setItem("dodgebullets:qa-godmode", "1");
    localStorage.setItem("dodge-bullets:soundEnabled", "0");
  }, H, stage);
  await page.goto(BASE, { waitUntil: "networkidle0" });
  await sleep(2200);
  await closeModals();
  await sleep(400);
}

const screens = [];
await seed(12);
screens.push(["사냥터 전투", await probeOver(page, 4500)]);
await clickText(".titans-bottom-nav button", "모험"); await sleep(400);
await clickText(".bottom-nav-popup button", "^균열"); await sleep(1400);
await clickText("button", "균열 진입"); await sleep(500);
screens.push(["균열 연출", await probeOver(page, 4500)]);
await sleep(3500);
await seed(12);
await clickText(".titans-bottom-nav button", "동료"); await sleep(700);
await clickText("button", "동료 뽑기"); await sleep(700);
await clickText("button", "10회"); await sleep(400);
screens.push(["동료 뽑기", await probeOver(page, 3600)]);
await seed(12);
await clickText(".titans-bottom-nav button", "콘텐츠"); await sleep(400);
await clickText(".nav-popup-grid button", "대장간"); await sleep(1500);
await clickText("button", "^강화하기$"); await sleep(300);
screens.push(["대장간 강화", await probeOver(page, 2600)]);
await seed(12);
await clickText(".titans-bottom-nav button", "콘텐츠"); await sleep(400);
await clickText(".nav-popup-grid button", "비트 수련"); await sleep(1600);
screens.push(["비트 허브", await probeOver(page, 2600)]);

const all = [];
for (const [name, rows] of screens) for (const r of rows) all.push({ screen: name, ...r });
for (const [name, rows] of screens) {
  const worst = rows.filter((r) => r.over >= 6);
  ok(`${name}: 애니메이션이 클리핑 부모 밖으로 6px 이상 나가지 않는다`, worst.length === 0, worst.slice(0, 4).map((r) => `${r.key}(${r.anim}) ${r.side}+${r.over}px in ${r.clip}`).join(" · "));
}
ok("런타임 에러 0건", errors.length === 0, errors.slice(0, 2).join(" | "));

if (process.argv.includes("--json")) console.log(JSON.stringify(all, null, 1));
for (const [s, n, d] of results) console.log(s, n, d ? "— " + d : "");
const fails = results.filter((r) => r[0] === "FAIL").length;
console.log(fails === 0 ? "\nALL PASS" : `\n${fails} FAIL`);
await browser.close();
process.exit(fails === 0 ? 0 : 1);
