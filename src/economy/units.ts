/**
 * 단위 낮추기 2차 (2026-11-10) — 대장간 지갑(`CharacterProgress.sharedCoins`)과 경험치.
 * 사용자: "골드나 강화석 경험치 단위도 너무 커서 집중도가 떨어져 … 수치를 확 낮추고". 1차는 사냥터 골드(titans/model GOLD_CURVE).
 *
 * 대장간 지갑 ÷100 — 대장간 쪽 값(강화 · 판매 · 방지권 · 재련 · 보호구 · 파츠 · 원정 무기 · 스킬 · 숙련 이정표)과
 * 층에 따라 불어나는 수입(방치 정산 · 균열 · 이벤트 상점 골드)을 **같은 배**로 줄인다. 값마다 다르게 누르면 "키워서 팔기" 손익이 바뀌고,
 * 지수로 누르면(1차의 사냥터 방식) 방치 몇 시간~며칠에 사는 값이 최대 16배 빨라진다 — 이쪽은 한 번 사는 데 걸리는 시간이 길어서다.
 * 판을 깨고 받는 골드(댐 방어전 · 비트)와 고정 지급(토벌령 250 · 그림자 결투 · 상품 골드)은 그대로 둔다 — 원래 수백~수만이고,
 * 100으로 나누면 한 판 7골드가 된다. 그래서 판 보상은 대장간 값에 견줘 예전의 100배 값어치다(초반 며칠 대장간이 빨라진다).
 *
 * 경험치 ÷10 — 필요 경험치와 지급을 같이 줄여 레벨 속도는 같다. 100으로 나누면 한 판 0.4라 반올림이 속도를 바꾼다.
 * 강화석은 그대로 — 한 판 17~134개 · 한 번에 1~42개 쓰는 단위라 나누면 1개짜리 값이 0이 된다.
 */
/** 저장 단위 판 번호 — 0(없음) = 예전 단위, 1 = 지갑 ÷100 · 경험치 ÷10, 2 = 보석 ÷10, 3 = 지갑(은화) ÷10. 읽을 때 한 번 바꾼다 (progression/storage readProgress) */
export const UNIT_REV = 3;
/** 은화 3차 ÷10 (2026-11-18 /goal "수치는 낮은게 핵심") — 2차(÷100)와 같은 원칙: 대장간 값과 층에 따라 불어나는 수입을 같은 배로.
 *  이번엔 판 보상(성문 방어 · 비트 · 소탕 · 보물 · 토벌령 · 그림자 결투 · 상품 은화)도 같이 줄인다 — 2차 때 남겨 둔 100배 값어치를 더 키우지 않게 */
export const SILVER_STEP = 10;
/** 옛 단위(판 0) 은화 ÷ 이 값 = 지금 단위 — 방치 정산 · 균열 · 이벤트 상점 · 비트 연동 · 스킬 값이 이 값으로 나눈다 */
export const COIN_UNIT = 100 * SILVER_STEP;
export const EXP_UNIT = 10;
/**
 * 보석 ÷10 (2026-11-18, 사용자 /goal: "간단 명료 — 수치는 낮은게 핵심이야 (금전, 보석 등등)") — 가진 보석 · 값 · 지급을 모두 같은 배로 줄인다.
 * 같은 배라 뽑기 한 번에 드는 날 수 · 결제 상품의 값어치는 그대로다. 가진 보석은 올림(산 재화를 깎지 않는다).
 * 10의 배수가 아니던 값(출석 20+5w · 루틴 15 · 점심 5 · 시즌 25/35 · 비트 묶음 75)은 반올림 — gemsFromOld. 후원 계약 15/일은 1 · 2 를 번갈아 30일 45(값어치 그대로)
 */
export const GEM_UNIT = 10;
/** 판마다 나눌 배수 — 판 번호 r 인 저장은 r+1 … UNIT_REV 단계를 모두 곱한 만큼 나눈다 */
const UNIT_STEPS: Record<number, { coins: number; exp: number; gems: number }> = {
  1: { coins: 100, exp: EXP_UNIT, gems: 1 },
  2: { coins: 1, exp: 1, gems: GEM_UNIT },
  3: { coins: SILVER_STEP, exp: 1, gems: 1 },
};
export function unitDivisors(fromRev: number): { coins: number; exp: number; gems: number } {
  const out = { coins: 1, exp: 1, gems: 1 };
  for (let r = Math.max(0, Math.floor(fromRev)) + 1; r <= UNIT_REV; r += 1) {
    const st = UNIT_STEPS[r];
    if (!st) continue;
    out.coins *= st.coins; out.exp *= st.exp; out.gems *= st.gems;
  }
  return out;
}
/** 판 보상 은화(옛 식 그대로 계산한 값) → 지금 단위. 0 보다 크면 1 이상 */
export function silverFromOld(old: number): number {
  return old <= 0 ? 0 : Math.max(1, Math.round(old / SILVER_STEP));
}
/** 예전 단위 보석 값 → 지금 단위(반올림, 0 보다 크면 1 이상) — 10의 배수가 아니던 표에만 쓴다 */
export function gemsFromOld(old: number): number {
  return old <= 0 ? 0 : Math.max(1, Math.round(old / GEM_UNIT));
}
