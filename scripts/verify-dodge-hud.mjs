/**
 * 성문 방어 전투 화면 단언 (2026-09-28).
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
import { launchBrowser } from "./launch-browser.mjs";

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
  expeditionSkills: { fire: 6, water: 4, ice: 2, earth: 2, bolt: 2, ultimate: 4 },
  expeditionShards: { fire: 30, water: 2, ice: 9, earth: 0, bolt: 5, ultimate: 12 },
  expeditionWeapon: "staff",
  expeditionChips: { focus: 3, barrage: 3, ember: 2, rime: 4, vitality: 2, edge: 1 },
  equippedChips: ["focus", "rime", null],
  expeditionSupplies: { draft: 1, primed: 0, insurance: 2 },
  expeditionDaily: { day: new Date().toISOString().slice(0, 10), counts: { intercept: 44, epic: 0, clear: 1 }, claimed: [] },
  claimedRewards: ["dodge-tutorial"],
};
const titans = { gold: 40000, stage: 9, bestStage: 9, heroes: { mia: 8 }, lastActiveAt: now };

const browser = await launchBrowser({ args: ["--no-sandbox", "--disable-gpu"] });
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
await clickText(".titans-bottom-nav button", "콘텐츠"); await sleep(700);
// 콘텐츠 팝업이 화면 안에 다 들어오고, 비트 수련까지 모든 칸이 보인다 (등장 애니메이션 끝 프레임이 팝업을 반 화면 밀어내던 것, 2026-10-02)
{
  const pop = await page.evaluate(() => {
    const vw = window.innerWidth, vh = window.innerHeight;
    const box = document.querySelector(".bottom-nav-popup")?.getBoundingClientRect();
    const cells = [...document.querySelectorAll(".nav-popup-grid > button")].map((b) => { const r = b.getBoundingClientRect(); return { name: b.textContent.replace(/\s+/g, " ").trim().slice(0, 8), inside: r.left >= 0 && r.right <= vw && r.top >= 0 && r.bottom <= vh }; });
    return { vw, box: box ? { left: Math.round(box.left), right: Math.round(box.right) } : null, cells };
  });
  ok("콘텐츠 팝업이 화면 안에 있고 모든 칸(비트 수련 포함)이 보인다", !!pop.box && pop.box.left >= 0 && pop.box.right <= pop.vw && pop.cells.length >= 3 && pop.cells.every((c) => c.inside) && pop.cells.some((c) => c.name.includes("비트")), JSON.stringify(pop));
}
await clickText(".nav-popup-grid button", "성문 방어"); await sleep(1600);

// ── 메뉴: 무기 탈착 행 ──
const menu = await page.evaluate(() => {
  const tab = [...document.querySelectorAll(".exp-menu-tabs button")].find((b) => b.textContent.includes("정비"));
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
// 메뉴 머리 — 상단 버튼(사운드·사냥터로)이 제목 위에 겹치지 않고, 인장 잔액이 보인다 (2026-09-29 캡처)
{
  const head = await page.evaluate(() => {
    const btn = [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "사냥터로");
    const brand = document.querySelector(".exp-menu-content .brand");
    const a = btn?.getBoundingClientRect(), b = brand?.getBoundingClientRect();
    return { btnBottom: a ? Math.round(a.bottom) : -1, brandTop: b ? Math.round(b.top) : -1, seals: document.querySelector("[data-testid=exp-seals]")?.textContent ?? "" };
  });
  ok("메뉴 제목이 상단 버튼 아래에서 시작한다 (겹침 없음)", head.btnBottom > 0 && head.brandTop >= head.btnBottom, "버튼 끝 " + head.btnBottom + " · 제목 시작 " + head.brandTop);
  ok("정비 화면 머리에 인장 잔액이 보인다", head.seals === "400", head.seals);
}
// 기본 사격 행 — 장착 무기(픽스처: 지팡이)의 아이콘과 이름. 활 문장 basic.png 가 지팡이에도 떴다 (2026-10-01)
{
  const basic = await page.evaluate(() => { const row = document.querySelector(".exp-basic-row"); return { img: row?.querySelector("img")?.getAttribute("src") ?? "", name: row?.querySelector("b")?.textContent ?? "" }; });
  ok("기본 사격 행이 장착 무기(지팡이)의 아이콘과 이름을 쓴다", basic.img.includes("weapons/icon-staff.png") && basic.name.startsWith("마력탄"), JSON.stringify(basic));
}
ok("스킬 화면이 390px 폭을 넘지 않는다", skillUi.over.length === 0, skillUi.over.slice(0, 2).join(", "));

// 보급창 · 일일 임무 탭 — 인장을 "지금 쓰는" 자리와 "한 판 더"의 이유
await page.evaluate(() => [...document.querySelectorAll(".exp-sub-tabs button")].find((b) => b.textContent.includes("보급"))?.click());
await sleep(400);
const ops = await page.evaluate(() => ({
  supplies: [...document.querySelectorAll(".exp-supply-list li")].length,
  buyable: [...document.querySelectorAll(".exp-supply-list button")].filter((b) => !b.disabled).length,
  dailies: [...document.querySelectorAll(".exp-daily-list li")].map((l) => l.querySelector("small")?.textContent ?? "?"),
  claimable: [...document.querySelectorAll(".exp-daily-list button")].filter((b) => !b.disabled).length,
  dot: !!document.querySelector(".exp-sub-dot"),
}));
ok("보급창 3종과 일일 임무 3종이 진행도와 함께 보인다",
  ops.supplies === 3 && ops.dailies.join() === "40/40,0/1,1/2", JSON.stringify(ops.dailies));
ok("목표를 채운 임무만 수령 버튼이 열리고 탭에 배지가 붙는다",
  ops.claimable === 1 && ops.dot === true, "claimable=" + ops.claimable + " dot=" + ops.dot);
await page.evaluate(() => [...document.querySelectorAll(".exp-sub-tabs button")].find((b) => b.textContent.includes("강화"))?.click());
await sleep(300);

// 스킬별 조각 — 참고 게임의 126/225. 공용 인장이었을 때는 모든 카드의 분자가 같았다
const bars = await page.evaluate(() => [...document.querySelectorAll(".exp-skill-card .exp-skill-bar small")].map((e) => e.textContent.trim()));
ok("격자 진행바가 스킬마다 제 조각을 보인다 (분자가 서로 다르다)",
  bars.length === 6 && new Set(bars.map((b) => b.split("/")[0])).size >= 5, bars.join(" · "));
const banner = await page.evaluate(() => document.querySelector(".exp-skill-banner")?.textContent.replace(/\s+/g, " ").trim());
// 픽스처 누적 레벨 6+4+2+2+2+4 = 20 → 20 × 0.3% = 6%
ok("배너가 실제 수집 보너스를 말한다 (누적 20레벨 → −6%)", !!banner && banner.includes("수집 보너스") && banner.includes("6%") && banner.includes("20"), banner);

// 원정 칩 — 가이드의 영구 성장 2순위. 슬롯(끼운 것)과 목록(가진 것)이 나뉘어 보여야 한다
const chipUi = await page.evaluate(() => ({
  slots: [...document.querySelectorAll(".exp-chip-slot")].length,
  filled: [...document.querySelectorAll(".exp-chip-slot img")].length,
  list: [...document.querySelectorAll(".exp-chip-list li")].map((l) => l.querySelector("em")?.textContent ?? "?"),
  equipped: [...document.querySelectorAll(".exp-chip-list li.on")].length,
}));
ok("칩 슬롯 3칸 중 2칸이 차 있고, 목록 6종이 실제 수치를 말한다",
  chipUi.slots === 3 && chipUi.filled === 2 && chipUi.list.length === 6
  && chipUi.list[0].includes("-9%") === false && chipUi.list[0].includes("9%")
  && chipUi.list[3].includes("80%"),
  JSON.stringify(chipUi.list.slice(0, 4)));
ok("끼운 칩 2종이 목록에서 장착 표시된다", chipUi.equipped === 2, String(chipUi.equipped));

// 강화 화면이 "이 스킬을 올리면 런 중에 뭐가 열리는지" 를 보여 준다 (가이드의 투자 조언)
// 트리 정렬(물·불·흙·얼음·번개·일섬) 뒤 얼음화살은 4번째 — 카드 5장(에픽 4) (2026-09-29)
await page.evaluate(() => document.querySelectorAll(".exp-skill-card")[3]?.click());
await sleep(400);
const unlocks = await page.evaluate(() => {
  const rows = [...document.querySelectorAll(".exp-skill-unlocks li")];
  return { rows: rows.length, rarities: rows.map((r) => r.querySelector("i")?.className ?? "?") };
});
ok("강화 화면이 런 중 열리는 카드를 등급과 함께 보여 준다",
  // 습득 카드 1 + 레어 2(심층 빙결 · 원소 전환) + 에픽 4 (콤보 2 · 진화 2)
  unlocks.rows === 7 && unlocks.rarities.filter((c) => c.includes("r-epic")).length === 4,
  JSON.stringify(unlocks));
await page.evaluate(() => document.querySelector(".exp-skill-close")?.click());
await sleep(300);

// ── 전투 진입 ──
await clickText(".exp-menu-tabs button", "원정"); await sleep(500);
await clickText("button", "스테이지"); await sleep(1800);
await page.evaluate(() => {
  const c = document.querySelector("canvas"); if (!c) return;
  const r = c.getBoundingClientRect();
  c.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: r.x + r.width / 2, clientY: r.y + r.height * 0.8, pointerId: 1, pointerType: "touch" }));
});
await sleep(1500);

// 전투에 못 들어갔으면 무엇이 화면에 남아 있는지 말해 준다 (2026-09-29)
const onScreen = await page.evaluate(() => ({ canvas: !!document.querySelector("canvas"), text: document.body.innerText.replace(/s+/g, " ").slice(0, 240) }));
if (!onScreen.canvas) { console.log("DEBUG 전투 진입 실패 —", onScreen.text); }

// 1) 겹침 — 캔버스 일섬 게이지 사각형 vs DOM HUD
const hud = await page.evaluate(() => {
  const w = window.__dodgeWorld;
  const canvasEl = document.querySelector("canvas");
  if (!w || !canvasEl) return { missing: true };
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

// 전투 슬롯의 기본 사격 칸도 장착 무기 아이콘
{
  const first = await page.evaluate(() => document.querySelector(".skill-slot img")?.getAttribute("src") ?? "");
  ok("전투 슬롯 첫 칸(기본 사격)이 장착 무기(지팡이) 아이콘이다", first.includes("weapons/icon-staff.png"), first);
}

// 1-a) 스킬 슬롯 — 바닥선 아래에 있어야 주인공 발을 가리지 않고, 조작 버튼 위에 있어야 눌림을 막지 않는다
{
  const dock = await page.evaluate(() => {
    const w = window.__dodgeWorld; const canvas = document.querySelector("canvas");
    const slot = document.querySelector(".skill-slot");
    const jump = document.querySelector(".extract-btn");   // 점프 버튼은 없다 (2026-10-01) — 조작 줄의 남은 버튼은 귀환
    if (!w || !canvas || !slot || !jump) return { missing: true };
    const r = slot.getBoundingClientRect();
    return { floor: Math.round(canvas.getBoundingClientRect().top + w.floorY), top: Math.round(r.top), bottom: Math.round(r.bottom), ctl: Math.round(jump.getBoundingClientRect().top) };
  });
  ok("스킬 슬롯이 바닥선과 조작 버튼 사이에 들어간다 (주인공 발을 안 가린다)",
    !dock.missing && dock.top >= dock.floor && dock.bottom <= dock.ctl, JSON.stringify(dock));
}

// 1-b) 보스 막대 — 캔버스에 그리므로 DOM HUD 가 밀어내 주지 않는다. 제목이 두 줄로 접혀도 안 겹쳐야 한다
{
  const src = (await import("node:fs")).readFileSync("src/game/draw.ts", "utf8");
  const top = Number(/BOSS_BAR_TOP = ([0-9]+)/.exec(src)?.[1] ?? 0);
  const boss = await page.evaluate((top) => {
    const w = window.__dodgeWorld; const canvas = document.querySelector("canvas");
    if (!w || !canvas) return { missing: true };
    const cr = canvas.getBoundingClientRect();
    const barW = Math.min(280, cr.width - w.safeLeft - w.safeRight - 36);
    const bar = { x: cr.x + (cr.width - barW) / 2, y: cr.y + w.safeTop + top, w: barW, h: 25 };
    const hits = [];
    // 가장 긴 제목(보스 이름이 붙어 두 줄) 기준으로 잰다
    const title = document.querySelector(".hud-left > :first-child");
    const keep = title?.textContent;
    if (title) title.textContent = "Stage 4 · BOSS 12 · 직선 조준 사격";
    for (const el of document.querySelectorAll(".hud-left > *")) {
      const r = el.getBoundingClientRect();
      if (r.width === 0) continue;
      const ox = Math.min(r.right, bar.x + bar.w) - Math.max(r.left, bar.x);
      const oy = Math.min(r.bottom, bar.y + bar.h) - Math.max(r.top, bar.y);
      if (ox > 0 && oy > 0) hits.push((el.className || el.tagName) + " " + Math.round(oy) + "px");
    }
    const bottom = Math.max(...[...document.querySelectorAll(".hud-left > *")].map((e) => e.getBoundingClientRect().bottom));
    if (title && keep != null) title.textContent = keep;
    return { hits, bar, hudBottom: Math.round(bottom) };
  }, top);
  ok("보스 막대가 HUD 왼쪽 열을 덮지 않는다 (제목 두 줄 기준)", top > 0 && !boss.missing && boss.hits.length === 0,
    boss.missing ? "월드 없음" : "막대 y " + Math.round(boss.bar.y) + " · HUD 끝 " + boss.hudBottom + " " + boss.hits.join(", "));
}

// 2) 적재 — 스킬 레벨·무기가 실려서 실제로 쏘는가
let fired = null;
for (let i = 0; i < 8 && !fired; i += 1) {
  await sleep(1100);
  fired = await page.evaluate(() => {
    const w = window.__dodgeWorld;
    if (!w) return null;
    const shots = w.skillShots.filter((s) => s.active).map((s) => s.element);
    return shots.length ? { weapon: w.rangedWeapon, lv: w.skillLevels, shots } : null;
  });
}
const loaded = await page.evaluate(() => {
  const w = window.__dodgeWorld;
  return w ? { weapon: w.rangedWeapon, lv: w.skillLevels } : null;
});
const chipLoaded = await page.evaluate(() => window.__dodgeWorld?.chips ?? null);
// 조준 Lv3(재사용 ×0.91) + 서리 Lv4(빙결 ×1.8). 연사·잔열은 안 끼웠으므로 중립
ok("끼운 칩이 전투 월드에 실린다 (안 끼운 칩은 중립)",
  !!chipLoaded && Math.abs(chipLoaded.cooldownMul - 0.91) < 1e-6 && Math.abs(chipLoaded.chillMsMul - 1.8) < 1e-6
  && chipLoaded.volleyExtra === 0 && chipLoaded.flameRadiusMul === 1,
  JSON.stringify(chipLoaded));
ok("진행도의 스킬 레벨과 장착 무기가 전투 월드에 실린다",
  !!loaded && loaded.weapon === "staff" && loaded.lv.fire === 6 && loaded.lv.water === 4,
  JSON.stringify(loaded));
ok("장착 스킬이 전투 중 실제로 발사된다", !!fired, fired ? fired.shots.join(",") : "8초 동안 탄 없음");
// 2.5) 출격 직후 — 보유 스킬이 있어도 아직 습득 전이라 독에는 기본 사격만 있다
const dock0 = await page.evaluate(() => ({ slots: document.querySelectorAll(".skill-slot").length, acquired: Object.keys(window.__dodgeWorld?.runSkills ?? {}).length }));
ok("출격 직후 독에는 기본 사격 슬롯만 있다 (속성 화살은 런 중 습득)", dock0.slots === 1 && dock0.acquired === 0, JSON.stringify(dock0));

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
ok("첫 3택의 첫 자리는 습득 카드다", /^perk-learn/.test(perk.ids[0] ?? ""), perk.ids[0]);
ok("카드마다 등급이 붙고 화면이 스테이지 등급 확률을 밝힌다",
  perk.rarities?.length === 3 && perk.rarities.every((r) => /rarity-(common|rare|epic)/.test(r)) && !!perk.oddsLine,
  (perk.rarities ?? []).join() + " | " + (perk.oddsLine ?? ""));
// 지팡이 로드아웃(fire 6 · water 4 · ice 2 · earth 2 · bolt 2)이면 스킬/콤보 카드가 후보에 들어 있다.
// 3장은 무작위라 "매번 스킬 카드"를 요구할 수는 없고, 후보 풀에 들어갔는지를 본다.
const pool = await page.evaluate(() => {
  const w = window.__dodgeWorld;
  return w ? { lv: w.skillLevels, mods: w.runMods } : null;
});
ok("전투 월드가 런 강화칸(runMods)을 들고 있다 — 카드가 쌓일 자리",
  !!pool && pool.mods && pool.mods.shotExtra === 0 && pool.mods.fireRadiusMul === 1, JSON.stringify(pool?.mods));

// 한 장 고르면 실제로 runMods 가 움직이는가 (스킬 카드가 뽑혔을 때만 검사)
const before = await page.evaluate(() => JSON.stringify(window.__dodgeWorld?.runMods));
await page.evaluate(() => {
  document.querySelector(".perk-choice")?.click();   // 첫 자리 = 습득 카드
});
await sleep(900);
const after = await page.evaluate(() => JSON.stringify(window.__dodgeWorld?.runMods));
const learned = await page.evaluate(() => Object.keys(window.__dodgeWorld?.runSkills ?? {}));
ok("습득 카드를 고르면 그 스킬이 이번 런에 켜진다", learned.length === 1 && before === after, JSON.stringify(learned));
await sleep(700);

// 4) 전투 상시 조작 — 스킬 슬롯 · 일시정지 · 배속 (참고 게임의 전투 HUD 관례)
const dock = await page.evaluate(() => {
  const slots = [...document.querySelectorAll(".skill-slot")];
  return {
    slots: slots.length,
    // 쿨타임 덮개 높이가 슬롯마다 있고 0~100% 안에 있다
    covers: slots.map((s) => s.querySelector("i")?.style.height ?? "?"),
    levels: slots.map((s) => s.querySelector("b")?.textContent ?? "?"),
    auto: !!document.querySelector(".skill-dock-auto"),
    pause: !!document.querySelector(".battle-toggle"),
    speed: document.querySelector(".speed-toggle")?.textContent?.trim(),
  };
});
// 지팡이 로드아웃은 불·물·얼음·흙·번개 5종. 일섬은 슬롯에 안 넣는다
// 맨 앞은 기본 사격(무기의 것, 레벨 없음) — 스킬이 없는 계정도 독이 비지 않는다 (2026-09-29)
ok("전투 슬롯: 기본 사격 + 방금 습득한 속성 화살 1종",
  dock.slots === 2 && dock.auto && dock.levels[0] === "?" && /^[0-9]+$/.test(dock.levels[1] ?? ""), JSON.stringify(dock.levels) + " auto=" + dock.auto);
ok("슬롯마다 쿨타임 덮개가 있다", dock.covers.length === 2 && dock.covers.every((h) => /^[0-9]+%$/.test(h)), dock.covers.join());
ok("일시정지·배속 버튼이 전투 중에 있다", dock.pause && dock.speed === "×1", String(dock.speed));

// 일시정지가 실제로 세계를 멈추는가 — **좌표 탭**으로 누른다(합성 click 은 pointer-events:none 을 통과해 폰에서 안 눌리던 것을 놓쳤다)
const tapButton = async (selector, text) => {
  const at = await page.evaluate(({ selector, text }) => { const b = [...document.querySelectorAll(selector)].find((x) => !text || x.textContent.includes(text)); if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }, { selector, text });
  if (at) await page.touchscreen.tap(at.x, at.y);
  return !!at;
};
await tapButton(".battle-toggle", "일시정지");
await sleep(300);
const t0 = await page.evaluate(() => window.__dodgeWorld?.stageElapsedMs);
await sleep(900);
const t1 = await page.evaluate(() => window.__dodgeWorld?.stageElapsedMs);
ok("일시정지하면 스테이지 시계가 멈춘다", t0 === t1, t0 + "ms → " + t1 + "ms");
await tapButton(".battle-toggle", "계속");
await sleep(700);
const t2 = await page.evaluate(() => window.__dodgeWorld?.stageElapsedMs);
ok("재개하면 다시 흐른다", t2 > t1, t1 + "ms → " + t2 + "ms");

// 배속이 실제로 시간을 빠르게 돌리는가 (좌표 탭)
await tapButton(".speed-toggle");
const a0 = await page.evaluate(() => window.__dodgeWorld?.stageElapsedMs);
await sleep(1000);
const a1 = await page.evaluate(() => window.__dodgeWorld?.stageElapsedMs);
const rate = (a1 - a0) / 1000;
ok("배속 ×2 면 게임 시간이 2배 가까이 흐른다", rate > 1.6 && rate < 2.4, rate.toFixed(2) + "배");

// 스테이지를 깨고 자동으로 넘어가도 영구 스킬·칩·무기가 그대로 실려 있다 (오래된 클로저가 초기값을 싣던 것)
{
  await page.evaluate(() => { const w = window.__dodgeWorld; if (w) { w.stageElapsedMs = 9e6; w.bossSpawned = true; w.bossDefeated = true; } });
  let carried = null;
  for (let i = 0; i < 40; i += 1) {
    await sleep(250);
    carried = await page.evaluate(() => { const w = window.__dodgeWorld; return w ? { stage: w.stageIndex, lv: w.skillLevels, weapon: w.rangedWeapon, chip: w.chips.cooldownMul, run: Object.keys(w.runSkills).filter((k) => w.runSkills[k]) } : null; });
    if (carried && carried.stage >= 1) break;
  }
  ok("다음 스테이지로 넘어가도 영구 스킬 레벨 · 무기 · 칩이 그대로다",
    !!carried && carried.stage >= 1 && carried.lv.fire === 6 && carried.lv.water === 4 && carried.weapon === "staff" && Math.abs(carried.chip - 0.91) < 1e-9,
    JSON.stringify(carried));
  ok("이번 런에 습득한 스킬도 이어진다", !!carried && carried.run.length >= 1, JSON.stringify(carried?.run));
}

ok("런타임 에러 0건", errors.length === 0, errors.join(" | "));

await browser.close();
for (const [s, n, d] of results) console.log(s, n, d ? "— " + d : "");
const fails = results.filter((r) => r[0] === "FAIL").length;
console.log(fails === 0 ? "\nALL PASS" : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
