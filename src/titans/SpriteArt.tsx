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

/** 동료 무기 실루엣 — `.ally-weapon-part` 스트로크 스타일에 맞춘 라인 아트. */
function AllyWeapon({ id }: { id: TitanHeroId }) {
  return (
    <svg className="ally-weapon-part" viewBox="0 0 40 60" aria-hidden="true">
      {id === "mia" && (
        <>
          <path d="M20 8 L20 36" />
          <path d="M12 36 H28" />
          <path className="fill" d="M17 36 h6 v13 h-6 z" />
        </>
      )}
      {id === "leon" && (
        <>
          <path d="M13 8 Q36 30 13 52" />
          <path d="M13 8 L13 52" strokeWidth={2.4} />
        </>
      )}
      {id === "sera" && (
        <>
          <path d="M20 16 L20 54" />
          <circle className="orb" cx="20" cy="10" r="7" />
        </>
      )}
      {id === "garen" && (
        <>
          <path className="fill" d="M20 4 L27 40 H13 Z" />
          <path d="M9 42 H31" />
          <path d="M20 42 V56" />
        </>
      )}
      {id === "ari" && (
        <>
          <path d="M20 12 L20 54" />
          <path className="fill" d="M20 2 L27 16 L20 12 L13 16 Z" />
        </>
      )}
      {id === "nox" && (
        <>
          <path d="M12 12 L12 36" />
          <path d="M28 12 L28 36" />
          <path d="M6 36 H18 M22 36 H34" />
        </>
      )}
    </svg>
  );
}

export function AllyArt({ id, attacking = false, pulse = 0 }: { id: TitanHeroId; attacking?: boolean; pulse?: number }) {
  const ranged = id === "leon" || id === "sera";
  return (
    <div className={`titan-ally-art ally-${id}`}>
      {/*
        구조가 3겹인 이유:
        - .ally-idle   대기 호흡(무한 루프). 인덱스별 음수 delay로 위상을 어긋나게 해
                       여섯 명이 메트로놈처럼 동시에 까딱거리지 않게 한다.
        - .ally-swing  타격 모션. pulse를 key로 걸어 매 공격마다 리마운트 →
                       CSS 애니메이션이 확실히 재시작된다. (클래스만 유지하면
                       최초 1회 재생 후 영영 다시 돌지 않는다.)
        - 무기 마운트는 스윙 안에 있어 몸과 함께 휘두른다.
      */}
      <div className="ally-idle" style={{ animationDelay: `${allyIndex[id] * -0.27}s` }}>
        <div key={`swing-${pulse}`} className={`ally-swing ${attacking && pulse > 0 ? "is-attacking" : ""}`}>
          <div className="ally-body" style={sheetStyle(ALLY_SHEET, allyIndex[id], 6)} />
          <i className="ally-weapon-mount">
            <AllyWeapon id={id} />
          </i>
        </div>
      </div>
      {attacking && pulse > 0 && <i key={`fx-${pulse}`} className={`ally-attack-fx ${ranged ? "ranged" : "melee"}`} aria-hidden="true" />}
    </div>
  );
}
