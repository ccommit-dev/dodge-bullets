/**
 * 이슈 초안 — 등록하지 않는다. 사람이 읽고 승인한 것만 이슈 관리 도구로 옮긴다.
 */
import { writeFileSync } from "node:fs";
import { basename, join } from "node:path";

const SEV = { high: "높음", medium: "보통", low: "낮음", info: "참고" };

export function writeIssueDraft(issue, runDir, repro) {
  const steps = issue.steps.length ? issue.steps.map((s, i) => `${i + 1}. ${s.type === "tap" ? `"${s.label ?? s.key}" 누르기` : s.key ?? s.type}`).join("\n") : "(부팅 직후)";
  const md = `# [초안 · 승인 전] ${issue.title}

| 항목 | 내용 |
|---|---|
| 심각도 | ${SEV[issue.severity] ?? issue.severity} |
| 종류 | ${issue.type} |
| 내용 | ${String(issue.detail).replace(/\|/g, "\\|").replace(/\n/g, " ")} |
| 처음 난 곳 | 걸음 ${issue.step} · 화면 "${issue.screenTitle || "-"}" |
| 같은 판에서 다시 본 횟수 | ${issue.seen} |
| 재현 | ${repro ? (repro.reproduced ? "다시 남(재현 스크립트 FAIL)" : "다시 나지 않음 — 한 번만 난 문제일 수 있음") : "확인 안 함"} |
| 저장 상태 | ${issue.preset}${issue.faults?.length ? ` · 주입 버그 ${issue.faults.join(", ")}` : ""} |

## 재현 순서(리셋 뒤)
${steps}

## 근거
- 화면: ${issue.shot ? basename(issue.shot) : "없음"}
- 재현 스크립트: repro-${issue.id}.mjs

## 사람이 확인할 것
- 실제 문제인지, 의도된 동작인지
- 승인하면 이슈 관리 도구에 옮기고, 재현 스크립트를 관문 검사(scripts/verify-*.mjs)로 옮긴다
`;
  const file = join(runDir, `issue-${issue.id}.md`);
  writeFileSync(file, md);
  return file;
}
