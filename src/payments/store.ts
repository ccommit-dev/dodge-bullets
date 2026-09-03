/**
 * 스토어 결제 어댑터 + 지급.
 *
 * 구조:
 * - getPaymentAdapter(): 네이티브(Capacitor)에서 결제 플러그인이 주입돼 있으면 Google Play 어댑터,
 *   아니면 not-configured 어댑터. 플러그인은 런타임에 window.Capacitor.Plugins에서 찾으므로
 *   패키지가 없어도 컴파일된다 (설치·설정은 docs/PAYMENTS.md).
 * - grantPurchase(): 검증된 구매 1건을 진행도에 지급한다. transactionId를 claimedRewards에 남겨
 *   같은 영수증이 두 번 지급되지 않게 한다.
 *
 * 영수증 검증: 현재는 플러그인이 돌려준 결과를 신뢰한다(로컬). 서버 검증을 붙일 때는
 * verifyReceipt()만 교체하면 된다 (LIVEOPS §3.5 — 서버 검증 도입 시 개인정보 방침 재작성).
 */
import { FIRST_DOUBLE_IDS, PATRON, STORE_PRODUCTS } from "../economy/productCatalog";
import { normalizeSeason } from "../economy/seasonPass";
import { updateCharacterProgress } from "../progression/storage";
import type { CharacterProgress, ShoulderId } from "../progression/model";
import { isNativePlatform } from "../game/native";
import { unconfiguredPaymentAdapter, type PaymentAdapter, type PurchaseResult } from "./adapter";

/** Play Console에 등록할 상품 id — productCatalog의 id와 1:1 */
export const PLAY_PRODUCT_IDS = ["gems-80", "gems-450", "gems-1200", "adventurer-starter", "adventurer-mid", "adventurer-advanced", "char-obsidian", "char-dawn", "patron-30d", "pack-pioneer", "pack-wall", "pack-rebirth", "season-pass", "remove-ads", "char-ember", "char-frost"] as const;
export type PlayProductId = (typeof PLAY_PRODUCT_IDS)[number];

/** @capgo/native-purchases 가 노출하는 최소 표면 — 런타임 주입 여부만 확인한다 */
type NativePurchasesPlugin = {
  purchaseProduct(options: { productIdentifier: string; productType?: "inapp" | "subs"; quantity?: number }): Promise<{ transactionId?: string; purchaseToken?: string; productIdentifier?: string }>;
  isBillingSupported?(): Promise<{ isBillingSupported: boolean }>;
};

function nativePurchases(): NativePurchasesPlugin | null {
  try {
    const cap = (window as unknown as { Capacitor?: { Plugins?: Record<string, unknown> } }).Capacitor;
    const plugin = cap?.Plugins?.NativePurchases as NativePurchasesPlugin | undefined;
    return plugin && typeof plugin.purchaseProduct === "function" ? plugin : null;
  } catch {
    return null;
  }
}

/** 로컬 검증 자리 — 서버 검증 도입 시 이 함수만 교체 */
async function verifyReceipt(productId: string, transactionId: string): Promise<boolean> {
  return typeof transactionId === "string" && transactionId.length > 0 && (PLAY_PRODUCT_IDS as readonly string[]).includes(productId);
}

const googlePlayAdapter: PaymentAdapter = {
  async purchase(productId): Promise<PurchaseResult> {
    const plugin = nativePurchases();
    if (!plugin) return { status: "not-configured", productId };
    try {
      const result = await plugin.purchaseProduct({ productIdentifier: productId, productType: "inapp", quantity: 1 });
      const transactionId = result.transactionId ?? result.purchaseToken ?? "";
      if (!(await verifyReceipt(productId, transactionId))) return { status: "cancelled", productId };
      return { status: "verified", transactionId, productId };
    } catch {
      // 사용자 취소·네트워크·미등록 상품 — 전부 취소로 본다 (지급 없음)
      return { status: "cancelled", productId };
    }
  },
};

export function getPaymentAdapter(): PaymentAdapter {
  return isNativePlatform() && nativePurchases() ? googlePlayAdapter : unconfiguredPaymentAdapter;
}

export function paymentsConfigured(): boolean {
  return isNativePlatform() && nativePurchases() !== null;
}

/** 상품별 지급 내용 — productCatalog의 contents 문구와 일치해야 한다. allyShards는 출전 1번 동료에게 */
export type PurchaseGrantSpec = Partial<{ gems: number; gold: number; materials: number; cores: number; shoulder: ShoulderId; character: string; patronDays: number; allyShards: number; idleBoostHours: number; seasonPaid: boolean; adFree: boolean }>;
export function purchaseGrant(productId: string): PurchaseGrantSpec | null {
  switch (productId) {
    case "gems-80": return { gems: 80 };
    case "gems-450": return { gems: 450 };
    case "gems-1200": return { gems: 1200 };
    case "adventurer-starter": return { gems: 80, gold: 5000, materials: 10, shoulder: "scout" };
    case "adventurer-mid": return { gems: 250, gold: 50000, cores: 5, shoulder: "shadow" };
    case "adventurer-advanced": return { gems: 700, materials: 30, cores: 15, shoulder: "dragon" };
    case "char-obsidian": return { character: "obsidian" };
    case "char-dawn": return { character: "dawn" };
    case "char-ember": return { character: "ember" };
    case "char-frost": return { character: "frost" };
    case "patron-30d": return { patronDays: PATRON.days };
    // H 트리거 패키지
    case "pack-pioneer": return { gems: 120, materials: 40, allyShards: 20 };
    case "pack-wall": return { allyShards: 30, idleBoostHours: 24, gems: 100 };
    case "pack-rebirth": return { gems: 400, cores: 10, allyShards: 40 };
    case "season-pass": return { seasonPaid: true };
    case "remove-ads": return { adFree: true };
    default: return null;
  }
}

/** 첫 구매 2배 (H) — 보석팩 3종은 팩마다 첫 구매 시 보석 2배. 기록 키 first-double:<id> */
export function firstDoubleAvailable(progress: Pick<CharacterProgress, "claimedRewards">, productId: string): boolean {
  return (FIRST_DOUBLE_IDS as readonly string[]).includes(productId) && !progress.claimedRewards.includes(`first-double:${productId}`);
}

/** 트리거 패키지 구매 여부 — transactionId와 무관하게 상품 id로 1회 판정 */
export function packagePurchased(progress: Pick<CharacterProgress, "claimedRewards">, productId: string): boolean {
  return progress.claimedRewards.some((k) => k.startsWith(`purchase:${productId}:`));
}

/**
 * 구매 1건을 진행도에 적용하는 순수 함수 — 같은 key(purchase:<id>:<tx>)는 두 번 적용되지 않는다.
 * 트리거 패키지는 상품당 1회. 반환 cores는 사냥터 저장에 있으므로 호출자가 더한다.
 */
export function applyPurchase(current: CharacterProgress, productId: string, transactionId: string, now: number = Date.now()): { progress: CharacterProgress; cores: number; applied: boolean; doubled: boolean } {
  const grant = purchaseGrant(productId);
  const key = `purchase:${productId}:${transactionId}`;
  const product = STORE_PRODUCTS.find((p) => p.id === productId);
  if (!grant || current.claimedRewards.includes(key) || (product?.trigger && packagePurchased(current, productId))) {
    return { progress: current, cores: 0, applied: false, doubled: false };
  }
  const doubled = firstDoubleAvailable(current, productId);
  const gems = (grant.gems ?? 0) * (doubled ? 2 : 1);
  const target = current.partyIds[0];
  const progress: CharacterProgress = {
    ...current,
    redGems: current.redGems + gems,
    sharedCoins: current.sharedCoins + (grant.gold ?? 0),
    enhancementMaterials: current.enhancementMaterials + (grant.materials ?? 0),
    ownedShoulders: grant.shoulder ? [...new Set([...current.ownedShoulders, grant.shoulder])] : current.ownedShoulders,
    ownedCharacters: grant.character ? [...new Set([...current.ownedCharacters, grant.character])] : current.ownedCharacters,
    // 후원 계약은 남은 기간 위에 이어 붙는다 (조기 재구매 손해 없음)
    patronUntil: grant.patronDays ? Math.max(now, current.patronUntil) + grant.patronDays * 86400000 : current.patronUntil,
    allyShards: grant.allyShards && target ? { ...current.allyShards, [target]: (current.allyShards[target] ?? 0) + grant.allyShards } : current.allyShards,
    idleBoostUntil: grant.idleBoostHours ? Math.max(now, current.idleBoostUntil) + grant.idleBoostHours * 3600000 : current.idleBoostUntil,
    seasonPass: grant.seasonPaid ? { ...normalizeSeason(current, now), paid: true } : current.seasonPass,
    adFree: grant.adFree ? true : current.adFree,
    claimedRewards: [...current.claimedRewards, key, ...(doubled ? [`first-double:${productId}`] : [])],
  };
  return { progress, cores: grant.cores ?? 0, applied: true, doubled };
}

/** 검증된 구매 지급 (저장소 경유) */
export async function grantPurchase(userHash: string, productId: string, transactionId: string): Promise<{ progress: CharacterProgress; cores: number; applied: boolean; doubled: boolean }> {
  let out = { cores: 0, applied: false, doubled: false };
  const progress = await updateCharacterProgress(userHash, (current) => {
    const r = applyPurchase(current, productId, transactionId);
    out = { cores: r.cores, applied: r.applied, doubled: r.doubled };
    return r.progress;
  });
  return { progress, ...out };
}
