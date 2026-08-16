import type { CSSProperties } from "react";
import type { HuntingAreaDef, TitanHeroId, TitanMonsterKind } from "./model";

const ALLY_SHEET = "/titans/generated/ally-roster.png";

const monsterFiles = [
  "slime", "goblin", "wolf", "ogre", "dragon",
  "moss-golem-clean", "ogre-king-clean", "wolf-king-clean", "flame-wyvern-clean", "abyss-titan",
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

function AllyWeapon({ id }: { id: TitanHeroId }) {
  if (id === "leon") return <svg className="ally-weapon-part ranged" viewBox="0 0 80 80"><path d="M58 7Q12 40 58 73"/><path d="M58 7V73M18 40H75"/><path className="fill" d="m75 40-13-6v12z"/></svg>;
  if (id === "sera") return <svg className="ally-weapon-part staff" viewBox="0 0 80 120"><path d="M42 112 48 28"/><circle className="orb" cx="49" cy="19" r="14"/><path d="m37 21 12-18 13 18"/></svg>;
  if (id === "ari") return <svg className="ally-weapon-part spear" viewBox="0 0 80 140"><path d="M36 132 45 27"/><path className="fill" d="m46 2 16 29-18 13-13-16z"/></svg>;
  if (id === "nox") return <svg className="ally-weapon-part daggers" viewBox="0 0 100 100"><path className="fill" d="m12 82 28-55 8 9-20 57zm76 0L60 27l-8 9 20 57z"/></svg>;
  if (id === "garen") return <svg className="ally-weapon-part greatsword" viewBox="0 0 90 140"><path className="fill" d="m45 3 18 77-18 24-18-24z"/><path d="M16 92h58M45 94v40"/></svg>;
  return <svg className="ally-weapon-part shortsword" viewBox="0 0 70 120"><path className="fill" d="m35 4 13 68-13 18-13-18z"/><path d="M10 80h50M35 82v32"/></svg>;
}

export function AllyArt({ id, attacking = false, pulse = 0 }: { id: TitanHeroId; attacking?: boolean; pulse?: number }) {
  const ranged = id === "leon" || id === "sera";
  return (
    <div className={`titan-ally-art ally-${id} ${attacking && pulse > 0 ? "is-attacking" : ""}`}>
      <div className="ally-body" style={sheetStyle(ALLY_SHEET, allyIndex[id], 6)} />
      <span key={pulse} className="ally-weapon-mount" aria-hidden="true"><AllyWeapon id={id} /></span>
      {attacking && pulse > 0 && <i key={`fx-${pulse}`} className={`ally-attack-fx ${ranged ? "ranged" : "melee"}`} aria-hidden="true" />}
    </div>
  );
}
