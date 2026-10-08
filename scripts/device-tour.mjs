/**
 * 에뮬레이터 화면 투어 (2026-10-08, 사용자: "모바일 에뮬레이터에서 테스트 및 오류나 어색한 리소스 부분 다시 생성").
 * 앱의 WebView 를 붙잡고 진행된 계정으로 주요 화면을 차례로 열어 **기기 화면 그대로** 찍는다 — 허브(장비 성장·스킬) · 콘텐츠 팝업 ·
 * 성문 방어 메뉴 · 비트 메뉴 · 대장간(검·보호구·원정 무기) · 동료 도감·뽑기 · 상점 · 마이페이지 · 설정 · 출석 · 방치 보고.
 * 페이지 오류·404 도 모은다. 결과: <outDir>/tour-*.png + tour.json
 *   node scripts/device-tour.mjs [outDir]   (앱이 깔려 있어야 한다 — device-play.mjs 뒤에)
 */
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import puppeteer from "puppeteer";

const OUT = process.argv[2] ?? "store/device-tour";
mkdirSync(OUT, { recursive: true });
const APP = "com.ccommit.dodgelab";
const ADB = process.env.ADB ?? join(process.env.LOCALAPPDATA ?? "", "Android/Sdk/platform-tools/adb.exe");
const adb = (...a) => execFileSync(ADB, a, { encoding: "utf8", maxBuffer: 64 << 20 }).trim();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const shots = [];
const shot = (name) => { writeFileSync(join(OUT, `tour-${name}.png`), execFileSync(ADB, ["exec-out", "screencap", "-p"], { maxBuffer: 64 << 20 })); shots.push(name); console.log("shot", name); };

adb("shell", "monkey", "-p", APP, "-c", "android.intent.category.LAUNCHER", "1");
await sleep(4000);
const pid = adb("shell", "pidof", APP);
const sock = adb("shell", "cat", "/proc/net/unix").split("\n").map((l) => l.match(/@(webview_devtools_remote_\d+)/)?.[1]).find((s) => s?.endsWith(`_${pid}`));
spawnSync(ADB, ["forward", "--remove", "tcp:9339"]);
adb("forward", "tcp:9339", `localabstract:${sock}`);
const browser = await puppeteer.connect({ browserURL: "http://127.0.0.1:9339", defaultViewport: null, protocolTimeout: 90000 });
const page = (await browser.pages()).find((p) => /localhost/.test(p.url()));
const errors = []; page.on("pageerror", (e) => errors.push(String(e.message ?? e).slice(0, 200)));
const missing = []; page.on("response", (r) => { if (r.status() === 404) missing.push(r.url().replace(/^https?:\/\/localhost\/?/, "")); });

// 진행된 계정 — 출석·방치 보고가 뜨도록 어제 닫은 것으로
const H = "mock-local-dev", now = Date.now();
await page.evaluate(async ({ H, now }) => {
  const P = window.Capacitor?.Plugins?.Preferences;
  const set = async (k, v) => { if (P) await P.set({ key: k, value: v }); else localStorage.setItem(k, v); };
  await set(`dodgebullets:progression:v1:${H}`, JSON.stringify({ version: 5, level: 32, exp: 90000, redGems: 1200, sharedCoins: 300000, enhancementMaterials: 60, idleClaimedAt: now - 9 * 3600e3, updatedAt: now - 9 * 3600e3, onboardingStep: 4, sessionCount: 6, partyIds: ["mia", "leon", "sera", "garen"], partyCap: 4, pioneeredArea: 3, dodgeBestStage: 12, dodgeStageSchema: 2, expeditionSkills: { fire: 3, water: 2 }, expeditionLoadout: ["fire", "water"], towerOpen: true }));
  await set(`dodgebullets:titans:${H}`, JSON.stringify({ stage: 14, bestStage: 14, gold: 500000, heroes: { mia: 12, leon: 8, sera: 6, garen: 5, ari: 3 }, skillInventory: { learned: ["strike", "crit", "stoneGuard"], levels: { strike: 3, crit: 2, stoneGuard: 1 }, equipped: { starter: "strike", linkA: "crit" }, skillCores: 4 }, lastActiveAt: now - 9 * 3600e3 }));
  await set("dodge-bullets:soundEnabled", "0");
}, { H, now });
await page.evaluate(() => location.reload());
await sleep(7000);
shot("01-boot-modal");   // 방치 보고 / 출석이 떠 있으면 그대로
const dismiss = async () => { for (let k = 0; k < 5; k += 1) { await page.evaluate(() => { document.querySelectorAll(".idle-claim").forEach((b) => b.click()); [...document.querySelectorAll("[role=dialog] button, .overlay-content button")].find((b) => /보상 받기|받기|확인|닫기|나중에/.test(b.textContent))?.click(); }); await sleep(500); } };
await dismiss(); await sleep(800);
shot("02-hub");
const clickText = (sel, text) => page.evaluate(({ sel, text }) => { const el = [...document.querySelectorAll(sel)].find((b) => b.textContent.trim().includes(text)); el?.click(); return !!el; }, { sel, text });
await clickText(".titans-tabs button, .titans-growth-tabs button", "스킬"); await sleep(900); shot("03-skills");
await clickText(".titans-tabs button, .titans-growth-tabs button", "장비"); await sleep(600);
await clickText(".titans-bottom-nav button", "콘텐츠"); await sleep(700); shot("04-content-popup");
await clickText(".nav-popup-grid button", "성문 방어"); await sleep(2000); shot("05-dodge-menu");
await clickText(".cta, button", "사냥터"); await sleep(1800); await dismiss();
await clickText(".titans-bottom-nav button", "콘텐츠"); await sleep(700);
await clickText(".nav-popup-grid button", "비트 수련"); await sleep(2000); shot("06-beat-menu");
await clickText(".cta, button", "사냥터"); await sleep(1800); await dismiss();
await clickText(".titans-bottom-nav button", "콘텐츠"); await sleep(700);
await clickText(".nav-popup-grid button", "대장간"); await sleep(2200); shot("07-forge-sword");
await clickText(".forge-tabs button, button", "보호구"); await sleep(900); shot("08-forge-armor");
await clickText(".forge-tabs button, button", "원정 무기"); await sleep(900); shot("09-forge-weapons");
await clickText(".forge-back", "사냥터"); await sleep(1800); await dismiss();
await clickText(".titans-bottom-nav button", "동료"); await sleep(1200); shot("10-allies");
await clickText(".hub-sheet-switch button", "동료 뽑기"); await sleep(1000); shot("11-gacha");
await clickText(".titans-bottom-nav button", "상점"); await sleep(1200); shot("12-shop");
await clickText(".titans-bottom-nav button", "모험"); await sleep(1200); shot("13-adventure");
await clickText(".titans-bottom-nav button", "사냥터"); await sleep(800);
await clickText(".titans-back", "마이페이지"); await sleep(1200); shot("14-mypage");
await page.evaluate(() => document.querySelector(".settings-toggle")?.click()); await sleep(600); shot("15-settings");
await page.evaluate(() => { [...document.querySelectorAll(".settings-menu button")].find((b) => /출석/.test(b.textContent))?.click(); }); await sleep(1000); shot("16-attendance");
await page.evaluate(() => { [...document.querySelectorAll("[role=dialog] button, .overlay-content button")].find((b) => /닫기|확인/.test(b.textContent))?.click(); }); await sleep(400);
await page.evaluate(() => document.querySelector(".settings-toggle")?.click()); await sleep(400);
await page.evaluate(() => { [...document.querySelectorAll(".settings-menu button")].find((b) => /이벤트/.test(b.textContent))?.click(); }); await sleep(1200); shot("17-event");
writeFileSync(join(OUT, "tour.json"), JSON.stringify({ shots, errors, missing: [...new Set(missing)] }, null, 1));
console.log("errors", errors.length, errors.slice(0, 3).join(" | ")); console.log("404", missing.length, [...new Set(missing)].slice(0, 8).join(" "));
await browser.disconnect();
spawnSync(ADB, ["forward", "--remove", "tcp:9339"]);
