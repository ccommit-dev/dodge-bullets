/**
 * 가독성 스캔 (2026-10-21, 사용자: "UI가 너무 가독성도 안좋고 조잡함 — 단순 가독성 신경써서 수정").
 *   node scripts/scan-readability.mjs [outDir] [w h]   (vite 5173)
 * 화면마다 캡처 + 잰다:
 *   small  — 보이는 글자 중 11px 미만(전장 안 전투 그림 · 피해 숫자 제외)
 *   faint  — 글자색과 가장 가까운 단색 배경의 대비가 4.5 미만(18px 이상 굵은 글은 3.0). 그라데이션 · 그림 배경은 못 재서 뺀다
 *   boxes  — 테두리 있는 상자 안에 또 테두리 상자(2단 이상 겹친 판) — "조잡"의 큰 원인
 * 결과 readability.json · 합계. 문턱: 11px 미만 글자 0(의도한 0px 점 배지 제외) · 대비 부족 0 — 넘으면 exit 1 (verify-all).
 * 2026-10-21 정리 전 기준: 작은 글 463 · 흐린 글 85 · 겹친 판 144 → 정리 후 0 · 0 · ~110(카드가 시트 안에 있는 정상 겹침 포함)
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { launchBrowser } from "./launch-browser.mjs";
const OUT = process.argv[2] ?? join(tmpdir(), "scan-readability"); mkdirSync(OUT, { recursive: true });
const W = Number(process.argv[3] ?? 390), HH = Number(process.argv[4] ?? 844);
const BASE = "http://localhost:5173", H = "mock-local-dev", now = Date.now();
const browser = await launchBrowser({ args: ["--no-sandbox"] }); const page = await browser.newPage(); const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = []; page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
await page.setViewport({ width: W, height: HH, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.goto(BASE, { waitUntil: "networkidle0" });
const progress = { version: 5, level: 40, sharedCoins: 1500000, redGems: 1000, enhancementMaterials: 2300, expeditionSeals: 92, dodgeBestStage: 12, idleClaimedAt: now, updatedAt: now, onboardingStep: 4, sessionCount: 9, partyIds: ["mia", "leon", "sera", "garen"], partyCap: 4, claimedRewards: ["dodge-tutorial"], pioneeredArea: 3, equippedWeaponLevel: 5, allyShards: { mia: 446, leon: 444 } };
const titans = { gold: 5000000, stage: 18, bestStage: 18, heroes: { mia: 14, leon: 2, sera: 1, garen: 3 }, lastActiveAt: now };
await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); location.reload(); }, { [`dodgebullets:progression:v1:${H}`]: JSON.stringify(progress), [`dodgebullets:titans:${H}`]: JSON.stringify(titans), "dodge-bullets:soundEnabled": "0", "dodgebullets:test-phase": "0" });
await page.waitForNavigation({ waitUntil: "networkidle0" }).catch(() => {}); await sleep(2200);
const closeModals = () => page.evaluate(() => { for (let k = 0; k < 5; k += 1) { const c = document.querySelector(".idle-claim"); if (c) { c.click(); continue; } const b = [...document.querySelectorAll("button")].filter((x) => !x.closest(".titans-bottom-nav, .hub-sheet")).find((x) => /^(닫기|확인|나중에)$/.test(x.textContent.trim())); if (b) b.click(); } });
const clickText = (sel, re) => page.evaluate((sel, src) => { const b = [...document.querySelectorAll(sel)].find((x) => new RegExp(src).test(x.textContent.trim())); b?.click(); return !!b; }, sel, re);
await closeModals(); await sleep(500);

const MEASURE = (minPx) => {
  const vw = innerWidth, vh = innerHeight;
  const visible = (el) => { const cs = getComputedStyle(el); if (cs.display === "none" || cs.visibility === "hidden" || +cs.opacity < 0.05) return false; const r = el.getBoundingClientRect(); return r.width > 1 && r.height > 1 && r.bottom > 0 && r.top < vh && r.right > 0 && r.left < vw; };
  const lum = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const [r, g, b, a = 1] = m[1].split(",").map((x) => parseFloat(x)); const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return { L: 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b), a }; };
  // 배경: 단색은 그대로, 그라데이션은 불투명한 색 멈춤들의 평균 밝기(그림 url 배경은 못 재서 뺀다)
  const bgOf = (el) => {
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.backgroundImage !== "none") {
        if (cs.backgroundImage.includes("url(")) return null;
        const cols = [...cs.backgroundImage.matchAll(/rgba?\([^)]+\)/g)].map((m) => lum(m[0])).filter((c) => c && c.a >= 0.85);
        if (cols.length) return cols.reduce((a, c) => a + c.L, 0) / cols.length;
      }
      const l = lum(cs.backgroundColor); if (l && l.a >= 0.85) return l.L;
    }
    return null;
  };
  const small = [], faint = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let t = walker.nextNode(); t; t = walker.nextNode()) {
    const txt = t.textContent.trim(); const el = t.parentElement; if (!txt || !el || !visible(el)) continue;
    if (el.closest(".titans-field .titans-float, .titans-field .titans-fx, .skill-shot, canvas, [aria-hidden=true], .sr-only")) continue;
    const r = el.getBoundingClientRect(); if (r.width <= 2 || r.height <= 2) continue;
    const cs = getComputedStyle(el); const fs = parseFloat(cs.fontSize);
    const gp = (n) => { for (let q = n, d = 0; q && d < 4; q = q.parentElement, d += 1) { const c = q.className?.toString().split(" ")[0]; if (c) return c; } return "-"; };
    const owner = el.className.toString().split(" ")[0] || gp(el.parentElement) + ">" + el.tagName.toLowerCase();
    const tag = `${el.tagName.toLowerCase()}.${owner} "${txt.slice(0, 14)}"`;
    if (fs < minPx) small.push(`${fs}px ${tag}`);
    const clipText = /text/.test(cs.webkitBackgroundClip || cs.backgroundClip || "");   // 글자에 그라데이션을 칠한 제목은 배경 비교가 의미 없다
    const fg = clipText ? null : lum(cs.color); const bg = bgOf(el);
    if (fg && bg !== null) { const hi = Math.max(fg.L, bg), lo = Math.min(fg.L, bg); const ratio = (hi + 0.05) / (lo + 0.05); const need = fs >= 18 || (fs >= 14 && +cs.fontWeight >= 700) ? 3 : 4.5; if (ratio < need) faint.push(`${ratio.toFixed(1)} ${tag}`); }
  }
  let boxes = 0; const boxSamples = [], boxAllList = [];
  for (const el of document.querySelectorAll("body *")) {
    if (!visible(el) || el.closest(".titans-field")) continue;
    const cs = getComputedStyle(el); const bw = parseFloat(cs.borderTopWidth); if (bw < 1 || cs.borderTopStyle === "none") continue;
    if (el.matches("button, input, select, img")) continue;
    let p = el.parentElement, depth = 0;
    while (p && depth < 3) { const pc = getComputedStyle(p); if (parseFloat(pc.borderTopWidth) >= 1 && pc.borderTopStyle !== "none" && !p.matches("button")) { boxes += 1; boxAllList.push(`${el.className.toString().split(" ")[0]} ⊂ ${p.className.toString().split(" ")[0]}`); if (boxSamples.length < 6) boxSamples.push(`${el.className.toString().split(" ")[0]} ⊂ ${p.className.toString().split(" ")[0]}`); break; } p = p.parentElement; depth += 1; }
  }
  return { small: small.length, faint: faint.length, boxes, smallS: [...new Set(small)].slice(0, 6), faintS: [...new Set(faint)].slice(0, 6), boxS: boxSamples, smallAll: small, faintAll: faint, boxAll: boxAllList };
};
const rows = [];
const shot = async (name) => { await sleep(350); await page.screenshot({ path: `${OUT}/${name}.png` }); const m = await page.evaluate(MEASURE, Number(process.env.READ_MIN) || 13); rows.push({ name, ...m }); };
const nav = (t) => clickText(".titans-bottom-nav button", t);
const sheetClose = () => page.evaluate(() => document.querySelector(".hub-sheet-close")?.click());

await shot("01-hunt");
await clickText(".titans-growth-tabs button", "장비"); await shot("02-growth");
await clickText(".titans-growth-tabs button", "스킬"); await shot("03-skills");
await nav("동료"); await sleep(600); await shot("04-allies");
await clickText(".hub-sheet-switch button", "뽑기"); await sleep(500); await shot("05-gacha");
await sheetClose(); await sleep(300);
await nav("상점"); await sleep(600); await shot("06-shop");
await clickText(".hub-sheet-switch button", "이벤트"); await shot("07-shop-event");
await clickText(".hub-sheet-switch button", "특별"); await shot("08-shop-special");
await sheetClose(); await sleep(300);
await nav("모험"); await sleep(600); await shot("09-adventure");
await clickText(".hub-cards > button, .nav-popup-grid button", "방어"); await sleep(1800); await closeModals(); await shot("10-dam-play");
await clickText(".exp-menu-tabs button", "정비"); await shot("11-dam-skill");
await clickText(".exp-sub-tabs button", "^칩"); await shot("12-dam-chips");
await clickText(".exp-sub-tabs button", "보급"); await shot("13-dam-supply");
await clickText(".game-overlay button, .sound-dock button", "사냥터로"); await sleep(1200); await closeModals();
await nav("모험"); await sleep(600);
await clickText(".hub-cards > button, .nav-popup-grid button", "대장간"); await sleep(1500); await shot("14-forge");
await page.evaluate(() => document.querySelector(".forge-back, .forge-layer .character-back, .forge-layer button[aria-label*='사냥']")?.click()); await sleep(900); await closeModals();
await page.evaluate(() => document.querySelector(".titans-back")?.click()); await sleep(1500); await shot("15-mypage");
// ── 2부 (2026-10-21 보완): 대장간 탭 · 이벤트 센터 탭 · 비트 수련 메뉴 · 성문 방어 전투 HUD ──
const fresh = async () => { await page.goto(BASE, { waitUntil: "networkidle0" }); await sleep(2200); await closeModals(); await sleep(400); };
await fresh(); await nav("모험"); await sleep(600);
await clickText(".hub-cards > button, .hub-card, .nav-popup-grid button", "대장간"); await sleep(1800);
for (const t of ["조합소", "보호구", "원정 무기", "장비"]) { if (await page.evaluate((t) => { const b = [...document.querySelectorAll(".forge-tabs button")].find((x) => x.textContent.trim() === t); b?.click(); return !!b; }, t)) { await sleep(400); await shot(`16-forge-${t}`); } }
await fresh(); await nav("모험"); await sleep(600);
if (await page.evaluate(() => { const b = document.querySelector(".season-nav"); b?.click(); return !!b; })) { await sleep(900); await shot("17-events"); for (const t of ["주간 도전", "원정 일지", "토벌령", "차원 균열"]) { if (await page.evaluate((t) => { const b = [...document.querySelectorAll(".event-tabs button")].find((x) => x.textContent.includes(t)); b?.click(); return !!b; }, t)) { await sleep(500); await shot(`17-events-${t}`); } } }
await fresh(); await nav("모험"); await sleep(600);
if (await clickText(".hub-cards > button, .hub-card", "비트 수련")) { await sleep(2200); await closeModals(); await shot("18-beat-menu"); }
await fresh(); await nav("모험"); await sleep(600);
if (await clickText(".hub-cards > button, .hub-card, .nav-popup-grid button", "방어")) { await sleep(1800); await closeModals(); await clickText(".exp-menu-content .cta", "시작"); await sleep(1500); await clickText(".intro-start, .cta.intro-cta, .overlay-content .cta", ""); await sleep(3000); await shot("19-dodge-hud"); }
writeFileSync(`${OUT}/readability.json`, JSON.stringify(rows, null, 1));
for (const r of rows) console.log(`${r.name.padEnd(16)} 작은글 ${String(r.small).padStart(3)} · 흐린글 ${String(r.faint).padStart(3)} · 겹친판 ${String(r.boxes).padStart(3)}  ${r.smallS.slice(0, 2).join(" | ")} ${r.faintS.slice(0, 2).join(" | ")}`);
const sum = (k) => rows.reduce((a, r) => a + r[k], 0);
console.log(`합계 작은글 ${sum("small")} · 흐린글 ${sum("faint")} · 겹친판 ${sum("boxes")} · 오류 ${errors.length}`);
await browser.close();
const bad = rows.flatMap((r) => r.smallAll.filter((x) => !/^0px /.test(x)).map((x) => `${r.name} 작은글 ${x}`).concat(r.faintAll.map((x) => `${r.name} 흐린글 ${x}`)));
console.log(bad.length ? `FAIL 가독성 ${bad.length}건 — ${bad.slice(0, 6).join(" | ")}` : `PASS 가독성 — ${Number(process.env.READ_MIN) || 13}px 미만 글자 0 · 대비 부족 0`);
process.exit(bad.length ? 1 : 0);
