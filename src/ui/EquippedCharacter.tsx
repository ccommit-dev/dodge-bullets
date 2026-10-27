import { useEffect, useRef, useState, type CSSProperties } from "react";
import { weaponIconPath } from "../titans/weapons";
import { assetUrl } from "../asset";
import { WEAPON_SKINS, weaponSkinIcon, weaponSkinStyle } from "../economy/gemCatalog";
import type { EvolutionPath, ShoulderId } from "../progression/model";
import { attackAnchorsFor, IDLE_EQUIPMENT_ANCHORS, WALK_EQUIPMENT_ANCHORS } from "../equipment/anchors";
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
/** 무기 그림 안 손잡이 [가로 %, 세로 %, 기본 기울기°] — 검 손잡이(77%) · 창 자루 아래 1/3(67%) · 활 가운데 · 지팡이 아래(75%) */
export const WEAPON_GRIP: Record<"sword" | "spear" | "bow" | "staff", [number, number, number]> = { sword: [50, 77, 0], spear: [50, 67, 0], bow: [52, 50, 0], staff: [50, 75, 0] };   // 활은 손잡이 띠(58%)보다 시위 쪽(52%)을 쥐어 몸통에서 조금 멀리

/** 공격 칸별 무기 자세 (2026-10-27, 사용자: "휘두르는 동작은 무기 4종이 같아요. 창도 찌르지 않고 검처럼 휘둘러요") — 칸 진행 0~1 을 칸 수만큼 나눈 표.
 * [절대 기울기°(0 = 위, 90 = 적 쪽 오른쪽), 손잡이 세로 %(창: 자루를 손에서 앞으로 밀어낸다), 가로 배율(활: 시위를 당기면 활이 좁아진다)]
 * 검은 표가 없다 = 시트 손뼈 회전 그대로 휘두른다(뒤로 들었다 앞으로 내리친다) */
export const WEAPON_ATTACK_POSE: Record<"spear" | "bow" | "staff", Array<[number, number, number]>> = {
  // 창: 수평으로 겨눈 채 허리로 당겼다가 앞으로 찌르고 돌아온다 — 기울기는 70~92° 안에서만. 몸 · 팔 찌르기는 무기별 시트(hero-attack-spear)가 하고
  // 여기 손잡이 이동(54 → 76%)은 끝을 조금 더 밀어 주는 정도(시트 전엔 46 → 92% 로 혼자 찔렀다)
  spear: [[72, 58, 1], [74, 56, 1], [76, 54, 1], [82, 62, 1], [90, 74, 1], [91, 76, 1], [86, 70, 1], [78, 64, 1]],
  // 활: 세워 든 채 시위를 당기며(가로 .82) 위 끝을 적 쪽으로 기울이고(+), 놓는 칸에 튕겨 펴진다(1.0).
  // 기울기는 시계 방향(+)만 — 반시계(−)면 위쪽 시위가 코 쪽으로 와 얼굴을 가렸다(2026-10-27: 코 x 57~64% · 손 76~84% · 시위 = 손 − 22%).
  // 평소 폭도 .9 로 좁혀 시위가 코 오른쪽에 남게 한다(verify-weapon-grip 이 칸마다 잰다)
  bow: [[8, 50, .9], [10, 50, .86], [12, 50, .82], [12, 50, .84], [5, 50, 1], [4, 50, .95], [6, 50, .9], [8, 50, .9]],
  // 지팡이: 머리 위로 치켜들었다가(−16°) 적 쪽으로 내뻗으며(35°) 보석이 빛난다(.weapon-cast). 넷째 칸은 손이 몸 앞이라 왼쪽으로 기울면 얼굴을 가려(2026-10-27 캡처) 6° 로 세운다
  staff: [[-8, 75, 1], [-14, 75, 1], [-16, 75, 1], [6, 75, 1], [30, 75, 1], [36, 75, 1], [20, 75, 1], [4, 75, 1]],
};
/** 지팡이 보석이 빛나는 칸(진행 비율) — 내뻗는 두 칸 */
const STAFF_CAST = (t: number) => t >= 0.5 && t < 0.75;

function gripStyle(g: [number, number, number], rotation: number, scale: number, sx = 1): CSSProperties {
  return { translate: `-${g[0]}% -${g[1]}%`, transform: `rotate(${rotation + g[2]}deg) scale(${scale * sx}, ${scale})`, transformOrigin: `${g[0]}% ${g[1]}%`, "--grip-x": `-${g[0]}%`, "--grip-y": `-${g[1]}%` } as CSSProperties;
}

export function EquippedCharacter({ mode, frame, weaponLevel = 0, evolution = "novice", character = "default", weaponSkin = "", className = "", armorLevel = 0, weaponKind = "sword" }: Props) {
  const weaponTier = Math.max(1, Math.min(3, weaponLevel >= 10 ? 3 : weaponLevel >= 5 ? 2 : 1)) as 1 | 2 | 3;
  const frames = heroFrames(mode);
  const index = ((Math.floor(frame) % frames) + frames) % frames;
  // 공격 칸은 무기별 시트의 손 앵커(창 · 활 · 지팡이 — 2026-10-27), 검은 기본
  const anchors = mode === "attack" ? attackAnchorsFor(weaponKind) : mode === "walk" && HERO_ANIM ? WALK_EQUIPMENT_ANCHORS : IDLE_EQUIPMENT_ANCHORS;
  const anchor = anchors[Math.min(index, anchors.length - 1)];
  const armorTier = armorTierOf(armorLevel);
  // 스킨은 기본 시트의 팔레트 파생이라 프레임 규격·앵커가 그대로 맞는다
  const sheet = sheetFor(character, mode, weaponKind);
  // 무기 외형(상점) — 티어 색을 덮어쓰고 오라를 두른다. 실루엣(티어)은 유지 =
  // 강화 단계는 형태로, 커스텀은 색으로 읽힌다.
  const blade = weaponSkin ? WEAPON_SKINS[weaponSkin] : undefined;
  // 탈착 (2026-10-23, 사용자: "무기 파츠 … 탈착 애니메이션") — 무기(종류 · 단계 · 외형)가 바뀌면 옛 무기는 손에서 빙글 떨어져 나가고(gear-detach)
  // 새 무기는 반짝 고리와 함께 튀어 들어온다(gear-attach). 처음 그릴 때는 움직이지 않는다
  // 2026-10-27 무기 4종 — 검 · 창 · 활 · 지팡이 모두 장비 그림(titans/weapons weaponIconPath). 예전 북(SwordArt)은 검 그림으로 바뀌었다
  // 외형도 무기 종류 · 단계와 같이 키에 — 외형을 낀 채 종류를 바꿔도 떼고 끼운다. 키 끝 두 마디가 언제나 종류-단계라 떼는 그림을 거기서 찾는다
  const weaponKey = blade ? `skin-${weaponSkin}-${weaponKind}-${weaponTier}` : `${weaponKind}-${weaponTier}`;
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
  const ghostM = /(?:^skin-([\w-]+?)-)?(sword|spear|bow|staff)-(\d)$/.exec(swap.from);
  const ghostSrc = ghostM ? assetUrl(`titans/gear/${ghostM[1] ? `skins/${ghostM[1]}/` : ""}${ghostM[2] === "sword" ? "weapon" : ghostM[2]}-${ghostM[3]}.png`) : "";
  const ghostSkin = ghostM?.[1] ? WEAPON_SKINS[ghostM[1]] : undefined;
  // 손잡이 점 (2026-10-27, 사용자: "무기 탈착 애니메이션이 너무 어색해 실제 손으로 든 것처럼") — 장비 그림(titans/gear) 안에서 손이 쥐는 곳(%, 모델 치수로 계산).
  // 예전엔 북 그림에 맞춘 translate(-34%,-91%) 를 그대로 써서 세로형 검 · 창의 손잡이가 손 오른쪽 위로 떠 있었다. 이제 손잡이가 손 앵커에 오고 그 점을 축으로 돈다
  const baseGrip = WEAPON_GRIP[weaponKind];
  // 공격 칸이면 무기마다 자세를 바꾼다 — 검은 시트 손뼈 그대로, 창은 찌르기 · 활은 당겨 쏘기 · 지팡이는 치켜들어 내뻗기
  const attackT = mode === "attack" ? index / Math.max(1, frames) : -1;
  const pose = attackT >= 0 && weaponKind !== "sword" ? WEAPON_ATTACK_POSE[weaponKind][Math.min(7, Math.floor(attackT * 8))] : null;
  const grip: [number, number, number] = pose ? [baseGrip[0], pose[1], pose[0] - anchor.hand.rotation] : baseGrip;
  const casting = weaponKind === "staff" && attackT >= 0 && STAFF_CAST(attackT);
  const weaponPart: CSSProperties = {
    left: `${anchor.hand.x}%`, top: `${anchor.hand.y}%`,
    // 2판: 무기 그림을 손 오른쪽(바깥)으로 — 손 한가운데 두면 반이 얼굴(주둥이)을 덮었다(2026-10-19 칸별 캡처) · 무기 4종은 손잡이 점 기준
    // 손잡이 맞춤은 transform 이 아니라 translate 속성으로 — 탈착 키프레임의 rotate · scale 은 transform 보다 먼저 적용돼, translate 가 transform 안에 있으면
    // 회전축이 손잡이가 아니라 손 오른쪽 아래(상자 크기만큼)로 밀려 끼우는 순간 무기가 손 밖에서 돌았다(2026-10-27 캡처). --grip-x/y 는 키프레임이 이어 쓴다
    ...gripStyle(grip, anchor.hand.rotation, anchor.hand.scale, pose?.[2] ?? 1),
    // 예비 칸(먼 손이 큰 머리 뒤)은 몸 뒤에 — 몸·머리에 가린 부분은 숨고 실루엣 밖으로 나온 부분만 보인다(3D 동료처럼)
    ...(anchor.hand.behind ? { zIndex: 1 } : {}),
  };
  return (
    <div className={`equipped-character mode-${mode} ${HERO_ANIM ? "anim2" : ""} evolution-${evolution} ${character ? `costume-${character}` : ""} armor-tier-${armorTier} ${className}`} data-armor-tier={armorTier}>
      {/* 2판(2026-10-19 에뮬레이터 녹화): 한 칸에서 background-image 를 대기 → 공격 시트로 갈아 끼우면 안드로이드 WebView 가 큰 시트를 다시 풀며
          몸이 1~3 칸(최대 100ms) 사라졌다(무기·그림자만 남음). 몬스터(SpriteArt)처럼 세 시트를 다 깔아 두고 지금 것만 보인다 — 대기 줄이 DOM 맨 앞(재는 검사들이 첫 것을 본다) */}
      {HERO_ANIM ? HERO_MODES.map((m) => {
        const n = heroFrames(m), on = m === mode;
        return <div key={m} className={`equipment-base sheet-${m} ${on ? "is-on" : ""}`} style={{ backgroundImage: `url(${sheetFor(character, m, weaponKind)})`, backgroundSize: `${n * 100}% 100%`, backgroundPosition: `${on && n > 1 ? (index / (n - 1)) * 100 : 0}% 0` }} />;
      }) : <div className="equipment-base" style={{ backgroundImage: `url(${sheet})`, backgroundSize: `${frames * 100}% 100%`, backgroundPosition: `${frames > 1 ? (index / (frames - 1)) * 100 : 0}% 0` }} />}
      {/* 떼어 낸 무기 — 잠깐 손에서 떨어져 나간다 */}
      {swap.from && ghostSrc && ghostM && (() => { const g = WEAPON_GRIP[ghostM[2] as "sword" | "spear" | "bow" | "staff"]; return <img key={`ghost-${swap.seq}`} className={`equipment-weapon-ghost gear-detach ghost-alt ${ghostSkin ? "weapon-skin" : ""}`} style={{ ...weaponPart, ...gripStyle(g, anchor.hand.rotation, anchor.hand.scale), ...(ghostSkin ? weaponSkinStyle(ghostSkin) : {}) }} src={ghostSrc} alt="" aria-hidden="true" />; })()}
      {swap.seq > 0 && weaponKey !== "none" && <i key={`flash-${swap.seq}`} className="gear-swap-flash" style={{ left: `${anchor.hand.x}%`, top: `${anchor.hand.y}%` }} aria-hidden="true" />}
      {/* 무기 4종 (2026-10-27) — 손 앵커에 장비 그림, 손잡이 점으로 쥔다. 공격 칸은 무기마다 자세(WEAPON_ATTACK_POSE)
          상점 무기 외형은 같은 그림의 색 바꾸기 + 오라(weapon-skin) — 예전 북 그림(premium-weapon-sheet)은 무기가 검 · 창 · 활 · 지팡이로 바뀐 뒤 손에 북을 들게 했다 */}
      <img key={`${weaponKey}-${swap.seq}`} className={`equipment-weapon-alt weapon-${weaponKind} gear-tier-${weaponTier} ${blade ? "weapon-skin" : ""} ${swap.seq > 0 ? "gear-attach" : ""} ${casting ? "weapon-cast" : ""}`} data-pose={pose ? `${weaponKind}-${Math.min(7, Math.floor(attackT * 8))}` : undefined} style={{ ...weaponPart, ...(blade ? weaponSkinStyle(blade) : {}) }} src={assetUrl(blade && weaponSkin ? weaponSkinIcon(weaponSkin, weaponKind, weaponLevel) : weaponIconPath(weaponKind, weaponLevel))} alt="" aria-hidden="true" />
    </div>
  );
}
