/**
 * 최종 판정 — 검증 질문("X 를 누르면 Y 가 Z 만큼 바뀐다")이 맞는지. 상태 · 화면 글자 비교는 규칙으로,
 * 규칙으로 못 보는 것(모양 · 느낌)은 모델 판정 몫인데, POC 에는 아직 없다(2단계 — 자체 게이트웨이가 생기면 근거 화면을 붙여 묻는다).
 *
 * expect 모양
 *   { path: "progression.redGems", delta: 20 }        정확히 그만큼
 *   { path: "titans.gold", change: "+" | "-" | "0" }    방향만
 *   { path: "settings.sound", equals: "1" }            값
 *   { text: "정규식" }                                  누른 뒤 화면 글자에 보인다
 *   { noText: "정규식" }                                누른 뒤 화면 글자에 안 보인다
 */
const at = (state, path) => path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), state);

/** @returns {{ ok: boolean, detail: string }} */
export function judgeExpect(expect, before, after) {
  if (expect.path) {
    const a = at(before.state, expect.path), b = at(after.state, expect.path);
    const d = typeof a === "number" && typeof b === "number" ? b - a : null;
    const detail = `${expect.path}: ${JSON.stringify(a)} → ${JSON.stringify(b)}${d === null ? "" : ` (${d >= 0 ? "+" : ""}${d})`}`;
    if ("delta" in expect) return { ok: d === expect.delta, detail };
    if ("change" in expect) return { ok: d !== null && (expect.change === "+" ? d > 0 : expect.change === "-" ? d < 0 : d === 0), detail };
    if ("equals" in expect) return { ok: String(b) === String(expect.equals), detail };
  }
  if (expect.text) { const ok = new RegExp(expect.text).test(after.text); return { ok, detail: `화면 글자에 /${expect.text}/ ${ok ? "있음" : "없음"}` }; }
  if (expect.noText) { const ok = !new RegExp(expect.noText).test(after.text); return { ok, detail: `화면 글자에 /${expect.noText}/ ${ok ? "없음" : "있음"}` }; }
  return { ok: false, detail: "판정 기준 없음" };
}

/** 여러 기준은 모두 맞아야 참 */
export function judgeClaim(claim, before, after) {
  const list = Array.isArray(claim.expect) ? claim.expect : [claim.expect];
  const parts = list.map((e) => judgeExpect(e, before, after));
  return { verdict: parts.every((p) => p.ok), detail: parts.map((p) => p.detail).join(" · ") };
}
