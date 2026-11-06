/**
 * 모델 연결 — 자체 모델 게이트웨이(OpenAI 호환 /chat/completions)만 쓴다. 주소가 없으면 꺼져 있고, 에이전트는 규칙 · 탐색만으로 돈다.
 *   AGENT_MODEL_URL  예) https://<게이트웨이 주소>/v1/chat/completions
 *   AGENT_MODEL_KEY  (있으면 Authorization: Bearer)
 *   AGENT_MODEL_NAME 모델 이름
 * 보내는 것은 단추 이름 목록과 계획 문장뿐이다(화면 이미지 · 소스 코드는 보내지 않는다). 판마다 호출 상한이 있다.
 */
export function modelFromEnv(env = process.env) {
  const url = env.AGENT_MODEL_URL;
  if (!url) return null;
  let calls = 0;
  const max = Number(env.AGENT_MODEL_MAX_CALLS ?? 40);
  return {
    name: env.AGENT_MODEL_NAME ?? "default",
    get calls() { return calls; },
    async ask(system, user) {
      if (calls >= max) throw new Error(`모델 호출 상한 ${max}회`);
      calls += 1;
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json", ...(env.AGENT_MODEL_KEY ? { authorization: `Bearer ${env.AGENT_MODEL_KEY}` } : {}) },
        body: JSON.stringify({ model: env.AGENT_MODEL_NAME, temperature: 0, messages: [{ role: "system", content: system }, { role: "user", content: user }] }),
        signal: AbortSignal.timeout(30000),
      });
      if (!res.ok) throw new Error(`모델 응답 ${res.status}`);
      const j = await res.json();
      return j.choices?.[0]?.message?.content ?? "";
    },
  };
}

/** 처음 가는 화면에서 다음 단추 고르기 — 번호 하나만 받는다(형식이 틀리면 null → 규칙 탐색으로) */
export async function modelPick(model, goal, o, cands) {
  const list = cands.slice(0, 40).map((c, i) => `${i}: ${c.label}`).join("\n");
  const text = await model.ask(
    "너는 모바일 게임 테스트 에이전트다. 목표에 가장 가까워지는 단추 번호 하나만 JSON 으로 답한다: {\"pick\": 번호, \"why\": \"한 줄\"}",
    `목표: ${goal}\n화면 제목: ${o.title || "(없음)"}\n누를 수 있는 것:\n${list}`,
  );
  const m = text.match(/\{[\s\S]*\}/);
  try { const j = JSON.parse(m?.[0] ?? ""); return Number.isInteger(j.pick) && cands[j.pick] ? { c: cands[j.pick], why: String(j.why ?? "").slice(0, 80) } : null; } catch { return null; }
}
