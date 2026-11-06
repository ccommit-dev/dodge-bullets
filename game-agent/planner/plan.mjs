/**
 * 계획기 — 요청을 목표 · 단계 · 판정 기준으로 바꾼다. 요청은 네 종류(Autopilot 과 같다):
 *   탐색(explore)  아무도 안 가 본 길 — 판정 기준: 규칙 판정(예외 · 콘솔 오류 · 무반응 · 표시 · 불변식)
 *   테스트(test)   탐색 + 주입 버그를 잡는지 — 판정 기준: 기대한 종류의 이슈가 나오는지
 *   검증(verify)   "X 를 하면 Y" — 판정 기준: 질문에 적힌 expect(상태 · 글자 비교)
 *   목표(goal)     상태 조건에 닿을 때까지 — POC 범위 밖(규격만 둔다)
 * 모델이 없으므로 검증 질문은 구조화된 JSON(requests/claims.json)으로 받는다. 자체 게이트웨이가 생기면 자연어 → 이 JSON 변환을 모델이 맡는다.
 */
export function planExplore(args) {
  return {
    mode: "explore",
    preset: args.preset ?? "mid",
    steps: Number(args.steps ?? 120),
    ms: Number(args.minutes ?? 10) * 60_000,
    seed: Number(args.seed ?? 1),
    settle: Number(args.settle ?? 700),
    shotEvery: Number(args.shotEvery ?? 10),
    faults: args.fault ? String(args.fault).split(",").filter(Boolean) : [],
    goal: args.goal,
  };
}

export function planClaims(file, claims, only) {
  const list = only ? claims.filter((c) => only.split(",").includes(c.id)) : claims;
  for (const c of list) {
    if (!c.id || !c.click || !c.expect) throw new Error(`검증 질문 형식 오류(id · click · expect 필요): ${JSON.stringify(c).slice(0, 120)}`);
  }
  return { mode: "verify", file, claims: list };
}
