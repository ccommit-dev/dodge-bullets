// 대장의 반격 (titans/bossPressure, 2026-10-27) — 순수 로직.  node scripts/verify-boss-pressure.mjs
// 원정대 체력이 0 이 되면 대장 도전 실패. 규칙: 페이스² > 1/s 여야 이긴다(s = 스테이지 난도 계수 · 역할 보정).
import { build } from "esbuild";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd().replace(/\\/g, "/");
const dir = mkdtempSync(join(tmpdir(), "bosspressure-"));
const entry = join(dir, "entry.ts");
writeFileSync(entry, `export * from "${root}/src/titans/bossPressure";`);
const out = join(dir, "bundle.mjs");
await build({ entryPoints: [entry], bundle: true, format: "esm", platform: "node", outfile: out, logLevel: "error" });
const B = await import(pathToFileURL(out).href);
rmSync(dir, { recursive: true, force: true });
let fails = 0;
const ok = (n, c, d = "") => { console.log(`${c ? "PASS" : "FAIL"} ${n}${d ? " — " + d : ""}`); if (!c) fails += 1; };

// 한 판 — 페이스 p 로 깎으면 대장은 T/p 에 쓰러진다. 그 전에 대장이 gap 초마다 친다
function fight(stage, pace, { tanks = 0, healers = 0, T = 30, gap = 1.1 } = {}) {
  let hp = 1, t = 0;
  const bossDies = T / pace;
  while (t + gap < Math.min(bossDies, T)) {
    t += gap;
    const elapsed = t / T, hpLeft = Math.max(0, 1 - pace * elapsed);
    hp -= B.bossHitFraction(stage, tanks, healers, B.bossPace(hpLeft, elapsed), T, gap);
    if (hp <= 0) return { win: false, by: "party", t };
  }
  return bossDies <= T ? { win: true, t: bossDies } : { win: false, by: "timer", t: T };
}

ok("난도 계수: 10층까지 1 · 60층 0.8 · 단조 감소", B.bossPressureScale(1) === 1 && B.bossPressureScale(10) === 1 && Math.abs(B.bossPressureScale(60) - 0.8) < 1e-9 && B.bossPressureScale(35) < 1 && B.bossPressureScale(35) > 0.8);
ok("초반(5층): 제한시간 안에 잡는 페이스면 원정대는 안 쓰러진다", fight(5, 1.02).win && fight(5, 1.3).win, JSON.stringify(fight(5, 1.02)));
// 느리면 예전처럼 실패 — 결과는 같고, 시간 초과 직전에 원정대가 먼저 쓰러질 수 있다(s·p < 1)
ok("초반(5층): 느리면(페이스 0.9) 예전처럼 실패", !fight(5, 0.9).win, JSON.stringify(fight(5, 0.9)));
const late = fight(60, 1.05);
ok("후반(60층): 겨우 시간 안(페이스 1.05)이면 원정대가 먼저 쓰러진다 — 실제로 어려워진다", !late.win && late.by === "party", JSON.stringify(late));
ok("후반(60층): 충분히 세면(페이스 1.2) 이긴다", fight(60, 1.2).win);
ok("탱커 2 · 힐러 2 는 버티는 시간을 늘린다(60층 페이스 1.1)", !fight(60, 1.1).win && fight(60, 1.1, { tanks: 2, healers: 2 }).win);
ok("공격 한 번의 피해 비율은 0~1", [1, 30, 60, 120].every((st) => [0.2, 1, 5].every((p) => { const f = B.bossHitFraction(st, 0, 0, p, 30, 1.1); return f > 0 && f <= 1; })));
ok("공격 간격이 예전보다 짧다(보스 1.1초 < 1.8 · 일반 1.5초 < 2.3)", B.BOSS_ATTACK_GAP_MS < 1800 && B.MOB_ATTACK_GAP_MS < 2300);
console.log(fails ? `${fails} FAIL` : "ALL PASS");
process.exit(fails ? 1 : 0);
