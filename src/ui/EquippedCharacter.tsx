import type { CSSProperties } from "react";
import { assetUrl } from "../asset";
import { tierAt } from "../forge/model";
import { SwordArt } from "../forge/swords";
import { WEAPON_SKINS } from "../economy/gemCatalog";
import type { EvolutionPath, ShoulderId } from "../progression/model";
import { ATTACK_EQUIPMENT_ANCHORS, IDLE_EQUIPMENT_ANCHORS } from "../equipment/anchors";
import { sheetFor } from "../titans/anim";

type Props = {
  mode: "idle" | "attack";
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
  weaponKind?: "drum" | "bow" | "staff";
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
export function EquippedCharacter({ mode, frame, weaponLevel = 0, evolution = "novice", character = "default", weaponSkin = "", className = "", armorLevel = 0, weaponKind = "drum" }: Props) {
  const weaponTier = Math.max(1, Math.min(3, weaponLevel >= 10 ? 3 : weaponLevel >= 5 ? 2 : 1)) as 1 | 2 | 3;
  const index = Math.max(0, Math.min(3, frame));
  const anchor = (mode === "attack" ? ATTACK_EQUIPMENT_ANCHORS : IDLE_EQUIPMENT_ANCHORS)[index];
  const armorTier = armorTierOf(armorLevel);
  // 스킨은 기본 시트의 팔레트 파생이라 프레임 규격·앵커가 그대로 맞는다
  const sheet = sheetFor(character, mode);
  const tier = tierAt(Math.min(15, weaponLevel));
  // 무기 외형(상점) — 티어 색을 덮어쓰고 오라를 두른다. 실루엣(티어)은 유지 =
  // 강화 단계는 형태로, 커스텀은 색으로 읽힌다.
  const blade = weaponSkin ? WEAPON_SKINS[weaponSkin] : undefined;
  const weaponPart: CSSProperties = {
    left: `${anchor.hand.x}%`, top: `${anchor.hand.y}%`,
    transform: `translate(-50%,-91%) rotate(${anchor.hand.rotation}deg) scale(${anchor.hand.scale})`,
  };
  return (
    <div className={`equipped-character mode-${mode} evolution-${evolution} ${character ? `costume-${character}` : ""} armor-tier-${armorTier} ${className}`} data-armor-tier={armorTier}>
      <div className="equipment-base" style={{ backgroundImage: `url(${sheet})`, backgroundPosition: `${(index / 3) * 100}% 0` }} />
      {/* 활·지팡이 (2026-10-15) — 북 대신 손 앵커에 파츠 그림. 공격 프레임 앵커를 그대로 따라가 휘두른다 */}
      {weaponKind !== "drum" && !blade && (
        <img className={`equipment-weapon-alt weapon-${weaponKind} gear-tier-${weaponTier}`} style={weaponPart} src={assetUrl(`titans/gear/${weaponKind}-${weaponTier}.png`)} alt="" aria-hidden="true" onError={(e) => { e.currentTarget.style.display = "none"; }} />
      )}
      {(weaponLevel > 0 || blade) && (weaponKind === "drum" || blade) && (
        <div
          className={`equipment-weapon ${blade ? "has-blade-skin" : ""}`}
          style={blade ? { ...weaponPart, "--blade-aura": blade.aura } as CSSProperties : weaponPart}
        >
          {blade ? <i className="premium-weapon-part" style={{ backgroundImage:`url(${assetUrl("titans/equipment/weapons/premium-weapon-sheet.png")})`, backgroundPosition:`${blade.spriteIndex / 2 * 100}% center` }} /> : <SwordArt level={Math.min(15, weaponLevel)} hue={tier.hue} name={tier.name} />}
        </div>
      )}
    </div>
  );
}
