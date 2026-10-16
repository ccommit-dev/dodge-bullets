import type { ShoulderId } from "../progression/model";
import type { CSSProperties } from "react";
import { SHOULDER_DEFINITIONS } from "../equipment/shoulders";
import { assetUrl } from "../asset";

/** 장비 파츠(투구·갑옷·장갑·신발·활·지팡이)와 같은 화풍의 종류별 그림 (2026-10-16, 사용자: "무기란 견갑이 다른 아이콘 대비 통일성이 없네").
 * art-gen/batch-shoulder.sh → scripts/place-gear.mjs shoulder. 예전 shoulder-tier-sheet 는 주인공 몸에 입히는 그림(EquippedCharacter)과 공유 카드에만 남는다 */
export function shoulderIconUrl(id: ShoulderId): string { return assetUrl(`titans/gear/shoulder-${id}.png`); }

export function ShoulderIcon({ id, equipped=false }: { id:ShoulderId|null; equipped?:boolean }) {
  const meta=id ? SHOULDER_DEFINITIONS[id] : null;
  return <span className={`shoulder-icon grade-${meta?.grade ?? "empty"}`} style={{"--shoulder-color":meta?.color ?? "#475569"} as CSSProperties} aria-label={meta?.name ?? "견갑 미장착"}>
    {id ? <img className="shoulder-icon-part" src={shoulderIconUrl(id)} alt="" aria-hidden="true" /> : <i className="shoulder-icon-part" />}{equipped&&<b>장착</b>}
  </span>;
}
