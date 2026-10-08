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
  `export * as fund from "${root}/src/economy/gateFund";`,
  `export * as moments from "${root}/src/economy/momentOffers";`,
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

const { store, reconcile, env, prices, prog, catalog, fund, moments } = await import(pathToFileURL(out).href);
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
  ok("영구 상품 = 광고 제거 + 캐릭터 4종 + 성문 원정 기금, 시즌 패스·성문 수비 보급은 소모성", JSON.stringify([...store.PERMANENT_PRODUCT_IDS].sort()) === JSON.stringify(["char-dawn", "char-ember", "char-frost", "char-obsidian", "gate-fund", "remove-ads"]) && store.isConsumableProduct("gate-supply") && store.isConsumableProduct("season-pass"), [...store.PERMANENT_PRODUCT_IDS].join(","));
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
    purchaseProduct: async (o) => { calls.push(`buy:${o.productIdentifier}:ack=${o.autoAcknowledgePurchases}:consumable=${o.isConsumable}`); return { transactionId: "tok1", orderId: "GPA.1", productIdentifier: o.productIdentifier, purchaseToken: "tok1", purchaseState: "1" }; },
    consumePurchase: async (o) => { calls.push(`consume:${o.purchaseToken}:saved=${await has("purchase:gems-80:play:tok1")}`); },
    acknowledgePurchase: async (o) => { calls.push(`ack:${o.purchaseToken}`); },
  };
  const r = await store.buyWithStore(H, "gems-80");
  ok("플레이: 자동 승인·자동 소비를 끄고 산다", calls[0] === "buy:gems-80:ack=false:consumable=false", calls[0]);
  ok("플레이: 소모성은 지급이 저장된 뒤에 소비한다", r.status === "granted" && calls[1] === "consume:tok1:saved=true" && !calls.some((c) => c.startsWith("ack:")), calls.join(" → "));
  calls.length = 0;
  globalThis.__play.purchaseProduct = async (o) => { calls.push("buy"); return { transactionId: "tok7", orderId: "GPA.7", productIdentifier: o.productIdentifier, purchaseToken: "tok7", purchaseState: "1", isAcknowledged: false }; };
  await store.buyWithStore(H, "char-ember");
  ok("플레이: 영구 상품은 소비하지 않고 승인한다", calls.join() === "buy,ack:tok7" && (await P()).ownedCharacters.includes("ember"), calls.join());
  calls.length = 0; storageThrows = true;
  globalThis.__play.purchaseProduct = async (o) => ({ transactionId: "tok8", orderId: "GPA.8", productIdentifier: o.productIdentifier, purchaseToken: "tok8", purchaseState: "1" });
  const rFail = await store.buyWithStore(H, "gems-450");
  storageThrows = false;
  ok("플레이: 저장이 실패하면 소비·승인하지 않는다(복구가 다시 지급, 아니면 3일 뒤 자동 환불)", rFail.status === "pending" && calls.length === 0, `${rFail.status} · ${calls.join()}`);
}

// ── 안드로이드: 지급 전에 죽은 구매 복구 · 대기 결제 · 환불 회수 ──
{
  fresh(); env.setPaymentEnvironment("android");
  const consumed = [];
  let owned = [{ transactionId: "tok2", orderId: "GPA.2", productIdentifier: "gems-450", purchaseToken: "tok2", purchaseState: "1" }, { transactionId: "tok3", orderId: "GPA.3", productIdentifier: "gems-80", purchaseToken: "tok3", purchaseState: "2" }];
  globalThis.__play = {
    getPurchases: async () => ({ purchases: owned }),
    getProducts: async () => ({ products: [{ identifier: "gems-450", priceString: "₩7,500" }] }),
    consumePurchase: async (o) => { consumed.push(o.purchaseToken); },
    acknowledgePurchase: async () => undefined,
  };
  const r1 = await reconcile.reconcileStore(H);
  const gems1 = (await P()).redGems;
  ok("플레이 복구: 결제 완료된 구매를 한 번 지급하고 소비한다", r1.granted === 1 && gems1 > 0 && consumed.join() === "tok2", `${JSON.stringify(r1)} · 소비 ${consumed}`);
  ok("플레이 복구: 대기 중 결제(purchaseState 2)는 지급하지 않는다", !(await has("purchase:gems-80:play:tok3")));
  const r2 = await reconcile.reconcileStore(H);
  ok("플레이 복구: 소비가 실패해 같은 구매가 또 와도 두 번 지급하지 않는다", r2.granted === 0 && (await P()).redGems === gems1, JSON.stringify(r2));
  // 회수
  await prog.updateCharacterProgress(H, (c) => ({ ...c, adFree: true, ownedCharacters: [...c.ownedCharacters, "obsidian"], claimedRewards: [...c.claimedRewards, "purchase:remove-ads:play:tok9", "purchase:char-obsidian:qa-123"] }));
  owned = [{ transactionId: "tok9", orderId: "GPA.9", productIdentifier: "remove-ads", purchaseToken: "tok9", purchaseState: "1", isAcknowledged: true }];
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

// ── 리뷰 반영 (2026-10-02) ──
{
  // #6 플레이 대기 결제: 플러그인이 거부로 돌려준다 → "대기"
  fresh(); env.setPaymentEnvironment("android"); store.setBillingReady(true);
  globalThis.__play = { purchaseProduct: async () => { throw new Error("Purchase is pending"); } };
  const r = await store.buyWithStore(H, "gems-80");
  ok("플레이: 대기 중 결제는 취소가 아니라 '결제 확인 중' (리뷰 #6)", r.status === "pending", r.status);
}
{
  // #5 결제된 트리거 팩 두 번째 주문도 지급, QA 지급만 1회
  fresh();
  const base = await P();
  const w1 = store.applyPurchase(base, "pack-wall", "play:a", 0);
  const w2 = store.applyPurchase(w1.progress, "pack-wall", "play:b", 0);
  const q1 = store.applyPurchase(base, "pack-wall", "qa-1", 0);
  const q2 = store.applyPurchase(q1.progress, "pack-wall", "qa-2", 0);
  ok("결제된 트리거 팩 재주문은 지급한다 — 돈을 냈는데 못 받는 일이 없게 (리뷰 #5)", w1.applied && w2.applied, `${w1.applied}/${w2.applied}`);
  ok("QA 테스트 지급은 트리거 팩 1회 규칙을 지킨다", q1.applied && !q2.applied);
}
{
  // #4 스킬 코어는 진행도의 pendingSkillCores 로 — 호출부가 사냥터 저장에 직접 더하지 않는다
  fresh();
  const r = store.applyPurchase(await P(), "pack-rebirth", "play:c", 0);
  ok("결제 코어는 pendingSkillCores 에 쌓인다 (사냥터가 준비되면 옮긴다, 리뷰 #4)", r.progress.pendingSkillCores === 10 && r.cores === 10, String(r.progress.pendingSkillCores));
}
{
  // #1 지급 확인 읽기가 응답이 없으면 durable=false (로컬 사본을 '있다'로 착각하지 않는다)
  fresh(); env.setPaymentEnvironment("toss");
  const tossMap = new Map();
  let hangReads = false;
  globalThis.__toss.Storage = {
    getItem: (k) => (hangReads ? new Promise(() => undefined) : Promise.resolve(tossMap.has(k) ? tossMap.get(k) : null)),
    setItem: async (k, v) => { tossMap.set(k, v); },
  };
  await P();   // 진행도 레코드를 토스 쪽에 만든다
  let callback = null;
  globalThis.__toss.IAP.createOneTimePurchaseOrder = ({ options, onEvent }) => {
    setTimeout(async () => {
      // 지급 쓰기는 됐다고 치고, 그 뒤 확인 읽기부터 응답이 없다
      const origSet = globalThis.__toss.Storage.setItem;
      globalThis.__toss.Storage.setItem = async (k, v) => { await origSet(k, v); hangReads = true; };
      callback = await options.processProductGrant({ orderId: "T-H1" });
      onEvent({ type: "success", data: { orderId: "T-H1" } });
    }, 0);
    return () => undefined;
  };
  const r = await store.buyWithStore(H, "gems-80");
  ok("토스: 확인 읽기가 응답이 없으면 완료로 알리지 않는다 (리뷰 #1)", callback === false && r.status === "pending", `${callback} · ${r.status}`);
  // #2 읽기가 응답이 없으면 갱신을 멈춘다 — "새 유저"로 착각해 빈 진행도로 덮어쓰지 않는다
  const before = tossMap.get("dodgebullets:progression:v1:" + H);
  let threw = false;
  await prog.updateCharacterProgress(H, (c) => ({ ...c, redGems: c.redGems + 1 })).catch(() => { threw = true; });
  ok("토스: 진행도 읽기가 응답이 없으면 갱신을 멈추고 저장본을 건드리지 않는다 (리뷰 #2)", threw && tossMap.get("dodgebullets:progression:v1:" + H) === before);
  globalThis.__toss.Storage = undefined;
}
{
  // 복귀 정산이 실시간 결제보다 먼저 지급해도, 이번 결제는 "구매 완료"
  fresh(); env.setPaymentEnvironment("toss");
  globalThis.__toss.IAP.createOneTimePurchaseOrder = ({ options, onEvent }) => {
    setTimeout(async () => {
      ok("결제 시트가 떠 있는 동안 purchaseInFlight = true", store.purchaseInFlight() === true);
      await store.grantDurably(H, "gems-450", "T-RACE");   // 복귀 정산이 먼저 지급했다고 치자
      const ok2 = await options.processProductGrant({ orderId: "T-RACE" });
      onEvent({ type: "success", data: { orderId: "T-RACE" } });
      void ok2;
    }, 0);
    return () => undefined;
  };
  const r = await store.buyWithStore(H, "gems-450");
  ok("실시간 결제: 복귀 정산이 먼저 지급했어도 '구매 완료'로 보인다 (이미 지급 X)", r.status === "granted" && !store.purchaseInFlight(), r.status);
}

// ── 성문 방어 결제 (2026-10-02) ──
{
  fresh();
  const p0 = await P();
  ok("성문 수비 보급은 카탈로그·스토어 목록에서 뺐다 (2026-10-08 BM 간결화)", !catalog.STORE_PRODUCTS.some((p) => p.id === "gate-supply") && !store.PLAY_PRODUCT_IDS.includes("gate-supply") && store.purchaseGrant("gate-supply") === null);
  // 기금: 산 뒤 이미 깬 단계는 바로 받고, 못 깬 단계는 못 받는다 · 두 번 받지 못한다
  const withStars = { ...p0, dodgeStars: { "0": 3, "1": 2, "2": 1 } };
  ok("기금: 사기 전에는 받을 수 없다", fund.claimGateFundTier(withStars, "s1").gems === 0);
  ok("기금: 사기 전 화면의 '바로 받는 몫' = 깬 단계 합 (100+150+250+별 6개 300)", fund.gateFundReadyGems(withStars) === 800, String(fund.gateFundReadyGems(withStars)));
  const bought = store.applyPurchase(withStars, "gate-fund", "play:f1", 0).progress;
  const c1 = fund.claimGateFundTier(bought, "s3");
  const c2 = fund.claimGateFundTier(c1.progress, "s3");
  const c3 = fund.claimGateFundTier(c1.progress, "s4");
  ok("기금: 깬 단계 수령 · 중복 수령 없음 · 못 깬 단계 불가", bought.gateFund.paid && c1.gems === 250 && c2.gems === 0 && c3.gems === 0);
  ok("기금 합계 1,700 · 같은 금액 보석팩(80개, ₩1,500) 대비 ×3.2", fund.GATE_FUND_TOTAL_GEMS === 1700 && Math.abs(fund.gemValueRatio(1700, "₩9,900", "₩1,500", 80) - 3.22) < 0.01, String(fund.gemValueRatio(1700, "₩9,900", "₩1,500", 80)));
  ok("보석팩 보너스 %: 450 개 +12% · 1,200 개 +50% · 통화가 다르면 계산 안 함", fund.gemPackBonusPercent(450, "₩7,500", "₩1,500", 80) === 12 && fund.gemPackBonusPercent(1200, "₩15,000", "₩1,500", 80) === 50 && fund.gemPackBonusPercent(1200, "$12.99", "₩1,500", 80) === null);
  // 환불: 남은 단계만 거둔다
  const refunded = store.revokePurchase(c1.progress, "gate-fund", "play:f1").progress;
  ok("기금 환불: 기금을 거두되 이미 받은 보석은 그대로", refunded.gateFund.paid === false && refunded.redGems === c1.progress.redGems && refunded.gateFund.claimed.includes("s3"));
}
{
  // 토스: 재설치 때 기금 복원(영구) · 환불된 소모성은 그 주문의 보석만 거둔다 · 장부 없는 옛 지급은 건드리지 않는다
  fresh(); env.setPaymentEnvironment("toss");
  await prog.updateCharacterProgress(H, (c) => store.applyPurchase(c, "gems-450", "T-L1", 0).progress);   // 첫 구매 2배 → 900
  await prog.updateCharacterProgress(H, (c) => ({ ...c, redGems: c.redGems + 50, claimedRewards: [...c.claimedRewards, "purchase:gems-80:T-OLD"] }));   // 장부 없는 옛 지급
  const before = (await P()).redGems;
  Object.assign(globalThis.__toss.IAP, {
    getPendingOrders: async () => ({ orders: [] }),
    completeProductGrant: async () => true,
    getProductItemList: async () => undefined,
    getCompletedOrRefundedOrders: async () => ({ hasNext: false, orders: [
      { orderId: "T-L1", sku: "gems-450", status: "REFUNDED" },
      { orderId: "T-OLD", sku: "gems-80", status: "REFUNDED" },
      { orderId: "T-F1", sku: "gate-fund", status: "COMPLETED" },
    ] }),
  });
  const r = await reconcile.reconcileStore(H);
  const after = await P();
  ok("토스 소모성 환불: 그 주문이 준 보석(첫 구매 2배 포함 900)만 거둔다", after.redGems === before - 900 && after.claimedRewards.includes("revoked:gems-450:T-L1"), `${before} → ${after.redGems}`);
  ok("토스 소모성 환불: 장부 없는 옛 지급은 거두지 않는다", !after.claimedRewards.includes("revoked:gems-80:T-OLD"));
  ok("토스: 재설치 때 성문 원정 기금(영구)을 되살린다", after.gateFund.paid === true && r.granted === 1, JSON.stringify(r));
  await reconcile.reconcileStore(H);
  ok("토스 소모성 환불: 다시 돌려도 두 번 거두지 않는다", (await P()).redGems === after.redGems);
}
{
  // 송사리 모델 (2026-10-08): 오늘의 보급·주말 보급 — 결제된 주문은 한도와 무관하게 지급하고, 한도 키(deal:)는 하루/주에 하나만
  fresh();
  const p0 = await P();
  const sat = Date.UTC(2026, 9, 10, 3);
  const a = store.applyPurchase(p0, "daily-deal", "play:dd1", sat);
  const b = store.applyPurchase(a.progress, "daily-deal", "play:dd2", sat + 1000);
  const dealKeys = b.progress.claimedRewards.filter((k) => k.startsWith("deal:daily-deal:"));
  ok("오늘의 보급 결제 2건: 둘 다 지급(보석 80·골드 6,000) · deal 키는 하루 1개", a.applied && b.applied && b.progress.redGems === p0.redGems + 80 && b.progress.sharedCoins === p0.sharedCoins + 6000 && dealKeys.length === 1, dealKeys.join(","));
  const w = store.applyPurchase(p0, "weekend-pack", "play:wk1", sat);
  ok("주말 보급 결제: 보석 300 · 강화석 60 · 가속 24h · 환불 장부(ledger) 기록", w.applied && w.progress.redGems === p0.redGems + 300 && w.progress.enhancementMaterials === p0.enhancementMaterials + 60 && w.progress.idleBoostUntil === sat + 24 * 3600000 && w.progress.claimedRewards.includes("ledger:weekend-pack:play:wk1:300"));
  ok("카탈로그 묶음: 매일·주말 묶음이 첫 번째 · 중급/고급 모험가·개척 축하·성문 수비 보급 없음", catalog.PAID_GROUPS[0].ids.join(",") === "daily-deal,weekend-pack" && ["adventurer-mid", "adventurer-advanced", "pack-pioneer", "gate-supply"].every((id) => !store.PLAY_PRODUCT_IDS.includes(id)));
}

console.log(failed ? `${failed} FAIL` : "ALL PASS");
process.exit(failed ? 1 : 0);
