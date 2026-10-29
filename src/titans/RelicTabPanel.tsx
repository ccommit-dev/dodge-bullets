import { assetUrl } from "../asset";
import { CurrencyIcon } from "../ui/CurrencyIcon";
import "./relicGacha.css";
import {
  RELICS, RELIC_FAMILIES, RELIC_FAMILY_LABEL, RELIC_MAX_STAR, RELIC_SET, RELIC_SET_NEED, RELIC_SHARDS_PER_STAR, familyOwned, relicIconUrl, relicSpareUsable, relicStars, relicStatText, setActive, setFull, type RelicId, type RelicState,
} from "./relics";
import { TIERS, TIER_LABEL } from "./summonLevel";
/* 2026-10-28 (사용자: "사냥터 스킬탭, 유물탭에 등급별 이 내용은 삭제하고 … 윤곽선으로만 등급 참고") — 등급 글자 칩을 걷고 아이콘 윤곽선 색(동료 등급색)으로만.
   등급 이름은 길게 누르거나 마우스를 올리면(title) 보인다 */

/**
 * 사냥터 성장 서랍 · 유물 탭 (2026-10-27, 사용자: "유물 탭에 퀘스트 UI 처럼 수정").
 * 퀘스트 탭과 같은 줄 모양(.quest-row 판) — [아이콘 · ★] [이름 · 조각 막대 · 효과] [다음 ★ 까지]. 계열마다 세트 머리줄.
 * 마이페이지 계승 칸의 RelicPanel(.mp-relics)은 그대로 둔다(같은 데이터를 다른 자리에서 보여 줄 뿐).
 * 2026-10-27 (사용자: "가지고 있는것만 사냥터 유물 탭에서 조회되게") — ★1 이상만 줄로 보인다. 하나도 없는 계열은 빠지고,
 * 아직 ★1 이 안 된 조각은 머리줄에 "모으는 중" 수로만 센다. 뽑기는 상점(유물 칸 · 뽑기 화면).
 */
type Props = {
  relics: RelicState;
  /** 소진하지 않은 조각 (2026-10-28 중복 소진) — 줄의 '소진' 단추로 ★ 에 넣는다 */
  spare: RelicState;
  onConsume: (id: RelicId) => void;
  /** 다시 잡은 대장 조각 확률(0~1) */
  chance: number;
  onDraw: () => void;
};


export function RelicTabPanel({ relics, spare, onConsume, chance, onDraw }: Props) {
  const owned = RELICS.filter((r) => relicStars(relics, r.id) >= 1).length;
  /** 줄에 보이는 유물 — ★1 이상이거나, 소진할 남은 조각이 있다 */
  const shown = (id: RelicId) => relicStars(relics, id) >= 1 || relicSpareUsable(relics, spare, id) > 0;
  const spareTotal = RELICS.reduce((a, r) => a + relicSpareUsable(relics, spare, r.id), 0);
  const collecting = RELICS.filter((r) => relicStars(relics, r.id) < 1 && (relics[r.id] ?? 0) > 0).length;
  return (
    <div className="quest-panel relic-tab-panel">
      <header className="quest-head relic-tab-head">
        <b>유물</b>
        <span>보유 {owned}/{RELICS.length}</span>
        <button type="button" className="relic-tab-draw" onClick={onDraw}>
          <b>유물 뽑기</b>
          <small><CurrencyIcon kind="gem" />상점</small>
        </button>
        <small>{spareTotal > 0 ? <b className="relic-spare-total">남은 조각 {spareTotal}개 · 소진해 ★ 올리기 · </b> : null}조각 {RELIC_SHARDS_PER_STAR}개 = ★1{collecting > 0 ? ` · 모으는 중 ${collecting}종` : ""} · 대장 다시 잡기 {Math.round(chance * 100)}% · 갈림길 · 환생해도 유지</small>
      </header>
      {owned === 0 && spareTotal === 0 && (
        <p className="relic-tab-empty">
          <b>아직 가진 유물이 없어요</b>
          <small>상점 → 유물에서 뽑거나, 대장을 다시 잡아 조각 {RELIC_SHARDS_PER_STAR}개를 모으면 여기에 보여요</small>
        </p>
      )}
      {RELIC_FAMILIES.filter((f) => RELICS.some((r) => r.family === f && shown(r.id))).map((f) => {
        const on = setActive(relics, f);
        const full = setFull(relics, f);
        const have = familyOwned(relics, f);
        const size = RELICS.filter((r) => r.family === f).length;
        return (
          <section key={f} className={`relic-tab-family fam-${f} ${on ? "set-on" : ""}`} aria-label={`${RELIC_FAMILY_LABEL[f]} 계열`}>
            {/* 세트 (2026-10-28 6등급): 3개 = 세트 · 6개 모두 = 세트 ×1.5 */}
            <h4><b>{RELIC_FAMILY_LABEL[f]}</b><span>{full ? "세트 ✔✔ ×1.5" : on ? `세트 ✔ · ${have}/${size}` : `세트 ${have}/${RELIC_SET_NEED}`} · {RELIC_SET[f].name}</span><small>{RELIC_SET[f].blurb}{on && !full ? ` · ${size}개 모두면 ×1.5` : ""}</small></h4>
            <ol className="quest-list">
              {RELICS.filter((r) => r.family === f && shown(r.id)).sort((a, b) => TIERS.indexOf(b.tier) - TIERS.indexOf(a.tier)).map((r) => {
                const shards = relics[r.id] ?? 0;
                const stars = relicStars(relics, r.id);
                const max = stars >= RELIC_MAX_STAR;
                const into = max ? RELIC_SHARDS_PER_STAR : shards % RELIC_SHARDS_PER_STAR;
                const usable = relicSpareUsable(relics, spare, r.id);
                const after = Math.min(RELIC_MAX_STAR, Math.floor((shards + usable) / RELIC_SHARDS_PER_STAR));
                return (
                  <li key={r.id} className={`quest-row relic-row rarity-${r.tier.toLowerCase()}`} data-relic={r.id} data-tier={r.tier}>
                    <span className={`quest-icon relic-outline rarity-${r.tier.toLowerCase()}`} title={`${TIER_LABEL[r.tier]} 유물`}>
                      <img src={assetUrl(relicIconUrl(r.id))} alt="" aria-hidden="true" />
                      <b>★{stars}</b>
                    </span>
                    <span className="quest-main">
                      <strong>{r.name}</strong>
                      <span className="quest-bar" aria-label={`조각 ${into}/${RELIC_SHARDS_PER_STAR}`}>
                        <i style={{ width: `${(into / RELIC_SHARDS_PER_STAR) * 100}%` }} />
                        <span className="quest-pay">{relicStatText(r, stars)}</span>
                        <em>{max ? "MAX" : `${into}/${RELIC_SHARDS_PER_STAR}`}</em>
                      </span>
                      <small className="quest-next">{max ? "최대 ★5" : `다음 ★${stars + 1} · ${relicStatText(r, stars + 1)}`}</small>
                    </span>
                    {usable > 0 ? (
                      <button type="button" className="quest-buy relic-consume" data-relic={r.id} onClick={() => onConsume(r.id)}>
                        <b>조각 {usable}개 소진</b>
                        <small>{after > stars ? `★${stars} → ★${after}` : `★${after + 1} 까지 ${(after + 1) * RELIC_SHARDS_PER_STAR - shards - usable}개`}</small>
                      </button>
                    ) : (
                      <span className="quest-buy relic-state">
                        <i className="relic-stars-row" aria-label={`별 ${stars}`}>{"★".repeat(stars)}<em>{"★".repeat(RELIC_MAX_STAR - stars)}</em></i>
                        <small>{max ? "완성" : `조각 ${shards}`}</small>
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}
    </div>
  );
}
