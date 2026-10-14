/**
 * UI 품질 스캔 (2026-10-14, 사용자: "버튼 ui 안의 텍스트나 숫자 짤림" · "어색한 백그라운드 남색 검은색 배경 삭제").
 *   node scripts/scan-ui-quality.mjs [outDir]   (vite 5173)  → 폰 360×780 · 390×844 · 가로 844×390 에서 주요 화면을 돌며
 *   ① clip: 버튼·알약 안 글자의 실제 글자 상자(Range)가 가장 가까운 잘림 조상(overflow≠visible, 자기 포함)을 1px 넘거나, 말줄임(…)이 걸린 것
 *   ② dark: 화면에 보이는 UI 요소의 배경이 남색·검정(밝기 < 0.2, 불투명 ≥ 0.55) — 전장 그림(.titans-field 안 전투 그림)·캔버스·전체 화면 막(scrim)은 뺀다
 * 글꼴이 다 내려온 뒤(document.fonts.ready) 잰다. 결과 ui-quality.json · 둘 다 0 이면 exit 0.
 */
import { launchBrowser } from "./launch-browser.mjs";
import { mkdirSync, writeFileSync } from "node:fs";

const OUT = process.argv[2] ?? "scan-ui-quality"; mkdirSync(OUT, { recursive: true });
const BASE = "http://localhost:5173", H = "mock-local-dev";
const VIEWPORTS = [[360, 780], [390, 844], [844, 390]];
const browser = await launchBrowser({ args: ["--no-sandbox", "--disable-gpu"] });
const page = await browser.newPage();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clickText = (sel, text) => page.evaluate(({ sel, text }) => { const el = [...document.querySelectorAll(sel)].find((b) => b.textContent.trim().includes(text)); el?.click(); return !!el; }, { sel, text });
const closeModals = () => page.evaluate(() => { for (let k = 0; k < 4; k += 1) { const c = document.querySelector(".idle-claim"); if (c) { c.click(); continue; } const b = [...document.querySelectorAll("button")].filter((x) => /^(닫기|확인|나중에)$/.test(x.textContent.trim()))[0]; if (b) b.click(); } });

const scan = (name) => page.evaluate(async (name) => {
  await document.fonts.ready;
  const vw = innerWidth, vh = innerHeight, out = [];
  const visible = (el) => { const cs = getComputedStyle(el); if (cs.display === "none" || cs.visibility === "hidden" || +cs.opacity === 0) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < vh && r.right > 0 && r.left < vw; };
  const clipBox = (el) => { for (let n = el; n && n !== document.body; n = n.parentElement) { const cs = getComputedStyle(n); if (cs.overflowX !== "visible" || cs.overflowY !== "visible") return { n, r: n.getBoundingClientRect() }; } return null; };
  // ① 버튼·알약 안 글자 잘림
  const seen = new Set();
  for (const btn of document.querySelectorAll("button, [role=button], .wallet-item, .titans-wallet span, .hub-card, .chip, [class*='-chip'], [class*='-pill'], [class*='-badge'], [class*='-tag']")) {
    if (!visible(btn) || btn.closest("canvas")) continue;
    const walker = document.createTreeWalker(btn, NodeFilter.SHOW_TEXT);
    for (let t = walker.nextNode(); t; t = walker.nextNode()) {
      const txt = t.textContent.trim(); if (!txt || !t.parentElement || !visible(t.parentElement)) continue;
      { const pr = t.parentElement.getBoundingClientRect(), pcs0 = getComputedStyle(t.parentElement); if (pr.width <= 2 || pr.height <= 2 || (pcs0.clip && pcs0.clip !== "auto")) continue; }   // 화면 낭독기 전용(1px) 라벨
      const range = document.createRange(); range.selectNodeContents(t);
      const rr = range.getBoundingClientRect(); if (rr.width === 0) continue;
      const cb = clipBox(t.parentElement);
      const pe = t.parentElement, pcs = getComputedStyle(pe);
      const ellipsis = pcs.textOverflow === "ellipsis" && pe.scrollWidth > pe.clientWidth + 1;
      const over = cb ? Math.max(cb.r.left - rr.left, rr.right - cb.r.right, cb.r.top - rr.top - 2, rr.bottom - cb.r.bottom - 2) : 0;
      // 스크롤 영역 밖으로 통째로 나간(스크롤해서 보이는) 글자는 잘림이 아니다 — 상자에 걸쳐 일부만 보일 때만 센다
      const intersects = !cb || (rr.right > cb.r.left + 1 && rr.left < cb.r.right - 1 && rr.bottom > cb.r.top + 1 && rr.top < cb.r.bottom - 1);
      const scrollable = cb && /auto|scroll/.test(getComputedStyle(cb.n).overflowX + getComputedStyle(cb.n).overflowY);
      if (scrollable) continue;   // 스크롤 영역(시트·목록) 경계에 걸친 글자는 스크롤 위치 탓 — 잘림이 아니다
      if (!intersects) continue;
      if (ellipsis || over > 1) {
        const key = `${pe.className}|${txt}`; if (seen.has(key)) continue; seen.add(key);
        out.push({ screen: name, kind: "clip", cls: String(pe.className).slice(0, 60), btn: String(btn.className).slice(0, 40), text: txt.slice(0, 30), over: Math.round(over), ellipsis });
      }
    }
  }
  // ①-b 버튼 글자가 버튼 안쪽(테두리 안)보다 넓어 테두리에 먹히는 것 — overflow:visible 이라 위 검사에 안 걸린다 ("AUTO" → "AUTC")
  for (const btn of document.querySelectorAll("button")) {
    if (!visible(btn)) continue;
    const range = document.createRange();
    const vis = [...btn.querySelectorAll("*")].filter((e) => { const b = e.getBoundingClientRect(), c = getComputedStyle(e); return b.width <= 2 || b.height <= 2 || (c.clip && c.clip !== "auto"); });
    if (vis.length && btn.innerText.trim() && vis.some((e) => e.textContent.trim() === btn.innerText.trim())) continue;   // 글자가 화면 낭독기 전용뿐
    range.selectNodeContents(btn);
    const rr = range.getBoundingClientRect(), br = btn.getBoundingClientRect(), cs = getComputedStyle(btn);
    const bl = parseFloat(cs.borderLeftWidth) || 0, brw = parseFloat(cs.borderRightWidth) || 0;
    const innerL = br.left + bl, innerR = br.right - brw;
    const over = Math.max(innerL - rr.left, rr.right - innerR);
    const txt = btn.innerText.trim().replace(/\s+/g, " ");
    if (txt && rr.width > 0 && over > 0.5 && !seen.has(`btn|${txt}`)) { seen.add(`btn|${txt}`); out.push({ screen: name, kind: "clip", cls: String(btn.className).slice(0, 60), btn: "border", text: txt.slice(0, 30), over: Math.round(over * 10) / 10, ellipsis: false }); }
  }
  // ③ 대비: 글자색과 실제 바탕(위로 올라가며 처음 만나는 불투명 배경) 대비 < 3:1 — 잠금·비활성(흐림 처리)은 뺀다 (2026-10-14 가독성)
  const rgb = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const [r, g, b, a = 1] = m[1].split(",").map((x) => parseFloat(x)); return { r, g, b, a }; };
  const relL = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const bgOf = (el) => { for (let n = el; n; n = n.parentElement) { const cs = getComputedStyle(n); if (cs.backgroundImage !== "none") return null; const c = rgb(cs.backgroundColor); if (c && c.a >= 0.5) return c; } return null; };
  const seenC = new Set();
  const textWalker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let t = textWalker.nextNode(); t; t = textWalker.nextNode()) {
    const txt = t.textContent.trim(); const el = t.parentElement;
    if (!txt || txt.length < 2 || !el || !visible(el) || el.closest("canvas, svg, .titans-field, button:disabled, [aria-disabled=true], .locked, .tab-locked, .done")) continue;
    let dim = false; for (let n = el; n; n = n.parentElement) { if (+getComputedStyle(n).opacity < 0.95) { dim = true; break; } } if (dim) continue;
    const cs = getComputedStyle(el); const fg = rgb(cs.color); const bg = bgOf(el); if (!fg || !bg || fg.a < 0.9) continue;
    const L1 = relL(fg), L2 = relL(bg); const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    if (ratio < 3) { const key = `${el.className}|${txt.slice(0, 12)}`; if (seenC.has(key)) continue; seenC.add(key); out.push({ screen: name, kind: "contrast", cls: String(el.className).slice(0, 50), par: `${el.parentElement?.className ?? ""} < ${el.parentElement?.parentElement?.className ?? ""}`.slice(0, 80), text: txt.slice(0, 24), how: `${ratio.toFixed(2)} ${cs.color}`, bg: `rgb(${bg.r},${bg.g},${bg.b})` }); }
  }
  // ② 남색·검정 배경
  const lum = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const [r, g, b, a = 1] = m[1].split(",").map((x) => parseFloat(x)); const navyOrBlack = b >= r - 4 || Math.max(r, g, b) < 30; /* 남색·검정만 — 갈색 잉크·나무색은 테마 */ return { l: navyOrBlack ? (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 : 1, a }; };
  const seenDark = new Set();
  for (const el of document.querySelectorAll("body *")) {
    if (el.closest("canvas") || el.tagName === "CANVAS" || el.tagName === "IMG" || el.closest("svg")) continue;
    if (el.closest(".titans-monster, .titans-hero, .titans-allies, .titans-fx, .titans-float, .skill-shot") || el.matches(".titans-field, .game-root")) continue;   // 전장 바탕·앱 바닥은 그림이 덮는다
    if (!visible(el)) continue;
    const cs = getComputedStyle(el), r = el.getBoundingClientRect();
    if (r.width * r.height < 300) continue;
    if (r.width * r.height > vw * vh * 0.85 && (cs.position === "fixed" || cs.position === "absolute")) continue;   // 전체 화면 막
    let dark = false, how = "";
    const bg = lum(cs.backgroundColor);
    if (bg && bg.a >= 0.45 && bg.l < 0.2) { dark = true; how = cs.backgroundColor; }   // 반투명(45%~) 남색도 판으로 보인다
    if (!dark && cs.backgroundImage.includes("gradient")) {
      const cols = cs.backgroundImage.match(/rgba?\([^)]+\)/g) ?? [];
      const ds = cols.map(lum).filter((x) => x && x.a >= 0.55);
      if (ds.length && ds.every((x) => x.l < 0.2)) { dark = true; how = cs.backgroundImage.slice(0, 60); }
    }
    if (!dark) continue;
    const label = (el.innerText ?? "").trim().replace(/\s+/g, " ").slice(0, 30);
    const key = `${String(el.className).slice(0, 40)}`; if (seenDark.has(key)) continue; seenDark.add(key);
    out.push({ screen: name, kind: "dark", cls: String(el.className).slice(0, 60), tag: el.tagName, text: label, how, area: Math.round(r.width * r.height) });
  }
  return out;
}, name);

const all = [];
for (const [w, h] of VIEWPORTS) {
  const now = Date.now();
  const progress = { version: 5, level: 40, sharedCoins: 999_950, equippedWeaponLevel: 10, dodgeBestStage: 3, idleClaimedAt: now, updatedAt: now, onboardingStep: 4,
    partyIds: ["mia", "leon", "pyro", "luna"], partyCap: 4, attendanceStreak: 3, expeditionSeals: 12, redGems: 999_999, enhancementMaterials: 1234,
    claimedRewards: ["dodge-tutorial"], pioneeredArea: 3, wallAreas: ["forest"], rebirthCount: 1, dodgeStars: { "0": 3, "1": 2, "2": 1 }, titanBestStage: 14 };
  const titans = { gold: 9_999_999, stage: 14, bestStage: 14, heroes: { mia: 8, leon: 5, pyro: 4, luna: 3 }, lastActiveAt: now, huntPicks: 0,
    skillInventory: { learned: ["strike", "crit"], levels: { strike: 2, crit: 1 }, equipped: { starter: "strike", linkA: "crit" }, skillCores: 0 } };
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.goto(BASE, { waitUntil: "networkidle0" });
  await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); }, {
    [`dodgebullets:progression:v1:${H}`]: JSON.stringify(progress), [`dodgebullets:titans:${H}`]: JSON.stringify(titans), "dodge-bullets:soundEnabled": "0", "dodgebullets:test-phase": "0", "dodgebullets:inapp-fs-hint": "1",
  });
  await page.goto(BASE, { waitUntil: "networkidle0" });
  await sleep(2600); await closeModals(); await sleep(400); await closeModals(); await sleep(400);
  const tag = `${w}x${h}`;
  const shot = async (name) => { await page.screenshot({ path: `${OUT}/${tag}-${name}.png` }); all.push(...(await scan(`${tag}:${name}`))); };
  await shot("01-hunt");
  await clickText(".titans-bottom-nav button", "상점"); await sleep(700); await shot("02-shop");
  await closeModals(); await clickText(".titans-bottom-nav button", "동료"); await sleep(700); await shot("03-allies");
  await clickText("button", "동료 뽑기"); await sleep(600); await shot("04-gacha");
  await closeModals(); await clickText(".titans-bottom-nav button", "모험"); await sleep(700); await shot("05-adventure");
  await closeModals(); await clickText(".titans-bottom-nav button", "사냥터"); await sleep(500);
  await clickText("button", "스킬"); await sleep(600); await shot("06-skills");
  await page.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.textContent.includes("마이페이지"))?.click()); await sleep(1000);
  await closeModals(); await sleep(300); await shot("07-mypage");
  // 2026-10-14 보완: 대장간·이벤트·비트·성문 메뉴도 돈다 (대장간이 남색 판 그대로였다)
  const toHub = async () => { await page.evaluate(() => document.querySelector(".character-back")?.click()); await sleep(900); await closeModals(); await clickText(".titans-bottom-nav button", "모험"); await sleep(700); };
  await toHub();
  await page.evaluate(() => [...document.querySelectorAll(".hub-card")].find((b) => b.textContent.includes("대장간"))?.click()); await sleep(2200);
  await shot("08-forge");
  for (const t of ["조합소", "보호구", "원정 무기", "장비"]) { await page.evaluate((t) => [...document.querySelectorAll(".forge-tabs button")].find((b) => b.textContent.trim() === t)?.click(), t); await sleep(500); await shot(`09-forge-${t}`); }
  await page.evaluate(() => document.querySelector(".forge-back")?.click()); await sleep(1500); await closeModals();
  await clickText(".titans-bottom-nav button", "모험"); await sleep(700);
  await page.evaluate(() => document.querySelector(".season-nav")?.click()); await sleep(900); await shot("10-events");
  await closeModals(); await page.keyboard.press("Escape"); await sleep(300);
  await page.evaluate(() => [...document.querySelectorAll("button")].find((b) => /^(닫기|×)$/.test(b.textContent.trim()) && b.closest(".event-center, .event-sheet, [role=dialog]"))?.click()); await sleep(500);
  await clickText(".titans-bottom-nav button", "모험"); await sleep(700);
  await page.evaluate(() => [...document.querySelectorAll(".hub-card")].find((b) => b.textContent.includes("비트 수련"))?.click()); await sleep(2200); await shot("11-beat-menu");
}
writeFileSync(`${OUT}/ui-quality.json`, JSON.stringify(all, null, 1));
const clip = all.filter((x) => x.kind === "clip"), dark = all.filter((x) => x.kind === "dark"), contrast = all.filter((x) => x.kind === "contrast");
const uniq = (arr) => [...new Map(arr.map((x) => [`${x.cls}|${x.text}`, x])).values()];
console.log("CLIP", clip.length); for (const x of uniq(clip)) console.log("  clip", x.screen, "|", x.cls, "|", x.text, x.ellipsis ? "(…)" : `+${x.over}px`);
console.log("DARK", dark.length); for (const x of uniq(dark)) console.log("  dark", x.screen, "|", x.tag, x.cls, "|", x.text, "|", x.how.slice(0, 40));
await browser.close();
console.log("CONTRAST", contrast.length); for (const x of uniq(contrast)) console.log("  contrast", x.screen, "|", x.cls, "|", x.text, "|", x.how);
process.exit(clip.length + dark.length + contrast.length === 0 ? 0 : 1);
