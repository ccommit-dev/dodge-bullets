// 파견 · 끝없는 성벽 확인 — 허브 카드 → 파견 화면(자리 · 귀환 수령 · 보내기) / 성벽 출발 카드(바로 시작 안 함 → 등반 시작)   node scripts/_shoot-dispatch-tower.mjs <outDir> [tag]
import { launchBrowser } from "./launch-browser.mjs";
const OUT = process.argv[2], TAG = process.argv[3] ?? "after"; const BASE = "http://localhost:5173", H = "mock-local-dev", now = Date.now();
const browser = await launchBrowser({ args: ["--no-sandbox"] }); const page = await browser.newPage(); const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = []; page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
await page.goto(BASE, { waitUntil: "networkidle0" });
const heroes = { mia: 20, leon: 20, sera: 15, garen: 12, ari: 5, pyro: 8 };
const seed = async (tickets = 3) => {
  await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); }, { [`dodgebullets:progression:v1:${H}`]: JSON.stringify({ version: 5, level: 25, redGems: 100, idleClaimedAt: now, updatedAt: now, onboardingStep: 4, sessionCount: 9, partyIds: ["mia", "leon"], partyCap: 4, claimedRewards: ["dodge-tutorial"], pioneeredArea: 3, towerOpen: true, towerTickets: tickets, towerTicketDate: new Date().toLocaleDateString("sv-SE"), towerBestFloor: 12, dodgeBestStage: 12, expeditions: [{ allyId: "garen", endsAt: now - 1000, hours: 4 }], discoverySeeded: true, discovered: [] }), [`dodgebullets:titans:${H}`]: JSON.stringify({ gold: 1000, stage: 8, bestStage: 8, heroes, lastActiveAt: now }), [`dodgebullets:attendance:v1:${H}`]: JSON.stringify({ lastClaimDate: new Date().toLocaleDateString("sv-SE"), totalDays: 3, consecutiveDays: 3 }), "dodge-bullets:soundEnabled": "0" });
  await page.reload({ waitUntil: "networkidle0" }); await sleep(1200);
  await page.evaluate(() => { for (let k = 0; k < 5; k += 1) { const c = document.querySelector(".idle-claim"); if (c) { c.click(); continue; } const b = [...document.querySelectorAll("button")].filter((x) => !x.closest(".titans-bottom-nav")).find((x) => /^(닫기|확인|나중에)$/.test(x.textContent.trim())); if (b) b.click(); } });
};
const clickText = (sel, text) => page.evaluate(({ sel, text }) => { const el = [...document.querySelectorAll(sel)].find((b) => b.textContent.trim().includes(text)); el?.click(); return !!el; }, { sel, text });
let ok = 0, fail = 0; const check = (n, c, d = "") => { console.log(`${c ? "PASS" : "FAIL"} ${n}${d ? " — " + d : ""}`); c ? ok++ : fail++; };
await seed();
await clickText(".titans-bottom-nav button", "모험"); await sleep(600);
await page.evaluate(() => document.querySelector('.hub-card[data-card="expedition"]')?.click()); await sleep(800);
if (OUT) await page.screenshot({ path: `${OUT}/dt-${TAG}-expedition.png` });
const v = await page.evaluate(() => ({ panel: !!document.querySelector(".expedition-panel"), slots: document.querySelectorAll(".expedition-slot").length, done: document.querySelectorAll(".expedition-slot.done").length, claim: document.querySelector(".expedition-panel .expedition-claim")?.textContent.trim(), bench: [...document.querySelectorAll(".expedition-ally")].map((a) => a.dataset.ally), hours: document.querySelectorAll(".expedition-ally .expedition-hours button").length }));
check("허브 파견 카드 → 파견 화면", v.panel, JSON.stringify(v));
check("자리 2칸 · 귀환 1칸 표시", v.slots === 2 && v.done === 1);
check("귀환 수령 단추", /1건 귀환/.test(v.claim ?? ""));
check("벤치 동료만 목록(출전·파견 중 제외)", v.bench.length === 3 && !v.bench.includes("mia") && !v.bench.includes("garen"), v.bench.join(","));
await page.evaluate(() => document.querySelector(".expedition-panel .expedition-claim")?.click()); await sleep(800);
const afterClaim = await page.evaluate(() => ({ done: document.querySelectorAll(".expedition-slot.done").length, empty: document.querySelectorAll(".expedition-slot.empty").length, bench: document.querySelectorAll(".expedition-ally").length }));
check("수령하면 자리가 비고 가렌이 벤치로", afterClaim.done === 0 && afterClaim.empty === 2 && afterClaim.bench === 4, JSON.stringify(afterClaim));
await page.evaluate(() => [...document.querySelectorAll('.expedition-ally[data-ally="sera"] .expedition-hours button')].find((b) => b.textContent.includes("8시간"))?.click()); await sleep(800);
const sent = await page.evaluate(() => ({ slot: [...document.querySelectorAll(".expedition-slot:not(.empty) b")].map((b) => b.textContent), left: document.querySelector(".expedition-slot:not(.empty) .expedition-left")?.textContent }));
check("세라 8시간 보내기 → 자리에 남은 시간", sent.slot.some((t) => t.includes("8시간")) && /7시간 \d+분 남음|8시간 0분 남음/.test(sent.left ?? ""), JSON.stringify(sent));
if (OUT) await page.screenshot({ path: `${OUT}/dt-${TAG}-expedition-sent.png` });
for (const tickets of [3, 0]) {
  await seed(tickets);
  await clickText(".titans-bottom-nav button", "모험"); await sleep(600);
  await page.evaluate(() => document.querySelector('.hub-card[data-card="tower"]')?.click()); await sleep(2500);
  if (OUT) await page.screenshot({ path: `${OUT}/dt-${TAG}-tower-${tickets}.png` });
  const t = await page.evaluate(() => ({ brief: !!document.querySelector(".tower-brief-card"), stats: document.querySelector(".tower-brief-stats")?.innerText.replace(/\s+/g, " "), playing: /WAVE \d/.test(document.body.innerText), startDisabled: [...document.querySelectorAll(".tower-brief-card .cta")].find((b) => b.textContent.includes("등반 시작"))?.disabled }));
  check(`성벽(등반권 ${tickets}) → 출발 카드 · 바로 시작 안 함`, t.brief && !t.playing, JSON.stringify(t));
  check(`등반 시작 단추 ${tickets ? "켜짐" : "꺼짐"}`, t.startDisabled === (tickets === 0));
  if (tickets) {
    await clickText(".tower-brief-card .cta", "등반 시작"); await sleep(2500);
    const run = await page.evaluate(() => ({ brief: !!document.querySelector(".tower-brief-card"), text: document.body.innerText.slice(0, 160).replace(/\s+/g, " ") }));
    check("등반 시작 → 성벽 1층", !run.brief && /성벽 1층|1F/.test(run.text), run.text);
  } else {
    await clickText(".tower-brief-card .cta", "성문 메뉴 보기"); await sleep(500);
    check("성문 메뉴 보기 → 카드 닫힘", !(await page.$(".tower-brief-card")));
  }
}
check("페이지 오류 없음", errors.length === 0, errors.slice(0, 2).join(" / "));
console.log(fail ? `${fail} FAIL` : "ALL PASS");
await browser.close(); process.exit(fail ? 1 : 0);
