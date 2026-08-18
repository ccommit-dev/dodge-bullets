export function CurrencyIcon({ kind, className = "" }: { kind: "gold" | "gem"; className?: string }) {
  return kind === "gold" ? (
    <svg className={`currency-icon ${className}`} viewBox="0 0 32 32" role="img" aria-label="골드"><ellipse cx="16" cy="17" rx="12" ry="10" fill="#f59e0b" stroke="#fde68a" strokeWidth="3"/><path d="M10 13c3-3 9-4 13-1" fill="none" stroke="#fff7c2" strokeWidth="2"/><path d="M16 10v14" stroke="#b45309" strokeWidth="2"/></svg>
  ) : (
    <svg className={`currency-icon ${className}`} viewBox="0 0 32 32" role="img" aria-label="붉은 보석"><path d="m16 3 11 9-5 15H10L5 12z" fill="#ef4444" stroke="#fecaca" strokeWidth="2"/><path d="m5 12 11 5 11-5M16 3v14m-6 10 6-10 6 10" fill="none" stroke="#991b1b" strokeWidth="1.5"/></svg>
  );
}
