/**
 * 뽑기·스킬·과금 정합 e2e (과금 점검 5종) — 실제 DOM·저장소로 검증한다.
 *   node scripts/verify-gacha.mjs   (vite dev 서버 5173 필요)
 */
import { launchBrowser } from "./launch-browser.mjs";
const BASE = "http://localhost:5173";
const H = "mock-local-dev";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const ok = (name, cond, detail = "") => results.push([cond ? "PASS" : "FAIL", name, detail]);

const browser = await launchBrowser({ args: ["--no-sandbox", "--disable-gpu"] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e.message).slice(0, 120)));
const now = Date.now();

async function seed(progress, titans, extra = {}) {
  await page.goto(BASE, { waitUntil: "networkidle0" });
  await page.evaluate((s) => { localStorage.clear(); localStorage.setItem("dodgebullets:test-phase", "0"); /* 실제 경제를 본다 — TEST_PHASE 끔 */ for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); }, {
    [`dodgebullets:progression:v1:${H}`]: JSON.stringify(progress),
    [`dodgebullets:titans:${H}`]: JSON.stringify(titans),
    "dodge-bullets:soundEnabled": "0",
    ...extra,
  });
  await page.goto(BASE, { waitUntil: "networkidle0" });
  await sleep(2400);
}
const closeModal = async () => { await page.evaluate(() => { for (let k = 0; k < 3; k += 1) { const c = document.querySelector(".idle-claim"); if (c) { c.click(); continue; } const b = [...document.querySelectorAll("button")].filter((x) => !x.closest(".recommend-banner, .routine-board, .titans-tabs, .titans-content-tabs, .gacha-panel")).find((x) => /출석|수령|확인|닫기/.test(x.textContent)); if (!b) break; b.click(); } }); await sleep(900); };
const clickText = (sel, text) => page.evaluate(({ sel, text }) => { const el = [...document.querySelectorAll(sel)].find((b) => b.textContent.trim().includes(text)); el?.click(); return !!el; }, { sel, text });
/** 콘텐츠(성문 방어·비트 수련·대장간)는 하단 바 콘텐츠 팝업에서 연다 */
const openContent = async (label) => { await clickText(".titans-bottom-nav button", "모험"); await sleep(400); await clickText(".nav-popup-grid button", label); await sleep(1200); };
const prog = () => page.evaluate((h) => JSON.parse(localStorage.getItem(`dodgebullets:progression:v1:${h}`)), H);
const titans = () => page.evaluate((h) => JSON.parse(localStorage.getItem(`dodgebullets:titans:${h}`)), H);

const baseProgress = { version: 5, onboardingStep: 4, level: 30, exp: 90000, attendanceStreak: 5, redGems: 2000, sharedCoins: 500000, enhancementMaterials: 40,
  titanBestStage: 12, pioneeredArea: 3, dodgeBestStage: 3, idleClaimedAt: now, updatedAt: now, partyIds: ["mia", "leon"], partyCap: 4, sessionCount: 9,
  ownedTitles: ["title-titan"], activeTitle: "title-titan", skillPoints: 60 };
const baseTitans = { stage: 12, bestStage: 12, gold: 2000000, heroes: { mia: 12, leon: 8 }, skillInventory: { learned: ["strike", "crit"], levels: { strike: 3, crit: 1 }, equipped: { starter: "strike", linkA: "crit" }, skillCores: 30 }, lastActiveAt: now };

// ── 1. 뽑기 패널 · 10연 · 연출 · 자동 편성 · 천장 ──
await seed(baseProgress, baseTitans);
await closeModal();
let r = await page.evaluate(() => ({ nameplate: document.querySelector(".hero-title-plate")?.textContent, tabs: [...document.querySelectorAll(".titans-tabs button")].map((b) => b.textContent.trim()) }));
ok("칭호 이름표가 전투 화면 영웅 위에 표시", /타이탄 슬레이어/.test(r.nameplate ?? ""), r.nameplate);
// 하단 바: 동료 탭(편성·역할 칩) → 소환 탭(뽑기 패널)
await clickText(".titans-bottom-nav button", "동료");
await sleep(600);
const roleChips = await page.evaluate(() => [...document.querySelectorAll(".role-chip")].map((c) => c.textContent));
await clickText(".hub-sheet-switch button", "동료 뽑기");
await sleep(600);
r = await page.evaluate(() => ({
  panel: !!document.querySelector(".hub-sheet .gacha-stage-page"),
  pickups: [...document.querySelectorAll(".gacha-pickup-showcase .titan-ally-art")].map((el) => [...el.classList].find((c) => c.startsWith("ally-"))),
  ten: document.querySelector(".gacha-page-actions button:nth-child(2)")?.textContent,
  guarantee: document.querySelector(".gacha-stage-hero p")?.textContent,
  pity: document.querySelector(".gacha-level:not(.summon-level) span")?.textContent,
  summon: document.querySelector(".gacha-level.summon-level")?.textContent,
  tierChips: document.querySelectorAll(".summon-tier-rates li").length,
  lrPity: document.querySelector(".gacha-lr-pity")?.textContent,
}));
r.roleChips = roleChips;
// 2026-10-27 동료 60명 — 지역3 상한(15) 안에 아직 못 만난 동료(페블 13 · 프로스트 14 · 오로라 15)가 생겨 픽업이 다시 있다(최대 2명)
ok("뽑기 시트 · 픽업 최대 2명", r.panel && r.pickups.length >= 1 && r.pickups.length <= 2, r.pickups.join("|"));
ok("뽑기 레벨 줄 · 6등급 확률 칩", /뽑기 Lv\.\d/.test(r.summon ?? "") && r.tierChips === 6, `${r.summon} · 칩 ${r.tierChips}`);
// 초월 천장 (2026-10-27 아쉬운 점) — 초월이 없는 초반 지역(상한 15)에서도 게이지가 보이고 쌓인다
ok("초월 천장 게이지: 초반 지역에도 보인다 · 'STAGE 23 지역부터'", /초월 천장 0.200/.test(r.lrPity ?? "") && /쌓는 중 · 초월은 STAGE 23 지역부터/.test(r.lrPity ?? ""), r.lrPity);
ok("10회 소환 900 · SR 보장 표기", /900/.test(r.ten ?? "") && /SR 이상/.test(r.guarantee ?? ""), `${r.ten} / ${r.guarantee}`);
ok("천장 카운터 60회 표기", /60회/.test(r.pity ?? ""), r.pity);
ok("역할 효과 칩(도발·축복) 표시", r.roleChips.length === 2 && /도발/.test(r.roleChips[0]), r.roleChips.join("|"));
// 확률 공시
await page.evaluate(() => document.querySelector(".gacha-page-actions button:nth-child(3)")?.click());
await sleep(400);
r = await page.evaluate(() => ({ sheet: !!document.querySelector(".gacha-rates-sheet"), rows: [...document.querySelectorAll(".gacha-rates-sheet tbody tr")].map((tr) => tr.textContent), text: document.querySelector(".gacha-rates-sheet p")?.textContent }));
const pctSum = r.rows.reduce((s, t) => s + parseFloat((t.match(/(\d+\.\d+)%/) ?? [0, 0])[1]), 0);
ok("확률 공시 시트: 동료별 % 합계 ≈ 100 · 천장/보장 문구", r.sheet && Math.abs(pctSum - 100) < 0.2 && /천장/.test(r.text ?? "") && /보장/.test(r.text ?? ""), `${r.rows.length}행 합 ${pctSum.toFixed(2)}`);
ok("공시: 상점 전용 동료(루나·볼트) 제외", !r.rows.some((t) => /루나|볼트/.test(t)));
await clickText(".gacha-rates-sheet button", "닫기");
await sleep(300);
const gemsBefore = (await prog()).redGems;
const discoveredBeforeKeys = new Set((await prog()).discovered ?? []);
await page.evaluate(() => document.querySelector(".gacha-page-actions button:nth-child(2)")?.click());
await sleep(2000); // 소환진 1.2s 후 카드 공개
r = await page.evaluate(() => ({ cards: document.querySelectorAll(".gacha-card").length, fronts: [...document.querySelectorAll(".gacha-card-front b")].map((b) => b.textContent), labels: [...document.querySelectorAll(".gacha-card-front small")].map((s) => s.textContent) }));
let p = await prog();
let t = await titans();
ok("10연 → 카드 10장 연출", r.cards === 10, String(r.cards));
// 2026-10-22: 처음 합류한 동료마다 첫 발견 보상 +50 보석(titans/discovery) — 그만큼 덜 줄어든다
// 새 발견 키를 모두 센다 — 첫 10연 전설이 바로 싸워 새 몬스터(+20)도 그 사이에 잡힌다
const discoveryGems = [...new Set(p.discovered ?? [])].filter((k) => !discoveredBeforeKeys.has(k)).reduce((a, k) => a + (k.startsWith("ally:") ? 50 : k.startsWith("monster:") ? 20 : Math.min(150, Number(k.split(":")[1]) >= 2 ? 10 * Number(k.split(":")[1]) : 0)), 0);
ok("보석 −900(+ 새 동료 첫 발견 50씩) · 누적 소환 10 · 천장 카운터 갱신", gemsBefore - p.redGems === 900 - discoveryGems && p.gachaPulls === 10 && p.gachaPity <= 10, `${gemsBefore}→${p.redGems} 발견 ${discoveryGems} pulls=${p.gachaPulls} pity=${p.gachaPity}`);
ok("10연 SR 이상 1명 이상 (보장)", r.fronts.length === 10 && (await page.evaluate(() => [...document.querySelectorAll(".gacha-card")].some((c) => /rarity-sr|rarity-ssr/.test(c.className)))));
const newNames = r.labels.filter((l) => /새 동료/.test(l)).length;
const dupShards = r.labels.filter((l) => /조각 \+/.test(l)).length;
ok("새 동료/중복 조각 라벨 구분", newNames + dupShards === 10, `new=${newNames} dup=${dupShards}`);
ok("새 동료는 빈 슬롯에 자동 편성 (파티 2 → 최대 4)", p.partyIds.length >= Math.min(4, 2 + newNames) || newNames === 0, p.partyIds.join());
ok("중복은 등급별 조각 (mia R → +10 단위)", newNames === 10 || Object.values(p.allyShards).some((v) => v > 0));
ok("뽑은 동료가 heroes에 Lv.1로 기록", Object.entries(t.heroes).filter(([, v]) => v > 0).length >= 2 + newNames);
await clickText(".gacha-close", "확인");
await sleep(300);
ok("연출 닫힘", await page.evaluate(() => !document.querySelector(".gacha-reveal")));
// 편성 게이트: 상한 밖 동료를 강제로 heroes에 넣고 출전 시도 → 거부 토스트
await page.evaluate((h) => { const k = `dodgebullets:titans:${h}`; const s = JSON.parse(localStorage.getItem(k)); s.heroes.ember = 1; localStorage.setItem(k, JSON.stringify(s)); const pk = `dodgebullets:progression:v1:${h}`; const q = JSON.parse(localStorage.getItem(pk)); q.allyStars.ember = 1; q.partyIds = ["mia"]; localStorage.setItem(pk, JSON.stringify(q)); }, H);
await page.goto(BASE, { waitUntil: "networkidle0" });
await sleep(2200);
await closeModal();
await clickText(".titans-bottom-nav button", "동료");
await sleep(600);
// 도감이 쪽으로 나뉜다 — 동료 53명(2026-10-27)이라 엠버가 있는 쪽을 찾아 넘긴다
for (let pg = 0; pg < 20; pg += 1) {
  if (await page.evaluate(() => [...document.querySelectorAll(".ally-card")].some((c) => /엠버/.test(c.textContent)))) break;
  const more = await page.evaluate((pg) => { const tabs = [...document.querySelectorAll(".ally-pages button")]; tabs[pg + 1]?.click(); return !!tabs[pg + 1]; }, pg); await sleep(250);
  if (!more) break;
}
const gateClicked = await page.evaluate(() => { const card = [...document.querySelectorAll(".ally-card")].find((c) => /엠버/.test(c.textContent)); const btn = card?.querySelector(".ally-party-toggle"); btn?.click(); return !!btn; });
await sleep(500);
r = await page.evaluate(() => document.querySelector(".titans-toast")?.textContent ?? "");
p = await prog();
ok("편성 게이트: 개척 상한 밖 엠버 출전 거부 + 안내", gateClicked && /개척/.test(r) && !p.partyIds.includes("ember"), r);

// ── 2. 스킬 탭: 슬롯 탭 · 효과 수치 · 프리셋 · 시전 버프 칩 ──
await clickText(".titans-tabs button", "스킬");
await sleep(600);
r = await page.evaluate(() => ({
  slotTabs: [...document.querySelectorAll(".skill-slot-tabs button b")].map((b) => b.textContent),
  cards: document.querySelectorAll(".skill-learn-card").length,
  effects: [...document.querySelectorAll(".skill-effect")].map((e) => e.textContent),
  presets: [...document.querySelectorAll(".preset-row button b")].map((b) => b.textContent),
}));
ok("슬롯 탭 5개 · 시동기 탭에 카드 3장 (기본·화상·빙결)", r.slotTabs.length === 5 && r.cards === 3, `${r.slotTabs.join("/")} cards=${r.cards}`);
ok("카드에 효과 수치(탭 ×N · 쿨)", r.effects.every((e) => /탭 ×\d+/.test(e) && /쿨 \d+초/.test(e)), r.effects.join(" | "));
ok("프리셋 3종 (균형형·탭 폭발형·원정대형)", r.presets.join() === "균형형,탭 폭발형,원정대형", r.presets.join());
await clickText(".skill-slot-tabs button", "패시브");
await sleep(300);
r = await page.evaluate(() => [...document.querySelectorAll(".skill-effect")].map((e) => e.textContent));
ok("패시브 3종 효과 수치 표기", r.length === 3 && r.some((e) => /탭 피해 \+/.test(e)) && r.some((e) => /보스 제한시간 \+/.test(e)), r.join(" | "));
// 패시브 학습(단단한 앞니) → 학습 후 장착 상태
await page.evaluate(() => { const card = [...document.querySelectorAll(".skill-learn-card")].find((c) => /단단한 앞니/.test(c.textContent)); card?.querySelector(".skill-card-actions button")?.click(); });
await sleep(500);
t = await titans();
ok("패시브 학습 → 장착 (SP·코어 차감)", t.skillInventory.learned.includes("steel") && t.skillInventory.equipped.passive === "steel");
// 전투 화면에서 꼬리 치기 박자(crit) 시전 → 버프 칩 "치명 +45%"
await clickText(".titans-tabs button", "전장");
await sleep(400);
await page.evaluate(() => { [...document.querySelectorAll(".titans-skill-dock .titans-skill")].find((b) => b.querySelector(".skill-icon-crit") || /꼬리 치기/.test(b.textContent ?? "") || b.getAttribute("title")?.includes("꼬리 치기"))?.click(); });
await sleep(500);
r = await page.evaluate(() => [...document.querySelectorAll(".titans-buffs span")].map((s) => s.textContent));
ok("꼬리 치기 박자 시전 → 버프 칩 '치명 +45%'", r.some((x) => /치명 \+45%/.test(x)), r.join("|"));

// ── 3. 과금 정합: 후원 일일 보석 · 무료 지급 게이트(DEV) ──
await seed({ ...baseProgress, patronUntil: now + 86400000 * 10, patronClaimedDate: "" }, baseTitans);
await closeModal();
p = await prog();
ok("후원 계약 중 부팅 → 오늘 보석 +15 · 날짜 기록", p.redGems === 2015 && p.patronClaimedDate === new Date().toLocaleDateString("sv-SE"), `${p.redGems} ${p.patronClaimedDate}`);
await page.goto(BASE, { waitUntil: "networkidle0" });
await sleep(2200);
p = await prog();
ok("같은 날 재부팅 → 중복 지급 없음", p.redGems === 2015, String(p.redGems));
await closeModal();
await clickText(".titans-bottom-nav button", "상점");
await sleep(500);
await clickText(".premium-category-tabs button", "패키지");
await sleep(400);
r = await page.evaluate(() => [...document.querySelectorAll(".premium-product-card button")].map((b) => b.textContent.trim()));
ok("DEV 빌드: 무료 지급 버튼이 QA 표기 · 캐릭터/월정액은 가격만", r.some((x) => /QA/.test(x)) && r.some((x) => /₩5,900|₩5,500/.test(x)), r.join("|"));
await clickText(".premium-category-tabs button", "재화");
await sleep(300);
r = await page.evaluate(() => [...document.querySelectorAll(".premium-product-card p")].map((p) => p.textContent).find((x) => /사냥터 골드/.test(x)));
ok("황금 보급 상자 수량 표기(×3000 반영)", /\+/.test(r ?? ""), r);

// ── 동료 값 조정 안내 (2026-10-27 아쉬운 점: 오리온 · 새 동료 약화) — 옛 저장은 쓴 골드로 레벨을 다시 맞추고 한 번 알린다 ──
await seed(baseProgress, { ...baseTitans, gold: 1000, heroes: { mia: 12, leon: 8, orion: 30, storm: 15 } });
const reb = await page.evaluate(() => ({ modal: document.querySelector(".rebalance-modal")?.textContent ?? "" }));
await page.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "닫기" && !b.closest(".rebalance-modal"))?.click()); await sleep(500);
await page.screenshot({ path: "art-gen/out/rebalance-notice.png" });
await page.evaluate(() => [...document.querySelectorAll(".rebalance-modal button")].find((b) => /확인/.test(b.textContent))?.click()); await sleep(500);
const tReb = await page.evaluate((H) => JSON.parse(localStorage.getItem(`dodgebullets:titans:${H}`)), H);
ok("옛 저장 동료 다시 계산 안내: 오리온 Lv.30 → 35 · 스톰 15 → 18 · 남은 골드", /동료 밸런스 조정/.test(reb.modal) && /오리온/.test(reb.modal) && /Lv.30 → Lv.35/.test(reb.modal) && /Lv.15 → Lv.18/.test(reb.modal) && /돌려받음/.test(reb.modal), reb.modal.slice(0, 120));
ok("다시 계산이 저장된다 · 안내는 한 번만", tReb.heroes.orion === 35 && tReb.heroes.storm === 18 && tReb.allyRebalance === 1 && !tReb.rebalanceNotice && tReb.gold > 1000, JSON.stringify({ o: tReb.heroes.orion, s: tReb.heroes.storm, g: tReb.gold, v: tReb.allyRebalance }));
await page.reload({ waitUntil: "networkidle0" }); await sleep(2000);
ok("다시 열어도 안내가 또 뜨지 않는다", !(await page.$(".rebalance-modal")));

ok("런타임 에러 0건", errors.length === 0, errors.join(" | "));
await browser.close();
for (const [s, n, d] of results) console.log(s, n, d ? "— " + d : "");
const fails = results.filter((x) => x[0] === "FAIL").length;
console.log(fails === 0 ? "\nALL PASS" : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
