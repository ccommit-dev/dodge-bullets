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
 *   { path: "...", min: 1 } · { path: "...", max: 3 }   범위
 *   경로 끝 "#size" 는 배열 길이 · 객체 키 수(예: _raw.progression.expeditions.#size)
 * 화면 요소(시나리오 — after.dom 에 game.query 결과가 있을 때)
 *   { sel: "css", visible: true | false }              그려진 것이 있다 · 없다
 *   { sel: "css", text: "정규식" }                      그려진 것의 글자
 *   { sel: "css", readable: true }                     그려졌고, 그 안에 화면 규칙(흐림 · 잘림 · 겹침 · 접힘 · 깨짐) 표식이 없다
 */
const at = (state, path) => path.split(".").reduce((o, k) => (o == null ? undefined : k === "#size" ? (Array.isArray(o) ? o.length : typeof o === "object" ? Object.keys(o).length : undefined) : o[k]), state);

/** 화면 규칙 표식 v# → 그 이슈 글(관찰의 signals.visual 목록에서) */
function flagTexts(flags, after) {
  const all = Object.values(after.signals?.visual ?? {}).filter(Array.isArray).flat();
  return flags.map((f) => all.find((x) => x.id === f)?.text ?? f);
}

/** @returns {{ ok: boolean, detail: string }} */
export function judgeExpect(expect, before, after) {
  if (expect.path) {
    const raw = at(before.state, expect.path), b = at(after.state, expect.path);
    // 처음엔 저장 칸이 아예 없다가(이벤트 저장 등) 첫 행동에 생긴다 — 증감 판정에선 없음을 0 으로 본다
    const a = raw === undefined && typeof b === "number" ? 0 : raw;
    const d = typeof a === "number" && typeof b === "number" ? b - a : null;
    const detail = `${expect.path}: ${raw === undefined && a === 0 ? "없음(0)" : JSON.stringify(a)} → ${JSON.stringify(b)}${d === null ? "" : ` (${d >= 0 ? "+" : ""}${d})`}`;
    if ("delta" in expect) return { ok: d === expect.delta, detail };
    if ("change" in expect) return { ok: d !== null && (expect.change === "+" ? d > 0 : expect.change === "-" ? d < 0 : d === 0), detail };
    if ("equals" in expect) return { ok: String(b) === String(expect.equals), detail };
    if ("min" in expect || "max" in expect) return { ok: typeof b === "number" && (!("min" in expect) || b >= expect.min) && (!("max" in expect) || b <= expect.max), detail };
  }
  if (expect.sel) {
    const q = after.dom?.[expect.sel];
    if (!q) return { ok: false, detail: `${expect.sel}: 조회 안 함` };
    const head = `${expect.sel}: 그려짐 ${q.visible}/${q.count}`;
    if ("visible" in expect) return { ok: expect.visible ? q.visible > 0 : q.visible === 0, detail: head };
    if ("text" in expect) { const ok = q.visible > 0 && new RegExp(expect.text).test(q.text); return { ok, detail: `${head} · 글자 "${q.text.slice(0, 60)}"` }; }
    if (expect.readable) {
      const bad = flagTexts(q.flags, after);
      return { ok: q.visible > 0 && bad.length === 0, detail: q.visible === 0 ? `${head} · 안 그려짐` : bad.length ? `${head} · 화면 규칙 ${bad.length}건: ${bad.slice(0, 3).join(" / ")}` : `${head} · 규칙 표식 없음` };
    }
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
