// 균열 계단 (2026-11-11, titans/riftClimb.ts) 순수 로직 검사 — 단 · 하루 5단 · 대장 체력 · 얼굴 · 보상 · 균열 정산 상한.  node scripts/verify-climb.mjs
import { build } from "esbuild";
import { mkdtempSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd().replace(/\\/g, "/");
const dir = mkdtempSync(join(tmpdir(), "climb-"));
const entry = join(dir, "entry.ts");
writeFileSync(entry, [
  `export * as C from "${root}/src/titans/riftClimb";`,
  `export * as S from "${root}/src/titans/specialFight";`,
  `export * as M from "${root}/src/titans/model";`,
  `export * as B from "${root}/src/titans/bestiary";`,
  `export * as A from "${root}/src/titans/spriteAnim";`,
  `export * as PM from "${root}/src/progression/model";`,
].join("\n"));
const out = join(dir, "bundle.mjs");
await build({ entryPoints: [entry], bundle: true, format: "esm", platform: "node", outfile: out, logLevel: "error", loader: { ".png": "empty", ".webp": "empty", ".css": "empty" }, define: { "import.meta.env.BASE_URL": '"/"', "import.meta.env.DEV": "false", "import.meta.env.PROD": "true" } });
const { C, S, M, B, A, PM } = await import(pathToFileURL(out).href);
rmSync(dir, { recursive: true, force: true });

let fails = 0;
const ok = (name, cond, detail = "") => { console.log(`${cond ? "PASS" : "FAIL"} ${name}${detail ? " — " + detail : ""}`); if (!cond) fails += 1; };
const D1 = "2026-11-11", D2 = "2026-11-12";

// ── 1. 단 · 하루 5단 ──
let st = C.emptyClimb();
ok("처음은 1단 · 오늘 0", st.floor === 1 && C.climbClearsToday(st, D1) === 0 && C.canClimbToday(st, D1));
for (let f = 1; f <= 5; f += 1) st = C.afterClimb(st, f, D1);
ok("하루 5단 오르면 6단 · 더는 못 오른다", st.floor === 6 && C.climbClearsToday(st, D1) === 5 && !C.canClimbToday(st, D1));
ok("6번째는 그대로(같은 객체)", C.afterClimb(st, 6, D1) === st);
ok("다른 단을 깨도 그대로", C.afterClimb(C.emptyClimb(), 3, D1).floor === 1);
const next = C.afterClimb(st, 6, D2);
ok("다음 날 다시 오른다 · 오늘 수 1", next.floor === 7 && C.climbClearsToday(next, D2) === 1 && C.canClimbToday(next, D2));
ok("읽기: 깨진 값 · 범위 밖", C.normalizeClimb({ floor: -3, day: 5, clears: 99 }).floor === 1 && C.normalizeClimb({ clears: 99 }).clears === 5 && C.normalizeClimb(undefined).floor === 1 && C.normalizeClimb({ floor: 12.6, day: D1 }).floor === 12);

// ── 2. 대장 ──
ok("단 f = 사냥터 2f+3 층 대장 (1단 5층 · 10단 23층 · 20단 43층)", C.climbStage(1) === 5 && C.climbStage(10) === 23 && C.climbStage(20) === 43);
ok("체력 = 그 층 대장", [1, 5, 10, 30].every((f) => C.climbHp(f) === M.monsterHp(C.climbStage(f), true)));
ok("단이 오르면 단단해진다", [1, 2, 5, 10, 20, 40].every((f, i, a) => i === 0 || C.climbHp(f) > C.climbHp(a[i - 1])));
const faces = Array.from({ length: 16 }, (_, i) => C.climbFace(i + 1));
ok("얼굴 15종이 지역 순으로 돌고 16단은 처음으로", new Set(faces.slice(0, 15).map((f) => f.art)).size === 15 && faces[15].art === faces[0].art, faces.map((f) => f.art).join(" "));
ok("얼굴 = 그 지역 대장 교대 그림 · 시트 · 썸네일 있음", faces.every((f) => B.huntBossVariant(f.area, f.stage).art === f.art && A.hasMonsterAnim(f.art) && existsSync(`public/titans/generated/monsters/thumbs/${f.art}.webp`)));

// ── 3. 보상 · 균열 정산 ──
ok("강화석 2 + 4단마다 1", C.climbReward(1).stones === 2 && C.climbReward(4).stones === 3 && C.climbReward(20).stones === 7);
ok("보석은 5단마다 10 · 조각은 3단마다 1", C.climbReward(5).gems === 10 && C.climbReward(4).gems === 0 && C.climbReward(3).shards === 1 && C.climbReward(4).shards === 0);
ok("하루 최대 보석 10 (5단에 한 번)", [1, 6, 11, 16].every((start) => Array.from({ length: 5 }, (_, i) => C.climbReward(start + i).gems).reduce((a, b) => a + b, 0) === 10));
ok("균열 정산 단마다 +2% · 15단 넘으면 +30% 에서 멈춘다", C.climbRiftMult({ floor: 1, day: "", clears: 0 }) === 1 && Math.abs(C.climbRiftMult({ floor: 6, day: "", clears: 0 }) - 1.1) < 1e-9 && C.climbRiftMult({ floor: 16, day: "", clears: 0 }) === 1.3 && C.climbRiftMult({ floor: 999, day: "", clears: 0 }) === 1.3);

// ── 4. 특수 대결 ──
const sf = { kind: "climb", floor: 7 };
ok("계단 체력 · 시간 · 이름", S.specialHp(sf, 2) === C.climbHp(7) && S.specialTimeSec(sf, 30) === 30 && S.specialFace(sf, 2).name === C.climbFace(7).name && S.SPECIAL_TITLE.climb === "균열 계단");

// ── 5. 저장 ──
ok("새 계정 1단", PM.emptyCharacterProgress().climb.floor === 1);
ok("저장 읽기", PM.normalizeCharacterProgress({ climb: { floor: 9, day: D1, clears: 2 } }).climb.floor === 9 && PM.normalizeCharacterProgress({}).climb.floor === 1);

console.log(fails ? `\n${fails}건 실패` : "\n모두 통과");
process.exit(fails ? 1 : 0);
