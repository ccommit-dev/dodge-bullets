/**
 * 비트 원정 봇 시뮬 — 사람 반응 모델로 48채보(16곡 × EASY/NORMAL/HARD)를 실제 월드(updateBeatWorld·performBeatLane·롱노트 릴리즈)로 플레이한다.
 * "귀로 확인"의 대체: 숙련자 모델이 전부 클리어하고, 초보 모델이 EASY(유효 레벨 ≤ 4)를 클리어하면 채보가 손에 맞는 것.
 *   node scripts/beat-sim.mjs [--json] [--profile=competent|novice]
 * 봇: 노트가 판정 창 안에 들어오면 hitRate 확률로 탭(반응 지터 ±jitterMs), 롱노트는 머리를 친 뒤 꼬리 근처에서 뗀다.
 *   competent: hitRate .93 · 지터 45ms   /   novice: hitRate .85 · 지터 80ms (놓친 노트 15%)
 */
import { build } from "esbuild";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd().replace(/\\/g, "/");
const dir = mkdtempSync(join(tmpdir(), "beatsim-"));
const entry = join(dir, "entry.ts");
writeFileSync(entry, [`export * as tracks from "${root}/src/beat/tracks";`, `export * as world from "${root}/src/beat/world";`, `export * as rpg from "${root}/src/beat/rpg";`].join("\n"));
const out = join(dir, "bundle.mjs");
await build({ entryPoints: [entry], bundle: true, format: "esm", outfile: out, platform: "node", define: { "import.meta.env.BASE_URL": '"/"', "import.meta.env.DEV": "false", "import.meta.env.PROD": "true" } });
globalThis.window ??= { setTimeout, clearTimeout, addEventListener() {}, removeEventListener() {} };
globalThis.document ??= { createElement: () => ({ getContext: () => null, style: {} }) };
globalThis.Image ??= class { set src(_v) {} };
const { tracks: T, world: W, rpg: RPG } = await import(pathToFileURL(out).href);
rmSync(dir, { recursive: true, force: true });

export const PROFILES = {
  competent: { hitRate: 0.93, jitterMs: 45 },
  novice: { hitRate: 0.85, jitterMs: 80 },
};

function seeded(seed) { let a = seed >>> 0; return () => { a += 0x6d2b79f5; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

const fakeBox = { isTransportRunning: () => false, getTransportPosition: () => 0, getTransportStepTime: () => 0, rebaseTransport() {}, playLead() {}, playSound() {}, stopLessonTransport() {} };

export function simulateChart(trackId, difficulty, profile = "competent", seed = 1) {
  const rng = seeded(seed);
  const realRandom = Math.random; Math.random = rng;
  const base = T.BEAT_TRACKS.find((t) => t.id === trackId);
  const track = { ...base, difficulty, subdivision: difficulty === "easy" ? 4 : difficulty === "medium" ? 8 : 16 };
  const chart = T.buildChart(track);
  const world = W.createBeatWorld(390, 700, 1, track, chart[0]?.sound ?? "boots");
  world.invulnMs = 0;
  const session = { world, chart, track, box: fakeBox, ctx: null, master: null, backingAudio: null, enabled: false, skills: RPG.emptySkills(), isSpar: false, lockHits: 0, taps: 0, hitSteps: new Set(), evaluatedStep: 0, calibrationSec: 0, holdLane: -1, holdEndStep: -1 };
  const { hitRate, jitterMs } = PROFILES[profile];
  const stepSec = world.stepSec;
  const plan = new Map(); // 노트 인덱스 → { at: 탭할 위치(스텝), skip }
  for (let i = 0; i < chart.length; i += 1) {
    if (!chart[i].spike) continue;
    const skip = rng() > hitRate;
    const jitter = ((rng() * 2 - 1) * jitterMs) / 1000 / stepSec;
    plan.set(i, { at: i + jitter, skip, done: false });
  }
  let minHp = world.hp, taps = 0, hits = 0, holdsOk = 0, holdsEarly = 0, ended = "timeout";
  const dt = 1 / 60;
  let releaseAt = -1, releaseLane = -1;
  for (let frame = 0; frame < 60 * 400; frame += 1) {
    const ev = W.updateBeatWorld(session, dt, true);
    const pos = world.beatPosition;
    // 롱노트 릴리즈 — 꼬리 0.4스텝 앞에서 뗀다 (숙련자), 초보는 가끔 일찍 뗀다
    if (session.holdEndStep >= 0 && releaseAt < 0) { releaseAt = session.holdEndStep - 0.4 - (profile === "novice" && rng() < 0.25 ? 1.2 : 0); releaseLane = session.holdLane; }
    if (releaseAt >= 0 && pos >= releaseAt) { const r = W.performBeatRelease(session, releaseLane); if (r === "release-good") holdsOk += 1; else if (r === "release-early") holdsEarly += 1; releaseAt = -1; releaseLane = -1; }
    // 탭
    for (const [i, p] of plan) {
      if (p.done || pos < p.at) continue;
      p.done = true;
      if (p.skip) continue;
      const lane = W.laneOfSound(chart[i].sound);
      taps += 1;
      const res = W.performBeatLane(session, lane);
      if (res === "hit") hits += 1;
    }
    W.settleHoldIfPassed(session);
    minHp = Math.min(minHp, world.hp);
    if (ev.type === "dead" || world.dead) { ended = "dead"; break; }
    if (ev.type === "clear" || world.cleared) { ended = "clear"; break; }
  }
  Math.random = realRandom;
  const notes = [...plan.keys()].length;
  return { id: trackId, difficulty, level: T.effectiveLevel(track), profile, ended, minHp, hp: world.hp, maxHp: world.maxHp, notes, taps, hits, maxCombo: world.maxCombo, holdsOk, holdsEarly, seconds: Math.round(world.elapsedMs / 1000) };
}

export function runAll(profile = "competent") {
  const rows = [];
  for (const t of T.BEAT_TRACKS) for (const d of ["easy", "medium", "hard"]) rows.push(simulateChart(t.id, d, profile, 7));
  return rows;
}

const isMain = !!process.argv[1] && process.argv[1].endsWith("beat-sim.mjs");
if (isMain) {
  const profile = (process.argv.find((a) => a.startsWith("--profile=")) ?? "--profile=competent").split("=")[1];
  const rows = runAll(profile);
  if (process.argv.includes("--json")) console.log(JSON.stringify(rows));
  else {
    console.log(`| 곡 | 변형 | Lv | 결과 | 최저 HP | 노트 | 히트/탭 | 최대 콤보 | 롱노트 완주/조기 |`);
    console.log("|---|---|---|---|---|---|---|---|---|");
    for (const r of rows) console.log(`| ${r.id} | ${r.difficulty} | ${r.level} | ${r.ended} | ${r.minHp}/${r.maxHp} | ${r.notes} | ${r.hits}/${r.taps} | ${r.maxCombo} | ${r.holdsOk}/${r.holdsEarly} |`);
    console.log(`\n${profile}: clear ${rows.filter((r) => r.ended === "clear").length}/${rows.length}`);
  }
}
