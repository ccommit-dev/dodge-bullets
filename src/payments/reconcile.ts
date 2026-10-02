/**
 * 부팅 정산 (2026-10-02) — 서버 없는 최소안에서 스토어를 기준으로 기기 저장을 맞춘다. 부팅을 막지 않고 뒤에서 돈다.
 *   1. 가격 — 스토어 목록을 받아 표시 가격·판매 여부를 정한다
 *   2. 복구 — 결제는 됐는데 지급 전에 앱이 죽은 구매를 지급한다 (토스 대기 주문 · 플레이 미승인 구매). 같은 주문은 한 번만
 *   3. 복원 — 재설치로 사라진 **영구 상품**(광고 제거 · 캐릭터)을 스토어 구매 내역으로 되살린다
 *   4. 회수 — 환불된 영구 상품을 거둔다. 조회가 실패·타임아웃·구버전(undefined)이면 **아무것도 회수하지 않는다**
 * 소모성 상품(보석·패키지·시즌 패스)의 환불은 서버 없이는 알 수 없다 — 최소안의 한계 (docs/PAYMENTS.md).
 */
import { paymentEnvironment } from "./environment";
import { setStorePrices } from "./prices";
import { playBillingAvailable, playOwnedPurchases, playPrices, playRecover } from "./playBilling";
import { tossOrderHistory, tossPrices, tossRecoverPending } from "./tossIap";
import { grantDurably, isConsumableProduct, isPermanentProduct, PLAY_PRODUCT_IDS, purchaseGrant, revokePurchase, setBillingReady } from "./store";
import { loadCharacterProgress, updateCharacterProgress } from "../progression/storage";

export type ReconcileSummary = { granted: number; revoked: number; cores: number };

/** 진행 중인 정산은 하나만 — 부팅·복귀가 겹쳐도 같은 주문을 동시에 두 번 보지 않게 */
let running: Promise<ReconcileSummary> | null = null;

export function reconcileStore(userHash: string): Promise<ReconcileSummary> {
  if (!running) running = run(userHash).finally(() => { running = null; });
  return running;
}

async function run(userHash: string): Promise<ReconcileSummary> {
  const summary: ReconcileSummary = { granted: 0, revoked: 0, cores: 0 };
  const grant = async (productId: string, transactionId: string): Promise<boolean> => {
    if (!purchaseGrant(productId)) return false;
    const r = await grantDurably(userHash, productId, transactionId);
    if (r.applied) { summary.granted += 1; summary.cores += r.cores; }
    return r.durable;
  };
  const revoke = async (productId: string, transactionId: string): Promise<void> => {
    let did = false;
    await updateCharacterProgress(userHash, (current) => { const r = revokePurchase(current, productId, transactionId); did = r.revoked; return r.progress; });
    if (did) summary.revoked += 1;
  };

  const env = paymentEnvironment();
  if (env === "toss") {
    const prices = await tossPrices();
    if (prices) setStorePrices(prices);
    await tossRecoverPending((sku, orderId) => grant(sku, orderId));
    const history = await tossOrderHistory();
    if (history) {
      for (const order of history) {
        if (!isPermanentProduct(order.sku)) continue;   // 소모성은 복원하지 않는다 — 재설치마다 보석이 다시 생기면 안 된다
        if (order.status === "COMPLETED") await grant(order.sku, order.orderId);
        else await revoke(order.sku, order.orderId);
      }
    }
  } else if (env === "android") {
    const ready = await playBillingAvailable();
    setBillingReady(ready);
    if (!ready) return summary;
    const prices = await playPrices(PLAY_PRODUCT_IDS);
    if (prices) setStorePrices(prices);
    const owned = await playOwnedPurchases();
    if (owned) {
      await playRecover(owned, isConsumableProduct, grant);
      // 플레이에서 산 영구 상품인데 소유 목록에서 사라졌다 = 환불·취소. 조회가 성공했을 때만 (owned 가 null 이면 여기 오지 않는다)
      const ownedTx = new Set(owned.map((p) => p.transactionId).filter(Boolean));
      const progress = await loadCharacterProgress(userHash);
      for (const key of progress.claimedRewards) {
        const m = /^purchase:([^:]+):(GPA\..+)$/.exec(key);
        if (!m || !isPermanentProduct(m[1]) || ownedTx.has(m[2])) continue;
        await revoke(m[1], m[2]);
      }
    }
  }
  return summary;
}
