/**
 * 해금 계단 (2026-11-13, 정리 목표 3 "4단계를 10단계 안팎으로 — 한 번에 새 시스템 하나만") — node scripts/verify-ladder.mjs
 *  ① 칸 수 10~15 · 층이 칸마다 커진다(같은 층에 둘이 열리지 않는다) · 이름 · 얻는 것이 비지 않는다
 *  ② 판정: 층 미만 잠김 · 이상 열림 · nextLadder/ladderCount 가 맞다(테스트 모드 아님 — node 는 늘 잠금 규칙)
 *  ③ 모험 카드(hubCards)가 계단을 읽는다 — 사냥터 1층 새 저장은 여섯 장 모두 잠김 · 25층이면 계단 잠금은 없다
 *  ④ 진입점이 새지 않는다 — 표의 모든 칸이 TitansGame · hubCards 어딘가에서 ladderOpen("<id>") 로 읽힌다
 */
import { build } from "esbuild";
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd().replace(/\\/g, "/");
const dir = mkdtempSync(join(tmpdir(), "ladder-"));
const entry = join(dir, "entry.ts");
writeFileSync(entry, [
  `export * as LD from "${root}/src/progression/ladder";`,
  `export * as HC from "${root}/src/titans/hubCards";`,
  `export * as M from "${root}/src/progression/model";`,
  `export * as EV from "${root}/src/events/eventSave";`,
].join("\n"));
const out = join(dir, "bundle.mjs");
await build({ entryPoints: [entry], bundle: true, format: "esm", platform: "node", outfile: out, logLevel: "error", loader: { ".png": "empty", ".webp": "empty", ".css": "empty", ".mp3": "empty", ".m4a": "empty" }, define: { "import.meta.env.BASE_URL": '"/"', "import.meta.env.DEV": "false", "import.meta.env.PROD": "true", "import.meta.env.VITE_QA_BUILD": "undefined" } });
const { LD, HC, M, EV } = await import(pathToFileURL(out).href);
rmSync(dir, { recursive: true, force: true });

const results = []; const ok = (n, c, d = "") => results.push([c ? "PASS" : "FAIL", n, d]);
const L = LD.LADDER;
ok("① 칸 10~15개", L.length >= 10 && L.length <= 15, String(L.length));
ok("① 층이 칸마다 커진다(한 층에 하나)", L.every((s, i) => i === 0 || s.stage > L[i - 1].stage), L.map((s) => s.stage).join(","));
ok("① 이름 · 얻는 것", L.every((s) => s.name && s.gives && s.id), "");
ok("① id 겹침 없음", new Set(L.map((s) => s.id)).size === L.length, "");
const s0 = L[0];
ok("② 층 미만 잠김 · 이상 열림", !LD.ladderOpen(s0.id, s0.stage - 1) && LD.ladderOpen(s0.id, s0.stage), "");
ok("② ladderCount · nextLadder", LD.ladderCount(1) === 0 && LD.nextLadder(1)?.id === s0.id && LD.ladderCount(999) === L.length && LD.nextLadder(999) === null, "");
ok("② 잠금 안내는 '무엇을 하면 열리나' — 층 · 얻는 것", L.every((s) => LD.ladderLockHint(s.id).includes(`STAGE ${s.stage}`) && LD.ladderLockHint(s.id).includes(s.gives)), LD.ladderLockHint(s0.id));

const ev = EV.emptyEventSave ? EV.emptyEventSave() : EV.defaultEventSave?.() ?? { riftAttempts: 0, claimed: {} };
const fresh = { ...M.emptyCharacterProgress(), onboardingStep: 4, towerOpen: true, titanBestStage: 1 };
const low = HC.hubCards(fresh, ev, { huntBest: 1 });
ok("③ 사냥터 1층 — 모험 카드 여섯 장 모두 잠김(계단)", low.length === 6 && low.every((c) => c.locked && /STAGE/.test(c.lockHint ?? "")), low.map((c) => `${c.id}:${c.locked}`).join(" "));
const high = HC.hubCards({ ...fresh, titanBestStage: 30 }, ev, { huntBest: 30 });
ok("③ 사냥터 30층 — 계단 잠금 없음(남은 잠금은 예전 조건뿐) · 카드마다 얻는 것", high.every((c) => !(c.lockHint ?? "").includes("사냥터 STAGE")) && high.every((c) => !!c.gives), high.map((c) => `${c.id}:${c.locked}`).join(" "));
ok("③ 빈 저장은 ladderSeen −1(옛 저장 조용히 맞춤)", M.emptyCharacterProgress().ladderSeen === -1 && M.normalizeCharacterProgress({ ladderSeen: 4 }).ladderSeen === 4, "");

const src = readFileSync("src/TitansGame.tsx", "utf8") + readFileSync("src/titans/hubCards.ts", "utf8");
const read = new Set([...src.matchAll(/ladderOpen\("([a-z]+)"/g)].map((m) => m[1]));
for (const m of src.matchAll(/LADDER_OF[^=]*=\s*\{([^}]*)\}/g)) for (const x of m[1].matchAll(/"([a-z]+)"/g)) read.add(x[1]);
const missing = L.map((s) => s.id).filter((id) => !read.has(id));
ok("④ 표의 모든 칸이 진입점에서 읽힌다", missing.length === 0, missing.join(","));

let fails = 0;
for (const [st, n, d] of results) { console.log(`${st} ${n}${d && st === "FAIL" ? " — " + d : ""}`); if (st === "FAIL") fails += 1; }
console.log(fails ? `\n${fails} FAIL` : "\nALL PASS");
process.exit(fails ? 1 : 0);
