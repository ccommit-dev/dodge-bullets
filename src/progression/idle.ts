/**
 * 방치 산출 공식 — S · R · M · T
 *
 *   초당 산출 = killGold(S) × R × M      누적 상한 = T 시간
 *
 *   S  현재 사냥터 스테이지   ← titans      · 상한 지역은 dodge가 연다
 *   R  방치 효율 (기본 0.10)  ← beat        · 스킬 슬롯 해금 → 최대 0.25
 *   M  산출 배율 (기본 1.00)  ← forge + 환생 + 성벽 → 최대 3.00
 *   T  누적 시간 캡 (기본 8h) ← dodge + 출석 → 최대 14h
 *
 * 4개 콘텐츠가 서로 다른 변수 하나씩을 담당한다. 자세한 근거는 IDLE_REDESIGN.md.
 */
import type { SkillId } from "../beat/rpg";
import {
  HUNTING_AREAS,
  killGold,
  type TitanSkillId,
  type TitanSkillSlot,
} from "../titans/model";
import { STAGES } from "../game/stages";
import type { CharacterProgress } from "./model";

/** 일반 화살 원정 스테이지 수 — T 보너스의 상한 근거. */
const DODGE_STAGE_COUNT = STAGES.length;

export const IDLE = {
  /** 현행 `awaySeconds / 10`과 동일한 출발점. 밸런스를 깨지 않는다. */
  baseRate: 0.1,
  rateCap: 0.25,
  /** 슬롯 레벨 1당 효율 가산. 전 슬롯 3레벨(합 15) → +0.18 → 상한 절삭. */
  ratePerSlotLevel: 0.012,
  multCap: 3,
  /** bestForgeLevel 최대 15 → +0.90 */
  multPerForgeLevel: 0.06,
  /** 첫 환생 지급량이 16개라 0.05면 즉시 상한을 친다. IDLE_REDESIGN.md 4.2 참조. */
  multPerCrystal: 0.01,
  /** 끝없는 성벽 100층당 +0.05, 최대 +0.50 */
  multPerTowerHundred: 0.05,
  multTowerCap: 0.5,
  /** 무한 재련 1등급당 +0.02 — 상한(multCap)이 유일한 천장이다. */
  multPerReforgeRank: 0.02,
  hoursBase: 8,
  hoursPerDodgeStage: 1,
  attendanceHoursCap: 2,
  hoursCap: 14,
  /** 시간당 강화석 상한 */
  materialsPerHourCap: 20,
  expPerStageSecond: 0.015,
} as const;

/** 비트 스킬 → 타이탄 스킬 슬롯. 5:5로 정확히 대응한다. */
export const SLOT_BY_BEAT_SKILL: Record<SkillId, TitanSkillSlot> = {
  kick: "starter",
  hat: "linkA",
  snare: "linkB",
  fire: "finisher",
  throat: "passive",
};

export const BEAT_SKILL_BY_SLOT: Record<TitanSkillSlot, SkillId> = {
  starter: "kick",
  linkA: "hat",
  linkB: "snare",
  finisher: "fire",
  passive: "throat",
};

/** 슬롯 레벨 해금 임계값 — 비트 숙련 5 / 15 / 30 */
export const SLOT_THRESHOLDS = [5, 15, 30] as const;

export function slotLevelFromMastery(mastery: number): number {
  const m = Math.max(0, Math.floor(mastery));
  if (m >= SLOT_THRESHOLDS[2]) return 3;
  if (m >= SLOT_THRESHOLDS[1]) return 2;
  if (m >= SLOT_THRESHOLDS[0]) return 1;
  return 0;
}

/** 다음 슬롯 레벨까지 남은 숙련. 최대 레벨이면 null. */
export function masteryToNextSlotLevel(mastery: number): number | null {
  const level = slotLevelFromMastery(mastery);
  if (level >= 3) return null;
  return SLOT_THRESHOLDS[level] - Math.max(0, Math.floor(mastery));
}

export function slotLevels(progress: CharacterProgress): Record<TitanSkillSlot, number> {
  return {
    starter: slotLevelFromMastery(progress.beatSkills.kick),
    linkA: slotLevelFromMastery(progress.beatSkills.hat),
    linkB: slotLevelFromMastery(progress.beatSkills.snare),
    finisher: slotLevelFromMastery(progress.beatSkills.fire),
    passive: slotLevelFromMastery(progress.beatSkills.throat),
  };
}

/**
 * 활성 슬롯 레벨 합 — 비트로 해금하고 타이탄에서 장착한 슬롯만 계산된다.
 * 둘 중 하나만 해도 효율이 오르지 않는 것이 연계의 핵심이다.
 */
export function activeSlotLevelSum(
  progress: CharacterProgress,
  equipped: Partial<Record<TitanSkillSlot, TitanSkillId>>,
): number {
  const levels = slotLevels(progress);
  return (Object.keys(levels) as TitanSkillSlot[]).reduce(
    (sum, slot) => sum + (equipped[slot] ? levels[slot] : 0),
    0,
  );
}

/** R — 방치 효율. beat가 올린다. */
export function idleRate(
  progress: CharacterProgress,
  equipped: Partial<Record<TitanSkillSlot, TitanSkillId>>,
): number {
  const arcane = progress.evolutionPath === "arcane" ? 0.03 : 0;
  const raw =
    IDLE.baseRate + activeSlotLevelSum(progress, equipped) * IDLE.ratePerSlotLevel + arcane;
  return Math.min(IDLE.rateCap, raw);
}

/** M — 산출 배율. forge · 환생 · 끝없는 성벽이 올린다. */
export function idleMultiplier(progress: CharacterProgress): number {
  const forge = progress.bestForgeLevel * IDLE.multPerForgeLevel;
  const crystals = progress.inheritanceCrystals * IDLE.multPerCrystal;
  const tower = Math.min(
    IDLE.multTowerCap,
    Math.floor(progress.towerBestFloor / 100) * IDLE.multPerTowerHundred,
  );
  const reforge = progress.reforgeRank * IDLE.multPerReforgeRank;
  const evolution = progress.evolutionPath === "swordmaster" ? 0.15 : 0;
  return Math.min(IDLE.multCap, 1 + forge + crystals + tower + reforge + evolution);
}

/**
 * T — 누적 시간 캡(시간). dodge 원정 + 출석이 늘린다.
 *
 * `dodgeBestStage`는 성벽 등반으로도 올라가므로 일반 원정 4스테이지분으로 잘라 낸다.
 * 성벽의 기여는 T가 아니라 M(`towerBestFloor`)이다 — 한 콘텐츠가 두 변수를 먹으면 공식이 무너진다.
 */
export function idleCapHours(progress: CharacterProgress): number {
  const dodge = Math.min(DODGE_STAGE_COUNT, progress.dodgeBestStage) * IDLE.hoursPerDodgeStage;
  const attendance = Math.min(IDLE.attendanceHoursCap, Math.floor(progress.attendanceStreak / 3));
  const evolution = progress.evolutionPath === "guardian" ? 2 : 0;
  return Math.min(IDLE.hoursCap, IDLE.hoursBase + dodge + attendance + evolution);
}

/** 개척된 지역 인덱스(1~5)에서 진입 가능한 최대 스테이지. */
export function stageCeilingFor(pioneeredArea: number): number {
  const index = Math.max(1, Math.min(HUNTING_AREAS.length, Math.floor(pioneeredArea))) - 1;
  return HUNTING_AREAS[index].stageTo;
}

/** 다음 지역을 열기 위해 클리어해야 하는 화살 원정 스테이지 번호(1-based). */
export function requiredDodgeStage(pioneeredArea: number): number | null {
  const next = Math.floor(pioneeredArea) + 1;
  return next > HUNTING_AREAS.length ? null : next - 1;
}

export function nextAreaName(pioneeredArea: number): string | null {
  const index = Math.floor(pioneeredArea);
  return index >= HUNTING_AREAS.length ? null : HUNTING_AREAS[index].name;
}

export type IdleYield = {
  gold: number;
  exp: number;
  materials: number;
  /** 실제로 정산된 초 (캡 적용 후) */
  seconds: number;
  /** 캡에 걸려 버려진 초 */
  wastedSeconds: number;
  cappedOut: boolean;
  rate: number;
  multiplier: number;
  capHours: number;
};

export function computeIdleYield(
  progress: CharacterProgress,
  stage: number,
  equipped: Partial<Record<TitanSkillSlot, TitanSkillId>>,
  awaySeconds: number,
): IdleYield {
  const rate = idleRate(progress, equipped);
  const multiplier = idleMultiplier(progress);
  const capHours = idleCapHours(progress);
  const capSeconds = capHours * 3600;
  const raw = Math.max(0, Math.floor(awaySeconds));
  const seconds = Math.min(capSeconds, raw);
  const safeStage = Math.max(1, Math.floor(stage));

  const gold = Math.floor(killGold(safeStage, false, false) * rate * multiplier * seconds);
  const exp = Math.floor(safeStage * IDLE.expPerStageSecond * multiplier * seconds);
  const perHour = Math.min(IDLE.materialsPerHourCap, 2 + Math.floor(safeStage / 4));
  const materials = Math.floor((perHour * multiplier * seconds) / 3600);

  return {
    gold,
    exp,
    materials,
    seconds,
    wastedSeconds: raw - seconds,
    cappedOut: raw > capSeconds,
    rate,
    multiplier,
    capHours,
  };
}

export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h <= 0) return `${m}분`;
  if (m <= 0) return `${h}시간`;
  return `${h}시간 ${m}분`;
}

export type IdleBottleneck = {
  variable: "S" | "R" | "M" | "T";
  title: string;
  hint: string;
  content: "titans" | "beat" | "forge" | "dodge";
};

/**
 * 복귀 모달에서 "지금 가장 아쉬운 변수" 하나를 짚어 준다.
 * 4개 콘텐츠 중 방치하고 있는 쪽으로 유저를 밀어내는 장치.
 */
export function idleBottleneck(
  progress: CharacterProgress,
  result: IdleYield,
  stage: number,
  pioneeredArea: number,
): IdleBottleneck {
  if (result.cappedOut) {
    // T를 더 늘릴 수 없으면 dodge로 보내 봐야 소용이 없다.
    // 그때는 자주 들어오는 것 말고 방법이 없으므로 균열(즉시 정산)로 안내한다.
    const canExtend =
      result.capHours < IDLE.hoursCap && progress.dodgeBestStage < DODGE_STAGE_COUNT;
    return {
      variable: "T",
      title: `방치 시간이 ${result.capHours}시간에서 잘렸습니다`,
      hint: canExtend
        ? `화살 원정 Stage ${Math.min(DODGE_STAGE_COUNT, progress.dodgeBestStage + 1)} 클리어 → +1시간`
        : `이미 최대 ${IDLE.hoursCap}시간입니다 · 차원 균열로 즉시 정산하세요`,
      content: canExtend ? "dodge" : "titans",
    };
  }
  if (stage >= stageCeilingFor(pioneeredArea)) {
    const area = nextAreaName(pioneeredArea);
    return {
      variable: "S",
      title: `${area ?? "다음 지역"} 앞에서 막혀 있습니다`,
      hint: `화살 원정 Stage ${requiredDodgeStage(pioneeredArea) ?? DODGE_STAGE_COUNT} 클리어 → 길이 열립니다`,
      content: "dodge",
    };
  }
  if (result.rate < IDLE.rateCap) {
    return {
      variable: "R",
      title: `방치 효율 ${(result.rate * 100).toFixed(0)}% · 최대 ${IDLE.rateCap * 100}%`,
      hint: "연습실에서 비트 숙련을 올려 스킬 슬롯을 해금하세요",
      content: "beat",
    };
  }
  // M도 상한에 닿으면 더 올릴 수 없다 — 그때 대장간으로 보내면 헛걸음이다.
  if (result.multiplier >= IDLE.multCap) {
    return {
      variable: "S",
      title: `모든 배율이 최대입니다 (×${IDLE.multCap})`,
      hint: "사냥터 스테이지를 올리는 것만이 남은 성장선입니다",
      content: "titans",
    };
  }
  return {
    variable: "M",
    title: `산출 배율 ×${result.multiplier.toFixed(2)} · 최대 ×${IDLE.multCap}`,
    hint:
      progress.bestForgeLevel < 15
        ? `대장간 강화 +${progress.bestForgeLevel} → +15 (강화 1단계당 +0.06)`
        : "무한 재련으로 배율을 더 올릴 수 있습니다",
    content: "forge",
  };
}
