/**
 * 마이페이지 계승 칸 — 결정 강화 트리 · 유물 (2026-10-26, "오늘도 환생 2" 차용 1 · 3번).
 * 순수 규칙은 progression/crystalTree.ts · titans/relics.ts. 여기는 그리기와 저장만.
 */
import { assetUrl } from "../asset";
import { updateCharacterProgress } from "../progression/storage";
import type { CharacterProgress } from "../progression/model";
import {
  BASIC_LINES, SPECIAL_LINES, canUnlockKey, freeCrystals, lineDef, lineText, resetTree, treeSpent, unlockKey, upgradeLine, type TreeLine,
} from "../progression/crystalTree";

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

