import type { CSSProperties } from "react";
import { tierAt } from "../forge/model";
import { SwordArt } from "../forge/swords";
import type { EvolutionPath, ShoulderId } from "../progression/model";
import { ATTACK_EQUIPMENT_ANCHORS, IDLE_EQUIPMENT_ANCHORS } from "../equipment/anchors";
import { assetUrl } from "../asset";

type Props = {
  mode: "idle" | "attack";
  frame: number;
  weaponLevel?: number;
  shoulder?: ShoulderId | null;
  className?: string;
  evolution?: EvolutionPath;
};

const shoulderColor: Record<ShoulderId, string> = {
  scout: "#94a3b8", shadow: "#7c3aed", ogre: "#b45309", dragon: "#ef4444",
};

export function EquippedCharacter({ mode, frame, weaponLevel = 0, shoulder = null, evolution = "novice", className = "" }: Props) {
  const index = Math.max(0, Math.min(3, frame));
  const anchor = (mode === "attack" ? ATTACK_EQUIPMENT_ANCHORS : IDLE_EQUIPMENT_ANCHORS)[index];
  const sheet = assetUrl(mode === "attack" ? "titans/character/base/hero-attack.png" : "titans/character/base/hero-idle.png");
  const tier = tierAt(Math.min(15, weaponLevel));
  const part = (a: typeof anchor.hand): CSSProperties => ({
    left: `${a.x}%`, top: `${a.y}%`, transform: `translate(-50%,-50%) rotate(${a.rotation}deg) scale(${a.scale})`,
  });
  const weaponPart: CSSProperties = {
    left: `${anchor.hand.x}%`, top: `${anchor.hand.y}%`,
    transform: `translate(-50%,-91%) rotate(${anchor.hand.rotation}deg) scale(${anchor.hand.scale})`,
  };
  return (
    <div className={`equipped-character mode-${mode} evolution-${evolution} ${className}`}>
      {shoulder && <i className="equipment-shoulder back" style={{ ...part(anchor.shoulderRight), "--part-color": shoulderColor[shoulder] } as CSSProperties} />}
      <div className="equipment-base" style={{ backgroundImage: `url(${sheet})`, backgroundPosition: `${(index / 3) * 100}% 0` }} />
      {shoulder && <i className="equipment-shoulder front" style={{ ...part(anchor.shoulderLeft), "--part-color": shoulderColor[shoulder] } as CSSProperties} />}
      {weaponLevel > 0 && <div className="equipment-weapon" style={weaponPart}><SwordArt level={Math.min(15, weaponLevel)} hue={tier.hue} name={tier.name} /></div>}
    </div>
  );
}
