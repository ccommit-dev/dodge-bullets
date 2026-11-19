/**
 * 성능 조절기 단언 (2026-11-19, 첨부 엔진 차용 — src/ui/perfGovernor.ts) — 가짜 프레임 간격으로 판정 규칙만 잰다(브라우저 없음).
 *   node scripts/verify-perf-governor.mjs
 * ① 동적 해상도: 느리면 2창 뒤 ×0.85 · 1 아래로 안 내림 · 빠르면 기다림(8창) 뒤 ×1.1 · 상한 · 올린 직후 다시 느리면 기다림 두 배 · 배운 값 저장 · 안전 시작은 1
 * ② 효과 단계: 3창 느리면 줄임 · 기다림 뒤 되살림 · 120Hz(8.3ms) 화면을 '느림'으로 보지 않는다
 * ③ 안전 시작: 표시가 남아 있으면 true
 */
import { build } from "esbuild";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd().replace(/\\/g, "/");
const dir = mkdtempSync(join(tmpdir(), "gov-"));
const entry = join(dir, "entry.ts");
writeFileSync(entry, `export * from "${root}/src/ui/perfGovernor";`);
const out = join(dir, "out.mjs");
await build({ entryPoints: [entry], bundle: true, format: "esm", platform: "node", outfile: out, define: { "import.meta.env.PROD": "false" }, logLevel: "error" });
const G = await import(pathToFileURL(out).href);
rmSync(dir, { recursive: true, force: true });

let fail = 0;
const ok = (name, cond, info = "") => { console.log(`${cond ? "PASS" : "FAIL"} ${name}${info ? ` — ${info}` : ""}`); if (!cond) fail += 1; };
const memStore = () => { const m = new Map(); return { get: (k) => (m.has(k) ? m.get(k) : null), set: (k, v) => m.set(k, String(v)), m }; };
let clock = 0;
const now = () => clock;
/** sec 초 동안 ms 간격 프레임을 넣고, 돌려준 값들을 모은다 */
const feed = (gov, ms, sec) => { const got = []; for (let t = 0; t < sec * 1000; t += ms) { clock += ms; const r = gov.sample(ms); if (r != null) got.push(r); } return got; };

// ① 동적 해상도
{
  clock = 0;
  const st = memStore();
  const g = G.scaleGovernor("t", 2, { store: st, now });
  ok("① 처음 배율 = 상한 2", g.scale === 2);
  feed(g, 16.7, 3);   // 주기 학습(60Hz)
  ok("① 60Hz 빠른 판은 그대로", g.scale === 2);
  const down = feed(g, 30, 3.5);
  ok("① 느리면(30ms) 2창 뒤 ×0.85 → 1.7", down[0] === 1.7, JSON.stringify(down));
  feed(g, 30, 20);
  ok("① 계속 느려도 1 아래로 안 내린다", g.scale === 1, String(g.scale));
  ok("① 배운 배율 저장", st.get("dodgebullets:render-scale:t") === "1");
  const up = feed(g, 16.7, 12);
  ok("① 빠르면 기다림(8창) 뒤 ×1.1", up.length === 1 && up[0] === 1.1, JSON.stringify(up) + ` · 기다림 ${g.wait}`);
  feed(g, 30, 3);
  ok("① 올린 직후 다시 느리면 기다림 두 배(8 → 16)", g.wait === 16, String(g.wait));
  const g2 = G.scaleGovernor("t", 2, { store: st, now });
  ok("① 다음 판은 배운 값에서 시작", g2.scale === g.scale, `${g2.scale} = ${g.scale}`);
  const g3 = G.scaleGovernor("t3", 2, { store: memStore(), now, startLow: true });
  ok("① 안전 시작이면 1 에서", g3.scale === 1);
  const g4 = G.scaleGovernor("t4", 2, { store: memStore(), now });
  feed(g4, 8.33, 3);
  feed(g4, 8.33, 30);
  ok("① 120Hz(8.3ms) 판을 느림으로 보지 않는다", g4.scale === 2);
  feed(g4, 400, 5);
  ok("① 긴 틈(백그라운드 복귀 400ms)은 판정에서 뺀다", g4.scale === 2);
}
// ② 효과 단계
{
  clock = 0;
  const f = G.fxGovernor("h", false, { store: memStore(), now });
  feed(f, 16.7, 2);
  const a = feed(f, 28, 4.5);
  ok("② 3창 느리면 효과 줄임(true)", a[0] === true, JSON.stringify(a));
  const b = feed(f, 16.7, 9.5);
  ok("② 기다림(8창) 빠르면 되살림(false)", b[0] === false, JSON.stringify(b));
  feed(f, 28, 4);
  ok("② 되살린 직후 다시 느리면 기다림 두 배", f.wait === 16 && f.low === true, `wait ${f.wait} low ${f.low}`);
  const g = G.fxGovernor("h2", true, { store: memStore(), now });
  ok("② 저사양 기기로 시작하면 low", g.low === true);
}
// ③ 안전 시작
{
  const st = memStore();
  ok("③ 첫 실행은 안전 시작 아님", G.bootGuard(st, true) === false);
  ok("③ 표시가 남은 채 다시 켜면 안전 시작", G.bootGuard(st, true) === true && G.isSafeBoot() === true);
  ok("③ 꺼진 빌드(개발 서버)는 표시를 안 남기고 안전 시작도 없음", G.bootGuard(memStore(), false) === false && G.isSafeBoot() === false);
}
console.log(fail ? `\n${fail} FAIL` : "\nALL PASS");
process.exit(fail ? 1 : 0);
