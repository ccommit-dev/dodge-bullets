/**
 * 사냥터 속도 고정 (2026-11-06 사용자 "지금처럼" → 2026-11-16 검사로) — node scripts/verify-pace-lock.mjs
 * balance-sim 균형형이 30일차 24~25층 · 벽 27~28일이어야 한다. 재화 합치기 · 수치 조정은 이걸 지켜야 들어간다.
 * 지갑 실험(통합 지갑)은 balance-sim --wallet merged --policy forge|hunt --idlek K [--rebirth reset] 로 따로 돌린다(2026-11-16 결과는 docs/FOCUS_2026-11-13.md).
 */
import { execFileSync } from "node:child_process";
try {
  const out = execFileSync(process.execPath, ["scripts/balance-sim.mjs", "--check"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  console.log(out.trim().split("\n").pop());
  console.log("\nALL PASS");
} catch (e) {
  console.log(String(e.stdout ?? "").trim().split("\n").pop() ?? "");
  console.log("\n1 FAIL");
  process.exit(1);
}
