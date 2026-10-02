/**
 * 출시 빌드 점검 (2026-10-02) — 테스트 우회가 출시 번들에 남지 않았는지 본다.
 *   node scripts/check-release-build.mjs [distDir]
 * distDir 을 주면 그 빌드를 그대로 검사하고(CI 출시 잡: native:sync 뒤 dist), 없으면 임시 폴더에 VITE_QA_BUILD 없이 새로 빌드한다.
 *
 * QA 우회(무료 지급·보석 무제한·7탭 테스트 모드·무료 상점)는 QA_BUILD 상수 뒤에 있고, 출시 빌드에서는 그 상수가 false 로 접혀
 * 관련 코드가 통째로 빠져야 한다. 아래 문자열이 번들에 남아 있으면 우회 경로가 살아 있다는 뜻이다.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const FORBIDDEN = [
  "dodgebullets:qa-mode",       // 7탭 테스트 모드 플래그
  "dodgebullets:qa-gems",       // 보석 무제한 토글
  "dodgebullets:qa-free-store", // 무료 상점
  "dodgebullets:qa-pay",        // 결제 스텁
  "dodgebullets:qa-ads",        // 광고 스텁
  "무료 1회 (QA)",
  "테스트 · 보석 무제한",
  "테스트 구매 (즉시 지급)",
];

let dir = process.argv[2];
let temp = null;
if (!dir) {
  temp = mkdtempSync(join(tmpdir(), "release-build-"));
  dir = temp;
  const env = { ...process.env };
  delete env.VITE_QA_BUILD;
  delete env.GITHUB_PAGES;
  execFileSync(process.execPath, ["node_modules/vite/bin/vite.js", "build", "--outDir", dir, "--emptyOutDir", "--logLevel", "error"], { stdio: "inherit", env });
}

const files = [];
(function walk(d) { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (/\.(js|html)$/.test(f)) files.push(p); } })(dir);
const hits = [];
for (const f of files) {
  const s = readFileSync(f, "utf8");
  for (const word of FORBIDDEN) if (s.includes(word)) hits.push(`${word} @ ${f.replace(dir, "")}`);
}
if (temp) rmSync(temp, { recursive: true, force: true });
if (files.length === 0) { console.log("FAIL 빌드 산출물이 없다 — " + dir); process.exit(1); }
if (hits.length) {
  console.log("FAIL 출시 번들에 테스트 우회가 남아 있다:");
  for (const h of hits) console.log("  " + h);
  process.exit(1);
}
console.log(`PASS 출시 번들(${files.length} 파일)에 테스트 우회 문자열 ${FORBIDDEN.length}종이 없다`);
console.log("ALL PASS");
