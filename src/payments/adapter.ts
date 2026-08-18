export type PurchaseResult =
  | { status: "verified"; transactionId: string; productId: string }
  | { status: "not-configured"; productId: string }
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
