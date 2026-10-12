/**
 * 스토어 등록 데이터 내보내기 (2026-10-12) — 카탈로그(src/economy/productCatalog.ts)와 PLAY_PRODUCT_IDS 에서
 *   store/play-in-app-products.csv   플레이 콘솔 › 수익 창출 › 인앱 상품 › "가져오기" 형식 (관리형 상품 일괄 등록)
 *   store/toss-in-app-products.json  앱인토스 콘솔 › 인앱결제 › 상품 등록에 그대로 옮겨 적을 값 (토스는 가져오기가 없다)
 * 콘솔 등록은 계정이 필요해 사람 몫이지만, 값을 손으로 옮기다 틀리는 일은 이 파일로 막는다.
 *   node scripts/export-store-products.mjs          파일을 쓴다
 *   node scripts/export-store-products.mjs --check  카탈로그와 다르면 1 로 끝난다 (verify-payments 가 부른다)
 */
import { build } from "esbuild";
import { mkdtempSync, writeFileSync, readFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd().replace(/\\/g, "/");
const dir = mkdtempSync(join(tmpdir(), "store-export-"));
const entry = join(dir, "entry.ts");
writeFileSync(entry, [`export * as catalog from "${root}/src/economy/productCatalog";`, `export * as store from "${root}/src/payments/store";`].join("\n"));
await build({ entryPoints: [entry], bundle: true, format: "esm", platform: "neutral", outfile: join(dir, "out.mjs"), define: { "import.meta.env.BASE_URL": '"/"', "import.meta.env.DEV": "false", "import.meta.env.VITE_QA_BUILD": '""' }, logLevel: "error" });
const { catalog, store } = await import(pathToFileURL(join(dir, "out.mjs")).href);
rmSync(dir, { recursive: true, force: true });

const won = (displayPrice) => Number(String(displayPrice).replace(/[^0-9]/g, ""));
const rows = store.PLAY_PRODUCT_IDS.map((id) => {
  const p = catalog.STORE_PRODUCTS.find((x) => x.id === id);
  if (!p) throw new Error(`카탈로그에 없는 상품: ${id}`);
  for (const s of [p.name, p.description]) if (/[;\n"]/.test(s)) throw new Error(`${id}: 이름·설명에 ; 줄바꿈 " 은 못 쓴다 (CSV 로케일 칸 구분자)`);
  return { id, name: p.name, description: p.description, won: won(p.displayPrice), permanent: store.isPermanentProduct(id) };
});

// 플레이 콘솔 CSV: Product ID,Published State,Purchase Type,Auto Translate,Locale; Title; Description,Auto Fill Prices,Price,Pricing Template ID
// 가격은 마이크로 단위(₩2,900 → 2900000000). 소모성·영구 구분은 콘솔 유형이 아니라 앱이 소비 호출로 정한다(둘 다 managed_by_android).
const csvField = (s) => (/[,"]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
const csv = ["Product ID,Published State,Purchase Type,Auto Translate,Locale; Title; Description,Auto Fill Prices,Price,Pricing Template ID",
  ...rows.map((r) => [r.id, "published", "managed_by_android", "false", csvField(`ko_KR; ${r.name}; ${r.description}`), "true", String(r.won * 1_000_000), ""].join(","))].join("\n") + "\n";
const toss = JSON.stringify({
  note: "앱인토스 콘솔 › 인앱결제 › 상품 등록에 옮겨 적는 값. SKU 는 코드 PLAY_PRODUCT_IDS 와 같아야 getProductItemList 에 뜬다. type: 영구 = 일회성(복원 가능), 소모성 = 소비 후 재구매.",
  products: rows.map((r) => ({ sku: r.id, type: r.permanent ? "영구(일회성)" : "소모성", name: r.name, description: r.description, price: r.won, currency: "KRW" })),
}, null, 2) + "\n";

const files = { "store/play-in-app-products.csv": csv, "store/toss-in-app-products.json": toss };
if (process.argv.includes("--check")) {
  const stale = Object.entries(files).filter(([f, body]) => !existsSync(f) || readFileSync(f, "utf8").replace(/\r\n/g, "\n") !== body);
  if (stale.length) { console.log("STALE " + stale.map(([f]) => f).join(", ") + " — node scripts/export-store-products.mjs"); process.exit(1); }
  console.log(`store export up to date (${rows.length} products)`);
} else {
  for (const [f, body] of Object.entries(files)) writeFileSync(f, body);
  console.log(`wrote ${Object.keys(files).join(", ")} (${rows.length} products)`);
}
