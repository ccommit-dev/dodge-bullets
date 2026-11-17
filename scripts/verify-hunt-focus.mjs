/**
 * 사냥 화면 집중 · 그림체 (2026-11-17, /goal ① 화면 구성 · ② 셀 · ③ 도트) — 실제 화면 검사
 *   BASE=http://localhost:5173 node scripts/verify-hunt-focus.mjs   · 캡처: art-gen/out/hunt-focus-<크기>.png · hunt-focus-pixel.png
 * ① 세 폰 크기에서: 전장 ≥ 화면 60% · 위 HUD 띠 ≤ 44px · 성장 판은 닫힌 채 시작해 탭으로 열고 ▾ 로 닫는다 · 주인공 ≥ 예전(66px)의 1.45배 ·
 *    배경 채도 < 1 · 일반 전투엔 발판 고리 · 후광 숨김, 대장(.boss)이면 켜짐 · 가로 넘침 0
 * ② 셀: 시트 · 무기 · 배경이 셀 경로(titans/anim · gear · backgrounds) · 신화/초월 후광은 그림이 아니라 .ally-halo
 * ③ 도트: 설정 '그림체' 줄 · 도트면 html.art-pixel · 시트 anim-px · 무기 gear-px · 배경 backgrounds-px · pixelated · -px 404 없음
 */
import { launchBrowser } from "./launch-browser.mjs";
const BASE = process.env.BASE ?? "http://localhost:5173", H = "mock-local-dev", now = Date.now();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = []; const ok = (n, c, d = "") => results.push([c ? "PASS" : "FAIL", n, d]);
const browser = await launchBrowser({ args: ["--no-sandbox", "--disable-gpu"] });
const page = await browser.newPage();
const errors = []; page.on("pageerror", (e) => errors.push(String(e.message).slice(0, 200)));
const missing = []; page.on("response", (r) => { if (r.status() >= 400 && /-px\//.test(r.url())) missing.push(r.url().split("/").slice(-3).join("/")); });
const seed = async (w, h, extra = {}) => {
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const progress = { version: 5, onboardingStep: 4, level: 40, redGems: 2000, sharedCoins: 500000, enhancementMaterials: 50, titanBestStage: 40, pioneeredArea: 5, idleClaimedAt: now, updatedAt: now,
    partyIds: ["garen", "ari", "luna", "celes"], partyCap: 4, sessionCount: 9, claimedRewards: ["dodge-tutorial", "welcome-gift"], equippedWeaponKind: "sword", equippedWeaponLevel: 8, ownedShoulders: ["scout"], equippedShoulder: "scout" };
  const titans = { stage: 18, bestStage: 40, gold: 2000000, heroes: { garen: 34, ari: 34, luna: 34, celes: 34 }, lastActiveAt: now };
  await page.goto(`${BASE}/favicon.png`, { waitUntil: "domcontentloaded" });
  await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); location.href = "/"; }, {
    [`dodgebullets:progression:v1:${H}`]: JSON.stringify(progress), [`dodgebullets:titans:${H}`]: JSON.stringify(titans), "dodge-bullets:soundEnabled": "0", "dodgebullets:qa-gems": "0", "dodgebullets:test-phase": "0",
    [`dodgebullets:attendance:v1:${H}`]: JSON.stringify({ lastClaimDate: new Date().toLocaleDateString("sv-SE"), totalDays: 3, consecutiveDays: 3 }), ...extra }).catch(() => {});
  await page.waitForNavigation({ waitUntil: "networkidle0", timeout: 60000 }).catch(() => {});
  await sleep(2000);
  for (let k = 0; k < 4; k += 1) { await page.evaluate(() => { document.querySelector(".idle-claim")?.click(); [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "확인")?.click(); }); await sleep(300); }
  await sleep(6000);
};
const measure = () => page.evaluate(() => {
  const r = (s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return { y: b.top, h: b.height, w: b.width, bottom: b.bottom }; };
  const hp = r(".titans-field > .titans-hp"), stage = r(".titans-field > .titans-stagebar"), field = r(".titans-field");
  const shop = document.querySelector(".hub-inline > .titans-shop");
  const bg = document.querySelector(".titans-field > .titans-background");
  const auras = [...document.querySelectorAll(".titans-allies .ally-tier-aura")].map((i) => getComputedStyle(i).display !== "none");
  const halos = [...document.querySelectorAll(".titans-allies .ally-halo")].map((i) => getComputedStyle(i).display !== "none");
  return { vh: innerHeight, field, hp, stage, band: hp && stage ? Math.max(hp.bottom, stage.bottom) - Math.min(hp.y, stage.y) : 999,
    shopVisible: shop ? getComputedStyle(shop).visibility === "visible" : null, hero: r(".titans-hero .equipped-character"), heroSize: document.querySelector(".titans-hero .equipped-character")?.offsetWidth ?? 0,   // 레이아웃 폭 — 원근 배율(scale)은 빠진다
    bgFilter: bg ? getComputedStyle(bg).filter : "", auras, halos, over: document.documentElement.scrollWidth - innerWidth };
});

// ── ① 세 폰 크기 ──
for (const [w, h] of [[390, 844], [375, 667], [360, 640]]) {
  await seed(w, h);
  const m = await measure();
  const tag = `${w}×${h}`;
  ok(`[${tag}] 전장 ≥ 화면 60%`, !!m.field && m.field.h / m.vh >= 0.6, `${Math.round(m.field?.h ?? 0)}px / ${m.vh} = ${Math.round(((m.field?.h ?? 0) / m.vh) * 100)}%`);
  ok(`[${tag}] 위 HUD 띠 ≤ 44px`, m.band <= 44, `${Math.round(m.band)}px`);
  ok(`[${tag}] 성장 판은 닫힌 채 시작`, m.shopVisible === false, String(m.shopVisible));
  // 주인공 크기는 변수로 잰다 — 그린 상자는 원근(뒷줄일수록 작게, anim-plus.css)이 곱해져 6% 까지 작다
  ok(`[${tag}] 주인공 ≥ 예전(66px)의 1.45배`, m.heroSize >= 66 * 1.45 - 1, `레이아웃 폭 ${m.heroSize}px · 그린 폭 ${Math.round(m.hero?.w ?? 0)}px`);
  ok(`[${tag}] 배경 채도 · 대비 낮춤`, /saturate\(0\.[0-9]+\)/.test(m.bgFilter) && /contrast\(0\.[0-9]+\)/.test(m.bgFilter), m.bgFilter);
  ok(`[${tag}] 일반 전투엔 발판 고리 · 후광 숨김`, m.auras.length > 0 && m.auras.every((v) => !v) && m.halos.every((v) => !v), JSON.stringify({ a: m.auras, h: m.halos }));
  ok(`[${tag}] 가로 넘침 없음`, m.over <= 0, String(m.over));
  await page.screenshot({ path: `art-gen/out/hunt-focus-${w}x${h}.png` });
  if (w === 390) {
    await page.evaluate(() => [...document.querySelectorAll(".titans-growth-tabs button")].find((b) => b.textContent.includes("장비 성장"))?.click()); await sleep(600);
    const opened = await measure();
    await page.evaluate(() => document.querySelector(".growth-drawer-close")?.click()); await sleep(600);
    const closed = await measure();
    ok("성장 탭 → 서랍이 올라온다 · ▾ 로 닫힌다", opened.shopVisible === true && closed.shopVisible === false, `${opened.shopVisible} → ${closed.shopVisible}`);
    const boss = await page.evaluate(async () => {
      const f = document.querySelector(".titans-field"); f.classList.add("boss");
      const a = [...document.querySelectorAll(".titans-allies .ally-tier-aura")].map((i) => getComputedStyle(i).display !== "none");
      const h = [...document.querySelectorAll(".titans-allies .ally-halo")].map((i) => ({ on: getComputedStyle(i).display !== "none", el: i.dataset.el }));
      f.classList.remove("boss");
      return { a, h };
    });
    ok("대장전(.boss)이면 발판 고리 · 신화/초월 후광(속성 색)이 켜진다", boss.a.some(Boolean) && boss.h.length >= 1 && boss.h.every((x) => x.on && x.el), JSON.stringify(boss));
  }
}

// ── ② 셀(기본) 경로 ──
const cel = await page.evaluate(() => ({ html: document.documentElement.className, px: document.querySelectorAll("[style*='anim-px'], img[src*='-px/']").length, sheets: document.querySelectorAll("[style*='titans/anim/allies'], [style*='titans/anim/monsters']").length,
  bg: getComputedStyle(document.querySelector(".titans-background")).backgroundImage }));
ok("셀(기본): 도트 경로 없음 · 셀 시트 · 셀 배경", !/art-pixel/.test(cel.html) && cel.px === 0 && cel.sheets > 0 && /titans\/backgrounds\//.test(cel.bg), JSON.stringify(cel));

// ── ③ 도트 ──
await page.evaluate(() => { document.querySelector(".settings-toggle")?.click(); }); await sleep(300);
await page.evaluate(() => { document.querySelector(".settings-more")?.click(); }); await sleep(300);
const row = await page.evaluate(() => document.querySelector(".settings-art-style")?.textContent ?? "");
ok("설정에 '그림체' 줄(지금 셀)", /그림체/.test(row) && /셀/.test(row), row);
await seed(390, 844, { "dodgebullets:art-style": "pixel" });
const px = await page.evaluate(() => {
  const bg = document.querySelector(".titans-background");
  return { html: document.documentElement.className, pxSheets: document.querySelectorAll("[style*='anim-px']").length, celSheets: [...document.querySelectorAll("[style*='titans/anim/']")].filter((e) => !/hero-portrait/.test(e.getAttribute("style"))).length,
    weapon: document.querySelector(".titans-hero .equipment-weapon-alt")?.getAttribute("src") ?? "", bg: getComputedStyle(bg).backgroundImage, render: getComputedStyle(bg).imageRendering,
    allyRender: getComputedStyle(document.querySelector(".titans-allies .titan-ally-art") ?? document.body).imageRendering, row: "" };
});
ok("도트: html.art-pixel · 시트는 anim-px(초상 말고 셀 시트 없음)", /art-pixel/.test(px.html) && px.pxSheets > 0 && px.celSheets === 0, JSON.stringify(px));
ok("도트: 무기 gear-px · 배경 backgrounds-px · pixelated", /gear-px\//.test(px.weapon) && /backgrounds-px\//.test(px.bg) && px.render === "pixelated" && px.allyRender === "pixelated", JSON.stringify({ w: px.weapon, bg: px.bg, r: px.render, a: px.allyRender }));
await page.screenshot({ path: "art-gen/out/hunt-focus-pixel.png" });
ok("도트 그림 404 없음", missing.length === 0, missing.slice(0, 6).join(" | "));
ok("페이지 오류 없음", errors.length === 0, errors.join(" | "));
await browser.close();
for (const [s, n, d] of results) console.log(`${s} ${n}${d ? " — " + d : ""}`);
const fail = results.filter((r) => r[0] === "FAIL").length;
console.log(fail ? `\n${fail} FAIL` : "\nALL PASS");
process.exit(fail ? 1 : 0);
