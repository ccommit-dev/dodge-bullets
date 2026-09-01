/**
 * 펫 「도감의 아이들」 (CRUMBLE_GAP §1)
 *
 * 몬스터 도감이 펫의 알이다 — 종별 1,000마리 처치(도감 최종 마일스톤) 시
 * 그 몬스터의 아기 버전이 부화한다. 신규 파밍 루프 없이 기존 킬 카운터에
 * 목적을 부여하고, 아트도 몬스터 이미지의 축소·순화(CSS)로 파생한다.
 *
 * 크럼블 참조점: 펫은 "도감 등록만으로 영구 능력치"(더뷰어스) — 부화 자체가
 * 영구 보너스(§7 도감 전투력)이고, 장착 펫 1마리가 액티브 패시브를 더한다.
 */
import type { TitanMonsterKind } from "./model";

export type PetId = TitanMonsterKind;

export const PET_HATCH_KILLS = 1000;
export const PET_MAX_LEVEL = 10;

export type PetDef = {
  id: PetId;
  name: string;
  /** 어느 축을 미는지 — 효과 적용처가 다르다 */
  passive: "gold" | "shard" | "bossTime" | "materials" | "capHours" | "multiplier";
  desc: string;
  /** 레벨 1 기본값 */
  base: number;
  /** 레벨당 증가 */
  perLevel: number;
  /** 표기 단위 */
  unit: string;
};

export const PET_DEFS: Record<PetId, PetDef> = {
  slime: { id: "slime", name: "아기 슬라임", passive: "gold", desc: "사냥 골드 증가", base: 0.05, perLevel: 0.01, unit: "%" },
  goblin: { id: "goblin", name: "꼬마 고블린", passive: "shard", desc: "방치 조각 드랍 가속", base: 0.25, perLevel: 0.05, unit: "%" },
  wolf: { id: "wolf", name: "아기 늑대", passive: "bossTime", desc: "보스 제한시간 연장", base: 3, perLevel: 0.5, unit: "초" },
  ogre: { id: "ogre", name: "꼬마 오우거", passive: "materials", desc: "방치 강화석 증가", base: 0.2, perLevel: 0.04, unit: "%" },
  dragon: { id: "dragon", name: "새끼 용", passive: "capHours", desc: "방치 시간 캡 연장", base: 1, perLevel: 0.1, unit: "시간" },
  boss: { id: "boss", name: "타이탄의 그림자", passive: "multiplier", desc: "방치 배율 증가", base: 0.05, perLevel: 0.01, unit: "" },
};

export const PET_IDS: PetId[] = ["slime", "goblin", "wolf", "ogre", "dragon", "boss"];

/** 펫 효과값 — 레벨 0 = 미부화 (효과 없음) */
export function petEffect(id: PetId, level: number): number {
  if (level <= 0) return 0;
  const def = PET_DEFS[id];
  return def.base + def.perLevel * (Math.min(PET_MAX_LEVEL, level) - 1);
}

/** 장착 펫의 특정 패시브 값 — 장착 펫이 그 패시브가 아니면 0 */
export function activePetEffect(
  pets: Record<PetId, number>,
  activePet: string,
  passive: PetDef["passive"],
): number {
  const id = activePet as PetId;
  if (!PET_IDS.includes(id)) return 0;
  if (PET_DEFS[id].passive !== passive) return 0;
  return petEffect(id, pets[id] ?? 0);
}

/** 간식(강화석) 비용 — 다음 레벨로 */
export function petFeedCost(level: number): number | null {
  if (level >= PET_MAX_LEVEL) return null;
  return level * 20;
}

/** 킬 수 기준으로 새로 부화해야 하는 펫 목록 */
export function pendingHatches(
  monsterKills: Record<TitanMonsterKind, number>,
  pets: Record<PetId, number>,
): PetId[] {
  return PET_IDS.filter((id) => (pets[id] ?? 0) <= 0 && (monsterKills[id] ?? 0) >= PET_HATCH_KILLS);
}
