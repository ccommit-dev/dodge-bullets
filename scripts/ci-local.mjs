#!/usr/bin/env node
// 푸시 전 CI 미리 돌리기 (2026-10-28, 사용자: "배포오류 꾸준히 나던데 안나게 방지좀 해주라")
//
// CI 가 깨진 원인은 둘이었다 — ① 로컬에서 eslint 를 안 돌려 같은 lint 오류가 푸시 4번 내내 남음(632e9a4 까지),
// ② 공유 작업 트리에서 hunk 만 골라 커밋하다 줄이 엉뚱한 자리에 들어가 "작업 트리는 멀쩡 · 커밋은 문법 오류"(b67344f).
// 그래서 작업 트리가 아니라 **푸시할 커밋의 트리**를 저장소 밖 임시 폴더에 꺼내 .github/workflows/check.yml 의
// run 단계를 그대로 돌린다(워크플로가 바뀌면 이 검사도 따라 바뀐다). docs/ 가 바뀐 커밋은 Pages 산출물의
// index.html 이 가리키는 파일이 트리에 다 있는지도 본다(빠진 lazy 조각 = 빈 화면).
//
// Android Build(android.yml)의 Gradle 단계 (2026-10-29): 웹 번들은 위 웹 빌드가 이미 잡는다. Gradle 만 깨질 수 있는 건
// 네이티브 쪽이 바뀔 때뿐이라 — 푸시할 커밋들이 android/ · capacitor.config.ts · package(-lock).json · android.yml 을
// 건드렸으면 같은 임시 폴더에서 QA 웹 빌드 → cap sync android → gradlew assembleDebug 까지 돈다(1 ~ 3분).
// 작업 트리에서 sync 하지 않으니 sync 가 고쳐 쓰는 android/*.gradle · ios Package.swift 회귀(메모리)도 생기지 않는다.
// JDK · Android SDK 가 없는 PC 에서는 건너뛴다고 알리고 웹 검사만으로 판단한다(CI 가 대신 잡는다).
//
//   node scripts/ci-local.mjs [커밋|트리 ...]      기본 HEAD (Gradle 은 origin/main 대비 네이티브 변경이 있을 때)
//   node scripts/ci-local.mjs --android [커밋]     Gradle 단계도 강제로
//   node scripts/ci-local.mjs --pre-push          .git/hooks/pre-push 가 부른다(stdin 으로 푸시할 ref)
//   node scripts/ci-local.mjs --install           .git/hooks/pre-push 설치
//
// 한 번 통과한 트리는 기억해 두어 같은 커밋을 main · feat 로 두 번 밀어도 한 번만 돈다(Gradle 통과는 따로 기억).
// 정말 급할 때만 git push --no-verify (CI 가 대신 잡는다).
//
// 주의(메모리): 임시 폴더는 저장소 밖(저장소 안 tsconfig 는 vite deps 캐시를 비워 504) ·
// node_modules 는 정션 — 지울 때 정션을 먼저 떼고(unlink) 원본 .bin 이 남았는지 확인한 뒤 폴더를 지운다.
import { spawn, spawnSync } from "node:child_process";
import { existsSync, lstatSync, mkdirSync, readFileSync, rmSync, symlinkSync, unlinkSync, writeFileSync, chmodSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WORK = join(tmpdir(), "dodge-ci-local");
const PASSED = join(WORK, "passed");
// CI 단계가 쓰지 않는 무거운 폴더 — 꺼내지 않는다(eslint 도 android · ios · docs/game 은 무시한다).
// art-gen 은 단언이 읽는 작은 설정(anim-layout.json 등)만 — 256KB 넘는 원화 · 모델은 뺀다. android/ 는 Gradle 단계 때만
const skipFile = (path, size, android) =>
  path.startsWith("docs/") || path.startsWith("ios/") || (!android && path.startsWith("android/")) || (path.startsWith("art-gen/") && size > 262_144);
// Gradle 만 깨뜨릴 수 있는 경로 — 이게 바뀐 푸시만 Gradle 단계를 돈다
const ANDROID_PATHS = /^(android\/|capacitor\.config\.ts$|package(-lock)?\.json$|\.github\/workflows\/android\.yml$)/;

const git = (args, opts = {}) => {
  const r = spawnSync("git", args, { cwd: ROOT, encoding: "utf8", maxBuffer: 256 << 20, ...opts });
  if (r.status !== 0) throw new Error(`git ${args.join(" ")}: ${r.stderr || r.stdout}`);
  return r.stdout;
};
const gitOk = (args) => spawnSync("git", args, { cwd: ROOT, encoding: "utf8" }).status === 0;

function install() {
  const hooksDir = git(["rev-parse", "--git-path", "hooks"]).trim();
  const hook = resolve(ROOT, hooksDir, "pre-push");
  if (existsSync(hook) && !readFileSync(hook, "utf8").includes("ci-local.mjs")) {
    console.error(`${hook} 가 이미 있어 덮지 않았어요 — 내용을 보고 직접 합쳐 주세요`);
    process.exit(1);
  }
  writeFileSync(hook, `#!/bin/sh\n# scripts/ci-local.mjs --install 이 만든 훅 — 푸시할 커밋 트리로 CI(check.yml · Android Gradle) 단계를 먼저 돌린다\nexec node "$(git rev-parse --show-toplevel)/scripts/ci-local.mjs" --pre-push "$@"\n`);
  try { chmodSync(hook, 0o755); } catch { /* Windows */ }
  console.log(`설치: ${hook}`);
}

// check.yml 의 run 단계(npm ci 제외)를 순서대로
function checkSteps(dir) {
  const yml = readFileSync(join(dir, ".github/workflows/check.yml"), "utf8");
  const steps = [];
  let name = "";
  for (const line of yml.split(/\r?\n/)) {
    const n = line.match(/^\s*-\s*name:\s*(.+)$/);
    if (n) { name = n[1].trim(); continue; }
    const r = line.match(/^\s*run:\s*(.+)$/);
    if (r && !/^npm (ci|install)\b/.test(r[1].trim())) steps.push({ name, cmd: r[1].trim() });
  }
  if (steps.length === 0) throw new Error("check.yml 에서 run 단계를 못 찾았어요");
  return steps;
}

// Pages 산출물 — index.html 이 가리키는 assets/ 가 트리에 다 있는가 (docs 가 바뀐 커밋만)
function checkPagesTree(tree, files) {
  if (!files.has("docs/game/index.html")) return [];
  const html = git(["show", `${tree}:docs/game/index.html`]);
  const refs = [...html.matchAll(/(?:src|href)="(?:\.\/|\/dodge-bullets\/game\/)?(assets\/[^"?#]+)"/g)].map((m) => `docs/game/${m[1]}`);
  return refs.filter((f) => !files.has(f)).map((f) => `Pages: index.html 이 가리키는 ${f} 가 커밋에 없어요`);
}

/** base..rev 에서 바뀐 파일 중 Gradle 만 깨뜨릴 수 있는 것. base 를 모르면 origin/main 과의 갈림점 */
function nativeChanges(rev, base) {
  let from = base && !/^0+$/.test(base) && gitOk(["cat-file", "-e", `${base}^{commit}`]) ? base : null;
  if (!from && gitOk(["rev-parse", "--verify", "-q", "origin/main"])) from = git(["merge-base", rev, "origin/main"]).trim();
  if (!from) return [];
  return git(["diff", "--name-only", from, rev]).split(/\r?\n/).filter((f) => ANDROID_PATHS.test(f));
}

const run = (cmd, cwd, extraEnv = {}) => new Promise((done) => {
  const t0 = Date.now();
  const p = spawn(cmd, { cwd, shell: true, env: { ...process.env, CI: "true", FORCE_COLOR: "0", ...extraEnv } });
  let out = "";
  p.stdout.on("data", (d) => { out += d; });
  p.stderr.on("data", (d) => { out += d; });
  p.on("close", (code) => done({ code, out, sec: ((Date.now() - t0) / 1000).toFixed(0) }));
});

/** 이 PC 의 Android SDK — 없으면 null (Gradle 단계를 건너뛴다) */
function androidSdk() {
  const cands = [process.env.ANDROID_HOME, process.env.ANDROID_SDK_ROOT, process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, "Android", "Sdk")].filter(Boolean);
  try {
    const m = readFileSync(join(ROOT, "android", "local.properties"), "utf8").match(/^sdk\.dir=(.+)$/m);
    if (m) cands.unshift(m[1].trim().replace(/\\:/g, ":").replace(/\\\\/g, "\\"));
  } catch { /* 없음 */ }
  return cands.find((d) => existsSync(join(d, "platforms"))) ?? null;
}

// android.yml debug-apk 잡: native:sync:qa(QA 웹 빌드 + cap sync) → gradlew assembleDebug
async function gradleSteps(dir) {
  const sdk = androidSdk();
  const java = spawnSync(process.platform === "win32" ? "java.exe" : "java", ["-version"], { encoding: "utf8" });
  if (!sdk || java.status !== 0) {
    console.log(`  --   Android Gradle (이 PC 에 ${!sdk ? "Android SDK" : "JDK"} 가 없어 건너뜀 — CI 가 잡는다)`);
    return [];
  }
  const steps = [
    { name: "Android: QA 웹 빌드", cmd: "node node_modules/vite/bin/vite.js build", cwd: dir, env: { VITE_QA_BUILD: "true" } },
    { name: "Android: cap sync android", cmd: "node node_modules/@capacitor/cli/bin/capacitor sync android", cwd: dir },
    { name: "Android: gradlew assembleDebug", cmd: process.platform === "win32" ? `"${join(dir, "android", "gradlew.bat")}" assembleDebug --no-daemon -q` : "./gradlew assembleDebug --no-daemon -q", cwd: join(dir, "android") },
  ];
  const results = [];
  for (const s of steps) {
    if (s.cwd.endsWith("android")) writeFileSync(join(s.cwd, "local.properties"), `sdk.dir=${sdk.replace(/\\/g, "/")}\n`);
    const r = await run(s.cmd, s.cwd, s.env);
    if (r.code === 0 && s.cwd.endsWith("android") && !existsSync(join(s.cwd, "app/build/outputs/apk/debug/app-debug.apk"))) {
      r.code = 1; r.out += "\napp-debug.apk 가 안 나왔어요";
    }
    results.push({ s, r });
    if (r.code !== 0) break;
  }
  return results;
}

function cleanup(dir) {
  if (!existsSync(dir)) return;
  const nm = join(dir, "node_modules");
  try { if (lstatSync(nm).isSymbolicLink()) unlinkSync(nm); } catch { /* 없음 */ }
  let stillLinked = false;
  try { lstatSync(nm); stillLinked = true; } catch { /* 떼어짐 */ }
  if (stillLinked) { console.error(`정션이 안 떨어져 ${dir} 를 남겨 둡니다(원본 node_modules 보호)`); return; }
  if (!existsSync(join(ROOT, "node_modules", ".bin"))) console.error("경고: 원본 node_modules/.bin 이 없어요 — npm rebuild --ignore-scripts");
  try { rmSync(dir, { recursive: true, force: true, maxRetries: 6, retryDelay: 500 }); }   // Gradle 이 막 놓은 파일 잠금
  catch (e) { console.error(`임시 폴더를 다 못 지웠어요(다음 실행이 덮어씀): ${dir} — ${e.code ?? e.message}`); }
}

async function checkTree(rev, { android = false } = {}) {
  const tree = git(["rev-parse", `${rev}^{tree}`]).trim();
  const label = `${rev.slice(0, 12)} (트리 ${tree.slice(0, 8)})`;
  const webDone = existsSync(join(PASSED, tree));
  const androidDone = !android || existsSync(join(PASSED, `${tree}.android`));
  if (webDone && androidDone) { console.log(`ci-local: ${label} 는 이미 통과${android ? " (Gradle 포함)" : ""}`); return true; }
  const entries = git(["ls-tree", "-r", "-l", "-z", tree]).split("\0").filter(Boolean).map((e) => {
    const tab = e.indexOf("\t");
    return { path: e.slice(tab + 1), size: Number(e.slice(0, tab).trim().split(/\s+/)[3]) || 0 };
  });
  const files = new Set(entries.map((e) => e.path));
  const dir = join(WORK, `run-${tree.slice(0, 12)}-${process.pid}`);
  cleanup(dir);
  mkdirSync(dir, { recursive: true });
  const t0 = Date.now();
  try {
    // 공유 인덱스를 건드리지 않게 임시 인덱스로 꺼낸다
    const idx = join(WORK, `index-${process.pid}`);
    const env = { ...process.env, GIT_INDEX_FILE: idx };
    git(["read-tree", tree], { env });
    const want = entries.filter((e) => !skipFile(e.path, e.size, android)).map((e) => e.path).join("\0");
    git(["checkout-index", "-f", "-z", "--stdin", `--prefix=${dir.replace(/\\/g, "/")}/`], { env, input: want });
    rmSync(idx, { force: true });
    symlinkSync(join(ROOT, "node_modules"), join(dir, "node_modules"), "junction");

    const problems = [];
    const results = [];
    if (!webDone) {
      problems.push(...checkPagesTree(tree, files));
      const steps = checkSteps(dir);
      // 타입 · 린트 · 단언은 서로 독립 — 같이 돌리고, 출시 번들 검사는 웹 빌드 뒤에
      const after = steps.filter((s) => /check-release-build/.test(s.cmd));
      const first = steps.filter((s) => !after.includes(s));
      results.push(...await Promise.all(first.map(async (s) => ({ s, r: await run(s.cmd, dir) }))));
      const webBuild = results.find(({ s }) => /\bbuild\b/.test(s.cmd));
      const built = !webBuild || webBuild.r.code === 0;
      for (const s of after) {
        if (built) results.push({ s, r: await run(s.cmd, dir) });
        else console.log(`  --   ${s.name} (웹 빌드가 깨져 건너뜀)`);
      }
    }
    const webOk = webDone || (problems.length === 0 && results.every(({ r }) => r.code === 0));
    let gradleRan = false;
    if (android && !existsSync(join(PASSED, `${tree}.android`))) {
      if (webOk) { const g = await gradleSteps(dir); gradleRan = g.length > 0; results.push(...g); }
      else console.log("  --   Android Gradle (웹 검사가 깨져 건너뜀)");
    }
    for (const { s, r } of results) {
      console.log(`  ${r.code === 0 ? "ok  " : "FAIL"} ${s.name} (${r.sec}s)`);
      if (r.code !== 0) problems.push(`${s.name} — ${s.cmd}\n${r.out.trim().split(/\r?\n/).slice(-25).join("\n")}`);
    }
    if (problems.length) {
      console.error(`\nci-local: ${label} — CI 에서 깨질 커밋이에요. 푸시를 멈춥니다\n`);
      for (const p of problems) console.error(`✗ ${p}\n`);
      console.error("작업 트리가 아니라 커밋 트리로 돌렸어요 — hunk 커밋이면 git show HEAD 로 줄 자리를 확인하세요");
      return false;
    }
    mkdirSync(PASSED, { recursive: true });
    if (!webDone) writeFileSync(join(PASSED, tree), `${new Date().toISOString()} ${rev}\n`);
    if (gradleRan) writeFileSync(join(PASSED, `${tree}.android`), `${new Date().toISOString()} ${rev}\n`);
    console.log(`ci-local: ${label} 통과${gradleRan ? " (Gradle 포함)" : ""} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
    return true;
  } finally {
    cleanup(dir);
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--install")) return install();
  const force = args.includes("--android");
  // [rev, base] — base 는 원격에 이미 있는 커밋(Gradle 판단용)
  let pairs = args.filter((a) => !a.startsWith("--")).map((r) => [r, null]);
  if (args.includes("--pre-push")) {
    const input = readFileSync(0, "utf8");
    pairs = input.split(/\r?\n/).map((l) => l.trim().split(/\s+/)).filter((p) => p.length >= 4 && !/^0+$/.test(p[1])).map((p) => [p[1], p[3]]);
    if (pairs.length === 0) return;
  }
  if (pairs.length === 0) pairs = [["HEAD", null]];
  const trees = new Map();
  for (const [r, base] of pairs) {
    const tree = git(["rev-parse", `${r}^{tree}`]).trim();
    const native = force ? ["--android"] : nativeChanges(r, base);
    const prev = trees.get(tree);
    trees.set(tree, { rev: r, android: (prev?.android ?? false) || native.length > 0, why: prev?.why ?? native });
  }
  let ok = true;
  for (const { rev, android, why } of trees.values()) {
    if (android) console.log(`ci-local: 네이티브 쪽 변경(${why.slice(0, 4).join(" · ")}${why.length > 4 ? " …" : ""}) — Android Gradle 단계도 돈다`);
    ok = (await checkTree(rev, { android })) && ok;
  }
  process.exit(ok ? 0 : 1);
}

main().catch((e) => { console.error(`ci-local: ${e.message}`); process.exit(1); });
