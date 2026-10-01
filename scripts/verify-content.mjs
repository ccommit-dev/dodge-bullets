/**
 * 콘텐츠 설계 단언 (docs/CONTENT_BEAT_DODGE_PLAN.md) — 비트 난이도 레벨 · 성문 방어 검격 규칙. 순수 시뮬, 브라우저 불필요.
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
  `export * as stages from "${root}/src/game/stages";`,
].join("\n"));
const out = join(dir, "bundle.mjs");
await build({ entryPoints: [entry], bundle: true, format: "esm", outfile: out, platform: "node", define: { "import.meta.env.BASE_URL": '"/"', "import.meta.env.DEV": "false", "import.meta.env.PROD": "true" } });
// 브라우저 전용 전역 최소 스텁 (Image/Audio 등은 모듈 최상위에서 안 쓰이지만 안전망)
globalThis.window ??= { setTimeout, clearTimeout, addEventListener() {}, removeEventListener() {} };
globalThis.document ??= { createElement: () => ({ getContext: () => null, style: {} }) };
globalThis.Image ??= class { set src(_v) {} };
const { tracks, rpg, bworld, arrows, world, shop, input, stages } = await import(pathToFileURL(out).href);
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

// ── 성문 방어: 아웃로 디펜스 규칙 (2026-10-01) — 점프·대시·일제 사격 없음 · 화살은 위에서 아래로만 · 발판 없음 · 보스는 위에서 떠다니며 사격으로 격추 ──
const mk = () => { const w = world.createWorld(390, 700, 1); world.applyStats(w, shop.statsFromLevels(shop.emptyShopLevels())); world.resetRun(w, 0); return w; };
{
  const w = mk();
  ok("발판이 없다 (점프가 없으니 설 수 없다)", w.platforms.length === 0, String(w.platforms.length));
  const inp = Object.assign(input.createInputState(), { jumpPressed: true, dashPressed: true, slowPressed: true });
  const y0 = w.player.y;
  for (let i = 0; i < 20; i += 1) world.updateWorld(w, 1 / 60, true, inp);
  ok("점프·대시·일제 사격 입력은 아무 일도 하지 않는다 (제자리·대시 없음·사격 지속 없음)",
    Math.abs(w.player.y - y0) < 0.5 && w.player.onGround && w.player.dashActiveMs === 0 && w.player.slowActiveMs === 0, JSON.stringify({ y: w.player.y, y0, dash: w.player.dashActiveMs, slow: w.player.slowActiveMs }));
  // 모든 패턴이 위에서 나온다 — 스테이지 4개의 패턴 구간을 각각 돌려 생성된 화살을 전부 본다
  const bad = [];
  for (let stage = 0; stage < 4; stage += 1) {
    const w2 = mk(); world.resetRun(w2, stage);
    const seen = new Set();
    for (let f = 0; f < 60 * 50; f += 1) {
      world.updateWorld(w2, 1 / 60, true, input.createInputState());
      w2.player.hp = w2.player.maxHp;
      for (let i = 0; i < w2.arrows.length; i += 1) {
        const ar = w2.arrows[i]; if (!ar.active || ar.reflected || ar.splitLevel > 0 || ar.boss) continue;
        const key = i + ":" + ar.kind + ":" + Math.round(ar.x) + ":" + Math.round(ar.y);
        if (seen.has(key)) continue; seen.add(key);
        // 처음 본 순간이 '생성 직후'는 아니지만, 위로(vy<0) 움직이는 일반 화살은 어느 순간에도 없어야 한다
        if (ar.vy < 0 && ar.kind !== "homing") bad.push(`S${stage + 1} ${ar.kind} vy=${ar.vy.toFixed(0)} y=${ar.y.toFixed(0)}`);
      }
    }
  }
  ok("화살은 위에서 아래로만 — 네 스테이지 50초 동안 위로 움직이는 일반 화살이 없다 (유도탄 제외)", bad.length === 0, bad.slice(0, 4).join(" | "));
}
{
  // 보스 — 위에서 좌우로 떠다니며 아래로 쏘고, 사격으로 깎는다
  const w = mk(); world.resetRun(w, 0); w.rangedWeapon = "bow";
  w.stageElapsedMs = stages.STAGES[0].durationMs * 0.6;
  world.updateWorld(w, 1 / 60, true, input.createInputState());
  const boss = w.arrows.find((x) => x.active && x.boss);
  ok("보스 화살이 떴다 (스테이지 58%)", !!boss && w.bossSpawned);
  let minY = 1e9, maxY = -1e9, salvo = 0;
  // 기본 사격이 0.55초가 된 뒤(방어막 모델) 보스가 8초 안에 격파되기도 한다 — 격파되면 풀 객체가 다른 몬스터로 재사용되므로 그 뒤는 보지 않는다
  for (let f = 0; f < 60 * 8 && boss && boss.active && !w.bossDefeated; f += 1) {
    world.updateWorld(w, 1 / 60, true, input.createInputState());
    w.player.hp = w.player.maxHp;
    if (w.bossDefeated) break;
    minY = Math.min(minY, boss.y); maxY = Math.max(maxY, boss.y);
    for (const x of w.arrows) if (x.active && !x.boss && x.telegraph === "sniper" && x.y < boss.y + 80) salvo += 1;   // 보스 바로 아래서 막 나온 것
  }
  ok("보스는 화면 위쪽 띠(성문 아래)에 머문다 — 8초 동안 플레이어 높이로 내려오지 않는다", boss && maxY < w.player.y - 200 && minY > w.safeTop, `y ${minY.toFixed(0)}~${maxY.toFixed(0)} · 플레이어 ${w.player.y.toFixed(0)}`);
  ok("보스가 아래로 조준 화살을 쏜다 (8초 동안 1발 이상)", salvo > 0, String(salvo));
  ok("기본 사격만으로 보스가 깎인다 (8초 안에 격추 수가 줄거나 격파)", w.bossDefeated || !boss || !boss.active || boss.bossCutsLeft < boss.bossMaxCuts, w.bossDefeated ? "격파" : boss ? `${boss.bossCutsLeft}/${boss.bossMaxCuts}` : "없음");
}

// ── 성문 방어막 (2026-10-01, 아웃로 디펜스) — 몬스터는 방어막에 멈춰 HP 를 깎고, 붕괴하면 성문 피해 1 · 붙은 몬스터 소멸 · 방어막 복구 ──
{
  const w = mk(); w.rangedWeapon = "none";   // 활이 없어야 몬스터가 방어막까지 온다
  const by = arrows.barrierY(w);
  ok("방어막 띠는 바닥선 위 150px · 주인공 머리·무기 정령보다 위", by === w.floorY - 150 && by < w.player.y - 60, `${by} vs 플레이어 ${w.player.y}`);
  ok("방어막은 120 으로 시작하고 몬스터 종류별 피해가 덩치순(드래곤 > 오우거 > 달빛 늑대왕 > 그림자 늑대 > 슬라임·고블린)", w.barrierHp === 120 && w.barrierMaxHp === 120
    && arrows.barrierDamageOf({ kind: "explosive" }) > arrows.barrierDamageOf({ kind: "ricochet" }) && arrows.barrierDamageOf({ kind: "ricochet" }) > arrows.barrierDamageOf({ kind: "homing" })
    && arrows.barrierDamageOf({ kind: "homing" }) > arrows.barrierDamageOf({ kind: "aimed" }) && arrows.barrierDamageOf({ kind: "aimed" }) > arrows.barrierDamageOf({ kind: "normal" }) && arrows.barrierDamageOf({ kind: "normal" }) === arrows.barrierDamageOf({ kind: "fan" }));
  // 슬라임 셋을 띠 바로 위에 세워 내려보낸다
  const put = (n) => { const a = w.arrows.filter((x) => !x.active).slice(0, n); a.forEach((x, i) => { x.active = true; x.warningMs = 0; x.reflected = false; x.boss = false; x.fromBoss = false; x.splitLevel = 0; x.kind = "normal"; x.hp = 0; x.maxHp = 0; x.x = 120 + i * 60; x.y = by - 80; x.vx = 0; x.vy = 200; x.atBarrier = false; x.hitRadius = 8; }); return a; };
  const trio = put(3);
  w.stageElapsedMs = 1000;   // 2초 전엔 생성이 없다 — 세운 셋만 본다
  for (let f = 0; f < 30; f += 1) world.updateWorld(w, 1 / 60, true, input.createInputState());
  ok("몬스터는 방어막에 닿으면 멈춰 선다 (vy 0 · 띠 바로 위 · atBarrier)", trio.every((a) => a.active && a.atBarrier && a.vy === 0 && a.y < by && a.y > by - 40), trio.map((a) => `y${a.y.toFixed(0)} vy${a.vy}`).join(","));
  const hp0 = w.barrierHp;
  for (let f = 0; f < 60 * 2; f += 1) { world.updateWorld(w, 1 / 60, true, input.createInputState()); w.stageElapsedMs = 1000; }
  ok("붙은 몬스터가 주기(1.2초)마다 방어막을 깎는다 — 슬라임 셋 2초에 피해 ≥ 5·3", hp0 - w.barrierHp >= 15 && w.barrierHits >= 3, `${hp0} → ${w.barrierHp.toFixed(1)} · 타격 ${w.barrierHits}`);
  ok("붙어 있는 동안은 회복하지 않는다", w.barrierHp < hp0 - 10, w.barrierHp.toFixed(1));
  // 붕괴 — 성문 피해 1 · 붙은 몬스터 소멸 · 방어막 복구
  const hpPlayer = w.player.hp;
  w.barrierHp = 3;
  let ev = { type: "none" };
  for (let f = 0; f < 60 * 2 && ev.type !== "hit"; f += 1) { ev = world.updateWorld(w, 1 / 60, true, input.createInputState()); w.stageElapsedMs = 1000; }
  ok("방어막이 0 이 되면 붕괴: 주인공 HP −1 · 원인 barrier", ev.type === "hit" && w.player.hp === hpPlayer - 1 && w.lastHitCause === "barrier" && w.barrierBreaks === 1, `${ev.type} hp ${hpPlayer}→${w.player.hp} ${w.lastHitCause}`);
  ok("붕괴 때 붙어 있던 몬스터는 충격파에 쓸려 나가고(처치 수에 안 센다) 방어막은 바로 복구된다", trio.every((a) => !a.active) && w.barrierHp === w.barrierMaxHp && w.skillKills === 0 && w.fades.length >= 3, `active ${trio.filter((a) => a.active).length} hp ${w.barrierHp} fades ${w.fades.length}`);
  // 회복 — 아무도 붙어 있지 않으면 초당 4
  w.barrierHp = 50;
  for (let f = 0; f < 60; f += 1) { world.updateWorld(w, 1 / 60, true, input.createInputState()); w.stageElapsedMs = 1000; }
  ok("붙은 몬스터가 없으면 초당 4 씩 찬다", w.barrierHp > 53 && w.barrierHp < 55.5, w.barrierHp.toFixed(1));
  // 보스와 보스 마력탄은 방어막을 지나친다 — 피하기는 그 몫
  const orb = put(1)[0]; orb.fromBoss = true; orb.kind = "aimed"; orb.x = w.player.x; orb.y = by - 60; orb.vy = 400;
  for (let f = 0; f < 40; f += 1) { world.updateWorld(w, 1 / 60, true, input.createInputState()); w.stageElapsedMs = 1000; w.player.invulnMs = 0; }
  ok("보스 마력탄은 방어막에 멈추지 않고 플레이어까지 온다", !orb.atBarrier && (!orb.active || orb.y > by), `at ${orb.atBarrier} y ${orb.y.toFixed(0)} active ${orb.active}`);
  ok("몬스터 속도 배수 0.6 · 기본 사격 0.55초 · 생성 간격 1.8배 — 방어막 모델의 손잡이 (스윕 2026-10-01)", arrows.TUNING.monsterSpeedMul === 0.6 && arrows.TUNING.basicCooldown === 0.55 && arrows.TUNING.spawnScale === 1.8 && arrows.TUNING.barrierDmgPerStage === 0.2, JSON.stringify(arrows.TUNING));
}

// ── 비트: 홀드 노트(실제 유지) · 회복 · 곡 특성(소리 크기) · 펌프식 레벨 특징 ──
{
  const hardTrack = { ...base, difficulty: "hard", subdivision: 16 };
  const ch = tracks.buildChart(hardTrack);
  const heads = ch.filter((x) => x.hold && x.hold >= 2);
  ok("HARD 채보에 롱노트 머리(hold ≥ 2)가 있고 꼬리는 단타 판정 대상이 아니다(spike=false·holdTail)", heads.length > 0 && heads.every((h, ) => { const i = ch.indexOf(h); return ch[i + 1]?.holdTail === true && ch[i + 1]?.spike === false; }), `heads ${heads.length}`);
  const lvl1 = tracks.buildChart({ ...T.find((t) => t.level === 1), difficulty: "easy", subdivision: 4 });
  ok("레벨 1(EASY) 채보는 숨소리·클릭(작은 소리)이 노트가 아니다 (홀드는 저레벨에도 섞인다 — 2026-09-14)", !lvl1.some((x) => x.spike && (x.sound === "breath" || x.sound === "click")));
  ok("레벨 특징표: 1부터 롱노트 · 5+ 계단 · 7+ 드릴 · 초당 노트 상한 단조 증가", tracks.LEVEL_FEATURES[0].holdEvery > 0 && tracks.LEVEL_FEATURES[4].stairs && !tracks.LEVEL_FEATURES[3].stairs && tracks.LEVEL_FEATURES[6].drill && !tracks.LEVEL_FEATURES[5].drill && tracks.LEVEL_FEATURES.every((f, i) => i === 0 || f.notesPerSec > tracks.LEVEL_FEATURES[i - 1].notesPerSec));
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

// ── 성문 방어: 추격대장 예고 시간은 거리 비례 · 4스테이지 봇 클리어 1~4/5 (어렵되 불가능하지 않게) ──
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

// ── 비트: 노트 종류 — 탭 · 홀드 · 점프(2레인 동시) · 홀드 점프 · 롤(교대 연타) ──
{
  const lv10 = tracks.buildChart({ ...T.find((t) => t.level === 10), difficulty: "hard", subdivision: 16 });
  const lv1 = tracks.buildChart({ ...T.find((t) => t.level === 1), difficulty: "easy", subdivision: 4 });
  const jumps = lv10.filter((x) => x.spike && x.jumpSound && !x.hold), holdJumps = lv10.filter((x) => x.hold && x.jumpSound), rolls = lv10.filter((x) => x.roll);
  ok("레벨 10 HARD 채보에 점프·홀드 점프·롤이 있고, 점프의 두 레인은 서로 다르다", jumps.length > 0 && holdJumps.length > 0 && rolls.length >= 4 && jumps.every((x) => bworld.laneOfSound(x.sound) !== bworld.laneOfSound(x.jumpSound)), `jump ${jumps.length} holdJump ${holdJumps.length} roll ${rolls.length}`);
  ok("롤은 두 레인이 교대로 이어진다", (() => { for (let i = 0; i + 1 < lv10.length; i += 1) if (lv10[i].roll && lv10[i + 1].roll && bworld.laneOfSound(lv10[i].sound) === bworld.laneOfSound(lv10[i + 1].sound)) return false; return true; })());
  ok("레벨 1 EASY 에도 홀드·점프가 섞이고, 롤·홀드 점프는 없다", lv1.some((x) => x.hold) && lv1.some((x) => x.jumpSound && !x.hold) && !lv1.some((x) => x.roll || (x.hold && x.jumpSound)), `hold ${lv1.filter((x) => x.hold).length} jump ${lv1.filter((x) => x.jumpSound).length}`);
  ok("레벨표: 홀드 1+ · 점프 1+ · 롤 4+ · 홀드 점프 5+ (초보 봇이 유효 레벨 3 을 깰 수 있는 선)", tracks.LEVEL_FEATURES[0].holdEvery > 0 && tracks.LEVEL_FEATURES[0].jump && !tracks.LEVEL_FEATURES[2].roll && tracks.LEVEL_FEATURES[3].roll && !tracks.LEVEL_FEATURES[3].holdJump && tracks.LEVEL_FEATURES[4].holdJump);
  // 점프 판정: 두 레인 다 쳐야 미스가 아니다
  const jt = { ...base, difficulty: "medium", subdivision: 8 };
  const jw = bworld.createBeatWorld(390, 700, 1, jt, "boots"); jw.invulnMs = 0;
  const jchart = [0, 1, 2, 3, 4, 5].map(() => ({ sound: "boots", spike: false, lane: 0 }));
  jchart[2] = { sound: "boots", spike: true, lane: 0, jumpSound: "cats" };
  const jses = { world: jw, chart: jchart, track: jt, box: { isTransportRunning: () => false, getTransportPosition: () => 0, getTransportStepTime: () => 0, playLead() {}, playSound() {}, stopLessonTransport() {} }, ctx: null, master: null, backingAudio: null, enabled: false, skills: rpg.emptySkills(), isSpar: false, lockHits: 0, taps: 0, hitSteps: new Set(), evaluatedStep: 0, calibrationSec: 0, holdLane: -1, holdEndStep: -1, holdLane2: -1, holdEndStep2: -1 };
  jw.beatPosition = 2;
  const r1 = bworld.performBeatLane(jses, 0), r2 = bworld.performBeatLane(jses, 2);
  ok("점프: 첫 레인 hit · 두 번째 레인 hit → 'JUMP' 판정 문구 · 두 레인 모두 기록", r1 === "hit" && r2 === "hit" && String(jw.judgeText).startsWith("JUMP") && jw.hitSteps.has(2) && jw.hitSteps2.has(2), `${r1} ${r2} ${jw.judgeText}`);
  const jw2 = bworld.createBeatWorld(390, 700, 1, jt, "boots"); jw2.invulnMs = 0; jw2.hp = 5;
  const jses2 = { ...jses, world: jw2, hitSteps: new Set(), evaluatedStep: 0 };
  jw2.beatPosition = 2; bworld.performBeatLane(jses2, 0); // 한 레인만
  for (let i = 0; i < 40; i += 1) bworld.updateBeatWorld(jses2, 1 / 60, true);
  ok("점프에서 한 레인만 치면 MISS (HP −1)", jw2.hp === 4, `hp ${jw2.hp}`);
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

// ── 성문 방어: 스테이지 수치 재조정 (마저 개발) ──
ok("유도탄 승격 확률: 1스테이지 0 · 2/3/4 = 3/4/6% (좌우 이동만으로 피하므로 낮게, 2026-10-01)", arrows.homingChanceFor(0) === 0 && arrows.homingChanceFor(1) === 0.03 && arrows.homingChanceFor(3) === 0.06 && arrows.homingChanceFor(9) === 0.06);
ok("보스 격추 수 4 + 6×스테이지 — 좌우 이동만 남은 뒤 성장이 갈리는 지렛대 (2026-10-01)", world.BOSS_CUTS_BASE === 4 && world.BOSS_CUTS_PER_STAGE === 6);
{
  const { simulateStage } = await import(pathToFileURL(join(root, "scripts/dodge-sim.mjs")).href);
  // 기준선은 새 진행도 그대로 — 장궁 + 불화살 Lv1 (런 중 카드로 습득한다). 이것이 실제 첫 플레이다 (2026-09-29).
// 맨손은 레벨업 카드가 게이지·HP 두 장뿐이라 봇이 HP 만 뽑아 S4 벽이 무너진다 — 기본 상태가 아니다
const gate = (stage) => { const runs = [1, 2, 3, 4, 5].map((seed) => simulateStage(stage, seed * 7919 + stage, { skills: { fire: 1 }, weapon: "bow" })); return { clear: runs.filter((r) => r.clear).length, hits: runs.reduce((s2, r) => s2 + r.hits, 0) / 5 }; };
  const s1 = gate(0), s2 = gate(1);
  // 방어막 모델에서 '피격' = 보스 마력탄 + 방어막 붕괴(성문 피해). S1 은 붕괴 0 이어야 첫 플레이가 편하다
  ok("검객 봇: 1스테이지 5시드 중 4회 이상 클리어 · 평균 피격 ≤ 1.5 (방어막 붕괴 0 에 가깝게)", s1.clear >= 4 && s1.hits <= 1.5, `clear ${s1.clear}/5 hits ${s1.hits.toFixed(1)}`);
  ok("검객 봇: 2스테이지 5시드 중 4회 이상 클리어 · 평균 피격 ≤ 1.5", s2.clear >= 4 && s2.hits <= 1.5, `clear ${s2.clear}/5 hits ${s2.hits.toFixed(1)}`);
  const s4 = gate(3);
  // 스테이지 단독 S4 — 기준선(장궁 + 불화살 Lv1)이 새 런으로 S4 만 돌 때. 화살에 체력을 넣은 뒤에도
// 예전 값(2/5 · 4.6)과 거의 같다(2/5 · 5.0). 중간 상태에서 5/5 가 나와 뺐다가 최종 상태를 재 보고 되살렸다 —
// 밸런스 구조를 바꿔도 **기준선 난이도는 그대로**라는 것을 못 박는 닻이다.
// 방어막 모델(2026-10-01)에서 기준선의 S4 단독은 벽이다(0~1/5) — "불가능하지 않다"는 아래 풀런 곡선의 중간(8~18)·강함(≥15) 이 맡는다
ok("검객 봇: 4스테이지(추격대장) 5시드 중 0~4회 클리어 · 붕괴 ≥ 4 — 기준선에겐 벽", s4.clear <= 4 && s4.hits >= 4, `clear ${s4.clear}/5 hits ${s4.hits.toFixed(1)}`);
// 풀런 곡선 — 스테이지 단독으로는 카드·습득이 이어지는 실제 원정을 못 잰다. 둘을 함께 둔다:
// 참고 게임처럼 새 계정은 중반에서 막히고, 성장하면 뚫린다.
{
  const { runCurve } = await import("./dodge-sim.mjs");
  const curve = Object.fromEntries(runCurve(20).map((r) => [r.tier, r]));
  const N = curve["새 계정"], M = curve["중간"], S = curve["강함"];
  const line = (r) => `S1 ${r.clearS1} · S2 ${r.clearS2} · S3 ${r.clearS3} · S4 ${r.clearS4} / ${r.n}`;
  ok("풀런 · 새 계정: 초반은 넘고(S1 ≥ 18 · S2 ≥ 14) 끝은 벽이다(S4 ≤ 4)", N.clearS1 >= 18 && N.clearS2 >= 14 && N.clearS4 <= 4, line(N));
  ok("풀런 · 중간 계정: S3 은 대체로 넘고(≥ 12) S4 는 반반 안팎(8~18)", M.clearS3 >= 12 && M.clearS4 >= 8 && M.clearS4 <= 18, line(M));
  ok("풀런 · 강한 계정: S4 를 대부분 깬다(≥ 15)", S.clearS4 >= 15, line(S));
  ok("풀런 · 성장할수록 멀리 간다 (S4 클리어: 새 < 중간 ≤ 강함)", N.clearS4 < M.clearS4 && M.clearS4 <= S.clearS4, [N.clearS4, M.clearS4, S.clearS4].join(" < "));
}

// ── 일주일 곡선 (2026-10-01) — 새 계정이 하루 3판씩 일주일. 이탈 지점(강화 0 인 날) 없이, 사흘 안에 스킬 6종을 다 배우고
//    S4 를 처음 깨며, 7일째에도 만렙이 없어야(남은 분량) 한다. 학습이 조각이면 두 번째 스킬을 영원히 못 배웠다(실측).
{
  const { weekSummary } = await import("./dodge-week-sim.mjs");
  const weeks = weekSummary(3);
  const line = weeks.map((w) => `첫판 S${w.firstRun} · 전부 학습 ${w.allLearnedBy}일 · S4 ${w.s4By}일 · 7일째 S4 ${w.s4Day7}/3 · 만렙 ${w.maxedDay7} · 합 ${w.totalDay7}`).join(" | ");
  ok("일주일 · 강화를 하나도 못 하는 날이 없다 (이탈 지점)", weeks.every((w) => w.stallDays.length === 0), weeks.map((w) => w.stallDays.join(",") || "없음").join(" | "));
  ok("일주일 · 첫 판에 2스테이지 이상 간다 (첫 플레이가 벽이 아니다)", weeks.every((w) => w.firstRun >= 2), line);
  ok("일주일 · 사흘 안에 스킬 6종을 전부 배운다 (학습은 인장)", weeks.every((w) => w.allLearnedBy <= 3), line);
  ok("일주일 · S4 를 나흘 안에 처음 깬다 (운 좋으면 첫날, 보통 2~3일 — 벽이되 막혀 있진 않다)", weeks.every((w) => w.s4By <= 4), line);
  ok("일주일 · 7일째에 만렙 스킬이 없고 누적 레벨 28 이상 (분량이 남아 있되 성장은 했다)", weeks.every((w) => w.maxedDay7 === 0 && w.totalDay7 >= 28), line);
}
}

for (const [s, n, d] of results) console.log(s, n, d ? "— " + d : "");
const fails = results.filter((x) => x[0] === "FAIL").length;
console.log(fails === 0 ? "\nALL PASS" : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
