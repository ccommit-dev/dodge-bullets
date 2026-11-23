import { assetUrl } from "../asset";
import { CurrencyIcon } from "./CurrencyIcon";

/**
 * 상점 패키지 그림 (2026-11-23, 사용자: "리소스 관점에서 그외에 아쉬운 부분 전부") — 패키지 칸이 금화 · 보석 두 그림만 돌려 써서
 * 무엇을 사는지 그림으로 안 보였다. 상품마다 물건 하나(public/ui/shop/<상품 id>.png, scripts/assemble-shop-icons.mjs).
 * 그림이 없는 새 상품은 예전처럼 보석 · 금화.
 */
const SHOP_ART = new Set([
  "gems-80", "gems-450", "gems-1200", "daily-deal", "weekend-pack", "adventurer-starter", "remove-ads", "patron-30d",
  "pack-wall", "pack-rebirth", "dodge-x3", "gate-fund", "char-obsidian", "char-dawn", "char-ember", "char-frost",
]);

export function productIconPath(id: string): string | null {
  return SHOP_ART.has(id) ? `ui/shop/${id}.png` : null;
}

export function ProductIcon({ id }: { id: string }) {
  const path = productIconPath(id);
  if (!path) return <CurrencyIcon kind={id.startsWith("gems") ? "gem" : "gold"} />;
  return <img className="currency-icon product-icon" src={assetUrl(path)} alt="" aria-hidden="true" data-product-icon={id} />;
}
