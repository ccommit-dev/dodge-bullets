/**
 * 성문 원정 기금 (2026-10-02) — 한 번 사면 성문 방어 진척마다 보석을 받는다. 영구 상품(재설치 때 복원).
 *
 * 왜: 성문 방어에는 결제 접점이 하나도 없었다. 새 계정은 S3·S4 에서 막히는데(주간 시뮬), 그 벽을 넘는 순간마다 보상이 있으면
 * "앞으로 받을 몫"이 구매 이유가 된다. **무료 진행 곡선은 그대로** — 기금은 이미 하던 플레이에 얹히는 보석일 뿐 벽을 만들지 않는다.
 * 이미 달성한 단계는 사자마자 받는다(소급).
 *
 * 가치 표시는 카탈로그(또는 스토어) 가격으로 계산한다 — 보석팩 80개 가격 기준 같은 금액이면 몇 개인가.
 */
import type { CharacterProgress } from "../progression/model";

export const GATE_FUND_PRODUCT_ID = "gate-fund";

export type GateFundTier = { id: string; label: string; gems: number; done: (p: Pick<CharacterProgress, "dodgeStars">) => boolean };

const cleared = (p: Pick<CharacterProgress, "dodgeStars">, stageIndex: number) => (p.dodgeStars[String(stageIndex)] ?? 0) >= 1;
export const totalStars = (p: Pick<CharacterProgress, "dodgeStars">) => Object.values(p.dodgeStars).reduce((a, b) => a + b, 0);

export const GATE_FUND_TIERS: GateFundTier[] = [
  { id: "s1", label: "1스테이지 돌파", gems: 100, done: (p) => cleared(p, 0) },
  { id: "s2", label: "2스테이지 돌파", gems: 150, done: (p) => cleared(p, 1) },
  { id: "s3", label: "3스테이지 돌파", gems: 250, done: (p) => cleared(p, 2) },
  { id: "s4", label: "4스테이지 돌파", gems: 400, done: (p) => cleared(p, 3) },
  { id: "star6", label: "원정 별 6개", gems: 300, done: (p) => totalStars(p) >= 6 },
  { id: "star12", label: "원정 별 12개", gems: 500, done: (p) => totalStars(p) >= 12 },
];

export const GATE_FUND_TOTAL_GEMS = GATE_FUND_TIERS.reduce((s, t) => s + t.gems, 0);

export type GateFundState = { paid: boolean; claimed: string[] };
export function emptyGateFund(): GateFundState {
  return { paid: false, claimed: [] };
}

/** 지금 받을 수 있는 단계 */
export function claimableGateFundTiers(p: Pick<CharacterProgress, "gateFund" | "dodgeStars">): GateFundTier[] {
  if (!p.gateFund.paid) return [];
  return GATE_FUND_TIERS.filter((t) => t.done(p) && !p.gateFund.claimed.includes(t.id));
}

/** 이미 달성했지만 기금이 없어 못 받는 보석 — 구매 화면의 "사면 바로 받는 몫" */
export function gateFundReadyGems(p: Pick<CharacterProgress, "gateFund" | "dodgeStars">): number {
  return GATE_FUND_TIERS.filter((t) => t.done(p) && !p.gateFund.claimed.includes(t.id)).reduce((s, t) => s + t.gems, 0);
}

/** 한 단계 수령 (순수) — 기금이 없거나 · 미달성이거나 · 이미 받았으면 그대로 */
export function claimGateFundTier(current: CharacterProgress, tierId: string): { progress: CharacterProgress; gems: number } {
  const tier = GATE_FUND_TIERS.find((t) => t.id === tierId);
  if (!tier || !current.gateFund.paid || !tier.done(current) || current.gateFund.claimed.includes(tierId)) return { progress: current, gems: 0 };
  return {
    progress: { ...current, redGems: current.redGems + tier.gems, gateFund: { ...current.gateFund, claimed: [...current.gateFund.claimed, tierId] } },
    gems: tier.gems,
  };
}

/** 보석팩 보너스 % — 기준 팩(80개) 가격 대비. 1% 미만이거나 계산 불가면 null (화면에 근거 없는 숫자를 쓰지 않는다) */
export function gemPackBonusPercent(gems: number, price: string, basePrice: string, baseGems: number): number | null {
  const ratio = gemValueRatio(gems, price, basePrice, baseGems);
  if (ratio === null || ratio < 1.01) return null;
  return Math.floor((ratio - 1) * 100);
}

/** 가격 문자열(₩9,900 · 9,900원)의 숫자 — 못 읽으면 null */
export function priceNumber(label: string): number | null {
  const n = Number(label.replace(/[^0-9]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * 같은 금액의 기준 보석팩(80개)으로 살 수 있는 보석 대비 몇 배인가 — 둘 다 같은 통화 가격일 때만 계산한다.
 * 화면에 "×3.2" 를 쓰려면 이 함수가 숫자를 돌려줘야 한다 (어림짐작 금지)
 */
export function gemValueRatio(gems: number, price: string, basePrice: string, baseGems: number): number | null {
  const p = priceNumber(price), b = priceNumber(basePrice);
  if (!p || !b) return null;
  const sameCurrency = /원|₩/.test(price) === /원|₩/.test(basePrice);
  if (!sameCurrency) return null;
  return gems / ((p / b) * baseGems);
}
