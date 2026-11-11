// 보물 동굴 반복 보너스 (2026-11-11, game/treasureRuns.ts) 순수 로직 검사 — 하루 3번 · 날이 바뀌면 다시 · 기본 보상 1.5배.  node scripts/verify-treasure.mjs
import { build } from "esbuild";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd().replace(/\\/g, "/");
const dir = mkdtempSync(join(tmpdir(), "treasure-"));
const entry = join(dir, "entry.ts");
writeFileSync(entry, [`export * as T from "${root}/src/game/treasureRuns";`, `export * as S from "${root}/src/game/stages";`, `export * as PM from "${root}/src/progression/model";`].join("\n"));
const out = join(dir, "bundle.mjs");
await build({ entryPoints: [entry], bundle: true, format: "esm", platform: "node", outfile: out, logLevel: "error", loader: { ".png": "empty", ".webp": "empty", ".css": "empty" }, define: { "import.meta.env.BASE_URL": '"/"', "import.meta.env.DEV": "false", "import.meta.env.PROD": "true" } });
const { T, S, PM } = await import(pathToFileURL(out).href);
rmSync(dir, { recursive: true, force: true });

let fails = 0;
const ok = (name, cond, detail = "") => { console.log(`${cond ? "PASS" : "FAIL"} ${name}${detail ? " — " + detail : ""}`); if (!cond) fails += 1; };
const D1 = "2026-11-11", D2 = "2026-11-12";
let st = T.emptyTreasureRuns();
for (let i = 0; i < 3; i += 1) st = T.spendTreasureRun(st, D1);
ok("하루 3번", T.treasureRunsToday(st, D1) === 3);
ok("네 번째는 그대로(같은 객체)", T.spendTreasureRun(st, D1) === st);
ok("다음 날 다시 1번", T.treasureRunsToday(T.spendTreasureRun(st, D2), D2) === 1 && T.treasureRunsToday(st, D2) === 0);
ok("읽기: 깨진 값 · 범위 밖", T.normalizeTreasureRuns({ day: 3, count: 99 }).count === 3 && T.normalizeTreasureRuns({ day: 3 }).day === "" && T.normalizeTreasureRuns(undefined).count === 0);
const caves = S.BRANCHES.filter((b) => b.kind === "treasure");
const bonus = caves.map((b) => T.treasureBonusGold(S.getStage(b.index).baseReward));
ok("보물 동굴 다섯(장마다 하나)", caves.length === 5, String(caves.length));
ok("보너스 = 그 칸 기본 보상 1.5배 · 깊은 장일수록 많다", caves.every((b, i) => bonus[i] === Math.round(S.getStage(b.index).baseReward * 1.5)) && bonus.every((g, i) => i === 0 || g > bonus[i - 1]), bonus.join(" · "));
ok("새 계정 0번 · 저장 읽기", PM.emptyCharacterProgress().treasureRuns.count === 0 && PM.normalizeCharacterProgress({ treasureRuns: { day: D1, count: 2 } }).treasureRuns.count === 2);
console.log(fails ? `\n${fails}건 실패` : "\n모두 통과");
process.exit(fails ? 1 : 0);
