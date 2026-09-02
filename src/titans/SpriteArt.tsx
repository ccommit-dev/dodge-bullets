import type { CSSProperties } from "react";
import { assetUrl } from "../asset";
import { ALLY_SKINS } from "./skins";
import type { HuntingAreaDef, TitanHeroId, TitanMonsterKind } from "./model";

const ALLY_ANIMATION_ATLAS = assetUrl("titans/generated/allies/ally-animation-atlas-v1.png");
const SPECIAL_ANIMATION_ATLAS = assetUrl("titans/generated/allies/ally-special-animation-atlas-v1.png");

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
  // 신규 동료는 로스터 시트가 아니라 개별 이미지를 쓴다 (아래 STANDALONE_ALLY)
  luna: 6,
  volt: 7,
  mia_dark: 8,
  sera_light: 9,
  pyro:0, marina:2, terra:3, zephyr:1, bronn:3,
  iris:2, cain:5, sylph:2, orion:1, ember:4,
};


/** 얼터너티브 → 원본 매핑 — 무기·전투 타입은 원본을 따른다 (아트만 팔레트가 다르다) */
const ALT_BASE: Partial<Record<TitanHeroId, TitanHeroId>> = {
  mia_dark: "mia",
  sera_light: "sera",
  pyro:"mia", marina:"sera", terra:"garen", zephyr:"leon", bronn:"garen",
  iris:"sera", cain:"nox", sylph:"sera", orion:"leon", ember:"ari",
};

/**
 * 변형 동료 10명 — 전용 아틀라스 행 (scripts/make-variant-atlas.mjs가 tint로 생성).
 * 에셋 점검 전엔 기본 행에 CSS hue-rotate를 걸어 피부색이 왜곡됐다.
 */
const VARIANT_ATLAS = assetUrl("titans/generated/allies/ally-variant-atlas-v1.png");
const VARIANT_ROW: Partial<Record<TitanHeroId, number>> = {
  pyro: 0, marina: 1, terra: 2, zephyr: 3, bronn: 4, iris: 5, cain: 6, sylph: 7, orion: 8, ember: 9,
};
const VARIANT_ROWS = 10;
/** 스킨 아틀라스 — 상점 썸네일 PNG가 아니라 전투 프레임 4종을 실제로 갈아입는다 */
const SKIN_ATLAS = assetUrl("titans/generated/allies/ally-skin-atlas-v1.png");
const SKIN_ROW: Record<string, number> = { "garen-magma": 0, "leon-frost": 1 };
const SKIN_ROWS = 2;

/**
 * 기본·변형·스킨 아틀라스의 셀은 313.5×209(가로 1.5:1)인데 .titan-ally-art는 정사각형이라
 * 그대로 채우면 세로로 1.5배 늘어난다. 폭을 150%로 넓히고 좌측 −25%로 중앙을 맞춰 원본 비율로 그린다.
 * (특수 아틀라스는 정사각 셀이라 그대로.)
 */
const WIDE_CELL: CSSProperties = { width: "150%", left: "-25%" };

function animatedBodyStyle(id: TitanHeroId, state:0|1|2|3, skin?:string): CSSProperties {
  const specialRows:Partial<Record<TitanHeroId,number>> = { luna:0, volt:1, mia_dark:2, sera_light:3 };
  const specialRow = specialRows[id];
  const col = `${state / 3 * 100}%`;
  const skinDef = skin ? ALLY_SKINS[skin] : undefined;
  if (skinDef?.ally === id && skin && SKIN_ROW[skin] != null) {
    return { ...WIDE_CELL, backgroundImage:`url(${SKIN_ATLAS})`, backgroundSize:`400% ${SKIN_ROWS * 100}%`, backgroundPosition:`${col} ${SKIN_ROW[skin] / (SKIN_ROWS - 1) * 100}%` };
  }
  const variantRow = VARIANT_ROW[id];
  if (variantRow != null) {
    return { ...WIDE_CELL, backgroundImage:`url(${VARIANT_ATLAS})`, backgroundSize:`400% ${VARIANT_ROWS * 100}%`, backgroundPosition:`${col} ${variantRow / (VARIANT_ROWS - 1) * 100}%` };
  }
  if (specialRow != null) {
    return { backgroundImage:`url(${SPECIAL_ANIMATION_ATLAS})`, backgroundSize:"400% 400%", backgroundPosition:`${col} ${specialRow / 3 * 100}%` };
  }
  const row = allyIndex[ALT_BASE[id] ?? id];
  return { ...WIDE_CELL, backgroundImage:`url(${ALLY_ANIMATION_ATLAS})`, backgroundSize:"400% 600%", backgroundPosition:`${col} ${row / 5 * 100}%` };
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
  // kind "boss"인데 boss=false는 펫(타이탄의 그림자) 렌더다 — 심연 타이탄 아트로 고정한다.
  // MONSTER_ASSET에는 boss 키가 없어 그대로 두면 src가 undefined로 깨진다.
  const asset = golden
    ? assetUrl("titans/generated/monsters/golden-lion-clean.png")
    : boss || kind === "boss"
      ? (boss ? (BOSS_ASSET[area.id] ?? BOSS_ASSET.abyss) : BOSS_ASSET.abyss)
      : MONSTER_ASSET[kind as Exclude<TitanMonsterKind, "boss">];
  return (
    <div key={asset} className="titan-monster-art"><img src={asset} alt="" /></div>
  );
}

export function AllyArt({ id, attacking = false, pulse = 0, hitPulse = 0, engaged = false, approaching = false, skin }: { id: TitanHeroId; attacking?: boolean; pulse?: number; hitPulse?: number; engaged?: boolean; approaching?: boolean; skin?: string }) {
  const base = ALT_BASE[id] ?? id;
  const ranged = base === "leon" || base === "sera" || base === "volt" || id === "sera_light";
  return (
    <div className={`titan-ally-art ally-${id} combat-${ranged ? "ranged" : "melee"} ${engaged ? "is-engaged" : ""} ${approaching ? "is-approaching" : ""} ${hitPulse > 0 ? `was-hit hit-${hitPulse % 2}` : ""}`}>
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
          <div className="ally-body" style={animatedBodyStyle(id, hitPulse > 0 ? 3 : attacking && pulse > 0 ? 2 : approaching ? 1 : 0, skin)} />
          <AllyWeapon id={id} />
        </div>
      </div>
      {attacking && pulse > 0 && <i key={`fx-${pulse}`} className={`ally-attack-fx ${ranged ? "ranged" : "melee"}`} aria-hidden="true" />}
    </div>
  );
}

function AllyWeapon({ id: rawId }: { id: TitanHeroId }) {
  // 얼터너티브는 원본의 무기를 쓴다 — 팔레트는 CSS(weapon-* 클래스)가 아니라 몸체 이미지 차이
  const id = ALT_BASE[rawId] ?? rawId;
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
      ) : id === "luna" ? (
        <>
          {/* 성기사 루나 — 성광 워해머 */}
          <path className="weapon-shaft" d="M40 88 L66 30" />
          <path className="weapon-metal" d="M52 18 L82 26 L78 44 L48 36 Z" />
          <path className="weapon-accent" d="M65 12 v10 M58 16 l6 6 M74 16 l-6 6" />
        </>
      ) : id === "volt" ? (
        <>
          {/* 기계공 볼트 — 렌치 + 포탑 스파크 */}
          <path className="weapon-metal" d="M46 84 L70 40 M70 40 a10 10 0 1 0 8 -14 l-6 8 -8 -4 2 -10 a10 10 0 0 0 -8 14" />
          <path className="weapon-accent" d="M38 78 l-6 12 M84 20 l6 -8 M90 24 l4 -4" />
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
