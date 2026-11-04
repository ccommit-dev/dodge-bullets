import "./filterChips.css";

/** 작은 필터 단추 줄 (2026-11-04, 사용자: "카테고리 그룹처럼 짓지말고 내용들을 나열 · 필터 버튼을 작게") — 묶음 제목 대신 쓴다 */
export function FilterChips<T extends string>({ items, value, onChange, label, className = "" }: { items: readonly (readonly [T, string])[]; value: T; onChange: (v: T) => void; label: string; className?: string }) {
  return (
    <nav className={`filter-chips ${className}`} aria-label={label}>
      {items.map(([id, text]) => <button key={id} type="button" className={value === id ? "on" : ""} aria-pressed={value === id} onClick={() => onChange(id)}>{text}</button>)}
    </nav>
  );
}
