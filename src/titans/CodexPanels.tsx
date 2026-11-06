/**
 * 마이페이지 도감의 동료 · 유물 쪽 (2026-11-03, 사용자: "도감은 마이페이지 도감으로 전체다 일원화 · 소유 미소유를 분리").
 * 그림이 큰 시트라 동료는 12장씩 쪽으로 나눠 한 번에 다 불러오지 않는다.
 */
import { useState } from "react";
import { ALLY_RARITY, ROLE_LABEL, ALLY_ROLE, RARITY_LABEL } from "./allies";
import { HEROES } from "./model";
import { RELICS, RELIC_MAX_STAR, relicStars, relicStatText, type RelicState } from "./relics";
import { RelicIcon } from "./RelicIcon";
import { AllyArt } from "./SpriteArt";
import { TIER_LABEL } from "./summonLevel";

export type OwnFilter = "all" | "own" | "none";
export const OWN_FILTERS: readonly (readonly [OwnFilter, string])[] = [["all", "전체"], ["own", "보유"], ["none", "미보유"]];
const pass = (f: OwnFilter, owned: boolean) => f === "all" || (f === "own") === owned;
const ALLY_PAGE = 12;

export function AllyCodex({ heroes, filter }: { heroes: Record<string, number>; filter: OwnFilter }) {
  const [page, setPage] = useState(0);
  const list = HEROES.filter((h) => pass(filter, (heroes[h.id] ?? 0) > 0));
  const pages = Math.max(1, Math.ceil(list.length / ALLY_PAGE));
  const pg = Math.min(page, pages - 1);
  const ownedCount = HEROES.filter((h) => (heroes[h.id] ?? 0) > 0).length;
  return (
    <>
      <div className="legacy-heading"><div><small>ALLIES</small><strong>동료 도감</strong></div><span>보유 {ownedCount}/{HEROES.length}</span></div>
      <div className="codex-card-grid" data-count={list.length}>
        {list.slice(pg * ALLY_PAGE, (pg + 1) * ALLY_PAGE).map((h) => {
          const owned = (heroes[h.id] ?? 0) > 0;
          return (
            <div key={h.id} className={`codex-card rarity-${ALLY_RARITY[h.id].toLowerCase()} ${owned ? "owned" : "unowned"}`} data-ally={h.id}>
              <span className="codex-card-art"><AllyArt id={h.id} /></span>
              <b>{h.name}</b>
              <small>{RARITY_LABEL[ALLY_RARITY[h.id]]} · {ROLE_LABEL[ALLY_ROLE[h.id]]}{owned ? ` · Lv.${heroes[h.id]}` : ""}</small>
            </div>
          );
        })}
      </div>
      {list.length === 0 && <p className="codex-empty">{filter === "own" ? "아직 보유한 동료가 없어요" : "모든 동료를 보유했어요"}</p>}
      {pages > 1 && (
        <nav className="ally-pages codex-pager" aria-label="도감 쪽">
          <button type="button" className="codex-page-prev" disabled={pg === 0} aria-label="이전 쪽" onClick={() => setPage(pg - 1)}>‹</button>
          <span>{pg + 1} <small>/ {pages}</small></span>
          <button type="button" className="codex-page-next" disabled={pg >= pages - 1} aria-label="다음 쪽" onClick={() => setPage(pg + 1)}>›</button>
        </nav>
      )}
    </>
  );
}

export function RelicCodex({ relics, filter }: { relics: RelicState; filter: OwnFilter }) {
  const ownedCount = RELICS.filter((r) => relicStars(relics, r.id) >= 1).length;
  const list = RELICS.filter((r) => pass(filter, relicStars(relics, r.id) >= 1));
  return (
    <>
      <div className="legacy-heading"><div><small>RELICS</small><strong>유물 도감</strong></div><span>보유 {ownedCount}/{RELICS.length}</span></div>
      <div className="codex-card-grid relic-codex" data-count={list.length}>
        {list.map((r) => {
          const stars = relicStars(relics, r.id);
          return (
            <div key={r.id} className={`codex-card rarity-${r.tier.toLowerCase()} ${stars >= 1 ? "owned" : "unowned"}`} data-relic={r.id}>
              <span className="codex-card-art"><RelicIcon id={r.id} lazy /></span>
              <b>{r.name}</b>
              <small>{TIER_LABEL[r.tier]}{stars >= 1 ? ` · ★${stars}/${RELIC_MAX_STAR}` : ""}</small>
              <small className="codex-card-stat">{relicStatText(r, Math.max(1, stars))}</small>
            </div>
          );
        })}
      </div>
      {list.length === 0 && <p className="codex-empty">{filter === "own" ? "아직 보유한 유물이 없어요" : "모든 유물을 보유했어요"}</p>}
    </>
  );
}
