#!/usr/bin/env node
// 푸시 전 CI 미리 돌리기 (2026-10-28, 사용자: "배포오류 꾸준히 나던데 안나게 방지좀 해주라")
//
// CI 가 깨진 원인은 둘이었다 — ① 로컬에서 eslint 를 안 돌려 같은 lint 오류가 푸시 4번 내내 남음(632e9a4 까지),
// ② 공유 작업 트리에서 hunk 만 골라 커밋하다 줄이 엉뚱한 자리에 들어가 "작업 트리는 멀쩡 · 커밋은 문법 오류"(b67344f).
// 그래서 작업 트리가 아니라 **푸시할 커밋의 트리**를 저장소 밖 임시 폴더에 꺼내 .github/workflows/check.yml 의
// run 단계를 그대로 돌린다(워크플로가 바뀌면 이 검사도 따라 바뀐다). docs/ 가 바뀐 커밋은 Pages 산출물의
// index.html 이 가리키는 파일이 트리에 다 있는지도 본다(빠진 lazy 조각 = 빈 화면).
//
//   node scripts/ci-local.mjs [커밋|트리 ...]      기본 HEAD
//   node scripts/ci-local.mjs --pre-push          .git/hooks/pre-push 가 부른다(stdin 으로 푸시할 ref)
//   node scripts/ci-local.mjs --install           .git/hooks/pre-push 설치
//
// 한 번 통과한 트리는 기억해 두어 같은 커밋을 main · feat 로 두 번 밀어도 한 번만 돈다.
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
// art-gen 은 단언이 읽는 작은 설정(anim-layout.json 등)만 — 256KB 넘는 원화 · 모델은 뺀다
const SKIP_PREFIX = ["docs/", "android/", "ios/"];
const skipFile = (path, size) => SKIP_PREFIX.some((p) => path.startsWith(p)) || (path.startsWith("art-gen/") && size > 262_144);

const git = (args, opts = {}) => {
  const r = spawnSync("git", args, { cwd: ROOT, encoding: "utf8", maxBuffer: 256 << 20, ...opts });
  if (r.status !== 0) throw new Error(`git ${args.join(" ")}: ${r.stderr || r.stdout}`);
  return r.stdout;
};

function install() {
  const hooksDir = git(["rev-parse", "--git-path", "hooks"]).trim();
  const hook = resolve(ROOT, hooksDir, "pre-push");
  if (existsSync(hook) && !readFileSync(hook, "utf8").includes("ci-local.mjs")) {
    console.error(`${hook} 가 이미 있어 덮지 않았어요 — 내용을 보고 직접 합쳐 주세요`);
    process.exit(1);
  }
  writeFileSync(hook, `#!/bin/sh\n# scripts/ci-local.mjs --install 이 만든 훅 — 푸시할 커밋 트리로 CI(check.yml) 단계를 먼저 돌린다\nexec node "$(git rev-parse --show-toplevel)/scripts/ci-local.mjs" --pre-push "$@"\n`);
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

const run = (cmd, cwd) => new Promise((done) => {
  const t0 = Date.now();
  const p = spawn(cmd, { cwd, shell: true, env: { ...process.env, CI: "true", FORCE_COLOR: "0" } });
  let out = "";
  p.stdout.on("data", (d) => { out += d; });
  p.stderr.on("data", (d) => { out += d; });
  p.on("close", (code) => done({ code, out, sec: ((Date.now() - t0) / 1000).toFixed(0) }));
});

function cleanup(dir) {
  if (!existsSync(dir)) return;
  const nm = join(dir, "node_modules");
  try { if (lstatSync(nm).isSymbolicLink()) unlinkSync(nm); } catch { /* 없음 */ }
  let stillLinked = false;
  try { lstatSync(nm); stillLinked = true; } catch { /* 떼어짐 */ }
  if (stillLinked) { console.error(`정션이 안 떨어져 ${dir} 를 남겨 둡니다(원본 node_modules 보호)`); return; }
  if (!existsSync(join(ROOT, "node_modules", ".bin"))) console.error("경고: 원본 node_modules/.bin 이 없어요 — npm rebuild --ignore-scripts");
  rmSync(dir, { recursive: true, force: true });
}

async function checkTree(rev) {
  const tree = git(["rev-parse", `${rev}^{tree}`]).trim();
  const label = `${rev.slice(0, 12)} (트리 ${tree.slice(0, 8)})`;
  if (existsSync(join(PASSED, tree))) { console.log(`ci-local: ${label} 는 이미 통과`); return true; }
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
    const want = entries.filter((e) => !skipFile(e.path, e.size)).map((e) => e.path).join("\0");
    git(["checkout-index", "-f", "-z", "--stdin", `--prefix=${dir.replace(/\\/g, "/")}/`], { env, input: want });
    rmSync(idx, { force: true });
    symlinkSync(join(ROOT, "node_modules"), join(dir, "node_modules"), "junction");

    const problems = checkPagesTree(tree, files);
    const steps = checkSteps(dir);
    // 타입 · 린트 · 단언은 서로 독립 — 같이 돌리고, 출시 번들 검사는 웹 빌드 뒤에
    const after = steps.filter((s) => /check-release-build/.test(s.cmd));
    const first = steps.filter((s) => !after.includes(s));
    const results = await Promise.all(first.map(async (s) => ({ s, r: await run(s.cmd, dir) })));
    const webBuild = results.find(({ s }) => /\bbuild\b/.test(s.cmd));
    const built = !webBuild || webBuild.r.code === 0;
    for (const s of after) {
      if (built) results.push({ s, r: await run(s.cmd, dir) });
      else console.log(`  --   ${s.name} (웹 빌드가 깨져 건너뜀)`);
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
    writeFileSync(join(PASSED, tree), `${new Date().toISOString()} ${rev}\n`);
    console.log(`ci-local: ${label} 통과 (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
    return true;
  } finally {
    cleanup(dir);
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--install")) return install();
  let revs = args.filter((a) => !a.startsWith("--"));
  if (args.includes("--pre-push")) {
    const input = readFileSync(0, "utf8");
    revs = input.split(/\r?\n/).map((l) => l.trim().split(/\s+/)).filter((p) => p.length >= 4 && !/^0+$/.test(p[1])).map((p) => p[1]);
    if (revs.length === 0) return;
  }
  if (revs.length === 0) revs = ["HEAD"];
  const trees = new Map();
  for (const r of revs) trees.set(git(["rev-parse", `${r}^{tree}`]).trim(), r);
  let ok = true;
  for (const r of trees.values()) ok = (await checkTree(r)) && ok;
  process.exit(ok ? 0 : 1);
}

main().catch((e) => { console.error(`ci-local: ${e.message}`); process.exit(1); });
