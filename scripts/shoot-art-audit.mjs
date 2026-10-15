/**
 * 원화 감사 캡처 (2026-10-15, 사용자: "그 외에 리소스 어색한 거 다시 찾아줘") — 폰 390×844 에서 그림이 많은 화면을 차례로 찍는다.
 *   node scripts/shoot-art-audit.mjs <outDir>   (vite 5173)
 * 성문 방어 메뉴·전투 · 비트 연주 · 마이페이지 도감·펫·배지 · 주간 도전(그림자) · 원정 일지 · 상점 외형·칭호
 */
import { launchBrowser } from "./launch-browser.mjs";
import { mkdirSync } from "node:fs";
const OUT = process.argv[2] ?? "shots-art-audit"; mkdirSync(OUT, { recursive: true });
const BASE = "http://localhost:5173", H = "mock-local-dev", now = Date.now();
const browser = await launchBrowser({ args: ["--no-sandbox"] }); const page = await browser.newPage(); const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = []; page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));
const missing = []; page.on("response", (r) => { if (r.status() >= 400) missing.push(r.status() + " " + r.url().replace(BASE, "")); });
const clickText = (sel, text) => page.evaluate(({ sel, text }) => { const el = [...document.querySelectorAll(sel)].find((b) => b.textContent.trim().includes(text)); el?.click(); return !!el; }, { sel, text });
const close = () => page.evaluate(() => { for (let k = 0; k < 4; k += 1) { const c = document.querySelector(".idle-claim"); if (c) { c.click(); continue; } const b = [...document.querySelectorAll("button")].filter((x) => /^(닫기|확인|나중에|×)$/.test(x.textContent.trim()))[0]; if (b) b.click(); } });
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.goto(BASE, { waitUntil: "networkidle0" });
const progress = { version: 5, level: 40, sharedCoins: 999950, equippedWeaponLevel: 10, dodgeBestStage: 12, idleClaimedAt: now, updatedAt: now, onboardingStep: 4, partyIds: ["mia", "garen", "luna", "leon"], partyCap: 4, redGems: 5000, enhancementMaterials: 300, claimedRewards: ["dodge-tutorial"], pioneeredArea: 5, towerOpen: true, pets: { slime: 1, goblin: 1 }, activePet: "slime", equippedShoulder: "scout", ownedShoulders: ["scout"] };
const titans = { gold: 9e6, stage: 20, bestStage: 20, heroes: { mia: 8, garen: 6, luna: 5, leon: 5 }, lastActiveAt: now };
await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); }, { [`dodgebullets:progression:v1:${H}`]: JSON.stringify(progress), [`dodgebullets:titans:${H}`]: JSON.stringify(titans), "dodge-bullets:soundEnabled": "0", "dodgebullets:test-phase": "0", "dodgebullets:inapp-fs-hint": "1" });
await page.reload({ waitUntil: "networkidle0" }); await sleep(2500); await close(); await sleep(500);
const shot = async (n) => { await sleep(700); await page.screenshot({ path: `${OUT}/${n}.png` }); };
await shot("a-hunt-pet");
// 마이페이지 탭들
await page.evaluate(() => [...document.querySelectorAll("button")].find((b) => b.textContent.includes("마이페이지"))?.click()); await sleep(1200); await close();
for (const t of ["도감", "펫", "배지·진화"]) { await clickText("button", t); await shot(`b-mypage-${t}`); }
await page.evaluate(() => document.querySelector(".character-back")?.click()); await sleep(1200); await close();
// 이벤트 — 주간 도전·원정 일지
await clickText(".titans-bottom-nav button", "모험"); await sleep(700);
await page.evaluate(() => document.querySelector(".season-nav")?.click()); await sleep(1000);
for (const t of ["주간 도전", "원정 일지", "토벌령", "차원 균열"]) { await clickText(".event-tabs button", t); await shot(`c-events-${t}`); }
await close(); await page.keyboard.press("Escape"); await sleep(400);
await page.reload({ waitUntil: "networkidle0" }); await sleep(2500); await close();
// 상점 외형·칭호
await clickText(".titans-bottom-nav button", "상점"); await sleep(800);
for (const t of ["외형", "칭호", "동료"]) { await clickText(".premium-category-tabs button", t); await shot(`d-shop-${t}`); }
await page.reload({ waitUntil: "networkidle0" }); await sleep(2500); await close();
// 성문 방어 메뉴 → 전투
await clickText(".titans-bottom-nav button", "모험"); await sleep(700);
await clickText(".hub-card", "성문 방어"); await sleep(2000); await shot("e-dodge-menu");
await clickText(".exp-menu-content .cta", "시작"); await sleep(1500);
await clickText(".intro-start, .cta.intro-cta, .overlay-content .cta", ""); await sleep(3000); await shot("f-dodge-battle"); await sleep(2500); await shot("f-dodge-battle2");
await page.reload({ waitUntil: "networkidle0" }); await sleep(2500); await close();
// 비트 연주
await clickText(".titans-bottom-nav button", "모험"); await sleep(700);
await clickText(".hub-card", "비트 수련"); await sleep(2000);
await clickText(".cta", "연습"); await sleep(4000); await shot("g-beat-play");
console.log("errors", errors.length, errors.slice(0, 3).join(" / "));
console.log("missing", [...new Set(missing)].slice(0, 20).join("\n"));
await browser.close();
