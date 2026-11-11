/**
 * 댐 방어전 동료 출격 화면 (2026-11-11, game/supportAlly.ts · SkillPanel)   node scripts/verify-support-ally-ui.mjs [캡처 폴더]   (vite dev 서버 5173 필요)
 * 정비 탭에 편성 동료 카드 → 누르면 '출격 중'(저장) → 판에서 주인공 뒤에 서서 속성 화살을 쏜다 → 다시 누르면 뺀다.
 */
import { launchBrowser } from "./launch-browser.mjs";
const OUT = process.argv[2], BASE = "http://localhost:5173", H = "mock-local-dev";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = []; const ok = (n, c, d = "") => results.push([c ? "PASS" : "FAIL", n, d]);
const browser = await launchBrowser({ args: ["--no-sandbox", "--disable-gpu"] });
const page = await browser.newPage();
const errors = []; page.on("pageerror", (e) => errors.push(String(e.message).slice(0, 200)));
const clickText = (sel, text) => page.evaluate(({ sel, text }) => { const el = [...document.querySelectorAll(sel)].find((b) => b.textContent.trim().includes(text)); el?.click(); return !!el; }, { sel, text });
const prog = () => page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? "{}"), `dodgebullets:progression:v1:${H}`);
const now = Date.now();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.goto(`${BASE}/favicon.png`, { waitUntil: "domcontentloaded" });
await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); location.href = "/"; }, {
  [`dodgebullets:progression:v1:${H}`]: JSON.stringify({ version: 5, unitRev: 1, onboardingStep: 4, level: 40, sharedCoins: 9999, dodgeBestStage: 12, dodgeStars: Object.fromEntries(Array.from({ length: 12 }, (_, i) => [String(i), 3])), pioneeredArea: 5, titanBestStage: 9, idleClaimedAt: now, updatedAt: now, partyIds: ["mia", "pyro"], partyCap: 4, sessionCount: 9, claimedRewards: ["dodge-tutorial"] }),
  [`dodgebullets:titans:${H}`]: JSON.stringify({ gold: 40000, stage: 9, bestStage: 9, heroes: { mia: 8, pyro: 6 }, lastActiveAt: now }),
  "dodge-bullets:soundEnabled": "0", "dodgebullets:qa-godmode": "1",
}).catch(() => {});
await page.waitForNavigation({ waitUntil: "networkidle0" }).catch(() => {});
await sleep(2000);
await page.evaluate(() => { for (let k = 0; k < 4; k += 1) { const c = document.querySelector(".idle-claim"); if (c) { c.click(); continue; } const b = [...document.querySelectorAll("button")].filter((x) => /^(닫기|확인|나중에)$/.test(x.textContent.trim()))[0]; if (b) b.click(); } });
await sleep(500);
await clickText(".titans-bottom-nav button", "모험"); await sleep(400);
await clickText(".nav-popup-grid button", "성문 방어"); await sleep(1500);
await clickText(".exp-menu-tabs button", "정비"); await sleep(700);
const row = await page.evaluate(() => { const r = document.querySelector(".exp-support-row"); if (!r) return null; const cards = [...r.querySelectorAll(".exp-support-card")]; const face = cards[0]?.querySelector(".exp-support-face"); const fb = face?.getBoundingClientRect(); const fonts = [...r.querySelectorAll("*")].filter((el) => el.children.length === 0 && el.textContent.trim()).map((el) => parseFloat(getComputedStyle(el).fontSize)); return { title: r.querySelector(":scope > b")?.textContent, cards: cards.map((c) => c.textContent.replace(/\s+/g, " ").trim()), face: fb ? [Math.round(fb.width), Math.round(fb.height)] : null, bg: face ? getComputedStyle(face).backgroundImage.slice(0, 80) : "", inView: r.getBoundingClientRect().right <= innerWidth, minFont: Math.min(...fonts) }; });
ok("정비 탭에 동료 출격 줄 — 편성 둘", !!row && row.cards.length === 2 && /동료 출격/.test(row.title ?? "") && row.cards.every((c) => /화살 · 1\.5초마다/.test(c) && /출격$/.test(c)), JSON.stringify(row));
ok("카드 얼굴은 동료 시트 · 화면 안", !!row && /titans\/anim\/allies\/mia\.webp/.test(row.bg) && row.face?.[0] >= 30 && row.inView, JSON.stringify(row && { face: row.face, bg: row.bg }));
if (OUT) { await page.evaluate(() => document.querySelector(".exp-support-row")?.scrollIntoView({ block: "center" })); await sleep(200); await page.screenshot({ path: `${OUT}/support-row.png` }); }
await page.evaluate(() => document.querySelector('[data-support="mia"]')?.click()); await sleep(600);
const p1 = await prog(), on = await page.evaluate(() => document.querySelector('[data-support="mia"]')?.textContent ?? "");
ok("누르면 출격 중 · 저장", p1.supportAlly === "mia" && /출격 중/.test(on), `${p1.supportAlly} · ${on}`);

// 판 — 주인공 뒤에 서서 쏜다
await clickText(".exp-menu-tabs button", "원정"); await sleep(500);
await clickText("button", "스테이지"); await sleep(1800);
await page.evaluate(() => { const c = document.querySelector("canvas"); if (!c) return; const r = c.getBoundingClientRect(); c.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: r.x + r.width / 2, clientY: r.y + r.height * 0.8, pointerId: 1 })); });
// 첫 몬스터가 내려올 때까지(최대 25초) — 쏘는 순간을 찍는다
let s = null, shotTaken = false;
for (let t = 0; t < 125; t += 1) {
  s = await page.evaluate(() => { const w = window.__dodgeWorld; const sa = w?.supportAlly; return sa ? { id: sa.id, element: sa.element, shots: sa.shots, attackMs: sa.attackMs, x: Math.round(sa.x), px: Math.round(w.player.x), facing: w.player.facing } : null; });
  if (s && s.attackMs > 200 && !shotTaken && OUT) { await page.screenshot({ path: `${OUT}/support-shoot.png` }); shotTaken = true; }
  if (s && s.shots >= 2 && (shotTaken || !OUT)) break;
  await page.evaluate(() => { const c = [...document.querySelectorAll(".perk-cards > *")][0]; (c?.querySelector("button") ?? c)?.click(); });
  await sleep(200);
}
ok("판에 동료가 따라오고 쏜다(2발 이상)", !!s && s.id === "mia" && s.element === "wind" && s.shots >= 2 && Math.abs(s.x - (s.px - s.facing * 34)) <= 20, JSON.stringify(s));
if (OUT) await page.screenshot({ path: `${OUT}/support-run.png` });

ok("페이지 오류 없음", errors.length === 0, errors.join(" | "));
await browser.close();
let fails = 0;
for (const [st, n, d] of results) { console.log(`${st} ${n}${d && st === "FAIL" ? " — " + d : ""}`); if (st === "FAIL") fails += 1; }
console.log(fails ? `\n${fails} FAIL` : "\nALL PASS");
process.exit(fails ? 1 : 0);
