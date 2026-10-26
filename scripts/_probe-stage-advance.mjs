// 스테이지 진행 재현 — 대장 처치 · 전환 스킵 뒤 스테이지가 넘어가는지 (2026-10-26 사용자: "스킵하면 · 보스 잡아도 다음 스테이지로 안 넘어간다")
//   node scripts/_probe-stage-advance.mjs [skip|noskip] [stage] [area]
import { launchBrowser } from "./launch-browser.mjs";
const MODE = process.argv[2] ?? "skip", START = Number(process.argv[3] ?? 2), AREA = Number(process.argv[4] ?? 3);
const BASE = "http://localhost:5173", H = "mock-local-dev", now = Date.now();
const browser = await launchBrowser({ args: ["--no-sandbox"] }); const page = await browser.newPage(); const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = []; page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
await page.goto(BASE, { waitUntil: "networkidle0" });
const party = ["mia", "leon", "sera", "garen"];
// 실제 QA 배포처럼 test-phase 키 없음
await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); }, { [`dodgebullets:progression:v1:${H}`]: JSON.stringify({ version: 5, level: 20, redGems: 100, idleClaimedAt: now, updatedAt: now, onboardingStep: 4, sessionCount: 9, partyIds: party, partyCap: 4, claimedRewards: ["dodge-tutorial", "welcome-gift", "surprise-gift"], pioneeredArea: AREA, discoverySeeded: true, discovered: [] }), [`dodgebullets:titans:${H}`]: JSON.stringify({ gold: 1000, stage: START, bestStage: START, heroes: Object.fromEntries(party.map((p) => [p, 60])), lastActiveAt: now }), [`dodgebullets:attendance:v1:${H}`]: JSON.stringify({ lastClaimDate: new Date().toLocaleDateString("sv-SE"), totalDays: 3, consecutiveDays: 3 }), "dodge-bullets:soundEnabled": "0" });
await page.reload({ waitUntil: "networkidle0" }); await sleep(1200);
await page.evaluate(() => { for (let k = 0; k < 5; k += 1) { const c = document.querySelector(".idle-claim"); if (c) { c.click(); continue; } const b = [...document.querySelectorAll("button")].filter((x) => !x.closest(".titans-bottom-nav")).find((x) => /^(닫기|확인|나중에)$/.test(x.textContent.trim())); if (b) b.click(); } });
const read = () => page.evaluate((H) => ({ save: JSON.parse(localStorage.getItem(`dodgebullets:titans:${H}`)).stage, head: document.querySelector(".titans-stagebar, .titans-stage-title, .stage-line")?.textContent?.match(/STAGE\s*\d+/)?.[0] ?? (document.body.innerText.match(/STAGE\s*\d+\s*·\s*\d+\/\d+/) ?? [""])[0], phase: document.querySelector(".titans-field")?.className.match(/phase-[\w-]+/)?.[0], boss: !!document.querySelector(".titans-boss-challenge"), skip: !!document.querySelector(".titans-transition-skip") }), H);
const log = [];
let skips = 0;
for (let t = 0; t < 120; t += 1) {
  const r = await read();
  if (r.boss) await page.evaluate(() => document.querySelector(".titans-boss-challenge")?.click());
  if (MODE === "skip" && r.skip) { await page.evaluate(() => document.querySelector(".titans-transition-skip")?.click()); skips += 1; }
  const line = `${t * 0.5}s save=${r.save} head=${r.head} ${r.phase}${r.boss ? " BOSS-BTN" : ""}${r.skip ? " SKIP-BTN" : ""}`;
  if (log[log.length - 1]?.slice(log[log.length - 1].indexOf(" ")) !== line.slice(line.indexOf(" "))) log.push(line);
  await sleep(500);
}
console.log(log.join("\n"));
console.log("skips", skips, "errors", errors.slice(0, 3));
await browser.close();
