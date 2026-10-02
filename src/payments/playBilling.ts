/**
 * Google Play Billing (2026-10-02) — @capgo/native-purchases 8.x (패키지 .d.ts 기준).
 *
 * 순서가 전부다:
 *   1. purchaseProduct({ isConsumable: false, autoAcknowledgePurchases: false }) — 플러그인이 스스로 승인·소비하지 않게 한다.
 *      (기본값은 자동 승인 — 지급 전에 승인되면, 그 사이 앱이 죽었을 때 돈은 나갔는데 상품이 없다)
 *   2. 지급하고 **저장이 확인되면**
 *   3. 소모성은 consumePurchase(승인 포함 · 다시 살 수 있게), 영구 상품은 acknowledgePurchase.
 *   승인하지 않은 구매는 3일 뒤 구글이 자동 환불한다 — 그 전에 다음 실행의 복구(getPurchases)가 2·3 을 다시 한다.
 * purchaseState "1" = 결제 완료, 그 밖(대기 중 결제 등)은 지급하지 않는다. 환불된 구매는 getPurchases 에서 사라진다.
 * 같은 구매의 식별자는 transactionId(주문 번호 GPA.…) — 실시간 결제와 복구가 같은 값을 써야 두 번 지급되지 않는다.
 */
import type { PurchaseResult } from "./adapter";

export type PlayPurchase = {
  transactionId: string;
  productIdentifier: string;
  purchaseToken?: string;
  purchaseState?: string;
  isAcknowledged?: boolean;
};

type Billing = {
  purchaseProduct: (o: { productIdentifier: string; productType?: string; quantity?: number; isConsumable?: boolean; autoAcknowledgePurchases?: boolean }) => Promise<PlayPurchase>;
  getPurchases: (o?: { productType?: string }) => Promise<{ purchases: PlayPurchase[] }>;
  getProducts: (o: { productIdentifiers: string[]; productType?: string }) => Promise<{ products: Array<{ identifier?: string; priceString?: string }> }>;
  acknowledgePurchase: (o: { purchaseToken: string }) => Promise<void>;
  consumePurchase: (o: { purchaseToken: string }) => Promise<void>;
};

/** 플러그인을 감싸서 돌려준다 — Capacitor 플러그인 프록시를 async 함수에서 그대로 return 하면 Promise 가 .then 을 네이티브로 보낸다 */
async function loadBilling(): Promise<{ billing: Billing; inapp: string } | null> {
  try {
    const cap = (window as unknown as { Capacitor?: { isPluginAvailable?: (n: string) => boolean } }).Capacitor;
    if (cap?.isPluginAvailable && !cap.isPluginAvailable("NativePurchases")) return null;
    const mod = (await import("@capgo/native-purchases")) as unknown as { NativePurchases: Billing; PURCHASE_TYPE?: { INAPP?: string } };
    return { billing: mod.NativePurchases, inapp: mod.PURCHASE_TYPE?.INAPP ?? "inapp" };
  } catch {
    return null;
  }
}

function completed(p: PlayPurchase): boolean {
  return !p.purchaseState || p.purchaseState === "1";
}

/** 지급이 끝난 뒤 — 소모성은 소비, 영구 상품은 승인. 실패해도 다음 실행 복구가 다시 한다 */
async function finish(billing: Billing, p: PlayPurchase, consumable: boolean): Promise<void> {
  if (!p.purchaseToken) return;
  try {
    if (consumable) await billing.consumePurchase({ purchaseToken: p.purchaseToken });
    else if (!p.isAcknowledged) await billing.acknowledgePurchase({ purchaseToken: p.purchaseToken });
  } catch {
    /* 다음 실행에서 다시 */
  }
}

export async function playPurchase(productId: string, consumable: boolean, grant: (transactionId: string) => Promise<boolean>): Promise<PurchaseResult> {
  const loaded = await loadBilling();
  if (!loaded) return { status: "not-configured", productId };
  let purchase: PlayPurchase;
  try {
    purchase = await loaded.billing.purchaseProduct({ productIdentifier: productId, productType: loaded.inapp, quantity: 1, isConsumable: false, autoAcknowledgePurchases: false });
  } catch {
    return { status: "cancelled", productId };   // 사용자 취소 · 네트워크 · 미등록 상품
  }
  if (!completed(purchase)) return { status: "pending", productId };
  const txId = purchase.transactionId || purchase.purchaseToken || "";
  if (!txId) return { status: "cancelled", productId };
  let ok = false;
  try { ok = await grant(txId); } catch { ok = false; }
  if (!ok) return { status: "pending", productId };   // 승인하지 않고 둔다 — 복구가 다시 지급
  await finish(loaded.billing, purchase, consumable);
  return { status: "verified", transactionId: txId, productId };
}

/**
 * 소유 중인 구매(소비·환불되지 않은 것) — 지급 전에 죽은 구매와 영구 상품이 여기 있다.
 * 조회 실패면 null (그때는 아무것도 회수하지 않는다). 성공한 빈 목록은 []
 */
export async function playOwnedPurchases(): Promise<PlayPurchase[] | null> {
  const loaded = await loadBilling();
  if (!loaded) return null;
  try {
    const res = await loaded.billing.getPurchases({ productType: loaded.inapp });
    return Array.isArray(res?.purchases) ? res.purchases : null;
  } catch {
    return null;
  }
}

/** 복구 — 결제 완료된 구매를 지급(멱등)하고 소비·승인한다. 지급한 건수 */
export async function playRecover(owned: PlayPurchase[], isConsumable: (productId: string) => boolean, grant: (productId: string, transactionId: string) => Promise<boolean>): Promise<number> {
  const loaded = await loadBilling();
  if (!loaded) return 0;
  let done = 0;
  for (const p of owned) {
    if (!completed(p) || !p.productIdentifier) continue;
    const txId = p.transactionId || p.purchaseToken || "";
    if (!txId) continue;
    let ok = false;
    try { ok = await grant(p.productIdentifier, txId); } catch { ok = false; }
    if (!ok) continue;
    await finish(loaded.billing, p, isConsumable(p.productIdentifier));
    done += 1;
  }
  return done;
}

export async function playPrices(productIds: readonly string[]): Promise<Map<string, string> | null> {
  const loaded = await loadBilling();
  if (!loaded) return null;
  try {
    const res = await loaded.billing.getProducts({ productIdentifiers: [...productIds], productType: loaded.inapp });
    if (!Array.isArray(res?.products)) return null;
    const map = new Map<string, string>();
    for (const p of res.products) if (p?.identifier && p.priceString) map.set(p.identifier, p.priceString);
    return map;
  } catch {
    return null;
  }
}

export async function playBillingAvailable(): Promise<boolean> {
  return (await loadBilling()) !== null;
}
