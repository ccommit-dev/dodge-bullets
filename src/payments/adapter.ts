export type PurchaseResult =
  | { status: "verified"; transactionId: string; productId: string }
  | { status: "not-configured"; productId: string }
  /** 결제는 됐지만 지급·승인이 끝나지 않았다 — 다음 실행의 복구(payments/reconcile)가 지급한다 */
  | { status: "pending"; productId: string }
  | { status: "cancelled"; productId: string };

export interface PaymentAdapter {
  purchase(productId: string): Promise<PurchaseResult>;
}

/** UI integration boundary only. Never grants paid currency client-side. */
export const unconfiguredPaymentAdapter: PaymentAdapter = {
  async purchase(productId) {
    return { status: "not-configured", productId };
  },
};
