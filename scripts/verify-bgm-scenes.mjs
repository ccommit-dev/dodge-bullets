// 배경 음악 장면 (2026-10-28, 사용자: "게임 bgm 이 너무 산뜻 — 비버 키우기에 맞는 다른 노래 · 스테이지별 콘텐츠별 알맞은 음악") — 사냥터 앞 지역 숲 · 폐허(11층)부터 축제 · 상점 글로켄슈필 · 대장전 오케스트라.
// 2026-10-28 시드 쓰기와 reload 를 한 evaluate 안에서(떠 있던 사냥터가 시드를 덮던 경합)
//   node scripts/verify-bgm-scenes.mjs   (vite 5173 · DEV 훅 window.__bgm)
import { launchBrowser } from "./launch-browser.mjs";
const H = "mock-local-dev", now = Date.now();
const b = await launchBrowser({ args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"] }); const page = await b.newPage(); const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = []; page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));
await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
await page.goto("http://localhost:5173", { waitUntil: "networkidle0" });
const prog = { version: 5, level: 20, idleClaimedAt: now, updatedAt: now, onboardingStep: 4, sessionCount: 9, partyIds: ["mia"], claimedRewards: ["dodge-tutorial"], pioneeredArea: 3, discoverySeeded: true };
// 동료 Lv1 — 대장이 일찍 쓰러지면 곡이 바뀌기 전(0.6초 줄였다 키움)에 사냥터 곡으로 돌아간다
const seed = async (stage) => { await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); location.reload(); }, { [`dodgebullets:progression:v1:${H}`]: JSON.stringify(prog), [`dodgebullets:titans:${H}`]: JSON.stringify({ gold: 0, stage, bestStage: stage, heroes: { mia: 1 }, lastActiveAt: now }), "dodge-bullets:soundEnabled": "1", [`dodgebullets:attendance:v1:${H}`]: JSON.stringify({ lastClaimDate: new Date().toLocaleDateString("sv-SE"), totalDays: 3, consecutiveDays: 3 }) }); await page.waitForNavigation({ waitUntil: "networkidle0" }).catch(() => {}); await sleep(1200); await page.mouse.click(200, 400); await sleep(400); await page.evaluate(() => { for (let k = 0; k < 5; k += 1) { const c = document.querySelector(".idle-claim"); if (c) { c.click(); continue; } const x = [...document.querySelectorAll("button")].filter((y) => !y.closest(".titans-bottom-nav")).find((y) => /^(닫기|확인|나중에)$/.test(y.textContent.trim())); if (x) x.click(); } }); await sleep(1500); };
let fails = 0; const ok = (n, c, d = "") => { console.log(`${c ? "PASS" : "FAIL"} ${n}${d ? " — " + d : ""}`); if (!c) fails += 1; };
const src = () => page.evaluate(() => (window.__bgm?.() ?? {}).src ?? document.querySelector("audio")?.src ?? "none");
await seed(3); { const s = await src(); ok("사냥터 앞 지역(3층) = The Whispering Grove", /whispering-grove/.test(s), s); }
await seed(12); { const s = await src(); ok("폐허(12층) = Market Day Revel", /market-day-revel/.test(s), s); }
await page.evaluate(() => [...document.querySelectorAll(".titans-bottom-nav button")].find((b) => b.textContent.includes("상점"))?.click()); await sleep(1500); { const s = await src(); ok("상점 = Glockenspiel Garden", /glockenspiel-garden/.test(s), s); }
// 사냥터로 돌아온 뒤 대장전을 연다(DEV 훅) — 대장이 나와 있는 동안 곡을 5초까지 지켜본다(일찍 쓰러지면 다음 대장 · 곡이 돌아간다)
await page.evaluate(() => [...document.querySelectorAll(".titans-bottom-nav button")].find((b) => b.textContent.includes("사냥터"))?.click()); await sleep(800);
await page.evaluate(() => window.__huntStartBoss?.());
{ let s = ""; for (let i = 0; i < 25; i += 1) { s = await src(); if (/overture-final-battle/.test(s)) break; await sleep(200); } ok("대장전 = Overture to the Final Battle", /overture-final-battle/.test(s), s); }
ok("페이지 오류 없음", errors.length === 0, errors.join(" | "));
console.log(fails ? `${fails} FAIL` : "ALL PASS");
await b.close();
process.exit(fails ? 1 : 0);
