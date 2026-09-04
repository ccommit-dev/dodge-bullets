/**
 * 순간 제안 (결제 타이밍) — 상품은 기존 카탈로그를 그대로 쓰고, "사고 싶은 순간"에 카드로 띄운다.
 *
 * 순간이 지나면 카드는 사라지고 상품은 상점 패키지 탭에 정가로 남는다. 창 안에서 사면 보너스 보석을 더 준다 —
 * 가격은 스토어에 고정돼 있으므로 차이는 구성으로만 만든다.
 *
 *   boss-fail  두 번째 보스 실패(벽이 아닌 경우)     → 초급 모험가 세트 ₩3,900
 *   wall       지역 벽 최초 도달                     → 벽 돌파 세트 ₩5,900
 *   pioneer    지역 개척 완료 직후                   → 개척 축하 세트 ₩3,900
 *   rebirth    환생 직후                             → 환생 세트 ₩12,000
 *   pickup     픽업 회전 D-2                         → 붉은 보석 1,200 ₩15,000 (천장 절반 = 30회분)
 */
import type { CharacterProgress } from "../progression/model";
import { STORE_PRODUCTS } from "./productCatalog";

/** 트리거 팩 구매 여부 — payments/store.packagePurchased 와 같은 키 규칙 (순환 import 회피용 복제) */
function packagePurchased(progress: CharacterProgress, productId: string): boolean {
  return progress.claimedRewards.some((k) => k.startsWith(`purchase:${productId}:`));
}

export type MomentOfferKind = "boss-fail" | "wall" | "pioneer" | "rebirth" | "pickup";
export type MomentOfferDef = { productId: string; title: string; subtitle: string; bonusGems: number; windowMs: number };
export type MomentOfferState = { kind: MomentOfferKind; until: number; bonusGems: number; openedAt: number };

const MIN = 60_000;
export const MOMENT_OFFERS: Record<MomentOfferKind, MomentOfferDef> = {
  "boss-fail": { productId: "adventurer-starter", title: "보스가 벽처럼 느껴진다면", subtitle: "정찰 견갑 + 보석 80 + 골드 5,000 — 첫 보스는 견갑 하나로 넘어갑니다", bonusGems: 20, windowMs: 15 * MIN },
  wall: { productId: "pack-wall", title: "벽 도달 — 돌파 세트", subtitle: "편성 동료 조각 30 + 방치 2배 24시간 + 보석 100", bonusGems: 30, windowMs: 15 * MIN },
  pioneer: { productId: "pack-pioneer", title: "개척 축하", subtitle: "새 지역 첫날을 위한 보석 120 + 강화석 40 + 조각 20", bonusGems: 30, windowMs: 30 * MIN },
  rebirth: { productId: "pack-rebirth", title: "환생 축하", subtitle: "두 번째 생을 위한 보석 400 + 스킬 코어 10 + 조각 40", bonusGems: 60, windowMs: 30 * MIN },
  pickup: { productId: "gems-1200", title: "픽업 교체 D-2", subtitle: "보석 1,200이면 천장(60회)의 절반 — 첫 구매면 2배", bonusGems: 150, windowMs: 2 * 24 * 60 * MIN },
};

/** 창이 열려 있는(만료 전) 제안 — 상품별 1개 */
export function activeMomentOffers(progress: CharacterProgress, now: number = Date.now()): Array<{ productId: string } & MomentOfferState> {
  return Object.entries(progress.momentOffers ?? {})
    .filter(([, s]) => s.until > now && s.kind in MOMENT_OFFERS)
    .map(([productId, s]) => ({ productId, ...s, kind: s.kind as MomentOfferKind }))
    .sort((a, b) => b.openedAt - a.openedAt);
}

/** 유료 상품 노출 게이트 — 상점 패키지 탭과 같은 규칙 (출석 3일 또는 Lv 20). 첫 며칠은 무료 카드만 */
export function paidOffersUnlocked(progress: Pick<CharacterProgress, "attendanceStreak" | "level">): boolean {
  return progress.attendanceStreak >= 3 || progress.level >= 20;
}

/** 순간 제안을 연다 — 유료 게이트 전·이미 산 트리거 팩·이미 열린 창·미등록 상품이면 그대로 */
export function openMomentOffer(progress: CharacterProgress, kind: MomentOfferKind, now: number = Date.now(), untilOverride?: number): CharacterProgress {
  if (!paidOffersUnlocked(progress)) return progress;
  const def = MOMENT_OFFERS[kind];
  const product = STORE_PRODUCTS.find((p) => p.id === def.productId);
  if (!product) return progress;
  if (product.trigger && packagePurchased(progress, def.productId)) return progress;
  const existing = progress.momentOffers?.[def.productId];
  if (existing && existing.until > now) return progress;
  // 픽업 제안은 회전 종료 시각까지 — 정의된 창(2일)보다 회전이 먼저 끝나면 그때 닫힌다
  const until = untilOverride ? Math.min(now + def.windowMs, untilOverride) : now + def.windowMs;
  return { ...progress, momentOffers: { ...(progress.momentOffers ?? {}), [def.productId]: { kind, until, bonusGems: def.bonusGems, openedAt: now } } };
}

/** 창 안 구매 보너스 보석 (없으면 0) */
export function momentBonusGems(progress: CharacterProgress, productId: string, now: number = Date.now()): number {
  const s = progress.momentOffers?.[productId];
  return s && s.until > now ? s.bonusGems : 0;
}

/** 구매·만료 후 제안 제거 */
export function closeMomentOffer(progress: CharacterProgress, productId: string): CharacterProgress {
  if (!progress.momentOffers?.[productId]) return progress;
  const next = { ...progress.momentOffers };
  delete next[productId];
  return { ...progress, momentOffers: next };
}

/** 남은 시간 표기 (mm:ss 또는 Nd Nh) */
export function momentTimeLeft(until: number, now: number = Date.now()): string {
  const ms = Math.max(0, until - now);
  if (ms >= 3600_000) { const h = Math.floor(ms / 3600_000); const d = Math.floor(h / 24); return d >= 1 ? `${d}일 ${h % 24}시간` : `${h}시간 ${Math.floor((ms % 3600_000) / MIN)}분`; }
  const m = Math.floor(ms / MIN); const s = Math.floor((ms % MIN) / 1000);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** 정산 모달 후원 미리보기 (retention-3) — 8시간 이상 복귀·후원 미가입·유료 게이트 통과일 때만 */
export const PATRON_PREVIEW_MIN_HOURS = 8;
export function patronPreview(progress: Pick<CharacterProgress, "patronUntil" | "attendanceStreak" | "level">, awaySeconds: number, wastedSeconds: number, gold: number, seconds: number, now: number = Date.now()): { extraGold: number; extraHours: number } | null {
  if (progress.patronUntil > now || !paidOffersUnlocked(progress) || awaySeconds < PATRON_PREVIEW_MIN_HOURS * 3600) return null;
  // 후원 계약은 방치 캡 +2h — 이번 정산의 시급으로 환산한 "정산당 +2시간" 가치를 보여준다
  // (버려진 시간이 0이어도 캡이 차는 다음 정산부터 그만큼 더 받는다). wastedSeconds 는 문구용
  const extraHours = 2;
  const perHour = seconds > 0 ? gold / (seconds / 3600) : 0;
  void wastedSeconds;
  return { extraGold: Math.floor(perHour * extraHours), extraHours };
}
