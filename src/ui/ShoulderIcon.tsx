import type { ShoulderId } from "../progression/model";
import type { CSSProperties } from "react";
import { SHOULDER_DEFINITIONS } from "../equipment/shoulders";

export function ShoulderIcon({ id, equipped=false }: { id:ShoulderId|null; equipped?:boolean }) {
  const meta=id ? SHOULDER_DEFINITIONS[id] : null;
  return <span className={`shoulder-icon grade-${meta?.grade ?? "empty"}`} style={{"--shoulder-color":meta?.color ?? "#475569"} as CSSProperties} aria-label={meta?.name ?? "견갑 미장착"}>
    <svg viewBox="0 0 48 48" role="img"><path d="M7 33c1-13 8-22 19-23 8 0 13 4 16 10-10-3-18 3-20 16-5-5-10-5-15-3z" fill="var(--shoulder-color)" stroke="#e2e8f0" strokeWidth="2"/><path d="m14 27 10-10 10 4-9 5-5 9z" fill="rgba(255,255,255,.25)"/></svg>{equipped&&<b>장착</b>}
  </span>;
}
