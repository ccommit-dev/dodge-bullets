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
  shoulder?: ShoulderId | null;
  className?: string;
  evolution?: EvolutionPath;
  /** 구매 캐릭터 스킨 id ("default" | "obsidian" | "dawn") */
  character?: string;
  /** 구매 무기 외형 id ("" = 강화 티어 기본색) — 칼날 hue·오라만 바꾼다 */
  weaponSkin?: string;
};

const shoulderIndex: Record<ShoulderId, number> = { scout: 0, shadow: 1, ogre: 2, dragon: 3 };

export function EquippedCharacter({ mode, frame, weaponLevel = 0, shoulder = null, evolution = "novice", character = "default", weaponSkin = "", className = "" }: Props) {
  const index = Math.max(0, Math.min(3, frame));
  const anchor = (mode === "attack" ? ATTACK_EQUIPMENT_ANCHORS : IDLE_EQUIPMENT_ANCHORS)[index];
  // 스킨은 기본 시트의 팔레트 파생이라 프레임 규격·앵커가 그대로 맞는다
  const sheet = sheetFor(character, mode);
  const tier = tierAt(Math.min(15, weaponLevel));
  // 무기 외형(상점) — 티어 색을 덮어쓰고 오라를 두른다. 실루엣(티어)은 유지 =
  // 강화 단계는 형태로, 커스텀은 색으로 읽힌다.
  const blade = weaponSkin ? WEAPON_SKINS[weaponSkin] : undefined;
  const part = (a: typeof anchor.hand): CSSProperties => ({
    left: `${a.x}%`, top: `${a.y}%`, transform: `translate(-50%,-50%) rotate(${a.rotation}deg) scale(${a.scale})`,
  });
  const weaponPart: CSSProperties = {
    left: `${anchor.hand.x}%`, top: `${anchor.hand.y}%`,
    transform: `translate(-50%,-91%) rotate(${anchor.hand.rotation}deg) scale(${anchor.hand.scale})`,
  };
  return (
    <div className={`equipped-character mode-${mode} evolution-${evolution} ${character ? `costume-${character}` : ""} ${className}`}>
      {shoulder && <i className={`equipment-shoulder shoulder-${shoulder} back`} style={{ ...part(anchor.shoulderRight), backgroundImage: `url(${assetUrl("titans/equipment/shoulders/shoulder-tier-sheet.png")})`, backgroundPosition: `${(shoulderIndex[shoulder] / 3) * 100}% center` }} />}
      <div className="equipment-base" style={{ backgroundImage: `url(${sheet})`, backgroundPosition: `${(index / 3) * 100}% 0` }} />
      {shoulder && <i className={`equipment-shoulder shoulder-${shoulder} front`} style={{ ...part(anchor.shoulderLeft), backgroundImage: `url(${assetUrl("titans/equipment/shoulders/shoulder-tier-sheet.png")})`, backgroundPosition: `${(shoulderIndex[shoulder] / 3) * 100}% center` }} />}
      {(weaponLevel > 0 || blade) && (
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
