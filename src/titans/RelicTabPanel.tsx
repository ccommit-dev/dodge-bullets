import { RelicIcon } from "./RelicIcon";
import "./relicGacha.css";
import {
  RELICS, RELIC_FAMILIES, RELIC_FAMILY_LABEL, RELIC_MAX_STAR, RELIC_SET, RELIC_SET_NEED, RELIC_SHARDS_PER_STAR, familyOwned, relicStars, relicStatText, relicUpgradable, setActive, setFull, type RelicId, type RelicState,
} from "./relics";
import { TIERS, TIER_LABEL } from "./summonLevel";
/* 2026-10-28 (사용자: "사냥터 스킬탭, 유물탭에 등급별 이 내용은 삭제하고 … 윤곽선으로만 등급 참고") — 등급 글자 칩을 걷고 아이콘 윤곽선 색(동료 등급색)으로만.
   등급 이름은 길게 누르거나 마우스를 올리면(title) 보인다 */

/**
 * 사냥터 성장 서랍 · 유물 탭 (2026-10-27, 사용자: "유물 탭에 퀘스트 UI 처럼 수정").
 * 퀘스트 탭과 같은 줄 모양(.quest-row 판) — [아이콘 · ★] [이름 · 조각 막대 · 효과] [강화]. 계열마다 세트 칩.
 * 2026-11-03: 전체 목록(보유 · 미보유)은 마이페이지 도감 → 유물.
 * 2026-11-09 (사용자: "유물 조각제가 너무 이상함 — 단순하게 갖으면 업그레이드 가능하게, 업그레이드 재료로") — 조각은 강화 재료 하나뿐.
 *   막대 = 가진 조각 / 강화에 드는 조각(3), 단추 = 강화(★0 이면 획득). 조각이 모자라면 단추가 꺼져 있고 몇 개 남았는지 보인다.
 *   예전에는 막대("2/3")와 상자("조각 5")가 둘 다 '이미 넣은 조각'이고 초록 '소진' 단추만 남은 조각이라, 같은 카드에 조각 수가 세 가지였다.
 * 줄에 보이는 것 — 가진 유물(★1 이상)과 조각이 다 모여 바로 얻을 수 있는 유물. 아직 모으는 중인 유물은 머리줄 "모으는 중 n종"으로만(2026-10-27 가진 것만).
 */
type Props = {
  relics: RelicState;
  /** 강화 재료 — 아직 쓰지 않은 조각 */
  spare: RelicState;
  onUpgrade: (id: RelicId) => void;
  /** 강화할 수 있는 만큼 모두 */
  onUpgradeAll: () => void;
  /** 다시 잡은 대장 조각 확률(0~1) */
  chance: number;
  /** 도감(마이페이지 → 도감 → 유물) — 보유 · 미보유를 거기서 나눠 본다 */
  onCodex: () => void;
};

const NEED = RELIC_SHARDS_PER_STAR;

export function RelicTabPanel({ relics, spare, onUpgrade, onUpgradeAll, chance, onCodex }: Props) {
  const owned = RELICS.filter((r) => relicStars(relics, r.id) >= 1).length;
  const can = (id: RelicId) => relicUpgradable(relics, spare, id);
  const shown = (id: RelicId) => relicStars(relics, id) >= 1 || can(id);
  const ready = RELICS.filter((r) => can(r.id)).length;
  const collecting = RELICS.filter((r) => relicStars(relics, r.id) < 1 && !can(r.id) && (spare[r.id] ?? 0) > 0).length;
  return (
    <div className="quest-panel relic-tab-panel">
      <header className="quest-head relic-tab-head">
        <b>유물</b>
        <span>보유 {owned}/{RELICS.length}</span>
        <button type="button" className="relic-tab-dex" onClick={onCodex}>
          <b>도감 ›</b>
        </button>
        <small>조각 {NEED}개 = ★ 한 단계 강화{ready > 0 ? <b className="relic-spare-total"> · 강화 가능 {ready}개</b> : null}{collecting > 0 ? ` · 모으는 중 ${collecting}종` : ""} · 대장 다시 잡기 {Math.round(chance * 100)}% · 환생해도 유지</small>
        {ready > 1 && (
          <button type="button" className="relic-upgrade-all" onClick={onUpgradeAll}>
            모두 강화
          </button>
        )}
      </header>
      {owned === 0 && ready === 0 && (
        <p className="relic-tab-empty">
          <b>아직 가진 유물이 없어요</b>
          <small>상점 → 뽑기 → 유물에서 뽑거나 대장을 다시 잡아 조각을 모으세요. 같은 유물 조각 {NEED}개면 얻고, {NEED}개씩 더 모아 강화해요</small>
        </p>
      )}
      {/* 세트별 묶음을 없앴다 (2026-11-03, 사용자: "세트별 정렬 없애고 보유한것만") — 높은 등급부터 한 줄로. 세트는 효과가 있어서 위 칩으로만 남긴다 */}
      {RELIC_FAMILIES.some((f) => familyOwned(relics, f) > 0) && (
        <p className="relic-set-chips">
          {RELIC_FAMILIES.filter((f) => familyOwned(relics, f) > 0).map((f) => (
            <span key={f} className={`relic-set-chip ${setActive(relics, f) ? "on" : ""} ${setFull(relics, f) ? "full" : ""}`} data-family={f} title={RELIC_SET[f].name}>
              {RELIC_FAMILY_LABEL[f]} {familyOwned(relics, f)}/{RELIC_SET_NEED}{setFull(relics, f) ? " ✔✔" : setActive(relics, f) ? " ✔" : ""}
            </span>
          ))}
        </p>
      )}
      <ol className="quest-list">
        {/* 강화할 수 있는 것부터 — 그다음 높은 등급 · 높은 ★ */}
        {RELICS.filter((r) => shown(r.id)).sort((x, y) => Number(can(y.id)) - Number(can(x.id)) || TIERS.indexOf(y.tier) - TIERS.indexOf(x.tier) || relicStars(relics, y.id) - relicStars(relics, x.id)).map((r) => {
          const stars = relicStars(relics, r.id);
          const max = stars >= RELIC_MAX_STAR;
          const have = spare[r.id] ?? 0;
          const ok = can(r.id);
          return (
            <li key={r.id} className={`quest-row relic-row rarity-${r.tier.toLowerCase()} ${ok ? "is-ready" : ""}`} data-relic={r.id} data-tier={r.tier}>
              <span className={`quest-icon relic-outline rarity-${r.tier.toLowerCase()}`} title={`${TIER_LABEL[r.tier]} 유물`}>
                <RelicIcon id={r.id} />
                <b>★{stars}</b>
              </span>
              <span className="quest-main">
                <strong><em className="tier-chip">{TIER_LABEL[r.tier]}</em>{r.name}</strong>
                {/* 막대 = 강화 재료: 가진 조각 / 한 번 강화에 드는 조각 */}
                <span className="quest-bar relic-material" aria-label={max ? "최대 ★5" : `조각 ${have}/${NEED}`}>
                  <i style={{ width: `${max ? 100 : Math.min(1, have / NEED) * 100}%` }} />
                  <span className="quest-pay">{stars > 0 ? relicStatText(r, stars) : "아직 없음"}</span>
                  <em>{max ? "MAX" : `조각 ${have}/${NEED}`}</em>
                </span>
                <small className="quest-next">{max ? "최대 ★5 · 완성" : `다음 ★${stars + 1} · ${relicStatText(r, stars + 1)}`}</small>
              </span>
              {max ? (
                <span className="quest-buy relic-state">
                  <i className="relic-stars-row" aria-label={`별 ${stars}`}>{"★".repeat(stars)}</i>
                  <small>완성</small>
                </span>
              ) : (
                <button type="button" className={`quest-buy relic-consume relic-upgrade ${ok ? "" : "is-short"}`} data-relic={r.id} disabled={!ok} onClick={() => onUpgrade(r.id)}>
                  <b>{stars === 0 ? "획득" : "강화"}</b>
                  <small>{ok ? `★${stars} → ★${stars + 1}` : `조각 ${NEED - have}개 더`}</small>
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
