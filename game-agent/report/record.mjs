/**
 * 녹화 · 단계 기록 — 판마다 runs/<시각>-<종류>/ 에 남긴다.
 *   trace.jsonl  걸음마다 한 줄(행동 · 결과 · 화면 · 걸린 시간)
 *   shots/       걸음 화면(일정 간격 + 이슈가 난 걸음)
 *   issues.json  같은 문제는 한 번만(처음 난 걸음 · 그때까지의 행동 = 재현 재료)
 */
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { issueSignature, SEVERITY } from "../oracles/rules.mjs";

const stamp = () => new Date().toISOString().replace(/[-:]/g, "").replace("T", "-").slice(0, 15);

export class Recorder {
  constructor(root, kind, meta) {
    this.dir = join(root, `${stamp()}-${kind}`);
    mkdirSync(join(this.dir, "shots"), { recursive: true });
    this.meta = meta;
    this.actions = []; // 재현용 — 리셋 뒤 실제로 한 행동만
    this.issues = new Map();
    this.counts = {};
    this.steps = 0;
    writeFileSync(join(this.dir, "meta.json"), JSON.stringify(meta, null, 2));
  }
  shotPath(step) { return join(this.dir, "shots", `step-${String(step).padStart(4, "0")}.jpg`); }
  step(row) {
    this.steps = Math.max(this.steps, row.step);
    if (row.action && row.result?.ok !== false) this.actions.push(row.action.type === "reset" ? { type: "reset" } : row.action);
    appendFileSync(join(this.dir, "trace.jsonl"), JSON.stringify(row) + "\n");
  }
  /** @returns {boolean} 처음 보는 문제면 true */
  issue(i, ctx) {
    this.counts[i.type] = (this.counts[i.type] ?? 0) + 1;
    const sig = issueSignature(i);
    const old = this.issues.get(sig);
    if (old) { old.seen += 1; return false; }
    // 마지막 리셋 뒤의 행동만 재현 재료로 — 앞의 판은 리셋이 지운다
    const lastReset = this.actions.map((a) => a.type).lastIndexOf("reset");
    const steps = this.actions.slice(lastReset + 1).filter((a) => a.type !== "wait").map(({ type, key, label }) => (type === "tap" ? { type, key, label } : { type, key }));
    this.issues.set(sig, { id: `I${this.issues.size + 1}`, sig, ...i, seen: 1, step: ctx.step, screen: ctx.screen, title: i.title, screenTitle: ctx.title, shot: ctx.shot, steps, preset: this.meta.preset, faults: this.meta.faults ?? [] });
    return true;
  }
  list() { return [...this.issues.values()].sort((a, b) => SEVERITY[b.severity] - SEVERITY[a.severity]); }
  finish(summary) {
    const issues = this.list();
    writeFileSync(join(this.dir, "issues.json"), JSON.stringify(issues, null, 2));
    writeFileSync(join(this.dir, "summary.json"), JSON.stringify({ ...this.meta, ...summary, issueCounts: this.counts, uniqueIssues: issues.length }, null, 2));
    return { dir: this.dir, issues };
  }
}
