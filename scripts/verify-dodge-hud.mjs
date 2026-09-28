/**
 * 화살 원정 전투 화면 단언 (2026-09-28).
 *
 *   node scripts/verify-dodge-hud.mjs   (vite dev 5173 필요)
 *
 * inspect-mobile 은 사냥터 선택자만 재므로 이 화면을 한 번도 보지 않았다 — 일섬 게이지가
 * "점수 · HP" 줄 위로 겹쳐 있어도 ALL PASS 가 났다. 여기서 두 가지를 못 박는다:
 *
 *   1) 겹침 — 일섬 게이지는 **캔버스**에 그려서 DOM 레이아웃이 밀어내 주지 않는다.
 *      draw.ts 와 같은 식으로 사각형을 계산해 DOM HUD 박스와 교차를 잰다.
 *   2) 적재 — 진행도의 스킬 레벨·장착 무기가 실제 전투 월드에 실리고 탄이 나가는가.
 *      DOM 만으로는 "강화했는데 실제로 쏘는가"를 볼 길이 없어 개발 전용 window.__dodgeWorld 를 읽는다.
 */
import puppeteer from "puppeteer";

const BASE = "http://localhost:5173";
const H = "mock-local-dev";
const now = Date.now();
const results = [];
const ok = (name, pass, detail = "") => results.push([pass ? "PASS" : "FAIL", name, detail]);

const progress = {
  version: 5, level: 40, sharedCoins: 987654, redGems: 300, enhancementMaterials: 60,
  equippedWeaponLevel: 10, bestForgeLevel: 8, pioneeredArea: 3, titanBestStage: 9,
  dodgeBestStage: 4, towerBestFloor: 0, idleClaimedAt: now, updatedAt: now, onboardingStep: 4,
  partyIds: ["mia"], partyCap: 4, skillPoints: 6,
  expeditionSeals: 400,
  expeditionSkills: { volley: 6, pierce: 4, flame: 2, frost: 2, chain: 2, ultimate: 4 },
  expeditionWeapon: "staff",
  claimedRewards: ["dodge-tutorial"],
};
const titans = { gold: 40000, stage: 9, bestStage: 9, heroes: { mia: 8 }, lastActiveAt: now };

const browser = await puppeteer.launch({ headless: "shell", args: ["--no-sandbox", "--disable-gpu"] });
const page = await browser.newPage();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = [];
page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));
const clickText = (sel, text) => page.evaluate(({ sel, text }) => {
  const el = [...document.querySelectorAll(sel)].find((b) => b.textContent.trim().includes(text));
  el?.click(); return !!el;
}, { sel, text });

await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.goto(BASE, { waitUntil: "networkidle0" });
await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); }, {
  [`dodgebullets:progression:v1:${H}`]: JSON.stringify(progress),
  [`dodgebullets:titans:${H}`]: JSON.stringify(titans),
  "dodge-bullets:soundEnabled": "0",
});
await page.goto(BASE, { waitUntil: "networkidle0" });
await sleep(2600);
await page.evaluate(() => {
  for (let k = 0; k < 4; k += 1) {
    const c = document.querySelector(".idle-claim"); if (c) { c.click(); continue; }
    const b = [...document.querySelectorAll("button")]
      .filter((x) => !x.closest(".battle-alert-stack, .titans-bottom-nav, .hub-sheet, .nav-popup-grid"))
      .find((x) => /출석|수령|확인|닫기/.test(x.textContent));
    if (!b) break; b.click();
  }
});
await sleep(900);
await clickText(".titans-bottom-nav button", "콘텐츠"); await sleep(400);
await clickText(".nav-popup-grid button", "화살 원정"); await sleep(1600);

// ── 메뉴: 무기 탈착 행 ──
const menu = await page.evaluate(() => {
  const tab = [...document.querySelectorAll(".exp-menu-tabs button")].find((b) => b.textContent.includes("스킬"));
  tab?.click();
  return true;
});
await sleep(600);
const skillUi = await page.evaluate(() => {
  const cards = [...document.querySelectorAll(".exp-weapon-card")];
  const over = [...document.querySelectorAll(".exp-skill-panel *")]
    .filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.right > window.innerWidth + 1 || r.left < -1); })
    .map((e) => e.className);
  return {
    menu: !!document.querySelector(".exp-skill-panel"),
    weapons: cards.length,
    on: cards.map((b) => b.classList.contains("on")),
    skills: document.querySelectorAll(".exp-skill-card").length,
    over,
  };
});
ok("스킬 화면: 무기 2종 + 스킬 6종, 저장된 지팡이가 장착 상태", menu
  && skillUi.weapons === 2 && skillUi.skills === 6 && skillUi.on[1] === true && skillUi.on[0] === false,
  JSON.stringify(skillUi.on));
ok("스킬 화면이 390px 폭을 넘지 않는다", skillUi.over.length === 0, skillUi.over.slice(0, 2).join(", "));

// ── 전투 진입 ──
await clickText(".exp-menu-tabs button", "원정"); await sleep(500);
await clickText("button", "스테이지"); await sleep(1800);
await page.evaluate(() => {
  const c = document.querySelector("canvas"); if (!c) return;
  const r = c.getBoundingClientRect();
  c.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: r.x + r.width / 2, clientY: r.y + r.height * 0.8, pointerId: 1, pointerType: "touch" }));
});
await sleep(1500);

// 1) 겹침 — 캔버스 일섬 게이지 사각형 vs DOM HUD
const hud = await page.evaluate(() => {
  const w = window.__dodgeWorld;
  if (!w) return { missing: true };
  const canvas = document.querySelector("canvas");
  const cr = canvas.getBoundingClientRect();
  // draw.ts 와 같은 계산 — 여기가 어긋나면 이 단언은 의미가 없으므로 같은 식을 그대로 쓴다
  const trackerW = Math.min(190, cr.width - w.safeLeft - w.safeRight - 24);
  const g = {
    x: cr.x + cr.width - w.safeRight - trackerW - 12,
    y: cr.y + w.safeTop + 76,
    w: trackerW, h: 26,
  };
  // 스쳐도 읽기 어렵다 — 세로로 겹치는 줄은 게이지 왼쪽에서 최소 GAP 만큼 떨어져 있어야 한다
  const GAP = 8;
  const hits = [];
  for (const sel of [".hud-score", ".hud-hint", ".threat-label", ".run-level", ".expedition-progress", ".hud-tower"]) {
    document.querySelectorAll(sel).forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0) return;
      const oy = Math.min(r.bottom, g.y + g.h) - Math.max(r.top, g.y);
      if (oy <= 2) return;                       // 세로로 안 겹치면 상관없다
      // 글자는 박스를 넘쳐 그려진다 — 실제로 칠해진 오른쪽 끝을 쓴다 (rect 만 보면 못 잡는다)
      const right = Math.max(r.right, r.left + el.scrollWidth);
      const clear = g.x - right;
      if (clear < GAP) hits.push(`${sel} 여백 ${Math.round(clear)}px (필요 ${GAP})`);
    });
  }
  return { hits, gauge: g, hint: document.querySelector(".hud-hint")?.textContent.trim() };
});
ok("일섬 게이지와 HUD 글자 사이에 8px 여백이 남는다 (6자리 코인 기준)", !hud.missing && hud.hits.length === 0, (hud.hits ?? []).join(", "));
ok("전투 HUD 글자에 전체 지갑 코인을 띄우지 않는다", !!hud.hint && !hud.hint.includes("코인"), hud.hint);

// 2) 적재 — 스킬 레벨·무기가 실려서 실제로 쏘는가
let fired = null;
for (let i = 0; i < 8 && !fired; i += 1) {
  await sleep(1100);
  fired = await page.evaluate(() => {
    const w = window.__dodgeWorld;
    if (!w) return null;
    const shots = w.skillShots.filter((s) => s.active).map((s) => s.kind);
    return shots.length ? { weapon: w.rangedWeapon, lv: w.skillLevels, shots } : null;
  });
}
const loaded = await page.evaluate(() => {
  const w = window.__dodgeWorld;
  return w ? { weapon: w.rangedWeapon, lv: w.skillLevels } : null;
});
ok("진행도의 스킬 레벨과 장착 무기가 전투 월드에 실린다",
  !!loaded && loaded.weapon === "staff" && loaded.lv.volley === 6 && loaded.lv.pierce === 4,
  JSON.stringify(loaded));
ok("장착 스킬이 전투 중 실제로 발사된다", !!fired, fired ? fired.shots.join(",") : "8초 동안 탄 없음");
// 3) 레벨업 강화 카드 — 장착한 스킬의 진화·콤보가 실제로 후보에 뜨는가
//    (참고 게임의 핵심 루프. 소스 단언만으로는 화면까지 이어졌는지 알 수 없다)
await page.evaluate(() => { const w = window.__dodgeWorld; if (w) w.levelUps = 1; });  // 레벨업 큐를 직접 채운다
await sleep(1600);
const perk = await page.evaluate(() => {
  const cards = [...document.querySelectorAll(".perk-choice")];
  return {
    open: !!document.querySelector(".perk-overlay"),
    count: cards.length,
    ids: cards.map((c) => [...c.classList].find((k) => k.startsWith("perk-") && k !== "perk-choice") ?? "?"),
    combos: document.querySelectorAll(".perk-combo").length,
    rarities: cards.map((c) => [...c.classList].find((k) => k.startsWith("rarity-")) ?? "?"),
    oddsLine: document.querySelector(".perk-odds")?.textContent.replace(/s+/g, " ").trim(),
  };
});
ok("레벨업하면 강화 카드 3장이 뜬다", perk.open && perk.count === 3, JSON.stringify(perk.ids));
ok("카드마다 등급이 붙고 화면이 스테이지 등급 확률을 밝힌다",
  perk.rarities?.length === 3 && perk.rarities.every((r) => /rarity-(common|rare|epic)/.test(r)) && !!perk.oddsLine,
  (perk.rarities ?? []).join() + " | " + (perk.oddsLine ?? ""));
// 지팡이 로드아웃(volley 6 · flame 2 · frost 2 · chain 2)이면 스킬/콤보 카드가 후보에 들어 있다.
// 3장은 무작위라 "매번 스킬 카드"를 요구할 수는 없고, 후보 풀에 들어갔는지를 본다.
const pool = await page.evaluate(() => {
  const w = window.__dodgeWorld;
  return w ? { lv: w.skillLevels, mods: w.runMods } : null;
});
ok("전투 월드가 런 강화칸(runMods)을 들고 있다 — 카드가 쌓일 자리",
  !!pool && pool.mods && pool.mods.volleyExtra === 0 && pool.mods.flameRadiusMul === 1, JSON.stringify(pool?.mods));

// 한 장 고르면 실제로 runMods 가 움직이는가 (스킬 카드가 뽑혔을 때만 검사)
const before = await page.evaluate(() => JSON.stringify(window.__dodgeWorld?.runMods));
await page.evaluate(() => {
  const skill = [...document.querySelectorAll(".perk-choice")]
    .find((c) => [...c.classList].some((k) => /perk-(volleyExtra|boltPierce|flameWide|chainExtra|frostDeep|chillHunt|chillBurst)/.test(k)));
  (skill ?? document.querySelector(".perk-choice"))?.click();
});
await sleep(900);
const after = await page.evaluate(() => JSON.stringify(window.__dodgeWorld?.runMods));
const skillCardOffered = perk.ids.some((id) => /volleyExtra|boltPierce|flameWide|chainExtra|frostDeep|chillHunt|chillBurst/.test(id));
ok("스킬 카드를 고르면 runMods 가 실제로 바뀐다", !skillCardOffered || before !== after,
  skillCardOffered ? `${before} → ${after}` : "이번 3택에 스킬 카드가 안 뽑힘(무작위) — 건너뜀");

ok("런타임 에러 0건", errors.length === 0, errors.join(" | "));

await browser.close();
for (const [s, n, d] of results) console.log(s, n, d ? "— " + d : "");
const fails = results.filter((r) => r[0] === "FAIL").length;
console.log(fails === 0 ? "\nALL PASS" : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
