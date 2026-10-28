// 아처 키우기 차용 2차 — 실제 화면 검사 (2026-10-22): 번개 강화 줄 · 환영 선물 · 뽑기 중복 조각 진행 · 환생 미리 보기 · 이벤트 코인.
//   node scripts/verify-archer-play2.mjs   (vite 5173)
import { launchBrowser } from "./launch-browser.mjs";
const BASE = "http://localhost:5173", H = "mock-local-dev", now = Date.now();
const browser = await launchBrowser({ args: ["--no-sandbox"] }); const page = await browser.newPage(); const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = []; page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
await page.goto(BASE, { waitUntil: "networkidle0" });
let fails = 0; const ok = (n, c, d = "") => { console.log(`${c ? "PASS" : "FAIL"} ${n}${d ? " — " + d : ""}`); if (!c) fails += 1; };
const prog = () => page.evaluate((H) => JSON.parse(localStorage.getItem(`dodgebullets:progression:v1:${H}`) ?? "{}"), H);
const tit = () => page.evaluate((H) => JSON.parse(localStorage.getItem(`dodgebullets:titans:${H}`) ?? "{}"), H);
const clickText = (sel, text) => page.evaluate(({ sel, text }) => { const el = [...document.querySelectorAll(sel)].find((b) => b.textContent.trim().includes(text)); el?.click(); return !!el; }, { sel, text });
const baseProgress = (extra = {}) => ({ version: 5, level: 10, redGems: 100, idleClaimedAt: now, updatedAt: now, onboardingStep: 4, sessionCount: 9, partyIds: ["mia", "leon"], partyCap: 4, claimedRewards: ["dodge-tutorial"], pioneeredArea: 3, discoverySeeded: true, discovered: ["monster:slime", "monster:goblin", "monster:bat", "ally:mia", "ally:leon"], ...extra });
const seed = async (progress, titans, attendance = { lastClaimDate: new Date().toLocaleDateString("sv-SE"), totalDays: 3, consecutiveDays: 3 }) => {
  await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) if (v !== null) localStorage.setItem(k, v); }, { [`dodgebullets:progression:v1:${H}`]: JSON.stringify(progress), [`dodgebullets:titans:${H}`]: JSON.stringify(titans), [`dodgebullets:attendance:v1:${H}`]: attendance ? JSON.stringify(attendance) : null, "dodge-bullets:soundEnabled": "0", "dodgebullets:test-phase": "0" });
  await page.reload({ waitUntil: "networkidle0" }); await sleep(1200);
};
const closeModals = () => page.evaluate(() => { for (let k = 0; k < 5; k += 1) { const c = document.querySelector(".idle-claim"); if (c) { c.click(); continue; } const b = [...document.querySelectorAll("button")].filter((x) => !x.closest(".titans-bottom-nav")).find((x) => /^(닫기|확인|나중에)$/.test(x.textContent.trim())); if (b) b.click(); } });
// 팝업 관찰은 문서가 열릴 때부터(첫 몇 초 안의 팝업을 놓치지 않게)
const pops = []; await page.exposeFunction("__pop", (t) => pops.push(t));
await page.evaluateOnNewDocument(() => { document.addEventListener("DOMContentLoaded", () => new MutationObserver((ms) => { for (const m of ms) for (const n of m.addedNodes) if (n instanceof Element && n.matches(".reward-pop")) window.__pop(n.textContent); }).observe(document.body, { childList: true, subtree: true })); });
const watchPops = async () => {};

// ── 5. 출석 첫날 보석 1000 — 출석을 한 번도 안 받은 계정은 부팅 때 출석 판이 뜬다 ──
await seed(baseProgress({ sessionCount: 0, redGems: 0, discovered: [] }), { gold: 0, stage: 1, bestStage: 1, totalKills: 0, heroes: { mia: 1, leon: 1 }, lastActiveAt: now }, null);
for (let i = 0; i < 20 && !(await page.$(".attendance-modal")); i += 1) await sleep(250);
const day1 = await page.evaluate(() => document.querySelector(".attendance-modal .attendance-grid > div")?.textContent ?? "");
ok("출석 판 DAY 1 칸 = 보석 1000", /1000/.test(day1), day1);
await page.evaluate(() => document.querySelector(".attendance-modal .cta:not(.cta-ghost)")?.click()); await sleep(1200);
let p = await prog();
ok("첫 출석 → 보석 +1000 · welcome-gift 기록(깜짝 선물 조건)", p.redGems >= 1000 && (p.claimedRewards ?? []).includes("welcome-gift"), `보석 ${p.redGems}`);
const gemsAfterGift = p.redGems;
await page.reload({ waitUntil: "networkidle0" }); await sleep(1800);
p = await prog();
ok("같은 날 다시 들어와도 한 번만", p.redGems - gemsAfterGift < 1000 && !(await page.$(".attendance-modal")), `${gemsAfterGift} → ${p.redGems}`);

// ── 2. 번개 강화 삭제 (2026-10-28, 사용자: "번개장비는 뭔지모르겠어 삭제") — 카드가 없고 옛 단계는 쓴 골드로 돌려받는다 ──
await seed(baseProgress(), { gold: 100000, stage: 3, bestStage: 3, totalKills: 50, heroes: { mia: 5, leon: 5 }, lastActiveAt: now, lightningLevel: 2 });
const toastRefund = await (async () => { for (let i = 0; i < 20; i += 1) { const t = await page.evaluate(() => document.querySelector(".titans-toast")?.textContent ?? ""); if (/번개 강화를 없앴어요/.test(t)) return t; await sleep(150); } return ""; })();
await closeModals(); await sleep(400);
await page.evaluate(() => [...document.querySelectorAll(".titans-growth-tabs button")].find((b) => b.textContent.includes("장비"))?.click()); await sleep(500);
const lcard = await page.evaluate(() => !!document.querySelector(".lightning-card") || [...document.querySelectorAll(".equipment-training-card strong")].some((e) => /번개/.test(e.textContent)));
const t1 = await tit();
ok("장비 탭에 번개 카드 없음 · 옛 Lv.2 는 쓴 골드 336 돌려받음 · 알림", !lcard && t1.gold >= 100000 + 150 + 186 && !("lightningLevel" in t1) && /번개 강화를 없앴어요/.test(toastRefund), `카드 ${lcard} · 골드 ${t1.gold} · ${toastRefund}`);

// ── 8. 이벤트 코인 — 드롭 · 지갑 · 교환 ──
await seed(baseProgress({ eventCoins: 0, enhancementMaterials: 0 }), { gold: 1000, stage: 2, bestStage: 2, totalKills: 30, heroes: { mia: 30, leon: 30 }, lastActiveAt: now });
await closeModals(); await sleep(300);
await page.evaluate(() => { window.__coins = 0; new MutationObserver((ms) => { for (const m of ms) for (const n of m.addedNodes) if (n instanceof Element && n.matches(".titans-fx-coin")) window.__coins += 1; }).observe(document.querySelector(".titans-field"), { childList: true, subtree: true }); window.__rand = Math.random; Math.random = () => 0.01; });
for (let i = 0; i < 40 && (await page.evaluate(() => window.__coins)) === 0; i += 1) await sleep(250);
await page.evaluate(() => { Math.random = window.__rand; });
await sleep(800);
p = await prog();
ok("몬스터가 코인을 떨어뜨린다 → 튀어 오르는 코인 + 저장", (await page.evaluate(() => window.__coins)) >= 1 && p.eventCoins >= 1, `코인 연출 ${await page.evaluate(() => window.__coins)} · 저장 ${p.eventCoins}`);
// 교환 — 코인을 넉넉히 넣고 이벤트 탭
await seed(baseProgress({ eventCoins: 100, enhancementMaterials: 0 }), { gold: 1000, stage: 2, bestStage: 2, totalKills: 30, heroes: { mia: 30, leon: 30 }, lastActiveAt: now });
await closeModals(); await sleep(300);
await clickText(".titans-bottom-nav button", "상점"); await sleep(500);
await clickText(".hub-sheet-switch button", "이벤트"); await sleep(500);
const shop = await page.evaluate(() => ({ wallet: document.querySelector('[data-wallet="coin"]')?.textContent ?? "", cards: [...document.querySelectorAll(".event-offer-card.coin-offer")].map((c) => c.textContent) }));
ok("이벤트 탭: 지갑에 코인 100 · 코인 교환 카드 3장", /100/.test(shop.wallet) && shop.cards.length === 3, `${shop.wallet} · ${shop.cards.length}장`);
await page.evaluate(() => [...document.querySelectorAll(".event-offer-card.coin-offer")].find((c) => c.textContent.includes("강화석"))?.querySelector("button")?.click()); await sleep(700);
p = await prog();
ok("코인 20 → 강화석 25", p.eventCoins === 80 && p.enhancementMaterials === 25, `코인 ${p.eventCoins} · 강화석 ${p.enhancementMaterials}`);

// ── 6. 뽑기 중복 → 다음 성급 조각 진행 ──
const allHeroes = Object.fromEntries(["mia", "leon", "sera", "garen", "ari", "nox", "pyro", "marina", "zephyr", "bronn", "iris", "cain", "sylph", "orion", "ember"].map((id) => [id, 10]));
await seed(baseProgress({ redGems: 2000, allyShards: {}, allyStars: {} }), { gold: 1000, stage: 2, bestStage: 2, totalKills: 30, heroes: allHeroes, lastActiveAt: now });
await closeModals(); await sleep(300);
await clickText(".titans-bottom-nav button", "동료"); await sleep(500);
await clickText(".hub-sheet-switch button", "동료 뽑기"); await sleep(500);
await page.evaluate(() => document.querySelector(".gacha-page-actions button:nth-child(2)")?.click());
await sleep(2400);
const dup = await page.evaluate(() => ({ cards: document.querySelectorAll(".gacha-card").length, dups: document.querySelectorAll(".gacha-card.dup").length, prog: [...document.querySelectorAll(".gacha-card .dup-progress")].map((e) => e.getAttribute("title") ?? ""), art: [...document.querySelectorAll(".gacha-card.dup")].map((c) => { const a = c.querySelector(".gacha-art").getBoundingClientRect(), d = c.querySelector(".dup-progress").getBoundingClientRect(); return d.height / a.height; }), bars: [...document.querySelectorAll(".gacha-card .dup-bar > i")].map((e) => e.style.width) }));
ok("10연 중복 카드마다 막대 + 제목(★2까지 a/b · ★2 승급 가능) · 그림의 1/4 이하만 덮는다", dup.dups > 0 && dup.prog.length === dup.dups && dup.prog.every((t) => /★\d까지 \d+\/\d+|★\d 승급 가능|최대/.test(t)) && dup.bars.every((w) => /%$/.test(w)) && dup.art.every((r) => r <= 0.25), `${dup.cards}장 · 중복 ${dup.dups} · ${dup.prog.slice(0, 3).join(" | ")}`);
// 카드를 누르면 설명 패널에 조각 진행 · 승급 배율 전후
await page.evaluate(() => document.querySelector(".gacha-card.dup")?.click()); await sleep(300);
const detail = await page.evaluate(() => document.querySelector(".gacha-detail")?.textContent ?? "");
ok("중복 카드 설명: '★2 조각 a/b · 피해 ×1 → ×1.6'", /★\d 조각 \d+\/\d+ · 피해 ×[\d.]+ → ×[\d.]+/.test(detail), detail.slice(-80));
await clickText(".gacha-close", "확인"); await sleep(300);

// ── 7. 환생 미리 보기 · 벽 지역 수 ──
await seed(baseProgress({ titanBestStage: 36, rebirthCount: 1, wallAreas: [], inheritanceCrystals: 10 }), { gold: 1000, stage: 2, bestStage: 36, totalKills: 300, heroes: { mia: 30, leon: 30 }, lastActiveAt: now });
await closeModals(); await sleep(300);
await page.evaluate(() => document.querySelector(".titans-back")?.click()); await sleep(1600);
const rb = await page.evaluate(() => ({ btn: document.querySelector(".rebirth-button")?.textContent ?? "", pre: document.querySelector(".rebirth-preview")?.textContent ?? "" }));
ok("환생 단추: 첫 환생 뒤엔 'DPS 벽 0/1 지역'(예전엔 /3 고정)", /DPS 벽 0\/1 지역/.test(rb.btn), rb.btn);
// 2026-10-26 — 방치 배율 전후는 결정 강화 트리(방치 효율 줄)로 옮겼다 · 대신 시작 스테이지
ok("환생 미리 보기: 결정 +18 · 시작 스테이지 · 출발 골드", /결정 \+18/.test(rb.pre) && /시작 스테이지\s*1층부터/.test(rb.pre) && /출발 골드/.test(rb.pre), rb.pre);

// ── 5'. 첫 10연 최고 등급 확정 ──
await seed(baseProgress({ redGems: 2000, gachaPulls: 0, gachaPity: 0 }), { gold: 1000, stage: 2, bestStage: 2, totalKills: 30, heroes: { mia: 10, leon: 10 }, lastActiveAt: now });
await closeModals(); await sleep(300);
await clickText(".titans-bottom-nav button", "동료"); await sleep(500);
await clickText(".hub-sheet-switch button", "동료 뽑기"); await sleep(500);
const badge = await page.evaluate(() => document.querySelector(".gacha-page-actions .first-ten-badge")?.textContent ?? "");
await page.evaluate(() => document.querySelector(".gacha-page-actions button:nth-child(2)")?.click());
await sleep(2400);
const first = await page.evaluate(() => ({ ssrIds: [...document.querySelectorAll(".gacha-card.rarity-ssr, .gacha-card.rarity-ur, .gacha-card.rarity-lr")].map((c) => c.getAttribute("data-ally")), n: document.querySelectorAll(".gacha-card").length, ssr: [...document.querySelectorAll(".gacha-card.rarity-ssr")].map((c) => ({ name: c.querySelector(".gacha-card-front b")?.textContent, lock: !!c.querySelector(".gacha-lock") })) }));
ok("첫 10연: '첫 10연 전설 확정' · 결과에 전설 1명 이상(초반 지역 풀에 전설이 없어도) · 잠금 표시 없음", /첫 10연 전설 확정/.test(badge) && first.n === 10 && first.ssr.length >= 1 && first.ssr.every((c) => !c.lock), `${badge} · ${JSON.stringify(first.ssr)}`);
await clickText(".gacha-close", "확인"); await sleep(300);
const badgeAfter = await page.evaluate(() => !!document.querySelector(".gacha-page-actions .first-ten-badge"));
ok("두 번째부터는 확정 표시 없음", !badgeAfter);
p = await prog();
// 2026-10-28 스테이지 해금 없음 — 출전 허가(field-pass)는 없어졌다. 뽑은 새 동료는 높은 등급부터 빈 편성 칸에 들어간다
const passId = first.ssrIds.find((id) => (p.partyIds ?? []).includes(id));
ok("첫 10연 전설(이상)이 편성에 자동으로 들어간다(높은 등급부터)", !!passId, `${first.ssrIds.join()} · 편성 ${JSON.stringify(p.partyIds)}`);
await page.evaluate(() => document.querySelector(".hub-sheet-close")?.click()); await sleep(2500);
ok("사냥터 전장에 그 전설이 같이 싸운다", await page.evaluate((id) => !!document.querySelector(`.titans-allies .ally-${id}`), passId), passId);

// ── 5''. 깜짝 선물 — 환영 선물을 받은 계정의 첫 대장 처치 ──
await seed(baseProgress({ redGems: 100, claimedRewards: ["dodge-tutorial", "welcome-gift"] }), { gold: 1000, stage: 1, bestStage: 1, totalKills: 5, heroes: { mia: 30, leon: 30 }, lastActiveAt: now });
await closeModals();
for (let i = 0; i < 120 && !(await page.$(".titans-boss-challenge")); i += 1) await sleep(250);
await page.evaluate(() => document.querySelector(".titans-boss-challenge")?.click());
for (let i = 0; i < 120 && !pops.some((t) => /깜짝 선물/.test(t)); i += 1) await sleep(250);
await sleep(600);
p = await prog();
ok("첫 대장 처치 → '깜짝 선물 · 붉은 보석 +500' · 받음 기록", pops.some((t) => /깜짝 선물/.test(t) && /500/.test(t)) && p.redGems >= 600 && (p.claimedRewards ?? []).includes("surprise-gift"), `보석 ${p.redGems}`);

// ── 7'. 자동 환생 — 마이페이지 스위치 → 사냥터로 돌아오면 조건을 채운 채라 바로 환생 ──
await seed(baseProgress({ rebirthCount: 1, wallAreas: ["meadow"], titanBestStage: 30, autoRebirth: false, inheritanceCrystals: 0 }), { gold: 500, stage: 9, bestStage: 30, totalKills: 400, heroes: { mia: 40, leon: 40 }, lastActiveAt: now, acorns: { grid: [3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], allyAmmo: { mia: 4 }, best: 4, acc: 0 } });
await closeModals(); await sleep(3200);
ok("자동 환생 꺼짐 → 조건을 채워도 환생하지 않는다", (await prog()).rebirthCount === 1);
await page.evaluate(() => document.querySelector(".titans-back")?.click()); await sleep(1500);
await clickText(".mypage-tabs button", "배지"); await sleep(400);
await page.evaluate(() => document.querySelector(".auto-rebirth-toggle")?.click()); await sleep(600);
ok("마이페이지 '자동 환생' 스위치 → 저장 켜짐", (await prog()).autoRebirth === true && (await page.evaluate(() => document.querySelector(".auto-rebirth-toggle")?.getAttribute("aria-checked"))) === "true");
await clickText("button", "사냥터로"); await sleep(1200);
for (let i = 0; i < 40 && !pops.some((t) => /자동 환생/.test(t)); i += 1) await sleep(250);
await sleep(1500);
p = await prog(); const tr = await tit();
ok("사냥터로 돌아오자 자동 환생: 2회 · 벽 기록 비움 · 결정 +16 · 1층 · 출발 골드 · 도토리 유지", pops.some((t) => /자동 환생/.test(t)) && p.rebirthCount === 2 && (p.wallAreas ?? []).length === 0 && p.inheritanceCrystals === 16 && tr.stage <= 2 && tr.gold >= 5000 && tr.acorns?.allyAmmo?.mia === 4, `${pops.filter((t) => /환생/.test(t)).join(" | ")} · 환생 ${p.rebirthCount} · 결정 ${p.inheritanceCrystals} · ${tr.stage}층 · 골드 ${tr.gold} · 도토리 ${JSON.stringify(tr.acorns?.allyAmmo)}`);
const killsBefore = (await tit()).totalKills ?? 0;
for (let i = 0; i < 60; i += 1) { await page.keyboard.press("Space"); await sleep(120); }
ok("자동 환생 뒤 사냥이 다시 돈다(1층 몬스터를 다시 잡는다)", ((await tit()).totalKills ?? 0) > killsBefore, `${killsBefore} → ${(await tit()).totalKills}`);
await sleep(3000);
ok("환생은 한 번만(되풀이 없음)", (await prog()).rebirthCount === 2);

// ── 7''. 자동 환생 — 전투 도중 벽(같은 지역 대장 2연속 실패) → 바로 환생 (2026-10-23) ──
// 동료 없이 주인공(무기 Lv0)만: 3층 일반 몬스터는 탭으로 잡히고 대장(×11)은 30초 안에 못 잡는다
await seed(baseProgress({ rebirthCount: 1, wallAreas: [], autoRebirth: true, titanBestStage: 12, inheritanceCrystals: 0, partyIds: [] }), { gold: 0, stage: 3, bestStage: 12, totalKills: 400, heroes: {}, lastActiveAt: now });
await closeModals(); await sleep(500);
const tapUntilBoss = async () => { for (let i = 0; i < 900 && !(await page.$(".titans-boss-challenge")); i += 1) { await page.keyboard.press("Space"); await sleep(70); } return !!(await page.$(".titans-boss-challenge")); };
const bossFail = async () => {
  const ready = await tapUntilBoss();
  await page.evaluate(() => document.querySelector(".titans-boss-challenge")?.click());
  await sleep(34000);   // 탭하지 않고 제한시간(30초)을 넘긴다
  await page.evaluate(() => [...document.querySelectorAll(".moment-offer button")].find((b) => /괜찮아요|나중에/.test(b.textContent))?.click());
  return ready;
};
const r1 = await bossFail();
ok("대장 1차 실패(자동 환생 조건 아님)", r1 && (await prog()).rebirthCount === 1 && ((await prog()).wallAreas ?? []).length === 0, JSON.stringify((await prog()).wallAreas));
const r2 = await bossFail();
for (let i = 0; i < 30 && !pops.some((t) => /자동 환생 · 2회/.test(t)); i += 1) await sleep(250);
await sleep(1500);
p = await prog();
const tw = await tit();
ok("대장 2차 실패 → 벽 기록 → 그 자리에서 자동 환생(2회 · 벽 기록 비움 · 1층 · 팝업)", r2 && p.rebirthCount === 2 && (p.wallAreas ?? []).length === 0 && tw.stage <= 2 && pops.some((t) => /자동 환생 · 2회/.test(t)), `환생 ${p.rebirthCount} · 벽 ${JSON.stringify(p.wallAreas)} · ${tw.stage}층`);

// ── 5'''. 옛 계정(출석을 한 번도 안 받았지만 이미 진행함)은 첫날 1000 이 아니라 예전 20 ──
await seed(baseProgress({ redGems: 0, titanBestStage: 30, gachaPulls: 40 }), { gold: 0, stage: 20, bestStage: 30, totalKills: 900, heroes: { mia: 30, leon: 30 }, lastActiveAt: now }, null);
for (let i = 0; i < 20 && !(await page.$(".attendance-modal")); i += 1) await sleep(250);
const oldDay1 = await page.evaluate(() => document.querySelector(".attendance-modal .attendance-grid > div")?.textContent ?? "");
await page.evaluate(() => document.querySelector(".attendance-modal .cta:not(.cta-ghost)")?.click()); await sleep(1200);
p = await prog();
ok("옛 계정 첫 출석: 판도 지급도 보석 20 · welcome-gift 없음", /×20/.test(oldDay1) && !/1000/.test(oldDay1) && p.redGems >= 20 && p.redGems < 1000 && !(p.claimedRewards ?? []).includes("welcome-gift"), `${oldDay1} · 보석 ${p.redGems}`);

// ── 체험 출전 — 첫 10연 전설(아리)은 지역이 열리기 전엔 "열린 가장 센 동료의 2배"까지만 ──
// 2026-10-27 동료 60명 — 지역3(상한 15)엔 신화 오로라(15층)가 있어 "열린 최강의 2배"가 아리보다 커진다(체험 ×1). 체험이 걸리는 지역2(상한 10)로 본다
await seed(baseProgress({ redGems: 0, claimedRewards: ["dodge-tutorial", "field-pass:ari"], partyIds: ["mia", "ari"], pioneeredArea: 2 }), { gold: 0, stage: 2, bestStage: 2, totalKills: 30, heroes: { mia: 5, ari: 1 }, lastActiveAt: now });
await closeModals(); await sleep(300);
await clickText(".titans-bottom-nav button", "동료"); await sleep(600);
for (let pg = 0; pg < 20; pg += 1) {   // 도감은 쪽으로 나뉜다 — 아리가 있는 쪽까지 넘긴다
  if (await page.evaluate(() => [...document.querySelectorAll(".ally-card, .titans-card")].some((c) => /아리/.test(c.textContent) && /DPS/.test(c.textContent)))) break;
  const more = await page.evaluate((pg) => { const tabs = [...document.querySelectorAll(".ally-pages button")]; tabs[pg + 1]?.click(); return !!tabs[pg + 1]; }, pg); await sleep(250);
  if (!more) break;
}
const ariCard = await page.evaluate(() => [...document.querySelectorAll(".ally-card, .titans-card")].map((c) => c.textContent).find((t) => /아리/.test(t) && /DPS/.test(t)) ?? "");
ok("아리 카드에 '체험 ×0.xx(STAGE 16 개척 시 제 힘)'", /체험 ×0\.\d\d\(STAGE 16 개척 시 제 힘\)/.test(ariCard), ariCard.slice(0, 120));

ok("페이지 오류 없음", errors.length === 0, errors.slice(0, 2).join(" / "));
console.log(fails ? `${fails} FAIL` : "ALL PASS");
await browser.close(); process.exit(fails ? 1 : 0);
