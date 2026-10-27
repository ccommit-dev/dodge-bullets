import { useEffect, useRef, useState, type CSSProperties } from "react";
import { weaponIconPath } from "../titans/weapons";
import { assetUrl } from "../asset";
import { WEAPON_SKINS } from "../economy/gemCatalog";
import type { EvolutionPath, ShoulderId } from "../progression/model";
import { ATTACK_EQUIPMENT_ANCHORS, IDLE_EQUIPMENT_ANCHORS, WALK_EQUIPMENT_ANCHORS } from "../equipment/anchors";
import { sheetFor } from "../titans/anim";
import { HERO_ANIM, heroFrames, type HeroAnimMode } from "../titans/spriteAnim";

/** 2판 주인공 시트 — 셋 다 깔아 두고 지금 것만 보인다(아래 본문 주석) */
const HERO_MODES: readonly HeroAnimMode[] = ["idle", "walk", "attack"];

type Props = {
  /** 대기 · 걷기(2판, 걸어 들어올 때) · 공격 */
  mode: HeroAnimMode;
  /** 칸 번호 — 동작의 칸 수로 나눈 나머지를 쓴다(부르는 쪽은 그냥 늘어나는 수를 줘도 된다) */
  frame: number;
  weaponLevel?: number;
  /** 장착 견갑 — 그리지 않는다(아래 참고). 효과·강화 화면은 그대로 */
  shoulder?: ShoulderId | null;
  className?: string;
  evolution?: EvolutionPath;
  /** 구매 캐릭터 스킨 id ("default" | "obsidian" | "dawn") */
  character?: string;
  /** 구매 무기 외형 id ("" = 강화 티어 기본색) — 칼날 hue·오라만 바꾼다 */
  weaponSkin?: string;
  /** 견갑 강화 단계 — 그리지 않는다. 표지 클래스(armor-tier-*)만 남긴다 */
  armorLevel?: number;
  /** 방패·장갑·신발·투구·갑옷 티어 — 그리지 않는다. 장비 효과·성장 아이콘은 그대로 */
  gear?: { shield?: number; gloves?: number; boots?: number; helmet?: number; armor?: number };
  /** 무기 종류 (2026-10-15) — 북(대장간 북 그림) · 활 · 지팡이(파츠 그림, 티어는 weaponLevel 눈금) */
  weaponKind?: "sword" | "spear" | "bow" | "staff";
};

/** 견갑 강화 외형 티어: 0 없음 · 1 (+1~4) 광택 · 2 (+5~9) 푸른 테두리 빛 · 3 (+10~14) 금빛 + 보석 · 4 (+15) 프리즘 — 대장간 무대가 쓴다 */
export function armorTierOf(level: number): 0 | 1 | 2 | 3 | 4 {
  return level >= 15 ? 4 : level >= 10 ? 3 : level >= 5 ? 2 : level >= 1 ? 1 : 0;
}

/**
 * 주인공 그림 — 몸 + 무기만 (2026-10-19, 사용자: "주인공 캐릭터는 무기 제외하고는 포함되지 않게").
 * 예전에는 투구·갑옷·장갑·신발·방패·견갑·망토 파츠를 뼈 앵커에 얹었지만 칸마다 몸과 따로 놀아 어색했다 — 이제 무기(북·활·지팡이·무기 외형)만 손에 든다.
 * 왕관·띠·등 망토는 3D 주인공 모델(art-gen/blender roster HERO) 자체의 생김새라 장비가 아니다. 장비 효과·성장/강화 화면 아이콘은 그대로.
 */
export function EquippedCharacter({ mode, frame, weaponLevel = 0, evolution = "novice", character = "default", weaponSkin = "", className = "", armorLevel = 0, weaponKind = "sword" }: Props) {
  const weaponTier = Math.max(1, Math.min(3, weaponLevel >= 10 ? 3 : weaponLevel >= 5 ? 2 : 1)) as 1 | 2 | 3;
  const frames = heroFrames(mode);
  const index = ((Math.floor(frame) % frames) + frames) % frames;
  const anchors = mode === "attack" ? ATTACK_EQUIPMENT_ANCHORS : mode === "walk" && HERO_ANIM ? WALK_EQUIPMENT_ANCHORS : IDLE_EQUIPMENT_ANCHORS;
  const anchor = anchors[Math.min(index, anchors.length - 1)];
  const armorTier = armorTierOf(armorLevel);
  // 스킨은 기본 시트의 팔레트 파생이라 프레임 규격·앵커가 그대로 맞는다
  const sheet = sheetFor(character, mode);
  // 무기 외형(상점) — 티어 색을 덮어쓰고 오라를 두른다. 실루엣(티어)은 유지 =
  // 강화 단계는 형태로, 커스텀은 색으로 읽힌다.
  const blade = weaponSkin ? WEAPON_SKINS[weaponSkin] : undefined;
  // 탈착 (2026-10-23, 사용자: "무기 파츠 … 탈착 애니메이션") — 무기(종류 · 단계 · 외형)가 바뀌면 옛 무기는 손에서 빙글 떨어져 나가고(gear-detach)
  // 새 무기는 반짝 고리와 함께 튀어 들어온다(gear-attach). 처음 그릴 때는 움직이지 않는다
  // 2026-10-27 무기 4종 — 검 · 창 · 활 · 지팡이 모두 장비 그림(titans/weapons weaponIconPath). 예전 북(SwordArt)은 검 그림으로 바뀌었다
  const weaponKey = blade ? `skin-${weaponSkin}` : `${weaponKind}-${weaponTier}`;
  const prevKey = useRef(weaponKey);
  const [swap, setSwap] = useState<{ from: string; seq: number }>({ from: "", seq: 0 });
  useEffect(() => {
    if (prevKey.current === weaponKey) return;
    const from = prevKey.current;
    prevKey.current = weaponKey;
    setSwap((cur) => ({ from, seq: cur.seq + 1 }));
    const t = window.setTimeout(() => setSwap((cur) => (cur.from === from ? { ...cur, from: "" } : cur)), 560);
    return () => window.clearTimeout(t);
  }, [weaponKey]);
  const ghostSrc = /^(sword|spear|bow|staff)-\d$/.test(swap.from) ? assetUrl(`titans/gear/${swap.from.replace(/^sword-/, "weapon-")}.png`) : "";
  const weaponPart: CSSProperties = {
    left: `${anchor.hand.x}%`, top: `${anchor.hand.y}%`,
    // 2판: 무기 그림을 손 오른쪽(바깥)으로 — 손 한가운데 두면 반이 얼굴(주둥이)을 덮었다(2026-10-19 칸별 캡처)
    transform: `translate(${HERO_ANIM ? -34 : -50}%,-91%) rotate(${anchor.hand.rotation}deg) scale(${anchor.hand.scale})`,
    // 예비 칸(먼 손이 큰 머리 뒤)은 몸 뒤에 — 몸·머리에 가린 부분은 숨고 실루엣 밖으로 나온 부분만 보인다(3D 동료처럼)
    ...(anchor.hand.behind ? { zIndex: 1 } : {}),
  };
  return (
    <div className={`equipped-character mode-${mode} ${HERO_ANIM ? "anim2" : ""} evolution-${evolution} ${character ? `costume-${character}` : ""} armor-tier-${armorTier} ${className}`} data-armor-tier={armorTier}>
      {/* 2판(2026-10-19 에뮬레이터 녹화): 한 칸에서 background-image 를 대기 → 공격 시트로 갈아 끼우면 안드로이드 WebView 가 큰 시트를 다시 풀며
          몸이 1~3 칸(최대 100ms) 사라졌다(무기·그림자만 남음). 몬스터(SpriteArt)처럼 세 시트를 다 깔아 두고 지금 것만 보인다 — 대기 줄이 DOM 맨 앞(재는 검사들이 첫 것을 본다) */}
      {HERO_ANIM ? HERO_MODES.map((m) => {
        const n = heroFrames(m), on = m === mode;
        return <div key={m} className={`equipment-base sheet-${m} ${on ? "is-on" : ""}`} style={{ backgroundImage: `url(${sheetFor(character, m)})`, backgroundSize: `${n * 100}% 100%`, backgroundPosition: `${on && n > 1 ? (index / (n - 1)) * 100 : 0}% 0` }} />;
      }) : <div className="equipment-base" style={{ backgroundImage: `url(${sheet})`, backgroundSize: `${frames * 100}% 100%`, backgroundPosition: `${frames > 1 ? (index / (frames - 1)) * 100 : 0}% 0` }} />}
      {/* 떼어 낸 무기 — 잠깐 손에서 떨어져 나간다 */}
      {swap.from && ghostSrc && <img key={`ghost-${swap.seq}`} className={`equipment-weapon-ghost gear-detach $ghost-alt`} style={weaponPart} src={ghostSrc} alt="" aria-hidden="true" />}
      {swap.seq > 0 && weaponKey !== "none" && <i key={`flash-${swap.seq}`} className="gear-swap-flash" style={{ left: `${anchor.hand.x}%`, top: `${anchor.hand.y}%` }} aria-hidden="true" />}
      {/* 무기 4종 (2026-10-27) — 손 앵커에 장비 그림. 공격 프레임 앵커를 그대로 따라가 휘두른다 */}
      {!blade && (
        <img key={`${weaponKey}-${swap.seq}`} className={`equipment-weapon-alt weapon-${weaponKind} gear-tier-${weaponTier} ${swap.seq > 0 ? "gear-attach" : ""}`} style={weaponPart} src={assetUrl(weaponIconPath(weaponKind, weaponLevel))} alt="" aria-hidden="true" />
      )}
      {blade && (
        <div key={`${weaponKey}-${swap.seq}`} className={`equipment-weapon has-blade-skin ${swap.seq > 0 ? "gear-attach" : ""}`} style={{ ...weaponPart, "--blade-aura": blade.aura } as CSSProperties}>
          <i className="premium-weapon-part" style={{ backgroundImage:`url(${assetUrl("titans/equipment/weapons/premium-weapon-sheet.png")})`, backgroundPosition:`${blade.spriteIndex / 2 * 100}% center` }} />
        </div>
      )}
    </div>
  );
}
