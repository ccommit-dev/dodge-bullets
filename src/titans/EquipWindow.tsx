/**
 * 장비창 (2026-11-04, 사용자: "ui 너무 별로야 탈부착 아이템 드래그 드랍처럼 조금 더 온라인 게임처럼") — 무기 칩 네 개가 글자 단추로 줄지어 있던 자리.
 * 가운데 주인공 · 양옆 슬롯 6칸 · 아래 가방. 가방 아이템을 맞는 슬롯으로 끌어다 놓으면 끼워지고, 짧게 누르면 바로 낀다(한 손 · 접근성).
 * 슬롯을 누르면 가방이 그 부위 아이템만 보여 준다 — 세트 파츠까지 스무 개가 넘어 한 판에 다 깔면 길었다(equipment/gearSets).
 * 터치 스크롤과 안 싸우게 6px 움직여야 끌기로 친다. 고스트는 시트의 transform 에 갇히지 않게 body 포털.
 * 2026-11-06 (사용자 참고 장비창): 주인공 아래 능력치 칩 · 발판 빛과 슬롯 연결선 · 등급순 정렬 · 대장간(강화) 단추 · 빈 가방 안내.
 * 2026-11-20 합성(equipment/gearSets mergeGear): 가방 위 '합성' 단추 → 가방 자리에 합성 줄 [파츠] + [여분] + [여분] = [한 등급 위] · 줄마다 합성 · 모두 합성.
 *   합성할 수 있는 게 있으면 단추에 점 하나(새 알림 판은 안 만든다).
 */
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { Tier } from "./allyRoster";
import { TIER_LABEL, TIER_RANK } from "./summonLevel";
import "./equipWindow.css";

/** mount — 2026-11-18 탈것 칸(인형 아래 가운데). 낀 탈것을 다시 누르면 내린다 */
export type EquipSlotId = "weapon" | "shoulder" | "helmet" | "armor" | "gloves" | "boots" | "mount";
export type EquipBagItem = { key: string; slot: EquipSlotId; label: string; level?: string; icon: string; on: boolean; pending?: boolean; title: string; className?: string; tier?: Tier;
  /** 합성 재료(세트 파츠만) — 여분 수 · 지금 합성 가능 · 합성하면 될 등급(끝이면 없음) */
  copies?: number; mergeable?: boolean; nextTier?: Tier | null };
export type EquipSlotView = { id: EquipSlotId; label: string; icon: string | null; level?: string; tier?: Tier; active?: boolean };
export type EquipStat = { key: string; label: string; value: string; title?: string };

const DRAG_START_PX = 6;

export function EquipWindow({ slots, bag, hero, stats, footer, onEquip, onDenied, onShop, onForge, onSlotChange, onMerge, mergeNeed = 2 }: {
  slots: EquipSlotView[];
  bag: EquipBagItem[];
  hero: ReactNode;
  /** 주인공 아래 능력치 칩 — 지금 실제로 쓰이는 값만 */
  stats?: EquipStat[];
  /** 강화하러 대장간으로 */
  onForge?: () => void;
  footer: (slot: EquipSlotId) => ReactNode;
  /** 슬롯을 고를 때 — 아래 훈련 카드가 그 슬롯 것만 보인다 */
  onSlotChange?: (slot: EquipSlotId) => void;
  onEquip: (item: EquipBagItem) => void;
  onDenied?: (item: EquipBagItem, overSlot: EquipSlotId) => void;
  /** 가방 끝 '＋ 상점' — 지금 고른 칸을 넘긴다(탈것이면 상점 탈것 칸으로) */
  onShop?: (slot: EquipSlotId) => void;
  /** 합성 — 아이템 key(세트 파츠 id), 없으면 모두 합성 */
  onMerge?: (key?: string) => void;
  /** 한 등급 올리는 데 드는 여분 수 */
  mergeNeed?: number;
}) {
  const [bagSlot, setBagSlot] = useState<EquipSlotId>("weapon");
  const [byTier, setByTier] = useState(false);
  const [merging, setMerging] = useState(false);
  const mergeRows = bag.filter((b) => b.copies !== undefined && (b.copies > 0 || b.mergeable));
  const anyMergeable = bag.some((b) => b.mergeable);
  // 등급순 — 높은 등급 먼저, 같으면 원래 순서(낀 것 표시는 그대로)
  const shown = bag.filter((b) => b.slot === bagSlot).map((b, i) => ({ b, i })).sort((x, y) => (byTier ? (TIER_RANK[y.b.tier ?? "N"] - TIER_RANK[x.b.tier ?? "N"]) : 0) || x.i - y.i).map((x) => x.b);
  const rootRef = useRef<HTMLElement | null>(null);
  const [drag, setDrag] = useState<{ item: EquipBagItem; x: number; y: number; over: EquipSlotId | null } | null>(null);
  const pressRef = useRef<{ item: EquipBagItem; id: number; x0: number; y0: number; dragging: boolean } | null>(null);
  const suppressClickRef = useRef(false);

  const slotAt = (x: number, y: number): EquipSlotId | null => {
    const el = document.elementsFromPoint(x, y).find((e) => e instanceof HTMLElement && e.dataset.equipSlot) as HTMLElement | undefined;
    return (el?.dataset.equipSlot as EquipSlotId | undefined) ?? null;
  };
  const onDown = (e: ReactPointerEvent<HTMLButtonElement>, item: EquipBagItem) => {
    if (e.button !== 0) return;
    pressRef.current = { item, id: e.pointerId, x0: e.clientX, y0: e.clientY, dragging: false };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const p = pressRef.current;
    if (!p || p.id !== e.pointerId) return;
    if (!p.dragging && Math.hypot(e.clientX - p.x0, e.clientY - p.y0) < DRAG_START_PX) return;
    p.dragging = true;
    setDrag({ item: p.item, x: e.clientX, y: e.clientY, over: slotAt(e.clientX, e.clientY) });
  };
  const finish = (e: ReactPointerEvent<HTMLButtonElement>, cancelled: boolean) => {
    const p = pressRef.current;
    if (!p || p.id !== e.pointerId) return;
    pressRef.current = null;
    if (!p.dragging) return;
    suppressClickRef.current = true;   // 끌고 놓은 뒤 따라오는 click 이 한 번 더 끼우지 않게
    window.setTimeout(() => { suppressClickRef.current = false; }, 0);
    const over = cancelled ? null : slotAt(e.clientX, e.clientY);
    setDrag(null);
    if (!over) return;
    if (over === p.item.slot) onEquip(p.item);
    else onDenied?.(p.item, over);
  };
  // 끄는 동안 페이지 선택 · 길게 누르기 메뉴가 끼지 않게
  useEffect(() => {
    if (!drag) return;
    const stop = (ev: Event) => ev.preventDefault();
    document.addEventListener("contextmenu", stop);
    document.addEventListener("selectstart", stop);
    return () => { document.removeEventListener("contextmenu", stop); document.removeEventListener("selectstart", stop); };
  }, [drag]);

  const left = slots.filter((s) => s.id === "weapon" || s.id === "shoulder" || s.id === "helmet");
  const right = slots.filter((s) => s.id === "armor" || s.id === "gloves" || s.id === "boots");
  const mount = slots.find((s) => s.id === "mount");
  const slotEl = (s: EquipSlotView) => {
    const accepts = !!drag && drag.item.slot === s.id;
    const denied = !!drag && drag.over === s.id && drag.item.slot !== s.id;
    return (
      <button key={s.id} type="button" data-equip-slot={s.id} data-tier={s.icon ? s.tier : undefined} title={s.icon && s.tier ? `${TIER_LABEL[s.tier]} ${s.label}` : s.label} aria-pressed={bagSlot === s.id} onClick={() => { setBagSlot(s.id); onSlotChange?.(s.id); }} className={`equip-slot slot-${s.id} ${bagSlot === s.id ? "selected" : ""} ${s.active ? "set-active" : ""} ${s.icon ? "" : "is-empty"} ${accepts ? "can-drop" : ""} ${accepts && drag?.over === s.id ? "drop-over" : ""} ${denied ? "drop-denied" : ""}`} aria-label={s.label}>
        {s.icon ? <img src={s.icon} alt="" draggable={false} /> : null}
        {s.level ? <em>{s.level}</em> : null}
        <small>{s.label}</small>
      </button>
    );
  };

  return (
    <section ref={rootRef} className={`equip-window ${drag ? "is-dragging" : ""}`} aria-label="장비창">
      <div className="equip-doll">
        <div className="equip-col">{left.map(slotEl)}</div>
        <div className="equip-hero"><i className="equip-pad" aria-hidden="true" />{hero}
          {stats && stats.length > 0 && (
            <div className="equip-stats">{stats.map((st) => <span key={st.key} className={`equip-stat stat-${st.key}`} title={st.title}><small>{st.label}</small><b>{st.value}</b></span>)}</div>
          )}
        </div>
        <div className="equip-col">{right.map(slotEl)}</div>
      </div>
      {mount && <div className="equip-mount-row">{slotEl(mount)}</div>}
      <div className="equip-bag-bar">
        <button type="button" className={`equip-sort ${byTier ? "on" : ""}`} aria-pressed={byTier} onClick={() => setByTier((v) => !v)}>등급순 정렬</button>
        {onMerge && <button type="button" className={`equip-merge-toggle ${merging ? "on" : ""} ${anyMergeable ? "has-ready" : ""}`} aria-pressed={merging} onClick={() => setMerging((v) => !v)}>{merging ? "가방" : "합성"}</button>}
        {onForge && <button type="button" className="equip-forge-link" onClick={onForge}>대장간 강화</button>}
      </div>
      {merging && onMerge && (
        <div className="equip-merge" role="group" aria-label="합성 — 같은 파츠 3개를 합치면 한 등급 위">
          <div className="equip-merge-head"><span>같은 파츠 <b>3개</b> → 한 등급 위 · 강화 · 룬은 그대로</span>
            <button type="button" className="equip-merge-all" disabled={!anyMergeable} onClick={() => onMerge()}>모두 합성</button></div>
          {mergeRows.length === 0 && <p className="equip-empty">여분 파츠가 없어요 — 상점에서 가진 파츠를 다시 사면 여분이 돼요</p>}
          {mergeRows.map((it) => {
            const have = it.copies ?? 0;
            return (
              <div key={it.key} className={`equip-merge-row ${it.mergeable ? "ready" : ""}`} data-merge={it.key}>
                <span className="equip-merge-tile" data-tier={it.tier}><img src={it.icon} alt="" /></span><i aria-hidden="true">+</i>
                {Array.from({ length: mergeNeed }, (_, k) => <span key={k} className={`equip-merge-tile ${k < have ? "" : "missing"}`} data-tier={it.tier}><img src={it.icon} alt="" />{k === mergeNeed - 1 && <small>{have}/{mergeNeed}</small>}</span>)}
                <i aria-hidden="true">=</i>
                {it.nextTier ? <span className="equip-merge-tile result" data-tier={it.nextTier}><img src={it.icon} alt="" /><small>{TIER_LABEL[it.nextTier]}</small></span> : <span className="equip-merge-tile result max"><small>최고</small></span>}
                <button type="button" className="equip-merge-go" disabled={!it.mergeable} onClick={() => onMerge(it.key)}>합성</button>
              </div>
            );
          })}
        </div>
      )}
      <div className="equip-bag" role="group" aria-label="가방 — 끌어다 슬롯에 놓거나 눌러서 장착" hidden={merging && !!onMerge}>
        {shown.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`equip-item item-${item.slot} ${item.on ? "on" : ""} ${item.pending ? "pending" : ""} ${drag?.item.key === item.key ? "is-lifted" : ""} ${item.className ?? ""}`}
            aria-pressed={item.on}
            title={item.tier ? `${TIER_LABEL[item.tier]} · ${item.title}` : item.title}
            data-item={item.key}
            data-tier={item.tier}
            onPointerDown={(e) => onDown(e, item)}
            onPointerMove={onMove}
            onPointerUp={(e) => finish(e, false)}
            onPointerCancel={(e) => finish(e, true)}
            onClick={() => { if (!suppressClickRef.current) onEquip(item); }}
          >
            <img src={item.icon} alt="" draggable={false} />
            <span>{item.label}{item.level ? " " : ""}{item.level ? <em>{item.level}</em> : null}</span>
            {(item.copies ?? 0) > 0 && <b className={`equip-copies ${item.mergeable ? "ready" : ""}`} aria-label={`여분 ${item.copies}`}>×{item.copies}</b>}
          </button>
        ))}
        {shown.length === 0 && <p className="equip-empty">낄 수 있는 장비가 없어요</p>}
        {onShop && bagSlot !== "weapon" && (
          <button type="button" className="equip-shop-link" onClick={() => onShop(bagSlot)}><b>＋</b><span>상점</span></button>
        )}
      </div>
      {footer(bagSlot)}
      {drag && createPortal(<div className="equip-ghost" style={{ left: drag.x, top: drag.y }} aria-hidden="true"><img src={drag.item.icon} alt="" /></div>, document.body)}
    </section>
  );
}
