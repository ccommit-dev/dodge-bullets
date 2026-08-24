import type { CSSProperties } from "react";
import { assetUrl } from "../asset";
import type { HuntingAreaDef, TitanHeroId, TitanMonsterKind } from "./model";

const ALLY_SHEET = assetUrl("titans/generated/ally-roster-weaponless-v2.png");

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

export function AllyArt({ id, attacking = false, pulse = 0, engaged = false, approaching = false }: { id: TitanHeroId; attacking?: boolean; pulse?: number; engaged?: boolean; approaching?: boolean }) {
  const ranged = id === "leon" || id === "sera";
  return (
    <div className={`titan-ally-art ally-${id} combat-${ranged ? "ranged" : "melee"} ${engaged ? "is-engaged" : ""} ${approaching ? "is-approaching" : ""}`}>
      {/*
        구조가 3겹인 이유:
        - .ally-idle   대기 호흡(무한 루프). 인덱스별 음수 delay로 위상을 어긋나게 해
                       여섯 명이 메트로놈처럼 동시에 까딱거리지 않게 한다.
        - .ally-swing  이동+타격 모션. pulse를 key로 걸어 매 공격마다 리마운트 →
                       CSS 애니메이션이 확실히 재시작된다. (클래스만 유지하면
                       최초 1회 재생 후 영영 다시 돌지 않는다.)
        - .ally-weapon은 무기 없는 베이스와 분리된 장착 파츠다. 근거리/원거리별
          피벗과 공격 궤적이 다르므로 몸을 흔들지 않고 무기만 자연스럽게 움직인다.
      */}
      <div className="ally-idle" style={{ animationDelay: `${allyIndex[id] * -0.27}s` }}>
        <div key={`swing-${pulse}`} className={`ally-swing ${attacking && pulse > 0 ? "is-attacking" : ""}`}>
          <div className="ally-body" style={sheetStyle(ALLY_SHEET, allyIndex[id], 6)} />
          <AllyWeapon id={id} />
        </div>
      </div>
      {attacking && pulse > 0 && <i key={`fx-${pulse}`} className={`ally-attack-fx ${ranged ? "ranged" : "melee"}`} aria-hidden="true" />}
    </div>
  );
}

function AllyWeapon({ id }: { id: TitanHeroId }) {
  const ranged = id === "leon" || id === "sera";
  return (
    <svg className={`ally-weapon weapon-${id} ${ranged ? "ranged" : "melee"}`} viewBox="0 0 100 100" aria-hidden="true">
      {id === "leon" ? (
        <>
          <path className="weapon-metal" d="M69 17 Q92 49 68 84" />
          <path className="weapon-string" d="M69 17 L47 51 L68 84" />
          <path className="weapon-accent" d="M47 51 L96 51 M88 46 L96 51 L88 56" />
        </>
      ) : id === "sera" ? (
        <>
          <path className="weapon-shaft" d="M55 92 L69 23" />
          <circle className="weapon-gem" cx="71" cy="18" r="10" />
          <path className="weapon-accent" d="M60 19 Q71 4 82 19 Q71 30 60 19" />
        </>
      ) : id === "ari" ? (
        <>
          <path className="weapon-shaft" d="M24 81 L78 27" />
          <path className="weapon-metal" d="M76 29 L91 9 L82 34 Z" />
          <path className="weapon-accent" d="M32 75 L24 88" />
        </>
      ) : id === "garen" ? (
        <>
          <path className="weapon-metal weapon-greatblade" d="M50 85 L61 36 L72 9 L76 38 L61 88 Z" />
          <path className="weapon-accent" d="M45 66 L70 71 M53 77 L45 92" />
        </>
      ) : id === "nox" ? (
        <>
          <path className="weapon-metal" d="M46 87 Q57 48 85 18 Q69 55 81 76 Q62 69 46 87 Z" />
          <path className="weapon-accent" d="M48 79 L39 91" />
        </>
      ) : (
        <>
          <path className="weapon-metal" d="M48 66 L74 23 L82 13 L78 28 L56 70 Z" />
          <path className="weapon-metal offhand" d="M35 68 L55 34 L62 26 L58 40 L43 72 Z" />
          <path className="weapon-accent" d="M43 66 L35 78 M54 69 L48 79" />
        </>
      )}
    </svg>
  );
}
