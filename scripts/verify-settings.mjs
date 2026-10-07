/**
 * 설정 메뉴 — 항목마다 폰 터치로 눌러 실제로 반응하는지 (2026-10-02, 사용자: "설정쪽에 동작하지 않는 기능들 이어서 수정").
 *   · 빌드 표기 탭 → 빌드 정보 토스트 (예전: 무반응)
 *   · 오류 로그 0건 → 안내 토스트 (예전: 비활성) · 클립보드가 막히면 직접 복사 창
 *   · 카페 주소가 없는 빌드엔 '카페 글 가기' 가 없다 (예전: '준비 중' 비활성)
 *   · 게임 종료(웹) → 종료 화면 (예전: 무반응)
 *   · 출석 30일 판 · 30일째를 받으면 메뉴와 자동 열기에서 사라진다
 *   node scripts/verify-settings.mjs   (dev 서버 5173 필요)
 */
import { launchBrowser } from "./launch-browser.mjs";
const BASE = "http://localhost:5173", H = "mock-local-dev";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const ok = (name, cond, detail = "") => results.push([cond ? "PASS" : "FAIL", name, detail]);
const browser = await launchBrowser({ args: ["--no-sandbox", "--disable-gpu"] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errors = []; page.on("pageerror", (e) => errors.push(String(e.message).slice(0, 160)));
const now = Date.now();
const day = (offset) => new Date(Date.now() + offset * 86_400_000).toLocaleDateString("sv-SE");

async function seed(attendance, extra = {}) {
  await page.goto(BASE, { waitUntil: "networkidle0" });
  await page.evaluate((h, now, attendance, extra) => {
    localStorage.clear();
    localStorage.setItem(`dodgebullets:progression:v1:${h}`, JSON.stringify({ version: 5, onboardingStep: 4, level: 20, exp: 1000, attendanceStreak: 2, redGems: 100, sharedCoins: 50000, idleClaimedAt: now, updatedAt: now, partyIds: ["mia"], partyCap: 4, towerTickets: 0 }));
    localStorage.setItem(`dodgebullets:titans:${h}`, JSON.stringify({ stage: 6, bestStage: 6, gold: 20000, heroes: { mia: 5 }, lastActiveAt: now }));
    localStorage.setItem("dodge-bullets:soundEnabled", "0");
    if (attendance) localStorage.setItem(`dodgebullets:attendance:v1:${h}`, JSON.stringify(attendance));
    for (const [k, v] of Object.entries(extra)) localStorage.setItem(k, v);
  }, H, now, attendance, extra);
  await page.goto(BASE, { waitUntil: "networkidle0" });
  await sleep(2600);
}
const state = () => page.evaluate(() => ({
  attendance: document.querySelector(".attendance-modal")?.textContent ?? "",
  tiles: document.querySelectorAll(".attendance-modal .attendance-grid > div").length,
  toast: document.querySelector(".settings-copy-toast")?.textContent ?? "",
  menu: [...document.querySelectorAll(".settings-menu button")].map((b) => b.textContent.trim().replace(/\s+/g, " ") + (b.disabled ? "[disabled]" : "")),
  closed: !!document.querySelector(".game-closed"),
  logModal: document.querySelector(".error-log-modal textarea")?.value ?? "",
  profile: !![...document.querySelectorAll("h1")].find((h) => h.textContent.trim() === "마이페이지"),
}));
const tap = async (sel, text) => {
  const box = await page.evaluate(({ sel, text }) => { const el = [...document.querySelectorAll(sel)].find((b) => b.textContent.includes(text)); if (!el) return null; el.scrollIntoView({ block: "center" }); const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }, { sel, text });
  if (!box) return false;
  await page.touchscreen.tap(box.x, box.y); return true;
};
const closeIdle = () => page.evaluate(() => { for (let k = 0; k < 4; k += 1) { const c = document.querySelector(".idle-claim"); if (c) c.click(); } });
const openMenu = async () => { if (!(await page.evaluate(() => !!document.querySelector(".settings-menu")))) { await tap("button", "설정"); await sleep(400); } };

const gemsNow = () => page.evaluate((h) => JSON.parse(localStorage.getItem(`dodgebullets:progression:v1:${h}`)).redGems, H);
// 1) 출석: 첫날 자동으로 30일 판이 뜬다 (개발 서버의 '보석 무제한' 테스트 모드가 보석을 채워 두므로 지급 전후 차이로 잰다)
await seed(null);
let s = await state();
ok("부팅 때 30일 출석 판이 자동으로 뜬다 (30칸 · 제목)", s.tiles === 30 && s.attendance.includes("30일 출석"), `칸 ${s.tiles}`);
let g0 = await gemsNow();
await tap(".attendance-modal button", "DAY 1 보상 받기"); await sleep(900);
let p = await page.evaluate((h) => JSON.parse(localStorage.getItem(`dodgebullets:progression:v1:${h}`)), H);
const att = await page.evaluate((h) => JSON.parse(localStorage.getItem(`dodgebullets:attendance:v1:${h}`)), H);
ok("DAY 1 수령 → 보석 +20 · 누적 1일", p.redGems - g0 === 20 && att.totalDays === 1, `gems +${p.redGems - g0} total ${att.totalDays}`);
await closeIdle(); await sleep(300);

// 2) 메뉴 항목 반응
await openMenu();
s = await state();
ok("메뉴에 비활성(고장처럼 보이는) 항목이 없다 · 카페 주소가 없으면 '카페 글 가기' 없음", !s.menu.some((m) => m.includes("[disabled]")) && !s.menu.some((m) => m.includes("카페")), s.menu.join(" | "));
ok("출석 메뉴는 '30일' 판", s.menu.some((m) => m.startsWith("출석 이벤트30일")), s.menu.join(" | "));
// 화면 방향 (2026-10-07) — 세로 → 자동 → 가로 순환, 저장 · 다음 부팅에도 유지
ok("메뉴에 '화면 방향' 항목 · 기본 세로", s.menu.some((m) => m.startsWith("화면 방향세로")), s.menu.filter((m) => m.startsWith("화면 방향")).join());
await tap(".settings-menu button", "화면 방향"); await sleep(300);
const oriAuto = await page.evaluate(() => ({ label: document.querySelector(".settings-orientation b")?.textContent, stored: localStorage.getItem("dodgebullets:orientation") }));
ok("화면 방향 탭 → 자동 · localStorage 에 저장", oriAuto.label === "자동" && oriAuto.stored === "auto", JSON.stringify(oriAuto));
await tap(".settings-menu button", "화면 방향"); await sleep(300);
const oriLand = await page.evaluate(() => ({ label: document.querySelector(".settings-orientation b")?.textContent, stored: localStorage.getItem("dodgebullets:orientation") }));
ok("한 번 더 → 가로", oriLand.label === "가로" && oriLand.stored === "landscape", JSON.stringify(oriLand));
await tap(".settings-menu button", "화면 방향"); await sleep(300);
ok("한 번 더 → 세로(처음으로)", await page.evaluate(() => localStorage.getItem("dodgebullets:orientation") === "portrait"));
await tap(".settings-menu button", "비버 키우기"); await sleep(300);
s = await state();
ok("빌드 표기를 탭하면 빌드 정보 토스트", /빌드 2026/.test(s.toast), s.toast);
await openMenu();
await tap(".settings-menu button", "오류 로그 복사"); await sleep(300);
s = await state();
ok("오류 로그 0건 → '기록된 오류가 없습니다' 안내", s.toast.includes("기록된 오류가 없습니다"), s.toast);
// 클립보드를 막은 브라우저(인앱 등) — 직접 복사 창
await page.evaluate(() => {
  localStorage.setItem("dodgebullets:errorlog:v1", JSON.stringify([{ at: new Date().toISOString(), kind: "error", message: "테스트 오류" }]));
  Object.defineProperty(navigator, "clipboard", { value: { writeText: () => Promise.reject(new Error("blocked")) }, configurable: true });
  document.execCommand = () => false;
});
await sleep(2300);
await openMenu();
await tap(".settings-menu button", "오류 로그 복사"); await sleep(500);
s = await state();
ok("클립보드가 막히면 오류 로그를 직접 복사하는 창이 뜬다", s.logModal.includes("테스트 오류"), s.logModal.slice(0, 80) || s.toast);
await tap(".error-log-modal button", "닫기"); await sleep(300);
await openMenu();
await tap(".settings-menu button", "마이페이지"); await sleep(1200);
s = await state();
ok("마이페이지가 열린다", s.profile);
await page.goto(BASE, { waitUntil: "networkidle0" }); await sleep(2400); await closeIdle(); await sleep(300);
s = await state();
ok("오늘 이미 받았으면 출석 판이 자동으로 뜨지 않는다", s.tiles === 0);
await openMenu();
await tap(".settings-menu button", "게임 종료"); await sleep(400);
await tap(".exit-modal button", "종료하기"); await sleep(1000);
s = await state();
ok("웹에서 게임 종료 → 종료 화면(다시 시작)", s.closed);

// 3) 30일째를 받으면 메뉴·자동 열기에서 사라진다
await seed({ lastClaimDate: day(-1), lastClaimTimestamp: now - 86_400_000, consecutiveDays: 5, boardIndex: 29, totalDays: 29 });
s = await state();
ok("29일 받은 계정 → DAY 30 판이 뜬다", s.attendance.includes("DAY 30 보상 받기"), s.attendance.slice(0, 60));
g0 = await gemsNow();
await tap(".attendance-modal button", "DAY 30 보상 받기"); await sleep(900);
p = await page.evaluate((h) => JSON.parse(localStorage.getItem(`dodgebullets:progression:v1:${h}`)), H);
ok("DAY 30 → 용린 견갑 + 보석 160", p.ownedShoulders?.includes("dragon") && p.redGems - g0 === 160, `gems +${p.redGems - g0} ${JSON.stringify(p.ownedShoulders)}`);
await closeIdle(); await sleep(300);
await openMenu();
s = await state();
ok("30일을 다 받으면 설정 메뉴에서 출석이 사라진다", !s.menu.some((m) => m.includes("출석")), s.menu.join(" | "));
await page.evaluate((h) => { const a = JSON.parse(localStorage.getItem(`dodgebullets:attendance:v1:${h}`)); a.lastClaimDate = "2000-01-01"; localStorage.setItem(`dodgebullets:attendance:v1:${h}`, JSON.stringify(a)); }, H);
await page.goto(BASE, { waitUntil: "networkidle0" }); await sleep(2400);
s = await state();
ok("다음 날에도 끝난 출석은 자동으로 뜨지 않는다", s.tiles === 0);

ok("페이지 오류 없음", errors.length === 0, errors.join(" | "));
for (const [st, n, d] of results) console.log(st, n, d ? "— " + d : "");
const fails = results.filter((r) => r[0] === "FAIL").length;
console.log(fails === 0 ? "\nALL PASS" : `\n${fails} FAIL`);
await browser.close();
process.exit(fails ? 1 : 0);
