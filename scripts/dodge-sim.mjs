/**
 * 화살 원정 검객 봇 시뮬 — 새 검격 규칙(스윙 호·정타 반사·파쇄)으로 스테이지 패턴 수치를 재조정하기 위한 계측.
 *
 * 봇 정책(숙련자 근사): 가장 먼저 닿을 화살을 고르고
 *   - 0.42초 안에 닿고 검격이 준비됐으면 그쪽을 바라보고 스윙 (정타 거리면 반사)
 *   - 아니면 위에서 오면 x 로 비켜서고, 옆에서 몸 높이로 오면 점프, 그 외엔 화면 중앙으로 복귀
 * 스테이지별 5시드 평균의 피격·베기·반사·클리어율을 낸다. 목표: 피격 ≤ HP−1 로 클리어, 베기율 ≥ 40%.
 *   node scripts/dodge-sim.mjs [--json]
 */
import { build } from "esbuild";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd().replace(/\\/g, "/");
const dir = mkdtempSync(join(tmpdir(), "dodgesim-"));
const entry = join(dir, "entry.ts");
writeFileSync(entry, [
  `export * as world from "${root}/src/game/world";`,
  `export * as shop from "${root}/src/game/shop";`,
  `export * as input from "${root}/src/game/input";`,
  `export * as stages from "${root}/src/game/stages";`,
].join("\n"));
const out = join(dir, "bundle.mjs");
await build({ entryPoints: [entry], bundle: true, format: "esm", outfile: out, platform: "node", define: { "import.meta.env.BASE_URL": '"/"', "import.meta.env.DEV": "false", "import.meta.env.PROD": "true" } });
globalThis.window ??= { setTimeout, clearTimeout, addEventListener() {}, removeEventListener() {} };
globalThis.document ??= { createElement: () => ({ getContext: () => null, style: {} }) };
globalThis.Image ??= class { set src(_v) {} };
const { world: W, shop, input: I, stages } = await import(pathToFileURL(out).href);
rmSync(dir, { recursive: true, force: true });

/** 결정적 난수 (mulberry32) — Math.random 을 시드별로 바꿔 끼운다 */
function seeded(seed) { let a = seed >>> 0; return () => { a += 0x6d2b79f5; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

export function simulateStage(stageIndex, seed, opts = {}) {
  const rng = seeded(seed);
  const realRandom = Math.random;
  Math.random = rng;
  const w = W.createWorld(390, 700, 1);
  // 스테이지 도달 시점의 성장(30일 밸런스 시뮬 기준): Lv 8/21/37/55 · 장착 검 3/6/10/13 · 원정 최고 스테이지 = 현재
  const growth = [{ level: 8, equippedWeaponLevel: 3 }, { level: 21, equippedWeaponLevel: 6 }, { level: 37, equippedWeaponLevel: 10 }, { level: 55, equippedWeaponLevel: 13 }][Math.min(3, stageIndex)];
  W.applyStats(w, shop.statsFromLevels(shop.derivedShopLevels({ ...growth, dodgeBestStage: stageIndex + 1 })));
  W.resetRun(w, stageIndex);
  const inp = I.createInputState();
  const dt = 1 / 60;
  let hits = 0, spawnedMax = 0, frames = 0, clear = false, dead = false; let hitLog = [];
  let seenArrows = new Set();
  const p = w.player;
  const stage = stages.getStage(stageIndex);
  // 실제 스테이지는 보스가 쓰러질 때까지 이어진다 — 지속 시간의 2.5배까지 본다
  const totalFrames = Math.ceil((stage.durationMs / 1000) / dt * 2.5);
  while (frames < totalFrames) {
    frames += 1;
    // 위협 평가
    let best = null;
    for (let i = 0; i < w.arrows.length; i += 1) {
      const a = w.arrows[i];
      if (!a.active || a.reflected || a.warningMs > 0) continue;
      seenArrows.add(i + ":" + Math.round(a.x) + ":" + Math.round(a.y) + ":" + a.kind);
      const dx = p.x - a.x, dy = p.y - a.y;
      const sp = Math.hypot(a.vx, a.vy) || 1;
      const along = (dx * a.vx + dy * a.vy) / sp; // 진행 방향 거리
      if (along < -10) continue; // 이미 지나감
      const lateral = Math.abs(dx * a.vy - dy * a.vx) / sp;
      if (lateral > 46) continue; // 안 맞을 궤도
      const tti = along / sp;
      if (!best || tti < best.tti) best = { a, tti, along, dx: -dx, dy: -dy, lateral };
    }
    inp.left = false; inp.right = false; inp.jumpPressed = false; inp.slowPressed = false; inp.dashPressed = false;
    const ready = p.slowCdMs <= 0 && p.slowActiveMs <= 0;
    if (best) {
      const fromRight = best.dx > 0; // 화살이 오른쪽에 있음
      const facingOk = (fromRight && p.facing > 0) || (!fromRight && p.facing < 0) || Math.abs(best.dx) < 12;
      // 스윙은 화살이 검격 반경(slowRadius) 안에 들어왔을 때 — 밖에서 휘두르면 헛스윙
      const reach = w.stats.slowRadius * (opts.reach ?? 0.92);
      if (best.along <= reach && ready) {
        if (!facingOk) { if (fromRight) inp.right = true; else inp.left = true; } // 이번 프레임에 방향 전환
        else inp.slowPressed = true;
      } else if (best.tti <= 0.22 && !ready && w.stats.dashUnlocked && p.dashCdMs <= 0 && p.dashActiveMs <= 0) {
        // 검격이 안 되면 마지막 순간 대시(무적 프레임)로 빠져나간다 — 숙련자의 두 번째 도구
        inp.dashPressed = true;
      } else if (best.tti <= 0.55 && (!ready || best.along > reach)) {
        // 못 베면 회피: 위에서 오면 옆으로, 옆에서 오면 점프
        const fromAbove = Math.abs(best.a.vy) > Math.abs(best.a.vx);
        if (fromAbove) { if (best.a.x >= p.x) inp.left = true; else inp.right = true; }
        else if (Math.abs(best.dy) < 40 && p.onGround) inp.jumpPressed = true;
        else { if (best.a.x >= p.x) inp.left = true; else inp.right = true; }
      } else if (best.tti > 0.7) {
        // 여유: 화살 쪽을 바라보고 중앙 근처 유지
        if (fromRight && p.facing < 0) inp.right = true; else if (!fromRight && p.facing > 0) inp.left = true;
      }
    } else if (p.x < w.width * 0.42) inp.right = true; else if (p.x > w.width * 0.58) inp.left = true;
    const ev = W.updateWorld(w, dt, true, inp);
    if (ev.type === "hit") { hits += 1; (hitLog ??= []).push(`${w.lastHitCause}@${Math.round(w.stageElapsedMs / 1000)}s`); }
    if (ev.type === "dead") { dead = true; break; }
    if (ev.type === "clear") { clear = true; break; }
  }
  Math.random = realRandom;
  return { stage: stageIndex, seed, hits, hitLog, cuts: w.countered, reflects: w.reflectKills, ults: w.ultCount, maxCombo: w.maxCombo, dodged: w.dodged, clear, dead, seconds: Math.round(frames * dt), hp: p.maxHp };
}

export function runAll() {
const rows = [];
for (let stage = 0; stage < stages.STAGES.length; stage += 1) {
  const runs = [1, 2, 3, 4, 5].map((seed) => simulateStage(stage, seed * 7919 + stage));
  const avg = (k) => runs.reduce((s, r) => s + r[k], 0) / runs.length;
  const spawned = runs.map((r) => r.cuts + r.dodged + r.hits);
  const cutRate = runs.reduce((s, r, i) => s + r.cuts / Math.max(1, spawned[i]), 0) / runs.length;
  const causes = runs.flatMap((r) => r.hitLog).join(" ");
  rows.push({ causes, stage: stage + 1, name: stages.STAGES[stage].name, hp: runs[0].hp, hits: +avg("hits").toFixed(1), cuts: +avg("cuts").toFixed(1), reflects: +avg("reflects").toFixed(1), ults: +avg("ults").toFixed(1), cutRate: +(cutRate * 100).toFixed(0), clear: runs.filter((r) => r.clear).length, dead: runs.filter((r) => r.dead).length });
}
return rows;
}

const isMain = !!process.argv[1] && process.argv[1].endsWith("dodge-sim.mjs");
if (isMain) {
  const rows = runAll();
  if (process.argv.includes("--json")) console.log(JSON.stringify(rows));
  else {
  console.log("| 스테이지 | HP | 피격 | 베기 | 반사 | 일섬 | 베기율 | 클리어/5 | 사망/5 |");
  console.log("|---|---|---|---|---|---|---|---|---|");
  for (const r of rows) console.log(`| ${r.stage} ${r.name} | ${r.hp} | ${r.hits} | ${r.cuts} | ${r.reflects} | ${r.ults} | ${r.cutRate}% | ${r.clear} | ${r.dead} |`);
  if (process.argv.includes("--causes")) for (const r of rows) console.log(`S${r.stage} 피격 원인: ${r.causes}`);
  }
}
