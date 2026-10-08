/**
 * 사냥터 보스 약점 (2026-10-08, Galactic Outlaw 루프 ④ "보스는 HP 스펀지가 아니다").
 *
 * 보스전이 시작되면 약점 속성이 하나 켜지고 WEAK_WINDOW_MS 마다 다른 속성으로 바뀐다 (30초 보스전에 3~4번).
 * 약점 속성의 **스킬**(불·바람·땅 스킬)과 **같은 속성 동료**(ALLY_ELEMENT)가 때리면 피해가 뛴다 —
 * 어떤 스킬을 장착하고 어떤 동료를 편성했는가(빌드)가 보스에서 시험받는다. 제한시간은 그대로다.
 */
import type { TitanHeroId } from "./model";
import { ALLY_ELEMENT } from "./allies";

/** 스킬 element 와 동료 element 가 겹치는 세 속성만 약점이 된다 — 둘 다 답이 있어야 공정하다 */
export type WeakElement = "fire" | "wind" | "earth";
export const WEAK_ELEMENTS: WeakElement[] = ["fire", "wind", "earth"];
export const WEAK_LABEL: Record<WeakElement, string> = { fire: "불", wind: "바람", earth: "땅" };
export const WEAK_WINDOW_MS = 8000;
/** 약점 명중 배수 — 탭은 해당 없음(속성이 없다). huntMods.weakBonus 가 더해진다 */
export const WEAK_MUL = 1.6;

export type BossWeak = { element: WeakElement; until: number; seq: number; /** 창 길이(ms) — 배지 링 애니메이션은 이 값만 읽어 렌더마다 다시 시작하지 않는다 */ windowMs: number };

/** 새 약점 — 직전과 다른 속성. seq 는 "몇 번째 창인가"(화면 애니메이션 키) */
export function rollBossWeak(now: number, prev: BossWeak | null, rng: () => number = Math.random, windowMs = WEAK_WINDOW_MS): BossWeak {
  const pool = prev ? WEAK_ELEMENTS.filter((e) => e !== prev.element) : WEAK_ELEMENTS;
  const element = pool[Math.floor(rng() * pool.length)] ?? "fire";
  return { element, until: now + windowMs, seq: (prev?.seq ?? 0) + 1, windowMs };
}

export function weakActive(weak: BossWeak | null, now: number): weak is BossWeak {
  return !!weak && now < weak.until;
}

/** 스킬 속성이 약점과 맞는가 — blade·light 는 약점이 될 수 없다 */
export function skillHitsWeak(weak: BossWeak | null, element: string, now: number): boolean {
  return weakActive(weak, now) && weak.element === element;
}

export function allyHitsWeak(weak: BossWeak | null, ally: TitanHeroId, now: number): boolean {
  return weakActive(weak, now) && ALLY_ELEMENT[ally] === weak.element;
}

/** 편성에서 약점 속성과 같은 동료 수 — 편성 화면 칩("약점 상성 동료 n") */
export function partyWeakMatches(party: TitanHeroId[], element: WeakElement): number {
  return party.filter((id) => ALLY_ELEMENT[id] === element).length;
}
