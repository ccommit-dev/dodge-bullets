/**
 * 사냥터 위 UI 끼리 안 겹친다 — 폰 화면 기준 (2026-11-04, 사용자: "자동사냥이나 다음스테이지 · 오른쪽 하단 퀘스트 ui 팝업 위치 모바일 기준 겹치는 거 없게 · 퀘스트 탭 맨 왼쪽")
 *   node scripts/verify-hud-layout.mjs [캡처 폴더]   (vite dev 서버 5173 필요)
 * 아이폰 카카오톡(390×664 · 전장 ≈ 390px) · SE · 안드로이드 작은 폰 · 긴 폰. 스킬 네 칸 + 알림 + 워밍업. 깊이를 양 끝으로 고정해 머리 · 발이 UI 에 닿는지도 본다.
 */
import { launchBrowser } from "./launch-browser.mjs";
const OUT = process.argv[2], BASE = "http://localhost:5173", H = "mock-local-dev";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = []; const ok = (n, c, d = "") => results.push([c ? "PASS" : "FAIL", n, d]);
const browser = await launchBrowser({ args: ["--no-sandbox", "--disable-gpu"] });
const SCREENS = [["iPhone 카톡", 390, 664], ["iPhone SE", 375, 553], ["안드로이드 작은", 360, 640], ["iPhone 긴", 390, 844], ["Max", 430, 932]];
const PANELS = { hp: ".titans-hp", 판: ".titans-stagebar.in-field", 자동사냥: ".idle-status-strip", 알림: ".battle-alert-stack > .battle-alert", 보스: ".titans-boss-challenge", AUTO: ".battle-qol", 스킵: ".titans-transition-skip", 클리어: ".titans-clear-banner" };
const ALLOWED = new Set(["hp×", "판×보스", "판×스킵", "판×워밍업"]);   // 판 안에 두는 단추
const probe = (panels) => {
  const field = document.querySelector(".titans-field"); if (!field) return null;
  const boxOf = (e) => { if (!e || !e.getClientRects().length) return null; const r = e.getBoundingClientRect(); return r.width < 2 || r.height < 2 || getComputedStyle(e).visibility === "hidden" ? null : { l: r.left, r: r.right, t: r.top, b: r.bottom }; };
  const boxes = {};
  for (const [k, s] of Object.entries(panels)) { const b = boxOf([...document.querySelectorAll(s)].find((e) => e.getClientRects().length)); if (b) boxes[k] = b; }
  document.querySelectorAll(".titans-skill-dock .titans-skill").forEach((e, i) => { const b = boxOf(e); if (b) boxes[`스킬${i + 1}`] = b; });
  const warm = boxOf(document.querySelector(".warmup-chip")); if (warm) boxes.워밍업 = warm;
  const overlap = (a, b) => Math.min(a.r, b.r) - Math.max(a.l, b.l) > 1 && Math.min(a.b, b.b) - Math.max(a.t, b.t) > 1;
  const names = Object.keys(boxes), hits = [];
  for (let i = 0; i < names.length; i += 1) for (let j = i + 1; j < names.length; j += 1) if (overlap(boxes[names[i]], boxes[names[j]])) hits.push(`${names[i]}×${names[j]}`);
  // 몸: 전투 중 알림 · 자동사냥 · 스킬과 — 그린 몸(동료 가운데 45%, 주인공 칸 가운데)
  const bodies = [];
  const hero = document.querySelector(".titans-hero .equipped-character"); if (hero) { const r = hero.getBoundingClientRect(); bodies.push(["주인공", { l: r.left + r.width * 0.2, r: r.left + r.width * 0.72, t: r.top + r.height * 0.58, b: r.bottom }]); }
  document.querySelectorAll(".titan-ally-art .ally-body").forEach((e) => { const r = e.getBoundingClientRect(), w = r.width * 0.45, l = r.left + (r.width - w) / 2; bodies.push(["동료", { l, r: l + w, t: r.top + r.height * 0.12, b: r.top + r.height * 0.87 }]); });
  const combat = field.className.includes("phase-combat") && !field.className.includes("party-entering") && !document.querySelector(".titans-hero.is-approaching");
  const bodyHits = [];
  if (combat) for (const [n, b] of bodies) for (const k of names) { if (k === "hp" || k === "스킵" || k === "클리어" || k === "보스" || k === "판" ) continue; const a = boxes[k]; const ov = Math.min(a.r, b.r) - Math.max(a.l, b.l), ovY = Math.min(a.b, b.b) - Math.max(a.t, b.t); if (ov > 4 && ovY > 4) bodyHits.push(`${n}×${k} ${Math.round(ov)}x${Math.round(ovY)}`); }
  const inField = Object.entries(boxes).filter(([k]) => k !== "클리어").filter(([, b]) => { const f = field.getBoundingClientRect(); return b.r > f.right + 1 || b.l < f.left - 1 || b.b > f.bottom + 1; }).map(([k]) => k);
  return { hits, bodyHits, inField, h: Math.round(field.getBoundingClientRect().height), phase: field.className.split(" ")[1], wide: field.classList.contains("lanes-wide"), names };
};
for (const [name, w, h] of SCREENS) for (const fixed of [0.001, 0.999]) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const errors = []; page.on("pageerror", (e) => errors.push(String(e.message).slice(0, 160)));
  await page.evaluateOnNewDocument((v) => { const real = Math.random; Math.random = () => (document.readyState === "complete" ? v : real()); }, fixed);
  await page.goto(BASE, { waitUntil: "networkidle0" });
  const now = Date.now();
  const progress = { version: 5, onboardingStep: 4, level: 40, redGems: 5000, sharedCoins: 500000, enhancementMaterials: 2000, titanBestStage: 40, pioneeredArea: 5, idleClaimedAt: now, updatedAt: now, partyIds: ["mia", "leon", "sera", "garen"], partyCap: 4, sessionCount: 9, claimedRewards: ["dodge-tutorial", "welcome-gift"], lastSessionAt: now - 3 * 86400000, lastPlayedAt: now - 3 * 86400000 };
  const titans = { stage: 22, bestStage: 40, gold: 2000000, heroes: { mia: 26, leon: 13, sera: 9, garen: 9 }, skillInventory: { learned: ["strike", "crit", "clone", "thunderLink", "meteor"], levels: { strike: 3, crit: 1, clone: 1, thunderLink: 1, meteor: 1 }, equipped: { starter: "strike", linkA: "crit", linkB: "thunderLink", finisher: "meteor" }, skillCores: 30 }, lastActiveAt: now };
  await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); location.reload(); }, {
    [`dodgebullets:progression:v1:${H}`]: JSON.stringify(progress), [`dodgebullets:titans:${H}`]: JSON.stringify(titans), "dodge-bullets:soundEnabled": "0",
    [`dodgebullets:attendance:v1:${H}`]: JSON.stringify({ lastClaimDate: new Date().toLocaleDateString("sv-SE"), totalDays: 3, consecutiveDays: 3 }),
  }).catch(() => {});
  await page.waitForNavigation({ waitUntil: "networkidle0" }).catch(() => {});
  await sleep(1500);
  for (let k = 0; k < 4; k += 1) { await page.evaluate(() => { document.querySelector(".idle-claim")?.click(); [...document.querySelectorAll("button")].filter((x) => !x.closest(".titans-bottom-nav, .titans-header, .titans-field")).find((x) => /^(닫기|확인|나중에)$/.test(x.textContent.trim()))?.click(); }); await sleep(200); }
  const hitAll = new Set(), bodyAll = new Set(), outAll = new Set(), namesAll = new Set(); let sample = null, shot = false;
  for (let i = 0; i < 80; i += 1) {
    const s = await page.evaluate(probe, PANELS);
    if (s) {
      sample = s; s.names.forEach((n) => namesAll.add(n));
      s.hits.filter((x) => !ALLOWED.has(x) && !x.startsWith("hp×판")).forEach((x) => hitAll.add(x)); s.bodyHits.forEach((x) => bodyAll.add(x)); s.inField.forEach((x) => outAll.add(x));
      if (OUT && !shot && s.names.includes("알림") && s.phase === "phase-combat" && fixed < 0.5 && i > 12) { await page.screenshot({ path: `${OUT}/hud-layout-${w}x${h}.png` }); shot = true; }
    }
    await sleep(90);
  }
  const label = `[${name} ${w}×${h} 깊이 ${fixed < 0.5 ? "낮음" : "높음"}]`;
  const wanted = ["자동사냥", "스킬4"].filter((n) => !namesAll.has(n));
  ok(`${label} 스킬 네 칸 · 자동 사냥이 보인다`, wanted.length === 0, wanted.join() || `전장 ${sample?.h}px`);
  ok(`${label} UI 끼리 안 겹친다(판 안 단추 빼고)`, hitAll.size === 0, [...hitAll].slice(0, 6).join(" · "));
  ok(`${label} 교전 중 몸이 알림 · 자동 사냥 · 스킬 · AUTO 와 안 겹친다(4px 넘게)`, bodyAll.size === 0, [...bodyAll].slice(0, 5).join(" · "));
  ok(`${label} UI 가 전장 밖으로 안 나간다`, outAll.size === 0, [...outAll].join(" · "));
  const tn = await page.evaluate(() => { const r = (q) => document.querySelector(q)?.getBoundingClientRect(); const t = r(".titans-growth-tabs"), n = r(".titans-bottom-nav"); return t && n ? Math.round(t.bottom - n.top) : null; });
  ok(`${label} 성장 탭이 하단 메뉴에 안 가린다(스크롤 없이)`, tn !== null && tn <= 2, `${tn}px`);
  ok(`${label} 페이지 오류 없음`, errors.length === 0, errors.join(" | "));
  await page.close();
}
// 퀘스트 탭 맨 왼쪽 · 탭 높이가 버프로 안 밀린다
{
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 664, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.goto(BASE, { waitUntil: "networkidle0" });
  const tabs = await page.evaluate(() => [...document.querySelectorAll(".titans-growth-tabs > button:not(.growth-drawer-close)")].map((b) => b.textContent.trim()));
  ok("성장 탭 맨 왼쪽이 퀘스트", /^퀘스트/.test(tabs[0] ?? "") && tabs.length === 4, tabs.join(" / "));
  await page.close();
}
await browser.close();
for (const [s, n, d] of results) console.log(`${s} ${n}${d ? ` — ${d}` : ""}`);
const fail = results.filter((r) => r[0] === "FAIL").length;
console.log(fail ? `${fail} FAIL` : "ALL PASS");
process.exit(fail ? 1 : 0);
