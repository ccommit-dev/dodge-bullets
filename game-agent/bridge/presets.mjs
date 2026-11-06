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
