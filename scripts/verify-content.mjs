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
const { tracks, rpg, bworld, arrows, world, shop, input } = await import(pathToFileURL(out).href);
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

// ── 화살 원정: 쪼개짐 연출 — 파쇄는 두 토막 + 불꽃 + 검광, 반사는 불꽃 + 검광 ──
{
  const active = (w2) => w2.slashDebris.filter((d) => d.active);
  const kinds = (w2) => active(w2).map((d) => d.kind);
  let w2 = mk(); w2.player.facing = 1;
  const p2 = (dist, fromRight = true) => { const a2 = w2.arrows[0]; a2.active = true; a2.reflected = false; a2.splitLevel = 0; a2.warningMs = 0; a2.splitGraceMs = 0; a2.boss = false; a2.kind = "normal"; a2.x = w2.player.x + (fromRight ? dist : -dist); a2.y = w2.player.y; a2.vx = fromRight ? -300 : 300; a2.vy = 0; a2.angle = Math.atan2(a2.vy, a2.vx); a2.damage = 1; a2.hitRadius = 5; a2.length = 34; return a2; };
  p2(60);
  world.updateWorld(w2, 0.016, true, Object.assign(input.createInputState(), { slowPressed: true }));
  const k = kinds(w2);
  ok("파쇄 → 촉 토막 1 · 깃 토막 1 · 검광 1 · 불꽃 ≥ 4 가 보인다", k.filter((x) => x === "tip").length === 1 && k.filter((x) => x === "tail").length === 1 && k.includes("streak") && k.filter((x) => x === "spark").length >= 4, k.join());
  const tip = active(w2).find((d) => d.kind === "tip"), tail = active(w2).find((d) => d.kind === "tail");
  ok("두 토막은 서로 반대편으로 갈라진다 (수직 속도 부호 반대·길이 = 화살 절반)", tip && tail && Math.sign(tip.vy - tail.vy) !== 0 && Math.abs(tip.len - 17) < 0.01 && Math.abs(tail.len - 17) < 0.01, `tip vy ${tip?.vy.toFixed(0)} tail vy ${tail?.vy.toFixed(0)}`);
  for (let i = 0; i < 80; i += 1) world.updateWorld(w2, 0.016, true, input.createInputState());
  ok("파편은 1.3초 안에 전부 사라진다 (풀 누수 없음)", active(w2).length === 0, `남은 ${active(w2).length}`);
  w2 = mk(); w2.player.facing = 1;
  p2(w2.player.radius + 5 + 10);
  world.updateWorld(w2, 0.016, true, Object.assign(input.createInputState(), { slowPressed: true }));
  const k2 = kinds(w2);
  ok("반사 → 토막 없이 금색 불꽃 + 검광 (화살은 살아서 되돌아간다)", !k2.includes("tip") && k2.includes("streak") && k2.filter((x) => x === "spark").length >= 5 && active(w2).every((d) => d.kind === "streak" || d.color === "#fde68a"), k2.join());
  ok("파편 풀은 resetRun 에서 비워진다", (world.resetRun(w2, 0), active(w2).length === 0));
}

// ── 비트: 홀드 노트(실제 유지) · 회복 · 곡 특성(소리 크기) · 펌프식 레벨 특징 ──
{
  const hardTrack = { ...base, difficulty: "hard", subdivision: 16 };
  const ch = tracks.buildChart(hardTrack);
  const heads = ch.filter((x) => x.hold && x.hold >= 2);
  ok("HARD 채보에 롱노트 머리(hold ≥ 2)가 있고 꼬리는 단타 판정 대상이 아니다(spike=false·holdTail)", heads.length > 0 && heads.every((h, ) => { const i = ch.indexOf(h); return ch[i + 1]?.holdTail === true && ch[i + 1]?.spike === false; }), `heads ${heads.length}`);
  const lvl1 = tracks.buildChart({ ...T.find((t) => t.level === 1), difficulty: "easy", subdivision: 4 });
  ok("레벨 1(EASY) 채보는 롱노트가 없고 숨소리·클릭(작은 소리)이 노트가 아니다", !lvl1.some((x) => x.hold) && !lvl1.some((x) => x.spike && (x.sound === "breath" || x.sound === "click")));
  ok("레벨 특징표: 1~2 롱노트 없음 · 5+ 계단 · 7+ 드릴 · 초당 노트 상한 단조 증가", tracks.LEVEL_FEATURES[0].holdEvery === 0 && tracks.LEVEL_FEATURES[4].stairs && !tracks.LEVEL_FEATURES[3].stairs && tracks.LEVEL_FEATURES[6].drill && !tracks.LEVEL_FEATURES[5].drill && tracks.LEVEL_FEATURES.every((f, i) => i === 0 || f.notesPerSec > tracks.LEVEL_FEATURES[i - 1].notesPerSec));
  ok("effectiveLevel: 곡 레벨 ± 난이도 변형(EASY −2 · HARD +2), 1~10 클램프", tracks.effectiveLevel({ ...base, level: 5, difficulty: "easy" }) === 3 && tracks.effectiveLevel({ ...base, level: 5, difficulty: "hard" }) === 7 && tracks.effectiveLevel({ ...base, level: 10, difficulty: "hard" }) === 10);
  // 드릴: 레벨 7+ 드롭에 같은 레인 3연타가 존재
  const runs = (c) => { let best = 0, run = 0, prev = null; for (const st of c) { if (st.spike && st.section === "drop" && st.sound === prev) { run += 1; best = Math.max(best, run); } else run = st.spike ? 1 : 0; prev = st.spike ? st.sound : null; } return best; };
  ok("레벨 7+(HARD azure-sky) 드롭에 같은 레인 3연타 드릴이 있다", runs(ch) >= 3, `max run ${runs(ch)}`);
  // 회복: PERFECT 4번 → HP +1 (상한 maxHp)
  const w = { hp: 5, maxHp: 7, healGauge: 0 };
  let healed = 0; for (let i = 0; i < 4; i += 1) if (bworld.gainHeal(w, 2)) healed += 1;
  ok("회복 게이지: PERFECT(+2) 4번 → HP +1 · GREAT(+1)은 절반 속도 · 상한 초과 없음", healed === 1 && w.hp === 6 && bworld.HEAL_GAUGE_MAX === 8 && (() => { const f = { hp: 7, maxHp: 7, healGauge: 0 }; for (let i = 0; i < 8; i += 1) bworld.gainHeal(f, 2); return f.hp === 7; })());
}

// ── 비트: 플레이 가능성 게이트 (귀 대신 수치) · 빈 탭 무벌점 ──
{
  const { allStats, playability } = await import(pathToFileURL(join(root, "scripts/beat-chart-report.mjs")).href);
  const rows = allStats();
  const bad = rows.map((r) => ({ r, issues: playability(r) })).filter((x) => x.issues.length);
  ok("전 곡 × 3변형(48): 최소 간격 ≥ 85ms · 레벨 1~2 NPS 0.8~2.6 · 레벨 9~10 NPS ≤ 5.4 · 레벨 3+ 롱노트 존재", bad.length === 0, bad.slice(0, 4).map((x) => `${x.r.id}/${x.r.difficulty}: ${x.issues.join(",")}`).join(" | "));
  ok("드릴은 스텝 90ms 이상 곡에만 (170BPM 16분 88ms 곡엔 없음)", rows.every((r) => r.drills === 0 || r.stepMs >= 90));
  // 빈 탭: 노트 없는 스텝을 치면 "empty" — 콤보·HP 그대로
  const stubTrack = { ...base, difficulty: "medium", subdivision: 8 };
  const stubWorld = bworld.createBeatWorld(390, 700, 1, stubTrack, "boots");
  stubWorld.combo = 7; stubWorld.hp = 5; stubWorld.beatPosition = 1; stubWorld.invulnMs = 0;
  const ses = { world: stubWorld, chart: Array.from({ length: 6 }, () => ({ sound: "boots", spike: false, lane: 0 })), track: stubTrack, box: { isTransportRunning: () => false, getTransportPosition: () => 0, getTransportStepTime: () => 0, playLead() {}, playSound() {}, stopLessonTransport() {} }, ctx: null, master: null, backingAudio: null, enabled: false, skills: {}, isSpar: false, lockHits: 0, taps: 0, hitSteps: new Set(), evaluatedStep: 0, calibrationSec: 0, holdLane: -1, holdEndStep: -1 };
  const r0 = bworld.performBeatLane(ses, 0);
  ok("노트 없는 스텝의 탭 = empty: MISS 아님 · 콤보 유지 · HP 유지", r0 === "empty" && ses.world.combo === 7 && ses.world.hp === 5 && ses.world.judgeText === "", `result ${r0} combo ${ses.world.combo}`);
  ses.holdLane = 0; ses.holdEndStep = 3;
  ok("롱노트 유지 중 같은 레인 입력 = held (무시)", bworld.performBeatLane(ses, 0) === "held");
}

// ── 화살 원정: 추격대장 예고 시간은 거리 비례 · 4스테이지 봇 클리어 1~4/5 (어렵되 불가능하지 않게) ──
ok("대장 예고: 90px 520ms(하한) · 400px 860ms · 900px 1200ms(상한)", arrows.captainWarningMs(90) === 520 && arrows.captainWarningMs(400) === 860 && arrows.captainWarningMs(900) === 1200);

// ── 비트: 사람 반응 모델 봇 플레이 (scripts/beat-sim.mjs) — 숙련자 48/48 클리어 · 초보는 EASY 전부 + 유효 레벨 ≤ 3 전부 + HARD 아닌 레벨 ≤ 7 ──
{
  const { runAll } = await import(pathToFileURL(join(root, "scripts/beat-sim.mjs")).href);
  const pro = runAll("competent");
  ok("숙련자 봇(히트 93% · 지터 45ms): 48채보 전부 클리어", pro.every((r) => r.ended === "clear"), pro.filter((r) => r.ended !== "clear").map((r) => `${r.id}/${r.difficulty}`).join(" "));
  const nov = runAll("novice");
  const mustClear = nov.filter((r) => r.difficulty === "easy" || r.level <= 3 || (r.difficulty !== "hard" && r.level <= 7));
  ok("초보 봇(히트 85% · 지터 80ms): EASY 전부 · 유효 레벨 ≤ 3 전부 · HARD 아닌 레벨 ≤ 7 클리어", mustClear.every((r) => r.ended === "clear"), mustClear.filter((r) => r.ended !== "clear").map((r) => `${r.id}/${r.difficulty}(L${r.level})`).join(" "));
  ok("HARD 고레벨(≥ 8)은 초보 봇이 못 깬다 — 난이도 사다리가 살아 있다", nov.filter((r) => r.difficulty === "hard" && r.level >= 8).some((r) => r.ended === "dead"));
  ok("판정 창 하한 110ms (170BPM 16분에서 55ms 로 좁아지던 문제)", bworld.JUDGE_WINDOW_FLOOR_SEC === 0.11);
}

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
  const s4 = gate(3);
  ok("검객 봇: 4스테이지(추격대장) 5시드 중 1~4회 클리어 — 벽이되 불가능하지 않다", s4.clear >= 1 && s4.clear <= 4, `clear ${s4.clear}/5 hits ${s4.hits.toFixed(1)}`);
}

for (const [s, n, d] of results) console.log(s, n, d ? "— " + d : "");
const fails = results.filter((x) => x[0] === "FAIL").length;
console.log(fails === 0 ? "\nALL PASS" : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
