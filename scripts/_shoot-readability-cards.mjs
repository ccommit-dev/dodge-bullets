// 글 많은 카드 화면 캡처 — 장비 성장 · 상점 · 유물 · 퀘스트 (2026-10-26 사용자: "글이 너무 길고 제목과 설명 음영처리를 다르게")
//   node scripts/_shoot-readability-cards.mjs <outDir> [tag]   (vite 5173 · 아이폰 크기 390×664)
// 카드마다 제목 · 설명 · 효과 글자의 색 · 크기 · 굵기와 줄 수를 찍는다 — 제목과 설명이 같은 음영이면 "SAME" 으로 표시
import { launchBrowser } from "./launch-browser.mjs";
const OUT = process.argv[2], TAG = process.argv[3] ?? "now";
const BASE = "http://localhost:5173", H = "mock-local-dev", now = Date.now(), today = new Date().toLocaleDateString("sv-SE");
const browser = await launchBrowser({ args: ["--no-sandbox"] }); const page = await browser.newPage(); const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = []; page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));
await page.setViewport({ width: 390, height: 664, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.goto(BASE, { waitUntil: "networkidle0" });
const party = ["mia", "leon", "luna", "bolt"];
await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); }, {
  [`dodgebullets:progression:v1:${H}`]: JSON.stringify({ version: 5, level: 30, redGems: 2255, sharedCoins: 1000000, idleClaimedAt: now, updatedAt: now, onboardingStep: 4, sessionCount: 9, partyIds: party, partyCap: 4, claimedRewards: ["dodge-tutorial", "welcome-gift", "surprise-gift"], pioneeredArea: 3, discoverySeeded: true, discovered: [], titanBestStage: 30, rebirthCount: 1, relics: { "ember-ring": 2 } }),
  [`dodgebullets:titans:${H}`]: JSON.stringify({ gold: 50000, stage: 20, bestStage: 30, heroes: Object.fromEntries(party.map((p) => [p, 20])), lastActiveAt: now, quests: { levels: [12, 6, 3, 0, 0, 0, 0, 0], prog: [0, 0, 0, 0, 0, 0, 0, 0] } }),
  [`dodgebullets:attendance:v1:${H}`]: JSON.stringify({ lastClaimDate: today, totalDays: 3, consecutiveDays: 3 }), "dodge-bullets:soundEnabled": "0", "dodgebullets:inapp-fs-hint": "1",
});
await page.reload({ waitUntil: "networkidle0" }); await sleep(1500);
const close = () => page.evaluate(() => { for (let k = 0; k < 5; k += 1) { const c = document.querySelector(".idle-claim"); if (c) { c.click(); continue; } const b = [...document.querySelectorAll("button")].filter((x) => !x.closest(".titans-bottom-nav")).find((x) => /^(닫기|확인|나중에)$/.test(x.textContent.trim())); if (b) b.click(); } });
await close();
const clickText = (sel, re) => page.evaluate(({ sel, re }) => { const el = [...document.querySelectorAll(sel)].find((b) => new RegExp(re).test(b.textContent.trim())); el?.click(); return !!el; }, { sel, re });
const style = (cardSel, parts) => page.evaluate(({ cardSel, parts }) => {
  const card = document.querySelector(cardSel); if (!card) return null;
  const out = {};
  for (const [k, sel] of Object.entries(parts)) {
    const el = card.querySelector(sel); if (!el) { out[k] = null; continue; }
    const cs = getComputedStyle(el); const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.3;
    out[k] = { color: cs.color, size: cs.fontSize, weight: cs.fontWeight, lines: Math.round(el.getBoundingClientRect().height / lh), text: el.textContent.trim().slice(0, 40) };
  }
  if (out.title && out.desc) out.same = out.title.color === out.desc.color && out.title.weight === out.desc.weight ? "SAME" : "diff";
  return out;
}, { cardSel, parts });
const shot = (name) => OUT ? page.screenshot({ path: `${OUT}/rd-${TAG}-${name}.png` }) : null;

// 1. 장비 성장
await clickText(".titans-growth-tabs button", "장비 성장"); await sleep(600);
await page.evaluate(() => document.querySelector(".equipment-training-card")?.scrollIntoView({ block: "start" })); await sleep(300);
await shot("gear");
console.log("gear", JSON.stringify(await style(".lightning-card", { title: "strong", desc: "p" })));
// 2. 퀘스트 (도토리 자리)
const tabs = await page.evaluate(() => [...document.querySelectorAll(".titans-growth-tabs button")].map((b) => b.textContent.trim()).filter(Boolean));
console.log("growth tabs", JSON.stringify(tabs));
await clickText(".titans-growth-tabs button", "^퀘스트"); await sleep(700);
await page.evaluate(() => document.querySelector(".quest-panel")?.scrollIntoView({ block: "start" })); await sleep(300);
await shot("quest");
console.log("quest", JSON.stringify(await style(".quest-panel li, .quest-panel .quest-main", { title: "b, strong", desc: "small, .quest-next" })));
// 3. 상점
await clickText(".titans-bottom-nav button", "상점"); await sleep(900);
await clickText(".premium-category-tabs button, button", "^패키지$"); await sleep(600);
await page.evaluate(() => [...document.querySelectorAll(".premium-product-card")].find((c) => /광고 제거/.test(c.textContent))?.scrollIntoView({ block: "start" })); await sleep(300);
await shot("shop");
console.log("shop", JSON.stringify(await style(".premium-product-card", { title: "strong", desc: "p", lines: "small i, small" })));
const shopLines = await page.evaluate(() => [...document.querySelectorAll(".premium-product-card")].map((c) => { const t = c.querySelector("div")?.textContent.trim() ?? ""; return `${t.length}자 ${t.slice(0, 18)}`; }).slice(0, 12));
console.log("shop text length", JSON.stringify(shopLines));
await page.evaluate(() => document.querySelector(".hub-sheet-close")?.click()); await sleep(400);
// 4. 마이페이지 유물
await page.evaluate(() => document.querySelector(".titans-back")?.click()); for (let i = 0; i < 30 && !(await page.$(".mp-crystal-tree")); i += 1) await sleep(200);
await clickText("button", "^배지\\s*·\\s*진화$"); await sleep(500);
await page.evaluate(() => document.querySelector(".mp-relics")?.scrollIntoView({ block: "start" })); await sleep(400);
await shot("relic");
console.log("relic", JSON.stringify(await style(".relic-tile", { title: "b", desc: "small", stars: ".relic-stars" })));
console.log("relic header", JSON.stringify(await style(".relic-family header", { title: "b", desc: "small", set: ".relic-set" })));
console.log("errors", errors.slice(0, 3));
await browser.close();
