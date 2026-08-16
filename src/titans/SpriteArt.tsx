import type { CSSProperties } from "react";
import type { HuntingAreaDef, TitanHeroId, TitanMonsterKind } from "./model";

const ALLY_SHEET = "/titans/generated/ally-roster.png";

const monsterFiles = [
  "slime", "goblin", "wolf", "ogre", "dragon",
  "moss-golem", "wolf-king", "ogre-king", "flame-wyvern", "abyss-titan",
];

const normalIndex: Record<Exclude<TitanMonsterKind, "boss">, number> = {
  slime: 0,
  goblin: 1,
  wolf: 2,
  ogre: 3,
  dragon: 4,
};

const bossIndex: Record<string, number> = {
  meadow: 5,
  forest: 6,
  ruins: 7,
  volcano: 8,
  abyss: 9,
};

const allyIndex: Record<TitanHeroId, number> = {
  mia: 0,
  leon: 1,
  sera: 2,
  garen: 3,
  ari: 4,
  nox: 5,
};

function sheetStyle(url: string, index: number, count: number): CSSProperties {
  return {
    backgroundImage: `url(${url})`,
    backgroundSize: `${count * 100}% 100%`,
    backgroundPosition: `${(index / (count - 1)) * 100}% 0`,
  };
}

export function MonsterArt({
  kind,
  area,
  boss,
}: {
  kind: TitanMonsterKind;
  area: HuntingAreaDef;
  boss: boolean;
}) {
  const index = boss ? (bossIndex[area.id] ?? 9) : normalIndex[kind as Exclude<TitanMonsterKind, "boss">];
  return (
    <div
      className="titan-monster-art"
      style={{ backgroundImage: `url(/titans/generated/monsters/${monsterFiles[index]}.png)` }}
    />
  );
}

export function AllyArt({ id, attacking = false }: { id: TitanHeroId; attacking?: boolean }) {
  return (
    <div className={`titan-ally-art ${attacking ? "attacking" : ""}`}>
      <div style={sheetStyle(ALLY_SHEET, allyIndex[id], 6)} />
    </div>
  );
}
