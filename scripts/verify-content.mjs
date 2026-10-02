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
  `export * as skills from "${root}/src/game/skills";`,
  `export * as skillShots from "${root}/src/game/skillShots";`,
].join("\n"));
const out = join(dir, "bundle.mjs");
await build({ entryPoints: [entry], bundle: true, format: "esm", outfile: out, platform: "node", define: { "import.meta.env.BASE_URL": '"/"', "import.meta.env.DEV": "false", "import.meta.env.VITE_QA_BUILD": "undefined", "import.meta.env.VITE_TOSS_AD_GROUP_ID": "undefined", "import.meta.env.PROD": "true" } });
// 브라우저 전용 전역 최소 스텁 (Image/Audio 등은 모듈 최상위에서 안 쓰이지만 안전망)
globalThis.window ??= { setTimeout, clearTimeout, addEventListener() {}, removeEventListener() {} };
globalThis.document ??= { createElement: () => ({ getContext: () => null, style: {} }) };
globalThis.Image ??= class { set src(_v) {} };
const { tracks, rpg, bworld, arrows, world, shop, input, stages, skills, skillShots } = await import(pathToFileURL(out).href);
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
/** 월드 한 걸음(1/60)이 되는 실제 dt — 진행 속도(TUNING.pace = 1/3) 이후 몬스터·방어막 테스트의 시간 단위 (2026-10-02) */
const WSTEP = (1 / 60) / arrows.TUNING.pace;
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
      world.updateWorld(w2, WSTEP, true, input.createInputState());
      w2.player.hp = w2.player.maxHp; w2.barrierHp = w2.barrierMaxHp;
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
  // 대장 (2026-10-02, 사용자: "보스가 너무 커 2/3 로 · 내려오는 속도는 완전 느리게 · 난이도 높게") —
  // 화면 맨 위 밖에서 일정 속도(TUNING.bossDescent)로 아주 천천히 내려오고, 몸이 드러나면 맞으며 마력탄을 쏜다
  const w = mk(); world.resetRun(w, 0); w.rangedWeapon = "none";   // 활 없이 — 내려오는 길을 끝까지 본다
  w.stageElapsedMs = stages.STAGES[0].durationMs * 0.6;
  world.updateWorld(w, WSTEP, true, input.createInputState());
  const boss = w.arrows.find((x) => x.active && x.boss);
  ok("보스 화살이 떴다 (스테이지 58%)", !!boss && w.bossSpawned);
  const startY = boss ? boss.y : 0;
  let shownAt = -1, settledAt = -1, maxY = -1e9;
  const orbIds = new Set();
  const orbMiss = [];
  for (let f = 0; f < 60 * 240 && boss && boss.active && settledAt < 0; f += 1) {
    world.updateWorld(w, 1 / 60, true, input.createInputState());   // 실제 1/60 — 실제 시간으로 잰다
    w.barrierHp = w.barrierMaxHp;
    if (shownAt < 0 && !boss.bossEntering) shownAt = f;
    if (boss.y >= arrows.bossHoverY(w) - 1) settledAt = f;
    maxY = Math.max(maxY, boss.y);
    w.arrows.forEach((x, i) => {
      if (!x.active || !x.fromBoss || x.vy <= 0) return;
      const id = i + ":" + Math.round(x.vx);
      if (orbIds.has(id)) return;
      orbIds.add(id);
      const landX = x.x + x.vx * ((arrows.barrierY(w) - x.y) / x.vy);
      if (Math.abs(landX - w.player.x) > 80) orbMiss.push(Math.round(landX - w.player.x));
    });
  }
  const descentSec = settledAt / 60, shownSec = shownAt / 60;
  ok("대장은 화면 맨 위 밖에서 나타나 내려온다 (첫 위치가 화면 위 밖)", !!boss && startY < w.safeTop, `첫 y ${startY.toFixed(0)} · 화면 위 ${w.safeTop}`);
  ok("대장은 아주 천천히 내려온다 — 자리를 잡기까지 실제 30초 이상", settledAt > 0 && descentSec >= 30, descentSec.toFixed(1) + "초");
  ok("내려오는 동안에도 몸이 드러나면 맞는다 (자리를 잡기 전) — 기다리기만 하는 시간이 없다", shownAt > 0 && shownAt < settledAt, `드러남 ${shownSec.toFixed(1)}초 · 자리 ${descentSec.toFixed(1)}초`);
  ok("대장 크기는 2/3 — 화면 폭보다 좁고 자리는 화면 위쪽(1/3 안)", arrows.bossSize(1) < w.width && maxY < w.height / 3, `크기 ${arrows.bossSize(1)} · 자리 y ${maxY.toFixed(0)}`);
  ok("대장 마력탄은 플레이어 머리 위 돔을 겨눈다 (플레이어는 맞지 않는다)", orbIds.size > 0 && orbMiss.length === 0 && w.player.hp === w.player.maxHp, `마력탄 ${orbIds.size} · 빗나감 ${orbMiss.slice(0, 4).join(",")}`);
  // 활을 들면 깎인다 — 드러난 뒤 실제 20초 안에
  w.rangedWeapon = "bow";
  const cuts0 = boss.bossCutsLeft;
  for (let f = 0; f < 60 * 20 && boss.active && !w.bossDefeated; f += 1) { world.updateWorld(w, 1 / 60, true, input.createInputState()); w.barrierHp = w.barrierMaxHp; }
  ok("기본 사격만으로 대장이 깎인다 (드러난 뒤 실제 20초 안에 처치 수가 줄거나 격파)", w.bossDefeated || !boss.active || boss.bossCutsLeft < cuts0, w.bossDefeated ? "격파" : `${boss.bossCutsLeft}/${boss.bossMaxCuts}`);
}

// ── 기본 화살은 주인공이 쥔 활에서 나간다 (2026-10-02, "기본 화살 애니메이션이 없고 활이 볼품없음") ──
{
  const w = mk(); w.rangedWeapon = "bow"; w.stageElapsedMs = 1000;
  const m = w.arrows.find((x) => !x.active);
  Object.assign(m, { active: true, warningMs: 0, reflected: false, boss: false, fromBoss: false, splitLevel: 0, kind: "normal", hp: 0, maxHp: 0, x: w.player.x + 60, y: 200, vx: 0, vy: 0, atBarrier: false, hitRadius: 8 });
  w.basicTimer = 0;
  let shot = null, hand = null;
  for (let f = 0; f < 10 && !shot; f += 1) {
    hand = skillShots.bowHand(w);
    world.updateWorld(w, 1 / 60, true, input.createInputState()); w.stageElapsedMs = 1000;
    shot = w.skillShots.find((x) => x.active && x.basic) ?? null;
  }
  // 그려지는 출발점(판정 위치 + drawOx/Oy) — 한 프레임 날아간 만큼(속도 × 1/60) + 활 몸 앞(BOW_REACH) 안이어야 한다.
  // 판정 출발점은 예전 그대로(플레이어 중심 −14) — 옮기면 곡선·주간 게이트가 흔들린다 (skillShots.bowHand 주석)
  const d = shot ? Math.hypot(shot.x + shot.drawOx - hand.x, shot.y + shot.drawOy - hand.y) : 1e9;
  const sp = shot ? Math.hypot(shot.vx, shot.vy) : 0;
  ok("기본 화살은 활 손(바라보는 쪽 가슴 앞)에서 나가는 것으로 그려진다 — 몸 한가운데가 아니다", !!shot && d <= skillShots.BOW_REACH + sp / 60 + 2 && Math.abs(hand.x - w.player.x) >= 10 && hand.y < w.player.y - 20, `거리 ${d.toFixed(1)} · 손 ${hand && hand.x.toFixed(0)},${hand && hand.y.toFixed(0)} · 플레이어 ${w.player.x.toFixed(0)},${w.player.y.toFixed(0)}`);
  ok("쏘는 순간 반동 연출(shotFlashMs)이 켜진다 — 시위 떨림·번쩍임", w.shotFlashMs > 0, String(w.shotFlashMs));
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
  for (let f = 0; f < 30; f += 1) world.updateWorld(w, WSTEP, true, input.createInputState());
  ok("몬스터는 방어막에 닿으면 멈춰 선다 (vy 0 · 띠 바로 위 · atBarrier)", trio.every((a) => a.active && a.atBarrier && a.vy === 0 && a.y < by && a.y > by - 40), trio.map((a) => `y${a.y.toFixed(0)} vy${a.vy}`).join(","));
  const hp0 = w.barrierHp;
  for (let f = 0; f < 60 * 2; f += 1) { world.updateWorld(w, WSTEP, true, input.createInputState()); w.stageElapsedMs = 1000; }
  ok("붙은 몬스터가 주기(1.2초)마다 방어막을 깎는다 — 슬라임 셋 2초에 피해 ≥ 5·3", hp0 - w.barrierHp >= 15 && w.barrierHits >= 3, `${hp0} → ${w.barrierHp.toFixed(1)} · 타격 ${w.barrierHits}`);
  ok("붙어 있는 동안은 회복하지 않는다", w.barrierHp < hp0 - 10, w.barrierHp.toFixed(1));
  // 붕괴 = 패배 — 방어막이 유일한 생명이다 (2026-10-02, 옛 규칙: 붕괴하면 HP −1 · 방어막 즉시 복구)
  w.barrierHp = 3;
  let ev = { type: "none" };
  for (let f = 0; f < 60 * 3 && ev.type !== "dead"; f += 1) { ev = world.updateWorld(w, WSTEP, true, input.createInputState()); w.stageElapsedMs = 1000; }
  ok("방어막이 0 이 되면 패배 — 원인은 마지막에 깎은 몬스터", ev.type === "dead" && w.barrierHp === 0 && w.lastHitCause === "normal" && w.barrierBreaks === 1, `${ev.type} · 방어막 ${w.barrierHp} · ${w.lastHitCause}`);
  // 회복 없음 — 방어막은 스테이지마다 가득 찬 채 시작하고 저절로 차지 않는다
  const w3 = mk(); w3.rangedWeapon = "none"; w3.stageElapsedMs = 1000;
  w3.barrierHp = 50;
  for (let f = 0; f < 120; f += 1) { world.updateWorld(w3, WSTEP, true, input.createInputState()); w3.stageElapsedMs = 1000; }
  ok("방어막은 저절로 차지 않는다 (스테이지 시작에만 가득)", w3.barrierHp === 50, w3.barrierHp.toFixed(1));
  // 대장 마력탄은 돔 표면에서 터진다 — 플레이어까지 오지 않는다
  const w4 = mk(); w4.rangedWeapon = "none"; w4.stageElapsedMs = 1000;
  const orb = w4.arrows.find((x) => !x.active);
  Object.assign(orb, { active: true, warningMs: 0, reflected: false, boss: false, fromBoss: true, splitLevel: 0, kind: "aimed", hp: 0, maxHp: 0, x: w4.width / 2, y: arrows.barrierY(w4) - 80, vx: 0, vy: 300, atBarrier: false, hitRadius: 8 });
  const b0 = w4.barrierHp;
  for (let f = 0; f < 60; f += 1) { world.updateWorld(w4, WSTEP, true, input.createInputState()); w4.stageElapsedMs = 1000; }
  ok("대장 마력탄은 돔에 맞아 사라지고 방어막을 깎는다 (플레이어 HP 없음)", !orb.active && w4.barrierHp < b0 && w4.player.hp === w4.player.maxHp, `active ${orb.active} · ${b0} → ${w4.barrierHp.toFixed(1)}`);
  // 생명 = 방어막 두께 — 추가 생명 1 마다 +15%
  const w5 = mk(); w5.player.maxHp = 5; arrows.resetBarrier(w5);
  ok("추가 생명 1 마다 방어막 +15% (기본 120, 생명 2 → 156)", w5.barrierMaxHp === 156 && w5.barrierHp === 156, String(w5.barrierMaxHp));
  ok("손잡이 — 몬스터 속도 0.14 · 회복 0 · 생명당 +15% · 마력탄 8 · 진행 1/3 · 대장 하강 18 · 보스전 생성 ×1.6 (스테이지별 체력·밀도·방어막 피해는 stages.ts 표, 2026-10-02)",
    arrows.TUNING.monsterSpeedMul === 0.14 && arrows.TUNING.barrierRegen === 0 && arrows.TUNING.barrierPerLife === 0.15 && arrows.TUNING.bossOrbDmg === 8
    && Math.abs(arrows.TUNING.pace - 1 / 3) < 1e-9 && arrows.TUNING.bossDescent === 18 && arrows.TUNING.bossSpawnSlow === 1.6, JSON.stringify(arrows.TUNING));
  // 1자 하강 — 보스·보스 마력탄 말고는 vx 가 0 (2026-10-02)
  {
    const w2 = mk(); world.resetRun(w2, 1); w2.rangedWeapon = "none";
    const tilted = [];
    for (let f = 0; f < 60 * 30; f += 1) {
      world.updateWorld(w2, WSTEP, true, input.createInputState()); w2.player.hp = w2.player.maxHp; w2.barrierHp = w2.barrierMaxHp;
      for (const ar of w2.arrows) if (ar.active && !ar.boss && !ar.fromBoss && ar.splitLevel === 0 && !ar.atBarrier && ar.warningMs <= 0 && Math.abs(ar.vx) > 0.5) tilted.push(ar.kind + ":" + ar.vx.toFixed(0));
    }
    ok("몬스터는 1자로 내려온다 — 2스테이지 30초 동안 가로 속도가 있는 몬스터가 없다", tilted.length === 0, tilted.slice(0, 4).join(","));
    ok("돔 방어막 — 가운데가 가장 높고(−150) 가장자리는 낮다", Math.round(arrows.barrierYAt(w2, w2.width * 0.5)) === w2.floorY - 150 && arrows.barrierYAt(w2, w2.safeLeft + 10) > w2.floorY - 150 + 40 && arrows.barrierYAt(w2, w2.safeLeft + 10) < w2.floorY, `가운데 ${arrows.barrierYAt(w2, w2.width * 0.5).toFixed(0)} 가장자리 ${arrows.barrierYAt(w2, w2.safeLeft + 10).toFixed(0)} 바닥 ${w2.floorY}`);
    // 2026-10-02: 기본 사격 단계 = 대장간 활 단계(0~20) — 단계당 피해 +8% · 재사용 −1.5% (예전 정비 골드 강화 +15%/−3%, 0~10)
    ok("기본 사격 = 대장간 활 단계: +10 피해 1.8배 · 재사용 0.85배 · 최대 20", Math.abs(skills.basicDamageMul(10) - 1.8) < 1e-9 && Math.abs(skills.basicCooldownMul(10) - 0.85) < 1e-9 && skills.BASIC_LEVEL_MAX === 20);
  }
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
  // 2026-10-02: 점프 한쪽만은 아직 성공이 아니다 — 보상(completedNotes)은 두 레인을 다 쳤을 때 한 번
  ok("점프: 첫 레인 jump-half(보상 없음) · 두 번째 레인 hit → 'JUMP' · 두 레인 기록 · 완성 노트 1개", r1 === "jump-half" && r2 === "hit" && String(jw.judgeText).startsWith("JUMP") && jw.hitSteps.has(2) && jw.hitSteps2.has(2) && jw.completedNotes.length === 1, `${r1} ${r2} ${jw.judgeText} 완성 ${jw.completedNotes.length}`);
  const jw2 = bworld.createBeatWorld(390, 700, 1, jt, "boots"); jw2.invulnMs = 0; jw2.hp = 5;
  const jses2 = { ...jses, world: jw2, hitSteps: new Set(), evaluatedStep: 0 };
  jw2.beatPosition = 2; bworld.performBeatLane(jses2, 0); // 한 레인만
  for (let i = 0; i < 40; i += 1) bworld.updateBeatWorld(jses2, 1 / 60, true);
  ok("점프에서 한 레인만 치면 MISS (HP −1) · 완성 노트 0 (레이드 보상 없음)", jw2.hp === 4 && jw2.completedNotes.length === 0, `hp ${jw2.hp} 완성 ${jw2.completedNotes.length}`);
  // 롱노트: 머리만 톡 치고 떼면 실패, 꼬리까지 유지하면 완성 (2026-10-02, "모두 1회성 입력으로 성공함")
  const hchart = [0, 1, 2, 3, 4, 5, 6, 7].map(() => ({ sound: "boots", spike: false, lane: 0 }));
  hchart[2] = { sound: "boots", spike: true, lane: 0, hold: 3, holdSteps: 3 };
  for (const t of [3, 4]) hchart[t] = { sound: "boots", spike: false, lane: 0, holdTail: true };
  const hTrack = { ...jt, level: 6 };   // 유효 레벨 > 3 — 일찍 떼면 HP 도 깎인다
  const mkHold = () => { const w = bworld.createBeatWorld(390, 700, 1, hTrack, "boots"); w.invulnMs = 0; w.hp = 5; w.beatPosition = 2; return { ...jses, world: w, chart: hchart, track: hTrack, hitSteps: new Set(), evaluatedStep: 0, holdLane: -1, holdEndStep: -1, holdLane2: -1, holdEndStep2: -1 }; };
  const h1 = mkHold(); const hr = bworld.performBeatLane(h1, 0); const rel = bworld.performBeatRelease(h1, 0);
  ok("롱노트 머리만 톡 치고 떼면: hold-start → release-early · MISS · HP −1 · 완성 노트 0", hr === "hold-start" && rel === "release-early" && h1.world.judgeText === "MISS" && h1.world.hp === 4 && h1.world.completedNotes.length === 0, `${hr} ${rel} ${h1.world.judgeText} hp ${h1.world.hp} 완성 ${h1.world.completedNotes.length}`);
  const h2 = mkHold(); const hr2 = bworld.performBeatLane(h2, 0); const before = h2.world.completedNotes.length;
  h2.world.beatPosition = 5.2; const rel2 = bworld.performBeatRelease(h2, 0);
  ok("롱노트를 꼬리까지 유지하고 떼면: 누를 땐 완성 0 · 뗄 때 release-good · 완성 노트 1", hr2 === "hold-start" && before === 0 && rel2 === "release-good" && h2.world.completedNotes.length === 1, `${hr2} ${before} ${rel2} ${h2.world.completedNotes.length}`);
  const h3 = mkHold(); bworld.performBeatLane(h3, 0); h3.world.beatPosition = 6.1; bworld.settleHoldIfPassed(h3);
  ok("롱노트를 누른 채 꼬리를 지나면 자동 완성 (완성 노트 1)", h3.world.completedNotes.length === 1 && h3.holdEndStep === -1, String(h3.world.completedNotes.length));
  // 일반 탭 노트는 누르는 순간 완성
  const tchart = [0, 1, 2, 3].map(() => ({ sound: "boots", spike: false, lane: 0 })); tchart[2] = { sound: "boots", spike: true, lane: 0 };
  const tw = bworld.createBeatWorld(390, 700, 1, jt, "boots"); tw.beatPosition = 2;
  const tr = bworld.performBeatLane({ ...jses, world: tw, chart: tchart, hitSteps: new Set(), evaluatedStep: 0 }, 0);
  ok("일반 탭 노트는 누르는 순간 hit · 완성 노트 1", tr === "hit" && tw.completedNotes.length === 1, `${tr} ${tw.completedNotes.length}`);
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

// ── 성문 방어 50 스테이지 (2026-10-02, 사용자: "일반원정 스테이지가 5밖에 없던데 50까지 다양하게 레벨 디자인 및 콘텐츠 추가") ──
// 옛 게이트(4 스테이지 · 한 판에 S1→S4): 기준선(장궁+불 Lv1) S1·S2 ≥4/5 · S4 ≤1/5, 풀런 새 S1≥18·S2≥14·S4≤4 / 중간 S3≥12·S4 8~18 / 강함 S4≥15,
// 주간 사흘 안에 6종 학습 · S4 엿새 안 · 7일째 만렙 0·합 28+. 한 판 = 한 스테이지 · 무기 장착 · 50 스테이지에서는 뜻이 없어 아래로 바꿨다.
{
  const ST = stages.STAGES, CH = stages.CHAPTERS;
  ok("50 스테이지 · 5장 × 10칸 · 칸 5 는 중간 보스, 칸 10 은 장 대장", ST.length === 50 && CH.length === 5 && ST.every((x, i) => x.chapter === Math.floor(i / 10) && x.slot === (i % 10) + 1) && ST.every((x) => (x.slot === 10) === (x.slotKind === "boss") && (x.slot === 5) === (x.slotKind === "midboss")));
  ok("스테이지 이름 50개가 모두 다르다", new Set(ST.map((x) => x.name)).size === 50);
  const seq = (x) => x.patterns.map((q) => q.kind).join(",");
  const same = ST.map((x, i) => (i > 0 && seq(x) === seq(ST[i - 1]) ? i + 1 : 0)).filter(Boolean);
  ok("이웃한 스테이지의 웨이브 구성이 서로 다르다 (같은 칸이라도 장·번호마다 순서가 바뀐다)", same.length === 0, same.join(","));
  const kindsOf = (c) => new Set(ST.filter((x) => x.chapter === c).flatMap((x) => x.patterns.map((q) => q.kind)));
  ok("장마다 몬스터가 늘어난다 — 1장엔 오우거·비룡이 없고, 2장에 오우거, 3장에 비룡이 처음 나온다",
    !kindsOf(0).has("ricochet") && !kindsOf(0).has("explosive") && kindsOf(1).has("ricochet") && !kindsOf(1).has("explosive") && kindsOf(2).has("explosive"),
    [0, 1, 2].map((c) => [...kindsOf(c)].join("/")).join(" | "));
  ok("장 대장 스테이지는 갈수록 단단하다 (체력 10 < 20 < 30 < 40 < 50) · 장 대장 처치 수 > 같은 장 중간 보스",
    [9, 19, 29, 39, 49].every((i, k, a) => k === 0 || ST[i].monsterHp > ST[a[k - 1]].monsterHp) && [0, 1, 2, 3, 4].every((c) => ST[c * 10 + 9].bossCuts > ST[c * 10 + 4].bossCuts),
    [9, 19, 29, 39, 49].map((i) => ST[i].monsterHp + "/" + ST[i].bossCuts).join(" "));
  ok("유도탄은 1장에 없고 장이 깊을수록 오른다", ST[0].homingChance === 0 && ST[9].homingChance === 0 && ST[10].homingChance > 0 && ST[40].homingChance > ST[10].homingChance && arrows.homingChanceFor(45) === ST[45].homingChance);
  ok("표는 결정적이다 — 다시 만들어도 같은 스테이지", ST.every((x, i) => JSON.stringify(stages.buildStage(i)) === JSON.stringify(x)));
  ok("장 대장을 깨면 사냥터 지역이 열린다 (10 → 2 · 20 → 3 · 30 → 4 · 40 → 5) · 다른 스테이지는 열지 않는다",
    stages.areaOpenedByClear(9) === 2 && stages.areaOpenedByClear(19) === 3 && stages.areaOpenedByClear(29) === 4 && stages.areaOpenedByClear(39) === 5 && stages.areaOpenedByClear(3) === 0 && stages.areaOpenedByClear(14) === 0);
  ok("스테이지는 순서대로 열린다 — 새 계정은 1만, 1 을 깨면(별) 2, 옛 최고 4 면 1~5",
    stages.stageUnlocked(0, 1, {}) && !stages.stageUnlocked(1, 1, {}) && stages.stageUnlocked(1, 1, { 0: 1 }) && stages.stageUnlocked(4, 4, {}) && !stages.stageUnlocked(5, 4, {}) && stages.nextStageIndex(1, {}) === 0 && stages.nextStageIndex(4, {}) === 4);
  ok("끝없는 성벽 — 1장 대장(10)을 깨면 열린다 · 1층은 10 스테이지 수준 · 41층부터는 50 스테이지보다 단단하다 (조금 더 어렵게)",
    stages.TOWER_UNLOCK_STAGE === 10 && stages.getStage(stages.towerIndexOf(1)).monsterHp >= ST[9].monsterHp * 0.99 && stages.getStage(stages.towerIndexOf(50)).monsterHp > ST[49].monsterHp && stages.getStage(stages.towerIndexOf(50)).bossCuts >= ST[49].bossCuts);
}

// ── 진행 속도 · 대장 크기 (2026-10-02) ──
ok("진행 속도 3배 느리게 — 월드(몬스터·대장·스테이지 시계)는 실제의 1/3 · 무기가 실제 시간으로 쏘는 만큼 몬스터 체력 ×4 · 대장 처치 수 ×3",
  Math.abs(arrows.TUNING.pace - 1 / 3) < 1e-9 && skills.TUNING_HP.mul === 4 && arrows.TUNING.bossCutMul === 3);
ok("대장 크기 2/3 — 5배(480+)에서 줄였다 · 화면 폭(390)보다 좁다", arrows.bossSize(1) === Math.round(492 * 2 / 3) && arrows.bossSize(5) < 390, String(arrows.bossSize(1)));

{
  const { checkpointCurve, stageGate, profileFor, CHECKPOINTS } = await import(pathToFileURL(join(root, "scripts/dodge-sim.mjs")).href);
  const rows = checkpointCurve(5, 8);
  const line = rows.map((r) => `${r.stage + 1}:${r.expected}${r.under === null ? "" : "/" + r.under}`).join(" ");
  ok("50 스테이지 · 기대 성장 계정은 체크포인트(1·5·10·…·50)마다 5시드 중 3회 이상 깬다", rows.every((r) => r.expected >= 3), line);
  ok("50 스테이지 · 8 스테이지 덜 자란 계정은 장 대장(10·20·30·40·50)에서 0~1회 — 성장이 벽을 넘긴다",
    rows.filter((r) => [9, 19, 29, 39, 49].includes(r.stage)).every((r) => r.under !== null && r.under <= 1), line);
  const underAll = rows.filter((r) => r.under !== null);
  const underPct = Math.round(underAll.reduce((s2, r) => s2 + r.under, 0) / (underAll.length * 5) * 100);
  ok("50 스테이지 · 덜 자란 계정의 체크포인트 클리어는 전체 30% 이하", underPct <= 30, underPct + "%");
  ok("몬스터 풀이 차지 않는다 (생성이 조용히 빠지면 쉬워 보인다)", rows.every((r) => !r.pool), rows.filter((r) => r.pool).map((r) => r.stage + 1).join(","));
  ok("진행 속도 — 체크포인트 한 판이 실제 75초 이상 (예전 30~60초의 약 2~3배)", rows.every((r) => r.realSec >= 75), rows.map((r) => r.realSec).join(" "));
  const p20 = profileFor(19);
  const g20 = stageGate(19, p20, 5), g30 = stageGate(29, p20, 5), g40 = stageGate(39, p20, 5);
  ok("같은 계정(20 스테이지 기대 성장)은 깊이 갈수록 막힌다 — 20 ≥ 3/5 · 30 ≤ 1/5 · 40 ≤ 1/5", g20.clear >= 3 && g30.clear <= 1 && g40.clear <= 1, `${g20.clear} · ${g30.clear} · ${g40.clear}`);
  void CHECKPOINTS;
}

// ── 일주일 곡선 (2026-10-02 다시 씀) — 새 계정이 하루 6판(한 판 = 한 스테이지)씩 일주일 ──
{
  const { weekSummary } = await import("./dodge-week-sim.mjs");
  const weeks = weekSummary(3);
  const line = weeks.map((w) => `첫날 ${w.firstDayClears}개 · 2장 ${w.chapter2By}일 · 7일째 ${w.bestDay7} · 배움 ${w.learnedDay7}/${w.unlockedDay7} · 만렙 ${w.maxedDay7} · 대장간 ${w.forgeDay7}`).join(" | ");
  ok("일주일 · 강화를 하나도 못 하는 날이 없다 (이탈 지점)", weeks.every((w) => w.stallDays.length === 0), weeks.map((w) => w.stallDays.join(",") || "없음").join(" | "));
  ok("일주일 · 첫날 2 스테이지 이상 깬다 (첫 플레이가 벽이 아니다)", weeks.every((w) => w.firstDayClears >= 2), line);
  ok("일주일 · 나흘 안에 2장(11 스테이지)에 들어간다", weeks.every((w) => w.chapter2By <= 4), line);
  ok("일주일 · 7일째 최고 15~45 스테이지 — 끝까지 다 끝나 버리지도, 1장에 갇히지도 않는다", weeks.every((w) => w.bestDay7 >= 15 && w.bestDay7 <= 45), line);
  ok("일주일 · 7일째 만렙 무기는 1개 이하 · 무기 5종 이상 배움 · 대장간도 올렸다", weeks.every((w) => w.maxedDay7 <= 1 && w.learnedDay7 >= 5 && w.forgeDay7 >= 6), line);
}

for (const [s, n, d] of results) console.log(s, n, d ? "— " + d : "");
const fails = results.filter((x) => x[0] === "FAIL").length;
console.log(fails === 0 ? "\nALL PASS" : `\n${fails} FAIL`);
process.exit(fails === 0 ? 0 : 1);
