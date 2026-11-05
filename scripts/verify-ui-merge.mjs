/**
 * 탭 합치기 · 카드 버튼 하나 (2026-11-03, 사용자: "유저 입장에서 난잡하지 않게 탭을 머지해서 가독성이 딱 좋게 전반적으로") — 다시 어수선해지지 않게
 *   node scripts/verify-ui-merge.mjs   (vite dev 서버 5173 필요)
 * 상점: 머리 5칸 하나 · 아래 줄은 뽑기 · 꾸미기에만 · 특별 상품은 패키지 안 / 동료: 편성 · 수량 한 줄 · ‹ 쪽 › 하나 · 접힌 카드 버튼 하나 /
 * 스킬: 접힌 카드 버튼 하나 · 시전 칸 5개가 한 줄에 / 성장 탭 한 줄 · 전장 알림 한 줄
 */
import { launchBrowser } from "./launch-browser.mjs";
// 저장 심기는 게임 없는 favicon 페이지에서 — 떠 있는 게임이 비동기로 옛 저장을 써 심은 값을 덮었다(전체 실행에서만 드물게: 골드 31 · 표본 0 · 창을 심었는데 검, 2026-11-04)
const BASE = "http://localhost:5173", H = "mock-local-dev", now = Date.now();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = []; const ok = (n, c, d = "") => results.push([c ? "PASS" : "FAIL", n, d]);
const browser = await launchBrowser({ args: ["--no-sandbox", "--disable-gpu"] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
const errors = []; page.on("pageerror", (e) => errors.push(String(e.message).slice(0, 200)));
await page.goto(BASE, { waitUntil: "networkidle0" });
const progress = { version: 5, onboardingStep: 4, level: 40, redGems: 5000, sharedCoins: 500000, enhancementMaterials: 2000, titanBestStage: 40, pioneeredArea: 5, idleClaimedAt: now, updatedAt: now, partyIds: ["mia", "leon", "sera", "garen"], partyCap: 4, sessionCount: 9, claimedRewards: ["dodge-tutorial", "welcome-gift"], beatSkills: { kick: 15, hat: 15, snare: 15, fire: 15, throat: 15 } };
const titans = { stage: 40, bestStage: 40, gold: 2000000, heroes: { mia: 26, leon: 13, sera: 4, garen: 9, toto: 1, kiki: 1, momo: 1, bobo: 1, dodo: 1, pipi: 1, gugu: 1, nana: 1, rara: 1 }, skillInventory: { learned: ["strike", "crit", "clone", "thunderLink", "meteor", "steel"], levels: { strike: 3, crit: 1, clone: 3, thunderLink: 1, meteor: 5, steel: 5 }, equipped: { starter: "strike", linkA: "crit", passive: "steel" }, skillCores: 30, copies: { thunderLink: 1, steel: 4, strike: 2 } }, lastActiveAt: now };
await page.goto(`${BASE}/favicon.png`, { waitUntil: "domcontentloaded" }); await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); location.href = "/"; }, {
  [`dodgebullets:progression:v1:${H}`]: JSON.stringify(progress), [`dodgebullets:titans:${H}`]: JSON.stringify(titans), "dodge-bullets:soundEnabled": "0",
  [`dodgebullets:attendance:v1:${H}`]: JSON.stringify({ lastClaimDate: new Date().toLocaleDateString("sv-SE"), totalDays: 3, consecutiveDays: 3 }),
}).catch(() => {});
await page.waitForNavigation({ waitUntil: "networkidle0" }).catch(() => {});
await sleep(2200);
const click = (sel, text) => page.evaluate(({ sel, text }) => { const el = [...document.querySelectorAll(sel)].find((b) => b.textContent.trim().includes(text)); el?.click(); return !!el; }, { sel, text });
for (let k = 0; k < 3; k += 1) { await page.evaluate(() => { document.querySelector(".idle-claim")?.click(); [...document.querySelectorAll("button")].filter((x) => !x.closest(".titans-bottom-nav")).find((x) => /^(닫기|확인|나중에)$/.test(x.textContent.trim()))?.click(); }); await sleep(250); }
const shown = (sel) => page.evaluate((sel) => [...document.querySelectorAll(sel)].filter((e) => e.getClientRects().length > 0).map((e) => e.textContent.trim()), sel);
const rowsOf = (sel) => page.evaluate((sel) => new Set([...document.querySelectorAll(sel)].filter((e) => e.getClientRects().length > 0).map((e) => Math.round(e.getBoundingClientRect().top))).size, sel);

// ── 사냥터 ──
await sleep(800);
ok("전장 알림은 한 번에 한 줄", (await shown(".battle-alert-stack > .battle-alert")).length <= 1, (await shown(".battle-alert-stack > .battle-alert")).join(" | "));
ok("성장 탭 네 칸이 한 줄", (await rowsOf(".titans-growth-tabs > button:not(.growth-drawer-close)")) === 1);

// ── 스킬 ──
await click(".titans-tabs button", "스킬"); await sleep(700);
const skill = await page.evaluate(() => {
  const cards = [...document.querySelectorAll(".skill-learn-card:not(.is-open)")];
  return {
    n: cards.length,
    btns: cards.map((c) => [...c.querySelectorAll(".skill-card-actions button")].filter((b) => b.getClientRects().length > 0).length),
    label: Object.fromEntries(cards.map((c) => [c.dataset.slot + ":" + ([...(c.querySelector("strong")?.childNodes ?? [])].find((n) => n.nodeType === 3 && n.textContent.trim())?.textContent ?? "").trim(), [...c.querySelectorAll(".skill-card-actions button")].filter((b) => b.getClientRects().length > 0).map((b) => b.textContent.trim()).join()])),
    dashed: cards.some((c) => getComputedStyle(c).outlineStyle === "dashed"),
    badge: !!document.querySelector(".skill-card-tag"),
  };
});
ok("접힌 스킬 카드는 버튼이 꼭 하나", skill.n >= 10 && skill.btns.every((b) => b === 1), skill.btns.join(""));
ok("낀 스킬에 카드가 있으면 그 버튼은 소진, 안 낀 스킬은 장착", /→ Lv/.test(skill.label["passive:단단한 앞니"] ?? "") && /^장착$/.test(skill.label["linkB:번개 결속"] ?? ""), JSON.stringify(skill.label).slice(0, 220));
ok("카드가 있으면 접혀 있어도 꼬리표로 보인다 · 점선 테두리 없음", skill.badge && !skill.dashed);
ok("시전 칸 다섯이 한 줄 · 넘치지 않음", (await rowsOf(".hero-skill-combo .combo-step")) === 1 && await page.evaluate(() => { const c = document.querySelector(".hero-skill-combo"); return c.scrollWidth <= c.clientWidth + 1; }));
await page.evaluate(() => { const c = [...document.querySelectorAll(".skill-learn-card")].find((x) => x.querySelector(".skill-icon-steel")); c?.click(); }); await sleep(300);
const openBtns = await page.evaluate(() => [...document.querySelectorAll(".skill-learn-card.is-open .skill-card-actions button")].filter((b) => b.getClientRects().length > 0).map((b) => b.textContent.trim()));
ok("펼치면 해제 · 강화 · 소진이 다 보인다", openBtns.length === 3 && /해제/.test(openBtns[0]), openBtns.join(" / "));

// ── 동료 ──
await click(".titans-bottom-nav button", "동료"); await sleep(700);
const ally = await page.evaluate(() => {
  const cards = [...document.querySelectorAll(".ally-roster-grid .ally-card:not(.is-open)")];
  const panel = document.querySelector(".party-panel");
  const tools = [...panel.querySelectorAll(".recommend-party, .bulk-toggle button")].filter((b) => b.getClientRects().length > 0);
  return {
    n: cards.length,
    btns: cards.map((c) => [...c.querySelectorAll(".ally-card-actions button")].filter((b) => b.getClientRects().length > 0).length),
    toolRows: new Set(tools.map((b) => Math.round(b.getBoundingClientRect().top + b.getBoundingClientRect().height / 2))).size, tools: tools.length,
    bulkOutside: !!document.querySelector(".hub-sheet > .titans-shop > .bulk-toggle"),
    summary: !!document.querySelector(".ally-roster-summary"),
    pager: document.querySelector(".ally-pager > span")?.textContent ?? "", pagerBtns: document.querySelectorAll(".ally-pager button").length,
    clipped: cards.filter((c) => { const s = c.querySelector(":scope > div > strong"); return s && s.scrollWidth > s.clientWidth + 1 && c.classList.contains("in-party"); }).length,
  };
});
ok("편성 · 추천 · 수량이 한 줄 · 따로 된 수량 줄 없음 · 도감 머리줄 없음", ally.tools === 4 && ally.toolRows === 1 && !ally.bulkOutside && !ally.summary, JSON.stringify({ tools: ally.tools, rows: ally.toolRows }));
ok("쪽은 ‹ 1–6 / N명 › 하나 · 한 쪽 6장", ally.pagerBtns === 2 && /^1–6 \/ \d+명/.test(ally.pager) && ally.n === 6, ally.pager);
ok("접힌 동료 카드는 버튼 하나(★ 승급 가능할 때 빼고) · 이름 · Lv 이 안 잘린다", ally.btns.every((b) => b === 1) && ally.clipped === 0, `${ally.btns.join("")} · 잘림 ${ally.clipped}`);
await page.evaluate(() => document.querySelector(".ally-page-next")?.click()); await sleep(300);
ok("다음 쪽으로 넘어간다", /^7–12/.test((await shown(".ally-pager > span"))[0] ?? ""), (await shown(".ally-pager > span"))[0]);

// ── 상점 ──
await click(".titans-bottom-nav button", "상점"); await sleep(700);
const heads = await shown(".hub-sheet-switch button");
ok("상점 머리 5칸(재화 · 패키지 · 뽑기 · 꾸미기 · 이벤트) · 한 줄", heads.join() === "재화,패키지,뽑기,꾸미기,이벤트" && (await rowsOf(".hub-sheet-switch button")) === 1, heads.join());
const subs = {};
for (const g of heads) { await click(".hub-sheet-switch button", g); await sleep(350); subs[g] = (await shown(".shop-sub-tabs button")).join(); }
ok("아래 줄은 뽑기(유물 · 스킬 · 동료 · 상자) · 꾸미기(장비 · 펫 · 탈것 · 칭호 · 외형)에만", subs["재화"] === "" && subs["패키지"] === "" && subs["이벤트"] === "" && subs["뽑기"] === "유물,스킬,동료,상자" && subs["꾸미기"] === "장비,펫,탈것,칭호,외형", JSON.stringify(subs));
await click(".hub-sheet-switch button", "패키지"); await sleep(400);
ok("특별 상품은 패키지 칸 안(칸이 따로 없다)", (await page.evaluate(() => document.querySelectorAll(".event-offer-card").length)) >= 3 && !heads.includes("특별"));
await click(".hub-sheet-switch button", "재화"); await sleep(300);
ok("재화 칸 맨 위 '보석 추천' 줄 없음", !(await page.$(".advice-inline")));
ok("지갑은 이름 없이 그림 + 숫자", (await shown(".hub-sheet-wallet .wallet-text small")).length === 0);
ok("가로 넘침 없음 · 페이지 오류 없음", (await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0 && errors.length === 0, errors.join(" | "));

await browser.close();
for (const [s, n, d] of results) console.log(`${s} ${n}${d ? ` — ${d}` : ""}`);
const fail = results.filter((r) => r[0] === "FAIL").length;
console.log(fail ? `${fail} FAIL` : "ALL PASS");
process.exit(fail ? 1 : 0);
