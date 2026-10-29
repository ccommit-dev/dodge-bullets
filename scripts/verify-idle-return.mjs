/**
 * 귀환 정산 — 받은 것이 보이는가 · 희귀 드랍(유물 조각 · 스킬 카드)이 아이콘과 함께 뜨고 받으면 들어가는가 (2026-10-29)
 *   node scripts/verify-idle-return.mjs   (vite dev 서버 5173 필요) — OUT=<폴더> 면 정산 화면 캡처
 * 사용자 캡처: 정산 화면 가운데가 빈칸이었다 — idle.css 의 칸이 opacity 0 → loot-rise 인데 ui-polish 가 animation: none 이라 0 에 멈췄다.
 * 드랍 개수는 DEV 훅 window.__idleRareForce 로 고정한다(무엇이 나올지는 실제 골드 뽑기 풀에서).
 */
import { launchBrowser } from "./launch-browser.mjs";
const BASE = "http://localhost:5173";
const H = "mock-local-dev";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const ok = (name, cond, detail = "") => results.push([cond ? "PASS" : "FAIL", name, detail]);

const browser = await launchBrowser({ args: ["--no-sandbox", "--disable-gpu"] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e.message).slice(0, 160)));
await page.evaluateOnNewDocument(() => { window.__idleRareForce = { relicShards: 2, skillCards: 1 }; });
const now = Date.now();
const away = 12.5 * 3600 * 1000;
const progress = { version: 5, onboardingStep: 4, level: 30, exp: 90000, redGems: 500, sharedCoins: 1000, enhancementMaterials: 10, titanBestStage: 16, pioneeredArea: 3, idleClaimedAt: now - away, updatedAt: now - away, partyIds: ["mia", "leon"], partyCap: 4, sessionCount: 9, claimedRewards: ["dodge-tutorial", "welcome-gift"] };
const titans = { stage: 16, bestStage: 16, gold: 1000, heroes: { mia: 12, leon: 8 }, skillInventory: { learned: ["strike"], levels: { strike: 1 }, equipped: { starter: "strike" }, skillCores: 0 }, lastActiveAt: now - away };
const prog = () => page.evaluate((h) => JSON.parse(localStorage.getItem(`dodgebullets:progression:v1:${h}`)), H);
const tit = () => page.evaluate((h) => JSON.parse(localStorage.getItem(`dodgebullets:titans:${h}`)), H);

await page.goto(BASE, { waitUntil: "networkidle0" });
// 심기와 reload 를 한 evaluate 로 — 떠 있던 사냥터가 떠나며 옛 저장으로 덮지 않게
await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); location.reload(); }, {
  [`dodgebullets:progression:v1:${H}`]: JSON.stringify(progress),
  [`dodgebullets:titans:${H}`]: JSON.stringify(titans),
  "dodge-bullets:soundEnabled": "0",
  [`dodgebullets:attendance:v1:${H}`]: JSON.stringify({ lastClaimDate: new Date().toLocaleDateString("sv-SE"), totalDays: 3, consecutiveDays: 3 }),
}).catch(() => {});
await page.waitForNavigation({ waitUntil: "networkidle0" }).catch(() => {});
for (let i = 0; i < 40 && !(await page.$(".idle-simple .idle-loot")); i += 1) await sleep(150);
await sleep(1300);   // 숫자 올라가기(0.95초) 끝

const m = await page.evaluate(() => {
  const arts = [...document.querySelectorAll(".idle-simple .idle-loot article")];
  return {
    modal: !!document.querySelector(".idle-simple"),
    rows: arts.map((a) => ({ text: a.textContent.trim(), opacity: getComputedStyle(a).opacity, rare: a.classList.contains("is-rare"), drop: a.dataset.drop ?? "", icon: !!a.querySelector("img, svg, .currency-icon"), h: a.getBoundingClientRect().height })),
  };
});
const visible = m.rows.filter((r) => Number(r.opacity) > 0.9 && r.h > 20);
const goldRow = m.rows.find((r) => /골드/.test(r.text));
ok("정산 화면이 뜬다", m.modal);
ok("받은 것 칸이 모두 보인다(opacity 1 · 높이) — 사용자 캡처의 빈칸", m.rows.length >= 3 && visible.length === m.rows.length, m.rows.map((r) => `${r.text.replace(/\s+/g, " ")}@${r.opacity}`).join(" | "));
ok("골드 · 경험치 · 강화석 칸에 숫자", !!goldRow && /\d/.test(goldRow.text) && m.rows.some((r) => /경험치/.test(r.text)) && m.rows.some((r) => /강화석/.test(r.text)), goldRow?.text);
const relicRows = m.rows.filter((r) => r.drop.startsWith("relic-"));
const skillRows = m.rows.filter((r) => r.drop.startsWith("skill-"));
const relicCount = relicRows.reduce((a, r) => a + Number((r.text.match(/×(\d+)/) ?? [0, 0])[1]), 0);
ok("희귀 드랍 유물 조각 2개 — 아이콘 · 이름 '… 조각' · 보라 칸", relicCount === 2 && relicRows.every((r) => r.rare && r.icon && /조각$/.test(r.text)), relicRows.map((r) => r.text).join(" · "));
ok("희귀 드랍 스킬 카드 1장 — 아이콘 · 이름 '… 카드'", skillRows.length === 1 && skillRows[0].icon && /카드$/.test(skillRows[0].text), skillRows.map((r) => r.text).join(" · "));
if (process.env.OUT) await page.screenshot({ path: `${process.env.OUT}/idle-return.png` });

const before = { spare: Object.values((await prog()).relicSpare ?? {}).reduce((a, n) => a + n, 0), copies: Object.values((await tit()).skillInventory?.copies ?? {}).reduce((a, n) => a + n, 0) };
await page.evaluate(() => document.querySelector(".idle-claim")?.click());
let after = before;
for (let i = 0; i < 40; i += 1) {
  await sleep(150);
  after = { spare: Object.values((await prog()).relicSpare ?? {}).reduce((a, n) => a + n, 0), copies: Object.values((await tit()).skillInventory?.copies ?? {}).reduce((a, n) => a + n, 0) };
  if (after.spare === before.spare + 2 && after.copies === before.copies + 1) break;
}
ok("받으면 유물 조각은 남은 조각(relicSpare)에 +2 · 스킬 카드는 copies 에 +1", after.spare === before.spare + 2 && after.copies === before.copies + 1, `${JSON.stringify(before)} → ${JSON.stringify(after)}`);
ok("정산 화면 닫힘 · 페이지 오류 없음", !(await page.$(".idle-simple")) && errors.length === 0, errors.join(" | "));

await browser.close();
for (const [s, n, d] of results) console.log(`${s} ${n}${d ? ` — ${d}` : ""}`);
const fail = results.filter((r) => r[0] === "FAIL").length;
console.log(fail ? `${fail} FAIL` : "ALL PASS");
process.exit(fail ? 1 : 0);
