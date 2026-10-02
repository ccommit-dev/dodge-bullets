/**
 * 결제 로직 검증 (2026-10-02) — 진짜 결제는 플레이 내부 테스트 트랙·토스 샌드박스에서만 돈다. 여기서는 **가짜 스토어**로
 * 지급·완료 순서와 복구·복원·회수 규칙을 실제 소스(payments/*)로 확인한다.
 *   node scripts/verify-payments.mjs
 * 가짜: @apps-in-toss/web-framework(IAP · Storage) · @capgo/native-purchases(NativePurchases) — 테스트마다 globalThis 에 갈아 끼운다.
 */
import { build } from "esbuild";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd().replace(/\\/g, "/");
const dir = mkdtempSync(join(tmpdir(), "payments-"));
writeFileSync(join(dir, "fake-toss.js"), `
export const IAP = new Proxy({}, { get: (_, k) => globalThis.__toss?.IAP?.[k] });
export const Storage = new Proxy({}, { get: (_, k) => globalThis.__toss?.Storage?.[k] });
export const GoogleAdMob = undefined;
`);
writeFileSync(join(dir, "fake-play.js"), `
export const NativePurchases = new Proxy({}, { get: (_, k) => globalThis.__play?.[k] });
export const PURCHASE_TYPE = { INAPP: "inapp", SUBS: "subs" };
`);
const entry = join(dir, "entry.ts");
writeFileSync(entry, [
  `export * as store from "${root}/src/payments/store";`,
  `export * as reconcile from "${root}/src/payments/reconcile";`,
  `export * as env from "${root}/src/payments/environment";`,
  `export * as prices from "${root}/src/payments/prices";`,
  `export * as prog from "${root}/src/progression/storage";`,
  `export * as catalog from "${root}/src/economy/productCatalog";`,
].join("\n"));
const out = join(dir, "bundle.mjs");
await build({
  entryPoints: [entry], bundle: true, format: "esm", outfile: out, platform: "node",
  define: { "import.meta.env.BASE_URL": '"/"', "import.meta.env.DEV": "false", "import.meta.env.PROD": "true", "import.meta.env.VITE_QA_BUILD": "undefined", "import.meta.env.VITE_TOSS_AD_GROUP_ID": "undefined" },
  plugins: [{ name: "fakes", setup(b) {
    b.onResolve({ filter: /^@apps-in-toss\/web-framework$/ }, () => ({ path: join(dir, "fake-toss.js") }));
    b.onResolve({ filter: /^@capgo\/native-purchases$/ }, () => ({ path: join(dir, "fake-play.js") }));
  } }],
});

// ── 브라우저 흉내: localStorage(던지기 스위치 포함) · window ──
const mem = new Map();
let storageThrows = false;
globalThis.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => { if (storageThrows) throw new Error("quota"); mem.set(k, String(v)); },
  removeItem: (k) => mem.delete(k),
  clear: () => mem.clear(),
  key: (i) => [...mem.keys()][i] ?? null,
  get length() { return mem.size; },
};
globalThis.window = globalThis;
globalThis.window.Capacitor = { isPluginAvailable: () => true };
globalThis.document ??= { createElement: () => ({ style: {}, getContext: () => null }), body: { appendChild() {}, removeChild() {} } };

const { store, reconcile, env, prices, prog, catalog } = await import(pathToFileURL(out).href);
rmSync(dir, { recursive: true, force: true });

let failed = 0;
const ok = (name, cond, detail = "") => { console.log(`${cond ? "PASS" : "FAIL"} ${name}${detail ? " — " + detail : ""}`); if (!cond) failed += 1; };
const H = "u1";
const P = () => prog.loadCharacterProgress(H);
const has = async (key) => (await P()).claimedRewards.includes(key);
const fresh = () => { mem.clear(); storageThrows = false; globalThis.__toss = { IAP: {} }; globalThis.__play = {}; prices.setStorePrices(null); };

// ── 카탈로그 ──
{
  const ids = catalog.STORE_PRODUCTS.map((p) => p.id).sort();
  const play = [...store.PLAY_PRODUCT_IDS].sort();
  ok("상품 ID: 카탈로그 = 스토어 등록 목록 (양방향)", JSON.stringify(ids) === JSON.stringify(play), `카탈로그만 ${ids.filter((i) => !play.includes(i)).join(",") || "-"} · 등록만 ${play.filter((i) => !ids.includes(i)).join(",") || "-"}`);
  ok("영구 상품 = 광고 제거 + 캐릭터 4종, 시즌 패스는 소모성", JSON.stringify([...store.PERMANENT_PRODUCT_IDS].sort()) === JSON.stringify(["char-dawn", "char-ember", "char-frost", "char-obsidian", "remove-ads"]) && store.isConsumableProduct("season-pass"), [...store.PERMANENT_PRODUCT_IDS].join(","));
}

// ── 진행도 갱신은 한 줄로 ──
{
  fresh();
  await Promise.all([1, 2, 3, 4, 5].map(() => prog.updateCharacterProgress(H, (c) => ({ ...c, redGems: c.redGems + 10 }))));
  ok("동시에 다섯 번 갱신해도 하나도 지워지지 않는다 (읽고·쓰기 사이 끼어들기 없음)", (await P()).redGems === 50, String((await P()).redGems));
}

// ── 읽기가 쓰지 않는다 · 레거시 합치기가 있어도 읽기와 지급이 겹쳐 지급이 사라지지 않는다 ──
// 저장소에 실제 지연(1~8ms)을 넣어 읽기·쓰기가 진짜로 엇갈리게 한다 — 동기 가짜로는 겹침이 생기지 않는다
{
  fresh();
  const slow = new Map();
  const wait = () => new Promise((r) => setTimeout(r, 1 + Math.floor(Math.random() * 8)));
  let writes = 0;
  globalThis.__toss.Storage = { getItem: async (k) => { await wait(); return slow.has(k) ? slow.get(k) : null; }, setItem: async (k, v) => { await wait(); writes += 1; slow.set(k, v); } };
  await prog.updateCharacterProgress(H, (c) => ({ ...c, redGems: 0 }));
  await new Promise((r) => setTimeout(r, 20));
  const w0 = writes;
  await P(); await P(); await P();
  ok("변화가 없으면 읽기는 저장하지 않는다", writes === w0, `읽기 3번에 쓰기 ${writes - w0}번`);
  slow.set("dodgebullets:coins:" + H, "777");   // 레거시 코인 키가 더 크면 읽을 때 합칠 것이 생긴다
  const jobs = [];
  for (let i = 0; i < 6; i += 1) { jobs.push(P()); jobs.push(prog.updateCharacterProgress(H, (c) => ({ ...c, redGems: c.redGems + 100 }))); }
  await Promise.all(jobs);
  const after = await P();
  ok("읽기와 지급이 겹쳐도 지급 6번(+600)과 레거시 합치기(코인 777)가 모두 남는다", after.redGems === 600 && after.sharedCoins >= 777, `보석 ${after.redGems} 코인 ${after.sharedCoins}`);
  globalThis.__toss.Storage = undefined;
}

// ── 웹: 판매 없음 ──
{
  fresh(); env.setPaymentEnvironment("web");
  const r = await store.buyWithStore(H, "gems-80");
  ok("웹: 결제 불가 · 유료 상품 숨김 (출시 빌드)", r.status === "unavailable" && !store.paymentsConfigured() && !store.paidStoreVisible(), r.status);
}

// ── 토스: 실시간 결제 ──
{
  fresh(); env.setPaymentEnvironment("toss");
  let grantedAtCallback = null;
  globalThis.__toss.IAP.createOneTimePurchaseOrder = ({ options, onEvent }) => {
    setTimeout(async () => {
      const r = await options.processProductGrant({ orderId: "T-1" });
      grantedAtCallback = r && (await has("purchase:gems-80:T-1"));
      onEvent({ type: "success", data: { orderId: "T-1" } });
    }, 0);
    return () => undefined;
  };
  const r = await store.buyWithStore(H, "gems-80");
  ok("토스: 지급 콜백은 저장이 확인된 뒤에만 true", grantedAtCallback === true);
  ok("토스: 결제 → 지급 1회", r.status === "granted" && (await P()).redGems > 0, `${r.status} · 보석 ${(await P()).redGems}`);
}

// ── 토스: 결제 후 지급 전에 앱이 죽었다 → 다음 실행에서 대기 주문을 지급하고 완료를 알린다 ──
{
  fresh(); env.setPaymentEnvironment("toss");
  let pending = [{ orderId: "T-2", sku: "gems-450" }];
  const completedCalls = [];
  let completeFails = false;
  Object.assign(globalThis.__toss.IAP, {
    getPendingOrders: async () => ({ orders: pending }),
    completeProductGrant: async ({ params }) => { completedCalls.push(params.orderId); if (!completeFails) pending = pending.filter((o) => o.orderId !== params.orderId); return !completeFails; },
    getCompletedOrRefundedOrders: async () => ({ hasNext: false, orders: [] }),
    getProductItemList: async () => ({ products: [] }),
  });
  const r1 = await reconcile.reconcileStore(H);
  const gems1 = (await P()).redGems;
  ok("토스 복구: 대기 주문을 한 번 지급하고 완료를 알린다", r1.granted === 1 && gems1 > 0 && completedCalls.join() === "T-2", `${JSON.stringify(r1)} · 완료 ${completedCalls.join()}`);
  const r2 = await reconcile.reconcileStore(H);
  ok("토스 복구: 다시 돌려도 아무것도 지급하지 않는다", r2.granted === 0 && (await P()).redGems === gems1 && completedCalls.length === 1, JSON.stringify(r2));
  pending = [{ orderId: "T-2", sku: "gems-450" }]; completeFails = true;
  const r3 = await reconcile.reconcileStore(H);
  ok("토스 복구: 완료 알림이 실패해 같은 주문이 또 와도 두 번 지급하지 않는다", r3.granted === 0 && (await P()).redGems === gems1 && completedCalls.length === 2, JSON.stringify(r3));
}

// ── 토스: 재설치 복원(영구 상품만, 페이지 끝까지) · 환불 회수 ──
{
  fresh(); env.setPaymentEnvironment("toss");
  let history = {
    k0: { hasNext: true, nextKey: "k2", orders: [{ orderId: "T-3", sku: "char-dawn", status: "COMPLETED" }, { orderId: "T-4", sku: "gems-80", status: "COMPLETED" }] },
    k2: { hasNext: false, orders: [{ orderId: "T-5", sku: "remove-ads", status: "COMPLETED" }] },
  };
  Object.assign(globalThis.__toss.IAP, {
    getPendingOrders: async () => ({ orders: [] }),
    completeProductGrant: async () => true,
    getCompletedOrRefundedOrders: async (p) => history[p?.key ?? "k0"],
    getProductItemList: async () => ({ products: [{ sku: "gems-80", displayAmount: "1,500원" }, { sku: "char-dawn", displayAmount: "5,900원" }] }),
  });
  await reconcile.reconcileStore(H);
  let p = await P();
  ok("토스 복원: 두 페이지의 영구 상품(캐릭터 · 광고 제거)을 되살린다", p.ownedCharacters.includes("dawn") && p.adFree === true, `chars ${p.ownedCharacters} adFree ${p.adFree}`);
  ok("토스 복원: 소모성(보석)은 재설치로 다시 생기지 않는다", !p.claimedRewards.includes("purchase:gems-80:T-4") && p.redGems === 0, `보석 ${p.redGems}`);
  ok("토스 가격: 콘솔 가격을 쓰고, 콘솔에 없는 상품은 팔지 않는다", prices.priceLabel({ id: "gems-80", displayPrice: "₩1,500" }) === "1,500원" && !prices.productOnSale("gems-450") && prices.productOnSale("char-dawn"));
  history = { k0: { hasNext: false, orders: [{ orderId: "T-5", sku: "remove-ads", status: "REFUNDED" }, { orderId: "T-3", sku: "char-dawn", status: "COMPLETED" }] } };
  const r = await reconcile.reconcileStore(H);
  p = await P();
  ok("토스 회수: 환불된 광고 제거를 거둔다", r.revoked === 1 && p.adFree === false && p.claimedRewards.includes("revoked:remove-ads:T-5"), JSON.stringify(r));
  history = { k0: { hasNext: false, orders: [{ orderId: "T-5", sku: "remove-ads", status: "COMPLETED" }] } };
  await reconcile.reconcileStore(H);
  ok("토스 회수: 회수한 주문은 나중에 다시 와도 지급하지 않는다", (await P()).adFree === false);
  history = { k0: { hasNext: true, nextKey: "k9", orders: [{ orderId: "T-3", sku: "char-dawn", status: "REFUNDED" }] }, k9: undefined };
  await reconcile.reconcileStore(H);
  ok("토스 회수: 페이지 하나라도 실패하면(불완전) 아무것도 거두지 않는다", (await P()).ownedCharacters.includes("dawn"));
  globalThis.__toss.IAP.getCompletedOrRefundedOrders = async () => undefined;   // 토스 앱 구버전
  globalThis.__toss.IAP.getPendingOrders = async () => undefined;
  const rOld = await reconcile.reconcileStore(H);
  ok("토스 구버전(조회가 undefined): 아무것도 하지 않는다", rOld.granted === 0 && rOld.revoked === 0 && (await P()).ownedCharacters.includes("dawn"));
}

// ── 토스: Storage 쓰기가 응답이 없어 localStorage 로 떨어지면 지급을 완료로 알리지 않는다 ──
{
  fresh(); env.setPaymentEnvironment("toss");
  const tossMap = new Map();
  globalThis.__toss.Storage = { getItem: async (k) => (tossMap.has(k) ? tossMap.get(k) : null), setItem: () => new Promise(() => undefined) };
  let callbackResult = null;
  globalThis.__toss.IAP.createOneTimePurchaseOrder = ({ options, onEvent }) => {
    setTimeout(async () => { callbackResult = await options.processProductGrant({ orderId: "T-9" }); onEvent({ type: "success", data: { orderId: "T-9" } }); }, 0);
    return () => undefined;
  };
  const r = await store.buyWithStore(H, "gems-80");
  ok("토스: 지급이 토스 Storage 에 남지 않았으면 콜백 false · 결과 대기(복구가 다시 지급)", callbackResult === false && r.status === "pending", `${callbackResult} · ${r.status}`);
  globalThis.__toss.Storage = undefined;
}

// ── 안드로이드: 결제 준비 전에는 "불러오는 중", 준비되면 상점이 다시 그려지고 보인다 (가격 목록을 못 받아도) ──
{
  fresh(); env.setPaymentEnvironment("android");
  const before = { visible: store.paidStoreVisible(), note: store.paidStoreNote() };
  let redraws = 0;
  const off = prices.onStorePricesChanged(() => { redraws += 1; });
  store.setBillingReady(true);
  off();
  ok("안드로이드: 준비 전 숨김 · '불러오는 중' 문구 (웹 문구가 아님)", before.visible === false && /불러오는 중/.test(before.note), JSON.stringify(before));
  ok("안드로이드: 결제가 준비되면 상점을 다시 그리고 유료 상품이 보인다", redraws === 1 && store.paidStoreVisible() === true, `다시 그림 ${redraws}`);
}

// ── 안드로이드: 실시간 결제 ──
{
  fresh(); env.setPaymentEnvironment("android"); store.setBillingReady(true);
  const calls = [];
  globalThis.__play = {
    purchaseProduct: async (o) => { calls.push(`buy:${o.productIdentifier}:ack=${o.autoAcknowledgePurchases}:consumable=${o.isConsumable}`); return { transactionId: "GPA.1", productIdentifier: o.productIdentifier, purchaseToken: "tok1", purchaseState: "1" }; },
    consumePurchase: async (o) => { calls.push(`consume:${o.purchaseToken}:saved=${await has("purchase:gems-80:GPA.1")}`); },
    acknowledgePurchase: async (o) => { calls.push(`ack:${o.purchaseToken}`); },
  };
  const r = await store.buyWithStore(H, "gems-80");
  ok("플레이: 자동 승인·자동 소비를 끄고 산다", calls[0] === "buy:gems-80:ack=false:consumable=false", calls[0]);
  ok("플레이: 소모성은 지급이 저장된 뒤에 소비한다", r.status === "granted" && calls[1] === "consume:tok1:saved=true" && !calls.some((c) => c.startsWith("ack:")), calls.join(" → "));
  calls.length = 0;
  globalThis.__play.purchaseProduct = async (o) => { calls.push("buy"); return { transactionId: "GPA.7", productIdentifier: o.productIdentifier, purchaseToken: "tok7", purchaseState: "1", isAcknowledged: false }; };
  await store.buyWithStore(H, "char-ember");
  ok("플레이: 영구 상품은 소비하지 않고 승인한다", calls.join() === "buy,ack:tok7" && (await P()).ownedCharacters.includes("ember"), calls.join());
  calls.length = 0; storageThrows = true;
  globalThis.__play.purchaseProduct = async (o) => ({ transactionId: "GPA.8", productIdentifier: o.productIdentifier, purchaseToken: "tok8", purchaseState: "1" });
  const rFail = await store.buyWithStore(H, "gems-450");
  storageThrows = false;
  ok("플레이: 저장이 실패하면 소비·승인하지 않는다(복구가 다시 지급, 아니면 3일 뒤 자동 환불)", rFail.status === "pending" && calls.length === 0, `${rFail.status} · ${calls.join()}`);
}

// ── 안드로이드: 지급 전에 죽은 구매 복구 · 대기 결제 · 환불 회수 ──
{
  fresh(); env.setPaymentEnvironment("android");
  const consumed = [];
  let owned = [{ transactionId: "GPA.2", productIdentifier: "gems-450", purchaseToken: "tok2", purchaseState: "1" }, { transactionId: "GPA.3", productIdentifier: "gems-80", purchaseToken: "tok3", purchaseState: "2" }];
  globalThis.__play = {
    getPurchases: async () => ({ purchases: owned }),
    getProducts: async () => ({ products: [{ identifier: "gems-450", priceString: "₩7,500" }] }),
    consumePurchase: async (o) => { consumed.push(o.purchaseToken); },
    acknowledgePurchase: async () => undefined,
  };
  const r1 = await reconcile.reconcileStore(H);
  const gems1 = (await P()).redGems;
  ok("플레이 복구: 결제 완료된 구매를 한 번 지급하고 소비한다", r1.granted === 1 && gems1 > 0 && consumed.join() === "tok2", `${JSON.stringify(r1)} · 소비 ${consumed}`);
  ok("플레이 복구: 대기 중 결제(purchaseState 2)는 지급하지 않는다", !(await has("purchase:gems-80:GPA.3")));
  const r2 = await reconcile.reconcileStore(H);
  ok("플레이 복구: 소비가 실패해 같은 구매가 또 와도 두 번 지급하지 않는다", r2.granted === 0 && (await P()).redGems === gems1, JSON.stringify(r2));
  // 회수
  await prog.updateCharacterProgress(H, (c) => ({ ...c, adFree: true, ownedCharacters: [...c.ownedCharacters, "obsidian"], claimedRewards: [...c.claimedRewards, "purchase:remove-ads:GPA.9", "purchase:char-obsidian:qa-123"] }));
  owned = [{ transactionId: "GPA.9", productIdentifier: "remove-ads", purchaseToken: "tok9", purchaseState: "1", isAcknowledged: true }];
  await reconcile.reconcileStore(H);
  ok("플레이 회수: 소유 목록에 있으면 그대로", (await P()).adFree === true);
  globalThis.__play.getPurchases = async () => { throw new Error("network"); };
  await reconcile.reconcileStore(H);
  ok("플레이 회수: 조회가 실패하면 아무것도 거두지 않는다", (await P()).adFree === true);
  owned = [];
  globalThis.__play.getPurchases = async () => ({ purchases: owned });
  const r3 = await reconcile.reconcileStore(H);
  const p3 = await P();
  ok("플레이 회수: 성공한 조회에서 사라진 영구 상품(환불)을 거두고, QA 지급은 건드리지 않는다", r3.revoked === 1 && p3.adFree === false && p3.ownedCharacters.includes("obsidian"), JSON.stringify(r3));
}

console.log(failed ? `${failed} FAIL` : "ALL PASS");
process.exit(failed ? 1 : 0);
