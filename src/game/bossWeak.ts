/**
 * 성문 방어 보스 약점 (2026-10-08, Galactic Outlaw 루프 ④).
 *
 * 보스가 나오면 **장착한 스킬 무기** 중 하나가 약점이 되고, 파편 패턴이 나올 때(3처치마다) 다른 무기로 바뀐다.
 * 약점 무기의 명중은 처치 수를 1 더 깎고 "약점!" 이 뜬다 — 4칸 적재가 보스에서 시험받는다.
 * 장착 무기가 없으면(기본 사격뿐) 약점은 없다 — 기본 사격은 보스에 흠집도 못 내는 규칙 그대로.
 */
import type { Element } from "./skills";

export const DODGE_WEAK_EXTRA_POWER = 1;

/**
 * 다음 약점 — 장착 순서대로 돈다(직전의 다음 무기). 난수를 안 쓴다: 봇 시뮬(dodge-sim)의 시드 수열을 연출이 움직이면 안 되고,
 * 플레이어도 "다음 약점"을 읽을 수 있다. 무기가 하나뿐이면 그것. 없으면 null. seed 는 첫 창의 시작 무기(스테이지 번호)
 */
export function rollDodgeWeak(loadout: Element[], prev: Element | null, seed = 0): Element | null {
  const pool = loadout.filter((e) => e !== "basic");
  if (pool.length === 0) return null;
  const at = prev ? (pool as Element[]).indexOf(prev) : -1;
  if (at < 0) return pool[Math.abs(Math.floor(seed)) % pool.length];
  return pool[(at + 1) % pool.length];
}

/** 이번 런에서 쏘는 무기(runSkills)를 Element 목록으로 — 화살비(ultimate)는 무기가 아니다 */
export function loadoutElements(runSkills: Partial<Record<string, boolean>>): Element[] {
  return (Object.keys(runSkills) as string[]).filter((k) => runSkills[k] && k !== "ultimate") as Element[];
}
