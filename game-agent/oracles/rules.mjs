/**
 * 규칙 판정 — 매 걸음 돈다. 모델 없이 정해진 규칙으로만(같은 화면이면 늘 같은 판정).
 * 판정은 "후보"다: 이슈 등록 전 재현 스크립트로 다시 돌리고 사람이 승인한다.
 */
import { hash } from "../bridge/protocol.mjs";

export const SEVERITY = { high: 3, medium: 2, low: 1, info: 0 };

/** 재화 · 진행 수치 — 음수 · NaN · 무한이면 위반 */
const MONEY = /gem|coin|gold|ticket|stone|shard|exp|level|stage|streak/i;

/** 무반응 판정에 쓰는 화면 뼈대 — 보이는 단추 이름 · 상태 표시 · 제목(숫자 · 애니메이션 글자는 뺀다) */
export function uiFingerprint(o) {
  const keys = o.clickables.filter((c) => c.inView).map((c) => `${c.key}:${c.disabled ? 0 : 1}`).sort();
  return hash(`${o.title.replace(/[0-9]/g, "#")}|${keys.join("|")}`);
}

const issue = (type, severity, title, detail) => ({ type, severity, title, detail: String(detail ?? "").slice(0, 400) });

/**
 * @param {{ prev?: any, action?: any, result?: any, cur: any, events: any[] }} s
 * @returns {Array<{type: string, severity: string, title: string, detail: string}>}
 */
export function checkRules({ prev, action, result, cur, events }) {
  const out = [];
  for (const e of events) {
    if (e.kind === "pageerror") out.push(issue("crash", "high", "처리되지 않은 예외", e.text));
    else if (e.kind === "console") out.push(issue("console", "medium", "콘솔 오류", e.text));
    else if (e.kind === "http") out.push(issue("http", /favicon/.test(e.text) ? "low" : "medium", "개발 서버 요청 실패", e.text));
    else if (e.kind === "dialog") out.push(issue("dialog", "low", "브라우저 대화상자", e.text));
    else if (e.kind === "navigate" && action?.type === "tap") out.push(issue("navigate", "medium", "누른 뒤 페이지가 새로 열림(새로 고침 · 이동)", e.text));
    else if (e.kind === "blocked") out.push(issue("blocked", "info", "외부 요청 차단(격리)", e.text.replace(/^(https?:\/\/[^/]+).*$/, "$1")));
    else if (e.kind === "popup") out.push(issue("popup", "info", "새 창 열림(닫음)", e.text));
  }
  const sig = cur.signals;
  if (sig.blank) out.push(issue("blank", "high", "빈 화면", cur.url));
  for (const b of sig.bad) out.push(issue("bad-number", "high", "숫자 자리에 NaN · undefined 표시", b));
  if (sig.overflowX) out.push(issue("overflow", "low", "화면이 가로로 넘침", cur.title || cur.url));
  for (const o of sig.offside) out.push(issue("overflow", "low", "단추가 화면 밖으로 나감", o));
  for (const [group, obj] of Object.entries({ progression: cur.state.progression, titans: cur.state.titans })) {
    for (const [k, v] of Object.entries(obj || {})) {
      if (MONEY.test(k) && typeof v === "number" && (!Number.isFinite(v) || v < 0)) out.push(issue("invariant", "high", "상태 불변식 위반(재화 · 진행 수치가 음수 · NaN)", `${group}.${k} = ${v}`));
      if (MONEY.test(k) && v !== undefined && typeof v !== "number") out.push(issue("invariant", "high", "상태 불변식 위반(수치 자리에 숫자가 아님)", `${group}.${k} = ${JSON.stringify(v)}`));
    }
  }
  if (prev && cur.state.errorLog > prev.state.errorLog) out.push(issue("errorlog", "medium", "게임 오류 로그가 늘었음", `${prev.state.errorLog} → ${cur.state.errorLog}`));
  // 무반응 후보 — 눌렀는데 화면 뼈대 · 설정 · 단계가 그대로. 실행기가 한 번 더 눌러 확인한 뒤에만 이슈로 올린다
  if (prev && action?.type === "tap" && result?.ok && !result.active && !events.length && !prev.signals.canvas && !cur.signals.canvas) {
    const same = result.scopeBefore === cur.signals.scope && !(cur.signals.toast && cur.signals.toast !== prev.signals.toast) && uiFingerprint(prev) === uiFingerprint(cur) && JSON.stringify(prev.state.settings) === JSON.stringify(cur.state.settings) && prev.state.progression.redGems === cur.state.progression.redGems && prev.state.titans.stage === cur.state.titans.stage;
    if (same) out.push(issue("unresponsive", "medium", "눌러도 반응이 없는 단추(후보)", action.label ?? action.key));
  }
  return out;
}

/** 같은 문제는 한 번만 — 종류 + 숫자를 접은 내용 */
export const issueSignature = (i) => `${i.type}|${hash(String(i.detail).replace(/[0-9]+/g, "#"))}`;
