/**
 * 마이페이지 도감의 동료 · 유물 쪽 (2026-11-03, 사용자: "도감은 마이페이지 도감으로 전체다 일원화 · 소유 미소유를 분리").
 * 그림이 큰 시트라 동료는 12장씩 쪽으로 나눠 한 번에 다 불러오지 않는다.
 * 2026-11-18 (/goal "이런 느낌의 ui — 간단 명료"): 수집품 화면처럼 등급 묶음(높은 등급부터) · 묶음 머리 "(보유/전체)" ·
 *   등급색 정사각 판 · 없는 것은 회색 그림자 · 판 아래 진행 막대(유물 ★/5 · 동료 ★/상한). 바깥 .codex-card-grid 하나에 data-count = 보이는 전체 수(검사가 읽는다)
 */
import { useState } from "react";
import { ALLY_RARITY, ROLE_LABEL, ALLY_ROLE, STAR_CAP, type AllyRarity } from "./allies";
import { HEROES } from "./model";
import { RELICS, RELIC_MAX_STAR, relicStars, relicStatText, type RelicState } from "./relics";
import { RelicIcon } from "./RelicIcon";
import { AllyArt } from "./SpriteArt";
import type { Tier } from "./allyRoster";
import { TIERS, TIER_LABEL } from "./summonLevel";

export type OwnFilter = "all" | "own" | "none";
export const OWN_FILTERS: readonly (readonly [OwnFilter, string])[] = [["all", "전체"], ["own", "보유"], ["none", "미보유"]];
const pass = (f: OwnFilter, owned: boolean) => f === "all" || (f === "own") === owned;
const ALLY_PAGE = 12;
/** 높은 등급부터 — 참고 그림처럼 귀한 것이 위 */
const TIERS_DESC = [...TIERS].reverse() as Tier[];

function TierHead({ tier, owned, total }: { tier: Tier; owned: number; total: number }) {
  return (
    <h4 className="codex-tier-head">
      <em className="tier-chip">{TIER_LABEL[tier]}</em>
      <span>({owned}/{total})</span>
    </h4>
  );
}

function Bar({ value, max, label }: { value: number; max: number; label: string }) {
  return (
    <span className="codex-bar" aria-label={label}>
      <i style={{ width: `${max > 0 ? Math.min(1, value / max) * 100 : 0}%` }} />
      <small>{label}</small>
    </span>
  );
}

export function AllyCodex({ heroes, filter, stars }: { heroes: Record<string, number>; filter: OwnFilter; stars?: Record<string, number> }) {
  const [page, setPage] = useState(0);
  // 등급 높은 순으로 줄 세운 뒤 쪽을 나눈다 — 쪽 안에서 등급 묶음이 끊기지 않고 이어진다
  const list = HEROES.filter((h) => pass(filter, (heroes[h.id] ?? 0) > 0)).sort((a, b) => TIERS.indexOf(ALLY_RARITY[b.id]) - TIERS.indexOf(ALLY_RARITY[a.id]));
  const pages = Math.max(1, Math.ceil(list.length / ALLY_PAGE));
  const pg = Math.min(page, pages - 1);
  const ownedCount = HEROES.filter((h) => (heroes[h.id] ?? 0) > 0).length;
  const onPage = list.slice(pg * ALLY_PAGE, (pg + 1) * ALLY_PAGE);
  return (
    <>
      <div className="legacy-heading"><div><small>ALLIES</small><strong>동료 도감</strong></div><span>보유 {ownedCount}/{HEROES.length}</span></div>
      <div className="codex-card-grid codex-sections" data-count={list.length}>
        {TIERS_DESC.filter((t) => onPage.some((h) => ALLY_RARITY[h.id] === t)).map((t) => {
          const all = HEROES.filter((h) => ALLY_RARITY[h.id] === t);
          return (
            <section key={t} className={`codex-tier rarity-${t.toLowerCase()}`}>
              <TierHead tier={t} owned={all.filter((h) => (heroes[h.id] ?? 0) > 0).length} total={all.length} />
              <div className="codex-tier-grid">
                {onPage.filter((h) => ALLY_RARITY[h.id] === t).map((h) => {
                  const lv = heroes[h.id] ?? 0;
                  const owned = lv > 0;
                  const cap = STAR_CAP[ALLY_RARITY[h.id] as AllyRarity];
                  const st = owned ? Math.max(1, stars?.[h.id] ?? 1) : 0;
                  return (
                    <div key={h.id} className={`codex-card rarity-${ALLY_RARITY[h.id].toLowerCase()} ${owned ? "owned" : "unowned"}`} data-ally={h.id}>
                      <span className="codex-card-art"><AllyArt id={h.id} />{owned && <b className="codex-lv">Lv.{lv}</b>}</span>
                      <b>{h.name}</b>
                      <small className="codex-card-role">{ROLE_LABEL[ALLY_ROLE[h.id]]}</small>
                      <Bar value={st} max={cap} label={`★${st}/${cap}`} />
                    </div>
                  );
                })}
              </div>
            </section>
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
      <div className="codex-card-grid relic-codex codex-sections" data-count={list.length}>
        {TIERS_DESC.filter((t) => list.some((r) => r.tier === t)).map((t) => {
          const all = RELICS.filter((r) => r.tier === t);
          return (
            <section key={t} className={`codex-tier rarity-${t.toLowerCase()}`}>
              <TierHead tier={t} owned={all.filter((r) => relicStars(relics, r.id) >= 1).length} total={all.length} />
              <div className="codex-tier-grid">
                {list.filter((r) => r.tier === t).map((r) => {
                  const stars = relicStars(relics, r.id);
                  return (
                    <div key={r.id} className={`codex-card rarity-${r.tier.toLowerCase()} ${stars >= 1 ? "owned" : "unowned"}`} data-relic={r.id} title={relicStatText(r, Math.max(1, stars))}>
                      <span className="codex-card-art"><RelicIcon id={r.id} lazy /></span>
                      <b>{r.name}</b>
                      <Bar value={stars} max={RELIC_MAX_STAR} label={`★${stars}/${RELIC_MAX_STAR}`} />
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
      {list.length === 0 && <p className="codex-empty">{filter === "own" ? "아직 보유한 유물이 없어요" : "모든 유물을 보유했어요"}</p>}
    </>
  );
}
