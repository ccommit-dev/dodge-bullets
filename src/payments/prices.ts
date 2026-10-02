/**
 * 스토어 가격 (2026-10-02) — 화면 가격의 진실은 스토어다. 카탈로그의 ₩ 문구는 스토어 목록을 받기 전·받지 못했을 때의 자리값일 뿐이다.
 * 스토어 목록을 받았으면 거기 없는 상품은 **팔지 않는다**(콘솔에 등록 안 된 상품을 눌러 실패하는 일이 없게).
 */
type PriceListener = () => void;

let prices: Map<string, string> | null = null;
const listeners = new Set<PriceListener>();

export function setStorePrices(next: Map<string, string> | null): void {
  prices = next;
  listeners.forEach((fn) => fn());
}

/** 표시 가격 — 스토어 가격이 있으면 그것, 없으면 카탈로그 자리값 */
export function priceLabel(product: { id: string; displayPrice: string }): string {
  return prices?.get(product.id) ?? product.displayPrice;
}

/** 판매 중인가 — 스토어 목록을 받기 전에는 카탈로그를 믿고, 받은 뒤에는 목록에 있는 것만 */
export function productOnSale(productId: string): boolean {
  return prices === null || prices.has(productId);
}

export function storePricesLoaded(): boolean {
  return prices !== null;
}

export function onStorePricesChanged(fn: PriceListener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
