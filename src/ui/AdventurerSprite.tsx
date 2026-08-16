import { EquippedCharacter } from "./EquippedCharacter";

export function AdventurerSprite({ className = "" }: { className?: string }) {
  return <EquippedCharacter mode="idle" frame={0} className={`adventurer-sprite ${className}`} />;
}
