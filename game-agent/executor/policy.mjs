/**
 * 판단 — 다음에 누를 것 고르기. 기본은 모델 없는 "새로움 우선" 탐색(같은 시드면 같은 길).
 * 모델(자체 게이트웨이)이 있으면 처음 가는 화면에서만 후보 중 하나를 고르게 한다(model/gateway.mjs).
 */

/** 누르지 않는 것 — 게임 밖으로 나가거나(공유 · 카페 · 약관) 판을 끝내는 것(종료 · 초기화 · 내보내기) */
export const DENY = /공유|카페|커뮤니티|게시판|리뷰|문의|개인정보|약관|게임 종료|종료하기|다운로드|백업|내보내기|불러오기|초기화|데이터 삭제|계정 삭제|로그아웃|탈퇴/;
const CLOSE = /^(닫기|뒤로|돌아가기|확인|취소|나가기|✕|×|X|x|<|‹)$/;

export function candidates(o) {
  return o.clickables.filter((c) => !c.disabled && !DENY.test(c.label));
}

/**
 * @param {any} o 관찰 · @param {import("../memory/store.mjs").Memory} mem · @param {() => number} rnd
 * @param {{ prefer?: RegExp, stuck: number }} ctx
 * @returns {{ action: any, why: string, via?: string }}
 */
export function exploreChoice(o, mem, rnd, ctx) {
  const cs = candidates(o);
  let best = null, bestScore = -Infinity;
  for (const c of cs) {
    const t = mem.tried(o.screen, c.key);
    let s = (t === 0 ? 100 : 0) + (mem.keyTried(c.key) === 0 ? 30 : 0) - t * 15 + rnd() * 10 + (c.inView ? 5 : 0);
    if (ctx.prefer?.test(c.label)) s += 60;
    if (CLOSE.test(c.label)) s -= 40; // 닫기는 다 본 뒤에
    if (s > bestScore) { best = c; bestScore = s; }
  }
  if (best && bestScore >= 60) return { action: { type: "tap", ref: best.ref, key: best.key, label: best.label }, why: "안 눌러 본 단추" };
  // 다 눌러 봤으면 — 아는 길로 안 가 본 단추가 남은 화면까지(하네스)
  const path = ctx.stuck < 10 ? mem.route(o.screen, (s) => mem.untried(s) > 0) : null;
  if (path) {
    const c = cs.find((x) => x.key === path[0].key);
    if (c) return { action: { type: "tap", ref: c.ref, key: c.key, label: c.label }, why: `아는 길 ${path.length}걸음`, via: "harness" };
  }
  const close = cs.filter((c) => CLOSE.test(c.label)).sort((a, b) => mem.tried(o.screen, a.key) - mem.tried(o.screen, b.key))[0];
  if (close && ctx.stuck < 6) return { action: { type: "tap", ref: close.ref, key: close.key, label: close.label }, why: "닫고 나가기" };
  if (ctx.stuck < 8) return { action: { type: "key", key: "Escape" }, why: "Esc" };
  if (best && ctx.stuck < 12) return { action: { type: "tap", ref: best.ref, key: best.key, label: best.label }, why: "덜 눌러 본 단추" };
  return { action: { type: "reset" }, why: "막혀서 처음부터" };
}

/**
 * 검증용 — 목표 단추(target)를 찾아 간다. 지금 화면에 있으면 끝, 기억에 그 화면이 있으면 아는 길, 없으면 힌트 쪽으로 탐색.
 * @returns {{ found?: any, action?: any, why: string, via?: string }}
 */
export function findChoice(o, mem, rnd, target, hint, ctx) {
  const hit = o.clickables.find((c) => target.test(c.label) && !c.disabled);
  if (hit) return { found: hit, why: "목표 단추가 보임" };
  const goals = new Set(mem.screensWith(target));
  if (goals.size) {
    const path = mem.route(o.screen, (s) => goals.has(s));
    const c = path && candidates(o).find((x) => x.key === path[0].key);
    if (c) return { action: { type: "tap", ref: c.ref, key: c.key, label: c.label }, why: `기억한 길 ${path.length}걸음`, via: "harness" };
  }
  return exploreChoice(o, mem, rnd, { ...ctx, prefer: hint });
}
