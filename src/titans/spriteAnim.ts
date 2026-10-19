/**
 * 애니메이션 2판 재생 (2026-10-19, 사용자: "모든 캐릭터, 동료의 애니메이션이 아직도 어색 — 다시 만들어서 적용").
 * 시트(줄 = 동작 · 칸 = 프레임, scripts/assemble-anim2.mjs)를 CSS steps() 로 넘긴다 — 칸마다 React 상태를 바꾸지 않는다.
 *   고리(대기·걷기): 0칸 → 마지막 칸을 무한 반복 · 한 번(공격·피격·예비): 0칸 → 마지막 칸, 끝나면 마지막 칸에 머문다(바탕 위치)
 * 키프레임은 (칸 수, 프레임 수) 마다 하나 — background-position-x 만 움직이고 줄(y)은 인라인 위치가 정한다.
 * var() 를 @keyframes 안에 쓰면 일부 WebKit 이 처음 값으로 굳어 숫자를 박은 키프레임을 한 번만 <style> 로 넣는다.
 */
import type { CSSProperties } from "react";
import { assetUrl } from "../asset";
import { ALLY_ANIM_SET, ANIM_LAYOUT, HERO_ANIM_READY, MONSTER_ANIM_SET, MONSTER_HD } from "./animLayout";

export type AllyAnimAction = keyof typeof ANIM_LAYOUT.ally.actions;
export type MonsterAnimAction = keyof typeof ANIM_LAYOUT.monster.actions;
export type HeroAnimMode = keyof typeof ANIM_LAYOUT.hero.sheets;

const injected = new Set<string>();
function keyframesFor(cols: number, frames: number): string {
  const name = `a2x-${cols}-${frames}`;
  if (!injected.has(name) && typeof document !== "undefined") {
    injected.add(name);
    const el = document.createElement("style");
    el.dataset.anim2 = name;
    el.textContent = `@keyframes ${name} { from { background-position-x: 0%; } to { background-position-x: ${cols > 1 ? ((frames / (cols - 1)) * 100).toFixed(4) : 0}%; } }`;
    document.head.appendChild(el);
  }
  return name;
}

/** 시트 한 줄을 steps 로 돌리는 스타일 — delayMs 는 고리의 시작 위상(음수면 중간부터) */
export function sheetAnimStyle(url: string, cols: number, rows: number, row: number, frames: number, ms: number, loop: boolean, delayMs = 0): CSSProperties {
  const name = keyframesFor(cols, frames);
  const x = cols > 1 ? ((loop ? 0 : frames - 1) / (cols - 1)) * 100 : 0;
  const y = rows > 1 ? (row / (rows - 1)) * 100 : 0;
  return {
    backgroundImage: `url(${url})`,
    backgroundSize: `${cols * 100}% ${rows * 100}%`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: `${x}% ${y}%`,
    animation: `${name} ${ms}ms steps(${frames}) ${delayMs}ms ${loop ? "infinite" : "1"} backwards`,
  };
}

export function hasAllyAnim(sheetId: string): boolean { return ALLY_ANIM_SET.includes(sheetId); }
export function hasMonsterAnim(art: string): boolean { return MONSTER_ANIM_SET.includes(art); }

/** speed — 전투 배속(×2 면 공격·피격을 반 시간에). 빠른 동료(0.6초 간격)가 ×2 에서 0.3초마다 공격해 560ms 공격이 임팩트 전에 다시 시작됐다 */
export function allyAnimStyle(sheetId: string, action: AllyAnimAction, delayMs = 0, speed = 1): CSSProperties {
  const L = ANIM_LAYOUT.ally, a = L.actions[action];
  const ms = a.loop ? a.ms : a.ms / Math.max(1, speed);
  return sheetAnimStyle(assetUrl(`titans/anim/allies/${sheetId}.webp`), L.cols, Object.keys(L.actions).length, a.row, a.frames, ms, a.loop, a.loop ? delayMs : 0);
}
/** boss — 대장이면 큰 칸(576²) 시트(있을 때). 칸 배치는 같고 그림만 크다 */
export function monsterAnimStyle(art: string, action: MonsterAnimAction, delayMs = 0, boss = false): CSSProperties {
  const L = ANIM_LAYOUT.monster, a = L.actions[action];
  return sheetAnimStyle(assetUrl(`titans/anim/${boss && MONSTER_HD[art] ? "monsters-hd" : "monsters"}/${art}.webp`), L.cols, Object.keys(L.actions).length, a.row, a.frames, a.ms, a.loop, a.loop ? delayMs : 0);
}
export const ALLY_ANIM_MS = { attack: ANIM_LAYOUT.ally.actions.attack.ms, hit: ANIM_LAYOUT.ally.actions.hit.ms } as const;

/** 주인공 — 칸은 JS(rAF)가 넘긴다(무기 앵커가 칸마다 따라가야 해서). 2판 시트가 없으면 1판(4칸 PNG) */
export const HERO_ANIM = HERO_ANIM_READY;
export function heroFrames(mode: HeroAnimMode): number { return HERO_ANIM ? ANIM_LAYOUT.hero.sheets[mode].frames : 4; }
export function heroFrameMs(mode: HeroAnimMode): number {
  if (!HERO_ANIM) return mode === "attack" ? 105 : 240;
  const s = ANIM_LAYOUT.hero.sheets[mode];
  return s.ms / s.frames;
}
/** 공격 칸 중 임팩트(무기가 적에 닿는 칸) — 결과 화면처럼 한 장만 보일 때 쓴다 */
export const HERO_ATTACK_IMPACT = HERO_ANIM ? 4 : 3;
