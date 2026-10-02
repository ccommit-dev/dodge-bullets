/**
 * 토스 인앱결제 (2026-10-02) — @apps-in-toss/web-framework 의 IAP (설치된 SDK 2.10.8 의 .d.ts 기준).
 *
 * 계약(SDK 정의에서 읽은 그대로):
 *   · createOneTimePurchaseOrder({ options: { sku, processProductGrant }, onEvent, onError }) → cleanup.
 *     결제가 끝나면 processProductGrant({ orderId }) 가 불리고, **지급에 성공했을 때만 true** 를 돌려준다. 예제도 여기서 지급한다.
 *   · 지급 전에 앱이 죽은 주문은 getPendingOrders() 에 남는다 → 지급한 뒤 completeProductGrant({ params: { orderId } }).
 *   · getCompletedOrRefundedOrders({ key }) — 완료·환불 주문, 페이지네이션(hasNext · nextKey).
 *   · getProductItemList() — 콘솔에 등록한 상품과 표시 가격(displayAmount).
 *   · 토스 앱 5.233.0 미만이면 조회 함수가 undefined 를 돌려준다 → "아무것도 하지 않음"으로 본다.
 * 조회에는 타임아웃을 두되, 결제창(createOneTimePurchaseOrder) 자체에는 두지 않는다 — 사용자가 결제하는 시간이다.
 */
import type { PurchaseResult } from "./adapter";
import { withTimeout } from "../game/toss";

const QUERY_TIMEOUT_MS = 6_000;
const MAX_HISTORY_PAGES = 40;

type TossIap = {
  createOneTimePurchaseOrder: (params: {
    options: { sku: string; processProductGrant: (p: { orderId: string }) => boolean | Promise<boolean> };
    onEvent: (event: { type: string; data?: { orderId?: string } }) => void | Promise<void>;
    onError: (error: unknown) => void | Promise<void>;
  }) => () => void;
  getPendingOrders: () => Promise<{ orders: Array<{ orderId: string; sku: string }> } | undefined>;
  getCompletedOrRefundedOrders: (params?: { key?: string | null }) => Promise<unknown>;
  completeProductGrant: (params: { params: { orderId: string } }) => Promise<boolean | undefined>;
  getProductItemList: () => Promise<{ products: Array<{ sku?: string; displayAmount?: string }> } | undefined>;
};

/** IAP 객체를 감싸서 돌려준다 — 모듈 객체를 async 경계 너머로 그대로 넘기지 않는다 (Capacitor 프록시 then 사고와 같은 종류 방지) */
async function loadIap(): Promise<{ iap: TossIap } | null> {
  try {
    const mod = (await import("@apps-in-toss/web-framework")) as unknown as { IAP?: TossIap };
    // 함수 존재는 쓰는 자리마다 따로 본다 — SDK 버전에 따라 일부만 있을 수 있다
    return mod.IAP && typeof mod.IAP === "object" ? { iap: mod.IAP } : null;
  } catch {
    return null;
  }
}

/**
 * 결제 → 지급. grant(orderId) 는 **저장이 확인된 뒤에만** true — 그래야 토스가 지급 완료로 넘어가고, false 면 주문이 대기로 남아
 * 다음 실행의 복구가 다시 지급한다.
 */
export async function tossPurchase(productId: string, grant: (orderId: string) => Promise<boolean>): Promise<PurchaseResult> {
  const loaded = await loadIap();
  if (!loaded || typeof loaded.iap.createOneTimePurchaseOrder !== "function") return { status: "not-configured", productId };
  return new Promise<PurchaseResult>((resolve) => {
    let settled = false;
    let granted = false;
    let orderSeen = "";
    let cleanup: (() => void) | undefined;
    const finish = (result: PurchaseResult) => {
      if (settled) return;
      settled = true;
      try { cleanup?.(); } catch { /* ignore */ }
      resolve(result);
    };
    try {
      cleanup = loaded.iap.createOneTimePurchaseOrder({
        options: {
          sku: productId,
          processProductGrant: async ({ orderId }) => {
            orderSeen = orderId;
            try { granted = await grant(orderId); } catch { granted = false; }
            return granted;
          },
        },
        onEvent: (event) => {
          if (event?.type !== "success") return;
          const orderId = orderSeen || event.data?.orderId || "";
          finish(granted && orderId ? { status: "verified", transactionId: orderId, productId } : { status: "pending", productId });
        },
        onError: (error) => {
          const code = (error as { code?: string } | null)?.code;
          // 결제는 됐는데 지급·승인이 남은 경우 — 대기 주문 복구가 맡는다
          const pending = code === "PAYMENT_PENDING" || code === "PRODUCT_NOT_GRANTED_BY_PARTNER" || code === "TOSS_SERVER_VERIFICATION_FAILED";
          finish(pending ? { status: "pending", productId } : { status: "cancelled", productId });
        },
      });
    } catch {
      finish({ status: "cancelled", productId });
    }
  });
}

/** 지급 전에 앱이 죽은 주문을 지급하고 완료를 알린다. grant 는 멱등(같은 주문은 한 번만 지급) */
export async function tossRecoverPending(grant: (sku: string, orderId: string) => Promise<boolean>): Promise<number> {
  const loaded = await loadIap();
  if (!loaded || typeof loaded.iap.getPendingOrders !== "function" || typeof loaded.iap.completeProductGrant !== "function") return 0;
  const res = await withTimeout(Promise.resolve().then(() => loaded.iap.getPendingOrders()), QUERY_TIMEOUT_MS, undefined);
  if (!res || !Array.isArray(res.orders)) return 0;
  let done = 0;
  for (const order of res.orders) {
    if (!order?.orderId || !order.sku) continue;
    let ok = false;
    try { ok = await grant(order.sku, order.orderId); } catch { ok = false; }
    if (!ok) continue;
    await withTimeout(Promise.resolve().then(() => loaded.iap.completeProductGrant({ params: { orderId: order.orderId } })), QUERY_TIMEOUT_MS, undefined);
    done += 1;
  }
  return done;
}

export type TossOrder = { orderId: string; sku: string; status: "COMPLETED" | "REFUNDED" };

/** 완료·환불 주문 전체 — 페이지를 끝까지 넘긴다. 한 페이지라도 실패하면 null (불완전한 목록으로 회수하지 않는다) */
export async function tossOrderHistory(): Promise<TossOrder[] | null> {
  const loaded = await loadIap();
  if (!loaded || typeof loaded.iap.getCompletedOrRefundedOrders !== "function") return null;
  const out: TossOrder[] = [];
  let key: string | null = null;
  for (let page = 0; page < MAX_HISTORY_PAGES; page += 1) {
    const query = key;
    const res = (await withTimeout(Promise.resolve().then(() => loaded.iap.getCompletedOrRefundedOrders(query ? { key: query } : undefined)), QUERY_TIMEOUT_MS, undefined)) as
      | { hasNext?: boolean; nextKey?: string | null; orders?: TossOrder[] }
      | undefined;
    if (!res || !Array.isArray(res.orders)) return null;
    for (const o of res.orders) if (o?.orderId && o.sku && (o.status === "COMPLETED" || o.status === "REFUNDED")) out.push({ orderId: o.orderId, sku: o.sku, status: o.status });
    if (!res.hasNext) return out;
    if (!res.nextKey) return null;
    key = res.nextKey;
  }
  return null;
}

/** 콘솔 상품과 표시 가격 — 실패·구버전이면 null */
export async function tossPrices(): Promise<Map<string, string> | null> {
  const loaded = await loadIap();
  if (!loaded || typeof loaded.iap.getProductItemList !== "function") return null;
  const res = await withTimeout(Promise.resolve().then(() => loaded.iap.getProductItemList()), QUERY_TIMEOUT_MS, undefined);
  if (!res || !Array.isArray(res.products)) return null;
  const map = new Map<string, string>();
  for (const p of res.products) if (p?.sku && p.displayAmount) map.set(p.sku, p.displayAmount);
  return map;
}
