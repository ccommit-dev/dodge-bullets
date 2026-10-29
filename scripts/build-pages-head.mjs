#!/usr/bin/env node
// 사이트(docs/game) 빌드를 한 명령으로 — HEAD 커밋 트리로 빌드해 docs/game 만 커밋한다 (2026-10-29)
//
// 사이트는 main 의 docs/ 를 GitHub 브랜치 배포가 올린다. 코드 커밋과 사이트 빌드 커밋이 따로라 소스는 바뀌었는데
// 사이트가 옛 빌드로 남는 시차가 생겼다 → pre-push(ci-local)가 main 푸시에서 시차를 알리고, 이 스크립트로 바로 맞춘다.
// 공유 작업 트리(다른 세션 WIP)가 섞이지 않게 작업 트리가 아니라 HEAD 트리를 저장소 밖 임시 폴더에 꺼내 빌드한다.
// 커밋은 docs/game 경로만(git commit -- docs/game) — 공유 인덱스에 올라 있는 다른 변경은 끼지 않는다.
//
//   node scripts/build-pages-head.mjs              빌드 + 커밋 "build(pages): <HEAD> 트리로 빌드"
//   node scripts/build-pages-head.mjs --no-commit  빌드만
import { spawnSync } from "node:child_process";
import { existsSync, lstatSync, mkdirSync, rmSync, symlinkSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "docs", "game");
const git = (args, opts = {}) => {
  const r = spawnSync("git", args, { cwd: ROOT, encoding: "utf8", maxBuffer: 256 << 20, ...opts });
  if (r.status !== 0) throw new Error(`git ${args.join(" ")}: ${r.stderr || r.stdout}`);
  return r.stdout;
};

const head = git(["rev-parse", "--short=7", "HEAD"]).trim();
const subject = git(["log", "-1", "--format=%s", "HEAD"]).trim();
const dir = join(tmpdir(), "dodge-pages-build", `src-${head}-${process.pid}`);
const unlinkJunction = () => {
  const nm = join(dir, "node_modules");
  try { if (lstatSync(nm).isSymbolicLink()) unlinkSync(nm); } catch { /* 없음 */ }
  try { lstatSync(nm); return false; } catch { return true; }
};

mkdirSync(dir, { recursive: true });
try {
  // 임시 인덱스로 HEAD 트리를 꺼낸다(docs · android · ios · 큰 원화 제외)
  const idx = join(dirname(dir), `index-${process.pid}`);
  const env = { ...process.env, GIT_INDEX_FILE: idx };
  git(["read-tree", "HEAD"], { env });
  const want = git(["ls-tree", "-r", "-l", "-z", "HEAD"]).split("\0").filter(Boolean).map((e) => {
    const tab = e.indexOf("\t");
    return { path: e.slice(tab + 1), size: Number(e.slice(0, tab).trim().split(/\s+/)[3]) || 0 };
  }).filter((e) => !/^(docs|android|ios)\//.test(e.path) && !(e.path.startsWith("art-gen/") && e.size > 262_144)).map((e) => e.path);
  git(["checkout-index", "-f", "-z", "--stdin", `--prefix=${dir.replace(/\\/g, "/")}/`], { env, input: want.join("\0") });
  rmSync(idx, { force: true });
  symlinkSync(join(ROOT, "node_modules"), join(dir, "node_modules"), "junction");

  console.log(`build-pages-head: ${head} 트리로 빌드 → docs/game`);
  const b = spawnSync(process.execPath, ["node_modules/vite/bin/vite.js", "build", "--outDir", OUT, "--emptyOutDir"], {
    cwd: dir, stdio: "inherit", env: { ...process.env, GITHUB_PAGES: "true", VITE_QA_BUILD: "true" },
  });
  if (b.status !== 0) throw new Error("vite build 실패");
} finally {
  if (unlinkJunction()) {
    if (!existsSync(join(ROOT, "node_modules", ".bin"))) console.error("경고: 원본 node_modules/.bin 이 없어요 — npm rebuild --ignore-scripts");
    rmSync(dir, { recursive: true, force: true, maxRetries: 4, retryDelay: 300 });
  } else console.error(`정션이 안 떨어져 ${dir} 를 남겨 둡니다(원본 node_modules 보호)`);
}

if (process.argv.includes("--no-commit")) process.exit(0);
git(["add", "-A", "docs/game"]);
if (!git(["status", "--porcelain", "--", "docs/game"]).trim()) { console.log("build-pages-head: 바뀐 게 없어요(이미 이 트리의 빌드)"); process.exit(0); }
git(["commit", "-q", "-m", `build(pages): ${subject.slice(0, 60)} (${head} — HEAD 트리로 빌드)\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, "--", "docs/game"]);
console.log(`build-pages-head: ${git(["log", "--oneline", "-1"]).trim()}`);
