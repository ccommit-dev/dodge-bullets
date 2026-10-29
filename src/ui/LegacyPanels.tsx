/**
 * 마이페이지 계승 칸 — 결정 강화 트리 · 유물 (2026-10-26, "오늘도 환생 2" 차용 1 · 3번).
 * 순수 규칙은 progression/crystalTree.ts · titans/relics.ts. 여기는 그리기와 저장만.
 */
import { assetUrl } from "../asset";
import { updateCharacterProgress } from "../progression/storage";
import type { CharacterProgress } from "../progression/model";
import {
  BASIC_LINES, SPECIAL_LINES, canUnlockKey, freeCrystals, lineDef, lineText, resetTree, treeSpent, unlockKey, upgradeLine, permanentEffects, type TreeLine,
} from "../progression/crystalTree";
import {
  RELICS, RELIC_FAMILIES, RELIC_FAMILY_LABEL, RELIC_MAX_STAR, RELIC_SET, RELIC_SET_NEED, RELIC_SHARDS_PER_STAR, relicIconUrl, relicSpareUsable, relicStars, relicStatText, setActive, type RelicFamily,
} from "../titans/relics";

type Props = {
  userHash: string;
  progress: CharacterProgress;
  onProgressChange: (next: CharacterProgress) => void;
  onMessage: (msg: string) => void;
};

export function CrystalTreePanel({ userHash, progress, onProgressChange, onMessage }: Props) {
  const free = freeCrystals(progress);
  const spent = treeSpent(progress.crystalTree);
  const buy = async (id: TreeLine) => {
    const check = upgradeLine(progress, id);
    if (!check.ok) { onMessage(check.reason); return; }
    const next = await updateCharacterProgress(userHash, (cur) => { const r = upgradeLine(cur, id); return r.ok ? r.next : cur; });
    onProgressChange(next);
    onMessage(`${lineDef(id).name} ${next.crystalTree[id]}단계 — ${lineText(id, next.crystalTree[id])}`);
  };
  const unlock = async (id: TreeLine) => {
    const check = unlockKey(progress, id);
    if (!check.ok) { onMessage(check.reason); return; }
    const next = await updateCharacterProgress(userHash, (cur) => { const r = unlockKey(cur, id); return r.ok ? r.next : cur; });
    onProgressChange(next);
    onMessage(`${lineDef(id).name} 줄을 열었습니다 — 진화 포인트 −1`);
  };
  const reset = async () => {
    if (spent <= 0) { onMessage("되돌릴 결정이 없습니다"); return; }
    const next = await updateCharacterProgress(userHash, (cur) => resetTree(cur));
    onProgressChange(next);
    onMessage(`결정 ${spent}개를 돌려받았습니다 — 연 줄은 그대로`);
  };
  const row = (id: TreeLine) => {
    const def = lineDef(id);
    const lv = progress.crystalTree[id];
    const locked = !!def.key && !progress.crystalTree.keys.includes(id);
    const max = lv >= def.max;
    const cost = def.cost(lv);
    const can = !locked && !max && free >= cost;
    return (
      <li key={id} className={`ct-row ${locked ? "is-locked" : ""} ${max ? "is-max" : ""}`}>
        <img src={assetUrl(`titans/relics/tree-${id}.png`)} alt="" aria-hidden="true" />
        <span className="ct-copy">
          <b>{def.name} <small>{lv}/{def.max}</small></b>
          <em>{locked ? `${def.label} · 진화 포인트로 연다` : max ? lineText(id, lv) : <>{def.label} {def.short(lv)} → <b>{def.short(lv + 1)}</b></>}</em>
        </span>
        {locked ? (
          <button type="button" className={`ct-buy key ${canUnlockKey(progress, id) ? "" : "is-off"}`} onClick={() => void unlock(id)}>열기<small>진화 {def.key}</small></button>
        ) : (
          <button type="button" className={`ct-buy ${can ? "" : "is-off"}`} aria-disabled={!can} onClick={() => void buy(id)}>{max ? "MAX" : <>강화<small>결정 {cost}</small></>}</button>
        )}
      </li>
    );
  };
  return (
    <>
      <div className="legacy-heading"><div><small>CRYSTAL</small><strong>결정 강화</strong></div><span>쓸 수 있는 결정 <b className="ct-free">{free}</b></span></div>
      <div className="mp-crystal-tree">
        <ul aria-label="결정 강화 다섯 줄">{BASIC_LINES.map(row)}</ul>
        <p className="ct-special-label">특수 줄 · 진화 포인트 {progress.evolutionPoints}</p>
        <ul aria-label="특수 줄">{SPECIAL_LINES.map(row)}</ul>
        <button type="button" className="ct-reset" onClick={() => void reset()}>되돌리기 (결정 {spent} 반환 · 무료)</button>
      </div>
    </>
  );
}

const FAMILIES: readonly RelicFamily[] = RELIC_FAMILIES;   // 2026-10-28 6계열

export function RelicPanel({ progress }: Pick<Props, "progress">) {
  const owned = RELICS.filter((r) => relicStars(progress.relics, r.id) >= 1).length;
  const chance = Math.round(permanentEffects(progress).relicChance * 100);
  // 소진하지 않은 조각 (2026-10-28 중복 소진) — 여기선 보여 주기만, 소진은 사냥터 → 유물 탭
  const spareOf = (id: (typeof RELICS)[number]["id"]) => relicSpareUsable(progress.relics, progress.relicSpare ?? {}, id);
  const spareTotal = RELICS.reduce((a, r) => a + spareOf(r.id), 0);
  return (
    <>
      <div className="legacy-heading"><div><small>RELIC</small><strong>유물</strong></div><span>{owned}/{RELICS.length} · 조각 {chance}%</span></div>
      <div className="mp-relics">
        <p className="relic-how">조각 {RELIC_SHARDS_PER_STAR}개 = ★1 · 대장 재처치 · 갈림길에서 · 환생해도 유지</p>
        {spareTotal > 0 && <p className="relic-how relic-spare-note"><b>남은 조각 {spareTotal}개</b> — 사냥터 → 유물 탭에서 소진하면 ★ 가 올라요</p>}
        {FAMILIES.map((f) => {
          const on = setActive(progress.relics, f);
          return (
            <section key={f} className={`relic-family fam-${f} ${on ? "set-on" : ""}`} aria-label={`${RELIC_FAMILY_LABEL[f]} 계열`}>
              <header><b>{RELIC_FAMILY_LABEL[f]}</b><span className="relic-set">{on ? "세트 ✔" : `${RELIC_SET_NEED}개 세트`} · {RELIC_SET[f].name}<small>{RELIC_SET[f].blurb}</small></span></header>
              <div className="relic-row">
                {RELICS.filter((r) => r.family === f).map((r) => {
                  const shards = progress.relics[r.id] ?? 0;
                  const stars = relicStars(progress.relics, r.id);
                  const into = stars >= RELIC_MAX_STAR ? RELIC_SHARDS_PER_STAR : shards % RELIC_SHARDS_PER_STAR;
                  return (
                    <div key={r.id} className={`relic-tile relic-outline rarity-${r.tier.toLowerCase()} ${stars >= 1 ? "owned" : "unowned"}`} data-relic={r.id} data-tier={r.tier}>
                      <img src={assetUrl(relicIconUrl(r.id))} alt="" aria-hidden="true" />
                      <b>{r.name}</b>
                      <i className="relic-stars" aria-label={`별 ${stars}`}>{stars >= 1 ? "★".repeat(stars) : "미보유"}</i>
                      <small>{relicStatText(r, stars)}</small>
                      <span className="relic-bar"><i style={{ width: `${(into / RELIC_SHARDS_PER_STAR) * 100}%` }} /></span>
                      {spareOf(r.id) > 0 && <em className="relic-spare-badge">남은 {spareOf(r.id)}</em>}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
