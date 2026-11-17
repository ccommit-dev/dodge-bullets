/**
 * 강화가 눈에 보이나 (2026-11-17, 사용자: "아이템이 업그레이드 될 때마다 성능이 게임에 반영되었으면") — 실제 사냥터 화면 검사
 *   BASE=http://localhost:5173 node scripts/verify-upgrade-glow.mjs   · 캡처: art-gen/out/upgrade-glow.png
 * 무기 +12 → 빛 4칸 · 반짝임 · 그림 크기 / 세트 파츠 +9 · +4 → 빛 3칸 · 1칸 / 대장간에서 돌아오면(지난번 본 단계보다 높다) 반영 알림 · 주인공 반짝임 /
 * 다시 들어오면 알림 없음 / 단계가 같으면 빛이 같은지(+0 은 빛 없음).
 */
import { launchBrowser } from "./launch-browser.mjs";
const BASE = process.env.BASE ?? "http://localhost:5173", H = "mock-local-dev", now = Date.now();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = []; const ok = (n, c, d = "") => results.push([c ? "PASS" : "FAIL", n, d]);
const browser = await launchBrowser({ args: ["--no-sandbox", "--disable-gpu"] });
const page = await browser.newPage();
const errors = []; page.on("pageerror", (e) => errors.push(String(e.message).slice(0, 200)));
// 알림은 2.8초 — 게임이 다 뜨기(networkidle) 전에 지나갈 수 있어 페이지 시작부터 글자를 모은다
await page.evaluateOnNewDocument(() => {
  window.__toasts = [];
  new MutationObserver(() => { const t = document.querySelector(".titans-toast")?.textContent ?? ""; if (t && !window.__toasts.includes(t)) window.__toasts.push(t); }).observe(document, { subtree: true, childList: true, characterData: true });
});
const PIECES = ["helmet", "armor", "gloves", "boots", "shoulder"];
const seed = async ({ weaponLevel, levels, armorLevel, seen }) => {
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const progress = {
    version: 5, onboardingStep: 4, level: 40, redGems: 2000, sharedCoins: 500000, enhancementMaterials: 2000, titanBestStage: 40, pioneeredArea: 5, idleClaimedAt: now, updatedAt: now,
    partyIds: ["mia"], partyCap: 4, sessionCount: 9, claimedRewards: ["dodge-tutorial", "welcome-gift"], equippedWeaponKind: "sword", equippedWeaponLevel: weaponLevel,
    ownedShoulders: ["scout"], equippedShoulder: "scout", ownedGear: PIECES.map((s) => `sword-${s}`), equippedGear: Object.fromEntries(PIECES.map((s) => [s, `sword-${s}`])), gearSetLevels: levels,
  };
  const titans = { stage: 12, bestStage: 40, gold: 2000000, heroes: { mia: 26 }, lastActiveAt: now };
  const forge = { gold: 0, goldMigrated: true, level: weaponLevel, bestLevel: weaponLevel, tickets: 0, shards: 0, totalAttempts: 3, pendingFailure: false, reforgeAttempts: 0, armorLevel, bestArmorLevel: armorLevel, armorAttempts: 3 };
  const store = {
    [`dodgebullets:progression:v1:${H}`]: JSON.stringify(progress), [`dodgebullets:titans:${H}`]: JSON.stringify(titans), [`dodgebullets:forge:${H}`]: JSON.stringify(forge),
    "dodge-bullets:soundEnabled": "0", "dodgebullets:qa-gems": "0", "dodgebullets:test-phase": "0",
    [`dodgebullets:attendance:v1:${H}`]: JSON.stringify({ lastClaimDate: new Date().toLocaleDateString("sv-SE"), totalDays: 3, consecutiveDays: 3 }),
  };
  if (seen) store[`dodgebullets:upgrade-seen:${H}`] = JSON.stringify(seen);
  // 저장 심기는 게임 없는 favicon 페이지에서 — 떠 있는 게임이 비동기로 옛 저장을 써 심은 값을 덮는다(verify-gear-sets 와 같은 이유)
  await page.goto(`${BASE}/favicon.png`, { waitUntil: "domcontentloaded" });
  await page.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); location.href = "/"; }, store).catch(() => {});
  await page.waitForNavigation({ waitUntil: "networkidle0", timeout: 60000 }).catch(() => {});
};
// 반영 알림은 2.8초 — 그 안에 잡는다
const watchToast = () => page.evaluate(() => new Promise((res) => {
  const t0 = performance.now(), seen = [];
  const tick = () => {
    const t = document.querySelector(".titans-toast")?.textContent ?? "";
    if (t && !seen.includes(t)) seen.push(t);
    const burst = !!document.querySelector(".hero-powerup-burst");
    if (burst) window.__burstSeen = true;
    if (performance.now() - t0 > 6000) return res({ toasts: [...new Set([...(window.__toasts ?? []), ...seen])], burst: !!window.__burstSeen });
    requestAnimationFrame(tick);
  };
  tick();
}));
const look = () => page.evaluate(() => {
  const hero = document.querySelector(".titans-hero .equipped-character");
  const w = hero?.querySelector(".equipment-weapon-alt");
  const wear = Object.fromEntries([...(hero?.querySelectorAll(".equipment-wear") ?? [])].map((e) => [e.dataset.wear, Number(e.dataset.enh)]));
  return { has: !!hero, grade: w ? Number(w.dataset.wgrade) : null, filter: w ? getComputedStyle(w).filter : "", sparkle: !!hero?.querySelector(".weapon-sparkle"), scale: w?.style.transform ?? "", wear,
    wearFilter: (() => { const e = hero?.querySelector('.equipment-wear[data-enh="3"]'); return e ? getComputedStyle(e).filter : ""; })() };
});

// ── 1) 처음(본 기록 없음): 빛은 있고 알림은 없다 ──
await seed({ weaponLevel: 12, levels: { "sword-helmet": 9, "sword-armor": 4 }, armorLevel: 5 });
const first = await watchToast();
const a = await look();
ok("무기 +12 → 빛 4칸 · 반짝임 · 주황 빛(drop-shadow)", a.has && a.grade === 4 && a.sparkle && /drop-shadow/.test(a.filter) && /255, 140, 30/.test(a.filter), JSON.stringify({ grade: a.grade, sparkle: a.sparkle, filter: a.filter.slice(0, 120) }));
ok("무기 그림이 단계만큼 크다(× 1.1)", /scale\(0\.\d+/.test(a.scale), a.scale);
ok("세트 파츠: +9 → 금빛 3칸 · +4 → 1칸 · +0 → 0칸", a.wear["sword-helmet"] === 3 && a.wear["sword-armor"] === 1 && a.wear["sword-gloves"] === 0 && /255, 176, 46/.test(a.wearFilter), JSON.stringify(a.wear));
ok("처음 들어오면(본 기록 없음) 반영 알림 없음", !first.toasts.some((t) => t.includes("강화 반영")), JSON.stringify(first.toasts));

// ── 2) 대장간에서 올리고 돌아옴: 본 기록(+4 · 견갑 +2)보다 높다 → 알림 · 반짝임 ──
await seed({ weaponLevel: 12, levels: { "sword-helmet": 9 }, armorLevel: 5, seen: { kind: "sword", bonus: 6, armor: 2 } });
const back = await watchToast();
const msg = back.toasts.find((t) => t.includes("강화 반영")) ?? "";
ok("돌아오면 '검 강화 반영 · 탭 피해 A → B' · 견갑 +5 · 동료 피해 +4% → +10%", /검 강화 반영 · 탭 피해 [\d.,A-Za-z]+ → [\d.,A-Za-z]+/.test(msg) && msg.includes("견갑 +5 반영 · 동료 피해 +4% → +10%"), msg);
ok("주인공 둘레 금빛 터짐", back.burst);
await page.screenshot({ path: "art-gen/out/upgrade-glow.png" });
const stored = JSON.parse(await page.evaluate((h) => localStorage.getItem(`dodgebullets:upgrade-seen:${h}`), H) ?? "null");
ok("본 기록이 지금 단계로 바뀐다", stored?.bonus === 18 && stored?.armor === 5, JSON.stringify(stored));

// ── 3) 다시 들어오면 알림 없음 ──
await page.reload({ waitUntil: "networkidle0" });
const again = await watchToast();
ok("다시 들어오면 알림 없음", !again.toasts.some((t) => t.includes("강화 반영")), JSON.stringify(again.toasts));

// ── 4) +0 · 외형 없음 → 빛 없음 ──
await seed({ weaponLevel: 0, levels: {}, armorLevel: 0 });
await sleep(1500);
const z = await look();
ok("+0 은 빛 · 반짝임 없음(바탕 그림자만)", z.grade === 0 && !z.sparkle && !/255, 140, 30|80, 196, 255/.test(z.filter), JSON.stringify({ grade: z.grade, filter: z.filter }));

ok("페이지 오류 없음", errors.length === 0, errors.join(" | "));
await browser.close();
for (const [s, n, d] of results) console.log(`${s} ${n}${d ? " — " + d : ""}`);
const fail = results.filter((r) => r[0] === "FAIL").length;
console.log(fail ? `\n${fail} FAIL` : "\nALL PASS");
process.exit(fail ? 1 : 0);
