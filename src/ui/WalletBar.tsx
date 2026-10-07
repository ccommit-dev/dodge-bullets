import { assetUrl } from "../asset";
import { CurrencyIcon } from "./CurrencyIcon";

/**
 * 지갑 줄 (2026-10-06, 사용자: "재화가 눈에 잘 안띔 -> 특히 빨간보석 보유량이 안보임").
 * 돈을 쓰는 화면(원정 정비 · 비트 수련 · 대장간 · 상점 시트)마다 같은 모양으로 맨 위에 둔다.
 * 붉은 보석은 항상 붉은 숫자로 — 예전엔 사냥터 머리 오른쪽 작은 칩 하나뿐이었고, 테스트 빌드에서는 숫자 대신 ∞ 였다.
 */
export type WalletKind = "gold" | "gem" | "stone" | "seal" | "fame" | "ticket";

export type WalletItem = { kind: WalletKind; amount: number; label?: string };

const ICON: Partial<Record<WalletKind, string>> = {
  stone: "ui/attendance/enhance-stone.png",
  seal: "ui/attendance/expedition-seal.png",
  ticket: "ui/idle/tower.png",
  fame: "ui/idle/star.png",
};
const LABEL: Record<WalletKind, string> = { gold: "골드", gem: "붉은 보석", stone: "강화석", seal: "인장", fame: "명성", ticket: "등반권" };

export function formatWallet(n: number): string {
  const v = Math.max(0, Math.floor(n));
  if (v >= 1e9) return `${(v / 1e9).toFixed(v >= 1e10 ? 0 : 1)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(v >= 1e7 ? 0 : 1)}M`;
  if (v >= 1e4) return `${(v / 1e3).toFixed(v >= 1e5 ? 0 : 1)}K`;
  return v.toLocaleString();
}

export function WalletBar({ items, onGemTap, testGems = false, className = "" }: { items: WalletItem[]; onGemTap?: () => void; testGems?: boolean; className?: string }) {
  return (
    <div className={`wallet-bar ${className}`} role="group" aria-label="보유 재화">
      {items.map((it) => {
        const body = (
          <>
            {it.kind === "gold" || it.kind === "gem" ? <CurrencyIcon kind={it.kind} /> : <img src={assetUrl(ICON[it.kind] ?? "")} alt="" aria-hidden="true" />}
            <span className="wallet-text">
              <small>{it.label ?? LABEL[it.kind]}</small>
              <strong data-wallet={it.kind}>{formatWallet(it.amount)}{it.kind === "gem" && testGems && <em className="wallet-test">TEST</em>}</strong>
            </span>
          </>
        );
        return it.kind === "gem" && onGemTap ? (
          <button key={it.kind} type="button" className={`wallet-item wallet-${it.kind}`} onClick={onGemTap} aria-label={`붉은 보석 ${it.amount.toLocaleString()}개 · 보석 상점 열기`}>
            {body}<i className="wallet-plus" aria-hidden="true">+</i>
          </button>
        ) : (
          <span key={it.kind} className={`wallet-item wallet-${it.kind}`} aria-label={`${it.label ?? LABEL[it.kind]} ${it.amount.toLocaleString()}`}>{body}</span>
        );
      })}
    </div>
  );
}
