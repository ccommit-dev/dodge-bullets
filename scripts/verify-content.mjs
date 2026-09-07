/**
 * 콘텐츠 설계 단언 (docs/CONTENT_BEAT_DODGE_PLAN.md) — 비트 난이도 레벨 · 화살 원정 검격 규칙. 순수 시뮬, 브라우저 불필요.
 *   node scripts/verify-content.mjs
 */
import { build } from "esbuild";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd().replace(/\\/g, "/");
const dir = mkdtempSync(join(tmpdir(), "content-"));
const entry = join(dir, "entry.ts");
writeFileSync(entry, [
  `export * as tracks from "${root}/src/beat/tracks";`,
  `export * as rpg from "${root}/src/beat/rpg";`,
  `export * as bworld from "${root}/src/beat/world";`,
  `export * as arrows from "${root}/src/game/arrows";`,
  `export * as world from "${root}/src/game/world";`,
  `export * as shop from "${root}/src/game/shop";`,
  `export * as input from "${root}/src/game/input";`,
].join("\n"));
const out = join(dir, "bundle.mjs");
await build({ entryPoints: [entry], bundle: true, format: "esm", outfile: out, platform: "node", define: { "import.meta.env.BASE_URL": '"/"', "import.meta.env.DEV": "false", "import.meta.env.PROD": "true" } });
// 브라우저 전용 전역 최소 스텁 (Image/Audio 등은 모듈 최상위에서 안 쓰이지만 안전망)
globalThis.window ??= { setTimeout, clearTimeout, addEventListener() {}, removeEventListener() {} };
globalThis.document ??= { createElement: () => ({ getContext: () => null, style: {} }) };
globalThis.Image ??= class { set src(_v) {} };
const { tracks, rpg, arrows, world, shop, input } = await import(pathToFileURL(out).href);
rmSync(dir, { recursive: true, force: true });

const results = [];
const ok = (name, cond, detail = "") => results.push([cond ? "PASS" : "FAIL", name, detail]);

// ── 비트: 레벨 사다리 ──
const T = tracks.BEAT_TRACKS;
ok("비트 16곡 · 레벨 1~10 · 사다리 오름차순", T.length === 16 && T.every((t) => t.level >= 1 && t.level <= 10) && T.every((t, i) => i === 0 || t.level >= T[i - 1].level), T.map((t) => `${t.id}:${t.level}`).join(" "));
ok("첫 곡 = 레벨 1 (black-city-beat) · 마지막 = 레벨 10 (strawberry-lemonade)", T[0].id === "black-city-beat" && T[T.length - 1].id === "strawberry-lemonade");
ok("판정 임계: EASY < NORMAL < HARD", tracks.JUDGE_THRESHOLDS.easy[0] < tracks.JUDGE_THRESHOLDS.medium[0] && tracks.JUDGE_THRESHOLDS.medium[0] < tracks.JUDGE_THRESHOLDS.hard[0]);
ok("등급 S/A/B/C 경계 90/75/55", tracks.gradeOf(0.9) === "S" && tracks.gradeOf(0.89) === "A" && tracks.gradeOf(0.75) === "A" && tracks.gradeOf(0.6) === "B" && tracks.gradeOf(0.5) === "C");
// 같은 곡 난이도 변형별 노트 수 (스파이크 수) — EASY < NORMAL < HARD
const base = T.find((t) => t.id === "azure-sky");
const notes = (difficulty) => tracks.buildChart({ ...base, difficulty, subdivision: difficulty === "easy" ? 4 : difficulty === "medium" ? 8 : 16 }).filter((st) => st.spike).length;
const nE = notes("easy"), nM = notes("medium"), nH = notes("hard");
ok("azure-sky 노트 수 EASY < NORMAL < HARD", nE < nM && nM < nH, `${nE} < ${nM} < ${nH}`);
// 등급 저장 · HARD 해금
const p0 = rpg.emptyBeatRpg();
const pB = rpg.applyLessonClear(p0, base, { perfectRatio: 0.6, isSpar: false, difficulty: "medium" });
ok("NORMAL B 클리어 → grades[azure-sky:medium]=B · HARD 잠김", pB.grades["azure-sky:medium"] === "B" && !rpg.hardUnlocked(pB, base));
const pA = rpg.applyLessonClear(pB, base, { perfectRatio: 0.8, isSpar: false, difficulty: "medium" });
ok("NORMAL A → HARD 해금 · 등급은 최고만 유지(다시 C여도 A)", rpg.hardUnlocked(pA, base) && rpg.applyLessonClear(pA, base, { perfectRatio: 0.3, isSpar: false, difficulty: "medium" }).grades["azure-sky:medium"] === "A");
ok("hard 기본 곡은 HARD 즉시 열림", rpg.hardUnlocked(p0, T.find((t) => t.difficulty === "hard")));
ok("정규화: 잘못된 등급 값 제거", Object.keys(rpg.normalizeBeatRpg({ grades: { "x:easy": "S", "y:hard": "Z" } }).grades).join() === "x:easy");

// ── 화살 원정: 검격 규칙 ──
ok("스윙 호 ±110°: 정면 O · 정면 위쪽 O · 뒤 X", arrows.inSwingArc(1, 10, 0) && arrows.inSwingArc(1, 2, -10) && !arrows.inSwingArc(1, -10, 0) && arrows.inSwingArc(-1, -10, 0));
const mk = () => { const w = world.createWorld(390, 700, 1); world.applyStats(w, shop.statsFromLevels(shop.emptyShopLevels())); world.resetRun(w, 0); return w; };
let w = mk();
const st = w.stats;
ok("검격 쿨다운 1,150ms(강화 0) — 예전 1,750 보다 짧다", st.slowCooldownMs === 1150, `${st.slowCooldownMs}`);
// 정타 반사: 화살을 플레이어 코앞 정면에 두고 스윙 시작 프레임에 갱신
const inp = input.createInputState();
const place = (dist, fromRight = true) => { const a = w.arrows[0]; a.active = true; a.reflected = false; a.splitLevel = 0; a.warningMs = 0; a.splitGraceMs = 0; a.boss = false; a.kind = "normal"; a.x = w.player.x + (fromRight ? dist : -dist); a.y = w.player.y; a.vx = fromRight ? -300 : 300; a.vy = 0; a.angle = Math.atan2(a.vy, a.vx); a.damage = 1; a.hitRadius = 5; return a; };
w.player.facing = 1;
let a = place(w.player.radius + 5 + 10);
inp.slowPressed = true;
world.updateWorld(w, 0.016, true, inp);
ok("코앞(정타)에서 스윙 → 반사(금색·무해) · 게이지 +22 · 반사 화살은 오른쪽으로", a.active && a.reflected && a.damage === 0 && a.vx > 0 && w.slashGauge === 22 && w.lastCut === "reflect", `gauge=${w.slashGauge} vx=${a.vx.toFixed(0)}`);
// 반사 화살이 화면 밖 → 처치
a.x = w.width + 100;
world.updateWorld(w, 0.016, true, input.createInputState());
ok("반사 화살 화면 밖 → 궁수 처치 +1 · 보급 +2", !a.active && w.reflectKills === 1 && w.enemyKills >= 1 && w.supplies >= 2, `kills=${w.enemyKills} supplies=${w.supplies}`);
// 파쇄: 멀리서(반경 안·정타 밖) 스윙
w = mk(); w.player.facing = 1;
a = place(60);
const supBefore = w.supplies;
world.updateWorld(w, 0.016, true, Object.assign(input.createInputState(), { slowPressed: true }));
ok("반경 안·정타 밖에서 스윙 → 파쇄(소멸) · 보급 +1 · 게이지 +9", !a.active && w.supplies === supBefore + 1 && w.slashGauge === 9 && w.lastCut === "shatter");
// 뒤쪽 화살은 못 벤다
w = mk(); w.player.facing = 1;
a = place(60, false);
world.updateWorld(w, 0.016, true, Object.assign(input.createInputState(), { slowPressed: true }));
ok("뒤에서 오는 화살은 스윙에 안 잘린다(시간 지연만)", a.active && !a.reflected && w.slashGauge === 0);
// 스윙 창(320ms)이 지난 뒤 반경 안 화살은 안 잘린다
w = mk(); w.player.facing = 1;
world.updateWorld(w, 0.016, true, Object.assign(input.createInputState(), { slowPressed: true }));
for (let i = 0; i < 25; i += 1) world.updateWorld(w, 0.016, true, input.createInputState()); // 0.4s 경과
a = place(60);
world.updateWorld(w, 0.016, true, input.createInputState());
ok("스윙 창(320ms) 이후엔 베지 않는다 — 지속 시간 중이라도", a.active && w.slashGauge === 0 && w.player.slowActiveMs > 0, `slowActive=${w.player.slowActiveMs.toFixed(0)}`);
// 일섬: 게이지 100 → 화면 정리 + 시간 지연
w = mk(); w.slashGauge = 95;
for (let i = 1; i <= 4; i += 1) { const b = w.arrows[i]; b.active = true; b.reflected = false; b.boss = false; b.warningMs = 0; b.x = 50 + i * 60; b.y = 100; b.vx = 0; b.vy = 200; b.splitLevel = 0; }
w.player.facing = 1;
a = place(60);
world.updateWorld(w, 0.016, true, Object.assign(input.createInputState(), { slowPressed: true }));
ok("게이지 100 도달 → 일섬: 화면 화살 전부 파쇄 · 게이지 0 · 섬광 · 1.2초 시간 지연", w.ultCount === 1 && w.slashGauge === 0 && [1, 2, 3, 4].every((i) => !w.arrows[i].active) && w.ultFlashMs > 0 && w.player.slowActiveMs >= 1200, `ult=${w.ultCount} gauge=${w.slashGauge}`);

// ── 비트: 구간 밀도 곡선 · 프레이즈 필 (마저 개발) ──
{
  const dens = (difficulty, section) => { const ch = tracks.buildChart({ ...base, difficulty, subdivision: difficulty === "easy" ? 4 : difficulty === "medium" ? 8 : 16 }); const st = ch.filter((x) => x.section === section); return st.filter((x) => x.spike).length / Math.max(1, st.length); };
  const intro = dens("medium", "intro"), buildD = dens("medium", "build"), drop = dens("medium", "drop"), brk = dens("medium", "break");
  ok("NORMAL 구간 밀도: 인트로 < 빌드업 < 드롭 · 브레이크 < 드롭", intro < buildD && buildD < drop && brk < drop, `intro ${intro.toFixed(2)} build ${buildD.toFixed(2)} drop ${drop.toFixed(2)} break ${brk.toFixed(2)}`);
  // 스텝 비율은 16분할에서 초당 노트 상한(bpmKeep) 때문에 떨어진다 — 마디당 노트 수로 비교한다
  const perBarDrop = (difficulty) => dens(difficulty, "drop") * (difficulty === "easy" ? 4 : difficulty === "medium" ? 8 : 16);
  ok("드롭 마디당 노트: EASY < NORMAL < HARD", perBarDrop("easy") < perBarDrop("medium") && perBarDrop("medium") < perBarDrop("hard"), `${perBarDrop("easy").toFixed(1)} < ${perBarDrop("medium").toFixed(1)} < ${perBarDrop("hard").toFixed(1)}`);
  // 프레이즈 필: HARD 드롭에서 4마디째 마디의 노트 수가 나머지 마디 평균보다 많다 (스텝 100ms 이상인 곡)
  const slow = T.find((t) => t.id === "black-city-beat");
  const hard = tracks.buildChart({ ...slow, difficulty: "hard", subdivision: 16 });
  const perBar = []; for (let i = 0; i < hard.length; i += 16) perBar.push({ bar: i / 16, section: hard[i].section, n: hard.slice(i, i + 16).filter((x) => x.spike).length });
  const dropBars = perBar.filter((b) => b.section === "drop");
  const fillBars = dropBars.filter((b) => b.bar % 4 === 3), otherBars = dropBars.filter((b) => b.bar % 4 !== 3);
  const avg = (arr) => arr.reduce((s2, b) => s2 + b.n, 0) / Math.max(1, arr.length);
  ok("HARD 프레이즈 필: 4마디째가 다른 마디보다 노트가 많다", fillBars.length > 0 && avg(fillBars) > avg(otherBars), `fill ${avg(fillBars).toFixed(1)} vs ${avg(otherBars).toFixed(1)}`);
  ok("SECTION_DENSITY: EASY 필 0 · HARD 필 4", tracks.SECTION_DENSITY.easy.fill === 0 && tracks.SECTION_DENSITY.hard.fill === 4);
}

// ── 화살 원정: 스테이지 수치 재조정 (마저 개발) ──
ok("유도탄 승격 확률: 1스테이지 0 · 2/3/4 = 5/6/9%", arrows.homingChanceFor(0) === 0 && arrows.homingChanceFor(1) === 0.05 && arrows.homingChanceFor(3) === 0.09 && arrows.homingChanceFor(9) === 0.09);
ok("보스 베기 수 4 + 2×스테이지 (예전 10 + 4×)", world.BOSS_CUTS_BASE === 4 && world.BOSS_CUTS_PER_STAGE === 2);
{
  const { simulateStage } = await import(pathToFileURL(join(root, "scripts/dodge-sim.mjs")).href);
  const gate = (stage) => { const runs = [1, 2, 3, 4, 5].map((seed) => simulateStage(stage, seed * 7919 + stage)); return { clear: runs.filter((r) => r.clear).length, hits: runs.reduce((s2, r) => s2 + r.hits, 0) / 5 }; };
  const s1 = gate(0), s2 = gate(1);
  ok("검객 봇: 1스테이지 5시드 중 4회 이상 클리어 · 평균 피격 ≤ 1.5", s1.clear >= 4 && s1.hits <= 1.5, `clear ${s1.clear}/5 hits ${s1.hits.toFixed(1)}`);
  ok("검객 봇: 2스테이지 5시드 중 4회 이상 클리어 · 평균 피격 ≤ 1.5", s2.clear >= 4 && s2.hits <= 1.5, `clear ${s2.clear}/5 hits ${s2.hits.toFixed(1)}`);
}

for (const [s, n, d] of results) console.log(s, n, d ? "— " + d : "");
const fails = results.filter((x) => x[0] === "FAIL").length;
console.log(fails === 0 ? "\nALL PASS" : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
