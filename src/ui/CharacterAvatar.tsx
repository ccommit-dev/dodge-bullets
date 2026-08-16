import type { CSSProperties } from "react";

export type CharacterPose = "idle" | "run" | "dodge" | "attack" | "hit" | "forge" | "rhythm";

type CharacterAvatarProps = {
  pose?: CharacterPose;
  weaponLevel?: number;
  size?: number;
  label?: string;
  className?: string;
};

export function CharacterAvatar({
  pose = "idle",
  weaponLevel = 0,
  size = 96,
  label = "Dodge Lab 모험가",
  className = "",
}: CharacterAvatarProps) {
  const hue = (185 + Math.min(15, weaponLevel) * 11) % 360;
  return (
    <div
      className={`hero-avatar hero-avatar-${pose} ${className}`.trim()}
      role="img"
      aria-label={label}
      style={{
        "--hero-size": `${size}px`,
        "--weapon-hue": String(hue),
        "--weapon-power": String(Math.min(1, weaponLevel / 15)),
      } as CSSProperties}
    >
      <span className="hero-aura" />
      <span className="hero-head" />
      <span className="hero-torso" />
      <span className="hero-arm hero-arm-left" />
      <span className="hero-arm hero-arm-right" />
      <span className="hero-leg hero-leg-left" />
      <span className="hero-leg hero-leg-right" />
      <span className="hero-weapon" />
      <span className="hero-core" />
    </div>
  );
}
