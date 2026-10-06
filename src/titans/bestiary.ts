/**
 * 몬스터 목록 (2026-10-06, 사용자: "리소스랑 몬스터 종류가 너무 적음 -> 성벽원정, 자동사냥 던전에 몬스터나 보스 몬스터 리소스 x3 배 신규 추가").
 *
 * 예전 렌더되던 원화 11장(일반 5 · 지역 보스 5 · 황금 사자) 위에 새 원화 20장(일반 변종 10 · 대장 10)을 얹어 31장.
 * 일반 몬스터는 **종류(kind)는 그대로** 지역 변종 그림만 바뀐다 — 체력·속도·판정·보상은 종류가 정하므로 밸런스가 그대로다.
 * 사냥터: 지역 × 종류마다 변종을 스테이지 번호로 돌려 고르고, 지역 보스는 셋을 돌린다(첫 스테이지는 대표 보스).
 * 성문 방어: draw.ts MONSTER_VARIANTS(장 × 종류) · 중간 보스 · 비밀 대장(stages.ts bossArt).
 */
import type { HuntingAreaDef, TitanMonsterKind } from "./model";

export type MonsterArtDef = { art: string; name: string };
type NormalKind = Exclude<TitanMonsterKind, "boss">;

/** 사냥터 지역 × 종류 → 변종 (첫째가 그 지역의 대표) */
export const HUNT_VARIANTS: Record<string, Partial<Record<NormalKind, MonsterArtDef[]>>> = {
  meadow: {
    slime: [{ art: "slime", name: "슬라임" }],
    goblin: [{ art: "goblin", name: "고블린" }, { art: "goblin-shaman", name: "고블린 주술사" }],
  },
  forest: {
    goblin: [{ art: "goblin-shaman", name: "고블린 주술사" }, { art: "goblin", name: "고블린" }],
    wolf: [{ art: "frost-wolf", name: "서리 늑대" }, { art: "shadow-wolf-clean", name: "그림자 늑대" }],
  },
  ruins: {
    wolf: [{ art: "shadow-wolf-clean", name: "그림자 늑대" }, { art: "skeleton-goblin", name: "해골 고블린" }],
    ogre: [{ art: "stone-troll", name: "바위 트롤" }, { art: "ogre", name: "오우거" }],
  },
  volcano: {
    ogre: [{ art: "ogre", name: "오우거" }, { art: "magma-imp", name: "용암 임프" }],
    dragon: [{ art: "lava-drake", name: "용암 드레이크" }, { art: "hellhound", name: "지옥견" }],
  },
  abyss: {
    dragon: [{ art: "storm-drake", name: "폭풍 드레이크" }, { art: "dragon", name: "보라 비룡" }],
    wolf: [{ art: "hellhound", name: "지옥견" }, { art: "void-imp", name: "공허 임프" }],
    ogre: [{ art: "armored-ogre", name: "철갑 오우거" }, { art: "ogre", name: "오우거" }],
  },
};

/** 사냥터 지역 보스 — 대표 · 중간 보스 · 숨은 대장 (원정 장과 같은 얼굴들) */
export const HUNT_BOSSES: Record<string, MonsterArtDef[]> = {
  meadow: [{ art: "moss-golem-clean", name: "이끼 골렘" }, { art: "thorn-boar-king", name: "가시 멧돼지 왕" }, { art: "goblin-warlord", name: "고블린 대족장" }],
  forest: [{ art: "moon-wolf-king-clean", name: "월광 늑대왕" }, { art: "ancient-treant", name: "고목 수호자" }, { art: "spider-queen", name: "독거미 여왕" }],
  ruins: [{ art: "wolf-king-clean", name: "고대 오우거" }, { art: "ruin-sentinel", name: "폐허의 파수 기사" }, { art: "minotaur", name: "미노타우로스" }],
  volcano: [{ art: "flame-wyvern-clean", name: "화염 비룡" }, { art: "magma-golem", name: "용암 골렘" }, { art: "fire-demon", name: "화염 마신" }],
  abyss: [{ art: "abyss-titan", name: "심연의 타이탄" }, { art: "void-lich", name: "공허의 리치" }, { art: "bone-dragon", name: "해골 용" }],
};

/** 사냥터 일반 몬스터 변종 — 같은 종류가 다음에 나올 때 다음 변종 */
export function huntMonsterVariant(kind: NormalKind, area: HuntingAreaDef, stage: number): MonsterArtDef | null {
  const list = HUNT_VARIANTS[area.id]?.[kind];
  if (!list || list.length === 0) return null;
  const turn = Math.floor((Math.max(1, stage) - 1) / Math.max(1, area.normalKinds.length));
  return list[turn % list.length];
}

/** 사냥터 지역 보스 — 지역 첫 스테이지는 대표, 이후 셋을 돌린다 */
export function huntBossVariant(area: HuntingAreaDef, stage: number): MonsterArtDef {
  const list = HUNT_BOSSES[area.id] ?? HUNT_BOSSES.abyss;
  return list[Math.max(0, stage - area.stageFrom) % list.length];
}

/** 도감에 싣는 모든 얼굴 (중복 그림은 한 번) — 사냥터 · 성문 방어 공용 */
export function bestiaryEntries(): Array<MonsterArtDef & { boss: boolean; area: string }> {
  const seen = new Set<string>();
  const out: Array<MonsterArtDef & { boss: boolean; area: string }> = [];
  for (const [area, kinds] of Object.entries(HUNT_VARIANTS)) {
    for (const list of Object.values(kinds)) for (const m of list ?? []) if (!seen.has(m.art)) { seen.add(m.art); out.push({ ...m, boss: false, area }); }
  }
  for (const [area, list] of Object.entries(HUNT_BOSSES)) for (const m of list) if (!seen.has(m.art)) { seen.add(m.art); out.push({ ...m, boss: true, area }); }
  return out;
}

/** 새로 더한 원화 20장 (2026-10-06) — 검증이 '그리는 곳이 있는지'를 본다 */
export const NEW_MONSTER_ARTS = [
  "magma-imp", "void-imp", "goblin-shaman", "skeleton-goblin", "frost-wolf", "hellhound", "stone-troll", "armored-ogre", "lava-drake", "storm-drake",
  "thorn-boar-king", "ancient-treant", "ruin-sentinel", "magma-golem", "void-lich", "goblin-warlord", "spider-queen", "minotaur", "fire-demon", "bone-dragon",
];
