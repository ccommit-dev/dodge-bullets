import type { CSSProperties } from "react";
import { assetUrl } from "../asset";
import type { HuntingAreaDef, TitanHeroId, TitanMonsterKind } from "./model";

const ALLY_SHEET = assetUrl("titans/generated/ally-roster.png");

const MONSTER_ASSET: Record<Exclude<TitanMonsterKind, "boss">, string> = {
  slime: assetUrl("titans/generated/monsters/slime.png"),
  goblin: assetUrl("titans/generated/monsters/goblin.png"),
  wolf: assetUrl("titans/generated/monsters/shadow-wolf-clean.png"),
  ogre: assetUrl("titans/generated/monsters/ogre.png"),
  dragon: assetUrl("titans/generated/monsters/dragon.png"),
};

const BOSS_ASSET: Record<string, string> = {
  meadow: assetUrl("titans/generated/monsters/moss-golem-clean.png"),
  forest: assetUrl("titans/generated/monsters/moon-wolf-king-clean.png"),
  ruins: assetUrl("titans/generated/monsters/wolf-king-clean.png"),
  volcano: assetUrl("titans/generated/monsters/flame-wyvern-clean.png"),
  abyss: assetUrl("titans/generated/monsters/abyss-titan.png"),
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
  golden = false,
}: {
  kind: TitanMonsterKind;
  area: HuntingAreaDef;
  boss: boolean;
  golden?: boolean;
}) {
  const asset = golden ? assetUrl("titans/generated/monsters/golden-lion-clean.png") : boss ? (BOSS_ASSET[area.id] ?? BOSS_ASSET.abyss) : MONSTER_ASSET[kind as Exclude<TitanMonsterKind, "boss">];
  return (
    <div key={asset} className="titan-monster-art"><img src={asset} alt="" /></div>
  );
}

export function AllyArt({ id, attacking = false, pulse = 0 }: { id: TitanHeroId; attacking?: boolean; pulse?: number }) {
  const ranged = id === "leon" || id === "sera";
  return (
    <div className={`titan-ally-art ally-${id} ${attacking && pulse > 0 ? "is-attacking" : ""}`}>
      <div className="ally-body" style={sheetStyle(ALLY_SHEET, allyIndex[id], 6)} />
      {attacking && pulse > 0 && <i key={`fx-${pulse}`} className={`ally-attack-fx ${ranged ? "ranged" : "melee"}`} aria-hidden="true" />}
    </div>
  );
}
