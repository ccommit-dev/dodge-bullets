// 결정 강화 트리 · 유물 — 실제 화면 검사 (2026-10-26, "오늘도 환생 2" 차용).
// 2026-10-28 시드 쓰기와 reload 를 한 evaluate 안에서(떠 있던 사냥터가 시드를 덮던 경합)
//   node scripts/verify-crystal-tree-play.mjs   (vite 5173)   · 캡처: art-gen/out/ctree-*.png
import { launchBrowser } from "./launch-browser.mjs";
const BASE = "http://localhost:5173", H = "mock-local-dev", now = Date.now();
const browser = await launchBrowser({ args: ["--no-sandbox"] }); const page = await browser.newPage(); const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = []; page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
await page.goto(BASE, { waitUntil: "networkidle0" });
let fails = 0; const ok = (n, c, d = "") => { console.log(`${c ? "PASS" : "FAIL"} ${n}${d ? " — " + d : ""}`); if (!c) fails += 1; };
const prog = () => page.evaluate((H) => JSON.parse(localStorage.getItem(`dodgebullets:progression:v1:${H}`) ?? "{}"), H);
const tit = () => page.evaluate((H) => JSON.parse(localStorage.getItem(`dodgebullets:titans:${H}`) ?? "{}"), H);
const baseProgress = (extra = {}) => ({ version: 5, level: 10, redGems: 100, idleClaimedAt: now, updatedAt: now, onboardingStep: 4, sessionCount: 9, partyIds: ["mia", "leon"], partyCap: 4, claimedRewards: ["dodge-tutorial"], pioneeredArea: 3, discoverySeeded: true, discovered: ["monster:slime", "monster:goblin", "monster:bat", "ally:mia", "ally:leon"], ...extra });
const seed = async (progress, titans) => {
  await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); location.reload(); }, { [`dodgebullets:progression:v1:${H}`]: JSON.stringify(progress), [`dodgebullets:titans:${H}`]: JSON.stringify(titans), [`dodgebullets:attendance:v1:${H}`]: JSON.stringify({ lastClaimDate: new Date().toLocaleDateString("sv-SE"), totalDays: 3, consecutiveDays: 3 }) });
  await page.waitForNavigation({ waitUntil: "networkidle0" }).catch(() => {}); await sleep(1200);
};
const closeModals = () => page.evaluate(() => { for (let k = 0; k < 5; k += 1) { const c = document.querySelector(".idle-claim"); if (c) { c.click(); continue; } const b = [...document.querySelectorAll("button")].filter((x) => !x.closest(".titans-bottom-nav")).find((x) => /^(닫기|확인|나중에)$/.test(x.textContent.trim())); if (b) b.click(); } });
const toMyPage = async () => { await closeModals(); await sleep(300); await page.evaluate(() => document.querySelector(".titans-back")?.click()); for (let i = 0; i < 30 && !(await page.$(".mp-crystal-tree")); i += 1) await sleep(200);
  // 계승 칸은 "배지 · 진화" 탭 안 — 열어야 크기 · 넘침을 잴 수 있다
  await page.evaluate(() => [...document.querySelectorAll("button")].find((b) => /^배지s*·s*진화$/.test(b.textContent.trim()))?.click()); await sleep(400); };
const pops = []; await page.exposeFunction("__pop", (t) => pops.push(t));
await page.evaluateOnNewDocument(() => { document.addEventListener("DOMContentLoaded", () => new MutationObserver((ms) => { for (const m of ms) for (const n of m.addedNodes) if (n instanceof Element && n.matches(".reward-pop")) window.__pop(n.textContent + (n.querySelector(".reward-pop-icon") ? "[icon]" : "")); }).observe(document.body, { childList: true, subtree: true })); });

// ── 1. 마이페이지 결정 강화 트리 ──
await seed(baseProgress({ titanBestStage: 30, rebirthCount: 1, evolutionPoints: 1, inheritanceCrystals: 60, crystalTree: { atk: 0, gold: 0, idle: 0, start: 0, crystal: 0, boss: 0, relic: 0, keys: [] },
  relics: { "ember-ring": 3, "flame-feather": 4, "lava-heart": 6, "frost-horn": 2 } }), { gold: 1000, stage: 5, bestStage: 30, totalKills: 300, heroes: { mia: 30, leon: 30 }, lastActiveAt: now });
await toMyPage();
const t0 = await page.evaluate(() => ({ rows: [...document.querySelectorAll(".mp-crystal-tree .ct-row")].map((r) => r.textContent), free: document.querySelector(".ct-free")?.textContent, heading: [...document.querySelectorAll(".legacy-heading")].map((h) => h.textContent) }));
ok("결정 강화 7줄(기본 5 · 특수 2) · 쓸 수 있는 결정 60", t0.rows.length === 7 && t0.free === "60", `${t0.rows.length}줄 · ${t0.free}`);
ok("다섯 줄 이름: 공격력 · 처치 골드 · 방치 효율 · 시작 스테이지 · 환생 결정", ["공격력", "처치 골드", "방치 효율", "시작 스테이지", "환생 결정"].every((n, i) => t0.rows[i].startsWith(n)), t0.rows.slice(0, 5).map((r) => r.slice(0, 8)).join(" | "));
ok("특수 줄은 잠김 · '열기 진화 1'", /열기\s*진화 1/.test(t0.rows[5]) && /열기/.test(t0.rows[6]), t0.rows[5]);
ok("줄 문구: 공격력 '+0% → +5%' · 시작 '1층 → 2층'", /\+0% → \+5%/.test(t0.rows[0]) && /1층 → 2층/.test(t0.rows[3]), `${t0.rows[0]} | ${t0.rows[3]}`);
// 공격력 강화
await page.evaluate(() => document.querySelectorAll(".mp-crystal-tree .ct-row")[0].querySelector(".ct-buy").click()); await sleep(600);
let p = await prog();
ok("공격력 강화 → 저장 1단계 · 결정 57", p.crystalTree.atk === 1 && (await page.evaluate(() => document.querySelector(".ct-free")?.textContent)) === "57", JSON.stringify(p.crystalTree));
// 시작 스테이지 두 번
for (let k = 0; k < 2; k += 1) { await page.evaluate(() => document.querySelectorAll(".mp-crystal-tree .ct-row")[3].querySelector(".ct-buy").click()); await sleep(500); }
p = await prog();
const pre = await page.evaluate(() => document.querySelector(".rebirth-preview")?.textContent ?? "");
ok("시작 스테이지 2단계 → 환생 미리 보기 '3층부터 · 건너뛴 층 골드'", p.crystalTree.start === 2 && /시작 스테이지\s*3층부터/.test(pre) && /건너뛴 층 골드/.test(pre), pre);
ok("자동 환생 스위치에도 '3층부터'", /3층부터/.test(await page.evaluate(() => document.querySelector(".auto-rebirth-toggle")?.textContent ?? "")));
// 특수 줄 열기
await page.evaluate(() => document.querySelectorAll(".mp-crystal-tree .ct-row")[5].querySelector(".ct-buy").click()); await sleep(600);
p = await prog();
ok("대장 사냥꾼 열기 → 진화 포인트 0 · 열쇠 저장 · 강화 단추로 바뀜", p.evolutionPoints === 0 && p.crystalTree.keys.includes("boss") && /강화/.test(await page.evaluate(() => document.querySelectorAll(".mp-crystal-tree .ct-row")[5].querySelector(".ct-buy").textContent)));
// 유물 칸
const rel = await page.evaluate(() => ({
  fams: [...document.querySelectorAll(".relic-family")].map((f) => ({ cls: f.className, text: f.textContent })),
  tiles: Object.fromEntries([...document.querySelectorAll(".relic-tile")].map((t) => [t.dataset.relic, { owned: t.classList.contains("owned"), stars: t.querySelector(".relic-stars")?.textContent, bar: t.querySelector(".relic-bar i")?.style.width }])),
  imgs: [...document.querySelectorAll(".mp-relics img, .mp-crystal-tree img")].map((i) => i.naturalWidth),
}));
ok("유물 일곱 계열(2026-10-28) · 불 세트 켜짐(세트 ✔ 화상)", rel.fams.length === 7 && /set-on/.test(rel.fams[0].cls) && /세트 ✔/.test(rel.fams[0].text) && /화상/.test(rel.fams[0].text), rel.fams.map((f) => f.cls).join(" | "));
ok("용암 심장 ★★ · 서리 뿔피리 조각 2/3(미보유)", rel.tiles["lava-heart"].stars === "★★" && !rel.tiles["frost-horn"].owned && rel.tiles["frost-horn"].bar.startsWith("66"), JSON.stringify(rel.tiles["frost-horn"]));
ok("아이콘 63장(유물 56 · 트리 7) 모두 로드", rel.imgs.length === 63 && rel.imgs.every((w) => w > 0), rel.imgs.join(","));
const lay = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, over: [...document.querySelectorAll(".ct-row, .relic-tile, .relic-family header")].filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => e.className + ":" + e.textContent.slice(0, 20)), small: [...document.querySelectorAll(".mp-crystal-tree *, .mp-relics *")].filter((e) => e.childElementCount === 0 && e.textContent.trim() && parseFloat(getComputedStyle(e).fontSize) < 13).map((e) => e.textContent.slice(0, 12)) }));
ok("계승 칸이 보인다(탭 열림)", await page.evaluate(() => (document.querySelector(".mp-crystal-tree")?.getBoundingClientRect().height ?? 0) > 100));
ok("390px 가로 넘침 없음 · 칸 넘침 없음 · 13px 미만 글자 없음", lay.sw <= 390 && lay.over.length === 0 && lay.small.length === 0, JSON.stringify(lay));
await page.evaluate(() => document.querySelector(".mp-crystal-tree")?.scrollIntoView({ block: "start" })); await sleep(300);
await page.screenshot({ path: "art-gen/out/ctree-tree.png" });
await page.evaluate(() => document.querySelector(".mp-relics")?.scrollIntoView({ block: "start" })); await sleep(300);
await page.screenshot({ path: "art-gen/out/ctree-relics.png" });
// 되돌리기
await page.evaluate(() => document.querySelector(".ct-reset")?.click()); await sleep(600);
p = await prog();
ok("되돌리기 → 결정 60 · 열쇠 유지", (await page.evaluate(() => document.querySelector(".ct-free")?.textContent)) === "60" && p.crystalTree.atk === 0 && p.crystalTree.keys.includes("boss"));

// ── 2. 환생 → 시작 스테이지 ──
await seed(baseProgress({ titanBestStage: 30, rebirthCount: 1, wallAreas: ["meadow"], inheritanceCrystals: 40, crystalTree: { atk: 0, gold: 0, idle: 0, start: 4, crystal: 0, boss: 0, relic: 0, keys: [] }, relics: { "ember-ring": 3 } }),
  { gold: 1000, stage: 12, bestStage: 30, totalKills: 300, heroes: { mia: 30, leon: 30 }, lastActiveAt: now });
await toMyPage();
for (let k = 0; k < 2; k += 1) { await page.evaluate(() => document.querySelector(".rebirth-button")?.click()); await sleep(700); }
p = await prog(); const tr = await tit();
ok("환생 → 5층부터 · 결정 +16 · 유물 · 트리 유지", p.rebirthCount === 2 && tr.stage === 5 && p.inheritanceCrystals === 56 && p.relics["ember-ring"] === 3 && p.crystalTree.start === 4, `stage ${tr.stage} · 결정 ${p.inheritanceCrystals} · gold ${tr.gold}`);
ok("출발 골드에 건너뛴 1~4층 골드가 얹힌다", tr.gold > 200 * Math.pow(1.12, 30), `${tr.gold}`);
ok("환생 메시지에 '5층부터'", /5층부터/.test(await page.evaluate(() => document.querySelector(".mypage-toast")?.textContent ?? "")));

// ── 3. 다시 잡은 대장 → 유물 조각 · 불 세트 화상 ──
await seed(baseProgress({ titanBestStage: 30, bossLadder: { top: 30, ranks: { ally: 2, tap: 2, gold: 2, speed: 2 } }, relics: { "ember-ring": 3, "flame-feather": 3, "lava-heart": 3 } }),
  { gold: 1000, stage: 2, bestStage: 30, totalKills: 300, heroes: { mia: 40, leon: 40 }, lastActiveAt: now });
await closeModals(); await sleep(300);
await page.evaluate(() => { const r = Math.random; window.__rand = r; Math.random = () => 0.05; });   // 조각 확률(12%) 안 · 상자(4%) 밖
await page.evaluate(() => { window.__burn = 0; new MutationObserver((ms) => { for (const m of ms) for (const n of m.addedNodes) if (n instanceof Element && n.querySelector?.(".float-label") && /화상/.test(n.textContent)) window.__burn += 1; }).observe(document.querySelector(".titans-field"), { childList: true, subtree: true }); });
for (let i = 0; i < 160 && !(await page.$(".titans-boss-challenge")); i += 1) await sleep(250);
await page.evaluate(() => document.querySelector(".titans-boss-challenge")?.click());
let relicIcon = false;
for (let i = 0; i < 160 && !(pops.some((t) => /유물/.test(t)) && relicIcon); i += 1) {
  await page.keyboard.press("Space"); await sleep(120);
  relicIcon ||= await page.evaluate(() => (document.querySelector(".reward-pop.tone-relic .reward-pop-icon")?.getAttribute("src") ?? "").includes("titans/relics/"));
}
await sleep(800);
p = await prog();
const shardTotal = Object.values(p.relics ?? {}).reduce((a, b) => a + b, 0);
// 2026-10-28 중복 소진 — 대장 조각은 남은 조각(relicSpare)으로, ★ 에 들어간 조각(relics)은 그대로 9
const spareTotal = Object.values(p.relicSpare ?? {}).reduce((a, b) => a + b, 0);
ok("이미 잡아 본 높이의 대장 처치 → '유물 조각' 팝업 · 남은 조각 +1(유물 탭에서 소진)", pops.some((t) => /유물/.test(t)) && shardTotal === 9 && spareTotal === 1, `${pops.filter((t) => /유물/.test(t)).join(" | ")} · ${JSON.stringify(p.relics)} · spare ${JSON.stringify(p.relicSpare)}`);
ok("유물 팝업에 유물 아이콘(떠 있는 동안 DOM 확인)", relicIcon);
// 화상은 0.6초마다 모아서 뜬다 — 대장이 빨리 죽어 유물 팝업이 먼저 오면 아직 한 번도 안 떴을 수 있어(전체 검사에서 1/2 흔들림), 뜰 때까지 최대 6초 더 싸운다
for (let i = 0; i < 50 && !(await page.evaluate(() => window.__burn)); i += 1) { await page.keyboard.press("Space"); await sleep(120); }
ok("불 세트 → 전투 중 '화상' 숫자", (await page.evaluate(() => window.__burn)) >= 1, `화상 ${await page.evaluate(() => window.__burn)}`);
await page.evaluate(() => { Math.random = window.__rand; });

ok("페이지 오류 없음", errors.length === 0, errors.join(" | "));
await browser.close();
console.log(fails ? `\n${fails} FAIL` : "\nALL PASS");
process.exit(fails ? 1 : 0);
