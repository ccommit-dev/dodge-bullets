/**
 * 성문 방어 2택 사건 (2026-10-13, docs/FOCUS_CAPYGO P1 — 카피바라 Go! "다음 날" 리듬: 손은 적고 결정은 잦게).
 *
 * 한 판에 두 번 — 시작 직후 1개, 장 대장/중간 대장 웨이브 직전 1개. 스테이지 번호로 결정적(같은 판은 같은 사건).
 * 효과는 이번 판에만 듣는 RunMods·세계 값이라 밸런스 축(스킬 레벨·장비)은 건드리지 않는다.
 *   시작(긴 공성)   휴식: 방어막 +20%          vs 강행: 레벨업 카드 1장 즉시
 *   시작(짧은 돌격) 통과: 코인 +5%(결과)       vs 상인: 인장 10 → 카드 1장
 *   시작(타워형)    강행: 카드 1장 먼저         vs 휴식: 방어막 +20%   (스테이지 타입은 stages.stageType)
 *   대장 직전              천사: 피해 ×1.3          vs 악마: 피해 ×1.6 · 방어막 피해 ×1.25
 */
import type { GameWorld } from "./types";
import { getStage, isBranchIndex, stageType, towerFloorOf } from "./stages";

export type DayEventPhase = "start" | "boss";
export type DayEventChoice = {
  id: "rest" | "push" | "merchant" | "pass" | "angel" | "demon";
  label: string;
  desc: string;
  /** 인장 비용 (상인) — App 이 진행도에서 뺀다. 모자라면 비활성 */
  seals?: number;
};
export type DayEvent = { id: "rest-or-push" | "merchant" | "pact"; phase: DayEventPhase; title: string; choices: [DayEventChoice, DayEventChoice] };

export const MERCHANT_SEALS = 10;
export const DAY_EVENT = {
  restBarrier: 0.2,
  angelDamage: 1.3,
  demonDamage: 1.6,
  demonBarrierTaken: 1.25,
  passCoinBonus: 0.05,
} as const;

/** 본선 스테이지만 — 갈림길·성벽은 사건 없음(정예·연속 돌파 자체가 장치) */
export function dayEventFor(stageIndex: number, phase: DayEventPhase): DayEvent | null {
  if (isBranchIndex(stageIndex) || towerFloorOf(stageIndex) > 0) return null;
  const stage = getStage(stageIndex);
  if (phase === "boss") {
    if (stage.slotKind !== "boss" && stage.slotKind !== "midboss") return null;
    return {
      id: "pact", phase, title: "대장이 온다 — 누구와 손잡을까",
      choices: [
        { id: "angel", label: "천사의 가호", desc: `이번 판 화살 피해 ×${DAY_EVENT.angelDamage}` },
        { id: "demon", label: "악마의 계약", desc: `화살 피해 ×${DAY_EVENT.demonDamage} · 방어막이 받는 피해 ×${DAY_EVENT.demonBarrierTaken}` },
      ],
    };
  }
  const type = stageType(stageIndex);
  const rest: DayEventChoice = { id: "rest", label: "휴식", desc: `방어막 +${Math.round(DAY_EVENT.restBarrier * 100)}% 로 시작` };
  const push: DayEventChoice = { id: "push", label: "강행", desc: "레벨업 카드 1장을 바로 고른다" };
  if (type === "long") return { id: "rest-or-push", phase, title: "긴 공성 — 쉴까, 서두를까", choices: [rest, push] };
  if (type === "tower") return { id: "rest-or-push", phase, title: "타워형 — 카드를 먼저 쥐고 정예를 받는다", choices: [push, rest] };
  return {
    id: "merchant", phase, title: "짧은 돌격 — 길가의 상인",
    choices: [
      // 첫 번째가 기본값(시작을 그냥 누르면 이것) — 카드가 열리는 쪽은 두 번째에 둔다
      { id: "pass", label: "통과", desc: `이번 판 코인 +${Math.round(DAY_EVENT.passCoinBonus * 100)}%` },
      { id: "merchant", label: `인장 ${MERCHANT_SEALS}`, desc: "레벨업 카드 1장을 바로 고른다", seals: MERCHANT_SEALS },
    ],
  };
}

/** 선택을 세계에 적용한다 — 인장 차감은 App 몫(여기선 세계만) */
export function applyDayChoice(world: GameWorld, choice: DayEventChoice["id"]): void {
  switch (choice) {
    case "rest": world.barrierHp = Math.min(world.barrierMaxHp, world.barrierHp + world.barrierMaxHp * (DAY_EVENT.restBarrier + (world.restBonus || 0))); break;   // restBonus: 특성 황야 서바이벌
    case "push": case "merchant": world.levelUps += 1; break;
    case "pass": world.coinBonusMul += DAY_EVENT.passCoinBonus; break;
    case "angel": world.runMods.damageMul *= DAY_EVENT.angelDamage; break;
    case "demon": world.runMods.damageMul *= DAY_EVENT.demonDamage; world.barrierTakenMul *= DAY_EVENT.demonBarrierTaken; break;
  }
}
