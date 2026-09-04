import { useEffect, useState, type CSSProperties } from "react";
import { assetUrl } from "../asset";
import { ALLY_SKINS } from "./skins";
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
 * 투명 배경이 검증된 개별 동료 에셋.
 *
 * 원화 교체 절차: 같은 파일명(public/titans/generated/allies/<id>.png)으로 덮어쓰면 끝이다 —
 * 세로 기준 정렬(background-position center bottom)이라 폭·높이는 자유롭다.
 * 변형 10명(pyro~ember)은 scripts/make-variant-standalone.mjs가 원본 프레임을 tint로 파생한
 * 임시 아트다. 원화가 오기 전까지도 원본과 구분되는 팔레트로 나온다.
 */
const STANDALONE_ALLY: Partial<Record<TitanHeroId, string>> = {
  luna: assetUrl("titans/generated/allies/luna.png"),
  volt: assetUrl("titans/generated/allies/volt.png"),
  mia_dark: assetUrl("titans/generated/allies/mia-dark.png"),
  sera_light: assetUrl("titans/generated/allies/sera-light.png"),
  pyro: assetUrl("titans/generated/allies/pyro.png"),
  marina: assetUrl("titans/generated/allies/marina.png"),
  terra: assetUrl("titans/generated/allies/terra.png"),
  zephyr: assetUrl("titans/generated/allies/zephyr.png"),
  bronn: assetUrl("titans/generated/allies/bronn.png"),
  iris: assetUrl("titans/generated/allies/iris.png"),
  cain: assetUrl("titans/generated/allies/cain.png"),
  sylph: assetUrl("titans/generated/allies/sylph.png"),
  orion: assetUrl("titans/generated/allies/orion.png"),
  ember: assetUrl("titans/generated/allies/ember.png"),
};

/* ───────────── 4상태 아틀라스 (계획안 A) ─────────────
 * 상태: 0 대기 · 1 이동 · 2 공격 · 3 피격. 아틀라스는 4열이고 행이 동료다.
 *   기본 6명   ally-animation-atlas-v1.png         4×6 (셀 313.5×209, 가로 1.5:1)
 *   변형 12명  ally-variant-atlas-v1.png           4×12 (기본 행의 tint 파생 — make-variant-atlas.mjs; 루나·볼트 포함)
 *   스킨 12종  ally-skin-atlas-v1.png              4×12 (기본·변형 행 tint — J SSR 스킨 + 시즌 한정)
 *   특수 스킨  ally-skin-special-atlas-v1.png      4×2 (정사각 셀 — 루나·세라 라이트)
 *   특수 4명   ally-special-animation-atlas-v1.png 4×4 (정사각 셀)
 * 셀이 가로로 넓은 아틀라스는 .titan-ally-art(정사각)에 그대로 채우면 세로로 1.5배 늘어난다 —
 * 폭 150%·좌측 −25%로 원본 비율을 지킨다(WIDE_CELL). 아틀라스에 행이 없는 동료만 개별 PNG(정지)로 떨어진다.
 */
export type AllyFrameState = 0 | 1 | 2 | 3;
const ALLY_ANIMATION_ATLAS = assetUrl("titans/generated/allies/ally-animation-atlas-v1.png");
const VARIANT_ATLAS = assetUrl("titans/generated/allies/ally-variant-atlas-v1.png");
const SKIN_ATLAS = assetUrl("titans/generated/allies/ally-skin-atlas-v1.png");
const SPECIAL_ATLAS = assetUrl("titans/generated/allies/ally-special-animation-atlas-v1.png");
const BASE_ROW: Partial<Record<TitanHeroId, number>> = { mia: 0, leon: 1, sera: 2, garen: 3, ari: 4, nox: 5 };
// 루나·볼트는 클립아트풍 특수 아틀라스에서 로스터 화풍 tint 행으로 이동 (아트 점검 1순위)
const VARIANT_ROW: Partial<Record<TitanHeroId, number>> = { pyro: 0, marina: 1, terra: 2, zephyr: 3, bronn: 4, iris: 5, cain: 6, sylph: 7, orion: 8, ember: 9, luna: 10, volt: 11 };
const VARIANT_ROWS = 12;
const SPECIAL_ROW: Partial<Record<TitanHeroId, number>> = { mia_dark: 2, sera_light: 3 };
// J: SSR 스킨 10종 + 시즌 한정 2종 — 순서는 make-variant-atlas.mjs SKINS와 같다 (가로 셀 12행)
const SKIN_ROW: Record<string, number> = { "garen-magma": 0, "leon-frost": 1, "ari-blaze": 2, "nox-abyss": 3, "bronn-iron": 4, "iris-prism": 5, "cain-ash": 6, "sylph-dawn": 7, "orion-nova": 8, "ember-ruby": 9, "season-1": 10, "season-2": 11, "luna-eclipse": 12 };
const SKIN_ROWS = 13;
// 특수 아틀라스 기반(정사각 셀) 스킨 — 루나·세라 라이트
const SKIN_SPECIAL_ATLAS = assetUrl("titans/generated/allies/ally-skin-special-atlas-v1.png");
const SKIN_SPECIAL_ROW: Record<string, number> = { "sera_light-halo": 0 };
const SKIN_SPECIAL_ROWS = 1;
const WIDE_CELL: CSSProperties = { width: "150%", left: "-25%", right: "auto" };

function atlasCell(atlas: string, cols: number, rows: number, col: number, row: number, wide: boolean): CSSProperties {
  return {
    ...(wide ? WIDE_CELL : {}),
    backgroundImage: `url(${atlas})`,
    backgroundSize: `${cols * 100}% ${rows * 100}%`,
    backgroundPosition: `${(col / (cols - 1)) * 100}% ${rows > 1 ? (row / (rows - 1)) * 100 : 0}%`,
    backgroundRepeat: "no-repeat",
  };
}

/** 동료·상태·스킨 → 배경 스타일 (순수 함수, 하니스에서 상태별 프레임 차이를 단언한다) */
export function allyFrameStyle(id: TitanHeroId, state: AllyFrameState, skin?: string): CSSProperties {
  const skinDef = skin ? ALLY_SKINS[skin] : undefined;
  if (skinDef?.ally === id && skin && SKIN_ROW[skin] !== undefined) return atlasCell(SKIN_ATLAS, 4, SKIN_ROWS, state, SKIN_ROW[skin], true);
  if (skinDef?.ally === id && skin && SKIN_SPECIAL_ROW[skin] !== undefined) return atlasCell(SKIN_SPECIAL_ATLAS, 4, SKIN_SPECIAL_ROWS, state, SKIN_SPECIAL_ROW[skin], false);
  const variantRow = VARIANT_ROW[id];
  if (variantRow !== undefined) return atlasCell(VARIANT_ATLAS, 4, VARIANT_ROWS, state, variantRow, true);
  const specialRow = SPECIAL_ROW[id];
  if (specialRow !== undefined) return atlasCell(SPECIAL_ATLAS, 4, 4, state, specialRow, false);
  const baseRow = BASE_ROW[id];
  if (baseRow !== undefined) return atlasCell(ALLY_ANIMATION_ATLAS, 4, 6, state, baseRow, true);
  // 아틀라스에 없는 동료 — 개별 PNG(정지). 원화 교체 경로: STANDALONE_ALLY
  const standalone = STANDALONE_ALLY[id] ?? ALLY_SHEET;
  return { backgroundImage: `url(${standalone})`, backgroundSize: "contain", backgroundPosition: "center bottom", backgroundRepeat: "no-repeat" };
}

/**
 * 프레임별 무기 앵커 (계획안 A) — 상태마다 손 위치가 다르므로 무기 위치·각도를 같이 옮긴다.
 * 값은 .weapon-<id> CSS 기본 앵커에 더하는 오프셋(%·deg). 대기(0)는 오프셋 0.
 */
export const WEAPON_STATE_ANCHOR: Record<"mia" | "leon" | "sera" | "garen" | "ari" | "nox" | "luna" | "volt", Record<AllyFrameState, { dx: number; dy: number; rot: number }>> = {
  mia:   { 0: { dx: 0, dy: 0, rot: 0 }, 1: { dx: 4, dy: -2, rot: 8 },  2: { dx: 12, dy: -6, rot: -48 }, 3: { dx: -6, dy: 2, rot: 22 } },
  leon:  { 0: { dx: 0, dy: 0, rot: 0 }, 1: { dx: 3, dy: -1, rot: 4 },  2: { dx: 8, dy: -3, rot: -6 },   3: { dx: -5, dy: 2, rot: 14 } },
  sera:  { 0: { dx: 0, dy: 0, rot: 0 }, 1: { dx: 3, dy: -2, rot: 5 },  2: { dx: 10, dy: -8, rot: -22 }, 3: { dx: -5, dy: 3, rot: 16 } },
  garen: { 0: { dx: 0, dy: 0, rot: 0 }, 1: { dx: 4, dy: -1, rot: 6 },  2: { dx: 14, dy: -4, rot: -62 }, 3: { dx: -6, dy: 3, rot: 24 } },
  ari:   { 0: { dx: 0, dy: 0, rot: 0 }, 1: { dx: 5, dy: -2, rot: 4 },  2: { dx: 16, dy: -2, rot: -14 }, 3: { dx: -6, dy: 2, rot: 18 } },
  nox:   { 0: { dx: 0, dy: 0, rot: 0 }, 1: { dx: 4, dy: -2, rot: 10 }, 2: { dx: 12, dy: -6, rot: -56 }, 3: { dx: -6, dy: 2, rot: 26 } },
  luna:  { 0: { dx: 0, dy: 0, rot: 0 }, 1: { dx: 3, dy: -1, rot: 6 },  2: { dx: 10, dy: -10, rot: -70 }, 3: { dx: -5, dy: 3, rot: 20 } },
  volt:  { 0: { dx: 0, dy: 0, rot: 0 }, 1: { dx: 2, dy: -1, rot: 3 },  2: { dx: 6, dy: -4, rot: -18 },  3: { dx: -4, dy: 2, rot: 12 } },
};
export function weaponAnchorStyle(id: TitanHeroId, state: AllyFrameState): CSSProperties {
  const base = (ALT_BASE[id] ?? id) as keyof typeof WEAPON_STATE_ANCHOR;
  const table = WEAPON_STATE_ANCHOR[base] ?? WEAPON_STATE_ANCHOR.mia;
  const a = table[state];
  return { "--weapon-dx": `${a.dx}%`, "--weapon-dy": `${a.dy}%`, "--weapon-drot": `${a.rot}deg` } as CSSProperties;
}

/** 몬스터 프레임 (계획안 B) — idle 원본 · hit/defeat는 scripts/make-monster-states.mjs가 파생한 <name>-hit/-defeat.png */
export type MonsterFrameState = "idle" | "hit" | "defeat";
export function monsterAssetFor(kind: TitanMonsterKind, area: HuntingAreaDef, boss: boolean, golden: boolean, state: MonsterFrameState = "idle"): string {
  // kind "boss"인데 boss=false는 펫(타이탄의 그림자) 렌더다 — 심연 타이탄 아트로 고정한다.
  // MONSTER_ASSET에는 boss 키가 없어 그대로 두면 src가 undefined로 깨진다.
  const base = golden
    ? assetUrl("titans/generated/monsters/golden-lion-clean.png")
    : boss || kind === "boss"
      ? (boss ? (BOSS_ASSET[area.id] ?? BOSS_ASSET.abyss) : BOSS_ASSET.abyss)
      : MONSTER_ASSET[kind as Exclude<TitanMonsterKind, "boss">];
  return state === "idle" ? base : base.replace(/\.png$/, `-${state}.png`);
}

export function MonsterArt({
  kind,
  area,
  boss,
  golden = false,
  state = "idle",
}: {
  kind: TitanMonsterKind;
  area: HuntingAreaDef;
  boss: boolean;
  golden?: boolean;
  state?: MonsterFrameState;
}) {
  const idle = monsterAssetFor(kind, area, boss, golden, "idle");
  const asset = monsterAssetFor(kind, area, boss, golden, state);
  // 세 프레임을 모두 마운트해 두고 보이는 것만 바꾼다 — 상태 전환 순간 이미지 로딩으로 깜빡이지 않게
  return (
    <div key={idle} className={`titan-monster-art frame-${state}`}>
      <img src={idle} alt="" className={state === "idle" ? "on" : ""} />
      <img src={monsterAssetFor(kind, area, boss, golden, "hit")} alt="" className={state === "hit" ? "on" : ""} aria-hidden="true" />
      <img src={monsterAssetFor(kind, area, boss, golden, "defeat")} alt="" className={state === "defeat" ? "on" : ""} aria-hidden="true" />
      <span className="monster-asset-current" data-src={asset} hidden />
    </div>
  );
}

export function AllyArt({ id, attacking = false, pulse = 0, hitPulse = 0, engaged = false, approaching = false, skin, partySlot }: { id: TitanHeroId; attacking?: boolean; pulse?: number; hitPulse?: number; engaged?: boolean; approaching?: boolean; skin?: string; partySlot?: number }) {
  const base = ALT_BASE[id] ?? id;
  // pulse·hitPulse는 누적 카운터라 "지금 공격/피격 중"이 아니다 — 카운터가 바뀐 뒤 짧게만 해당 프레임을 보인다.
  // (이걸 안 하면 첫 공격 이후 영원히 공격 프레임에 박제된다.)
  const [swinging, setSwinging] = useState(false);
  const [flinching, setFlinching] = useState(false);
  useEffect(() => {
    if (!(attacking && pulse > 0)) return;
    setSwinging(true);
    const t = window.setTimeout(() => setSwinging(false), 320);
    return () => window.clearTimeout(t);
  }, [attacking, pulse]);
  useEffect(() => {
    if (hitPulse <= 0) return;
    setFlinching(true);
    const t = window.setTimeout(() => setFlinching(false), 260);
    return () => window.clearTimeout(t);
  }, [hitPulse]);
  const ranged = base === "leon" || base === "sera" || base === "volt" || id === "sera_light";
  const slot = partySlot === undefined ? undefined : Math.max(0, Math.min(5, partySlot));
  // 대기 시에는 주인공(좌측 2%~약 18%) 바깥에서 시작한다. 모바일에서도
  // 20%가 최소 안전선이라 캐릭터와 첫 동료의 바운딩 박스가 겹치지 않는다.
  const homeX = slot === undefined ? undefined : [20, 20, 33, 33, 46, 46][slot];
  const laneY = slot === undefined ? undefined : [4, 53, 12, 63, 1, 48][slot];
  // 교전 시 후열은 주인공 뒤, 전열은 주인공 오른쪽에 고정한다. % 좌표를
  // 사용해 360px 모바일부터 720px 데스크톱까지 동일한 충돌 여백을 유지한다.
  const combatX = slot === undefined ? undefined : ranged ? [3, 4, 13, 14, 23, 24][slot] : [52, 54, 62, 64, 72, 74][slot];
  const partyStyle = slot === undefined ? undefined : ({
    "--party-home-x": `${homeX}%`,
    "--party-lane-y": `${laneY}%`,
    "--party-combat-x": `${combatX}%`,
  } as CSSProperties);
  return (
    <div data-party-slot={slot} style={partyStyle} className={`titan-ally-art ally-${id} combat-${ranged ? "ranged" : "melee"} ${engaged ? "is-engaged" : ""} ${approaching ? "is-approaching" : ""} ${hitPulse > 0 ? `was-hit hit-${hitPulse % 2}` : ""}`}>
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
          {(() => {
            const state: AllyFrameState = flinching ? 3 : swinging ? 2 : approaching ? 1 : 0;
            return (
              <>
                <div className={`ally-body frame-${state}`} style={allyFrameStyle(id, state, skin)} />
                <AllyWeapon id={id} anchor={weaponAnchorStyle(id, state)} />
              </>
            );
          })()}
        </div>
      </div>
      {attacking && pulse > 0 && <i key={`fx-${pulse}`} className={`ally-attack-fx ${ranged ? "ranged" : "melee"}`} aria-hidden="true" />}
    </div>
  );
}

function AllyWeapon({ id: rawId, anchor }: { id: TitanHeroId; anchor?: CSSProperties }) {
  // 얼터너티브는 원본의 무기를 쓴다 — 팔레트는 CSS(weapon-* 클래스)가 아니라 몸체 이미지 차이
  const id = ALT_BASE[rawId] ?? rawId;
  const ranged = id === "leon" || id === "sera";
  return (
    <svg className={`ally-weapon weapon-${id} ${ranged ? "ranged" : "melee"}`} style={anchor} viewBox="0 0 100 100" aria-hidden="true">
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
