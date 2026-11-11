// 핫타임 보급 (2026-11-11, events/hotTime.ts) 순수 로직 검사 — 창 · 다음 창 · 받은 표시 · 보석 상한.  node scripts/verify-hottime.mjs
import { build } from "esbuild";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd().replace(/\\/g, "/");
const dir = mkdtempSync(join(tmpdir(), "hottime-"));
const entry = join(dir, "entry.ts");
writeFileSync(entry, [
  `export * as H from "${process.env.HOTTIME_SRC ?? `${root}/src/events/hotTime`}";`,
  `export * as E from "${root}/src/events/eventSave";`,
].join("\n"));
const out = join(dir, "bundle.mjs");
await build({ entryPoints: [entry], bundle: true, format: "esm", platform: "node", outfile: out, logLevel: "error", define: { "import.meta.env.BASE_URL": '"/"', "import.meta.env.DEV": "false", "import.meta.env.PROD": "true" } });
const { H, E } = await import(pathToFileURL(out).href);
rmSync(dir, { recursive: true, force: true });

let fails = 0;
const ok = (name, cond, detail = "") => { console.log(`${cond ? "PASS" : "FAIL"} ${name}${detail ? " — " + detail : ""}`); if (!cond) fails += 1; };
const at = (h, m = 0, d = 11) => new Date(2026, 10, d, h, m, 0, 0);
const DAY = "2026-11-11";

// ── 1. 창 ──
ok("12:00 점심 열림 · 13:59 까지", H.activeHotTime(at(12))?.id === "lunch" && H.activeHotTime(at(13, 59))?.id === "lunch");
ok("14:00 · 11:59 · 18:59 닫힘", H.activeHotTime(at(14)) === null && H.activeHotTime(at(11, 59)) === null && H.activeHotTime(at(18, 59)) === null);
ok("19:00 저녁 열림 · 21:59 까지 · 22:00 닫힘", H.activeHotTime(at(19))?.id === "evening" && H.activeHotTime(at(21, 59))?.id === "evening" && H.activeHotTime(at(22)) === null);
ok("창은 겹치지 않는다", H.HOT_TIME_WINDOWS.every((w, i) => H.HOT_TIME_WINDOWS.every((v, j) => i === j || w.endHour <= v.startHour || v.endHour <= w.startHour)));

// ── 2. 다음 창 ──
const n1 = H.nextHotTime(at(9, 30));
ok("아침 → 오늘 12시", n1.window.id === "lunch" && !n1.tomorrow && n1.at.getHours() === 12 && n1.at.getDate() === 11);
const n2 = H.nextHotTime(at(15));
ok("오후 → 오늘 19시", n2.window.id === "evening" && !n2.tomorrow && n2.at.getHours() === 19);
const n3 = H.nextHotTime(at(22, 30));
ok("밤 → 내일 12시", n3.window.id === "lunch" && n3.tomorrow && n3.at.getDate() === 12 && n3.at.getHours() === 12);
const n4 = H.nextHotTime(at(12, 30));
ok("점심 중 → 다음은 저녁", n4.window.id === "evening" && !n4.tomorrow);

// ── 3. 받은 표시 ──
ok("안 받았으면 받을 수 있다", H.claimableHotTime([], DAY, at(12, 10))?.id === "lunch");
const claimed = [H.hotTimeClaimKey("lunch", DAY)];
ok("받은 창은 다시 못 받는다", H.claimableHotTime(claimed, DAY, at(13)) === null);
ok("점심을 받아도 저녁은 받는다", H.claimableHotTime(claimed, DAY, at(19, 5))?.id === "evening");
ok("창 밖에선 못 받는다", H.claimableHotTime([], DAY, at(15)) === null);
ok("어제 받은 표시는 오늘과 무관", H.claimableHotTime([H.hotTimeClaimKey("lunch", "2026-11-10")], DAY, at(12, 1))?.id === "lunch");

// ── 4. 날이 바뀌면 표시를 비운다 (eventSave) ──
const save = { ...E.emptyEventSave(), date: "2026-11-10", claimed: [H.hotTimeClaimKey("evening", "2026-11-10"), "weekly:x"] };
const norm = E.normalizeEventSave(save);
ok("어제 핫타임 표시는 지워진다(쌓이지 않는다)", !norm.claimed.some((k) => k.startsWith("hottime:")), JSON.stringify(norm.claimed));

// ── 5. 보상 크기 ──
const gems = H.HOT_TIME_WINDOWS.reduce((s, w) => s + w.gems, 0);
ok("보석 하루 15 이하 (무과금 하루 약 73 의 20% 남짓)", gems <= 15, String(gems));
ok("창마다 강화석 · 이벤트 코인", H.HOT_TIME_WINDOWS.every((w) => w.stones > 0 && w.eventCoins > 0));
ok("시간 표기", H.hotTimeHours(H.HOT_TIME_WINDOWS[0]) === "12~14시");

console.log(fails ? `\n${fails}건 실패` : "\n모두 통과");
process.exit(fails ? 1 : 0);
