/**
 * 리셋용 저장 상태 — 같은 조건에서 다시 하기(재현 스크립트도 이 이름으로 되돌린다).
 * 값은 scripts/verify-settings.mjs 의 심기와 같은 모양(진행도 v5 · 사냥터). test-phase="0" 이면 실제 경제(보석 ∞ · 전부 해금 끔).
 */
export const USER_HASH = "mock-local-dev";

export const PRESETS = {
  /** 처음 깐 사람 — 저장 없음, 실제 경제 */
  fresh: () => ({ "dodgebullets:test-phase": "0", "dodge-bullets:soundEnabled": "0" }),
  /** 6층까지 온 사람 — 실제 경제(보석 100 · 코인 5만 · 골드 2만) */
  mid: (now) => ({
    [`dodgebullets:progression:v1:${USER_HASH}`]: JSON.stringify({ version: 5, onboardingStep: 4, level: 20, exp: 1000, attendanceStreak: 2, titanBestStage: 6, redGems: 100, sharedCoins: 50000, idleClaimedAt: now, updatedAt: now, partyIds: ["mia"], partyCap: 4, towerTickets: 0 }),
    [`dodgebullets:titans:${USER_HASH}`]: JSON.stringify({ stage: 6, bestStage: 6, gold: 20000, heroes: { mia: 5 }, lastActiveAt: now }),
    "dodge-bullets:soundEnabled": "0",
    "dodgebullets:test-phase": "0",
  }),
  /** mid + 테스트 모드(QA 빌드 기본 — 보석 ∞ · 전부 해금). 화면을 넓게 돌 때 */
  qa: (now) => {
    const p = PRESETS.mid(now);
    delete p["dodgebullets:test-phase"];
    return p;
  },
};

export function presetEntries(name, now = Date.now()) {
  const make = PRESETS[name];
  if (!make) throw new Error(`없는 저장 상태: ${name} (있는 것: ${Object.keys(PRESETS).join(", ")})`);
  return make(now);
}

/** 저장 덧붙이기(시나리오의 GM 초기화) — 이름이 짧은 저장은 실제 키로 */
const SAVE_KEYS = {
  progression: `dodgebullets:progression:v1:${USER_HASH}`,
  titans: `dodgebullets:titans:${USER_HASH}`,
  events: `dodgebullets:events:v2:${USER_HASH}`,
};

/** "$now" · "$now+8h" · "$now-30m" → 지금 기준 ms. JSON 에 시각을 적을 수 없어서 */
export function resolveNow(v, now) {
  if (typeof v === "string") {
    const m = v.match(/^\$now(?:([+-])(\d+(?:\.\d+)?)(ms|s|m|h|d))?$/);
    if (!m) return v;
    const unit = { ms: 1, s: 1e3, m: 6e4, h: 36e5, d: 864e5 }[m[3] ?? "ms"];
    return now + (m[1] === "-" ? -1 : 1) * Number(m[2] ?? 0) * unit;
  }
  if (Array.isArray(v)) return v.map((x) => resolveNow(x, now));
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, resolveNow(x, now)]));
  return v;
}

const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);
function deepMerge(a, b) {
  if (!isObj(a) || !isObj(b)) return b;
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = isObj(v) && isObj(a[k]) ? deepMerge(a[k], v) : v;
  return out;
}

/**
 * 프리셋 위에 저장 조각을 겹친다. patch 키는 progression · titans · events(JSON 끼리 깊게 합침) 또는 localStorage 키 그대로(문자열 · null 이면 지움).
 * 배열은 합치지 않고 바꾼다.
 */
export function applyPatch(entries, patch, now = Date.now()) {
  const out = { ...entries };
  for (const [k, raw] of Object.entries(patch ?? {})) {
    const key = SAVE_KEYS[k] ?? k;
    const v = resolveNow(raw, now);
    if (v === null) { delete out[key]; continue; }
    if (typeof v === "string") { out[key] = v; continue; }
    let cur = {};
    try { cur = out[key] ? JSON.parse(out[key]) : {}; } catch { cur = {}; }
    out[key] = JSON.stringify(deepMerge(cur, v));
  }
  return out;
}
