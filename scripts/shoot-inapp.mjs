// 인앱 브라우저(기본 카카오톡 UA) 가로 캡처·안내 띠·설정 항목 검사 (2026-10-14).  node scripts/shoot-inapp.mjs <outDir>  · UA=… H=300
import { launchBrowser } from "./launch-browser.mjs";
const OUT = process.argv[2]; const BASE = "http://localhost:5173", H = "mock-local-dev", now = Date.now();
const UA = process.env.UA ?? "Mozilla/5.0 (Linux; Android 14; SM-S921N Build/UP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0.0.0 Mobile Safari/537.36 KAKAOTALK 10.8.5";
const progress = { version: 5, level: 40, sharedCoins: 9999, dodgeBestStage: 3, idleClaimedAt: now, updatedAt: now, onboardingStep: 4, partyIds: ["mia", "garen", "luna", "leon"], partyCap: 4, redGems: 50, claimedRewards: ["dodge-tutorial"], pioneeredArea: 3 };
const titans = { gold: 40000, stage: 9, bestStage: 9, heroes: { mia: 3, garen: 2, luna: 2, leon: 2 }, lastActiveAt: now };
const browser = await launchBrowser({ args: ["--no-sandbox", "--disable-gpu"] });
const page = await browser.newPage(); const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = []; page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
await page.setUserAgent(UA);
await page.setViewport({ width: 844, height: Number(process.env.H ?? 300), deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.goto(BASE, { waitUntil: "networkidle0" });
await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); }, { [`dodgebullets:progression:v1:${H}`]: JSON.stringify(progress), [`dodgebullets:titans:${H}`]: JSON.stringify(titans), "dodge-bullets:soundEnabled": "0", "dodgebullets:test-phase": "0" });
await page.goto(BASE, { waitUntil: "networkidle0" }); await sleep(2500);
await page.evaluate(() => { for (let k = 0; k < 4; k += 1) { const c = document.querySelector(".idle-claim"); if (c) { c.click(); continue; } const b = [...document.querySelectorAll("button")].filter((x) => /^(닫기|확인|나중에)$/.test(x.textContent.trim()))[0]; if (b) b.click(); } }); await sleep(500);
const r1 = await page.evaluate(() => { const h = document.querySelector(".inapp-fs-hint"); const f = document.querySelector(".titans-field")?.getBoundingClientRect(); return { hint: h?.textContent ?? null, hintRect: h ? h.getBoundingClientRect().toJSON() : null, field: f ? [Math.round(f.left), Math.round(f.top), Math.round(f.width), Math.round(f.height)] : null, vw: innerWidth, vh: innerHeight, docH: document.documentElement.scrollHeight }; });
await page.screenshot({ path: `${OUT}/inapp-hunt.png` });
// 설정 메뉴 항목
await page.evaluate(() => [...document.querySelectorAll(".titans-bottom-nav button")].find((b) => b.textContent.includes("설정"))?.click()); await sleep(500);
const item = await page.evaluate(() => document.querySelector(".settings-fullscreen")?.textContent ?? null);
await page.screenshot({ path: `${OUT}/inapp-menu.png` });
// 닫기 → 다시 안 뜸
await page.keyboard.press("Escape"); await page.evaluate(() => document.querySelector(".inapp-fs-close")?.click()); await sleep(300);
await page.reload({ waitUntil: "networkidle0" }); await sleep(2000);
const again = await page.evaluate(() => !!document.querySelector(".inapp-fs-hint"));
console.log(JSON.stringify({ ...r1, item, hintAfterDismissReload: again, errors }));
await browser.close();
