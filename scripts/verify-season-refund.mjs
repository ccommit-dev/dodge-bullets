/**
 * 지난 시즌 코어 보상 정리 (2026-11-02, 사용자 확정 "남은 코어에서만 회수") — 실제 저장으로
 *   node scripts/verify-season-refund.mjs   (vite dev 서버 5173 필요)
 * ① 1판(시즌마다 8)으로 이미 받은 저장: 새 기준과의 차이를 안 쓴 코어에서 뺀다 · 0 밑으로 안 간다 · 한 번만 · 안내
 * ② 아직 안 받은 저장: 새 기준(실제로 닿을 수 있던 단)만큼 받고 다시 빼지 않는다
 * 오늘이 몇 시즌 며칠째냐에 따라 추정 단이 달라지므로 기대값은 같은 함수(seasonPass)를 esbuild 로 불러 계산한다
 */
import { launchBrowser } from "./launch-browser.mjs";
// 저장 심기는 게임 없는 favicon 페이지에서 — 떠 있는 게임이 비동기로 옛 저장을 써 심은 값을 덮었다(전체 실행에서만 드물게: 골드 31 · 표본 0 · 창을 심었는데 검, 2026-11-04)
import { build } from "esbuild";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const BASE = "http://localhost:5173";
const H = "mock-local-dev";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const ok = (name, cond, detail = "") => results.push([cond ? "PASS" : "FAIL", name, detail]);

const dir = mkdtempSync(join(tmpdir(), "season-refund-"));
await build({ entryPoints: ["src/economy/seasonPass.ts"], bundle: true, format: "esm", platform: "node", outfile: join(dir, "s.mjs"), logLevel: "silent", define: { "import.meta.env": JSON.stringify({ BASE_URL: "/", DEV: false }) } });
const sm = await import(pathToFileURL(join(dir, "s.mjs")).href);

const browser = await launchBrowser({ args: ["--no-sandbox", "--disable-gpu"] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e.message).slice(0, 160)));
await page.goto(BASE, { waitUntil: "networkidle0" });

const now = Date.now();
const buyS0 = `purchase:season-pass:qa-${sm.SEASON_EPOCH + 3 * 86400000}`;   // 시즌 0 에 산 기록
const baseProg = { version: 5, onboardingStep: 4, level: 30, redGems: 100, titanBestStage: 6, pioneeredArea: 2, idleClaimedAt: now, updatedAt: now, partyIds: ["mia", "leon"], partyCap: 4, sessionCount: 9 };
const read = () => page.evaluate((h) => ({ p: JSON.parse(localStorage.getItem(`dodgebullets:progression:v1:${h}`)), t: JSON.parse(localStorage.getItem(`dodgebullets:titans:${h}`)) }), H);
async function load(keys, cores, pending = 0) {
  const progress = { ...baseProg, claimedRewards: ["dodge-tutorial", "welcome-gift", ...keys], pendingSkillCores: pending };
  const titans = { stage: 6, bestStage: 6, gold: 1000, heroes: { mia: 5, leon: 5 }, skillInventory: { learned: ["strike"], levels: { strike: 1 }, equipped: { starter: "strike" }, skillCores: cores }, lastActiveAt: now };
  await page.goto(`${BASE}/favicon.png`, { waitUntil: "domcontentloaded" }); await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); location.href = "/"; }, {
    [`dodgebullets:progression:v1:${H}`]: JSON.stringify(progress), [`dodgebullets:titans:${H}`]: JSON.stringify(titans), "dodge-bullets:soundEnabled": "0",
    [`dodgebullets:attendance:v1:${H}`]: JSON.stringify({ lastClaimDate: new Date().toLocaleDateString("sv-SE"), totalDays: 3, consecutiveDays: 3 }),
  }).catch(() => {});
  await page.waitForNavigation({ waitUntil: "networkidle0" }).catch(() => {});
  return progress;
}
const toast = () => page.evaluate(() => document.querySelector(".titans-toast")?.textContent ?? "");

// ① 1판으로 받은 저장 · 코어 10 — 차이만큼 빠지고 v3 가 적힌다
{
  const p = await load([buyS0, sm.SEASON_CORE_REFUND_KEY, sm.SEASON_CORE_REFUND_PAST_KEY], 10);
  const excess = sm.seasonCoreRefundExcess(p, Date.now());
  let r = await read(), seen = "";
  for (let i = 0; i < 40; i += 1) { await sleep(150); r = await read(); seen ||= /돌려받았어요/.test(await toast()) ? await toast() : ""; if (r.p.claimedRewards.includes(sm.SEASON_CORE_REFUND_FIX_KEY) && r.t.skillInventory.skillCores === 10 - excess) break; }
  ok(`1판 받은 저장: 넘친 코어 ${excess}개를 안 쓴 코어에서 뺀다(10 → ${10 - excess}) · 정리 표시(v3)`, excess > 0 && r.t.skillInventory.skillCores === 10 - excess && r.p.claimedRewards.includes(sm.SEASON_CORE_REFUND_FIX_KEY), `코어 ${r.t.skillInventory.skillCores} · 넘침 ${excess}`);
  for (let i = 0; i < 10 && !seen; i += 1) { await sleep(150); const t = await toast(); if (/돌려받았어요/.test(t)) seen = t; }
  ok("안내: 넘치게 드린 코어를 돌려받았다는 문구", /돌려받았어요/.test(seen), seen);
  // 다시 들어와도 또 빼지 않는다
  await page.reload({ waitUntil: "networkidle0" }); await sleep(2500);
  const r2 = await read();
  ok("한 번만: 다시 들어와도 코어 그대로", r2.t.skillInventory.skillCores === 10 - excess, `${r2.t.skillInventory.skillCores}`);
}
// ① 코어가 1개뿐 — 0 밑으로 안 간다(쓴 코어는 그대로)
{
  await load([buyS0, sm.SEASON_CORE_REFUND_KEY, sm.SEASON_CORE_REFUND_PAST_KEY], 1);
  let r = await read();
  for (let i = 0; i < 40; i += 1) { await sleep(150); r = await read(); if (r.p.claimedRewards.includes(sm.SEASON_CORE_REFUND_FIX_KEY) && r.t.skillInventory.skillCores === 0) break; }
  ok("안 쓴 코어가 모자라면 있는 만큼만 — 0 에서 멈춘다(음수 없음)", r.t.skillInventory.skillCores === 0, `${r.t.skillInventory.skillCores}`);
}
// ② 아직 안 받은 저장 — 새 기준만큼 받고(코어 0 → 그만큼) 빼지 않는다
{
  const p = await load([buyS0], 0);
  const expect = sm.seasonCoreRefund(p, Date.now());
  let r = await read();
  for (let i = 0; i < 40; i += 1) { await sleep(150); r = await read(); if (r.t.skillInventory.skillCores === expect && r.p.claimedRewards.includes(sm.SEASON_CORE_REFUND_FIX_KEY)) break; }
  ok(`새로 받는 저장: 새 기준 ${expect}개(8 아님) · 정리 표시가 같이 적혀 다시 빼지 않는다`, expect > 0 && expect < 8 && r.t.skillInventory.skillCores === expect && r.p.claimedRewards.includes(sm.SEASON_CORE_REFUND_FIX_KEY), `코어 ${r.t.skillInventory.skillCores} · 기대 ${expect}`);
}
ok("페이지 오류 없음", errors.length === 0, errors.join(" | "));

await browser.close();
for (const [s, n, d] of results) console.log(`${s} ${n}${d ? ` — ${d}` : ""}`);
const fail = results.filter((r) => r[0] === "FAIL").length;
console.log(fail ? `${fail} FAIL` : "ALL PASS");
process.exit(fail ? 1 : 0);
