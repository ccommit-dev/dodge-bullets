import { useState } from "react";
import { assetUrl } from "../asset";
import { ACORN_MAKE_SEC, ACORN_MAX_LEVEL, acornMul, acornName, freeSlots, pairOf, type AcornState } from "./acorns";
import type { TitanHeroId } from "./model";

/**
 * 도토리 탄약 합성 판 (2026-10-22, 아처 키우기 1번 차용).
 * 칸을 누르면 고르고, 같은 단계 칸을 누르면 합친다(짝이 있는 칸은 반짝 테두리). 고른 채로 아래 동료를 누르면 끼운다 —
 * 끼우기 전에 "×1.10 → ×1.42" 처럼 바뀌는 배율을 먼저 보여 준다(효과가 안 보이는 강화 피하기).
 */
type Props = {
  state: AcornState;
  /** 다음 도토리까지 0~1 */
  progress: number;
  party: { id: TitanHeroId; name: string }[];
  onMerge: (from: number, to: number) => void;
  onEquip: (slot: number, ally: TitanHeroId) => void;
};

/** 단계별 색 — 같은 도토리 그림에 색만 바꿔 한눈에 구분 */
const HUE = [0, 0, 30, 60, 100, 160, 190, 0, 260, 320, 210, 45, 0];
const tint = (l: number) => (l >= 12 ? "drop-shadow(0 0 6px #fde047) saturate(1.6)" : l === 7 ? "saturate(1.8) brightness(1.15)" : l <= 1 ? "saturate(.55) brightness(1.05)" : `hue-rotate(${HUE[l]}deg) saturate(1.4)`);

export function AcornPanel({ state, progress, party, onMerge, onEquip }: Props) {
  const [picked, setPicked] = useState<number | null>(null);
  const [pop, setPop] = useState<{ slot: number; key: number } | null>(null);
  const pickedLevel = picked !== null ? state.grid[picked] : 0;
  const full = freeSlots(state) === 0;

  const tapSlot = (i: number) => {
    const l = state.grid[i];
    if (picked === null) { if (l > 0) setPicked(i); return; }
    if (picked === i) { setPicked(null); return; }
    if (l > 0 && l === state.grid[picked] && l < ACORN_MAX_LEVEL) {
      onMerge(picked, i);
      setPop({ slot: i, key: Date.now() });
      setPicked(null);
      return;
    }
    setPicked(l > 0 ? i : null);
  };
  const tapAlly = (id: TitanHeroId) => {
    if (picked === null || !(state.grid[picked] > 0)) return;
    onEquip(picked, id);
    setPicked(null);
  };

  return (
    <section className="acorn-panel" aria-label="도토리 탄약 합성">
      <header className="acorn-head">
        <div>
          <b>도토리 합성</b>
          <small>같은 도토리 둘을 차례로 누르면 합쳐져요 · 최고 {acornName(state.best || 1)}</small>
        </div>
        <span className={`acorn-make ${full ? "is-full" : ""}`} aria-label="다음 도토리">
          <i style={{ width: `${Math.round((full ? 1 : progress) * 100)}%` }} />
          <em>{full ? "칸이 가득 — 합쳐서 비우기" : `다음 도토리 ${Math.max(0, Math.ceil(ACORN_MAKE_SEC * (1 - progress)))}초`}</em>
        </span>
      </header>
      <div className="acorn-grid">
        {state.grid.map((l, i) => {
          const hasPair = l > 0 && pairOf(state, i) >= 0;
          const match = picked !== null && picked !== i && l > 0 && l === pickedLevel && l < ACORN_MAX_LEVEL;
          return (
            <button
              key={i}
              type="button"
              className={`acorn-slot ${l > 0 ? "has" : "empty"} ${picked === i ? "picked" : ""} ${match ? "match" : ""} ${hasPair && picked === null ? "pair" : ""}`}
              onClick={() => tapSlot(i)}
              aria-label={l > 0 ? `${acornName(l)} Lv.${l}` : "빈 칸"}
            >
              {l > 0 && <img src={assetUrl("ui/attendance/gold.png")} alt="" aria-hidden="true" style={{ filter: tint(l) }} />}
              {l > 0 && <b>{l}</b>}
              {pop?.slot === i && <i key={pop.key} className="acorn-pop" aria-hidden="true">+1</i>}
            </button>
          );
        })}
      </div>
      <div className="acorn-allies">
        <small>{picked !== null ? `${acornName(pickedLevel)} Lv.${pickedLevel} — 끼울 동료를 누르세요` : "도토리를 고른 뒤 동료를 누르면 끼워요"}</small>
        <div>
          {party.map((a) => {
            const cur = state.allyAmmo[a.id] ?? 0;
            const after = picked !== null ? pickedLevel : cur;
            const up = picked !== null && after > cur;
            return (
              <button key={a.id} type="button" className={`acorn-ally ${picked !== null ? "ready" : ""} ${up ? "up" : ""}`} disabled={picked === null} onClick={() => tapAlly(a.id)}>
                <b>{a.name}</b>
                <span>{cur > 0 ? `Lv.${cur}` : "없음"} · 피해 ×{acornMul(cur).toFixed(2)}</span>
                {picked !== null && after !== cur && <em>→ ×{acornMul(after).toFixed(2)}</em>}
              </button>
            );
          })}
          {party.length === 0 && <span className="acorn-empty-party">출전 동료가 없어요 — 동료 탭에서 편성</span>}
        </div>
      </div>
    </section>
  );
}
