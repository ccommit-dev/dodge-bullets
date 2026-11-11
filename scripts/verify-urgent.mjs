// 사냥터 긴급 의뢰 (2026-11-10) 순수 로직 검사 — 하루 세 번 · 15분 마감 · 층 비례 난이도 · 보상.  node scripts/verify-urgent.mjs
import { build } from "esbuild";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd().replace(/\\/g, "/");
const dir = mkdtempSync(join(tmpdir(), "urgent-"));
const entry = join(dir, "entry.ts");
writeFileSync(entry, [
  `export * as U from "${process.env.URGENT_SRC ?? `${root}/src/titans/urgent`}";`,
  `export * as M from "${root}/src/titans/model";`,
  `export * as B from "${root}/src/titans/bestiary";`,
  `export * as P from "${root}/src/titans/bossPressure";`,
].join("\n"));
const out = join(dir, "bundle.mjs");
await build({ entryPoints: [entry], bundle: true, format: "esm", platform: "node", outfile: out, logLevel: "error", define: { "import.meta.env.BASE_URL": '"/"', "import.meta.env.DEV": "false", "import.meta.env.PROD": "true" } });
const { U, M, B, P } = await import(pathToFileURL(out).href);
rmSync(dir, { recursive: true, force: true });

let fails = 0;
const ok = (name, cond, detail = "") => { console.log(`${cond ? "PASS" : "FAIL"} ${name}${detail ? " — " + detail : ""}`); if (!cond) fails += 1; };
const DAY = "2026-11-10", NEXT = "2026-11-11", T0 = 1_800_000_000_000, MIN = 60_000;

// ── 1. 붙이기 · 마감 ──
const s0 = U.emptyUrgent();
ok("처음엔 받을 의뢰가 없다", U.activeUrgent(s0, T0, DAY) === null);
const s1 = U.issueUrgent(s0, "login", T0, DAY);
ok("붙이면 15분 마감으로 뜬다", U.activeUrgent(s1, T0, DAY)?.kind === "login" && U.activeUrgent(s1, T0, DAY)?.deadline === T0 + 15 * MIN);
ok("같은 종류는 하루 한 번 — 다시 붙여도 그대로(같은 객체)", U.issueUrgent(s1, "login", T0 + 5 * MIN, DAY) === s1);
ok("마감 1초 전엔 있고 마감에는 없다", U.activeUrgent(s1, T0 + 15 * MIN - 1000, DAY) !== null && U.activeUrgent(s1, T0 + 15 * MIN, DAY) === null);
ok("마감이 지난 줄은 '놓침'", U.urgentSlot(s1, "login", T0 + 16 * MIN, DAY) === "missed" && U.urgentSlot(s1, "login", T0, DAY) === "open" && U.urgentSlot(s1, "idle", T0, DAY) === "none");
const s2 = U.issueUrgent(s1, "idle", T0 + 4 * MIN, DAY);
ok("둘이 겹치면 마감이 가까운 것부터", U.activeUrgent(s2, T0 + 5 * MIN, DAY)?.kind === "login");
const s3 = U.completeUrgent(s2, "login", DAY);
ok("잡으면 다음 의뢰가 뜬다", s3.done.join() === "login" && U.activeUrgent(s3, T0 + 5 * MIN, DAY)?.kind === "idle" && U.urgentSlot(s3, "login", T0 + 5 * MIN, DAY) === "done");
ok("두 번 잡을 수 없다(같은 객체)", U.completeUrgent(s3, "login", DAY) === s3);
ok("붙지 않은 의뢰는 잡을 수 없다", U.completeUrgent(s0, "boss", DAY) === s0 && U.completeUrgent(s1, "boss", DAY) === s1);
ok("마감 뒤에 끝난 싸움도 인정한다", U.completeUrgent(s1, "login", DAY).done.join() === "login");

// ── 2. 대장 세 번 ──
let b = s0;
b = U.countUrgentBoss(b, T0, DAY);
b = U.countUrgentBoss(b, T0 + MIN, DAY);
ok("대장 두 번까지는 안 붙는다", b.bossKills === 2 && b.issued.boss === undefined);
b = U.countUrgentBoss(b, T0 + 2 * MIN, DAY);
ok("세 번째에 붙는다", b.bossKills === 3 && b.issued.boss === T0 + 2 * MIN);
const b4 = U.countUrgentBoss(b, T0 + 9 * MIN, DAY);
ok("네 번째에 다시 붙지 않는다(마감도 그대로)", b4.bossKills === 4 && b4.issued.boss === T0 + 2 * MIN);

// ── 3. 날이 바뀌면 ──
const done3 = ["login", "idle", "boss"].reduce((st, k) => U.completeUrgent(U.issueUrgent(st, k, T0, DAY), k, DAY), U.emptyUrgent());
ok("하루 최대 셋", done3.done.length === 3 && U.activeUrgent(done3, T0 + MIN, DAY) === null);
const tomorrow = U.issueUrgent(done3, "login", T0 + 24 * 60 * MIN, NEXT);
ok("다음 날 다시 붙는다 · 어제 기록은 비운다", tomorrow.day === NEXT && tomorrow.done.length === 0 && tomorrow.bossKills === 0 && U.activeUrgent(tomorrow, T0 + 24 * 60 * MIN, NEXT)?.kind === "login");
ok("어제 붙은 의뢰는 오늘 뜨지 않는다", U.activeUrgent(s1, T0 + MIN, NEXT) === null && U.urgentSlot(s1, "login", T0 + MIN, NEXT) === "none");
ok("다음 날 대장 수는 1부터", U.countUrgentBoss(b4, T0 + 24 * 60 * MIN, NEXT).bossKills === 1);

// ── 4. 저장 읽기 ──
const n = U.normalizeUrgent({ day: "2026-11-10", issued: { login: T0, idle: "x", hack: 5 }, done: ["login", "idle", "boss", "zzz"], bossKills: 2.7 });
ok("읽기: 모르는 종류 · 깨진 값은 버린다", Object.keys(n.issued).join() === "login" && n.done.join() === "login" && n.bossKills === 2, JSON.stringify(n));
ok("읽기: 없거나 깨진 기록은 빈 기록", JSON.stringify(U.normalizeUrgent(undefined)) === JSON.stringify(U.emptyUrgent()) && U.normalizeUrgent({ day: 5 }).day === "" && U.normalizeUrgent("x").done.length === 0);
ok("읽기: 음수 · 무한대 대장 수는 0", U.normalizeUrgent({ bossKills: -4 }).bossKills === 0 && U.normalizeUrgent({ bossKills: Infinity }).bossKills === 0);

// ── 5. 난이도 — 지금 층에 비례 · 이전 대장을 이긴 화력이면 이긴다 ──
const STAGES = [5, 6, 10, 11, 15, 16, 23, 24, 40, 60, 100, 200];
ok("체력 = 아래 층 대장의 55%", STAGES.every((s) => U.urgentHp(s) === Math.max(8, Math.floor(M.monsterHp(s - 1, true) * 0.55))));
ok("층이 오르면 체력도 오른다", STAGES.slice(1).every((s, i) => U.urgentHp(s) > U.urgentHp(STAGES[i])));
ok("시간 = 대장 시간의 2/3 (30초 → 20초 · 45초 → 30초 · 하한 10초)", U.urgentTimeSec(30) === 20 && U.urgentTimeSec(45) === 30 && U.urgentTimeSec(3) === 10);
// 아래 층 대장을 제한 시간에 딱 맞춰 잡는 화력(가장 약한 통과자) — 원정대가 버티는 시간 안에 현상범을 잡는가
const weakest = STAGES.map((s) => {
  const T = M.BOSS_TIME_SEC, dps = M.monsterHp(s - 1, true) / (T * Math.sqrt(P.bossPressureScale(s - 1)));
  const kill = U.urgentHp(s) / dps, survive = U.urgentTimeSec(T) * Math.sqrt(P.bossPressureScale(s));
  return { s, kill, survive };
});
ok("아래 층 대장을 겨우 잡은 화력으로도 이긴다(버티는 시간의 85% 안)", weakest.every((w) => w.kill <= w.survive * 0.85), weakest.map((w) => `${w.s}층 ${w.kill.toFixed(1)}/${w.survive.toFixed(1)}초`).join(" · "));
ok("그렇다고 한 대에 끝나지는 않는다(같은 화력으로 8초 이상)", weakest.every((w) => w.kill >= 8), weakest.map((w) => w.kill.toFixed(1)).join(" "));
const needRate = STAGES.map((s) => (U.urgentHp(s) / U.urgentTimeSec(M.BOSS_TIME_SEC)) / (M.monsterHp(s, true) / M.BOSS_TIME_SEC));
// 5층은 아래 층(4층)이 첫 세션 감쇠 구간이라 더 쉽다
ok("지금 층 대장에 드는 화력의 55~65% (5층은 그보다 쉽다)", needRate.every((r, i) => r < 0.65 && (STAGES[i] < 6 || r > 0.55)), needRate.map((r) => r.toFixed(3)).join(" "));

// ── 6. 얼굴 — 같은 지역의 다른 대장 ──
const faces = STAGES.concat([1, 2, 3, 7, 12, 17, 25, 26]).map((s) => ({ s, area: M.huntingArea(s), now: B.huntBossVariant(M.huntingArea(s), s), urgent: U.urgentFace(s), faceStage: U.urgentFaceStage(s) }));
ok("그 층 대장과 다른 얼굴", faces.every((f) => f.urgent.art !== f.now.art), faces.map((f) => `${f.s}:${f.urgent.art}`).join(" "));
ok("같은 지역 얼굴", faces.every((f) => B.HUNT_BOSSES[f.area.id].some((d) => d.art === f.urgent.art)));
ok("얼굴 고르는 층 번호도 그 지역 안", faces.every((f) => f.faceStage >= f.area.stageFrom && f.faceStage <= f.area.stageTo && M.huntingArea(f.faceStage).id === f.area.id));

// ── 7. 보상 ──
const lap = (s) => M.MOBS_PER_STAGE * M.killGold(s, false, false) + M.killGold(s, true, false) + M.stageClearBonus(s);
ok("골드 = 지금 층 다섯 바퀴", STAGES.every((s) => U.urgentReward(s).gold === Math.floor(5 * lap(s))), STAGES.map((s) => `${s}층 ${M.formatGold(U.urgentReward(s).gold)}`).join(" · "));
ok("강화석 3 + 10층마다 1 · 이벤트 코인 5", U.urgentReward(5).stones === 3 && U.urgentReward(10).stones === 4 && U.urgentReward(60).stones === 9 && U.urgentReward(60).coins === 5);
ok("보상은 층이 오르면 줄지 않는다", STAGES.slice(1).every((s, i) => U.urgentReward(s).gold >= U.urgentReward(STAGES[i]).gold && U.urgentReward(s).stones >= U.urgentReward(STAGES[i]).stones));

// ── 8. 표시 ──
ok("남은 시간 표기", U.formatUrgentLeft(15 * MIN) === "15:00" && U.formatUrgentLeft(61_000) === "1:01" && U.formatUrgentLeft(500) === "0:01" && U.formatUrgentLeft(-5) === "0:00");
ok("조건 이름 셋", U.URGENT_KINDS.length === 3 && U.URGENT_KINDS.every((k) => U.URGENT_LABEL[k].length > 0));

console.log(fails ? `\n${fails}건 실패` : "\n모두 통과");
process.exit(fails ? 1 : 0);
