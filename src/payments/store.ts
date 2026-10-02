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
import { closeMomentOffer, momentBonusGems } from "../economy/momentOffers";
import { normalizeSeason } from "../economy/seasonPass";
import { loadCharacterProgress, QA_BUILD, updateCharacterProgress } from "../progression/storage";
import type { CharacterProgress, ShoulderId } from "../progression/model";
import { paymentEnvironment } from "./environment";
import { playPurchase } from "./playBilling";
import { tossPurchase } from "./tossIap";
import { notifyStoreChanged } from "./prices";

/** Play Console에 등록할 상품 id — productCatalog의 id와 1:1 */
export const PLAY_PRODUCT_IDS = ["gems-80", "gems-450", "gems-1200", "adventurer-starter", "adventurer-mid", "adventurer-advanced", "char-obsidian", "char-dawn", "patron-30d", "pack-pioneer", "pack-wall", "pack-rebirth", "season-pass", "remove-ads", "char-ember", "char-frost"] as const;
export type PlayProductId = (typeof PLAY_PRODUCT_IDS)[number];

/**
 * 재설치 때 스토어 내역으로 **복원**하고 환불되면 **회수**하는 영구 상품 — 광고 제거 · 캐릭터 4종.
 * 시즌 패스는 시즌마다 다시 사야 하므로 소모성이다(플레이에서 소비해야 다음 시즌에 또 살 수 있다). 나머지도 전부 소모성
 */
export const PERMANENT_PRODUCT_IDS: readonly string[] = STORE_PRODUCTS.filter((p) => p.kind === "entitlement" && p.id !== "season-pass").map((p) => p.id);
export function isPermanentProduct(productId: string): boolean { return PERMANENT_PRODUCT_IDS.includes(productId); }
export function isConsumableProduct(productId: string): boolean { return !isPermanentProduct(productId); }

/**
 * 안드로이드 결제 플러그인이 실제로 붙어 있는가 — 부팅 정산이 확인해 세운다. null = 아직 확인 전.
 * 바뀌면 상점을 다시 그린다 — 가격 목록을 못 받아도 결제 준비 완료가 화면에 반영되게 (리뷰 2026-10-02)
 */
let billingReady: boolean | null = null;
export function setBillingReady(ready: boolean): void {
  if (billingReady === ready) return;
  billingReady = ready;
  notifyStoreChanged();
}

/** 이 환경에서 실결제가 되는가 — 토스 미니앱이거나, 결제 플러그인이 붙은 안드로이드 */
export function paymentsConfigured(): boolean {
  const env = paymentEnvironment();
  return env === "toss" || (env === "android" && billingReady === true);
}

/** 유료 상품이 안 보일 때 대신 띄울 문구 — 환경마다 이유가 다르다 */
export function paidStoreNote(): string {
  const env = paymentEnvironment();
  if (env === "android") return billingReady === null ? "결제를 불러오는 중입니다…" : "이 기기에서는 결제를 쓸 수 없습니다 (Google Play 확인)";
  if (env === "toss") return "결제를 불러오는 중입니다…";
  return "유료 상품은 토스 앱과 안드로이드 앱에서 구매할 수 있습니다.";
}

/** 유료 상품을 화면에 보일까 — 실결제가 되거나 QA 빌드(테스트 구매)일 때만. 웹 출시 빌드에서는 숨긴다 */
export function paidStoreVisible(): boolean {
  return paymentsConfigured() || QA_BUILD;
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
export function applyPurchase(current: CharacterProgress, productId: string, transactionId: string, now: number = Date.now()): { progress: CharacterProgress; cores: number; applied: boolean; doubled: boolean; bonus?: number } {
  const grant = purchaseGrant(productId);
  const key = `purchase:${productId}:${transactionId}`;
  const product = STORE_PRODUCTS.find((p) => p.id === productId);
  // 회수된 주문(revoked:)은 다시 지급하지 않는다 — 환불 뒤 복구가 같은 주문을 또 지급하는 일이 없게
  if (!grant || current.claimedRewards.includes(key) || current.claimedRewards.includes(`revoked:${productId}:${transactionId}`) || (product?.trigger && packagePurchased(current, productId))) {
    return { progress: current, cores: 0, applied: false, doubled: false, bonus: 0 };
  }
  const doubled = firstDoubleAvailable(current, productId);
  // 순간 제안 창 안이면 보너스 보석 — 가격은 스토어 고정이라 구성으로만 차이를 만든다
  const bonus = momentBonusGems(current, productId, now);
  const gems = (grant.gems ?? 0) * (doubled ? 2 : 1) + bonus;
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
  const withOffer = closeMomentOffer(progress, productId);
  return { progress: withOffer, cores: grant.cores ?? 0, applied: true, doubled, bonus };
}

/**
 * 환불된 영구 상품 회수 — 그 주문의 지급 기록을 지우고, 같은 상품의 다른 구매가 남아 있지 않으면 효과를 거둔다.
 * 쓰고 있던 캐릭터면 기본 캐릭터로 돌린다. 지급 기록이 없는 주문(다른 기기·QA 지급)은 건드리지 않는다
 */
export function revokePurchase(current: CharacterProgress, productId: string, transactionId: string): { progress: CharacterProgress; revoked: boolean } {
  const key = `purchase:${productId}:${transactionId}`;
  if (!current.claimedRewards.includes(key) || transactionId.startsWith("qa-")) return { progress: current, revoked: false };
  const rest = current.claimedRewards.filter((k) => k !== key);
  const stillOwned = rest.some((k) => k.startsWith(`purchase:${productId}:`));
  const grant = purchaseGrant(productId);
  let next: CharacterProgress = { ...current, claimedRewards: [...rest, `revoked:${productId}:${transactionId}`] };
  if (!stillOwned && grant?.adFree) next = { ...next, adFree: false };
  if (!stillOwned && grant?.character) {
    const ch = grant.character;
    next = { ...next, ownedCharacters: next.ownedCharacters.filter((c) => c !== ch), activeCharacter: next.activeCharacter === ch ? "default" : next.activeCharacter };
  }
  return { progress: next, revoked: true };
}

/** 검증된 구매 지급 (저장소 경유) */
export async function grantPurchase(userHash: string, productId: string, transactionId: string): Promise<{ progress: CharacterProgress; cores: number; applied: boolean; doubled: boolean; bonus: number }> {
  let out = { cores: 0, applied: false, doubled: false, bonus: 0 };
  const progress = await updateCharacterProgress(userHash, (current) => {
    const r = applyPurchase(current, productId, transactionId);
    out = { cores: r.cores, applied: r.applied, doubled: r.doubled, bonus: r.bonus ?? 0 };
    return r.progress;
  });
  return { progress, ...out };
}

/**
 * 지급하고 **저장된 것을 다시 읽어 확인**한다. 토스 Storage 쓰기가 타임아웃으로 localStorage 에 떨어지면 다음 읽기는 토스 Storage 를
 * 보므로 지급이 사라진다 — 그때 durable=false 로 돌려 스토어에 완료를 알리지 않는다(주문이 대기로 남아 복구가 다시 지급).
 */
export async function grantDurably(userHash: string, productId: string, transactionId: string): Promise<{ progress: CharacterProgress; cores: number; applied: boolean; doubled: boolean; bonus: number; durable: boolean }> {
  const r = await grantPurchase(userHash, productId, transactionId);
  const saved = await loadCharacterProgress(userHash);
  return { ...r, durable: saved.claimedRewards.includes(`purchase:${productId}:${transactionId}`) };
}

export type StoreBuyResult = { status: "granted" | "duplicate" | "pending" | "cancelled" | "unavailable"; progress?: CharacterProgress; cores: number; bonus: number };

/** 실결제 — 환경의 스토어로 결제하고, 저장이 확인된 뒤에만 스토어에 완료를 알린다 */
export async function buyWithStore(userHash: string, productId: string): Promise<StoreBuyResult> {
  if (!paymentsConfigured() || !purchaseGrant(productId)) return { status: "unavailable", cores: 0, bonus: 0 };
  const box: { r: Awaited<ReturnType<typeof grantDurably>> | null } = { r: null };
  const grant = async (transactionId: string) => { box.r = await grantDurably(userHash, productId, transactionId); return box.r.durable; };
  const result = paymentEnvironment() === "toss" ? await tossPurchase(productId, grant) : await playPurchase(productId, isConsumableProduct(productId), grant);
  if (result.status === "verified" && box.r) return { status: box.r.applied ? "granted" : "duplicate", progress: box.r.progress, cores: box.r.cores, bonus: box.r.bonus };
  if (result.status === "pending") return { status: "pending", cores: 0, bonus: 0 };
  if (result.status === "not-configured") return { status: "unavailable", cores: 0, bonus: 0 };
  return { status: "cancelled", cores: 0, bonus: 0 };
}
