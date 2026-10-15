import type { CSSProperties } from "react";
import { assetUrl } from "../asset";
import { tierAt } from "../forge/model";
import { SwordArt } from "../forge/swords";
import { WEAPON_SKINS } from "../economy/gemCatalog";
import type { EvolutionPath, ShoulderId } from "../progression/model";
import { ATTACK_EQUIPMENT_ANCHORS, GEAR_URL, IDLE_EQUIPMENT_ANCHORS, capeAnchor, chestTierOf, helmetTierOf } from "../equipment/anchors";
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
  /** 견갑 강화 단계 — 5/10/15 마다 외형 티어(테두리 빛 → 보석 → 프리즘)가 바뀐다 */
  armorLevel?: number;
  /** 방패·장갑·신발 티어 (2026-10-12) — 0 없음 · 1 나무 · 2 철 · 3 금. 호출부가 anchors.*TierOf 로 계산 */
  gear?: { shield?: number; gloves?: number; boots?: number; helmet?: number; armor?: number };
  /** 무기 종류 (2026-10-15) — 북(대장간 북 그림) · 활 · 지팡이(파츠 그림, 티어는 weaponLevel 눈금) */
  weaponKind?: "drum" | "bow" | "staff";
};

/** 견갑 강화 외형 티어: 0 없음 · 1 (+1~4) 광택 · 2 (+5~9) 푸른 테두리 빛 · 3 (+10~14) 금빛 + 보석 · 4 (+15) 프리즘 */
export function armorTierOf(level: number): 0 | 1 | 2 | 3 | 4 {
  return level >= 15 ? 4 : level >= 10 ? 3 : level >= 5 ? 2 : level >= 1 ? 1 : 0;
}

const shoulderIndex: Record<ShoulderId, number> = { scout: 0, shadow: 1, ogre: 2, dragon: 3 };

export function EquippedCharacter({ mode, frame, weaponLevel = 0, shoulder = null, evolution = "novice", character = "default", weaponSkin = "", className = "", armorLevel = 0, gear, weaponKind = "drum" }: Props) {
  // 투구·갑옷: 장비 파츠(사냥터 숙련 · 대장간 강화)가 있으면 그 티어, 없으면 예전 규칙(견갑 강화·장착 견갑) (2026-10-15)
  const helmetTier = Math.max(gear?.helmet ?? 0, helmetTierOf(armorLevel));
  const chestTier = Math.max(gear?.armor ?? 0, chestTierOf(shoulder));
  const weaponTier = Math.max(1, Math.min(3, weaponLevel >= 10 ? 3 : weaponLevel >= 5 ? 2 : 1)) as 1 | 2 | 3;
  const index = Math.max(0, Math.min(3, frame));
  const anchor = (mode === "attack" ? ATTACK_EQUIPMENT_ANCHORS : IDLE_EQUIPMENT_ANCHORS)[index];
  const armorTier = armorTierOf(armorLevel);
  // 망토 파츠 — 견갑 +3 부터 등 뒤에 걸린다(z 1, 몸 뒤). 티어별 색: 적 → 청 → 금 → 프리즘
  const cape = armorLevel >= 3 ? capeAnchor(anchor, mode) : null;
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
    <div className={`equipped-character mode-${mode} evolution-${evolution} ${character ? `costume-${character}` : ""} armor-tier-${armorTier} ${className}`} data-armor-tier={armorTier}>
      {cape && <i className={`equipment-cape cape-tier-${armorTier}`} style={{ left: `${cape.x}%`, top: `${cape.y}%`, "--cape-base": `translate(-50%,-12%) rotate(${cape.rotation}deg) scale(${cape.scale})`, transform: "var(--cape-base)", backgroundImage: `url(${assetUrl("titans/equipment/cape/cape.png")})` } as CSSProperties} aria-hidden="true" />}
      {shoulder && <i className={`equipment-shoulder shoulder-${shoulder} back`} style={{ ...part(anchor.shoulderRight), backgroundImage: `url(${assetUrl("titans/equipment/shoulders/shoulder-tier-sheet.png")})`, backgroundPosition: `${(shoulderIndex[shoulder] / 3) * 100}% center` }} />}
      <div className="equipment-base" style={{ backgroundImage: `url(${sheet})`, backgroundPosition: `${(index / 3) * 100}% 0` }} />
      {(gear?.boots ?? 0) > 0 && <img className={`equipment-boots gear-tier-${gear?.boots}`} style={part(anchor.feet)} src={assetUrl(GEAR_URL("boots", (gear?.boots ?? 0) as 1 | 2 | 3))} alt="" aria-hidden="true" onError={(e) => { e.currentTarget.style.display = "none"; }} />}
      {(gear?.shield ?? 0) > 0 && <img className={`equipment-shield gear-tier-${gear?.shield}`} style={part(anchor.offHand)} src={assetUrl(GEAR_URL("shield", (gear?.shield ?? 0) as 1 | 2 | 3))} alt="" aria-hidden="true" onError={(e) => { e.currentTarget.style.display = "none"; }} />}
      {/* 가슴 갑옷·투구 (2026-10-12) — 납작 파츠 그림을 앵커에 얹는다. 파일이 없으면(아직 배치 전) 조용히 숨긴다 */}
      {chestTier > 0 && <img className={`equipment-chest gear-tier-${chestTier}`} style={part(anchor.chest)} src={assetUrl(GEAR_URL("armor", chestTier as 1 | 2 | 3))} alt="" aria-hidden="true" onError={(e) => { e.currentTarget.style.display = "none"; }} />}
      {(gear?.gloves ?? 0) > 0 && <img className={`equipment-gloves gear-tier-${gear?.gloves}`} style={part({ ...anchor.hand, scale: 0.5 })} src={assetUrl(GEAR_URL("gloves", (gear?.gloves ?? 0) as 1 | 2 | 3))} alt="" aria-hidden="true" onError={(e) => { e.currentTarget.style.display = "none"; }} />}
      {helmetTier > 0 && <img className={`equipment-helmet gear-tier-${helmetTier}`} style={part(anchor.head)} src={assetUrl(GEAR_URL("helmet", helmetTier as 1 | 2 | 3))} alt="" aria-hidden="true" onError={(e) => { e.currentTarget.style.display = "none"; }} />}
      {shoulder && armorTier >= 3 && <b className="armor-gem" style={{ left: `${anchor.shoulderLeft.x}%`, top: `${anchor.shoulderLeft.y - 6}%` }} aria-hidden="true" />}
      {shoulder && <i className={`equipment-shoulder shoulder-${shoulder} front`} style={{ ...part(anchor.shoulderLeft), backgroundImage: `url(${assetUrl("titans/equipment/shoulders/shoulder-tier-sheet.png")})`, backgroundPosition: `${(shoulderIndex[shoulder] / 3) * 100}% center` }} />}
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
