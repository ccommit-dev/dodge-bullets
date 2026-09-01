import type { ShoulderId } from "../progression/model";
import type { CSSProperties } from "react";
import { SHOULDER_DEFINITIONS } from "../equipment/shoulders";
import { assetUrl } from "../asset";

const INDEX: Record<ShoulderId, number> = { scout:0, shadow:1, ogre:2, dragon:3 };

export function ShoulderIcon({ id, equipped=false }: { id:ShoulderId|null; equipped?:boolean }) {
  const meta=id ? SHOULDER_DEFINITIONS[id] : null;
  const partStyle = id ? { backgroundImage:`url(${assetUrl("titans/equipment/shoulders/shoulder-tier-sheet.png")})`, backgroundPosition:`${INDEX[id] / 3 * 100}% center` } : {};
  return <span className={`shoulder-icon grade-${meta?.grade ?? "empty"}`} style={{"--shoulder-color":meta?.color ?? "#475569"} as CSSProperties} aria-label={meta?.name ?? "견갑 미장착"}>
    <i className="shoulder-icon-part" style={partStyle}/>{equipped&&<b>장착</b>}
  </span>;
}
